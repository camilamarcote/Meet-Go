// =============================
// 🌐 API BASE (DOMINIO PRODUCCIÓN)
// =============================
const API_URL = "https://api.meetandgouy.com";

// =============================
// 📌 Parámetros
// =============================
const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// =============================
// 🖼️ Imagen por categoría
// =============================
function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

// =============================
// 📄 Cargar info del evento
// =============================
async function loadEventInfo() {
  if (!eventId) {
    eventDetails.innerHTML = "<p>Evento no válido</p>";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}`);
    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const image =
      event.image && event.image.startsWith("http")
        ? event.image
        : getCategoryImage(event.category);

    let actionSection = "";

    if (!authUser) {
      actionSection = `
        <div class="alert alert-info mt-4">
          Para participar de este evento necesitás una suscripción activa.
        </div>
        <a href="login.html" class="btn btn-primary w-100">
          Iniciar sesión
        </a>
      `;
    } else {
      actionSection = `
        <div class="card border-warning mt-4">
          <div class="card-body text-center">
            <h5 class="card-title">⭐ Acceso por suscripción</h5>
            <p class="card-text text-muted" style="font-size:14px">
              Suscribite para poder acceder a todas las actividades de Meet&Go
            </p>
            <a href="suscripcion.html" class="btn btn-warning w-100">
              Sucribite
            </a>
          </div>
        </div>
      `;
    }

    eventDetails.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <img src="${image}" class="img-fluid rounded">
        </div>

        <div class="col-md-6">
          <h2>${event.name}</h2>
          <p>${event.description || ""}</p>

          <ul class="list-unstyled mt-3">
            <li>📍 ${event.department || "A confirmar"}</li>
            <li>📅 ${event.date}</li>
            <li>⏰ ${event.time}</li>
            <li>🎯 ${event.category}</li>
          </ul>

          <hr>
          ${actionSection}
        </div>
      </div>
    `;

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    eventDetails.innerHTML = "<p>Error cargando evento</p>";
  }
}

loadEventInfo();
