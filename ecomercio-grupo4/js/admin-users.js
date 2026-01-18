const API_URL = "https://api.meetandgouy.com";

// ⚠️ ACA estaba el error
const currentUser = JSON.parse(localStorage.getItem("user"));

if (!currentUser || !currentUser.token) {
  window.location.href = "login.html";
}

// ⛔ solo organizadoras
if (!currentUser.isOrganizer) {
  document.body.innerHTML = "<h2>Acceso restringido</h2>";
  throw new Error("No autorizado");
}

async function loadUsers() {
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
      </div>
    `;
  });
}

loadUsers();
