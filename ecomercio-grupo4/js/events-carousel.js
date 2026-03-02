const API_URL = "https://api.meetandgouy.com";
const carouselContainer = document.getElementById("carouselEvents");

async function loadEventsCarousel() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al cargar eventos");

    const events = await res.json();
    carouselContainer.innerHTML = "";

    // Agrupar eventos de a 3
    for (let i = 0; i < events.length; i += 3) {
      const group = events.slice(i, i + 3);

      carouselContainer.innerHTML += `
        <div class="carousel-item ${i === 0 ? "active" : ""}">
          <div class="row g-3 justify-content-center">
            ${group.map(event => `
              <div class="col-10 col-md-6 col-lg-4">
                <div class="event-card">
                  <img 
                    src="${event.image || "img/default_event.jpg"}" 
                    alt="${event.name}"
                  >
                  <div class="event-card-body">
                    <h6>${event.name}</h6>
                    <p>${event.date || ""}</p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

  } catch (err) {
    console.error("❌ Error carrusel eventos:", err);
  }
}

loadEventsCarousel();