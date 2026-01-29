'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday as checkIsToday,
  parseISO,
  isSameDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTaskStore } from '@/stores/taskStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useRoutineStore, } from '@/stores/routineStore';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Schedule, Routine, ScheduleFormData, CalendarViewType } from '@/types';
import { DayView } from '@/components/calendar/DayView';
import { formatDate, formatDuration, timeToMinutes, getWeekId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScheduleForm } from '@/components/schedule/ScheduleForm';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Calendar,
  CalendarDays,
  List,
  GripVertical,
  LocateFixed,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

// Time constants
const START_HOUR = 5;
const END_HOUR = 29;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
  const hour = (START_HOUR + i) % 24;
  return { hour, label: `${String(hour).padStart(2, '0')}:00` };
});

// 슬롯 기반 시간 계산 (1시간 = 6슬롯, 10분 단위)
const SLOTS_PER_HOUR = 6;
const MINUTES_PER_SLOT = 10;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

// 시간을 슬롯 인덱스로 변환
function timeToSlotIndex(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  let adjustedHours = hours < START_HOUR ? hours + 24 : hours;
  const totalMinutes = (adjustedHours - START_HOUR) * 60 + minutes;
  return Math.floor(totalMinutes / MINUTES_PER_SLOT);
}

function CalendarContent() {
  const searchParams = useSearchParams();

  // View state - URL 파라미터 우선, 기본값 week
  const [viewType, setViewType] = useState<CalendarViewType>(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'day' || viewParam === 'week') {
      return viewParam;
    }
    return 'week';
  });

  // 클라이언트에서 localStorage 복원 (hydration 이후)
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    // URL에 view 파라미터가 없을 때만 localStorage에서 복원
    const viewParam = searchParams.get('view');
    if (!viewParam) {
      const saved = localStorage.getItem('calendar-view-type');
      if (saved === 'day' || saved === 'week') {
        setViewType(saved);
      }
    }
  }, [searchParams]);
  const [currentDate, setCurrentDate] = useState(() => {
    const dateParam = searchParams.get('date');
    return dateParam ? parseISO(dateParam) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get('date');
    return dateParam ? parseISO(dateParam) : new Date();
  });

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedDay, setSelectedDay] = useState<string>(formatDate(new Date()));

  // Stores
  const { tasks, fetchTasks } = useTaskStore();
  const { schedules, fetchSchedules, addSchedule, updateScheduleStatus, toggleScheduleItem } = useScheduleStore();
  const { routines, fetchRoutines, routineToScheduleData, toggleRoutineCompletion, isRoutineCompleted, autoGenerateSchedulesForDate, getRoutinesForDate } = useRoutineStore();

  // Google Calendar
  const { events: googleEvents } = useGoogleCalendar({
    date: currentDate,
    view: viewType,
  });

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchRoutines();
  }, [fetchTasks, fetchSchedules, fetchRoutines]);

  // 뷰 타입 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('calendar-view-type', viewType);
  }, [viewType]);

  // 루틴에서 자동으로 일정 생성 (한 번만 실행)
  const [autoGenerateRan, setAutoGenerateRan] = useState(false);

  useEffect(() => {
    const autoGenerate = async () => {
      // 이미 실행했거나 루틴이 없으면 스킵
      if (autoGenerateRan || routines.length === 0) return;

      setAutoGenerateRan(true);

      // 오늘 날짜에 대해 자동 생성 (DB에서 직접 중복 체크함)
      const todayStr = formatDate(new Date());
      const newSchedules = await autoGenerateSchedulesForDate(todayStr);

      if (newSchedules.length > 0) {
        // 새 일정이 생성되었으면 스케줄 다시 불러오기
        fetchSchedules();
      }
    };

    autoGenerate();
  }, [routines, autoGenerateSchedulesForDate, fetchSchedules, autoGenerateRan]);

  // Week data
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekId = useMemo(() => getWeekId(currentDate), [currentDate]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Filtered data
  const backlogTasks = useMemo(
    () => tasks.filter((t) => t.status === 'backlog'),
    [tasks]
  );

  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter((s) => s.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // dayOfWeek만 받는 함수 (기존 호환)
  const getRoutinesForDay = (dayOfWeek: number) => {
    return routines.filter((r) => r.isActive && r.days.includes(dayOfWeek));
  };

  // 특정 날짜에 해당하는 루틴 조회 (날짜 범위 체크 포함)
  const getRoutinesForDateLocal = (date: Date) => {
    const dateStr = formatDate(date);
    return getRoutinesForDate(dateStr);
  };

  // Navigation
  const goToPrev = () => {
    if (viewType === 'week') {
      setCurrentDate((d) => subWeeks(d, 1));
    } else {
      setCurrentDate((d) => addDays(d, -1));
    }
  };

  const goToNext = () => {
    if (viewType === 'week') {
      setCurrentDate((d) => addWeeks(d, 1));
    } else {
      setCurrentDate((d) => addDays(d, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handlers
  const handleSubmitSchedule = async (data: ScheduleFormData) => {
    try {
      await addSchedule(data);
      setIsSheetOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to create schedule:', errorMessage, error);
      alert(`일정 생성 실패: ${errorMessage}`);
    }
  };

  const handleAddTaskToDay = (date: Date, time?: string) => {
    setSelectedDay(formatDate(date));
    setSelectedTime(time || '09:00');
    setIsSheetOpen(true);
  };

  const handleToggleComplete = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'planned' : 'completed';
    await updateScheduleStatus(scheduleId, newStatus as any);
  };

  // Time position helpers
  const getTimePosition = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    let adjustedHours = hours < START_HOUR ? hours + 24 : hours;
    const totalMinutes = (adjustedHours - START_HOUR) * 60 + minutes;
    const totalRange = (END_HOUR - START_HOUR) * 60;
    return (totalMinutes / totalRange) * 100;
  };

  const getTimeHeight = (startTime: string, endTime: string): number => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    let duration = endMins - startMins;
    if (duration < 0) duration += 24 * 60;
    const totalRange = (END_HOUR - START_HOUR) * 60;
    return Math.max((duration / totalRange) * 100, 1.5);
  };

  const isCurrentWeek = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return formatDate(weekStart) === formatDate(thisWeekStart);
  }, [weekStart]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={goToPrev} className="rounded-full p-2 hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToNext} className="rounded-full p-2 hover:bg-muted">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-lg font-semibold">
              {viewType === 'week'
                ? format(weekStart, 'yyyy년 M월', { locale: ko })
                : format(currentDate, 'M월 d일', { locale: ko })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {viewType === 'week'
                ? `${format(weekStart, 'd일', { locale: ko })} - ${format(weekEnd, 'd일', { locale: ko })}`
                : format(currentDate, 'EEEE', { locale: ko })}
            </p>
          </div>

          {/* Today button */}
          <button
            onClick={goToToday}
            className={cn(
              'rounded-full p-2 transition-colors',
              isCurrentWeek && checkIsToday(currentDate)
                ? 'text-muted-foreground'
                : 'text-primary hover:bg-primary/10'
            )}
            title="오늘로 이동"
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </div>

        {/* View Toggle & Week Days */}
        <div className="px-4 pb-3 flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg shrink-0">
            <button
              onClick={() => setViewType('week')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewType === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">주간</span>
            </button>
            <button
              onClick={() => setViewType('day')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewType === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">일간</span>
            </button>
          </div>

          {/* Week Days (Mini Calendar) */}
          <div className="flex flex-1 justify-around lg:justify-center lg:gap-2">
            {weekDates.map((date) => {
              const isToday = checkIsToday(date);
              const isSelected = viewType === 'day' && isSameDay(date, currentDate);
              const daySchedules = getSchedulesForDate(date);

              return (
                <button
                  key={formatDate(date)}
                  onClick={() => {
                    setCurrentDate(date);
                    setSelectedDate(date);
                    if (viewType === 'week') setViewType('day');
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 min-w-[36px] lg:min-w-[48px] transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <span className={cn('text-[10px]', !isSelected && !isToday && 'text-muted-foreground')}>
                    {format(date, 'EEE', { locale: ko })}
                  </span>
                  <span className="text-sm font-semibold">{format(date, 'd')}</span>
                  {daySchedules.length > 0 && (
                    <div className="flex gap-0.5">
                      {daySchedules.slice(0, 3).map((s, idx) => (
                        <div
                          key={idx}
                          className="h-1 w-1 rounded-full"
                          style={{
                            backgroundColor: isSelected ? 'currentColor' : s.task?.color || '#8B7CF6',
                            opacity: isSelected ? 0.7 : 1,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Task List Toggle (Desktop) */}
          <button
            onClick={() => setIsTaskListOpen(!isTaskListOpen)}
            className={cn(
              'hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isTaskListOpen ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            <List className="h-4 w-4" />
            <span>백로그</span>
            {backlogTasks.length > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-xs',
                isTaskListOpen ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
              )}>
                {backlogTasks.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          {viewType === 'week' ? (
            <WeekView
              weekDates={weekDates}
              schedules={schedules}
              routines={routines}
              getSchedulesForDate={getSchedulesForDate}
              getRoutinesForDay={getRoutinesForDay}
              onAddTask={handleAddTaskToDay}
              onToggleRoutine={toggleRoutineCompletion}
              isRoutineCompleted={isRoutineCompleted}
            />
          ) : (
            <DayView
              date={currentDate}
              schedules={getSchedulesForDate(currentDate)}
              routines={getRoutinesForDateLocal(currentDate)}
              googleEvents={googleEvents}
              onAddTask={() => handleAddTaskToDay(currentDate)}
            />
          )}
        </div>

        {/* Backlog Sidebar (Desktop) */}
        {isTaskListOpen && (
          <aside className="hidden lg:flex w-80 border-l bg-card flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">미할당 할 일</h2>
              <p className="text-xs text-muted-foreground mt-1">
                클릭하거나 드래그해서 일정에 추가하세요
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {backlogTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    미할당 할 일이 없습니다
                  </p>
                ) : (
                  backlogTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('taskId', task.id);
                      }}
                      onClick={() => {
                        setSelectedDay(formatDate(viewType === 'day' ? currentDate : new Date()));
                        setIsSheetOpen(true);
                      }}
                      className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 cursor-pointer hover:bg-muted transition-colors group"
                      style={{ borderLeft: `4px solid ${task.color}` }}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(task.estimatedMinutes)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedDay(formatDate(viewType === 'day' ? currentDate : new Date()));
                  setIsSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                새 할 일
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* FAB - 모바일에서는 하단, 데스크톱에서는 사이드바가 닫혀있을 때 표시 */}
      <div className={cn(
        "fixed flex flex-col gap-2",
        "bottom-20 right-4 lg:bottom-6",
        isTaskListOpen && "lg:hidden" // 데스크톱에서 사이드바가 열려있으면 숨김
      )}>
        {backlogTasks.length > 0 && (
          <button
            onClick={() => setIsTaskListOpen(true)}
            className="relative flex items-center justify-center h-12 w-12 rounded-full bg-card shadow-lg border lg:hidden"
          >
            <List className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {backlogTasks.length}
            </span>
          </button>
        )}
        <button
          onClick={() => {
            // 주간 뷰에서는 선택된 날짜, 일간 뷰에서는 현재 보고 있는 날짜
            setSelectedDay(formatDate(currentDate));
            setIsSheetOpen(true);
          }}
          className="flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Add Schedule Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col p-0" showCloseButton={false}>
          {/* 고정 헤더 */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
            <SheetTitle className="text-lg font-semibold">
              {format(parseISO(selectedDay), 'M월 d일 (EEEE)', { locale: ko })}에 일정 추가
            </SheetTitle>
            <button
              onClick={() => setIsSheetOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* 스크롤 가능한 컨텐츠 영역 */}
          <div className="flex-1 overflow-auto px-6 py-4">
            <ScheduleForm
              date={selectedDay}
              initialTime={selectedTime}
              routines={getRoutinesForDay(parseISO(selectedDay).getDay())}
              onSubmit={handleSubmitSchedule}
              onCancel={() => setIsSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Task List Sheet */}
      <Sheet open={isTaskListOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setIsTaskListOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl flex flex-col p-0" showCloseButton={false}>
          {/* 고정 헤더 */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
            <SheetTitle className="text-lg font-semibold">미할당 할 일</SheetTitle>
            <button
              onClick={() => setIsTaskListOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* 스크롤 가능한 컨텐츠 영역 */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-2 pb-4">
              {backlogTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setIsTaskListOpen(false);
                    setSelectedDay(formatDate(viewType === 'day' ? currentDate : new Date()));
                    setIsSheetOpen(true);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-left hover:bg-muted transition-colors"
                  style={{ borderLeft: `4px solid ${task.color}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(task.estimatedMinutes)}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}


// Week View Component - 슬롯 기반 그리드 (1시간 = 6슬롯, 10분 단위)
function WeekView({
  weekDates,
  schedules,
  routines,
  getSchedulesForDate,
  getRoutinesForDay,
  onAddTask,
  onToggleRoutine,
  isRoutineCompleted,
}: {
  weekDates: Date[];
  schedules: Schedule[];
  routines: Routine[];
  getSchedulesForDate: (date: Date) => Schedule[];
  getRoutinesForDay: (day: number) => Routine[];
  onAddTask: (date: Date, time?: string) => void;
  onToggleRoutine: (routineId: string, date: string) => void;
  isRoutineCompleted: (routineId: string, date: string) => boolean;
}) {
  // 슬롯에 어떤 일정/루틴이 있는지 계산
  const getSlotData = (date: Date) => {
    const dateStr = formatDate(date);
    const daySchedules = getSchedulesForDate(date);
    const dayRoutines = getRoutinesForDay(date.getDay())
      .filter(r => !daySchedules.some(s => s.routineId === r.id)); // 이미 일정화된 루틴 제외

    // 슬롯별 데이터 초기화
    const slots: Array<{
      schedule: Schedule | null;
      routine: Routine | null;
      isScheduleStart: boolean;
      isRoutineStart: boolean;
    }> = Array.from({ length: TOTAL_SLOTS }, () => ({
      schedule: null,
      routine: null,
      isScheduleStart: false,
      isRoutineStart: false,
    }));

    // 일정을 슬롯에 배치
    daySchedules.forEach((schedule) => {
      const startSlot = timeToSlotIndex(schedule.startTime);
      const endSlot = timeToSlotIndex(schedule.endTime);

      for (let i = startSlot; i < endSlot && i < TOTAL_SLOTS; i++) {
        if (i >= 0) {
          slots[i].schedule = schedule;
          if (i === startSlot) {
            slots[i].isScheduleStart = true;
          }
        }
      }
    });

    // 루틴을 슬롯에 배치
    dayRoutines.forEach((routine) => {
      const startSlot = timeToSlotIndex(routine.startTime);
      const endSlot = timeToSlotIndex(routine.endTime);

      for (let i = startSlot; i < endSlot && i < TOTAL_SLOTS; i++) {
        if (i >= 0 && !slots[i].schedule) { // 일정이 없는 슬롯에만
          slots[i].routine = routine;
          if (i === startSlot) {
            slots[i].isRoutineStart = true;
          }
        }
      }
    });

    return { slots, dateStr };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="flex border-b bg-background sticky top-0 z-10">
        <div className="w-10 shrink-0 border-r" />
        {weekDates.map((date) => {
          const isToday = checkIsToday(date);
          return (
            <div
              key={formatDate(date)}
              className={cn(
                'flex-1 text-center py-2 border-r last:border-r-0 text-xs font-medium',
                isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground'
              )}
            >
              <span className="hidden lg:inline">{format(date, 'EEE', { locale: ko })} </span>
              <span className={cn(isToday && 'text-primary font-bold')}>
                {format(date, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable Time Grid */}
      <ScrollArea className="flex-1">
        <div className="flex">
          {/* Time column */}
          <div className="w-10 shrink-0 border-r bg-muted/30">
            {HOURS.map(({ hour }) => (
              <div
                key={hour}
                className="h-7 border-b border-muted/30 flex items-center justify-center"
              >
                <span className="text-[10px] text-muted-foreground font-medium">
                  {String(hour % 24).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const isToday = checkIsToday(date);
            const { slots, dateStr } = getSlotData(date);

            return (
              <div
                key={dateStr}
                className={cn(
                  'flex-1 border-r last:border-r-0 min-w-[42px]',
                  isToday && 'bg-primary/5'
                )}
              >
                {/* 시간별 행 (1시간 = 1행, 6개 셀) */}
                {HOURS.map(({ hour }) => {
                  const hourStartSlot = (hour < START_HOUR ? hour + 24 - START_HOUR : hour - START_HOUR) * SLOTS_PER_HOUR;

                  return (
                    <div
                      key={hour}
                      className="h-7 border-b border-muted/30 flex"
                      onClick={() => onAddTask(date, `${String(hour).padStart(2, '0')}:00`)}
                    >
                      {/* 6개 셀 (10분 단위) */}
                      {Array.from({ length: SLOTS_PER_HOUR }).map((_, slotInHour) => {
                        const globalSlotIndex = hourStartSlot + slotInHour;
                        const slot = slots[globalSlotIndex];
                        const hasSchedule = !!slot?.schedule;
                        const hasRoutine = !!slot?.routine;
                        const hasContent = hasSchedule || hasRoutine;

                        if (hasSchedule && slot.schedule) {
                          const schedule = slot.schedule;

                          return (
                            <div
                              key={slotInHour}
                              className="flex-1 border-r last:border-r-0 border-muted/20 flex items-center overflow-hidden"
                              style={{
                                backgroundColor: schedule.color || '#8B7CF6',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {slot.isScheduleStart && (
                                <span className="text-[8px] font-medium text-white px-0.5 truncate">
                                  {schedule.title}
                                </span>
                              )}
                            </div>
                          );
                        }

                        if (hasRoutine && slot.routine) {
                          const routine = slot.routine;

                          return (
                            <div
                              key={slotInHour}
                              className="flex-1 border-r last:border-r-0 border-muted/20 flex items-center overflow-hidden cursor-pointer"
                              style={{
                                backgroundColor: `${routine.color}40`,
                                borderColor: routine.color,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleRoutine(routine.id, dateStr);
                              }}
                            >
                              {slot.isRoutineStart && (
                                <span
                                  className="text-[8px] font-medium px-0.5 truncate"
                                  style={{ color: routine.color }}
                                >
                                  {routine.title}
                                </span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={slotInHour}
                            className="flex-1 border-r last:border-r-0 border-muted/20 hover:bg-muted/20 transition-colors"
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
