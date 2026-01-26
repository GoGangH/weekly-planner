// Core types for Weekly Planner

export type TaskStatus = 'backlog' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type RecurringType = 'daily' | 'weekly' | 'custom';
export type ScheduleStatus = 'planned' | 'completed' | 'partial' | 'skipped' | 'rescheduled';

export interface Profile {
  id: string;
  email: string;
  name: string;
  googleCalendarToken?: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  isRecurring: boolean;
  recurringType?: RecurringType;
  recurringDays?: number[]; // [1,2,3,4,5] = Mon-Fri
  status: TaskStatus;
  category?: string;
  color: string;
  weekId?: string; // '2026-W04'
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  userId: string;
  taskId?: string; // nullable: 태스크 없이 일정만 등록 가능
  task?: Task; // Joined task data
  title?: string; // 태스크 없이 일정 등록시 사용
  description?: string;
  color?: string;
  date: string; // ISO date string
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  originalDate?: string;
  originalStartTime?: string;
  originalEndTime?: string;
  modifiedAt?: Date;
  modifiedReason?: string;
  status: ScheduleStatus;
  completedMinutes?: number;
  googleEventId?: string;
  syncedFromGoogle: boolean;
  createdAt: Date;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  days: number[]; // [1,2,3,4,5,6,0] Mon-Sun
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
  autoSchedule: boolean;
  color: string;
  createdAt: Date;
}

export interface Week {
  id: string; // '2026-W04'
  userId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  goals: string[];
  notes?: string;
  plannedMinutes: number;
  completedMinutes: number;
  createdAt: Date;
}

// Weekly Task - 주간 목표 태스크
export interface WeeklyTask {
  id: string;
  userId: string;
  weekId: string; // '2026-W04'
  title: string;
  description?: string;
  color: string;
  order: number;
  isCompleted: boolean;
  createdAt: Date;
}

// View type for calendar
export type CalendarViewType = 'week' | 'day';

export interface ScheduleHistory {
  id: string;
  scheduleId: string;
  changedField: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: Date;
}

// UI-specific types
export interface DayData {
  date: string;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  schedules: Schedule[];
  isToday: boolean;
  isWeekend: boolean;
}

export interface TimeSlotData {
  time: string; // HH:mm
  schedules: Schedule[];
}

// Form types
export interface TaskFormData {
  title: string;
  description?: string;
  estimatedMinutes: number;
  isRecurring: boolean;
  recurringType?: RecurringType;
  recurringDays?: number[];
  category?: string;
  color: string;
  weekId?: string;
}

export interface ScheduleFormData {
  taskId?: string; // nullable: 태스크 없이 일정만 등록 가능
  title?: string; // 태스크 없이 일정 등록시 사용
  description?: string;
  color?: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface RoutineFormData {
  title: string;
  description?: string;
  days: number[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  autoSchedule: boolean;
  color: string;
}

// Drag and drop types
export interface DragItem {
  type: 'task' | 'schedule';
  id: string;
  data: Task | Schedule;
}

export interface DropTarget {
  type: 'day' | 'timeslot' | 'backlog';
  date?: string;
  time?: string;
}
