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

  useEffect(() => {
    const fetchDemos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view demos');
          setLoading(false);
          return;
        }

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

  if (loading) {
    return <div className="text-center py-4">Loading demos...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  if (demos.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow">
        <p className="text-gray-500">No demos found. Add your first demo using the form.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Booked
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Demo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Reminder
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Reminder
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demos.map((demo) => (
                  <tr key={demo.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{demo.company_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(demo.date_booked).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(demo.date_of_demo).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={demo.email_reminder}
                        onChange={(e) => handleReminderChange(demo.id, 'email_reminder', e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={demo.phone_reminder}
                        onChange={(e) => handleReminderChange(demo.id, 'phone_reminder', e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={demo.status}
                        onChange={(e) => handleStatusChange(demo.id, e.target.value)}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Showed">Showed</option>
                        <option value="Didn't Show">Didn't Show</option>
                        <option value="Rebook">Rebook</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTable; 