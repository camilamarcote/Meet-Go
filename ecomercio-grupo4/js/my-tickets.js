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
    // Apuntamos al endpoint que extrae los tickets del 'User' mediante el Token
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
          <strong>⚠️ Error:</strong> No pudimos conectar con tus entradas de MongoDB. Reintenta en unos minutos.
        </div>
      `;
    }
  }
}

/* ========================================================
    🧩 RENDERIZAR ENTRADAS (Sin estados de pago)
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
    // 1. Obtener los datos del evento poblados desde MongoDB
    const eventName = ticket.event?.name || ticket.event?.title || "Evento de Meet & Go";
    
    // Formatear fecha del evento de forma amigable
    const eventDate = ticket.event?.date ? new Date(ticket.event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : "";
    const eventTime = ticket.event?.time || "";

    // Construcción del lugar combinando barrio y departamento
    const neighborhood = ticket.event?.neighborhood || "";
    const department = ticket.event?.department || "";
    let eventLocation = [neighborhood, department].filter(Boolean).join(", ");
    if (!eventLocation) eventLocation = "Uruguay";

    // 2. Comprobar nombre en el pase (Por si compró para un invitado externo)
    let holderName = "Titular de la cuenta";
    if (ticket.guestName) {
      holderName = ticket.guestName;
    } else if (ticket.user) {
      holderName = `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim();
    }
    
    // Identificar si es un pase propio o para un amigo
    const labelBadge = ticket.isGuest ? "badge bg-warning text-dark" : "badge bg-primary";
    const labelText = ticket.isGuest ? "Para Invitado" : "Pase Personal";

    // 4. Inyección del diseño HTML estructurado de forma limpia sin estados de pago
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
            <p class="mb-0 text-muted small"><strong>ID Pase:</strong> ${ticket._id.substring(0, 10)}...</p>
          </div>
          
          <div class="col-4 text-end">
            <div class="qr-container" style="display: inline-block; background: #f8f9fa; padding: 5px; border-radius: 4px;">
              ${
                ticket.qrImage 
                  ? `<img src="${ticket.qrImage}" alt="QR" style="width: 75px; height: 75px; object-fit: contain;">`
                  : `<div class="small text-muted text-center" style="width: 75px; font-size: 0.65rem; padding-top: 20px;">Presentar ID</div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  });
}