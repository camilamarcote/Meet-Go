import express from "express";
import Event from "../models/event.js";
import EventTicket from "../models/eventTicket.js";
import User from "../models/user.js"; // 🎯 Importamos el modelo User para chequear el estado real en DB
import { protect } from "../middlewares/auth.js";
import crypto from "crypto";

const router = express.Router();

// ========================================================
// 🟣 CREAR TICKETS EN LOTE (SOPORTA CANTIDADES MÚLTIPLES)
// ========================================================
router.post("/events/:eventId/tickets", protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail, guestName, guestPhone, isGuest, quantity } = req.body;

    const cantidadAComprar = parseInt(quantity) || 1;

    const evento = await Event.findById(eventId);
    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Validar cupos si el evento tiene límite de capacidad
    if (evento.hasCapacityLimit) {
      const disponibles = evento.maxCapacity - evento.ticketsSold;
      if (disponibles < cantidadAComprar) {
        return res.status(400).json({ message: `Solo quedan ${disponibles} cupos disponibles.` });
      }
    }

    // 🕵️‍♂️ RECOGER EL ESTADO ACTUALIZADO DEL USUARIO DESDE MONGO
    // Esto previene fallos si el token JWT del frontend quedó viejo o sin actualizar
    let esSuscriptorValido = false;
    if (req.user) {
      const usuarioEnDb = await User.findById(req.user._id);
      esSuscriptorValido = usuarioEnDb && (usuarioEnDb.isSubscriber === true || usuarioEnDb.roles?.includes("admin"));
    }

    // 🎯 ASIGNACIÓN DEFINITIVA DEL PRECIO
    const precioFinal = esSuscriptorValido ? (evento.altPrice ?? 0) : (evento.price ?? 0);

    // 🛒 ID DE CARRITO ÚNICO
    const idLoteCompra = crypto.randomBytes(12).toString("hex");
    const ticketsCreados = [];

    // 🔄 BUCLE: Creación de pases individuales con QRs distintos
    for (let i = 0; i < cantidadAComprar; i++) {
      
      const qrUnicoIndividual = crypto.randomBytes(16).toString("hex");

      const ticketData = {
        event: eventId,
        qrCode: qrUnicoIndividual,  
        cartId: idLoteCompra,        
        payment: {
          status: "pending",
          amount: precioFinal // 💸 Aplicado dinámicamente según la consulta en vivo
        }
      };

      // Manejo de roles (Invitado vs Registrado)
      if (isGuest === true || isGuest === "true" || !req.user) {
        ticketData.isGuest = true;
        ticketData.guestEmail = guestEmail;
        ticketData.guestName = guestName;
        ticketData.guestPhone = guestPhone;
      } else {
        ticketData.user = req.user._id;
        ticketData.isGuest = false;
      }

      const nuevoTicket = new EventTicket(ticketData);
      await nuevoTicket.save();
      ticketsCreados.push(nuevoTicket);
    }

    // 🔥 ACTUALIZACIÓN DE CUPOS EN LOTE AUTOMÁTICA
    await Event.findByIdAndUpdate(eventId, {
      $inc: { ticketsSold: cantidadAComprar }
    });

    console.log(`✅ [BACKEND] Creados con éxito ${cantidadAComprar} tickets para suscriptor=${esSuscriptorValido} con precio $${precioFinal} en lote: ${idLoteCompra}`);

    return res.status(201).json({ tickets: ticketsCreados });

  } catch (error) {
    console.error("❌ Error creando lote de tickets:", error);
    return res.status(500).json({ message: "Error interno al procesar la reserva de pases" });
  }
});

// ========================================================
// 🟢 OBTENER TODOS LOS TICKETS (Para el Panel de Administración)
// ========================================================
router.get("/tickets", protect, async (req, res) => {
  try {
    if (!req.user.isOrganizer && !req.user.roles?.includes("admin")) {
      return res.status(403).json({ message: "Acceso denegado. No tienes permisos." });
    }

    const tickets = await EventTicket.find()
      .populate("event", "name title price altPrice date time") 
      .populate("user", "firstName lastName username email phone");

    return res.json(tickets);
  } catch (error) {
    console.error("❌ Error al obtener el listado global de tickets:", error);
    return res.status(500).json({ message: "Error interno del servidor al procesar la lista" });
  }
});

// ========================================================
// 🎟️ OBTENER TICKETS DEL USUARIO ACTUAL (Para My-Tickets)
// ========================================================
router.get("/my", protect, async (req, res) => {
  try {
    const tickets = await EventTicket.find({ user: req.user._id })
      .populate("event", "name title price date time") 
      .populate("user", "firstName lastName username email");

    return res.json(tickets);
  } catch (error) {
    console.error("❌ Error al obtener los tickets del usuario:", error);
    return res.status(500).json({ message: "Error interno al recuperar tus pases." });
  }
});

export default router;