import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  getWeek,
  getYear,
  parseISO,
  isToday as dateFnsIsToday,
  isWeekend as dateFnsIsWeekend,
  differenceInMinutes,
  addMinutes,
  setHours,
  setMinutes,
} from 'date-fns'
import { ko } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export function getWeekId(date: Date): string {
  const week = getWeek(date, { weekStartsOn: 1 });
  const year = getYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ko });
}

export function formatDateKo(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'M월 d일 (EEE)', { locale: ko });
}

export function formatWeekRange(date: Date): string {
  const { start, end } = getWeekRange(date);
  return `${format(start, 'M월 d일', { locale: ko })} - ${format(end, 'M월 d일', { locale: ko })}`;
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsToday(d);
}

export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsIsWeekend(d);
}

// Time utilities
// 시간 문자열을 HH:MM 형식으로 정규화 (초 제거)
export function normalizeTime(timeStr: string): string {
  if (!timeStr) return '00:00';
  const parts = timeStr.split(':');
  const hours = String(parts[0] || '0').padStart(2, '0');
  const minutes = String(parts[1] || '0').padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const normalized = normalizeTime(timeStr);
  const [hours, minutes] = normalized.split(':').map(Number);
  return { hours, minutes };
}

export function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return formatTime(hours, minutes);
}

export function getTimeDifferenceInMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const totalMinutes = timeToMinutes(timeStr) + minutes;
  return minutesToTime(totalMinutes);
}

export function getDateTimeFromDateAndTime(dateStr: string, timeStr: string): Date {
  const date = parseISO(dateStr);
  const { hours, minutes } = parseTime(timeStr);
  return setMinutes(setHours(date, hours), minutes);
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Color utilities
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Duration formatting
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${mins}분`;
}
