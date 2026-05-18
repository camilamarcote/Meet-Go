import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../services/mailer.js"; // Importamos tu nuevo servicio de Resend

const router = express.Router();

// Configuración de Mercado Pago
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

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

    if (ticket.payment?.status === "paid") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    const payerData = ticket.user ? {
      name: ticket.user.name,
      email: ticket.user.email,
      id: ticket.user._id
    } : {
      name: "Invitado",
      email: ticket.guestEmail, 
      id: "guest"
    };

    const preference = await createPaymentPreference({
      event: ticket.event,
      user: payerData,
      ticketId: ticket._id
    });

    console.log(`🧾 Preference creada para ticket ${ticketId} (Invitado: ${!ticket.user})`);

    return res.json({
      init_point: preference.init_point
    });

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    return res.status(500).json({ message: "Error creando pago" });
  }
});

// =============================
// 🔔 Webhook Mercado Pago
// =============================
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const paymentResponse = await paymentClient.get({ id: data.id });
    const payment = paymentResponse; 

    console.log("💳 Webhook pago recibido:", payment.id, payment.status);

    if (payment.status === "approved") {
      const ticketId = payment.metadata?.ticket_id || payment.external_reference; 

      if (!ticketId) {
        console.warn("⚠️ Pago aprobado sin ticketId en metadata o external_reference");
        return res.sendStatus(200);
      }

      // Actualizamos el ticket en la Base de Datos mudando el estatus a "paid"
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
        console.error("❌ Ticket no encontrado tras aprobación de pago");
        return res.sendStatus(200);
      }

      console.log("🎟 Ticket actualizado con éxito en Base de Datos:", ticket._id);

      // Determinamos el email destino (el escrito a mano por el usuario en la app o web)
      const recipientEmail = ticket.user ? ticket.user.email : ticket.guestEmail;

      if (recipientEmail) {
        // Ejecutamos el envío de correos mediante Resend
        await sendTicketMail({
          to: recipientEmail,
          userName: ticket.user ? ticket.user.name : "Invitado",
          event: ticket.event,
          ticket: ticket
        });
        console.log(`✉️ Mail de ticket enviado automáticamente vía Resend a: ${recipientEmail}`);
      }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error webhook MercadoPago:", error);
    res.sendStatus(500);
  }
});

export default router;