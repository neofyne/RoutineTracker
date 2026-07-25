# Deployment

## Service directory (keep this current)

| Service | Current name / address | Purpose | Notes |
| --- | --- | --- | --- |
| Product | **DayPlan** | User-facing app name | Browser title and primary in-app branding use `DayPlan`. |
| Production web app | `https://dayplan.pages.dev/` | Primary public app | Cloudflare Pages project: `dayplan`. Connected to the `main` branch. |
| Source repository | `https://github.com/neofyne/RoutineTracker` | Source code and automated deployments | Planned rename: `neofyne/dayplan`; GitHub redirects preserve existing links after a repository rename. |
| Supabase project | `mmrpxjdwpvjqqasesltw` | Authentication and app data | Dashboard display name is currently `RoutineTracker`; planned display rename: `DayPlan`. |
| Supabase site URL | `https://dayplan.pages.dev` | Default passwordless-auth return URL | Keep `http://127.0.0.1:5173` as a local redirect URL. |

### Historical deployments — do not treat as the primary app

- `https://routinetracker.neerus-kitchen.workers.dev/` — initial Cloudflare Worker deployment. The `neerus-kitchen` portion is the account-wide Workers subdomain, not a connection to the Neeru’s Kitchen app.
- `https://routinetracker-6p3.pages.dev/` — initial Pages project. The suffix was added because the clean Pages name was not available.

These remain live only as fallbacks/history. Do not delete them unless explicitly approved.

## Cloudflare Pages

- Framework preset: **Vite**
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- This static app includes a safe fallback for the Supabase project URL and **publishable** key so the Cloudflare build works without manually configured environment variables. Environment variables may still be used to override these values.

Never enter a Supabase database password or service-role key in Cloudflare Pages for this browser app. The public project URL and publishable key are the only runtime values needed by the client.

## Supabase authentication

DayPlan uses **email and password** authentication. Supabase email confirmation is disabled so family members can create and use password accounts without consuming the free magic-link email quota.

Supabase Authentication → URL Configuration has its **Site URL** set to `https://dayplan.pages.dev`. Keep `http://127.0.0.1:5173` for local development as a redirect URL.

After every family member has created an account, consider turning off **Allow new users to sign up** in Supabase Authentication → Sign In / Providers. Existing family accounts will still sign in normally.
