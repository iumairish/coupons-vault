// Heuristic detection of coupon/promo code input fields on checkout pages.
// Returns the best candidate <input> element, or null if none found with confidence.

const FieldDetector = (() => {
  // Scored attribute keywords — higher = more likely a promo/coupon field
  const KEYWORDS = [
    'coupon', 'promo', 'voucher', 'discount', 'code', 'gutschein',
    'rabatt', 'aktionscode', 'promocode', 'gift',
  ];

  function scoreElement(el) {
    if (el.tagName !== 'INPUT') return 0;
    if (el.type && !['text', 'search', ''].includes(el.type)) return 0;
    if (el.disabled || el.readOnly) return 0;

    const haystack = [
      el.id, el.name, el.placeholder, el.className,
      el.getAttribute('aria-label') ?? '',
      el.getAttribute('data-testid') ?? '',
    ].join(' ').toLowerCase();

    return KEYWORDS.reduce((score, kw) => score + (haystack.includes(kw) ? 1 : 0), 0);
  }

  function detect() {
    const inputs = Array.from(document.querySelectorAll('input'));
    let best = null;
    let bestScore = 0;

    for (const el of inputs) {
      const score = scoreElement(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    // Require at least one keyword match to avoid misfiring on random inputs
    return bestScore >= 1 ? best : null;
  }

  return { detect };
})();
