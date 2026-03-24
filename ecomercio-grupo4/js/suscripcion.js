const MP_SUBSCRIPTION_LINK = "https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=f803017fb62d41d4b7f4a405973af5c1";

const subscribeBtn = document.getElementById("subscribeBtn");

subscribeBtn?.addEventListener("click", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Debes iniciar sesión para suscribirte");
    window.location.href = "login.html";
    return;
  }

  // SOLO redirige, no cambia estado
  window.location.href = MP_SUBSCRIPTION_LINK;
});
