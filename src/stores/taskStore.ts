import { create } from 'zustand';
import { Task, TaskFormData, TaskStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateId, getWeekId } from '@/lib/utils';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  addTask: (data: TaskFormData) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  getTasksByWeek: (weekId: string) => Task[];
  getBacklogTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ tasks: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks: Task[] = (data || []).map((t) => ({
        id: t.id,
        userId: t.user_id,
        title: t.title,
        description: t.description || undefined,
        estimatedMinutes: t.estimated_minutes,
        actualMinutes: t.actual_minutes || undefined,
        isRecurring: t.is_recurring,
        recurringType: t.recurring_type || undefined,
        recurringDays: t.recurring_days || undefined,
        status: t.status as TaskStatus,
        category: t.category || undefined,
        color: t.color,
        weekId: t.week_id || undefined,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at),
      }));

      set({ tasks, isLoading: false });
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || JSON.stringify(error);
      console.error('Failed to fetch tasks:', errorMessage, error);
      set({ error: `Failed to fetch tasks: ${errorMessage}`, isLoading: false });
    }
  },

  addTask: async (data: TaskFormData) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

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

      if (profileError && profileError.code !== '23505') { // 23505 = duplicate key (이미 존재)
        console.error('Failed to create profile:', profileError);
        throw new Error('프로필 생성 실패: ' + profileError.message);
      }
    }

    const newTaskData = {
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      estimated_minutes: data.estimatedMinutes,
      is_recurring: data.isRecurring || false,
      recurring_type: data.recurringType || null,
      recurring_days: data.recurringDays || null,
      status: 'backlog',
      category: data.category || null,
      color: data.color,
      week_id: data.weekId || null,
    };

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert(newTaskData)
      .select()
      .single();

    if (error) {
      console.error('Supabase addTask error:', error);
      throw new Error(error.message || error.code || 'Unknown Supabase error');
    }

    const newTask: Task = {
      id: inserted.id,
      userId: inserted.user_id,
      title: inserted.title,
      description: inserted.description || undefined,
      estimatedMinutes: inserted.estimated_minutes,
      actualMinutes: inserted.actual_minutes || undefined,
      isRecurring: inserted.is_recurring,
      recurringType: inserted.recurring_type || undefined,
      recurringDays: inserted.recurring_days || undefined,
      status: inserted.status as TaskStatus,
      category: inserted.category || undefined,
      color: inserted.color,
      weekId: inserted.week_id || undefined,
      createdAt: new Date(inserted.created_at),
      updatedAt: new Date(inserted.updated_at),
    };

    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  updateTask: async (id: string, data: Partial<Task>) => {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.estimatedMinutes !== undefined) updateData.estimated_minutes = data.estimatedMinutes;
    if (data.actualMinutes !== undefined) updateData.actual_minutes = data.actualMinutes;
    if (data.isRecurring !== undefined) updateData.is_recurring = data.isRecurring;
    if (data.recurringType !== undefined) updateData.recurring_type = data.recurringType;
    if (data.recurringDays !== undefined) updateData.recurring_days = data.recurringDays;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.weekId !== undefined) updateData.week_id = data.weekId;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, ...data, updatedAt: new Date() }
          : task
      ),
    }));
  },

  deleteTask: async (id: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  updateTaskStatus: async (id: string, status: TaskStatus) => {
    await get().updateTask(id, { status });
  },

  getTasksByWeek: (weekId: string) => {
    return get().tasks.filter((task) => task.weekId === weekId);
  },

  getBacklogTasks: () => {
    return get().tasks.filter((task) => task.status === 'backlog');
  },

  getTaskById: (id: string) => {
    return get().tasks.find((task) => task.id === id);
  },
}));
