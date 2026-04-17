document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function clean(t) {
    if (!t) return "";
    return String(t)
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .trim();
  }

  function getNumber(t) {
    const m = String(t).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  function getUnit(t) {
    return String(t)
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .replace(/\d+(\.\d+)?/g, "")
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

  function extractRows(r) {
    return (
      r?.info?.rows ||
      r?.tableRow ||
      r?.info?.tableRow ||
      []
    );
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

            const rows = extractRows(r);
            if (!Array.isArray(rows) || rows.length === 0) return;

            let valor = null;
            let unidad = "";

            // 🔥 buscar desde el final
            for (let i = rows.length - 1; i >= 0; i--) {

              const row = rows[i];

              const raw =
                row?.c?.[3]?.v ??
                row?.c?.[2]?.v ??
                row?.c?.[1]?.v;

              const text = clean(raw);

              if (!text) continue;
              if (text.includes("hrs")) continue;
              if (text.includes("--")) continue;

              const num = getNumber(text);

              if (num !== null) {
                valor = num;
                unidad = getUnit(text);
                break;
              }
            }

            if (valor === null) return;

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
