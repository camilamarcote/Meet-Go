const passwordInput = document.getElementById("loginPass");
const togglePasswordBtn = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");

/* 👁️ Mostrar / ocultar password */
togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
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

  const userInput = document.getElementById("loginUser");
  const user = userInput.value.trim();
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

    /* ❌ ERROR */
    if (!response.ok) {
      // 👉 Cuenta no verificada → ofrecer reenvío
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

    /* ✅ Guardamos sesión */
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        token: data.token,
        id: data.user._id,
        username: data.user.username,
        profileImage: data.user.profileImage
      })
    );

    /* 🚀 Redirección final */
    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Error de conexión:", error);
    alert("No se pudo conectar con el servidor");
  }
});

/* 🔁 Reenviar email de verificación */
async function resendVerification(email) {
  try {
    const res = await fetch(
      "https://meetgo-backend.onrender.com/api/users/resend-verification",
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

    alert("📧 Te reenviamos el email de verificación. Revisá tu bandeja.");

  } catch (error) {
    console.error("❌ Error reenviando email:", error);
    alert("No se pudo reenviar el email");
  }
}
