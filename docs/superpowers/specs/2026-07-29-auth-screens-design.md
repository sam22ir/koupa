# Koupa Auth Screens Design

Date: 2026-07-29
Status: Approved visual direction

## Scope

Redesign the existing sign-in and permanent-role selection screens so they continue the approved Teal Stage language introduced on the welcome screen. Preserve the current authentication providers, validation rules, legal-document requirements, routes, and Supabase behavior.

This work does not redesign sign-up, confirmation, password recovery, or onboarding screens. The shared presentation component is used only by sign-in and role selection in this implementation.

## Direction

Use the selected "Focused floating card" composition on both screens:

- A compact deep-teal header establishes brand continuity without turning the entire form surface teal.
- A warm-gold rule remains a small accent beneath the English `Koupa` wordmark.
- A white task card overlaps the header by 24-28px and contains one focused workflow.
- Cards use the existing 22px outer radius, 16px control radius, light tinted elevation, and approved palette.
- All visible product content remains Arabic-first and RTL in IBM Plex Sans Arabic.
- No photography, decorative illustration, gradient, glass effect, or new accent color is introduced.

## Shared Auth Shell

Create a reusable `AuthShell` component in `src/components/ui/`. It accepts a title, optional subtitle, back destination, and card content. It renders:

- A compact teal stage with safe-area-aware top padding.
- The existing transparent English `Koupa` logo in a high-contrast light treatment.
- A small warm-gold rule.
- A 48x48 minimum back control that navigates to `/(auth)/welcome`.
- A white content card that overlaps the stage and scrolls with the page.

The root remains a keyboard-safe `ScrollView`. The card must fit at a 340px-wide viewport without horizontal clipping, preserve bottom safe-area padding, and scroll enough to keep the active field and primary action reachable above the keyboard.

## Sign-In Screen

### Header

- Title: `تسجيل الدخول`
- Subtitle: `ادخل إلى حسابك لإدارة مواعيدك.`

### Card order

1. Email/phone segmented control.
2. Identifier field with the label and keyboard matching the selected method.
3. Password field with an accessible show/hide control.
4. `نسيت كلمة المرور؟` link.
5. Primary `تسجيل الدخول` button.
6. Divider with `أو` centered between two hairlines.
7. Secondary `المتابعة مع Google` button.
8. Quiet account-switch prompt: `ليس لديك حساب؟ إنشاء حساب`, linking to `/(auth)/role`.

Email remains the default method. Switching methods preserves no stale identifier validation error. The password visibility control changes only presentation and never modifies the stored value.

### Validation and errors

- Invalid email or phone messages appear directly below the identifier field.
- Invalid password messages appear directly below the password field.
- Provider, collision, cancellation, and server errors remain contextual banners inside the card, above the primary action.
- Submitting or starting Google authentication keeps button dimensions stable and prevents duplicate actions.
- Existing recovery and collision routing remains unchanged.

## Role Selection Screen

### Header

- Title: `اختر نوع الحساب`
- Subtitle: `اختيارك دائم ولا يمكن تغييره لاحقاً.`

### Card order

1. Two vertically stacked role choices.
2. One legal-consent row with inline Terms and Privacy links.
3. Contextual legal-loading, missing-document, or acceptance error text.
4. Primary `متابعة` button.

Role choices use the following copy:

- `زبون`: `احجز مواعيدك وتابعها من مكان واحد.`
- `حلاق`: `أدر خدماتك وجدولك ومواعيد زبائنك.`

Customer remains selected by default. The active card uses a 2px teal border and pale-teal fill; the inactive card uses a neutral border and white fill. Each whole card is a single accessible radio-like target with selected state announced.

The legal checkbox is a minimum 48px touch target even though its visible square is smaller. Terms and Privacy remain separate actionable links inside the sentence. Tapping a link must not toggle consent. The Continue button stays disabled until the user has accepted and both legal documents are available.

## Interaction States

- Pressed controls use `scale: 0.98` feedback without changing layout.
- Focused inputs receive a teal border; errors use the existing danger token.
- Loading indicators replace button labels without resizing buttons.
- Disabled controls retain readable contrast and expose disabled accessibility state.
- Legal-document loading uses a card-shaped skeleton matching the final role-card and legal-row layout rather than replacing the entire screen with an unrelated centered spinner.
- All motion is short, state-driven, and disabled when reduced motion is requested.

## Accessibility

- Maintain WCAG AA text and control contrast on web and equivalent readable contrast on Android.
- All interactive targets are at least 48x48 logical pixels.
- Segments, role choices, checkbox, password visibility, back action, and links expose explicit roles, labels, and selected/checked/disabled state.
- RTL reading order matches visual order.
- Error text is associated with its field and remains visible until corrected or a new submission begins.

## Component Boundaries

- Shared teal header, overlap, safe-area, and card composition belong in one reusable auth shell component.
- `Field` gains an optional trailing accessory and focus/error styling rather than creating a sign-in-only input component.
- Credential-method and role-selection controls remain screen-local unless a second real consumer appears.
- Existing `Button`, translation, theme, session, legal service, and routing APIs remain the source of behavior.

## Testing and Verification

Automated checks:

- Extend Jest coverage for the new Arabic copy and stable destinations.
- Test credential-method switching clears method-specific validation errors.
- Test password visibility does not change the password value.
- Test role selection, legal acceptance, legal readiness, and Continue enablement through screen interactions.
- Add React Native Testing Library as a development dependency and use it for password visibility, method switching, role selection, consent, disabled state, and route-action coverage.
- Run `npm run typecheck`, focused Jest tests, and lint on changed files.

Runtime checks at 340x646 and a larger Android viewport:

- Both screens render without overlap or horizontal clipping.
- Keyboard appearance leaves the focused field and primary action reachable.
- Email, phone, password visibility, recovery, Google, role, legal-link, and Continue interactions reach their existing destinations.
- Loading, validation, missing legal documents, and disabled states preserve layout.
- Arabic text, `كوپا` accessibility labels, and the English transparent wordmark are correct.

## Acceptance Criteria

- Sign-in and role selection visibly belong to the same Teal Stage family as Welcome.
- Each screen has one compact teal header and one focused floating white card.
- The workflows and backend contracts described in `reference/KOUPA-PRODUCT-SPEC.md` remain unchanged.
- All controls and states described above are implemented and verified.
- No unrelated route, backend, theme, or navigation refactor is included.
