const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // 🔐 No logueado
  if (!currentUser || !currentUser.token) {
    window.location.href = "login.html";
    return;
  }

  // ⛔ Solo organizadoras
  if (!currentUser.isOrganizer) {
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

    if (!res.ok) {
      throw new Error("No autorizado");
    }

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
    container.innerHTML += `
      <div class="user-card">
        <div class="user-header">
          <h3>${user.username}</h3>
          <span class="badge ${user.isVerified ? "success" : "warning"}">
            ${user.isVerified ? "Verificada" : "No verificada"}
          </span>
        </div>

        <p><strong>📧 Email:</strong> ${user.email}</p>
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

        <button
          class="mail-btn"
          onclick="sendMail('${user._id}', '${user.email}')"
        >
          ✉️ Enviar mail
        </button>
      </div>
    `;
  });
  function sendMail(userId, email) {
  if (!confirm(`¿Enviar mail de suscripción a ${email}?`)) return;

  console.log("Enviar mail a:", userId);

  // más adelante acá llamamos a tu endpoint real
  alert("📧 Mail enviado correctamente (simulado)");
}

}
