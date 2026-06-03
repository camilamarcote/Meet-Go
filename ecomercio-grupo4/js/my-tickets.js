const API_URL = "https://api.meetandgouy.com";

// Elementos del DOM
const ticketsGrid = document.getElementById("ticketsGrid");
const statusContainer = document.getElementById("statusContainer");

// Instancia del modal de Bootstrap para el QR gigante
const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
const modalEventName = document.getElementById('modalEventName');
const modalQrImg = document.getElementById('modalQrImg');
const modalTicketCode = document.getElementById('modalTicketCode');

/**
 * Muestra loaders o mensajes de error estilizados
 */
function showStatus(message, type = "loading") {
    if (type === "loading") {
        statusContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-3 text-muted fw-semibold">${message}</p>
            </div>
        `;
    } else if (type === "error") {
        statusContainer.innerHTML = `
            <div class="alert alert-warning border-0 shadow-sm d-flex align-items-center" role="alert">
                <i class="fas fa-exclamation-circle fa-lg me-3 text-warning"></i>
                <div><strong>Aviso:</strong> ${message}</div>
            </div>
        `;
    } else {
        statusContainer.innerHTML = "";
    }
}

/**
 * Petición al Backend para obtener el array de pases del usuario logueado
 */
async function fetchMyTickets() {
    // 🎯 Buscamos el token tanto en formato plano como en la estructura "currentUser" por seguridad
    let token = localStorage.getItem("token");
    
    if (!token) {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser && currentUser.token) {
            token = currentUser.token;
        }
    }

    // Redirigir al login si no tiene sesión activa
    if (!token) {
        alert("Debes iniciar sesión para ver tus tickets.");
        window.location.href = "login.html"; 
        return;
    }

    showStatus("Buscando tus entradas guardadas...");

    try {
        const res = await fetch(`${API_URL}/api/my-tickets`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // Control si el backend responde con HTML inesperado por un fallo crítico o redirección
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("El backend devolvió una respuesta incorrecta. Inténtalo más tarde.");
        }

        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("currentUser");
            alert("Tu sesión ha expirado. Por favor ingresa nuevamente.");
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "No se pudo cargar la lista de tickets.");
        }

        const tickets = await res.json();
        showStatus("", "clean"); // Limpiamos el loader

        renderTickets(tickets);

    } catch (error) {
        console.error("❌ Error en fetchMyTickets:", error);
        showStatus(error.message, "error");
    }
}

/**
 * Renderiza dinámicamente las tarjetas de tickets en el HTML
 */
function renderTickets(tickets) {
    ticketsGrid.innerHTML = "";

    if (!tickets || tickets.length === 0) {
        ticketsGrid.innerHTML = `
            <div class="col-10 col-md-6 mx-auto text-center py-5">
                <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                <h4 class="fw-bold">Aún no tienes tickets</h4>
                <p class="text-muted">Los eventos a los que te registres aparecerán organizados en este espacio.</p>
                <a href="explorar.html" class="btn btn-primary rounded-3 px-4 fw-bold shadow-sm">Buscar Eventos</a>
            </div>
        `;
        return;
    }

    tickets.forEach(ticket => {
        // Validación preventiva si el evento asociado fue eliminado del backend
        if (!ticket.event) return;

        const ev = ticket.event;
        
        // Atributos de pago estilizados compatibles con pases de compras grupales
        const isPaid = ticket.payment?.status === "paid" || ticket.payment?.status === "free" || ticket.payment?.status === "paid_multi";
        const statusBadge = isPaid 
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill small px-2">Válido</span>`
            : `<span class="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill small px-2">Pago Pendiente</span>`;

        // Integración del QR: Creador dinámico alternativo o propiedad directa del backend
        const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCode)}`;
        const qrFinalImage = ticket.qrImage || fallbackQrUrl;

        // Si es una entrada de compra grupal secundaria, mostramos una distinción en el nombre si aplica
        const displayEventName = ticket.guestName && ticket.guestName.includes("(") 
            ? `${ev.name} — <small class="text-muted">${ticket.guestName.substring(ticket.guestName.indexOf("("))}</small>`
            : ev.name;

        const cardHtml = `
            <div class="col-md-6 col-lg-4">
                <div class="card ticket-card shadow-sm bg-white h-100">
                    <img src="${ev.image || 'img/default_event.jpg'}" class="event-img" alt="${ev.name}" onerror="this.src='img/default_event.jpg'">
                    
                    <div class="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title fw-bold text-truncate mb-0" style="max-width: 75%;">${displayEventName}</h5>
                                ${statusBadge}
                            </div>
                            <p class="card-text text-muted small mb-3"><i class="fas fa-calendar-alt me-1"></i> ${ev.date} — <i class="fas fa-clock me-1"></i> ${ev.time || 'Ver hora'}</p>
                            <p class="card-text text-secondary small mb-0"><i class="fas fa-map-marker-alt me-1"></i> ${escapeHtml(ev.department || '')} ${ev.neighborhood ? `- ${escapeHtml(ev.neighborhood)}` : ''}</p>
                        </div>
                    </div>

                    <div class="stub p-3 bg-light d-flex align-items-center justify-content-between">
                        <div>
                            <span class="text-uppercase text-muted d-block" style="font-size: 10px; font-weight: 700; letter-spacing: 1px;">Pase Digital</span>
                            <span class="fw-mono text-dark small font-monospace">${ticket.qrCode ? ticket.qrCode.substring(0, 14) : '—'}...</span>
                        </div>
                        <img 
                            src="${qrFinalImage}" 
                            class="qr-thumb shadow-sm" 
                            alt="QR Click para ampliar"
                            onclick="openQrModal('${escapeHtml(ev.name)}', '${qrFinalImage}', '${ticket.qrCode}')"
                            title="Click para ampliar"
                        >
                    </div>
                </div>
            </div>
        `;
        ticketsGrid.insertAdjacentHTML("beforeend", cardHtml);
    });
}

/**
 * Abre el modal y muestra el QR en grande
 */
window.openQrModal = function(eventName, qrUrl, qrCodeText) {
    modalEventName.innerText = eventName;
    modalQrImg.src = qrUrl;
    modalTicketCode.innerText = `Código: ${qrCodeText}`;
    qrModal.show();
}

/**
 * Sanitizador básico para evitar inyecciones XSS en el renderizado
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 🎯 SOLUCCIÓN CRÍTICA: Al ser type="module", ejecutamos la función directamente al instanciar el archivo
fetchMyTickets();