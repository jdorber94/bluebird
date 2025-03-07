import DemoTable from '@/components/DemoTable';
import StatsCards from '@/components/StatsCards';
import AddDemoForm from '@/components/AddDemoForm';
import Navigation from '@/components/Navigation';
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
                <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium leading-none text-gray-800">JD</span>
                </span>
                <span className="ml-2">John Doe</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Suspense fallback={<div>Loading stats...</div>}>
            <StatsCards />
          </Suspense>
          
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Demos</h2>
                <div className="flex space-x-2">
                  <button className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Filter
                  </button>
                  <button className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Export
                  </button>
                </div>
              </div>
              
              <Suspense fallback={<div>Loading demos...</div>}>
                <DemoTable />
              </Suspense>
            </div>
            
            <div>
              <AddDemoForm onDemoAdded={() => {}} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 