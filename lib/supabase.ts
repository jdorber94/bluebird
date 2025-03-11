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
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return { data: null, error: subscriptionError };
    }

    // Determine if user is on free plan
    const isFreeUser = !subscriptionData || subscriptionData.plan_type === 'free';

    // Get demos with appropriate limit
    const query = supabase
      .from('demos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply limit for free users
    if (isFreeUser) {
      query.limit(10);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching demos:', error);
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
  const user = await getCurrentUser();
  if (!user) {
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
    .single();

  console.log('Profile query result:', { data, error });
  if (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
  return data;
}

export async function updateProfile(updates: {
  full_name?: string;
  role?: string;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError;

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('User not authenticated') };
  }

  try {
    // First, try to use the RPC function
    try {
      await supabase.rpc('add_position_column_if_not_exists');
    } catch (rpcError) {
      console.warn('RPC function failed, falling back to direct SQL:', rpcError);
      
      // Check if position column exists and add it if it doesn't
      // This is a fallback if the RPC function fails
      const { error: alterError } = await supabase.from('demos')
        .select('position')
        .limit(1);
      
      if (alterError && alterError.message.includes('column "position" does not exist')) {
        console.log('Position column does not exist, skipping migration');
        // We'll just continue and let the app handle missing columns gracefully
      }
    }

    // Then, update existing rows with sequential positions
    const { data: demos, error: fetchError } = await supabase
      .from('demos')
      .select('id')
      .order('created_at');

    if (fetchError) {
      console.error('Error fetching demos:', fetchError);
      return { error: fetchError };
    }

    if (demos && demos.length > 0) {
      // Update each demo with a position
      for (let i = 0; i < demos.length; i++) {
        const { error: updateError } = await supabase
          .from('demos')
          .update({ position: i })
          .eq('id', demos[i].id);

        if (updateError) {
          console.error('Error updating demo position:', updateError);
          if (updateError.message.includes('column "position" does not exist')) {
            break; // Stop trying to update positions if the column doesn't exist
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Migration error:', error);
    return { error };
  }
}; 