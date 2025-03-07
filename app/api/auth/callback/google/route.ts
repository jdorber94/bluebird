import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/googleCalendar';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Get tokens from Google
    const tokens = await getTokenFromCode(code);
    
    // Store tokens in Supabase for the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Store Google tokens in Supabase
    const { error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)).toISOString(),
      });
    
    if (error) {
      console.error('Error storing tokens:', error);
      return NextResponse.redirect(new URL('/dashboard?error=token_storage', request.url));
    }
    
    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?success=calendar_connected', request.url));
  } catch (error) {
    console.error('Error in Google callback:', error);
    return NextResponse.redirect(new URL('/dashboard?error=google_auth', request.url));
  }
} 