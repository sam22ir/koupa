# Koupa UGC moderation runbook

This runbook describes the manual moderation path for user-submitted barber and
shop profiles and public rating summaries. Only designated Koupa moderators
with authorized Supabase project access may use the moderation queue. Never
share reporter identity or report details with the reported account.

## In-app controls

- Public barber profiles expose **Report profile**, **Report ratings**, and
  **Block barber** actions to signed-in users.
- Public shop profiles expose **Report shop** and a way to block the shop
  owner. Blocked affiliated barbers are removed from the shop's public roster.
- Users can review and undo their own blocks from Profile → Blocked accounts.
- Blocking hides the barber/shop from that user's search and shop views and
  prevents new bookings. Existing appointments are not cancelled.
- Reports contain a fixed reason and optional details. Repeated open reports
  from the same user for the same target are rejected. Users can see their own
  report status; only a moderator can change it.

## Review queue

Open the correct environment in Supabase Studio and use the SQL Editor with an
authorized moderator account. Do not put service-role keys in the app or share
them with moderators who only need the queue.

```sql
select id, created_at, target_kind, target_id, reason, details, status
from public.ugc_reports
where status in ('open', 'reviewing')
order by created_at asc;
```

Mark a report while it is being reviewed:

```sql
update public.ugc_reports
set status = 'reviewing'
where id = '<report-uuid>' and status = 'open';
```

For a profile report, inspect the target barber's published profile and the
details submitted by the reporter. For a shop report, inspect the shop and its
owner. A `ratings` report refers to the public rating summary for the barber;
individual ratings are not displayed to other users. If available evidence
shows a clear violation, unpublish the profile while investigating and use the
Auth dashboard to restrict an account when warranted. Do not delete appointment
or rating history as a first response.

Close the report with an outcome and a brief, non-sensitive moderator note:

```sql
update public.ugc_reports
set status = 'action_taken',
    moderated_at = now(),
    moderator_notes = '<brief action taken>'
where id = '<report-uuid>' and status in ('open', 'reviewing');
```

If no action is warranted, use `closed_no_action` instead of `action_taken`.
Do not promise a fixed review deadline to reporters. Check the queue regularly,
prioritize credible safety threats, preserve only information needed for the
decision, and follow applicable legal obligations. Keep moderator notes factual
and avoid adding sensitive personal information.

## Release checks

- Confirm the active public Terms match the current versioned Terms row in
  `public.legal_documents` before activating the migration.
- Keep reporter details and the queue unavailable to `anon` and other users;
  only a reporter can read their own report through the app.
- Verify report creation, duplicate handling, blocking, unblocking, and the
  booking restriction with separate customer and barber accounts before a
  release.
