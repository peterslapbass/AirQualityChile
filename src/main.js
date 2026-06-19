import { createStations } from './stations.js';
import { createWind } from './wind.js';
import { createSources } from './sources.js';
import { createToggles } from './toggles.js';

document.addEventListener("DOMContentLoaded", () => {
  const ctx = {
    map: L.map('map').setView([-33.45, -70.66], 5),
    layer: L.layerGroup(),
    windLayer: L.layerGroup(),
    sourceLayer: L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 }),
    STATIONS: {},
    CURRENT_FILTER: "ALL",
    SEARCH_TERM: "",
    SHOW_AIR: true,
    SHOW_WIND: true,
    SHOW_SOURCES: true,
    windAnimationId: null,
    windField: null
  };

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(ctx.map);

  ctx.map.addLayer(ctx.layer);
  ctx.map.addLayer(ctx.windLayer);
  ctx.map.addLayer(ctx.sourceLayer);

  const stations = createStations(ctx);
  const wind = createWind(ctx);
  const sources = createSources(ctx);
  const toggles = createToggles(ctx, wind);

  stations.load();
  setInterval(() => { if (!document.hidden) stations.load(); }, 300000);

  wind.loadWindData();
  setInterval(() => { if (!document.hidden) wind.loadWindData(); }, 300000);
});
