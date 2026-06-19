import json
import sys
import numpy as np
from scipy.interpolate import griddata

GRID_SIZE = 50

try:
    with open("datos_meteo.json") as f:
        stations = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"Error al leer datos_meteo.json: {e}")
    sys.exit(1)

if len(stations) < 3:
    print(f"Error: solo {len(stations)} estaciones, se necesitan al menos 3")
    sys.exit(1)

points = []
u_vals = []
v_vals = []
skipped = 0

for s in stations:
    lat = s.get("lat")
    lon = s.get("lon")
    speed = s.get("wind_speed", 0)
    direction = s.get("wind_dir", 0)

    if lat is None or lon is None:
        skipped += 1
        continue

    theta = np.radians(direction + 180)

    u = speed * np.cos(theta)
    v = speed * np.sin(theta)

    points.append((lon, lat))
    u_vals.append(u)
    v_vals.append(v)

points = np.array(points)
u_vals = np.array(u_vals)
v_vals = np.array(v_vals)

min_lon, max_lon = points[:, 0].min(), points[:, 0].max()
min_lat, max_lat = points[:, 1].min(), points[:, 1].max()

grid_lon, grid_lat = np.meshgrid(
    np.linspace(min_lon, max_lon, GRID_SIZE),
    np.linspace(min_lat, max_lat, GRID_SIZE)
)

u_grid = griddata(points, u_vals, (grid_lon, grid_lat), method='linear')
v_grid = griddata(points, v_vals, (grid_lon, grid_lat), method='linear')

u_grid = np.nan_to_num(u_grid, nan=0.0, posinf=0.0, neginf=0.0)
v_grid = np.nan_to_num(v_grid, nan=0.0, posinf=0.0, neginf=0.0)

output = {
    "grid_size": GRID_SIZE,
    "bounds": {
        "min_lat": float(min_lat),
        "max_lat": float(max_lat),
        "min_lon": float(min_lon),
        "max_lon": float(max_lon)
    },
    "u": u_grid.tolist(),
    "v": v_grid.tolist()
}

with open("wind_field.json", "w") as f:
    json.dump(output, f)

print(f"wind_field.json generado ({len(stations)} estaciones, {skipped} omitidas)")