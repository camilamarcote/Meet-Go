const API_URL = "https://api.meetandgouy.com";

// ============================
// 🔐 TOKEN (OPCIONAL AHORA)
// ============================
const token = localStorage.getItem("token");
console.log("TOKEN EN EXPLORAR:", token ? "Presente" : "No hay token");

// ============================
// 📍 EVENTO SELECCIONADO
// ============================
const params = new URLSearchParams(window.location.search);
const selectedEventId = params.get("eventId");

// ============================
// 📦 CONTENEDOR
// ============================
const eventsContainer = document.getElementById("eventsContainer");

// ============================
// 🔒 MODAL PERFIL (SOLO PARA USUARIOS AUTENTICADOS)
// ============================
function showProfileModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.remove("hidden");
}

function goToProfile() {
  window.location.href = "complete-profile.html";
}

// ============================
// 📅 CARGAR EVENTOS (USANDO ENDPOINT PÚBLICO)
// ============================
async function loadEvents() {
  try {
    // Usar el nuevo endpoint público que no requiere autenticación
    const res = await fetch(`${API_URL}/api/events/public/all`);
    
    if (!res.ok) {
      throw new Error(`Error al cargar eventos: ${res.status}`);
    }

    const events = await res.json();
    eventsContainer.innerHTML = "";

    if (!events.length) {
      eventsContainer.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-muted">
            📭 No hay eventos disponibles por el momento.
          </p>
          <p class="small text-muted">
            ¡Vuelve pronto para descubrir nuevas experiencias!
          </p>
        </div>
      `;
      return;
    }

    events.forEach(event => {
      const isSelected = event._id === selectedEventId;
      
      // Formatear fecha si existe
      const formattedDate = event.date ? new Date(event.date).toLocaleDateString('es-ES') : 'Fecha por confirmar';

      eventsContainer.innerHTML += `
        <div class="col-md-4 col-lg-3 mb-4">
          <div class="card h-100 shadow-sm ${isSelected ? "selected-event border-primary" : ""}">
            <img
              src="${event.image || "img/default_event.jpg"}"
              class="card-img-top"
              alt="${event.name}"
              style="height: 200px; object-fit: cover;"
              onerror="this.src='img/default_event.jpg'"
            >
            <div class="card-body d-flex flex-column">
              <h5 class="card-title mb-2">${escapeHtml(event.name)}</h5>

              ${event.category ? `<p class="mb-1 text-muted small">📂 ${escapeHtml(event.category)}</p>` : ''}
              ${event.department ? `<p class="mb-1 text-muted small">📍 ${escapeHtml(event.department)}</p>` : ''}
              <p class="mb-1 text-muted small">📅 ${formattedDate}</p>
              ${event.time ? `<p class="mb-3 text-muted small">⏰ ${event.time}</p>` : ''}

              <a
                href="eventinfo.html?id=${event._id}"
                class="btn btn-primary btn-sm mt-auto"
              >
                Ver evento
              </a>
            </div>
          </div>
        </div>
      `;
    });

    // 🧭 Scroll automático al evento seleccionado
    if (selectedEventId) {
      setTimeout(() => {
        const selectedCard = document.querySelector(".selected-event");
        if (selectedCard) {
          selectedCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
    }

  } catch (err) {
    console.error("❌ Error cargando eventos:", err);
    eventsContainer.innerHTML = `
      <div class="col-12 text-center">
        <div class="alert alert-danger">
          <p>❌ Ocurrió un error al cargar los eventos.</p>
          <p class="mb-0">Por favor, intenta más tarde.</p>
        </div>
      </div>
    `;
  }
}

// ============================
// 🔧 UTILIDAD: ESCAPAR HTML
// ============================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================
// 🚀 INIT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  
  // Mostrar banner informativo para usuarios no autenticados
  if (!token) {
    const container = document.querySelector(".container");
    if (container && !document.querySelector(".info-banner")) {
      const infoBanner = document.createElement("div");
      infoBanner.className = "alert alert-info info-banner mb-4";
      infoBanner.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <strong>✨ ¡Explora nuestros eventos!</strong> 
        Para inscribirte y participar, 
        <a href="login.html" class="alert-link">inicia sesión</a> o 
        <a href="register.html" class="alert-link">regístrate</a>.
      `;
      container.insertBefore(infoBanner, eventsContainer);
    }
  }
});