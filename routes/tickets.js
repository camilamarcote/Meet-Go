import express from "express";
import crypto from "crypto"; 
import Ticket from "../models/eventTicket.js"; 
import Event from "../models/event.js";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// ========================================================
// 🎯 NUEVO: OBTENER TODOS LOS TICKETS (Para Panel de Organizadoras)
// ========================================================
router.get("/tickets", async (req, res) => {
  try {
    // .populate("event") extrae de forma cruzada el nombre del evento desde MongoDB
    // .populate("user") extrae datos clave del usuario si no fue una compra como invitado
    const tickets = await Ticket.find()
      .populate("event", "name title date")
      .populate("user", "firstName lastName email phone username");

    res.json(tickets);
  } catch (error) {
    console.error("❌ Error al obtener el listado general de tickets:", error);
    res.status(500).json({ message: "Error interno al procesar el listado de tickets" });
  }
});

// ========================================================
// 🎟️ 2. OBTENER "MIS TICKETS" (PROTEGIDO - HISTORIAL DE USUARIO)
// ========================================================
router.get("/my-tickets", protect, async (req, res) => {
  try {
    const userWithTickets = await User.findById(req.user._id).populate({
      path: "tickets",
      populate: {
        path: "event",
        select: "name description date time image department neighborhood price" 
      }
    });

    if (!userWithTickets) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(userWithTickets.tickets);
  } catch (error) {
    console.error("❌ Error al obtener los tickets del usuario:", error);
    res.status(500).json({ message: "Error al cargar tu historial de tickets" });
  }
});

// ========================================================
// 🟣 3. CREAR TICKET (SOPORTA USUARIO LOGUEADO E INVITADOS)
// ========================================================
router.post("/events/:eventId/tickets", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail, guestName, guestPhone, isGuest } = req.body;

    // Verificar si el evento existe
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "El evento especificado no existe." });
    }

    // 🛑 VALIDACIÓN PREVIA DE CUPOS AUTOMÁTICA
    if (event.hasCapacityLimit) {
      const remaining = event.maxCapacity - (event.ticketsSold || 0);
      if (remaining <= 0) {
        return res.status(400).json({ message: "Lo sentimos, los cupos para este evento están agotados." });
      }
    }

    // Generar un código único para el QR basado en un UUID aleatorio
    const codigoUnicoTicket = `TICK-${crypto.randomUUID()}`;

    let ticketData = {
      event: eventId,
      qrCode: codigoUnicoTicket, 
      payment: {
        status: event.price === 0 ? "free" : "pending", 
        amount: event.price || 0
      }
    };

    // Procesamiento según tipo de usuario
    if (isGuest === true || isGuest === "true") {
      ticketData.isGuest = true;
      ticketData.guestEmail = guestEmail;
      ticketData.guestName = guestName;
      ticketData.guestPhone = guestPhone;
    } else {
      if (req.user) {
        ticketData.user = req.user._id;
        ticketData.isGuest = false;
      } else {
        return res.status(401).json({ message: "No autenticado o datos de invitado faltantes." });
      }
    }

    // Instanciar y guardar el nuevo Ticket
    const nuevoTicket = new Ticket(ticketData);
    const ticketGuardado = await nuevoTicket.save();

    // 🔥 VINCULACIÓN DINÁMICA EN EL PERFIL DEL USUARIO REGISTRADO
    if (!ticketData.isGuest && ticketData.user) {
      await User.findByIdAndUpdate(ticketData.user, {
        $push: { tickets: ticketGuardado._id }
      });
    }

    // Actualizar el contador de tickets vendidos del evento
    await Event.findByIdAndUpdate(eventId, { $inc: { ticketsSold: 1 } });

    res.status(201).json({
      message: "Ticket generado con éxito",
      ticket: ticketGuardado
    });

  } catch (error) {
    console.error("❌ Error creando el ticket:", error);
    res.status(500).json({ message: "Error interno al procesar la reserva del ticket" });
  }
});

export default router;