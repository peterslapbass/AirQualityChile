import { getValue, getPollutant, getUnit, color, parseSeries, calcICA, icaColor, icaLabel } from './utils.js';

export function createStations(ctx) {
  let chartInstance = null;

  function checkStaleness() {
    const warn = document.getElementById("stale-warning");
    const timeEl = document.getElementById("stale-time");
    if (!warn || !timeEl) return;

    let latest = null;
    for (const s of Object.values(ctx.STATIONS)) {
      for (const v of Object.values(s.values)) {
        if (v.time) {
          const d = new Date(v.time.replace(" ", "T"));
          if (!isNaN(d) && (!latest || d > latest)) latest = d;
        }
      }
    }

    if (latest) {
      const diff = Date.now() - latest.getTime();
      if (diff > 3600000) {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        timeEl.textContent = `${hours}h ${mins}m atrás`;
        warn.style.display = "block";
      } else {
        warn.style.display = "none";
      }
    }
  }

  async function load() {
    const res = await fetch("datos_sinca.json", {cache: "no-cache"});
    if (!res.ok) return;
    const data = await res.json();

    ctx.STATIONS = {};

    data.forEach(station => {
      const { nombre, latitud, longitud, region, comuna, realtime } = station;
      if (!nombre || !latitud) return;

      ctx.STATIONS[nombre] = {
        name: nombre,
        lat: latitud,
        lon: longitud,
        region: region || "",
        comuna: comuna || "",
        values: {},
        series: {}
      };

      (realtime || []).forEach(r => {
        const value = getValue(r);
        const pollutant = getPollutant(r.name || r.parameter || "");
        if (!pollutant || value === null) return;

        const ica = calcICA(pollutant, value);

        ctx.STATIONS[nombre].values[pollutant] = {
          value,
          ica,
          time: r.datetime || "",
          status: r.tableRow?.status || "nd",
          unit: getUnit(pollutant)
        };

        const serie = parseSeries(r);
        if (serie.length) {
          ctx.STATIONS[nombre].series[pollutant] = serie;
        }
      });
    });

    checkStaleness();
    render();
  }

  function render() {
    ctx.layer.clearLayers();

    const stations = Object.values(ctx.STATIONS);

    let processed = stations.map(s => {
      let entries = Object.entries(s.values);

      if (ctx.SEARCH_TERM) {
        const q = ctx.SEARCH_TERM.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.comuna.toLowerCase().includes(q)) {
          return null;
        }
      }

      if (ctx.CURRENT_FILTER !== "ALL") {
        entries = entries.filter(v => v[0] === ctx.CURRENT_FILTER);
      }

      if (!entries.length) return null;

      const worst = Math.max(...entries.map(v => v[1].value));

      return {
        ...s,
        filteredEntries: entries,
        worst
      };
    }).filter(Boolean);

    processed.forEach(s => {
      const radius = Math.min(16, Math.max(6, 6 + (s.worst / 150) * 10));
      const marker = L.circleMarker([s.lat, s.lon], {
        radius,
        color: "#fff",
        weight: 1.5,
        fillColor: color(s.worst),
        fillOpacity: 0.8
      }).addTo(ctx.layer);

      const entries = s.filteredEntries.filter(([_, val]) => val && val.value != null);

      marker.bindPopup(
        `<b>${s.name}</b>` +
        `<div style="font-size:10px;color:#888;margin:2px 0 6px">${s.comuna} · ${s.region}</div>` +
        `<hr>` +
        entries.map(([key, val]) => {
          const ica = val.ica;
          return `<div style="display:flex;justify-content:space-between;padding:2px 0;align-items:center">` +
            `<span style="color:#aaa">${key}</span>` +
            `<span>${val.value} <span style="font-size:10px;color:#555">${val.unit}</span>` +
            (ica ? `<span style="margin-left:6px;padding:1px 5px;border-radius:3px;font-size:10px;background:${icaColor(ica)};color:#000">ICA ${ica}</span>` : ``) +
            `</span></div>`;
        }).join("") +
        `<div style="font-size:10px;color:#555;margin-top:6px">${entries[0]?.[1]?.time || ""}</div>`
      );

      marker.on("click", () => {
        ctx.map.flyTo([s.lat, s.lon], 11);
        openChartPanel(ctx.STATIONS[s.name]);
      });
    });

    const ranking = [...processed].sort((a, b) => b.worst - a.worst);

    const worstICA = ranking.map(s => {
      const icas = Object.values(s.values).map(v => v.ica).filter(Boolean);
      return icas.length ? Math.max(...icas) : null;
    });

    document.getElementById("ranking").innerHTML =
      ranking.slice(0, 10).map((s, i) => {
        const ica = worstICA[i];
        const dotColor = ica ? icaColor(ica) : color(s.worst);
        const label = ica ? icaLabel(ica) : "";
        return `
        <div class="rank-item" data-key="${s.name}" role="button" tabindex="0" aria-label="${s.name}: ICA ${ica ?? s.worst} (${label})">
          <span class="rank-num">${i + 1}</span>
          <span class="rank-dot" style="background:${dotColor}" aria-hidden="true"></span>
          <span class="rank-name">${s.name}</span>
          <span class="rank-val">${ica ?? s.worst}</span>
        </div>`;
      }).join("");

    document.querySelectorAll(".rank-item").forEach(el => {
      const handler = () => {
        const s = ctx.STATIONS[el.dataset.key];
        if (s) { ctx.map.flyTo([s.lat, s.lon], 11); openChartPanel(s); }
      };
      el.addEventListener("click", handler);
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
      });
    });

    const alertThreshold = parseInt(document.getElementById("alert-threshold")?.value || "100", 10);
    const alerts = ranking.filter(s => s.worst > alertThreshold);

    document.getElementById("alerts").innerHTML =
      alerts.length
        ? alerts.map(a => `
          <div class="alert-item" role="alert">
            <span class="alert-name">${a.name}</span>
            <span class="alert-val">${a.worst}</span>
          </div>
        `).join("")
        : `<div style="font-size:11px;color:#666" role="status">Sin alertas</div>`;
  }

  let _currentStation = null;
  let _currentPollutant = null;

  function openChartPanel(station) {
    _currentStation = station;

    document.getElementById("chart-station-name").textContent = station.name;
    document.getElementById("chart-region").textContent =
      [station.comuna, station.region].filter(Boolean).join(" · ");

    const pollutants = Object.keys(station.series);
    const pills = document.getElementById("chart-pills");
    pills.innerHTML = "";

    pollutants.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.className = "cpill" + (i === 0 ? " active" : "");
      btn.textContent = p;

      btn.onclick = () => {
        _currentPollutant = p;
        document.querySelectorAll(".cpill").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        drawSeries(station, p);
      };

      pills.appendChild(btn);
    });

    if (pollutants.length) drawSeries(station, pollutants[0]);

    document.getElementById("chart-panel").classList.add("open");

    if (window.openChartSheetOverlay) {
      window.openChartSheetOverlay();
    }
  }

  function drawSeries(station, pollutant) {
    _currentPollutant = pollutant;
    const serie = station.series[pollutant] || [];
    const snap = station.values[pollutant] || {};
    const unit = getUnit(pollutant);

    const vals = serie.map(r => r.val).filter(v => v != null);

    const max = vals.length ? Math.max(...vals) : null;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

    const fmt = v => v != null ? v.toFixed(1) : "—";
    const ica = snap.ica;

    document.getElementById("chart-stats").innerHTML = `
      <div class="cstat">
        <div class="cstat-lbl">Actual</div>
        <div class="cstat-val">${fmt(snap.value)} <span class="cstat-unit">${unit}</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Máx</div>
        <div class="cstat-val">${fmt(max)}</div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Prom</div>
        <div class="cstat-val">${fmt(avg)}</div>
      </div>
      ${ica ? `<div class="cstat" style="background:${icaColor(ica)}22;border:1px solid ${icaColor(ica)}">
        <div class="cstat-lbl">ICA</div>
        <div class="cstat-val">${ica} <span class="cstat-unit">${icaLabel(ica)}</span></div>
      </div>` : ""}
    `;

    const labels = serie.map(r => r.ts.slice(11, 16));
    const data = serie.map(r => r.val);

    const canvas = document.getElementById("seriesChart");

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].label = pollutant;
      chartInstance.data.datasets[0].data = data;
      chartInstance.update("none");
    } else {
      chartInstance = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: pollutant,
            data,
            borderColor: "#4fc3f7",
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
    }
  }

  document.getElementById("chart-close").addEventListener("click", () => {
    document.getElementById("chart-panel").classList.remove("open");
    if (window.closeChartPanel) window.closeChartPanel();
  });

  document.getElementById("filter").addEventListener("change", e => {
    ctx.CURRENT_FILTER = e.target.value;
    render();
  });

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      ctx.SEARCH_TERM = e.target.value;
      render();
    });
  }

  document.getElementById("alert-threshold")?.addEventListener("change", () => render());

  document.getElementById("chart-download")?.addEventListener("click", () => {
    if (!_currentStation || !_currentPollutant) return;
    const serie = _currentStation.series[_currentPollutant];
    if (!serie || !serie.length) return;

    const rows = [["Fecha", `${_currentPollutant} (${getUnit(_currentPollutant)})`]];
    serie.forEach(r => rows.push([r.ts, r.val]));

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${_currentStation.name.replace(/[^a-zA-Z0-9]/g, "_")}_${_currentPollutant}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  return { load, render, openChartPanel };
}
