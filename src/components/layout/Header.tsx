'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWeekStore } from '@/stores/weekStore';
import { formatWeekRange, formatDateKo } from '@/lib/utils';

interface HeaderProps {
  view?: 'weekly' | 'daily';
  date?: Date;
}

export function Header({ view = 'weekly', date }: HeaderProps) {
  const { currentDate, goToNextWeek, goToPrevWeek, goToToday } = useWeekStore();
  const displayDate = date || currentDate;

  const handlePrev = () => {
    if (view === 'weekly') {
      goToPrevWeek();
    }
    // For daily view, navigation is handled by the page
  };

  const handleNext = () => {
    if (view === 'weekly') {
      goToNextWeek();
    }
  };

  const handleToday = () => {
    goToToday();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleToday}>
          <Calendar className="mr-2 h-4 w-4" />
          오늘
        </Button>

        <h2 className="text-lg font-semibold">
          {view === 'weekly'
            ? formatWeekRange(displayDate)
            : formatDateKo(displayDate)}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Future: Add view switcher, search, etc. */}
      </div>
    </header>
  );
}
