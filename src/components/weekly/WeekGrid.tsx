'use client';

import { Schedule } from '@/types';
import { DayColumn } from './DayColumn';
import { getWeekDates, formatDate } from '@/lib/utils';

interface WeekGridProps {
  currentDate: Date;
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onCompleteSchedule?: (scheduleId: string) => void;
}

export function WeekGrid({
  currentDate,
  schedules,
  onScheduleClick,
  onDeleteSchedule,
  onCompleteSchedule,
}: WeekGridProps) {
  const weekDates = getWeekDates(currentDate);

  // Group schedules by date
  const schedulesByDate = weekDates.reduce<Record<string, Schedule[]>>(
    (acc, date) => {
      const dateStr = formatDate(date);
      acc[dateStr] = schedules.filter((s) => s.date === dateStr);
      return acc;
    },
    {}
  );

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {weekDates.map((date) => {
        const dateStr = formatDate(date);
        return (
          <DayColumn
            key={dateStr}
            date={date}
            schedules={schedulesByDate[dateStr] || []}
            onScheduleClick={onScheduleClick}
            onDeleteSchedule={onDeleteSchedule}
            onCompleteSchedule={onCompleteSchedule}
          />
        );
      })}
    </div>
  );
}
