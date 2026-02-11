import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// ✨ MAIL DE BIENVENIDA / SUSCRIPCIÓN
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

        <h1 style="text-align:center">✨ Bienvenida a Meet&Go</h1>

        <p>Hola <strong>${user.username}</strong>,</p>

        <p>
          Tu <strong>suscripción</strong> ya está activa 🎉  
          Desde ahora sos parte de la comunidad Meet&Go.
          Para ingresar a nuestra comunidad de Whatsapp ve al siguiente enlace: 
          https://chat.whatsapp.com/FzTLq6Yw84U3d6utoTaEFH
        </p>
        

        ${
          attachments.length
            ? `
          <hr>
          <p style="text-align:center">
            <img src="cid:subscriptionqr" width="220" />
          </p>
          <p style="text-align:center; font-weight:bold">
            Este es tu QR personal de acceso
          </p>
        `
            : ""
        }

        ${
          whatsappLink
            ? `
          <hr>
          <p style="text-align:center">
            <a href="${whatsappLink}" target="_blank" style="
              display:inline-block;
              padding:12px 18px;
              background:#25D366;
              color:white;
              border-radius:8px;
              text-decoration:none;
              font-weight:bold;
            ">
              💬 Unirme al grupo de WhatsApp
            </a>
          </p>
        `
            : ""
        }

        <p style="font-size:12px; color:#777; text-align:center">
          QR personal e intransferible · Meet&Go
        </p>

      </div>
    </div>
  `;

  await resend.emails.send({
    from: "Meet&Go <no-reply@meetandgouy.com>",
    to: user.email,
    subject: "✨ Bienvenida a Meet&Go – Suscripción activa",
    html,
    attachments
  });
async function sendMail(userId, email) {
  if (!confirm(`¿Enviar mail de bienvenida a ${email}?`)) return;

  try {
    const res = await fetch(
      `${API_URL}/api/admin/send-subscription-mail/${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      }
    );

    if (!res.ok) throw new Error("Error enviando mail");

    alert("📧 Mail enviado correctamente");

  } catch (error) {
    console.error(error);
    alert("❌ No se pudo enviar el mail");
  }
}


}
