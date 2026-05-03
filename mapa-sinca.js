document.addEventListener("DOMContentLoaded", function () {

  console.log("🔥 MAPA SINCA - CON SERIES TEMPORALES");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let STATIONS = {};
  let CURRENT_FILTER = "ALL";

  /* ─────────────────────────────────────────
     NORMALIZAR
  ───────────────────────────────────────── */

  function normalize(t) {
    if (!t) return "";
    const x = document.createElement("textarea");
    x.innerHTML = t;
    return x.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* ─────────────────────────────────────────
     VALOR ACTUAL (snapshot)
  ───────────────────────────────────────── */

  function getValue(r) {
    const raw = r?.tableRow?.value || r?.value || "";
    const m = String(raw).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  /* ─────────────────────────────────────────
     CLASIFICAR CONTAMINANTE
  ───────────────────────────────────────── */

  function getPollutant(name) {
    const n = normalize(name);
    if (n.includes("mp-2") || n.includes("pm25") || n.includes("pm2")) return "MP-2,5";
    if (n.includes("mp-10") || n.includes("pm10"))                      return "MP-10";
    if (n.includes("dioxido de nitrogeno") || n.includes("no2"))        return "NO2";
    if (n.includes("monoxido de carbono") || n.includes("co"))          return "CO";
    if (n.includes("ozono") || n.includes("o3"))                        return "O3";
    return null;
  }

  /* ─────────────────────────────────────────
     UNIDAD
  ───────────────────────────────────────── */

  function getUnit(p) {
    if (p === "MP-2,5" || p === "MP-10") return "µg/m³";
    if (p === "NO2" || p === "O3")       return "ppbv";
    if (p === "CO")                      return "ppm";
    return "";
  }

  /* ─────────────────────────────────────────
     COLOR MARCADOR
  ───────────────────────────────────────── */

  function color(v) {
    if (v <= 25)  return "green";
    if (v <= 50)  return "yellow";
    if (v <= 100) return "orange";
    if (v <= 150) return "red";
    return "purple";
  }

  /* ─────────────────────────────────────────
     PARSEAR SERIE TEMPORAL DESDE realtime[].info.rows
     Estructura SINCA:
       rows[i].c[0].v = "2026-04-19 08:00"  (timestamp)
       rows[i].c[1].v = 42                   (valor numérico)
  ───────────────────────────────────────── */

  function parseSeries(rt) {
    const rows = rt?.info?.rows || [];
    return rows
      .map(r => ({
        ts:  r?.c?.[0]?.v || null,
        val: r?.c?.[1]?.v
      }))
      .filter(r => r.ts && typeof r.val === "number" && r.val >= 0);
  }

  /* ─────────────────────────────────────────
     CARGAR DATOS
  ───────────────────────────────────────── */

  async function load() {
    console.log("📡 CARGANDO DATOS");

    const res  = await fetch("datos_sinca.json");
    const data = await res.json();

    STATIONS = {};

    data.forEach(station => {
      const { nombre, latitud, longitud, region, comuna, realtime } = station;
      if (!nombre || !latitud || !longitud) return;

      if (!STATIONS[nombre]) {
        STATIONS[nombre] = {
          name:    nombre,
          lat:     latitud,
          lon:     longitud,
          region:  region  || "",
          comuna:  comuna  || "",
          values:  {},
          series:  {}       // ← nuevo: series horarias por contaminante
        };
      }

      (realtime || []).forEach(r => {
        const value = getValue(r);
        if (value === null) return;

        const pollutant = getPollutant(r.name || r.parameter || "");
        if (!pollutant) return;

        // Valor snapshot (como antes)
        STATIONS[nombre].values[pollutant] = {
          value,
          time:   r.datetime || "",
          status: r.tableRow?.status || "nd",
          unit:   getUnit(pollutant)
        };

        // Serie temporal de 24h
        const serie = parseSeries(r);
        if (serie.length > 0) {
          STATIONS[nombre].series[pollutant] = serie;
        }
      });
    });

    render();
  }

  /* ─────────────────────────────────────────
     RENDER MAPA + SIDEBAR
  ───────────────────────────────────────── */

  function render() {
    layer.clearLayers();

    const stations = Object.values(STATIONS);

    let processed = stations.map(s => {
      let values = Object.entries(s.values);
      if (CURRENT_FILTER !== "ALL") {
        values = values.filter(v => v[0] === CURRENT_FILTER);
      }
      if (values.length === 0) return null;
      const worst = Math.max(...values.map(v => v[1].value));
      return { ...s, values, worst };
    }).filter(Boolean);

    // Marcadores en mapa
    processed.forEach(s => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius:      8,
        color:       "#000",
        fillColor:   color(s.worst),
        fillOpacity: 0.85
      }).addTo(layer);

      // Popup rápido
      marker.bindPopup(
        `<b>${s.name}</b>` +
        `<div style="font-size:10px;color:#888;margin:2px 0 6px">${s.comuna} · ${s.region}</div>` +
        `<hr>` +
        s.values.map(v =>
          `<div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">` +
          `<span style="color:#aaa">${v[0]}</span>` +
          `<span style="font-weight:500">${v[1].value} <span style="color:#555;font-size:10px">${v[1].unit}</span></span>` +
          `</div>`
        ).join("") +
        `<div style="font-size:10px;color:#555;margin-top:6px">${s.values[0]?.[1]?.time || ""}</div>`
      );

      // Clic abre panel de series — pasar objeto original con values como dict
      marker.on("click", () => {
        map.flyTo([s.lat, s.lon], 11, {
          duration: 1
        });
      
        openChartPanel(STATIONS[s.name]);
      });

    }); // ✅ ESTE ERA EL QUE FALTABA
    
    // Ranking
    const ranking = [...processed].sort((a, b) => b.worst - a.worst);
    document.getElementById("ranking").innerHTML =
      ranking.slice(0, 10).map((s, i) => `
        <div class="rank-item" data-key="${s.name}">
          <span class="rank-num">${i + 1}</span>
          <span class="rank-dot" style="background:${color(s.worst)}"></span>
          <span class="rank-name">${s.name}</span>
          <span class="rank-val">${s.worst}</span>
        </div>
      `).join("");

    // Clic en ranking abre panel
    document.querySelectorAll(".rank-item").forEach(el => {
      el.addEventListener("click", () => {
        const s = STATIONS[el.dataset.key];
        if (!s) return;
      
        map.flyTo([s.lat, s.lon], 11, {
          duration: 1
        });

    openChartPanel(s);
  });
});
    // Alertas
    const alerts = ranking.filter(s => s.worst > 100);
    document.getElementById("alerts").innerHTML = alerts.length
      ? alerts.map(a => `
          <div class="alert-item">
            <span class="alert-name">${a.name}</span>
            <span class="alert-val">${a.worst}</span>
          </div>
        `).join("")
      : `<div style="font-size:11px;color:var(--muted);padding:4px 0">Sin alertas activas</div>`;
  }

  /* ─────────────────────────────────────────
     PANEL DE SERIES TEMPORALES
  ───────────────────────────────────────── */

  let chartInstance = null;
  let currentStation = null;

  function openChartPanel(station) {
  currentStation = station;

  document.getElementById("chart-station-name").textContent = station.name;
  document.getElementById("chart-region").textContent =
    [station.comuna, station.region].filter(Boolean).join(" · ");

  const pills = document.getElementById("chart-pills");
  pills.innerHTML = "";

  const pollutants = Object.keys(station.series);

  if (pollutants.length === 0) {
    pills.innerHTML = `<span style="font-size:12px;color:#555">Sin series disponibles</span>`;
  } else {
    pollutants.forEach((p, i) => {
      const pill = document.createElement("button");
      pill.className = "cpill" + (i === 0 ? " active" : "");
      pill.textContent = p;

      pill.addEventListener("click", () => {
        document.querySelectorAll(".cpill").forEach(x => x.classList.remove("active"));
        pill.classList.add("active");
        drawSeries(station, p);
      });

      pills.appendChild(pill);
    });

    drawSeries(station, pollutants[0]);
  }

  const panel = document.getElementById("chart-panel");
  
  if (isMobile) {
    panel.classList.add("open");
  } else {
    panel.classList.add("open");
    if (window.openChartSheetOverlay) window.openChartSheetOverlay();
  }

  function openMeteoPanel(station) {

  document.getElementById("chart-station-name").textContent =
    station.name || "Estación meteorológica";

  document.getElementById("chart-region").textContent =
    "Datos meteorológicos";

  document.getElementById("chart-pills").innerHTML = `
    <span class="cpill active">Meteo</span>
  `;

  document.getElementById("chart-stats").innerHTML = `
    <div class="cstat">
      <div class="cstat-lbl">Viento</div>
      <div class="cstat-val">${station.wind_speed ?? "—"}<span class="cstat-unit"> m/s</span></div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Dirección</div>
      <div class="cstat-val">${station.wind_dir ?? "—"}°</div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Temperatura</div>
      <div class="cstat-val">${station.temp ?? "—"}<span class="cstat-unit"> °C</span></div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Humedad</div>
      <div class="cstat-val">${station.humidity ?? "—"}<span class="cstat-unit"> %</span></div>
    </div>
    <div class="cstat">
      <div class="cstat-lbl">Presión</div>
      <div class="cstat-val">${station.pressure ?? "—"}<span class="cstat-unit"> hPa</span></div>
  </div>
  `;

  // Ocultar gráfico
  document.getElementById("seriesChart").style.display = "none";

  const empty = document.getElementById("chart-empty");
  empty.style.display = "block";
  empty.textContent = "Datos meteorológicos en tiempo real";

  document.getElementById("chart-panel").classList.add("open");
  if (window.openChartSheetOverlay) window.openChartSheetOverlay();
  }

  function drawSeries(station, pollutant) {
    const serie   = station.series[pollutant] || [];
    const snap    = station.values[pollutant] || {};
    const unit    = getUnit(pollutant);
    const status  = snap.status || "nd";

    // Stats: actual / máx / mín
    const vals = serie.map(r => r.val).filter(v => v > 0);
    const max  = vals.length ? Math.max(...vals) : null;
    const min  = vals.length ? Math.min(...vals) : null;
    const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const fmt  = v => v != null ? (Number.isInteger(v) ? v : v.toFixed(1)) : "—";

    document.getElementById("chart-stats").innerHTML = `
      <div class="cstat">
        <div class="cstat-lbl">Actual</div>
        <div class="cstat-val">${fmt(snap.value)}<span class="cstat-unit">${unit}</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Máximo 24h</div>
        <div class="cstat-val">${fmt(max)}<span class="cstat-unit">${unit}</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Promedio</div>
        <div class="cstat-val">${fmt(avg)}<span class="cstat-unit">${unit}</span></div>
      </div>
      <div class="cstat" style="grid-column:1/-1">
        <div class="cstat-lbl">Estado</div>
        <div>
          <span class="status-badge status-${status}">${status}</span>
          <span class="cstat-unit" style="margin-left:8px">${serie.length} registros horarios</span>
        </div>
      </div>
    `;

    // Gráfico
    const empty = document.getElementById("chart-empty");
    const canvas = document.getElementById("seriesChart");

    if (serie.length === 0) {
      canvas.style.display = "none";
      empty.textContent = "Sin datos de serie para " + pollutant;
      empty.style.display = "block";
      return;
    }

    canvas.style.display = "block";
    empty.style.display  = "none";

    const labels = serie.map(r => r.ts.slice(11, 16));   // "08:00"
    const data   = serie.map(r => r.val);

    // Color por contaminante
    const COLORS = {
      "MP-2,5": { stroke: "#378ADD", fill: "rgba(55,138,221,0.12)" },
      "MP-10":  { stroke: "#1D9E75", fill: "rgba(29,158,117,0.12)" },
      "NO2":    { stroke: "#D85A30", fill: "rgba(216,90,48,0.12)"  },
      "CO":     { stroke: "#BA7517", fill: "rgba(186,117,23,0.12)" },
      "O3":     { stroke: "#7F77DD", fill: "rgba(127,119,221,0.12)"}
    };
    const c = COLORS[pollutant] || { stroke: "#888", fill: "rgba(136,136,136,0.1)" };

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label:           pollutant,
          data,
          borderColor:     c.stroke,
          backgroundColor: c.fill,
          borderWidth:     1.5,
          pointRadius:     2,
          pointHoverRadius:4,
          fill:            true,
          tension:         0.3,
          pointStyle:      "circle"
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toFixed(1)} ${unit}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8,
              maxRotation:   0,
              font:          { size: 10 },
              color:         "#666"
            },
            grid: { color: "rgba(255,255,255,0.05)" }
          },
          y: {
            ticks: {
              font:     { size: 10 },
              color:    "#666",
              callback: v => v.toFixed(0)
            },
            grid: { color: "rgba(255,255,255,0.05)" }
          }
        }
      }
    });
  }

  /* ─────────────────────────────────────────
     CERRAR PANEL
  ───────────────────────────────────────── */

  // El cierre del panel lo coordina el script de sheets en index.html
  // para manejar el overlay correctamente en móvil.
  // Aquí solo destruimos el chart al cerrar.
  document.getElementById("chart-close").addEventListener("click", () => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  });

  /* ─────────────────────────────────────────
     FILTRO
  ───────────────────────────────────────── */

  document.getElementById("filter").addEventListener("change", e => {
    CURRENT_FILTER = e.target.value;
    render();
  });

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  // =============================
  // 📱 MODO MOBILE + BOTÓN FLOTANTE
  // =============================
  
  const isMobile = window.innerWidth < 768;
  
  // Crear botón flotante
  const fab = document.createElement("div");
  fab.id = "mobile-fab";
  fab.innerHTML = "☰";
  document.body.appendChild(fab);
  
  // Toggle panel
  fab.addEventListener("click", () => {
    const panel = document.getElementById("chart-panel");
    panel.classList.toggle("open");
  });

  
  load();
  setInterval(load, 300000);


// =============================
// 🌬️ CAPA DE VIENTO (FLECHAS)
// =============================

const windLayer = L.layerGroup().addTo(map);

function getWindColor(speed) {
  if (speed < 2) return "gray";
  if (speed < 5) return "#4FC3F7";
  return "#EF5350";
}

function createWindIcon(speed, dir) {
  const correctedDir = dir + 180;

  return L.divIcon({
    html: `<div style="
      transform: rotate(${correctedDir}deg);
      color: ${getWindColor(speed)};
      font-size: ${Math.max(12, speed * 4)}px;
    ">➤</div>`,
    className: "",
    iconSize: [20, 20]
  });
}

function loadWindData() {
  fetch("datos_meteo.json?" + Date.now())
    .then(r => r.json())
    .then(data => {

      windLayer.clearLayers();

      data.forEach(s => {
        if (!s.lat || !s.lon) return;

        const marker = L.marker([s.lat, s.lon], {
          icon: createWindIcon(s.wind_speed || 0, s.wind_dir || 0)
        });

        // 🔹 Popup simple
        marker.bindPopup(`
          <b>${s.name || "Estación meteorológica"}</b>
          <div style="font-size:11px;color:#666;margin-top:4px">
            Viento: ${s.wind_speed ?? "—"} m/s<br>
            Dirección: ${s.wind_dir ?? "—"}°<br>
            Temp: ${s.temp ?? "—"} °C<br>
            HR: ${s.humidity ?? "—"} %
          </div>
        `);

        // 🔥 CLICK = panel (igual que SINCA)
        marker.on("click", () => {
          openMeteoPanel(s);
        });

        windLayer.addLayer(marker);
      });

    })
    .catch(err => console.error("❌ viento:", err));
}

loadWindData();
setInterval(loadWindData, 300000);

// =============================
// 🌊 WIND FIELD ANIMADO
// =============================

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

map.getPanes().overlayPane.appendChild(canvas);

canvas.style.position = "absolute";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = 0;

function resizeCanvas() {
  const size = map.getSize();
  canvas.width = size.x;
  canvas.height = size.y;
}

function repositionCanvas() {
  const topLeft = map.containerPointToLayerPoint([0, 0]);
  L.DomUtil.setPosition(canvas, topLeft);
}

map.on("movestart", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

map.on("move", () => {
  repositionCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 🔥 limpia al mover
});
map.on("resize", () => {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

resizeCanvas();
repositionCanvas();

let windField = null;
let particles = [];

fetch("wind_field.json")
  .then(r => r.json())
  .then(data => {
    windField = data;
    initParticles();
  });

function getWindAt(lat, lon) {
  if (!windField) return { u: 0, v: 0 };

  const { min_lat, max_lat, min_lon, max_lon } = windField.bounds;
  const size = windField.grid_size;

  const x = (lon - min_lon) / (max_lon - min_lon) * (size - 1);
  const y = (lat - min_lat) / (max_lat - min_lat) * (size - 1);

  const i = Math.floor(x);
  const j = Math.floor(y);

  if (i < 0 || j < 0 || i >= size || j >= size) return { u: 0, v: 0 };

  return {
    u: windField.u[j][i],
    v: windField.v[j][i]
  };
}

function initParticles() {
  const b = windField.bounds;

  particles = [];

  for (let i = 0; i < 400; i++) {
    particles.push({
      lat: b.min_lat + Math.random() * (b.max_lat - b.min_lat),
      lon: b.min_lon + Math.random() * (b.max_lon - b.min_lon),
      age: Math.random() * 100
    });
  }

  animate();
}

function resetParticle(p) {
  const b = windField.bounds;

  p.lat = b.min_lat + Math.random() * (b.max_lat - b.min_lat);
  p.lon = b.min_lon + Math.random() * (b.max_lon - b.min_lon);
  p.age = 0;
}

function animate() {
  ctx.fillStyle = "rgba(255,255,255,0.01)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 1;

  particles.forEach(p => {

    const wind = getWindAt(p.lat, p.lon);
    const speed = Math.sqrt(wind.u**2 + wind.v**2);

    if (speed < 0.1 || p.age > 100) {
      resetParticle(p);
      return;
    }

    const prev = map.latLngToContainerPoint([p.lat, p.lon]);

    p.lat += wind.v * 0.01;
    p.lon += wind.u * 0.01;
    p.age++;

    const next = map.latLngToContainerPoint([p.lat, p.lon]);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = "rgba(80,150,255,0.7)";
    ctx.stroke();
  });

  requestAnimationFrame(animate);
}

// =============================
// 🎛️ TOGGLES (AIRE / VIENTO)
// =============================

let SHOW_AIR = true;
let SHOW_WIND = true;

const btnAir = document.getElementById("toggle-air");
const btnWind = document.getElementById("toggle-wind");

btnAir.addEventListener("click", () => {
  SHOW_AIR = !SHOW_AIR;
  btnAir.classList.toggle("active", SHOW_AIR);

  if (SHOW_AIR) {
    map.addLayer(layer);
  } else {
    map.removeLayer(layer);
  }
});

btnWind.addEventListener("click", () => {
  SHOW_WIND = !SHOW_WIND;
  btnWind.classList.toggle("active", SHOW_WIND);

  if (SHOW_WIND) {
    map.addLayer(windLayer);
    canvas.style.display = "block";
  } else {
    map.removeLayer(windLayer);
    canvas.style.display = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

});


