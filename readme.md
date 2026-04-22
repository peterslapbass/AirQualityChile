🌫️ Dashboard Calidad del Aire Chile (SINCA + Meteo)

Dashboard interactivo en tiempo real para visualizar calidad del aire y condiciones meteorológicas en Chile, integrando datos del sistema SINCA y estaciones meteorológicas procesadas automáticamente mediante GitHub Actions.

🚀 Características

🗺️ Mapa interactivo con Leaflet
🌫️ Visualización de contaminantes atmosféricos:

MP 2.5
MP 10
NO₂
CO
O₃

🌬️ Integración meteorológica:

Velocidad del viento
Dirección del viento
Temperatura
Humedad
Presión

🧭 Campo de viento interpolado (wind field grid)

📊 Ranking de estaciones con peor calidad del aire
⚠️ Sistema de alertas automáticas por umbral crítico
🎛️ Filtros por contaminante y vista general
🧠 Normalización automática de datos heterogéneos
⏱️ Actualización automática cada 30 minutos

🧱 Arquitectura del sistema

El proyecto funciona como un pipeline automático de datos:

🔄 ETL automático (GitHub Actions)
Extract
SINCA API
Red Meteo API
Transform
process_meteo.py
Normalización de estaciones meteorológicas
Load / Compute
generate_wind_field.py
Interpolación de campo de viento (grid)

📁 Estructura del proyecto
/project
│
├── index.html
├── app.js
│
├── process_meteo.py
├── generate_wind_field.py
│
├── datos_sinca.json
├── datos_meteo_raw.json
├── datos_meteo.json
├── wind_field.json
│
└── .github/workflows/update.yml

⚙️ Cómo funciona
🌫️ Datos SINCA
Se descargan automáticamente desde API oficial
Se almacenan en datos_sinca.json
🌬️ Datos meteorológicos
Se obtienen desde Red Meteo
Se procesan y normalizan en datos_meteo.json
🧭 Campo de viento
Se convierten velocidades y direcciones a vectores (u, v)
Se interpola una grilla espacial con scipy
Resultado: wind_field.json

🧠 Modelo de datos
Estaciones meteorológicas

{
  "name": "Estación X",
  "lat": -33.45,
  "lon": -70.66,
  "wind_speed": 4.2,
  "wind_dir": 180,
  "temp": 18.5,
  "humidity": 55
}

Campo de viento interpolado

{
  "grid_size": 50,
  "bounds": {
    "min_lat": -34.0,
    "max_lat": -32.0,
    "min_lon": -71.5,
    "max_lon": -69.5
  },
  "u": [[...]],
  "v": [[...]]
}

🎨 Clasificación de calidad del aire
Valor	Estado	Color
0–25	Bueno	🟢 Verde
26–50	Regular	🟡 Amarillo
51–100	Moderado	🟠 Naranjo
101–150	Malo	🔴 Rojo
150+	Crítico	🟣 Morado

🔄 Actualización de datos
Cada 30 minutos
Ejecutado vía GitHub Actions
Sin intervención manual

🧩 Funcionalidades del mapa

🗺️ Marcadores dinámicos por estación
🌫️ Capas de contaminantes
🌬️ Visualización de viento (vector field)
📊 Panel lateral de ranking
📱 Adaptación mobile

📌 Notas técnicas
Normalización de nombres de contaminantes (MP-2.5, PM25, etc.)
Manejo de datasets inconsistentes del SINCA
Interpolación espacial con scipy.griddata
Separación clara entre extracción y transformación de datos
Pipeline automatizado sin intervención manual

🚀 Futuras mejoras
📈 Gráficos de series temporales por estación
🧠 Índice de Calidad del Aire (ICA Chile)
📍 Clustering geográfico de estaciones
🌪️ Predicción simple de viento (modelos básicos)
📱 Versión PWA (instalable como app)
🔔 Alertas personalizadas por usuario


👤 Autor

Proyecto de visualización ambiental basado en datos SINCA y meteorología de Chile, desarrollado por Pedro Rubio.

Enfoque en:

procesamiento de datos ambientales
visualización geoespacial
automatización con GitHub Actions
enfoque “vibecoding” + data engineering ligero
Gracias a:

-Red Meteorológica Aficionada de Chile. (2019). Sitio web RedMeteo. Red Ciudadana De Estaciones Meteorológicas. Desde 22-04-2026, https://www.redmeteo.cl/

-SINCA. Sistema de Información Nacional de Calidad del Aire, Ministerio de Medio Ambiente, Gobierno de Chile. Desde  22-04-2026, https://sinca.mma.gob.cl 


