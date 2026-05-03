document.addEventListener("DOMContentLoaded", function () {

  console.log("🔥 MAPA SINCA - FINAL STABLE");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let STATIONS = {};
  let CURRENT_FILTER = "ALL";

  function normalize(t) {
    if (!t) return "";
    const x = document.createElement("textarea");
    x.innerHTML = t;
    return x.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function getValue(r) {
    const raw = r?.tableRow?.value || r?.value || "";
    const m = String(raw).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  function getPollutant(name) {
    const n = normalize(name);
    if (n.includes("pm25") || n.includes("mp-2")) return "MP-2,5";
    if (n.includes("pm10") || n.includes("mp-10")) return "MP-10";
    if (n.includes("no2")) return "NO2";
    if (n.includes("co")) return "CO";
    if (n.includes("o3")) return "O3";
    return null;
  }

  function getUnit(p) {
    if (p === "MP-2,5" || p === "MP-10") return "µg/m³";
    if (p === "NO2" || p === "O3") return "ppbv";
    if (p === "CO") return "ppm";
    return "";
  }

  function color(v) {
    if (v <= 25) return "green";
    if (v <= 50) return "yellow";
    if (v <= 100) return "orange";
    if (v <= 150) return "red";
    return "purple";
  }

  function parseSeries(rt) {
    const rows = rt?.info?.rows || [];
    return rows.map(r => ({
      ts: r?.c?.[0]?.v,
      val: r?.c?.[1]?.v
    })).filter(r => r.ts && typeof r.val === "number");
  }

  async function load() {
    const res = await fetch("datos_sinca.json");
    const data = await res.json();

    STATIONS = {};

    data.forEach(station => {
      const { nombre, latitud, longitud, region, comuna, realtime } = station;
      if (!nombre) return;

      STATIONS[nombre] = {
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
        const pollutant = getPollutant(r.name || "");
        if (!pollutant || value === null) return;

        STATIONS[nombre].values[pollutant] = {
          value,
          status: r.tableRow?.status || "nd",
          unit: getUnit(pollutant)
        };

        const serie = parseSeries(r);
        if (serie.length) STATIONS[nombre].series[pollutant] = serie;
      });
    });

    render();
  }

  function render() {
    layer.clearLayers();

    const stations = Object.values(STATIONS);

    let processed = stations.map(s => {
      let values = Object.entries(s.values);
      if (CURRENT_FILTER !== "ALL") {
        values = values.filter(v => v[0] === CURRENT_FILTER);
      }
      if (!values.length) return null;

      const worst = Math.max(...values.map(v => v[1].value));
      return { ...s, values, worst };
    }).filter(Boolean);

    processed.forEach(s => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 8,
        color: "#000",
        fillColor: color(s.worst),
        fillOpacity: 0.85
      }).addTo(layer);

      marker.on("click", () => {
        map.flyTo([s.lat, s.lon], 11);
        openChartPanel(STATIONS[s.name]);
      });
    });

    const ranking = [...processed].sort((a, b) => b.worst - a.worst);

    document.getElementById("ranking").innerHTML =
      ranking.slice(0, 10).map((s, i) => `
        <div class="rank-item" data-key="${s.name}">
          <span>${i + 1}</span> ${s.name} (${s.worst})
        </div>
      `).join("");

    document.querySelectorAll(".rank-item").forEach(el => {
      el.onclick = () => {
        const s = STATIONS[el.dataset.key];
        map.flyTo([s.lat, s.lon], 11);
        openChartPanel(s);
      };
    });
  }

  // =============================
  // 📊 PANEL
  // =============================

  let chartInstance = null;

  function openChartPanel(station) {
    document.getElementById("chart-station-name").textContent = station.name;

    const pollutants = Object.keys(station.series);
    const first = pollutants[0];

    drawSeries(station, first);

    document.getElementById("chart-panel").classList.add("open");

    if (window.openChartSheetOverlay) {
      window.openChartSheetOverlay();
    }
  }

  function drawSeries(station, pollutant) {
    const serie = station.series[pollutant] || [];
    const canvas = document.getElementById("seriesChart");

    if (!serie.length) return;

    const labels = serie.map(r => r.ts.slice(11, 16));
    const data = serie.map(r => r.val);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{ data }]
      }
    });
  }

  document.getElementById("chart-close").addEventListener("click", () => {
    document.getElementById("chart-panel").classList.remove("open");
    if (chartInstance) chartInstance.destroy();
  });

  document.getElementById("filter").addEventListener("change", e => {
    CURRENT_FILTER = e.target.value;
    render();
  });

  load();
  setInterval(load, 300000);

});
