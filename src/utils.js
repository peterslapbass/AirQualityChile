export function normalize(t) {
  if (!t) return "";
  const x = document.createElement("textarea");
  x.innerHTML = t;
  return x.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getValue(r) {
  const raw = r?.tableRow?.value || r?.value || "";
  const cleaned = String(raw).replace(",", ".");
  const m = cleaned.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[0]) : null;
}

export function getPollutant(name) {
  const n = normalize(name);

  if (n.includes("mp-2") || n.includes("pm25") || n.includes("pm2")) return "MP-2,5";
  if (n.includes("mp-10") || n.includes("pm10")) return "MP-10";
  if (n.includes("dioxido de nitrogeno") || n.includes("no2")) return "NO2";
  if (n.includes("dioxido de azufre") || n.includes("so2")) return "SO2";
  if (n.includes("ozono") || n.includes("o3")) return "O3";
  if (n.includes("monoxido de carbono") || n === "co") return "CO";

  return null;
}

export function getUnit(p) {
  if (p === "MP-2,5" || p === "MP-10") return "µg/m³";
  if (p === "NO2" || p === "O3") return "ppbv";
  if (p === "CO") return "ppmv";
  if (p === "SO2") return "µg/m³";
  return "";
}

export function color(v) {
  if (v <= 25) return "green";
  if (v <= 50) return "yellow";
  if (v <= 100) return "orange";
  if (v <= 150) return "red";
  return "purple";
}

export function sourceColor(v) {
  if (v <= 1) return "#66bb6a";
  if (v <= 10) return "#ffa726";
  if (v <= 100) return "#ef5350";
  return "#8e24aa";
}

export function parseSeries(rt) {
  const rows = rt?.info?.rows || [];
  return rows.map(r => ({
    ts: r?.c?.[0]?.v,
    val: r?.c?.[1]?.v
  })).filter(r => r.ts && typeof r.val === "number");
}

const ICA_BP = {
  "MP-2,5": [[0, 0, 50], [12, 51, 100], [35.4, 101, 150], [55.4, 151, 200], [150.4, 201, 300], [250.4, 301, 500]],
  "MP-10":  [[0, 0, 50], [54, 51, 100], [154, 101, 150], [254, 151, 200], [354, 201, 300], [424, 301, 500]],
  "NO2":    [[0, 0, 50], [53, 51, 100], [100, 101, 150], [360, 151, 200], [649, 201, 300], [1249, 301, 500]],
  "CO":     [[0, 0, 50], [4.4, 51, 100], [9.4, 101, 150], [12.4, 151, 200], [15.4, 201, 300], [30.4, 301, 500]],
  "SO2":    [[0, 0, 50], [35, 51, 100], [75, 101, 150], [185, 151, 200], [304, 201, 300], [604, 301, 500]],
  "O3":     [[0, 0, 50], [54, 51, 100], [70, 101, 150], [85, 151, 200], [105, 201, 300], [200, 301, 500]]
};

export function calcICA(pollutant, value) {
  const bp = ICA_BP[pollutant];
  if (!bp || value == null || value < 0) return null;

  for (let i = bp.length - 1; i >= 0; i--) {
    const [concLow, icaLow, icaHigh] = bp[i];
    const concHigh = i < bp.length - 1 ? bp[i + 1][0] : Infinity;
    if (value >= concLow && value <= concHigh) {
      const ica = ((icaHigh - icaLow) / (concHigh - concLow)) * (value - concLow) + icaLow;
      return Math.round(ica);
    }
  }
  return null;
}

export function icaDash(ica) {
  if (ica == null) return "";
  if (ica <= 50)  return "";
  if (ica <= 100) return "4 2";
  if (ica <= 150) return "2 2";
  if (ica <= 200) return "6 2 2 2";
  return "8 2 2 2 2 2";
}

export function calcTrend(values) {
  const valid = values.filter(v => v != null && v > 0);
  if (valid.length < 3) return "stable";
  const recent = valid.slice(-3);
  const prev = valid.slice(-6, -3);
  if (prev.length < 2) return "stable";
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgPrev = prev.reduce((a, b) => a + b, 0) / prev.length;
  const diff = avgRecent - avgPrev;
  if (diff > avgPrev * 0.05) return "up";
  if (diff < -avgPrev * 0.05) return "down";
  return "stable";
}

export function calcPrediction(serie, steps) {
  steps = steps || 3;
  const vals = serie.map(r => r.val).filter(v => v != null && v > 0);
  if (vals.length < 3) return [];
  // simple moving average of last 4 points
  const window = vals.slice(-4);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  // linear trend from last 4
  const n = window.length;
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (window[i] - avg);
    den += (i - xMean) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  const lastTs = serie[serie.length - 1].ts;
  const lastHour = new Date(lastTs.replace(" ", "T")).getTime();
  const predictions = [];
  for (let i = 1; i <= steps; i++) {
    const predVal = avg + slope * (n - 1 + i - xMean);
    if (predVal > 0) {
      predictions.push({
        ts: new Date(lastHour + i * 3600000).toISOString().slice(0, 16),
        val: Math.round(predVal * 10) / 10
      });
    }
  }
  return predictions;
}

export function icaColor(ica) {
  if (ica == null) return "#666";
  if (ica <= 50) return "#00e400";
  if (ica <= 100) return "#ffff00";
  if (ica <= 150) return "#ff7e00";
  if (ica <= 200) return "#ff0000";
  return "#8f3f97";
}

export function icaLabel(ica) {
  if (ica == null) return "";
  if (ica <= 50) return "Buena";
  if (ica <= 100) return "Regular";
  if (ica <= 150) return "Mala";
  if (ica <= 200) return "Muy mala";
  return "Crítica";
}

const RECOMMENDATIONS = {
  general: [
    { maxIca: 50,  text: "Sin restricciones. Disfrute de actividades al aire libre con normalidad." },
    { maxIca: 100, text: "Actividades al aire libre normales. Personas excepcionalmente sensibles deben monitorear síntomas." },
    { maxIca: 150, text: "Reducir actividad física prolongada al aire libre. Tomar pausas frecuentes." },
    { maxIca: 200, text: "Evitar esfuerzo prolongado al aire libre. Preferir actividades en interiores." },
    { maxIca: 500, text: "Evitar toda actividad al aire libre. Permanecer en interiores con puertas y ventanas cerradas." }
  ],
  sensitive: [
    { maxIca: 50,  text: "Sin restricciones." },
    { maxIca: 100, text: "Reducir esfuerzo prolongado al aire libre si presenta síntomas." },
    { maxIca: 150, text: "Evitar actividad física prolongada al aire libre. Mantener medicación a mano." },
    { maxIca: 200, text: "Evitar toda actividad al aire libre. Permanecer en interiores." },
    { maxIca: 500, text: "Permanecer en interiores. Usar mascarilla si debe salir. Mantener medicación." }
  ],
  byPollutant: {
    "MP-2,5": { note: "Material particulado fino. Penetra profundamente en los pulmones.", source: "OMS" },
    "MP-10":  { note: "Material particulado grueso. Afecta vías respiratorias superiores.", source: "OMS" },
    "O3":     { note: "Ozono troposférico. Irrita ojos y garganta, reduce función pulmonar.", source: "EPA" },
    "NO2":    { note: "Dióxido de nitrógeno. Irrita vías respiratorias, agrava asma.", source: "EPA" },
    "CO":     { note: "Monóxido de carbono. Reduce el oxígeno en sangre, afecta sistema cardiovascular.", source: "EPA" },
    "SO2":    { note: "Dióxido de azufre. Irrita ojos y garganta, puede causar sibilancias.", source: "EPA" }
  },
  sources: [
    { name: "Organización Mundial de la Salud (OMS)", url: "https://www.who.int/publications/i/item/9789240034228" },
    { name: "Agencia de Protección Ambiental de EE. UU. (EPA)", url: "https://www.airnow.gov/aqi/aqi-basics/" },
    { name: "Ministerio del Medio Ambiente — SINCA", url: "https://sinca.mma.gob.cl" }
  ]
};

export function getColorblindIcon(ica, size) {
  const c = icaColor(ica);
  const half = size / 2;

  let path;
  if (ica <= 50) {
    path = `<circle cx="${half}" cy="${half}" r="${half * 0.75}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  } else if (ica <= 100) {
    const s = size * 0.7, o = (size - s) / 2;
    path = `<rect x="${o}" y="${o}" width="${s}" height="${s}" rx="2" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  } else if (ica <= 150) {
    const t = half * 0.75;
    path = `<polygon points="${half},${half - t} ${half - t},${half + t * 0.6} ${half + t},${half + t * 0.6}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  } else if (ica <= 200) {
    const d = half * 0.7;
    path = `<polygon points="${half},${half - d} ${half + d},${half} ${half},${half + d} ${half - d},${half}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  } else {
    const r = half * 0.65;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      pts.push(`${half + r * Math.cos(a)},${half + r * Math.sin(a)}`);
    }
    path = `<polygon points="${pts.join(" ")}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  }

  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${path}</svg>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half]
  });
}

export function dominantPollutant(station) {
  const entries = Object.entries(station.values || {});
  if (!entries.length) return null;
  let worst = null;
  let worstVal = -1;
  for (const [key, val] of entries) {
    const ica = val.ica || val.value || 0;
    if (ica > worstVal) { worstVal = ica; worst = key; }
  }
  return worst;
}

export function healthRecommendation(ica, pollutant) {
  if (ica == null) return null;

  const general = RECOMMENDATIONS.general.find(r => ica <= r.maxIca) || RECOMMENDATIONS.general[RECOMMENDATIONS.general.length - 1];
  const sensitive = RECOMMENDATIONS.sensitive.find(r => ica <= r.maxIca) || RECOMMENDATIONS.sensitive[RECOMMENDATIONS.sensitive.length - 1];
  const pollInfo = RECOMMENDATIONS.byPollutant[pollutant] || null;

  return { general: general.text, sensitive: sensitive.text, pollutant: pollInfo, sources: RECOMMENDATIONS.sources };
}
