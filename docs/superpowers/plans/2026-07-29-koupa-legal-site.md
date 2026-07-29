# Koupa Legal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a bilingual, Arabic-default Koupa legal website with separate Privacy Policy, Terms of Use, and Google Play-compliant Account Deletion pages.

**Architecture:** Keep the site isolated from Expo under `website/` as semantic static HTML with shared CSS and self-hosted brand assets. Each Arabic and English URL maps to a real `index.html`; a Node/jsdom verifier enforces route, metadata, language-link, brand, legal-contact, and deletion-disclosure requirements before Cloudflare deployment.

**Tech Stack:** HTML5, CSS, IBM Plex Sans Arabic, Node.js, jsdom, Cloudflare Pages/Wrangler, Playwright browser verification.

---

## File Map

- Create `website/assets/styles.css`: shared responsive legal-site styling.
- Copy `assets/brand/logo-mark.png` to `website/assets/logo-mark.png`: visible Koupa brand asset.
- Copy `assets/fonts/IBMPlexSansArabic-Regular.ttf` to `website/assets/IBMPlexSansArabic-Regular.ttf`: body font.
- Copy `assets/fonts/IBMPlexSansArabic-SemiBold.ttf` to `website/assets/IBMPlexSansArabic-SemiBold.ttf`: heading font.
- Create `website/index.html`: Arabic legal index.
- Create `website/privacy/index.html`: Arabic Privacy Policy.
- Create `website/terms/index.html`: Arabic Terms of Use.
- Create `website/account-deletion/index.html`: Arabic account-deletion instructions.
- Create `website/en/index.html`: English legal index.
- Create `website/en/privacy/index.html`: English Privacy Policy.
- Create `website/en/terms/index.html`: English Terms of Use.
- Create `website/en/account-deletion/index.html`: English account-deletion instructions.
- Create `website/404.html`: bilingual branded not-found page.
- Create `website/_headers`: security and cache headers for Cloudflare Pages.
- Create `website/check-site.cjs`: jsdom structural and content verifier.

### Task 1: Static-Site Contract and Shared Assets

**Files:**
- Create: `website/check-site.cjs`
- Create: `website/assets/styles.css`
- Create: `website/_headers`
- Copy: `website/assets/logo-mark.png`
- Copy: `website/assets/IBMPlexSansArabic-Regular.ttf`
- Copy: `website/assets/IBMPlexSansArabic-SemiBold.ttf`

- [ ] **Step 1: Write the failing site verifier**

Use `JSDOM` to load the eight required route files plus `404.html`. Assert each document has one `h1`, a nonempty title and description, a canonical URL under `https://koupa-website.pages.dev`, a matching alternate-language link, and links to Privacy, Terms, and Account Deletion. Assert Arabic documents use `lang="ar" dir="rtl"`; English documents use `lang="en" dir="ltr"`. Globally reject `كوبا`, `example.com`, `TODO`, and `TBD`.

Add deletion-specific assertions:

```js
assert.match(arabicDeletion.body.textContent, /حذف الحساب من داخل التطبيق/);
assert.match(englishDeletion.body.textContent, /Delete your account in the app/);
assert.match(arabicDeletion.body.textContent, /saadisamir20200@gmail\.com/);
assert.match(englishDeletion.body.textContent, /saadisamir20200@gmail\.com/);
assert.match(englishDeletion.body.textContent, /anonym/i);
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node website/check-site.cjs`

Expected: FAIL with missing `website/index.html` and route files.

- [ ] **Step 3: Copy approved assets and add shared CSS**

Copy the logo and Regular/SemiBold fonts from repository assets. Define `@font-face`, palette custom properties, RTL/LTR-safe logical spacing, stable header/navigation dimensions, a document width of about 760px, responsive mobile navigation, visible focus states, skip link, tables/lists, callouts, contact actions, and footer. Use Deep Teal `#1A7A78`, Warm Gold `#E1A553`, Charcoal Blue `#323E4B`, and Soft White `#F3F5F7`; keep gold to small accents.

- [ ] **Step 4: Add Cloudflare response headers**

Create `website/_headers` with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a restrictive static-site CSP allowing only self-hosted assets and `mailto:`, and a conservative `Permissions-Policy` disabling camera, microphone, and geolocation.

### Task 2: Arabic Default Pages

**Files:**
- Create: `website/index.html`
- Create: `website/privacy/index.html`
- Create: `website/terms/index.html`
- Create: `website/account-deletion/index.html`

- [ ] **Step 1: Create the Arabic legal index**

Use `<html lang="ar" dir="rtl">`, canonical `/`, alternate English `/en/`, shared header/footer, and three direct document links. Describe كوپا as an Algeria-first Android barber-booking platform connecting customers, barbers, and shops; avoid a marketing hero.

- [ ] **Step 2: Create the Arabic Privacy Policy**

Use effective date `29 يوليو 2026`. Cover operator/contact; account/auth and legal consent; profiles and barber/shop locations; services/schedules; bookings, QR, ratings, notifications, memberships, and activity history; push tokens and site request logs; purposes and lawful operational need; Supabase, Google/Firebase, Cloudflare, and external map links; public barber/shop information; no data sale or third-party ads; retention and anonymized history; security limits; user access/correction/deletion rights; minors; international service providers; policy changes; and contact.

- [ ] **Step 3: Create the Arabic Terms of Use**

Use effective date `29 يوليو 2026`. Cover acceptance; account security; permanent Customer/Barber role; customer booking/cancellation/rescheduling/attendance/QR/rating rules; barber and shop accuracy and service obligations; in-shop DZD payments outside Koupa; acceptable use; public information and ratings; notifications; suspension/deletion; third-party services; service availability; warranty/liability limits that do not remove mandatory rights; changes; Algerian law; and contact.

- [ ] **Step 4: Create the Arabic Account Deletion page**

Give two numbered methods: Profile -> Delete Account -> confirm, and an email fallback to `saadisamir20200@gmail.com` with subject `طلب حذف حساب كوپا`. Ask the user to write from the registered email and include the registered phone where applicable; explain reasonable identity verification. Clearly list cancellation/notification effects, deleted data, anonymized profile fields, deactivated services, removed shops/memberships, and retained anonymized historical appointment/rating/operational records. Do not promise a fixed deadline.

### Task 3: English Pages and Error Handling

**Files:**
- Create: `website/en/index.html`
- Create: `website/en/privacy/index.html`
- Create: `website/en/terms/index.html`
- Create: `website/en/account-deletion/index.html`
- Create: `website/404.html`

- [ ] **Step 1: Create equivalent English pages**

Translate the approved Arabic scope faithfully rather than shortening disclosures. Use `<html lang="en" dir="ltr">`, effective date `July 29, 2026`, canonical English URLs, and Arabic alternate links. Preserve the exact deletion email and describe the same deletion/anonymization behavior.

- [ ] **Step 2: Create a bilingual 404 page**

Provide concise Arabic and English not-found text with direct links to `/`, `/privacy/`, `/terms/`, and `/account-deletion/`. Do not use a Pages SPA fallback or `_redirects` catch-all.

- [ ] **Step 3: Run the structural verifier and confirm GREEN**

Run: `node website/check-site.cjs`

Expected: `Koupa legal site checks passed (9 pages).`

- [ ] **Step 4: Run repository hygiene checks**

Run:

```sh
rg -n "كوبا|example\.com|TODO|TBD" website
git diff --check -- website
```

Expected: `rg` has no matches and `git diff --check` has no output.

### Task 4: Browser and HTTP Verification

**Files:**
- Verify only: `website/**`

- [ ] **Step 1: Start a local static server**

Run: `npx serve website -l 4173`

Expected: server listens on `http://localhost:4173`.

- [ ] **Step 2: Verify local HTTP routes**

Request all eight document URLs and one asset URL. Expected: HTTP 200. Request `/missing-page`; expected: HTTP 404 serving `website/404.html`.

- [ ] **Step 3: Inspect desktop and mobile layouts**

Use Playwright at 1440x1000 and 390x844. Verify the Arabic index, Arabic long-form Privacy page, English Terms page, and Arabic Account Deletion page. Confirm no horizontal overflow, overlapping navigation, clipped email address, blank logo/font, or unreadable text; save screenshots as verification artifacts outside the committed website tree.

- [ ] **Step 4: Run final local checks**

Run `node website/check-site.cjs` again and confirm all checks pass after any visual corrections.

### Task 5: Cloudflare Deployment and Public Validation

**Files:**
- Deploy: `website/**`

- [ ] **Step 1: Reconfirm Cloudflare authentication**

Run: `npx wrangler whoami`

Expected: authenticated account with Pages write permission. Do not print or store OAuth material.

- [ ] **Step 2: Deploy the static directory**

Run:

```sh
npx wrangler pages deploy website --project-name koupa-website --branch main
```

Expected: Wrangler reports a successful deployment URL.

- [ ] **Step 3: Verify production URLs**

Request all eight URLs under `https://koupa-website.pages.dev`. Expected: HTTP 200, correct page-specific titles, language/direction attributes, canonical URLs, and account-deletion email. Request a unique missing path; expected: HTTP 404 with the branded 404 content rather than the homepage.

- [ ] **Step 4: Report Google Play URLs**

Return these production URLs:

```text
Privacy Policy: https://koupa-website.pages.dev/privacy/
Terms of Use: https://koupa-website.pages.dev/terms/
Account Deletion: https://koupa-website.pages.dev/account-deletion/
```

Also report the English equivalents and distinguish deployed HTTP/browser verification from legal review. Updating Supabase `legal_documents` rows or Google Play Console fields remains outside scope.
