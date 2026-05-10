const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function ymKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Last `monthsBack` calendar months including current, with fee totals (non-archived entries only). */
export function monthlyFeeTotals(entries, monthsBack = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: ymKey(d),
      label: MONTH_LABELS[d.getMonth()],
      total: 0,
      count: 0,
    });
  }
  const keyOrder = new Map(buckets.map((b, idx) => [b.key, idx]));
  for (const e of entries) {
    if (e.is_archived) continue;
    const dt = new Date(e.date_time);
    const key = ymKey(dt);
    const idx = keyOrder.get(key);
    if (idx === undefined) continue;
    const fee = Number(e.fees);
    buckets[idx].total += Number.isFinite(fee) ? fee : 0;
    buckets[idx].count += 1;
  }
  return buckets;
}

/** Last four calendar quarters ending with the quarter that contains `now`, summed fees (non-archived). */
export function quarterlyFeeTotals(entries, now = new Date()) {
  const out = [];
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3);

  for (let i = 3; i >= 0; i -= 1) {
    let tq = q - i;
    let ty = y;
    while (tq < 0) {
      tq += 4;
      ty -= 1;
    }
    const startMonth = tq * 3;
    const start = new Date(ty, startMonth, 1);
    const end = new Date(ty, startMonth + 3, 0, 23, 59, 59, 999);
    let total = 0;
    for (const e of entries) {
      if (e.is_archived) continue;
      const dt = new Date(e.date_time);
      if (dt >= start && dt <= end) total += Number(e.fees) || 0;
    }
    out.push({
      label: `${ty} Q${tq + 1}`,
      total,
    });
  }
  return out;
}

export function notarialTypeCounts(entries, { archivedOnly = false } = {}) {
  const counts = { ACK: 0, SUB: 0, CERT: 0 };
  for (const e of entries) {
    if (archivedOnly !== Boolean(e.is_archived)) continue;
    if (counts[e.notarial_type] != null) counts[e.notarial_type] += 1;
  }
  return counts;
}

export function remarksCounts(entries, activeOnly = true) {
  let cr = 0;
  let ncr = 0;
  for (const e of entries) {
    if (activeOnly && e.is_archived) continue;
    if (e.remarks === 'CR') cr += 1;
    else if (e.remarks === 'NCR') ncr += 1;
  }
  return { cr, ncr, total: cr + ncr };
}

export function sumFees(entries, activeOnly = true) {
  let s = 0;
  for (const e of entries) {
    if (activeOnly && e.is_archived) continue;
    const fee = Number(e.fees);
    if (Number.isFinite(fee)) s += fee;
  }
  return s;
}

/** Month-over-month delta for entry counts (non-archived). */
export function entryCountMomDelta(entries) {
  const now = new Date();
  const thisKey = ymKey(now);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const prevKey = ymKey(prev);
  let cur = 0;
  let prevC = 0;
  for (const e of entries) {
    if (e.is_archived) continue;
    const k = ymKey(new Date(e.date_time));
    if (k === thisKey) cur += 1;
    if (k === prevKey) prevC += 1;
  }
  if (!prevC) return null;
  return ((cur - prevC) / prevC) * 100;
}

export function revenueMomDelta(entries) {
  const m = monthlyFeeTotals(entries, 2);
  if (m.length < 2) return null;
  const [a, b] = m;
  const prev = a.total;
  const cur = b.total;
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}
