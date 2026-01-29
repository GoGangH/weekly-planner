'use client';

import { useState, useEffect } from 'react';
import { Task, TaskFormData, ScheduleFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn, addMinutesToTime, formatDuration } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface ScheduleTaskFormProps {
  date: string;
  initialTime?: string;
  backlogTasks: Task[];
  onSubmitNew: (data: TaskFormData, startTime: string, endTime: string) => void;
  onSubmitExisting: (task: Task, startTime: string, endTime: string) => void;
  onSubmitEvent: (data: ScheduleFormData) => void; // 태스크 없이 일정만 등록
  onCancel: () => void;
}

export function ScheduleTaskForm({
  date,
  initialTime = '09:00',
  backlogTasks,
  onSubmitNew,
  onSubmitExisting,
  onSubmitEvent,
  onCancel,
}: ScheduleTaskFormProps) {
  const [mode, setMode] = useState<'new' | 'event' | 'existing'>('event'); // 기본값을 'event'로
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Settings Store - 사용자 정의 카테고리
  const { categories } = useSettingsStore();

  // Time settings
  const [startTime, setStartTime] = useState(initialTime);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [customHours, setCustomHours] = useState(0);
  const [customMins, setCustomMins] = useState(30);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [endTime, setEndTime] = useState(() => addMinutesToTime(initialTime, 30));

  // Task form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // 카테고리에서 색상 자동 결정 (기본 보라색)
  const DEFAULT_COLOR = '#8B7CF6';
  const getColorFromCategory = (cat: string) => {
    if (!cat) return DEFAULT_COLOR;
    const found = categories.find((c) => c.value === cat);
    return found?.color || DEFAULT_COLOR;
  };

  // Update end time when start time or duration changes
  useEffect(() => {
    setEndTime(addMinutesToTime(startTime, estimatedMinutes));
  }, [startTime, estimatedMinutes]);

  const handleDurationChange = (mins: number) => {
    setEstimatedMinutes(mins);
    setShowCustomInput(false);
    setCustomHours(Math.floor(mins / 60));
    setCustomMins(mins % 60);
  };

  const handleCustomTimeChange = (hours: number, mins: number) => {
    const h = Math.max(0, Math.min(23, hours));
    const m = Math.max(0, Math.min(59, mins));
    setCustomHours(h);
    setCustomMins(m);
    const totalMins = h * 60 + m;
    if (totalMins > 0) {
      setEstimatedMinutes(totalMins);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const color = getColorFromCategory(category);

    if (mode === 'existing' && selectedTaskId) {
      const task = backlogTasks.find((t) => t.id === selectedTaskId);
      if (task) {
        onSubmitExisting(task, startTime, endTime);
      }
    } else if (mode === 'new' && title.trim()) {
      // 할 일 생성 + 일정 등록
      onSubmitNew(
        {
          title,
          description: description || undefined,
          estimatedMinutes,
          isRecurring: false,
          category: category || undefined,
          color,
        },
        startTime,
        endTime
      );
    } else if (mode === 'event' && title.trim()) {
      // 일정만 등록 (할 일 없이)
      onSubmitEvent({
        title,
        description: description || undefined,
        color,
        date,
        startTime,
        endTime,
      });
    }
  };

  const timePresets = [15, 30, 45, 60, 90, 120, 180, 240];
  const isFormValid = mode === 'existing' ? selectedTaskId : title.trim();

  // Generate time options (05:00 ~ 04:00 next day)
  const generateTimeOptions = () => {
    const options = [];
    for (let h = 5; h < 24; h++) {
      options.push(`${String(h).padStart(2, '0')}:00`);
      options.push(`${String(h).padStart(2, '0')}:30`);
    }
    for (let h = 0; h < 5; h++) {
      options.push(`${String(h).padStart(2, '0')}:00`);
      options.push(`${String(h).padStart(2, '0')}:30`);
    }
    return options;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-4">
      {/* Mode selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => setMode('event')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
            mode === 'event'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          일정
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
            mode === 'new'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          새 할 일
        </button>
        {backlogTasks.length > 0 && (
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              mode === 'existing'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            백로그 ({backlogTasks.length})
          </button>
        )}
      </div>

      {/* Time Settings - Always visible */}
      <div className="space-y-4 p-5 bg-muted/30 rounded-2xl border">
        <h3 className="text-sm font-semibold text-foreground">시간 설정</h3>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">시작 시간</Label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {generateTimeOptions().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-5 text-muted-foreground font-medium">→</div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">종료 시간</Label>
            <div className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm font-medium text-center">
              {endTime}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            예상 소요 시간: <span className="font-semibold text-foreground">{formatDuration(estimatedMinutes)}</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {timePresets.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleDurationChange(mins)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  estimatedMinutes === mins && !showCustomInput
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background text-muted-foreground hover:bg-muted border hover:border-primary/30'
                )}
              >
                {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-all border',
                showCustomInput
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:border-primary/30'
              )}
            >
              직접입력
            </button>
          </div>

          {/* Custom duration input - 시간 + 분 */}
          {showCustomInput && (
            <div className="flex items-center gap-2 mt-3 animate-slide-up">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={customHours}
                  onChange={(e) => handleCustomTimeChange(parseInt(e.target.value) || 0, customMins)}
                  className="w-16 rounded-xl px-3 py-2.5 text-center"
                />
                <span className="text-sm text-muted-foreground font-medium">시간</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={customMins}
                  onChange={(e) => handleCustomTimeChange(customHours, parseInt(e.target.value) || 0)}
                  className="w-16 rounded-xl px-3 py-2.5 text-center"
                />
                <span className="text-sm text-muted-foreground font-medium">분</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Form (일정만 등록) */}
      {mode === 'event' && (
        <div className="space-y-4 animate-slide-up p-5 bg-card rounded-2xl border">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">일정 제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정을 입력하세요"
              className="text-base font-medium rounded-xl px-4 py-3"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
                    category === cat.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Task Form (할 일 + 일정) */}
      {mode === 'new' && (
        <div className="space-y-5 animate-slide-up p-5 bg-card rounded-2xl border">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">할 일 이름</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="할 일 제목을 입력하세요"
              className="text-base font-medium rounded-xl px-4 py-3"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
                    category === cat.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Existing Tasks List */}
      {mode === 'existing' && (
        <div className="space-y-2.5 animate-slide-up max-h-56 overflow-auto p-1">
          <Label className="text-xs text-muted-foreground px-2 block">백로그에서 선택</Label>
          {backlogTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => {
                setSelectedTaskId(task.id);
                setEstimatedMinutes(task.estimatedMinutes);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all',
                selectedTaskId === task.id
                  ? 'bg-primary/10 ring-2 ring-primary shadow-sm'
                  : 'bg-card border hover:bg-muted/50 hover:border-primary/30'
              )}
              style={{ borderLeft: `4px solid ${task.color}` }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDuration(task.estimatedMinutes)}
                  {task.category && ` · ${task.category}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl py-3">
          취소
        </Button>
        <Button type="submit" disabled={!isFormValid} className="flex-1 rounded-xl py-3">
          일정에 추가
        </Button>
      </div>
    </form>
  );
}
