const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("tid");
const result = document.getElementById("result");

if (!ticketId) {
  result.innerHTML = `<h4 class="text-danger">❌ QR Inválido</h4>`;
} else {
  fetch(`${API_URL}/api/tickets/status/${ticketId}`)
    .then((res) => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then((data) => {
      result.innerHTML = `
        <h4 class="text-success fw-bold">🎟️ Ticket Encontrado</h4>
        <hr>
        <p class="fs-5 mb-1"><strong>Nombre:</strong> ${data.nombre}</p>
        <p class="fs-5 mb-1"><strong>Evento:</strong> ${data.evento}</p>
        <p class="fs-5 mb-0"><strong>Fecha:</strong> ${data.fecha}</p>
      `;
    })
    .catch(() => {
      result.innerHTML = `<h4 class="text-danger">❌ Ticket no encontrado</h4>`;
    });
}