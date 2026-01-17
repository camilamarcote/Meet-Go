import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";
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

    // 🔎 Log útil para soporte MP
    console.log("🧾 Preference creada:", preference.id);

    return res.json({
      init_point: preference.init_point // ⚠️ USAR ESTE EN PRODUCCIÓN
    });

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    return res.status(500).json({ message: "Error creando pago" });
  }
});

// =============================
// 🔔 Webhook Mercado Pago
// =============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN // ✔ producción
});

router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    // Aceptamos payment y merchant_order
    if (type !== "payment" && type !== "merchant_order") {
      return res.sendStatus(200);
    }

    if (!data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status === "approved") {
      const ticketId = payment.metadata?.ticketId;

      if (!ticketId) {
        console.warn("⚠️ Pago aprobado sin ticketId en metadata");
        return res.sendStatus(200);
      }

      const ticket = await EventTicket.findByIdAndUpdate(
        ticketId,
        {
          payment: {
            status: "approved",
            paymentId: payment.id,
            paidAt: new Date()
          }
        },
        { new: true }
      )
        .populate("user")
        .populate("event");

      // 📧 Enviar mail SOLO si hay usuario
      if (ticket?.user?.email) {
        await sendTicketMail({
          to: ticket.user.email,
          user: ticket.user,
          event: ticket.event,
          ticket
        });
      }

      console.log("✅ Pago aprobado y procesado:", payment.id);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error en webhook Mercado Pago:", error);
    return res.sendStatus(500);
  }
});

export default router;
