// charts.js — shared helpers + Tab 1 Owner Portal charts

// ─── renderChoropleth ─────────────────────────────────────────────────────────
function renderChoropleth(canvasId, customerSubset, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  const div = document.createElement('div');
  div.id = canvasId;
  div.style.width = '100%';
  div.style.height = '220px';
  div.style.position = 'relative';
  parent.replaceChild(div, canvas);

  const counts = {};
  customerSubset.filter(c=>c.home_state).forEach(c=>{ counts[c.home_state]=(counts[c.home_state]||0)+1; });
  const maxVal = Math.max(...Object.values(counts), 1);

  const width = div.clientWidth || 400, height = 220;
  const projection = d3.geoAlbersUsa().fitSize([width, height], { type:'Sphere' });
  const path = d3.geoPath().projection(projection);
  const colorScale = d3.scaleSequentialLog([1, maxVal], [d3.hcl(210,30,95), d3.hcl(220,60,20)]);

  const svg = d3.select(div).append('svg').attr('width',width).attr('height',height);

  fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
    .then(r=>r.json())
    .then(us => {
      const stateNames = {
        '36':'NY','12':'FL','06':'CA','48':'TX','34':'NJ','09':'CT','25':'MA',
        '42':'PA','39':'OH','17':'IL','13':'GA','37':'NC','51':'VA','04':'AZ','08':'CO',
      };
      svg.append('g').selectAll('path')
        .data(topojson.feature(us, us.objects.states).features)
        .join('path')
        .attr('d', path)
        .attr('fill', d => {
          const abbr = stateNames[d.id];
          return counts[abbr] ? colorScale(counts[abbr]) : '#e8edf4';
        })
        .attr('stroke','#fff').attr('stroke-width',0.5)
        .append('title').text(d => {
          const abbr = stateNames[d.id];
          return `${abbr||d.id}: ${(counts[abbr]||0).toLocaleString()} customers`;
        });
    });
}

// ─── Chart registry and shared helpers ───────────────────────────────────────
const _charts = {};
function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function renderBAN(container, label, value, isLead = false, tooltip = '') {
  const card = document.createElement('div');
  card.className = 'ban-card' + (isLead ? ' lead' : '');
  card.innerHTML = `
    <div class="ban-label">${label}${tooltip ? ` <span class="ban-tip" data-tooltip="${tooltip}">ⓘ</span>` : ''}</div>
    <div class="ban-value">${value}</div>
  `;
  container.appendChild(card);
}

function renderTeaserBox(container, text) {
  const box = document.createElement('div');
  box.className = 'teaser-box';
  box.innerHTML = `<span class="teaser-arrow">→</span> ${text}`;
  container.appendChild(box);
}

function infoIcon(tip) {
  return `<span class="chart-info-icon" data-tooltip="${tip}">ⓘ</span>`;
}

function makeChartCard(id, title, tooltip = '') {
  const card = document.createElement('div');
  card.className = 'chart-card';
  card.innerHTML = `<div class="chart-title">${title}${tooltip ? infoIcon(tooltip) : ''}</div><canvas id="${id}"></canvas>`;
  return card;
}

// ─── renderPassengersTab ──────────────────────────────────────────────────────
function renderPassengersTab() {
  const el = document.getElementById('tab-passengers');
  el.innerHTML = '';

  el.innerHTML += `
    <div class="filter-bar">
      <div class="filter-group"><label>Terminal</label>
        <select data-filter="terminal" data-tab="passengers" onchange="handleFilter(this)">
          <option value="all">All Terminals</option>
        </select></div>
      <div class="filter-group"><label>Date Range</label>
        <select data-filter="dateRange" data-tab="passengers" onchange="handleFilter(this)">
          <option value="year">Full Year</option>
          <option value="90">Last 90 Days</option>
          <option value="30">Last 30 Days</option>
        </select></div>
      <div class="filter-group"><label>Carrier</label>
        <select data-filter="carrier" data-tab="passengers" onchange="handleFilter(this)">
          <option value="all">All Carriers</option>
          ${CONFIG.carriers.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select></div>
      <button class="btn-reset" onclick="resetFilters('passengers')">Reset</button>
      <button class="btn-export" onclick="exportCSV('passengers')">Export</button>
    </div>`;

  const rows = filterDaily(DAILY_PASSENGERS, 'passengers');
  const totalPax     = rows.reduce((s,r)=>s+r.total_passengers,0);
  const avgIntlPct   = rows.length ? Math.round(rows.reduce((s,r)=>s+r.intl_pct,0)/rows.length*100) : 0;
  const avgDwell     = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg_dwell_minutes,0)/rows.length) : 0;
  const avgConnect   = rows.length ? Math.round(rows.reduce((s,r)=>s+r.connecting_pct,0)/rows.length*100) : 0;
  const yoy          = 0.5; // simulated YoY growth %
  const carrierCount = CONFIG.carriers.length;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Total Passengers',      fmt.num(totalPax));
  renderBAN(banGrid, 'International Share',   `${avgIntlPct}%`);
  renderBAN(banGrid, 'Avg Dwell Time',        `${avgDwell} min`);
  renderBAN(banGrid, 'Connecting Pax %',      `${avgConnect}%`);
  renderBAN(banGrid, 'YoY Growth',            `+${yoy}%`);
  renderBAN(banGrid, 'Carrier Partners',      carrierCount.toString());
  el.appendChild(banGrid);

  const timelineWrap = document.createElement('div');
  timelineWrap.className = 'chart-grid';
  timelineWrap.appendChild(makeChartCard('chart-pax-timeline', 'Passengers Over Time', 'Weekly passenger volume. Seasonal peaks in summer and December holiday period.'));
  el.appendChild(timelineWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-pax-origin',   'Origin Market Mix',          'Where passengers originate. International origin mix drives premium retail spend — visible in Passenger Personas tab.'],
    ['chart-pax-carrier',  'Carrier Mix by Terminal',    'Passenger distribution across carriers. International carrier share indicates premium retail opportunity.'],
    ['chart-pax-dwell',    'Dwell Time Distribution',    'Time in terminal before departure. Passengers with 90+ minutes dwell are the primary retail opportunity.'],
    ['chart-pax-map',      'Domestic Origin States',     'Home states of US domestic passengers. Informs targeted outreach and regional partner marketing.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  renderTeaserBox(el, `→ Which passenger segments have the highest retail spend propensity? That requires linking flight data to concession POS — see <strong>Passenger Personas</strong>.`);
  renderPassengersCharts(rows);
}

// ─── renderPassengersCharts ───────────────────────────────────────────────────
function renderPassengersCharts(rows) {
  // 1. Passengers Over Time
  destroyChart('chart-pax-timeline');
  const byDate = {};
  rows.forEach(r => { byDate[r.date] = (byDate[r.date]||0) + r.total_passengers; });
  const dates = Object.keys(byDate).sort();
  _charts['chart-pax-timeline'] = new Chart(document.getElementById('chart-pax-timeline'), {
    type: 'line',
    data: {
      labels: dates.filter((_,i)=>i%7===0),
      datasets: [{ label:'Passengers', data:dates.filter((_,i)=>i%7===0).map(d=>byDate[d]),
        borderColor:CONFIG.palette.navy, backgroundColor:CONFIG.palette.navy+'18',
        fill:true, tension:0.3, pointRadius:0 }],
    },
    options: { responsive:true, aspectRatio:5, plugins:{legend:{display:false}} },
  });

  // 2. Origin Market Mix
  destroyChart('chart-pax-origin');
  const originKeys = ['pax_us_mainland','pax_japan','pax_korea','pax_australia','pax_canada'];
  const originData = originKeys.map(k => rows.reduce((s,r)=>s+(r[k]||0),0));
  _charts['chart-pax-origin'] = new Chart(document.getElementById('chart-pax-origin'), {
    type:'bar',
    data:{ labels: CONFIG.originMarkets,
      datasets:[{ label:'Passengers', data:originData,
        backgroundColor:[CONFIG.palette.navy,CONFIG.palette.teal,CONFIG.palette.blue,CONFIG.palette.slate,CONFIG.palette.gray] }]},
    options:{indexAxis:'y', responsive:true, plugins:{legend:{display:false}}},
  });

  // 3. Carrier Mix by Terminal (stacked)
  destroyChart('chart-pax-carrier');
  const carrierKeys = ['pax_hawaiian','pax_united','pax_delta','pax_jal','pax_ana','pax_korean_air'];
  const selectedCarrier = STATE.passengers.carrier;
  const carrierColors = [CONFIG.palette.teal,CONFIG.palette.navy,CONFIG.palette.blue,CONFIG.palette.amber,CONFIG.palette.slate,CONFIG.palette.gray];
  const carrierDatasets = CONFIG.carriers.map((carrier, ci) => ({
    label: carrier,
    data: CONFIG.terminals.map(term => {
      const termRows = rows.filter(r=>r.terminal===term);
      return termRows.reduce((s,r)=>s+(r[carrierKeys[ci]]||0),0);
    }),
    backgroundColor: (selectedCarrier === 'all' || selectedCarrier === carrier)
      ? carrierColors[ci]
      : carrierColors[ci] + '40',  // dim unselected carriers
  }));
  _charts['chart-pax-carrier'] = new Chart(document.getElementById('chart-pax-carrier'), {
    type:'bar',
    data:{ labels: CONFIG.terminals.map(t=>t.split('–')[0].trim()), datasets: carrierDatasets },
    options:{ responsive:true, scales:{x:{stacked:true},y:{stacked:true}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}} },
  });

  // 4. Dwell Time Distribution
  destroyChart('chart-pax-dwell');
  const dwellKeys   = ['dwell_under30','dwell_30_60','dwell_60_90','dwell_90_120','dwell_over120'];
  const dwellLabels = ['<30 min','30–60 min','60–90 min','90–120 min','120+ min'];
  const dwellData   = dwellKeys.map(k=>rows.reduce((s,r)=>s+(r[k]||0),0));
  _charts['chart-pax-dwell'] = new Chart(document.getElementById('chart-pax-dwell'), {
    type:'bar',
    data:{ labels:dwellLabels, datasets:[{ label:'Passengers', data:dwellData,
      backgroundColor:[CONFIG.palette.gray2,CONFIG.palette.gray,CONFIG.palette.slate,CONFIG.palette.teal,CONFIG.palette.navy] }]},
    options:{ responsive:true, plugins:{legend:{display:false}} },
  });

  // 5. Choropleth — domestic origin states
  renderChoropleth('chart-pax-map', TRAVELERS.filter(t=>t.home_state), 'Domestic Passenger Origin by State');
}

// ─── renderConcessionsTab ─────────────────────────────────────────────────────
function renderConcessionsTab() {
  const el = document.getElementById('tab-concessions');
  el.innerHTML = '';

  el.innerHTML += `
    <div class="filter-bar">
      <div class="filter-group"><label>Terminal</label>
        <select data-filter="terminal" data-tab="concessions" onchange="handleFilter(this)">
          <option value="all">All Terminals</option>
        </select></div>
      <div class="filter-group"><label>Date Range</label>
        <select data-filter="dateRange" data-tab="concessions" onchange="handleFilter(this)">
          <option value="year">Full Year</option>
          <option value="90">Last 90 Days</option>
          <option value="30">Last 30 Days</option>
        </select></div>
      <div class="filter-group"><label>Category</label>
        <select data-filter="category" data-tab="concessions" onchange="handleFilter(this)">
          <option value="all">All Categories</option>
          ${CONFIG.categories.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select></div>
      <button class="btn-reset" onclick="resetFilters('concessions')">Reset</button>
      <button class="btn-export" onclick="exportCSV('concessions')">Export</button>
    </div>`;

  const rows = filterDaily(DAILY_CONCESSIONS, 'concessions');
  const totalRev   = rows.reduce((s,r)=>s+r.revenue_fb+r.revenue_retail+r.revenue_premium,0);
  const avgSPPE    = rows.length ? Math.round(rows.reduce((s,r)=>s+r.sppe,0)/rows.length*100)/100 : 0;
  const fbPct      = totalRev ? Math.round(rows.reduce((s,r)=>s+r.revenue_fb,0)/totalRev*100) : 0;
  const retPct     = totalRev ? Math.round(rows.reduce((s,r)=>s+r.revenue_retail,0)/totalRev*100) : 0;
  const yoy        = 3.2;
  const locations  = 42; // simulated fixed count

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Total Concession Revenue', `$${(totalRev/1e6).toFixed(1)}M`);
  renderBAN(banGrid, 'Spend per Enplanement',    `$${avgSPPE}`, true, 'Average spend per departing passenger across all concession categories.');
  renderBAN(banGrid, 'F&B Share',                `${fbPct}%`);
  renderBAN(banGrid, 'Retail Share',             `${retPct}%`);
  renderBAN(banGrid, 'YoY Revenue Growth',       `+${yoy}%`);
  renderBAN(banGrid, 'Concession Locations',     locations.toString());
  el.appendChild(banGrid);

  const timelineWrap = document.createElement('div');
  timelineWrap.className = 'chart-grid';
  timelineWrap.appendChild(makeChartCard('chart-con-timeline', 'Concession Revenue Over Time', 'Weekly total revenue across all categories. Peaks track seasonal passenger volume.'));
  el.appendChild(timelineWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-con-catmix',   'Category Mix by Terminal',          'F&B vs. Specialty Retail vs. Duty-Free/Premium revenue split per terminal. International terminals skew premium.'],
    ['chart-con-origin',   'Spend per Passenger by Origin Market','Japan and Korea index significantly above average — but the passenger-type driver is only visible after identity resolution.'],
    ['chart-con-peak',     'Peak Hour Revenue Distribution',    'Revenue concentration by time of day. Morning and midday peaks track departure banks.'],
    ['chart-con-txnvol',   'Transaction Volume by Category',    'Transaction count by concession category. High F&B volume vs. lower premium transaction count masks the premium revenue opportunity.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  renderTeaserBox(el, `→ Which passenger types are driving premium retail vs. F&B vs. local goods? That's invisible from POS data alone — see <strong>Passenger Personas</strong>.`);
  renderConcessionsCharts(rows);
}

// ─── renderConcessionsCharts ──────────────────────────────────────────────────
function renderConcessionsCharts(rows) {
  const cat = STATE.concessions.category;
  const dim = c => (cat === 'all' || cat === c) ? null : '40';  // null = full opacity, '40' = dimmed

  // Helper: revenue for a row given current category filter
  const rowRev = r => cat === 'F&B' ? r.revenue_fb
    : cat === 'Specialty Retail'    ? r.revenue_retail
    : cat === 'Duty-Free / Premium' ? r.revenue_premium
    : r.revenue_fb + r.revenue_retail + r.revenue_premium;

  // 1. Revenue Over Time — shows selected category or total
  destroyChart('chart-con-timeline');
  const byDate = {};
  rows.forEach(r => { byDate[r.date] = (byDate[r.date]||0) + rowRev(r); });
  const dates = Object.keys(byDate).sort();
  const timelineColor = cat === 'F&B' ? CONFIG.palette.teal
    : cat === 'Specialty Retail'    ? CONFIG.palette.blue
    : cat === 'Duty-Free / Premium' ? CONFIG.palette.amber
    : CONFIG.palette.teal;
  _charts['chart-con-timeline'] = new Chart(document.getElementById('chart-con-timeline'), {
    type:'line',
    data:{ labels:dates.filter((_,i)=>i%7===0),
      datasets:[{ label: cat === 'all' ? 'Total Revenue' : cat,
        data:dates.filter((_,i)=>i%7===0).map(d=>byDate[d]),
        borderColor:timelineColor, backgroundColor:timelineColor+'18',
        fill:true, tension:0.3, pointRadius:0 }]},
    options:{ responsive:true, aspectRatio:5, plugins:{legend:{display:false}} },
  });

  // 2. Category Mix by Terminal — dims unselected categories
  destroyChart('chart-con-catmix');
  const mkColor = (base, c) => dim(c) ? base + dim(c) : base;
  _charts['chart-con-catmix'] = new Chart(document.getElementById('chart-con-catmix'), {
    type:'bar',
    data:{ labels: CONFIG.terminals.map(t=>t.split('–')[0].trim()),
      datasets:[
        { label:'F&B',               data:CONFIG.terminals.map(t=>rows.filter(r=>r.terminal===t).reduce((s,r)=>s+r.revenue_fb,0)),      backgroundColor:mkColor(CONFIG.palette.teal,  'F&B') },
        { label:'Specialty Retail',  data:CONFIG.terminals.map(t=>rows.filter(r=>r.terminal===t).reduce((s,r)=>s+r.revenue_retail,0)),  backgroundColor:mkColor(CONFIG.palette.blue,  'Specialty Retail') },
        { label:'Duty-Free/Premium', data:CONFIG.terminals.map(t=>rows.filter(r=>r.terminal===t).reduce((s,r)=>s+r.revenue_premium,0)), backgroundColor:mkColor(CONFIG.palette.amber, 'Duty-Free / Premium') },
      ]},
    options:{ responsive:true, scales:{x:{stacked:true},y:{stacked:true}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}} },
  });

  // 3. Spend per Passenger by Origin Market
  destroyChart('chart-con-origin');
  const originSpendPerPax = CONFIG.originMarkets.map(m => {
    const travelers = TRAVELERS.filter(t=>t.origin_market===m);
    const rev = travelers.reduce((s,t) =>
      s + (cat === 'F&B' ? t.spend_fb : cat === 'Specialty Retail' ? t.spend_retail : cat === 'Duty-Free / Premium' ? t.spend_premium : t.estimated_total_spend), 0);
    return Math.round(rev / (travelers.length || 1));
  });
  _charts['chart-con-origin'] = new Chart(document.getElementById('chart-con-origin'), {
    type:'bar',
    data:{ labels:CONFIG.originMarkets,
      datasets:[{ label:'Avg Spend / Passenger ($)', data:originSpendPerPax,
        backgroundColor:CONFIG.originMarkets.map((_,i)=>
          i===1||i===2 ? CONFIG.palette.amber : CONFIG.palette.slate) }]},
    options:{ responsive:true, plugins:{legend:{display:false}} },
  });

  // 4. Peak Hour Revenue (total only — data doesn't have per-category peak breakdown)
  destroyChart('chart-con-peak');
  const peakKeys   = ['peak_morning','peak_midmorning','peak_midday','peak_afternoon','peak_evening'];
  const peakLabels = ['Early Morning','Mid-Morning','Midday','Afternoon','Evening'];
  const peakData   = peakKeys.map(k=>rows.reduce((s,r)=>s+(r[k]||0),0));
  _charts['chart-con-peak'] = new Chart(document.getElementById('chart-con-peak'), {
    type:'bar',
    data:{ labels:peakLabels, datasets:[{ label:'Revenue', data:peakData,
      backgroundColor:[CONFIG.palette.gray2,CONFIG.palette.slate,CONFIG.palette.teal,CONFIG.palette.blue,CONFIG.palette.navy] }]},
    options:{ responsive:true, plugins:{legend:{display:false}} },
  });

  // 5. Transaction Volume by Category — dims unselected
  destroyChart('chart-con-txnvol');
  const txnData = [
    rows.reduce((s,r)=>s+r.transactions_fb,0),
    rows.reduce((s,r)=>s+r.transactions_retail,0),
    rows.reduce((s,r)=>s+r.transactions_premium,0),
  ];
  _charts['chart-con-txnvol'] = new Chart(document.getElementById('chart-con-txnvol'), {
    type:'bar',
    data:{ labels:CONFIG.categories,
      datasets:[{ label:'Transactions', data:txnData,
        backgroundColor:[
          mkColor(CONFIG.palette.teal,  'F&B'),
          mkColor(CONFIG.palette.blue,  'Specialty Retail'),
          mkColor(CONFIG.palette.amber, 'Duty-Free / Premium'),
        ]}]},
    options:{ indexAxis:'y', responsive:true, plugins:{legend:{display:false}} },
  });
}

// ─── renderMaukaSVG ───────────────────────────────────────────────────────────
function renderMaukaSVG(container, dailyPaxRows) {
  // Compute avg daily foot traffic past each pocket from DAILY_PASSENGERS
  // All Mauka Concourse rows; assign traffic to each pocket position
  const maukaRows = dailyPaxRows.filter(r => r.terminal === "Mauka Concourse");
  const avgDailyPax = maukaRows.length
    ? Math.round(maukaRows.reduce((s,r)=>s+r.total_passengers,0) / maukaRows.length)
    : 3200;

  // Simulate traffic past each pocket: pockets in center see more traffic
  const pocketTraffic = [
    Math.round(avgDailyPax * 0.62),  // M1
    Math.round(avgDailyPax * 0.74),  // M2
    Math.round(avgDailyPax * 0.88),  // M3 — peak: main gate cluster
    Math.round(avgDailyPax * 0.91),  // M4 — vacant, highest traffic
    Math.round(avgDailyPax * 0.85),  // M5 — vacant
  ];

  const pockets = [
    { id:'M1', label:'F&B Concept',       occupied:true  },
    { id:'M2', label:'Local Goods',        occupied:true  },
    { id:'M3', label:'Quick Service',      occupied:true  },
    { id:'M4', label:'Available',          occupied:false },
    { id:'M5', label:'Available',          occupied:false },
  ];

  const W=700, H=160, pW=110, pH=70, gap=16, startX=20, pY=70;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('width','100%');
  svg.setAttribute('height',H);

  // Flow line
  const lineY = pY + pH/2;
  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1', startX);
  line.setAttribute('y1', lineY);
  line.setAttribute('x2', startX + 5*(pW+gap) - gap);
  line.setAttribute('y2', lineY);
  line.setAttribute('stroke','#C5CBD4');
  line.setAttribute('stroke-width','2');
  line.setAttribute('stroke-dasharray','6,4');
  svg.appendChild(line);

  // Direction label
  const dirText = document.createElementNS('http://www.w3.org/2000/svg','text');
  dirText.setAttribute('x', W - 10);
  dirText.setAttribute('y', lineY + 4);
  dirText.setAttribute('text-anchor','end');
  dirText.setAttribute('font-size','10');
  dirText.setAttribute('fill','#6B7280');
  dirText.textContent = '→ Gates';
  svg.appendChild(dirText);

  pockets.forEach((p, i) => {
    const x = startX + i*(pW+gap);
    const fill   = p.occupied ? '#CCFBF1' : '#FFFBEB';
    const stroke = p.occupied ? '#0D9488' : '#F59E0B';
    const textColor = p.occupied ? '#0F766E' : '#B45309';

    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',x); rect.setAttribute('y',pY);
    rect.setAttribute('width',pW); rect.setAttribute('height',pH);
    rect.setAttribute('rx','6'); rect.setAttribute('fill',fill);
    rect.setAttribute('stroke',stroke); rect.setAttribute('stroke-width','2');
    svg.appendChild(rect);

    const idText = document.createElementNS('http://www.w3.org/2000/svg','text');
    idText.setAttribute('x',x+pW/2); idText.setAttribute('y',pY+22);
    idText.setAttribute('text-anchor','middle');
    idText.setAttribute('font-size','11'); idText.setAttribute('font-weight','700');
    idText.setAttribute('fill',textColor);
    idText.textContent = p.id;
    svg.appendChild(idText);

    const lblText = document.createElementNS('http://www.w3.org/2000/svg','text');
    lblText.setAttribute('x',x+pW/2); lblText.setAttribute('y',pY+40);
    lblText.setAttribute('text-anchor','middle');
    lblText.setAttribute('font-size','10'); lblText.setAttribute('fill',textColor);
    lblText.textContent = p.label;
    svg.appendChild(lblText);

    // Foot traffic annotation above flow line
    const trafficText = document.createElementNS('http://www.w3.org/2000/svg','text');
    trafficText.setAttribute('x', x+pW/2);
    trafficText.setAttribute('y', pY - 10);
    trafficText.setAttribute('text-anchor','middle');
    trafficText.setAttribute('font-size','10');
    trafficText.setAttribute('fill', p.occupied ? '#6B7280' : '#B45309');
    trafficText.setAttribute('font-weight', p.occupied ? '400' : '600');
    trafficText.textContent = `${(pocketTraffic[i]/1000).toFixed(1)}K/day`;
    svg.appendChild(trafficText);
  });

  // "Vacant" badge on M4 and M5
  [3,4].forEach(i => {
    const x = startX + i*(pW+gap);
    const badge = document.createElementNS('http://www.w3.org/2000/svg','rect');
    badge.setAttribute('x',x+pW-36); badge.setAttribute('y',pY+pH-18);
    badge.setAttribute('width',32); badge.setAttribute('height',14);
    badge.setAttribute('rx','4'); badge.setAttribute('fill','#F59E0B');
    svg.appendChild(badge);
    const badgeTxt = document.createElementNS('http://www.w3.org/2000/svg','text');
    badgeTxt.setAttribute('x',x+pW-20); badgeTxt.setAttribute('y',pY+pH-7);
    badgeTxt.setAttribute('text-anchor','middle');
    badgeTxt.setAttribute('font-size','9'); badgeTxt.setAttribute('font-weight','700');
    badgeTxt.setAttribute('fill','#fff');
    badgeTxt.textContent = 'OPEN';
    svg.appendChild(badgeTxt);
  });

  container.appendChild(svg);
}

// ─── renderSpacesTab ──────────────────────────────────────────────────────────
function renderSpacesTab() {
  const el = document.getElementById('tab-spaces');
  el.innerHTML = '';

  el.innerHTML += `
    <div class="filter-bar">
      <div class="filter-group"><label>Terminal</label>
        <select data-filter="terminal" data-tab="spaces" onchange="handleFilter(this)">
          <option value="all">All Terminals</option>
        </select></div>
      <div class="filter-group"><label>Date Range</label>
        <select data-filter="dateRange" data-tab="spaces" onchange="handleFilter(this)">
          <option value="year">Full Year</option>
          <option value="90">Last 90 Days</option>
          <option value="30">Last 30 Days</option>
        </select></div>
      <div class="filter-group"><label>Space Type</label>
        <select data-filter="spaceType" data-tab="spaces" onchange="handleFilter(this)">
          <option value="all">All Types</option>
          ${CONFIG.spaceTypes.map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select></div>
      <button class="btn-reset" onclick="resetFilters('spaces')">Reset</button>
      <button class="btn-export" onclick="exportCSV('spaces')">Export</button>
    </div>`;

  const rows = filterDaily(DAILY_SPACES, 'spaces');
  const avgOccPct    = rows.length ? Math.round(rows.reduce((s,r)=>s+(r.occupied_sqft/(r.total_sqft||1)),0)/rows.length*100) : 0;
  const avgRevSqft   = rows.length ? Math.round((
    rows.reduce((s,r)=>s+r.revenue_sqft_fb,0)/rows.length * 0.48 +
    rows.reduce((s,r)=>s+r.revenue_sqft_retail,0)/rows.length * 0.28 +
    rows.reduce((s,r)=>s+r.revenue_sqft_premium,0)/rows.length * 0.24
  )) : 0;
  const totalVacant  = CONFIG.scale.vacantSqft;
  const spacesInProc = CONFIG.scale.vacantSpaces;
  const avgDaysLease = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg_days_to_lease,0)/rows.length) : 0;
  const activeTenants = rows.length ? Math.round(rows.reduce((s,r)=>s+r.active_tenants,0)/rows.length) : 0;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Occupied %',          `${avgOccPct}%`);
  renderBAN(banGrid, 'Revenue / sqft',       `$${avgRevSqft}`);
  renderBAN(banGrid, 'Vacant sqft',          totalVacant.toLocaleString(), true, 'Total square footage currently untenanted. Concentrated in Mauka Concourse.');
  renderBAN(banGrid, 'Spaces in Procurement', spacesInProc.toString());
  renderBAN(banGrid, 'Avg Days to Lease',    `${avgDaysLease}d`);
  renderBAN(banGrid, 'Active Tenants',       activeTenants.toString());
  el.appendChild(banGrid);

  // Mauka Concourse SVG schematic
  const schematicWrap = document.createElement('div');
  schematicWrap.className = 'mauka-schematic';
  const schematicTitle = document.createElement('div');
  schematicTitle.className = 'mauka-schematic-title';
  schematicTitle.innerHTML = `Mauka Concourse — Space Availability ${infoIcon('5 retail pockets in the Mauka Concourse of Terminal 1. The two amber spaces (M4, M5) are currently in procurement. Foot traffic annotations show avg daily passenger flow past each position.')}`;
  schematicWrap.appendChild(schematicTitle);

  const paxRows = filterDaily(DAILY_PASSENGERS, 'spaces');
  renderMaukaSVG(schematicWrap, paxRows);
  el.appendChild(schematicWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-spc-revsqft', 'Revenue / sqft by Terminal',        'Per-sqft productivity by terminal. Terminal 2 International commands premium rents due to captive international traveler demand.'],
    ['chart-spc-vacancy', 'Occupied vs. Vacant by Terminal',    'Occupancy breakdown. Mauka Concourse vacancy stands out — the two new iShoppes spaces are in the highest-traffic zone.'],
    ['chart-spc-catmix',  'Category Mix vs. Passenger Traffic', 'Current category distribution compared to terminal passenger volume. Identifies category gaps relative to demand.'],
    ['chart-spc-tenure',  'Tenant Tenure Distribution',         'How long current tenants have operated. Long tenure signals stable revenue; short tenure may indicate recent turnover or new concepts.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  renderTeaserBox(el, `→ Which passenger personas flow past each vacant space? That match only exists in the <strong>Passenger Personas</strong> tab.`);
  renderSpacesCharts(rows);
}

// ─── renderSpacesCharts ───────────────────────────────────────────────────────
function renderSpacesCharts(rows) {
  const spaceType = STATE.spaces.spaceType;

  // 1. Revenue / sqft by terminal — filtered to selected space type
  destroyChart('chart-spc-revsqft');
  const revSqftByTerminal = CONFIG.terminals.map(t => {
    const tRows = rows.filter(r=>r.terminal===t);
    if (!tRows.length) return 0;
    if (spaceType === 'F&B')               return Math.round(tRows.reduce((s,r)=>s+r.revenue_sqft_fb,0)/tRows.length);
    if (spaceType === 'Specialty Retail')  return Math.round(tRows.reduce((s,r)=>s+r.revenue_sqft_retail,0)/tRows.length);
    if (spaceType === 'Duty-Free / Premium') return Math.round(tRows.reduce((s,r)=>s+r.revenue_sqft_premium,0)/tRows.length);
    if (spaceType === 'Available')         return 0;
    return Math.round(
      tRows.reduce((s,r)=>s+r.revenue_sqft_fb,0)/tRows.length * 0.48 +
      tRows.reduce((s,r)=>s+r.revenue_sqft_retail,0)/tRows.length * 0.28 +
      tRows.reduce((s,r)=>s+r.revenue_sqft_premium,0)/tRows.length * 0.24
    );
  });
  const revSqftColor = spaceType === 'Specialty Retail'   ? CONFIG.palette.blue
    : spaceType === 'Duty-Free / Premium' ? CONFIG.palette.amber
    : CONFIG.palette.teal;
  _charts['chart-spc-revsqft'] = new Chart(document.getElementById('chart-spc-revsqft'), {
    type:'bar',
    data:{ labels:CONFIG.terminals.map(t=>t.split('–')[0].trim()),
      datasets:[{ label: spaceType === 'all' ? '$/sqft (weighted avg)' : `${spaceType} $/sqft`, data:revSqftByTerminal, backgroundColor:revSqftColor }]},
    options:{ indexAxis:'y', responsive:true, plugins:{legend:{display:false}} },
  });

  // 2. Occupied vs Vacant by Terminal (stacked)
  destroyChart('chart-spc-vacancy');
  const latestRows = CONFIG.terminals.map(t => {
    const tRows = rows.filter(r=>r.terminal===t);
    return tRows.length ? tRows[tRows.length-1] : null;
  });
  _charts['chart-spc-vacancy'] = new Chart(document.getElementById('chart-spc-vacancy'), {
    type:'bar',
    data:{ labels:CONFIG.terminals.map(t=>t.split('–')[0].trim()),
      datasets:[
        { label:'Occupied sqft', data:latestRows.map(r=>r?r.occupied_sqft:0), backgroundColor:CONFIG.palette.teal },
        { label:'Vacant sqft',   data:latestRows.map(r=>r?r.vacant_sqft:0),   backgroundColor:CONFIG.palette.amber },
      ]},
    options:{ responsive:true, scales:{x:{stacked:true},y:{stacked:true}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}} },
  });

  // 3. Category mix vs passenger traffic — selected type's share highlighted
  destroyChart('chart-spc-catmix');
  const paxByTerminal = CONFIG.terminals.map(t =>
    DAILY_PASSENGERS.filter(r=>r.terminal===t).reduce((s,r)=>s+r.total_passengers,0) / 365
  );
  const maxPax = Math.max(...paxByTerminal);
  const paxNorm = paxByTerminal.map(p => Math.round(p/maxPax*100));
  const catShareKey = spaceType === 'Specialty Retail' ? 'revenue_sqft_retail'
    : spaceType === 'Duty-Free / Premium' ? 'revenue_sqft_premium'
    : 'revenue_sqft_fb';
  const catShareLabel = spaceType === 'Specialty Retail' ? 'Specialty Retail Share %'
    : spaceType === 'Duty-Free / Premium' ? 'Duty-Free/Premium Share %'
    : 'F&B Share %';
  const catShareColor = spaceType === 'Specialty Retail' ? CONFIG.palette.blue
    : spaceType === 'Duty-Free / Premium' ? CONFIG.palette.amber
    : CONFIG.palette.teal;
  const catShare = CONFIG.terminals.map(t => {
    const tRows = rows.filter(r=>r.terminal===t);
    const total = tRows.reduce((s,r)=>s+r.revenue_sqft_fb+r.revenue_sqft_retail+r.revenue_sqft_premium,0);
    const sel   = tRows.reduce((s,r)=>s+r[catShareKey],0);
    return total ? Math.round(sel/total*100) : 0;
  });
  _charts['chart-spc-catmix'] = new Chart(document.getElementById('chart-spc-catmix'), {
    type:'bar',
    data:{ labels:CONFIG.terminals.map(t=>t.split('–')[0].trim()),
      datasets:[
        { label:'Pax Index (0–100)', data:paxNorm,   backgroundColor:CONFIG.palette.gray2 },
        { label:catShareLabel,       data:catShare,   backgroundColor:catShareColor  },
      ]},
    options:{ responsive:true,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}} },
  });

  // 4. Tenant Tenure Distribution
  destroyChart('chart-spc-tenure');
  const tenureLabels = ['<1 yr','1–3 yr','3–5 yr','5+ yr'];
  const tenureKeys   = ['tenure_under1yr','tenure_1_3yr','tenure_3_5yr','tenure_over5yr'];
  const tenureData   = tenureKeys.map(k => rows.reduce((s,r)=>s+(r[k]||0),0));
  _charts['chart-spc-tenure'] = new Chart(document.getElementById('chart-spc-tenure'), {
    type:'bar',
    data:{ labels:tenureLabels, datasets:[{ label:'Tenants', data:tenureData,
      backgroundColor:[CONFIG.palette.gray2,CONFIG.palette.slate,CONFIG.palette.blue,CONFIG.palette.navy] }]},
    options:{ responsive:true, plugins:{legend:{display:false}} },
  });
}

// ─── renderPersonasTab ────────────────────────────────────────────────────────
function renderPersonasTab() {
  const el = document.getElementById('tab-personas');
  el.innerHTML = '';

  // Match banner
  const banner = document.createElement('div');
  banner.className = 'match-banner';
  banner.innerHTML = `
    <div class="match-headline">${CONFIG.scale.linkedProfiles.toLocaleString()} passenger profiles linked across flight manifests, concession POS &amp; loyalty data</div>
    <div class="match-stats">
      <span>Match confidence: <strong>${CONFIG.scale.matchConfidence}%</strong></span>
      <span>Intl share: <strong>${CONFIG.scale.intlPassengerShare}%</strong></span>
      <span>Avg dwell: <strong>${CONFIG.scale.avgDwellMinutes} min</strong></span>
      <span>SPPE: <strong>$${CONFIG.scale.spendPerEnplanement}</strong></span>
    </div>`;
  el.appendChild(banner);

  // Filter bar
  el.innerHTML += `
    <div class="filter-bar">
      <div class="filter-group"><label>Terminal</label>
        <select data-filter="terminal" data-tab="personas" onchange="handleFilter(this)">
          <option value="all">All Terminals</option>
        </select></div>
      <div class="filter-group"><label>Segment</label>
        <select data-filter="segment" data-tab="personas" onchange="handleFilter(this)">
          <option value="all">All Linked</option>
          <option value="top10">Top 10% Spenders</option>
          <option value="Int'l Leisure">Intl Leisure</option>
          <option value="Int'l Business">Intl Business</option>
          <option value="Domestic Leisure">Domestic Leisure</option>
          <option value="Domestic Business">Domestic Business</option>
          <option value="Transit">Transit</option>
        </select></div>
      <div class="filter-group"><label>Linked Status</label>
        <select data-filter="linkedStatus" data-tab="personas" onchange="handleFilter(this)">
          <option value="linked">Linked Only</option>
          <option value="all">All</option>
        </select></div>
      <button class="btn-reset" onclick="resetFilters('personas')">Reset</button>
      <button class="btn-export" onclick="exportCSV('personas')">Export</button>
    </div>`;

  // Hero callout — 41% insight
  const intlLeisure   = TRAVELERS.filter(t => t.segment === "Int'l Leisure");
  const intlPct       = Math.round(intlLeisure.length / TRAVELERS.length * 100);
  const intlPremSpend = intlLeisure.reduce((s,t)=>s+t.spend_premium,0);
  const totalPremSpend= TRAVELERS.reduce((s,t)=>s+t.spend_premium,0);
  const intlSpendPct  = totalPremSpend ? Math.round(intlPremSpend/totalPremSpend*100) : 41;

  const hero = document.createElement('div');
  hero.className = 'ban-hero';
  hero.innerHTML = `
    <div class="ban-hero-number">${intlSpendPct}%</div>
    <div class="ban-hero-label">of premium retail spend driven by just ${intlPct}% of passengers — international leisure travelers</div>
    <div class="ban-hero-bar-wrap">
      <div class="ban-hero-bar-label">Passenger share vs. premium spend share — international leisure</div>
      <div class="ban-hero-bar-label">Passenger share: ${intlPct}%</div>
      <div class="ban-hero-bar-track"><div class="ban-hero-bar-fill" style="width:${intlPct}%"></div></div>
      <div class="ban-hero-bar-label">Premium spend share: ${intlSpendPct}%</div>
      <div class="ban-hero-bar-track"><div class="ban-hero-bar-fill" style="width:${intlSpendPct}%"></div></div>
    </div>`;
  el.appendChild(hero);

  // BAN grid (5)
  const travelers   = filterTravelers();
  const linked      = travelers.filter(t=>t.global_traveler_id);
  const avgSpend    = linked.length ? Math.round(linked.reduce((s,t)=>s+t.estimated_total_spend,0)/linked.length) : 0;
  const matchConf   = CONFIG.scale.matchConfidence;
  const retConvRate = CONFIG.scale.retailConversionRate;
  const domPax      = TRAVELERS.filter(t=>t.home_state).length;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Linked Profiles',            CONFIG.scale.linkedProfiles.toLocaleString(), true, 'Unique passenger identities matched across flight manifests, concession POS, and loyalty/external data.');
  renderBAN(banGrid, 'Match Confidence',            `${matchConf}%`);
  renderBAN(banGrid, 'Retail Conversion Rate',      `${retConvRate}%`, false, 'Share of 90+ min dwell passengers who made a retail purchase. Only measurable for linked profiles.');
  renderBAN(banGrid, 'Avg Spend / Linked Passenger',`$${avgSpend}`);
  renderBAN(banGrid, 'Domestic Origin Passengers',  fmt.num(domPax));
  el.appendChild(banGrid);

  // Row 1: Sankey (2/3) + Venn (1/3)
  const row1 = document.createElement('div');
  row1.className = 'chart-grid-3col';

  const sankeyCard = document.createElement('div');
  sankeyCard.className = 'chart-card';
  sankeyCard.innerHTML = `
    <div class="chart-title">Passenger → Terminal → Spend Category${infoIcon('How origin markets flow through terminals into spend categories. Japan → Terminal 2 → Duty-Free/Premium is the dominant high-value path. Only visible after P3RL links flight manifests to POS.')}</div>
    <div id="chart-personas-sankey" style="width:100%;height:260px;"></div>
    <div class="sankey-subtitle">International leisure traveler spend is 4× the platform average — invisible without identity resolution</div>`;
  row1.appendChild(sankeyCard);

  const vennCard = document.createElement('div');
  vennCard.className = 'chart-card';
  vennCard.innerHTML = `<div class="chart-title">Data Source Overlap${infoIcon('Passenger profiles appearing across Flight Manifests, Concession POS, and Loyalty/External data. Flight × POS is the largest two-way overlap. The three-way center is the highest-confidence linked profile — labeled with the linked count.')}</div><div id="chart-personas-venn"></div>`;
  row1.appendChild(vennCard);
  el.appendChild(row1);

  // Row 2: scatter + linked bar
  const row2 = document.createElement('div');
  row2.className = 'chart-grid chart-grid-2';
  [
    ['chart-personas-spend',  'Spend by Passenger Segment',       'Estimated total spend by identity segment. International linked passengers show significantly higher spend than domestic or single-source profiles.'],
    ['chart-personas-linked', 'Linked vs. Single-Source by Terminal','Per-terminal breakdown of linked vs. single-source travelers. Linked travelers generate more spend and higher category diversity.'],
  ].forEach(([id, title, tip]) => row2.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(row2);

  // Vendor recommendation callout — derived from category_preference data
  const maukaTravelers = TRAVELERS.filter(t => t.global_traveler_id && t.terminal === 'Mauka Concourse');
  const allLinkedTravelers = TRAVELERS.filter(t => t.global_traveler_id);
  const maukaPrefPct = pref => maukaTravelers.length
    ? Math.round(maukaTravelers.filter(t => t.category_preference === pref).length / maukaTravelers.length * 100) : 0;
  const airportPrefPct = pref => allLinkedTravelers.length
    ? Math.round(allLinkedTravelers.filter(t => t.category_preference === pref).length / allLinkedTravelers.length * 100) : 0;
  const localMauka   = maukaPrefPct('local/artisan');
  const localAirport = airportPrefPct('local/artisan');
  const qsMauka      = maukaPrefPct('quick-service');
  const luxMauka     = maukaPrefPct('duty-free/luxury');
  const localIdx     = localAirport ? Math.round(localMauka / localAirport * 10) / 10 : 0;

  const callout = document.createElement('div');
  callout.className = 'vendor-callout';
  callout.innerHTML = `
    <div class="vendor-callout-title">Vendor Recruitment Recommendation — Mauka Concourse</div>
    The 2 vacant Mauka Concourse spaces (M4 &amp; M5) face the highest-concentration international transit corridor at HNL.
    Among linked Mauka travelers: <strong>${localMauka}% prefer local/artisan goods</strong> (${localIdx}× the airport average of ${localAirport}%)
    and <strong>${luxMauka}% prefer duty-free/luxury</strong> (${Math.round(luxMauka / (airportPrefPct('duty-free/luxury') || 1) * 10) / 10}× airport average) —
    driven by the international leisure segment that indexes <strong>${CONFIG.scale.intlLeisureSpendPremium}× on premium spend</strong>.
    Transit passengers make up ~40% of Mauka foot traffic but are underrepresented in linked data (42% match rate vs. 72–80% for leisure/business);
    their short dwell profile indicates a <strong>Quick-Service F&amp;B</strong> gap.
    <br><br>
    <strong>Recommended category mix:</strong> Premium Retail &nbsp;/&nbsp; Local Hawaiian Brands &nbsp;/&nbsp; Quick-Service F&amp;B`;
  el.appendChild(callout);

  renderPersonasCharts(travelers);
}

// ─── renderPersonasCharts ─────────────────────────────────────────────────────
function renderPersonasCharts(travelers) {
  // 1. Sankey: Origin Market → Terminal → Spend Category
  const sankeyEl = document.getElementById('chart-personas-sankey');
  if (!sankeyEl) return;
  sankeyEl.innerHTML = '';
  const W = sankeyEl.clientWidth || 500, H = 260;
  const svg = d3.select(sankeyEl).append('svg').attr('width',W).attr('height',H);

  const ORIGIN_MARKETS  = ['US Mainland','Japan','Korea','Australia'];  // Canada omitted
  const TERMINALS_SANKEY = CONFIG.terminals;
  const CATS = CONFIG.categories;

  // Build node list
  const nodes = [
    ...ORIGIN_MARKETS.map(name=>({name})),
    ...TERMINALS_SANKEY.map(name=>({name:name.split('–')[0].trim()})),
    ...CATS.map(name=>({name})),
  ];
  const oIdx = m => ORIGIN_MARKETS.indexOf(m);
  const tIdx = t => ORIGIN_MARKETS.length + TERMINALS_SANKEY.indexOf(t);
  const cIdx = c => ORIGIN_MARKETS.length + TERMINALS_SANKEY.length + CATS.indexOf(c);

  // Aggregate flows from TRAVELERS (linked only)
  const linked = travelers.filter(t=>t.global_traveler_id && ORIGIN_MARKETS.includes(t.origin_market));
  const originToTerminal = {};
  const terminalToCategory = {};

  linked.forEach(t => {
    const oKey = `${oIdx(t.origin_market)}_${tIdx(t.terminal)}`;
    originToTerminal[oKey] = (originToTerminal[oKey]||0) + 1;

    const spend = t.spend_fb > t.spend_retail && t.spend_fb > t.spend_premium ? 0
      : t.spend_premium >= t.spend_retail ? 2 : 1;
    const catName = CATS[spend];
    const tKey = `${tIdx(t.terminal)}_${cIdx(catName)}`;
    terminalToCategory[tKey] = (terminalToCategory[tKey]||0) + 1;
  });

  const links = [
    ...Object.entries(originToTerminal).map(([k,v])=>{
      const [s,target]=k.split('_').map(Number); return {source:s,target,value:v};
    }),
    ...Object.entries(terminalToCategory).map(([k,v])=>{
      const [s,target]=k.split('_').map(Number); return {source:s,target,value:v};
    }),
  ].filter(l=>l.value>0);

  const sankeyLayout = d3.sankey().nodeWidth(18).nodePadding(14).extent([[1,1],[W-1,H-1]]);
  const graph = sankeyLayout({ nodes: nodes.map(d=>Object.assign({},d)), links: links.map(d=>Object.assign({},d)) });

  const nodeColors = [
    ...ORIGIN_MARKETS.map(()=>CONFIG.palette.navy),
    ...TERMINALS_SANKEY.map(()=>CONFIG.palette.blue),
    CONFIG.palette.teal, CONFIG.palette.slate, CONFIG.palette.amber,
  ];

  svg.append('g').selectAll('rect')
    .data(graph.nodes).join('rect')
    .attr('x',d=>d.x0).attr('y',d=>d.y0)
    .attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0))
    .attr('fill',(_,i)=>nodeColors[i]||CONFIG.palette.slate)
    .append('title').text(d=>d.name);

  svg.append('g').attr('fill','none').selectAll('path')
    .data(graph.links).join('path')
    .attr('d',d3.sankeyLinkHorizontal())
    .attr('stroke',d=>{
      // Highlight Japan → Terminal 2 → Duty-Free path in amber
      const isJapan = d.source.index===1;
      const isT2 = d.target.index === ORIGIN_MARKETS.length + 1;
      const isPremium = d.target.index === cIdx('Duty-Free / Premium');
      return (isJapan || isT2 || isPremium) ? CONFIG.palette.amber : CONFIG.palette.gray2;
    })
    .attr('stroke-width',d=>Math.max(1,d.width))
    .attr('opacity',0.55)
    .append('title').text(d=>`${d.source.name} → ${d.target.name}: ${d.value.toLocaleString()}`);

  svg.append('g').style('font','10px sans-serif').selectAll('text')
    .data(graph.nodes).join('text')
    .attr('x',d=>d.x0<W/2?d.x1+5:d.x0-5)
    .attr('y',d=>(d.y1+d.y0)/2).attr('dy','0.35em')
    .attr('text-anchor',d=>d.x0<W/2?'start':'end')
    .text(d=>d.name.length>14?d.name.slice(0,13)+'…':d.name)
    .style('fill',CONFIG.palette.navy).style('font-weight','600');

  // 2. Venn: Flight Data × Concession POS × Loyalty/External
  const hasF = t=>t.linked_sources.includes('FLIGHT');
  const hasP = t=>t.linked_sources.includes('POS');
  const hasL = t=>t.linked_sources.includes('LOYALTY');
  const linked3 = TRAVELERS.filter(t=>t.global_traveler_id);

  const flightOnly  = linked3.filter(t=> hasF(t) && !hasP(t) && !hasL(t)).length;
  const posOnly     = linked3.filter(t=>!hasF(t) &&  hasP(t) && !hasL(t)).length;
  const loyaltyOnly = linked3.filter(t=>!hasF(t) && !hasP(t) &&  hasL(t)).length;
  const flightPOS   = linked3.filter(t=> hasF(t) &&  hasP(t) && !hasL(t)).length;
  const flightLoy   = linked3.filter(t=> hasF(t) && !hasP(t) &&  hasL(t)).length;
  const posLoy      = linked3.filter(t=>!hasF(t) &&  hasP(t) &&  hasL(t)).length;
  const allThree    = linked3.filter(t=> hasF(t) &&  hasP(t) &&  hasL(t)).length;

  // Scale sample counts to the actual 13.1M linked profile universe
  const scaleFactor = CONFIG.scale.linkedProfiles / linked3.length;
  const scaleVenn = n => {
    const s = Math.round(n * scaleFactor);
    if (s >= 1_000_000) return (s / 1_000_000).toFixed(1) + 'M';
    if (s >= 1_000)     return Math.round(s / 1_000) + 'K';
    return s.toString();
  };

  const vennEl = document.getElementById('chart-personas-venn');
  vennEl.innerHTML = '';
  const VW = vennEl.clientWidth || 280, VH = 240, r=72;
  const FC={x:VW/2-50,y:85}, PC={x:VW/2+50,y:85}, LC={x:VW/2,y:165};

  const vSvg = d3.select(vennEl).append('svg').attr('width',VW).attr('height',VH);
  [[FC,'#1B2A4A'],[PC,'#0D9488'],[LC,'#2E618F']].forEach(([c,col])=>{
    vSvg.append('circle').attr('cx',c.x).attr('cy',c.y).attr('r',r)
      .attr('fill',col).attr('fill-opacity',0.15).attr('stroke',col).attr('stroke-width',1.5);
  });

  const vtxt=(x,y,text,size=11,bold=false,col='#111827')=>
    vSvg.append('text').attr('x',x).attr('y',y).attr('text-anchor','middle')
      .attr('dominant-baseline','middle').attr('font-size',size)
      .attr('font-family',"'Plus Jakarta Sans',system-ui,sans-serif")
      .attr('font-weight',bold?700:500).attr('fill',col).text(text);

  vtxt(VW/2-105,52,'Flight',11,true,'#1B2A4A');
  vtxt(VW/2+105,52,'POS',11,true,'#0D9488');
  vtxt(VW/2,228,'Loyalty',11,true,'#2E618F');

  vtxt(VW/2-90,85,scaleVenn(flightOnly));
  vtxt(VW/2+90,85,scaleVenn(posOnly));
  vtxt(VW/2,210,scaleVenn(loyaltyOnly));
  vtxt(VW/2,62,scaleVenn(flightPOS),11,true,'#0D9488');  // largest 2-way — bold
  vtxt(VW/2-48,130,scaleVenn(flightLoy));
  vtxt(VW/2+48,130,scaleVenn(posLoy));
  vtxt(VW/2,110,scaleVenn(allThree),13,true,'#B45309');  // insight moment

  // 3. Spend scatter by segment
  destroyChart('chart-personas-spend');
  const SEGS = ['Domestic Leisure','Domestic Business','Transit',"Int'l Business","Int'l Leisure"];
  const segColors = [CONFIG.palette.gray,CONFIG.palette.gray2,CONFIG.palette.slate,CONFIG.palette.blue,CONFIG.palette.amber];
  const scatterDatasets = SEGS.map((seg,si)=>({
    type:'scatter', label:seg,
    data: travelers.filter(t=>t.segment===seg)
      .map((t,j)=>({ x: si + ((j%11)-5)*0.055, y: t.estimated_total_spend })),
    backgroundColor: segColors[si]+'66', pointRadius:3, order:1,
  }));

  function segMean(segs) {
    const sub = travelers.filter(t=>segs.includes(t.segment));
    return sub.length ? Math.round(sub.reduce((s,t)=>s+t.estimated_total_spend,0)/sub.length) : 0;
  }
  const domMean  = segMean(['Domestic Leisure','Domestic Business','Transit']);
  const intlMean = segMean(["Int'l Business","Int'l Leisure"]);
  const meanDatasets = [
    { type:'line', label:`Domestic mean $${domMean}`,
      data:[{x:-0.4,y:domMean},{x:2.4,y:domMean}],
      borderColor:CONFIG.palette.slate, borderWidth:2, borderDash:[6,3], pointRadius:0, order:0 },
    { type:'line', label:`Intl mean $${intlMean}`,
      data:[{x:2.6,y:intlMean},{x:4.4,y:intlMean}],
      borderColor:CONFIG.palette.amber, borderWidth:2, borderDash:[6,3], pointRadius:0, order:0 },
  ];

  _charts['chart-personas-spend'] = new Chart(document.getElementById('chart-personas-spend'), {
    type:'scatter',
    data:{ datasets:[...scatterDatasets,...meanDatasets] },
    options:{ responsive:true,
      scales:{
        x:{ min:-0.5, max:4.5, grid:{display:false},
          ticks:{stepSize:1, callback:val=>SEGS[Math.round(val)]||''} },
        y:{ title:{display:true,text:'Est. Total Spend ($)'} },
      },
      plugins:{ legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},
        tooltip:{ callbacks:{
          title:items=>items[0]?.dataset?.label||'',
          label:ctx=>`Spend: $${Math.round(ctx.parsed.y).toLocaleString()}`,
        }},
      },
    },
  });

  // 4. Linked vs. Single-Source by Terminal
  destroyChart('chart-personas-linked');
  const linkedByTerminal = {}, singleByTerminal = {};
  TRAVELERS.forEach(t=>{
    if (t.global_traveler_id) linkedByTerminal[t.terminal]=(linkedByTerminal[t.terminal]||0)+1;
    else                      singleByTerminal[t.terminal]=(singleByTerminal[t.terminal]||0)+1;
  });
  _charts['chart-personas-linked'] = new Chart(document.getElementById('chart-personas-linked'), {
    type:'bar',
    data:{ labels:CONFIG.terminals.map(t=>t.split('–')[0].trim()),
      datasets:[
        { label:'Linked',        data:CONFIG.terminals.map(t=>linkedByTerminal[t]||0), backgroundColor:CONFIG.palette.teal },
        { label:'Single-Source', data:CONFIG.terminals.map(t=>singleByTerminal[t]||0), backgroundColor:CONFIG.palette.gray2 },
      ]},
    options:{ responsive:true, scales:{x:{stacked:true},y:{stacked:true}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}} },
  });
}
