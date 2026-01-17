const API_URL = "https://api.meetandgouy.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

async function loadUsers() {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`
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

        ${
          isSubscribed
            ? `<span class="badge success">Suscripto</span>`
            : `<span class="badge warning">No suscripto</span>`
        }

        <button onclick="toggleSubscription('${user._id}', ${isSubscribed})">
          ${isSubscribed ? "Cancelar suscripción" : "Activar suscripción"}
        </button>
      </div>
    `;
  });
}

loadUsers();
