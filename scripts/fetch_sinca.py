import requests 
import json 
import sys

url = "https://sinca.mma.gob.cl/index.php/json/listadomapa2k19"

headers = { "User-Agent": ( "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " "AppleWebKit/537.36 (KHTML, like Gecko) " "Chrome/131.0.0.0 Safari/537.36" ), "Accept": "application/json, text/plain, /", "Referer": "https://sinca.mma.gob.cl/", }

try: response = requests.get( url, headers=headers, timeout=30, )

if response.status_code == 403: print("Error: SINCA rechazó la solicitud (HTTP 403).") print("Respuesta:", response.text[:500]) sys.exit(1)

response.raiseforstatus() data = response.json()

with open("datossinca.json", "w", encoding="utf-8") as f: json.dump(data, f, ensureascii=False, indent=2)

print("Datos SINCA actualizados correctamente.")

except requests.exceptions.Timeout: print("Error: tiempo de espera agotado al conectar con SINCA.") sys.exit(1)

except requests.exceptions.RequestException as e: print(f"Error de conexión con SINCA: {e}") sys.exit(1)

except ValueError as e: print(f"Error: SINCA no devolvió JSON válido: {e}") sys.exit(1)
