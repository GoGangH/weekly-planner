import { create } from 'zustand';
import { Week, WeeklyGoal } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { getWeekId, getWeekRange, formatDate, generateId } from '@/lib/utils';
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
  updateWeeklyGoals: (weekId: string, weeklyGoals: WeeklyGoal[]) => Promise<void>;
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
        weeklyGoals: w.weekly_goals || undefined,
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

  updateWeeklyGoals: async (weekId: string, weeklyGoals: WeeklyGoal[]) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('weeks')
      .update({ weekly_goals: weeklyGoals })
      .eq('id', weekId);

    if (error) {
      console.error('updateWeeklyGoals error:', error);
      // weekly_goals 컬럼이 없을 수 있으므로 에러를 무시하고 로컬만 업데이트
      if (error.code === '42703' || error.message?.includes('column')) {
        console.warn('weekly_goals 컬럼이 없습니다. SQL 실행이 필요합니다: ALTER TABLE weeks ADD COLUMN weekly_goals jsonb;');
      } else {
        throw new Error(`주간 목표 저장 실패: ${error.message}`);
      }
    }

    set((state) => ({
      weeks: state.weeks.map((week) =>
        week.id === weekId ? { ...week, weeklyGoals } : week
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

    // 먼저 DB에서 해당 주가 있는지 확인
    const { data: existingInDb } = await supabase
      .from('weeks')
      .select('*')
      .eq('id', weekId)
      .single();

    if (existingInDb) {
      // DB에 이미 있으면 로컬 상태에 추가하고 반환
      const week: Week = {
        id: existingInDb.id,
        userId: existingInDb.user_id,
        startDate: existingInDb.start_date,
        endDate: existingInDb.end_date,
        goals: existingInDb.goals || [],
        weeklyGoals: existingInDb.weekly_goals || undefined,
        notes: existingInDb.notes || undefined,
        plannedMinutes: existingInDb.planned_minutes,
        completedMinutes: existingInDb.completed_minutes,
        createdAt: new Date(existingInDb.created_at),
      };
      set((state) => {
        // 중복 추가 방지
        if (state.weeks.find((w) => w.id === weekId)) return state;
        return { weeks: [...state.weeks, week] };
      });
      return week;
    }

    // 프로필이 없으면 생성 (첫 로그인 시 트리거가 작동하지 않은 경우 대비)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

      if (profileError) {
        console.error('프로필 생성 실패:', profileError);
        throw new Error(`프로필 생성 실패: ${profileError.message}`);
      }
    }

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
      weeklyGoals: inserted.weekly_goals || undefined,
      notes: inserted.notes || undefined,
      plannedMinutes: inserted.planned_minutes,
      completedMinutes: inserted.completed_minutes,
      createdAt: new Date(inserted.created_at),
    };

    set((state) => ({ weeks: [...state.weeks, newWeek] }));
    return newWeek;
  },
}));
