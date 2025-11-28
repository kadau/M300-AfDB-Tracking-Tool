/* app.part3.js
   Bloc 3: reporting table, waterfall, mission map, OKI map
*/

/* ---------- Reporting table (Milestone) ---------- */
function renderReportingTableMilestones(){
  const rows = filteredRows.filter(r =>
    (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'milestone' &&
    (r['Sub-Sub-indicators']||'').toString().trim().toLowerCase() === 'households'
  );
  const years = [2023,2024,2025,2026,2027,2028,2029,2030];
  const agg = {}; years.forEach(y=> agg[y]=0);
  rows.forEach(r=>{
    const y = Number(r['Reporting Year']);
    if(!years.includes(y)) return;
    const mode = (r['Expected/Delivered']||'').toString().trim().toLowerCase();
    const v = safeNum(r['People provided with access to electricity']);
    if(y>=2023 && y<=2025){
      if(mode==='delivered') agg[y] += v;
    } else {
      if(mode==='expected') agg[y] += v;
    }
  });
  const tbody = document.getElementById('reporting-body');
  let rowHtml = '<tr><td style="text-align:left">People (Households)</td>';
  years.forEach(y => rowHtml += `<td class="num">${formatNum(agg[y])}</td>`);
  rowHtml += '</tr>';
  tbody.innerHTML = rowHtml;
  lastReportingYears = years.map(y => agg[y]);
  return lastReportingYears;
}

/* ---------- Waterfall chart ---------- */
let waterfallChart = null;
function renderWaterfallChart(){
  const vals = renderReportingTableMilestones();
  const achieved = vals.slice(0,3);
  const expected = vals.slice(3,8);
  const labels = ['2023','2024','2025','2026','2027','2028','2029','2030','Total'];

  const achievedSum = achieved.reduce((a,b)=>a+b,0);
  const expectedSum = expected.reduce((a,b)=>a+b,0);
  const total = achievedSum + expectedSum;

  // Build arrays where Achieved values are positioned and Expected positioned for stacked look
  const dataAch = [achieved[0]||0, achieved[1]||0, achieved[2]||0, 0,0,0,0,0, achievedSum];
  const dataExp = [0,0,0, expected[0]||0, expected[1]||0, expected[2]||0, expected[3]||0, expected[4]||0, expectedSum];

  // For final Total column we want bicolour: Achieved at bottom and Expected on top
  const ctx = document.getElementById('waterfall-chart').getContext('2d');
  if(waterfallChart) waterfallChart.destroy();
  waterfallChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: labels,
      datasets: [
        { label:'Achieved', data: dataAch, backgroundColor: '#1B8754', stack:'s1' },
        { label:'Expected', data: dataExp, backgroundColor: '#c7ceca', stack:'s1' }
      ]
    },
    options:{
      responsive:true,
      scales:{
        x:{ stacked:true },
        y:{
          stacked:true,
          ticks:{
            callback: function(value){ return (value/1000000) + ' M'; }
          }
        }
      },
      plugins:{
        legend:{ position:'top' }
      }
    }
  });
}

/* ---------- Map Mission 300 (choropleth + bubbles) ---------- */
function ensureMapMission(){
  if(mapMission) return;
  mapMission = L.map('map-mission', {minZoom:2, worldCopyJump:true}).setView([6.5,20],3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:''}).addTo(mapMission);
  markerLayer = L.layerGroup().addTo(mapMission);
}

function aggregateMapMission300(){
  const rows = filteredRows.filter(r =>
    (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'milestone' &&
    (r['Sub-Sub-indicators']||'').toString().trim().toLowerCase() === 'households' &&
    (r['Expected/Delivered']||'').toString().trim().toLowerCase() === 'delivered'
  );
  const agg = {};
  rows.forEach(r=>{
    const c = (r['Country']||'').toString().trim();
    if(!c) return;
    agg[c] = (agg[c]||0) + safeNum(r['People provided with access to electricity']);
  });
  return agg;
}

function renderMapMission300(){
  ensureMapMission();
  // clear layers
  if(choroplethLayer){ mapMission.removeLayer(choroplethLayer); choroplethLayer = null; }
  if(markerLayer){ markerLayer.clearLayers(); }

  const data = aggregateMapMission300();
  const values = Object.values(data);
  const maxVal = values.length ? Math.max(...values) : 0;

  if(geojsonData){
    function styleFeature(feature){
      const countryName = (feature.properties && (feature.properties.ADMIN || feature.properties.NAME || feature.properties.NAME_LONG)) || '';
      const v = data[countryName] || 0;
      const ratio = maxVal>0 ? v/maxVal : 0;
      const alpha = 0.35 + ratio*0.55;
      const fill = `rgba(27,135,84,${alpha})`;
      return { color:'#e6efe6', weight:1, fillColor: fill, fillOpacity: alpha };
    }
    choroplethLayer = L.geoJSON(geojsonData, {
      style: styleFeature,
      onEachFeature: function(feature, layer){
        const countryName = (feature.properties && (feature.properties.ADMIN || feature.properties.NAME)) || '';
        const v = data[countryName] || 0;
        layer.bindTooltip(`${countryName}\n${formatNum(v)} People access (delivered)`);
      }
    }).addTo(mapMission);
  }

  // add bubbles using centroid via bounds
  if(geojsonData && geojsonData.features){
    for(const feat of geojsonData.features){
      const countryName = (feat.properties && (feat.properties.ADMIN || feat.properties.NAME)) || '';
      const v = data[countryName] || 0;
      if(!v) continue;
      const layerFeat = L.geoJSON(feat);
      const bounds = layerFeat.getBounds();
      const center = bounds.getCenter();
      const radius = Math.max(6, Math.sqrt(v / (maxVal||1)) * 40);
      const circ = L.circleMarker(center, {
        radius: radius,
        color: '#0b5d2e',
        fillColor: '#8fd1b0',
        fillOpacity: 0.85,
        weight:1
      }).bindTooltip(`${countryName}\n${formatNum(v)} People access (delivered)`);
      markerLayer.addLayer(circ);
    }
  } else {
    // fallback: place a single center marker if no geojson
    Object.keys(data).forEach(country=>{
      const v = data[country];
      if(v<=0) return;
      const center = mapMission.getCenter();
      const radius = Math.max(6, Math.sqrt(v / (maxVal||1)) * 40);
      const circ = L.circleMarker(center, {
        radius: radius,
        color: '#0b5d2e',
        fillColor: '#8fd1b0',
        fillOpacity: 0.85,
        weight:1
      }).bindTooltip(`${country}\n${formatNum(v)} People access (delivered)`);
      markerLayer.addLayer(circ);
    });
  }

  // fit bounds if possible
  try{
    const group = L.featureGroup([choroplethLayer, markerLayer]);
    mapMission.fitBounds(group.getBounds(), {padding:[20,20]});
  }catch(e){}
  setTimeout(()=>mapMission.invalidateSize(),300);
}

/* ---------- OKI map (reusable) ---------- */
function ensureMapOKI(){
  if(mapOKI) return;
  mapOKI = L.map('map-oki', {minZoom:2, worldCopyJump:true}).setView([6.5,20],3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:''}).addTo(mapOKI);
  markerOKI = L.layerGroup().addTo(mapOKI);
}

/* ---------- render Others Key Indicators & map ---------- */
function renderOthersIndicators(){
  const rows = filteredRows.filter(r => (r['Global/Milestone']||'').toString().trim().toLowerCase() === 'global');
  function measure(col, mode){
    return rows.reduce((s,r)=>{
      const m = ((r['Expected/Delivered']||'').toString().trim().toLowerCase()) === mode;
      return s + (m ? safeNum(r[col]) : 0);
    },0);
  }
  const powerExp = measure('Power capacity installed (MW)','expected');
  const powerDel = measure('Power capacity installed (MW)','delivered');
  const transExp = measure('Cross-border and National Transmission Lines (KM)','expected');
  const transDel = measure('Cross-border and National Transmission Lines (KM)','delivered');
  const distExp = measure('New or improved power distribution lines (KM)','expected');
  const distDel = measure('New or improved power distribution lines (KM)','delivered');

  document.getElementById('g-power').innerHTML = `<div style="font-weight:700">${formatNum(powerDel)} / ${formatNum(powerExp)}</div>`;
  document.getElementById('g-power-stats').innerHTML = `${Math.round(powerExp?powerDel/powerExp*100:0)}% Delivered`;
  document.getElementById('g-trans').innerHTML = `<div style="font-weight:700">${formatNum(transDel)} / ${formatNum(transExp)}</div>`;
  document.getElementById('g-trans-stats').innerHTML = `${Math.round(transExp?transDel/transExp*100:0)}% Delivered`;
  document.getElementById('g-dist').innerHTML = `<div style="font-weight:700">${formatNum(distDel)} / ${formatNum(distExp)}</div>`;
  document.getElementById('g-dist-stats').innerHTML = `${Math.round(distExp?distDel/distExp*100:0)}% Delivered`;

  // Render OKI map for 'Delivered' of Power capacity by country (example)
  ensureMapOKI();
  markerOKI.clearLayers();
  // choose active indicator: for simplicity default to power (could add selector)
  const agg = {};
  filteredRows.filter(r => (r['Global/Milestone']||'').toString().trim().toLowerCase()==='global').forEach(r=>{
    const c = (r['Country']||'').toString().trim();
    if(!c) return;
    const v = safeNum(r['Power capacity installed (MW)']) * (((r['Expected/Delivered']||'').toString().trim().toLowerCase()==='delivered')?1:0);
    agg[c] = (agg[c]||0) + v;
  });
  const vals = Object.values(agg); const maxVal = vals.length?Math.max(...vals):0;
  if(geojsonData && mapOKI){
    // add choropleth and bubbles for OKI
    try{
      if(mapOKI._layers && Object.keys(mapOKI._layers).length){
        // remove existing geojson layers except the tile layer, simple approach: recreate map
      }
      // add bubbles
      for(const feat of (geojsonData.features||[])){
        const countryName = (feat.properties && (feat.properties.ADMIN || feat.properties.NAME)) || '';
        const v = agg[countryName] || 0;
        if(!v) continue;
        const layerFeat = L.geoJSON(feat);
        const center = layerFeat.getBounds().getCenter();
        const radius = Math.max(6, Math.sqrt(v / (maxVal||1)) * 30);
        const circ = L.circleMarker(center, {
          radius: radius,
          color: '#0b5d2e',
          fillColor: '#8fd1b0',
          fillOpacity: 0.85,
          weight:1
        }).bindTooltip(`${countryName}\n${formatNum(v)} Delivered`);
        markerOKI.addLayer(circ);
      }
      try{
        mapOKI.fitBounds(markerOKI.getBounds(), {padding:[20,20]});
      }catch(e){}
    }catch(e){
      console.warn('OKI map error', e);
    }
  }
  setTimeout(()=>{ if(mapOKI) mapOKI.invalidateSize(); },300);
}
