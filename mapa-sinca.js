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

  // ---------------- EXTRAER NÚMERO ----------------
  function getNumber(v) {
    if (v === null || v === undefined) return null;

    const m = String(v).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  // ---------------- UNIDADES ROBUSTAS ----------------
  function getUnit(nameRaw) {

    const name = normalize(nameRaw);

    if (name.includes("mp-2,5") || name.includes("pm25")) return "µg/m³";
    if (name.includes("mp-10") || name.includes("pm10")) return "µg/m³";

    if (name.includes("dioxido de nitrogeno") || name.includes("no2")) return "ppbv";
    if (name.includes("monoxido de carbono") || name.includes("co")) return "ppmv";
    if (name.includes("ozono") || name.includes("o3")) return "ppbv";
    if (name.includes("dioxido de azufre") || name.includes("so2")) return "ppbv";

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
  function cargarDatos() {

    fetch("datos_sinca.json")
      .then(res => res.json())
      .then(data => {

        markersLayer.clearLayers();

        const estaciones = {};

        data.forEach(estacion => {

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            let raw = "";

            // extracción flexible
            if (r?.tableRow?.value !== undefined) {
              raw = r.tableRow.value;
            } else if (r?.info?.rows?.length) {
              const last = r.info.rows[r.info.rows.length - 1];
              raw = last?.c?.[3]?.v;
            } else if (typeof r?.value !== "undefined") {
              raw = r.value;
            }

            const valor = getNumber(raw);
            if (valor === null) return;

            const unidad = getUnit(r.name || r.code);

            const key = `${nombre}|${latitud}|${longitud}`;

            if (!estaciones[key]) {
              estaciones[key] = {
                nombre,
                latitud,
                longitud,
                analisis: []
              };
            }

            estaciones[key].analisis.push({
              nombre: r.name || r.code || "contaminante",
              valor,
              unidad,
              fecha: r.datetime || ""
            });

          });
        });

        // ---------------- RENDER ----------------
        Object.values(estaciones).forEach(est => {

          if (!est.analisis.length) return;

          const peor = Math.max(...est.analisis.map(a => a.valor));
          const color = getColor(peor);

          const popup =
            `<b>${est.nombre}</b><hr>` +
            est.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor} ${a.unidad}<br>
               <small>${a.fecha}</small>`
            ).join("<br>");

          L.circleMarker([est.latitud, est.longitud], {
            radius: 7,
            color: "#000",
            weight: 1,
            fillColor: color,
            fillOpacity: 0.85
          })
          .addTo(markersLayer)
          .bindPopup(popup);

        });

      })
      .catch(console.error);
  }

  cargarDatos();
  setInterval(cargarDatos, 300000);

});
