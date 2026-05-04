const STATE = {
  passengers: {
    terminal:  'all',
    dateRange: 'year',
    carrier:   'all',
  },
  concessions: {
    terminal:  'all',
    dateRange: 'year',
    category:  'all',
  },
  spaces: {
    terminal:  'all',
    dateRange: 'year',
    spaceType: 'all',
  },
  personas: {
    terminal:      'all',
    segment:       'all',
    linkedStatus:  'linked',
  },
};

const DATE_PRESETS = {
  year: () => ({ start: new Date('2025-01-01'), end: new Date('2025-12-31') }),
  '90': () => {
    const end = new Date('2025-12-31');
    const start = new Date(end);
    start.setDate(start.getDate() - 90);
    return { start, end };
  },
  '30': () => {
    const end = new Date('2025-12-31');
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    return { start, end };
  },
};

function getDateWindow(dateRange) {
  return (DATE_PRESETS[dateRange] || DATE_PRESETS.year)();
}

function filterDaily(dataset, tab) {
  const s = STATE[tab];
  const { start, end } = getDateWindow(s.dateRange || 'year');
  return dataset.filter(row => {
    const d = new Date(row.date);
    if (d < start || d > end) return false;
    if (s.terminal !== 'all' && row.terminal !== s.terminal) return false;
    return true;
  });
}

function filterTravelers() {
  const s = STATE.personas;
  return TRAVELERS.filter(t => {
    if (s.linkedStatus === 'linked' && !t.global_traveler_id) return false;
    if (s.terminal !== 'all' && t.terminal !== s.terminal) return false;
    if (s.segment === 'top10') {
      const threshold = getTop10SpendThreshold();
      return t.estimated_total_spend >= threshold;
    }
    if (s.segment !== 'all' && s.segment !== 'top10' && s.segment !== 'linked') {
      return t.segment === s.segment;
    }
    return true;
  });
}

function getTop10SpendThreshold() {
  const spends = TRAVELERS.filter(t => t.global_traveler_id)
    .map(t => t.estimated_total_spend)
    .sort((a, b) => b - a);
  return spends[Math.floor(spends.length * 0.1)] || 0;
}

const fmt = {
  currency: n => '$' + (n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toFixed(0)),
  pct:      n => (n * 100).toFixed(1) + '%',
  num:      n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n),
};
