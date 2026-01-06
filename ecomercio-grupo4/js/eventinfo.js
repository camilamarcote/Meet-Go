const API_URL = "https://meetgo-backend.onrender.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

/* =============================
   🖼️ Imagen por categoría
============================= */
function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

/* =============================
   🎟️ Comprar entrada
============================= */
async function payEvent(eventId) {
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  try {
    // 1️⃣ Crear ticket
    const ticketRes = await fetch(
      `${API_URL}/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // ⚠️ Ajustá si tu user usa _id en vez de id
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

    // 2️⃣ Crear pago Mercado Pago
    const paymentRes = await fetch(
      `${API_URL}/api/payments/create/${ticketData.ticket._id}`
    );

    if (!paymentRes.ok) {
      const text = await paymentRes.text();
      console.error("❌ Error iniciando pago:", text);
      alert("Error iniciando el pago");
      return;
    }

    const paymentData = await paymentRes.json();

    // 3️⃣ Redirigir a Mercado Pago
    window.location.href = paymentData.init_point;

  } catch (error) {
    console.error("❌ Error en payEvent:", error);
    alert("Error al procesar el pago");
  }
}

/* =============================
   📄 Cargar info del evento
============================= */
async function loadEventInfo() {
  try {
    const res = await fetch(`${API_URL}/events/${eventId}`);

    if (!res.ok) {
      throw new Error("Evento no encontrado");
    }

    const event = await res.json();

    const image = event.image
      ? `${API_URL}${event.image}`
      : getCategoryImage(event.category);

    const price = Number(event.price) || 0;

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
        <span class="badge bg-success mt-3">
          🎉 Evento gratuito
        </span>
      `;
    } else {
      actionSection = `
        <button class="btn btn-primary mt-3"
          onclick="payEvent('${event._id}')">
          💳 Comprar entrada ($${price})
        </button>

        <button class="btn btn-outline-warning btn-sm ms-3 mt-3">
          Suscribite
        </button>

        <p class="text-muted mt-2" style="font-size:14px">
          ⭐ Si sos suscriptor, no pagás este evento
        </p>
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
