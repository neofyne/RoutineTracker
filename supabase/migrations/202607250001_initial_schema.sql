create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  color text not null default '#0d6e5d',
  sort_order numeric not null default 0,
  started_on date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  completed_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, completed_on)
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null default current_date,
  title text not null check (char_length(trim(title)) between 1 and 240),
  notes text,
  due_time time,
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high')),
  sort_order numeric not null default 0,
  completed_at timestamptz,
  archived_at timestamptz,
  carried_from_id uuid references public.daily_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user_active_order on public.routines (user_id, archived_at, sort_order);
create index if not exists completions_routine_date on public.routine_completions (routine_id, completed_on);
create index if not exists daily_tasks_user_date_order on public.daily_tasks (user_id, task_date, completed_at, sort_order);

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.routine_completions enable row level security;
alter table public.daily_tasks enable row level security;

create policy "Users manage their profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage their routines" on public.routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their completions" on public.routine_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their daily tasks" on public.daily_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, timezone) values (new.id, coalesce(new.raw_user_meta_data->>'timezone', 'UTC'));
  return new;
end;
$$;

create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
