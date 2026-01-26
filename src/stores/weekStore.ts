import { create } from 'zustand';
import { Week } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { getWeekId, getWeekRange, formatDate } from '@/lib/utils';
import { addWeeks, subWeeks } from 'date-fns';

interface WeekState {
  currentDate: Date;
  currentWeekId: string;
  weeks: Week[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWeeks: () => Promise<void>;
  setCurrentDate: (date: Date) => void;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
  updateWeekGoals: (weekId: string, goals: string[]) => Promise<void>;
  updateWeekNotes: (weekId: string, notes: string) => Promise<void>;
  getCurrentWeek: () => Week | undefined;
  getOrCreateWeek: (date: Date) => Promise<Week>;
}

export const useWeekStore = create<WeekState>((set, get) => ({
  currentDate: new Date(),
  currentWeekId: getWeekId(new Date()),
  weeks: [],
  isLoading: false,
  error: null,

  fetchWeeks: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ weeks: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const weeks: Week[] = (data || []).map((w) => ({
        id: w.id,
        userId: w.user_id,
        startDate: w.start_date,
        endDate: w.end_date,
        goals: w.goals || [],
        notes: w.notes || undefined,
        plannedMinutes: w.planned_minutes,
        completedMinutes: w.completed_minutes,
        createdAt: new Date(w.created_at),
      }));

      set({ weeks, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to fetch weeks:', errorMessage, error);
      set({ error: `Failed to fetch weeks: ${errorMessage}`, isLoading: false });
    }
  },

  setCurrentDate: (date: Date) => {
    set({
      currentDate: date,
      currentWeekId: getWeekId(date),
    });
  },

  goToNextWeek: () => {
    const nextWeek = addWeeks(get().currentDate, 1);
    set({
      currentDate: nextWeek,
      currentWeekId: getWeekId(nextWeek),
    });
  },

  goToPrevWeek: () => {
    const prevWeek = subWeeks(get().currentDate, 1);
    set({
      currentDate: prevWeek,
      currentWeekId: getWeekId(prevWeek),
    });
  },

  goToToday: () => {
    const today = new Date();
    set({
      currentDate: today,
      currentWeekId: getWeekId(today),
    });
  },

  updateWeekGoals: async (weekId: string, goals: string[]) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('weeks')
      .update({ goals })
      .eq('id', weekId);

    if (error) throw error;

    set((state) => ({
      weeks: state.weeks.map((week) =>
        week.id === weekId ? { ...week, goals } : week
      ),
    }));
  },

  updateWeekNotes: async (weekId: string, notes: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('weeks')
      .update({ notes })
      .eq('id', weekId);

    if (error) throw error;

    set((state) => ({
      weeks: state.weeks.map((week) =>
        week.id === weekId ? { ...week, notes } : week
      ),
    }));
  },

  getCurrentWeek: () => {
    return get().weeks.find((week) => week.id === get().currentWeekId);
  },

  getOrCreateWeek: async (date: Date) => {
    const weekId = getWeekId(date);
    const existingWeek = get().weeks.find((week) => week.id === weekId);

    if (existingWeek) return existingWeek;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { start, end } = getWeekRange(date);
    const newWeekData = {
      id: weekId,
      user_id: user.id,
      start_date: formatDate(start),
      end_date: formatDate(end),
      goals: [],
      planned_minutes: 0,
      completed_minutes: 0,
    };

    const { data: inserted, error } = await supabase
      .from('weeks')
      .insert(newWeekData)
      .select()
      .single();

    if (error) throw error;

    const newWeek: Week = {
      id: inserted.id,
      userId: inserted.user_id,
      startDate: inserted.start_date,
      endDate: inserted.end_date,
      goals: inserted.goals || [],
      notes: inserted.notes || undefined,
      plannedMinutes: inserted.planned_minutes,
      completedMinutes: inserted.completed_minutes,
      createdAt: new Date(inserted.created_at),
    };

    set((state) => ({ weeks: [...state.weeks, newWeek] }));
    return newWeek;
  },
}));
