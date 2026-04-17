document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let DATA = [];

  // ---------------- NORMALIZACIÓN ----------------

  function normalize(text) {
    if (!text) return "";

    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ---------------- KEY CONTAMINANTE ----------------

  function getPollutantKey(name) {

    const n = normalize(name);

    if (n.includes("mp-2") || n.includes("pm25")) return "PM25";
    if (n.includes("mp-10") || n.includes("pm10")) return "PM10";

    if (n.includes("dioxido de nitrogeno") || n.includes("no2")) return "NO2";
    if (n.includes("monoxido de carbono") || n.includes("co")) return "CO";
    if (n.includes("ozono") || n.includes("o3")) return "O3";
    if (n.includes("dioxido de azufre") || n.includes("so2")) return "SO2";

    return "OTHER";
  }

  // ---------------- FILTRO NORMALIZADO ----------------

  function normalizeFilter(filter) {

    const f = normalize(filter).replace(/[^a-z0-9]/g, "");

    const map = {
      "mp25": "PM25",
      "mp10": "PM10",
      "pm25": "PM25",
      "pm10": "PM10",
      "no2": "NO2",
      "co": "CO",
      "o3": "O3",
      "so2": "SO2"
    };

    return map[f] || filter;
  }

  // ---------------- EXTRAER NÚMERO ----------------

  function getNumber(v) {
    if (v === null || v === undefined) return null;

    const m = String(v).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  // ---------------- UNIDADES ----------------

  function getUnit(key) {
    if (key === "PM25" || key === "PM10") return "µg/m³";
    if (key === "NO2") return "ppbv";
    if (key === "CO") return "ppmv";
    if (key === "O3") return "ppbv";
    if (key === "SO2") return "ppbv";
    return "";
  }

  // ---------------- COLOR ----------------

  function getColor(v) {
    if (v === null || v === undefined) return "#999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // ---------------- LOAD DATA ----------------

  async function loadData() {

    const res = await fetch("datos_sinca.json");
    const data = await res.json();

    DATA = data.map(estacion => {

      const values = [];

      (estacion.realtime || []).forEach(r => {

        let raw = "";

        if (r?.tableRow?.value !== undefined) {
          raw = r.tableRow.value;
        } else if (r?.info?.rows?.length) {
          const last = r.info.rows[r.info.rows.length - 1];
          raw = last?.c?.[3]?.v;
        }

        const value = getNumber(raw);
        if (value === null) return;

        const key = getPollutantKey(r.name || r.code);

        values.push({
          name: r.name || r.code,
          key,
          value,
          unit: getUnit(key),
          time: r.datetime || ""
        });

      });

      return {
        name: estacion.nombre,
        lat: estacion.latitud,
        lon: estacion.longitud,
        values
      };

    }).filter(s => s.values.length > 0);

    render();
  }

  // ---------------- RENDER GLOBAL ----------------

  function render() {

    const filterRaw = document.getElementById("filter").value;
    const filter = normalizeFilter(filterRaw);

    const filtered = DATA.map(s => {

      let values = s.values;

      if (filter !== "ALL") {
        values = values.filter(v => v.key === filter);
      }

      return {
        ...s,
        values
      };

    }).filter(s => s.values.length > 0);

    renderMap(filtered);
    renderRanking(filtered, filter);
    renderAlerts(filtered, filter);
  }

  // ---------------- MAPA ----------------

  function renderMap(data) {

    layer.clearLayers();

    data.forEach(s => {

      const worst = Math.max(...s.values.map(v => v.value));

      L.circleMarker([s.lat, s.lon], {
        radius: 8,
        color: "#000",
        fillColor: getColor(worst),
        fillOpacity: 0.85
      })
      .addTo(layer)
      .bindPopup(
        `<b>${s.name}</b><hr>` +
        s.values.map(v =>
          `${v.name}: ${v.value} ${v.unit}<br><small>${v.time}</small>`
        ).join("<br>")
      );

    });
  }

  // ---------------- RANKING ----------------

  function renderRanking(data, filter) {

    const ranking = data
      .map(s => {

        const vals = (filter === "ALL")
          ? s.values
          : s.values.filter(v => v.key === filter);

        return {
          ...s,
          worst: Math.max(...vals.map(v => v.value))
        };

      })
      .sort((a, b) => b.worst - a.worst);

    document.getElementById("ranking").innerHTML =
      ranking.map(s => `
        <div class="card">
          <b>${s.name}</b><br>
          peor valor: ${s.worst}
        </div>
      `).join("");
  }

  // ---------------- ALERTAS ----------------

  function renderAlerts(data, filter) {

    const alerts = data.filter(s => {

      const vals = (filter === "ALL")
        ? s.values
        : s.values.filter(v => v.key === filter);

      if (!vals.length) return false;

      const max = Math.max(...vals.map(v => v.value));

      return max > 100;
    });

    document.getElementById("alerts").innerHTML =
      alerts.map(s => `
        <div class="alert">
          ⚠️ ${s.name} - alta contaminación
        </div>
      `).join("");
  }

  // ---------------- EVENTS ----------------

  document.getElementById("filter").addEventListener("change", render);

  // ---------------- INIT ----------------

  loadData();
  setInterval(loadData, 300000);

});
