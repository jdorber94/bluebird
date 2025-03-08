"use client";

import { useEffect, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import EditableCell from '../components/EditableCell';
import ActionMenu from '../components/ActionMenu';
import ProfileMenu from '../components/ProfileMenu';
import { getDemos, updateDemo, createDemo, deleteDemo, migrateDemosTable, getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';

type Demo = Database['public']['Tables']['demos']['Row'];

export default function Dashboard() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        router.push('/login');
        return false;
      }
      return true;
    };

    const init = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;

        // Run migration first
        const { error: migrationError } = await migrateDemosTable();
        if (migrationError) {
          console.error('Migration error:', migrationError);
          // Continue loading demos even if migration fails
        }

        // Then load demos
        await loadDemos();
      } catch (err) {
        console.error('Unexpected error during initialization:', err);
        setError('Failed to initialize the dashboard. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, [router]);

  const loadDemos = async () => {
    try {
      const { data, error } = await getDemos();
      if (error) {
        console.error('Error loading demos:', error);
        setError('Failed to load demos. Please try refreshing the page.');
        setDemos([]);
      } else {
        setError(null);
        setDemos(data || []);
      }
    } catch (err) {
      console.error('Unexpected error loading demos:', err);
      setError('An unexpected error occurred. Please try refreshing the page.');
      setDemos([]);
    }
  };

  const handleUpdate = async (id: string, field: keyof Demo, value: any) => {
    // Find the demo and update it locally first
    const demoIndex = demos.findIndex(d => d.id === id);
    if (demoIndex === -1) return;

    // Create a new array with the updated demo
    const updatedDemos = [...demos];
    updatedDemos[demoIndex] = {
      ...updatedDemos[demoIndex],
      [field]: value
    };

    // Update the state immediately
    setDemos(updatedDemos);

    // Then update the database
    const { error } = await updateDemo(id, { [field]: value });
    if (error) {
      console.error('Error updating demo:', error);
      // Revert the change if there was an error
      setDemos(demos);
      return;
    }
  };

  const handleCheckboxChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: 'email_sent' | 'call_made'
  ) => {
    const checked = e.target.checked;
    await handleUpdate(id, field, checked);
  };

  const getStatusDisplay = (showed: 'Yes' | 'No' | 'Pending') => {
    switch (showed) {
      case 'Yes':
        return (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            Yes
          </span>
        );
      case 'No':
        return (
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
            No
          </span>
        );
      default:
        return (
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            Pending
          </span>
        );
    }
  };

  const handleStatusChange = async (id: string) => {
    const demo = demos.find(d => d.id === id);
    if (!demo) return;

    // Cycle through statuses: Pending -> Yes -> No -> Pending
    const nextStatus = demo.showed === 'Pending' ? 'Yes' : 
                      demo.showed === 'Yes' ? 'No' : 'Pending';

    await handleUpdate(id, 'showed', nextStatus);
  };

  const handleAddDemo = async () => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const newDemo = {
      name: 'New Demo',
      date_booked: formatDate(now),
      demo_date: formatDate(nextWeek),
      demo_time: '09:00',
      email_sent: false,
      call_made: false,
      showed: 'Pending' as const
    };

    try {
      const { data, error } = await createDemo(newDemo);
      if (error) {
        console.error('Error creating demo:', error);
        alert('Failed to create demo. Please try again.');
        return;
      }
      if (data) {
        setDemos(prevDemos => [...prevDemos, data]);
      }
    } catch (err) {
      console.error('Error creating demo:', err);
      alert('Failed to create demo. Please try again.');
    }
  };

  const handleDeleteDemo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this demo?')) return;
    
    // Remove from state immediately
    setDemos(demos.filter(demo => demo.id !== id));

    // Then update the database
    const { error } = await deleteDemo(id);
    if (error) {
      console.error('Error deleting demo:', error);
      // Restore the demo if there was an error
      setDemos(demos);
      return;
    }
  };

  const reorderDemos = (startIndex: number, endIndex: number) => {
    const result = Array.from(demos);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = async (result: DropResult) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    // If the item didn't move, don't do anything
    if (result.destination.index === result.source.index) {
      return;
    }

    const reorderedDemos = reorderDemos(
      result.source.index,
      result.destination.index
    );

    // Update state immediately
    setDemos(reorderedDemos);

    // Update positions in the database
    try {
      // Update each demo's position
      await Promise.all(reorderedDemos.map((demo, index) => 
        updateDemo(demo.id, { position: index })
      ));
    } catch (error) {
      console.error('Error updating positions:', error);
      // Optionally revert to original order if there's an error
      setDemos(demos);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h1 className="text-xl font-semibold mb-8">Bluebird</h1>
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md">
            Dashboard
          </a>
        </nav>
        
        {/* Settings and Profile Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <a href="#" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mb-4">
            <span className="mr-3">⚙️</span>
            Settings
          </a>
          <ProfileMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-end mb-8">
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <span className="mr-2">🔍</span>
                Filter
              </button>
              <button 
                onClick={handleAddDemo}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <span className="mr-2">+</span>
                Add Demo
              </button>
            </div>
          </div>

          {/* Demo Table */}
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading demos...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : demos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No demos yet. Click "Add Demo" to create one.</div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="w-10 px-2"></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Booked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Date</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Email Sent</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Call Made</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <Droppable droppableId="table" direction="vertical">
                    {(provided) => (
                      <tbody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="bg-white divide-y divide-gray-200"
                      >
                        {demos.map((demo, index) => (
                          <Draggable key={demo.id} draggableId={demo.id} index={index}>
                            {(provided, snapshot) => (
                              <tr
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${snapshot.isDragging ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors duration-150`}
                              >
                                <td className="w-10 px-2">
                                  <div {...provided.dragHandleProps} className="cursor-move text-gray-400 hover:text-gray-600 text-center">
                                    ⋮⋮
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <EditableCell
                                    value={demo.name || ''}
                                    onChange={(value) => handleUpdate(demo.id, 'name', value)}
                                    className="text-sm font-medium text-gray-900"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <EditableCell
                                    value={demo.date_booked || new Date().toISOString().split('T')[0]}
                                    onChange={(value) => handleUpdate(demo.id, 'date_booked', value)}
                                    type="date"
                                    className="text-sm text-gray-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <EditableCell
                                    value={demo.demo_date || new Date().toISOString().split('T')[0]}
                                    onChange={(value) => handleUpdate(demo.id, 'demo_date', value)}
                                    type="date"
                                    className="text-sm text-gray-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={demo.email_sent}
                                    className="h-5 w-5 text-blue-600 rounded border-gray-300 cursor-pointer focus:ring-blue-500"
                                    onChange={(e) => handleCheckboxChange(e, demo.id, 'email_sent')}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={demo.call_made}
                                    className="h-5 w-5 text-blue-600 rounded border-gray-300 cursor-pointer focus:ring-blue-500"
                                    onChange={(e) => handleCheckboxChange(e, demo.id, 'call_made')}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => handleStatusChange(demo.id)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    {getStatusDisplay(demo.showed)}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <ActionMenu 
                                    demoId={demo.id}
                                    onDelete={handleDeleteDemo}
                                  />
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </table>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 