import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// ✨ MAIL DE BIENVENIDA / SUSCRIPCIÓN
// ==========================================
export async function sendSubscriptionMail({ user, qrImage, whatsappLink }) {
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
          Tu <strong>suscripción</strong> ya está activa 🎉<br>  
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
          <p style="text-align:center; font-weight:bold">Este es tu QR personal de acceso</p>
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
            ">💬 Unirme al grupo de WhatsApp</a>
          </p>
        `
            : ""
        }
        <p style="font-size:12px; color:#777; text-align:center">QR personal e intransferible · Meet&Go</p>
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
}

// ==========================================
// 🎟️ ENVIAR TICKET DE EVENTO AUTOMÁTICO
// ==========================================
export async function sendTicketMail({ to, userName, event, ticket }) {
  console.log(`🚀 [Resend - Utils] Preparando envío de ticket para: ${to}`);

  const attachments = [];

  if (ticket.qrImage && ticket.qrImage.includes("base64,")) {
    attachments.push({
      filename: `ticket-${ticket._id}.png`,
      content: ticket.qrImage.split("base64,")[1],
      encoding: "base64",
      cid: "ticketqr" 
    });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px; border: 1px solid #dee2e6;">
        <h2 style="color: #0d6efd; text-align:center; margin-bottom: 5px;">🎉 ¡Entrada Confirmada!</h2>
        <p style="text-align:center; color: #6c757d; margin-top: 0;">Meet&Go Uruguay</p>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Tu acceso para el evento ya está confirmado:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0d6efd;">
          <h3 style="margin-top: 0; color: #212529; font-size: 18px;">${event.name}</h3>
          <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${event.date}</p>
          <p style="margin: 5px 0;"><strong>⏰ Hora:</strong> ${event.time || 'Por confirmar'}</p>
          <p style="margin: 5px 0;"><strong>📍 Lugar:</strong> ${event.department}</p>
        </div>

        ${
          attachments.length
            ? `
          <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
          <p style="text-align:center;">
            <img src="cid:ticketqr" width="220" style="display:block; margin:auto;" />
          </p>
          <p style="text-align:center; font-weight:bold; color:#212529; margin-top:10px;">
            Presentá este código QR en la entrada 📱
          </p>
        `
            : ""
        }
        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
        <p style="font-size:13px; color:#495057;">
          <strong>💡 Tip de Meet&Go:</strong> También podés ver esta entrada desde la pestaña <strong>"Mis Tickets"</strong> en nuestra app móvil usando tu correo: <em>${to}</em>.
        </p>
        <p style="font-size:11px; color:#777; text-align:center; margin-top:30px;">Meet&Go · Conectando experiencias.</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: "Meet&Go <no-reply@meetandgouy.com>",
    to: to,
    subject: `🎟️ Ticket Confirmado – ${event.name}`,
    html,
    attachments
  });
}