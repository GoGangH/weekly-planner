'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ChevronRight,
  Calendar,
  Database,
  Bell,
  Moon,
  Info,
  Check,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSettingsStore, Category } from '@/stores/settingsStore';

// 색상 선택용 팔레트
const QUICK_COLORS = [
  '#8B7CF6', '#60A5FA', '#34D399', '#FBBF24', '#F472B6',
];

const FULL_COLOR_PALETTE = [
  '#8B7CF6', '#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#22D3EE', '#FB923C', '#A78BFA',
  '#EF4444', '#10B981', '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4',
  '#DC2626', '#059669', '#4F46E5', '#DB2777', '#0D9488', '#D97706', '#7C3AED', '#0891B2',
  '#B91C1C', '#047857', '#4338CA', '#BE185D', '#0F766E', '#B45309', '#6D28D9', '#0E7490',
];

interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  primary?: boolean;
}

export default function SettingsPage() {
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Google Calendar list
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Category Sheet
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');
  const [newCategoryColor, setNewCategoryColor] = useState('#8B7CF6');
  const [showFullPalette, setShowFullPalette] = useState(false);
  const [customColorInput, setCustomColorInput] = useState('');

  // Settings Store
  const {
    categories,
    enabledCalendars,
    addCategory,
    deleteCategory,
    toggleCalendar,
    setEnabledCalendars,
    resetToDefaults,
  } = useSettingsStore();

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  useEffect(() => {
    if (isGoogleConnected) {
      fetchGoogleCalendars();
    }
  }, [isGoogleConnected]);

  const checkGoogleConnection = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsGoogleConnected(!!session?.provider_token);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      const response = await fetch('/api/calendar/list');
      const data = await response.json();
      if (data.calendars) {
        setGoogleCalendars(data.calendars);
        // 처음 로드 시 모든 캘린더 활성화 (enabledCalendars가 비어있으면)
        if (enabledCalendars.length === 0 && data.calendars.length > 0) {
          setEnabledCalendars(data.calendars.map((c: GoogleCalendarInfo) => c.id));
        }
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error connecting Google:', error);
      setIsConnecting(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsGoogleConnected(false);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error disconnecting Google:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryLabel.trim()) return;

    const value = newCategoryLabel.toLowerCase().replace(/\s+/g, '_');
    addCategory({
      value,
      label: newCategoryLabel,
      icon: newCategoryIcon,
      color: newCategoryColor,
    });

    // Reset form
    setNewCategoryLabel('');
    setNewCategoryIcon('📌');
    setNewCategoryColor('#8B7CF6');
    setShowFullPalette(false);
    setCustomColorInput('');
    setIsCategorySheetOpen(false);
  };

  const isCalendarEnabled = (calendarId: string) => {
    if (enabledCalendars.length === 0) return true;
    return enabledCalendars.includes(calendarId);
  };

  const handleToggleCalendar = (calendarId: string) => {
    // 모든 캘린더가 비활성화되는 것 방지
    const currentlyEnabled = enabledCalendars.length === 0
      ? googleCalendars.map(c => c.id)
      : enabledCalendars;

    if (currentlyEnabled.includes(calendarId)) {
      // 마지막 하나는 끌 수 없음
      if (currentlyEnabled.length <= 1) return;
      setEnabledCalendars(currentlyEnabled.filter(id => id !== calendarId));
    } else {
      setEnabledCalendars([...currentlyEnabled, calendarId]);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">설정</h1>
      </header>

      {/* Settings List */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-6">
          {/* 연동 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">연동</h2>
            <div className="rounded-2xl bg-card overflow-hidden">
              {/* Google Calendar */}
              <button
                onClick={isGoogleConnected ? handleGoogleDisconnect : handleGoogleConnect}
                disabled={isLoading || isConnecting}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className={cn('rounded-xl bg-muted/80 p-2.5', isGoogleConnected ? 'text-green-500' : 'text-blue-500')}>
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isGoogleConnected ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Google 캘린더</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? '확인 중...' : isGoogleConnected ? '연결됨' : '연결되지 않음'}
                  </p>
                </div>
                {isGoogleConnected ? (
                  <span className="text-sm text-destructive font-medium">연결 해제</span>
                ) : (
                  <span className="text-sm text-primary font-medium">연결하기</span>
                )}
              </button>

              {/* Data Sync */}
              <button
                disabled
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors border-t border-border/50 opacity-60"
              >
                <div className="rounded-xl bg-muted/80 p-2.5 text-green-500">
                  <Database className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">데이터 동기화</p>
                  <p className="text-sm text-muted-foreground">Supabase 연결됨</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Google 캘린더 설정 */}
          {isGoogleConnected && (
            <section>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-sm font-medium text-muted-foreground">Google 캘린더</h2>
                <button
                  onClick={fetchGoogleCalendars}
                  disabled={isLoadingCalendars}
                  className="text-sm text-primary font-medium flex items-center gap-1"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingCalendars && "animate-spin")} />
                  새로고침
                </button>
              </div>
              <div className="rounded-2xl bg-card overflow-hidden">
                {isLoadingCalendars ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    캘린더 목록 불러오는 중...
                  </div>
                ) : googleCalendars.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    캘린더를 찾을 수 없습니다
                  </div>
                ) : (
                  googleCalendars.map((cal, index) => (
                    <button
                      key={cal.id}
                      onClick={() => handleToggleCalendar(cal.id)}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        index > 0 && 'border-t border-border/50'
                      )}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: cal.backgroundColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {cal.summary}
                          {cal.primary && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              기본
                            </span>
                          )}
                        </p>
                        {cal.description && (
                          <p className="text-sm text-muted-foreground truncate">{cal.description}</p>
                        )}
                      </div>
                      <div className={cn(
                        'w-12 h-7 rounded-full p-1 transition-colors',
                        isCalendarEnabled(cal.id) ? 'bg-primary' : 'bg-muted'
                      )}>
                        <div className={cn(
                          'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                          isCalendarEnabled(cal.id) ? 'translate-x-5' : 'translate-x-0'
                        )} />
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 px-1">
                표시할 캘린더를 선택하세요. 선택한 캘린더의 일정만 앱에 표시됩니다.
              </p>
            </section>
          )}

          {/* 카테고리 설정 */}
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-medium text-muted-foreground">카테고리</h2>
              <button
                onClick={() => setIsCategorySheetOpen(true)}
                className="text-sm text-primary font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                추가
              </button>
            </div>
            <div className="rounded-2xl bg-card overflow-hidden">
              {categories.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  카테고리가 없습니다
                </div>
              ) : (
                categories.map((cat, index) => (
                  <div
                    key={cat.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3',
                      index > 0 && 'border-t border-border/50'
                    )}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{cat.label}</p>
                    </div>
                    <div
                      className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              카테고리를 선택하면 해당 색상이 자동으로 적용됩니다.
            </p>
          </section>

          {/* 알림 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">알림</h2>
            <div className="rounded-2xl bg-card overflow-hidden">
              <button
                disabled
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors opacity-60"
              >
                <div className="rounded-xl bg-muted/80 p-2.5 text-orange-500">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">알림 설정</p>
                  <p className="text-sm text-muted-foreground">준비 중</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* 테마 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">테마</h2>
            <div className="rounded-2xl bg-card overflow-hidden">
              <button
                disabled
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors opacity-60"
              >
                <div className="rounded-xl bg-muted/80 p-2.5 text-purple-500">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">다크 모드</p>
                  <p className="text-sm text-muted-foreground">시스템 설정</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* 데이터 관리 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">데이터</h2>
            <div className="rounded-2xl bg-card overflow-hidden">
              <button
                onClick={() => {
                  if (confirm('카테고리 설정을 기본값으로 초기화하시겠습니까?')) {
                    resetToDefaults();
                  }
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="rounded-xl bg-muted/80 p-2.5 text-red-500">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">설정 초기화</p>
                  <p className="text-sm text-muted-foreground">카테고리를 기본값으로</p>
                </div>
              </button>
            </div>
          </section>

          {/* 정보 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">정보</h2>
            <div className="rounded-2xl bg-card overflow-hidden">
              <button className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
                <div className="rounded-xl bg-muted/80 p-2.5 text-gray-500">
                  <Info className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">앱 정보</p>
                  <p className="text-sm text-muted-foreground">v0.1.0</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* 로그아웃 */}
          <section>
            <div className="rounded-2xl bg-card overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-destructive font-medium transition-colors hover:bg-destructive/10"
              >
                로그아웃
              </button>
            </div>
          </section>

          {/* App info */}
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p className="font-medium">Weekly Planner</p>
            <p className="mt-1">Made with Next.js & shadcn/ui</p>
          </div>
        </div>
      </ScrollArea>

      {/* 카테고리 추가 Sheet */}
      <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col p-0" showCloseButton={false}>
          {/* 고정 헤더 */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
            <SheetTitle className="text-lg font-semibold">새 카테고리 추가</SheetTitle>
            <button
              onClick={() => setIsCategorySheetOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* 스크롤 가능한 컨텐츠 영역 */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
            {/* 카테고리 이름 */}
            <div className="space-y-2">
              <Label>카테고리 이름</Label>
              <Input
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                placeholder="예: 운동"
                className="rounded-xl"
              />
            </div>

            {/* 아이콘 입력 */}
            <div className="space-y-2">
              <Label>아이콘</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl bg-muted/50 border"
                >
                  {newCategoryIcon || '?'}
                </div>
                <Input
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder="이모지 입력"
                  className="rounded-xl flex-1 text-xl text-center"
                  maxLength={4}
                />
              </div>
            </div>

            {/* 색상 선택 */}
            <div className="space-y-3">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-3 items-center">
                {QUICK_COLORS.map((colorVal) => (
                  <button
                    key={colorVal}
                    type="button"
                    onClick={() => setNewCategoryColor(colorVal)}
                    className={cn(
                      'h-11 w-11 rounded-xl transition-all',
                      newCategoryColor === colorVal && 'ring-2 ring-offset-2 ring-primary scale-110'
                    )}
                    style={{ backgroundColor: colorVal }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowFullPalette(!showFullPalette)}
                  className={cn(
                    'h-11 w-11 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors',
                    showFullPalette && 'border-primary text-primary bg-primary/10'
                  )}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* 전체 색상 팔레트 */}
              {showFullPalette && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap gap-2">
                    {FULL_COLOR_PALETTE.map((colorVal) => (
                      <button
                        key={colorVal}
                        type="button"
                        onClick={() => {
                          setNewCategoryColor(colorVal);
                          setShowFullPalette(false);
                        }}
                        className={cn(
                          'h-9 w-9 rounded-lg transition-all',
                          newCategoryColor === colorVal && 'ring-2 ring-offset-1 ring-primary scale-110'
                        )}
                        style={{ backgroundColor: colorVal }}
                      />
                    ))}
                  </div>

                  {/* 직접 입력 */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-9 rounded-lg border shrink-0"
                      style={{ backgroundColor: customColorInput || newCategoryColor }}
                    />
                    <Input
                      value={customColorInput}
                      onChange={(e) => {
                        setCustomColorInput(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          setNewCategoryColor(e.target.value);
                        }
                      }}
                      placeholder="#FF5733"
                      className="flex-1 h-9 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(customColorInput)) {
                          setNewCategoryColor(customColorInput);
                          setShowFullPalette(false);
                        }
                      }}
                      disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColorInput)}
                    >
                      적용
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 미리보기 */}
            <div className="space-y-2">
              <Label>미리보기</Label>
              <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${newCategoryColor}20` }}
                >
                  {newCategoryIcon}
                </div>
                <div>
                  <p className="font-medium">{newCategoryLabel || '카테고리 이름'}</p>
                </div>
                <div
                  className="h-6 w-6 rounded-full ml-auto"
                  style={{ backgroundColor: newCategoryColor }}
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4 pb-4">
              <Button
                variant="outline"
                onClick={() => setIsCategorySheetOpen(false)}
                className="flex-1 rounded-xl"
              >
                취소
              </Button>
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryLabel.trim()}
                className="flex-1 rounded-xl"
              >
                추가하기
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
