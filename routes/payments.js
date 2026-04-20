import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";

import { Payment, MercadoPagoConfig } from "mercadopago";

const router = express.Router();

// =============================
// 💳 Crear pago Mercado Pago
// =============================
router.post("/payments/create/:ticketId", async (req, res) => {
  try {

    const { ticketId } = req.params;

    const ticket = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user"); // Si no hay user, será null

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket no encontrado"
      });
    }

    if (ticket.payment?.status === "paid") {
      return res.status(409).json({
        message: "Ticket ya pagado"
      });
    }

    // Crear objeto de usuario anónimo si no existe user asociado
    const userData = ticket.user || {
      _id: ticket._id.toString(), // Usar ticketId como identificador
      name: ticket.guestName || "Invitado",
      email: ticket.guestEmail || `guest_${ticket._id}@temp.meetandgouy.com`
    };

    const preference = await createPaymentPreference({
      event: ticket.event,
      user: userData,
      ticketId: ticket._id
    });

    console.log("🧾 Preference creada:", preference.id);

    return res.json({
      init_point: preference.init_point
    });

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    return res.status(500).json({
      message: "Error creando pago"
    });
  }
});

// =============================
// 🔔 Webhook Mercado Pago
// =============================

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

router.post("/payments/webhook", async (req, res) => {

  try {

    const { type, data } = req.body;

    if (type !== "payment") {
      return res.sendStatus(200);
    }

    if (!data?.id) {
      console.log("⚠️ Webhook sin data.id");
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);

    const paymentResponse = await paymentClient.get({
      id: data.id
    });

    const payment = paymentResponse.body;

    console.log("💳 Webhook pago:", payment.id, payment.status);

    if (payment.status === "approved") {

      const ticketId = payment.metadata?.ticketId;

      if (!ticketId) {
        console.warn("⚠️ Pago aprobado sin ticketId");
        return res.sendStatus(200);
      }

      // Actualizar ticket sin validar existencia de user
      const ticket = await EventTicket.findByIdAndUpdate(
        ticketId,
        {
          payment: {
            status: "paid",
            amount: payment.transaction_amount,
            paidAt: new Date()
          }
        },
        { new: true }
      )
      .populate("event");

      if (!ticket) {
        console.warn("⚠️ Ticket no encontrado en webhook:", ticketId);
        return res.sendStatus(200);
      }

      console.log("🎟 Ticket actualizado:", ticket._id);

      // Enviar email solo si el ticket tiene un email válido (registrado o invitado)
      const userEmail = ticket.user?.email || ticket.guestEmail;
      
      if (userEmail && typeof sendTicketMail === "function") {
        await sendTicketMail({
          to: userEmail,
          user: ticket.user || { name: ticket.guestName || "Invitado", email: userEmail },
          event: ticket.event,
          ticket
        });
      } else if (userEmail) {
        console.log(`📧 Email no enviado: función sendTicketMail no disponible. Destinatario: ${userEmail}`);
      }

    }

    res.sendStatus(200);

  } catch (error) {

    console.error("❌ Error webhook MercadoPago:", error);

    res.sendStatus(500);
  }

});

export default router;