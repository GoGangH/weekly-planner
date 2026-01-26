'use client';

import { Schedule, Routine } from '@/types';
import { ScheduleBlock } from './ScheduleBlock';
import { TimelineSlot } from './TimelineSlot';
import { ScrollArea } from '@/components/ui/scroll-area';
import { timeToMinutes, hexToRgba } from '@/lib/utils';
import { TIME_SLOTS, DEFAULT_SLOT_HEIGHT } from '@/lib/constants';

interface TimelineProps {
  date: string;
  schedules: Schedule[];
  routines: Routine[];
  currentTime?: string;
  onScheduleClick?: (schedule: Schedule) => void;
  onScheduleComplete?: (scheduleId: string) => void;
  onScheduleDelete?: (scheduleId: string) => void;
  onScheduleReschedule?: (schedule: Schedule) => void;
}

export function Timeline({
  date,
  schedules,
  routines,
  currentTime,
  onScheduleClick,
  onScheduleComplete,
  onScheduleDelete,
  onScheduleReschedule,
}: TimelineProps) {
  // Filter routines for this day
  const dayOfWeek = new Date(date).getDay();
  const activeRoutines = routines.filter(
    (r) => r.isActive && r.days.includes(dayOfWeek)
  );

  // Calculate current time indicator position
  const currentTimePosition = currentTime
    ? (timeToMinutes(currentTime) / 30) * DEFAULT_SLOT_HEIGHT
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="relative min-h-full">
        {/* Time grid */}
        <div className="relative">
          {TIME_SLOTS.map((time) => (
            <TimelineSlot
              key={time}
              time={time}
              date={date}
              isHourStart={time.endsWith(':00')}
            />
          ))}
        </div>

        {/* Routine blocks (background) */}
        {activeRoutines.map((routine) => {
          const startMinutes = timeToMinutes(routine.startTime);
          const endMinutes = timeToMinutes(routine.endTime);
          const topOffset = (startMinutes / 30) * DEFAULT_SLOT_HEIGHT;
          const height = ((endMinutes - startMinutes) / 30) * DEFAULT_SLOT_HEIGHT;

          return (
            <div
              key={routine.id}
              className="absolute left-20 right-4 rounded-md border border-dashed opacity-50"
              style={{
                top: `${topOffset}px`,
                height: `${height}px`,
                backgroundColor: hexToRgba(routine.color, 0.1),
                borderColor: routine.color,
              }}
            >
              <div className="p-2 text-xs text-muted-foreground">
                {routine.title}
              </div>
            </div>
          );
        })}

        {/* Schedule blocks */}
        {schedules.map((schedule) => (
          <ScheduleBlock
            key={schedule.id}
            schedule={schedule}
            onClick={() => onScheduleClick?.(schedule)}
            onComplete={() => onScheduleComplete?.(schedule.id)}
            onDelete={() => onScheduleDelete?.(schedule.id)}
            onReschedule={() => onScheduleReschedule?.(schedule)}
          />
        ))}

        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div
            className="absolute left-16 right-0 z-10 flex items-center"
            style={{ top: `${currentTimePosition}px` }}
          >
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-0.5 flex-1 bg-red-500" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
