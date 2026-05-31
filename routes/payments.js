import express from "express";
import EventTicket from "../models/eventTicket.js";
import Event from "../models/event.js"; // 👈 Importamos el modelo Event para actualizar los cupos
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../utils/mailer.js"; 

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

    console.log(`=== 🚀 [NUEVO FLUJO INTEGRADO] Procesando Ticket: ${ticketId} ===`);

    const ticket = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticket) {
      console.error(`❌ [NUEVO FLUJO] Ticket ${ticketId} no encontrado en la base de datos.`);
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.payment?.status === "paid") {
      console.log(`⚠️ [NUEVO FLUJO] El ticket ${ticketId} ya estaba pagado.`);
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    const recipientEmail = ticket.guestEmail || ticket.user?.email;
    const userName = ticket.user?.name || "Invitado";
    const eventData = ticket.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

    // 🌟 VALIDACIÓN PARA EVENTOS GRATUITOS
    const price = ticket.event?.price;
    const isGratis = price === 0 || price === "0" || !price || Number(price) <= 0;

    if (isGratis) {
      console.log(`🎁 [NUEVO FLUJO - GRATIS] Validado como GRATUITO (Precio: ${price}). Saltando Mercado Pago.`);

      // 1. Modificar estado en Base de Datos
      ticket.payment = {
        status: "paid",
        amount: 0,
        transactionId: `FREE-${Date.now()}`,
        paidAt: new Date()
      };
      await ticket.save();
      console.log(`🎟 [NUEVO FLUJO - GRATIS] Ticket guardado como 'paid' en la BD.`);

      // 🔥 1.1 ACTUALIZACIÓN DE CUPOS: Al ser gratis y quedar confirmado, sumamos cupo vendido inmediatamente
      if (ticket.event?._id) {
        await Event.findByIdAndUpdate(ticket.event._id, {
          $inc: { ticketsSold: 1 }
        });
        console.log(`📈 [NUEVO FLUJO - GRATIS] Cupo sumado al evento ${ticket.event._id}`);
      }

      // 2. Despachar mail con Resend de inmediato utilizando el servicio importado
      if (recipientEmail) {
        try {
          await sendTicketMail({
            to: recipientEmail,
            userName: userName,
            event: eventData,
            ticket: ticket
          });
          console.log(`✅ [NUEVO FLUJO - GRATIS] Mail enviado con éxito por Resend.`);
        } catch (mailError) {
          console.error("❌ [NUEVO FLUJO - GRATIS] Error enviando correo por Resend:", mailError);
        }
      }

      return res.json({
        status: "paid",
        message: "Ticket gratuito confirmado con éxito",
        init_point: null
      });
    }

    // 🔥 FLUJO EXCLUSIVO PARA EVENTOS DE PAGO (Precio > 0)
    console.log(`💰 [NUEVO FLUJO - DE PAGO] Precio detectado: ${price}. Conectando con Mercado Pago...`);

    const payerData = ticket.guestEmail ? {
      name: "Invitado",
      email: ticket.guestEmail,
      id: "guest"
    } : {
      name: ticket.user?.name || "Usuario Meet&Go",
      email: ticket.user?.email,
      id: ticket.user?._id
    };

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
    console.error("❌ [NUEVO FLUJO] Error crítico general:", error);
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

    console.log(`🚀 [WEBHOOK MP] Pago Recibido ID: ${payment.id} - Estado: ${payment.status}`);

    if (payment.status === "approved") {
      const ticketId = payment.external_reference || payment.metadata?.ticket_id || payment.metadata?.ticketid; 

      console.log(`🔍 [WEBHOOK MP] Buscando Ticket ID: ${ticketId}`);

      if (!ticketId) {
        console.warn("⚠️ [WEBHOOK MP] Pago aprobado omitido: No se halló ticketId.");
        return res.sendStatus(200);
      }

      const ticket = await EventTicket.findById(ticketId)
        .populate("user")
        .populate("event");

      if (!ticket) {
        console.error(`❌ [WEBHOOK MP] El ticket ${ticketId} no existe en la BD.`);
        return res.sendStatus(200);
      }

      if (ticket.payment?.status === "paid") {
        console.log(`⚠️ [WEBHOOK MP] El ticket ${ticketId} ya figuraba como pagado. Omitiendo duplicados.`);
        return res.sendStatus(200);
      }

      // 🔥 ACTUALIZACIÓN DE CUPOS PARA EVENTOS DE PAGO
      // Sumamos el cupo en el evento asociado al ticket justo cuando entra la aprobación de dinero real
      if (ticket.event?._id) {
        await Event.findByIdAndUpdate(ticket.event._id, {
          $inc: { ticketsSold: 1 }
        });
        console.log(`📈 [WEBHOOK MP] Cupo sumado con éxito al evento ID: ${ticket.event._id}`);
      }

      const recipientEmail = ticket.guestEmail || ticket.user?.email;
      const userName = ticket.user?.name || "Invitado";
      const eventData = ticket.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

      console.log(`📧 [WEBHOOK MP] Intentando enviar correo a: ${recipientEmail}`);

      if (recipientEmail) {
        try {
          await sendTicketMail({
            to: recipientEmail,
            userName: userName,
            event: eventData,
            ticket: ticket
          });
          console.log(`✅ [WEBHOOK MP] Correo enviado exitosamente vía Resend.`);
        } catch (mailError) {
          console.error("❌ [WEBHOOK MP] Error crítico al despachar en Resend:", mailError);
        }
      }

      ticket.payment = {
        status: "paid",
        amount: payment.transaction_amount,
        transactionId: payment.id,
        paidAt: new Date()
      };
      await ticket.save();
      console.log(`🎟 [WEBHOOK MP] Estado del ticket actualizado a 'paid' en la base de datos.`);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ [WEBHOOK MP] Error general en la ejecución:", error);
    return res.sendStatus(500);
  }
});

export default router;