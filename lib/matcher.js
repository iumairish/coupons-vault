// Domain-to-brand matching.
// Rules (in order of priority):
//   1. Strip "www." prefix from the current hostname.
//   2. Extract the registrable domain (e.g. "zalando.de" from "www.shop.zalando.de").
//   3. Check if any stored brand name appears in the hostname (case-insensitive),
//      or if the hostname appears in the brand name — handles "zalando.de" ↔ "Zalando".

const Matcher = (() => {
  // Returns the registrable domain: last two labels (handles .de, .com, .co.uk naively).
  // Good enough for Phase 1; not a full public-suffix-list parser.
  function extractDomain(hostname) {
    // Remove www. prefix
    const h = hostname.replace(/^www\./, '');
    // Known two-part TLDs
    const twoPartTLD = /\.(co\.uk|com\.au|co\.nz|org\.uk)$/;
    if (twoPartTLD.test(h)) {
      const parts = h.split('.');
      return parts.slice(-3).join('.');
    }
    const parts = h.split('.');
    return parts.slice(-2).join('.');
  }

  // Returns true if `hostname` plausibly belongs to `brand`.
  function matches(hostname, brand) {
    const domain = extractDomain(hostname).toLowerCase();
    const b = brand.toLowerCase().trim();

    // Direct: "zalando" is in "zalando.de", or "zalando.de" === domain
    if (domain === b) return true;
    if (domain.startsWith(b + '.')) return true;
    if (b.includes('.') && domain === b) return true;

    // Brand name contained in domain (e.g. brand "C&A" won't match this way — handled below)
    const domainBase = domain.split('.')[0];
    if (domainBase === b) return true;

    // Strip non-alphanumeric from brand for fuzzy compare ("C&A" → "ca", "c-and-a.com" → "canda")
    const normalize = s => s.replace(/[^a-z0-9]/g, '');
    if (normalize(domainBase) === normalize(b)) return true;

    return false;
  }

  // Given a hostname and an array of coupons, return matching active/expiring-soon coupons.
  // Matches against `brand` (fuzzy) and any entries in `brandUrls` (comma-separated).
  function findMatches(hostname, coupons) {
    return coupons.filter(c => {
      if (c.status === 'used') return false;
      const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
      if (isExpired) return false;
      if (matches(hostname, c.brand)) return true;
      if (c.brandUrls) {
        return c.brandUrls.split(',').some(u => matches(hostname, u.trim()));
      }
      return false;
    });
  }

  return { matches, findMatches, extractDomain };
})();
