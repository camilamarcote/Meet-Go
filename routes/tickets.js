import express from "express";
import crypto from "crypto"; 
import Ticket from "../models/eventTicket.js"; 
import Event from "../models/event.js";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// ========================================================
// 🎯 OBTENER TODOS LOS TICKETS (Para Panel de Organizadoras)
// ========================================================
router.get("/tickets", async (req, res) => {
  try {
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
// 🎟️ OBTENER "MIS TICKETS" (PROTEGIDO - HISTORIAL DE USUARIO)
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
// 🟣 CREAR TICKETS EN LOTE (SOPORTA CANTIDADES MÚLTIPLES)
// ========================================================
router.post("/events/:eventId/tickets", protect, async (req, res) => {
  try {
     // ... todo el resto de tu código queda exactamente igual ...
    const { eventId } = req.params;
    const { guestEmail, guestName, guestPhone, isGuest, quantity } = req.body;

    // Convertir y asegurar que la cantidad sea un número válido y positivo
    const qtyToBuy = Math.max(1, parseInt(quantity) || 1);

    // Verificar si el evento existe
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "El evento especificado no existe." });
    }

    // 🛑 VALIDACIÓN PREVIA DE CUPOS EN BASE A LA CANTIDAD SOLICITADA
    if (event.hasCapacityLimit) {
      const remaining = event.maxCapacity - (event.ticketsSold || 0);
      if (remaining < qtyToBuy) {
        return res.status(400).json({ 
          message: `Lo sentimos, no hay cupos suficientes. Solo quedan ${remaining} lugares disponibles.` 
        });
      }
    }

    // Generamos una semilla única compartida para vincular la compra grupal en Mercado Pago
    const grupoCompraId = `QRGRP-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const ticketsCreados = [];

    // 🚀 BUCLE EN LOTE: Creamos un registro individual por cada entrada solicitada
    for (let i = 0; i < qtyToBuy; i++) {
      // Cada pase físico/digital necesita su propio código QR único para que el check-in no falle
      const codigoUnicoTicket = `TICK-${crypto.randomUUID()}`;

      // Si es una entrada de acompañante, lo especificamos en el nombre para la visualización del front
      const finalGuestName = i === 0 ? guestName : `${guestName} (Acompañante ${i})`;

      let ticketData = {
        event: eventId,
        qrCode: codigoUnicoTicket, 
        payment: {
          status: event.price === 0 ? "free" : "pending", 
          amount: event.price || 0
        }
      };

      if (isGuest === true || isGuest === "true") {
        ticketData.isGuest = true;
        ticketData.guestEmail = guestEmail;
        ticketData.guestName = finalGuestName;
        ticketData.guestPhone = guestPhone;
      } else {
        if (req.user) {
          ticketData.user = req.user._id;
          ticketData.isGuest = false;
        } else {
          return res.status(401).json({ message: "No autenticado o datos de invitado faltantes." });
        }
      }

      const nuevoTicket = new Ticket(ticketData);
      const ticketGuardado = await nuevoTicket.save();
      ticketsCreados.push(ticketGuardado);

      // 🔥 VINCULACIÓN EN EL PERFIL DEL USUARIO REGISTRADO
      if (!ticketData.isGuest && ticketData.user) {
        await User.findByIdAndUpdate(ticketData.user, {
          $push: { tickets: ticketGuardado._id }
        });
      }
    }

    // Actualizar el contador del evento sumando el bloque total comprado de una sola vez
    await Event.findByIdAndUpdate(eventId, { $inc: { ticketsSold: qtyToBuy } });

    // Devolvemos tanto la estructura antigua (ticket único) como la nueva (tickets en array) para retrocompatibilidad
    res.status(201).json({
      message: `${qtyToBuy} ticket(s) generado(s) con éxito`,
      ticket: ticketsCreados[0], 
      tickets: ticketsCreados
    });

  } catch (error) {
    console.error("❌ Error creando el lote de tickets:", error);
    res.status(500).json({ message: "Error interno al procesar la reserva de los tickets" });
  }
});

export default router;