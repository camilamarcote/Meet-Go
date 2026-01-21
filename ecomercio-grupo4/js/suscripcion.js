const MP_SUBSCRIPTION_LINK = "https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=a6ceeb8e4d0a48e290a25863478fbc4b";

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
