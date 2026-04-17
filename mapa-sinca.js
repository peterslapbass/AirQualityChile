alert("MAPA-SINCA ACTIVO");

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ SCRIPT CARGADO - DOM READY");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);

  // ---------------- NORMALIZAR ----------------
  function normalize(text) {
    if (!text) return "";

    const t = document.createElement("textarea");
    t.innerHTML = text;

    return t.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ---------------- NÚMERO ----------------
  function getNumber(v) {
    const m = String(v).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  // ---------------- UNIDADES ----------------
  function getUnit(nameRaw) {

    const name = normalize(nameRaw);

    console.log("🔎 UNIT INPUT:", nameRaw, "→", name);

    if (name.includes("mp-2,5") || name.includes("pm25")) return "µg/m³";
    if (name.includes("mp-10") || name.includes("pm10")) return "µg/m³";

    if (name.includes("monoxido de carbono") || name.includes("co")) return "ppmv";
    if (name.includes("ozono") || name.includes("o3")) return "ppbv";
    if (name.includes("dioxido de nitrogeno") || name.includes("no2")) return "ppbv";
    if (name.includes("dioxido de azufre") || name.includes("so2")) return "ppbv";

    return "";
  }

  // ---------------- COLOR ----------------
  function getColor(v) {
    if (v === null || v === undefined) return "#999";
    if (v <= 25) return "#00e400";
    if (v <= 50) return "#ffff00";
    if (v <= 100) return "#ff7e00";
    if (v <= 150) return "#ff0000";
    return "#8f3f97";
  }

  // ---------------- LOAD ----------------
  function cargarDatos() {

    console.log("📡 FETCH INICIADO");

    fetch("datos_sinca.json")
      .then(res => {
        console.log("📦 RESPONSE RECIBIDA", res.status);
        return res.json();
      })
      .then(data => {

        console.log("📊 DATA CARGADA:", data);

        markersLayer.clearLayers();

        let totalEstaciones = 0;
        let totalRealtime = 0;

        const estaciones = {};

        data.forEach(estacion => {

          totalEstaciones++;

          console.log("🏭 ESTACIÓN:", estacion.nombre);

          const { nombre, latitud, longitud, realtime } = estacion;

          if (!latitud || !longitud) {
            console.log("❌ SIN COORDS:", nombre);
            return;
          }

          if (!Array.isArray(realtime)) {
            console.log("❌ NO REALTIME ARRAY:", nombre, realtime);
            return;
          }

          realtime.forEach(r => {

            totalRealtime++;

            console.log("⚡ REALTIME ITEM:", r);

            let raw = "";

            if (r?.tableRow?.value !== undefined) {
              raw = r.tableRow.value;
            } else if (r?.info?.rows?.length) {
              const last = r.info.rows[r.info.rows.length - 1];
              raw = last?.c?.[3]?.v;
            } else if (typeof r?.value !== "undefined") {
              raw = r.value;
            }

            const valor = getNumber(raw);

            if (valor === null) {
              console.log("⚠️ SIN VALOR:", r.name, raw);
              return;
            }

            const unidad = getUnit(r.name || r.code);

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
              nombre: r.name || r.code,
              valor,
              unidad,
              fecha: r.datetime || ""
            });

          });
        });

        console.log("📌 RESUMEN:");
        console.log("Estaciones:", totalEstaciones);
        console.log("Realtime items:", totalRealtime);

        Object.values(estaciones).forEach(est => {

          if (!est.analisis.length) return;

          const color = getColor(est.analisis[0].valor);

          L.circleMarker([est.latitud, est.longitud], {
            radius: 7,
            color: "#000",
            fillColor: color,
            fillOpacity: 0.85
          })
          .addTo(markersLayer)
          .bindPopup(
            `<b>${est.nombre}</b><hr>` +
            est.analisis.map(a =>
              `${a.nombre}: ${a.valor} ${a.unidad}<br><small>${a.fecha}</small>`
            ).join("<br>")
          );

        });

      })
      .catch(err => {
        console.error("❌ ERROR FETCH:", err);
      });
  }

  cargarDatos();
  setInterval(cargarDatos, 300000);

});
