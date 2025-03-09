'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Subscription {
  plan_type: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Load subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subscriptionError) throw subscriptionError;
        setSubscription(subscriptionData);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleUpgrade = async () => {
    // TODO: Implement Stripe integration
    alert('Stripe integration coming soon!');
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          cancel_at_period_end: true 
        })
        .eq('user_id', profile?.id);

      if (error) throw error;
      
      // Reload subscription data
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile?.id)
        .single();
        
      setSubscription(data);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 text-sm text-gray-900">{profile?.full_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">{profile?.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="mt-1 text-sm text-gray-900">{profile?.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Subscription</h3>
            
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Plan</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 capitalize">{subscription?.plan_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className={`mt-1 text-sm font-medium ${
                    subscription?.status === 'active' ? 'text-green-600' : 
                    subscription?.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                  } capitalize`}>
                    {subscription?.status}
                  </p>
                </div>
              </div>
              
              {subscription?.current_period_end && (
                <p className="mt-4 text-sm text-gray-500">
                  {subscription.status === 'cancelled' 
                    ? 'Access until: ' 
                    : 'Renews on: '
                  }
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Subscription Actions */}
            <div className="space-y-4">
              {subscription?.plan_type === 'free' && (
                <button
                  onClick={handleUpgrade}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upgrade to Pro
                </button>
              )}
              
              {subscription?.plan_type !== 'free' && subscription?.status === 'active' && (
                <button
                  onClick={handleCancel}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Subscription
                </button>
              )}
            </div>

            {/* Plan Comparison */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className="border rounded-lg p-6">
                  <h5 className="text-lg font-medium text-gray-900">Free</h5>
                  <p className="mt-2 text-sm text-gray-500">Perfect for getting started</p>
                  <p className="mt-4 text-3xl font-bold text-gray-900">$0</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Up to 10 demos</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Basic analytics</span>
                    </li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
                  <h5 className="text-lg font-medium text-gray-900">Pro</h5>
                  <p className="mt-2 text-sm text-gray-500">For growing teams</p>
                  <p className="mt-4 text-3xl font-bold text-gray-900">$29</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Unlimited demos</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Advanced analytics</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Priority support</span>
                    </li>
                  </ul>
                </div>

                {/* Enterprise Plan */}
                <div className="border rounded-lg p-6">
                  <h5 className="text-lg font-medium text-gray-900">Enterprise</h5>
                  <p className="mt-2 text-sm text-gray-500">For large organizations</p>
                  <p className="mt-4 text-3xl font-bold text-gray-900">Custom</p>
                  <ul className="mt-6 space-y-4">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Everything in Pro</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Dedicated support</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">Custom integrations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 