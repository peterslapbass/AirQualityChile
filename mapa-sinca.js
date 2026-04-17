document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function getNumber(v) {
    const m = String(v).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  // 🔥 reconstrucción inteligente de unidad
  function getUnit(r) {
  
    const name = (r?.name || "").toLowerCase();
  
    // Material particulado
    if (name.includes("mp-2,5") || name.includes("pm25")) return "µg/m³";
    if (name.includes("mp-10") || name.includes("pm10")) return "µg/m³";
  
    // Gases
    if (name.includes("monóxido de carbono") || name.includes("CO")) return "ppmv";
    if (name.includes("ozono") || name.includes("o3")) return "ppbv";
    if (name.includes("dióxido de nitrógeno") || name.includes("NO2")) return "ppbv";
    if (name.includes("dióxido de azufre") || name.includes("SO2")) return "ppbv";
  
    // fallback
    return "";
  }

  function getColor(v) {
    if (v === null || v === undefined) return "#999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  function cargarDatos() {

    fetch("datos_sinca.json")
      .then(r => r.json())
      .then(data => {

        markersLayer.clearLayers();

        const estaciones = {};

        data.forEach(estacion => {

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            let raw = "";

            if (r?.tableRow?.value !== undefined) {
              raw = r.tableRow.value;
            } else if (r?.info?.rows?.length) {
              const last = r.info.rows[r.info.rows.length - 1];
              raw = last?.c?.[3]?.v;
            }

            const valor = getNumber(raw);
            if (valor === null) return;

            const unit = getUnit(r);

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
              nombre: r.name || r.code,
              valor,
              unidad: unit,
              fecha: r.datetime || ""
            });

          });
        });

        Object.values(estaciones).forEach(est => {

          if (!est.analisis.length) return;

          const color = getColor(est.analisis[0].valor);

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
