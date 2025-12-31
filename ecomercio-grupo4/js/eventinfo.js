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

// Usuario autenticado
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
// 📌 Cargar info del evento
// =============================
async function loadEventInfo() {
  try {
    if (!eventId) throw new Error("ID inexistente");

    const res = await fetch(`${API_URL}/events/${eventId}`);
    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const image = event.image
      ? `${API_URL}${event.image}`
      : getCategoryImage(event.category);

    const price = Number(event.price) || 0;

    // =============================
    // 🔒 ACCIONES SEGÚN LOGIN
    // =============================
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
        <button class="btn btn-primary mt-3"
          onclick="payEvent('${event._id}')">
          💳 Comprar entrada ($${price})
        </button>
      `;
    }

    // =============================
    // 🧩 RENDER
    // =============================
    eventDetails.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <img src="${image}" class="img-fluid rounded" alt="Evento">
        </div>

        <div class="col-md-6">
          <h2>${event.name}</h2>
          <p>${event.description || ""}</p>

          <ul class="list-unstyled mt-3">
            <li>📍 <strong>Ubicación:</strong> ${event.department || "A confirmar"}</li>
            <li>📅 <strong>Fecha:</strong> ${event.date}</li>
            <li>⏰ <strong>Hora:</strong> ${event.time}</li>
            <li>🎯 <strong>Tipo:</strong> ${event.category}</li>
            ${event.ageRange ? `<li>👥 <strong>Edad:</strong> ${event.ageRange}</li>` : ""}
            ${event.capacity ? `<li>🎟️ <strong>Cupos:</strong> ${event.capacity}</li>` : ""}
            <li>💰 <strong>Precio:</strong> ${price === 0 ? "Incluido en la suscripción" : `$${price}`}</li>
          </ul>

          <hr>

          ${actionSection}

          <p class="text-muted mt-3" style="font-size:14px">
            El grupo de WhatsApp se habilita luego de obtener tu entrada.
          </p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    eventDetails.innerHTML =
      `<p class="text-danger">Evento no disponible</p>`;
  }
}

loadEventInfo();

// =============================
// 🎟️ ENTRADA GRATIS
// =============================
window.getFreeTicket = async function (eventId) {
  try {
    const res = await fetch(
      `${API_URL}/api/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id })
      }
    );

    if (res.ok) {
      alert("✅ Tu entrada fue enviada por mail");
      location.reload();
    } else {
      const data = await res.json();
      alert(data.message || "Error creando la entrada");
    }

  } catch (err) {
    console.error(err);
    alert("Error creando la entrada");
  }
};

// =============================
// 💳 PAGO → MERCADO PAGO
// =============================
window.payEvent = async function (eventId) {
  try {
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

    if (!ticketRes.ok) {
      alert(ticketData.message || "Error creando el ticket");
      return;
    }

    const ticketId = ticketData.ticket._id;

    // 2️⃣ Crear pago
    const payRes = await fetch(
      `${API_URL}/api/payments/create/${ticketId}`,
      { method: "POST" }
    );

    const payData = await payRes.json();

    if (!payRes.ok || !payData.init_point) {
      alert("Error iniciando el pago");
      return;
    }

    // 3️⃣ Redirigir a MP
    window.location.href = payData.init_point;

  } catch (error) {
    console.error("❌ Error en pago:", error);
    alert("Error iniciando el pago");
  }
};
