import { create } from 'zustand';
import { Schedule, ScheduleFormData, ScheduleStatus, ScheduleItem, Task } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateId, formatDate } from '@/lib/utils';

interface ScheduleState {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSchedules: () => Promise<void>;
  addSchedule: (data: ScheduleFormData) => Promise<Schedule>;
  updateSchedule: (id: string, data: Partial<Schedule>, reason?: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  updateScheduleStatus: (id: string, status: ScheduleStatus, completedMinutes?: number) => Promise<void>;
  reschedule: (id: string, newDate: string, newStartTime: string, newEndTime: string, reason?: string) => Promise<void>;
  getSchedulesByDate: (date: string) => Schedule[];
  getSchedulesByDateRange: (startDate: string, endDate: string) => Schedule[];
  getScheduleById: (id: string) => Schedule | undefined;

  // 일정 내 할일 관리
  addScheduleItem: (scheduleId: string, title: string) => Promise<void>;
  toggleScheduleItem: (scheduleId: string, itemId: string) => Promise<void>;
  removeScheduleItem: (scheduleId: string, itemId: string) => Promise<void>;
  updateScheduleItem: (scheduleId: string, itemId: string, title: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  fetchSchedules: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ schedules: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const schedules: Schedule[] = (data || []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        title: s.title || '일정',
        description: s.description || undefined,
        color: s.color || '#8B7CF6',
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        items: s.items || [],
        status: s.status as ScheduleStatus,
        routineId: s.routine_id || undefined,
        googleEventId: s.google_event_id || undefined,
        syncedFromGoogle: s.synced_from_google || false,
        createdAt: new Date(s.created_at),
        // Legacy fields
        taskId: s.task_id || undefined,
      }));

      set({ schedules, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to fetch schedules:', errorMessage, error);
      set({ error: `Failed to fetch schedules: ${errorMessage}`, isLoading: false });
    }
  },

  addSchedule: async (data: ScheduleFormData) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // 프로필이 없으면 생성
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

    const newScheduleData: Record<string, unknown> = {
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      color: data.color || '#8B7CF6',
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      items: data.items || [],
      status: 'planned',
      routine_id: data.routineId || null,
      synced_from_google: false,
    };

    const { data: inserted, error } = await supabase
      .from('schedules')
      .insert(newScheduleData)
      .select()
      .single();

    if (error) {
      console.error('Supabase addSchedule error:', error);
      throw new Error(error.message || error.code || 'Unknown Supabase error');
    }

    const newSchedule: Schedule = {
      id: inserted.id,
      userId: inserted.user_id,
      title: inserted.title,
      description: inserted.description || undefined,
      color: inserted.color || '#8B7CF6',
      date: inserted.date,
      startTime: inserted.start_time,
      endTime: inserted.end_time,
      items: inserted.items || [],
      status: 'planned',
      routineId: inserted.routine_id || undefined,
      syncedFromGoogle: false,
      createdAt: new Date(inserted.created_at),
    };

    set((state) => ({ schedules: [...state.schedules, newSchedule] }));
    return newSchedule;
  },

  updateSchedule: async (id: string, data: Partial<Schedule>, reason?: string) => {
    const supabase = createClient();
    const schedule = get().schedules.find((s) => s.id === id);
    if (!schedule) return;

    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.completedMinutes !== undefined) updateData.completed_minutes = data.completedMinutes;
    if (reason) updateData.modified_reason = reason;
    updateData.modified_at = new Date().toISOString();

    const { error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id
          ? {
              ...s,
              ...data,
              modifiedAt: new Date(),
              modifiedReason: reason || s.modifiedReason,
            }
          : s
      ),
    }));
  },

  deleteSchedule: async (id: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    }));
  },

  updateScheduleStatus: async (id: string, status: ScheduleStatus, completedMinutes?: number) => {
    await get().updateSchedule(id, { status, completedMinutes });
  },

  reschedule: async (id: string, newDate: string, newStartTime: string, newEndTime: string, reason?: string) => {
    const supabase = createClient();
    const schedule = get().schedules.find((s) => s.id === id);
    if (!schedule) return;

    const updateData = {
      original_date: schedule.originalDate || schedule.date,
      original_start_time: schedule.originalStartTime || schedule.startTime,
      original_end_time: schedule.originalEndTime || schedule.endTime,
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      status: 'rescheduled',
      modified_at: new Date().toISOString(),
      modified_reason: reason || null,
    };

    const { error } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id
          ? {
              ...s,
              originalDate: s.originalDate || s.date,
              originalStartTime: s.originalStartTime || s.startTime,
              originalEndTime: s.originalEndTime || s.endTime,
              date: newDate,
              startTime: newStartTime,
              endTime: newEndTime,
              status: 'rescheduled' as ScheduleStatus,
              modifiedAt: new Date(),
              modifiedReason: reason,
            }
          : s
      ),
    }));
  },

  getSchedulesByDate: (date: string) => {
    return get().schedules.filter((s) => s.date === date);
  },

  getSchedulesByDateRange: (startDate: string, endDate: string) => {
    return get().schedules.filter((s) => s.date >= startDate && s.date <= endDate);
  },

  getScheduleById: (id: string) => {
    return get().schedules.find((s) => s.id === id);
  },

  // 일정 내 할일 추가
  addScheduleItem: async (scheduleId: string, title: string) => {
    const schedule = get().schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const newItem: ScheduleItem = {
      id: generateId(),
      title,
      isCompleted: false,
      order: schedule.items.length,
    };

    const updatedItems = [...schedule.items, newItem];

    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ items: updatedItems })
      .eq('id', scheduleId);

    if (error) {
      console.error('Failed to add schedule item:', error);
      return;
    }

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, items: updatedItems } : s
      ),
    }));
  },

  // 일정 내 할일 완료 토글
  toggleScheduleItem: async (scheduleId: string, itemId: string) => {
    const schedule = get().schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const updatedItems = schedule.items.map((item) =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );

    // 모든 항목이 완료되었는지 확인
    const allCompleted = updatedItems.length > 0 && updatedItems.every((item) => item.isCompleted);
    const newStatus: ScheduleStatus = allCompleted ? 'completed' : 'planned';

    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ items: updatedItems, status: newStatus })
      .eq('id', scheduleId);

    if (error) {
      console.error('Failed to toggle schedule item:', error);
      return;
    }

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, items: updatedItems, status: newStatus } : s
      ),
    }));
  },

  // 일정 내 할일 삭제
  removeScheduleItem: async (scheduleId: string, itemId: string) => {
    const schedule = get().schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const updatedItems = schedule.items.filter((item) => item.id !== itemId);

    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ items: updatedItems })
      .eq('id', scheduleId);

    if (error) {
      console.error('Failed to remove schedule item:', error);
      return;
    }

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, items: updatedItems } : s
      ),
    }));
  },

  // 일정 내 할일 제목 수정
  updateScheduleItem: async (scheduleId: string, itemId: string, title: string) => {
    const schedule = get().schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const updatedItems = schedule.items.map((item) =>
      item.id === itemId ? { ...item, title } : item
    );

    const supabase = createClient();
    const { error } = await supabase
      .from('schedules')
      .update({ items: updatedItems })
      .eq('id', scheduleId);

    if (error) {
      console.error('Failed to update schedule item:', error);
      return;
    }

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, items: updatedItems } : s
      ),
    }));
  },
}));
