const API_URL = "https://meetgo-backend.onrender.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

async function loadEventInfo() {
  try {
    const res = await fetch(`${API_URL}/events/${eventId}`);
    const event = await res.json();

    const image = event.image
      ? `${API_URL}${event.image}`
      : getCategoryImage(event.category);

    const price = Number(event.price) || 0;

    let actionSection = "";

    // =============================
    // ACCIONES
    // =============================
    if (!authUser) {
      actionSection = `
        <div class="alert alert-info mt-3">
          Para unirte al evento necesitás iniciar sesión.
        </div>
        <a href="login.html" class="btn btn-outline-primary mt-2">
          Iniciar sesión
        </a>
      `;
    } else if (price === 0) {
      actionSection = `
        <button class="btn btn-success mt-3"
          onclick="getFreeTicket('${event._id}')">
          🎟️ Obtener entrada
        </button>
      `;
    } else {
      actionSection = `
        <button class="btn btn-primary mt-3"
          onclick="payEvent('${event._id}')">
          💳 Comprar entrada ($${price})
        </button>

        <div class="alert alert-warning mt-3" style="font-size:14px">
          ⭐ Si sos suscriptor, no pagás los eventos.
        </div>

        <button class="btn btn-outline-warning btn-sm">
          Suscribite
        </button>
      `;
    }

    // =============================
    // RENDER
    // =============================
    eventDetails.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <img src="${image}" class="img-fluid rounded">
        </div>

        <div class="col-md-6">
          <h2>${event.name}</h2>
          <p>${event.description || ""}</p>

          <ul class="list-unstyled mt-3">
            <li>📍 ${event.department || "A confirmar"}</li>
            <li>📅 ${event.date}</li>
            <li>⏰ ${event.time}</li>
            <li>🎯 ${event.category}</li>
            <li>
              💰 Precio:
              ${price === 0 ? "Evento gratuito" : `$${price}`}
            </li>
          </ul>

          <hr>
          ${actionSection}
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    eventDetails.innerHTML = "<p>Error cargando evento</p>";
  }
}

loadEventInfo();
