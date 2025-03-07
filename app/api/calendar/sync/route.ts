import { NextRequest, NextResponse } from 'next/server';
import { listEvents, parseDemoEvents } from '@/lib/googleCalendar';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }
    
    // Set time range for events (e.g., next 30 days)
    const now = new Date();
    const timeMin = now.toISOString();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const timeMax = thirtyDaysLater.toISOString();
    
    // Get events from Google Calendar
    const events = await listEvents(
      {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      },
      timeMin,
      timeMax
    );
    
    // Parse events to find demos
    const demoEvents = parseDemoEvents(events || []);
    
    // Store demo events in Supabase
    for (const demo of demoEvents) {
      const { error: demoError } = await supabase
        .from('demos')
        .upsert({
          ...demo,
          user_id: user.id,
        });
      
      if (demoError) {
        console.error('Error storing demo:', demoError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${demoEvents.length} demo events`,
      demos: demoEvents,
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
} 