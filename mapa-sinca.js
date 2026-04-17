document.addEventListener("DOMContentLoaded", function () {

  console.log("🔥 MAPA SINCA ACTIVO");

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let DATA = {};
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

  /* ---------------- EXTRAER VALOR ---------------- */

  function getValue(r){
    const raw = r?.tableRow?.value || r?.value || "";
    const m = String(raw).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  /* ---------------- CLASIFICAR CONTAMINANTE ---------------- */

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

  function getUnit(pollutant){

    switch(pollutant){

      case "MP-2,5":
      case "MP-10":
        return "µg/m³";

      case "NO2":
        return "ppbv";

      case "CO":
        return "ppmv";

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

    layer.clearLayers();

    DATA = {
      "MP-2,5": [],
      "MP-10": [],
      "NO2": [],
      "CO": [],
      "O3": []
    };

    data.forEach(station => {

      const { nombre, latitud, longitud, realtime } = station;

      realtime?.forEach(r => {

        const value = getValue(r);
        if(value === null) return;

        const pollutant = getPollutant(r.name);
        if(!pollutant) return;

        DATA[pollutant].push({
          station: nombre,
          lat: latitud,
          lon: longitud,
          value,
          time: r.datetime || ""
        });

      });

    });

    render();
  }

  /* ---------------- RENDER ---------------- */

  function render(){

    layer.clearLayers();

    let pollutantsToRender = [];

    if(CURRENT_FILTER === "ALL"){
      pollutantsToRender = ["MP-2,5","MP-10","NO2","CO","O3"];
    } else {
      pollutantsToRender = [CURRENT_FILTER];
    }

    let rankingHTML = "";

    pollutantsToRender.forEach(p => {

      const list = DATA[p] || [];

      if(list.length === 0) return;

      /* MAPA */
      list.forEach(item => {

        L.circleMarker([item.lat, item.lon], {
          radius: 7,
          color: "#000",
          fillColor: color(item.value),
          fillOpacity: 0.85
        }).addTo(layer)
        .bindPopup(
          `<b>${item.station}</b><br>
           ${p}: ${item.value} ${getUnit(p)}<br>
           <small>${item.time}</small>`
        );

      });

      /* RANKING */
      const sorted = [...list].sort((a,b)=>b.value-a.value);

      rankingHTML += `
        <h4>${p}</h4>
        ${sorted.slice(0,5).map(i=>`
          <div class="card">
            <b>${i.station}</b><br>
            ${i.value} ${getUnit(p)}
          </div>
        `).join("")}
      `;
    });

    document.getElementById("ranking").innerHTML = rankingHTML;

    /* ALERTAS */
    let alerts = [];

    Object.keys(DATA).forEach(p => {
      DATA[p].forEach(i => {
        if(i.value > 100){
          alerts.push({...i, pollutant:p});
        }
      });
    });

    document.getElementById("alerts").innerHTML =
      alerts.map(a => `
        <div class="alert">
          ⚠️ ${a.station} - ${a.pollutant}: ${a.value} ${getUnit(a.pollutant)}
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
