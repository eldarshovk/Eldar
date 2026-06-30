-- Supabase installs pgcrypto in the extensions schema on hosted projects.

alter function public.register_game_player(text, text)
  set search_path = public, extensions;

alter function public.login_game_player(text, text)
  set search_path = public, extensions;

alter function public.save_game_progress(uuid, text, integer, text, text[], text[], integer, text)
  set search_path = public, extensions;

notify pgrst, 'reload schema';
