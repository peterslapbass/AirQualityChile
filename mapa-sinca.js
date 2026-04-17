document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🎨 COLOR SEGÚN VALOR (PM2.5 estilo simplificado)
  function getColor(valor) {
    if (valor === null || valor === undefined) return "#999999";
    if (valor <= 25) return "#00e400";
    if (valor <= 50) return "#ffff00";
    if (valor <= 100) return "#ff7e00";
    if (valor <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // 🔍 extracción robusta
  function extraerUltimoValor(infoRows) {
    if (!Array.isArray(infoRows)) return null;

    for (let i = infoRows.length - 1; i >= 0; i--) {
      const row = infoRows[i];

      if (row?.c && row.c.length > 3) {
        const valor = row.c[3]?.v;
        const fecha = row.c[0]?.v || "";

        if (
          valor !== null &&
          valor !== undefined &&
          valor !== "" &&
          valor !== "no disponible"
        ) {
          return { valor, fecha };
        }
      }
    }
    return null;
  }

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

            const infoRows = r.info?.rows;
            const result = extraerUltimoValor(infoRows);

            const nombreAnalisis = r.name || "";

            if (result && result.valor !== null) {

              popupDict[key].analisis.push({
                nombre: nombreAnalisis,
                valor: result.valor,
                fecha: result.fecha
              });
            }
          });
        });

        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          // 🔥 usa primer valor como referencia de color
          const refValor = estacion.analisis[0].valor;
          const color = getColor(refValor);

          const popupHTML =
            `<b>${estacion.nombre}</b><br><hr>` +
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

  // carga inicial
  cargarDatos();

  // 🔄 actualización automática
  setInterval(cargarDatos, 300000);

});
