// Application constants

export const DAYS_OF_WEEK = [
  { value: 0, label: '일', labelFull: '일요일', labelEn: 'Sun' },
  { value: 1, label: '월', labelFull: '월요일', labelEn: 'Mon' },
  { value: 2, label: '화', labelFull: '화요일', labelEn: 'Tue' },
  { value: 3, label: '수', labelFull: '수요일', labelEn: 'Wed' },
  { value: 4, label: '목', labelFull: '목요일', labelEn: 'Thu' },
  { value: 5, label: '금', labelFull: '금요일', labelEn: 'Fri' },
  { value: 6, label: '토', labelFull: '토요일', labelEn: 'Sat' },
] as const;

export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});

export const WORK_HOURS = {
  start: 9,
  end: 18,
};

// Soft pastel colors - Todo Mate / Structured style
export const DEFAULT_COLORS = [
  { value: '#8B7CF6', label: '퍼플', bg: 'rgba(139, 124, 246, 0.15)' },
  { value: '#60A5FA', label: '블루', bg: 'rgba(96, 165, 250, 0.15)' },
  { value: '#34D399', label: '그린', bg: 'rgba(52, 211, 153, 0.15)' },
  { value: '#FBBF24', label: '옐로우', bg: 'rgba(251, 191, 36, 0.15)' },
  { value: '#F472B6', label: '핑크', bg: 'rgba(244, 114, 182, 0.15)' },
  { value: '#22D3EE', label: '시안', bg: 'rgba(34, 211, 238, 0.15)' },
  { value: '#FB923C', label: '오렌지', bg: 'rgba(251, 146, 60, 0.15)' },
  { value: '#A78BFA', label: '라벤더', bg: 'rgba(167, 139, 250, 0.15)' },
] as const;

export const TASK_CATEGORIES = [
  { value: 'work', label: '업무', icon: '💼', color: '#60A5FA' },
  { value: 'personal', label: '개인', icon: '🏠', color: '#34D399' },
  { value: 'study', label: '학습', icon: '📚', color: '#8B7CF6' },
  { value: 'health', label: '건강', icon: '💪', color: '#FB923C' },
  { value: 'meeting', label: '미팅', icon: '👥', color: '#F472B6' },
  { value: 'other', label: '기타', icon: '📌', color: '#A78BFA' },
] as const;

export const STATUS_LABELS = {
  backlog: '백로그',
  scheduled: '예정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
} as const;

export const SCHEDULE_STATUS_LABELS = {
  planned: '계획됨',
  completed: '완료',
  partial: '부분완료',
  skipped: '건너뜀',
  rescheduled: '일정변경',
} as const;

export const DEFAULT_ESTIMATED_MINUTES = 30;
export const MIN_SLOT_MINUTES = 15;
export const DEFAULT_SLOT_HEIGHT = 60; // pixels per 30 minutes (larger for mobile)
