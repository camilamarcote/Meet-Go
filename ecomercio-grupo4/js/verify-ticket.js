const API_URL = "https://api.meetandgouy.com";

// Obtener el ID del ticket desde la URL (?tid=...)
const params = new URLSearchParams(window.location.search);
const ticketId = params.get("tid");

const result = document.getElementById("result");

if (!ticketId) {
  result.innerHTML = `<h4 class="text-danger">❌ QR Inválido</h4><p class="text-muted">Falta el identificador del ticket.</p>`;
  throw new Error("Ticket ID faltante");
}

fetch(`${API_URL}/api/public/ticket-status/${ticketId}`)
  .then((res) => {
    if (!res.ok) throw new Error("Ticket no encontrado");
    return res.json();
  })
  .then((data) => {
    // 🟢 TICKET VÁLIDO (PAGADO Y NO CANJEADO)
    if (data.isValid && data.paymentStatus === "approved") {
      result.innerHTML = `
        <h4 class="text-success fw-bold">✅ Ticket Válido</h4>
        <div class="mt-3 text-start">
          <p class="mb-1"><strong>Asistente:</strong> ${data.attendeeName}</p>
          <p class="mb-1"><strong>Evento:</strong> ${data.eventName}</p>
          <p class="mb-1"><strong>Pase:</strong> ${data.isGuest ? 'Invitado' : 'Registrado'}</p>
          <p class="mb-0 text-muted"><small>ID: ${data.ticketId}</small></p>
        </div>
      `;
    } 
    // ⚠️ TICKET PENDIENTE DE PAGO
    else if (data.paymentStatus === "pending") {
      result.innerHTML = `
        <h4 class="text-warning fw-bold">⚠️ Pago Pendiente</h4>
        <p class="mt-2">El ticket existe pero aún no se ha confirmado el pago.</p>
        <p><strong>Asistente:</strong> ${data.attendeeName}</p>
      `;
    }
    // 🚫 TICKET YA USADO O INVÁLIDO
    else {
      result.innerHTML = `
        <h4 class="text-danger fw-bold">❌ Ticket Inválido</h4>
        <p class="mt-2 text-muted">${data.message || "Este pase no es válido para el ingreso."}</p>
      `;
    }
  })
  .catch((err) => {
    console.error(err);
    result.innerHTML = `
      <h4 class="text-danger fw-bold">❌ Error al verificar</h4>
      <p class="text-muted">No se pudo consultar la validez del ticket.</p>
    `;
  });