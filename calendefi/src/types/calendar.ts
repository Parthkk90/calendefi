export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: string[];
  location?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
}

export interface ParsedIntent {
    type: 'payment' | 'swap' | 'governance';
    amount?: number;
    token?: string;
    to?: string;
    from?: string;
    details?: string;
}