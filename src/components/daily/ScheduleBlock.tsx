'use client';

import { Schedule } from '@/types';
import { cn, timeToMinutes, hexToRgba, formatDuration, normalizeTime } from '@/lib/utils';
import { CheckCircle, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_SLOT_HEIGHT } from '@/lib/constants';

interface ScheduleBlockProps {
  schedule: Schedule;
  onClick?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onReschedule?: () => void;
}

export function ScheduleBlock({
  schedule,
  onClick,
  onComplete,
  onDelete,
  onReschedule,
}: ScheduleBlockProps) {
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const durationMinutes = endMinutes - startMinutes;

  // Calculate position and height
  // Each 30 minutes = DEFAULT_SLOT_HEIGHT pixels
  const topOffset = ((startMinutes - 0) / 30) * DEFAULT_SLOT_HEIGHT; // 0:00 as base
  const height = (durationMinutes / 30) * DEFAULT_SLOT_HEIGHT;

  const isCompleted = schedule.status === 'completed';
  const taskColor = schedule.task?.color || '#3b82f6';

  return (
    <div
      className={cn(
        'absolute left-20 right-4 cursor-pointer rounded-md border p-2 transition-shadow hover:shadow-md',
        isCompleted ? 'opacity-70' : ''
      )}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(height - 4, 32)}px`,
        backgroundColor: hexToRgba(taskColor, 0.15),
        borderColor: taskColor,
        borderLeftWidth: '3px',
      }}
      onClick={onClick}
    >
      <div className="flex h-full flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                'truncate text-sm font-medium',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {schedule.task?.title}
            </h4>
            {durationMinutes > 30 && (
              <p className="truncate text-xs text-muted-foreground">
                {schedule.task?.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isCompleted && (
                <DropdownMenuItem onClick={onComplete}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  완료
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onReschedule}>
                <Clock className="mr-2 h-4 w-4" />
                시간 변경
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {durationMinutes >= 30 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {normalizeTime(schedule.startTime)} - {normalizeTime(schedule.endTime)}
            </span>
            <span>({formatDuration(durationMinutes)})</span>
            {isCompleted && <CheckCircle className="h-3 w-3 text-green-600" />}
          </div>
        )}
      </div>
    </div>
  );
}
