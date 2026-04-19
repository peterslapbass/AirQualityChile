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

      // Clic abre panel de series
      marker.on("click", () => {
        openChartPanel(s);
      });
    });

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
        if (s) openChartPanel(s);
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

    // Pills: una por contaminante con serie disponible
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

    document.getElementById("chart-panel").classList.add("open");
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

  document.getElementById("chart-close").addEventListener("click", () => {
    document.getElementById("chart-panel").classList.remove("open");
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

  load();
  setInterval(load, 300000);

});
