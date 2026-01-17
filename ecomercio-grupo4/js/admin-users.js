const API_URL = "https://api.meetandgouy.com";

// 🔐 obtener usuario real
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || !currentUser.token) {
  window.location.href = "login.html";
}

// ⛔ solo organizadoras
if (!currentUser.user?.isOrganizer) {
  document.body.innerHTML = "<h2>Acceso restringido</h2>";
  throw new Error("No autorizado");
}

async function loadUsers() {
  try {
    const res = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });

    if (!res.ok) {
      document.body.innerHTML = "<p>Acceso no autorizado</p>";
      return;
    }

    const users = await res.json();
    renderUsers(users);

  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}

function renderUsers(users) {
  const container = document.getElementById("usersContainer");
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

        <button onclick="toggleSubscription('${user._id}', ${isSubscribed})">
          ${isSubscribed ? "Cancelar suscripción" : "Activar suscripción"}
        </button>
      </div>
    `;
  });
}

loadUsers();
