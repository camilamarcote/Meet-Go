const API_URL = "https://api.meetandgouy.com";
const carouselInner = document.getElementById("eventsCarouselInner");

async function loadEventsCarousel() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al cargar eventos");

    const events = await res.json();
    carouselInner.innerHTML = "";

    // Igual que explorar.js: recorremos eventos
    events.forEach((event, index) => {
      if (!event.image) return; // solo eventos con imagen

      carouselInner.innerHTML += `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
          <img
            src="${event.image}"
            class="d-block w-100"
            alt="${event.name}"
          >
          <div class="carousel-caption d-none d-md-block">
            <h5>${event.name}</h5>
            <p>${event.category || ""} · ${event.department || ""}</p>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error("❌ Error cargando carrusel:", error);
  }
}

loadEventsCarousel();