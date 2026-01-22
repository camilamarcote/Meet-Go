const API_URL = "https://api.meetandgouy.com";

const passwordInput = document.getElementById("loginPass");
const togglePasswordBtn = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");

/* 👁️ Mostrar / ocultar password */
togglePasswordBtn.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

/* ✅ Mensajes post-verificación */
const params = new URLSearchParams(window.location.search);

if (params.get("verified") === "true") {
  alert("✅ Cuenta verificada correctamente. Ya podés iniciar sesión.");
}

if (params.get("verified") === "error") {
  alert("❌ El enlace de verificación es inválido o expiró.");
}

/* 🔐 LOGIN */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("loginUser").value.trim();
  const password = passwordInput.value;

  if (!user || !password) {
    alert("Completá todos los campos");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        const resend = confirm(
          "⚠️ Tu cuenta no está verificada.\n\n¿Querés que te reenviemos el email de verificación?"
        );

        if (resend) {
          await resendVerification(user);
        }
        return;
      }

      alert(data.message || "Error al iniciar sesión");
      return;
    }

    /* ✅ GUARDAR TOKEN (CLAVE) */
    localStorage.setItem("token", data.token);

    /* ✅ GUARDAR USUARIO */
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        ...data.user,
        token: data.token
      })
    );

    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert("No se pudo conectar con el servidor");
  }
});

/* 🔁 Reenviar verificación */
async function resendVerification(email) {
  try {
    const res = await fetch(
      `${API_URL}/api/users/resend-verification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error al reenviar verificación");
      return;
    }

    alert("📧 Te reenviamos el email de verificación.");
  } catch {
    alert("No se pudo reenviar el email");
  }
}
