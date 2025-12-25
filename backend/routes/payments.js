import express from "express";
import EventTicket from "../models/eventTicket.js";
import { createPaymentPreference } from "../services/mercadoPago.js";

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

    // 🔹 Crear preferencia Mercado Pago
    const preference = await createPaymentPreference({
      event: ticket.event,
      user: ticket.user,
      ticketId: ticket._id,
    });

    // 🔁 DEVOLVER URL REAL DE MP
    res.json({
      init_point: preference.init_point,
    });

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    res.status(500).json({ message: "Error creando pago" });
  }
});

export default router;
