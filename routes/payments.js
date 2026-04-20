import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";

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

    // Buscamos el ticket. 
    // NOTA: 'user' puede venir null si el ticket fue creado como invitado.
    const ticket = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.payment?.status === "paid") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    // Preparamos los datos del pagador para la preferencia
    // Si no hay ticket.user, enviamos los datos de invitado
    const payerData = ticket.user ? {
      name: ticket.user.name,
      email: ticket.user.email,
      id: ticket.user._id
    } : {
      name: "Invitado",
      email: ticket.guestEmail, // Campo capturado en eventinfo.js
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
    const payment = paymentResponse; // En versiones nuevas de SDK es directo o .body

    console.log("💳 Webhook pago recibido:", payment.id, payment.status);

    if (payment.status === "approved") {
      const ticketId = payment.metadata?.ticket_id || payment.external_reference; 

      if (!ticketId) {
        console.warn("⚠️ Pago aprobado sin ticketId en metadata");
        return res.sendStatus(200);
      }

      // Actualizamos el ticket
      const ticket = await EventTicket.findByIdAndUpdate(
        ticketId,
        {
          payment: {
            status: "paid",
            amount: payment.transaction_amount,
            transactionId: payment.id,
            paidAt: new Date()
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

      console.log("🎟 Ticket actualizado:", ticket._id);

      // --- Lógica de envío de mail ---
      // Determinamos el email destino (registrado o invitado)
      const recipientEmail = ticket.user ? ticket.user.email : ticket.guestEmail;

      if (recipientEmail && typeof sendTicketMail === "function") {
        await sendTicketMail({
          to: recipientEmail,
          userName: ticket.user ? ticket.user.name : "Invitado",
          event: ticket.event,
          ticket: ticket
        });
        console.log(`📧 Mail enviado a: ${recipientEmail}`);
      }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error webhook MercadoPago:", error);
    res.sendStatus(500);
  }
});

export default router;