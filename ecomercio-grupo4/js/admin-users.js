const API_URL = "https://api.meetandgouy.com";

// Variables globales para la búsqueda
let allUsers = [];
let allTickets = []; // 🎟️ Almacén para los tickets vendidos
let currentFilter = "all";

/* ===============================
    🔐 CONTROL DE ACCESO
=============================== */
document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || !currentUser.token) {
    window.location.href = "login.html";
    return;
  }

  if (!currentUser.isOrganizer && !currentUser.roles?.includes("admin")) {
    document.body.innerHTML = "<h2>Acceso restringido</h2>";
    return;
  }

  // Carga ambas listas en paralelo desde la base de datos
  loadUsers(currentUser.token);
  loadSoldTickets(currentUser.token);
  
  // Inicializar eventos de búsqueda
  initSearchEvents();
});

/* ===============================
    🔍 INICIALIZAR EVENTOS DE BÚSQUEDA
=============================== */
function initSearchEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearch");
  const filterBtns = document.querySelectorAll(".filter-btn");

  // Evento de búsqueda en tiempo real (Afecta a usuarios registrados)
  searchInput.addEventListener("input", (e) => {
    filterUsers(e.target.value, currentFilter);
    if(clearBtn) clearBtn.style.display = e.target.value ? "flex" : "none";
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterUsers("", currentFilter);
      clearBtn.style.display = "none";
      searchInput.focus();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentFilter = btn.dataset.filter;
      filterUsers(searchInput.value, currentFilter);
    });
  });
}

/* ===============================
    👥 CARGAR USUARIOS REGISTRADOS
=============================== */
async function loadUsers(token) {
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("No autorizado");

    allUsers = await res.json();
    filterUsers("", "all");

  } catch (error) {
    console.error("❌ Error cargando usuarios:", error);
    const container = document.getElementById("usersContainer");
    if (container) {
      container.innerHTML = "<p>Error al cargar usuarios registrados en el sistema.</p>";
    }
  }
}

/* ===============================
    🎟️ CARGAR TICKETS VENDIDOS
=============================== */
async function loadSoldTickets(token) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/tickets`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error("No se pudo obtener la respuesta del servidor de tickets.");
    }

    const tickets = await res.json();
    procesarYRenderizarTickets(tickets);

  } catch (error) {
    console.error("❌ Error cargando tickets vendidos:", error);
    const guestContainer = document.getElementById("guestsContainer");
    if (guestContainer) {
      guestContainer.innerHTML = `
        <div class="alert alert-danger" style="padding: 15px; background-color: #f8d7da; color: #721c24; border-radius: 6px; font-weight: 500;">
          <strong>⚠️ Error de conexión backend:</strong> No se pudieron obtener los tickets vendidos desde MongoDB.<br>
          <span style="font-size: 0.9rem; font-weight: normal; opacity: 0.8;">
            Verifica que la API responda correctamente en /api/tickets/tickets.
          </span>
        </div>
      `;
    }
  }
}

// Función auxiliar para guardar y mandar a pintar
function procesarYRenderizarTickets(tickets) {
  if (!Array.isArray(tickets)) return;
  allTickets = tickets;
  renderSoldTickets(allTickets);
}

/* ===============================
    🔍 FILTRAR USUARIOS REGISTRADOS
=============================== */
function filterUsers(searchTerm, filterType) {
  let filteredUsers = [...allUsers];
  
  switch(filterType) {
    case "verified":
      filteredUsers = filteredUsers.filter(user => user.isVerified === true);
      break;
    case "unverified":
      filteredUsers = filteredUsers.filter(user => user.isVerified === false);
      break;
    case "subscribed":
      filteredUsers = filteredUsers.filter(user => user.subscription?.isActive === true);
      break;
    case "organizer":
      filteredUsers = filteredUsers.filter(user => user.isOrganizer === true);
      break;
    default:
      break;
  }
  
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase().trim();
    filteredUsers = filteredUsers.filter(user => {
      const searchableFields = [
        user.firstName,
        user.lastName,
        user.username,
        user.email,
        user.nationality,
        user.phone,
        ...(user.interests || []),
      ];
      
      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      );
    });
  }
  
  updateResultsCount(filteredUsers.length);
  renderUsers(filteredUsers);
  
  const noResultsDiv = document.getElementById("noResults");
  if (noResultsDiv) {
    noResultsDiv.style.display = filteredUsers.length === 0 ? "block" : "none";
  }
}

function updateResultsCount(count) {
  const resultsSpan = document.getElementById("resultsCount");
  if (resultsSpan) {
    resultsSpan.textContent = count;
  }
}

/* ===============================
    🧩 RENDER USUARIOS REGISTRADOS
=============================== */
function renderUsers(users) {
  const container = document.getElementById("usersContainer");
  if (!container) return;
  
  container.innerHTML = "";

  users.forEach(user => {
    const isSubscribed = user.subscription?.isActive === true;
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;

    container.innerHTML += `
      <div class="user-card" data-user-id="${user._id}">
        <div class="user-header">
          <h3>${fullName} (@${user.username})</h3>
          <div class="badges">
            <span class="badge ${user.isVerified ? "success" : "warning"}">
              ${user.isVerified ? "✓ Verificada" : "✗ No verificada"}
            </span>

            <span class="badge ${isSubscribed ? "success" : "neutral"}">
              ${isSubscribed ? "⭐ Suscripta" : "○ Sin suscripción"}
            </span>
            
            ${user.isOrganizer ? '<span class="badge success">👑 Organizadora</span>' : ''}
          </div>
        </div>

        <p><strong>📧 Email:</strong> ${user.email}</p>
        <p><strong>📱 Celular:</strong> ${user.phone || "—"}</p>
        <p><strong>🎂 Edad:</strong> ${user.age ?? "—"} años</p>
        <p><strong>🌎 Nacionalidad:</strong> ${user.nationality || "—"}</p>

        <hr>

        <p><strong>⭐ Intereses:</strong><br>
          ${user.interests?.length ? user.interests.map(i => `<span class="interest-tag">${i}</span>`).join(" ") : "—"}
        </p>

        <hr>

        <div class="user-actions">
          <button class="mail-btn" onclick="sendMail('${user._id}', '${user.email}')">
            ✉️ Enviar mail
          </button>

          ${
            !isSubscribed
              ? `<button class="subscribe-btn" onclick="activateSubscription('${user._id}')">⭐ Marcar como suscripta</button>`
              : `<button class="unsubscribe-btn" onclick="deactivateSubscription('${user._id}')">🚫 Dar de baja</button>`
          }
        </div>
      </div>
    `;
  });
}

/* ===============================
    🎟️ RENDER TICKETS VENDIDOS
=============================== */
function renderSoldTickets(tickets) {
  const container = document.getElementById("guestsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (tickets.length === 0) {
    container.innerHTML = `<p class="text-muted p-3">No hay tickets ni pases vendidos registrados hasta el momento.</p>`;
    return;
  }

  tickets.forEach(ticket => {
    // 1. Resolver el objeto del evento
    const eventObj = (typeof ticket.event === "object" && ticket.event !== null)
      ? ticket.event
      : (typeof ticket.eventId === "object" && ticket.eventId !== null)
        ? ticket.eventId
        : {};

    // 2. Extraer el nombre del evento con fallbacks seguros
    const eventName = eventObj.name || eventObj.title || ticket.eventName || "Evento Meet & Go";

    // 3. Resolver el nombre del comprador/asistente
    let holderName = "Invitado Anónimo";
    if (ticket.guestName && ticket.guestName.trim() !== "") {
      holderName = ticket.guestName;
    } else if (ticket.user && typeof ticket.user === "object") {
      const full = `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim();
      holderName = full || ticket.user.username || "Usuario Registrado";
    }

    const holderEmail = ticket.guestEmail || ticket.user?.email || "—";
    const holderPhone = ticket.guestPhone || ticket.user?.phone || "—";
    
    // 4. Determinar estado de pago y etiquetas
    const isPaid = ticket.payment?.status === "paid" || ticket.payment?.status === "approved" || ticket.payment?.status === "free";
    const ticketStatus = isPaid ? "✅ Pagado" : "⏳ Pendiente";
    
    const isGuest = ticket.isGuest === true;
    const badgeType = isGuest ? "bg-warning text-dark" : "bg-info text-dark";
    const userLabel = isGuest ? "Invitado Externo" : "Usuario Registrado";

    container.innerHTML += `
      <div class="user-card border-start border-4 ${isGuest ? 'border-warning' : 'border-info'} mb-3">
        <div class="user-header d-flex justify-content-between align-items-center">
          <h3 class="m-0 fs-5">${holderName} <span class="fs-6 text-muted">(${userLabel})</span></h3>
          <div class="badges">
            <span class="badge ${badgeType}">🎟️ ${ticket.accessType || "Pase"}</span>
            <span class="badge ${isPaid ? 'bg-success' : 'bg-secondary'} text-white">${ticketStatus}</span>
          </div>
        </div>
        
        <p class="mb-2 mt-2"><strong>🎉 Evento:</strong> <span class="text-primary fw-bold">${eventName}</span></p>
        <p class="mb-1"><strong>📧 Email:</strong> ${holderEmail}</p>
        <p class="mb-1"><strong>📱 Celular:</strong> ${holderPhone}</p>
        <p class="mb-0 text-muted small"><strong>🆔 Código Ticket:</strong> ${ticket._id ? ticket._id.substring(0, 10) : "—"}...</p>
      </div>
    `;
  });
}

/* ===============================
    ⭐ ACTIVAR SUSCRIPCIÓN
=============================== */
async function activateSubscription(userId) {
  if (!confirm("¿Marcar este usuario como suscripta?")) return;
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  try {
    const res = await fetch(`${API_URL}/api/admin/activate-subscription/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentUser.token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error activando suscripción");
    alert("✅ Suscripción activada");
    loadUsers(currentUser.token);
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error activando suscripción");
  }
}

/* ===============================
    🚫 DESACTIVAR SUSCRIPCIÓN
=============================== */
async function deactivateSubscription(userId) {
  if (!confirm("¿Dar de baja la suscripción de este usuario?")) return;
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  try {
    const res = await fetch(`${API_URL}/api/admin/deactivate-subscription/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentUser.token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error dando de baja suscripción");
    alert("🚫 Suscripción dada de baja");
    loadUsers(currentUser.token);
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error al dar de baja la suscripción");
  }
}

/* ===============================
    ✉️ ENVIAR MAIL
=============================== */
async function sendMail(userId, email) {
  if (!confirm(`¿Enviar mail de suscripción a ${email}?`)) return;
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  try {
    const res = await fetch(`${API_URL}/api/admin/send-subscription-mail/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentUser.token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error enviando mail");
    alert("📧 Mail enviado correctamente");
  } catch (error) {
    console.error("❌ Error enviando mail:", error);
    alert("Error al enviar el mail");
  }
}