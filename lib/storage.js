// StorageProvider — abstraction over chrome.storage.local.
// Phase 2 can swap this out for a remote backend without touching call sites.

const StorageProvider = (() => {
  const KEY = 'coupons';

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  async function getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(KEY, result => {
        resolve(result[KEY] ?? []);
      });
    });
  }

  async function saveAll(coupons) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [KEY]: coupons }, resolve);
    });
  }

  // Upsert: if coupon.id exists → update, else → insert
  async function save(coupon) {
    const coupons = await getAll();

    if (coupon.id) {
      const idx = coupons.findIndex(c => c.id === coupon.id);
      if (idx !== -1) {
        coupons[idx] = { ...coupons[idx], ...coupon };
      } else {
        coupons.push(coupon);
      }
    } else {
      coupons.push({
        ...coupon,
        id: generateId(),
        dateAdded: new Date().toISOString(),
        status: coupon.status ?? 'active',
      });
    }

    await saveAll(coupons);
  }

  async function remove(id) {
    const coupons = await getAll();
    await saveAll(coupons.filter(c => c.id !== id));
  }

  return { getAll, save, delete: remove, saveAll };
})();
