import requests
import json

url = "https://redmeteo.cl/publicapi/last-data.json"

try:
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()

    with open("datos_meteo_raw.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print("Datos meteo raw actualizados correctamente")

except Exception as e:
    print("Error:", e)
    exit(1)
