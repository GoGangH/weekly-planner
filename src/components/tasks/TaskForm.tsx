'use client';

import { useState, useEffect } from 'react';
import { Task, TaskFormData, RecurringType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Clock, Repeat } from 'lucide-react';

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const { categories } = useSettingsStore();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initialData?.estimatedMinutes || 30
  );
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringType, setRecurringType] = useState<RecurringType | undefined>(
    initialData?.recurringType
  );
  const [recurringDays, setRecurringDays] = useState<number[]>(
    initialData?.recurringDays || []
  );
  const [category, setCategory] = useState(initialData?.category || '');

  // 카테고리에서 색상 자동 결정
  const getColorFromCategory = (cat: string) => {
    const found = categories.find((c) => c.value === cat);
    return found?.color || categories[0]?.color || '#8B7CF6';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      estimatedMinutes,
      isRecurring,
      recurringType: isRecurring ? recurringType : undefined,
      recurringDays: isRecurring && recurringType === 'weekly' ? recurringDays : undefined,
      category: category || undefined,
      color: getColorFromCategory(category),
    });
  };

  const toggleRecurringDay = (day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const timePresets = [15, 30, 45, 60, 90, 120];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          className="text-lg font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0"
          autoFocus
          required
        />
      </div>

      {/* Description */}
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="설명 (선택)"
        className="resize-none border-0 bg-muted/50 rounded-xl"
        rows={2}
      />

      {/* Estimated Time */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" />
          예상 시간
        </Label>
        <div className="flex flex-wrap gap-2">
          {timePresets.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setEstimatedMinutes(mins)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                estimatedMinutes === mins
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">카테고리</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(category === cat.value ? '' : cat.value);
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2',
                category === cat.value
                  ? 'bg-primary text-primary-foreground'
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

      {/* Recurring */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-3 w-full text-left transition-colors',
            isRecurring ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Repeat className="h-4 w-4" />
          <span className="font-medium">반복</span>
        </button>

        {isRecurring && (
          <div className="pl-2 space-y-3 animate-slide-up">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecurringType('daily')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  recurringType === 'daily'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                매일
              </button>
              <button
                type="button"
                onClick={() => setRecurringType('weekly')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  recurringType === 'weekly'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                특정 요일
              </button>
            </div>

            {recurringType === 'weekly' && (
              <div className="flex justify-between">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleRecurringDay(day.value)}
                    className={cn(
                      'h-9 w-9 rounded-full text-sm font-medium transition-all',
                      recurringDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" disabled={!title.trim()} className="flex-1">
          {initialData ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
}
