const API_URL = "https://api.meetandgouy.com";
const carouselContainer = document.getElementById("carouselEvents");

// ============================
// 🎠 CARGAR EVENTOS PÚBLICOS
// ============================
async function loadEventsCarousel() {
  try {
    const res = await fetch(`${API_URL}/api/public/events`);

    if (!res.ok) {
      throw new Error("Error al cargar eventos públicos");
    }

    const events = await res.json();
    carouselContainer.innerHTML = "";

    if (events.length < 3) return;

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

// ============================
// 🧱 CARD EVENTO (CLICK → EXPLORAR)
// ============================
function renderEventCard(event) {
  return `
    <div class="col-10 col-md-6 col-lg-4">
      <a 
        href="explorar.html?eventId=${event._id}"
        class="text-decoration-none text-dark"
      >
        <div class="event-card h-100">
          <img 
            src="${event.image || "img/default_event.jpg"}"
            alt="${event.name}"
          >
          <div class="event-card-body">
            <h6>${event.name}</h6>
            <p>${event.date || ""}</p>
          </div>
        </div>
      </a>
    </div>
  `;
}

loadEventsCarousel();