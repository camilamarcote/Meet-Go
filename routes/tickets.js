import express from "express";
import Ticket from "../models/eventTicket.js"; // Asegúrate de que la ruta a tu modelo sea correcta
import Event from "../models/event.js";
import User from "../models/user.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// ========================================================
// 🎟️ 1. OBTENER "MIS TICKETS" (PROTEGIDO - SOLO PARA EL USUARIO LOGUEADO)
// ========================================================
router.get("/my-tickets", protect, async (req, res) => {
  try {
    // Buscamos al usuario autenticado por su ID (inyectado por el middleware protect)
    // Usamos populate para traer el array de tickets y, anidado, la info esencial de cada evento
    const userWithTickets = await User.findById(req.user._id).populate({
      path: "tickets",
      populate: {
        path: "event",
        select: "name description date time image department neighborhood price" // Campos que renderizaremos en el front
      }
    });

    if (!userWithTickets) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Retornamos únicamente el array de tickets ya estructurado
    res.json(userWithTickets.tickets);
  } catch (error) {
    console.error("❌ Error al obtener los tickets del usuario:", error);
    res.status(500).json({ message: "Error al cargar tu historial de tickets" });
  }
});

// ========================================================
// 🟣 2. CREAR TICKET (SOPORTA USUARIO LOGUEADO E INVITADOS)
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

    let ticketData = {
      event: eventId,
      price: event.price || 0,
      status: "pending" // Cambiará a 'paid' tras pasar la pasarela de Mercado Pago
    };

    // Intentar capturar al usuario logueado si existe un token enviado (opcional en esta ruta mixta)
    // Si tu middleware 'protect' es obligatorio siempre, puedes estructurarlo de otra manera.
    // Aquí asumimos que si viene 'isGuest', se procesa sin vincular ID de usuario.
    if (isGuest === true || isGuest === "true") {
      ticketData.isGuest = true;
      ticketData.guestEmail = guestEmail;
      ticketData.guestName = guestName;
      ticketData.guestPhone = guestPhone;
    } else {
      // Si no es invitado, asumimos flujo con login y requiere datos de cuenta (necesitarías aplicar protect aquí o evaluar el req.user)
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

    // 🔥 VINCULACIÓN DINÁMICA: Si el usuario está registrado, añadimos el ticket a su perfil
    if (!ticketData.isGuest && ticketData.user) {
      await User.findByIdAndUpdate(ticketData.user, {
        $push: { tickets: ticketGuardado._id }
      });
    }

    // Actualizar de forma preventiva el contador de tickets vendidos del evento
    // (Esto incrementará temporalmente la reserva de cupo, idealmente se confirma al pasar a 'paid')
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