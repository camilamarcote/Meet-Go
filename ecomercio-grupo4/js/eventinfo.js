const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

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

    const user = await res.json();

    return user;

  } catch (err) {

    console.error("❌ Error cargando usuario:", err);
    return null;

  }

}

/* =============================
   💳 PAGAR EVENTO
============================= */

async function payEvent(eventId) {

  try {

    const currentUser = await loadCurrentUser();

    if (!currentUser) {

      alert("Debes iniciar sesión");

      window.location.href = "login.html";

      return;
    }

    const resTicket = await fetch(`${API_URL}/api/events/${eventId}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser._id
      })
    });

    const ticketData = await resTicket.json();

    if (!resTicket.ok) {

      alert(ticketData.message || "Error creando ticket");
      return;

    }

    const ticketId = ticketData.ticket._id;

    const resPayment = await fetch(`${API_URL}/api/payments/create/${ticketId}`, {
      method: "POST"
    });

    const paymentData = await resPayment.json();

    if (!resPayment.ok) {

      alert("Error iniciando pago");
      return;

    }

    window.location.href = paymentData.init_point;

  } catch (error) {

    console.error("❌ Error pago evento:", error);
    alert("No se pudo iniciar el pago");

  }

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

    if (!res.ok) throw new Error("Evento no encontrado");

    const event = await res.json();

    const isLogged = !!token;
    const isSubscribed = authUser?.subscription?.isActive === true;

    const price = event.price ?? 0;

    let actionSection = "";

    /* =============================
       USUARIO NO LOGUEADO
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
       USUARIO SUSCRITO
    ============================= */

    else if (isSubscribed) {

      actionSection = `
        <button class="btn btn-success w-100 mt-3" onclick="showEventJoinInfo()">
          🙋‍♀️ Unirme al evento
        </button>

        <div id="joinInfo" class="mt-3" style="display:none">

          ${
            event.whatsappLink
              ? `<a href="${event.whatsappLink}" target="_blank" class="btn btn-success w-100">
                  👉 Unirme al grupo
                </a>`
              : `<p>El enlace se publicará pronto</p>`
          }

        </div>
      `;
    }

    /* =============================
       EVENTO GRATIS
    ============================= */

    else if (price === 0) {

      actionSection = `
        <div class="mt-3">

          <div class="alert alert-success">
            🎉 Este evento es gratuito para suscriptores
          </div>

          <a href="suscripcion.html" class="btn btn-warning w-100">
            ⭐ Suscribirme para acceder
          </a>

        </div>
      `;
    }

    /* =============================
       EVENTO PAGO
    ============================= */

    else {

      actionSection = `
        <div class="mt-3">

          <button
            class="btn btn-success w-100 mb-2"
            onclick="payEvent('${event._id}')"
          >
            🎟️ Pagar este evento - $${price}
          </button>

          <a href="suscripcion.html" class="btn btn-warning w-100">
            ⭐ Suscribirme y acceder a todos los eventos
          </a>

        </div>
      `;
    }

    eventDetails.innerHTML = `

      <div class="row g-4">

        <div class="col-md-6">
          <img src="${event.image}" class="img-fluid rounded">
        </div>

        <div class="col-md-6">

          <h2>${event.name}</h2>

          <p>${event.description || ""}</p>

          <ul class="list-unstyled mt-3">
            <li>📍 ${event.department}</li>
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
   MOSTRAR INFO
============================= */

function showEventJoinInfo() {

  const joinDiv = document.getElementById("joinInfo");

  if (joinDiv) {

    joinDiv.style.display =
      joinDiv.style.display === "none" ? "block" : "none";

  }

}