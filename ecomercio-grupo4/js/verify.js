document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    status.textContent = "Token inválido o inexistente";
    return;
  }

  try {
    const res = await fetch(
      `https://meetgo-backend.onrender.com/api/users/verify?token=${token}`
    );

    const data = await res.json();

    if (!res.ok) {
      status.textContent = data.message || "Error al verificar la cuenta";
      return;
    }

    status.textContent = "✅ Cuenta verificada correctamente. Redirigiendo...";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2500);

  } catch (error) {
    console.error(error);
    status.textContent = "Error de conexión con el servidor";
  }
});
