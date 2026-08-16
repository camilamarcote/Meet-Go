const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // 🔐 Control de acceso: Si no está logueado, al welcome
  if (!currentUser || !currentUser.token) {
    window.location.href = "welcome.html";
    return;
  }

  // Cargar los tickets del usuario pasándole su token
  loadMyTickets(currentUser.token);
});

/* ========================================================
   📥 CARGAR TICKETS DEL USUARIO AUTENTICADO
   ======================================================== */
async function loadMyTickets(token) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/my`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("No se pudieron cargar tus pases.");

    const tickets = await res.json();
    renderMyTickets(tickets);

  } catch (error) {
    console.error("❌ Error cargando pases:", error);
    const container = document.getElementById("ticketsContainer");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" style="padding: 15px; border-radius: 6px; text-align: center;">
          <strong>⚠️ Error:</strong> No pudimos conectar con tus entradas. Reintenta en unos minutos.
        </div>
      `;
    }
  }
}

/* ========================================================
   🧩 RENDERIZAR ENTRADAS
   ======================================================== */
function renderMyTickets(tickets) {
  const container = document.getElementById("ticketsContainer");
  if (!container) return;

  container.innerHTML = "";

  // Si el usuario no tiene ninguna compra
  if (!tickets || tickets.length === 0) {
    container.innerHTML = `
      <div class="text-center p-5 text-muted">
        <p class="fs-5">Aún no tienes pases adquiridos.</p>
        <a href="explorar.html" class="btn btn-primary btn-sm mt-2">Explorar Eventos</a>
      </div>
    `;
    return;
  }

  tickets.forEach(ticket => {
    // 1. Resolver el objeto del evento (soporta si viene en `ticket.event` o `ticket.eventId`)
    const eventObj = (typeof ticket.event === "object" && ticket.event !== null)
      ? ticket.event
      : (typeof ticket.eventId === "object" && ticket.eventId !== null)
        ? ticket.eventId
        : {};

    // 2. Extraer el nombre según la propiedad 'name' del EventSchema
    const eventName = eventObj.name || eventObj.title || "Evento de Meet & Go";
    
    // Formatear fecha y hora del evento
    const eventDate = eventObj.date ? new Date(eventObj.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : "";
    const eventTime = eventObj.time || "";

    // Construcción de ubicación (barrio, departamento)
    const neighborhood = eventObj.neighborhood || "";
    const department = eventObj.department || "";
    let eventLocation = [neighborhood, department].filter(Boolean).join(", ");
    if (!eventLocation) eventLocation = "Uruguay";

    // 3. Comprobar beneficiario
    let holderName = "Titular de la cuenta";
    if (ticket.guestName) {
      holderName = ticket.guestName;
    } else if (ticket.user && typeof ticket.user === "object") {
      holderName = `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim();
    }
    
    // Badges de identificación
    const labelBadge = ticket.isGuest ? "badge bg-warning text-dark" : "badge bg-primary";
    const labelText = ticket.isGuest ? "Para Invitado" : "Pase Personal";

    // ID del Pase formateado
    const ticketId = ticket._id ? ticket._id.substring(0, 10) : "N/A";

    // 4. RESOLUCIÓN DE LA IMAGEN DEL QR
    // Si la entrada ya trae qrImage en Base64 la usa; de lo contrario genera la URL del QR
    const verifyUrl = `https://meetandgouy.com/verify-ticket.html?tid=${ticket._id}`;
    const finalQrSource = ticket.qrImage 
      ? ticket.qrImage 
      : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

    // 5. Renderizado HTML
    container.innerHTML += `
      <div class="user-card border-start border-4 border-primary mb-3" style="background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px; border-radius: 8px;">
        <div class="user-header d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h3 class="m-0 h5 fw-bold text-dark">${eventName}</h3>
            <div class="text-muted small mt-1 d-flex flex-wrap gap-2">
              ${eventDate ? `<span><i class="bi bi-calendar-event"></i> ${eventDate}</span>` : ''}
              ${eventTime ? `<span><i class="bi bi-clock"></i> ${eventTime}</span>` : ''}
            </div>
            <div class="text-muted small mt-1">
              <span><i class="bi bi-geo-alt"></i> ${eventLocation}</span>
            </div>
          </div>
          <div class="badges"> 
            <span class="${labelBadge}">${labelText}</span>
          </div>
        </div>

        <hr style="margin: 12px 0; border-color: #eee;">
        
        <div class="row align-items-center">
          <div class="col-8">
            <p class="mb-1"><strong>Beneficiario:</strong> ${holderName}</p>
            <p class="mb-1"><strong>Tipo de Entrada:</strong> <span class="text-capitalize">${ticket.accessType || "Pase General"}</span></p>
            <p class="mb-0 text-muted small"><strong>ID Pase:</strong> ${ticketId}...</p>
          </div>
          
          <div class="col-4 text-end">
            <div class="qr-container" style="display: inline-block; background: #f8f9fa; padding: 5px; border-radius: 4px;">
              <img src="${finalQrSource}" alt="Código QR del Ticket" style="width: 75px; height: 75px; object-fit: contain;">
            </div>
          </div>
        </div>
      </div>
    `;
  });
}