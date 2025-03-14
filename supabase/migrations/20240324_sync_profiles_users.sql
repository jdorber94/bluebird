-- This migration ensures that all users have records in both the profiles and users tables

-- First, insert missing profiles for users that exist in auth.users but not in profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    'Demo Manager'
FROM 
    auth.users au
LEFT JOIN 
    public.profiles p ON au.id = p.id
WHERE 
    p.id IS NULL;

-- Next, insert missing users for users that exist in auth.users but not in users
INSERT INTO public.users (id, plan_type)
SELECT 
    au.id,
    'free'
FROM 
    auth.users au
LEFT JOIN 
    public.users u ON au.id = u.id
WHERE 
    u.id IS NULL;

-- Finally, ensure the profile page can handle the case where a profile doesn't exist
-- by creating a function to safely get a profile
CREATE OR REPLACE FUNCTION get_profile_safe(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record json;
BEGIN
    -- Try to get the profile
    SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'role', p.role
    ) INTO profile_record
    FROM public.profiles p
    WHERE p.id = user_id;
    
    -- If no profile exists, create one
    IF profile_record IS NULL THEN
        -- Get user info from auth.users
        DECLARE
            user_email text;
            user_name text;
        BEGIN
            SELECT 
                email,
                COALESCE(raw_user_meta_data->>'full_name', email)
            INTO 
                user_email,
                user_name
            FROM auth.users
            WHERE id = user_id;
            
            -- Insert the new profile
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (user_id, user_email, user_name, 'Demo Manager')
            RETURNING json_build_object(
                'id', id,
                'email', email,
                'full_name', full_name,
                'role', role
            ) INTO profile_record;
        END;
    END IF;
    
    RETURN profile_record;
END;
$$; 