import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent } from '../../types/calendar';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const setCredentials = (token: string) => {
  oauth2Client.setCredentials(JSON.parse(token));
};

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items || [];
  return events.map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
  }));
};