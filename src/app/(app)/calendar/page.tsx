'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useRoutineStore } from '@/stores/routineStore';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Task, Schedule, Routine, TaskFormData, ScheduleFormData, CalendarViewType } from '@/types';
import { formatDate, formatDuration, timeToMinutes, getWeekId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScheduleTaskForm } from '@/components/tasks/ScheduleTaskForm';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Check,
  Calendar,
  CalendarDays,
  List,
  GripVertical,
  LocateFixed,
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

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // View state
  const [viewType, setViewType] = useState<CalendarViewType>(() => {
    const viewParam = searchParams.get('view');
    return viewParam === 'day' ? 'day' : 'week';
  });
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
  const { tasks, fetchTasks, addTask, updateTask } = useTaskStore();
  const { schedules, fetchSchedules, addSchedule, updateScheduleStatus } = useScheduleStore();
  const { routines, fetchRoutines } = useRoutineStore();

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

  const getRoutinesForDay = (dayOfWeek: number) => {
    return routines.filter((r) => r.isActive && r.days.includes(dayOfWeek));
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
  const handleSubmitNewTask = async (data: TaskFormData, startTime: string, endTime: string) => {
    try {
      const newTask = await addTask(data);
      await addSchedule({ taskId: newTask.id, date: selectedDay, startTime, endTime }, newTask);
      await updateTask(newTask.id, { status: 'scheduled' });
      setIsSheetOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to create task:', errorMessage, error);
      alert(`할 일 생성 실패: ${errorMessage}\n\nSupabase에 tasks 테이블이 있는지 확인해주세요.`);
    }
  };

  const handleSubmitExistingTask = async (task: Task, startTime: string, endTime: string) => {
    try {
      await addSchedule({ taskId: task.id, date: selectedDay, startTime, endTime }, task);
      await updateTask(task.id, { status: 'scheduled' });
      setIsSheetOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to add to timeline:', errorMessage, error);
      alert(`일정 추가 실패: ${errorMessage}`);
    }
  };

  // 태스크 없이 일정만 등록
  const handleSubmitEvent = async (data: ScheduleFormData) => {
    try {
      await addSchedule(data);
      setIsSheetOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to create event:', errorMessage, error);
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

  const handleQuickAddTask = async (task: Task, date: Date) => {
    const startTime = '09:00';
    const endTime = formatTime(9, task.estimatedMinutes);
    try {
      await addSchedule({ taskId: task.id, date: formatDate(date), startTime, endTime }, task);
      await updateTask(task.id, { status: 'scheduled' });
      setIsTaskListOpen(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
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
              getTimePosition={getTimePosition}
              getTimeHeight={getTimeHeight}
              onAddTask={handleAddTaskToDay}
              onToggleComplete={handleToggleComplete}
            />
          ) : (
            <DayView
              date={currentDate}
              schedules={getSchedulesForDate(currentDate)}
              routines={getRoutinesForDay(currentDate.getDay())}
              googleEvents={googleEvents}
              onAddTask={() => handleAddTaskToDay(currentDate)}
              onToggleComplete={handleToggleComplete}
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

      {/* Add Task Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-auto">
          <SheetHeader>
            <SheetTitle>
              {format(parseISO(selectedDay), 'M월 d일 (EEEE)', { locale: ko })}에 일정 추가
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ScheduleTaskForm
              date={selectedDay}
              initialTime={selectedTime}
              backlogTasks={backlogTasks}
              onSubmitNew={handleSubmitNewTask}
              onSubmitExisting={handleSubmitExistingTask}
              onSubmitEvent={handleSubmitEvent}
              onCancel={() => setIsSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Task List Sheet */}
      <Sheet open={isTaskListOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setIsTaskListOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>미할당 할 일</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4">
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

// Week View Component
function WeekView({
  weekDates,
  schedules,
  routines,
  getSchedulesForDate,
  getRoutinesForDay,
  getTimePosition,
  getTimeHeight,
  onAddTask,
  onToggleComplete,
}: {
  weekDates: Date[];
  schedules: Schedule[];
  routines: Routine[];
  getSchedulesForDate: (date: Date) => Schedule[];
  getRoutinesForDay: (day: number) => Routine[];
  getTimePosition: (time: string) => number;
  getTimeHeight: (start: string, end: string) => number;
  onAddTask: (date: Date, time?: string) => void;
  onToggleComplete: (id: string, status: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Day Headers - Desktop only */}
      <div className="hidden lg:flex border-b bg-background sticky top-0 z-10">
        <div className="w-16 shrink-0 border-r" />
        {weekDates.map((date) => {
          const isToday = checkIsToday(date);
          return (
            <div
              key={formatDate(date)}
              className={cn(
                'flex-1 text-center py-2 border-r last:border-r-0 text-sm font-medium',
                isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground'
              )}
            >
              {format(date, 'EEE', { locale: ko })}
              <span className={cn('ml-1', isToday && 'text-primary font-bold')}>
                {format(date, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable Time Grid */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-[800px] lg:min-h-[1000px]">
          {/* Time column */}
          <div className="w-12 lg:w-16 shrink-0 border-r bg-muted/30 pt-4">
            {HOURS.filter((_, i) => i % 2 === 0).map(({ hour, label }, index) => (
              <div
                key={hour}
                className="relative"
                style={{ height: `${100 / (HOURS.length / 2)}%` }}
              >
                <span className="absolute top-0 left-1 lg:left-2 text-[10px] lg:text-xs text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const dateStr = formatDate(date);
            const daySchedules = getSchedulesForDate(date);
            const dayRoutines = getRoutinesForDay(date.getDay());
            const isToday = checkIsToday(date);

            return (
              <div
                key={dateStr}
                className={cn(
                  'flex-1 relative border-r last:border-r-0 min-w-[48px] pt-4',
                  isToday && 'bg-primary/5'
                )}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('taskId');
                  if (taskId) {
                    onAddTask(date);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => onAddTask(date)}
              >
                {/* Hour grid lines */}
                {HOURS.filter((_, i) => i % 2 === 0).map(({ hour }) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-dashed border-muted"
                    style={{ top: `calc(16px + ${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * (100 - 2)}%)` }}
                  />
                ))}

              {/* Routines */}
              {dayRoutines.map((routine) => (
                <div
                  key={`routine-${routine.id}`}
                  className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 overflow-hidden opacity-50 pointer-events-none"
                  style={{
                    top: `${getTimePosition(routine.startTime)}%`,
                    height: `${getTimeHeight(routine.startTime, routine.endTime)}%`,
                    minHeight: '14px',
                    backgroundColor: `${routine.color}30`,
                    borderLeft: `2px solid ${routine.color}`,
                  }}
                >
                  <p className="text-[8px] lg:text-[10px] font-medium truncate" style={{ color: routine.color }}>
                    {routine.title}
                  </p>
                </div>
              ))}

              {/* Schedules */}
              {daySchedules.map((schedule) => {
                const scheduleTitle = schedule.task?.title || schedule.title || '일정';
                const scheduleColor = schedule.task?.color || schedule.color || '#8B7CF6';

                return (
                  <div
                    key={schedule.id}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded px-1 py-0.5 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
                      schedule.status === 'completed' && 'opacity-50'
                    )}
                    style={{
                      top: `${getTimePosition(schedule.startTime)}%`,
                      height: `${getTimeHeight(schedule.startTime, schedule.endTime)}%`,
                      minHeight: '18px',
                      backgroundColor:
                        schedule.status === 'completed' ? '#e5e5e5' : `${scheduleColor}20`,
                      borderLeft: `2px solid ${scheduleColor}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(schedule.id, schedule.status);
                    }}
                  >
                    <p
                      className={cn(
                        'text-[9px] lg:text-[11px] font-medium truncate',
                        schedule.status === 'completed' && 'line-through text-muted-foreground'
                      )}
                    >
                      {scheduleTitle}
                    </p>
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

// Day View Component
function DayView({
  date,
  schedules,
  routines,
  googleEvents,
  onAddTask,
  onToggleComplete,
}: {
  date: Date;
  schedules: Schedule[];
  routines: Routine[];
  googleEvents: any[];
  onAddTask: () => void;
  onToggleComplete: (id: string, status: string) => void;
}) {
  const timelineItems = useMemo(() => {
    const items: any[] = [];

    // 일정 (태스크 기반 또는 독립 일정)
    schedules.forEach((s) => {
      items.push({
        id: s.id,
        type: 'schedule',
        title: s.task?.title || s.title || '일정',
        startTime: s.startTime,
        endTime: s.endTime,
        color: s.task?.color || s.color || '#8B7CF6',
        isCompleted: s.status === 'completed',
        data: s,
      });
    });

    // 루틴
    routines.forEach((r) => {
      items.push({
        id: `routine-${r.id}`,
        type: 'routine',
        title: r.title,
        startTime: r.startTime,
        endTime: r.endTime,
        color: r.color,
        isCompleted: false,
        data: r,
      });
    });

    // Google 캘린더 이벤트
    googleEvents.forEach((event) => {
      // 시간 추출 (ISO string에서)
      let startTime = '00:00';
      let endTime = '23:59';

      if (event.start && event.start.includes('T')) {
        const startDate = new Date(event.start);
        startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
      }
      if (event.end && event.end.includes('T')) {
        const endDate = new Date(event.end);
        endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      }

      items.push({
        id: `google-${event.id}`,
        type: 'google',
        title: event.title,
        startTime,
        endTime,
        color: event.color || '#4285F4',
        isCompleted: false,
        isAllDay: event.isAllDay,
        location: event.location,
        htmlLink: event.htmlLink,
        data: event,
      });
    });

    return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, routines, googleEvents]);

  if (timelineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Clock className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">일정이 없어요</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">할 일을 추가해보세요</p>
        <Button onClick={onAddTask}>
          <Plus className="h-4 w-4 mr-2" />
          일정 추가
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {timelineItems.map((item, index) => {
          const durationMins = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);

          return (
            <div key={item.id} className="flex gap-4">
              <div className="w-14 text-right shrink-0 pt-3">
                <span className="text-xs text-muted-foreground">{item.startTime}</span>
              </div>

              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                    item.isCompleted ? 'bg-green-100' : ''
                  )}
                  style={{ backgroundColor: item.isCompleted ? undefined : `${item.color}20` }}
                >
                  {item.type === 'routine' ? (
                    <span className="text-lg">🔄</span>
                  ) : item.type === 'google' ? (
                    <span className="text-lg">📅</span>
                  ) : (
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  )}
                </div>
                {index < timelineItems.length - 1 && (
                  <div
                    className="w-1 flex-1 min-h-[40px] rounded-full"
                    style={{ backgroundColor: `${item.color}40` }}
                  />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div
                  className={cn(
                    'rounded-2xl p-4 transition-all',
                    item.isCompleted ? 'bg-muted/50' : 'bg-card shadow-sm'
                  )}
                  style={{ borderLeft: `4px solid ${item.color}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.isAllDay ? '종일' : `${item.startTime} - ${item.endTime} (${formatDuration(durationMins)})`}
                        {item.type === 'routine' && ' · 루틴'}
                        {item.type === 'google' && ' · Google 캘린더'}
                      </p>
                      <p
                        className={cn(
                          'font-medium',
                          item.isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {item.title}
                      </p>
                      {item.location && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {item.location}</p>
                      )}
                    </div>

                    {item.type === 'schedule' && (
                      <button
                        onClick={() => onToggleComplete(item.id, item.isCompleted ? 'completed' : 'planned')}
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                          item.isCompleted
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-muted-foreground/30 hover:border-green-500'
                        )}
                      >
                        {item.isCompleted && <Check className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex gap-4 pt-2">
          <div className="w-14" />
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 text-primary text-sm font-medium hover:bg-primary/5 rounded-xl px-3 py-2"
          >
            <Plus className="h-4 w-4" />
            일정 추가
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper function
function formatTime(hours: number, minutes: number): string {
  const totalMins = hours * 60 + minutes;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
