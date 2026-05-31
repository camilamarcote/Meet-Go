const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

// Variable global para recordar qué botón disparó la compra
let activePayButton = null;

/* ========================================================
    📦 INICIALIZAR MODAL DE INVITADO EN EL HTML (Al cargar)
======================================================== */
function injectGuestModal() {
    if (document.getElementById("guestModal")) return;

    const modalHtml = `
        <div class="modal fade" id="guestModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="guestModalLabel" aria-hidden="true">
            <div class="modal-content modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-lg border-0 rounded-4">
                    <div class="modal-header bg-light border-0 pt-4 px-4">
                        <h5 class="modal-title fw-bold" id="guestModalLabel">🎟️ Completa tus datos para el Ticket</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="closeGuestModalBtn"></button>
                    </div>
                    <form id="guestTicketForm">
                        <div class="modal-body px-4 pb-4">
                            <p class="text-muted small">Ingresa datos reales. Se utilizarán para validar tu acceso y enviarte el código QR de entrada.</p>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary small">Nombre Completo</label>
                                <input type="text" id="guestFullName" class="form-control form-control-lg" placeholder="Ej: Juan Pérez" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary small">Correo Electrónico</label>
                                <input type="email" id="guestEmail" class="form-control form-control-lg" placeholder="nombre@ejemplo.com" required>
                            </div>
                            
                            <div class="mb-2">
                                <label class="form-label fw-semibold text-secondary small">Número de Celular</label>
                                <input type="tel" id="guestPhone" class="form-control form-control-lg" placeholder="Ej: 099123456" required>
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-0 d-grid gap-2 p-4">
                            <button type="submit" class="btn btn-primary btn-lg fw-bold rounded-3">Confirmar y Continuar al Pago</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const div = document.createElement("div");
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    // Escuchar el envío del formulario del modal
    document.getElementById("guestTicketForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById("guestFullName").value.trim();
        const email = document.getElementById("guestEmail").value.trim();
        const phone = document.getElementById("guestPhone").value.trim();

        if (!fullName || !email || !phone) {
            alert("Por favor, completa todos los campos requeridos.");
            return;
        }

        if (!validateEmail(email)) {
            alert("Por favor, ingresa un correo electrónico válido.");
            return;
        }

        // Cerramos el modal de forma nativa con Bootstrap
        const modalElement = document.getElementById("guestModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        // Ejecutar el procesamiento de pago real pasando los 3 parámetros recolectados
        await processGuestPurchase(eventId, activePayButton, { fullName, email, phone });
    });
}

/* ========================================================
    💳 DISPARADOR DE COMPRA (Abre el Modal)
======================================================== */
function payEvent(eventId, btnElement) {
    activePayButton = btnElement; // Guardamos referencia
    
    // Inicializamos y abrimos el modal de Bootstrap
    const modalElement = document.getElementById("guestModal");
    const modal = new bootstrap.Modal(modalElement);
    
    // Limpiamos campos de ejecuciones previas
    document.getElementById("guestTicketForm").reset();
    
    modal.show();
}

/* ========================================================
    🚀 PROCESAMIENTO REAL DEL TICKET Y MERCADO PAGO
======================================================== */
async function processGuestPurchase(eventId, btnElement, guestData) {
    try {
        // 1. Bloquear botón y mostrar carga
        const originalText = btnElement.innerText;
        btnElement.innerText = "Procesando...";
        btnElement.disabled = true;

        // 2. Crear ticket como invitado enviando Nombre, Mail y Teléfono
        const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                guestEmail: guestData.email,
                guestName: guestData.fullName,  // Nuevo campo enviado
                guestPhone: guestData.phone,    // Nuevo campo enviado
                isGuest: true 
            })
        });

        const ticketData = await resTicket.json();

        if (!resTicket.ok) {
            throw new Error(ticketData.message || "Error al generar el ticket");
        }

        const ticketId = ticketData.ticket._id;

        // 3. Crear preferencia de pago en Mercado Pago
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

        // 4. Redirigir a Mercado Pago (o manejar flujo gratis si devuelve paid)
        if (paymentData.status === "paid") {
            alert("🎉 ¡Tu ticket gratuito ha sido procesado con éxito! Revisa tu correo electrónico.");
            window.location.reload();
        } else {
            window.location.href = paymentData.init_point;
        }

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

        // 🎟️ Cálculos del Sistema de Cupos
        // Evaluamos si viene como booleano puro o string desde el backend
        const hasLimit = event.hasCapacityLimit === true || event.hasCapacityLimit === "true";
        const maxCapacity = Number(event.maxCapacity) || 0;
        const ticketsSold = Number(event.ticketsSold) || 0; 
        const remainingCapacity = maxCapacity - ticketsSold;
        const isSoldOut = hasLimit && remainingCapacity <= 0;

        // Renderizado del mensaje superior de los cupos
        let capacityBadgeHtml = "";
        if (hasLimit) {
            if (isSoldOut) {
                capacityBadgeHtml = `
                    <div class="alert alert-danger fw-bold text-center border-0 shadow-sm mb-3">
                        ❌ Los cupos para esta actividad se han cerrado
                    </div>
                `;
            } else {
                capacityBadgeHtml = `
                    <div class="alert alert-warning fw-bold text-center border-0 shadow-sm mb-3 text-dark">
                        🔥 ¡Quedan solo ${remainingCapacity} cupos disponibles!
                    </div>
                `;
            }
        }

        // Renderizado inteligente del botón de acción (Compra vs Bloqueado)
        let actionButtonHtml = "";
        if (isSoldOut) {
            actionButtonHtml = `
                <button class="btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm" disabled style="cursor: not-allowed; opacity: 0.7;">
                    Cupos Cerrados 🔒
                </button>
            `;
        } else {
            actionButtonHtml = `
                <button class="btn btn-success btn-lg w-100 py-3 fw-bold text-uppercase shadow-sm" onclick="payEvent('${event._id}', this)">
                    🎟️ Comprar Ticket - ${price === 0 ? 'Gratis' : `$${price}`}
                </button>
            `;
        }

        // Variable unificada para soportar indistintamente si el backend usa ageRange o age
        const backendAgeValue = event.ageRange || event.age;

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
                        <span class="badge ${price === 0 ? 'bg-success' : 'bg-primary'} position-absolute top-0 end-0 m-3 p-2 fs-6 shadow-sm">
                            ${price === 0 ? 'Gratis' : `$${price}`}
                        </span>
                    </div>
                </div>

                <div class="col-md-6">
                    <h2 class="mb-3 fw-bold">${escapeHtml(event.name)}</h2>
                    
                    ${capacityBadgeHtml}
                    
                    ${event.description ? `
                        <div class="mb-4">
                            <h5 class="fw-bold text-secondary">📝 Descripción</h5>
                            <p class="text-muted" style="white-space: pre-line;">${escapeHtml(event.description)}</p>
                        </div>
                    ` : ''}

                    <div class="event-info mb-4 bg-white p-3 border rounded shadow-sm">
                        <h5 class="fw-bold text-secondary mb-3">📍 Detalles</h5>
                        <ul class="list-unstyled mb-0">
                            ${event.category ? `<li class="mb-2"><strong>🎯 Categoría:</strong> ${escapeHtml(event.category)}</li>` : ''}
                            ${event.department ? `<li class="mb-2"><strong>📍 Ubicación:</strong> ${escapeHtml(event.department)} ${event.neighborhood ? `- ${escapeHtml(event.neighborhood)}` : ''}</li>` : ''}
                            
                            <li class="mb-2">
                                <strong>👶 Franja etaria:</strong> 
                                ${backendAgeValue === 'sin_limite' || !backendAgeValue ? '<span class="text-success fw-bold">🎉 ¡Para todo público!</span>' : `${escapeHtml(backendAgeValue)} años`}
                            </li>
                            
                            <li class="mb-2"><strong>📅 Fecha:</strong> ${event.date}</li>
                            ${event.time ? `<li class="mb-0"><strong>⏰ Hora:</strong> ${event.time}</li>` : ''}
                        </ul>
                    </div>

                    <hr class="text-muted my-4">
                    
                    <div class="d-grid gap-2">
                        ${actionButtonHtml}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("❌ Error cargando evento:", error);
        eventDetails.innerHTML = `
            <div class="alert alert-danger text-center shadow-sm">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <p class="fw-bold">${error.message}</p>
                <a href="explorar.html" class="btn btn-outline-danger btn-sm">Volver al listado</a>
            </div>
        `;
    }
}

/* =============================
    🛠  UTILIDADES
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
    injectGuestModal(); // Inyectamos el modal oculto en la estructura
    loadEventInfo();
});