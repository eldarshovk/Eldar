-- Safe admin list for the Sigma account. Passwords are never returned.

create or replace function public.admin_list_game_players(
  p_admin_username text,
  p_admin_password text
)
returns table (
  username text,
  auth_provider text,
  club_name text,
  score integer,
  year integer,
  edition text,
  countries_count integer,
  selected_count integer,
  password_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_record public.game_players%rowtype;
begin
  select *
  into admin_record
  from public.game_players
  where username_normalized = 'sigma';

  if admin_record.id is null
    or public.clean_game_username(p_admin_username) <> 'sigma'
    or admin_record.password_hash <> crypt(p_admin_password, admin_record.password_hash) then
    raise exception 'Sigma admin login required.';
  end if;

  return query
    select
      gp.username,
      case when gp.auth_user_id is null then 'password' else 'google' end,
      le.club_name,
      le.score,
      gs.year,
      gs.edition,
      coalesce(array_length(gs.countries, 1), 0),
      coalesce(array_length(gs.selected_ids, 1), 0),
      'protected'::text,
      gp.created_at,
      coalesce(gs.updated_at, le.updated_at)
    from public.game_players gp
    left join public.game_saves gs on gs.player_id = gp.id
    left join public.leaderboard_entries le on le.player_id = gp.id
    order by gp.created_at desc;
end;
$$;

grant execute on function public.admin_list_game_players(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
