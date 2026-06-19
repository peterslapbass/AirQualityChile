import json
import sys

try:
    with open("datos_meteo_raw.json") as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f" Error al leer datos_meteo_raw.json: {e}")
    sys.exit(1)

stations_raw = data if isinstance(data, list) else data.get("data", [])

if not isinstance(stations_raw, list):
    print(" Error: formato inesperado en datos_meteo_raw.json")
    sys.exit(1)

stations = []
skipped = 0

for i, s in enumerate(stations_raw):
    try:
        lat = s.get("latitud")
        lon = s.get("longitud")

        if lat is None or lon is None:
            skipped += 1
            continue

        name = s.get("nombre", "").strip()
        if not name:
            name = f"Estación #{i}"

        stations.append({
            "name": name,
            "lat": float(lat),
            "lon": float(lon),
            "wind_speed": float(s.get("velocidad_viento", 0)),
            "wind_dir": float(s.get("direccion_viento", 0)),
            "temp": float(s.get("temperatura", 0)),
            "humidity": float(s.get("humedad", 0)),
            "pressure": float(s.get("presion_absoluta", 0))
        })

    except (ValueError, TypeError) as e:
        skipped += 1
        continue

with open("datos_meteo.json", "w") as f:
    json.dump(stations, f, indent=2)

print(f"Procesadas {len(stations)} estaciones ({skipped} omitidas)")
