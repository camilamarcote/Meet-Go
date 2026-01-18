// =============================
// 🌐 API BASE
// =============================
const MP_SUBSCRIPTION_LINK = "https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=a6ceeb8e4d0a48e290a25863478fbc4b";

const subscribeBtn = document.getElementById("subscribeBtn");

subscribeBtn.addEventListener("click", () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user) {
    alert("Debes iniciar sesión para suscribirte");
    window.location.href = "login.html";
    return;
  }

  // 🔁 Redirigir directamente a Mercado Pago
  window.location.href = MP_SUBSCRIPTION_LINK;
});
