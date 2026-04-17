document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let DATA = [];

  // ---------------- NORMALIZACIÓN FUERTE ----------------

  function normalize(text) {
    if (!text) return "";

    const t = document.createElement("textarea");
    t.innerHTML = text;

    return t.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ---------------- KEY ROBUSTO ----------------

  function getKey(name, code) {

    const n = normalize(name + " " + code);

    if (n.includes("mp-2") || n.includes("pm25")) return "PM25";
    if (n.includes("mp-10") || n.includes("pm10")) return "PM10";

    if (n.includes("no2") || n.includes("dioxido de nitrogeno")) return "NO2";
    if (n.includes("o3") || n.includes("ozono")) return "O3";
    if (n.includes("co") || n.includes("monoxido de carbono")) return "CO";
    if (n.includes("so2") || n.includes("dioxido de azufre")) return "SO2";

    return "OTHER";
  }

  // ---------------- EXTRACCIÓN SEGURA ----------------

  function getNumber(raw) {
    if (raw === null || raw === undefined) return null;

    const str = String(raw);

    if (str.includes("--")) return null;

    const m = str.match(/(\d+(\.\d+)?)/);
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

  // ---------------- LOAD ----------------

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

        // 👇 IMPORTANTE: NO eliminar si no hay valor numérico aún
        // solo lo marcamos pero lo dejamos pasar si quieres debug
        if (value === null) return;

        const key = getKey(r.name, r.code);

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

  // ---------------- RENDER ----------------

  function render() {

    const filter = document.getElementById("filter").value;

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
    renderRanking(filtered);
    renderAlerts(filtered);
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

  function renderRanking(data) {

    const ranking = data
      .map(s => ({
        ...s,
        worst: Math.max(...s.values.map(v => v.value))
      }))
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

  function renderAlerts(data) {

    const alerts = data.filter(s =>
      Math.max(...s.values.map(v => v.value)) > 100
    );

    document.getElementById("alerts").innerHTML =
      alerts.map(s => `
        <div class="alert">
          ⚠️ ${s.name} - alta contaminación
        </div>
      `).join("");
  }

  // ---------------- INIT ----------------

  document.getElementById("filter").addEventListener("change", render);

  loadData();
  setInterval(loadData, 300000);

});
