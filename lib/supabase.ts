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
  const { data, error } = await supabase
    .from('demos')
    .select('*')
    .order('position', { ascending: true });
  return { data, error };
};

export const createDemo = async (demo: Omit<DemoInsert, 'id' | 'user_id'>) => {
  const user = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('demos')
    .insert([{
      ...demo,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  return { data, error };
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
    // First, add the position column if it doesn't exist
    await supabase.rpc('add_position_column_if_not_exists');

    // Then, update existing rows with sequential positions
    const { data: demos, error: fetchError } = await supabase
      .from('demos')
      .select('id')
      .order('created_at');

    if (fetchError) throw fetchError;

    // Update each demo with a position
    for (let i = 0; i < (demos?.length || 0); i++) {
      const { error: updateError } = await supabase
        .from('demos')
        .update({ position: i })
        .eq('id', demos![i].id);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Migration error:', error);
    return { error };
  }
}; 