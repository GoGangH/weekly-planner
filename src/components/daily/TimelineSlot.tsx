'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { DEFAULT_SLOT_HEIGHT } from '@/lib/constants';

interface TimelineSlotProps {
  time: string;
  date: string;
  isHourStart: boolean;
}

export function TimelineSlot({ time, date, isHourStart }: TimelineSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `timeslot-${date}-${time}`,
    data: { type: 'timeslot', date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative border-b border-border/30',
        isHourStart && 'border-t border-t-border',
        isOver && 'bg-primary/10'
      )}
      style={{ height: `${DEFAULT_SLOT_HEIGHT}px` }}
    >
      {isHourStart && (
        <div className="absolute -top-3 left-2 w-14 text-right text-xs text-muted-foreground">
          {time}
        </div>
      )}
    </div>
  );
}
