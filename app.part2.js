/* app.part2.js
   Bloc 2: render connections table, connections gauges, households table and gauges
*/

/* ---------- Connections table (Group 1) ---------- */
function renderConnectionsTable(){
  const rows = filteredRows.filter(r => ((r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global'));
  const systems = ['All supply systems','On-grid','Mini-grid','Off-grid'];
  const indicators = ['All type of connections','Households','Businesses','Public services'];

  const data = {};
  indicators.forEach(ind=>{
    data[ind] = {};
    systems.forEach(sys=> data[ind][sys] = {Exp:0,Del:0});
  });

  rows.forEach(r=>{
    const sub = (r['Sub-Sub-indicators']||'').toString().trim();
    if(!['Households','Businesses','Public services'].includes(sub)) return;
    let sys = (r['Sub-indicators']||'').toString().trim();
    if(!['On-grid','Mini-grid','Off-grid'].includes(sys)) sys = 'All supply systems';
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    const v = safeNum(r['Number of electricity connections']);
    if(mode === 'expected') data[sub][sys].Exp += v;
    if(mode === 'delivered') data[sub][sys].Del += v;
    // aggregate to All supply systems per sub and overall
    if(sys !== 'All supply systems'){
      if(mode === 'expected') data[sub]['All supply systems'].Exp += v;
      if(mode === 'delivered') data[sub]['All supply systems'].Del += v;
    }
    // All type of connections row accumulates all subs
    if(mode === 'expected') data['All type of connections'][sys].Exp += v;
    if(mode === 'delivered') data['All type of connections'][sys].Del += v;
    if(sys !== 'All supply systems'){
      if(mode === 'expected') data['All type of connections']['All supply systems'].Exp += v;
      if(mode === 'delivered') data['All type of connections']['All supply systems'].Del += v;
    }
  });

  const tbody = document.getElementById('connections-body');
  let html = '';
  indicators.forEach(ind=>{
    html += '<tr>';
    html += `<td style="text-align:left">${ind}</td>`;
    systems.forEach(sys=>{
      html += `<td style="text-align:center">${formatNum(data[ind][sys].Exp)}</td>`;
      html += `<td style="text-align:center">${formatNum(data[ind][sys].Del)}</td>`;
    });
    html += '</tr>';
  });
  tbody.innerHTML = html;
}

/* ---------- Connections gauges (values ABOVE bars) ---------- */
function renderConnectionsGauges(){
  const rows = filteredRows.filter(r => ((r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global'));
  const systems = ['All supply systems','On-grid','Mini-grid','Off-grid'];
  const subs = ['All type of connections','Households','Businesses','Public services'];
  const data = {};
  subs.forEach(s => { data[s] = {}; systems.forEach(sys=> data[s][sys] = {Exp:0,Del:0}); });
  rows.forEach(r=>{
    const sub = (r['Sub-Sub-indicators']||'').toString().trim();
    if(!['Households','Businesses','Public services'].includes(sub)) return;
    let sys = (r['Sub-indicators']||'').toString().trim();
    if(!['On-grid','Mini-grid','Off-grid'].includes(sys)) sys='All supply systems';
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    const v = safeNum(r['Number of electricity connections']);
    if(mode==='expected') data[sub][sys].Exp += v;
    if(mode==='delivered') data[sub][sys].Del += v;
    if(sys !== 'All supply systems'){
      if(mode==='expected') data[sub]['All supply systems'].Exp += v;
      if(mode==='delivered') data[sub]['All supply systems'].Del += v;
    }
    if(mode==='expected') data['All type of connections'][sys].Exp += v;
    if(mode==='delivered') data['All type of connections'][sys].Del += v;
    if(sys !== 'All supply systems'){
      if(mode==='expected') data['All type of connections']['All supply systems'].Exp += v;
      if(mode==='delivered') data['All type of connections']['All supply systems'].Del += v;
    }
  });

  const cols = {'gcol-as':'All supply systems','gcol-og':'On-grid','gcol-mg':'Mini-grid','gcol-of':'Off-grid'};
  Object.keys(cols).forEach(id=>{
    const sys = cols[id];
    const container = document.getElementById(id);
    let html = `<h4>${sys}</h4>`;
    ['All type of connections','Households','Businesses','Public services'].forEach(label=>{
      const exp = data[label][sys].Exp;
      const del = data[label][sys].Del;
      const pct = exp>0 ? Math.round(del/exp*100) : (del>0?100:0);
      html += `<div class="gitem">
        <div class="lbl">${label}</div>
        <div class="val">${formatNum(del)} / ${formatNum(exp)} (${pct}%)</div>
        <div class="gbar"><div class="fill" style="width:${pct}%"></div></div>
      </div>`;
    });
    container.innerHTML = html;
  });
}

/* ---------- Households table ---------- */
function renderHouseholdsTable(){
  const rows = filteredRows.filter(r =>
    (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global' &&
    (r['Sub-Sub-indicators']||'').toString().trim().toLowerCase() === 'households'
  );
  const systems = ['All supply systems','On-grid','Mini-grid','Off-grid'];
  const sum = {'All supply systems':{Exp:0,Del:0},'On-grid':{Exp:0,Del:0},'Mini-grid':{Exp:0,Del:0},'Off-grid':{Exp:0,Del:0}};
  rows.forEach(r=>{
    let sys = (r['Sub-indicators']||'').toString().trim();
    if(!['On-grid','Mini-grid','Off-grid'].includes(sys)) sys='All supply systems';
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    const v = safeNum(r['People provided with access to electricity']);
    if(mode==='expected') sum[sys].Exp += v;
    if(mode==='delivered') sum[sys].Del += v;
    if(sys !== 'All supply systems'){
      if(mode==='expected') sum['All supply systems'].Exp += v;
      if(mode==='delivered') sum['All supply systems'].Del += v;
    }
  });
  const tbody = document.getElementById('households-body');
  const html = `<tr>
    <td style="text-align:left">People provided with access to electricity (Households)</td>
    <td style="text-align:center">${formatNum(sum['All supply systems'].Exp)}</td><td style="text-align:center">${formatNum(sum['All supply systems'].Del)}</td>
    <td style="text-align:center">${formatNum(sum['On-grid'].Exp)}</td><td style="text-align:center">${formatNum(sum['On-grid'].Del)}</td>
    <td style="text-align:center">${formatNum(sum['Mini-grid'].Exp)}</td><td style="text-align:center">${formatNum(sum['Mini-grid'].Del)}</td>
    <td style="text-align:center">${formatNum(sum['Off-grid'].Exp)}</td><td style="text-align:center">${formatNum(sum['Off-grid'].Del)}</td>
  </tr>`;
  tbody.innerHTML = html;
}

/* ---------- Households gauges (single row, values above) ---------- */
function renderHouseholdsGauges(){
  const rows = filteredRows.filter(r =>
    (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global' &&
    (r['Sub-Sub-indicators']||'').toString().trim().toLowerCase() === 'households'
  );
  const systems = ['All supply systems','On-grid','Mini-grid','Off-grid'];
  const sum = {'All supply systems':{Exp:0,Del:0},'On-grid':{Exp:0,Del:0},'Mini-grid':{Exp:0,Del:0},'Off-grid':{Exp:0,Del:0}};
  rows.forEach(r=>{
    let sys = (r['Sub-indicators']||'').toString().trim();
    if(!['On-grid','Mini-grid','Off-grid'].includes(sys)) sys='All supply systems';
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    const v = safeNum(r['People provided with access to electricity']);
    if(mode==='expected') sum[sys].Exp += v;
    if(mode==='delivered') sum[sys].Del += v;
    if(sys !== 'All supply systems'){
      if(mode==='expected') sum['All supply systems'].Exp += v;
      if(mode==='delivered') sum['All supply systems'].Del += v;
    }
  });
  const container = document.getElementById('households-gauges');
  let html = '';
  systems.forEach(sys=>{
    const exp = sum[sys].Exp; const del = sum[sys].Del;
    const pct = exp>0 ? Math.round(del/exp*100) : (del>0?100:0);
    html += `<div class="mini">
      <div class="lbl" style="font-weight:700;color:var(--afdb-green-dark)">${sys}</div>
      <div class="val">${formatNum(del)} / ${formatNum(exp)} (${pct}%)</div>
      <div class="gbar"><div class="fill" style="width:${pct}%;background:var(--afdb-green)"></div></div>
    </div>`;
  });
  container.innerHTML = html;
}
