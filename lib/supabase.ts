import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    .order('dateOfDemo', { ascending: true });
  return { data, error };
};

export const createDemo = async (demo: any) => {
  const { data, error } = await supabase
    .from('demos')
    .insert([demo]);
  return { data, error };
};

export const updateDemo = async (id: number, updates: any) => {
  const { data, error } = await supabase
    .from('demos')
    .update(updates)
    .eq('id', id);
  return { data, error };
};

export const deleteDemo = async (id: number) => {
  const { data, error } = await supabase
    .from('demos')
    .delete()
    .eq('id', id);
  return { data, error };
}; 