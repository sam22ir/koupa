# Barber Onboarding Redesign

## Scope

Redesign the five-screen barber onboarding flow at `/onboarding` for a first-time independent barber. The visual direction is the locked Teal Stage system: a deep-teal stage header, Arabic-first IBM Plex Sans Arabic typography, warm gold used only as an accent, and one clear task per screen.

The flow remains five persisted screens:

1. Profile
2. Location or worker continuation
3. Services
4. Working hours
5. Review and publish

The existing onboarding draft persistence, resume behavior, and publish route remain in place.

## User Flow

### Screen 1: Profile

Collect name, contact phone, and short bio. Add a required workplace choice:

- `أملك محلا` (`owner`)
- `أعمل في محل` (`worker`)

Use a clear segmented choice with helper copy that the choice controls the next step. Keep the phone as contact data, not an authentication field.

### Screen 2: Conditional location

For an owner, collect city, neighborhood, and a Google Maps URL. The primary field is a pasted URL; raw latitude and longitude are removed from the normal UI. The helper copy explains that the link is shown to customers and must point to the correct shop.

For a worker, render no location fields. Explain that the shop will be connected after the personal profile is published and that the worker will find or request the shop from the Shop area.

### Screen 3: Services

Render each service as an editable card containing name, DZD price, and duration. Keep add and remove actions visible. Require at least one valid service. Preserve five-minute duration increments and positive integer DZD prices.

### Screen 4: Working hours

Use the existing weekly schedule editor inside the Teal Stage presentation. Keep one compact row per day, expandable editing, breaks, copy-hours support, and the 5/10/15/30 minute appointment interval control. The primary action remains `التالي`.

### Screen 5: Review and publish

Show compact summary sections for profile, location when present, services, and working hours. Each section has a direct edit action that returns to the corresponding step. The primary CTA is `نشر ملفي`. Workers must see that location will be supplied when they join a shop; owners must see their shop link summary.

## Data and Backend Contract

Add `workplaceType: 'owner' | 'worker'` to `BarberDraft` and the persisted onboarding JSON. Existing drafts without the field should hydrate as `owner` to preserve current behavior and location requirements.

Add the workplace type to the published barber profile contract. The database needs a durable profile value (an enum or constrained text field) so server validation can distinguish the two cases.

Validation rules:

- Both workplace types require a valid name and Algerian contact phone.
- Owners require city, neighborhood, and a valid HTTPS Google Maps URL.
- Workers may publish with no city, neighborhood, URL, or coordinates.
- Both types require at least one valid service and one valid working day.

The profile location constraint and `publish_barber_profile` RPC must be updated so the worker case can publish without a location while the owner case remains location-gated.

When a shop membership is accepted, synchronize the worker's effective profile location from the shop location. When a worker leaves, clear the effective location. Creating an owned shop supplies the new location. The sync must be server-side and transactional with the membership or shop operation so the app cannot display a stale location after a successful action.

## Interaction and Error Handling

- Keep the visible `1/5` through `5/5` progress indicator and step title.
- Auto-save draft changes after edits and explicitly save when advancing, as today.
- Back navigation never validates the current step; advancing validates only the current step.
- Owner location errors identify an invalid or missing Google Maps link and do not expose coordinate terminology.
- Worker location steps have no validation error because there are no location fields.
- Publish re-validates all required steps and moves to the first invalid step.
- Network/load/save failures continue to use the existing error banner and retry actions.
- All new controls need Arabic accessibility labels, selected/expanded states, and reachable 48dp touch targets.

## Component Boundaries

Keep route orchestration in `app/onboarding/index.tsx`. Add focused presentation components under `src/components` or a dedicated onboarding feature folder for:

- workplace choice
- stage/progress header
- conditional location card
- service editor card
- review summary

Continue using existing `Field`, `Button`, `Card`, `Screen`, `Stage`, `WeeklyScheduleEditor`, and `AppointmentIntervalPicker` primitives where they fit. Do not add a new design system.

## Testing

Update validation tests for owner and worker branches, including worker publication without location and owner rejection without a valid Maps URL. Update screen tests to cover workplace choice, conditional location rendering, service add/remove, review edit navigation, resume at a saved step, and publish gating. Add SQL/RPC coverage for membership acceptance copying shop location and leave clearing it. Run typecheck and the focused Jest suites before broader verification.

## Out of Scope

- Shop search or join UI during onboarding.
- Customer onboarding changes.
- New photos, uploads, or map picker SDK integration.
- Changing the five-step persistence numbering.
- Redesigning the post-onboarding Shop tab.
