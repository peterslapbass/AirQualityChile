document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([-33.45, -70.66], 5);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }).addTo(map);

  // 🔥 PRUEBA: marcador manual
  L.marker([-33.45, -70.66])
    .addTo(map)
    .bindPopup("Funciona!")
    .openPopup();

});
