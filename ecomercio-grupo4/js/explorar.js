const API_URL = "https://api.meetandgouy.com";

// ============================
// 🔐 TOKEN (OPCIONAL)
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
// 🔒 MODAL PERFIL
// ============================
function showProfileModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.remove("hidden");
}

function goToProfile() {
  window.location.href = "complete-profile.html";
}

// ============================
// 📅 CARGAR EVENTOS (PÚBLICO)
// ============================
async function loadEvents() {
  try {
    // Configurar headers - si hay token lo enviamos
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/events`, {
      headers: headers,
    });

    // Verificar si la respuesta es exitosa
    if (!res.ok) {
      // Si hay error 403 (perfil incompleto) y el usuario está autenticado
      if (res.status === 403 && token) {
        const data = await res.json();
        if (data.code === "PROFILE_INCOMPLETE") {
          showProfileModal();
          // Aún así, intentamos cargar eventos (el backend debería devolverlos igual)
          // Por ahora mostramos mensaje
          eventsContainer.innerHTML = `
            <div class="col-12 text-center">
              <div class="alert alert-warning">
                <h4>📝 Completa tu perfil</h4>
                <p>Para ver todos los detalles y participar en eventos, completa tu perfil de experiencia.</p>
                <button onclick="goToProfile()" class="btn btn-primary mt-2">
                  Completar perfil ahora
                </button>
              </div>
              <p class="text-muted">Mientras tanto, puedes ver los eventos disponibles.</p>
            </div>
          `;
          
          // Intentar cargar eventos públicos de todas formas
          try {
            const publicRes = await fetch(`${API_URL}/api/events`, {
              headers: headers,
            });
            if (publicRes.ok) {
              const events = await publicRes.json();
              renderEvents(events);
              return;
            }
          } catch (e) {
            console.error("Error cargando eventos después del modal:", e);
          }
          return;
        }
      }
      
      throw new Error(`Error al cargar eventos: ${res.status}`);
    }

    const events = await res.json();
    renderEvents(events);

  } catch (err) {
    console.error("❌ Error cargando eventos:", err);
    eventsContainer.innerHTML = `
      <div class="col-12 text-center">
        <div class="alert alert-danger">
          <p>❌ No se pudieron cargar los eventos en este momento.</p>
          <p class="mb-0">Por favor, intenta más tarde.</p>
        </div>
      </div>
    `;
  }
}

// ============================
// 🎨 RENDERIZAR EVENTOS
// ============================
function renderEvents(events) {
  eventsContainer.innerHTML = "";

  if (!events || events.length === 0) {
    eventsContainer.innerHTML = `
      <div class="col-12 text-center">
        <div class="alert alert-info">
          <p class="mb-0">📭 No hay eventos disponibles por el momento.</p>
          <p class="small mt-2">¡Vuelve pronto para descubrir nuevas experiencias!</p>
        </div>
      </div>
    `;
    return;
  }

  events.forEach(event => {
    const isSelected = event._id === selectedEventId;
    
    // Formatear fecha
    const formattedDate = event.date ? new Date(event.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : 'Fecha por confirmar';
    
    // Formatear precio
    const priceText = event.price === 0 ? 'Gratis' : `$${event.price}`;

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
            ${event.time ? `<p class="mb-2 text-muted small">⏰ ${event.time}</p>` : ''}
            
            <p class="mb-2"><strong>💰 ${priceText}</strong></p>
            
            ${event.description ? `<p class="small text-muted mb-3">${escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '...' : ''}</p>` : ''}
            
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
// 🔍 BÚSQUEDA DE EVENTOS (OPCIONAL)
// ============================
function setupSearch() {
  const searchInput = document.getElementById("searchEvents");
  if (!searchInput) return;
  
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll("#eventsContainer .col-md-4");
    
    cards.forEach(card => {
      const title = card.querySelector(".card-title")?.textContent.toLowerCase() || "";
      const description = card.querySelector(".small.text-muted")?.textContent.toLowerCase() || "";
      const category = card.querySelector(".text-muted.small")?.textContent.toLowerCase() || "";
      
      if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });
}

// ============================
// 🚀 INIT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  setupSearch();
  
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