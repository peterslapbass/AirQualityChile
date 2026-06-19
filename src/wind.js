export function createWind(ctx) {
  let canvas, ctx2d;
  let windField = null;
  let particles = [];

  function getWindColor(speed) {
    if (speed < 2) return "gray";
    if (speed < 5) return "#4FC3F7";
    return "#EF5350";
  }

  function createWindIcon(speed, dir) {
    const correctedDir = dir + 180;

    return L.divIcon({
      html: `<div style="
        transform: rotate(${correctedDir}deg);
        color: ${getWindColor(speed)};
        font-size: ${Math.max(12, speed * 4)}px;
      ">➤</div>`,
      className: "",
      iconSize: [20, 20]
    });
  }

  function openMeteoPanel(station) {
    document.getElementById("chart-station-name").textContent =
      station.name || "Estación meteorológica";

    document.getElementById("chart-region").textContent =
      "Datos meteorológicos";

    document.getElementById("chart-pills").innerHTML =
      `<span class="cpill active">Meteo</span>`;

    document.getElementById("chart-stats").innerHTML = `
      <div class="cstat">
        <div class="cstat-lbl">Viento</div>
        <div class="cstat-val">${station.wind_speed ?? "—"}<span class="cstat-unit"> m/s</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Dirección</div>
        <div class="cstat-val">${station.wind_dir ?? "—"}°</div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Temperatura</div>
        <div class="cstat-val">${station.temp ?? "—"}<span class="cstat-unit"> °C</span></div>
      </div>
      <div class="cstat">
        <div class="cstat-lbl">Humedad</div>
        <div class="cstat-val">${station.humidity ?? "—"}<span class="cstat-unit"> %</span></div>
      </div>
    `;

    document.getElementById("seriesChart").style.display = "none";

    const empty = document.getElementById("chart-empty");
    empty.style.display = "block";
    empty.textContent = "Datos meteorológicos en tiempo real";

    document.getElementById("chart-panel").classList.add("open");

    if (window.openChartSheetOverlay) {
      window.openChartSheetOverlay();
    }
  }

  function loadWindData() {
    fetch("datos_meteo.json", {cache: "no-cache"})
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;

        ctx.windLayer.clearLayers();

        data.forEach(s => {
          if (!s.lat || !s.lon) return;

          const marker = L.marker([s.lat, s.lon], {
            icon: createWindIcon(s.wind_speed || 0, s.wind_dir || 0)
          });

          marker.bindPopup(`
            <b>${s.name || "Estación"}</b><br>
            Viento: ${s.wind_speed ?? "—"} m/s<br>
            Dir: ${s.wind_dir ?? "—"}°
          `);

          marker.on("click", () => {
            openMeteoPanel(s);
          });

          ctx.windLayer.addLayer(marker);
        });
      })
      .catch(err => console.error("viento:", err));
  }

  function initCanvas() {
    canvas = document.createElement("canvas");
    ctx2d = canvas.getContext("2d");

    ctx.map.getPanes().overlayPane.appendChild(canvas);

    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 0;

    function resizeCanvas() {
      const size = ctx.map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    }

    function repositionCanvas() {
      const topLeft = ctx.map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
    }

    ctx.map.on("move", () => {
      repositionCanvas();
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    });

    ctx.map.on("resize", resizeCanvas);

    resizeCanvas();
    repositionCanvas();
  }

  function getWindAt(lat, lon) {
    if (!windField) return { u: 0, v: 0 };

    const { min_lat, max_lat, min_lon, max_lon } = windField.bounds;
    const size = windField.grid_size;

    const x = (lon - min_lon) / (max_lon - min_lon) * (size - 1);
    const y = (lat - min_lat) / (max_lat - min_lat) * (size - 1);

    const i = Math.floor(x);
    const j = Math.floor(y);

    if (i < 0 || j < 0 || i >= size - 1 || j >= size - 1) return { u: 0, v: 0 };

    const fx = x - i;
    const fy = y - j;

    const u00 = windField.u[j][i];
    const u10 = windField.u[j][i + 1];
    const u01 = windField.u[j + 1][i];
    const u11 = windField.u[j + 1][i + 1];

    const v00 = windField.v[j][i];
    const v10 = windField.v[j][i + 1];
    const v01 = windField.v[j + 1][i];
    const v11 = windField.v[j + 1][i + 1];

    return {
      u: u00 * (1 - fx) * (1 - fy) + u10 * fx * (1 - fy) + u01 * (1 - fx) * fy + u11 * fx * fy,
      v: v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy
    };
  }

  function loadWindField() {
    fetch("wind_field.json")
      .then(r => r.json())
      .then(data => {
        windField = data;
        initParticles();
      });
  }

  function initParticles() {
    const b = windField.bounds;
    particles = [];

    for (let i = 0; i < 400; i++) {
      particles.push({
        lat: b.min_lat + Math.random() * (b.max_lat - b.min_lat),
        lon: b.min_lon + Math.random() * (b.max_lon - b.min_lon),
        age: Math.random() * 100
      });
    }

    animate._lastTime = null;
    ctx.windAnimationId = requestAnimationFrame(animate);
  }

  function resetParticle(p) {
    const b = windField.bounds;
    p.lat = b.min_lat + Math.random() * (b.max_lat - b.min_lat);
    p.lon = b.min_lon + Math.random() * (b.max_lon - b.min_lon);
    p.age = 0;
  }

  function animate(time) {
    if (!ctx.SHOW_WIND) {
      ctx.windAnimationId = null;
      return;
    }

    const dt = Math.min((time - (animate._lastTime || time)) / 16.67, 3);
    animate._lastTime = time;

    ctx2d.globalCompositeOperation = "destination-in";
    ctx2d.fillStyle = "rgba(0,0,0,0.9)";
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.globalCompositeOperation = "source-over";

    particles.forEach(p => {
      const wind = getWindAt(p.lat, p.lon);
      const speed = Math.sqrt(wind.u ** 2 + wind.v ** 2);

      if (speed < 0.1 || p.age > 100) {
        resetParticle(p);
        return;
      }

      const prev = ctx.map.latLngToContainerPoint([p.lat, p.lon]);

      p.lat += wind.v * 0.01 * dt;
      p.lon += wind.u * 0.01 * dt;
      p.age += dt;

      const next = ctx.map.latLngToContainerPoint([p.lat, p.lon]);

      ctx2d.beginPath();
      ctx2d.moveTo(prev.x, prev.y);
      ctx2d.lineTo(next.x, next.y);
      ctx2d.strokeStyle = "rgba(80,150,255,0.7)";
      ctx2d.stroke();
    });

    ctx.windAnimationId = requestAnimationFrame(animate);
  }

  function show() {
    ctx.map.addLayer(ctx.windLayer);
    canvas.style.display = "block";
    if (windField && !ctx.windAnimationId) {
      animate._lastTime = null;
      ctx.windAnimationId = requestAnimationFrame(animate);
    }
  }

  function hide() {
    ctx.map.removeLayer(ctx.windLayer);
    canvas.style.display = "none";
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    if (ctx.windAnimationId) {
      cancelAnimationFrame(ctx.windAnimationId);
      ctx.windAnimationId = null;
    }
  }

  initCanvas();
  loadWindField();

  return { loadWindData, openMeteoPanel, show, hide };
}
