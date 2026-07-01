# World Cup Squad Lab

Build a five-nation 28-player football squad, stay inside the coin budget, save your club, and climb the leaderboard.

## Features

- Username/password accounts plus Google sign-in.
- Unique usernames for game accounts.
- Save progress with club name, score, selected countries, and selected players.
- Public Best Clubs leaderboard.
- Sigma-only admin overview that shows player/game status without exposing passwords.
- Real player data loaded from Wikipedia and current-club data loaded from Wikidata.
- Music modes, local sound assets, and optional screamers.
- Daily GitHub Action ping to keep Supabase awake.
- Build GitHub Action for pull requests and pushes.

## Local Setup

```bash
npm install
npm run dev
```

Create `.env` or `.env.local` with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For database migrations:

```bash
npx supabase login
npx supabase link --project-ref your_project_ref
npm run db:push
```

## Scripts

```bash
npm run dev       # local dev server
npm run build     # TypeScript + Vite production build
npm run preview   # preview production build
npm run db:push   # apply Supabase migrations
```

## Important Files

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Main game UI and game logic |
| `src/index.css` | App styling |
| `src/lib/supabase.ts` | Supabase client |
| `supabase/migrations/` | Database schema, RPCs, and indexes |
| `public/sounds/` | Music and sound files |
| `public/images/` | Local image assets |
| `.github/workflows/` | Build and Supabase keep-awake workflows |

## Notes

Passwords are never displayed. Password accounts are checked through Supabase RPCs using hashed passwords. Google players are mapped to game accounts through their Supabase Auth user id.

If the app says an RPC cannot be found, run `npm run db:push` and wait a few seconds for Supabase PostgREST to reload its schema cache.
