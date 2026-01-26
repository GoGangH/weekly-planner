import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');
  const calendarIds = searchParams.get('calendarIds'); // 쉼표로 구분된 캘린더 ID 목록

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: 'timeMin and timeMax are required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not authenticated', events: [] },
        { status: 200 }
      );
    }

    const providerToken = session.provider_token;

    if (!providerToken) {
      return NextResponse.json(
        { error: 'Google Calendar access not granted.', events: [] },
        { status: 200 }
      );
    }

    // 캘린더 ID 목록 파싱 (없으면 primary만)
    const calendars = calendarIds ? calendarIds.split(',').filter(Boolean) : ['primary'];

    // 모든 캘린더에서 이벤트 가져오기
    const allEvents: any[] = [];

    for (const calendarId of calendars) {
      try {
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '50',
          }),
          {
            headers: {
              Authorization: `Bearer ${providerToken}`,
            },
          }
        );

        if (calendarResponse.ok) {
          const data = await calendarResponse.json();
          const events = (data.items || []).map((event: any) => ({
            id: event.id,
            calendarId,
            title: event.summary || '(제목 없음)',
            description: event.description || '',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            isAllDay: !event.start?.dateTime,
            location: event.location || '',
            color: event.colorId ? getGoogleColor(event.colorId) : getCalendarColor(calendarId),
            source: 'google',
            htmlLink: event.htmlLink,
          }));
          allEvents.push(...events);
        } else if (calendarResponse.status === 401) {
          return NextResponse.json(
            { error: 'Google token expired.', events: [] },
            { status: 200 }
          );
        }
      } catch (e) {
        console.error(`Error fetching calendar ${calendarId}:`, e);
      }
    }

    // 시작 시간으로 정렬
    allEvents.sort((a, b) => (a.start || '').localeCompare(b.start || ''));

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error', events: [] },
      { status: 200 }
    );
  }
}

// 캘린더별 기본 색상
function getCalendarColor(calendarId: string): string {
  // 간단한 해시 기반 색상 선택
  const colors = ['#4285F4', '#0F9D58', '#F4B400', '#DB4437', '#AB47BC', '#00ACC1', '#FF7043'];
  let hash = 0;
  for (let i = 0; i < calendarId.length; i++) {
    hash = calendarId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Google Calendar color IDs to hex colors
function getGoogleColor(colorId: string): string {
  const colors: Record<string, string> = {
    '1': '#7986CB', // Lavender
    '2': '#33B679', // Sage
    '3': '#8E24AA', // Grape
    '4': '#E67C73', // Flamingo
    '5': '#F6BF26', // Banana
    '6': '#F4511E', // Tangerine
    '7': '#039BE5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3F51B5', // Blueberry
    '10': '#0B8043', // Basil
    '11': '#D50000', // Tomato
  };
  return colors[colorId] || '#4285F4';
}
