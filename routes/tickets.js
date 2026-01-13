import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

import Event from "../models/event.js";
import User from "../models/User.js";
import EventTicket from "../models/eventTicket.js";

const router = express.Router();

console.log("✅ ticketRoutes cargado");

// =============================
// 🎟️ CREAR / REUTILIZAR TICKET
// POST /api/events/:eventId/tickets
// =============================
router.post("/:eventId/tickets", async (req, res) => {
  try {
    const { userId } = req.body;
    const { eventId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const user = await User.findById(userId);
    const event = await Event.findById(eventId);

    if (!user || !event) {
      return res.status(404).json({
        message: "Usuario o evento no encontrado"
      });
    }

    // 🔎 Buscar ticket existente
    const existingTicket = await EventTicket.findOne({
      user: userId,
      event: eventId
    });

    if (existingTicket) {
      // 🟢 Ya pagado → no permitir otro
      if (existingTicket.payment?.status === "approved") {
        return res.status(409).json({
          message: "Ya tenés una entrada para este evento"
        });
      }

      // 🟡 Pendiente → reutilizar
      return res.status(200).json({
        message: "Ticket pendiente reutilizado",
        ticket: existingTicket
      });
    }

    // =============================
    // 🆕 CREAR NUEVO TICKET
    // =============================
    const qrCode = uuidv4();
    const qrImage = await QRCode.toDataURL(qrCode);
    const validUntil = new Date(`${event.date}T${event.time}`);

    const ticket = new EventTicket({
      user: user._id,
      event: event._id,
      accessType: "single-event",
      payment: {
        status: "pending",
        amount: event.price,
        paidAt: null
      },
      qrCode,
      qrImage,
      validUntil,
      used: false
    });

    await ticket.save();

    res.status(201).json({
      message: "🎟️ Ticket creado (pendiente de pago)",
      ticket
    });

  } catch (error) {
    console.error("❌ Error al crear ticket:", error);
    res.status(500).json({ message: "Error al crear ticket" });
  }
});

// =============================
// 📋 MIS EVENTOS
// GET /api/events/my/:userId
// =============================
router.get("/my/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const tickets = await EventTicket.find({ user: userId })
      .populate("event")
      .sort({ createdAt: -1 });

    res.json(tickets);

  } catch (error) {
    console.error("❌ Error al obtener mis eventos:", error);
    res.status(500).json({ message: "Error al obtener mis eventos" });
  }
});

export default router;
