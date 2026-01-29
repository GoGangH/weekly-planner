'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, addDays, isToday as checkIsToday, isMonday, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTaskStore } from '@/stores/taskStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWeekStore } from '@/stores/weekStore';
import { formatDate, formatDuration, getWeekId, generateId, normalizeTime } from '@/lib/utils';
import { WeeklyGoal } from '@/types';
import { Clock, ArrowRight, Sparkles, CalendarDays, Target, Edit2, Check, ListTodo, ChevronDown, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyGoalsModal } from '@/components/weekly/WeeklyGoalsModal';

// 이번 주 목표 모달을 이미 봤는지 확인하기 위한 키 생성
function getWeeklyGoalShownKey(weekId: string) {
  return `weekly-goal-shown-${weekId}`;
}

export default function HomePage() {
  const { tasks, fetchTasks, addTask } = useTaskStore();
  const { schedules, fetchSchedules, updateScheduleStatus } = useScheduleStore();
  const { weeks, fetchWeeks, getOrCreateWeek, updateWeekGoals, updateWeeklyGoals } = useWeekStore();

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

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
    let isMounted = true;

    const loadCurrentWeek = async () => {
      setIsLoadingWeek(true);
      try {
        const week = await getOrCreateWeek(today);
        if (!isMounted) return;

        setCurrentWeek(week);

        // 월요일이고 아직 이번 주 목표를 등록하지 않았다면 모달 표시
        const shownKey = getWeeklyGoalShownKey(weekId);
        const alreadyShown = localStorage.getItem(shownKey);
        const isMon = isMonday(today);

        if (isMon && !alreadyShown && (!week.goals || week.goals.length === 0)) {
          setIsGoalsModalOpen(true);
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.code || JSON.stringify(error);
        console.error('Failed to load week:', errorMessage, error);
      } finally {
        if (isMounted) {
          setIsLoadingWeek(false);
        }
      }
    };

    loadCurrentWeek();

    return () => {
      isMounted = false;
    };
  }, [getOrCreateWeek, weekId]);

  const handleSaveGoals = async (goals: string[], weeklyGoals: WeeklyGoal[]) => {
    if (!currentWeek) return;

    // 기존 단순 목표 저장 (하위 호환)
    await updateWeekGoals(currentWeek.id, goals);
    // 새로운 구조화된 목표 저장
    await updateWeeklyGoals(currentWeek.id, weeklyGoals);

    // 세부 할 일들을 백로그에 태스크로 추가
    for (const goal of weeklyGoals) {
      for (const subTask of goal.subTasks) {
        if (subTask.title.trim()) {
          // 이미 추가된 태스크가 있는지 확인 (제목과 weekId로)
          const existingTask = tasks.find(
            (t) => t.title === subTask.title && t.weekId === weekId
          );

          if (!existingTask) {
            // targetCount 만큼 반복 실행해야 하므로 제목에 표시
            const taskTitle = subTask.targetCount > 1
              ? `${subTask.title} (${subTask.targetCount}회)`
              : subTask.title;

            try {
              await addTask({
                title: taskTitle,
                description: `주간 목표 "${goal.title}"의 세부 할 일`,
                estimatedMinutes: subTask.estimatedMinutes,
                isRecurring: false,
                category: subTask.category,
                color: '#8B7CF6', // 카테고리에서 색상 가져올 예정
                weekId: weekId,
              });
            } catch (error) {
              console.error('Failed to add task from sub-task:', error);
            }
          }
        }
      }
    }

    setCurrentWeek({ ...currentWeek, goals, weeklyGoals });
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

  // 오늘의 모든 할일 항목 계산 (일정 내 items 포함)
  const todayAllItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      isCompleted: boolean;
      scheduleId: string;
      scheduleTitle: string;
      scheduleColor: string;
      startTime: string;
    }> = [];

    todaySchedules.forEach(schedule => {
      if (schedule.items && schedule.items.length > 0) {
        // 일정 내 할일 항목들
        schedule.items.forEach(item => {
          items.push({
            id: item.id,
            title: item.title,
            isCompleted: item.isCompleted,
            scheduleId: schedule.id,
            scheduleTitle: schedule.title,
            scheduleColor: schedule.color,
            startTime: schedule.startTime,
          });
        });
      } else {
        // 할일 항목이 없는 일정은 일정 자체를 항목으로
        items.push({
          id: schedule.id,
          title: schedule.title,
          isCompleted: schedule.status === 'completed',
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          scheduleColor: schedule.color,
          startTime: schedule.startTime,
        });
      }
    });

    return items;
  }, [todaySchedules]);

  const completedItemsCount = todayAllItems.filter(item => item.isCompleted).length;
  const totalItemsCount = todayAllItems.length;
  const completionPercentage = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  // 시간이 지난 일정 자동 완료 처리
  useEffect(() => {
    const checkAndCompleteSchedules = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      todaySchedules.forEach((schedule) => {
        // 아직 완료되지 않은 일정이고, 종료 시간이 현재 시간보다 이전인 경우
        if (schedule.status === 'planned' && schedule.endTime < currentTime) {
          updateScheduleStatus(schedule.id, 'completed');
        }
      });
    };

    // 초기 실행
    checkAndCompleteSchedules();

    // 1분마다 체크
    const interval = setInterval(checkAndCompleteSchedules, 60000);
    return () => clearInterval(interval);
  }, [todaySchedules, updateScheduleStatus]);

  // 목표 펼치기/접기
  const toggleGoalExpand = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

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
          ) : (!currentWeek?.weeklyGoals || currentWeek.weeklyGoals.length === 0) &&
             (!currentWeek?.goals || currentWeek.goals.length === 0) ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">등록된 목표가 없어요</p>
              <button
                onClick={handleOpenGoalsModal}
                className="text-amber-600 text-sm mt-2 font-medium"
              >
                목표 등록하기
              </button>
            </div>
          ) : currentWeek?.weeklyGoals && currentWeek.weeklyGoals.length > 0 ? (
            <div className="space-y-2">
              {currentWeek.weeklyGoals.map((goal: WeeklyGoal, index: number) => {
                const isExpanded = expandedGoals.has(goal.id);
                const hasSubTasks = goal.subTasks && goal.subTasks.length > 0;
                const totalTarget = goal.subTasks?.reduce((s: number, st: any) => s + st.targetCount, 0) || 0;
                const totalCompleted = goal.subTasks?.reduce((s: number, st: any) => s + st.completedCount, 0) || 0;

                return (
                  <div key={goal.id} className="bg-card/80 rounded-xl overflow-hidden">
                    <button
                      onClick={() => hasSubTasks && toggleGoalExpand(goal.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left",
                        hasSubTasks && "hover:bg-card/60 transition-colors"
                      )}
                    >
                      {hasSubTasks ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-semibold text-amber-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        {hasSubTasks && (
                          <p className="text-xs text-muted-foreground">
                            {goal.subTasks.length}개 세부 할 일 · {totalCompleted}/{totalTarget}회 완료
                          </p>
                        )}
                      </div>
                    </button>

                    {isExpanded && hasSubTasks && (
                      <div className="px-3 pb-3 space-y-1">
                        {goal.subTasks.map((subTask: any) => (
                          <div
                            key={subTask.id}
                            className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-lg text-sm"
                          >
                            <ListTodo className="h-3 w-3 text-muted-foreground" />
                            <span className="flex-1 truncate">{subTask.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {subTask.completedCount}/{subTask.targetCount}회
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
            <Link href={`/calendar?date=${todayStr}&view=day`} className="text-sm text-primary font-medium flex items-center gap-1">
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
              {/* 진행률 표시 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-14 w-14 -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="5"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray={`${(completionPercentage / 100) * 150.8} 150.8`}
                      className="text-primary transition-all"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{completionPercentage}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold">
                    {completedItemsCount}<span className="text-muted-foreground text-base">/{totalItemsCount}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">할 일 완료</p>
                </div>
              </div>

              {/* 할일 목록 */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {(() => {
                  // 일정별로 그룹화
                  const groupedBySchedule: Record<string, typeof todayAllItems> = {};
                  todayAllItems.forEach(item => {
                    if (!groupedBySchedule[item.scheduleId]) {
                      groupedBySchedule[item.scheduleId] = [];
                    }
                    groupedBySchedule[item.scheduleId].push(item);
                  });

                  return Object.entries(groupedBySchedule).map(([scheduleId, items]) => {
                    const schedule = todaySchedules.find(s => s.id === scheduleId);
                    const hasMultipleItems = schedule?.items && schedule.items.length > 0;

                    return (
                      <div key={scheduleId} className="bg-card/60 rounded-xl p-2.5">
                        {/* 일정 헤더 */}
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: items[0].scheduleColor }}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {normalizeTime(items[0].startTime)}
                          </span>
                          <span className="text-xs font-medium">{items[0].scheduleTitle}</span>
                        </div>

                        {/* 할일 항목들 */}
                        {hasMultipleItems ? (
                          <div className="pl-4 space-y-0.5">
                            {items.map(item => (
                              <div key={item.id} className="flex items-center gap-2 py-0.5">
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                  item.isCompleted
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40"
                                )}>
                                  {item.isCompleted && (
                                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                  )}
                                </div>
                                <span className={cn(
                                  "text-xs flex-1",
                                  item.isCompleted && "line-through text-muted-foreground"
                                )}>
                                  {item.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pl-4 flex items-center gap-2 py-0.5">
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                              items[0].isCompleted
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/40"
                            )}>
                              {items[0].isCompleted && (
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              )}
                            </div>
                            <span className={cn(
                              "text-xs",
                              items[0].isCompleted && "line-through text-muted-foreground"
                            )}>
                              완료
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
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
