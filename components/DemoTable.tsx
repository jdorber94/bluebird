"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Demo {
  id: number;
  company_name: string;
  date_booked: string;
  date_of_demo: string;
  email_reminder: boolean;
  phone_reminder: boolean;
  status: string;
  attendees: Array<{ email: string; name: string }>;
  description: string;
  location: string;
}

const DemoTable = () => {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchDemos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to view demos');
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from('demos')
        .select('*')
        .eq('user_id', user.id)
        .order('date_of_demo', { ascending: true });

      if (error) {
        throw error;
      }

      setDemos(data || []);
    } catch (err) {
      console.error('Error fetching demos:', err);
      setError('Failed to load demos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  const handleReminderChange = async (id: number, field: 'email_reminder' | 'phone_reminder', value: boolean) => {
    try {
      const { error } = await supabase
        .from('demos')
        .update({ [field]: value })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setDemos(demos.map(demo => 
        demo.id === id ? { ...demo, [field]: value } : demo
      ));
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const { error } = await supabase
        .from('demos')
        .update({ status })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setDemos(demos.map(demo => 
        demo.id === id ? { ...demo, status } : demo
      ));
    } catch (err) {
      console.error('Error updating status:', err);
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

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = d.getDate();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).replace(/\d+/, day + getOrdinalSuffix(day));
  };

  if (loading) {
    return <div className="text-center py-4">Loading demos...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">Please sign in to view and manage demos.</p>
      </div>
    );
  }

  if (demos.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">No demos found. Add your first demo using the form.</p>
      </div>
    );
  }

  // Helper function to format status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Showed':
        return <span className="text-green-500 font-medium">Yes</span>;
      case "Didn't Show":
        return <span className="text-red-500 font-medium">No</span>;
      default:
        return <span className="text-amber-500 font-medium">Pending</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Booked
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Demo Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Demo Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email Sent
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call Made
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Showed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {demos.map((demo) => {
              const demoDate = new Date(demo.date_of_demo);
              return (
                <tr key={demo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{demo.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(demo.date_booked)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(demo.date_of_demo)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {demoDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={demo.email_reminder}
                      onChange={(e) => handleReminderChange(demo.id, 'email_reminder', e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={demo.phone_reminder}
                      onChange={(e) => handleReminderChange(demo.id, 'phone_reminder', e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      value={demo.status}
                      onChange={(e) => handleStatusChange(demo.id, e.target.value)}
                    >
                      <option value="Scheduled">Pending</option>
                      <option value="Showed">Yes</option>
                      <option value="Didn't Show">No</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemoTable; 