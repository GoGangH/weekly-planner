import { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { useSettingsStore } from '@/stores/settingsStore';

export interface GoogleCalendarEvent {
  id: string;
  calendarId?: string;
  title: string;
  description: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string;
  color: string;
  source: 'google';
  htmlLink: string;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
}

interface UseGoogleCalendarOptions {
  date: Date;
  view: 'day' | 'week';
}

export function useGoogleCalendar({ date, view }: UseGoogleCalendarOptions) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { enabledCalendars } = useSettingsStore();

  // 캘린더 목록 가져오기
  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/list');
      const data = await response.json();
      if (data.calendars) {
        setCalendars(data.calendars);
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let timeMin: Date;
      let timeMax: Date;

      if (view === 'day') {
        timeMin = startOfDay(date);
        timeMax = endOfDay(date);
      } else {
        timeMin = startOfWeek(date, { weekStartsOn: 1 });
        timeMax = endOfWeek(date, { weekStartsOn: 1 });
      }

      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });

      // 활성화된 캘린더 ID 추가
      if (enabledCalendars.length > 0) {
        params.set('calendarIds', enabledCalendars.join(','));
      }

      const response = await fetch(`/api/calendar/events?${params}`);
      const data = await response.json();

      setEvents(data.events || []);
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [date, view, enabledCalendars]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    calendars,
    isLoading,
    error,
    refetch: fetchEvents,
    refetchCalendars: fetchCalendars,
  };
}

// Helper to filter events for a specific date
export function filterEventsForDate(events: GoogleCalendarEvent[], date: Date): GoogleCalendarEvent[] {
  const dateStr = format(date, 'yyyy-MM-dd');

  return events.filter(event => {
    const eventStart = event.start.split('T')[0];
    const eventEnd = event.end.split('T')[0];

    // Check if the date falls within the event range
    return eventStart <= dateStr && dateStr <= eventEnd;
  });
}

// Helper to get time from ISO string
export function getEventTime(isoString: string): { hours: number; minutes: number } | null {
  if (!isoString.includes('T')) {
    return null; // All-day event
  }

  const date = new Date(isoString);
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
  };
}
