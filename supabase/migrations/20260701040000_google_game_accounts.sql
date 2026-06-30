-- Map Supabase Google OAuth users to game player accounts.

alter table public.game_players
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete cascade;

create or replace function public.unique_google_username(base_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_base text;
  candidate text;
  suffix integer := 0;
begin
  clean_base := public.clean_game_username(base_username);
  if length(clean_base) < 3 then
    clean_base := 'google_player';
  end if;

  candidate := clean_base;
  while exists (
    select 1
    from public.game_players
    where username_normalized = candidate
  ) loop
    suffix := suffix + 1;
    candidate := clean_base || '_' || suffix::text;
  end loop;

  return candidate;
end;
$$;

create or replace function public.login_google_game_player()
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
set search_path = public, extensions
as $$
declare
  current_user_id uuid;
  base_username text;
  next_username text;
  next_player_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Google sign-in required.';
  end if;

  select id
  into next_player_id
  from public.game_players
  where auth_user_id = current_user_id;

  if next_player_id is null then
    base_username := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(coalesce(auth.jwt() ->> 'email', 'google_player'), '@', 1)
    );
    next_username := public.unique_google_username(base_username);

    insert into public.game_players (
      auth_user_id,
      username,
      username_normalized,
      password_hash
    )
    values (
      current_user_id,
      next_username,
      next_username,
      crypt(gen_random_uuid()::text, gen_salt('bf'))
    )
    returning id into next_player_id;
  end if;

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
    where gp.id = next_player_id;
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

grant execute on function public.login_google_game_player() to authenticated;
grant execute on function public.save_google_game_progress(uuid, integer, text, text[], text[], integer, text) to authenticated;

notify pgrst, 'reload schema';
