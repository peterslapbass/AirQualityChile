document.addEventListener("DOMContentLoaded", function () {

  // 🗺️ MAPA
  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🔍 EXTRACTOR UNIVERSAL DE VALOR
  function getValorRealtime(r) {

    // CASO 1: estructura clásica SINCA (info.rows)
    const rows = r?.info?.rows;

    if (Array.isArray(rows)) {

      for (let i = rows.length - 1; i >= 0; i--) {

        const v = rows[i]?.c?.[3]?.v;

        const num = Number(v);

        if (!isNaN(num) && v !== null && v !== "" && v !== undefined) {
          return num;
        }
      }
    }

    // CASO 2: estructura alternativa (tableRow)
    const tr = r?.tableRow;

    if (tr && typeof tr === "object") {

      for (let v of Object.values(tr)) {

        const num = Number(v);

        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }

    return null;
  }

  // 🎨 COLOR SIMPLE (puedes mejorar luego con ICAP real)
  function getColor(valor) {

    const v = Number(valor);

    if (isNaN(v)) return "#999999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // 📡 CARGA DE DATOS
  function cargarDatos() {

    fetch("datos_sinca.json")
      .then(res => res.json())
      .then(data => {

        markersLayer.clearLayers();

        const popupDict = {};

        data.forEach(estacion => {

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            const valor = getValorRealtime(r);

            if (valor === null) return;

            const key = `${nombre}|${latitud}|${longitud}`;

            if (!popupDict[key]) {
              popupDict[key] = {
                nombre,
                latitud,
                longitud,
                analisis: []
              };
            }

            popupDict[key].analisis.push({
              nombre: r.name || r.code || "contaminante",
              valor,
              fecha: r.datetime || ""
            });

          });
        });

        // 🧱 CREAR MARCADORES
        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = getColor(estacion.analisis[0].valor);

          const popupHTML =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor}<br><small>${a.fecha}</small>`
            ).join("<br>");

          L.circleMarker([estacion.latitud, estacion.longitud], {
            radius: 7,
            color: "#000",
            weight: 1,
            fillColor: color,
            fillOpacity: 0.85
          })
          .addTo(markersLayer)
          .bindPopup(popupHTML);

        });

        console.log("✔ Datos cargados:", popupDict);

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  // 🔄 INIT + AUTO REFRESH
  cargarDatos();
  setInterval(cargarDatos, 300000);

});
