# coupons-vault — Chrome Coupon Manager Extension

## Project Overview
A Chrome extension that stores discount/coupon codes (like a password manager) and surfaces the relevant code when the user visits a matching brand's website.

## Problem It Solves
User receives coupon codes via email from many brands (C&A, BestSecret, Zalando, Amazon, etc.), loses track of them in their inbox, and misses expiry dates. Currently copies codes manually into notes — not sustainable.

## Phased Roadmap

### Phase 1 (CURRENT SCOPE — build this now)
- Manual entry only, no email parsing, no backend.
- Manifest V3 Chrome extension.
- Local storage only (`chrome.storage.local`).

### Phase 2 (future — do not build yet, but keep architecture open for it)
- Auto-parse coupons from Gmail via Gmail API (OAuth).
- Sync to a real database/backend (e.g. Supabase/Firebase).
- Dedup logic for repeated codes.

### Phase 3 (future — do not build yet)
- Multi-user SaaS / premium tiers.
- Cross-browser support (Firefox, Edge).
- Usage analytics (money saved, most-used brands).

**Important:** Design Phase 1 code so storage and parsing are abstracted behind clean interfaces (e.g. a `StorageProvider` and a `CouponSource` interface), so Phase 2/3 can be added without a rewrite. But do not implement Phase 2/3 features now.

## Phase 1 — Functional Requirements

### Data model (per coupon)
```
id, brand, code, discountValue, discountType (percentage | flat | freeShipping),
expiryDate (nullable), minPurchase (nullable), terms (text, nullable),
sourceLink (nullable), dateAdded, status (active | expired | used)
```

### Features
1. **Add/Edit/Delete coupon** — form in the extension popup with all fields above. Only `brand` and `code` are required.
2. **List view** — all coupons, sorted by soonest expiry first. Visually distinguish:
   - Active (normal)
   - Expiring soon (e.g. within 3 days) — warning color
   - Expired — greyed out / moved to an "Expired" section, not deleted
3. **Site detection** — content script reads the current tab's domain and matches it against stored `brand` values (case-insensitive, fuzzy match e.g. "zalando.de" matches brand "Zalando").
4. **On-page badge** — if match(es) found, show a small floating badge/icon on the page (bottom-right corner, non-intrusive, dismissible per visit).
5. **Badge click → popover** — shows matching coupon(s) with code, value, expiry, terms.
6. **Fill button** — best-effort detection of a coupon/promo code input field on the page; clicking "Fill" inserts the code into that field. If no field is confidently detected, fall back to a "Copy" button instead. Never auto-fill without a user click.
7. **Mark as used** — manual action from the popup or badge popover.
8. **Export/Import CSV** — export all stored coupons to a CSV file (all fields from the data model). Import coupons back in from a CSV of the same format, for backup and for migrating data later (e.g. into Phase 2 storage). Import should skip/flag duplicate codes rather than silently double-adding.

### Non-functional requirements
- Manifest V3.
- No external network calls in Phase 1 — fully offline/local.
- No account/login in Phase 1.
- Clean, minimal UI — doesn't need to be fancy, but usable.

## Tech Stack
- Manifest V3 Chrome Extension
- **Vanilla JS + HTML + CSS — no framework. This applies across ALL phases (1, 2, and 3), not just V1.** Decision made deliberately: Phase 3 is extension-only with a paid tier unlocked (no separate web dashboard), so there's no case where a framework earns its cost. Do not introduce React/Vue/etc. unless the user explicitly changes this.
- `chrome.storage.local` for persistence (Phase 1); abstracted so a real DB/backend can be swapped in later (Phase 2+)
- Content script for site/domain detection + badge injection
- Popup UI for management (add/edit/list)

### Code structure guidance (to keep vanilla JS maintainable long-term)
- Keep UI rendering logic separate from data/storage logic
- Use small, single-purpose render functions per UI section (e.g. `renderCouponList()`, `renderForm()`) instead of one large script
- Avoid direct DOM spaghetti as features grow in Phase 2/3

## UI/Design Guidance
- No CSS framework/build step (no Tailwind, no compiler) — keep it dependency-free, consistent with the "no JS framework" decision.
- Use plain custom CSS with **design tokens defined once** in `:root` (e.g. `--color-primary`, `--color-warning`, `--spacing-sm`, `--font-size-base`) and reused throughout, instead of hardcoded values scattered across files.
- Do not ship default, unstyled browser HTML elements (bare `<button>`, `<input>`) — style them intentionally, even minimally. The goal is "clean and minimal by design," not "unstyled."
- Keep visual style simple: clear hierarchy, generous spacing, one accent color, readable type. No need for elaborate visuals — this is a utility popup, not a marketing page.
- Reuse the same token set/styling approach across the popup UI and the on-page badge for visual consistency.

## File Structure (suggested)
```
/manifest.json
/popup/
  popup.html
  popup.js
  popup.css
/content/
  content-script.js
  badge.css
/background/
  service-worker.js
/lib/
  storage.js       (StorageProvider abstraction)
  matcher.js        (domain <-> brand matching logic)
  fieldDetector.js   (finds coupon input fields on page)
/icons/
```

## Coding Preferences
- Keep code short, direct, and readable — avoid over-engineering for a V1 local-only tool.
- Comments: only where logic isn't obvious (e.g. domain-matching heuristics, field-detection heuristics). Do not comment self-explanatory code, obvious variable assignments, or restate what the code already says — write like a senior dev, not a junior dev narrating every line.
- No premature abstraction beyond what's needed to support Phase 2 swap-in later.

## Git Commit Guidelines
- Commit when a **meaningful change** is complete — a working feature, a fixed bug, a completed refactor.
- Do **not** commit for trivial changes: small tweaks, single-line edits, dependency bumps, formatting-only changes, WIP/incomplete work.
- Commit messages must be **one line, short, and in plain language** — no paragraphs, no technical implementation detail, no bullet lists in the message body.
  - Good: `Add coupon add/edit form to popup`
  - Good: `Show badge on matching site visit`
  - Bad: `Refactored storage.js to use async/await and added a new StorageProvider interface with get/set/delete methods for future backend compatibility`
- Use imperative mood (e.g. "Add", "Fix", "Update" — not "Added" or "Adding").
- If unsure whether a change is "meaningful" enough to commit, ask before committing rather than assuming.

## Testing Scope
- No full automated test suite for V1 — this is a small local-only tool where automated setup (mocking `chrome.storage`, `chrome.tabs`, DOM) isn't worth the overhead yet.
- **Do write lightweight unit tests for these two pure-logic pieces**, since bugs here are silent and costly:
  - CSV export/import round-trip (export → import → verify data integrity, including dedup handling)
  - Domain-to-brand matching logic (exact match, subdomain, "www." prefix, mismatch cases)
- Everything else (popup UI, content script badge injection, field detection on real sites) — test manually during development, not via automated tests.
- Revisit this scope in Phase 2/3 if real user data or payments are involved.

## Known Risks / Things to Keep in Mind
- **Permissions scope**: `<all_urls>` host permission is the broadest Chrome offers and gets extra Web Store scrutiny plus can look alarming to users, even though nothing leaves the device. Decide deliberately between `<all_urls>` vs. an allowlist of known retailer domains (safer, but needs manual updates as brands are added) — don't default to `<all_urls>` without discussing it.
- **Site compatibility is ongoing maintenance, not a one-time build**: coupon-field detection will break on some sites and needs updates as retailers change their checkout pages. The "Copy" fallback exists specifically because field detection won't work everywhere — that's expected, not a bug to over-engineer away.
- **Data loss risk**: local-only storage means data is lost if the user uninstalls, clears browser data, or switches machines. Since CSV export is the only backup mechanism in V1, treat "remind user to export periodically" as a real feature (e.g. a soft prompt if it's been a while since last export), not an afterthought.
- **Expiry date edge cases**: handle timezone consistently (don't silently mix UTC vs local time for "is this expired"), and handle coupons with **no expiry date** as a valid normal case, not a null-as-bug case.
- **Scope discipline**: stay strictly within the current phase's scope. Do not suggest, scaffold, or build Phase 2/3 features while working on Phase 1, even if related code would be "easy to add while I'm here."

## When Unsure — Always Ask, Never Assume
If there is any confusion, ambiguity, or more than one reasonable way to implement something (e.g. a design choice, a library/approach decision, a tradeoff between simplicity and robustness), **stop and ask the user which option they prefer instead of silently picking one and proceeding.** This applies to technical decisions, UX decisions, and scope decisions alike. Do not assume; confirm.

## Progress Tracking
This project uses `PROGRESS.md` to track state across sessions (since each session starts with no memory of prior ones).
- **At the start of every session**: read `PROGRESS.md` to see current phase, what's done, what's in progress, and what's next.
- **Before ending a session** (or after completing a meaningful chunk of work): update `PROGRESS.md` — move items between Done/In Progress/Next Up, log any new decisions in the Decisions Log, and note any open questions or known issues.
- Keep entries short and factual — this is a status tracker, not documentation.

## Out of Scope for Now
- Gmail/email parsing
- Any backend or cloud database
- User accounts, auth, payments
- Cross-browser builds
