# Koupa Product Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static legal-center homepage with an Arabic-first bilingual Koupa product landing page that presents all supplied app screenshots in responsive phone frames while preserving every legal route.

**Architecture:** Keep the existing static HTML/Cloudflare Pages architecture. The Arabic and English homepages share one stylesheet and one screenshot asset set; legal pages remain unchanged except for shared navigation expectations. The homepage uses semantic sections and CSS-only responsive behavior, with no runtime JavaScript or external assets.

**Tech Stack:** Static HTML, shared CSS, IBM Plex Sans Arabic, local JPEG assets, Node `check-site.cjs`, Cloudflare Pages.

---

### Task 1: Add the supplied product screenshots

**Files:**
- Create: `website/assets/screens/role-selection.jpg`
- Create: `website/assets/screens/customer-home.jpg`
- Create: `website/assets/screens/customer-appointments.jpg`
- Create: `website/assets/screens/customer-find.jpg`
- Create: `website/assets/screens/barber-today.jpg`
- Create: `website/assets/screens/barber-shop.jpg`
- Create: `website/assets/screens/barber-schedule.jpg`
- Modify: `website/check-site.cjs`

- [ ] **Step 1: Copy the exact user-provided images into stable paths**

```bash
mkdir -p website/assets/screens
cp /tmp/paseo-attachments-UR7p6p/deddcf600c44916866f11449dd5eaec177740899c95789300b8cb0739ad3be5f.jpg website/assets/screens/role-selection.jpg
cp /tmp/paseo-attachments-UR7p6p/17ad43d96bab08f73500d40d3dfd7421dd8b425a7a74c81d25253e29c135d507.jpg website/assets/screens/customer-home.jpg
cp /tmp/paseo-attachments-UR7p6p/5b42781a0248cc4712a93aca1301c74c33bc53cbf672260226f4fca158f8c5d5.jpg website/assets/screens/customer-appointments.jpg
cp /tmp/paseo-attachments-UR7p6p/dfc480528c1cf5e2441ef74f8ffc381405bd92dc9d3f0e86f89028b975599fe9.jpg website/assets/screens/customer-find.jpg
cp /tmp/paseo-attachments-UR7p6p/ce24b331350c107399ca0db9decdcf3a71a92b5e0fb2e4ee3b58bd1c7ffb7bde.jpg website/assets/screens/barber-today.jpg
cp /tmp/paseo-attachments-UR7p6p/cd59a4c935d7587d1ebc3558b05ae8cc287df47dbc7dc86b0a75c46ee0f1157e.jpg website/assets/screens/barber-shop.jpg
cp /tmp/paseo-attachments-UR7p6p/7b8e957a7e371117a09f4aa36a45fca98d3c5a1d974ad7c5104b1ebf8db44659.jpg website/assets/screens/barber-schedule.jpg
```

- [ ] **Step 2: Validate image files and dimensions**

Run `file website/assets/screens/*.jpg`. Expected: seven valid portrait-oriented JPEG files.

- [ ] **Step 3: Add all seven screenshot paths to the static checker**

Extend the checker asset list with the seven `assets/screens/*.jpg` paths so a missing image fails `node website/check-site.cjs`.

### Task 2: Build the Arabic homepage

**Files:**
- Modify: `website/index.html`

- [ ] **Step 1: Replace legal-center metadata and navigation**

Keep Arabic RTL, canonical `/`, and English alternate `/en/`. Link navigation to `#product`, `#customers`, `#barbers`, `/privacy/`, `/terms/`, `/account-deletion/`, and `/en/`.

- [ ] **Step 2: Add the semantic landing sections**

Implement one header, one main, and one footer containing a teal hero, a `#product` gallery with seven figures, customer and barber journey bands, a closing CTA, and the existing legal/contact links. Every figure must use a local screenshot path, meaningful Arabic alt text, a phone-frame wrapper, a caption heading, and one short outcome sentence.

- [ ] **Step 3: Keep copy production-safe**

Use `كوپا` consistently, avoid fake account names and `example.com`, and do not add app-store URLs that do not exist.

### Task 3: Build the English homepage counterpart

**Files:**
- Modify: `website/en/index.html`

- [ ] **Step 1: Mirror the Arabic structure in English LTR**

Use the same section IDs and screenshot paths, English headings/captions, canonical `/en/`, Arabic alternate `/`, and navigation to `/en/privacy/`, `/en/terms/`, and `/en/account-deletion/`.

- [ ] **Step 2: Keep both homepages structurally equivalent**

Both pages must expose one `h1`, seven screenshot figures, a visible language link, and the same customer/barber product sections.

### Task 4: Add responsive landing styles

**Files:**
- Modify: `website/assets/styles.css`

- [ ] **Step 1: Add scoped landing tokens and layout styles**

Add `.landing-*` styles using the existing color tokens and IBM Plex Sans Arabic font. Define the teal hero, landing header, section widths, journey bands, phone frames, screenshot images, captions, CTA styles, and footer spacing without changing existing legal document classes.

- [ ] **Step 2: Define desktop gallery behavior**

Use a three-column or four-column grid at wide widths. Phone frames need stable portrait dimensions, visible borders, and enough whitespace for captions; screenshots must remain inspectable and not be cropped into unreadable thumbnails.

- [ ] **Step 3: Define mobile behavior**

Below 760px, stack hero content, make navigation horizontally scrollable, and use a readable one-column/snap gallery. Below 560px, reduce padding and type while preserving 44px targets and preventing horizontal page overflow.

- [ ] **Step 4: Add accessibility states**

Keep visible focus rings, high-contrast CTA text, reduced-motion behavior, and logical RTL/LTR spacing.

### Task 5: Verify the website

**Files:**
- Test: `website/check-site.cjs`
- Verify: all modified website files and screenshot assets

- [ ] **Step 1: Run the structural checker**

Run `node website/check-site.cjs`. Expected: the checker reports all nine site pages passing.

- [ ] **Step 2: Serve and check every route locally**

Serve from `website/` and verify HTTP 200 for `/`, `/privacy/`, `/terms/`, `/account-deletion/`, `/en/`, `/en/privacy/`, `/en/terms/`, and `/en/account-deletion/`, plus HTTP 200 for each screenshot asset.

- [ ] **Step 3: Inspect responsive rendering**

Check the homepage at a laptop viewport and a 320px-wide mobile viewport. Confirm hero, phone frames, captions, navigation, CTA, and footer do not overlap or overflow.

- [ ] **Step 4: Run whitespace validation**

```bash
git diff --check
```

Expected: no output and exit code 0.
