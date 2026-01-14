// =============================
// 🌐 API BASE (DOMINIO PRODUCCIÓN)
// =============================
const API_URL = "https://api.meetandgouy.com";

// =============================
// 📌 Parámetros
// =============================
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// =============================
// 🖼️ Imagen por categoría
// =============================
function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

// =============================
// 🎟️ Comprar entrada
// =============================
async function payEvent(eventId) {
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Crear ticket
    const ticketRes = await fetch(
      `${API_URL}/api/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser._id || authUser.id
        })
      }
    );

    if (!ticketRes.ok) {
      const text = await ticketRes.text();
      console.error("❌ Error creando ticket:", text);
      alert("Error al generar ticket");
      return;
    }

    const ticketData = await ticketRes.json();

    // Iniciar pago
    const paymentRes = await fetch(
      `${API_URL}/api/payments/create/${ticketData.ticket._id}`,
      { method: "POST" }
    );

    if (!paymentRes.ok) {
      const text = await paymentRes.text();
      console.error("❌ Error iniciando pago:", text);
      alert("Error iniciando el pago");
      return;
    }

    const paymentData = await paymentRes.json();
    window.location.href = paymentData.init_point;

  } catch (error) {
    console.error("❌ Error en payEvent:", error);
    alert("Error al procesar el pago");
  }
}

// =============================
// 📄 Cargar info del evento
// =============================
async function loadEventInfo() {
  if (!eventId) {
    eventDetails.innerHTML = "<p>Evento no válido</p>";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}`);
    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const image =
      event.image && event.image.startsWith("http")
        ? event.image
        : getCategoryImage(event.category);

    const price = Number(event.price) || 0;

    let actionSection = "";

    if (!authUser) {
      actionSection = `
        <div class="alert alert-info mt-4">
          Para participar del evento necesitás iniciar sesión.
        </div>
        <a href="login.html" class="btn btn-primary">
          Iniciar sesión
        </a>
      `;
    } else if (price === 0) {
      actionSection = `
        <div class="alert alert-success mt-4">
          🎉 Este evento es gratuito
        </div>
      `;
    } else {
      actionSection = `
        <div class="mt-4">
          <button class="btn btn-primary w-100 mb-3"
            onclick="payEvent('${event._id}')">
            💳 Comprar entrada · $${price}
          </button>

          <div class="card border-warning">
            <div class="card-body">
              <h6 class="card-title mb-2">⭐ Acceso por suscripción</h6>
              <p class="card-text text-muted" style="font-size:14px">
                Si sos suscriptor, este evento está incluido y no pagás entrada.
              </p>
              <button class="btn btn-outline-warning w-100 btn-sm">
                Ver planes de suscripción
              </button>
            </div>
          </div>
        </div>
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
            <li>💰 Precio: ${price === 0 ? "Gratis" : `$${price}`}</li>
          </ul>

          <hr>
          ${actionSection}
        </div>
      </div>
    `;

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    eventDetails.innerHTML = "<p>Error cargando evento</p>";
  }
}

loadEventInfo();
