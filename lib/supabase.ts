import { createBrowserClient } from '@supabase/ssr';
import { Database, GetDemosResponse } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';

type Demo = Database['public']['Tables']['demos']['Row'];
type DemoInsert = Database['public']['Tables']['demos']['Insert'];
type DemoUpdate = Database['public']['Tables']['demos']['Update'];

// Initialize the Supabase client
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Authentication functions
export const signUp = async (email: string, password: string) => {
  console.log('Starting signup process for:', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  console.log('Signup result:', { data, error });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Demo management functions
export const getDemos = async (): Promise<GetDemosResponse> => {
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated when trying to get demos');
    return { data: null, error: new Error('User not authenticated') };
  }

  try {
    // First get the user's subscription status
    console.log('Fetching subscription data for user:', user.id);
    let subscriptionData;
    let subscriptionError;
    
    try {
      const result = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully
      
      subscriptionData = result.data;
      subscriptionError = result.error;
    } catch (err) {
      console.error('Error in subscription query:', err);
      subscriptionError = err;
    }

    // If there's no subscription found, create a default free subscription
    if (!subscriptionData && !subscriptionError) {
      console.log('No subscription found, creating default free subscription');
      const { data: newSubscription, error: createError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: user.id,
          plan_type: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (!createError) {
        subscriptionData = newSubscription;
      } else {
        console.error('Error creating default subscription:', createError);
      }
    }

    // Determine if user is on free plan - default to free if any issues
    const isFreeUser = !subscriptionData || subscriptionData.plan_type === 'free';
    console.log('Is free user:', isFreeUser);

    // Get demos with appropriate limit
    const query = supabase
      .from('demos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply limit for free users
    if (isFreeUser) {
      console.log('Applying 10 demo limit for free user');
      query.limit(10);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching demos:', error);
      if (error.message.includes('does not exist')) {
        console.error('Demos table may not exist or RLS policies are not set up correctly');
      }
    } else {
      console.log('Successfully fetched demos:', data?.length || 0, 'demos');
    }
    
    return { 
      data, 
      error,
      subscription: {
        isFreeUser,
        plan: subscriptionData?.plan_type || 'free',
        totalCount: isFreeUser ? await getTotalDemoCount(user.id) : data?.length || 0
      }
    };
  } catch (err) {
    console.error('Unexpected error in getDemos:', err);
    return { data: null, error: err as Error };
  }
};

// Helper function to get total demo count
const getTotalDemoCount = async (userId: string) => {
  const { count } = await supabase
    .from('demos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
};

export const createDemo = async (demo: Omit<DemoInsert, 'id' | 'user_id'>) => {
  try {
    // Get the current user and log the result
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check result:', { user, authError });

    if (authError) {
      console.error('Auth error:', authError);
      return { data: null, error: authError };
    }

    if (!user) {
      console.error('No user found');
      return { data: null, error: new Error('User not authenticated') };
    }

    const now = new Date().toISOString();
    const demoData: Omit<DemoInsert, 'id'> = {
      ...demo,
      user_id: user.id,
      email_sent: false,
      email_sent_date: demo.email_sent_date || now,
      call_made: false,
      call_made_date: demo.call_made_date || now,
      showed: 'Pending',
      status: 'Pending',
      created_at: now,
      updated_at: now
    };

    console.log('Creating demo with data:', demoData);

    // First check if we can query the demos table
    const { error: testError } = await supabase
      .from('demos')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Test query error:', testError);
      return { data: null, error: testError };
    }

    // Then try to insert the demo
    const { data, error } = await supabase
      .from('demos')
      .insert([demoData])
      .select()
      .single();

    if (error) {
      console.error('Error creating demo:', error);
      return { data: null, error };
    }
    
    console.log('Demo created successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in createDemo:', err);
    return { data: null, error: err as Error };
  }
};

export const updateDemo = async (id: string, updates: DemoUpdate) => {
  console.log('Updating demo:', { id, updates });
  
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated');
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('demos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Database update error:', error);
  } else {
    console.log('Database update successful:', data);
  }
  
  return { data, error };
};

export const deleteDemo = async (id: string) => {
  const user = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('demos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  return { data, error };
};

// Profile functions
export async function getProfile() {
  console.log('Fetching profile...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('Auth user result:', { user, userError });
  
  if (userError || !user) {
    console.error('Auth error or no user:', userError);
    throw userError;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  console.log('Profile query result:', { data, error });
  
  if (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
  
  // If profile doesn't exist, create it
  if (!data) {
    console.log('Profile not found, creating...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: user.id, 
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          role: 'Demo Manager'
        }
      ])
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating profile:', createError);
      throw createError;
    }
    
    return newProfile;
  }
  
  return data;
}

export async function updateProfile(updates: {
  full_name?: string;
  role?: string;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError;

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
    
  if (!existingProfile) {
    // Create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: user.id, 
          email: user.email,
          full_name: updates.full_name || user.user_metadata?.full_name || user.email,
          role: updates.role || 'Demo Manager'
        }
      ])
      .select()
      .single();
      
    if (createError) throw createError;
    return newProfile;
  }
  
  // Update existing profile
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Migration function to add position column
export const migrateDemosTable = async () => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error or no user:', userError);
      return { error: userError || new Error('No user found') };
    }

    // Add notes column if it doesn't exist
    const { error: notesError } = await supabase.rpc('add_notes_column');
    if (notesError) {
      console.error('Error adding notes column:', notesError);
      // Continue with URL column migration even if notes column exists
    }

    // Add URL column if it doesn't exist
    const { error: urlError } = await supabase.rpc('add_url_column');
    if (urlError) {
      console.error('Error adding URL column:', urlError);
      // Continue with score column migration even if URL column exists
    }

    // Add score column if it doesn't exist
    const { error: scoreError } = await supabase.rpc('add_score_column');
    if (scoreError) {
      console.error('Error adding score column:', scoreError);
      return { error: scoreError };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error in migrateDemosTable:', err);
    return { error: err as Error };
  }
}; 