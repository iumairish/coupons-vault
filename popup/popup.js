// Popup entry point — wires up UI events and initial render

const formSection = document.getElementById('form-section');
const listSection = document.getElementById('list-section');
const couponList = document.getElementById('coupon-list');
const emptyState = document.getElementById('empty-state');
const couponForm = document.getElementById('coupon-form');

let editingId = null;       // null = adding new, string = editing existing
let currentHostname = null; // hostname of the active tab, detected on load
let filterActive = false;   // true = show only coupons matching currentHostname

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

async function init() {
  currentHostname = await getActiveTabHostname();
  await renderCouponList();

  document.getElementById('btn-add').addEventListener('click', () => openForm(null));
  document.getElementById('btn-cancel').addEventListener('click', closeForm);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('import-file').addEventListener('change', handleImport);
  document.getElementById('btn-show-all').addEventListener('click', () => {
    filterActive = false;
    renderCouponList();
  });
  couponForm.addEventListener('submit', handleSave);
}

async function getActiveTabHostname() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        const url = tabs[0]?.url;
        resolve(url ? new URL(url).hostname : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// ── List rendering ────────────────────────────────────────────────────────────

async function renderCouponList() {
  const allCoupons = await StorageProvider.getAll();
  couponList.innerHTML = '';

  // Decide whether to filter
  const matched = currentHostname ? Matcher.findMatches(currentHostname, allCoupons) : [];
  const hasMatches = matched.length > 0;

  if (hasMatches && !filterActive) {
    filterActive = true; // auto-activate filter when landing on a matching site
  }

  // Update filter bar
  const filterBar = document.getElementById('filter-bar');
  const filterLabel = document.getElementById('filter-label');
  if (filterActive && currentHostname) {
    filterBar.classList.remove('hidden');
    filterLabel.textContent = `Showing for ${currentHostname}`;
  } else {
    filterBar.classList.add('hidden');
  }

  const coupons = filterActive ? matched : allCoupons;

  if (coupons.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const now = new Date();
  const warnMs = 3 * 24 * 60 * 60 * 1000; // 3 days

  const active = [];
  const expired = [];

  for (const c of coupons) {
    if (c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < now)) {
      expired.push(c);
    } else {
      active.push(c);
    }
  }

  // Sort active: soonest expiry first, then no-expiry at the end
  active.sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

  if (active.length > 0) {
    couponList.appendChild(makeSectionLabel('Active'));
    for (const c of active) {
      const expiresAt = c.expiryDate ? new Date(c.expiryDate) : null;
      const isWarn = expiresAt && (expiresAt - now) <= warnMs && expiresAt > now;
      couponList.appendChild(makeCouponItem(c, isWarn ? 'warning' : 'active'));
    }
  }

  if (expired.length > 0) {
    couponList.appendChild(makeSectionLabel('Expired'));
    for (const c of expired) {
      couponList.appendChild(makeCouponItem(c, 'expired'));
    }
  }
}

function makeSectionLabel(text) {
  const el = document.createElement('p');
  el.className = 'list-section-label';
  el.textContent = text;
  return el;
}

function makeCouponItem(c, state) {
  const item = document.createElement('div');
  item.className = 'coupon-item' + (state !== 'active' ? ` coupon-item--${state}` : '');
  if (c.status === 'used') item.classList.add('coupon-item--used');

  const expiryLabel = formatExpiry(c.expiryDate, state);

  item.innerHTML = `
    <div class="coupon-item__header">
      <span class="coupon-item__brand">${esc(c.brand)}</span>
      <div class="coupon-item__actions">
        <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn btn--ghost btn--sm" data-action="mark-used" data-id="${c.id}"
          ${c.status === 'used' ? 'disabled' : ''}>Used</button>
        <button class="btn btn--danger btn--sm" data-action="delete" data-id="${c.id}">✕</button>
      </div>
    </div>
    <div class="coupon-item__code-row">
      <span class="coupon-item__code">${esc(c.code)}</span>
      <button class="btn btn--ghost btn--sm" data-action="copy" data-id="${c.id}" data-code="${esc(c.code)}">Copy</button>
    </div>
    <div class="coupon-item__meta">
      ${c.discountValue ? `<span>${formatDiscount(c)}</span>` : ''}
      ${expiryLabel}
      ${c.minPurchase ? `<span>Min. €${c.minPurchase}</span>` : ''}
    </div>
  `;

  item.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') openForm(id);
    if (action === 'copy') copyCode(btn);
    if (action === 'mark-used') markUsed(id);
    if (action === 'delete') deleteCoupon(id);
  });

  return item;
}

function formatExpiry(dateStr, state) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  if (state === 'expired') return `<span class="expiry--expired">Expired ${label}</span>`;
  if (state === 'warning') return `<span class="expiry--warning">Expires ${label}</span>`;
  return `<span>Expires ${label}</span>`;
}

function formatDiscount(c) {
  if (c.discountType === 'percentage') return `${c.discountValue}% off`;
  if (c.discountType === 'flat') return `€${c.discountValue} off`;
  if (c.discountType === 'freeShipping') return 'Free shipping';
  return '';
}

// Minimal XSS guard for values inserted via innerHTML
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Form ──────────────────────────────────────────────────────────────────────

function openForm(id) {
  editingId = id;
  couponForm.reset();

  if (id) {
    StorageProvider.getAll().then(coupons => {
      const c = coupons.find(x => x.id === id);
      if (!c) return;
      couponForm.brand.value = c.brand;
      couponForm.code.value = c.code;
      couponForm.discountValue.value = c.discountValue ?? '';
      couponForm.discountType.value = c.discountType ?? 'percentage';
      couponForm.expiryDate.value = c.expiryDate ?? '';
      couponForm.minPurchase.value = c.minPurchase ?? '';
      couponForm.brandUrls.value = c.brandUrls ?? '';
      couponForm.terms.value = c.terms ?? '';
    });
  }

  formSection.classList.remove('hidden');
  listSection.classList.add('hidden');
  couponForm.brand.focus();
}

function closeForm() {
  editingId = null;
  formSection.classList.add('hidden');
  listSection.classList.remove('hidden');
}

async function handleSave(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(couponForm));

  const coupon = {
    brand: data.brand.trim(),
    code: data.code.trim(),
    discountValue: data.discountValue ? parseFloat(data.discountValue) : null,
    discountType: data.discountType || 'percentage',
    expiryDate: data.expiryDate || null,
    minPurchase: data.minPurchase ? parseFloat(data.minPurchase) : null,
    brandUrls: data.brandUrls.trim() || null,
    terms: data.terms.trim() || null,
  };

  await StorageProvider.save({ ...coupon, id: editingId });
  closeForm();
  await renderCouponList();
}

// ── Actions ───────────────────────────────────────────────────────────────────

function copyCode(btn) {
  const code = btn.dataset.code;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
}

async function markUsed(id) {
  const coupons = await StorageProvider.getAll();
  const c = coupons.find(x => x.id === id);
  if (!c) return;
  await StorageProvider.save({ ...c, status: 'used' });
  await renderCouponList();
}

async function deleteCoupon(id) {
  await StorageProvider.delete(id);
  await renderCouponList();
}

// ── CSV export ────────────────────────────────────────────────────────────────

async function handleExport() {
  const coupons = await StorageProvider.getAll();
  if (coupons.length === 0) {
    alert('No coupons to export.');
    return;
  }

  const csvText = CSV.exportCoupons(coupons);
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `coupons-vault-${datestamp()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function datestamp() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── CSV import ────────────────────────────────────────────────────────────────

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const existing = await StorageProvider.getAll();
  const { toInsert, toUpdate, invalid } = CSV.importCoupons(text, existing);

  for (const coupon of toInsert) {
    const { id: _id, ...rest } = coupon; // drop exported id; storage assigns a fresh one
    await StorageProvider.save(rest);
  }

  for (const coupon of toUpdate) {
    await StorageProvider.save(coupon); // has existing id → storage overwrites in-place
  }

  e.target.value = ''; // reset so same file can be re-selected
  await renderCouponList();
  showImportStatus(toInsert.length, toUpdate.length, invalid);
}

function showImportStatus(insertedCount, updatedCount, invalid) {
  const el = document.getElementById('import-status');
  const parts = [];

  if (insertedCount > 0) parts.push(`${insertedCount} added`);
  if (updatedCount > 0) parts.push(`${updatedCount} updated`);
  if (invalid.length > 0) parts.push(`${invalid.length} invalid`);
  if (insertedCount === 0 && updatedCount === 0) parts.push('Nothing to import');

  el.textContent = parts.join(' · ');
  el.className = 'import-status';
  el.classList.toggle('import-status--warn', insertedCount === 0 && updatedCount === 0);

  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 4000);
}
