import { createStations } from './stations.js';
import { createWind } from './wind.js';
import { createSources } from './sources.js';
import { createToggles } from './toggles.js';

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("visible"), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const ctx = {
    map: L.map('map').setView([-33.45, -70.66], 5),
    layer: L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 }),
    windLayer: L.layerGroup(),
    sourceLayer: L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 }),
    STATIONS: {},
    CURRENT_FILTER: "ALL",
    SEARCH_TERM: "",
    SHOW_AIR: true,
    SHOW_WIND: true,
    SHOW_SOURCES: true,
    COLORBLIND: false,
    windAnimationId: null,
    windField: null
  };

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(ctx.map);

  ctx.map.addLayer(ctx.layer);
  ctx.map.addLayer(ctx.windLayer);
  ctx.map.addLayer(ctx.sourceLayer);

  const loading = document.getElementById("loading");
  if (loading) loading.classList.remove("hidden");

  const stations = createStations(ctx);
  ctx._stationsRender = stations.render;
  ctx._updateColorblind = stations.updateColorblind;
  const wind = createWind(ctx);
  const sources = createSources(ctx);
  const toggles = createToggles(ctx, wind);

  stations.load().then(() => {
    if (loading) loading.classList.add("hidden");
    showToast("Datos actualizados");
  }).catch(() => {
    if (loading) loading.classList.add("hidden");
  });

  setInterval(() => {
    if (!document.hidden) {
      stations.load().then(() => showToast("Datos actualizados")).catch(() => {});
    }
  }, 300000);

  wind.loadWindData();
  setInterval(() => { if (!document.hidden) wind.loadWindData(); }, 300000);

  window.showToast = showToast;
});
