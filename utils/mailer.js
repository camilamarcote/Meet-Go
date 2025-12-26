import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

export async function sendTicketMail({ to, user, event, ticket }) {
  console.log("📧 Intentando enviar mail a:", to);

  const paymentText =
    ticket.payment.status === "approved"
      ? "✅ Pago aprobado"
      : ticket.payment.status === "free"
      ? "🎁 Entrada incluida por suscripción"
      : "⏳ Pago pendiente";

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
    <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px">

      <h1 style="text-align:center; color:#222">🎟️ Meet&Go</h1>

      <p>Hola <strong>${user.username}</strong>,</p>

      <p>
        Tu entrada para el evento
        <strong>${event.name}</strong>
        fue generada correctamente.
      </p>

      <hr>

      <h3>📍 Detalles del evento</h3>
      <p>
        📅 <strong>Fecha:</strong> ${event.date}<br>
        ⏰ <strong>Hora:</strong> ${event.time}<br>
        🏷️ <strong>Categoría:</strong> ${event.category || "General"}
      </p>

      ${
        event.whatsappLink
          ? `
        <p>
          💬 <strong>Grupo de WhatsApp:</strong><br>
          <a href="${event.whatsappLink}" target="_blank">
            Unirme al grupo
          </a>
        </p>
      `
          : ""
      }

      <hr>

      <h3>🔐 Tu entrada</h3>

      <p style="text-align:center">
        <img src="cid:ticketqr" width="220" alt="QR Ticket" />
      </p>

      <p style="text-align:center; font-size:14px">
        Mostrá este QR al ingresar al evento
      </p>

      <hr>

      <p>
        💳 <strong>Estado del pago:</strong> ${paymentText}<br>
        🎫 <strong>Tipo de acceso:</strong> ${ticket.accessType}
      </p>

      <p style="font-size:12px; color:#777; text-align:center; margin-top:30px">
        Meet&Go · Entrada digital<br>
        No respondas este correo
      </p>

    </div>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Meet&Go 🎉" <${process.env.MAIL_USER}>`,
      to,
      subject: `🎟️ Tu entrada para ${event.name}`,
      html,
      attachments: [
        {
          filename: "ticket-qr.png",
          content: ticket.qrImage.split("base64,")[1],
          encoding: "base64",
          cid: "ticketqr"
        }
      ]
    });

    console.log("✅ Mail enviado correctamente");
  } catch (error) {
    console.error("❌ Error enviando mail:", error);
  }
}
