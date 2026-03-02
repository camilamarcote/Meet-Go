const API_URL = "https://api.meetandgouy.com";

// ============================
// ⭐ OCULTAR BANNER SI ESTÁ SUSCRIPTO
// ============================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const subscriptionBanner = document.getElementById("subscription-banner");

const isSubscribed = currentUser?.subscription?.isActive === true;

if (subscriptionBanner && isSubscribed) {
  subscriptionBanner.style.display = "none";
}

// ============================
// 📅 CARGAR EVENTOS
// ============================
const eventsContainer = document.getElementById("eventsContainer");

async function loadEvents() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al cargar eventos");

    const events = await res.json();
    eventsContainer.innerHTML = "";

    events.forEach(event => {
      eventsContainer.innerHTML += `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 shadow-sm">

            <img 
              src="${event.image || "img/default_event.jpg"}" 
              class="card-img-top"
              alt="${event.name}"
            >

            <div class="card-body d-flex flex-column">
              <h5 class="mb-2">${event.name}</h5>

              <p class="mb-1 text-muted">
                <i class="fa-solid fa-tag me-2"></i>
                ${event.category || ""}
              </p>

              <p class="mb-2 text-muted">
                <i class="fa-solid fa-location-dot me-2"></i>
                ${event.department || ""}
              </p>

              <p class="mb-1 text-muted">
                <i class="fa-solid fa-calendar-days me-2"></i>
                ${event.date || ""}
              </p>

              <p class="mb-3 text-muted">
                <i class="fa-solid fa-clock me-2"></i>
                ${event.time || ""}
              </p>

              <a 
                href="eventinfo.html?id=${event._id}" 
                class="btn btn-primary btn-sm mt-auto"
              >
                Ver evento
              </a>
            </div>

          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error("❌ Error cargando eventos:", err);
    eventsContainer.innerHTML = `
      <p class="text-center text-danger">
        Ocurrió un error al cargar los eventos.
      </p>
    `;
  }
}

loadEvents();