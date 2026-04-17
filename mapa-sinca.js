document.addEventListener("DOMContentLoaded", function () {

  // 🗺️ MAPA
  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🧼 decode HTML entities
  function decodeHtml(text) {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  // 🔍 extractor robusto SINCA
  function getValorRealtime(r) {

    const rows = r?.info?.rows;

    if (Array.isArray(rows)) {

      for (let i = rows.length - 1; i >= 0; i--) {

        const row = rows[i];
        const c = row?.c;

        if (!Array.isArray(c)) continue;

        let raw = c[3]?.v;

        if (raw === null || raw === undefined || raw === "") continue;

        // =========================
        // CASO STRING (con unidad + basura)
        // =========================
        if (typeof raw === "string") {

          raw = decodeHtml(raw);

          // 🧼 limpiar basura del SINCA
          raw = raw.replace(/ICAP/g, "");
          raw = raw.replace(/--:hrs/g, "");
          raw = raw.replace(/\s+/g, " ").trim();

          const match = raw.match(/([\d.]+)/);

          if (!match) continue;

          return {
            valor: Number(match[1]),
            unidad: raw.replace(/[\d.\s]/g, "").trim() || ""
          };
        }

        // =========================
        // CASO NUMÉRICO DIRECTO
        // =========================
        const num = Number(raw);

        if (!isNaN(num) && num !== 0 && num !== 1) {
          return {
            valor: num,
            unidad: ""
          };
        }
      }
    }

    // =========================
    // FALLBACK tableRow
    // =========================
    const tr = r?.tableRow;

    if (tr && typeof tr === "object") {

      for (let v of Object.values(tr)) {

        const num = Number(v);

        if (!isNaN(num) && num !== 0 && num !== 1) {
          return {
            valor: num,
            unidad: ""
          };
        }
      }
    }

    return null;
  }

  // 🎨 colores básicos (ICAP futuro)
  function getColor(valor) {

    const v = Number(valor);

    if (isNaN(v)) return "#999999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
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

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) return;
          if (!Array.isArray(realtime)) return;

          realtime.forEach(r => {

            const result = getValorRealtime(r);

            if (!result) return;

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
              valor: result.valor,
              unidad: result.unidad,
              fecha: r.datetime || ""
            });

          });
        });

        // 🧱 crear markers
        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = getColor(estacion.analisis[0].valor);

          const popupHTML =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a =>
              `<b>${a.nombre}:</b> ${a.valor} ${a.unidad}<br><small>${a.fecha}</small>`
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

        console.log("✔ Datos cargados correctamente:", popupDict);

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  // 🔄 init + refresh
  cargarDatos();
  setInterval(cargarDatos, 300000);

});
