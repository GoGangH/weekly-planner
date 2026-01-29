'use client';

import { useState, useEffect } from 'react';
import { Schedule, ScheduleFormData, ScheduleItem, Routine, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTaskStore } from '@/stores/taskStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { cn, formatDuration, generateId, getWeekId } from '@/lib/utils';
import { Clock, Plus, X, ChevronDown, ChevronRight, Trash2, ListTodo } from 'lucide-react';

// 시간 문자열을 HH:MM 형식으로 정규화 (초 제거)
function normalizeTime(timeStr: string): string {
  if (!timeStr) return '09:00';
  const parts = timeStr.split(':');
  const hours = String(parts[0] || '0').padStart(2, '0');
  const minutes = String(parts[1] || '0').padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 시간 문자열을 분으로 변환
function timeToMinutes(timeStr: string): number {
  const normalized = normalizeTime(timeStr);
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

// 분을 시간 문자열로 변환
function minutesToTime(totalMinutes: number): string {
  // 음수 처리
  while (totalMinutes < 0) totalMinutes += 24 * 60;
  // 24시간 넘어가는 경우 처리
  totalMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// 시작 시간에 분을 더해서 종료 시간 계산
function addMinutesToTime(timeStr: string, minutes: number): string {
  const totalMinutes = timeToMinutes(timeStr) + minutes;
  return minutesToTime(totalMinutes);
}

interface ScheduleFormProps {
  date: string;
  initialTime?: string;
  routines?: Routine[];
  schedule?: Schedule; // 수정 모드일 때 전달
  onSubmit: (data: ScheduleFormData) => void;
  onCancel: () => void;
  onDelete?: () => void; // 삭제 콜백
}

export function ScheduleForm({
  date,
  initialTime = '09:00',
  routines = [],
  schedule,
  onSubmit,
  onCancel,
  onDelete,
}: ScheduleFormProps) {
  const { categories } = useSettingsStore();
  const { tasks } = useTaskStore();
  const { schedules: allSchedules } = useScheduleStore();
  const isEditMode = !!schedule;
  const [showBacklog, setShowBacklog] = useState(false);

  // 현재 주의 weekId 계산
  const currentWeekId = getWeekId(new Date(date));

  // 백로그 태스크 중 이번 주 목표만 필터링 (weekId가 현재 주인 것만)
  const weeklyBacklogTasks = tasks.filter(t =>
    t.status === 'backlog' && t.weekId === currentWeekId
  );

  // 초기값 계산 (시간 정규화)
  const getInitialStartTime = () => {
    if (schedule?.startTime) return normalizeTime(schedule.startTime);
    return normalizeTime(initialTime);
  };

  const getInitialEndTime = () => {
    if (schedule?.endTime) return normalizeTime(schedule.endTime);
    return addMinutesToTime(initialTime, 60);
  };

  const getInitialDuration = () => {
    if (schedule) {
      const start = timeToMinutes(schedule.startTime);
      let end = timeToMinutes(schedule.endTime);
      if (end <= start) end += 24 * 60; // 자정 넘어가는 경우
      return end - start;
    }
    return 60;
  };

  // Form state
  const [title, setTitle] = useState(schedule?.title || '');
  const [startTime, setStartTime] = useState(getInitialStartTime);
  const [estimatedMinutes, setEstimatedMinutes] = useState(getInitialDuration);
  const [endTime, setEndTime] = useState(getInitialEndTime);
  const [durationHours, setDurationHours] = useState(Math.floor(getInitialDuration() / 60));
  const [durationMins, setDurationMins] = useState(getInitialDuration() % 60);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (schedule?.color) {
      const found = categories.find(c => c.color === schedule.color);
      return found?.value || '';
    }
    return '';
  });
  const [items, setItems] = useState<ScheduleItem[]>(schedule?.items || []);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [showItems, setShowItems] = useState((schedule?.items?.length || 0) > 0);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(schedule?.routineId || null);

  // 수정 모드일 때 초기값 설정
  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title);
      const normalizedStart = normalizeTime(schedule.startTime);
      const normalizedEnd = normalizeTime(schedule.endTime);
      setStartTime(normalizedStart);
      setEndTime(normalizedEnd);
      setItems(schedule.items || []);
      setShowItems((schedule.items?.length || 0) > 0);
      setSelectedRoutineId(schedule.routineId || null);

      const start = timeToMinutes(schedule.startTime);
      let end = timeToMinutes(schedule.endTime);
      if (end <= start) end += 24 * 60;
      const duration = end - start;
      setEstimatedMinutes(duration);
      setDurationHours(Math.floor(duration / 60));
      setDurationMins(duration % 60);

      const foundCat = categories.find(c => c.color === schedule.color);
      setSelectedCategory(foundCat?.value || '');
    }
  }, [schedule, categories]);

  // 카테고리에서 색상 가져오기
  const getColorFromCategory = (cat: string) => {
    if (!cat) return schedule?.color || '#8B7CF6';
    const found = categories.find((c) => c.value === cat);
    return found?.color || '#8B7CF6';
  };

  // 시작 시간 변경 시 종료 시간 업데이트
  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    setEndTime(addMinutesToTime(time, estimatedMinutes));
  };

  // 소요 시간 프리셋 변경
  const handleDurationChange = (mins: number) => {
    setEstimatedMinutes(mins);
    setDurationHours(Math.floor(mins / 60));
    setDurationMins(mins % 60);
    setEndTime(addMinutesToTime(startTime, mins));
  };

  // 직접 입력으로 소요 시간 변경
  const handleDurationInputChange = (hours: number, mins: number) => {
    const totalMins = hours * 60 + mins;
    setDurationHours(hours);
    setDurationMins(mins);
    setEstimatedMinutes(totalMins);
    setEndTime(addMinutesToTime(startTime, totalMins));
  };

  // 할일 항목 추가
  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      const newItem: ScheduleItem = {
        id: generateId(),
        title: newItemTitle.trim(),
        isCompleted: false,
        order: items.length,
      };
      setItems([...items, newItem]);
      setNewItemTitle('');
    }
  };

  // 할일 항목 삭제
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  // 태스크 제목에서 횟수와 기본 제목 추출 (예: "운동하기 (5회)" -> { baseTitle: "운동하기", targetCount: 5 })
  const parseTaskTitle = (title: string): { baseTitle: string; targetCount: number } => {
    const match = title.match(/^(.+?)\s*\((\d+)회\)$/);
    if (match) {
      return { baseTitle: match[1].trim(), targetCount: parseInt(match[2]) };
    }
    return { baseTitle: title, targetCount: 1 };
  };

  // 특정 태스크가 이번 주에 몇 개 추가되었는지 계산 (모든 일정에서)
  const getAddedCount = (task: Task): number => {
    const { baseTitle } = parseTaskTitle(task.title);

    // 이번 주의 모든 일정에서 해당 제목의 항목 수 계산
    let totalCount = 0;

    // 현재 폼에서 추가된 항목 수
    const currentFormCount = items.filter(item => item.title === baseTitle).length;
    totalCount += currentFormCount;

    // 이번 주 다른 일정들에서 추가된 항목 수 (수정 모드일 때는 현재 일정 제외)
    allSchedules.forEach(s => {
      // 수정 모드에서 현재 편집 중인 일정은 제외 (이미 currentFormCount에 포함)
      if (schedule && s.id === schedule.id) return;

      // 이번 주 일정만 계산
      const scheduleWeekId = getWeekId(new Date(s.date));
      if (scheduleWeekId !== currentWeekId) return;

      // 해당 일정의 items에서 같은 제목의 항목 수 계산
      const count = s.items?.filter(item => item.title === baseTitle).length || 0;
      totalCount += count;
    });

    return totalCount;
  };

  // 루틴 선택
  const handleSelectRoutine = (routine: Routine) => {
    setSelectedRoutineId(routine.id);
    setTitle(routine.title);
    const normalizedStart = normalizeTime(routine.startTime);
    const normalizedEnd = normalizeTime(routine.endTime);
    setStartTime(normalizedStart);
    setEndTime(normalizedEnd);

    const start = timeToMinutes(routine.startTime);
    let end = timeToMinutes(routine.endTime);
    if (end <= start) end += 24 * 60;
    const duration = end - start;
    setEstimatedMinutes(duration);
    setDurationHours(Math.floor(duration / 60));
    setDurationMins(duration % 60);

    setSelectedCategory('');
    // 루틴의 items를 ScheduleItem으로 변환
    const routineItems: ScheduleItem[] = routine.items.map((item) => ({
      id: generateId(),
      title: item.title,
      isCompleted: false,
      order: item.order,
    }));
    setItems(routineItems);
    setShowItems(routineItems.length > 0);
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const color = getColorFromCategory(selectedCategory);

    onSubmit({
      title: title.trim(),
      color,
      date,
      startTime,
      endTime,
      items,
      routineId: selectedRoutineId || undefined,
    });
  };

  // 10분 단위로 시간 옵션 생성 (04:00 ~ 03:50)
  const generateTimeOptions = () => {
    const options = [];
    // 04:00 ~ 23:50
    for (let h = 4; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    // 00:00 ~ 03:50
    for (let h = 0; h < 4; h++) {
      for (let m = 0; m < 60; m += 10) {
        options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return options;
  };

  const timePresets = [30, 60, 90, 120, 180, 240];
  const isFormValid = title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 루틴에서 선택 (새로 만들 때만 표시) */}
      {!isEditMode && routines.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">루틴에서 선택</Label>
          <div className="flex flex-wrap gap-2">
            {routines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => handleSelectRoutine(routine)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-all flex items-center gap-2',
                  selectedRoutineId === routine.id
                    ? 'ring-2 ring-primary shadow-sm'
                    : 'bg-muted hover:bg-muted/80'
                )}
                style={{
                  backgroundColor: selectedRoutineId === routine.id ? `${routine.color}20` : undefined,
                  borderLeft: `3px solid ${routine.color}`,
                }}
              >
                {routine.title}
                <span className="text-xs text-muted-foreground">
                  {normalizeTime(routine.startTime)}-{normalizeTime(routine.endTime)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 이번 주 남은 할일 */}
      {(() => {
        // 남은 횟수가 있는 태스크만 필터링
        const remainingTasks = weeklyBacklogTasks.filter(task => {
          const { targetCount } = parseTaskTitle(task.title);
          const addedCount = getAddedCount(task);
          return targetCount - addedCount > 0;
        });

        if (remainingTasks.length === 0) return null;

        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowBacklog(!showBacklog)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <ListTodo className="h-4 w-4" />
              이번 주 남은 할일
              {showBacklog ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="text-xs">({remainingTasks.length})</span>
            </button>

            {showBacklog && (
              <div className="space-y-1.5 p-3 bg-muted/30 rounded-xl">
                {remainingTasks.map((task) => {
                  const { baseTitle, targetCount } = parseTaskTitle(task.title);
                  const addedCount = getAddedCount(task);
                  const remainingCount = targetCount - addedCount;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{ borderLeft: `3px solid ${task.color}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {baseTitle}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {remainingCount}회 남음
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 일정 제목 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">일정 제목</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정을 입력하세요"
          className="text-base font-medium rounded-xl px-4 py-3"
          autoFocus
        />
      </div>

      {/* 시간 설정 */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-2xl">
        <h3 className="text-sm font-semibold">시간 설정</h3>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">시작</Label>
            <select
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
            >
              {generateTimeOptions().map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="pt-5 text-muted-foreground">→</div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">종료</Label>
            <div className="w-full rounded-xl border bg-muted/50 px-3 py-2.5 text-sm text-center">
              {endTime}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            소요 시간
          </Label>

          {/* 직접 입력 (10분 단위) */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="23"
              value={durationHours}
              onChange={(e) => handleDurationInputChange(parseInt(e.target.value) || 0, durationMins)}
              className="w-16 text-center"
            />
            <span className="text-sm text-muted-foreground">시간</span>
            <select
              value={durationMins}
              onChange={(e) => handleDurationInputChange(durationHours, parseInt(e.target.value) || 0)}
              className="w-20 rounded-xl border bg-background px-2 py-2 text-sm text-center focus:ring-2 focus:ring-primary"
            >
              {[0, 10, 20, 30, 40, 50].map((m) => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
            <span className="ml-2 text-sm font-semibold text-primary">
              = {formatDuration(estimatedMinutes)}
            </span>
          </div>

          {/* 프리셋 버튼 */}
          <div className="flex flex-wrap gap-2">
            {timePresets.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleDurationChange(mins)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-medium transition-all',
                  estimatedMinutes === mins
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted border'
                )}
              >
                {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 카테고리 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">카테고리</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? '' : cat.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 할일 항목 */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowItems(!showItems)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {showItems ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          일정 내 할일 ({items.length}개)
        </button>

        {showItems && (
          <div className="space-y-2 pl-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border"
              >
                <span className={cn(
                  "flex-1 text-sm",
                  item.isCompleted && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="할일 추가..."
                className="flex-1 h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                disabled={!newItemTitle.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        {isEditMode && onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="rounded-xl py-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl py-3">
          취소
        </Button>
        <Button type="submit" disabled={!isFormValid} className="flex-1 rounded-xl py-3">
          {isEditMode ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
}
