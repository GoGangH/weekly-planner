-- Weekly Planner Database Schema
-- Run this in your Supabase SQL Editor
-- 이 파일을 Supabase SQL Editor에 복사하여 실행하세요

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- Profiles table (extends Supabase auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  google_calendar_token jsonb,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Tasks table
-- ============================================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  estimated_minutes int default 30,
  actual_minutes int,
  is_recurring boolean default false,
  recurring_type text check (recurring_type in ('daily', 'weekly', 'custom')),
  recurring_days int[],
  status text default 'backlog' check (status in ('backlog', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  category text,
  color text default '#8B7CF6',
  week_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Tasks policies
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can create own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ============================================
-- Schedules table (일정 - 태스크 연결 또는 독립 일정)
-- ============================================
create table if not exists public.schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade, -- nullable: 태스크 없이 일정만 등록 가능
  title text, -- 태스크 없이 일정 등록시 사용
  description text,
  color text default '#8B7CF6',
  date date not null,
  start_time time not null,
  end_time time not null,
  original_date date,
  original_start_time time,
  original_end_time time,
  modified_at timestamptz,
  modified_reason text,
  status text default 'planned' check (status in ('planned', 'completed', 'partial', 'skipped', 'rescheduled')),
  completed_minutes int,
  google_event_id text unique, -- Google 이벤트 ID (중복 방지)
  synced_from_google boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.schedules enable row level security;

-- Schedules policies
create policy "Users can view own schedules"
  on public.schedules for select
  using (auth.uid() = user_id);

create policy "Users can create own schedules"
  on public.schedules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own schedules"
  on public.schedules for update
  using (auth.uid() = user_id);

create policy "Users can delete own schedules"
  on public.schedules for delete
  using (auth.uid() = user_id);

-- ============================================
-- Routines table (반복 루틴)
-- ============================================
create table if not exists public.routines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  days int[] not null,
  start_time time not null,
  end_time time not null,
  is_active boolean default true,
  auto_schedule boolean default true,
  color text default '#34D399',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.routines enable row level security;

-- Routines policies
create policy "Users can view own routines"
  on public.routines for select
  using (auth.uid() = user_id);

create policy "Users can create own routines"
  on public.routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routines"
  on public.routines for update
  using (auth.uid() = user_id);

create policy "Users can delete own routines"
  on public.routines for delete
  using (auth.uid() = user_id);

-- ============================================
-- Weeks table (주간 목표 및 메모)
-- ============================================
create table if not exists public.weeks (
  id text primary key, -- Format: '2026-W04'
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  goals text[],
  notes text,
  planned_minutes int default 0,
  completed_minutes int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.weeks enable row level security;

-- Weeks policies
create policy "Users can view own weeks"
  on public.weeks for select
  using (auth.uid() = user_id);

create policy "Users can create own weeks"
  on public.weeks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weeks"
  on public.weeks for update
  using (auth.uid() = user_id);

-- ============================================
-- Schedule history table (일정 변경 이력)
-- ============================================
create table if not exists public.schedule_history (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid references public.schedules(id) on delete cascade,
  changed_field text not null,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.schedule_history enable row level security;

-- Schedule history policies (users can view history of their own schedules)
create policy "Users can view own schedule history"
  on public.schedule_history for select
  using (
    exists (
      select 1 from public.schedules s
      where s.id = schedule_history.schedule_id
      and s.user_id = auth.uid()
    )
  );

-- ============================================
-- Indexes for better performance
-- ============================================
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists schedules_user_id_idx on public.schedules(user_id);
create index if not exists schedules_date_idx on public.schedules(date);
create index if not exists schedules_task_id_idx on public.schedules(task_id);
create index if not exists routines_user_id_idx on public.routines(user_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to tasks
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- Apply updated_at trigger to profiles
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
