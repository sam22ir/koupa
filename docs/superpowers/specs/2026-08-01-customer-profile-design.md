# Customer Profile Redesign

## Status

Approved design for implementation.

## Goal

Make the customer profile page easier to scan and safer to edit. The page should clearly separate identity editing, notifications, help/legal resources, session controls, and irreversible account deletion while preserving the existing RTL Koupa visual language.

## Approved decisions

- Use the existing full white `كوپا` stage header and customer navigation.
- Use the selected B interaction: the identity card transforms into the edit surface inline.
- Edit the display name inline.
- Keep the login phone visible but read-only. Do not add OTP and do not mutate the login phone from this screen.
- Require an explicit `حفظ التغييرات` action; do not auto-save.
- Organize actions into four groups: `الحساب`, `المساعدة والخصوصية`, `الجلسة`, and `منطقة حساسة`.

## Interaction design

### Read-only identity card

The card displays the avatar initials, customer name, login phone, and a clear edit control. The phone is labeled as the login number so its read-only state is understandable. Missing profile values use the existing localized fallbacks.

### Inline edit state

Activating edit changes the identity card in place:

- The name is a right-aligned text field with the current name selected as its value.
- The login phone remains visible as a disabled field and is not submitted.
- `حفظ التغييرات` is the primary action and `إلغاء` is the secondary action.
- Save trims whitespace and rejects an empty name locally.
- While saving, the save action is busy and both fields/actions are protected from duplicate submission.
- On success, the card returns to read-only mode, the session profile is refreshed, and a localized success message is shown.
- On failure, the edit state stays open and the error is shown inline without losing the user's input.

### Grouped actions

Use compact RTL action rows with familiar icons and chevrons instead of a stack of unrelated full-width buttons:

- `الحساب`: edit profile and notifications.
- `المساعدة والخصوصية`: terms, privacy policy, account-deletion information, and support email.
- `الجلسة`: sign out.
- `منطقة حساسة`: a short deletion warning and the existing destructive delete confirmation flow, separated at the bottom with danger styling.

Legal links keep their current canonical destinations. Notifications keep their existing route and loading/error/empty behavior.

## Data flow

Add a profile service operation that updates only `profiles.name` for the authenticated user's profile row. The operation must scope the update by the current user id and surface Supabase errors through the existing app-error conversion. After a successful update, call the session provider's profile refresh so the new name is reflected in the home greeting and other screens. The login phone must not be written by this operation.

## Error and loading behavior

- Preserve the existing account lifecycle and legal-document errors.
- Show profile-save errors in the edit surface and keep the form open.
- Disable save while a save is in flight.
- Keep the existing deletion modal, failed-delete message, and sign-out behavior unchanged.
- Keep the page scrollable on small screens, including when the edit surface is expanded.

## Visual direction

- Continue the teal stage, blue workspace, white surfaces, rounded corners, and Arabic RTL alignment already used by the barber profile and customer stage header.
- Use section labels and row separators to create hierarchy; avoid nested card stacks.
- Keep destructive deletion visually distinct but not prominent in the first viewport.
- Keep long names wrapped and prevent action labels from clipping on narrow screens.

## Testing requirements

Add or update focused profile tests to cover:

- read-only identity and edit action visibility;
- inline edit state with editable name and disabled login phone;
- cancel restoring the original identity;
- validation for an empty name;
- successful save, refresh, success feedback, and collapsed read-only state;
- failed save preserving the edit state and error;
- grouped action navigation and canonical legal links;
- logout and existing delete-account confirmation behavior;
- expanded layout remaining scrollable on a narrow viewport.

## Out of scope

- OTP, phone-number verification, or changing the Supabase Auth login phone;
- editable email or role changes;
- notification preference management beyond the existing notifications route;
- changing the barber profile page in this pass.
