import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
  accessRole: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const providerToken = session.provider_token;

    if (!providerToken) {
      return NextResponse.json(
        { error: 'Google Calendar access not granted. Please log in again.', calendars: [] },
        { status: 200 }
      );
    }

    // Fetch calendar list from Google Calendar API
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Calendar List API error:', errorData);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Google token expired. Please log in again.', calendars: [] },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch calendar list', calendars: [] },
        { status: 200 }
      );
    }

    const data = await response.json();

    // Transform to our format
    const calendars: GoogleCalendar[] = (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || item.id,
      description: item.description,
      backgroundColor: item.backgroundColor || '#4285F4',
      foregroundColor: item.foregroundColor || '#ffffff',
      primary: item.primary || false,
      accessRole: item.accessRole,
    }));

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    return NextResponse.json(
      { error: 'Internal server error', calendars: [] },
      { status: 200 }
    );
  }
}
