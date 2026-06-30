-- Player accounts and saved World Cup squad progress.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  year integer not null,
  edition text not null check (edition in ('worldCup', 'global')),
  countries text[] not null default '{}',
  selected_ids text[] not null default '{}',
  score integer not null default 0,
  club_name text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  club_name text not null,
  score integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.leaderboard_entries enable row level security;

create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "read own save"
  on public.game_saves for select
  using (auth.uid() = user_id);

create policy "insert own save"
  on public.game_saves for insert
  with check (auth.uid() = user_id);

create policy "update own save"
  on public.game_saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "read leaderboard"
  on public.leaderboard_entries for select
  using (true);

create policy "insert own leaderboard score"
  on public.leaderboard_entries for insert
  with check (auth.uid() = user_id);

create policy "update own leaderboard score"
  on public.leaderboard_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  clean_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  clean_username := lower(regexp_replace(requested_username, '[^a-zA-Z0-9_]', '', 'g'));

  insert into public.profiles (user_id, username, username_normalized)
  values (new.id, clean_username, clean_username)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_on_auth_user on auth.users;
create trigger create_profile_on_auth_user
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();
