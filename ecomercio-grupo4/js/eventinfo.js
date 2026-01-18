const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

// 🔑 sesión SOLO por token (para registrar si están logueados)
const storedUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let authUser = null;

/* =============================
   👤 USUARIO ACTUAL (BACKEND)
============================= */
async function loadCurrentUser() {
  if (!storedUser?.token) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${storedUser.token}`
      }
    });

    if (!res.ok) return null;
    return await res.json();

  } catch (err) {
    console.error("❌ Error cargando usuario:", err);
    return null;
  }
}

/* =============================
   🖼️ CATEGORÍAS
============================= */
function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

/* =============================
   📄 EVENTO
============================= */
async function loadEventInfo() {
  if (!eventId) {
    eventDetails.innerHTML = "<p>Evento no válido</p>";
    return;
  }

  try {
    // 👤 usuario REAL (si hay token)
    authUser = await loadCurrentUser();

    const res = await fetch(`${API_URL}/api/events/${eventId}`);
    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const image =
      event.image && event.image.startsWith("http")
        ? event.image
        : getCategoryImage(event.category);

    /* =============================
       🔐 LÓGICA DE ACCIÓN: TODOS PUEDEN VER BOTÓN
    ============================= */
    let actionSection = "";

    const isLogged = !!storedUser?.token;
    const isRegistered =
      !!authUser && event.participants?.includes(authUser._id);

    if (!isLogged) {
      actionSection = `
        <div class="alert alert-info mt-4">
          Para unirte al evento necesitás iniciar sesión.
        </div>
        <a href="login.html" class="btn btn-primary w-100">
          Iniciar sesión
        </a>
      `;
    } else if (isRegistered) {
      actionSection = `
        <div class="alert alert-success mt-4">
          ✅ Ya estás inscripta a este evento
        </div>
      `;
    } else {
      // ✅ BOTÓN VISIBLE PARA TODOS LOS USUARIOS LOGUEADOS
      actionSection = `
        <button
          class="btn btn-success w-100 mt-3"
          onclick="registerToEvent()"
        >
          🙋‍♀️ Unirme al evento
        </button>
      `;
    }

    /* =============================
       🖼️ RENDER
    ============================= */
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
    if (!storedUser?.token) {
      alert("Tenés que iniciar sesión");
      return;
    }

    const res = await fetch(
      `${API_URL}/api/events/${eventId}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storedUser.token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Error al inscribirse");
    }

    alert("🎉 Te uniste correctamente al evento.");
    loadEventInfo(); // refresca estado

  } catch (error) {
    console.error("❌ Error inscripción:", error);
    alert("No se pudo completar la inscripción");
  }
}
