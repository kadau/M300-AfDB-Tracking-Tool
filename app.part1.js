/* app.part1.js
   Bloc 1: initialisation, utilitaires, upload, filters, tabs
*/

/* ---------- Utilities ---------- */
function safeNum(v){
  if(v === null || v === undefined || v === '') return 0;
  if(typeof v === 'string') v = v.replace(/\s+/g,'').replace(/,/g,'.');
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function formatNum(n){
  if(n === null || n === undefined) return '0';
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function normalizeHeaders(h){
  const map = {
    'Sub-Sub-indicator':'Sub-Sub-indicators',
    'Sub-Indicators':'Sub-indicators',
    'Expected or Delivered':'Expected/Delivered',
    'Status':'Expected/Delivered',
    'People provided':'People provided with access to electricity',
    'Bank Financing':'BANK\'s Financing [ADB/ADF/NTF]',
    'ADF Loan':'ADF Loan - USD',
    'ADF Grant':'ADF Grant - USD',
    'Total All':'Total (All included - USD)'
  };
  return h.map(x => (map[x.trim()] || x.trim()));
}

/* ---------- App state ---------- */
let rawRows = [];
let filteredRows = [];
let geojsonData = null;
let mapMission = null;
let choroplethLayer = null;
let markerLayer = null;
let mapOKI = null;
let markerOKI = null;
let lastReportingYears = [];

/* ---------- File load ---------- */
const fileInput = document.getElementById('file-input');
document.getElementById('btn-load').addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

function handleFileUpload(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(evt){
    const data = evt.target.result;
    let wb;
    if(f.name.toLowerCase().endsWith('.csv')){
      const text = new TextDecoder('utf-8').decode(data);
      wb = XLSX.read(text, {type:'string', raw:true});
    } else {
      wb = XLSX.read(data, {type:'array', raw:true});
    }
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    let json = XLSX.utils.sheet_to_json(ws, {defval:''});
    if(json.length === 0){
      alert('Fichier vide ou mal formé');
      return;
    }
    // normalize headers
    const headers = Object.keys(json[0]);
    const normalized = normalizeHeaders(headers);
    if(JSON.stringify(headers) !== JSON.stringify(normalized)){
      json = json.map(row=>{
        const r2 = {};
        headers.forEach((h,i)=> r2[normalized[i]] = row[h]);
        return r2;
      });
    }
    rawRows = json;
    buildFilters();
    applyFiltersAndRender();
  };
  reader.readAsArrayBuffer(f);
}

/* ---------- Filters ---------- */
function uniqueSorted(values){
  const s = Array.from(new Set(values.filter(v=>v !== undefined && v !== null && String(v).trim() !== '').map(v=>String(v).trim())));
  return s.sort((a,b)=> a.localeCompare(b, undefined, {sensitivity:'base'}));
}

function buildFilters(){
  const selRegion = document.getElementById('filter-region');
  const selCountry = document.getElementById('filter-country');
  const selLoan = document.getElementById('filter-loan');
  const regions = uniqueSorted(rawRows.map(r=> r['Region']||''));
  const countries = uniqueSorted(rawRows.map(r=> r['Country']||''));
  const loans = uniqueSorted(rawRows.map(r=> r['Loan Purpose']|| r['LoanPurpose'] || ''));

  function fill(sel, items){
    sel.innerHTML = '';
    items.forEach(i => {
      const opt = document.createElement('option'); opt.value = i; opt.textContent = i;
      sel.appendChild(opt);
    });
  }
  fill(selRegion, regions); fill(selCountry, countries); fill(selLoan, loans);
}

/* ---------- Tabs ---------- */
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.getAttribute('data-tab')).classList.add('active');
    // resize maps after short delay
    setTimeout(()=>{ if(mapMission) mapMission.invalidateSize(); if(mapOKI) mapOKI.invalidateSize(); }, 300);
  });
});

/* ---------- Apply / Reset ---------- */
document.getElementById('btn-apply').addEventListener('click', applyFiltersAndRender);
document.getElementById('btn-reset').addEventListener('click', ()=>{
  document.getElementById('filter-region').selectedIndex = -1;
  document.getElementById('filter-country').selectedIndex = -1;
  document.getElementById('filter-loan').selectedIndex = -1;
  applyFiltersAndRender();
});

function getSelectedOptions(select){
  return Array.from(select.selectedOptions).map(o=>o.value);
}

/* ---------- Main apply ---------- */
function applyFiltersAndRender(){
  const selR = getSelectedOptions(document.getElementById('filter-region'));
  const selC = getSelectedOptions(document.getElementById('filter-country'));
  const selL = getSelectedOptions(document.getElementById('filter-loan'));
  filteredRows = rawRows.filter(r=>{
    let ok = true;
    if(selR.length) ok = ok && selR.includes((r['Region']||'').toString().trim());
    if(selC.length) ok = ok && selC.includes((r['Country']||'').toString().trim());
    const loanVal = (r['Loan Purpose']||r['LoanPurpose']||'').toString().trim();
    if(selL.length) ok = ok && selL.includes(loanVal);
    return ok;
  });
  // render pipeline
  renderConnectionsTable();
  renderConnectionsGauges();
  renderHouseholdsTable();
  renderHouseholdsGauges();
  renderReportingTableMilestones();
  renderWaterfallChart();
  renderMapMission300();
  renderOthersIndicators();
  renderFinancing();
  renderDetailsTable();
}
/* auto load default M300-Database.xlsx if present (from same folder) */
async function tryAutoLoad(){
  try{
    const res = await fetch('M300-Database.xlsx');
    if(!res.ok) return;
    const blob = await res.blob();
    const file = new File([blob],'M300-Database.xlsx');
    parseFile(file, (json)=>{ rawRows = json; postDataLoad(); });
  }catch(e){ console.warn('auto-load failed', e.message); }
}


/* ---------- Auto load geojson attempt ---------- */
function loadGeoJSON(name='africa.geojson'){
  return fetch(name).then(r=>{
    if(!r.ok) throw new Error('not found');
    return r.json();
  }).then(gj=>{
    geojsonData = gj;
    return gj;
  }).catch(e=>{
    console.warn('geojson load failed', e);
    geojsonData = null;
    return null;
  });
}

/* Try to load on startup */
loadGeoJSON().then(()=>{ /* ok or not - map renderers will check */ });

