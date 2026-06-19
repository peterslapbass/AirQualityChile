export function createToggles(ctx, wind) {
  const btnAir = document.getElementById("toggle-air");
  const btnWind = document.getElementById("toggle-wind");
  const btnSources = document.getElementById("toggle-sources");

  if (btnAir) {
    btnAir.addEventListener("click", () => {
      ctx.SHOW_AIR = !ctx.SHOW_AIR;
      btnAir.classList.toggle("active", ctx.SHOW_AIR);
      btnAir.setAttribute("aria-pressed", ctx.SHOW_AIR);

      if (ctx.SHOW_AIR) ctx.map.addLayer(ctx.layer);
      else ctx.map.removeLayer(ctx.layer);
    });
  }

  if (btnWind) {
    btnWind.addEventListener("click", () => {
      ctx.SHOW_WIND = !ctx.SHOW_WIND;
      btnWind.classList.toggle("active", ctx.SHOW_WIND);
      btnWind.setAttribute("aria-pressed", ctx.SHOW_WIND);

      if (ctx.SHOW_WIND) wind.show();
      else wind.hide();
    });
  }

  if (btnSources) {
    btnSources.addEventListener("click", () => {
      ctx.SHOW_SOURCES = !ctx.SHOW_SOURCES;
      btnSources.classList.toggle("active", ctx.SHOW_SOURCES);
      btnSources.setAttribute("aria-pressed", ctx.SHOW_SOURCES);

      if (ctx.SHOW_SOURCES) ctx.map.addLayer(ctx.sourceLayer);
      else ctx.map.removeLayer(ctx.sourceLayer);
    });
  }

  const btnCblind = document.getElementById("toggle-cblind");
  if (btnCblind) {
    btnCblind.addEventListener("click", () => {
      ctx.COLORBLIND = !ctx.COLORBLIND;
      btnCblind.classList.toggle("active", ctx.COLORBLIND);
      btnCblind.setAttribute("aria-pressed", ctx.COLORBLIND);
      if (ctx._updateColorblind) ctx._updateColorblind();
    });
  }
}
