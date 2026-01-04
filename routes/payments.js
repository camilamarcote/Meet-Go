import express from "express";
import EventTicket from "../models/eventTicket.js";
import User from "../models/user.js";
import { createPaymentPreference } from "../services/mercadoPago.js";
import { sendTicketMail } from "../utils/mailer.js";

import { Payment, MercadoPagoConfig } from "mercadopago";

const router = express.Router();

/* =====================================================
   💳 PAGO EVENTO PUNTUAL
===================================================== */
router.post("/payments/create/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    // 🔒 Si es de suscripción, no se paga
    if (ticket.accessType === "subscription") {
      return res.status(400).json({
        message: "Este evento está cubierto por la suscripción"
      });
    }

    if (ticket.payment?.status === "approved") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    const preference = await createPaymentPreference({
      type: "event",
      ticketId: ticket._id,
      event: ticket.event,
      user: ticket.user
    });

    res.json({ init_point: preference.init_point });

  } catch (error) {
    console.error("❌ Error creando pago evento:", error);
    res.status(500).json({ message: "Error creando pago" });
  }
});

/* =====================================================
   🔁 PAGO SUSCRIPCIÓN
===================================================== */
router.post("/payments/subscription", async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.subscription?.isActive) {
      return res.status(409).json({
        message: "El usuario ya tiene una suscripción activa"
      });
    }

    const preference = await createPaymentPreference({
      type: "subscription",
      user
    });

    res.json({ init_point: preference.init_point });

  } catch (error) {
    console.error("❌ Error creando pago suscripción:", error);
    res.status(500).json({ message: "Error creando pago suscripción" });
  }
});

/* =====================================================
   🔔 WEBHOOK MERCADO PAGO (ÚNICO)
===================================================== */
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status !== "approved") {
      return res.sendStatus(200);
    }

    const metadata = payment.metadata || {};

    /* =============================
       🎟️ EVENTO
    ============================== */
    if (metadata.type === "event" && metadata.ticketId) {
      const ticket = await EventTicket.findById(metadata.ticketId)
        .populate("user")
        .populate("event");

      if (!ticket || ticket.payment?.status === "approved") {
        return res.sendStatus(200);
      }

      ticket.payment = {
        status: "approved",
        paymentId: payment.id,
        paidAt: new Date(),
        amount: payment.transaction_amount
      };

      await ticket.save();

      if (ticket.user?.email) {
        await sendTicketMail({
          to: ticket.user.email,
          user: ticket.user,
          event: ticket.event,
          ticket
        });
      }

      console.log("✅ Pago evento aprobado:", payment.id);
    }

    /* =============================
       🔁 SUSCRIPCIÓN
    ============================== */
    if (metadata.type === "subscription" && metadata.userId) {
      const user = await User.findById(metadata.userId);

      if (!user || user.subscription?.isActive) {
        return res.sendStatus(200);
      }

      const now = new Date();
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 1);

      user.subscription = {
        isActive: true,
        plan: "monthly",
        startedAt: now,
        validUntil
      };

      await user.save();

      console.log("✅ Suscripción activada:", user.email);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error webhook MP:", error);
    res.sendStatus(500);
  }
});

export default router;
