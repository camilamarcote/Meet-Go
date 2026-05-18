import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../services/mailer.js";

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// ==========================================
// 💳 CREAR PREFERENCIA DE PAGO MERCADO PAGO
// ==========================================
router.post("/payments/create/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticket) {
      console.error(`❌ [Crear Pago] Ticket ${ticketId} no encontrado.`);
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.payment?.status === "paid") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    // Priorizamos el email de invitado ingresado en el flujo sin registro de la web
    const payerData = ticket.guestEmail ? {
      name: "Invitado",
      email: ticket.guestEmail,
      id: "guest"
    } : {
      name: ticket.user?.name || "Usuario Meet&Go",
      email: ticket.user?.email,
      id: ticket.user?._id
    };

    console.log(`📩 [Crear Pago] Generando preferencia para: ${payerData.email} (Ticket: ${ticketId})`);

    const preference = await createPaymentPreference({
      event: ticket.event,
      user: payerData,
      ticketId: ticket._id
    });

    console.log(`🧾 [Crear Pago] Preference creada con éxito: ${preference.id}`);

    return res.json({ init_point: preference.init_point });

  } catch (error) {
    console.error("❌ [Crear Pago] Error crítico al crear preferencia:", error);
    return res.status(500).json({ message: "Error creando pago" });
  }
});

// ==========================================
// 🔔 WEBHOOK ENTRANTE DE MERCADO PAGO
// ==========================================
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    // Ignorar notificaciones que no correspondan a pagos reales
    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    console.log(`💳 [Webhook] Recibido MP ID: ${payment.id} - Estado: ${payment.status}`);

    if (payment.status === "approved") {
      // Mapeo exhaustivo para capturar el ID del ticket sin importar dónde lo guarde el SDK
      const ticketId = 
        payment.external_reference || 
        payment.metadata?.ticket_id || 
        payment.metadata?.ticketid; 

      console.log(`🔍 [Webhook] Buscando Ticket ID asociado en DB: ${ticketId}`);

      if (!ticketId) {
        console.warn("⚠️ [Webhook] Pago omitido: No se halló ningún ticketId válido en la data de MP.");
        return res.sendStatus(200);
      }

      // Buscamos y actualizamos el estado del ticket de forma atómica
      const ticket = await EventTicket.findByIdAndUpdate(
        ticketId,
        {
          $set: {
            "payment.status": "paid",
            "payment.amount": payment.transaction_amount,
            "payment.transactionId": payment.id,
            "payment.paidAt": new Date()
          }
        },
        { new: true }
      )
      .populate("user")
      .populate("event");

      if (!ticket) {
        console.error(`❌ [Webhook] Error fatal: El ticket ${ticketId} no existe en la Base de Datos.`);
        return res.sendStatus(200);
      }

      console.log(`🎟 [Webhook] Ticket actualizado con éxito en BD: ${ticket._id}`);

      // Estructuramos el destinatario priorizando el correo manual del alert web (invitado)
      const recipientEmail = ticket.guestEmail || ticket.user?.email;
      const userName = ticket.user?.name || "Invitado";

      console.log(`📧 [Webhook] Email detectado para envío: ${recipientEmail}`);

      if (recipientEmail) {
        // Resguardo de seguridad por si el evento fue eliminado de la DB para evitar crash al renderizar strings
        const eventData = ticket.event || { 
          name: "Tu evento confirmado", 
          date: "Ver detalles en la App", 
          department: "Uruguay" 
        };

        try {
          console.log(`🚀 [Webhook] Desviando hacia Resend para: ${recipientEmail}...`);
          
          await sendTicketMail({
            to: recipientEmail,
            userName: userName,
            event: eventData,
            ticket: ticket
          });

          console.log(`✅ [Webhook] ¡Mail despachado con éxito por Resend a: ${recipientEmail}!`);
        } catch (mailError) {
          console.error("❌ [Webhook] El motor de Resend rechazó el envío del mail:", mailError);
        }
      } else {
        console.warn(`⚠️ [Webhook] El ticket ${ticketId} se pagó correctamente pero no tiene un email de destino asignado.`);
      }
    }

    // Siempre respondemos 200 a Mercado Pago para evitar que re-intente infinitamente
    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ [Webhook] Error crítico en la ejecución del Webhook general:", error);
    return res.sendStatus(500);
  }
});

export default router;