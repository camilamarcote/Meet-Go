import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// 🔁 MAIL DE SUSCRIPCIÓN
// ===============================
export async function sendSubscriptionMail({
  user,
  qrImage,          // base64 del QR de suscripción
  whatsappLink      // link al grupo general
}) {
  console.log("📧 Enviando mail de suscripción a:", user.email);

  const attachments = [];

  // ✅ QR ÚNICO DE SUSCRIPTOR
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

        <h1 style="text-align:center; color:#222">✨ Meet&Go</h1>

        <p>Hola <strong>${user.username}</strong>,</p>

        <p>
          Tu <strong>suscripción mensual</strong> fue activada correctamente 🎉
        </p>

        <p>
          Este QR es tu <strong>acceso personal</strong> a los eventos incluidos.
        </p>

        ${
          attachments.length
            ? `
          <hr>
          <p style="text-align:center">
            <img src="cid:subscriptionqr" width="220" />
          </p>
          <p style="text-align:center; font-weight:bold">
            🎟️ Mostrá este QR al ingresar
          </p>
        `
            : ""
        }

        ${
          whatsappLink
            ? `
          <hr>
          <h3>💬 Comunidad Meet&Go</h3>
          <p style="text-align:center">
            <a href="${whatsappLink}" target="_blank"
              style="display:inline-block; padding:10px 16px; background:#25D366; color:#fff; text-decoration:none; border-radius:6px">
              Unirme al grupo de WhatsApp
            </a>
          </p>
        `
            : ""
        }

        <hr>

        <p style="font-size:12px; color:#777; text-align:center">
          El QR es personal e intransferible.<br>
          Meet&Go · No respondas este correo
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
