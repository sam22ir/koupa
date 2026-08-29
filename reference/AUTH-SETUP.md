# Authentication Setup

This document covers Supabase + Google OAuth work required before testing or releasing Koupa authentication.

**Never** place provider client secrets, SMTP credentials, or service-role keys in Expo environment variables or the repository.

Linked default project for CLI work: **Koupa Staging** `zhdwaizroczkqzwrvfxf`.

---

## What Supabase CLI can do (and cannot)

| Task | CLI? | Notes |
|---|---|---|
| Link project | Yes | `supabase link --project-ref zhdwaizroczkqzwrvfxf` |
| Query / migrate DB | Yes | `supabase db query --linked "…"` / `supabase db push` |
| Seed legal documents | Yes | SQL insert/update via `db query --linked` |
| List API keys | Yes | `supabase projects api-keys --project-ref …` (do not commit secrets) |
| Enable Google provider + client secret | **No** | Dashboard only (Auth → Providers → Google) |
| Set Site URL / redirect allow-list | **Dashboard** | Auth → URL Configuration |
| Create Google Cloud OAuth client | **No** | Google Cloud Console |

---

## 1. Staging status (CLI/migrations verified 2026-08-18)

The staging project is linked and its migration state is current through
`20260818000100` (notification destinations + phone unique index).
`sign-in-with-phone` is ACTIVE on staging and production.

```sh
supabase link --project-ref zhdwaizroczkqzwrvfxf
supabase db query --linked "select key, version, url, is_active from public.legal_documents order by key, version;"
```

Staging legal rows observed in the historical audit:

| key | version | url | active |
|---|---|---|---|
| terms | staging-2026-07-23 | https://example.com/terms | false |
| terms | 2026-07-29 | https://koupa-website.pages.dev/terms/ | true |
| privacy | staging-2026-07-23 | https://example.com/privacy | false |
| privacy | 2026-07-29 | https://koupa-website.pages.dev/privacy/ | true |

Legal documents and acceptances are append-only by version. Existing users must explicitly accept a newly active version; never rewrite or delete their historical acceptance rows.

Staging has demo users/profiles. App env files point at staging URL + publishable key.

---

## 2. Google OAuth — what **you** must do

Koupa mobile uses Supabase Auth Google provider with PKCE and redirect:

```text
koupa://callback
```

### A. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select project for **staging** (or create `koupa-staging-auth`).
2. **APIs & Services → OAuth consent screen**
   - User type: External (or Internal if Workspace-only testing)
   - App name: `Koupa`
   - Support email: yours
   - Authorized domains: add `supabase.co` if prompted
   - Scopes: `email`, `profile`, `openid` (default)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**  
     (Supabase Auth exchanges the code server-side; use a **Web** client even for mobile.)
   - Name: `Koupa Supabase Staging`
   - **Authorized JavaScript origins** (optional for mobile PKCE):
     - `https://zhdwaizroczkqzwrvfxf.supabase.co`
   - **Authorized redirect URIs** (required):
     ```text
     https://zhdwaizroczkqzwrvfxf.supabase.co/auth/v1/callback
     ```
4. Copy:
   - **Client ID** (ends with `.apps.googleusercontent.com`)
   - **Client secret**

> For production later: create a **second** Web client (or separate GCP project) and point it at  
> `https://hrcwhswzscfbpbllqkri.supabase.co/auth/v1/callback`.

### B. Supabase Dashboard (Staging)

Open:  
https://supabase.com/dashboard/project/zhdwaizroczkqzwrvfxf/auth/providers

1. **Authentication → Providers → Google**
   - Enable Google
   - Paste **Client ID**
   - Paste **Client secret**
   - Save
2. **Authentication → URL Configuration**
   - **Site URL** (pick one primary):
     ```text
     koupa://callback
     ```
   - **Redirect URLs** allow-list (add **all** of these):
     ```text
     koupa://callback
     exp://127.0.0.1:8081/--/callback
     exp://192.168.*.*:8081/--/callback
     http://localhost:8081/callback
     http://127.0.0.1:8081/callback
     ```
     Installed Android builds and the dev client always send **exact** `koupa://callback`
     (not `koupa:///callback` and not `exp+koupa://expo-development-client/--/callback`).

   **Expo Go hang after picking a Google account** is almost always a missing redirect URL.
   In Expo Go the app redirects to something like:
   ```text
   exp://192.168.132.184:8081/--/callback
   ```
   **not** `koupa://callback`. If that exact URL is not allow-listed, Google finishes
   account pick then the browser spins forever and the app never receives a callback.

   How to fix (required for Expo Go):
   1. Restart the app / Metro so the new OAuth code is loaded.
   2. Tap **المتابعة مع Google** once.
   3. In Metro terminal, find:
      ```text
      [auth] ADD THIS EXACT URL TO SUPABASE REDIRECT URLS → exp://…
      ```
   4. Open Supabase staging → **Authentication → URL Configuration → Redirect URLs**
   5. Paste that **exact** `exp://…` URL → Save
   6. Also keep:
      ```text
      koupa://callback
      http://localhost:8081/callback
      ```
   7. Retry Google sign-in (close the stuck browser tab first).

   Android note: Custom Tabs often deliver the return via a deep link, not the WebBrowser
   promise. The app now races both so either path can complete the login.
3. **Authentication → Providers → Email**
   - Enabled
   - Confirm email: **ON**
4. **Authentication → Providers → Phone**
   - Keep Supabase phone authentication **disabled**; Koupa does not use SMS or OTP
   - The required phone field is stored in `public.profiles.phone` for barber/customer calls and the phone sign-in alias
   - The `sign-in-with-phone` Edge Function resolves the profile phone to the linked Auth email server-side, then uses the existing email/password flow
   - Deploy it with `supabase functions deploy sign-in-with-phone`; keep the service-role key only in the Edge Function environment, never in Expo variables

### C. App side (already implemented)

- Redirect used by client: `koupa://callback` (native) / Expo web `/callback`
- PKCE + `detectSessionInUrl: false`
- Callback screen: `app/callback.tsx` exchanges code / handles recovery / collision

No Google client secret belongs in `.env` or the app.

### D. Android package note (installed builds)

- Application ID: `com.koupa.app` (`app.json`)
- For **installed** Android builds, Expo/dev-client still uses Supabase’s **web** OAuth client + deep link `koupa://callback` (current architecture).
- You do **not** need a separate “Android” OAuth client type for this Supabase flow unless you later switch to native Google Sign-In SDKs.

### E. Quick test checklist

1. Staging Google provider enabled with Web client ID/secret  
2. Redirect URI in Google Cloud = `https://zhdwaizroczkqzwrvfxf.supabase.co/auth/v1/callback`  
3. Supabase allow-list includes `koupa://callback`  
4. In app: **إنشاء حساب** → role + legal → **المتابعة مع Google**  
5. Browser completes → returns to app callback → lands in customer setup or barber onboarding  
6. Existing email/password user + Google same email → collision screen (password first)

---

## 3. CLI commands useful during setup

```sh
# Stay on staging by default
supabase link --project-ref zhdwaizroczkqzwrvfxf

# Legal docs
supabase db query --linked \
  "select key, version, url, is_active from public.legal_documents order by key, version;"

# Count auth users / sample profiles
supabase db query --linked "select count(*) from auth.users;"
supabase db query --linked "select id, role, name, is_published from public.profiles limit 10;"

# Publishable keys only for app env (never ship service_role)
supabase projects api-keys --project-ref zhdwaizroczkqzwrvfxf
```

Production (temporary link only):

```sh
supabase link --project-ref hrcwhswzscfbpbllqkri
# …audit…
supabase link --project-ref zhdwaizroczkqzwrvfxf   # re-link staging
```

---

## 4. Expo environment (client-safe only)

```text
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_SUPABASE_URL=https://zhdwaizroczkqzwrvfxf.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Terms and Privacy URLs are loaded from active, versioned Supabase rows. The public support contact and account-deletion URL are safe client constants in `src/config/legal.ts`.

Do **not** add Google client secret or `SUPABASE_SERVICE_ROLE_KEY` here.

---

## 5. Production side (Koupa Production `hrcwhswzscfbpbllqkri`)

Treat production as a **separate** Google + Supabase + Firebase stack. Do not reuse staging OAuth clients or secrets.

### Production status (CLI audit)

```sh
supabase link --project-ref hrcwhswzscfbpbllqkri
supabase migration list
supabase db query --linked "select count(*) from auth.users;"
supabase db query --linked "select count(*) from public.profiles;"
supabase db query --linked "select count(*) from public.legal_documents;"
supabase secrets list
supabase link --project-ref zhdwaizroczkqzwrvfxf   # always re-link staging after
```

Last checked in the production audit (2026-08-04):

| Item | Production |
|---|---|
| Auth users | **0** (empty) |
| Profiles | **0** (empty) |
| Legal documents | Approved active Terms/Privacy version `2026-07-29` |
| Migrations | **23/23 in sync** through `20260803000100` |
| Edge secrets | Platform keys only — **missing** `APP_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET` |
| Firebase | `koupa-prod` (see `.env.production.local`) |
| App ID | `com.koupa.app` |

The working tree, staging, and production currently contain 23 migration files
through `20260803000100_owner_shop_onboarding.sql`. Production push secrets and
the dispatch worker remain unconfigured.

### Production Google OAuth (do this in order)

#### A. Google Cloud (production)

1. Use a **production** GCP project (recommended: dedicated, not the staging one).
2. OAuth consent screen:
   - Publishing status: move to **In production** when ready for public testers / Play
   - App name `Koupa`, support email, privacy policy URL (approved)
3. Create OAuth client ID → **Web application**
   - Name: `Koupa Supabase Production`
   - Authorized redirect URI (**exact**):
     ```text
     https://hrcwhswzscfbpbllqkri.supabase.co/auth/v1/callback
     ```
4. Store Client ID + Client secret in the approved secret store (not git, not Expo env).

Optional later: separate Android OAuth client only if you adopt native Google Sign-In SDK. Current app uses Supabase browser/PKCE + `koupa://callback`, so **Web client is enough**.

#### B. Supabase Dashboard (production)

Open: https://supabase.com/dashboard/project/hrcwhswzscfbpbllqkri/auth/providers

1. **Providers → Google** → enable → paste **production** Client ID/secret → Save  
   (Never paste the staging client here.)
2. **URL Configuration**
   - Site URL: `koupa://callback` for the installed Android app
   - Redirect URLs (production-focused; no random LAN `exp://` unless debugging a prod build):
     ```text
     koupa://callback
     ```
   - If Koupa web is deployed, set `EXPO_PUBLIC_AUTH_REDIRECT_URL` in that web build to the exact
     deployed callback URL (for example `https://app.example.com/callback`) and add that same URL
     to this allow-list. Do not use `http://localhost:8081/callback` in production.
     Add Play / EAS preview URLs only if you use them for auth returns.
3. **Email** provider: enabled, **confirm email ON**, password min length ≥ 8  
4. **Phone**: keep Auth phone provider disabled; profile phone is contact data plus a server-side sign-in alias, and SMS/OTP are not used
5. Email templates: confirmation + recovery must use `{{ .ConfirmationURL }}` / recovery link. On
   installed production builds they resolve through `koupa://callback`; on a production web build
   they resolve through the configured HTTPS callback URL.

#### C. Production data gates (CLI)

Before any real signup on production:

1. **Push missing migrations** (after review; temporary prod link):
   ```sh
   supabase link --project-ref hrcwhswzscfbpbllqkri
   supabase db push
   supabase link --project-ref zhdwaizroczkqzwrvfxf
   ```
2. **Apply the versioned legal-document migration** and verify approved active rows:
   ```sql
   select key, version, url, is_active
   from public.legal_documents
   order by key, version;
   ```
3. Confirm app build uses production env only:
   ```text
   EXPO_PUBLIC_APP_ENV=production
   EXPO_PUBLIC_SUPABASE_URL=https://hrcwhswzscfbpbllqkri.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<prod publishable>
   ```

#### D. Production extras (not Google, but blocking launch)

| Item | Action |
|---|---|
| Push dispatch | Deploy `dispatch-notifications` + set `FIREBASE_SERVICE_ACCOUNT_JSON`, `NOTIFICATION_DISPATCH_SECRET`, `APP_ENV=production` |
| Appointment transitions | Verify DB cron / function parity with staging |
| Play App signing | SHA-1 not required for Supabase Web OAuth; required if you add native Google Sign-In later |
| Closed testing | Use production Google OAuth only on prod builds; staging stays on staging client |

### Staging vs production matrix

| | Staging | Production |
|---|---|---|
| Project ref | `zhdwaizroczkqzwrvfxf` | `hrcwhswzscfbpbllqkri` |
| Supabase Auth callback | `https://zhdwaizroczkqzwrvfxf.supabase.co/auth/v1/callback` | `https://hrcwhswzscfbpbllqkri.supabase.co/auth/v1/callback` |
| Google OAuth client | Staging Web client | **Separate** production Web client |
| Deep link | `koupa://callback` | `koupa://callback` (same scheme) |
| Firebase | `koupa-staging` | `koupa-prod` |
| Demo data | Yes | No |
| Legal URLs | Approved version `2026-07-29` | Approved version `2026-07-29` |

---

## 6. Release checklist

### Staging
- [ ] Google OAuth Web client (staging) + Supabase Google enabled
- [ ] Redirect URI = `https://zhdwaizroczkqzwrvfxf.supabase.co/auth/v1/callback`
- [ ] Allow-list includes `koupa://callback` (+ Expo LAN if needed)
- [ ] Email confirm + recovery tested
- [ ] Collision path tested

### Production
- [ ] **Separate** Google OAuth Web client (production)
- [ ] Redirect URI = `https://hrcwhswzscfbpbllqkri.supabase.co/auth/v1/callback`
- [ ] Supabase production Google provider enabled with prod client only
- [ ] Allow-list includes `koupa://callback`
- [ ] Email confirmation required; recovery templates OK
- [ ] Missing migrations applied (`db push` after review)
- [ ] Legal Terms/Privacy active rows with approved URLs
- [ ] Prod publishable key in production EAS secrets / `.env.production`
- [ ] Google sign-in tested on **installed** production/closed-testing build
- [ ] Password recovery + email confirm on device
- [ ] No silent Google identity merge
- [ ] Push secrets + `dispatch-notifications` on production (launch hygiene)
