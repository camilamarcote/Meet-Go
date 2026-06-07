import express from "express";
import Event from "../models/event.js";
import EventTicket from "../models/eventTicket.js";
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

    // Capturamos la cantidad enviada por el front (por defecto 1 si no viene)
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

    // 🛒 ID DE CARRITO ÚNICO: Agrupa todos los pases pertenecientes a este lote de compra
    const idLoteCompra = crypto.randomBytes(12).toString("hex");
    const ticketsCreados = [];

    // 🔄 BUCLE: Creamos pases individuales con QRs distintos para evitar el error E11000 de duplicados
    for (let i = 0; i < cantidadAComprar; i++) {
      
      // Cada ticket tiene un código QR único e irrepetible 🎉
      const qrUnicoIndividual = crypto.randomBytes(16).toString("hex");

      const ticketData = {
        event: eventId,
        qrCode: qrUnicoIndividual,  // 🎯 ÚNICO: Soluciona el error MongoServerError E11000
        cartId: idLoteCompra,        // 🛒 NUEVO: Los vincula bajo el mismo lote de pago
        payment: {
          status: "pending",
          amount: evento.price || 0
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

    console.log(`✅ [BACKEND] Creados con éxito ${cantidadAComprar} tickets independientes en el lote: ${idLoteCompra}`);

    // Devolvemos el array de tickets creados al frontend
    return res.status(201).json({ tickets: ticketsCreados });

  } catch (error) {
    console.error("❌ Error creando lote de tickets:", error);
    return res.status(500).json({ message: "Error interno al procesar la reserva de pases" });
  }
});

export default router;