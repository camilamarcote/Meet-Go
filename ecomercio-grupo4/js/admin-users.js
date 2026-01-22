const API_URL = "https://api.meetandgouy.com";

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
});

async function loadUsers(token) {
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("No autorizado");

    const users = await res.json();
    renderUsers(users);

  } catch (error) {
    console.error("❌ Error cargando usuarios:", error);
    document.body.innerHTML = "<p>Acceso no autorizado</p>";
  }
}

function renderUsers(users) {
  const container = document.getElementById("usersContainer");
  container.innerHTML = "";

  users.forEach(user => {
    const isSubscribed = user.subscription?.isActive === true;

    container.innerHTML += `
      <div class="user-card">
        <div class="user-header">
          <h3>${user.username}</h3>

          <div class="badges">
            <span class="badge ${user.isVerified ? "success" : "warning"}">
              ${user.isVerified ? "Verificada" : "No verificada"}
            </span>

            <span class="badge ${isSubscribed ? "success" : "neutral"}">
              ${isSubscribed ? "⭐ Suscripta" : "Sin suscripción"}
            </span>
          </div>
        </div>

        <p><strong>📧 Email:</strong> ${user.email}</p>
        <p><strong>📱 Celular:</strong> ${user.phone ?? "—"}</p>
        <p><strong>🎂 Edad:</strong> ${user.age ?? "—"}</p>
        <p><strong>🌎 Nacionalidad:</strong> ${user.nationality ?? "—"}</p>

        <p>
          <strong>👮 Rol:</strong>
          <span class="badge admin">
            ${user.isOrganizer ? "Organizadora" : "Usuaria"}
          </span>
        </p>

        <p><strong>⭐ Intereses:</strong><br>
          ${user.interests?.length ? user.interests.join(", ") : "—"}
        </p>

        <p><strong>🗣️ Idiomas:</strong><br>
          ${user.languages?.length ? user.languages.join(", ") : "—"}
        </p>

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
              : ""
          }
        </div>
      </div>
    `;
  });
}

/* ===============================
   ⭐ ACTIVAR SUSCRIPCIÓN MANUAL
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

    // 🔄 recargar estado real desde backend
    loadUsers(currentUser.token);

  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error activando suscripción");
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
