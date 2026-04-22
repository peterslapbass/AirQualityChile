import json
import numpy as np
from scipy.interpolate import griddata

# =========================
# CONFIG
# =========================
GRID_SIZE = 50  # puedes subir a 80 después

# =========================
# LOAD DATA
# =========================
with open("datos_meteo.json") as f:
    stations = json.load(f)

points = []
u_vals = []
v_vals = []

for s in stations:
    lat = s["lat"]
    lon = s["lon"]
    speed = s["wind_speed"]
    direction = s["wind_dir"]

    # convertir a radianes
    theta = np.radians(direction + 180)  # corregir dirección

    u = speed * np.cos(theta)
    v = speed * np.sin(theta)

    points.append((lon, lat))
    u_vals.append(u)
    v_vals.append(v)

points = np.array(points)
u_vals = np.array(u_vals)
v_vals = np.array(v_vals)

# =========================
# GRID
# =========================
min_lon, max_lon = points[:,0].min(), points[:,0].max()
min_lat, max_lat = points[:,1].min(), points[:,1].max()

grid_lon, grid_lat = np.meshgrid(
    np.linspace(min_lon, max_lon, GRID_SIZE),
    np.linspace(min_lat, max_lat, GRID_SIZE)
)

# =========================
# INTERPOLATION
# =========================
u_grid = griddata(points, u_vals, (grid_lon, grid_lat), method='linear')
v_grid = griddata(points, v_vals, (grid_lon, grid_lat), method='linear')

# fallback para NaN
u_grid = np.nan_to_num(u_grid)
v_grid = np.nan_to_num(v_grid)

# =========================
# SAVE
# =========================
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

print("✅ wind_field.json generado")