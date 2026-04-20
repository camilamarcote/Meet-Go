import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
// 1. Cambiamos protect por optionalAuth
import { optionalAuth, protect } from "../middlewares/auth.js"; 

import Event from "../models/event.js";
import User from "../models/User.js";
import EventTicket from "../models/eventTicket.js"; 

const router = express.Router();

console.log("✅ ticketRoutes cargado (Modo Híbrido: Registro/Invitado)");

// =============================
// 🎟️ CREAR / REUTILIZAR TICKET
// =============================
router.post("/:eventId/tickets", optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail, isGuest } = req.body; // Recibimos datos de invitado del frontend

    // Validar ID del evento
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "ID de evento inválido" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // 🔎 Lógica de Búsqueda de Ticket Existente
    let existingTicket = null;

    if (req.user) {
      // Si el usuario está logueado, buscamos por su ID
      existingTicket = await EventTicket.findOne({
        user: req.user._id,
        event: eventId
      });
    } else if (guestEmail) {
      // Si es invitado, buscamos por email
      existingTicket = await EventTicket.findOne({
        guestEmail: guestEmail,
        event: eventId,
        paymentStatus: { $ne: "paid" } // Solo reutilizar si no está pagado
      });
    }

    if (existingTicket) {
      if (existingTicket.payment?.status === "paid" || existingTicket.payment?.status === "free") {
        return res.status(409).json({ message: "Ya tienes una entrada para este evento" });
      }
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
    
    let validUntil;
    if (event.date && event.time) {
      validUntil = new Date(`${event.date}T${event.time}`);
    } else {
      validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 1);
    }

    const ticketData = {
      event: event._id,
      accessType: "single-event",
      payment: {
        status: event.price === 0 ? "free" : "pending",
        amount: event.price || 0,
        paidAt: event.price === 0 ? new Date() : null
      },
      qrCode,
      qrImage,
      validUntil,
      used: false
    };

    // Asignar dueño: O usuario logueado o email de invitado
    if (req.user) {
      ticketData.user = req.user._id;
    } else if (guestEmail) {
      ticketData.guestEmail = guestEmail;
      ticketData.isGuest = true;
    } else {
      return res.status(400).json({ message: "Se requiere un usuario o un email de invitado" });
    }

    const ticket = new EventTicket(ticketData);
    await ticket.save();

    res.status(201).json({
      message: "🎟️ Ticket creado",
      ticket
    });

  } catch (error) {
    console.error("❌ Error al crear ticket:", error);
    res.status(500).json({ message: "Error al crear ticket", error: error.message });
  }
});

// =============================
// 📋 MIS EVENTOS (Requiere estar logueado)
// =============================
router.get("/my/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const tickets = await EventTicket.find({ user: userId })
      .populate("event")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener mis eventos" });
  }
});

export default router;