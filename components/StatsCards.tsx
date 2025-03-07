import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalDemos: number;
  showRate: number;
  noShowRate: number;
  rebookedDemos: number;
}

const StatsCards = () => {
  const [stats, setStats] = useState<Stats>({
    totalDemos: 0,
    showRate: 0,
    noShowRate: 0,
    rebookedDemos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view stats');
          setLoading(false);
          return;
        }

        // Get all demos for the current user
        const { data, error } = await supabase
          .from('demos')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate stats
        const totalDemos = data.length;
        const showedDemos = data.filter(demo => demo.status === 'Showed').length;
        const noShowDemos = data.filter(demo => demo.status === "Didn't Show").length;
        const rebookedDemos = data.filter(demo => demo.status === 'Rebook').length;

        const showRate = totalDemos > 0 ? (showedDemos / totalDemos) * 100 : 0;
        const noShowRate = totalDemos > 0 ? (noShowDemos / totalDemos) * 100 : 0;

        setStats({
          totalDemos,
          showRate,
          noShowRate,
          rebookedDemos,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading stats...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Show Rate Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Show Rate
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats.showRate.toFixed(1)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              View all demos
            </a>
          </div>
        </div>
      </div>

      {/* No-Show Rate Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  No-Show Rate
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats.noShowRate.toFixed(1)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              View no-shows
            </a>
          </div>
        </div>
      </div>

      {/* Rebooked Demos Card */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Rebooked Demos
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats.rebookedDemos}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              View rebooked demos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 