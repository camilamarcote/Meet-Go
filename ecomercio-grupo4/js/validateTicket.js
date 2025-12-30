async function validateTicket() {
  const qrCode = qrInput.value;
  const eventId = eventIdInput.value;

  const res = await fetch("https://meetgo-backend.onrender.com/api/users/register"
 , {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrCode, eventId })
  });

  const data = await res.json();
  result.textContent = JSON.stringify(data, null, 2);
}
