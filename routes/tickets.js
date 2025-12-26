import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

import Event from "../models/event.js";
import User from "../models/user.js";
import EventTicket from "../models/eventTicket.js";
import { sendTicketMail } from "../backend/utils/mailer.js";

const router = express.Router();

// =============================
// 🎟️ CREAR TICKET
// =============================
router.post("/events/:eventId/tickets", async (req, res) => {
  try {
    const { userId } = req.body;
    const { eventId } = req.params;

    // 🛑 Validaciones
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

    // 🚫 Evitar duplicados
    const existingTicket = await EventTicket.findOne({
      user: userId,
      event: eventId
    });

    if (existingTicket) {
      return res.status(409).json({
        message: "El usuario ya tiene un ticket para este evento"
      });
    }

    // =============================
    // 🧠 LÓGICA DE ACCESO
    // =============================
    let accessType = "single-event";
    let paymentStatus = "pending";
    let amount = event.price || 0;

    if (user.subscription?.active) {
      accessType = "subscription";
      paymentStatus = "free";
      amount = 0;
    }

    // =============================
    // 🔐 GENERAR QR
    // =============================
    const qrCode = uuidv4();
    const qrImage = await QRCode.toDataURL(qrCode);

    const validUntil = new Date(`${event.date}T${event.time}`);

    const ticket = new EventTicket({
      user: user._id,
      event: event._id,
      accessType,
      payment: {
        status: paymentStatus,
        amount,
        paidAt: null
      },
      qrCode,
      qrImage,
      validUntil,
      used: false
    });

    await ticket.save();
    console.log("🎟️ Ticket guardado correctamente");

    // =============================
    // 📧 ENVIAR MAIL CON QR
    // =============================
    if (user.email) {
      try {
        console.log("📨 Enviando mail a:", user.email);

        await sendTicketMail({
          to: user.email,
          user,
          event,
          ticket
        });

        console.log("✅ Mail enviado");
      } catch (mailError) {
        console.error("⚠️ Error enviando mail:", mailError);
        // ⚠️ NO cortamos el flujo si el mail falla
      }
    } else {
      console.warn("⚠️ El usuario no tiene email, no se envía mail");
    }

    res.status(201).json({
      message: "🎟️ Ticket creado con éxito",
      ticket
    });

  } catch (error) {
    console.error("❌ Error al crear ticket:", error);
    res.status(500).json({ message: "Error al crear ticket" });
  }
});

// =============================
// 🔎 CHECK SI YA TIENE TICKET
// =============================
router.get("/events/:eventId/tickets/check/:userId", async (req, res) => {
  try {
    const { eventId, userId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res.status(400).json({ hasTicket: false });
    }

    const ticket = await EventTicket.findOne({
      event: eventId,
      user: userId
    });

    if (!ticket) {
      return res.json({ hasTicket: false });
    }

    res.json({
      hasTicket: true,
      ticket
    });

  } catch (error) {
    console.error("❌ Error al verificar ticket:", error);
    res.status(500).json({ message: "Error al verificar ticket" });
  }
});

export default router;
