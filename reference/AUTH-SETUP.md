# Authentication Setup

This document covers the Supabase dashboard work required before testing or releasing Koupa authentication. Never place provider client secrets, SMTP credentials, or service-role keys in Expo environment variables or the repository.

## 1. Apply Database Migrations

Apply migrations in `supabase/migrations` in filename order to development, staging, and production. The `20260722000300_auth_consent.sql` migration adds the legal acceptance gate used by profile creation.

Before any signup test, create exactly one active row for each required document using approved, public URLs and release-owned versions:

```sql
insert into public.legal_documents (key, version, url, is_active)
values
  ('terms', '2026-07-22', 'https://example.com/terms', true),
  ('privacy', '2026-07-22', 'https://example.com/privacy', true);
```

Replace the example versions and URLs with the approved legal documents. Do not modify existing acceptance records. Publish a new version by updating the active document row only as part of a reviewed legal release.

## 2. Configure Supabase Auth

In **Authentication > Providers**:

- Enable Google and enter its OAuth client ID and client secret from the approved secret store.
- Enable email/password and require email confirmation.
- Enable phone/password only. Disable SMS verification and OTP templates for this product flow.
- Configure the email sender, confirmation template, and password-recovery template using the approved transactional email provider. The confirmation template uses Supabase's `{{ .ConfirmationURL }}` link and returns through the platform-specific callback URL.
- Set an appropriate password policy with a minimum length of eight characters or stronger.
- Set production rate limits for email sends, token verification, password sign-in, and OAuth attempts according to the expected launch traffic and provider quotas.

Use the app callback as both the Supabase Auth Site URL and an allowed redirect URL for native builds:

```text
koupa://callback
```

For local web development, also allow the exact Expo web callback origin, such as:

```text
http://localhost:8081/callback
```

The app uses PKCE. Keep `detectSessionInUrl` disabled in the mobile client because the callback screen exchanges the returned authorization code explicitly.

## 3. Expo Environment

Copy `.env.example` to `.env.local` and supply only browser-safe Supabase values:

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_TERMS_URL=https://example.com/terms
EXPO_PUBLIC_PRIVACY_URL=https://example.com/privacy
```

`EXPO_PUBLIC_*` values are embedded in the app. Never add private keys, provider secrets, or `SUPABASE_SERVICE_ROLE_KEY` to this file.

## 4. Release Checklist

- Google OAuth has been tested on an installed Android build.
- Email registration reaches `koupa://callback`, confirms the email, and resumes the selected role's onboarding.
- Phone/password registration attaches a recovery email; onboarding remains blocked until that email is confirmed.
- Password-reset links open the reset-password screen and expire safely.
- Active Terms and Privacy rows contain approved versions and URLs in every deployed database.
- New profile creation fails without confirmed email, current legal acceptances, and matching provisional role.
- Existing accounts do not silently merge with a newly attempted Google identity.
