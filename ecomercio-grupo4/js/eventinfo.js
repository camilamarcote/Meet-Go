const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

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

    /* =============================
       🔐 LÓGICA DE ACCIÓN
    ============================== */

    let actionSection = "";

    const isLogged = !!authUser;
    const isSubscribed = authUser?.subscription?.isActive === true;
    const isRegistered = event.participants?.includes(authUser?._id);

    if (!isLogged) {
      actionSection = `
        <div class="alert alert-info mt-4">
          Para inscribirte necesitás iniciar sesión.
        </div>
        <a href="login.html" class="btn btn-primary w-100">
          Iniciar sesión
        </a>
      `;
    }

    else if (!isSubscribed) {
      actionSection = `
        <div class="alert alert-warning mt-4">
          Tenés que suscribirte para poder inscribirte a este evento.
        </div>
        <a href="suscripcion.html" class="btn btn-warning w-100">
          Suscribite
        </a>
      `;
    }

    else if (isRegistered) {
      actionSection = `
        <div class="alert alert-success mt-4">
          ✅ Ya estás inscripta a este evento
        </div>
      `;
    }

    else {
      actionSection = `
        <button
          class="btn btn-success w-100 mt-3"
          onclick="registerToEvent()"
        >
          🙋‍♀️ Inscribirme
        </button>
      `;
    }

    /* =============================
       🖼️ RENDER
    ============================== */

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

/* =============================
   📝 INSCRIPCIÓN
============================= */
async function registerToEvent() {
  try {
    const res = await fetch(
      `${API_URL}/api/events/${eventId}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authUser.token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error al inscribirse");
    }

    alert("🎉 Te inscribiste correctamente. Revisá tu mail 📧");
    loadEventInfo(); // refresca estado

  } catch (error) {
    console.error("❌ Error inscripción:", error);
    alert("No se pudo completar la inscripción");
  }
}
