# Koupa · كوپا

Arabic-first Android app for booking barber appointments in Algeria. Find a shop
near you, pick a service and a time, show up, scan the QR at the door. Two
permanent roles: **customer** and **barber**.

Written `كوپا` with the Persian `پ`. Always. In UI copy, comments, tests and
docs.

---

## Stack

| | |
|---|---|
| Runtime | Expo SDK 57, React Native 0.86.2, React 19.2.3 |
| Navigation | expo-router (typed routes, file-based under `app/`) |
| UI kit | HeroUI Native 1.0.8 over Uniwind (Tailwind v4) |
| Backend | Supabase (Postgres, auth, RLS, edge functions) |
| Push | Firebase Cloud Messaging via `expo-notifications` |
| Maps | `react-native-maps` + `react-native-webview` for the location picker |
| Language | Arabic RTL, `ar-DZ` formatting, `Africa/Algiers`, prices in DZD |

Android only. `app.json` declares no `ios` block and the product spec is
Android-only.

---

## Getting started

```sh
npm install
cp .env.example .env.development.local   # fill in the values you need
npm run web                              # browser preview at localhost:8081
npm run android                          # device / emulator via Expo dev client
```

Requires Node 22+ and the Expo CLI that ships with the project. A physical
Android device needs the **development build**, not Expo Go — see
[Known limitations](#known-limitations).

### Environment variables

Local development reads `.env.development.local`. Only `EXPO_PUBLIC_*` values
ship to the client, and only put things in them that are safe to ship.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production`. Selects the Firebase config file. |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (client-safe) key. |
| `EXPO_PUBLIC_FIREBASE_*` | Six FCM client values for the selected environment. |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | Only for a deployed web build. Leave unset locally. |

`google-services.staging.json` and `google-services.production.json` are
gitignored. Locally, drop them in the repo root. On EAS they are supplied as
**file-scoped secret environment variables** named `GOOGLE_SERVICES_STAGING` /
`GOOGLE_SERVICES_PRODUCTION`, which [app.config.js](app.config.js) prefers over
the local paths.

---

## Scripts

| Command | Does |
|---|---|
| `npm run web` | Metro + browser preview |
| `npm start` | Metro for Expo dev client / devices |
| `npm run android` | Build and run the native Android app locally |
| `npm test` | Jest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run test:ci` | typecheck then Jest. This is the CI gate. |
| `npm run db:types` | Regenerate `src/types/database.ts` from the linked Supabase project |

---

## Layout

```
app/                     routes (expo-router file-based)
  (auth)/                intro, welcome, role-intro, sign-up, sign-in, confirm,
                         customer-setup, reset-password, legal-*
  (customer)/            home, find, appointments, profile
  (barber)/              today, schedule, shop*, profile
  book/[barberId]        booking flow
  scan.tsx               QR check-in
src/
  components/ui/         shared kit; every primitive wraps HeroUI
  features/              screen-scoped composition (customer-home, barber-shop, …)
  services/              all data access lives here
  hooks/                 thin React adapters over services
  navigation/            paths, route guard, destination resolution
  i18n/                  ar.ts dictionary + rtl bootstrap
  theme/                 colours, spacing, radii, typography tokens
  types/database.ts      generated Supabase types — do not hand-edit
supabase/
  migrations/            timestamped SQL
  functions/             appointment-transitions, dispatch-notifications,
                         sign-in-with-phone
reference/               product spec and operational docs
```

Data access belongs in `src/services/*`. Hooks stay thin. The product source of
truth is [reference/KOUPA-PRODUCT-SPEC.md](reference/KOUPA-PRODUCT-SPEC.md);
visual decisions are in [DESIGN.md](DESIGN.md).

---

## Backend

Default linked project is **staging**. Only link production temporarily, and
re-link staging afterwards.

```sh
supabase link --project-ref <staging-ref>
supabase migration list          # confirm local and remote agree
supabase db push                 # apply pending migrations
npm run db:types                 # regenerate types afterwards
```

Never commit `src/types/database.ts` ahead of the migration that produced it.

---

## Builds

Cloud builds on EAS. Nothing needs to compile on your machine.

| Profile | Output | Use |
|---|---|---|
| `development` | dev client | on-device debugging |
| `preview` | internal | staging QA |
| `production` | AAB | Play Store |
| `production-apk` | APK | sideloading onto a test device |

```sh
eas build -p android --profile production-apk
```

`production-apk` deliberately has **no `distribution` field**. Setting one to
`internal` makes EAS resolve the `preview` environment instead of `production`,
which has no `GOOGLE_SERVICES_PRODUCTION` secret, and the build dies during
native configuration.

`appVersionSource` is `remote`, so `versionCode` lives on EAS and
`autoIncrement` bumps it. Expect it to move even when a build fails after the
increment.

---

## Testing

Jest with the `jest-expo` preset. 84 suites, 415 tests.

```sh
npm run test:ci
npx jest __tests__/customerHomeScreen.test.tsx --no-coverage
```

Two harness details that are easy to break:

- **[jest.setup.js](jest.setup.js) wraps `render`** in `HeroUINativeProvider`,
  because HeroUI components need it. `rerender` re-wraps too, or the subtree
  remounts and resets state. `screen` is re-exposed as a live getter since RNTL
  mutates it via `setRenderResult`.
- **The setup file realises Expo's lazy globals on purpose.** `fetch` and
  friends are getters that require `expo-modules-core`, whose JS logger warns
  under Jest. If the first touch happens after a test file finishes, Jest
  reports "Cannot log after tests are done" and **exits 1 even though every
  suite passed**. Reproduces with `--runInBand`.

Prefer dates relative to `Date.now()` in fixtures. Absolute fixture dates drift
out of rolling windows and produce failures that only appear on some days.

---

## Architecture notes

### RTL is hand-rolled, not forced

`I18nManager.forceRTL` is never called. Screens compose RTL directly with
`flexDirection: 'row-reverse'`, `alignSelf: 'flex-end'` and `textAlign:
'right'`.

Do **not** set `dir="rtl"` on the document for web. It flips those styles a
second time and pushes everything to the wrong edge.
[src/i18n/rtl.ts](src/i18n/rtl.ts) sets only `lang="ar"`.

### HeroUI theming has two hard constraints

[global.css](global.css) is not just a stylesheet; it is the theme contract.

1. **`react-native-color-kit` parses hex, rgb and hsl only.** It cannot read
   `oklch` or `color-mix`, so every calculated variable it touches
   (`--color-*-hover`, `-soft`, `--color-field-*`, `--color-border-*`,
   `--color-separator-*`) is overridden with a concrete `hsl`/`hsla`. Leave one
   out and Buttons silently fall back to black.
2. **Light and dark `@variant` blocks must declare identical keys.** Uniwind
   enforces this.

HeroUI also pins `Label`, `Description` and `FieldError` to `text-align: left`
assuming a forced-RTL engine. The correction is one rule at the bottom of
`global.css`.

### Styling precedence

HeroUI's component CSS is **unlayered**, so Tailwind utilities in
`@layer utilities` lose to it. `className="text-right"` on a HeroUI `Typography`
does nothing; use the component's own `align` prop. StyleSheet `style` also does
not reliably beat the component class on web.

### Auth and routing

Email/password accounts must confirm their email before onboarding. The selected
role and legal consent are provisional auth metadata until profile creation; the
database refuses a profile insert without a confirmed email, current immutable
legal acceptances and a matching provisional role. **A profile's role can never
change.**

[resolveRoute.ts](src/navigation/resolveRoute.ts) is the single gate: no session
→ intro; unconfirmed email → confirm; session without a profile → customer-setup
or barber onboarding by pending role. [routeGuard.ts](src/navigation/routeGuard.ts)
rejects direct navigation that contradicts it.

### Motion

150–250 ms state changes only. No page-load choreography anywhere except the
intro brand lockup, which is documented as the single exception in
[DESIGN.md](DESIGN.md). [src/utils/motion.ts](src/utils/motion.ts) owns the gate
and honours the OS reduced-motion setting.

---

## Workflow

`main` is the official app. Work goes on a `codex/<short-task-name>` branch,
then commit, push and open a pull request before merging.

```sh
npm run test:ci && npm run lint      # before every push
```

CI runs exactly that. Lint **warnings** do not fail the build; errors do.

Do not commit `google-services*.json`, `.env*.local`, keystores, `android/`,
`dist/` or `.expo/`.

---

## Known limitations

- **Expo Go is not a usable target.** Reanimated/worklets initialisation crashes
  on some OEM devices (confirmed on an Honor ALI-AN00, where `adb logcat` is
  suppressed so it was never root-caused). Use `npm run android` or an EAS
  development client.
- **No crash reporting.** Sentry is planned, not wired up.
- **Arabic only.** `src/i18n/index.ts` registers a single dictionary. The key
  structure is English-ready but no `en` dictionary exists yet.
- **No reporting or blocking tools** in the MVP, by product decision.
