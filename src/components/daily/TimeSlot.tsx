'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface TimeSlotProps {
  time: string;
  date: string;
  isHourStart: boolean;
  children?: React.ReactNode;
}

export function TimeSlot({ time, date, isHourStart, children }: TimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeslot-${date}-${time}`,
    data: { type: 'timeslot', date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-12 border-b',
        isHourStart && 'border-t border-t-border',
        isOver && 'bg-primary/10'
      )}
    >
      {isHourStart && (
        <div className="absolute -top-3 left-0 w-16 pr-2 text-right text-xs text-muted-foreground">
          {time}
        </div>
      )}
      <div className="ml-16 h-full">{children}</div>
    </div>
  );
}
