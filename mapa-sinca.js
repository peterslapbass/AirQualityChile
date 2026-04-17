document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function extraerUltimoValor(infoRows) {
    if (!Array.isArray(infoRows)) return null;

    for (let i = infoRows.length - 1; i >= 0; i--) {
      const row = infoRows[i];

      if (row && row.c && row.c.length > 3) {
        const valor = row.c[3]?.v;

        if (
          valor !== null &&
          valor !== undefined &&
          valor !== 0 &&
          valor !== "0" &&
          valor !== "" &&
          valor !== "no disponible"
        ) {
          return valor;
        }
      }
    }
    return null;
  }

  function cargarDatos() {
    fetch("https://api.allorigins.win/raw?url=https://sinca.mma.gob.cl/index.php/json/listadomapa2k19")
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

            const infoRows = r["info.rows"];
            const valor = extraerUltimoValor(infoRows);
            const nombreAnalisis = r.name || "";

            if (valor !== null) {
              popupDict[key].analisis.push(
                `<b>${nombreAnalisis}:</b> ${valor}`
              );
            }
          });
        });

        Object.values(popupDict).forEach(estacion => {
          if (!estacion.analisis.length) return;

          const popupHTML =
            `<b>${estacion.nombre}</b><br>` +
            estacion.analisis.join("<br>");

          L.marker([estacion.latitud, estacion.longitud])
            .addTo(markersLayer)
            .bindPopup(popupHTML);
        });

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  cargarDatos();

  setInterval(cargarDatos, 300000);
});
