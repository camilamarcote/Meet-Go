import express from "express";
import Event from "../models/event.js";
import EventTicket from "../models/eventTicket.js";
import { protect } from "../middlewares/auth.js";
import crypto from "crypto"; // O la librería que uses para generar identificadores únicos

const router = express.Router();

// ========================================================
// 🟣 CREAR TICKETS EN LOTE (SOPORTA CANTIDADES MÚLTIPLES)
// ========================================================
router.post("/events/:eventId/tickets", protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail, guestName, guestPhone, isGuest, quantity } = req.body;

    // 🎯 Capturamos la cantidad enviada por el front (por defecto 1 si no viene)
    const cantidadAComprar = parseInt(quantity) || 1;

    const evento = await Event.findById(eventId);
    if (!evento) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Opcional: Validar cupos si tu evento tiene límite
    if (evento.hasCapacityLimit) {
      const disponibles = evento.maxCapacity - evento.ticketsSold;
      if (disponibles < cantidadAComprar) {
        return res.status(400).json({ message: `Solo quedan ${disponibles} cupos disponibles.` });
      }
    }

    // 🔑 Código común de transacción para agrupar este lote de entradas
    const codigoGrupoQR = crypto.randomBytes(12).toString("hex");

    const ticketsCreados = [];

    // 🔄 BUCLE CLAVE: Guardamos tantos tickets en la BD como el usuario haya pedido
    for (let i = 0; i < cantidadAComprar; i++) {
      const ticketData = {
        event: eventId,
        qrCode: codigoGrupoQR, // 🎯 Comparten el mismo código para identificarlos como grupo
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

    console.log(`✅ [BACKEND] Creados con éxito ${cantidadAComprar} tickets bajo el identificador de grupo: ${codigoGrupoQR}`);

    // Devolvemos el array de tickets creados al frontend
    return res.status(201).json({ tickets: ticketsCreados });

  } catch (error) {
    console.error("❌ Error creando lote de tickets:", error);
    return res.status(500).json({ message: "Error interno al procesar la reserva de pases" });
  }
});

export default router;