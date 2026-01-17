import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// 🎟️ MAIL DE TICKET
// ===============================
export async function sendTicketMail({ user, event, qrImage }) {
  console.log("📧 Enviando mail de ticket a:", user.email);

  const attachments = [];

  if (qrImage?.includes("base64,")) {
    attachments.push({
      filename: "meetandgo-ticket-qr.png",
      content: qrImage.split("base64,")[1],
      encoding: "base64",
      cid: "ticketqr"
    });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px">

        <h1 style="text-align:center">🎟️ Meet&Go</h1>

        <p>Hola <strong>${user.username}</strong>,</p>

        <p>
          Tu entrada para <strong>${event.name}</strong> fue confirmada 🎉
        </p>

        <p>
          📅 ${event.date} <br>
          ⏰ ${event.time}
        </p>

        ${
          attachments.length
            ? `
          <hr>
          <p style="text-align:center">
            <img src="cid:ticketqr" width="220" />
          </p>
          <p style="text-align:center; font-weight:bold">
            Mostrá este QR al ingresar
          </p>
        `
            : ""
        }

        <p style="font-size:12px; color:#777; text-align:center">
          Meet&Go · No respondas este correo
        </p>

      </div>
    </div>
  `;

  await resend.emails.send({
    from: "Meet&Go <no-reply@meetandgouy.com>",
    to: user.email,
    subject: `🎟️ Entrada confirmada – ${event.name}`,
    html,
    attachments
  });
}

// ===============================
// 🔁 MAIL DE SUSCRIPCIÓN
// ===============================
export async function sendSubscriptionMail({
  user,
  qrImage,
  whatsappLink
}) {
  console.log("📧 Enviando mail de suscripción a:", user.email);

  const attachments = [];

  if (qrImage?.includes("base64,")) {
    attachments.push({
      filename: "meetandgo-suscripcion-qr.png",
      content: qrImage.split("base64,")[1],
      encoding: "base64",
      cid: "subscriptionqr"
    });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
      <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px">

        <h1 style="text-align:center">✨ Meet&Go</h1>

        <p>Hola <strong>${user.username}</strong>,</p>

        <p>
          Tu <strong>suscripción</strong> está activa 🎉
        </p>

        ${
          attachments.length
            ? `
          <hr>
          <p style="text-align:center">
            <img src="cid:subscriptionqr" width="220" />
          </p>
          <p style="text-align:center; font-weight:bold">
            QR personal de acceso
          </p>
        `
            : ""
        }

        ${
          whatsappLink
            ? `
          <hr>
          <p style="text-align:center">
            <a href="${whatsappLink}" target="_blank">
              Unirme al grupo de WhatsApp
            </a>
          </p>
        `
            : ""
        }

        <p style="font-size:12px; color:#777; text-align:center">
          QR personal e intransferible
        </p>

      </div>
    </div>
  `;

  await resend.emails.send({
    from: "Meet&Go <no-reply@meetandgouy.com>",
    to: user.email,
    subject: "✅ Suscripción activa – Meet&Go",
    html,
    attachments
  });
}
