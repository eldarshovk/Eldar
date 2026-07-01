-- Store the game edition on leaderboard rows for filtering.

alter table public.leaderboard_entries
  add column if not exists edition text check (edition in ('worldCup', 'global'));

create index if not exists leaderboard_entries_edition_score_idx
  on public.leaderboard_entries (edition, score desc, updated_at asc);

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
set search_path = public, extensions
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
    edition,
    score,
    updated_at
  )
  values (
    p_player_id,
    player_record.username,
    p_club_name,
    p_edition,
    p_score,
    now()
  )
  on conflict (player_id) do update set
    username = excluded.username,
    club_name = excluded.club_name,
    edition = excluded.edition,
    score = excluded.score,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.save_google_game_progress(
  p_player_id uuid,
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
set search_path = public, extensions
as $$
declare
  player_record public.game_players%rowtype;
begin
  select *
  into player_record
  from public.game_players
  where id = p_player_id
    and auth_user_id = auth.uid();

  if player_record.id is null then
    raise exception 'Google sign-in required.';
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
    edition,
    score,
    updated_at
  )
  values (
    p_player_id,
    player_record.username,
    p_club_name,
    p_edition,
    p_score,
    now()
  )
  on conflict (player_id) do update set
    username = excluded.username,
    club_name = excluded.club_name,
    edition = excluded.edition,
    score = excluded.score,
    updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.save_game_progress(uuid, text, integer, text, text[], text[], integer, text) to anon, authenticated;
grant execute on function public.save_google_game_progress(uuid, integer, text, text[], text[], integer, text) to authenticated;

notify pgrst, 'reload schema';
