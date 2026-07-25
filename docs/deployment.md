# Deployment

## Cloudflare Pages

- Framework preset: **Vite**
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables (Production and Preview):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

Never enter a Supabase database password or service-role key in Cloudflare Pages for this browser app. The public project URL and publishable key are the only runtime values needed by the client.

## Supabase authentication

After the Pages URL exists, add it to Supabase Authentication → URL Configuration → Redirect URLs. Keep `http://127.0.0.1:5173` for local development as well.
