import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadoPago.js";
import { sendTicketMail } from "../utils/mailer.js";

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
      .populate("user");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.payment?.status === "approved") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    const preference = await createPaymentPreference({
      event: ticket.event,
      user: ticket.user,
      ticketId: ticket._id
    });

    res.json({
      init_point: preference.init_point
    });

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    res.status(500).json({ message: "Error creando pago" });
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

    // MP manda muchos eventos, solo nos interesa payment
    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status !== "approved") {
      return res.sendStatus(200);
    }

    const ticketId = payment.metadata?.ticketId;

    if (!ticketId) {
      console.warn("⚠️ Pago aprobado sin ticketId en metadata:", payment.id);
      return res.sendStatus(200);
    }

    const ticket = await EventTicket.findById(ticketId)
      .populate("user")
      .populate("event");

    if (!ticket) {
      console.warn("⚠️ Ticket no encontrado para pago:", payment.id);
      return res.sendStatus(200);
    }

    // Evitar duplicados
    if (ticket.payment?.status === "approved") {
      return res.sendStatus(200);
    }

    ticket.payment = {
      status: "approved",
      paymentId: payment.id,
      paidAt: new Date(),
      amount: payment.transaction_amount
    };

    await ticket.save();

    // 📧 Enviar mail con QR
    if (ticket.user?.email) {
      await sendTicketMail({
        to: ticket.user.email,
        user: ticket.user,
        event: ticket.event,
        ticket
      });
    }

    console.log("✅ Pago aprobado, ticket actualizado y mail enviado:", payment.id);

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error en webhook MP:", error);
    res.sendStatus(500);
  }
});

export default router;
