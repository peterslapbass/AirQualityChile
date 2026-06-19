export function createSources(ctx) {
  async function loadSources() {
    try {
      const res = await fetch("fuentes.json", { cache: "no-cache" });
      const data = await res.json();

      ctx.sourceLayer.clearLayers();

      const coordCount = {};

      data.forEach(src => {
        if (src.lat == null || src.lon == null || isNaN(src.lat) || isNaN(src.lon)) return;

        const emissions = Object.entries(src.emissions || {}).filter(([_, val]) => val > 0);
        const totalEmission = emissions.reduce((a, b) => a + b[1], 0);

        const radius =
          totalEmission <= 0 ? 4 :
          Math.min(18, 4 + Math.log10(totalEmission + 1) * 3);

        const key = `${src.lat.toFixed(5)},${src.lon.toFixed(5)}`;
        coordCount[key] = (coordCount[key] || 0) + 1;

        const n = coordCount[key];
        const angle = n * 45 * Math.PI / 180;
        const offset = 0.0012;

        const lat = src.lat + Math.cos(angle) * offset;
        const lon = src.lon + Math.sin(angle) * offset;

        const marker = L.circleMarker([lat, lon], {
          radius,
          color: "#000",
          weight: 1,
          fillColor: "#7b1fa2",
          fillOpacity: 0.75
        });

        const top = Object.entries(src.emissions || {})
          .filter(([_, v]) => Number.isFinite(v) && v > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        marker.bindPopup(`
          <b>${src.name}</b><br>
          <div style="font-size:11px;color:#888;margin-top:2px">${src.company}</div>
          <div style="font-size:11px;color:#888">${src.comuna} · ${src.region}</div>
          <div style="font-size:11px;color:#888;margin-bottom:6px">${src.sector}</div>
          <hr>
          <div style="font-size:11px;color:#aaa">
            Combustible: ${src.comb1 || "No informado"}${src.comb2 ? " / " + src.comb2 : ""}
          </div>
          <hr>
          ${top.map(([k, v]) => `
            <div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:2px 0">
              <span>${k}</span><span>${v.toExponential(2)}</span>
            </div>
          `).join("")}
          <div style="margin-top:8px;font-size:10px;color:#777;line-height:1.3">
            Emisiones RETC reportadas.<br>
            Las unidades pueden variar según tipo de fuente y combustible.
          </div>
        `);

        ctx.sourceLayer.addLayer(marker);
      });
    } catch (err) {
      console.error("fuentes:", err);
    }
  }

  loadSources();

  return { loadSources };
}
