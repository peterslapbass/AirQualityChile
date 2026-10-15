import requests
import json
import sys

url = "https://sinca.mma.gob.cl/index.php/json/listadomapa2k19/"

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://sinca.mma.gob.cl/"
}

try:
    response = requests.get(
        url,
        headers=headers,
        timeout=30
    )

    print("Código HTTP:", response.status_code)

    response.raise_for_status()
    data = response.json()

    with open("datos_sinca.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Datos SINCA actualizados correctamente.")

except requests.exceptions.RequestException as e:
    print(f"Error al consultar SINCA: {e}")
    sys.exit(1)

except ValueError as e:
    print(f"Error al procesar el JSON: {e}")
    sys.exit(1)
