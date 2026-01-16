export async function sendTicketMail({ to, user, event, ticket }) {
  console.log("📧 Enviando mail de ticket a:", to);

  const attachments = [];

  if (ticket.qrImage?.includes("base64,")) {
    attachments.push({
      filename: "ticket-qr.png",
      content: ticket.qrImage.split("base64,")[1],
      encoding: "base64",
      cid: "ticketqr"
    });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px">

        <h1 style="text-align:center; color:#222">🎟️ Meet&Go</h1>

        <p>Hola <strong>${user.username || "!"}</strong>,</p>

        <p>
          Tu entrada para el evento
          <strong>${event.name}</strong>
          fue confirmada correctamente 🎉
        </p>

        <hr>

        <h3>📍 Detalles del evento</h3>
        <p>
          📅 <strong>Fecha:</strong> ${event.date}<br>
          ⏰ <strong>Hora:</strong> ${event.time}<br>
          🏷️ <strong>Categoría:</strong> ${event.category || "General"}
        </p>

        ${event.whatsappLink ? `
          <hr>
          <h3>💬 Grupo de WhatsApp del evento</h3>
          <p style="text-align:center">
            <a href="${event.whatsappLink}" target="_blank">Unirme al grupo</a>
          </p>
        ` : ""}

        <hr>

        ${attachments.length ? `
          <p style="text-align:center">
            <img src="cid:ticketqr" width="220" />
          </p>
          <p style="text-align:center">Mostrá este QR al ingresar</p>
        ` : ""}

        <p style="font-size:12px; color:#777; text-align:center">
          Meet&Go · No respondas este correo
        </p>

      </div>
    </div>
  `;

  await resend.emails.send({
    from: "Meet&Go <no-reply@meetandgouy.com>",
    to,
    subject: `🎟️ Entrada confirmada – ${event.name}`,
    html,
    attachments
  });
}
