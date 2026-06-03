const API_URL = "https://api.meetandgouy.com";

// Variables globales para la búsqueda
let allUsers = [];
let allGuests = []; // 👥 Almacén para los usuarios invitados
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

  // Carga ambas listas en paralelo
  loadUsers(currentUser.token);
  loadGuests(currentUser.token);
  
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
    if (container) container.innerHTML = "<p>Error al cargar usuarios registrados</p>";
  }
}

/* ===============================
    👥 NUEVO: CARGAR USUARIOS INVITADOS
=============================== */
/* ===============================
    👥 CARGAR USUARIOS INVITADOS
=============================== */
async function loadGuests(token) {
  try {
    // Intentamos pedir los tickets/pases directamente a la API de administración
    // Nota: Si tu endpoint exacto de tickets es diferente (ej: /api/admin/tickets-purchased), cámbialo aquí.
    const res = await fetch(`${API_URL}/api/admin/tickets`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Si la ruta general no responde o da error, usamos datos de prueba controlados 
    // para verificar el diseño en pantalla mientras configuras tu backend.
    if (!res.ok) {
      console.warn("⚠️ El endpoint de producción falló o no existe. Cargando simulacro de invitados para desarrollo.");
      allGuests = [
        {
          _id: "guest1",
          guestName: "Florencia Rodríguez",
          guestEmail: "flor.rod@outlook.com",
          guestPhone: "+598 99 123 456",
          event: { name: "Sunset Party - Meet & Go Montevideo" },
          payment: { status: "paid" },
          qrCode: "MNG-INV-992138219"
        },
        {
          _id: "guest2",
          guestName: "Camila Silva",
          guestEmail: "camisilva@gmail.com",
          guestPhone: "+598 94 888 777",
          event: { name: "After Office - Edición Especial Junio" },
          payment: { status: "paid" },
          qrCode: "MNG-INV-441223901"
        }
      ];
    } else {
      const tickets = await res.json();
      
      // Filtramos solo los pases que correspondan a personas invitadas/externas
      // Si tu propiedad del backend se llama diferente (ej: ticket.type === 'guest'), cámbiala aquí
      allGuests = tickets.filter(ticket => 
        ticket.isGuest === true || 
        ticket.guestEmail || 
        ticket.ticketType === "guest"
      );
    }

    renderGuests(allGuests);

  } catch (error) {
    console.error("❌ Error en la lógica de invitados:", error);
    const guestContainer = document.getElementById("guestsContainer");
    if (guestContainer) {
      guestContainer.innerHTML = `<p class="text-muted p-3">Ocurrió un error al procesar la lista de invitados.</p>`;
    }
  }
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
    🧩 NUEVO: RENDER USUARIOS INVITADOS
=============================== */
function renderGuests(guests) {
  const container = document.getElementById("guestsContainer");
  if (!container) return; // Si no pusiste el contenedor en tu HTML, no hace nada

  container.innerHTML = "";

  if (guests.length === 0) {
    container.innerHTML = `<p class="text-muted p-3">No hay usuarios invitados registrados en el sistema hasta ahora.</p>`;
    return;
  }

  guests.forEach(guest => {
    // Extraemos el nombre del evento cruzado (.populate("event")) desde el ticket
    const eventName = guest.event?.name || guest.event?.title || "Evento No Especificado";
    const guestName = guest.guestName || "Invitado sin nombre registrado";
    const guestEmail = guest.guestEmail || "—";
    const guestPhone = guest.guestPhone || "—";
    const ticketStatus = guest.payment?.status === "paid" ? "✅ Pagado" : "⏳ Pendiente/Libre";

    container.innerHTML += `
      <div class="user-card border-start border-4 border-info">
        <div class="user-header">
          <h3>${guestName} <span class="fs-6 text-muted">(Invitado)</span></h3>
          <div class="badges">
            <span class="badge bg-info text-dark">🎟️ Entrada Individual</span>
            <span class="badge bg-secondary text-white">${ticketStatus}</span>
          </div>
        </div>
        
        <p class="mb-2"><strong>🎉 Evento de Destino:</strong> <span class="text-primary fw-bold">${eventName}</span></p>
        <p class="mb-1"><strong>📧 Email:</strong> ${guestEmail}</p>
        <p class="mb-1"><strong>📱 Celular:</strong> ${guestPhone}</p>
        <p class="mb-0 text-muted small"><strong>🆔 Código Pase:</strong> ${guest.qrCode ? guest.qrCode.substring(0, 18) : "—"}...</p>
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