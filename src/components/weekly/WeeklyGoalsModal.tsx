'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, X, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Week } from '@/types';

interface WeeklyGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week | null;
  onSave: (goals: string[]) => Promise<void>;
  weekStart: Date;
  weekEnd: Date;
}

export function WeeklyGoalsModal({
  isOpen,
  onClose,
  week,
  onSave,
  weekStart,
  weekEnd,
}: WeeklyGoalsModalProps) {
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (week?.goals) {
      setGoals(week.goals);
    } else {
      setGoals([]);
    }
  }, [week]);

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGoal();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(goals);
      onClose();
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">이번 주 목표</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, 'M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1">
          {/* 목표 입력 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="이번 주에 달성할 목표를 입력하세요"
                className="rounded-xl flex-1"
              />
              <Button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoal.trim()}
                className="rounded-xl px-4"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 목표 목록 */}
          <div className="space-y-2">
            {goals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>아직 등록된 목표가 없습니다</p>
                <p className="text-sm mt-1">이번 주에 달성하고 싶은 목표를 추가해보세요</p>
              </div>
            ) : (
              goals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-card rounded-2xl border animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="flex-1 font-medium">{goal}</p>
                  <button
                    onClick={() => handleRemoveGoal(index)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl py-3"
            >
              나중에
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl py-3"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
