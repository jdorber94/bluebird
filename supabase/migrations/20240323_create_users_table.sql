-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    plan_type text DEFAULT 'free' NOT NULL CHECK (plan_type IN ('free', 'premium')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

-- Create policies
CREATE POLICY "Users can view own record" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;

-- Create a trigger to set updated_at on update
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Create a trigger to automatically create user records
CREATE OR REPLACE FUNCTION handle_new_user_for_users_table()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, plan_type)
    VALUES (NEW.id, 'free');
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create the trigger with a different name to avoid conflict
DROP TRIGGER IF EXISTS on_auth_user_created_for_users ON auth.users;
CREATE TRIGGER on_auth_user_created_for_users
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_for_users_table(); 