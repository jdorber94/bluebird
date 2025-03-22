-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_for_users ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

-- Create a consolidated function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table
    INSERT INTO public.users (id, plan_type, created_at, updated_at)
    VALUES (
        NEW.id,
        'free',
        NOW(),
        NOW()
    );

    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'Demo Manager',
        NOW(),
        NOW()
    );

    -- Insert into subscriptions table
    INSERT INTO public.subscriptions (
        user_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        'free',
        'active',
        NOW(),
        NOW() + INTERVAL '30 days',
        false,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a single trigger for all user-related table insertions
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_complete();

-- Ensure all existing users have records in all tables
INSERT INTO public.users (id, plan_type, created_at, updated_at)
SELECT 
    au.id,
    'free',
    NOW(),
    NOW()
FROM 
    auth.users au
LEFT JOIN 
    public.users u ON au.id = u.id
WHERE 
    u.id IS NULL;

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    'Demo Manager',
    NOW(),
    NOW()
FROM 
    auth.users au
LEFT JOIN 
    public.profiles p ON au.id = p.id
WHERE 
    p.id IS NULL;

INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    created_at,
    updated_at
)
SELECT 
    au.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    false,
    NOW(),
    NOW()
FROM 
    auth.users au
LEFT JOIN 
    public.subscriptions s ON au.id = s.user_id
WHERE 
    s.user_id IS NULL; 