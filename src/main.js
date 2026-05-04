function populateTerminalDropdowns() {
  document.querySelectorAll('select[data-filter="terminal"]').forEach(sel => {
    // Remove any previously added options (keep "All Terminals" first option)
    while (sel.options.length > 1) sel.remove(1);
    CONFIG.terminals.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      sel.appendChild(opt);
    });
  });
}

function renderTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'passengers')  renderPassengersTab();
  if (tabId === 'concessions') renderConcessionsTab();
  if (tabId === 'spaces')      renderSpacesTab();
  if (tabId === 'personas')    renderPersonasTab();

  populateTerminalDropdowns();
}

function handleFilter(selectEl) {
  const tab    = selectEl.dataset.tab;
  const filter = selectEl.dataset.filter;
  STATE[tab][filter] = selectEl.value;
  renderTab(tab);
}

function resetFilters(tab) {
  Object.keys(STATE[tab]).forEach(k => {
    STATE[tab][k] = k === 'linkedStatus' ? 'linked' : 'all';
  });
  renderTab(tab);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTab(btn.dataset.tab));
  });
  populateTerminalDropdowns();
  renderTab('passengers');
});
