-- AIトレーナーアプリ 初期スキーマ
-- Supabase ダッシュボードの SQL Editor で実行するか、supabase CLI でマイグレーションとして適用してください。
-- 前提: Authentication > Sign In / Up で「Anonymous Sign-ins」を有効にすること(フロントは匿名認証で接続します)

-- プロフィール & 目標
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  goal_type text not null default 'diet' check (goal_type in ('diet', 'bulk', 'maintain')),
  height_cm numeric,
  start_weight_kg numeric,
  target_weight_kg numeric,
  target_calories integer,
  updated_at timestamptz not null default now()
);

-- 体重記録
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user_date on public.weight_logs (user_id, date);

-- 食事記録
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories integer not null,
  protein_g numeric,
  created_at timestamptz not null default now()
);
create index if not exists meal_logs_user_date on public.meal_logs (user_id, date);

-- トレーニング記録
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  category text not null check (category in ('strength', 'cardio', 'stretch')),
  name text not null,
  detail text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists workout_logs_user_date on public.workout_logs (user_id, date);

-- RLS: 自分のデータだけ読み書きできる
alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.workout_logs enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own weight logs" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own meal logs" on public.meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own workout logs" on public.workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
