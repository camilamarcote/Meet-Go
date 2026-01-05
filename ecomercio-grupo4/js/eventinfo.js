const API_URL = "https://meetgo-backend.onrender.com";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const eventDetails = document.getElementById("eventDetails");

const authUser = JSON.parse(localStorage.getItem("currentUser")) || null;

/* =============================
   🎟️ Comprar evento
============================= */
async function payEvent(eventId) {
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  try {
    // 1️⃣ Crear ticket (RUTA CORRECTA)
    const ticketRes = await fetch(
      `${API_URL}/events/${eventId}/tickets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: authUser.id
        })
      }
    );

    if (!ticketRes.ok) {
      const text = await ticketRes.text();
      console.error("Ticket error:", text);
      alert("Error creando ticket");
      return;
    }

    const ticketData = await ticketRes.json();

    // 2️⃣ Crear pago Mercado Pago
    const paymentRes = await fetch(
      `${API_URL}/api/payments/create/${ticketData.ticket._id}`
    );

    if (!paymentRes.ok) {
      const text = await paymentRes.text();
      console.error("Payment error:", text);
      alert("Error iniciando pago");
      return;
    }

    const paymentData = await paymentRes.json();

    // 3️⃣ Redirigir a Mercado Pago
    window.location.href = paymentData.init_point;

  } catch (error) {
    console.error("❌ Error en payEvent:", error);
    alert("Error al procesar el pago");
  }
}
