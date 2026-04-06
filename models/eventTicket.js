// routes/tickets.js

import express from "express";
import EventTicket from "../models/EventTicket.js";
import Event from "../models/event.js";
import { protect } from "../middlewares/auth.js";
import crypto from "crypto";

const router = express.Router();

// =============================
// 🎟️ CREAR TICKET (al pagar o unirse suscriptor)
// =============================
router.post("/api/events/:eventId/tickets", protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;
    const { accessType } = req.body; // "subscription" o "single-event"

    // Verificar que el usuario sea el mismo del token
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // Verificar que el evento existe
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Verificar si ya existe un ticket para este usuario y evento
    const existingTicket = await EventTicket.findOne({ user: userId, event: eventId });
    if (existingTicket) {
      return res.status(400).json({ message: "Ya tienes un ticket para este evento" });
    }

    // Calcular fecha de validez (7 días después de la fecha del evento o 30 días si no hay fecha)
    let validUntil;
    if (event.date) {
      validUntil = new Date(event.date);
      validUntil.setDate(validUntil.getDate() + 7); // Válido hasta 7 días después del evento
    } else {
      validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30); // Válido por 30 días
    }

    // Generar código QR único
    const qrCode = crypto.randomBytes(32).toString("hex");

    // Determinar el monto y estado del pago según el tipo de acceso
    let paymentStatus = "pending";
    let amount = 0;

    if (accessType === "subscription") {
      paymentStatus = "paid"; // Los suscriptores no pagan por evento individual
      amount = 0;
    } else if (accessType === "single-event") {
      amount = event.price || 0;
      if (amount === 0) {
        paymentStatus = "free";
      } else {
        paymentStatus = "pending"; // Se actualizará cuando se complete el pago
      }
    }

    // Crear el ticket
    const ticket = new EventTicket({
      user: userId,
      event: eventId,
      accessType: accessType || "single-event",
      payment: {
        status: paymentStatus,
        amount: amount,
        paidAt: paymentStatus === "paid" || paymentStatus === "free" ? new Date() : null
      },
      qrCode: qrCode,
      validUntil: validUntil, // ✅ AHORA SÍ TIENE UNA FECHA VÁLIDA
      used: false,
      usedAt: null
    });

    await ticket.save();

    // Si el evento es gratis, marcar como pagado inmediatamente
    if (event.price === 0 && accessType !== "subscription") {
      ticket.payment.status = "free";
      ticket.payment.paidAt = new Date();
      await ticket.save();
    }

    res.status(201).json({
      message: "Ticket creado exitosamente",
      ticket: {
        _id: ticket._id,
        qrCode: ticket.qrCode,
        validUntil: ticket.validUntil,
        payment: ticket.payment
      }
    });

  } catch (error) {
    console.error("❌ Error al crear ticket:", error);
    res.status(500).json({ message: "Error al crear ticket", error: error.message });
  }
});

// =============================
// 🔍 OBTENER TICKETS DEL USUARIO
// =============================
router.get("/api/users/me/tickets", protect, async (req, res) => {
  try {
    const tickets = await EventTicket.find({ user: req.user._id })
      .populate("event")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error("❌ Error obteniendo tickets:", error);
    res.status(500).json({ message: "Error al obtener tickets" });
  }
});

// =============================
// ✅ VERIFICAR TICKET (para ingreso)
// =============================
router.get("/api/tickets/verify/:qrCode", protect, async (req, res) => {
  try {
    const { qrCode } = req.params;

    const ticket = await EventTicket.findOne({ qrCode })
      .populate("user", "name email")
      .populate("event", "name date");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    // Verificar si el ticket está vencido
    if (new Date() > ticket.validUntil) {
      return res.status(400).json({ message: "Ticket vencido" });
    }

    // Verificar si ya fue usado
    if (ticket.used) {
      return res.status(400).json({ message: "Ticket ya utilizado" });
    }

    res.json({
      valid: true,
      ticket: {
        userName: ticket.user.name,
        userEmail: ticket.user.email,
        eventName: ticket.event.name,
        eventDate: ticket.event.date,
        accessType: ticket.accessType
      }
    });

  } catch (error) {
    console.error("❌ Error verificando ticket:", error);
    res.status(500).json({ message: "Error al verificar ticket" });
  }
});

// =============================
// 🚪 MARCAR TICKET COMO USADO (ingreso a evento)
// =============================
router.post("/api/tickets/use/:qrCode", protect, async (req, res) => {
  try {
    const { qrCode } = req.params;

    const ticket = await EventTicket.findOne({ qrCode });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticket.used) {
      return res.status(400).json({ message: "Ticket ya utilizado" });
    }

    if (new Date() > ticket.validUntil) {
      return res.status(400).json({ message: "Ticket vencido" });
    }

    ticket.used = true;
    ticket.usedAt = new Date();
    await ticket.save();

    res.json({ message: "Ingreso registrado exitosamente" });

  } catch (error) {
    console.error("❌ Error usando ticket:", error);
    res.status(500).json({ message: "Error al registrar ingreso" });
  }
});

export default router;