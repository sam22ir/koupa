# Repository Guidelines

## Project Structure & Module Organization

This is an Expo and React Native application targeting Android devices. Keep Expo Router screens in `app/` (or `src/app/` if that convention is adopted), reusable UI and feature code in `components/` and `features/`, hooks in `hooks/`, static files in `assets/`, and tests in `__tests__/` or beside the modules they cover. Keep generated native/build output such as `android/`, `dist/`, and `.expo/` out of commits unless the project deliberately uses a prebuild/bare workflow.

## Product Reference

Use [`reference/KOUPA-PRODUCT-SPEC.md`](reference/KOUPA-PRODUCT-SPEC.md) as the reference file and source of truth for Koupa’s product requirements, user flows, booking rules, design system, backend responsibilities, localization, and release decisions. Update that document when agreed product decisions change.

### Brand Name

Always write the Arabic brand name as `كوپا`, using the Persian letter `پ`. Do not use alternative Arabic spellings. Apply this spelling consistently in UI copy, accessibility labels, design documentation, tests, and generated content.

## Build, Test, and Development Commands

Use the package-manager scripts defined in `package.json`; prefer `npx expo` for Expo operations:

```sh
npm install                 # install dependencies
npx expo start              # start Metro and Expo development tools
npx expo start --android    # launch on a connected Android device/emulator
npx expo run:android        # build and run the local native Android app
npm test                    # run the configured test suite
npx expo lint               # run Expo/ESLint checks, when configured
```

Prefer reproducible commands that work from a clean checkout and avoid committing machine-specific setup.

## Coding Style & Naming Conventions

Use TypeScript where available, two-space indentation, and the repository’s configured Prettier/ESLint rules. Name React components and screens with `PascalCase`, hooks with `usePascalCase`, and ordinary functions, variables, and route groups with `camelCase` or the existing Expo Router convention. Keep platform-specific files explicit, such as `Component.android.tsx`.

## Testing Guidelines

Use Jest with React Native Testing Library when configured. Add tests for new behavior and regression cases, naming them `*.test.ts` or `*.test.tsx` (for example, `__tests__/LoginScreen.test.tsx`). Keep tests deterministic, avoid relying on emulator state, and test accessibility roles and user-visible behavior rather than implementation details. Run the full suite before submitting.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Add appointment screen` or `Fix Android deep link`. Keep commits focused. Pull requests should describe the user impact, list verification commands and device/emulator details, link related issues, and include screenshots or recordings for UI changes. Call out Expo config, native Android, dependency, or migration changes explicitly.

## Security & Configuration

Do not commit credentials, tokens, signing keys, keystores, or `.env` files. Document required variables in `.env.example` and use Expo-compatible public variable naming only for values safe to ship to the client. Keep Android signing credentials and production secrets in the approved secret store. Review `app.json`/`app.config.*` and native Android changes carefully before merging.
