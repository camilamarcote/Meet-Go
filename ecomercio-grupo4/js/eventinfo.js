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
    const isSubscribed = authUser?.isSubscribed === true;
    const discountedPrice = price * 0.5;

    let actionSection = "";

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
        ${
          isSubscribed
            ? `
              <button class="btn btn-success mt-3"
                onclick="payEvent('${event._id}')">
                ⭐ Comprar como suscriptor ($${discountedPrice})
              </button>
            `
            : `
              <button class="btn btn-primary mt-3"
                onclick="payEvent('${event._id}')">
                💳 Comprar entrada ($${price})
              </button>

              <p class="mt-2 text-muted" style="font-size:14px">
                Suscribite y pagá 50% menos en este evento
              </p>
            `
        }
      `;
    }

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
              ${
                price === 0
                  ? "Incluido en la suscripción"
                  : `
                    <div>
                      <span>$${price}</span><br>
                      <span style="color:green;font-weight:600">
                        ⭐ Suscriptores: $${discountedPrice}
                      </span>
                    </div>
                  `
              }
            </li>
          </ul>

          <hr>
          ${actionSection}
        </div>
      </div>
    `;
  } catch (error) {
    eventDetails.innerHTML = "<p>Error cargando evento</p>";
  }
}

loadEventInfo();
