# Auth email templates

Arabic, right-to-left versions of the emails Supabase sends for كوپا. Supabase
does not read these files from the repo; paste each into the dashboard for **both
projects** (staging and production): Authentication -> Emails -> Templates.
Custom SMTP must be on for templates to be editable.

| Template in the dashboard | Subject | File |
|---|---|---|
| Confirm sign up | أكّد بريدك الإلكتروني في كوپا | `confirm-signup.html` |
| Reset password | إعادة تعيين كلمة المرور في كوپا | `reset-password.html` |
| Change email address | أكّد عنوان بريدك الجديد في كوپا | `change-email.html` |

Notes
- Variables used: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`. Keep them exactly as written.
- The brand is always written كوپا (Persian pe), never with a different spelling.
- The link goes through Supabase, then opens the app at `koupa://callback`. It only
  works from the phone that has the app installed.
- Not customized because the app does not send them: Invite user, Magic link, Reauthentication,
  and the notification emails (password changed, email changed, and so on).
- After editing, send yourself a test signup on staging before doing production.
