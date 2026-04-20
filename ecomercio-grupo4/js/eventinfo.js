const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

/* =============================
    💳 PAGAR EVENTO (SIN REGISTRO)
============================= */
async function payEvent(eventId, btnElement) {
    try {
        // 1. Pedir email al usuario (Necesario para identificar el ticket)
        const guestEmail = prompt("Por favor, ingresa tu correo electrónico para recibir el ticket:");
        
        if (!guestEmail) {
            return; // El usuario canceló o no ingresó nada
        }

        if (!validateEmail(guestEmail)) {
            alert("Por favor, ingresa un correo electrónico válido.");
            return;
        }

        // 2. Bloquear botón y mostrar carga
        const originalText = btnElement.innerText;
        btnElement.innerText = "Procesando...";
        btnElement.disabled = true;

        // 3. Crear ticket como invitado (El backend debe permitir esto sin Bearer token)
        const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                guestEmail: guestEmail,
                isGuest: true // Flag útil para tu lógica de backend
            })
        });

        const ticketData = await resTicket.json();

        if (!resTicket.ok) {
            throw new Error(ticketData.message || "Error al generar el ticket");
        }

        const ticketId = ticketData.ticket._id;

        // 4. Crear preferencia de pago en Mercado Pago
        const resPayment = await fetch(`${API_URL}/api/payments/create/${ticketId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const paymentData = await resPayment.json();

        if (!resPayment.ok) {
            throw new Error("No se pudo iniciar el proceso de pago");
        }

        // 5. Redirigir a Mercado Pago
        window.location.href = paymentData.init_point;

    } catch (error) {
        console.error("❌ Error en el proceso de pago:", error);
        alert(error.message);
        
        // Restaurar botón en caso de error
        if (btnElement) {
            btnElement.innerText = "🎟️ Intentar de nuevo";
            btnElement.disabled = false;
        }
    }
}

/* =============================
    📄 CARGAR INFO DEL EVENTO
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
                <p class="mt-2">Obteniendo detalles del evento...</p>
            </div>
        `;

        const res = await fetch(`${API_URL}/api/events/public/${eventId}`);
        
        if (!res.ok) {
            if (res.status === 404) throw new Error("Evento no encontrado");
            throw new Error(`Error del servidor: ${res.status}`);
        }

        const event = await res.json();
        const price = event.price ?? 0;

        // Renderizado del contenido
        eventDetails.innerHTML = `
            <div class="row g-4">
                <div class="col-md-6">
                    <div class="position-relative">
                        <img 
                            src="${event.image || "img/default_event.jpg"}" 
                            class="img-fluid rounded shadow-sm" 
                            alt="${event.name}"
                            style="width: 100%; height: auto; max-height: 600px; object-fit: cover;"
                            onerror="this.src='img/default_event.jpg'"
                        >
                        <span class="badge ${price === 0 ? 'bg-success' : 'bg-primary'} position-absolute top-0 end-0 m-3 p-2">
                            ${price === 0 ? 'Gratis' : `$${price}`}
                        </span>
                    </div>
                </div>

                <div class="col-md-6">
                    <h2 class="mb-3">${escapeHtml(event.name)}</h2>
                    
                    ${event.description ? `
                        <div class="mb-4">
                            <h5 class="fw-bold">📝 Descripción</h5>
                            <p class="text-muted">${escapeHtml(event.description)}</p>
                        </div>
                    ` : ''}

                    <div class="event-info mb-4">
                        <h5 class="fw-bold">📍 Detalles</h5>
                        <ul class="list-unstyled">
                            ${event.category ? `<li class="mb-2"><strong>🎯 Categoría:</strong> ${escapeHtml(event.category)}</li>` : ''}
                            ${event.department ? `<li class="mb-2"><strong>📍 Ubicación:</strong> ${escapeHtml(event.department)}</li>` : ''}
                            <li class="mb-2"><strong>📅 Fecha:</strong> ${event.date}</li>
                            ${event.time ? `<li class="mb-2"><strong>⏰ Hora:</strong> ${event.time}</li>` : ''}
                        </ul>
                    </div>

                    <hr>
                    
                    <div class="d-grid gap-2 mt-4">
                        <button class="btn btn-success btn-lg" onclick="payEvent('${event._id}', this)">
                            🎟️ Comprar Ticket - ${price === 0 ? 'Gratis' : `$${price}`}
                        </button>
                        <p class="text-muted text-center small mt-2">
                            <i class="fas fa-lock"></i> No requiere registro. Pago procesado por Mercado Pago.
                        </p>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("❌ Error cargando evento:", error);
        eventDetails.innerHTML = `
            <div class="alert alert-danger text-center shadow-sm">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p>${error.message}</p>
                <a href="explorar.html" class="btn btn-outline-danger btn-sm">Volver al listado</a>
            </div>
        `;
    }
}

/* =============================
    🛠️ UTILIDADES
============================= */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

document.addEventListener("DOMContentLoaded", () => {
    loadEventInfo();
});