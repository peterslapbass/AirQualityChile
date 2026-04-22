import json

with open("datos_meteo_raw.json") as f:
    data = json.load(f)

# puede venir como lista directa
stations_raw = data if isinstance(data, list) else data.get("data", [])

stations = []

for s in stations_raw:
    try:
        lat = s.get("latitud")
        lon = s.get("longitud")

        if lat is None or lon is None:
            continue

        stations.append({
            "name": s.get("nombre", "N/A"),
            "lat": float(lat),
            "lon": float(lon),
            "wind_speed": float(s.get("velocidad_viento", 0)),
            "wind_dir": float(s.get("direccion_viento", 0)),
            "temp": float(s.get("temperatura", 0)),
            "humidity": float(s.get("humedad", 0)),
            "UV": float(s.get("ultravioleta", 0)),
            "pressure": float(s.get("presion_absoluta": 0)),
            "rain": float(s.get("precipitacion":0))
        })

    except Exception as e:
        continue

with open("datos_meteo.json", "w") as f:
    json.dump(stations, f, indent=2)

print(f"✅ Procesadas {len(stations)} estaciones")
