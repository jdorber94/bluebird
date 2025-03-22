'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getStripe, getPriceId } from '@/lib/stripe';
import { toast } from 'react-hot-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan_type: 'free' | 'pro';
  subscription?: any;
}

interface Subscription {
  plan_type: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string;
}

// Separate client component for checkout status handling
function CheckoutStatus({ onCheckoutComplete }: { onCheckoutComplete: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('Subscription updated successfully!');
      onCheckoutComplete(); // Trigger a data refresh
      router.replace('/profile'); // Remove query params
    } else if (checkoutStatus === 'canceled') {
      toast.error('Checkout was canceled.');
      router.replace('/profile'); // Remove query params
    }
  }, [router, searchParams, onCheckoutComplete]);

  return null;
}

// Loading component
function LoadingProfile() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
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

// Profile content component that uses useSearchParams
function ProfileContent() {
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
  const checkoutStatus = searchParams.get('checkout');

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

      console.log('Fetched data:', {
        user: userResult.data,
        subscription: subscriptionResult.data,
        profile: profileResult.data
      });

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
      
      console.log('Setting profile with plan type:', currentPlanType);
      
      // Set the profile with the correct plan type
      setProfile({
        ...profileResult.data,
        plan_type: currentPlanType
      });

      // Set subscription data if available
      if (subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
        console.log('Updated subscription data:', subscriptionResult.data);
      }

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  // Add polling after successful checkout
  useEffect(() => {
    let pollCount = 0;
    let pollInterval: NodeJS.Timeout;

    const pollForUpdates = async () => {
      if (pollCount >= 10) {
        console.log('Reached maximum poll attempts. Final state:', {
          profile: {
            id: profile?.id,
            planType: profile?.plan_type
          },
          subscription: {
            planType: subscription?.plan_type,
            status: subscription?.status
          },
          attempts: pollCount
        });
        clearInterval(pollInterval);
        toast.error('Subscription update is taking longer than expected. Please refresh the page or contact support if the issue persists.');
        return;
      }

      console.log(`Polling for updates (attempt ${pollCount + 1}/10)...`);
      await loadProfileData();
      pollCount++;

      // Check if we've received pro status
      const hasProStatus = profile?.plan_type === 'pro' || subscription?.plan_type === 'pro';
      const isActive = subscription?.status === 'active';
      
      console.log('Poll update check:', {
        attempt: pollCount,
        hasProStatus,
        isActive,
        profile: {
          id: profile?.id,
          planType: profile?.plan_type
        },
        subscription: {
          planType: subscription?.plan_type,
          status: subscription?.status,
          periodEnd: subscription?.current_period_end
        }
      });

      if (hasProStatus && isActive) {
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
  }, [searchParams, profile?.plan_type, subscription?.plan_type, subscription?.status]);

  // Add manual refresh capability
  const handleRefresh = async () => {
    console.log('Manually refreshing profile data...');
    await loadProfileData();
    toast.success('Profile data refreshed');
  };

  // Initial load
  useEffect(() => {
    loadProfileData();
  }, []);

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
        credentials: 'include', // Important: include credentials
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

  // Handle checkout for upgrading to Pro
  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      
      // Use existing price ID
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1QxtafEUo5Em020GgQptqQsJ';
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planType: 'pro',
        }),
        credentials: 'include', // Important: include credentials
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to create checkout session');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle plan change (downgrade)
  const handlePlanChange = (planType: 'free' | 'pro') => {
    // For downgrading, we'll just show a modal or redirect to support
    // This is just a placeholder
    toast.success('Please contact support to downgrade your plan.');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
              <div className="text-sm text-gray-500 mt-4">Loading subscription data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
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

  if (checkoutStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Subscription Updated!</h2>
            <p className="text-base text-gray-500">Current Plan: {profile?.plan_type}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <CheckoutStatus onCheckoutComplete={loadProfileData} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Refresh
          </button>
        </div>
        {/* Profile Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Profile Information</h3>
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

// Main profile component
export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingProfile />}>
      <ProfileContent />
    </Suspense>
  );
} 