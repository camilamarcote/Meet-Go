// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://meetgo-backend.onrender.com";

// =============================
// 📌 Obtener ID del evento
// =============================
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// =============================
// 🖼️ Imagen por categoría
// =============================
function getRandomCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

// =============================
// 📌 Cargar evento
// =============================
async function loadEventInfo() {
  try {
    if (!eventId) throw new Error("ID inexistente");

    const res = await fetch(`${API_URL}/events/${eventId}`);
    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const image = event.image?.trim()
      ? `${API_URL}${event.image}`
      : getRandomCategoryImage(event.category);

    const price = Number(event.price) || 0;

    let actionSection = "";

    if (!authUser) {
      actionSection = `
        <p class="text-muted">Iniciá sesión para obtener tu entrada</p>
        <a href="login.html" class="btn btn-outline-primary">Iniciar sesión</a>
      `;
    } else if (price === 0) {
      actionSection = `
        <button class="btn btn-success"
          onclick="getFreeTicket('${event._id}')">
          🎟️ Obtener entrada gratis
        </button>
      `;
    } else {
      actionSection = `
        <button class="btn btn-primary"
          onclick="payEvent('${event._id}')">
          💳 Comprar entrada ($${price})
        </button>
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
          <p class="fw-semibold">
            💰 Precio: ${price === 0 ? "Gratis" : `$${price}`}
          </p>
          <hr>
          ${actionSection}
        </div>
      </div>
    `;

  } catch (err) {
    console.error(err);
    eventDetails.innerHTML =
      `<p class="text-danger">Evento no disponible</p>`;
  }
}

loadEventInfo();

// =============================
// 🎟️ Gratis → mail
// =============================
window.getFreeTicket = async function (eventId) {
  const res = await fetch(
    `${API_URL}/api/events/${eventId}/tickets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id })
    }
  );

  if (res.ok) {
    alert("✅ Entrada enviada por mail");
    location.reload();
  } else {
    alert("Error creando entrada");
  }
};

// =============================
// 💳 Pago → Mercado Pago
// =============================
window.payEvent = async function (eventId) {
  try {
    let ticketId;

    // 1️⃣ Crear ticket
    const ticketRes = await fetch(
      `${API_URL}/api/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id })
      }
    );

    const ticketData = await ticketRes.json();

    if (ticketRes.ok) {
      ticketId = ticketData.ticket._id;
    } else if (ticketRes.status === 409 && ticketData.ticket) {
      ticketId = ticketData.ticket._id;
    } else {
      alert(ticketData.message || "Error creando el ticket");
      return;
    }

    // 2️⃣ Crear pago MP
    const payRes = await fetch(
      `${API_URL}/api/payments/create/${ticketId}`,
      { method: "POST" }
    );

    const payData = await payRes.json();

    if (!payRes.ok || !payData.init_point) {
      alert("Error iniciando el pago");
      return;
    }

    // 3️⃣ Redirigir
    window.location.href = payData.init_point;

  } catch (error) {
    console.error("❌ Error en pago:", error);
    alert("Error iniciando el pago");
  }
};
