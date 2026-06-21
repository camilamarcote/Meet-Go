const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

// Variable global para recordar qué botón disparó la compra y los cupos máximos permitidos
let activePayButton = null;
let maxAvailableQuantity = 10; // Límite por defecto
let currentEventAltPrice = 0;   // Guarda el precio alternativo dinámicamente

/* ========================================================
    📦 INICIALIZAR MODAL DE COMPRA EN EL HTML (Al cargar)
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
                            <p class="text-muted small">Ingresa datos reales. Se utilizarán para validar tu acceso y enviarte los códigos QR de entrada.</p>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary small">Nombre Completo</label>
                                <input type="text" id="guestFullName" class="form-control form-control-lg" placeholder="Ej: Juan Pérez" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary small">Correo Electrónico</label>
                                <input type="email" id="guestEmail" class="form-control form-control-lg" placeholder="nombre@ejemplo.com" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label fw-semibold text-secondary small">Número de Celular</label>
                                <input type="tel" id="guestPhone" class="form-control form-control-lg" placeholder="Ej: 099123456" required>
                            </div>

                            <div class="mb-2 p-3 rounded-3 bg-light border border-dashed">
                                <label class="form-label fw-bold text-dark small d-flex justify-content-between align-items-center">
                                    <span>Cantidad de entradas:</span>
                                    <span id="maxQtyNotice" class="badge bg-secondary font-monospace" style="font-size: 0.75rem;">Máx: 10</span>
                                </label>
                                <input type="number" id="ticketQuantity" class="form-control form-control-lg text-center fw-bold text-primary" value="1" min="1" max="10" required>
                                <div class="form-text text-muted small mt-1">Todas las entradas adicionales se registrarán a tu nombre.</div>
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-0 d-grid gap-2 p-4">
                            <button type="submit" id="submitModalBtn" class="btn btn-primary btn-lg fw-bold rounded-3">Confirmar y Continuar al Pago</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const div = document.createElement("div");
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    document.getElementById("guestTicketForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById("guestFullName").value.trim();
        const email = document.getElementById("guestEmail").value.trim();
        const phone = document.getElementById("guestPhone").value.trim();
        const quantity = parseInt(document.getElementById("ticketQuantity").value) || 1;

        if (!fullName || !email || !phone) {
            alert("Por favor, completa todos los campos requeridos.");
            return;
        }

        if (!validateEmail(email)) {
            alert("Por favor, ingresa un correo electrónico válido.");
            return;
        }

        if (quantity < 1 || quantity > maxAvailableQuantity) {
            alert(`Por favor, selecciona una cantidad válida entre 1 y ${maxAvailableQuantity} entradas.`);
            return;
        }

        const modalElement = document.getElementById("guestModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        await processGuestPurchase(eventId, activePayButton, { fullName, email, phone, quantity });
    });
}

/* ========================================================
    💳 DISPARADOR DE COMPRA (Abre el Modal)
======================================================== */
window.payEvent = function(eventId, btnElement) {
    activePayButton = btnElement;
    
    const modalElement = document.getElementById("guestModal");
    const modal = new bootstrap.Modal(modalElement);
    
    document.getElementById("guestTicketForm").reset();

    const savedUser = JSON.parse(localStorage.getItem("currentUser"));
    const isSubscriber = savedUser?.isSubscriber === true || savedUser?.roles?.includes("admin");

    if (savedUser) {
        if(document.getElementById("guestFullName")) document.getElementById("guestFullName").value = `${savedUser.firstName || ''} ${savedUser.lastName || ''}`.trim();
        if(document.getElementById("guestEmail")) document.getElementById("guestEmail").value = savedUser.email || "";
        if(document.getElementById("guestPhone")) document.getElementById("guestPhone").value = savedUser.phone || "";
    }

    const inputQty = document.getElementById("ticketQuantity");
    const noticeQty = document.getElementById("maxQtyNotice");
    if (inputQty) {
        inputQty.value = "1";
        inputQty.max = maxAvailableQuantity;
    }
    if (noticeQty) {
        noticeQty.textContent = `Máx: ${maxAvailableQuantity}`;
    }

    // Cambiar dinámicamente el texto del botón de confirmación en el modal
    const submitModalBtn = document.getElementById("submitModalBtn");
    if (submitModalBtn) {
        if (isSubscriber && currentEventAltPrice === 0) {
            submitModalBtn.textContent = "🎟️ Confirmar Entrada Gratuita";
            submitModalBtn.className = "btn btn-success btn-lg fw-bold rounded-3";
        } else {
            submitModalBtn.textContent = "Confirmar y Continuar al Pago";
            submitModalBtn.className = "btn btn-primary btn-lg fw-bold rounded-3";
        }
    }
    
    modal.show();
}

/* ========================================================
    🚀 PROCESAMIENTO REAL DEL TICKET (MongoDB / Mercado Pago)
======================================================== */
async function processGuestPurchase(eventId, btnElement, guestData) {
    try {
        if (btnElement) {
            btnElement.innerText = "Procesando...";
            btnElement.disabled = true;
        }

        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        const token = currentUser?.token;
        const isSubscriber = currentUser?.isSubscriber === true || currentUser?.roles?.includes("admin");

        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        console.log(`📡 Registrando entrada en base de datos...`);

        // Enviamos la carga útil estructurada al backend
        const ticketPayload = {
            guestEmail: guestData.email,
            guestName: guestData.fullName,
            guestPhone: guestData.phone,
            isGuest: !token, 
            quantity: guestData.quantity,
            isSubscriber: isSubscriber,
            chosenPriceType: isSubscriber ? "altPrice" : "price"
        };

        // 1. Crear el ticket en MongoDB
        const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(ticketPayload)
        });

        const contentTypeTicket = resTicket.headers.get("content-type");
        if (!contentTypeTicket || !contentTypeTicket.includes("application/json")) {
            throw new Error("El servidor no pudo procesar los tickets de forma correcta.");
        }

        const ticketData = await resTicket.json();

        if (!resTicket.ok) {
            throw new Error(ticketData.message || "Error al generar los tickets");
        }

        // Si el precio es 0 para el suscriptor, detenemos el flujo aquí (No va a Mercado Pago)
        if (isSubscriber && currentEventAltPrice === 0) {
            if (btnElement) {
                btnElement.innerText = "Cupos Reservados 🔒";
                btnElement.className = "btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm";
                btnElement.disabled = true;
            }
            
            alert(`🎉 ¡Tus ${guestData.quantity} entrada(s) gratuita(s) han sido reservadas con éxito! Revisa tu correo electrónico.`);
            
            setTimeout(() => {
                window.location.reload();
            }, 800);
            return; // Termina la ejecución de manera limpia
        }

        // 2. Si NO es gratuita, procedemos a iniciar pasarela de pagos
        const targetTickets = ticketData.tickets || [ticketData.ticket];
        if (!targetTickets || targetTickets.length === 0) {
            throw new Error("No se recibieron datos de tickets válidos.");
        }
        
        const mainTicketId = targetTickets[0]._id;
        const paymentHeaders = { "Content-Type": "application/json" };
        if (token) paymentHeaders["Authorization"] = `Bearer ${token}`;

        const resPayment = await fetch(`${API_URL}/api/payments/create/${mainTicketId}`, {
            method: "POST",
            headers: paymentHeaders
        });

        const contentTypePayment = resPayment.headers.get("content-type");
        if (!contentTypePayment || !contentTypePayment.includes("application/json")) {
            throw new Error("El módulo de pagos no respondió correctamente.");
        }

        const paymentData = await resPayment.json();

        if (!resPayment.ok) {
            throw new Error("No se pudo iniciar el proceso de pago.");
        }

        if (paymentData.status === "paid" || !paymentData.init_point) {
            if (btnElement) {
                btnElement.innerText = "Cupos Reservados 🔒";
                btnElement.className = "btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm";
                btnElement.disabled = true;
            }
            alert(`🎉 ¡Reserva procesada con éxito! Revisa tu correo electrónico.`);
            setTimeout(() => { window.location.reload(); }, 800);
        } else {
            window.location.href = paymentData.init_point;
        }

    } catch (error) {
        console.error("❌ Error en el proceso:", error);
        alert(error.message);
        
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
        if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

        const event = await res.json();
        const basePrice = Number(event.price) || 0;
        currentEventAltPrice = (event.altPrice !== undefined && event.altPrice !== null) ? Number(event.altPrice) : 0; 

        const savedUser = JSON.parse(localStorage.getItem("currentUser"));
        const isSubscriber = savedUser?.isSubscriber === true || savedUser?.roles?.includes("admin");

        const hasLimit = event.hasCapacityLimit === true || event.hasCapacityLimit === "true";
        const maxCapacity = Number(event.maxCapacity) || 0;
        const ticketsSold = Number(event.ticketsSold) || 0; 
        const remainingCapacity = maxCapacity - ticketsSold;
        const isSoldOut = hasLimit && remainingCapacity <= 0;

        if (hasLimit) {
            maxAvailableQuantity = Math.min(10, remainingCapacity);
        } else {
            maxAvailableQuantity = 2;
        }

        let capacityBadgeHtml = "";
        if (hasLimit) {
            if (isSoldOut) {
                capacityBadgeHtml = `<div class="alert alert-danger fw-bold text-center border-0 shadow-sm mb-3">❌ Cupos agotados</div>`;
            } else {
                capacityBadgeHtml = `<div class="alert alert-warning fw-bold text-center border-0 shadow-sm mb-3 text-dark">¡Quedan solo ${remainingCapacity} cupos!</div>`;
            }
        }

        let actionButtonHtml = "";

        if (isSoldOut) {
            actionButtonHtml = `<button class="btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm" disabled>Cupos Cerrados 🔒</button>`;
        } else {
            if (isSubscriber) {
                if (currentEventAltPrice === 0) {
                    actionButtonHtml = `
                        <button class="btn btn-success btn-lg w-100 py-3 fw-bold text-uppercase shadow-sm" onclick="payEvent('${event._id}', this)">
                            Entrada Gratuita
                        </button>
                    `;
                } else {
                    actionButtonHtml = `
                        <button class="btn btn-warning btn-lg w-100 py-3 fw-bold text-uppercase shadow-sm text-dark" onclick="payEvent('${event._id}', this)">
                            Comprar Entrada - $${currentEventAltPrice}
                        </button>
                    `;
                }
            } else {
                const textPriceGral = basePrice === 0 ? 'Gratis' : `$${basePrice}`;
                actionButtonHtml = `
                    <button class="btn btn-success btn-lg w-100 py-3 fw-bold text-uppercase shadow-sm" onclick="payEvent('${event._id}', this)">
                        🎟️ Comprar Entrada General - ${textPriceGral}
                    </button>
                `;
            }
        }

        const backendAgeValue = event.ageRange || event.age;

        eventDetails.innerHTML = `
            <div class="row g-4">
                <div class="col-md-6">
                    <div class="position-relative">
                        <img src="${event.image || "img/default_event.jpg"}" class="img-fluid rounded shadow-sm" style="width: 100%; height: auto; max-height: 600px; object-fit: cover;" onerror="this.src='img/default_event.jpg'">
                    </div>
                </div>
                <div class="col-md-6">
                    <h2 class="mb-3 fw-bold">${escapeHtml(event.name)}</h2>
                    ${capacityBadgeHtml}
                    ${event.description ? `<div class="mb-4"><h5 class="fw-bold text-secondary">Descripción</h5><p class="text-muted" style="white-space: pre-line;">${escapeHtml(event.description)}</p></div>` : ''}
                    <div class="event-info mb-4 bg-white p-3 border rounded shadow-sm">
                        <h5 class="fw-bold text-secondary mb-3">Detalles</h5>
                        <ul class="list-unstyled mb-0">
                            ${event.category ? `<li class="mb-2"><strong>Categoría:</strong> ${escapeHtml(event.category)}</li>` : ''}
                            ${event.department ? `<li class="mb-2"><strong> Ubicación:</strong> ${escapeHtml(event.department)} ${event.neighborhood ? `- ${escapeHtml(event.neighborhood)}` : ''}</li>` : ''}
                            <li class="mb-2"><strong> Franja etaria:</strong> ${backendAgeValue === 'sin_limite' || !backendAgeValue ? '<span class="text-success fw-bold">Sin limite de edad</span>' : `${escapeHtml(backendAgeValue)} años`}</li>
                            <li class="mb-2"><strong>Fecha:</strong> ${event.date}</li>
                            ${event.time ? `<li class="mb-2"><strong>Hora:</strong> ${event.time}</li>` : ''}
                            
                            <li class="mt-3 pt-2 border-top">
                                <strong>Precio General:</strong> ${basePrice === 0 ? '<span class="text-success fw-bold">Gratis</span>' : `$${basePrice}`}
                            </li>
                            <li class="mt-1 text-primary">
                                <strong>Precio Club Suscriptores:</strong> <span class="badge bg-primary">${currentEventAltPrice === 0 ? 'Gratis' : `$${currentEventAltPrice}`}</span>
                            </li>
                        </ul>
                    </div>
                    <hr class="text-muted my-4">
                    <div class="d-grid gap-2">${actionButtonHtml}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("❌ Error cargando evento:", error);
        eventDetails.innerHTML = `<div class="alert alert-danger text-center shadow-sm"><p class="fw-bold">${error.message}</p></div>`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.addEventListener("DOMContentLoaded", () => {
    injectGuestModal();
    loadEventInfo();
});