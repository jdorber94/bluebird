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
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

  // Function to load profile and subscription data
  const loadProfileData = async () => {
    try {
      console.log('Loading profile data...');
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      // Get all necessary data in parallel
      const [profileResult, userResult, subscriptionResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('users')
          .select('plan_type')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
      ]);

      console.log('Data fetch results:', {
        profile: profileResult,
        user: userResult,
        subscription: subscriptionResult
      });

      // Handle profile data
      if (profileResult.error && profileResult.error.code === 'PGRST116') {
        // Profile doesn't exist, create it
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

      // Set the profile with the correct plan type
      const currentPlanType = userResult.data?.plan_type || subscriptionResult.data?.plan_type || 'free';
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

  // Load data on mount and after successful checkout
  useEffect(() => {
    loadProfileData();
    
    if (checkoutStatus === 'success') {
      toast.success('Payment successful! Updating your subscription...');
      
      // Poll for subscription updates
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        console.log('Polling for subscription update, attempt:', attempts + 1);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          clearInterval(pollInterval);
          return;
        }

        // Get both subscription and user data
        const [{ data: subscription }, { data: user }] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .single(),
          supabase
            .from('users')
            .select('plan_type')
            .eq('id', session.user.id)
            .single()
        ]);

        console.log('Poll update - Subscription:', subscription);
        console.log('Poll update - User:', user);

        // Check both subscription and user data
        if (
          (subscription?.status === 'active' && subscription?.plan_type === 'pro') ||
          user?.plan_type === 'pro'
        ) {
          console.log('Pro subscription confirmed!');
          clearInterval(pollInterval);
          loadProfileData();
          toast.success('Subscription activated successfully!');
        } else {
          console.log('Subscription/user not yet updated:', {
            subscription: subscription || 'No subscription found',
            userPlan: user?.plan_type || 'No user plan found'
          });
          attempts++;
          if (attempts >= maxAttempts) {
            console.log('Max polling attempts reached');
            clearInterval(pollInterval);
            toast.error(
              'Subscription status is taking longer than expected to update. Please refresh the page in a few moments.'
            );
          }
        }
      }, 2000); // Poll every 2 seconds

      // Cleanup interval
      return () => clearInterval(pollInterval);
    }
  }, [checkoutStatus]);

  // Real-time subscription updates with better error handling
  useEffect(() => {
    if (!profile?.id) return;

    console.log('Setting up real-time subscription updates for user:', profile.id);
    
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        console.log('Subscription change detected:', payload);
        loadProfileData();
      })
      .subscribe((status) => {
        console.log('Subscription channel status:', status);
      });

    return () => {
      console.log('Cleaning up subscription channel');
      channel.unsubscribe();
    };
  }, [profile?.id]);

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

            {/* Plan Comparison */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <div className={`border rounded-lg p-6 ${profile?.plan_type === 'free' ? 'ring-2 ring-blue-500' : ''}`}>
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
                  <div className="mt-6">
                    {profile?.plan_type === 'free' ? (
                      <span className="block w-full text-center py-2 text-sm text-gray-500">
                        Current Plan
                      </span>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Need to downgrade?</p>
                        <button 
                          className="text-xs text-gray-600 hover:text-gray-900"
                          onClick={() => handlePlanChange('free')}
                        >
                          Contact Support
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pro Plan */}
                <div className={`border rounded-lg p-6 ${profile?.plan_type === 'pro' ? 'ring-2 ring-blue-500' : ''}`}>
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
                  <div className="mt-6">
                    {profile?.plan_type === 'pro' ? (
                      <span className="block w-full text-center py-2 text-sm text-gray-500">
                        Current Plan
                      </span>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="block w-full py-2 text-sm text-center text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkoutLoading ? 'Processing...' : 'Upgrade'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
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