import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Category {
  id: string;
  value: string;
  label: string;
  icon: string;
  color: string;
}

export interface ColorItem {
  id: string;
  value: string;
  label: string;
}

interface SettingsState {
  categories: Category[];
  colors: ColorItem[];

  // Google Calendar settings
  enabledCalendars: string[]; // 활성화된 캘린더 ID 목록 (빈 배열 = 모든 캘린더)

  // Category actions
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Color actions
  addColor: (color: Omit<ColorItem, 'id'>) => void;
  updateColor: (id: string, data: Partial<ColorItem>) => void;
  deleteColor: (id: string) => void;

  // Google Calendar actions
  toggleCalendar: (calendarId: string) => void;
  setEnabledCalendars: (calendarIds: string[]) => void;
  isCalendarEnabled: (calendarId: string) => boolean;

  // Reset to defaults
  resetToDefaults: () => void;
}

// 기본 카테고리
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', value: 'work', label: '업무', icon: '💼', color: '#60A5FA' },
  { id: '2', value: 'personal', label: '개인', icon: '🏠', color: '#34D399' },
  { id: '3', value: 'study', label: '학습', icon: '📚', color: '#8B7CF6' },
  { id: '4', value: 'health', label: '건강', icon: '💪', color: '#FB923C' },
  { id: '5', value: 'meeting', label: '미팅', icon: '👥', color: '#F472B6' },
  { id: '6', value: 'other', label: '기타', icon: '📌', color: '#A78BFA' },
];

// 기본 색상 팔레트
const DEFAULT_COLORS: ColorItem[] = [
  { id: '1', value: '#8B7CF6', label: '퍼플' },
  { id: '2', value: '#60A5FA', label: '블루' },
  { id: '3', value: '#34D399', label: '그린' },
  { id: '4', value: '#FBBF24', label: '옐로우' },
  { id: '5', value: '#F472B6', label: '핑크' },
  { id: '6', value: '#22D3EE', label: '시안' },
  { id: '7', value: '#FB923C', label: '오렌지' },
  { id: '8', value: '#A78BFA', label: '라벤더' },
];

// ID 생성 함수
const generateId = () => Math.random().toString(36).substr(2, 9);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      colors: DEFAULT_COLORS,
      enabledCalendars: [], // 빈 배열 = 모든 캘린더 표시

      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: generateId(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
      },

      updateCategory: (id, data) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...data } : cat
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        }));
      },

      addColor: (color) => {
        const newColor: ColorItem = {
          ...color,
          id: generateId(),
        };
        set((state) => ({
          colors: [...state.colors, newColor],
        }));
      },

      updateColor: (id, data) => {
        set((state) => ({
          colors: state.colors.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      deleteColor: (id) => {
        set((state) => ({
          colors: state.colors.filter((c) => c.id !== id),
        }));
      },

      toggleCalendar: (calendarId) => {
        set((state) => {
          const enabled = state.enabledCalendars;
          if (enabled.includes(calendarId)) {
            return { enabledCalendars: enabled.filter((id) => id !== calendarId) };
          } else {
            return { enabledCalendars: [...enabled, calendarId] };
          }
        });
      },

      setEnabledCalendars: (calendarIds) => {
        set({ enabledCalendars: calendarIds });
      },

      isCalendarEnabled: (calendarId) => {
        const { enabledCalendars } = get();
        // 빈 배열이면 모든 캘린더 표시
        if (enabledCalendars.length === 0) return true;
        return enabledCalendars.includes(calendarId);
      },

      resetToDefaults: () => {
        set({
          categories: DEFAULT_CATEGORIES,
          colors: DEFAULT_COLORS,
          enabledCalendars: [],
        });
      },
    }),
    {
      name: 'weekly-planner-settings',
    }
  )
);
