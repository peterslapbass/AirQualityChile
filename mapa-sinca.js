document.addEventListener("DOMContentLoaded", function () {

  console.log("🔥 MAPA SINCA - FINAL STABLE VERSION");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let STATIONS = {};
  let CURRENT_FILTER = "ALL";

  /* ---------------- NORMALIZAR ---------------- */

  function normalize(t){
    if(!t) return "";
    const x = document.createElement("textarea");
    x.innerHTML = t;
    return x.value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"");
  }

  /* ---------------- VALOR ---------------- */

  function getValue(r){
    const raw = r?.tableRow?.value || r?.value || "";
    const m = String(raw).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  /* ---------------- CONTAMINANTE ---------------- */

  function getPollutant(name){

    const n = normalize(name);

    if(n.includes("mp-2") || n.includes("pm25") || n.includes("pm2")) return "MP-2,5";
    if(n.includes("mp-10") || n.includes("pm10")) return "MP-10";

    if(n.includes("dioxido de nitrogeno") || n.includes("no2")) return "NO2";
    if(n.includes("monoxido de carbono") || n.includes("co")) return "CO";
    if(n.includes("ozono") || n.includes("o3")) return "O3";

    return null;
  }

  /* ---------------- UNIDADES ---------------- */

  function getUnit(p){
    switch(p){
      case "MP-2,5":
      case "MP-10":
        return "µg/m³";
      case "NO2":
        return "ppbv";
      case "CO":
        return "ppm";
      case "O3":
        return "ppbv";
      default:
        return "";
    }
  }

  /* ---------------- COLOR ---------------- */

  function color(v){
    if(v <= 25) return "green";
    if(v <= 50) return "yellow";
    if(v <= 100) return "orange";
    if(v <= 150) return "red";
    return "purple";
  }

  /* ---------------- LOAD ---------------- */

  async function load(){

    console.log("📡 CARGANDO DATOS");

    const res = await fetch("datos_sinca.json");
    const data = await res.json();

    STATIONS = {};

    data.forEach(station => {

      const { nombre, latitud, longitud, realtime } = station;

      if(!STATIONS[nombre]){
        STATIONS[nombre] = {
          name: nombre,
          lat: latitud,
          lon: longitud,
          values: {}
        };
      }

      realtime?.forEach(r => {

        const value = getValue(r);
        if(value === null) return;

        const pollutant = getPollutant(r.name || r.parameter || "");
        if(!pollutant) return;

        // ✔ guardamos valor + hora (FIX CLAVE)
        STATIONS[nombre].values[pollutant] = {
          value,
          time: r.datetime || ""
        };

      });

    });

    render();
  }

  /* ---------------- RENDER ---------------- */

  function render(){

    layer.clearLayers();

    const stations = Object.values(STATIONS);

    let processed = stations.map(s => {

      let values = Object.entries(s.values);

      if(CURRENT_FILTER !== "ALL"){
        values = values.filter(v => v[0] === CURRENT_FILTER);
      }

      if(values.length === 0) return null;

      const worst = Math.max(...values.map(v => v[1].value));

      const lastUpdate = Math.max(
        ...values.map(v => new Date(v[1].time || 0).getTime() || 0)
      );

      return {
        ...s,
        values,
        worst,
        lastUpdate
      };

    }).filter(Boolean);

    /* MAPA */
    processed.forEach(s => {

      L.circleMarker([s.lat, s.lon], {
        radius: 8,
        color: "#000",
        fillColor: color(s.worst),
        fillOpacity: 0.85
      }).addTo(layer)
      .bindPopup(
        `<b>${s.name}</b><hr>` +
        s.values.map(v =>
          `${v[0]}: ${v[1].value} ${getUnit(v[0])}<br>
           <small>${v[1].time}</small><br>`
        ).join("") +
        `<hr><small>Última actualización: ${
          s.lastUpdate ? new Date(s.lastUpdate).toLocaleString() : "N/A"
        }</small>`
      );

    });

    /* RANKING */
    const ranking = [...processed].sort((a,b)=>b.worst-a.worst);

    document.getElementById("ranking").innerHTML =
      ranking.slice(0,10).map(s => `
        <div class="card">
          <b>${s.name}</b><br>
          peor valor: ${s.worst}<br>
          <small>${s.lastUpdate ? new Date(s.lastUpdate).toLocaleString() : ""}</small>
        </div>
      `).join("");

    /* ALERTAS */
    const alerts = ranking.filter(s => s.worst > 100);

    document.getElementById("alerts").innerHTML =
      alerts.map(a => `
        <div class="alert">
          ⚠️ ${a.name} (${a.worst})
        </div>
      `).join("");
  }

  /* ---------------- FILTER ---------------- */

  document.getElementById("filter")
    .addEventListener("change", (e)=>{
      CURRENT_FILTER = e.target.value;
      render();
    });

  /* ---------------- INIT ---------------- */

  load();
  setInterval(load, 300000);

});
