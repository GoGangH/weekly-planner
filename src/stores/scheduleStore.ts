import { create } from 'zustand';
import { Schedule, ScheduleFormData, ScheduleStatus, Task } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateId, formatDate } from '@/lib/utils';

interface ScheduleState {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSchedules: () => Promise<void>;
  addSchedule: (data: ScheduleFormData, task?: Task) => Promise<Schedule>; // task is now optional
  updateSchedule: (id: string, data: Partial<Schedule>, reason?: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  updateScheduleStatus: (id: string, status: ScheduleStatus, completedMinutes?: number) => Promise<void>;
  reschedule: (id: string, newDate: string, newStartTime: string, newEndTime: string, reason?: string) => Promise<void>;
  getSchedulesByDate: (date: string) => Schedule[];
  getSchedulesByDateRange: (startDate: string, endDate: string) => Schedule[];
  getScheduleById: (id: string) => Schedule | undefined;
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
        .select(`
          *,
          task:tasks(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const schedules: Schedule[] = (data || []).map((s) => ({
        id: s.id,
        userId: s.user_id,
        taskId: s.task_id || undefined,
        task: s.task ? {
          id: s.task.id,
          userId: s.task.user_id,
          title: s.task.title,
          description: s.task.description || undefined,
          estimatedMinutes: s.task.estimated_minutes,
          actualMinutes: s.task.actual_minutes || undefined,
          isRecurring: s.task.is_recurring,
          recurringType: s.task.recurring_type || undefined,
          recurringDays: s.task.recurring_days || undefined,
          status: s.task.status,
          category: s.task.category || undefined,
          color: s.task.color,
          weekId: s.task.week_id || undefined,
          createdAt: new Date(s.task.created_at),
          updatedAt: new Date(s.task.updated_at),
        } : undefined,
        title: s.title || undefined,
        description: s.description || undefined,
        color: s.color || undefined,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        originalDate: s.original_date || undefined,
        originalStartTime: s.original_start_time || undefined,
        originalEndTime: s.original_end_time || undefined,
        modifiedAt: s.modified_at ? new Date(s.modified_at) : undefined,
        modifiedReason: s.modified_reason || undefined,
        status: s.status as ScheduleStatus,
        completedMinutes: s.completed_minutes || undefined,
        googleEventId: s.google_event_id || undefined,
        syncedFromGoogle: s.synced_from_google,
        createdAt: new Date(s.created_at),
      }));

      set({ schedules, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to fetch schedules:', errorMessage, error);
      set({ error: `Failed to fetch schedules: ${errorMessage}`, isLoading: false });
    }
  },

  addSchedule: async (data: ScheduleFormData, task?: Task) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const newScheduleData: Record<string, unknown> = {
      user_id: user.id,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      status: 'planned',
      synced_from_google: false,
    };

    // 태스크가 있는 경우
    if (data.taskId && task) {
      newScheduleData.task_id = data.taskId;
    } else {
      // 태스크 없이 일정만 등록하는 경우
      newScheduleData.title = data.title;
      newScheduleData.description = data.description || null;
      newScheduleData.color = data.color || '#8B7CF6';
    }

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
      taskId: inserted.task_id || undefined,
      task,
      title: inserted.title || undefined,
      description: inserted.description || undefined,
      color: inserted.color || undefined,
      date: inserted.date,
      startTime: inserted.start_time,
      endTime: inserted.end_time,
      status: 'planned',
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
}));
