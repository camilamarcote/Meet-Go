const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

// Variables globales de estado
let maxAvailableQuantity = 10; // Límite por defecto
let currentEventAltPrice = 0;   // Guarda el precio alternativo dinámicamente

/* ========================================================
    💳 DISPARADOR DE COMPRA DIRECTO (Sin modal)
======================================================== */
window.payEvent = async function(eventId, btnElement) {
    const savedUser = JSON.parse(localStorage.getItem("currentUser"));

    // Guardrail de seguridad: Si por alguna razón no hay sesión, redirigir al login
    if (!savedUser || (!savedUser.token && !savedUser.email)) {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    // Obtener la cantidad seleccionada desde el desplegable sobre el botón
    const qtySelect = document.getElementById("ticketQuantitySelect");
    const quantity = qtySelect ? (parseInt(qtySelect.value) || 1) : 1;

    const fullName = `${savedUser.firstName || ''} ${savedUser.lastName || ''}`.trim() || savedUser.name || "Usuario Registrado";
    const email = savedUser.email || "";
    const phone = savedUser.phone || "";

    await processPurchase(eventId, btnElement, { fullName, email, phone, quantity });
}

/* ========================================================
    🚀 PROCESAMIENTO REAL DEL TICKET (MongoDB / Mercado Pago)
======================================================== */
async function processPurchase(eventId, btnElement, userData) {
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

        const ticketPayload = {
            guestEmail: userData.email,
            guestName: userData.fullName,
            guestPhone: userData.phone,
            isGuest: false, 
            quantity: userData.quantity,
            isSubscriber: isSubscriber,
            chosenPriceType: isSubscriber ? "altPrice" : "price"
        };

        const resTicket = await fetch(`${API_URL}/api/tickets/events/${eventId}/tickets`, {
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

        // Si es suscriptor y el evento es costo 0 para suscriptores
        if (isSubscriber && currentEventAltPrice === 0) {
            if (btnElement) {
                btnElement.innerText = "Cupos Reservados 🔒";
                btnElement.className = "btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm";
                btnElement.disabled = true;
            }
            
            alert(`🎉 ¡Tus ${userData.quantity} entrada(s) gratuita(s) han sido reservadas con éxito! Revisa tu correo electrónico.`);
            
            setTimeout(() => {
                window.location.reload();
            }, 800);
            return; 
        }

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
            btnElement.innerText = "Intentar de nuevo";
            btnElement.disabled = false;
        }
    }
}

/* =============================
    📄 CARGAR INFO DEL EVENTO
============================ */
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
        const isLoggedIn = Boolean(savedUser && (savedUser.token || savedUser.email));
        const isSubscriber = savedUser?.isSubscriber === true || savedUser?.roles?.includes("admin");

        const hasLimit = event.hasCapacityLimit === true || event.hasCapacityLimit === "true";
        const maxCapacity = Number(event.maxCapacity) || 0;
        const ticketsSold = Number(event.ticketsSold) || 0; 
        const remainingCapacity = maxCapacity - ticketsSold;
        const isSoldOut = hasLimit && remainingCapacity <= 0;

        if (hasLimit) {
            maxAvailableQuantity = Math.min(5, remainingCapacity);
        } else {
            maxAvailableQuantity = 5;
        }

        let capacityBadgeHtml = "";
        if (hasLimit) {
            if (isSoldOut) {
                capacityBadgeHtml = `<div class="alert alert-danger fw-bold text-center border-0 shadow-sm mb-3">❌ Cupos agotados</div>`;
            } else {
                capacityBadgeHtml = `<div class="alert alert-warning fw-bold text-center border-0 shadow-sm mb-3 text-dark">¡Quedan solo ${remainingCapacity} cupos!</div>`;
            }
        }

        // 🔘 Generar controles de compra o invitación a Iniciar Sesión
        let actionAreaHtml = "";

        if (isSoldOut) {
            actionAreaHtml = `<button class="btn btn-secondary btn-lg w-100 py-3 fw-bold shadow-sm" disabled>Cupos Cerrados 🔒</button>`;
        } else if (!isLoggedIn) {
            // 🔴 CASO 1: USUARIO SIN SESIÓN INICIADA
            actionAreaHtml = `
                <div class="text-center p-3 bg-light border rounded-3 shadow-sm mb-2">
                    <p class="text-muted small mb-2">Para adquirir entradas debes estar registrado e iniciar sesión con tu cuenta.</p>
                    <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" class="btn btn-outline-primary btn-lg w-100 fw-bold">
                        Iniciar Sesión para Comprar
                    </a>
                </div>
            `;
        } else {
            // 🟢 CASO 2: USUARIO CON SESIÓN INICIADA
            // A) Generar el selector desplegable de cantidad
            let optionsHtml = "";
            for (let i = 1; i <= maxAvailableQuantity; i++) {
                optionsHtml += `<option value="${i}">${i} ${i === 1 ? 'entrada' : 'entradas'}</option>`;
            }

            const quantitySelectorHtml = `
                <div class="mb-3 p-3 bg-light border rounded-3 d-flex align-items-center justify-content-between">
                    <label for="ticketQuantitySelect" class="fw-bold text-secondary mb-0 me-2">Cantidad de entradas:</label>
                    <select id="ticketQuantitySelect" class="form-select form-select-lg w-auto fw-bold text-primary">
                        ${optionsHtml}
                    </select>
                </div>
            `;

            // B) Generar el botón según su rol de suscriptor/precio
            let buttonText = "";
            let buttonClass = "btn-success";

            if (isSubscriber) {
                if (currentEventAltPrice === 0) {
                    buttonText = "Obtener Entrada Gratuita";
                } else {
                    buttonText = `Comprar Entrada - $${currentEventAltPrice}`;
                    buttonClass = "btn-warning text-dark";
                }
            } else {
                const textPriceGral = basePrice === 0 ? 'Gratis' : `$${basePrice}`;
                buttonText = `Comprar Entrada General - ${textPriceGral}`;
            }

            actionAreaHtml = `
                ${quantitySelectorHtml}
                <button class="btn ${buttonClass} btn-lg w-100 py-3 fw-bold text-uppercase shadow-sm" onclick="payEvent('${event._id}', this)">
                    ${buttonText}
                </button>
            `;
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
                    <div class="d-grid gap-2">${actionAreaHtml}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error cargando evento:", error);
        eventDetails.innerHTML = `<div class="alert alert-danger text-center shadow-sm"><p class="fw-bold">${error.message}</p></div>`;
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