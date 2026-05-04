// ── Shared helpers ───────────────────────────────────────────────────────────
function deterministicVariance(dateStr, terminal, salt = 0) {
  let hash = 0;
  const str = dateStr + terminal + salt;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

const START_DATE = new Date('2025-01-01');
const END_DATE   = new Date('2025-12-31');

function dateRange() {
  const dates = [];
  for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().slice(0, 10));
  }
  return dates;
}
const DATES = dateRange();

// Terminal base passenger volumes (daily avg)
const TERMINAL_BASE_PAX = {
  "Terminal 1 – Domestic":     6_800,
  "Terminal 2 – International":2_400,
  "Mauka Concourse":           3_200,
  "Interisland Terminal":      1_600,
};

// Terminal intl % base
const TERMINAL_INTL_BASE = {
  "Terminal 1 – Domestic":     0.04,
  "Terminal 2 – International":0.82,
  "Mauka Concourse":           0.45,
  "Interisland Terminal":      0.01,
};

// Carrier terminal affinity weights [Hawaiian, United, Delta, JAL, ANA, Korean Air]
const TERMINAL_CARRIER_WEIGHTS = {
  "Terminal 1 – Domestic":     [0.55, 0.20, 0.18, 0.02, 0.02, 0.03],
  "Terminal 2 – International":[0.10, 0.12, 0.08, 0.28, 0.24, 0.18],
  "Mauka Concourse":           [0.30, 0.22, 0.20, 0.10, 0.08, 0.10],
  "Interisland Terminal":      [0.92, 0.03, 0.03, 0.01, 0.01, 0.00],
};

// Origin market weights per terminal
const TERMINAL_ORIGIN_WEIGHTS = {
  "Terminal 1 – Domestic":     [0.72, 0.08, 0.06, 0.08, 0.06],
  "Terminal 2 – International":[0.08, 0.35, 0.28, 0.18, 0.11],
  "Mauka Concourse":           [0.40, 0.22, 0.16, 0.14, 0.08],
  "Interisland Terminal":      [0.85, 0.05, 0.04, 0.04, 0.02],
};

const DAILY_PASSENGERS = [];
for (const date of DATES) {
  for (const terminal of CONFIG.terminals) {
    const v  = deterministicVariance(date, terminal, 1);
    const v2 = deterministicVariance(date, terminal, 2);
    const v3 = deterministicVariance(date, terminal, 3);

    // Seasonal multiplier: peaks in July–Aug and Dec
    const month = new Date(date).getMonth(); // 0-11
    const seasonal = 1 + 0.25 * Math.sin((month - 2) * Math.PI / 6);

    const basePax    = TERMINAL_BASE_PAX[terminal];
    const totalPax   = Math.round(basePax * seasonal * (0.85 + v * 0.30));
    const intlBase   = TERMINAL_INTL_BASE[terminal];
    const intlPct    = Math.min(0.95, Math.max(0.01, intlBase + (v2 - 0.5) * 0.06));
    const connectPct = Math.round((0.18 + v * 0.22) * 100) / 100;
    const avgDwell   = Math.round(45 + v3 * 70);

    // Dwell buckets (must sum to totalPax)
    const d1 = Math.round(totalPax * (0.12 + v  * 0.08));
    const d2 = Math.round(totalPax * (0.22 + v2 * 0.10));
    const d3 = Math.round(totalPax * (0.28 + v  * 0.08));
    const d4 = Math.round(totalPax * (0.20 + v3 * 0.06));
    const d5 = totalPax - d1 - d2 - d3 - d4;

    // Carrier mix
    const cw = TERMINAL_CARRIER_WEIGHTS[terminal];
    const [pHawaiian, pUnited, pDelta, pJAL, pANA, pKorean] =
      CONFIG.carriers.map((_, i) => Math.round(totalPax * (cw[i] + (deterministicVariance(date, terminal, 10+i) - 0.5) * 0.02)));

    // Origin mix
    const ow = TERMINAL_ORIGIN_WEIGHTS[terminal];
    const [pUSM, pJapan, pKorea, pAustralia, pCanada] =
      CONFIG.originMarkets.map((_, i) => Math.round(totalPax * (ow[i] + (deterministicVariance(date, terminal, 20+i) - 0.5) * 0.03)));

    DAILY_PASSENGERS.push({
      date, terminal,
      total_passengers: totalPax,
      intl_pct:         Math.round(intlPct * 100) / 100,
      connecting_pct:   connectPct,
      avg_dwell_minutes: avgDwell,
      dwell_under30:    d1,
      dwell_30_60:      d2,
      dwell_60_90:      d3,
      dwell_90_120:     d4,
      dwell_over120:    Math.max(0, d5),
      pax_us_mainland:  pUSM,
      pax_japan:        pJapan,
      pax_korea:        pKorea,
      pax_australia:    pAustralia,
      pax_canada:       pCanada,
      pax_hawaiian:     pHawaiian,
      pax_united:       pUnited,
      pax_delta:        pDelta,
      pax_jal:          pJAL,
      pax_ana:          pANA,
      pax_korean_air:   pKorean,
    });
  }
}

// ── DAILY_CONCESSIONS ────────────────────────────────────────────────────────
const TERMINAL_SPPE_BASE = {
  "Terminal 1 – Domestic":     14.20,
  "Terminal 2 – International":28.50,
  "Mauka Concourse":           21.80,
  "Interisland Terminal":       8.40,
};

const DAILY_CONCESSIONS = [];
for (const date of DATES) {
  for (const terminal of CONFIG.terminals) {
    const v  = deterministicVariance(date, terminal, 4);
    const v2 = deterministicVariance(date, terminal, 5);
    const v3 = deterministicVariance(date, terminal, 6);

    const paxRow = DAILY_PASSENGERS.find(r => r.date === date && r.terminal === terminal);
    const pax    = paxRow ? paxRow.total_passengers : 1000;

    const sppe       = TERMINAL_SPPE_BASE[terminal] * (0.88 + v * 0.24);
    const totalRev   = Math.round(pax * sppe);
    const fbPct      = 0.48 + v2 * 0.10;
    const retPct     = 0.28 + v  * 0.08;
    const premPct    = 1 - fbPct - retPct;

    const revFB      = Math.round(totalRev * fbPct);
    const revRetail  = Math.round(totalRev * retPct);
    const revPremium = Math.round(totalRev * Math.max(0.05, premPct));

    const txnFB      = Math.round(pax * (0.38 + v  * 0.14));
    const txnRetail  = Math.round(pax * (0.12 + v2 * 0.08));
    const txnPremium = Math.round(pax * (0.04 + v3 * 0.04));

    // Peak hour buckets (% of daily revenue)
    const peakMorning    = Math.round(totalRev * (0.14 + v  * 0.06));
    const peakMidmorning = Math.round(totalRev * (0.22 + v2 * 0.08));
    const peakMidday     = Math.round(totalRev * (0.28 + v3 * 0.06));
    const peakAfternoon  = Math.round(totalRev * (0.22 + v  * 0.06));
    const peakEvening    = totalRev - peakMorning - peakMidmorning - peakMidday - peakAfternoon;

    DAILY_CONCESSIONS.push({
      date, terminal,
      revenue_fb:       revFB,
      revenue_retail:   revRetail,
      revenue_premium:  revPremium,
      transactions_fb:  txnFB,
      transactions_retail: txnRetail,
      transactions_premium: txnPremium,
      sppe:             Math.round(sppe * 100) / 100,
      peak_morning:     peakMorning,
      peak_midmorning:  peakMidmorning,
      peak_midday:      peakMidday,
      peak_afternoon:   peakAfternoon,
      peak_evening:     Math.max(0, peakEvening),
    });
  }
}

// ── DAILY_SPACES ─────────────────────────────────────────────────────────────
const TERMINAL_SQFT = {
  "Terminal 1 – Domestic":     58_000,
  "Terminal 2 – International":34_000,
  "Mauka Concourse":           28_000,
  "Interisland Terminal":      22_000,
};

const DAILY_SPACES = [];
for (const date of DATES) {
  for (const terminal of CONFIG.terminals) {
    const v  = deterministicVariance(date, terminal, 7);
    const v2 = deterministicVariance(date, terminal, 8);

    const totalSqft  = TERMINAL_SQFT[terminal];
    // Mauka Concourse has the known vacancy; others near full
    const vacancyBase = terminal === "Mauka Concourse" ? 0.30 : (0.04 + v * 0.06);
    const vacantSqft  = Math.round(totalSqft * vacancyBase);
    const occupiedSqft = totalSqft - vacantSqft;

    const totalSpaces   = terminal === "Mauka Concourse" ? 5 : Math.round(totalSqft / 4800);
    const vacantSpaces  = terminal === "Mauka Concourse" ? 2 : Math.round(totalSpaces * vacancyBase);
    const occupiedSpaces = totalSpaces - vacantSpaces;

    const revSqftFB      = Math.round(320 + v  * 180);
    const revSqftRetail  = Math.round(280 + v2 * 200);
    const revSqftPremium = Math.round(440 + v  * 260);
    const avgDaysToLease = Math.round(38 + v2 * 52);
    const newLeases      = Math.round(v * 2);
    const activeTenants  = occupiedSpaces;

    // Tenure distribution (share of active tenants in each bucket)
    const tenure1yr  = Math.round(activeTenants * (0.12 + v  * 0.08));
    const tenure3yr  = Math.round(activeTenants * (0.28 + v2 * 0.10));
    const tenure5yr  = Math.round(activeTenants * (0.32 + v  * 0.08));
    const tenure5yr_plus = Math.max(0, activeTenants - tenure1yr - tenure3yr - tenure5yr);

    DAILY_SPACES.push({
      date, terminal,
      total_sqft:        totalSqft,
      occupied_sqft:     occupiedSqft,
      vacant_sqft:       vacantSqft,
      total_spaces:      totalSpaces,
      vacant_spaces:     vacantSpaces,
      occupied_spaces:   occupiedSpaces,
      revenue_sqft_fb:      revSqftFB,
      revenue_sqft_retail:  revSqftRetail,
      revenue_sqft_premium: revSqftPremium,
      avg_days_to_lease: avgDaysToLease,
      new_leases:        newLeases,
      active_tenants:    activeTenants,
      tenure_under1yr:   tenure1yr,
      tenure_1_3yr:      tenure3yr,
      tenure_3_5yr:      tenure5yr,
      tenure_over5yr:    tenure5yr_plus,
    });
  }
}

// ── TRAVELERS ────────────────────────────────────────────────────────────────
const SEGMENT_COUNTS = {
  'Domestic Leisure':   780,
  'Domestic Business':  420,
  "Int'l Leisure":      580,
  "Int'l Business":     320,
  'Transit':            280,
  // subtotal linked: ~1600 profiles across segments (prior_visit or multi-source)
};

// Segment → linked source probability and spend profile
const SEGMENT_PROFILE = {
  'Domestic Leisure':  { linkedProb: 0.52, fbBase: 18, retBase: 12, premBase:  4, originMarkets: [0.88,0.04,0.03,0.03,0.02], terminals: [0.60,0.08,0.22,0.10] },
  'Domestic Business': { linkedProb: 0.68, fbBase: 24, retBase:  8, premBase:  6, originMarkets: [0.90,0.02,0.02,0.03,0.03], terminals: [0.55,0.10,0.25,0.10] },
  "Int'l Leisure":     { linkedProb: 0.72, fbBase: 22, retBase: 28, premBase: 46, originMarkets: [0.06,0.38,0.28,0.18,0.10], terminals: [0.08,0.48,0.36,0.08] },
  "Int'l Business":    { linkedProb: 0.80, fbBase: 30, retBase: 22, premBase: 38, originMarkets: [0.08,0.34,0.26,0.20,0.12], terminals: [0.10,0.52,0.30,0.08] },
  'Transit':           { linkedProb: 0.42, fbBase: 14, retBase:  8, premBase: 12, originMarkets: [0.30,0.22,0.18,0.18,0.12], terminals: [0.15,0.35,0.40,0.10] },
};

const US_STATES = ['HI','NY','FL','CA','TX','NJ','CT','MA','PA','OH','IL','WA','AZ','CO','GA'];
const STATE_WEIGHTS = [8,12,10,14,9,5,4,5,4,3,4,5,4,4,4];

function weightedIndex(weights, v) {
  const total = weights.reduce((a,b)=>a+b,0);
  let cum = 0, r = v * total;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r <= cum) return i;
  }
  return 0;
}

const TRAVELERS = [];
let idx = 0;
for (const [segment, count] of Object.entries(SEGMENT_COUNTS)) {
  const profile = SEGMENT_PROFILE[segment];
  const isIntl = segment.startsWith("Int'l");

  for (let i = 0; i < count; i++, idx++) {
    const v  = deterministicVariance(String(idx), segment, 30);
    const v2 = deterministicVariance(String(idx), segment, 31);
    const v3 = deterministicVariance(String(idx), segment, 32);
    const v4 = deterministicVariance(String(idx), segment, 33);

    const isLinked = v < profile.linkedProb;

    const termIdx   = weightedIndex(profile.terminals, v2);
    const terminal  = CONFIG.terminals[termIdx];

    const originIdx    = weightedIndex(profile.originMarkets, v3);
    const origin_market = CONFIG.originMarkets[originIdx];

    const carrierIdx = isIntl
      ? weightedIndex(TERMINAL_CARRIER_WEIGHTS["Terminal 2 – International"], v4)
      : weightedIndex(TERMINAL_CARRIER_WEIGHTS["Terminal 1 – Domestic"], v4);
    const carrier = CONFIG.carriers[carrierIdx];

    const linkedSources = isLinked
      ? (['FLIGHT', v > 0.3 ? 'POS' : null, v > 0.55 ? 'LOYALTY' : null].filter(Boolean).join('|'))
      : 'FLIGHT';

    const spendFB      = Math.round((profile.fbBase   + v  * profile.fbBase)   * (isLinked ? 1.2 : 1));
    const spendRetail  = Math.round((profile.retBase  + v2 * profile.retBase)  * (isLinked ? 1.2 : 1));
    const spendPremium = Math.round((profile.premBase + v3 * profile.premBase) * (isLinked ? 1.2 : 1));
    const estimatedTotalSpend = Math.round((spendFB + spendRetail + spendPremium) * (isLinked ? 1.35 : 1.0));

    const homeState = isIntl ? null : US_STATES[weightedIndex(STATE_WEIGHTS, v)];

    TRAVELERS.push({
      global_traveler_id:      isLinked ? `GT-${String(idx).padStart(6,'0')}` : null,
      segment,
      terminal,
      origin_market,
      carrier,
      linked_sources:          linkedSources,
      match_confidence_score:  isLinked ? Math.round((0.85 + v * 0.14) * 100) / 100 : null,
      spend_fb:                spendFB,
      spend_retail:            spendRetail,
      spend_premium:           spendPremium,
      estimated_total_spend:   estimatedTotalSpend,
      dwell_minutes:           Math.round(20 + v2 * 160),
      home_state:              homeState,
      prior_visit_flag:        v > 0.55,
    });
  }
}
