# Progress — coupons-vault

Track what's built, in progress, and next. Claude Code should read this at the start of a session and update it before ending one.

## Current Phase
Phase 1 — Manual entry, local storage only

## Status
In progress

## Done
- Set up manifest.json + basic extension skeleton
- Build data model + storage.js (StorageProvider abstraction)
- Build popup UI: add/edit/delete coupon form (HTML + CSS + JS wired up)
- Build popup UI: coupon list view (sorted by expiry, status colors — active/warning/expired sections)
- Build content script: domain detection + matching logic (matcher.js + content-script.js)
- Build on-page badge + popover (badge injected, popover with Fill/Copy per coupon)
- Build "Fill" / "Copy" button logic (field detection stub in fieldDetector.js; fill falls back to copy if no field detected)

## In Progress
- (nothing currently)

## Next Up
- Build CSV export
- Build CSV import (with dedup handling)
- Add unit tests: domain matching
- Add unit tests: CSV round-trip
- Wire up fieldDetector.js into the content script js array in manifest (currently graceful fallback)
- Add icons (extension currently shows Chrome default icon)

## Known Issues / Open Questions
- No icons yet — Chrome will show default icon during development
- fieldDetector.js is not yet in the manifest content_scripts js array; content-script.js checks `typeof FieldDetector !== 'undefined'` and falls back to copy if absent

## Decisions Log
Short notes on key choices made along the way, so future sessions don't re-litigate them.
- Vanilla JS/HTML/CSS across all phases (no framework) — extension-only, no separate dashboard planned
- Local storage (chrome.storage.local) for V1, abstracted for future DB swap-in
- CSV export/import for backup + future migration path
- Host permissions: switched to <all_urls> — allowlist was impractical since new coupon brands couldn't trigger the badge without a manifest update
- No ES modules in content scripts — matcher.js loaded via manifest js array into shared global scope
- Popup uses plain script tags (storage.js loaded first, then popup.js) — no bundler needed
- StorageProvider exposed as a global IIFE (not a module) so it works in both popup and can be reused elsewhere without a bundler
