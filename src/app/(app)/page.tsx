'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, addDays, isToday as checkIsToday, isMonday, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTaskStore } from '@/stores/taskStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWeekStore } from '@/stores/weekStore';
import { formatDate, formatDuration, getWeekId } from '@/lib/utils';
import { Clock, ArrowRight, Sparkles, CalendarDays, Target, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyGoalsModal } from '@/components/weekly/WeeklyGoalsModal';

// 이번 주 목표 모달을 이미 봤는지 확인하기 위한 키 생성
function getWeeklyGoalShownKey(weekId: string) {
  return `weekly-goal-shown-${weekId}`;
}

export default function HomePage() {
  const { tasks, fetchTasks } = useTaskStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const { weeks, fetchWeeks, getOrCreateWeek, updateWeekGoals } = useWeekStore();

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekId = getWeekId(today);
  const todayStr = formatDate(today);

  useEffect(() => {
    fetchTasks();
    fetchSchedules();
    fetchWeeks();
  }, [fetchTasks, fetchSchedules, fetchWeeks]);

  // 현재 주 데이터 가져오기
  useEffect(() => {
    const loadCurrentWeek = async () => {
      setIsLoadingWeek(true);
      try {
        const week = await getOrCreateWeek(today);
        setCurrentWeek(week);

        // 월요일이고 아직 이번 주 목표를 등록하지 않았다면 모달 표시
        const shownKey = getWeeklyGoalShownKey(weekId);
        const alreadyShown = localStorage.getItem(shownKey);
        const isMon = isMonday(today);

        if (isMon && !alreadyShown && (!week.goals || week.goals.length === 0)) {
          setIsGoalsModalOpen(true);
        }
      } catch (error) {
        console.error('Failed to load week:', error);
      } finally {
        setIsLoadingWeek(false);
      }
    };

    loadCurrentWeek();
  }, [weeks]);

  const handleSaveGoals = async (goals: string[]) => {
    if (!currentWeek) return;
    await updateWeekGoals(currentWeek.id, goals);
    setCurrentWeek({ ...currentWeek, goals });
    // 이번 주에는 더 이상 자동으로 모달을 띄우지 않음
    localStorage.setItem(getWeeklyGoalShownKey(weekId), 'true');
  };

  const handleOpenGoalsModal = () => {
    setIsGoalsModalOpen(true);
  };

  const todaySchedules = useMemo(() =>
    schedules.filter((s) => s.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules, todayStr]
  );
  const backlogTasks = useMemo(() => tasks.filter((t) => t.status === 'backlog'), [tasks]);
  const completedToday = todaySchedules.filter((s) => s.status === 'completed');

  // Week dates for mini calendar
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getScheduleCountForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedules.filter((s) => s.date === dateStr).length;
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return '좋은 새벽이에요';
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-background pb-20">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <p className="text-muted-foreground text-sm">
          {format(today, 'M월 d일 EEEE', { locale: ko })}
        </p>
        <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
          {greeting}
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </h1>
      </header>

      {/* Mini Week Calendar */}
      <section className="px-5 py-4">
        <div className="flex justify-between">
          {weekDates.map((date) => {
            const isToday = checkIsToday(date);
            const scheduleCount = getScheduleCountForDate(date);
            const dateStr = formatDate(date);

            return (
              <Link
                key={dateStr}
                href={`/calendar?date=${dateStr}`}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-colors',
                  isToday ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <span className={cn('text-[10px] font-medium', !isToday && 'text-muted-foreground')}>
                  {format(date, 'EEE', { locale: ko })}
                </span>
                <span className={cn('text-lg font-semibold', !isToday && 'text-foreground')}>
                  {format(date, 'd')}
                </span>
                {scheduleCount > 0 && (
                  <div className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isToday ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Weekly Goals */}
      <section className="px-5 py-4">
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold">이번 주 목표</h2>
            </div>
            <button
              onClick={handleOpenGoalsModal}
              className="text-sm text-amber-600 font-medium flex items-center gap-1"
            >
              <Edit2 className="h-4 w-4" />
              수정
            </button>
          </div>

          {isLoadingWeek ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              로딩 중...
            </div>
          ) : !currentWeek?.goals || currentWeek.goals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">등록된 목표가 없어요</p>
              <button
                onClick={handleOpenGoalsModal}
                className="text-amber-600 text-sm mt-2 font-medium"
              >
                목표 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentWeek.goals.map((goal: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-card/80 rounded-xl"
                >
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-semibold text-amber-600">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm font-medium">{goal}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Today's Progress */}
      <section className="px-5 py-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">오늘의 진행</h2>
            <Link href={`/calendar?date=${todayStr}`} className="text-sm text-primary font-medium flex items-center gap-1">
              전체보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="text-center py-8">
              <div className="rounded-full bg-muted/50 p-4 inline-block mb-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">오늘 일정이 없어요</p>
              <Link href={`/calendar?date=${todayStr}`} className="text-primary text-sm mt-2 inline-block font-medium">
                일정 추가하기
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${(completedToday.length / todaySchedules.length) * 175.9} 175.9`}
                      className="text-primary transition-all"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {Math.round((completedToday.length / todaySchedules.length) * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {completedToday.length}<span className="text-muted-foreground text-lg">/{todaySchedules.length}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">완료</p>
                </div>
              </div>

              {/* Next up */}
              {todaySchedules.find(s => s.status !== 'completed') && (
                <div className="bg-card rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">다음 일정</p>
                  {(() => {
                    const next = todaySchedules.find(s => s.status !== 'completed');
                    if (!next) return null;
                    const title = next.task?.title || next.title || '일정';
                    const color = next.task?.color || next.color || '#8B7CF6';
                    return (
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-1 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="font-medium">{title}</p>
                          <p className="text-xs text-muted-foreground">
                            {next.startTime} - {next.endTime}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Backlog */}
      <section className="px-5 py-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">백로그</h2>
          <Link href="/tasks" className="text-sm text-primary font-medium flex items-center gap-1">
            전체보기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {backlogTasks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed">
            <p className="text-muted-foreground">모든 할 일이 배정되었어요</p>
            <Link href="/tasks" className="text-primary text-sm mt-2 inline-block font-medium">
              새 할 일 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {backlogTasks.slice(0, 4).map((task, index) => (
              <Link
                key={task.id}
                href={`/calendar?date=${todayStr}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className="h-10 w-1 rounded-full"
                  style={{ backgroundColor: task.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(task.estimatedMinutes)}</span>
                    {task.category && (
                      <span className="bg-muted px-2 py-0.5 rounded-full">{task.category}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Weekly Goals Modal */}
      <WeeklyGoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        week={currentWeek}
        onSave={handleSaveGoals}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
    </div>
  );
}
