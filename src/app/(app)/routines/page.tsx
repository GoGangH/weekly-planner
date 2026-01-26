'use client';

import { useEffect, useState } from 'react';
import { useRoutineStore } from '@/stores/routineStore';
import { Routine, RoutineFormData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoutineForm } from '@/components/routines/RoutineForm';
import { Plus, Clock, Trash2, Edit2, Power } from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function RoutinesPage() {
  const {
    routines,
    fetchRoutines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineActive,
  } = useRoutineStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleFormSubmit = async (data: RoutineFormData) => {
    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, data);
      } else {
        await addRoutine(data);
      }
      setIsFormOpen(false);
      setEditingRoutine(null);
    } catch (error) {
      console.error('Failed to save routine:', error);
    }
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setIsFormOpen(true);
  };

  const handleDelete = async (routineId: string) => {
    if (confirm('이 루틴을 삭제할까요?')) {
      try {
        await deleteRoutine(routineId);
      } catch (error) {
        console.error('Failed to delete routine:', error);
      }
    }
  };

  const handleToggle = async (routineId: string) => {
    try {
      await toggleRoutineActive(routineId);
    } catch (error) {
      console.error('Failed to toggle routine:', error);
    }
  };

  const getDayLabels = (days: number[]) => {
    if (days.length === 7) return '매일';
    if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return '평일';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return '주말';
    return days
      .sort((a, b) => a - b)
      .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
      .join(' ');
  };

  const activeRoutines = routines.filter((r) => r.isActive);
  const inactiveRoutines = routines.filter((r) => !r.isActive);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">루틴</h1>
            <p className="text-sm text-muted-foreground mt-1">
              반복되는 일정을 관리해요
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Routine List */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-6">
          {routines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <RoutineIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">루틴이 없어요</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="text-primary text-sm mt-2"
              >
                첫 루틴 만들기
              </button>
            </div>
          ) : (
            <>
              {/* Active Routines */}
              {activeRoutines.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    활성 루틴 ({activeRoutines.length})
                  </h2>
                  <div className="space-y-2">
                    {activeRoutines.map((routine, index) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        index={index}
                        getDayLabels={getDayLabels}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Inactive Routines */}
              {inactiveRoutines.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    비활성 루틴 ({inactiveRoutines.length})
                  </h2>
                  <div className="space-y-2">
                    {inactiveRoutines.map((routine, index) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        index={index}
                        getDayLabels={getDayLabels}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Routine Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingRoutine(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoutine ? '루틴 수정' : '새 루틴'}</DialogTitle>
          </DialogHeader>
          <RoutineForm
            initialData={editingRoutine || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingRoutine(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RoutineCardProps {
  routine: Routine;
  index: number;
  getDayLabels: (days: number[]) => string;
  onEdit: (routine: Routine) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function RoutineCard({ routine, index, getDayLabels, onEdit, onDelete, onToggle }: RoutineCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl bg-card p-4 shadow-sm animate-slide-up',
        !routine.isActive && 'opacity-60'
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        borderLeft: `4px solid ${routine.color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(routine.id)}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
            routine.isActive
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Power className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium">{routine.title}</p>
          {routine.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {routine.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {routine.startTime} - {routine.endTime}
            </span>
            <span className="bg-muted px-2 py-0.5 rounded-full">
              {getDayLabels(routine.days)}
            </span>
            {routine.autoSchedule && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                자동
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(routine)}
            className="rounded-full p-2 hover:bg-muted text-muted-foreground"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(routine.id)}
            className="rounded-full p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
