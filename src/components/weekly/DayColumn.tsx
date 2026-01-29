'use client';

import { useDroppable } from '@dnd-kit/core';
import Link from 'next/link';
import { Schedule } from '@/types';
import { cn, formatDate, isToday, isWeekend, formatDuration, normalizeTime } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DayColumnProps {
  date: Date;
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onCompleteSchedule?: (scheduleId: string) => void;
}

export function DayColumn({
  date,
  schedules,
  onScheduleClick,
  onDeleteSchedule,
  onCompleteSchedule,
}: DayColumnProps) {
  const dateStr = formatDate(date);
  const { setNodeRef, isOver, active } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr },
  });

  const today = isToday(date);
  const weekend = isWeekend(date);

  // Sort schedules by start time
  const sortedSchedules = [...schedules].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  // Calculate total minutes
  const totalMinutes = schedules.reduce((acc, s) => {
    if (s.task) {
      return acc + s.task.estimatedMinutes;
    }
    return acc;
  }, 0);

  const completedCount = schedules.filter((s) => s.status === 'completed').length;

  return (
    <div
      className={cn(
        'flex min-w-[140px] flex-1 flex-col border-r last:border-r-0',
        weekend && 'bg-muted/30'
      )}
    >
      <Link href={`/daily/${dateStr}`} className="block border-b p-2 hover:bg-muted/50">
        <div
          className={cn(
            'text-center',
            today && 'rounded-lg bg-primary text-primary-foreground'
          )}
        >
          <div className="text-xs text-muted-foreground">
            {format(date, 'EEE', { locale: ko })}
          </div>
          <div className={cn('text-lg font-semibold', today && 'text-primary-foreground')}>
            {format(date, 'd')}
          </div>
        </div>
        {schedules.length > 0 && (
          <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>{completedCount}/{schedules.length}</span>
            <span>·</span>
            <span>{formatDuration(totalMinutes)}</span>
          </div>
        )}
      </Link>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-1 overflow-auto p-1',
          isOver && 'bg-primary/10',
          active && 'ring-2 ring-inset ring-primary/20'
        )}
      >
        {sortedSchedules.map((schedule) => (
          <div
            key={schedule.id}
            className={cn(
              'group relative cursor-pointer rounded-md p-2 text-sm transition-colors',
              schedule.status === 'completed'
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-card hover:bg-muted'
            )}
            style={{
              borderLeft: `3px solid ${schedule.task?.color || '#3b82f6'}`,
            }}
            onClick={() => onScheduleClick?.(schedule)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'font-medium truncate',
                    schedule.status === 'completed' && 'line-through text-muted-foreground'
                  )}
                >
                  {schedule.task?.title}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {normalizeTime(schedule.startTime)}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {schedule.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onCompleteSchedule?.(schedule.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      완료
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteSchedule?.(schedule.id)}
                  >
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="flex h-full items-center justify-center p-4">
            <span className="text-xs text-muted-foreground">드래그하여 추가</span>
          </div>
        )}
      </div>
    </div>
  );
}
