import { google, calendar_v3 } from "googleapis";
import fs from "fs";
import path from "path";

export class CalendarServiceOAuth {
  public calendarInstance: calendar_v3.Calendar;
  private oauth2Client: any;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  private readonly TOKEN_PATH = path.join(__dirname, '../tokens.json');

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
    );

    this.calendarInstance = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });

    this.loadStoredToken();
  }

  /**
   * Load stored token if exists
   */
  private loadStoredToken() {
    try {
      if (fs.existsSync(this.TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(this.TOKEN_PATH, 'utf8'));
        this.oauth2Client.setCredentials(token);
        console.log('✅ Loaded stored Google Calendar token');
      }
    } catch (error) {
      console.log('📝 No stored token found, will need to authenticate');
    }
  }

  /**
   * Get authorization URL with proper parameters
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      response_type: 'code',
      include_granted_scopes: true,
      prompt: 'consent'
    });
  }

  /**
   * Get access token from authorization code
   */
  async getAccessToken(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Store the token
      fs.writeFileSync(this.TOKEN_PATH, JSON.stringify(tokens));
      console.log('✅ Token stored successfully');
    } catch (error) {
      console.error('Error retrieving access token:', error);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.oauth2Client.credentials && 
           this.oauth2Client.credentials.access_token;
  }

  /**
   * Get calendar events
   */
  async getEvents(maxResults: number = 50): Promise<calendar_v3.Schema$Event[]> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const response = await this.calendarInstance.events.list({
        calendarId: process.env.CALENDAR_ID || 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Parse transaction event
   */
  parseTransactionEvent(event: calendar_v3.Schema$Event): any {
    const title = event.summary?.toLowerCase() || "";
    
    // Enhanced parsing patterns for Aptos
    const patterns = {
      send: /send\s+(\d+(?:\.\d+)?)\s+(apt|aptos|usdc|usdt)\s+to\s+([a-z0-9]+(?:\.[a-z]+)*|0x[a-f0-9]+)/i,
      swap: /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for)\s+(\w+)/i,
      delegate: /delegate\s+(\d+(?:\.\d+)?)\s+(apt|aptos)\s+to\s+([a-z0-9]+(?:\.[a-z]+)*|0x[a-f0-9]+)/i,
    };

    // Check send pattern
    const sendMatch = title.match(patterns.send);
    if (sendMatch) {
      return {
        type: "send",
        amount: sendMatch[1],
        token: sendMatch[2].toUpperCase(),
        toAddress: sendMatch[3],
        requiresApproval: (event.attendees?.length || 0) > 0,
        approvers: event.attendees?.map(a => a.email || "") || [],
      };
    }

    // Check swap pattern
    const swapMatch = title.match(patterns.swap);
    if (swapMatch) {
      return {
        type: "swap",
        amount: swapMatch[1],
        fromToken: swapMatch[2].toUpperCase(),
        toToken: swapMatch[3].toUpperCase(),
        requiresApproval: (event.attendees?.length || 0) > 0,
        approvers: event.attendees?.map(a => a.email || "") || [],
      };
    }

    // Check delegate pattern
    const delegateMatch = title.match(patterns.delegate);
    if (delegateMatch) {
      return {
        type: "delegate",
        amount: delegateMatch[1],
        token: delegateMatch[2].toUpperCase(),
        validator: delegateMatch[3],
        requiresApproval: (event.attendees?.length || 0) > 0,
        approvers: event.attendees?.map(a => a.email || "") || [],
      };
    }

    return null;
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    title: string,
    startTime: Date,
    description?: string,
    duration: number = 60 // minutes
  ): Promise<{ eventId: string, eventUrl: string }> {
    try {
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      
      const event = {
        summary: title,
        description: description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await this.calendarInstance.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return {
        eventId: response.data.id || '',
        eventUrl: response.data.htmlLink || ''
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}