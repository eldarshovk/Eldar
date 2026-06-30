-- Make the username-only account RPCs visible to PostgREST immediately.

grant execute on function public.register_game_player(text, text) to anon, authenticated;
grant execute on function public.login_game_player(text, text) to anon, authenticated;
grant execute on function public.save_game_progress(uuid, text, integer, text, text[], text[], integer, text) to anon, authenticated;

notify pgrst, 'reload schema';
