const status = document.getElementById("status");
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
  status.textContent = "❌ Token inválido.";
} else {
  fetch(
    `https://meetgo-backend.onrender.com/api/users/verify?token=${token}`
  )
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      status.textContent =
        "✅ Cuenta verificada. Redirigiendo al login...";

      setTimeout(() => {
        window.location.href = "login.html?verified=true";
      }, 2000);
    })
    .catch((err) => {
      console.error(err);
      status.textContent =
        "❌ El enlace es inválido o expiró.";
    });
}
