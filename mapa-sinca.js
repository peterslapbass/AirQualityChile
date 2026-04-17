document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function decodeHtml(text) {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  // 🧼 limpieza fuerte de unidades SINCA
  function cleanUnidad(u) {
    if (!u) return "";

    return u
      .replace(/ICAP/gi, "")
      .replace(/--:hrs/g, "")
      .replace(/³/g, "")
      .replace(/N\b/g, "")
      .replace(/µg\/m³/g, "µg/m³")
      .replace(/µg\/m/g, "µg/m³")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseValor(raw, fechaFallback) {

    if (!raw) return null;

    let text = decodeHtml(String(raw));

    text = text.replace(/--:hrs/g, "").trim();

    const match = text.match(/([\d.]+)/);
    if (!match) return null;

    const valor = Number(match[1]);
    if (isNaN(valor)) return null;

    let unidad = text
      .replace(match[0], "")
      .replace(/ICAP/gi, "")
      .trim();

    unidad = cleanUnidad(unidad);

    return {
      valor,
      unidad,
      fecha: fechaFallback || ""
    };
  }

  function getColor(valor) {
    const v = Number(valor);
    if (isNaN(v)) return "#999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
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

            const rows = r?.info?.rows;

            if (!Array.isArray(rows) || rows.length === 0) return;

            // 🟢 tomar SOLO último row válido
            const lastRow = rows[rows.length - 1];
            const raw = lastRow?.c?.[3]?.v;

            const parsed = parseValor(raw, r.datetime);

            if (!parsed) return;

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
              valor: parsed.valor,
              unidad: parsed.unidad,
              fecha: parsed.fecha
            });

          });
        });

        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = getColor(estacion.analisis[0].valor);

          const popupHTML =
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
          .bindPopup(popupHTML);

        });

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  cargarDatos();
  setInterval(cargarDatos, 300000);

});
