# Koupa Product Landing Page Design

## Design Read

Arabic-first bilingual product landing page for Algerian customers and barbers, with a calm premium-consumer language and a restrained editorial product-gallery system.

## Goal

Turn the Arabic homepage of the static Cloudflare site into a product landing page for Koupa while preserving the existing legal document routes and English equivalents. The page should communicate the real app experience through the supplied product screenshots, each presented as a phone mockup with a short caption.

## Scope

In scope:

- Replace `website/index.html` with a product landing page.
- Extend `website/assets/styles.css` with landing-only layout, phone-frame, gallery, responsive, and accessibility styles.
- Copy the seven supplied app screenshots into `website/assets/screens/` with stable descriptive filenames.
- Keep `/privacy/`, `/terms/`, `/account-deletion/`, `/en/`, and their existing document pages working.
- Update the Arabic and English homepage metadata, canonical links, language links, and navigation.
- Validate all local pages and the Cloudflare Pages static-site checker.

Out of scope:

- Changes to the Expo app UI or routing.
- Authentication, booking, download, analytics, or backend integrations.
- Cloudflare deployment, DNS, or project settings.
- Rewriting legal document content.

## Homepage Structure

1. **Header**
   - Koupa wordmark and product descriptor.
   - Links to customer experience, barber experience, legal pages, and English.
   - Compact responsive navigation on narrow screens.

2. **Hero**
   - Teal brand band with the product name as the primary signal.
   - Arabic-first headline centered on clear appointment booking.
   - Supporting copy describing discovery, booking, attendance, and shop operations.
   - One primary in-page CTA to the product gallery and secondary links to legal information.

3. **Product Gallery**
   - All seven screenshots rendered as real images inside CSS phone frames.
   - Each frame has an accessible alt description and a caption below it.
   - Desktop uses a balanced multi-column grid with intentional variation in size and spacing.
   - Mobile uses a readable one-column/snap layout; screenshots are never shrunk into an unreadable collage.
   - Captions explain the user outcome, not implementation details.

4. **Customer and barber journeys**
   - Two restrained content bands explaining the customer and barber value separately.
   - Reuse gallery anchors rather than adding decorative cards or fabricated UI.

5. **Closing CTA and footer**
   - A concise final product statement.
   - Links to privacy, terms, account deletion, contact, and English.

## Visual System

- Reuse the existing Koupa teal, gold accent, ink, muted text, canvas, and IBM Plex Sans Arabic assets.
- Use the existing low-radius language for framed items; phone frames may use a larger radius because they represent a physical device.
- Use solid color bands and real screenshots; no decorative gradient orbs, bokeh, or fake dashboard illustrations.
- Keep text and controls high contrast in both Arabic and English.
- Use subtle hover/focus states only; respect `prefers-reduced-motion`.

## Content and Localization

- Arabic is the default homepage language and English is linked at `/en/`.
- Do not invent production customer or barber names in captions.
- Captions remain short enough to fit within mobile cards.
- Preserve the brand spelling `كوپا` wherever Arabic brand text appears.

## Accessibility and Responsive Behavior

- Use semantic `header`, `nav`, `main`, `section`, and `footer` elements.
- Provide a skip link and visible keyboard focus states.
- Give every screenshot meaningful alt text; decorative logo treatment stays empty-alt where appropriate.
- Ensure phone frames, captions, and links remain readable from 320px upward.
- Use logical CSS properties for RTL layout and avoid fixed viewport assumptions.
- Keep interactive targets at least 44px high.

## Verification

- Run `node website/check-site.cjs`.
- Serve the static website locally and verify `/`, `/privacy/`, `/terms/`, `/account-deletion/`, `/en/`, `/en/privacy/`, `/en/terms/`, and `/en/account-deletion/` return 200.
- Inspect the homepage at desktop and narrow mobile widths for overflow, broken image paths, contrast, and caption wrapping.
- Run `git diff --check`.
- Do not claim a Cloudflare deployment; deployment remains a separate user-authorized action.
