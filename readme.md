🌫️ Dashboard Calidad del Aire Chile (SINCA)

Dashboard interactivo en tiempo real para visualizar contaminantes atmosféricos en Chile, utilizando datos del sistema SINCA. Incluye mapa, filtros por contaminante, ranking de estaciones y alertas automáticas.

https://peterslapbass.github.io/mapa-sinca/

⸻

🚀 Características

* 🗺️ Mapa interactivo con Leaflet
* 🌫️ Visualización de contaminantes:
    * MP 2.5
    * MP 10
    * NO₂
    * CO
    * O₃
* 🎛️ Filtros por contaminante o vista general
* 📊 Ranking de estaciones con peor calidad del aire
* ⚠️ Sistema de alertas automáticas
* 🧠 Unidades normalizadas automáticamente
* ⏱️ Datos en tiempo real (refresh automático)

⸻

🧱 Tecnologías

* HTML5
* CSS3
* JavaScript (Vanilla)
* Leaflet.js￼
* Datos SINCA (JSON local)

⸻

📁 Estructura del proyecto

/project
│
├── index.html
├── app.js
├── datos_sinca.json
└── README.md

⸻

⚙️ Cómo funciona

1. El sistema carga datos desde datos_sinca.json
2. Normaliza nombres de contaminantes
3. Agrupa datos por estación
4. Clasifica contaminantes:
    * MP-2.5
    * MP-10
    * NO₂
    * CO
    * O₃
5. Renderiza:
    * Marcadores en mapa
    * Ranking lateral
    * Alertas críticas

⸻

🧠 Lógica de datos

Cada estación se estructura así:

STATIONS = {
  "Puente Alto": {
    lat: -33.5,
    lon: -70.6,
    values: {
      "MP-2,5": { value: 21, time: "2026-04-17 12:21" },
      "NO2": { value: 18, time: "2026-04-17 12:21" }
    }
  }
}

⸻

🎨 Clasificación de colores

Valor	Estado	Color
0–25	Bueno	🟢 Verde
26–50	Regular	🟡 Amarillo
51–100	Moderado	🟠 Naranjo
101–150	Malo	🔴 Rojo
150+	Crítico	🟣 Morado

⸻

🔄 Actualización de datos

Los datos se refrescan automáticamente cada:

300000 ms (5 minutos)

⸻

⚠️ Alertas

Se generan alertas cuando un contaminante supera:

> 100

⸻

🧩 Filtros

* ALL → muestra todos los contaminantes
* MP-2,5
* MP-10
* NO2
* CO
* O3

⸻

📌 Notas técnicas

* Se utiliza normalización de texto para manejar acentos y HTML entities
* Los contaminantes se detectan por matching flexible (ej: “pm25”, “mp-2,5”)
* Los valores se extraen automáticamente desde estructuras variables del SINCA
* El sistema prioriza robustez sobre formato estricto de datos

⸻

📷 Preview

(puedes agregar screenshot aquí)

⸻

🚀 Futuras mejoras

* 📈 Gráficos de evolución temporal (ACTUALIZADO 19-04-2026)
* 🧠 ICA Chile (índice de calidad del aire)
* 📍 Clustering de estaciones (ACTUALIZADO 19-04-2026, SEGÚN ÍNDICE)
* 📱 Versión mobile tipo app (ACTUALIZADO 19-04-2026)
* 🔔 Alertas avanzadas por norma sanitaria

⸻

👤 Autor

Proyecto de visualización ambiental basado en datos SINCA, creado por Pedro Rubio por vibecoding.
Desarrollado con enfoque en análisis de datos y visualización geográfica.

⸻
