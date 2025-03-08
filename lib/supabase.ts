import { createBrowserClient } from '@supabase/ssr';
import { Database } from './database.types';

interface Demo {
  id: number;
  name: string;
  date_booked: string;
  demo_date: string;
  demo_time: string;
  email_sent: boolean;
  call_made: boolean;
  showed: 'Yes' | 'No' | 'Pending';
  user_id?: string;
}

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
    .order('demo_date', { ascending: true });
  return { data, error };
};

export const createDemo = async (demo: Omit<Demo, 'id'>) => {
  const user = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('demos')
    .insert([{ ...demo, user_id: user.id }])
    .select()
    .single();
  return { data, error };
};

export const updateDemo = async (id: number, updates: Partial<Demo>) => {
  const user = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('demos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  return { data, error };
};

export const deleteDemo = async (id: number) => {
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