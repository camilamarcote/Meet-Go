const API_URL = "https://api.meetandgouy.com";

const params = new URLSearchParams(window.location.search);
const userId = params.get("uid");

const result = document.getElementById("result");

if (!userId) {
  result.innerHTML = `<p class="text-danger">QR inválido</p>`;
  throw new Error("UID faltante");
}

fetch(`${API_URL}/api/public/subscription-status/${userId}`)
  .then(res => res.json())
  .then(data => {
    if (data.isActive) {
      result.innerHTML = `
        <h4 class="text-success">✅ Suscripción activa</h4>
        <p><strong>${data.name}</strong></p>
        <p>Válida hasta: ${data.validUntil ?? "—"}</p>
      `;
    } else {
      result.innerHTML = `
        <h4 class="text-danger">❌ Suscripción inactiva</h4>
      `;
    }
  })
  .catch(() => {
    result.innerHTML = `<p class="text-danger">Error al verificar</p>`;
  });
