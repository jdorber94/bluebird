import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Google Calendar API configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

// Create OAuth2 client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};

// Generate authentication URL
export const getAuthUrl = () => {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
};

// Get access token from code
export const getTokenFromCode = async (code: string) => {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Set credentials to OAuth2 client
const setCredentials = (oauth2Client: OAuth2Client, tokens: any) => {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

// List upcoming events from Google Calendar
export const listEvents = async (tokens: any, timeMin: string, timeMax: string) => {
  const oauth2Client = createOAuth2Client();
  setCredentials(oauth2Client, tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Parse calendar events to find demo appointments
export const parseDemoEvents = (events: any[]) => {
  // This is a simple implementation. In a real app, you might want to use
  // more sophisticated logic to identify demo appointments.
  return events.filter(event => {
    const summary = event.summary?.toLowerCase() || '';
    return summary.includes('demo') || summary.includes('presentation');
  }).map(event => {
    return {
      id: event.id,
      companyName: extractCompanyName(event.summary),
      dateBooked: new Date().toISOString().split('T')[0], // This would need to be stored separately
      dateOfDemo: event.start.dateTime || event.start.date,
      emailReminder: true, // Default values
      phoneReminder: false, // Default values
      status: 'Scheduled', // Default status
      attendees: event.attendees || [],
      description: event.description || '',
      location: event.location || '',
    };
  });
};

// Helper function to extract company name from event summary
const extractCompanyName = (summary: string = '') => {
  // This is a simple implementation. In a real app, you might want to use
  // more sophisticated logic to extract the company name.
  const parts = summary.split(' - ');
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return summary.trim();
}; 