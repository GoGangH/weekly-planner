import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Routine, RoutineFormData, RoutineLog, RoutineItem, ScheduleFormData, ScheduleItem } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateId, formatDate } from '@/lib/utils';

interface RoutineState {
  routines: Routine[];
  routineLogs: Record<string, RoutineLog>; // key: `${routineId}-${date}`
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRoutines: () => Promise<void>;
  addRoutine: (data: RoutineFormData) => Promise<Routine>;
  updateRoutine: (id: string, data: Partial<Routine>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  toggleRoutineActive: (id: string) => Promise<void>;
  getActiveRoutines: () => Routine[];
  getRoutinesByDay: (day: number) => Routine[];
  getRoutinesForDate: (date: string) => Routine[];
  getRoutineById: (id: string) => Routine | undefined;

  // Routine Item Actions
  addRoutineItem: (routineId: string, title: string) => Promise<void>;
  removeRoutineItem: (routineId: string, itemId: string) => Promise<void>;
  updateRoutineItem: (routineId: string, itemId: string, title: string) => Promise<void>;

  // 루틴에서 자동으로 일정 생성 (DB에서 직접 중복 체크)
  autoGenerateSchedulesForDate: (date: string) => Promise<any[]>;

  // 루틴을 일정으로 변환
  routineToScheduleData: (routine: Routine, date: string) => ScheduleFormData;

  // Routine Log Actions
  toggleRoutineCompletion: (routineId: string, date: string) => void;
  isRoutineCompleted: (routineId: string, date: string) => boolean;
  getRoutineStats: (routineId: string, startDate: string, endDate: string) => { total: number; completed: number };
  getWeeklyRoutineStats: () => { total: number; completed: number };
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
  routines: [],
  routineLogs: {},
  isLoading: false,
  error: null,

  fetchRoutines: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ routines: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const routines: Routine[] = (data || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        description: r.description || undefined,
        days: r.days,
        startTime: r.start_time,
        endTime: r.end_time,
        items: r.items || [],
        isActive: r.is_active,
        autoSchedule: r.auto_schedule,
        color: r.color,
        startDate: r.start_date || undefined,
        endDate: r.end_date || undefined,
        createdAt: new Date(r.created_at),
      }));

      set({ routines, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to fetch routines:', errorMessage, error);
      set({ error: `Failed to fetch routines: ${errorMessage}`, isLoading: false });
    }
  },

  addRoutine: async (data: RoutineFormData) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const newRoutineData = {
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      days: data.days,
      start_time: data.startTime,
      end_time: data.endTime,
      items: data.items || [],
      is_active: data.isActive,
      auto_schedule: data.autoSchedule,
      color: data.color,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    };

    const { data: inserted, error } = await supabase
      .from('routines')
      .insert(newRoutineData)
      .select()
      .single();

    if (error) throw error;

    const newRoutine: Routine = {
      id: inserted.id,
      userId: inserted.user_id,
      title: inserted.title,
      description: inserted.description || undefined,
      days: inserted.days,
      startTime: inserted.start_time,
      endTime: inserted.end_time,
      items: inserted.items || [],
      isActive: inserted.is_active,
      autoSchedule: inserted.auto_schedule,
      color: inserted.color,
      startDate: inserted.start_date || undefined,
      endDate: inserted.end_date || undefined,
      createdAt: new Date(inserted.created_at),
    };

    set((state) => ({ routines: [...state.routines, newRoutine] }));
    return newRoutine;
  },

  updateRoutine: async (id: string, data: Partial<Routine>) => {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.days !== undefined) updateData.days = data.days;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.autoSchedule !== undefined) updateData.auto_schedule = data.autoSchedule;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate || null;

    const { error } = await supabase
      .from('routines')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      routines: state.routines.map((routine) =>
        routine.id === id ? { ...routine, ...data } : routine
      ),
    }));
  },

  deleteRoutine: async (id: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      routines: state.routines.filter((routine) => routine.id !== id),
    }));
  },

  toggleRoutineActive: async (id: string) => {
    const routine = get().routines.find((r) => r.id === id);
    if (!routine) return;

    await get().updateRoutine(id, { isActive: !routine.isActive });
  },

  getActiveRoutines: () => {
    return get().routines.filter((routine) => routine.isActive);
  },

  getRoutinesByDay: (day: number) => {
    return get().routines.filter(
      (routine) => routine.isActive && routine.days.includes(day)
    );
  },

  // 특정 날짜에 해당하는 루틴 조회 (날짜 범위 체크 포함)
  getRoutinesForDate: (date: string) => {
    const dayOfWeek = new Date(date).getDay();
    return get().routines.filter((routine) => {
      if (!routine.isActive) return false;
      if (!routine.days.includes(dayOfWeek)) return false;

      // 시작일 체크
      if (routine.startDate && date < routine.startDate) return false;
      // 종료일 체크 (종료일이 있는 경우만)
      if (routine.endDate && date > routine.endDate) return false;

      return true;
    });
  },

  getRoutineById: (id: string) => {
    return get().routines.find((routine) => routine.id === id);
  },

  // Routine Item Actions
  addRoutineItem: async (routineId: string, title: string) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return;

    const newItem: RoutineItem = {
      id: generateId(),
      title,
      order: routine.items.length,
    };

    const updatedItems = [...routine.items, newItem];

    const supabase = createClient();
    const { error } = await supabase
      .from('routines')
      .update({ items: updatedItems })
      .eq('id', routineId);

    if (error) {
      console.error('Failed to add routine item:', error);
      return;
    }

    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === routineId ? { ...r, items: updatedItems } : r
      ),
    }));
  },

  removeRoutineItem: async (routineId: string, itemId: string) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return;

    const updatedItems = routine.items.filter((item) => item.id !== itemId);

    const supabase = createClient();
    const { error } = await supabase
      .from('routines')
      .update({ items: updatedItems })
      .eq('id', routineId);

    if (error) {
      console.error('Failed to remove routine item:', error);
      return;
    }

    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === routineId ? { ...r, items: updatedItems } : r
      ),
    }));
  },

  updateRoutineItem: async (routineId: string, itemId: string, title: string) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return;

    const updatedItems = routine.items.map((item) =>
      item.id === itemId ? { ...item, title } : item
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('routines')
      .update({ items: updatedItems })
      .eq('id', routineId);

    if (error) {
      console.error('Failed to update routine item:', error);
      return;
    }

    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === routineId ? { ...r, items: updatedItems } : r
      ),
    }));
  },

  // 루틴에서 자동으로 일정 생성 (아직 생성되지 않은 경우에만)
  // 데이터베이스에서 직접 확인하여 중복 생성 방지
  autoGenerateSchedulesForDate: async (date: string, _existingSchedules?: { routineId?: string }[]) => {
    const routines = get().getRoutinesForDate(date);
    const autoScheduleRoutines = routines.filter(routine => routine.autoSchedule);

    if (autoScheduleRoutines.length === 0) return [];

    const supabase = (await import('@/lib/supabase/client')).createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // 데이터베이스에서 해당 날짜의 기존 일정을 직접 조회
    const { data: existingDbSchedules, error: fetchError } = await supabase
      .from('schedules')
      .select('routine_id')
      .eq('user_id', user.id)
      .eq('date', date)
      .not('routine_id', 'is', null);

    if (fetchError) {
      console.error('Failed to fetch existing schedules:', fetchError);
      return [];
    }

    const existingRoutineIds = new Set(
      (existingDbSchedules || []).map(s => s.routine_id).filter(Boolean)
    );

    // 아직 해당 날짜에 일정이 생성되지 않은 루틴만 필터링
    const routinesToCreate = autoScheduleRoutines.filter(
      routine => !existingRoutineIds.has(routine.id)
    );

    if (routinesToCreate.length === 0) return [];

    const newSchedules = [];

    for (const routine of routinesToCreate) {
      const scheduleItems = routine.items.map((item) => ({
        id: generateId(),
        title: item.title,
        isCompleted: false,
        order: item.order,
      }));

      const newScheduleData = {
        user_id: user.id,
        title: routine.title,
        description: routine.description || null,
        color: routine.color,
        date: date,
        start_time: routine.startTime,
        end_time: routine.endTime,
        items: scheduleItems,
        status: 'planned',
        routine_id: routine.id,
        synced_from_google: false,
      };

      const { data: inserted, error } = await supabase
        .from('schedules')
        .insert(newScheduleData)
        .select()
        .single();

      if (!error && inserted) {
        newSchedules.push(inserted);
      }
    }

    return newSchedules;
  },

  // 루틴을 일정 데이터로 변환
  routineToScheduleData: (routine: Routine, date: string): ScheduleFormData => {
    // 루틴의 items를 ScheduleItem으로 변환
    const scheduleItems: ScheduleItem[] = routine.items.map((item) => ({
      id: generateId(),
      title: item.title,
      isCompleted: false,
      order: item.order,
    }));

    return {
      title: routine.title,
      description: routine.description,
      color: routine.color,
      date,
      startTime: routine.startTime,
      endTime: routine.endTime,
      items: scheduleItems,
      routineId: routine.id,
    };
  },

  // Routine Log Actions
  toggleRoutineCompletion: (routineId: string, date: string) => {
    const key = `${routineId}-${date}`;
    const currentLog = get().routineLogs[key];

    if (currentLog?.isCompleted) {
      // 완료 취소
      const { [key]: _, ...rest } = get().routineLogs;
      set({ routineLogs: rest });
    } else {
      // 완료 처리
      set({
        routineLogs: {
          ...get().routineLogs,
          [key]: {
            id: generateId(),
            routineId,
            userId: '',
            date,
            isCompleted: true,
            completedAt: new Date(),
          },
        },
      });
    }
  },

  isRoutineCompleted: (routineId: string, date: string) => {
    const key = `${routineId}-${date}`;
    return get().routineLogs[key]?.isCompleted || false;
  },

  getRoutineStats: (routineId: string, startDate: string, endDate: string) => {
    const routine = get().routines.find((r) => r.id === routineId);
    if (!routine) return { total: 0, completed: 0 };

    let total = 0;
    let completed = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (routine.days.includes(dayOfWeek)) {
        total++;
        const dateStr = formatDate(d);
        if (get().isRoutineCompleted(routineId, dateStr)) {
          completed++;
        }
      }
    }

    return { total, completed };
  },

  getWeeklyRoutineStats: () => {
    const routines = get().getActiveRoutines();
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 주 시작일 (월요일)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    let total = 0;
    let completed = 0;

    routines.forEach((routine) => {
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const day = d.getDay();
        if (routine.days.includes(day) && d <= today) {
          total++;
          const dateStr = formatDate(d);
          if (get().isRoutineCompleted(routine.id, dateStr)) {
            completed++;
          }
        }
      }
    });

    return { total, completed };
  },
    }),
    {
      name: 'routine-logs-storage',
      partialize: (state) => ({ routineLogs: state.routineLogs }),
    }
  )
);
