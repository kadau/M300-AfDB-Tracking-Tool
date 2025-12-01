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
/* === WATERFALL CHART — Cascade / ESCALIER === */

let waterfallChart = null;

function renderWaterfallChart() {
    const vals = (typeof renderReportingTableMilestones === "function")
        ? renderReportingTableMilestones()
        : lastReportingYears || [];

    const years = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

    const achieved = vals.slice(0, 3).map(v => Number(v || 0));     // 2023–2025
    const expected = vals.slice(3, 8).map(v => Number(v || 0));     // 2026–2030

    const achievedSum = achieved.reduce((a, b) => a + b, 0);
    const expectedSum = expected.reduce((a, b) => a + b, 0);

    const total = achievedSum + expectedSum;

    // === Construire les valeurs waterfall ===
    const labels = ['2023','2024','2025','2026','2027','2028','2029','2030','Total'];

    // Dataset “invisible” pour créer les marches
    let baseline = [];
    let achievedBars = [];
    let expectedBars = [];

    let cumulative = 0;

    // Années individuelles
    for (let i = 0; i < 8; i++) {
        baseline.push(cumulative);

        if (i < 3) {
            // Achieved (2023-2025)
            achievedBars.push(achieved[i]);
            expectedBars.push(0);
            cumulative += achieved[i];
        } else {
            // Expected (2026-2030)
            achievedBars.push(0);
            expectedBars.push(expected[i - 3]);
            cumulative += expected[i - 3];
        }
    }

    // Dernière barre = Total
    baseline.push(0);                 // barre finale au niveau zéro
    achievedBars.push(achievedSum);
    expectedBars.push(expectedSum);

    const ctx = document.getElementById('waterfall-chart').getContext('2d');
    if (waterfallChart) waterfallChart.destroy();

    waterfallChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Baseline',
                    data: baseline,
                    backgroundColor: 'rgba(0,0,0,0)',   // invisible
                    borderWidth: 0,
                    stack: 'stack'
                },
                {
                    label: 'Achieved',
                    data: achievedBars,
                    backgroundColor: '#1B8754',
                    borderRadius: 4,
                    stack: 'stack'
                },
                {
                    label: 'Expected',
                    data: expectedBars,
                    backgroundColor: '#c7ceca',
                    borderRadius: 4,
                    stack: 'stack'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        callback: function (value) {
                            if (value >= 1_000_000)
                                return (value / 1_000_000).toFixed(0) + ' M';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

/* ---------- Map Mission 300 (choropleth + bubbles) ---------- */
/* =====================================================================
   MISSION 300 — Choropleth + Proportional Bubbles
   ===================================================================== */

let missionMap = null;
let missionLayer = null;
let missionBubbleLayer = null;

/* Dégradé vert AfDB */
function getColorMission(v, max) {
  if (max === 0) return "#e9f7ef";
  const pct = v / max;
  if (pct > 0.80) return "#1B8754";
  if (pct > 0.60) return "#54b56f";
  if (pct > 0.40) return "#93d2a2";
  if (pct > 0.20) return "#c8e6ce";
  return "#e9f7ef";
}

/* ---------------- Mission 300 MAP (choropleth + bubbles) ---------------- */

function normalizeCountryName(name) {
    if (!name) return "";
    return name.toString().trim().toLowerCase()
        .replace(/’/g, "'")
        .replace(/é/g, "e")
        .replace(/è/g, "e")
        .replace(/ê/g, "e")
        .replace(/à/g, "a")
        .replace(/î/g, "i")
        .replace(/ï/g, "i")
        .replace(/ô/g, "o");
}

function getCountryNameFromFeature(f) {
    const props = f.properties || {};

    return (
        props.ADMIN ||
        props.ADMIN_NAME ||
        props.NAME_LONG ||
        props.NAME ||
        props.COUNTRY ||
        ""
    );
}

/* ---------------- Mission 300 MAP (choropleth + bubbles) ---------------- */

function getColorMission(value, max) {
    if (max === 0) return "#e0f2e9"; // gris/vert très clair si aucune donnée

    const ratio = value / max;

    // VRAI dégradé du vert clair au vert foncé AfDB
    const start = [230, 245, 238]; // vert très clair
    const end   = [27, 135, 84];   // vert AfDB

    const r = Math.round(start[0] + (end[0] - start[0]) * ratio);
    const g = Math.round(start[1] + (end[1] - start[1]) * ratio);
    const b = Math.round(start[2] + (end[2] - start[2]) * ratio);

    return `rgb(${r},${g},${b})`;
}

function renderMapMission() {

    const container = document.getElementById("map-mission");
    if (!container) return;

    const geo = window.geojsonDataMission;
    if (!geo || !geo.features) {
        console.warn("GeoJSON non chargé, carte ignorée.");
        return;
    }

    /* AGRÉGATION DES DONNÉES */
    const rows = filteredRows.filter(r =>
        (r["Global/Milestone"] || "").toString().trim().toLowerCase() === "milestone" &&
        (r["Expected/Delivered"] || "").toString().trim().toLowerCase() === "delivered"
    );

    const agg = {};
    rows.forEach(r => {
        const country = normalizeCountryName(r["Country"]);
        const val = safeNum(r["People provided with access to electricity"]);
        if (!agg[country]) agg[country] = 0;
        agg[country] += val;
    });

    const maxVal = Math.max(...Object.values(agg), 0);

    /* INITIALISATION DE LA CARTE */
    if (!missionMap) {
        missionMap = L.map("map-mission", {
            center: [8, 20],
            zoom: 3,
            worldCopyJump: true
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(missionMap);
        missionLayer = L.layerGroup().addTo(missionMap);
        missionBubbleLayer = L.layerGroup().addTo(missionMap);
    }

    missionLayer.clearLayers();
    missionBubbleLayer.clearLayers();

    /* CHOROPLETH : SEULEMENT LES PAYS AVEC DONNÉES ONT UNE COULEUR */
    L.geoJson(geo, {
        style: f => {
            const nameRaw = getCountryNameFromFeature(f);
            const name = normalizeCountryName(nameRaw);
            const val = agg[name] || 0;

            if (val === 0) {
                return {
                    fillColor: "#f2f2f2", // gris clair = pas de données
                    fillOpacity: 0.3,
                    color: "#aaa",
                    weight: 0.5
                };
            }

            return {
                fillColor: getColorMission(val, maxVal),
                fillOpacity: 0.8,
                color: "#666",
                weight: 1
            };
        },
        onEachFeature: (feature, layer) => {
            const name = getCountryNameFromFeature(feature);
            const val = agg[normalizeCountryName(name)] || 0;
            layer.bindTooltip(`<b>${name}</b><br>${formatNum(val)} delivered`, { sticky: true });
        }
    }).addTo(missionLayer);

    /* ---------------- BULLES PROPORTIONNELLES CORRIGÉES ---------------- */

    geo.features.forEach(f => {
        const nameRaw = getCountryNameFromFeature(f);
        const name = normalizeCountryName(nameRaw);
        const val = agg[name] || 0;

        if (val <= 0) return;

        const center = L.geoJson(f).getBounds().getCenter();

        // NOUVELLE FORMULE → taille adaptée au continent africain
        const radius = Math.max(3, Math.sqrt(val) * 0.02);  // 🔥 taille fortement réduite

        L.circleMarker(center, {
            radius,
            color: "#0b5d2e",
            fillColor: "#1B8754",
            fillOpacity: 0.6
        })
            .bindTooltip(`<b>${nameRaw}</b><br>${formatNum(val)} delivered`, { sticky: true })
            .addTo(missionBubbleLayer);
    });

    missionMap.invalidateSize();
}


/* ---------- OKI map (reusable) ---------- */
function ensureMapOKI(){
  if(mapOKI) return;
  mapOKI = L.map('map-oki', {minZoom:2, worldCopyJump:true}).setView([6.5,20],3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:''}).addTo(mapOKI);
  markerOKI = L.layerGroup().addTo(mapOKI);
}

/* ============================================================
   OTHERS KEY INDICATORS — Jauges + Expected / Delivered / %
   ============================================================ */
/* ============================================================
   OTHERS KEY INDICATORS — Corrected version (no Sub-Sub-indicators)
   ============================================================ */
/* ---------- OTHERS KEY INDICATORS (fixed: one gauge only) ---------- */
function renderOthersIndicators() {
    if (!filteredRows.length) return;

    const INDICATORS = {
        power: "Power capacity installed (MW)",
        trans: "Cross-border and National Transmission Lines (KM)",
        dist: "New or improved power distribution lines (KM)"
    };

    const targets = {
        power: { div: "g-power", stats: "g-power-stats" },
        trans: { div: "g-trans", stats: "g-trans-stats" },
        dist: { div: "g-dist", stats: "g-dist-stats" }
    };

    Object.keys(INDICATORS).forEach(key => {
        const column = INDICATORS[key];
        const box = document.getElementById(targets[key].div);
        const stats = document.getElementById(targets[key].stats);

        let expected = 0, delivered = 0;

        filteredRows.forEach(r => {
            const value = safeNum(r[column]);
            const status = (r["Expected/Delivered"] || "").trim().toLowerCase();
            if (status === "expected") expected += value;
            if (status === "delivered") delivered += value;
        });

        const pct = expected > 0 ? Math.round((delivered / expected) * 100) : 0;

        /* ---- SINGLE JUDGE ---- */
        box.innerHTML = `
            <div class="gitem">
                <div class="lbl">Expected : ${formatNum(expected)}</div>
                <div class="lbl">Delivered : ${formatNum(delivered)}</div>

                <div class="gbar" style="margin-top:6px;">
                    <div class="fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;

        stats.innerHTML = `<span class="bold">${pct}% Delivered</span>`;
    });
}
