-- Username/password game accounts with no email requirement.

create extension if not exists pgcrypto;

drop trigger if exists create_profile_on_auth_user on auth.users;
drop function if exists public.create_profile_for_new_user();
drop table if exists public.game_saves cascade;
drop table if exists public.leaderboard_entries cascade;
drop table if exists public.profiles cascade;

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.game_saves (
  player_id uuid primary key references public.game_players (id) on delete cascade,
  year integer not null,
  edition text not null check (edition in ('worldCup', 'global')),
  countries text[] not null default '{}',
  selected_ids text[] not null default '{}',
  score integer not null default 0,
  club_name text not null,
  updated_at timestamptz not null default now()
);

create table public.leaderboard_entries (
  player_id uuid primary key references public.game_players (id) on delete cascade,
  username text not null,
  club_name text not null,
  score integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.game_players enable row level security;
alter table public.game_saves enable row level security;
alter table public.leaderboard_entries enable row level security;

create policy "read leaderboard"
  on public.leaderboard_entries for select
  using (true);

create or replace function public.clean_game_username(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(value), '[^a-zA-Z0-9_]', '', 'g'));
$$;

create or replace function public.register_game_player(p_username text, p_password text)
returns table (
  player_id uuid,
  username text,
  year integer,
  edition text,
  countries text[],
  selected_ids text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_username text;
  new_player_id uuid;
begin
  clean_username := public.clean_game_username(p_username);

  if length(clean_username) < 3 then
    raise exception 'Username needs at least 3 letters, numbers, or underscores.';
  end if;

  if length(p_password) < 6 then
    raise exception 'Password needs at least 6 characters.';
  end if;

  insert into public.game_players (username, username_normalized, password_hash)
  values (clean_username, clean_username, crypt(p_password, gen_salt('bf')))
  returning id into new_player_id;

  return query
    select new_player_id, clean_username, null::integer, null::text, null::text[], null::text[];
exception
  when unique_violation then
    raise exception 'That username is already taken.';
end;
$$;

create or replace function public.login_game_player(p_username text, p_password text)
returns table (
  player_id uuid,
  username text,
  year integer,
  edition text,
  countries text[],
  selected_ids text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_username text;
begin
  clean_username := public.clean_game_username(p_username);

  return query
    select
      gp.id,
      gp.username,
      gs.year,
      gs.edition,
      gs.countries,
      gs.selected_ids
    from public.game_players gp
    left join public.game_saves gs on gs.player_id = gp.id
    where gp.username_normalized = clean_username
      and gp.password_hash = crypt(p_password, gp.password_hash);

  if not found then
    raise exception 'Wrong username or password.';
  end if;
end;
$$;

create or replace function public.save_game_progress(
  p_player_id uuid,
  p_password text,
  p_year integer,
  p_edition text,
  p_countries text[],
  p_selected_ids text[],
  p_score integer,
  p_club_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_record public.game_players%rowtype;
begin
  select *
  into player_record
  from public.game_players
  where id = p_player_id;

  if player_record.id is null
    or player_record.password_hash <> crypt(p_password, player_record.password_hash) then
    raise exception 'Wrong username or password.';
  end if;

  insert into public.game_saves (
    player_id,
    year,
    edition,
    countries,
    selected_ids,
    score,
    club_name,
    updated_at
  )
  values (
    p_player_id,
    p_year,
    p_edition,
    p_countries,
    p_selected_ids,
    p_score,
    p_club_name,
    now()
  )
  on conflict (player_id) do update set
    year = excluded.year,
    edition = excluded.edition,
    countries = excluded.countries,
    selected_ids = excluded.selected_ids,
    score = excluded.score,
    club_name = excluded.club_name,
    updated_at = excluded.updated_at;

  insert into public.leaderboard_entries (
    player_id,
    username,
    club_name,
    score,
    updated_at
  )
  values (
    p_player_id,
    player_record.username,
    p_club_name,
    p_score,
    now()
  )
  on conflict (player_id) do update set
    username = excluded.username,
    club_name = excluded.club_name,
    score = excluded.score,
    updated_at = excluded.updated_at;
end;
$$;
