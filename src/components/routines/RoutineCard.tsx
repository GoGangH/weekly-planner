'use client';

import { Routine } from '@/types';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { Clock, MoreHorizontal, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RoutineCardProps {
  routine: Routine;
  onEdit?: (routine: Routine) => void;
  onDelete?: (routineId: string) => void;
  onToggleActive?: (routineId: string) => void;
}

export function RoutineCard({
  routine,
  onEdit,
  onDelete,
  onToggleActive,
}: RoutineCardProps) {
  const getDayLabels = (days: number[]) => {
    if (days.length === 7) return '매일';
    if (
      days.length === 5 &&
      days.includes(1) &&
      days.includes(2) &&
      days.includes(3) &&
      days.includes(4) &&
      days.includes(5)
    ) {
      return '평일';
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return '주말';
    }
    return days
      .sort((a, b) => a - b)
      .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
      .join(', ');
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md',
        !routine.isActive && 'opacity-60'
      )}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
        style={{ backgroundColor: routine.color }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{routine.title}</h4>
            {!routine.isActive && (
              <Badge variant="secondary" className="text-xs">
                비활성
              </Badge>
            )}
            {routine.autoSchedule && (
              <Badge variant="outline" className="text-xs">
                자동 배치
              </Badge>
            )}
          </div>
          {routine.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {routine.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleActive?.(routine.id)}>
              <Power className="mr-2 h-4 w-4" />
              {routine.isActive ? '비활성화' : '활성화'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(routine)}>
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(routine.id)}
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {routine.startTime} - {routine.endTime}
        </span>
        <span>{getDayLabels(routine.days)}</span>
      </div>
    </div>
  );
}
