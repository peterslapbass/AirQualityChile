document.addEventListener("DOMContentLoaded", function () {

  // 🗺️ MAPA
  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // 🧼 decode HTML
  function decodeHtml(text) {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  // 🔍 parser robusto SINCA (valor + unidad + ICAP)
  function parseValor(raw) {

    if (!raw) return null;

    let text = decodeHtml(String(raw));

    // limpiar ruido de tiempo
    text = text.replace(/--:hrs/g, "").trim();

    // extraer número
    const match = text.match(/([\d.]+)/);
    if (!match) return null;

    const valor = Number(match[1]);
    if (isNaN(valor)) return null;

    // detectar ICAP (NO eliminar, conservar como flag)
    const icap = /ICAP/i.test(text);

    // extraer unidad limpia
    let unidad = text
      .replace(match[0], "")
      .replace(/ICAP/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // normalización de símbolos raros SINCA
    unidad = unidad
      .replace(/µg⁄mN/g, "µg/m³")
      .replace(/µg⁄m/g, "µg/m³")
      .replace(/µg\/mN/g, "µg/m³");

    return {
      valor,
      unidad,
      icap
    };
  }

  // 🎨 colores simples (puedes evolucionar a ICAP real después)
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

            const parsed = parseValor(r?.info?.rows?.length ? r.info.rows[r.info.rows.length - 1]?.c?.[3]?.v : null);

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
              icap: parsed.icap,
              fecha: r.datetime || ""
            });

          });
        });

        // 📍 markers
        Object.values(popupDict).forEach(estacion => {

          if (!estacion.analisis.length) return;

          const color = getColor(estacion.analisis[0].valor);

          const popupHTML =
            `<b>${estacion.nombre}</b><hr>` +
            estacion.analisis.map(a => {

              const badge = a.icap ? " 🟡 ICAP" : "";

              return `<b>${a.nombre}:</b> ${a.valor} ${a.unidad}${badge}<br>
                      <small>${a.fecha}</small>`;
            }).join("<br>");

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

        console.log("✔ Mapa actualizado correctamente");

      })
      .catch(err => console.error("Error cargando datos:", err));
  }

  // 🔄 init + refresh
  cargarDatos();
  setInterval(cargarDatos, 300000);

});
