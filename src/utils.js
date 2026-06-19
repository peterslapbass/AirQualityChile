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
