import requests
import json

url = "https://sinca.mma.gob.cl/index.php/json/listadomapa2k19"

try:
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()

    with open("datos_sinca.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    print("Datos SINCA actualizados correctamente")

except Exception as e:
    print("Error:", e)
    exit(1)
