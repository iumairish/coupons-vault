// Service worker — minimal for Phase 1.
// Storage is accessed directly by the popup and content script via chrome.storage.local.
// This file exists to satisfy the manifest and can grow in Phase 2 (e.g. alarm-based expiry checks).

chrome.runtime.onInstalled.addListener(() => {
  // Initialise storage with an empty coupons array if not already set
  chrome.storage.local.get('coupons', result => {
    if (!result.coupons) {
      chrome.storage.local.set({ coupons: [] });
    }
  });
});
