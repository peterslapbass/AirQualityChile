document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  function decodeHtml(text) {
    const t = document.createElement("textarea");
    t.innerHTML = text;
    return t.value;
  }

  // 🔥 SOLO extraer número real sin tocar unidad aún
  function extractValor(raw) {

    if (!raw) return null;

    let text = decodeHtml(String(raw));

    // limpiar solo basura segura
    text = text.replace(/ICAP/gi, "").replace(/--:hrs/g, "");

    const match = text.match(/(\d+(\.\d+)?)/);
    if (!match) return null;

    const valor = Number(match[0]);

    if (isNaN(valor)) return null;

    return valor;
  }

  function getUnidad(raw) {

    if (!raw) return "";

    let text = decodeHtml(String(raw));

    text = text
      .replace(/ICAP/gi, "")
      .replace(/--:hrs/g, "")
      .replace(/\d+(\.\d+)?/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // normalización mínima segura
    text = text
      .replace(/µg⁄m3/g, "µg/m³")
      .replace(/µg\/m/g, "µg/m³");

    return text;
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

            // 🚫 FILTRO CRÍTICO SINCA (AQUÍ)
            const label = (r.name || r.code || "").toLowerCase();
          
            if (label.includes("hrs") || label.includes("--")) return;
          
            const rows = r?.info?.rows;
            if (!Array.isArray(rows) || rows.length === 0) return;
          
            const last = rows[rows.length - 1];
            const raw = last?.c?.[3]?.v;
          
            const valor = extractValor(raw);
            if (valor === null) return;
          
            const unidad = getUnidad(raw);
          
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
              fecha: r.datetime
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
      .catch(err => console.error(err));
  }

  cargarDatos();
  setInterval(cargarDatos, 300000);

});
