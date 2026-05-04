function exportCSV(tab) {
  let rows, filename, fields;
  if (tab === 'passengers') {
    rows = filterDaily(DAILY_PASSENGERS, 'passengers');
    filename = 'hnl_passenger_traffic_export.csv';
    fields = ['date','terminal','total_passengers','intl_pct','connecting_pct','avg_dwell_minutes',
              'dwell_under30','dwell_30_60','dwell_60_90','dwell_90_120','dwell_over120',
              'pax_us_mainland','pax_japan','pax_korea','pax_australia','pax_canada'];
  } else if (tab === 'concessions') {
    rows = filterDaily(DAILY_CONCESSIONS, 'concessions');
    filename = 'hnl_concession_revenue_export.csv';
    fields = ['date','terminal','revenue_fb','revenue_retail','revenue_premium',
              'transactions_fb','transactions_retail','transactions_premium','sppe',
              'peak_morning','peak_midmorning','peak_midday','peak_afternoon','peak_evening'];
  } else if (tab === 'spaces') {
    rows = filterDaily(DAILY_SPACES, 'spaces');
    filename = 'hnl_retail_spaces_export.csv';
    fields = ['date','terminal','total_sqft','occupied_sqft','vacant_sqft',
              'total_spaces','vacant_spaces','occupied_spaces',
              'revenue_sqft_fb','revenue_sqft_retail','revenue_sqft_premium',
              'avg_days_to_lease','new_leases','active_tenants'];
  } else {
    rows = filterTravelers();
    filename = 'hnl_passenger_personas_export.csv';
    fields = ['global_traveler_id','segment','terminal','origin_market','carrier',
              'linked_sources','match_confidence_score','spend_fb','spend_retail',
              'spend_premium','estimated_total_spend','dwell_minutes','home_state','prior_visit_flag'];
  }

  const header = fields.join(',');
  const body = rows.map(r => fields.map(f => JSON.stringify(r[f]??'')).join(',')).join('\n');
  const blob = new Blob([header+'\n'+body], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
