const passwordInput = document.getElementById("loginPass");
const togglePasswordBtn = document.getElementById("togglePassword");
const eyeIcon = togglePasswordBtn.querySelector("i");

/* 👁️ Mostrar / ocultar password */
togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  eyeIcon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
});

/* 🔐 LOGIN */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("loginUser").value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch(
      "https://meetgo-backend.onrender.com/api/users/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Error al iniciar sesión");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(data.user));
    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Error en login frontend:", error);
    alert("Error de conexión con el servidor");
  }
});
