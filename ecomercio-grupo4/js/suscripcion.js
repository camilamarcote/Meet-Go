// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://meetgo-backend.onrender.com";

const subscribeBtn = document.getElementById("subscribeBtn");

subscribeBtn.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user) {
    alert("Debes iniciar sesión para suscribirte");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/subscriptions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user._id || user.id
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error creando suscripción:", text);
      alert("Error iniciando la suscripción");
      return;
    }

    const data = await res.json();

    // 🔁 Redirigir a Mercado Pago
    window.location.href = data.init_point;

  } catch (error) {
    console.error("❌ Error de red:", error);
    alert("Error de conexión con el servidor");
  }
});
