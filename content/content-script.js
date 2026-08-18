// Content script — detects matching coupons for the current site and injects the badge.
// Matcher is loaded before this file via manifest content_scripts js array.

(async () => {
  const hostname = location.hostname;
  const result = await chrome.storage.local.get('coupons');
  const coupons = result.coupons ?? [];

  const matches = Matcher.findMatches(hostname, coupons);
  if (matches.length === 0) return;

  injectBadge(matches);
})();

function injectBadge(coupons) {
  if (document.getElementById('cv-badge')) return; // already injected

  const badge = document.createElement('div');
  badge.id = 'cv-badge';
  badge.setAttribute('role', 'button');
  badge.setAttribute('aria-label', `${coupons.length} coupon(s) available`);
  badge.textContent = coupons.length.toString();
  badge.title = 'Coupons Vault — click to see codes';

  badge.addEventListener('click', () => togglePopover(badge, coupons));

  document.body.appendChild(badge);
}

function togglePopover(badge, coupons) {
  const existing = document.getElementById('cv-popover');
  if (existing) {
    existing.remove();
    return;
  }

  const popover = document.createElement('div');
  popover.id = 'cv-popover';
  popover.innerHTML = buildPopoverHTML(coupons);

  // Dismiss button
  popover.querySelector('#cv-popover-close').addEventListener('click', (e) => {
    e.stopPropagation();
    popover.remove();
  });

  // Fill / Copy buttons
  popover.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cv-action]');
    if (!btn) return;
    const action = btn.dataset.cvAction;
    const code = btn.dataset.cvCode;

    if (action === 'fill') fillCode(code, btn);
    if (action === 'copy') copyCode(code, btn);
  });

  document.body.appendChild(popover);
}

function buildPopoverHTML(coupons) {
  const items = coupons.map(c => {
    const expiry = c.expiryDate
      ? `Expires ${new Date(c.expiryDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';

    return `
      <div class="cv-coupon">
        <div class="cv-coupon__code">${escHtml(c.code)}</div>
        <div class="cv-coupon__meta">
          ${c.discountValue ? `<span>${formatDiscount(c)}</span>` : ''}
          ${expiry ? `<span>${escHtml(expiry)}</span>` : ''}
          ${c.terms ? `<span>${escHtml(c.terms)}</span>` : ''}
        </div>
        <div class="cv-coupon__actions">
          <button class="cv-btn" data-cv-action="fill" data-cv-code="${escAttr(c.code)}">Fill</button>
          <button class="cv-btn cv-btn--secondary" data-cv-action="copy" data-cv-code="${escAttr(c.code)}">Copy</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="cv-popover__header">
      <span>Coupons for this site</span>
      <button id="cv-popover-close" class="cv-close" aria-label="Close">✕</button>
    </div>
    ${items}
  `;
}

function fillCode(code, btn) {
  // FieldDetector is not loaded in the content script js array yet (added in a later step).
  // Graceful fallback for now.
  const field = typeof FieldDetector !== 'undefined' ? FieldDetector.detect() : null;
  if (field) {
    field.focus();
    field.value = code;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    btn.textContent = 'Filled!';
    setTimeout(() => { btn.textContent = 'Fill'; }, 1500);
  } else {
    copyCode(code, btn);
  }
}

function copyCode(code, btn) {
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = btn.dataset.cvAction === 'fill' ? 'Fill' : 'Copy'; }, 1500);
  });
}

function formatDiscount(c) {
  if (c.discountType === 'percentage') return `${c.discountValue}% off`;
  if (c.discountType === 'flat') return `€${c.discountValue} off`;
  if (c.discountType === 'freeShipping') return 'Free shipping';
  return '';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
