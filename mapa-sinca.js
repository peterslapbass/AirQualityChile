document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  let layer = L.layerGroup().addTo(map);

  let STATIONS = {};
  let CURRENT_FILTER = "ALL";

  function normalize(t){
    if(!t) return "";
    const x = document.createElement("textarea");
    x.innerHTML = t;
    return x.value.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"");
  }

  function getValue(r){
    const raw = r?.tableRow?.value || r?.value || "";
    const m = String(raw).match(/(\d+(\.\d+)?)/);
    return m ? Number(m[0]) : null;
  }

  function getPollutant(name){

    const n = normalize(name);

    if(n.includes("mp-2") || n.includes("pm25")) return "MP-2,5";
    if(n.includes("mp-10") || n.includes("pm10")) return "MP-10";
    if(n.includes("no2")) return "NO2";
    if(n.includes("co")) return "CO";
    if(n.includes("o3")) return "O3";

    return null;
  }

  function getUnit(p){

    switch(p){
      case "MP-2,5":
      case "MP-10": return "µg/m³";
      case "NO2": return "ppbv";
      case "CO": return "ppm";
      case "O3": return "ppbv";
      default: return "";
    }
  }

  function color(v){
    if(v <= 25) return "green";
    if(v <= 50) return "yellow";
    if(v <= 100) return "orange";
    if(v <= 150) return "red";
    return "purple";
  }

  async function load(){

    const res = await fetch("datos_sinca.json");
    const data = await res.json();

    STATIONS = {};

    data.forEach(s => {

      const name = s.nombre;

      if(!STATIONS[name]){
        STATIONS[name] = {
          name,
          lat: s.latitud,
          lon: s.longitud,
          values: {}
        };
      }

      s.realtime?.forEach(r => {
        console.log("RAW NAME:", r.name, r);
        const v = getValue(r);
        if(v === null) return;

        const p = getPollutant(
          r.name ||
          r.parameter ||
          r.tableRow?.parameter ||
          ""
        );
        
        if(!p) return;

        STATIONS[name].values[p] = v;

      });

    });

    render();
  }

  function render(){

    layer.clearLayers();

    let ranking = [];

    Object.values(STATIONS).forEach(s => {

      let vals = Object.entries(s.values);

      if(CURRENT_FILTER !== "ALL"){
        vals = vals.filter(v => v[0] === CURRENT_FILTER);
      }

      if(vals.length === 0) return;

      const worst = Math.max(...vals.map(v => v[1]));

      ranking.push({...s, worst, vals});

      const popup = `
        <b>${s.name}</b><hr>
        ${vals.map(v => `
          ${v[0]}: ${v[1]} ${getUnit(v[0])}<br>
        `).join("")}
      `;

      L.circleMarker([s.lat, s.lon], {
        radius: 8,
        color: "#000",
        fillColor: color(worst),
        fillOpacity: 0.85
      }).addTo(layer)
      .bindPopup(popup);

    });

    ranking.sort((a,b)=>b.worst-a.worst);

    document.getElementById("ranking").innerHTML =
      ranking.slice(0,10).map(s => `
        <div class="card">
          <b>${s.name}</b><br>
          peor valor: ${s.worst}
        </div>
      `).join("");

    let alerts = ranking.filter(s => s.worst > 100);

    document.getElementById("alerts").innerHTML =
      alerts.map(a => `
        <div class="alert">
          ⚠️ ${a.name} (${a.worst})
        </div>
      `).join("");
  }

  document.getElementById("filter")
    .addEventListener("change", e => {
      CURRENT_FILTER = e.target.value;
      render();
    });

  load();
  setInterval(load, 300000);

});
