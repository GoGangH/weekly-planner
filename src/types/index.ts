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

// 백로그 할 일 (일정에 배치되지 않은 할 일)
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

// 일정 내 할일 항목 (체크 가능)
export interface ScheduleItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

// 일정 (시간 블록 - 컨테이너)
export interface Schedule {
  id: string;
  userId: string;
  title: string; // 일정 제목 (예: "아침 루틴", "업무")
  description?: string;
  color: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  items: ScheduleItem[]; // 일정 내 할일들
  status: ScheduleStatus;
  completedMinutes?: number; // 완료된 시간 (분)
  routineId?: string; // 루틴에서 생성된 경우
  googleEventId?: string;
  syncedFromGoogle: boolean;
  createdAt: Date;
  // 일정 변경 관련
  originalDate?: string;
  originalStartTime?: string;
  originalEndTime?: string;
  modifiedAt?: Date;
  modifiedReason?: string;

  // Legacy fields (하위 호환)
  taskId?: string;
  task?: Task;
}

// 루틴 내 항목 (템플릿)
export interface RoutineItem {
  id: string;
  title: string;
  order: number;
}

// 루틴 (반복 일정 템플릿)
export interface Routine {
  id: string;
  userId: string;
  title: string; // 루틴 그룹명 (예: "아침 루틴")
  description?: string;
  days: number[]; // [1,2,3,4,5,6,0] Mon-Sun
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  items: RoutineItem[]; // 루틴 내 세부 항목들
  isActive: boolean;
  autoSchedule: boolean;
  color: string;
  category?: string;
  startDate?: string; // YYYY-MM-DD 루틴 시작일
  endDate?: string; // YYYY-MM-DD 루틴 종료일 (없으면 무기한)
  createdAt: Date;
}

// 루틴 완료 기록
export interface RoutineLog {
  id: string;
  routineId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  completedAt?: Date;
}

// 주간 목표의 세부 할 일
export interface GoalSubTask {
  id: string;
  title: string;
  targetCount: number; // 해야 할 횟수
  completedCount: number; // 완료된 횟수
  estimatedMinutes: number; // 1회당 예상 시간
  category?: string;
}

// 주간 목표
export interface WeeklyGoal {
  id: string;
  title: string;
  subTasks: GoalSubTask[];
  isCompleted: boolean;
}

export interface Week {
  id: string; // '2026-W04'
  userId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  goals: string[]; // 기존 단순 목표 (하위 호환)
  weeklyGoals?: WeeklyGoal[]; // 새로운 구조화된 목표
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
  title: string;
  description?: string;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  items?: ScheduleItem[]; // 일정 내 할일들
  routineId?: string; // 루틴에서 생성된 경우
}

export interface RoutineFormData {
  title: string;
  description?: string;
  days: number[];
  startTime: string;
  endTime: string;
  items: RoutineItem[]; // 루틴 내 세부 항목들
  isActive: boolean;
  autoSchedule: boolean;
  color: string;
  startDate?: string; // YYYY-MM-DD 루틴 시작일
  endDate?: string; // YYYY-MM-DD 루틴 종료일 (없으면 무기한)
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
