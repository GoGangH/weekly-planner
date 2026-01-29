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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Target, ChevronDown, ChevronRight, ListTodo, Clock } from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import { Week, WeeklyGoal, GoalSubTask } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';

interface WeeklyGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week | null;
  onSave: (goals: string[], weeklyGoals: WeeklyGoal[]) => Promise<void>;
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
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { categories } = useSettingsStore();

  useEffect(() => {
    if (week?.weeklyGoals && week.weeklyGoals.length > 0) {
      setWeeklyGoals(week.weeklyGoals);
      // 첫 번째 목표 펼치기
      if (week.weeklyGoals.length > 0) {
        setExpandedGoals(new Set([week.weeklyGoals[0].id]));
      }
    } else if (week?.goals && week.goals.length > 0) {
      // 기존 단순 목표를 새 구조로 변환
      const converted: WeeklyGoal[] = week.goals.map((goal, index) => ({
        id: generateId(),
        title: goal,
        subTasks: [],
        isCompleted: false,
      }));
      setWeeklyGoals(converted);
    } else {
      setWeeklyGoals([]);
    }
  }, [week]);

  const handleAddGoal = () => {
    if (newGoalTitle.trim()) {
      const newGoal: WeeklyGoal = {
        id: generateId(),
        title: newGoalTitle.trim(),
        subTasks: [],
        isCompleted: false,
      };
      setWeeklyGoals([...weeklyGoals, newGoal]);
      setNewGoalTitle('');
      setExpandedGoals(new Set([...expandedGoals, newGoal.id]));
    }
  };

  const handleRemoveGoal = (goalId: string) => {
    setWeeklyGoals(weeklyGoals.filter((g) => g.id !== goalId));
    const newExpanded = new Set(expandedGoals);
    newExpanded.delete(goalId);
    setExpandedGoals(newExpanded);
  };

  const handleToggleExpand = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const handleAddSubTask = (goalId: string) => {
    setWeeklyGoals(
      weeklyGoals.map((goal) => {
        if (goal.id === goalId) {
          const newSubTask: GoalSubTask = {
            id: generateId(),
            title: '',
            targetCount: 5,
            completedCount: 0,
            estimatedMinutes: 60,
            category: categories[0]?.value,
          };
          return { ...goal, subTasks: [...goal.subTasks, newSubTask] };
        }
        return goal;
      })
    );
  };

  const handleUpdateSubTask = (goalId: string, subTaskId: string, updates: Partial<GoalSubTask>) => {
    setWeeklyGoals(
      weeklyGoals.map((goal) => {
        if (goal.id === goalId) {
          return {
            ...goal,
            subTasks: goal.subTasks.map((st) =>
              st.id === subTaskId ? { ...st, ...updates } : st
            ),
          };
        }
        return goal;
      })
    );
  };

  const handleRemoveSubTask = (goalId: string, subTaskId: string) => {
    setWeeklyGoals(
      weeklyGoals.map((goal) => {
        if (goal.id === goalId) {
          return {
            ...goal,
            subTasks: goal.subTasks.filter((st) => st.id !== subTaskId),
          };
        }
        return goal;
      })
    );
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
      // 단순 목표 문자열 배열도 함께 저장 (하위 호환)
      const simpleGoals = weeklyGoals.map((g) => g.title);
      await onSave(simpleGoals, weeklyGoals);
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error);
      console.error('Failed to save goals:', errorMessage, error);
      alert(`목표 저장 실패: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 전체 세부 할 일 수 계산
  const totalSubTasks = weeklyGoals.reduce((sum, g) => sum + g.subTasks.length, 0);
  const totalTargetCount = weeklyGoals.reduce(
    (sum, g) => sum + g.subTasks.reduce((s, st) => s + st.targetCount, 0),
    0
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0" showCloseButton={false}>
        {/* 고정 헤더 */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">이번 주 목표</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {format(weekStart, 'M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {/* 목표 입력 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="이번 주에 달성할 목표를 입력하세요"
                className="rounded-xl flex-1"
              />
              <Button
                type="button"
                onClick={handleAddGoal}
                disabled={!newGoalTitle.trim()}
                className="rounded-xl px-4"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 목표 목록 */}
          <div className="space-y-3">
            {weeklyGoals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>아직 등록된 목표가 없습니다</p>
                <p className="text-sm mt-1">이번 주에 달성하고 싶은 목표를 추가해보세요</p>
              </div>
            ) : (
              weeklyGoals.map((goal, index) => {
                const isExpanded = expandedGoals.has(goal.id);
                const subTaskCount = goal.subTasks.length;
                const totalTarget = goal.subTasks.reduce((s, st) => s + st.targetCount, 0);

                return (
                  <div
                    key={goal.id}
                    className="bg-card rounded-2xl border overflow-hidden animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* 목표 헤더 */}
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => handleToggleExpand(goal.id)}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm font-semibold text-amber-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{goal.title}</p>
                        {subTaskCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            세부 할 일 {subTaskCount}개 · 총 {totalTarget}회
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveGoal(goal.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 세부 할 일 (펼쳐진 경우) */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4 space-y-3">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <ListTodo className="h-3 w-3" />
                          세부 할 일 (완료 시 백로그에 추가됨)
                        </p>

                        {goal.subTasks.map((subTask) => {
                          const categoryColor = categories.find((c) => c.value === subTask.category)?.color || '#8B7CF6';

                          return (
                            <div
                              key={subTask.id}
                              className="flex items-center gap-2 bg-card rounded-xl p-3 border"
                              style={{ borderLeftColor: categoryColor, borderLeftWidth: '3px' }}
                            >
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={subTask.title}
                                  onChange={(e) =>
                                    handleUpdateSubTask(goal.id, subTask.id, { title: e.target.value })
                                  }
                                  placeholder="세부 할 일 제목"
                                  className="h-8 text-sm rounded-lg"
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">횟수</span>
                                    <Input
                                      type="number"
                                      value={subTask.targetCount}
                                      onChange={(e) =>
                                        handleUpdateSubTask(goal.id, subTask.id, {
                                          targetCount: Math.max(1, parseInt(e.target.value) || 1),
                                        })
                                      }
                                      className="h-7 w-14 text-sm rounded-lg text-center"
                                      min={1}
                                    />
                                    <span className="text-xs text-muted-foreground">회</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      value={subTask.estimatedMinutes}
                                      onChange={(e) =>
                                        handleUpdateSubTask(goal.id, subTask.id, {
                                          estimatedMinutes: Math.max(5, parseInt(e.target.value) || 30),
                                        })
                                      }
                                      className="h-7 w-14 text-sm rounded-lg text-center"
                                      min={5}
                                      step={5}
                                    />
                                    <span className="text-xs text-muted-foreground">분</span>
                                  </div>

                                  <Select
                                    value={subTask.category || ''}
                                    onValueChange={(value) =>
                                      handleUpdateSubTask(goal.id, subTask.id, { category: value })
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-24 text-xs rounded-lg">
                                      <SelectValue placeholder="카테고리" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categories.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="h-2 w-2 rounded-full"
                                              style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveSubTask(goal.id, subTask.id)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => handleAddSubTask(goal.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          세부 할 일 추가
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 요약 */}
          {weeklyGoals.length > 0 && totalSubTasks > 0 && (
            <div className="bg-amber-500/10 rounded-2xl p-4 text-center">
              <p className="text-sm text-amber-700">
                <span className="font-semibold">{weeklyGoals.length}개</span> 목표 ·
                <span className="font-semibold ml-1">{totalSubTasks}개</span> 세부 할 일 ·
                <span className="font-semibold ml-1">{totalTargetCount}회</span> 실행
              </p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4 pb-4">
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
