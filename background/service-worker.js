// Service worker — minimal for Phase 1.
// Storage is accessed directly by the popup and content script via chrome.storage.local.
// This file exists to satisfy the manifest and can grow in Phase 2 (e.g. alarm-based expiry checks).

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('coupons', result => {
    if (!result.coupons) {
      chrome.storage.local.set({ coupons: [] });
    }
  });
});

// Set the toolbar badge when the content script reports matching coupons
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action !== 'updateBadge') return;
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.count > 0) {
    chrome.action.setBadgeText({ text: String(msg.count), tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4f6ef7', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// Clear the badge when the tab navigates to a new URL.
// Checking changeInfo.url (only present on actual URL changes) avoids clearing
// the badge on sub-resource loads and dynamic page activity that also fire 'loading'.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
