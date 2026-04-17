document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function getValorRealtime(r) {
  
    const rows = r?.info?.rows;
  
    if (!Array.isArray(rows)) return null;
  
    // recorrer hacia atrás (último dato válido)
    for (let i = rows.length - 1; i >= 0; i--) {
  
      const row = rows[i];
  
      const valorRaw = row?.c?.[3]?.v;
  
      const valor = Number(valorRaw);
  
      if (!isNaN(valor) && valorRaw !== "" && valorRaw !== null) {
        return valor;
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
              nombre: r.name,
              valor,
              fecha: r.datetime
            });

          });
        });

        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = "#ff7e00";

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

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  cargarDatos();
  setInterval(cargarDatos, 300000);

});
