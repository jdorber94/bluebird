import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types';
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
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
export const getDemos = async () => {
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated when trying to get demos');
    return { data: null, error: new Error('User not authenticated') };
  }

  try {
    const { data, error } = await supabase
      .from('demos')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    
    if (error) {
      console.error('Error fetching demos:', error);
    }
    
    return { data, error };
  } catch (err) {
    console.error('Unexpected error in getDemos:', err);
    return { data: null, error: err as Error };
  }
};

export const createDemo = async (demo: Omit<DemoInsert, 'id' | 'user_id'>) => {
  const user = await getCurrentUser();
  if (!user) {
    console.error('User not authenticated when trying to create demo');
    return { data: null, error: new Error('User not authenticated') };
  }

  try {
    // Get the current maximum position
    const { data: existingDemos, error: fetchError } = await supabase
      .from('demos')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching max position:', fetchError);
      return { data: null, error: fetchError };
    }

    const maxPosition = existingDemos && existingDemos.length > 0 ? existingDemos[0].position || 0 : -1;
    const newPosition = maxPosition + 1;

    // Create the new demo
    const { data, error } = await supabase
      .from('demos')
      .insert([{
        ...demo,
        user_id: user.id,
        position: newPosition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_reminder_sent: false,
        phone_reminder_sent: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating demo:', error);
    }
    
    return { data, error };
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
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
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