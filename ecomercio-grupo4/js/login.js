const passwordInput = document.getElementById("loginPass");
const togglePasswordBtn = document.getElementById("togglePassword");

/* 👁️ Mostrar / ocultar password */
togglePasswordBtn.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

/* 🔐 LOGIN */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("loginUser").value.trim();
  const password = passwordInput.value;

  if (!user || !password) {
    alert("Completá todos los campos");
    return;
  }

  try {
    const response = await fetch(
      "https://meetgo-backend.onrender.com/api/users/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      }
    );

    // ⚠️ Si NO es JSON (404, HTML, etc)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Respuesta inválida del servidor");
    }

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Error al iniciar sesión");
      return;
    }

    // ✅ Guardamos sesión
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        token: data.token,
        id: data.user._id,
        username: data.user.username,
        profileImage: data.user.profileImage
      })
    );

    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Login error:", error);
    alert("Error de conexión con el servidor");
  }
});
