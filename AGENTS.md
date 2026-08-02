# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains Koupa's Expo service and domain foundation; its previous frontend routes, components, assets, and design system were intentionally removed. Until the replacement frontend is approved, keep route and UI directories absent. When the frontend is rebuilt, keep route files in `app/` (or `src/app/` if that convention is adopted), reusable UI and feature code in `components/` and `features/`, hooks in `hooks/`, static files in `assets/`, and tests in `__tests__/` or beside the modules they cover. Keep generated native/build output such as `android/`, `dist/`, and `.expo/` out of commits unless the project deliberately uses a prebuild/bare workflow.

## Product Reference

Use [`reference/KOUPA-PRODUCT-SPEC.md`](reference/KOUPA-PRODUCT-SPEC.md) as the reference file and source of truth for Koupa’s product requirements, user flows, booking rules, backend responsibilities, localization, release decisions, and future design decisions. Update that document when agreed product or design decisions change.

### Brand Name

Always write the Arabic brand name as `كوپا`, using the Persian letter `پ`. Do not use alternative Arabic spellings. Apply this spelling consistently in UI copy, accessibility labels, design documentation, tests, and generated content.

## Build, Test, and Development Commands

Use the package-manager scripts defined in `package.json`; the frontend is intentionally absent until rebuilt:

```sh
npm install                 # install dependencies
npm test                    # run preserved domain/service tests
npm run typecheck           # TypeScript noEmit check
npm run test:ci             # typecheck + jest
npm run db:types            # regenerate src/types/database.ts from linked Supabase
npx expo lint               # run Expo/ESLint checks, when configured
npx expo config --type public # validate native configuration
```

Prefer reproducible commands that work from a clean checkout and avoid committing machine-specific setup.

### Backend / domain notes

- Product requirements: [`reference/KOUPA-PRODUCT-SPEC.md`](reference/KOUPA-PRODUCT-SPEC.md)
- Improvement plan: [`reference/IMPROVEMENT-PLAN.md`](reference/IMPROVEMENT-PLAN.md)
- Frontend integration contract: [`reference/FRONTEND-CONTRACT.md`](reference/FRONTEND-CONTRACT.md)
- Ops: [`reference/BOOKING-OPERATIONS.md`](reference/BOOKING-OPERATIONS.md), [`reference/PUSH-NOTIFICATIONS.md`](reference/PUSH-NOTIFICATIONS.md), [`reference/RPC-SECURITY-AUDIT.md`](reference/RPC-SECURITY-AUDIT.md)
- Typed Supabase client lives in `lib/supabase.ts` (`createClient<Database>`). Regenerate types after migrations with `npm run db:types` (requires linked project; Docker/local Supabase preferred when available).
- Prefer Supabase CLI ≥ `2.110` on `PATH` (`~/.local/bin` may shadow older `/usr/local` installs).
- Default linked project is **staging** (`zhdwaizroczkqzwrvfxf`). Only temporarily link production for audits/deploys, then re-link staging.
- Data access belongs in `src/services/*`. Hooks in `src/hooks/*` should stay thin React adapters (`useSession` remains the auth façade).
- Do not commit `google-services*.json` or `.env*.local`.

## Coding Style & Naming Conventions

Use TypeScript where available, two-space indentation, and the repository’s configured Prettier/ESLint rules. Name React components and screens with `PascalCase`, hooks with `usePascalCase`, and ordinary functions, variables, and route groups with `camelCase` or the adopted route convention. Keep platform-specific files explicit, such as `Component.android.tsx`.

## Testing Guidelines

Use Jest for preserved domain and service behavior. When the frontend is rebuilt, add React Native Testing Library and UI tests for user-visible behavior. Keep tests deterministic and avoid relying on emulator state. Run the full suite before submitting.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Add appointment screen` or `Fix Android deep link`. Keep commits focused. Pull requests should describe the user impact, list verification commands and device/emulator details, link related issues, and include screenshots or recordings for UI changes. Call out Expo config, native Android, dependency, or migration changes explicitly.

## Security & Configuration

Do not commit credentials, tokens, signing keys, keystores, or `.env` files. Document required variables in `.env.example` and use Expo-compatible public variable naming only for values safe to ship to the client. Keep Android signing credentials and production secrets in the approved secret store. Review `app.json`/`app.config.*` and native Android changes carefully before merging.
