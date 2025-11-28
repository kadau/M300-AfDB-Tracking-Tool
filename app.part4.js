/* app.part4.js
   Bloc 4: Financing, Details, search, exports
*/

/* ---------- Financing ---------- */
let finPieChart = null;
function renderFinancing(){
  const rows = filteredRows.filter(r => (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global');
  const total = rows.reduce((s,r)=> s + safeNum(r['Total (All included - USD)']), 0);
  const bankFin = rows.reduce((s,r)=> s + safeNum(r["BANK's Financing [ADB/ADF/NTF]"]),0);
  const adfLoan = rows.reduce((s,r)=> s + safeNum(r['ADF Loan - USD']),0);
  const adfGrant = rows.reduce((s,r)=> s + safeNum(r['ADF Grant - USD']),0);
  const adb = rows.reduce((s,r)=> s + safeNum(r['ADB - USD']),0);
  const ntf = rows.reduce((s,r)=> s + safeNum(r['NTF - USD']),0);
  const others = rows.reduce((s,r)=> s + safeNum(r['Others (Trust Fund/ counterparts,…) - USD']),0);

  const tb = document.getElementById('fin-body');
  function pct(x){ return total? Math.round(x/total*100) : 0; }
  tb.innerHTML = `<tr><td style="font-weight:700;background:var(--afdb-green-light)">Total (All included - USD)</td><td style="text-align:right;font-weight:700;background:var(--afdb-green-light)">${formatNum(total)}</td><td style="text-align:right;background:var(--afdb-green-light)">${pct(total)}%</td></tr>
  <tr><td style="font-weight:700;background:var(--afdb-green-light)">BANK's Financing [ADB/ADF/NTF]</td><td style="text-align:right;font-weight:700;background:var(--afdb-green-light)">${formatNum(bankFin)}</td><td style="text-align:right;background:var(--afdb-green-light)">${pct(bankFin)}%</td></tr>
  <tr><td>ADF Loan - USD</td><td style="text-align:right">${formatNum(adfLoan)}</td><td style="text-align:right">${pct(adfLoan)}%</td></tr>
  <tr><td>ADF Grant - USD</td><td style="text-align:right">${formatNum(adfGrant)}</td><td style="text-align:right">${pct(adfGrant)}%</td></tr>
  <tr><td>ADB - USD</td><td style="text-align:right">${formatNum(adb)}</td><td style="text-align:right">${pct(adb)}%</td></tr>
  <tr><td>NTF - USD</td><td style="text-align:right">${formatNum(ntf)}</td><td style="text-align:right">${pct(ntf)}%</td></tr>
  <tr><td style="font-weight:700;background:var(--afdb-green-light)">Others (Trust Fund/ counterparts,…) - USD</td><td style="text-align:right;font-weight:700;background:var(--afdb-green-light)">${formatNum(others)}</td><td style="text-align:right;background:var(--afdb-green-light)">${pct(others)}%</td></tr>`;

  const ctx = document.getElementById('fin-pie').getContext('2d');
  const data = [adfLoan, adfGrant, adb, ntf, others];
  const labels = ['ADF Loan','ADF Grant','ADB','NTF','Others'];
  if(finPieChart) finPieChart.destroy();
  finPieChart = new Chart(ctx, {
    type:'pie',
    data:{labels:labels,datasets:[{data:data, backgroundColor:['#2f8f52','#90c9a0','#0072BC','#f6b64a','#9aa0a0']}]},
    options:{responsive:true, plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:function(ctx){
      const v = ctx.raw || 0; return `${ctx.label}: ${formatNum(v)} (${pct(v)}%)`;
    }}}}}
  });
}

/* ---------- Details by project (aggregation) ---------- */
function groupByProject(){
  const map = {};
  rawRows.forEach(r=>{
    if((r['Global/Milestone']||'').toString().trim().toLowerCase() !== 'global') return;
    const code = (r['Project Code']||'').toString().trim() || '(no code)';
    if(!map[code]) {
      map[code] = {
        Region: r['Region']||'',
        Country: r['Country']||'',
        ProjectCode: code,
        ProjectName: r['Project name']||r['Project Name']||'',
        ApprovalDate: r['Approval Date']||'',
        LoanPurpose: r['Loan Purpose']||'',
        Total: 0,
        BankFin: 0,
        connections_exp:0, connections_del:0,
        people_exp:0, people_del:0,
        mw_exp:0, mw_del:0,
        lines_exp:0, lines_del:0,
        dist_exp:0, dist_del:0
      };
    }
    const entry = map[code];
    entry.Total += safeNum(r['Total (All included - USD)']);
    entry.BankFin += safeNum(r["BANK's Financing [ADB/ADF/NTF]"]);
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    entry.connections_exp += (mode === 'expected')? safeNum(r['Number of electricity connections']) : 0;
    entry.connections_del += (mode === 'delivered')? safeNum(r['Number of electricity connections']) : 0;
    entry.people_exp += (mode === 'expected')? safeNum(r['People provided with access to electricity']) : 0;
    entry.people_del += (mode === 'delivered')? safeNum(r['People provided with access to electricity']) : 0;
    entry.mw_exp += (mode === 'expected')? safeNum(r['Power capacity installed (MW)']) : 0;
    entry.mw_del += (mode === 'delivered')? safeNum(r['Power capacity installed (MW)']) : 0;
    entry.lines_exp += (mode === 'expected')? safeNum(r['Cross-border and National Transmission Lines (KM)']) : 0;
    entry.lines_del += (mode === 'delivered')? safeNum(r['Cross-border and National Transmission Lines (KM)']) : 0;
    entry.dist_exp += (mode === 'expected')? safeNum(r['New or improved power distribution lines (KM)']) : 0;
    entry.dist_del += (mode === 'delivered')? safeNum(r['New or improved power distribution lines (KM)']) : 0;
  });
  return Object.values(map).sort((a,b)=> (a.ProjectName||'').localeCompare(b.ProjectName||''));
}

function renderDetailsTable(){
  const list = groupByProject();
  const head = document.getElementById('details-head'); head.innerHTML = '';
  const headerRow1 = document.createElement('tr');
  headerRow1.innerHTML = `<th rowspan="2">Region</th><th rowspan="2">Country</th><th rowspan="2">Project Code</th><th rowspan="2">Project name</th><th rowspan="2">Approval Date</th><th rowspan="2">Loan Purpose</th><th rowspan="2">Total (All included - USD)</th><th rowspan="2">BANK's Financing [ADB/ADF/NTF]</th>
    <th colspan="2">Number of electricity connections</th><th colspan="2">People provided with access to electricity</th><th colspan="2">Power capacity installed (MW)</th><th colspan="2">Cross-border and National Transmission Lines (KM)</th><th colspan="2">New or improved power distribution lines (KM)</th>`;
  const headerRow2 = document.createElement('tr');
  headerRow2.innerHTML = `<th>Expected</th><th>Delivered</th><th>Expected</th><th>Delivered</th><th>Expected</th><th>Delivered</th><th>Expected</th><th>Delivered</th><th>Expected</th><th>Delivered</th>`;
  head.appendChild(headerRow1); head.appendChild(headerRow2);

  const tbody = document.getElementById('details-body');
  const q = document.getElementById('details-search').value.trim().toLowerCase();
  let html = '';
  list.forEach(r=>{
    const match = !q || (String(r.ProjectName||'').toLowerCase().includes(q) || String(r.ProjectCode||'').toLowerCase().includes(q) || String(r.Country||'').toLowerCase().includes(q));
    if(!match) return;
    const link = 'https://mapafrica.afdb.org/fr/projects/46002-' + encodeURIComponent(r.ProjectCode);
    html += `<tr>
      <td style="text-align:left">${r.Region}</td>
      <td style="text-align:left">${r.Country}</td>
      <td style="text-align:center">${r.ProjectCode}</td>
      <td style="text-align:left"><a href="${link}" target="_blank">${r.ProjectName||'(no name)'}</a></td>
      <td style="text-align:center">${r.ApprovalDate||''}</td>
      <td style="text-align:center">${r.LoanPurpose||''}</td>
      <td style="text-align:right">${formatNum(r.Total)}</td>
      <td style="text-align:right">${formatNum(r.BankFin)}</td>
      <td style="text-align:center">${formatNum(r.connections_exp)}</td><td style="text-align:center">${formatNum(r.connections_del)}</td>
      <td style="text-align:center">${formatNum(r.people_exp)}</td><td style="text-align:center">${formatNum(r.people_del)}</td>
      <td style="text-align:center">${formatNum(r.mw_exp)}</td><td style="text-align:center">${formatNum(r.mw_del)}</td>
      <td style="text-align:center">${formatNum(r.lines_exp)}</td><td style="text-align:center">${formatNum(r.lines_del)}</td>
      <td style="text-align:center">${formatNum(r.dist_exp)}</td><td style="text-align:center">${formatNum(r.dist_del)}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

/* ---------- Search & export ---------- */
document.getElementById('details-search').addEventListener('input', renderDetailsTable);

document.getElementById('btn-export').addEventListener('click', ()=>{
  if(!filteredRows.length){ alert('Aucune donnée à exporter'); return; }
  const cols = Object.keys(filteredRows[0]);
  const csv = [cols.join(',')].concat(
    filteredRows.map(r => cols.map(c=>`"${String(r[c]||'').replace(/"/g,'""')}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  saveAs(blob, 'M300-filtered.csv');
});

document.getElementById('details-export').addEventListener('click', ()=>{
  const list = groupByProject();
  if(!list.length){ alert('Aucune donnée'); return; }
  const cols = Object.keys(list[0]);
  const csv = [cols.join(',')].concat(list.map(r=>cols.map(c=>`"${String(r[c]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
  saveAs(new Blob([csv],{type:'text/csv;charset=utf-8'}), 'M300-details.csv');
});

/* ---------- Initialization: if rawRows already present (e.g., reloaded), render ---------- */
if(rawRows.length) applyFiltersAndRender();
