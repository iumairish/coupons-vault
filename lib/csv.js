// CSV export and import for coupon data.
// Kept as pure functions (no chrome.* calls) so they're straightforward to unit-test.

const CSV = (() => {
  const FIELDS = [
    'id', 'brand', 'code', 'discountValue', 'discountType',
    'expiryDate', 'minPurchase', 'terms', 'sourceLink', 'dateAdded', 'status',
  ];

  // ── Export ──────────────────────────────────────────────────────────────────

  function exportCoupons(coupons) {
    const rows = [FIELDS.join(',')];
    for (const c of coupons) {
      rows.push(FIELDS.map(f => csvCell(c[f] ?? '')).join(','));
    }
    return rows.join('\r\n');
  }

  // Wraps a value in quotes and escapes internal quotes per RFC 4180
  function csvCell(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  // Returns { imported: Coupon[], skipped: string[] }
  // Skips rows whose `code` already exists in `existingCoupons` (dedup by code, case-insensitive).
  function importCoupons(csvText, existingCoupons) {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return { imported: [], skipped: [] };

    const header = rows[0].map(h => h.trim());
    const existingCodes = new Set(existingCoupons.map(c => c.code.toLowerCase()));

    const imported = [];
    const skipped = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      if (cells.every(c => c === '')) continue; // skip blank rows

      const coupon = {};
      for (let j = 0; j < header.length; j++) {
        coupon[header[j]] = cells[j] ?? '';
      }

      // Normalise numeric fields back to numbers (or null)
      coupon.discountValue = coupon.discountValue !== '' ? parseFloat(coupon.discountValue) : null;
      coupon.minPurchase   = coupon.minPurchase   !== '' ? parseFloat(coupon.minPurchase)   : null;

      // Normalise optional text fields to null
      for (const f of ['expiryDate', 'terms', 'sourceLink']) {
        if (coupon[f] === '') coupon[f] = null;
      }

      if (!coupon.code) {
        skipped.push(`Row ${i + 1}: missing code`);
        continue;
      }

      if (existingCodes.has(coupon.code.toLowerCase())) {
        skipped.push(coupon.code);
        continue;
      }

      existingCodes.add(coupon.code.toLowerCase());
      imported.push(coupon);
    }

    return { imported, skipped };
  }

  // Minimal RFC 4180-compliant CSV parser (handles quoted fields with embedded commas/newlines)
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let i = 0;
    const n = text.length;

    while (i < n) {
      if (text[i] === '"') {
        // Quoted field
        let field = '';
        i++; // skip opening quote
        while (i < n) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 2; } // escaped quote
            else { i++; break; } // closing quote
          } else {
            field += text[i++];
          }
        }
        row.push(field);
        // Skip comma or line ending after closing quote
        if (text[i] === ',') i++;
      } else {
        // Unquoted field — read until comma or line ending
        let field = '';
        while (i < n && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          field += text[i++];
        }
        row.push(field);
        if (text[i] === ',') i++;
      }

      // End of row
      if (i >= n || text[i] === '\r' || text[i] === '\n') {
        rows.push(row);
        row = [];
        if (text[i] === '\r' && text[i + 1] === '\n') i += 2;
        else if (text[i] === '\r' || text[i] === '\n') i++;
      }
    }

    // Trailing row without newline
    if (row.length > 0) rows.push(row);

    return rows;
  }

  return { exportCoupons, importCoupons, FIELDS };
})();
