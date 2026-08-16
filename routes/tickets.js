import express from "express";
import Event from "../models/event.js";
import EventTicket from "../models/eventTicket.js";
import User from "../models/User.js"; 
import { protect } from "../middlewares/auth.js";
import crypto from "crypto";
import { generateTicketQR } from "../utils/subscriptionQr.js"; // 👈 Importamos el generador modular de QR
import { appendTicketsToSheet } from "../services/googleSheetsService.js";
import { syncContactToHubSpot } from "../services/hubspotService.js";
import { sendTicketMail } from "../utils/mailer.js"; 

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
    let esSuscriptorValido = false;
    let usuarioEnDb = null;
    if (req.user) {
      usuarioEnDb = await User.findById(req.user._id);
      esSuscriptorValido = usuarioEnDb && (usuarioEnDb.isSubscriber === true || usuarioEnDb.roles?.includes("admin"));
    }

    // 🎯 ASIGNACIÓN DEFINITIVA DEL PRECIO
    const precioFinal = esSuscriptorValido ? (evento.altPrice ?? 0) : (evento.price ?? 0);

    // 🛒 ID DE CARRITO ÚNICO
    const idLoteCompra = crypto.randomBytes(12).toString("hex");
    const ticketsCreados = [];
    const filasParaSheets = []; 

    let compradorNombre = "";
    let compradorEmail = "";
    let compradorTelefono = "";

    // 🔄 BUCLE: Creación de pases individuales con QRs distintos
    for (let i = 0; i < cantidadAComprar; i++) {
      
      const qrUnicoIndividual = crypto.randomBytes(16).toString("hex");

      const ticketData = {
        event: eventId,
        qrCode: qrUnicoIndividual,  
        cartId: idLoteCompra,        
        payment: {
          status: "pending",
          amount: precioFinal 
        }
      };

      // Manejo de roles (Invitado vs Registrado)
      if (isGuest === true || isGuest === "true" || !req.user) {
        ticketData.isGuest = true;
        ticketData.guestEmail = guestEmail;
        ticketData.guestName = guestName;
        ticketData.guestPhone = guestPhone;

        compradorNombre = guestName || "Invitado";
        compradorEmail = guestEmail || "";
        compradorTelefono = guestPhone || "";
      } else {
        ticketData.user = req.user._id;
        ticketData.isGuest = false;

        compradorNombre = `${usuarioEnDb?.firstName || ''} ${usuarioEnDb?.lastName || ''}`.trim() || usuarioEnDb?.username || "Usuario Registrado";
        compradorEmail = usuarioEnDb?.email || "";
        compradorTelefono = usuarioEnDb?.phone || "";
      }

      // 1. Instanciamos el documento para obtener su `_id` definitivo
      const nuevoTicket = new EventTicket(ticketData);

      // 2. Generamos el QR utilizando la función modular subscriptionQr.js
      const { qrImage } = await generateTicketQR(nuevoTicket._id);

      // 3. Asignamos la imagen DataURL resultante al ticket
      nuevoTicket.qrImage = qrImage;

      // 4. Guardamos en la Base de Datos
      await nuevoTicket.save();
      ticketsCreados.push(nuevoTicket);

      // 🟢 Armar la fila correspondiente para Google Sheets
      filasParaSheets.push([
        new Date().toISOString().split("T")[0],
        nuevoTicket._id.toString(),
        compradorNombre,
        compradorEmail,
        evento.name || evento.title || "Evento",
        precioFinal,
        "Pendiente de Pago"
      ]);

      // 📧 ENVIAR MAIL CON EL TICKET Y EL QR ADJUNTO (EN SEGUNDO PLANO)
      if (compradorEmail) {
        sendTicketMail({
          to: compradorEmail,
          userName: compradorNombre,
          event: evento,
          ticket: nuevoTicket
        }).catch(err => console.error("❌ Error enviando mail de ticket:", err));
      }
    }

    // 🔥 ACTUALIZACIÓN DE CUPOS EN LOTE AUTOMÁTICA
    await Event.findByIdAndUpdate(eventId, {
      $inc: { ticketsSold: cantidadAComprar }
    });

    const nombreDelEvento = evento.name || evento.title || "Evento";

    // 📊 ENVIAR A GOOGLE SHEETS
    if (filasParaSheets.length > 0) {
      appendTicketsToSheet(filasParaSheets, nombreDelEvento);
    }

    // 🎯 ENVIAR A HUBSPOT
    if (compradorEmail) {
      const partesNombre = compradorNombre.trim().split(" ");
      const primerNombre = partesNombre[0] || compradorNombre;
      const apellido = partesNombre.slice(1).join(" ") || "";

      syncContactToHubSpot({
        email: compradorEmail,
        firstName: primerNombre,
        lastName: apellido,
        phone: compradorTelefono,
        lastEventBought: nombreDelEvento,
        isSubscriber: esSuscriptorValido,
      });
    }

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
      .populate("event") 
      .populate("user", "firstName lastName username email phone")
      .sort({ createdAt: -1 });

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
    const userId = req.user._id;
    const userEmail = req.user.email;

    const query = {
      $or: [
        { user: userId }
      ]
    };

    if (userEmail) {
      query.$or.push({ guestEmail: userEmail });
    }

    const tickets = await EventTicket.find(query)
      .populate("event") 
      .populate("user", "firstName lastName username email")
      .sort({ createdAt: -1 });

    return res.json(tickets);
  } catch (error) {
    console.error("❌ Error al obtener los tickets del usuario:", error);
    return res.status(500).json({ message: "Error interno al recuperar tus pases." });
  }
});

export default router;