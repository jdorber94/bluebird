"use client";

import { useEffect, useState } from 'react';
import EditableCell from '../components/EditableCell';
import { getDemos, updateDemo, createDemo, deleteDemo } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Demo {
  id: number;
  name: string;
  date_booked: string;
  demo_date: string;
  demo_time: string;
  email_sent: boolean;
  call_made: boolean;
  showed: 'Yes' | 'No' | 'Pending';
}

export default function Dashboard() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDemos();
  }, []);

  const loadDemos = async () => {
    setLoading(true);
    const { data, error } = await getDemos();
    if (error) {
      console.error('Error loading demos:', error);
      return;
    }
    setDemos(data || []);
    setLoading(false);
  };

  const handleUpdate = async (id: number, field: keyof Demo, value: any) => {
    const { error } = await updateDemo(id, { [field]: value });
    if (error) {
      console.error('Error updating demo:', error);
      return;
    }
    await loadDemos();
  };

  const handleCheckboxChange = async (id: number, field: 'email_sent' | 'call_made') => {
    const demo = demos.find(d => d.id === id);
    if (!demo) return;
    
    const { error } = await updateDemo(id, { [field]: !demo[field] });
    if (error) {
      console.error('Error updating demo:', error);
      return;
    }
    await loadDemos();
  };

  const handleShowedChange = async (id: number) => {
    const demo = demos.find(d => d.id === id);
    if (!demo) return;

    const states: ('Yes' | 'No' | 'Pending')[] = ['Yes', 'No', 'Pending'];
    const currentIndex = states.indexOf(demo.showed);
    const nextIndex = (currentIndex + 1) % states.length;
    
    const { error } = await updateDemo(id, { showed: states[nextIndex] });
    if (error) {
      console.error('Error updating demo:', error);
      return;
    }
    await loadDemos();
  };

  const handleAddDemo = async () => {
    const newDemo = {
      name: 'New Demo',
      date_booked: new Date().toISOString(),
      demo_date: new Date().toISOString(),
      demo_time: '09:00',
      email_sent: false,
      call_made: false,
      showed: 'Pending' as const
    };

    const { error } = await createDemo(newDemo);
    if (error) {
      console.error('Error creating demo:', error);
      return;
    }
    await loadDemos();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h1 className="text-xl font-semibold mb-8">Bluebird</h1>
        <nav className="space-y-2">
          <a href="#" className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md">
            <span className="mr-3">📊</span>
            Demo Dashboard
          </a>
          <div className="mt-auto pt-8">
            <a href="#" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <span className="mr-3">⚙️</span>
              Settings
            </a>
          </div>
        </nav>
        {/* User Profile */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-300"></div>
          <div>
            <div className="text-sm font-medium">Yusuf Hilmi</div>
            <div className="text-xs text-gray-500">Demo Manager</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold">Demo Show Rate Tracker</h2>
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
            ) : demos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No demos yet. Click "Add Demo" to create one.</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Booked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demo Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Made</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Showed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {demos.map((demo) => (
                    <tr key={demo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <EditableCell
                          value={demo.name}
                          onChange={(value) => handleUpdate(demo.id, 'name', value)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <EditableCell
                          value={demo.date_booked}
                          onChange={(value) => handleUpdate(demo.id, 'date_booked', value)}
                          type="date"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <EditableCell
                          value={demo.demo_date}
                          onChange={(value) => handleUpdate(demo.id, 'demo_date', value)}
                          type="date"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <EditableCell
                          value={demo.demo_time}
                          onChange={(value) => handleUpdate(demo.id, 'demo_time', value)}
                          type="time"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input 
                          type="checkbox" 
                          checked={demo.email_sent}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                          onChange={() => handleCheckboxChange(demo.id, 'email_sent')}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input 
                          type="checkbox" 
                          checked={demo.call_made}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                          onChange={() => handleCheckboxChange(demo.id, 'call_made')}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleShowedChange(demo.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            demo.showed === 'Yes' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            demo.showed === 'No' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                            'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {demo.showed}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-gray-400 hover:text-gray-600">•••</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 