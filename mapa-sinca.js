document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // -----------------------------
  // 🧼 LIMPIEZA DE TEXTO
  // -----------------------------
  function clean(text) {
    if (!text) return "";
    return String(text)
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // -----------------------------
  // 🔢 EXTRAER VALOR
  // -----------------------------
  function getValue(text) {
    const match = String(text).match(/(\d+(\.\d+)?)/);
    return match ? Number(match[0]) : null;
  }

  // -----------------------------
  // 🧪 EXTRAER UNIDAD
  // -----------------------------
  function getUnit(text) {
    return String(text)
      .replace(/ICAP/gi, "")
      .replace(/--\s*:?\s*hrs\.?/gi, "")
      .replace(/\d+(\.\d+)?/g, "")
      .replace(/⁄/g, "/")
      .replace(/\s+/g, " ")
      .trim();
  }

  // -----------------------------
  // 🎨 COLOR ICA SIMPLE
  // -----------------------------
  function getColor(v) {
    if (v === null || v === undefined) return "#999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // -----------------------------
  // 📡 CARGA DE DATOS
  // -----------------------------
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

            const rows = r?.info?.rows;
            if (!Array.isArray(rows) || rows.length === 0) return;

            let valorFinal = null;
            let unidadFinal = "";

            // 🔥 buscar último valor REAL válido
            for (let i = rows.length - 1; i >= 0; i--) {

              const raw = rows[i]?.c?.[3]?.v;
              const text = clean(raw);

              if (!text) continue;

              // 🚫 eliminar basura SINCA
              if (text.includes("hrs")) continue;
              if (text.includes("--")) continue;

              const valor = getValue(text);

              if (valor !== null) {
                valorFinal = valor;
                unidadFinal = getUnit(text);
                break;
              }
            }

            if (valorFinal === null) return;

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
              valor: valorFinal,
              unidad: unidadFinal,
              fecha: r.datetime || ""
            });

          });
        });

        // -----------------------------
        // 📍 RENDER MAPA
        // -----------------------------
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
      .catch(err => console.error("Error cargando datos:", err));
  }

  // -----------------------------
  // 🔄 INIT + REFRESH
  // -----------------------------
  cargarDatos();
  setInterval(cargarDatos, 300000);

});
