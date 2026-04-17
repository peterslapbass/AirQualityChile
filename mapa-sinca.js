document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function cleanText(v) {
    if (v === null || v === undefined) return "";
    return String(v)
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getNumber(text) {
    const match = String(text).match(/(\d+(\.\d+)?)/);
    return match ? Number(match[0]) : null;
  }

  function getUnit(text) {
    return String(text || "")
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .replace(/\d+(\.\d+)?/g, "")
      .replace(/⁄/g, "/")
      .replace(/\s+/g, " ")
      .trim();
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

        const dict = {};

        data.forEach(estacion => {

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            const rows = r?.info?.rows;

            if (!Array.isArray(rows) || rows.length === 0) return;

            let valor = null;
            let unidad = "";

            // 🔥 buscar desde el final
            for (let i = rows.length - 1; i >= 0; i--) {

              const raw = rows[i]?.c?.[3]?.v;
              const text = cleanText(raw);

              // ⚠️ solo ignorar claramente basura
              if (!text) continue;
              if (text.includes("-- : hrs")) continue;

              const num = getNumber(text);

              if (num !== null) {
                valor = num;
                unidad = getUnit(text);
                break;
              }
            }

            if (valor === null) return;

            const key = `${nombre}|${latitud}|${longitud}`;

            if (!dict[key]) {
              dict[key] = {
                nombre,
                latitud,
                longitud,
                analisis: []
              };
            }

            dict[key].analisis.push({
              nombre: r.name || r.code || "contaminante",
              valor,
              unidad,
              fecha: r.datetime || ""
            });

          });
        });

        Object.values(dict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = getColor(estacion.analisis[0].valor);

          const popup =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor} ${a.unidad}<br>
               <small>${a.fecha}</small>`
            ).join("<br>");

          L.circleMarker([estacion.latitud, estacion.longitud], {
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
