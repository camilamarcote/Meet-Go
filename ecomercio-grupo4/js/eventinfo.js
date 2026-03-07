const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

// 🔐 TOKEN ÚNICO (MISMA LÓGICA QUE EXPLORAR)
const token = localStorage.getItem("token");

/* =============================
   👤 USUARIO ACTUAL
============================= */
async function loadCurrentUser() {
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
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
    const authUser = await loadCurrentUser();

    const res = await fetch(`${API_URL}/api/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Evento no encontrado");
    }

    const event = await res.json();

    const image =
      event.image && event.image.startsWith("http")
        ? event.image
        : getCategoryImage(event.category);

    const isLogged = !!token;

    const isRegistered =
      !!authUser && event.participants?.includes(authUser._id);

    const isSubscribed = authUser?.subscription?.isActive === true;

    const isFull =
      event.capacity && event.participants?.length >= event.capacity;

    let actionSection = "";

    /* =============================
       🚫 NO LOGUEADA
    ============================= */
    if (!isLogged) {

      actionSection = `
        <div class="alert alert-info mt-4">
          Para unirte al evento necesitás iniciar sesión.
        </div>

        <a href="login.html" class="btn btn-primary w-100">
          Iniciar sesión
        </a>
      `;

    }

    /* =============================
       ✅ YA REGISTRADA
    ============================= */
    else if (isRegistered) {

      actionSection = `
        <div class="alert alert-success mt-4">
          ✅ Ya estás inscripta a este evento
        </div>
      `;

    }

    /* =============================
       🚫 EVENTO LLENO
    ============================= */
    else if (isFull) {

      actionSection = `
        <div class="alert alert-danger mt-4">
          ⚠️ Este evento ya alcanzó su capacidad máxima.
        </div>
      `;

    }

    /* =============================
       👤 USUARIA NORMAL
    ============================= */
    else {

      actionSection = `
        <button
          class="btn btn-success w-100 mt-3"
          onclick="showEventJoinInfo()"
        >
          🙋‍♀️ Unirme al evento
        </button>

        <div
          id="joinInfo"
          class="mt-3"
          style="display:none; border:1px solid #ccc; padding:15px; border-radius:5px; background:#f9f9f9;"
        >

          ${
            isSubscribed
              ? `
                <p>📌 Grupo de WhatsApp del evento:</p>

                ${
                  event.whatsappLink
                    ? `
                      <a href="${event.whatsappLink}" target="_blank" class="btn btn-success w-100">
                        👉 Unirme al grupo
                      </a>
                    `
                    : `
                      <p>El enlace al grupo se publicará pronto.</p>
                    `
                }

              `
              : `
                <p style="color:red; font-weight:bold;">
                  ⚠️ El grupo de WhatsApp es exclusivo para usuarios suscriptos.
                </p>

                <a href="suscripcion.html" class="btn btn-warning w-100">
                  Quiero suscribirme
                </a>
              `
          }

        </div>
      `;
    }

    /* =============================
       🧱 RENDER
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
            <li>⏰ ${event.time || "Horario a confirmar"}</li>
            <li>🎯 ${event.category}</li>
            ${
              event.capacity
                ? `<li>👥 Cupos: ${event.participants?.length || 0} / ${event.capacity}</li>`
                : ""
            }
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
   🖥️ MOSTRAR INFO DE UNIÓN
============================= */
function showEventJoinInfo() {
  const joinDiv = document.getElementById("joinInfo");

  if (joinDiv) {
    joinDiv.style.display =
      joinDiv.style.display === "none" ? "block" : "none";

    joinDiv.scrollIntoView({
      behavior: "smooth"
    });
  }
}