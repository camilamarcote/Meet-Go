const passwordInput = document.getElementById("loginPass");
const togglePasswordBtn = document.getElementById("togglePassword");

/* 👁️ Mostrar / ocultar password */
togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
});

/* ✅ Mensajes post-verificación (viene del backend) */
const params = new URLSearchParams(window.location.search);

if (params.get("verified") === "true") {
  alert("✅ Cuenta verificada correctamente. Ya podés iniciar sesión.");
}

if (params.get("verified") === "error") {
  alert("❌ El enlace de verificación es inválido o expiró.");
}

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

    // 🚀 Redirección final
    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Error de conexión:", error);
    alert("No se pudo conectar con el servidor");
  }
});
