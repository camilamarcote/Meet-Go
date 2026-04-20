import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { optionalAuth } from "../middlewares/auth.js"; // ← CAMBIAR protect por optionalAuth

import Event from "../models/event.js";
import User from "../models/User.js";
import EventTicket from "../models/eventTicket.js"; 

const router = express.Router();

console.log("✅ ticketRoutes cargado");

// =============================
// 🎟️ CREAR / REUTILIZAR TICKET (PERMITE ANÓNIMOS)
// POST /:eventId/tickets
// =============================
router.post("/:eventId/tickets", optionalAuth, async (req, res) => {  // ← usar optionalAuth
  try {
    const { userId } = req.body;
    const { eventId } = req.params;
    const { guestName, guestEmail } = req.body; // Datos opcionales de invitado

    // Validar ID del evento
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "ID de evento inválido" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    let user = null;
    let isGuest = false;

    // Si hay userId y usuario autenticado, buscar el usuario
    if (userId && req.user && req.user._id.toString() === userId) {
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
    } 
    // Si no hay usuario autenticado, es invitado
    else if (!req.user) {
      isGuest = true;
      // No necesitamos crear un usuario, solo guardaremos datos de invitado en el ticket
    }
    // Si hay userId pero no coincide con el autenticado
    else if (userId && req.user && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // Buscar ticket existente (solo si hay usuario registrado)
    let existingTicket = null;
    if (user) {
      existingTicket = await EventTicket.findOne({
        user: userId,
        event: eventId
      });
    }

    if (existingTicket) {
      if (existingTicket.payment?.status === "paid") {
        return res.status(409).json({
          message: "Ya tenés una entrada para este evento"
        });
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
    
    // Calcular validUntil de manera segura
    let validUntil;
    if (event.date && event.time) {
      validUntil = new Date(`${event.date}T${event.time}`);
    } else if (event.date) {
      validUntil = new Date(event.date);
    } else {
      validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
    }

    // Construir el ticket según si es usuario registrado o invitado
    let ticketData = {
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

    if (user) {
      // Usuario registrado
      ticketData.user = user._id;
    } else {
      // Usuario invitado (anónimo)
      ticketData.guestName = guestName || "Invitado";
      ticketData.guestEmail = guestEmail || null;
    }

    const ticket = new EventTicket(ticketData);
    await ticket.save();

    res.status(201).json({
      message: "🎟️ Ticket creado (pendiente de pago)",
      ticket: {
        _id: ticket._id,
        qrCode: ticket.qrCode,
        validUntil: ticket.validUntil,
        payment: ticket.payment,
        isGuest: !user
      }
    });

  } catch (error) {
    console.error("❌ Error al crear ticket:", error);
    res.status(500).json({ message: "Error al crear ticket", error: error.message });
  }
});

// =============================
// 📋 MIS EVENTOS (SOLO USUARIOS REGISTRADOS)
// GET /my/:userId
// =============================
router.get("/my/:userId", optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario autenticado sea el mismo (si está autenticado)
    if (req.user && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // Si no hay usuario autenticado, no puede ver "mis eventos"
    if (!req.user) {
      return res.status(401).json({ message: "Debes iniciar sesión para ver tus eventos" });
    }

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

// =============================
// 🔍 VER TICKET POR QR (PÚBLICO)
// GET /ticket/:qrCode
// =============================
router.get("/ticket/:qrCode", async (req, res) => {
  try {
    const { qrCode } = req.params;

    const ticket = await EventTicket.findOne({ qrCode })
      .populate("event");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    // Devolver información básica del ticket (sin datos sensibles)
    res.json({
      _id: ticket._id,
      event: ticket.event,
      paymentStatus: ticket.payment?.status,
      used: ticket.used,
      validUntil: ticket.validUntil,
      isGuest: !!ticket.guestName
    });

  } catch (error) {
    console.error("❌ Error al obtener ticket:", error);
    res.status(500).json({ message: "Error al obtener ticket" });
  }
});

export default router;