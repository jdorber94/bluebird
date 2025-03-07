import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This is a placeholder for actual email/SMS sending functionality
// In a real application, you would integrate with services like SendGrid, Twilio, etc.
const sendEmailReminder = async (email: string, demoDetails: any) => {
  console.log(`Sending email reminder to ${email} for demo with ${demoDetails.companyName}`);
  // Implement actual email sending logic here
  return true;
};

const sendSMSReminder = async (phoneNumber: string, demoDetails: any) => {
  console.log(`Sending SMS reminder to ${phoneNumber} for demo with ${demoDetails.companyName}`);
  // Implement actual SMS sending logic here
  return true;
};

export async function POST(request: NextRequest) {
  try {
    const { demoId, type } = await request.json();
    
    if (!demoId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get the demo details
    const { data: demo, error: demoError } = await supabase
      .from('demos')
      .select('*')
      .eq('id', demoId)
      .single();
    
    if (demoError || !demo) {
      return NextResponse.json(
        { error: 'Demo not found' },
        { status: 404 }
      );
    }
    
    // Get the attendees from the demo
    const attendees = demo.attendees || [];
    
    let success = false;
    
    if (type === 'email' && demo.emailReminder) {
      // Send email reminders to all attendees
      for (const attendee of attendees) {
        if (attendee.email) {
          await sendEmailReminder(attendee.email, demo);
        }
      }
      success = true;
    } else if (type === 'sms' && demo.phoneReminder) {
      // Send SMS reminders to all attendees with phone numbers
      for (const attendee of attendees) {
        if (attendee.phoneNumber) {
          await sendSMSReminder(attendee.phoneNumber, demo);
        }
      }
      success = true;
    }
    
    // Update the demo with reminder sent status
    if (success) {
      const reminderField = type === 'email' ? 'emailReminderSent' : 'phoneReminderSent';
      await supabase
        .from('demos')
        .update({ [reminderField]: true })
        .eq('id', demoId);
    }
    
    return NextResponse.json({
      success,
      message: success ? `${type} reminders sent successfully` : `No ${type} reminders sent`,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
} 