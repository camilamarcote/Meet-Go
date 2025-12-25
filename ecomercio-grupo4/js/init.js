document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     1. INSERTAR NAVBAR DINÁMICA
  ============================= */
  const navbarHTML = `
<nav class="navbar navbar-expand-lg navbar-light modern-navbar">
  <div class="container-fluid">

    <!-- LOGO -->
    <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
      <img src="img/LOGO (1).svg" class="logo-img" alt="Logo">
    </a>

    <button class="navbar-toggler custom-toggler" type="button"
      data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse justify-content-between" id="navbarNav">

      <!-- LINKS -->
      <ul class="navbar-nav main-links">
        <li class="nav-item">
          <a class="nav-link" href="explorar.html">Explorar</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="aboutus.html">Sobre la App</a>
        </li>
        <li class="nav-item" id="nav-create-event" style="display:none">
          <a class="nav-link" href="createevent.html">Crear Evento</a>
        </li>
      </ul>

      <!-- PERFIL -->
      <div class="profile-zone d-flex align-items-center gap-3">
        <span id="username" class="fw-semibold username-text"></span>

        <div class="dropdown">
          <a class="d-flex align-items-center" href="#" data-bs-toggle="dropdown">
            <img id="avatar-nav" src="img/default-user.png"
                 class="profile-avatar" alt="avatar">
          </a>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li><a class="dropdown-item" href="my-profile.html">Mi perfil</a></li>
            <li><a class="dropdown-item" href="#" id="logoutLink">Cerrar sesión</a></li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</nav>
`;

  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) navbarContainer.innerHTML = navbarHTML;

  /* ============================
        2. AUTENTICACIÓN
  ============================= */
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const currentPage = window.location.pathname.split("/").pop();

  const pagesWithoutLogin = [
    "welcome.html",
    "login.html",
    "register.html",
    "index.html"
  ];

  if (!currentUser && !pagesWithoutLogin.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  /* ============================
     3. MOSTRAR DATOS + PERMISOS
  ============================= */
  if (currentUser) {
    const usernameSpan = document.getElementById("username");
    const avatarImg = document.getElementById("avatar-nav");
    const navCreateEvent = document.getElementById("nav-create-event");

    if (usernameSpan) {
      usernameSpan.textContent = currentUser.username;
    }

    if (avatarImg) {
      avatarImg.src = currentUser.profileImage
        ? `http://localhost:5000${currentUser.profileImage}`
        : "img/default-user.png";
    }

    // ✅ MOSTRAR "CREAR EVENTO" SI ES ORGANIZADOR O ADMIN
    if (
      navCreateEvent &&
      (
        currentUser.isOrganizer === true ||
        currentUser.role === "organizer" ||
        currentUser.role === "admin"
      )
    ) {
      navCreateEvent.style.display = "block";
    }
  }

  /* ============================
     4. LOGOUT
  ============================= */
  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "welcome.html";
    });
  }

});
