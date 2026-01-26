document.addEventListener("DOMContentLoaded", async () => {

  /* ============================
     1. INSERTAR NAVBAR
  ============================ */
  const navbarHTML = `
<nav class="navbar navbar-expand-lg navbar-light modern-navbar">
  <div class="container-fluid">

    <a class="navbar-brand" href="index.html">
      <img src="img/LOGO (1).svg" class="logo-img" alt="Logo">
    </a>

    <button class="navbar-toggler" type="button"
      data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarNav">

     <ul class="navbar-nav">
  <li class="nav-item">
    <a class="nav-link" href="explorar.html">Explorar</a>
  </li>

  <li class="nav-item">
    <a class="nav-link" href="aboutus.html">Sobre nosotras</a>
  </li>

  <li class="nav-item" id="nav-create-event" style="display:none">
    <a class="nav-link" href="createevent.html">Crear Evento</a>
  </li>

  <li class="nav-item" id="nav-users" style="display:none">
    <a class="nav-link" href="admin-users.html">Usuarios</a>
  </li>

  <!-- ✅ BENEFICIOS -->
  <li class="nav-item" id="nav-benefits">
    <a class="nav-link" href="benefits.html">Beneficios</a>
  </li>

  <li class="nav-item" id="nav-suscripcion">
    <a class="nav-link fw-semibold text-warning" href="suscripcion.html">
      ⭐ Suscribite
    </a>
  </li>
</ul>


      <div class="ms-auto d-flex align-items-center gap-2" id="nav-right"></div>

    </div>
  </div>
</nav>
`;

  const container = document.getElementById("navbar-container");
  if (!container) return;
  container.innerHTML = navbarHTML;

  const rightZone = document.getElementById("nav-right");
  rightZone.innerHTML = "";

  /* ============================
     2. VALIDAR SESIÓN REAL
  ============================ */
  const token = localStorage.getItem("token");

  // 🔓 NO LOGUEADO
  if (!token) {
    rightZone.innerHTML = `
      <a href="login.html" class="btn btn-outline-primary btn-sm">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Registro</a>
    `;
    return;
  }

  try {
    const res = await fetch("https://api.meetandgouy.com/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Token inválido");

    const user = await res.json();

    /* ============================
       3. NAV LOGUEADO
    ============================ */
    rightZone.innerHTML = `
      <span class="fw-semibold">${user.username}</span>

      <div class="dropdown">
        <a href="#" data-bs-toggle="dropdown">
          <img src="${
            user.profileImage && user.profileImage.startsWith("http")
              ? user.profileImage
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.username
                )}&background=9d26ff&color=ffffff&bold=true`
          }" class="profile-avatar" />
        </a>

        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <a class="dropdown-item" href="#" id="logoutLink">Cerrar sesión</a>
          </li>
        </ul>
      </div>
    `;

    // 👮 ADMIN / ORGANIZADORA
    if (user.isOrganizer || user.roles?.includes("admin")) {
      document.getElementById("nav-create-event").style.display = "block";
      document.getElementById("nav-users").style.display = "block";
    }

    // ⭐ OCULTAR SUSCRIPCIÓN SI ESTÁ ACTIVA
    if (user.subscription?.isActive === true) {
      const subLink = document.getElementById("nav-suscripcion");
      if (subLink) subLink.style.display = "none";
    }

    // 🚪 LOGOUT
    document.getElementById("logoutLink").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "welcome.html";
    });

  } catch (err) {
    console.warn("⚠️ Sesión inválida:", err.message);
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");

    rightZone.innerHTML = `
      <a href="login.html" class="btn btn-outline-primary btn-sm">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Registro</a>
    `;
  }
});
