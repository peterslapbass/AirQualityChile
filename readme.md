# Dashboard Calidad del Aire Chile (SINCA + RedMeteo)

Dashboard interactivo en tiempo real para visualizar calidad del aire, condiciones meteorológicas y fuentes emisoras en Chile.

Integra datos del sistema **SINCA** (MMA), **RedMeteo** y **RETC 2024**, procesados automáticamente mediante **GitHub Actions**.

https://peterslapbass.github.io/AirQualityChile/

---

## Características

### Visualización geoespacial
- Mapa interactivo con Leaflet + CartoDB
- Clustering geográfico de estaciones SINCA y fuentes RETC
- 3 capas activables: Aire, Viento, Fuentes

### Calidad del aire
- MP 2.5, MP 10, NO₂, CO, O₃, SO₂
- Índice ICA Chile (breakpoints EPA adaptados)
- Radio dinámico de marcadores según ICA
- Colores por categoría: Buena / Regular / Mala / Muy mala / Crítica

### Meteorología
- Velocidad y dirección del viento
- Temperatura, humedad, presión atmosférica
- Campo de viento interpolado (grid 50×50 con SciPy)
- Partículas animadas sobre el mapa

### Fuentes RETC 2024
- Marcadores clusterizados con escala logarítmica
- Popups con empresa, combustible y top 5 contaminantes

### Ranking y alertas
- Top 10 estaciones por peor valor/ICA
- Indicador de tendencia (↑ subiendo / ↓ bajando / → estable)
- Tooltip con detalles al hover
- Alertas configurables por umbral ICA
- Detección de datos desactualizados (>1h)
- Filtro por nombre, región o comuna con autocomplete

### Panel de series
- Chart.js con línea horaria
- Pestañas por contaminante
- Estadísticas: Actual, Máx, Prom, ICA
- Proyección 3h (media móvil con tendencia lineal)
- Recomendaciones de salud por ICA + contaminante (OMS/EPA)
- Descarga CSV

### PWA y mobile
- Service Worker con cache-first (assets) y network-first (datos)
- Manifest para instalación como app
- Bottom sheets con swipe-to-dismiss
- Safe area insets para iOS
- Loading spinner inicial
- Toast al actualizar datos

### Accesibilidad
- aria-label, aria-pressed, aria-hidden en todos los elementos interactivos
- Navegación por teclado (Enter/Space) en ranking
- Modo daltónico: formas geométricas SVG por categoría ICA
  - Buena → ● círculo
  - Regular → ▣ cuadrado
  - Mala → ▲ triángulo
  - Muy mala → ◆ diamante
  - Crítica → ⬠ pentágono
- Modal informativo con explicación de cálculos y accesibilidad

---

## Arquitectura del sistema

```
EXTRACT
├── SINCA API → fetch_sinca.py
└── RedMeteo API → fetch_meteo.py

TRANSFORM
├── process_meteo.py → normalización de datos
└── Normalización de contaminantes (MP-2,5, PM25 → MP-2,5)

LOAD / COMPUTE
├── generate_wind_field.py → interpolación SciPy
└── datos_sinca.json, datos_meteo.json, wind_field.json

FRONTEND (ES modules, sin bundler)
└── src/
    ├── main.js      → entry point, ctx, loops
    ├── stations.js  → SINCA, ranking, alertas, chart
    ├── wind.js      → flechas + partículas animadas
    ├── sources.js   → RETC con markercluster
    ├── toggles.js   → capas + modo daltónico
    └── utils.js     → ICA, trend, predicción, recomendaciones
```

## Clasificación ICA Chile

| ICA | MP2.5 (µg/m³) | Categoría | Color |
|-----|---------------|-----------|-------|
| 0–50 | 0–12 | Buena | 🟢 |
| 51–100 | 12–35 | Regular | 🟡 |
| 101–150 | 35–55 | Mala | 🟠 |
| 151–200 | 55–150 | Muy mala | 🔴 |
| 201–500 | 150+ | Crítica | 🟣 |

## Actualización de datos

- Cada 15 minutos vía GitHub Actions (workflow automático)
- Frontend refresca cada 5 minutos si la pestaña está visible
- Sin intervención manual

## Tecnologías

- **Frontend:** HTML + CSS + JS (ES modules, sin bundler)
- **Mapa:** Leaflet + Leaflet.markercluster
- **Gráficos:** Chart.js 4
- **Backend:** Python 3.9 (pipeline ETL)
- **CI/CD:** GitHub Actions (c/15 min)
- **PWA:** Service Worker + Manifest

## Autor

Proyecto de visualización ambiental basado en datos SINCA, RedMeteo y RETC de Chile, desarrollado por Pedro Rubio.
Enfoque: procesamiento de datos ambientales, visualización geoespacial, automatización con GitHub Actions.

## Agradecimientos

- Red Meteorológica Aficionada de Chile (RedMeteo) — https://www.redmeteo.cl
- SINCA, Ministerio de Medio Ambiente, Gobierno de Chile — https://sinca.mma.gob.cl
- RETC, Registro de Emisiones y Transferencia de Contaminantes — https://datosretc.mma.gob.cl
