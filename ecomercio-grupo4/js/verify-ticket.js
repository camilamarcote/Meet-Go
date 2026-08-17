const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("tid");
const result = document.getElementById("result");

if (!ticketId) {
  result.innerHTML = `<h4 class="text-danger fw-bold">❌ QR Inválido</h4>`;
} else {
  fetch(`${API_URL}/api/tickets/status/${ticketId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Ticket no encontrado");
      return res.json();
    })
    .then((data) => {
      result.innerHTML = `
        <h4 class="text-success fw-bold mb-3">✅ Ticket Válido</h4>
        <div class="text-start bg-white p-3 rounded shadow-sm border">
          <p class="mb-2"><strong>Asistente:</strong> ${data.nombre}</p>
          <p class="mb-2"><strong>Evento:</strong> ${data.evento}</p>
          <p class="mb-0"><strong>Fecha:</strong> ${data.fecha}</p>
        </div>
      `;
    })
    .catch(() => {
      result.innerHTML = `
        <h4 class="text-danger fw-bold">❌ Ticket no encontrado</h4>
        <p class="text-muted small">El código escaneado no corresponde a una entrada registrada.</p>
      `;
    });
}