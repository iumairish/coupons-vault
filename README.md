# Coupons Vault

A Chrome extension that stores discount/coupon codes and automatically surfaces the right one when you visit a matching retailer — no more digging through emails for expired codes.

## Features

- **Add, edit, delete coupons** — store brand, code, discount value, expiry date, min. purchase, and terms
- **Brand URL matching** — link specific domains (e.g. `amazon.de, amazon.com`) to a coupon so it shows up on the right site automatically
- **Smart list view** — coupons sorted by soonest expiry; expiring-soon coupons highlighted, expired ones separated
- **Toolbar badge** — icon shows a count when you're on a site with matching coupons
- **On-page badge & popover** — floating button appears on matching sites; click to see codes, fill the promo field, or copy the code
- **Fill button** — detects the coupon input field on checkout pages and fills it in one click; falls back to Copy if no field is found
- **Site-aware popup** — popup auto-filters to show only relevant coupons for the current site, with a back button to see all
- **Mark as used** — manually retire a coupon without deleting it
- **CSV export / import** — back up all coupons to a CSV file and restore them later; import updates existing coupons by code and adds new ones

## Tech

Vanilla JS + HTML + CSS. No framework, no build step, no external dependencies. Data stored locally via `chrome.storage.local` — nothing leaves your device.

## Installation

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder
