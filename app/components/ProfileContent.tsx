'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStripe, getPriceId } from '@/lib/stripe';
import { toast } from 'react-hot-toast';

interface ProfileContentProps {
  isModal?: boolean;
  onClose?: () => void;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  plan_type: 'free' | 'pro';
  subscription?: any;
}

interface Subscription {
  plan_type: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string;
}

export default function ProfileContent({ isModal, onClose }: ProfileContentProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Function to load profile and subscription data
  const loadProfileData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching latest profile data...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session found');

      // Fetch all data in parallel
      const [userResult, subscriptionResult, profileResult] = await Promise.all([
        // Get user data
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        
        // Get subscription data
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .single(),
        
        // Get profile data
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
      ]);

      // Handle profile data
      if (profileResult.error && profileResult.error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            role: 'Demo Manager'
          }])
          .select()
          .single();

        if (createError) throw createError;
        profileResult.data = newProfile;
      } else if (profileResult.error) {
        throw profileResult.error;
      }

      // Determine current plan type from both user and subscription data
      const currentPlanType = userResult.data?.plan_type || subscriptionResult.data?.plan_type || 'free';
      
      // Set the profile with the correct plan type
      setProfile({
        ...profileResult.data,
        plan_type: currentPlanType
      });

      // Set subscription data if available
      if (subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
      }

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  // Handle checkout for upgrading to Pro
  const handleUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please try logging in again.');
        router.push('/login');
        return;
      }
      
      if (!session) {
        toast.error('Please log in to upgrade your subscription');
        router.push('/login');
        return;
      }
      
      const priceId = getPriceId();
      
      if (!priceId) {
        console.error('Price ID not found in environment variables');
        toast.error('Configuration error. Please contact support.');
        return;
      }
      
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planType: 'pro',
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { sessionUrl, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }
      
      if (!sessionUrl) {
        throw new Error('No checkout URL returned');
      }
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err) {
      console.error('Error initiating checkout:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout process');
    } finally {
      setCheckoutLoading(false);
    }
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
      toast.success('Your subscription will be canceled at the end of the billing period.');
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription');
    }
  };

  const handleEditName = () => {
    setNewName(profile?.full_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!profile?.id || !newName.trim()) return;
    
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: newName.trim() } : null);
      setIsEditingName(false);
      toast.success('Name updated successfully');
    } catch (err) {
      console.error('Error updating name:', err);
      toast.error('Failed to update name');
    } finally {
      setIsSavingName(false);
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      toast.error('Failed to sign out');
    }
  };

  // Initial load
  useEffect(() => {
    loadProfileData();
  }, []);

  // Add polling after successful checkout
  useEffect(() => {
    let pollCount = 0;
    let pollInterval: NodeJS.Timeout;

    const pollForUpdates = async () => {
      if (pollCount >= 10) {
        console.log('Reached maximum poll attempts');
        clearInterval(pollInterval);
        toast.error('Subscription update is taking longer than expected. Please refresh the page.');
        return;
      }

      console.log(`Polling for updates (attempt ${pollCount + 1}/10)...`);
      await loadProfileData();
      pollCount++;

      // Check if we've received pro status
      if (profile?.plan_type === 'pro' && subscription?.status === 'active') {
        console.log('Pro status confirmed, stopping polling');
        clearInterval(pollInterval);
        toast.success('Your subscription has been activated!');
      }
    };

    // Start polling if we're in a post-checkout state
    if (searchParams?.get('checkout') === 'success') {
      console.log('Starting post-checkout polling...');
      pollInterval = setInterval(pollForUpdates, 2000);
      return () => clearInterval(pollInterval);
    }
  }, [searchParams, profile?.plan_type, subscription?.status]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className={`${isModal ? '' : 'min-h-screen bg-gray-50 py-12'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isModal ? '' : 'min-h-screen bg-gray-50 py-12'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isModal ? '' : 'min-h-screen bg-gray-50 py-12'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        {!isModal && (
          <div className="mb-6">
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h3>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1">
                  {isEditingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter your name"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSavingName || !newName.trim()}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSavingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900">{profile?.full_name}</div>
                      <button
                        onClick={handleEditName}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">{profile?.email}</div>
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
                  {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>

            {/* Subscription Actions */}
            <div className="space-y-4">
              {subscription?.plan_type === 'free' && (
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? 'Processing...' : 'Upgrade Now'}
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
          </div>
        </div>
      </div>
    </div>
  );
} 