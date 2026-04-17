document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  fetch("https://api.allorigins.win/raw?url=https://sinca.mma.gob.cl/index.php/json/listadomapa2k19")
    .then(res => res.json())
    .then(data => {

      console.log("DATA:", data); // 👈 clave

      data.forEach(estacion => {
        if (estacion.latitud && estacion.longitud) {
          L.marker([estacion.latitud, estacion.longitud])
            .addTo(map)
            .bindPopup(estacion.nombre);
        }
      });

    })
    .catch(err => console.error("ERROR:", err));
});
