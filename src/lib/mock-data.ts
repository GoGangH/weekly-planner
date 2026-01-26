// Mock data for development
import { Task, Schedule, Routine, Week } from '@/types';
import { format, addDays, startOfWeek } from 'date-fns';
import { generateId, getWeekId } from './utils';

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });
const currentWeekId = getWeekId(today);

// Helper to create dates
const getDateStr = (daysFromWeekStart: number) =>
  format(addDays(weekStart, daysFromWeekStart), 'yyyy-MM-dd');

export const mockTasks: Task[] = [
  {
    id: generateId(),
    userId: 'user-1',
    title: '프로젝트 기획서 작성',
    description: '새 프로젝트의 기획서 초안을 작성합니다.',
    estimatedMinutes: 120,
    isRecurring: false,
    status: 'scheduled',
    category: 'work',
    color: '#3b82f6',
    weekId: currentWeekId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '팀 미팅',
    description: '주간 팀 미팅',
    estimatedMinutes: 60,
    isRecurring: true,
    recurringType: 'weekly',
    recurringDays: [1], // Monday
    status: 'scheduled',
    category: 'meeting',
    color: '#8b5cf6',
    weekId: currentWeekId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '코드 리뷰',
    description: 'PR 코드 리뷰',
    estimatedMinutes: 45,
    isRecurring: false,
    status: 'backlog',
    category: 'work',
    color: '#10b981',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '운동',
    description: '헬스장에서 운동하기',
    estimatedMinutes: 60,
    isRecurring: true,
    recurringType: 'weekly',
    recurringDays: [1, 3, 5], // Mon, Wed, Fri
    status: 'scheduled',
    category: 'health',
    color: '#ef4444',
    weekId: currentWeekId,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '영어 공부',
    description: '영어 회화 학습',
    estimatedMinutes: 30,
    isRecurring: true,
    recurringType: 'daily',
    status: 'backlog',
    category: 'study',
    color: '#f59e0b',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: 'API 문서 작성',
    description: 'REST API 문서 업데이트',
    estimatedMinutes: 90,
    isRecurring: false,
    status: 'backlog',
    category: 'work',
    color: '#06b6d4',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '디자인 리뷰',
    description: 'UI/UX 디자인 검토',
    estimatedMinutes: 45,
    isRecurring: false,
    status: 'backlog',
    category: 'work',
    color: '#ec4899',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockSchedules: Schedule[] = [
  {
    id: generateId(),
    userId: 'user-1',
    taskId: mockTasks[0].id,
    task: mockTasks[0],
    date: getDateStr(0), // Monday
    startTime: '10:00',
    endTime: '12:00',
    status: 'planned',
    syncedFromGoogle: false,
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    taskId: mockTasks[1].id,
    task: mockTasks[1],
    date: getDateStr(0), // Monday
    startTime: '14:00',
    endTime: '15:00',
    status: 'planned',
    syncedFromGoogle: false,
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    taskId: mockTasks[3].id,
    task: mockTasks[3],
    date: getDateStr(0), // Monday
    startTime: '07:00',
    endTime: '08:00',
    status: 'completed',
    completedMinutes: 60,
    syncedFromGoogle: false,
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    taskId: mockTasks[3].id,
    task: mockTasks[3],
    date: getDateStr(2), // Wednesday
    startTime: '07:00',
    endTime: '08:00',
    status: 'planned',
    syncedFromGoogle: false,
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    taskId: mockTasks[3].id,
    task: mockTasks[3],
    date: getDateStr(4), // Friday
    startTime: '07:00',
    endTime: '08:00',
    status: 'planned',
    syncedFromGoogle: false,
    createdAt: new Date(),
  },
];

export const mockRoutines: Routine[] = [
  {
    id: generateId(),
    userId: 'user-1',
    title: '아침 루틴',
    description: '아침 기상 후 루틴 (스트레칭, 샤워, 아침식사)',
    days: [1, 2, 3, 4, 5], // Weekdays
    startTime: '06:00',
    endTime: '07:00',
    isActive: true,
    autoSchedule: true,
    color: '#84cc16',
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '점심시간',
    description: '점심 식사 및 휴식',
    days: [1, 2, 3, 4, 5],
    startTime: '12:00',
    endTime: '13:00',
    isActive: true,
    autoSchedule: true,
    color: '#f59e0b',
    createdAt: new Date(),
  },
  {
    id: generateId(),
    userId: 'user-1',
    title: '저녁 독서',
    description: '하루를 마무리하며 독서',
    days: [0, 1, 2, 3, 4, 5, 6], // Everyday
    startTime: '21:00',
    endTime: '22:00',
    isActive: true,
    autoSchedule: false,
    color: '#8b5cf6',
    createdAt: new Date(),
  },
];

export const mockWeeks: Week[] = [
  {
    id: currentWeekId,
    userId: 'user-1',
    startDate: format(weekStart, 'yyyy-MM-dd'),
    endDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
    goals: ['프로젝트 기획서 완성', '운동 3회', '영어 공부 매일'],
    notes: '',
    plannedMinutes: 480,
    completedMinutes: 60,
    createdAt: new Date(),
  },
];
