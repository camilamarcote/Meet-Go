const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

/* =============================
   💳 PAGAR EVENTO (SIN REGISTRO)
============================= */
async function payEvent(eventId) {
  try {
    // Mostrar loading en el botón (opcional)
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Procesando...";
    btn.disabled = true;

    // 1. Crear ticket anónimo (backend debe permitir sin token)
    const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // No enviamos userId, el backend debe crearlo anónimo
        guestEmail: null, // Opcional: podrías pedir email al usuario
        guestName: null
      })
    });

    const ticketData = await resTicket.json();

    if (!resTicket.ok) {
      alert(ticketData.message || "Error creando ticket");
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    const ticketId = ticketData.ticket._id;

    // 2. Crear preferencia de pago en Mercado Pago
    const resPayment = await fetch(`${API_URL}/api/payments/create/${ticketId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const paymentData = await resPayment.json();

    if (!resPayment.ok) {
      alert("Error iniciando pago");
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    // 3. Redirigir a Mercado Pago
    window.location.href = paymentData.init_point;

  } catch (error) {
    console.error("❌ Error pago evento:", error);
    alert("No se pudo iniciar el pago");
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  }
}

/* =============================
   📄 EVENTO (USANDO ENDPOINT PÚBLICO)
============================= */
async function loadEventInfo() {
  if (!eventId) {
    eventDetails.innerHTML = "<p class='text-center'>Evento no válido</p>";
    return;
  }

  try {
    eventDetails.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando información del evento...</p>
      </div>
    `;

    const res = await fetch(`${API_URL}/api/events/public/${eventId}`);
    
    if (!res.ok) {
      if (res.status === 404) throw new Error("Evento no encontrado");
      throw new Error(`Error al cargar evento: ${res.status}`);
    }

    const event = await res.json();
    const price = event.price ?? 0;

    // Botón de pago directo (sin condiciones de login)
    const actionSection = `
      <div class="d-grid gap-2 mt-4">
        <button class="btn btn-success btn-lg" onclick="payEvent('${event._id}')">
          🎟️ Pagar ahora - ${price === 0 ? 'Gratis' : `$${price}`}
        </button>
        <small class="text-muted text-center">No necesitas registrarte. Pago seguro con Mercado Pago.</small>
      </div>
    `;

    eventDetails.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="position-relative">
            <img 
              src="${event.image || "img/default_event.jpg"}" 
              class="img-fluid rounded shadow-sm" 
              alt="${event.name}"
              style="width: 100%; height: 700px; object-fit: cover;"
              onerror="this.src='img/default_event.jpg'"
            >
            ${price === 0 ? 
              '<span class="badge bg-success position-absolute top-0 end-0 m-2">Gratis</span>' : 
              `<span class="badge bg-primary position-absolute top-0 end-0 m-2">$${price}</span>`
            }
          </div>
        </div>

        <div class="col-md-6">
          <h2 class="mb-3">${escapeHtml(event.name)}</h2>
          
          ${event.description ? `
            <div class="mb-4">
              <h5>📝 Descripción</h5>
              <p class="text-muted">${escapeHtml(event.description)}</p>
            </div>
          ` : ''}

          <div class="event-info mb-4">
            <h5>📍 Detalles del evento</h5>
            <ul class="list-unstyled">
              ${event.category ? `<li class="mb-2"><strong>🎯 Categoría:</strong> ${escapeHtml(event.category)}</li>` : ''}
              ${event.department ? `<li class="mb-2"><strong>📍 Ubicación:</strong> ${escapeHtml(event.department)}</li>` : ''}
              <li class="mb-2"><strong>📅 Fecha:</strong> ${event.date}</li>
              ${event.time ? `<li class="mb-2"><strong>⏰ Hora:</strong> ${event.time}</li>` : ''}
              ${event.groupMembersCount ? `<li class="mb-2"><strong>👥 Cupo:</strong> ${event.groupMembersCount} personas</li>` : ''}
            </ul>
          </div>

          <hr>
          ${actionSection}
        </div>
      </div>
    `;

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    eventDetails.innerHTML = `
      <div class="text-center py-5">
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i>
          <p class="mb-0">${error.message === "Evento no encontrado" ? "El evento que buscas no existe" : "Error al cargar la información del evento"}</p>
          <a href="explorar.html" class="btn btn-primary mt-3">← Volver a explorar eventos</a>
        </div>
      </div>
    `;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  loadEventInfo();
});