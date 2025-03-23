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
        setFilteredDemos(sortedDemos); // Initialize filtered demos with all demos
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
    
    if (field === 'url') {
      console.log('Updating CRM URL:', { id, url: value });
    }
    
    // Find the demo and update it locally first
    const demoIndex = demos.findIndex(d => d.id === id);
    if (demoIndex === -1) {
      console.error('Demo not found:', id);
      return;
    }

    // Create a new array with the updated demo
    const updatedDemos = [...demos];
    updatedDemos[demoIndex] = {
      ...updatedDemos[demoIndex],
      [field]: value
    };
    console.log('Updated demo:', updatedDemos[demoIndex]);

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
    console.log('Database update successful for field:', field);
  };

  const handleCheckboxChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: 'email_sent' | 'call_made'
  ) => {
    const checked = e.target.checked;
    
    // Update only the checkbox state
    const updates = {
      [field]: checked
    };
    
    // Find the demo and update it locally first
    const demoIndex = demos.findIndex(d => d.id === id);
    if (demoIndex === -1) return;

    // Create a new array with the updated demo
    const updatedDemos = [...demos];
    updatedDemos[demoIndex] = {
      ...updatedDemos[demoIndex],
      ...updates
    };

    // Update the state immediately
    setDemos(updatedDemos);

    // Then update the database
    const { error } = await updateDemo(id, updates);
    if (error) {
      console.error('Error updating demo:', error);
      // Revert the change if there was an error
      setDemos(demos);
      return;
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
          return updatedDemos.sort((a, b) => {
            if (!a.demo_date) return 1;
            if (!b.demo_date) return -1;
            return new Date(a.demo_date).getTime() - new Date(b.demo_date).getTime();
          });
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
    const filtered = demos.filter(demo => {
      if (!demo.demo_date) return false;
      const demoDate = new Date(demo.demo_date);
      return demoDate.getMonth() === months.indexOf(month) && 
             demoDate.getFullYear() === year;
    });
    setFilteredDemos(filtered);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 p-4 flex flex-col transition-all duration-300 ease-in-out relative`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-xl font-semibold ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Bluebird</h1>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isSidebarCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-2">
          <a href="#" className={`flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Dashboard</span>
          </a>
        </nav>
        
        {/* Settings and Profile Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <a href="#" className={`flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mb-4 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`ml-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Settings</span>
          </a>
          <div className={`${isSidebarCollapsed ? 'px-0' : ''}`}>
            <ProfileMenu isCollapsed={isSidebarCollapsed} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
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

          <div className="p-4 md:p-8 mt-16">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <a
                  href="/dashboard/analytics"
                  className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors"
                >
                  View Analytics
                </a>
              </div>
            </div>
            <DashboardDateFilter onFilterChange={handleDateFilter} />
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
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead>
                      <tr>
                        <th className="w-10 px-2"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CRM</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Booked</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Time</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Email Sent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Email Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Call Made</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Call Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Showed</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        <th className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"></th>
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
                                    <CRMLink
                                      url={demo.url}
                                      onChange={(url) => handleUpdate(demo.id, 'url', url)}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <EditableCell
                                      value={formatDate(demo.date_booked)}
                                      onChange={(value) => handleUpdate(demo.id, 'date_booked', value)}
                                      type="date"
                                      className="text-sm text-gray-500"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <EditableCell
                                      value={formatDate(demo.demo_date)}
                                      onChange={(value) => handleUpdate(demo.id, 'demo_date', value)}
                                      type="date"
                                      className="text-sm text-gray-500"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <EditableCell
                                      value={demo.demo_time || '09:00'}
                                      onChange={(value) => handleUpdate(demo.id, 'demo_time', value)}
                                      type="time"
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
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <EditableCell
                                      value={formatDate(demo.email_sent_date)}
                                      onChange={(value) => handleUpdate(demo.id, 'email_sent_date', value)}
                                      type="date"
                                      className="text-sm text-gray-500"
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
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <EditableCell
                                      value={formatDate(demo.call_made_date)}
                                      onChange={(value) => handleUpdate(demo.id, 'call_made_date', value)}
                                      type="date"
                                      className="text-sm text-gray-500"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => handleStatusChange(demo.id)}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      {getStatusDisplay(demo.status)}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => handleShowedChange(demo.id)}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      {getShowedDisplay(demo.showed)}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
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
                                  <td className="px-6 py-4 whitespace-nowrap">
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
      </div>
    </div>
  );
} 