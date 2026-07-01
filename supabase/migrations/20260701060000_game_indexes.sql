-- Indexes for common game lookups and leaderboard sorting.

create index if not exists game_players_username_normalized_idx
  on public.game_players (username_normalized);

create index if not exists game_players_auth_user_id_idx
  on public.game_players (auth_user_id);

create index if not exists leaderboard_entries_score_updated_idx
  on public.leaderboard_entries (score desc, updated_at asc);

create index if not exists game_saves_updated_at_idx
  on public.game_saves (updated_at desc);
