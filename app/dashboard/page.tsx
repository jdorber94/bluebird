"use client";

import { useState } from 'react';
import EditableCell from '../components/EditableCell';

interface Demo {
  id: number;
  name: string;
  dateBooked: string;
  demoDate: string;
  demoTime: string;
  emailSent: boolean;
  callMade: boolean;
  showed: 'Yes' | 'No' | 'Pending';
}

export default function Dashboard() {
  const [demos, setDemos] = useState<Demo[]>([
    {
      id: 1,
      name: 'John Smith',
      dateBooked: 'Nov 1, 2023',
      demoDate: 'Nov 10, 2023',
      demoTime: '10:00 AM',
      emailSent: true,
      callMade: false,
      showed: 'Yes'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      dateBooked: 'Nov 2, 2023',
      demoDate: 'Nov 12, 2023',
      demoTime: '2:30 PM',
      emailSent: true,
      callMade: true,
      showed: 'No'
    },
    {
      id: 3,
      name: 'Michael Brown',
      dateBooked: 'Nov 3, 2023',
      demoDate: 'Nov 15, 2023',
      demoTime: '11:15 AM',
      emailSent: false,
      callMade: false,
      showed: 'Pending'
    },
    {
      id: 4,
      name: 'Emily Davis',
      dateBooked: 'Nov 5, 2023',
      demoDate: 'Nov 18, 2023',
      demoTime: '3:00 PM',
      emailSent: true,
      callMade: true,
      showed: 'Yes'
    },
    {
      id: 5,
      name: 'Robert Wilson',
      dateBooked: 'Nov 7, 2023',
      demoDate: 'Nov 20, 2023',
      demoTime: '9:45 AM',
      emailSent: true,
      callMade: false,
      showed: 'Pending'
    }
  ]);

  const handleUpdate = (id: number, field: keyof Demo, value: any) => {
    setDemos(demos.map(demo => 
      demo.id === id ? { ...demo, [field]: value } : demo
    ));
  };

  const handleCheckboxChange = (id: number, field: 'emailSent' | 'callMade') => {
    setDemos(demos.map(demo =>
      demo.id === id ? { ...demo, [field]: !demo[field] } : demo
    ));
  };

  const handleShowedChange = (id: number) => {
    setDemos(demos.map(demo => {
      if (demo.id === id) {
        const states: ('Yes' | 'No' | 'Pending')[] = ['Yes', 'No', 'Pending'];
        const currentIndex = states.indexOf(demo.showed);
        const nextIndex = (currentIndex + 1) % states.length;
        return { ...demo, showed: states[nextIndex] };
      }
      return demo;
    }));
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
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <span className="mr-2">+</span>
                Add Demo
              </button>
            </div>
          </div>

          {/* Demo Table */}
          <div className="bg-white rounded-lg shadow">
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
                        value={demo.dateBooked}
                        onChange={(value) => handleUpdate(demo.id, 'dateBooked', value)}
                        type="date"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <EditableCell
                        value={demo.demoDate}
                        onChange={(value) => handleUpdate(demo.id, 'demoDate', value)}
                        type="date"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <EditableCell
                        value={demo.demoTime}
                        onChange={(value) => handleUpdate(demo.id, 'demoTime', value)}
                        type="time"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input 
                        type="checkbox" 
                        checked={demo.emailSent}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                        onChange={() => handleCheckboxChange(demo.id, 'emailSent')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input 
                        type="checkbox" 
                        checked={demo.callMade}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                        onChange={() => handleCheckboxChange(demo.id, 'callMade')}
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
          </div>
        </div>
      </div>
    </div>
  );
} 