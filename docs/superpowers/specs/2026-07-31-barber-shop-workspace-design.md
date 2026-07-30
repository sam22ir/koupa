# Koupa Barber Shop Workspace Design

Date: 2026-07-31
Status: Approved design, pending written-spec review

## Brief And Direction

This is a redesign of the barber Shop workflow for an Arabic-first mobile operations app. The audience is barbers who may be unaffiliated, shop members, invited barbers, or shop owners. The visual language is the existing Teal Stage system: a compact teal header, IBM Plex Sans Arabic, one restrained accent, strong RTL reading order, and calm list surfaces.

The selected composition is a **state-first hub**. The Shop route presents the most useful next action for the current relationship state. Search, shop details, and owner member management use focused routes or sheets so the hub does not become a long form or an admin dashboard.

The workflow covers:

- Creating a shop.
- Searching for a shop by name or location.
- Inspecting a shop before requesting to join.
- Pending join requests.
- Owner invitations and invitation expiry.
- Active membership and leaving a shop.
- Owner requests, members, invitations, activity, and shop deletion.
- A dedicated owner workspace for managing one affiliated barber.

## State Model And Navigation

### Unaffiliated barber

The hub header reads `المحل` with the subtitle `ابدأ أو انضم إلى محل`. A primary action is `البحث عن محل`; a secondary action is `إنشاء محل`. A short three-step explanation clarifies search, request, and owner approval.

`إنشاء محل` opens a focused create screen containing name, optional description, and either a valid maps URL or latitude/longitude. Successful creation returns to the owner hub.

`البحث عن محل` opens a search screen. Results are searchable by shop name and location and show name, area, rating, and rating count. Selecting a result opens a shop detail screen with location, owner, affiliated barbers, and `طلب الانضمام`.

The raw shop-ID field is removed from the primary workflow. A secondary invite-code/ID entry may be retained only if the existing backend contract requires a direct path, and it must not compete visually with search.

### Pending request

The hub shows the requested shop, a `قيد الانتظار` status, and the request date. The state is informational until the backend exposes cancellation; no false cancel action is presented.

### Invitation

An invitation is shown as an explicit decision surface with the shop name, inviter, expiry date, and `قبول` / `رفض` actions. Expired invitations become read-only status rows and cannot be accepted.

### Active member

The hub shows the shop name, location, membership status, owner, and affiliated barber count. The member can open the public shop profile, view relevant activity, and leave the shop. Leaving requires confirmation and explains that upcoming shop appointments may be cancelled and customers notified according to the product rules.

Members do not see owner request, invitation, or member-management controls.

### Owner

The owner hub shows the shop name, location, rating, member count, and a single primary `دعوة حلاق` action. Pending join requests are surfaced near the top with a count and direct accept/reject actions. The member list shows initials, name, role/status, and recent activity. The owner can open activity history, search published barbers, invite a barber, and open a member workspace.

Deleting the shop is placed in a separate danger section below the operational content. It requires confirmation and explains upcoming appointment cancellation, notification, and membership effects.

## Owner Member Workspace

Tapping a member opens a dedicated route such as `/shop/members/[barberId]`. The route reuses the existing Teal Stage visual language and has four focused views:

1. `الملخص`: member name, initials, membership status, contact visibility allowed by the current booking rules, and recent activity.
2. `الجدول والخدمات`: owner-managed schedule, breaks, exceptions, services, prices, and booking rules using the existing Schedule workspace patterns. The owner can edit operational settings but not the barber's personal profile.
3. `النشاط`: membership changes and owner/member setting changes with actor and timestamp.
4. `إزالة من المحل`: a destructive action that requires confirmation and states the upcoming-appointment impact.

The member workspace keeps one active editor at a time and uses explicit save semantics for settings. Owner changes use the existing owner-managed Supabase RPCs and refresh the member summary after success. The affected barber and owner receive the existing change notifications where supported.

## Visual And Interaction Rules

- Preserve the full transparent English `Koupa` wordmark and the Arabic brand spelling `كوپا`.
- Keep the page Arabic-first and RTL with IBM Plex Sans Arabic.
- Use the Teal Stage header, a warm-gold status accent, and off-white body surfaces.
- Prefer separators, list rows, and whitespace over nested cards.
- Keep one dominant action per state; do not show create, join, invite, and delete as equal-weight buttons.
- Use 48 logical pixel targets and explicit Arabic accessibility labels.
- Use status text and icons in addition to color; pending, active, rejected, and expired states must be understandable without color.
- Keep long shop/member names wrapped without pushing actions off-screen.
- At 342x646, the header, primary action, current state, and bottom navigation remain reachable without horizontal scrolling.
- Destructive actions use confirmation dialogs; mutations show progress and disable duplicate submissions.

## Data And Service Boundaries

`useShops` remains the single route facade. The state contract must distinguish:

- `ownedShop` and its members.
- The barber's active membership.
- Invitations addressed to the barber.
- Join requests submitted by the barber.
- Owner pending requests.
- Recent activity for the shop or selected member.

The service layer owns Supabase queries and RPC calls. The route does not coordinate independent mutations. Existing search, invite, request, respond, leave, delete, owner-managed settings, and activity methods should be reused where their contracts already match. New methods should be narrow and typed rather than exposing raw Supabase rows to components.

Loading failures must not render an editable empty state as if the barber has no shop. Show a retry surface that preserves the last known state when possible. Search failures, duplicate requests, expired invitations, permission errors, and destructive-action failures remain visible in context and do not clear the current screen.

## Testing And Verification

Automated coverage must include:

- Unaffiliated create and search-first join entry points.
- Search results, shop detail, request submission, duplicate request, and empty search.
- Pending request, active membership, invitation accept/reject, and expired invitation states.
- Owner request accept/reject, member list, invite search, activity, and delete confirmation.
- Dedicated member workspace navigation and owner schedule/services management.
- Leave/remove/delete confirmation copy and failed mutation state retention.
- Long Arabic names, accessibility labels, disabled duplicate actions, and loading/retry states.

Runtime verification must cover 342x646 and a larger Android viewport, including keyboard reachability, search and modal overlays, state transitions, no horizontal overflow, and the existing bottom navigation.

## Acceptance Criteria

- The Shop route no longer presents the unaffiliated barber with a long stack of unrelated fields.
- Joining starts with searchable shops and inspection, not a raw identifier field.
- Every supported relationship state has one clear next action and accurate status copy.
- Owners can review requests, invite barbers, inspect activity, and manage one member through a dedicated workspace.
- Owner management cannot edit personal profile fields and destructive actions explain consequences before confirmation.
- Loading, empty, error, pending, active, rejected, and expired states are explicit and testable.
- The redesign follows Teal Stage, Arabic RTL, `كوپا`, and the existing 342px mobile constraints.
