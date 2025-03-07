"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

interface AddDemoFormProps {
  onDemoAdded: () => void;
}

const AddDemoForm: React.FC<AddDemoFormProps> = ({ onDemoAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    dateBooked: new Date().toISOString().split('T')[0],
    dateOfDemo: '',
    emailReminder: true,
    phoneReminder: false,
    status: 'Scheduled',
    attendees: '',
    description: '',
    location: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to add a demo');
        setIsLoading(false);
        return;
      }

      // Parse attendees from comma-separated string to array of objects
      const attendeesArray = formData.attendees.split(',').map(email => ({
        email: email.trim(),
        name: email.trim().split('@')[0],
      }));

      // Insert the demo into Supabase
      const { error: insertError } = await supabase
        .from('demos')
        .insert([
          {
            user_id: user.id,
            company_name: formData.companyName,
            date_booked: formData.dateBooked,
            date_of_demo: formData.dateOfDemo,
            email_reminder: formData.emailReminder,
            phone_reminder: formData.phoneReminder,
            status: formData.status,
            attendees: attendeesArray,
            description: formData.description,
            location: formData.location,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      // Reset form and show success message
      setFormData({
        companyName: '',
        dateBooked: new Date().toISOString().split('T')[0],
        dateOfDemo: '',
        emailReminder: true,
        phoneReminder: false,
        status: 'Scheduled',
        attendees: '',
        description: '',
        location: '',
      });
      setSuccess('Demo added successfully!');
      
      // Notify parent component that a demo was added
      onDemoAdded();
    } catch (err) {
      console.error('Error adding demo:', err);
      setError('Failed to add demo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New Demo</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Company Name *
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="dateBooked" className="block text-sm font-medium text-gray-700">
            Date Booked
          </label>
          <input
            type="date"
            id="dateBooked"
            name="dateBooked"
            value={formData.dateBooked}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="dateOfDemo" className="block text-sm font-medium text-gray-700">
            Date of Demo *
          </label>
          <input
            type="datetime-local"
            id="dateOfDemo"
            name="dateOfDemo"
            value={formData.dateOfDemo}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">
            Attendees (comma-separated emails)
          </label>
          <input
            type="text"
            id="attendees"
            name="attendees"
            value={formData.attendees}
            onChange={handleChange}
            placeholder="john@example.com, jane@example.com"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Showed">Showed</option>
            <option value="Didn't Show">Didn't Show</option>
            <option value="Rebook">Rebook</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailReminder"
              name="emailReminder"
              checked={formData.emailReminder}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="emailReminder" className="ml-2 block text-sm text-gray-700">
              Email Reminder
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="phoneReminder"
              name="phoneReminder"
              checked={formData.phoneReminder}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="phoneReminder" className="ml-2 block text-sm text-gray-700">
              Phone Reminder
            </label>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Demo'}
        </motion.button>
      </form>
    </div>
  );
};

export default AddDemoForm; 