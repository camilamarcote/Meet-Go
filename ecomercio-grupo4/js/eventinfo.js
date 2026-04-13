const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const token = localStorage.getItem("token");

/* =============================
   👤 USUARIO ACTUAL
============================= */
async function loadCurrentUser() {
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) return null;

    const user = await res.json();
    return user;

  } catch (err) {
    console.error("❌ Error cargando usuario:", err);
    return null;
  }
}

/* =============================
   💳 PAGAR EVENTO
============================= */
async function payEvent(eventId) {
  try {
    const currentUser = await loadCurrentUser();

    if (!currentUser) {
      alert("Debes iniciar sesión");
      window.location.href = "login.html";
      return;
    }

    const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: currentUser._id
      })
    });

    const ticketData = await resTicket.json();

    if (!resTicket.ok) {
      alert(ticketData.message || "Error creando ticket");
      return;
    }

    const ticketId = ticketData.ticket._id;

    const resPayment = await fetch(`${API_URL}/api/payments/create/${ticketId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const paymentData = await resPayment.json();

    if (!resPayment.ok) {
      alert("Error iniciando pago");
      return;
    }

    window.location.href = paymentData.init_point;

  } catch (error) {
    console.error("❌ Error pago evento:", error);
    alert("No se pudo iniciar el pago");
  }
}

/* =============================
   🎟️ UNIRSE A EVENTO (SUSCRIPTORES)
============================= */
async function joinEvent(eventId) {
  try {
    const currentUser = await loadCurrentUser();
    
    if (!currentUser) {
      alert("Debes iniciar sesión");
      window.location.href = "login.html";
      return;
    }

    const res = await fetch(`${API_URL}/api/events/${eventId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: currentUser._id
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error al unirse al evento");
      return;
    }

    alert("✅ Te has unido al evento exitosamente");
    showEventJoinInfo();
    
  } catch (error) {
    console.error("❌ Error uniéndose al evento:", error);
    alert("Error al procesar tu solicitud");
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
    // Mostrar loading
    eventDetails.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2">Cargando información del evento...</p>
      </div>
    `;

    // 🔥 USAR ENDPOINT PÚBLICO para cargar el evento
    const res = await fetch(`${API_URL}/api/events/public/${eventId}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Evento no encontrado");
      }
      throw new Error(`Error al cargar evento: ${res.status}`);
    }

    const event = await res.json();
    
    // Cargar usuario actual si está autenticado
    const authUser = await loadCurrentUser();
    const isLogged = !!token;
    const isSubscribed = authUser?.subscription?.isActive === true;
    
    const price = event.price ?? 0;
    
    // Formatear fecha
    const formattedDate = event.date ? new Date(event.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : 'Fecha por confirmar';

    let actionSection = "";

    /* =============================
       USUARIO NO LOGUEADO
    ============================= */
    if (!isLogged) {
      actionSection = `
        <div class="alert alert-info mt-4">
          <i class="fas fa-info-circle"></i>
          Registrate en menos de un minuto y participa del evento.
        </div>
        <a href="login.html" class="btn btn-primary w-100">
          🔐 Iniciar sesión
        </a>
        <div class="text-center mt-2">
          <small class="text-muted">¿No tenés cuenta? <a href="register.html">Registrate</a></small>
        </div>
      `;
    }

    /* =============================
       USUARIO SUSCRITO
    ============================= */
    else if (isSubscribed) {
      actionSection = `
        <div class="alert alert-success mt-4">
          <i class="fas fa-star"></i>
          <strong>¡Eres suscriptora!</strong> Puedes unirte a este evento sin costo adicional.
        </div>
        <button class="btn btn-success w-100 mt-2" onclick="joinEvent('${event._id}')">
          🙋‍♀️ Unirme al evento
        </button>
        <div id="joinInfo" class="mt-3" style="display:none">
          ${event.whatsappLink ? `
            <div class="alert alert-info">
              <i class="fab fa-whatsapp"></i>
              <strong>¡Ya estás en el evento!</strong>
              <hr>
              <a href="${event.whatsappLink}" target="_blank" class="btn btn-success w-100">
                💬 Unirme al grupo de WhatsApp
              </a>
            </div>
          ` : `
            <div class="alert alert-info">
              <p>✅ Te has unido al evento exitosamente.</p>
              <p class="mb-0">El enlace al grupo se publicará próximamente.</p>
            </div>
          `}
        </div>
      `;
    }

    /* =============================
       EVENTO GRATIS (USUARIO NO SUSCRITO)
    ============================= */
    else if (price === 0) {
      actionSection = `
        <div class="alert alert-info mt-4">
          <i class="fas fa-gift"></i>
          Este evento es <strong>gratis</strong>. Como no eres suscriptora, puedes pagar solo este evento.
        </div>
        <button class="btn btn-primary w-100 mb-2" onclick="payEvent('${event._id}')">
          🎟️ Obtener ticket gratis
        </button>
        <a href="suscripcion.html" class="btn btn-warning w-100">
          ⭐ Suscribirme y acceder a todos los eventos
        </a>
        <div class="text-center mt-2">
          <small class="text-muted">Con suscripción accedes a todos los eventos sin costo adicional</small>
        </div>
      `;
    }

    /* =============================
       EVENTO DE PAGO (USUARIO NO SUSCRITO)
    ============================= */
    else {
      actionSection = `
        <div class="alert alert-info mt-4">
          <i class="fas fa-ticket-alt"></i>
          Este evento tiene un costo de <strong>$${price}</strong>.
        </div>
        <button
          class="btn btn-success w-100 mb-2"
          onclick="payEvent('${event._id}')"
        >
          🎟️ Pagar este evento - $${price}
        </button>
        <a href="suscripcion.html" class="btn btn-warning w-100">
          ⭐ Suscribirme y ahorrar en todos los eventos
        </a>
        <div class="text-center mt-2">
          <small class="text-muted">La suscripción te da acceso ilimitado a todos los eventos</small>
        </div>
      `;
    }

    // Determinar la URL de la imagen
    let imageUrl = event.image;
    
    // Si la imagen es la ruta local por defecto, usar un placeholder
    if (!imageUrl || imageUrl === "/img/default_event.jpg") {
      imageUrl = "https://via.placeholder.com/800x600?text=Evento+Meet+%26+Go";
    }

    // Renderizar el evento
    eventDetails.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="position-relative">
            <img 
              src="${imageUrl}" 
              class="img-fluid rounded shadow-sm" 
              alt="${escapeHtml(event.name)}"
              style="width: 100%; height: 700px; object-fit: cover; background-color: #f0f0f0;"
              onerror="this.src='https://via.placeholder.com/800x600?text=Imagen+no+disponible'; this.onerror=null;"
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
              ${event.price ? `<li class="mb-2"><strong>💵 Precio:$</strong> ${event.price}</li>` : ''}
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

/* =============================
   MOSTRAR INFO DE UNIÓN
============================= */
function showEventJoinInfo() {
  const joinDiv = document.getElementById("joinInfo");
  if (joinDiv) {
    joinDiv.style.display = joinDiv.style.display === "none" ? "block" : "none";
  }
}

/* =============================
   🔧 UTILIDAD: ESCAPAR HTML
============================= */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =============================
   🚀 INIT
============================= */
document.addEventListener("DOMContentLoaded", () => {
  loadEventInfo();
});