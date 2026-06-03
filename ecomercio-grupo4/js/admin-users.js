const API_URL = "https://api.meetandgouy.com";

// Variables globales para la búsqueda
let allUsers = [];
let currentFilter = "all";
let ticketsModal = null; // Instancia global para controlar el modal de tickets

/* ===============================
   Anclaje del Modal en el HTML
=============================== */
function appendTicketsModalHTML() {
  if (document.getElementById("adminTicketsModal")) return;
  
  const modalHTML = `
    <div class="modal fade" id="adminTicketsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 rounded-4 shadow-lg">
          <div class="modal-header border-0 bg-dark text-white rounded-top-4 py-3">
            <h5 class="modal-title fw-bold" id="adminTicketsModalLabel">🎟️ Historial de Entradas</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="adminTicketsModalBody">
            </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  ticketsModal = new bootstrap.Modal(document.getElementById("adminTicketsModal"));
}

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

  // Prepara el modal para renderizar tickets
  appendTicketsModalHTML();

  loadUsers(currentUser.token);
  
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

  searchInput.addEventListener("input", (e) => {
    filterUsers(e.target.value, currentFilter);
    clearBtn.style.display = e.target.value ? "flex" : "none";
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterUsers("", currentFilter);
    clearBtn.style.display = "none";
    searchInput.focus();
  });

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
   👥 CARGAR USUARIOS
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
    document.body.innerHTML = "<p>Acceso no autorizado</p>";
  }
}

/* ===============================
   🔍 FILTRAR USUARIOS
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
  if (filteredUsers.length === 0) {
    noResultsDiv.style.display = "block";
  } else {
    noResultsDiv.style.display = "none";
  }
}

function updateResultsCount(count) {
  const resultsSpan = document.getElementById("resultsCount");
  if (resultsSpan) {
    resultsSpan.textContent = count;
  }
}

/* ===============================
   🧩 RENDER USUARIOS
=============================== */
function renderUsers(users) {
  const container = document.getElementById("usersContainer");
  if (!container) return;
  
  container.innerHTML = "";

  users.forEach(user => {
    const isSubscribed = user.subscription?.isActive === true;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

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

        <div class="user-actions d-flex flex-wrap gap-2">
          <button class="mail-btn" onclick="sendMail('${user._id}', '${user.email}')">
            ✉️ Enviar mail
          </button>

          <button class="btn btn-dark btn-sm rounded-pill px-3" onclick="viewUserTickets('${user._id}', '${fullName}')">
            🎟️ Ver Tickets
          </button>

          ${
            !isSubscribed
              ? `
                <button class="subscribe-btn" onclick="activateSubscription('${user._id}')">
                  ⭐ Marcar como suscripta
                </button>
              `
              : `
                <button class="unsubscribe-btn" onclick="deactivateSubscription('${user._id}')">
                  🚫 Dar de baja
                </button>
              `
          }
        </div>
      </div>
    `;
  });
}

/* ===============================
   🎟️ VER TICKETS DEL USUARIO (NUEVO)
=============================== */
window.viewUserTickets = async function(userId, fullName) {
  const modalBody = document.getElementById("adminTicketsModalBody");
  document.getElementById("adminTicketsModalLabel").innerText = `🎟️ Tickets de ${fullName}`;
  
  modalBody.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">Buscando historial en la base de datos...</p>
    </div>
  `;
  
  ticketsModal.show();
  
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  
  try {
    // Apuntamos al endpoint del administrador que busca pases por ID de usuario
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/tickets`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    if (!res.ok) throw new Error("Error obteniendo el listado de tickets.");
    
    const tickets = await res.json();
    
    if (!tickets || tickets.length === 0) {
      modalBody.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="fas fa-folder-open fa-2x mb-2"></i>
          <p class="mb-0">Este usuario no registra compras de pases en el sistema.</p>
        </div>
      `;
      return;
    }
    
    // Armamos una tabla limpia para mostrar los datos de sus pases guardados
    let tableHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="table-light">
            <tr>
              <th>Evento</th>
              <th>Fecha Compra</th>
              <th>Estado Pago</th>
              <th>Código Pase</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    tickets.forEach(ticket => {
      const eventName = ticket.event?.name || "Evento Eliminado/No Encontrado";
      const purchaseDate = new Date(ticket.createdAt).toLocaleDateString('es-ES');
      
      const isPaid = ticket.payment?.status === "paid" || ticket.payment?.status === "free";
      const statusBadge = isPaid 
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle">Válido</span>`
        : `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Pendiente</span>`;
        
      const usageBadge = ticket.used 
        ? `<span class="text-danger small fw-bold"><i class="fas fa-check-circle"></i> Usado</span>` 
        : `<span class="text-success small fw-bold"><i class="fas fa-ticket-alt"></i> Activo</span>`;

      tableHTML += `
        <tr>
          <td class="fw-bold">${eventName}</td>
          <td class="text-muted small">${purchaseDate}</td>
          <td>${statusBadge}</td>
          <td><code class="small text-dark">${ticket.qrCode ? ticket.qrCode.substring(0, 15) : '—'}...</code></td>
          <td>${usageBadge}</td>
        </tr>
      `;
    });
    
    tableHTML += `</tbody></table></div>`;
    modalBody.innerHTML = tableHTML;
    
  } catch (error) {
    console.error(error);
    modalBody.innerHTML = `
      <div class="alert alert-danger border-0">
        <i class="fas fa-exclamation-triangle me-2"></i> No se pudo procesar la consulta con el backend.
      </div>
    `;
  }
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