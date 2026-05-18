import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../services/mailer.js";

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// ========================================================
// 💳 CREAR PREFERENCIA DE PAGO (O CONFIRMAR SI ES GRATIS)
// ========================================================
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

    // Datos del comprador/invitado
    const recipientEmail = ticket.guestEmail || ticket.user?.email;
    const userName = ticket.user?.name || "Invitado";
    const eventData = ticket.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

    // 🌟 TRATAMIENTO PARA EVENTOS GRATUITOS (Precio es 0 o no existe)
    const eventPrice = ticket.event?.price;
    if (eventPrice === 0 || eventPrice === "0") {
      console.log(`🎁 [Eventos Gratis] Procesando pase gratuito para el ticket: ${ticketId}`);

      // 1. Lo marcamos directamente como aprobado en la Base de Datos
      ticket.payment = {
        status: "paid",
        amount: 0,
        transactionId: `FREE-${Date.now()}`,
        paidAt: new Date()
      };
      await ticket.save();
      console.log(`🎟 [Eventos Gratis] Ticket actualizado a 'paid' en BD.`);

      // 2. Despachamos el mail con Resend inmediatamente
      if (recipientEmail) {
        try {
          await sendTicketMail({
            to: recipientEmail,
            userName: userName,
            event: eventData,
            ticket: ticket
          });
          console.log(`✅ [Eventos Gratis] Correo enviado exitosamente vía Resend a ${recipientEmail}`);
        } catch (mailError) {
          console.error("❌ [Eventos Gratis] Error al enviar correo por Resend:", mailError);
        }
      }

      // 3. Le respondemos a la app indicando que ya está aprobado (sin URL de Mercado Pago)
      return res.json({
        status: "paid",
        message: "Ticket gratuito confirmado con éxito",
        init_point: null // La app sabrá que no debe abrir ninguna webview
      });
    }

    // 🔥 FLUJO NORMAL PARA EVENTOS DE PAGO (Precio > 0)
    const payerData = ticket.guestEmail ? {
      name: "Invitado",
      email: ticket.guestEmail,
      id: "guest"
    } : {
      name: ticket.user?.name || "Usuario Meet&Go",
      email: ticket.user?.email,
      id: ticket.user?._id
    };

    console.log(`📩 [Crear Pago] Evento de pago. Generando preferencia para: ${payerData.email}`);

    const preference = await createPaymentPreference({
      event: ticket.event,
      user: payerData,
      ticketId: ticket._id
    });

    return res.json({ 
      status: "pending",
      init_point: preference.init_point 
    });

  } catch (error) {
    console.error("❌ [Crear Pago] Error general:", error);
    return res.status(500).json({ message: "Error procesando el ticket" });
  }
});

// ==========================================
// 🔔 WEBHOOK ENTRANTE DE MERCADO PAGO
// ==========================================
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    console.log(`🚀 [WEBHOOK NUEVO V2] Pago Recibido MP ID: ${payment.id} - Estado: ${payment.status}`);

    if (payment.status === "approved") {
      const ticketId = payment.external_reference || payment.metadata?.ticket_id || payment.metadata?.ticketid; 

      console.log(`🔍 [WEBHOOK NUEVO V2] Buscando Ticket ID: ${ticketId}`);

      if (!ticketId) {
        console.warn("⚠️ [WEBHOOK NUEVO V2] Pago aprobado sin ticketId en la metadata.");
        return res.sendStatus(200);
      }

      const ticket = await EventTicket.findById(ticketId)
        .populate("user")
        .populate("event");

      if (!ticket) {
        console.error(`❌ [WEBHOOK NUEVO V2] El ticket ${ticketId} no existe en la BD.`);
        return res.sendStatus(200);
      }

      if (ticket.payment?.status === "paid") {
        console.log(`⚠️ [WEBHOOK NUEVO V2] El ticket ${ticketId} ya figuraba como pagado. Omitiendo mail.`);
        return res.sendStatus(200);
      }

      const recipientEmail = ticket.guestEmail || ticket.user?.email;
      const userName = ticket.user?.name || "Invitado";
      const eventData = ticket.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

      console.log(`📧 [WEBHOOK NUEVO V2] Intentando enviar correo a: ${recipientEmail}`);

      if (recipientEmail) {
        try {
          await sendTicketMail({
            to: recipientEmail,
            userName: userName,
            event: eventData,
            ticket: ticket
          });
          console.log(`✅ [WEBHOOK NUEVO V2] Correo enviado exitosamente vía Resend.`);
        } catch (mailError) {
          console.error("❌ [WEBHOOK NUEVO V2] Error crítico al despachar en Resend:", mailError);
        }
      }

      ticket.payment = {
        status: "paid",
        amount: payment.transaction_amount,
        transactionId: payment.id,
        paidAt: new Date()
      };
      await ticket.save();
      console.log(`🎟 [WEBHOOK NUEVO V2] Estado del ticket actualizado a 'paid' en la base de datos.`);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ [WEBHOOK NUEVO V2] Error general en la ejecución:", error);
    return res.sendStatus(500);
  }
});

export default router;