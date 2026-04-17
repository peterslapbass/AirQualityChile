document.addEventListener("DOMContentLoaded", function () {

  // 🗺️ MAPA
  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🔍 extraer último valor válido
  function extraerUltimoValor(infoRows) {
    if (!Array.isArray(infoRows)) return null;

    for (let i = infoRows.length - 1; i >= 0; i--) {
      const row = infoRows[i];

      const valor = row?.c?.[3]?.v;
      const fecha = row?.c?.[0]?.v || "";

      if (
        valor !== null &&
        valor !== undefined &&
        valor !== "" &&
        valor !== "no disponible"
      ) {
        return { valor, fecha };
      }
    }
    return null;
  }

  // 🎨 color básico (opcional pero útil)
  function getColor(valor) {
    const v = Number(valor);

    if (isNaN(v)) return "#999999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // 📡 cargar datos
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

            const key = `${nombre}|${latitud}|${longitud}`;

            if (!popupDict[key]) {
              popupDict[key] = {
                nombre,
                latitud,
                longitud,
                analisis: []
              };
            }

            const infoRows = r?.info?.rows;
            const result = extraerUltimoValor(infoRows);

            if (result) {
              popupDict[key].analisis.push({
                nombre: r.name || "sin nombre",
                valor: result.valor,
                fecha: result.fecha
              });
            }
          });
        });

        // 📍 crear marcadores
        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const refValor = estacion.analisis[0].valor;
          const color = getColor(refValor);

          const popupHTML =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor} <br><small>${a.fecha}</small>`
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

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  // 🔄 init + refresh
  cargarDatos();
  setInterval(cargarDatos, 300000);

});
