import { create } from 'zustand';
import { Routine, RoutineFormData } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateId } from '@/lib/utils';

interface RoutineState {
  routines: Routine[];
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
  getRoutineById: (id: string) => Routine | undefined;
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: [],
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
        isActive: r.is_active,
        autoSchedule: r.auto_schedule,
        color: r.color,
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
      is_active: data.isActive,
      auto_schedule: data.autoSchedule,
      color: data.color,
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
      isActive: inserted.is_active,
      autoSchedule: inserted.auto_schedule,
      color: inserted.color,
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
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.autoSchedule !== undefined) updateData.auto_schedule = data.autoSchedule;
    if (data.color !== undefined) updateData.color = data.color;

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

  getRoutineById: (id: string) => {
    return get().routines.find((routine) => routine.id === id);
  },
}));
