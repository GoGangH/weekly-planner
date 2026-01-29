'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Schedule, Routine, ScheduleFormData } from '@/types';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useRoutineStore } from '@/stores/routineStore';
import { formatDate, normalizeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScheduleForm } from '@/components/schedule/ScheduleForm';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Time constants - 04:00 ~ 03:00 (다음날)
const START_HOUR = 4;
const END_HOUR = 27; // 다음날 03:00 (4 + 23)
const SLOTS_PER_HOUR = 6; // 10분 단위
const MINUTES_PER_SLOT = 10;

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
  const hour = (START_HOUR + i) % 24;
  return { hour, displayHour: START_HOUR + i };
});

const ROW_HEIGHT = 26; // 각 시간 행의 높이 (px)

// 시간을 슬롯 인덱스로 변환
function timeToSlotIndex(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  let adjustedHours = hours < START_HOUR ? hours + 24 : hours;
  const totalMinutes = (adjustedHours - START_HOUR) * 60 + minutes;
  return Math.floor(totalMinutes / MINUTES_PER_SLOT);
}

interface DayViewProps {
  date: Date;
  schedules: Schedule[];
  routines: Routine[];
  googleEvents: any[];
  onAddTask: () => void;
}

export function DayView({
  date,
  schedules,
  routines,
  googleEvents,
  onAddTask,
}: DayViewProps) {
  const dateStr = formatDate(date);
  const [memo, setMemo] = useState('');
  const [comment, setComment] = useState('');
  const [isAddingRoutine, setIsAddingRoutine] = useState<string | null>(null);

  // 수정 모달 상태
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [pendingEditData, setPendingEditData] = useState<ScheduleFormData | null>(null);

  // 루틴 변경 확인 대화상자 상태
  const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);

  // 루틴 삭제 확인 대화상자 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { toggleScheduleItem, updateScheduleStatus, addSchedule, deleteSchedule } = useScheduleStore();
  const { routineToScheduleData, updateRoutine } = useRoutineStore();

  // 일정을 시작 시간 순으로 정렬
  const sortedSchedules = useMemo(() =>
    [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules]
  );

  // 이미 일정화되지 않은 루틴들
  const activeRoutines = useMemo(() =>
    routines.filter(r => !sortedSchedules.some(s => s.routineId === r.id)),
    [routines, sortedSchedules]
  );

  // 슬롯 데이터 계산 (시간표용)
  const slotData = useMemo(() => {
    const totalSlots = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
    const slots: Array<{
      schedule: Schedule | null;
      routine: Routine | null;
      isStart: boolean;
    }> = Array.from({ length: totalSlots }, () => ({
      schedule: null,
      routine: null,
      isStart: false,
    }));

    // 일정을 슬롯에 배치
    sortedSchedules.forEach((schedule) => {
      const startSlot = timeToSlotIndex(schedule.startTime);
      const endSlot = timeToSlotIndex(schedule.endTime);

      for (let i = startSlot; i < endSlot && i < totalSlots; i++) {
        if (i >= 0) {
          slots[i].schedule = schedule;
          if (i === startSlot) {
            slots[i].isStart = true;
          }
        }
      }
    });

    // 루틴을 슬롯에 배치
    activeRoutines.forEach((routine) => {
      const startSlot = timeToSlotIndex(routine.startTime);
      const endSlot = timeToSlotIndex(routine.endTime);

      for (let i = startSlot; i < endSlot && i < totalSlots; i++) {
        if (i >= 0 && !slots[i].schedule) {
          slots[i].routine = routine;
          if (i === startSlot) {
            slots[i].isStart = true;
          }
        }
      }
    });

    return slots;
  }, [sortedSchedules, activeRoutines]);

  // 루틴을 일정으로 변환
  const handleAddRoutineAsSchedule = async (routine: Routine) => {
    setIsAddingRoutine(routine.id);
    try {
      const scheduleData = routineToScheduleData(routine, dateStr);
      await addSchedule(scheduleData);
    } catch (error) {
      console.error('Failed to add routine as schedule:', error);
    } finally {
      setIsAddingRoutine(null);
    }
  };

  // 할일 체크 토글
  const handleToggleItem = (scheduleId: string, itemId: string) => {
    toggleScheduleItem(scheduleId, itemId);
  };

  // 일정 완료 토글
  const handleToggleScheduleComplete = (schedule: Schedule) => {
    const newStatus = schedule.status === 'completed' ? 'planned' : 'completed';
    updateScheduleStatus(schedule.id, newStatus);
  };

  // 일정 수정 열기
  const handleOpenEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsEditSheetOpen(true);
  };

  // 일정 수정 제출
  const handleEditSubmit = async (data: ScheduleFormData) => {
    if (!editingSchedule) return;

    // 루틴 기반 일정인 경우 확인 대화상자 표시
    if (editingSchedule.routineId) {
      setPendingEditData(data);
      setIsEditSheetOpen(false);
      setIsRoutineDialogOpen(true);
      return;
    }

    // 일반 일정 수정
    await applyScheduleEdit(data, false);
  };

  // 실제 일정 수정 적용
  const applyScheduleEdit = async (data: ScheduleFormData, applyToRoutine: boolean) => {
    if (!editingSchedule) return;

    const supabase = (await import('@/lib/supabase/client')).createClient();

    // 일정 업데이트
    const { error } = await supabase
      .from('schedules')
      .update({
        title: data.title,
        color: data.color,
        start_time: data.startTime,
        end_time: data.endTime,
        items: data.items,
      })
      .eq('id', editingSchedule.id);

    if (error) {
      console.error('Failed to update schedule:', error);
      return;
    }

    // 루틴도 함께 수정하는 경우
    if (applyToRoutine && editingSchedule.routineId) {
      const routine = routines.find(r => r.id === editingSchedule.routineId);
      if (routine) {
        await updateRoutine(routine.id, {
          title: data.title,
          color: data.color,
          startTime: data.startTime,
          endTime: data.endTime,
          items: data.items?.map((item, idx) => ({
            id: item.id,
            title: item.title,
            order: idx,
          })) || [],
        });
      }
    }

    // 로컬 상태 업데이트를 위해 페이지 새로고침
    window.location.reload();
  };

  // 루틴 변경 확인 - 오늘만
  const handleApplyTodayOnly = async () => {
    if (pendingEditData) {
      await applyScheduleEdit(pendingEditData, false);
    }
    setIsRoutineDialogOpen(false);
    setPendingEditData(null);
    setEditingSchedule(null);
  };

  // 루틴 변경 확인 - 모든 일정
  const handleApplyToAll = async () => {
    if (pendingEditData) {
      await applyScheduleEdit(pendingEditData, true);
    }
    setIsRoutineDialogOpen(false);
    setPendingEditData(null);
    setEditingSchedule(null);
  };

  // 일정 삭제
  const handleDeleteSchedule = async () => {
    if (!editingSchedule) return;

    // 루틴 기반 일정인 경우 확인 대화상자 표시
    if (editingSchedule.routineId) {
      setIsEditSheetOpen(false);
      setIsDeleteDialogOpen(true);
      return;
    }

    // 일반 일정 삭제
    if (confirm('이 일정을 삭제하시겠습니까?')) {
      await deleteSchedule(editingSchedule.id);
      setIsEditSheetOpen(false);
      setEditingSchedule(null);
    }
  };

  // 오늘만 삭제
  const handleDeleteTodayOnly = async () => {
    if (!editingSchedule) return;

    await deleteSchedule(editingSchedule.id);
    setIsDeleteDialogOpen(false);
    setEditingSchedule(null);
  };

  // 앞으로 모든 일정 삭제 (루틴 종료일을 어제로 설정)
  const handleDeleteAllFuture = async () => {
    if (!editingSchedule || !editingSchedule.routineId) return;

    const routine = routines.find(r => r.id === editingSchedule.routineId);
    if (routine) {
      // 루틴의 종료일을 어제로 설정 (오늘부터 더 이상 생성되지 않음)
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      await updateRoutine(routine.id, {
        endDate: formatDate(yesterday),
      });
    }

    // 오늘 일정도 삭제
    await deleteSchedule(editingSchedule.id);
    setIsDeleteDialogOpen(false);
    setEditingSchedule(null);
    window.location.reload();
  };

  // 체크박스 컴포넌트
  const CheckBox = ({ checked, onClick }: { checked: boolean; onClick?: () => void }) => (
    <div
      className={cn(
        "w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 cursor-pointer transition-colors",
        checked
          ? "bg-rose-400 border-rose-400"
          : "border-muted-foreground/50 hover:border-muted-foreground"
      )}
      onClick={onClick}
    >
      {checked && (
        <span className="text-[10px] text-white font-bold">✓</span>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-background">
      {/* 왼쪽 영역 - TASKS + MEMO */}
      <div className="w-1/2 border-r flex flex-col">
        {/* TASKS 헤더 */}
        <div className="px-4 py-2 border-b shrink-0">
          <p className="text-[9px] text-muted-foreground tracking-[0.2em] text-center">TASKS</p>
        </div>

        {/* TASKS 목록 */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {sortedSchedules.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  등록된 일정이 없습니다
                </p>
                <Button onClick={onAddTask} variant="outline" size="sm" className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  일정 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSchedules.map(schedule => {
                  const hasItems = schedule.items && schedule.items.length > 0;
                  const allCompleted = hasItems && schedule.items.every(i => i.isCompleted);
                  const isCompleted = schedule.status === 'completed' || allCompleted;

                  return (
                    <div key={schedule.id} className="space-y-1">
                      {/* 일정 헤더 (카테고리) - 시간 포함 - 클릭 시 수정 */}
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: schedule.color }}
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {normalizeTime(schedule.startTime)}
                        </span>
                        <span
                          className="text-xs font-medium flex-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleOpenEdit(schedule)}
                        >
                          {schedule.title}
                        </span>
                      </div>

                      {/* 일정 내 할일 목록 */}
                      {hasItems && (
                        <div className="pl-5 space-y-1">
                          {schedule.items.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 py-0.5"
                            >
                              <CheckBox
                                checked={item.isCompleted}
                                onClick={() => handleToggleItem(schedule.id, item.id)}
                              />
                              <span className={cn(
                                "flex-1 text-xs",
                                item.isCompleted && "line-through text-muted-foreground"
                              )}>
                                {item.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 일정 추가 버튼 - 목록 하단에 */}
                <div className="pt-2">
                  <Button onClick={onAddTask} variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-start">
                    <Plus className="h-3 w-3 mr-1" />
                    일정 추가
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* MEMO 섹션 (하단) */}
        <div className="border-t shrink-0">
          <div className="px-4 py-2 border-b">
            <p className="text-[9px] text-muted-foreground tracking-[0.2em] text-center">MEMO</p>
          </div>
          <div className="p-3">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘의 메모..."
              className="text-xs min-h-[60px] resize-none border border-muted/50 rounded-md bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* 오른쪽 영역 - TIME TABLE + COMMENT */}
      <div className="w-1/2 flex flex-col">
        {/* TIME TABLE 헤더 */}
        <div className="px-4 py-2 border-b shrink-0">
          <p className="text-[9px] text-muted-foreground tracking-[0.2em] text-center">TIME TABLE</p>
        </div>

        {/* TIME TABLE */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="border-2 border-muted rounded overflow-hidden">
              {HOURS.map(({ hour, displayHour }) => {
                const hourStartSlot = (displayHour - START_HOUR) * SLOTS_PER_HOUR;

                return (
                  <div
                    key={displayHour}
                    className="flex border-b border-muted last:border-b-0"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* 시간 라벨 */}
                    <div className="w-11 shrink-0 text-[9px] text-muted-foreground flex items-center justify-end pr-1.5 border-r border-muted bg-muted/20">
                      {String(hour).padStart(2, '0')}:00
                    </div>

                    {/* 6개 슬롯 (10분 단위) */}
                    <div className="flex flex-1">
                      {Array.from({ length: SLOTS_PER_HOUR }).map((_, slotInHour) => {
                        const globalSlotIndex = hourStartSlot + slotInHour;
                        const slot = slotData[globalSlotIndex];
                        const hasSchedule = !!slot?.schedule;
                        const hasRoutine = !!slot?.routine;
                        const isStart = slot?.isStart;

                        if (hasSchedule && slot.schedule) {
                          const schedule = slot.schedule;

                          return (
                            <div
                              key={slotInHour}
                              className="flex-1 border-r border-muted/50 last:border-r-0 flex items-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: schedule.color,
                              }}
                              onClick={() => handleOpenEdit(schedule)}
                            >
                              {isStart && (
                                <span className="text-[8px] font-medium text-white px-0.5 truncate drop-shadow-sm">
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
                              className="flex-1 border-r border-muted/50 last:border-r-0 cursor-pointer flex items-center overflow-hidden"
                              style={{
                                backgroundColor: `${routine.color}60`,
                              }}
                              onClick={() => handleAddRoutineAsSchedule(routine)}
                            >
                              {isStart && (
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
                            className="flex-1 border-r border-muted/50 last:border-r-0 bg-background"
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        {/* COMMENT 섹션 (하단) */}
        <div className="border-t shrink-0">
          <div className="px-4 py-2 border-b">
            <p className="text-[9px] text-muted-foreground tracking-[0.2em] text-center">COMMENT</p>
          </div>
          <div className="p-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="오늘 하루 회고..."
              className="text-xs min-h-[60px] resize-none border border-muted/50 rounded-md bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* 일정 수정 Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col p-0" showCloseButton={false}>
          {/* 고정 헤더 */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
            <SheetTitle className="text-lg font-semibold">
              {editingSchedule ? '일정 수정' : '일정 추가'}
            </SheetTitle>
            <button
              onClick={() => {
                setIsEditSheetOpen(false);
                setEditingSchedule(null);
              }}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* 스크롤 가능한 컨텐츠 영역 */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {editingSchedule && (
              <ScheduleForm
                date={dateStr}
                schedule={editingSchedule}
                onSubmit={handleEditSubmit}
                onCancel={() => {
                  setIsEditSheetOpen(false);
                  setEditingSchedule(null);
                }}
                onDelete={handleDeleteSchedule}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 루틴 변경 확인 대화상자 */}
      <Dialog open={isRoutineDialogOpen} onOpenChange={setIsRoutineDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>루틴 일정 수정</DialogTitle>
            <DialogDescription>
              이 일정은 루틴에서 생성되었습니다. 변경 사항을 어떻게 적용하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRoutineDialogOpen(false);
                setPendingEditData(null);
                setEditingSchedule(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="secondary"
              onClick={handleApplyTodayOnly}
            >
              오늘만 수정
            </Button>
            <Button onClick={handleApplyToAll}>
              앞으로 모든 일정 수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 루틴 삭제 확인 대화상자 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>루틴 일정 삭제</DialogTitle>
            <DialogDescription>
              이 일정은 루틴에서 생성되었습니다. 어떻게 삭제하시겠습니까?
              이전 기록은 유지됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEditingSchedule(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="secondary"
              onClick={handleDeleteTodayOnly}
            >
              오늘만 삭제
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllFuture}
            >
              앞으로 모든 일정 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
