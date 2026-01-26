'use client';

import { useState } from 'react';
import { Routine, RoutineFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Clock, Zap } from 'lucide-react';

interface RoutineFormProps {
  initialData?: Routine;
  onSubmit: (data: RoutineFormData) => void;
  onCancel: () => void;
}

export function RoutineForm({ initialData, onSubmit, onCancel }: RoutineFormProps) {
  const { categories } = useSettingsStore();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [days, setDays] = useState<number[]>(initialData?.days || [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '10:00');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [autoSchedule, setAutoSchedule] = useState(initialData?.autoSchedule ?? true);
  const [category, setCategory] = useState(() => {
    // 초기 색상에서 카테고리 찾기
    if (initialData?.color) {
      const found = categories.find((c) => c.color === initialData.color);
      return found?.value || '';
    }
    return '';
  });

  // 카테고리에서 색상 자동 결정
  const getColorFromCategory = (cat: string) => {
    const found = categories.find((c) => c.value === cat);
    return found?.color || categories[0]?.color || '#34D399';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      days,
      startTime,
      endTime,
      isActive,
      autoSchedule,
      color: getColorFromCategory(category),
    });
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectPreset = (preset: 'everyday' | 'weekdays' | 'weekends') => {
    switch (preset) {
      case 'everyday':
        setDays([0, 1, 2, 3, 4, 5, 6]);
        break;
      case 'weekdays':
        setDays([1, 2, 3, 4, 5]);
        break;
      case 'weekends':
        setDays([0, 6]);
        break;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="루틴 이름을 입력하세요"
        className="text-lg font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0"
        autoFocus
        required
      />

      {/* Description */}
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="설명 (선택)"
        className="resize-none border-0 bg-muted/50 rounded-xl"
        rows={2}
      />

      {/* Time */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" />
          시간
        </Label>
        <div className="flex items-center gap-3">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Days */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">반복 요일</Label>
        <div className="flex gap-2">
          {['매일', '평일', '주말'].map((preset, i) => (
            <button
              key={preset}
              type="button"
              onClick={() => selectPreset(['everyday', 'weekdays', 'weekends'][i] as 'everyday' | 'weekdays' | 'weekends')}
              className="rounded-full px-3 py-1.5 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="flex justify-between">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                'h-10 w-10 rounded-full text-sm font-medium transition-all',
                days.includes(day.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {day.label}
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
              onClick={() => setCategory(category === cat.value ? '' : cat.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-2',
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

      {/* Options */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setAutoSchedule(!autoSchedule)}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-3 w-full text-left transition-colors',
            autoSchedule ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Zap className="h-4 w-4" />
          <div className="flex-1">
            <span className="font-medium">타임라인에 자동 표시</span>
            <p className="text-xs opacity-70 mt-0.5">해당 요일 타임라인에 자동으로 표시됩니다</p>
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" disabled={!title.trim() || days.length === 0} className="flex-1">
          {initialData ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
}
