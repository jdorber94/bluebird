"use client";

import { useEffect, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import EditableCell from '../components/EditableCell';
import ActionMenu from '../components/ActionMenu';
import ProfileMenu from '../components/ProfileMenu';
import { getDemos, updateDemo, createDemo, deleteDemo, migrateDemosTable, getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import InlineNotes from '../components/InlineNotes';
import CRMLink from '../components/CRMLink';
import DashboardDateFilter from '../components/DashboardDateFilter';
import { RealtimeChannel } from '@supabase/supabase-js';

type Demo = Database['public']['Tables']['demos']['Row'];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [filteredDemos, setFilteredDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    isFreeUser: boolean;
    plan: string;
    totalCount: number;
  } | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toLocaleString('default', { month: 'long' }));
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());

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

  // Set up real-time subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      // Clean up any existing subscription
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }

      // Set up new subscription
      const channel = supabase
        .channel('demo_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes
            schema: 'public',
            table: 'demos',
            filter: `user_id=eq.${user.id}` // Only listen to changes for current user's demos
          },
          async (payload) => {
            console.log('Received real-time update:', payload);
            
            // Reload the entire demos list to ensure consistency
            await loadDemos();
            
            // Force a router refresh to update any server components
            router.refresh();
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  const loadDemos = async () => {
    try {
      const { data, error, subscription: subData } = await getDemos();
      if (error) {
        console.error('Error loading demos:', error);
        setError('Failed to load demos. Please try refreshing the page.');
        setDemos([]);
        setFilteredDemos([]);
      } else {
        setError(null);
        setSubscription(subData || null);
        // Sort demos by demo_date, with earliest dates first
        const sortedDemos = (data || []).sort((a, b) => {
          // Handle null dates by putting them at the end
          if (!a.demo_date) return 1;
          if (!b.demo_date) return -1;
          return new Date(a.demo_date).getTime() - new Date(b.demo_date).getTime();
        });
        setDemos(sortedDemos);

        // Apply the initial filter based on the default month/year state
        const defaultMonthIndex = months.indexOf(currentMonth);
        const initiallyFilteredDemos = sortedDemos.filter(demo => {
          if (!demo.demo_date) return false;
          try {
            const datePart = demo.demo_date.substring(0, 10);
            const demoYear = parseInt(datePart.substring(0, 4), 10);
            const demoMonth = parseInt(datePart.substring(5, 7), 10) - 1; 
            return demoMonth === defaultMonthIndex && demoYear === currentYear;
          } catch (e) {
            console.error("Error parsing demo date string during initial load:", demo.demo_date, e);
            return false; 
          }
        });
        setFilteredDemos(initiallyFilteredDemos); // Set filtered demos with the initial filter applied
      }
    } catch (err) {
      console.error('Unexpected error loading demos:', err);
      setError('An unexpected error occurred. Please try refreshing the page.');
      setDemos([]);
      setFilteredDemos([]);
    }
  };

  const handleUpdate = async (id: string, field: keyof Demo, value: any) => {
    console.log('Handling update:', { id, field, value });
    
    // Find the demo and update it locally first
    const demoIndex = demos.findIndex(d => d.id === id);
    if (demoIndex === -1) {
      console.error('Demo not found:', id);
      return;
    }

    // Create a new array with the updated demo
    const updatedDemos = [...demos];
    const updatedDemo = {
      ...updatedDemos[demoIndex],
      [field]: value,
      updated_at: new Date().toISOString()
    };
    updatedDemos[demoIndex] = updatedDemo;

    // Update the state immediately (optimistic update)
    setDemos(updatedDemos);
    setFilteredDemos(prev => 
      prev.map(d => d.id === id ? updatedDemo : d)
    );

    try {
      // Then update the database
      const { error } = await updateDemo(id, { [field]: value });
      if (error) {
        throw error;
      }
      console.log('Database update successful for field:', field);
    } catch (error) {
      console.error('Error updating demo:', error);
      // Revert the change if there was an error
      setDemos(demos);
      setFilteredDemos(prev => 
        prev.map(d => d.id === id ? demos[demoIndex] : d)
      );
    }
  };

  const handleCheckboxChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: 'email_sent' | 'call_made'
  ) => {
    const checked = e.target.checked;
    
    // Find the demo and update it locally first
    const demoIndex = demos.findIndex(d => d.id === id);
    if (demoIndex === -1) return;

    const currentDemo = demos[demoIndex];
    const updateData: Partial<Demo> = { 
      [field]: checked,
      updated_at: new Date().toISOString() 
    };

    // Determine the correct date field based on the boolean field
    const dateField = field === 'email_sent' ? 'email_sent_date' : 'call_made_date';

    // Only set the date if checking the box AND the date isn't already set
    if (checked && !currentDemo[dateField]) {
      updateData[dateField] = new Date().toISOString();
    }

    // Create a new array with the updated demo
    const updatedDemos = [...demos];
    const updatedDemo = {
      ...currentDemo,
      ...updateData
    } as Demo;
    updatedDemos[demoIndex] = updatedDemo;

    // Update the state immediately (optimistic update)
    setDemos(updatedDemos);
    setFilteredDemos(prev => 
      prev.map(d => d.id === id ? updatedDemo : d)
    );

    try {
      // Prepare the data for the database update, ensuring correct types
      const dbUpdateData: { [key: string]: any } = {
        [field]: checked,
        updated_at: new Date().toISOString(),
      };
      // Conditionally add the date field to the update if it was set
      if (updateData[dateField]) {
        dbUpdateData[dateField] = updateData[dateField];
      }

      // Then update the database
      const { error } = await updateDemo(id, dbUpdateData);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating demo:', error);
      // Revert the change if there was an error
      setDemos(demos);
      setFilteredDemos(prev => 
        prev.map(d => d.id === id ? demos[demoIndex] : d)
      );
    }
  };

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Helper function to format dates
  const formatDate = (date: string | null) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const day = d.getDate();
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).replace(/\d+/, day + getOrdinalSuffix(day));
    } catch (e) {
      return '';
    }
  };

  const getStatusDisplay = (status: 'Accepted' | 'Pending' | 'Cancelled' | 'Rebooked') => {
    switch (status) {
      case 'Accepted':
        return (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            Accepted
          </span>
        );
      case 'Cancelled':
        return (
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">
            Cancelled
          </span>
        );
      case 'Rebooked':
        return (
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
            Rebooked
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

  const getShowedDisplay = (showed: 'Yes' | 'No' | 'Pending') => {
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

    // Cycle through statuses: Pending -> Accepted -> Cancelled -> Rebooked -> Pending
    const nextStatus = demo.status === 'Pending' ? 'Accepted' : 
                      demo.status === 'Accepted' ? 'Cancelled' :
                      demo.status === 'Cancelled' ? 'Rebooked' : 'Pending';

    await handleUpdate(id, 'status', nextStatus);
  };

  const handleShowedChange = async (id: string) => {
    const demo = demos.find(d => d.id === id);
    if (!demo) return;

    // Cycle through showed statuses: Pending -> Yes -> No -> Pending
    const nextShowed = demo.showed === 'Pending' ? 'Yes' : 
                      demo.showed === 'Yes' ? 'No' : 'Pending';

    await handleUpdate(id, 'showed', nextShowed);
  };

  const handleAddDemo = async () => {
    // Check if free user has reached limit
    if (subscription?.isFreeUser && subscription.totalCount >= 10) {
      const shouldUpgrade = window.confirm(
        'You have reached the limit of 10 demos for free accounts. Would you like to upgrade to premium for unlimited demos?'
      );
      if (shouldUpgrade) {
        router.push('/profile');
        return;
      }
    }

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Format as ISO string for timestamp with timezone
    const formatDateTime = (date: Date) => {
      return date.toISOString();
    };

    const newDemo = {
      name: 'New Demo',
      date_booked: formatDateTime(now),
      demo_date: formatDateTime(nextWeek),
      demo_time: '09:00:00',
      email_sent: false,
      email_sent_date: formatDateTime(now),
      call_made: false,
      call_made_date: formatDateTime(now),
      showed: 'Pending' as const,
      status: 'Pending' as const,
      score: 3
    };

    console.log('Attempting to add new demo:', newDemo);

    try {
      // First check if we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Not authenticated');
        alert('Please sign in to add demos');
        router.push('/login');
        return;
      }

      const { data, error } = await createDemo(newDemo);
      if (error) {
        console.error('Error creating demo:', error);
        if (error.message.includes('not authenticated')) {
          alert('Your session has expired. Please sign in again.');
          router.push('/login');
          return;
        }
        alert(`Failed to create demo: ${error.message}`);
        return;
      }
      if (data) {
        console.log('Demo created successfully:', data);
        // Add new demo and resort the list
        setDemos(prevDemos => {
          const updatedDemos = [...prevDemos, data];
          const sortedDemos = updatedDemos.sort((a, b) => {
            if (!a.demo_date) return 1;
            if (!b.demo_date) return -1;
            return new Date(a.demo_date).getTime() - new Date(b.demo_date).getTime();
          });
          // Update filtered demos with the same sorting
          setFilteredDemos(sortedDemos);
          return sortedDemos;
        });
      }
    } catch (err) {
      console.error('Error creating demo:', err);
      alert('An unexpected error occurred. Please try again.');
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

  const onDragEnd = async (result: DropResult) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }

    // If the item didn't move, don't do anything
    if (result.destination.index === result.source.index) {
      return;
    }

    // Instead of allowing manual reordering, we'll resort by date
    const movedDemo = demos[result.source.index];
    const targetDate = demos[result.destination.index].demo_date;

    // Update the demo's date to be the same as the target position's date
    if (movedDemo && targetDate) {
      try {
        await updateDemo(movedDemo.id, { demo_date: targetDate });
        
        // Reload demos to get the proper sort order
        await loadDemos();
      } catch (error) {
        console.error('Error updating demo date:', error);
      }
    }
  };

  // Add this new function to handle date filtering
  const handleDateFilter = (month: string, year: number) => {
    const targetMonthIndex = months.indexOf(month); // Get the 0-based index

    const filtered = demos.filter(demo => {
      if (!demo.demo_date) return false;

      // Parse the date string directly to avoid timezone issues.
      // Assumes demo_date is stored in a format like YYYY-MM-DD or ISO string.
      try {
        const datePart = demo.demo_date.substring(0, 10); // Extract "YYYY-MM-DD"
        const demoYear = parseInt(datePart.substring(0, 4), 10);
        const demoMonth = parseInt(datePart.substring(5, 7), 10) - 1; // Get 0-based month

        return demoMonth === targetMonthIndex && demoYear === year;
      } catch (e) {
        console.error("Error parsing demo date string for filtering:", demo.demo_date, e);
        return false; // Skip demos with unparseable dates
      }
    });
    setFilteredDemos(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed top-0 right-0 z-50 p-4 md:p-8">
        <button 
          onClick={handleAddDemo}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150 shadow-lg"
        >
          <span className="mr-2">+</span>
          Add Demo
        </button>
      </div>

      {subscription?.isFreeUser && subscription.totalCount > 0 && (
        <div className="p-4 md:p-8 mt-16 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-800">
                {subscription.totalCount >= 10 
                  ? 'You have reached the limit of 10 demos for free accounts.' 
                  : `You have used ${subscription.totalCount} of 10 available demos.`}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Upgrade to premium for unlimited demos and advanced features.
              </p>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      <div className="p-2 md:p-4 mt-12">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <DashboardDateFilter onFilterChange={handleDateFilter} />
          </div>
        </div>
        {/* Demo Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading demos...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredDemos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No demos yet. Click "Add Demo" to create one.</div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead>
                  <tr>
                    <th className="w-8 px-1"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRM</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Booked</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Time</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Email Date</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Call</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Call Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Showed</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Score</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <Droppable droppableId="table" direction="vertical">
                  {(provided) => (
                    <tbody
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y divide-gray-200"
                    >
                      {filteredDemos.map((demo, index) => (
                        <Draggable key={demo.id} draggableId={demo.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors duration-150`}
                            >
                              <td className="w-8 px-1">
                                <div {...provided.dragHandleProps} className="cursor-move text-gray-400 hover:text-gray-600 text-center">
                                  ⋮⋮
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <EditableCell
                                  value={demo.name || ''}
                                  onChange={(value) => handleUpdate(demo.id, 'name', value)}
                                  className="text-sm font-medium text-gray-900"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <CRMLink
                                  url={demo.url}
                                  onChange={(url) => handleUpdate(demo.id, 'url', url)}
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <EditableCell
                                  value={formatDate(demo.date_booked)}
                                  onChange={(value) => handleUpdate(demo.id, 'date_booked', value)}
                                  type="date"
                                  className="text-sm text-gray-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <EditableCell
                                  value={formatDate(demo.demo_date)}
                                  onChange={(value) => handleUpdate(demo.id, 'demo_date', value)}
                                  type="date"
                                  className="text-sm text-gray-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <EditableCell
                                  value={demo.demo_time || '09:00'}
                                  onChange={(value) => handleUpdate(demo.id, 'demo_time', value)}
                                  type="time"
                                  className="text-sm text-gray-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <input 
                                  type="checkbox" 
                                  checked={demo.email_sent}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer focus:ring-blue-500"
                                  onChange={(e) => handleCheckboxChange(e, demo.id, 'email_sent')}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                <EditableCell
                                  value={formatDate(demo.email_sent_date)}
                                  onChange={(value) => handleUpdate(demo.id, 'email_sent_date', value)}
                                  type="date"
                                  className="text-sm text-gray-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <input 
                                  type="checkbox" 
                                  checked={demo.call_made}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer focus:ring-blue-500"
                                  onChange={(e) => handleCheckboxChange(e, demo.id, 'call_made')}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                <EditableCell
                                  value={formatDate(demo.call_made_date)}
                                  onChange={(value) => handleUpdate(demo.id, 'call_made_date', value)}
                                  type="date"
                                  className="text-sm text-gray-500"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleStatusChange(demo.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  {getStatusDisplay(demo.status)}
                                </button>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleShowedChange(demo.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  {getShowedDisplay(demo.showed)}
                                </button>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <select
                                  value={demo.score || 3}
                                  onChange={(e) => handleUpdate(demo.id, 'score', parseInt(e.target.value))}
                                  className="block w-20 mx-auto text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <InlineNotes
                                  notes={demo.notes || ''}
                                  onSave={(notes) => handleUpdate(demo.id, 'notes', notes)}
                                  demoTitle={demo.name || 'Untitled Demo'}
                                />
                              </td>
                              <td className="pl-2 pr-4 py-4 whitespace-nowrap text-center">
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
  );
} 