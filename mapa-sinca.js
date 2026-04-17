document.addEventListener("DOMContentLoaded", function () {

  // 🗺️ MAPA
  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🧼 PARSER DE CONTAMINANTES (CLAVE NUEVA)
  function parseContaminante(texto, fecha) {

    if (!texto || typeof texto !== "string") return null;

    // ejemplo:
    // MP-2,5: 20 µg/m3 40 ICAP

    const match = texto.match(
      /(.+?):\s*([\d.,]+).*?(\d+)?\s*ICAP/i
    );

    if (!match) return null;

    const nombre = match[1].trim();
    const valor = Number(match[2].replace(",", "."));
    const icap = match[3] ? Number(match[3]) : null;

    if (isNaN(valor)) return null;

    return {
      nombre,
      valor,
      icap,
      fecha
    };
  }

  // 🔍 extraer fila cruda (AHORA MÁS FLEXIBLE)
  function extraerUltimoValor(infoRows) {

    if (!Array.isArray(infoRows)) return null;

    for (let i = infoRows.length - 1; i >= 0; i--) {

      const row = infoRows[i];

      const fecha = row?.c?.[0]?.v || "";
      const texto = row?.c?.[3]?.v; // 👈 ahora es texto completo

      if (texto) {
        return { texto, fecha };
      }
    }

    return null;
  }

  // 🎨 color por ICAP (MEJORA REAL)
  function getColorICAP(icap) {

    if (icap === null || icap === undefined) return "#999999";

    if (icap <= 25) return "#00e400";
    if (icap <= 50) return "#ffff00";
    if (icap <= 100) return "#ff7e00";
    if (icap <= 150) return "#ff0000";

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

          console.log("ESTACION:", estacion); //DEBUG
          
          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            console.log("REALTIME:", r); // DEBUG
            
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

            if (!result) return;

            // 🧠 PARSE REAL DEL TEXTO
            const parsed = parseContaminante(result.texto, result.fecha);

            if (!parsed) return;

            popupDict[key].analisis.push(parsed);
          });

        });

        // 📍 CREAR MARCADORES
        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          // 🔥 color basado en peor ICAP
          const maxICAP = Math.max(
            ...estacion.analisis
              .map(a => a.icap)
              .filter(v => v !== null)
          );

          const color = getColorICAP(maxICAP);

          const popupHTML =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor} ` +
              (a.icap !== null ? `(ICAP: ${a.icap})` : "") +
              `<br><small>${a.fecha}</small>`
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
