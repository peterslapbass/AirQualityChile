document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // ---------------- NORMALIZAR ----------------

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

    const n = normalize(`${name || ""} ${code || ""}`);

    // MP
    if (n.includes("mp-2") || n.includes("pm2") || n.includes("pm25")) return "PM25";
    if (n.includes("mp-10") || n.includes("pm10")) return "PM10";

    // gases
    if (n.includes("dioxido de nitrogeno") || n.includes("no2")) return "NO2";
    if (n.includes("monoxido de carbono") || n.includes("co")) return "CO";
    if (n.includes("ozono") || n.includes("o3")) return "O3";
    if (n.includes("dioxido de azufre") || n.includes("so2")) return "SO2";

    return "UNKNOWN";
  }

  // ---------------- NÚMERO ----------------

  function getNumber(v) {
    if (v === null || v === undefined) return null;

    const m = String(v).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  // ---------------- UNIDADES (FORZADAS Y SEGURAS) ----------------

  function getUnit(key) {

    const map = {
      PM25: "µg/m³",
      PM10: "µg/m³",
      NO2: "ppbv",
      CO: "ppmv",
      O3: "ppbv",
      SO2: "ppbv"
    };

    return map[key] || "";
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

    const parsed = [];

    data.forEach(station => {

      const realtime = station.realtime || [];

      realtime.forEach(r => {

        let raw = "";

        if (r?.tableRow?.value !== undefined) {
          raw = r.tableRow.value;
        } else if (r?.info?.rows?.length) {
          const last = r.info.rows[r.info.rows.length - 1];
          raw = last?.c?.[3]?.v;
        }

        const value = getNumber(raw);
        if (value === null) return;

        const key = getKey(r.name, r.code);
        const unit = getUnit(key);

        parsed.push({
          station: station.nombre,
          lat: station.latitud,
          lon: station.longitud,
          name: r.name,
          value,
          unit,
          key,
          time: r.datetime || ""
        });

      });

    });

    render(parsed);
  }

  // ---------------- RENDER ----------------

  function render(data) {

    markersLayer.clearLayers();

    const grouped = {};

    data.forEach(d => {

      const k = `${d.station}|${d.lat}|${d.lon}`;

      if (!grouped[k]) {
        grouped[k] = {
          station: d.station,
          lat: d.lat,
          lon: d.lon,
          values: []
        };
      }

      grouped[k].values.push(d);
    });

    Object.values(grouped).forEach(s => {

      const worst = Math.max(...s.values.map(v => v.value));

      L.circleMarker([s.lat, s.lon], {
        radius: 7,
        color: "#000",
        fillColor: getColor(worst),
        fillOpacity: 0.85
      })
      .addTo(markersLayer)
      .bindPopup(
        `<b>${s.station}</b><hr>` +
        s.values.map(v =>
          `${v.name}: ${v.value} ${v.unit}<br><small>${v.time}</small>`
        ).join("<br>")
      );

    });
  }

  loadData();

});
