document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     1. INSERTAR NAVBAR
  ============================ */
  const navbarHTML = `
<nav class="navbar navbar-expand-lg navbar-light modern-navbar">
  <div class="container-fluid">

    <!-- LOGO -->
    <a class="navbar-brand d-flex align-items-center" href="index.html">
      <img src="img/LOGO (1).svg" class="logo-img" alt="Logo">
    </a>

    <button class="navbar-toggler" type="button"
      data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarNav">

      <!-- LINKS IZQUIERDA -->
      <ul class="navbar-nav">
        <li class="nav-item">
          <a class="nav-link" href="explorar.html">Explorar</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="aboutus.html">Sobre la App</a>
        </li>
        <li class="nav-item" id="nav-my-events" style="display:none">
          <a class="nav-link" href="myevents.html">Mis eventos</a>
        </li>
        <li class="nav-item" id="nav-create-event" style="display:none">
          <a class="nav-link" href="createevent.html">Crear Evento</a>
        </li>
      </ul>

      <!-- DERECHA -->
      <div class="ms-auto d-flex align-items-center gap-2">

        <!-- NO LOGUEADO -->
        <div id="guest-zone" class="d-flex gap-2">
          <a href="login.html" class="btn btn-outline-primary btn-sm">Login</a>
          <a href="register.html" class="btn btn-primary btn-sm">Registro</a>
        </div>

        <!-- LOGUEADO -->
        <div id="auth-zone" class="d-flex align-items-center gap-3" style="display:none">
          <span id="username" class="fw-semibold"></span>

          <div class="dropdown">
            <a href="#" data-bs-toggle="dropdown" aria-expanded="false">
              <img id="avatar-nav"
                   src="img/default-user.png"
                   class="profile-avatar"
                   alt="avatar">
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <a class="dropdown-item" href="my-profile.html">Mi perfil</a>
              </li>
              <li>
                <a class="dropdown-item" href="#" id="logoutLink">Cerrar sesión</a>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  </div>
</nav>
`;

  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) navbarContainer.innerHTML = navbarHTML;

  /* ============================
     2. ESTADO DE AUTENTICACIÓN
  ============================ */
  let currentUser = null;

  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {
    localStorage.removeItem("currentUser");
  }

  const guestZone = document.getElementById("guest-zone");
  const authZone = document.getElementById("auth-zone");

  // FORZAR ESTADO VISUAL
  guestZone.style.display = "flex";
  authZone.style.display = "none";

  if (!currentUser || !currentUser.username) {
    return;
  }

  /* ============================
     3. USUARIO LOGUEADO
  ============================ */
  guestZone.style.display = "none";
  authZone.style.display = "flex";

  document.getElementById("username").textContent = currentUser.username;

  document.getElementById("avatar-nav").src = currentUser.profileImage
    ? `http://localhost:5000${currentUser.profileImage}`
    : "img/default-user.png";

  document.getElementById("nav-my-events").style.display = "block";

  if (
    currentUser.isOrganizer === true ||
    currentUser.role === "organizer" ||
    currentUser.role === "admin"
  ) {
    document.getElementById("nav-create-event").style.display = "block";
  }

  /* ============================
     4. LOGOUT
  ============================ */
  document.getElementById("logoutLink").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "welcome.html";
  });

});
