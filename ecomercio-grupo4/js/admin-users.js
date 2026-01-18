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

  if (!container) {
    console.error("❌ usersContainer no existe en el HTML");
    return;
  }

  container.innerHTML = "";

  users.forEach(user => {
    const isSubscribed = user.subscription?.isActive;

    container.innerHTML += `
      <div class="card">
        <h3>${user.username}</h3>
        <p>${user.email}</p>

        <span class="badge ${isSubscribed ? "success" : "warning"}">
          ${isSubscribed ? "Suscripta" : "No suscripta"}
        </span>
      </div>
    `;
  });
}
