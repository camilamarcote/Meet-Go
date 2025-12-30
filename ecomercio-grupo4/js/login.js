console.log("login.js cargado");

const API_URL = "https://meetgo-backend.onrender.com";

const loginForm = document.getElementById("loginForm");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const res = await fetch(`${API_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: loginUser.value,
        password: loginPass.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return alert(data.message || "Error al iniciar sesión");
    }

    const smallUser = {
      id: data.user._id,
      username: data.user.username,
      email: data.user.email,
      profileImage: data.user.profileImage || "",
      isOrganizer: data.user.isOrganizer === true
    };

    localStorage.setItem("currentUser", JSON.stringify(smallUser));

    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Error login:", error);
    alert("No se pudo conectar con el servidor");
  }
});
