const API_URL = "https://api.meetandgouy.com";
const carouselContainer = document.getElementById("carouselEvents");

async function loadEventsCarousel() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al cargar eventos");

    const events = await res.json();
    carouselContainer.innerHTML = "";

    if (events.length < 2) return; // no tiene sentido carrusel

    events.forEach((event, index) => {
      const next1 = events[(index + 1) % events.length];
      const next2 = events[(index + 2) % events.length];

      carouselContainer.innerHTML += `
        <div class="carousel-item ${index === 0 ? "active" : ""}">
          <div class="row g-3 justify-content-center">

            ${renderEventCard(event)}
            ${renderEventCard(next1)}
            ${renderEventCard(next2)}

          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error("❌ Error carrusel eventos:", err);
  }
}

function renderEventCard(event) {
  return `
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
  `;
}

loadEventsCarousel();