const API_URL = "https://api.meetandgouy.com";

// Variables globales para la búsqueda
let allUsers = [];
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

  // Evento de búsqueda en tiempo real
  searchInput.addEventListener("input", (e) => {
    filterUsers(e.target.value, currentFilter);
    clearBtn.style.display = e.target.value ? "flex" : "none";
  });

  // Botón para limpiar búsqueda
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterUsers("", currentFilter);
    clearBtn.style.display = "none";
    searchInput.focus();
  });

  // Filtros por categoría
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Actualizar estado activo de los botones
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Actualizar filtro actual
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
  
  // Aplicar filtro por categoría
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
      // "all" - no filtrar por categoría
      break;
  }
  
  // Aplicar búsqueda por texto si hay término de búsqueda
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase().trim();
    filteredUsers = filteredUsers.filter(user => {
      // Buscar en múltiples campos
      const searchableFields = [
        user.firstName,
        user.lastName,
        user.username,
        user.email,
        user.nationality,
        user.phone,
        ...(user.interests || []),
      ];
      
      // Verificar si algún campo contiene el término de búsqueda
      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(term)
      );
    });
  }
  
  // Actualizar contador de resultados
  updateResultsCount(filteredUsers.length);
  
  // Renderizar usuarios filtrados
  renderUsers(filteredUsers);
  
  // Mostrar/ocultar mensaje de no resultados
  const noResultsDiv = document.getElementById("noResults");
  if (filteredUsers.length === 0) {
    noResultsDiv.style.display = "block";
  } else {
    noResultsDiv.style.display = "none";
  }
}

/* ===============================
   📊 ACTUALIZAR CONTADOR DE RESULTADOS
=============================== */
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
    const fullName = `${user.firstName} ${user.lastName}`.trim();


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
          <button
            class="mail-btn"
            onclick="sendMail('${user._id}', '${user.email}')"
          >
            ✉️ Enviar mail
          </button>

          ${
            !isSubscribed
              ? `
                <button
                  class="subscribe-btn"
                  onclick="activateSubscription('${user._id}')"
                >
                  ⭐ Marcar como suscripta
                </button>
              `
              : `
                <button
                  class="unsubscribe-btn"
                  onclick="deactivateSubscription('${user._id}')"
                >
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
   ⭐ ACTIVAR SUSCRIPCIÓN
=============================== */
async function activateSubscription(userId) {
  if (!confirm("¿Marcar este usuario como suscripta?")) return;

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  try {
    const res = await fetch(
      `${API_URL}/api/admin/activate-subscription/${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error activando suscripción");
    }

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
    const res = await fetch(
      `${API_URL}/api/admin/deactivate-subscription/${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error dando de baja suscripción");
    }

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
    const res = await fetch(
      `${API_URL}/api/admin/send-subscription-mail/${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error enviando mail");
    }

    alert("📧 Mail enviado correctamente");

  } catch (error) {
    console.error("❌ Error enviando mail:", error);
    alert("Error al enviar el mail");
  }
}