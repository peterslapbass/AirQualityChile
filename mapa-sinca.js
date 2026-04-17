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
  
      if (!row?.c || row.c.length <= 3) continue;
  
      let valor = row.c[3]?.v;
  
      if (valor === null || valor === undefined) continue;
  
      // 🔹 si es número válido
      if (typeof valor === "number") {
        if (!isNaN(valor)) return valor;
      }
  
      // 🔹 si es string
      if (typeof valor === "string") {
        const limpio = valor.trim().toLowerCase();
  
        // solo descartar casos claros
        if (
          limpio === "" ||
          limpio === "no disponible" ||
          limpio === "nd"
        ) {
          continue;
        }
  
        // intentar convertir
        const num = Number(limpio.replace(",", "."));
        if (!isNaN(num)) return num;
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

            // 🔥 acceso correcto
            const infoRows = r.info?.rows;

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

  // carga inicial
  cargarDatos();

  // 🔄 actualiza cada 5 minutos
  setInterval(cargarDatos, 300000);

});
