import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function mailer({ to, user, event, ticket }) {
  console.log("📧 Enviando mail de ticket a:", to);

  const paymentText =
    ticket.payment?.status === "approved"
      ? "✅ Pago aprobado"
      : "⏳ Pago pendiente";

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px">

        <h1 style="text-align:center; color:#222">🎟️ Meet&Go</h1>

        <p>Hola <strong>${user.username}</strong>,</p>

        <p>
          Tu entrada para el evento
          <strong>${event.name}</strong>
          fue generada correctamente 🎉
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
          <hr>
          <h3>💬 Grupo de WhatsApp del evento</h3>
          <p>Unite al grupo oficial del evento:</p>
          <p style="text-align:center; margin:20px 0">
            <a
              href="${event.whatsappLink}"
              target="_blank"
              style="
                background:#25D366;
                color:#ffffff;
                padding:12px 20px;
                text-decoration:none;
                border-radius:6px;
                font-weight:bold;
                display:inline-block;
              "
            >
              👉 Unirme al grupo de WhatsApp
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
          💳 <strong>Estado del pago:</strong> ${paymentText}
        </p>

        <p style="font-size:12px; color:#777; text-align:center; margin-top:30px">
          Meet&Go · Encuentros reales, conexiones genuinas<br>
          No respondas este correo
        </p>

      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Meet&Go <no-reply@meetandgouy.com>",
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

    console.log("✅ Mail de ticket enviado correctamente");
  } catch (error) {
    console.error("❌ Error enviando mail de ticket:", error);
    throw error;
  }
}
