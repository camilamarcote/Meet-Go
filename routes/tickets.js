import express from "express";
import Event from "../models/event.js";
import EventTicket from "../models/eventTicket.js";
import User from "../models/User.js"; 
import { protect } from "../middlewares/auth.js";
import crypto from "crypto";
import { generateTicketQR } from "../utils/subscriptionQr.js"; 
import { appendTicketsToSheet } from "../services/googleSheetsService.js";
import { syncContactToHubSpot } from "../services/hubspotService.js";
// 💡 Nota: Puedes conservar o quitar la importación de sendTicketMail si no la usas en este archivo.
import { sendTicketMail } from "../utils/mailer.js"; 

const router = express.Router();

// Middleware opcional para permitir compras tanto de registrados como de invitados
const protectOptional = (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
};

// ========================================================
// 🔍 VERIFICACIÓN PÚBLICA DE ESTADO DEL TICKET (PARA EL QR)
// ========================================================
router.get("/status/:ticketId", async (req, res) => {
  try {
    const ticket = await EventTicket.findById(req.params.ticketId)
      .populate("event", "name title date")
      .populate("user", "firstName lastName username");

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    // 1. Resolver el objeto del evento
    const eventObj = ticket.event || {};
    const eventName = eventObj.name || eventObj.title || ticket.eventName || "Evento Meet & Go";
    
    // Formatear la fecha
    const eventDate = eventObj.date 
      ? new Date(eventObj.date).toLocaleDateString("es-UY", { day: 'numeric', month: 'long', year: 'numeric' })
      : "Fecha no especificada";

    // 2. Comprobar beneficiario
    let holderName = "Titular de la cuenta";
    if (ticket.guestName && ticket.guestName.trim() !== "") {
      holderName = ticket.guestName;
    } else if (ticket.user && typeof ticket.user === "object") {
      const full = `${ticket.user.firstName || ""} ${ticket.user.lastName || ""}`.trim();
      holderName = full || ticket.user.username || "Usuario Registrado";
    }

    return res.json({
      nombre: holderName,
      evento: eventName,
      fecha: eventDate
    });
  } catch (error) {
    console.error("❌ Error verificando ticket:", error);
    return res.status(500).json({ error: "Error al leer el ticket" });
  }
});

// ========================================================
// 🟣 CREAR TICKETS EN LOTE (SOPORTA CANTIDADES MÚLTIPLES)
// ========================================================
router.post("/events/:eventId/tickets", protectOptional, async (req, res) => {
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
    if (req.user && req.user._id) {
      usuarioEnDb = await User.findById(req.user._id);
      esSuscriptorValido = usuarioEnDb && (usuarioEnDb.isSubscriber === true || usuarioEnDb.subscription?.isActive === true || usuarioEnDb.roles?.includes("admin"));
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

    const nombreDelEvento = evento.name || evento.title || "Evento Meet & Go";

    // 🔄 BUCLE: Creación de pases individuales con QRs distintos
    for (let i = 0; i < cantidadAComprar; i++) {
      
      const qrUnicoIndividual = crypto.randomBytes(16).toString("hex");

      const ticketData = {
        event: eventId,
        eventName: nombreDelEvento,
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
        nombreDelEvento,
        precioFinal,
        "Pendiente de Pago"
      ]);

      // 🚫 SE REMOVIÓ EL ENVÍO DE EMAIL DESDE AQUÍ.
      // El correo con el ticket se debe enviar en la notificación webhook del pago aprobado.
    }

    // 🔥 ACTUALIZACIÓN DE CUPOS EN LOTE AUTOMÁTICA
    await Event.findByIdAndUpdate(eventId, {
      $inc: { ticketsSold: cantidadAComprar }
    });

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

    console.log(`✅ [BACKEND] Creados con éxito ${cantidadAComprar} tickets (Pendientes de pago) para lote: ${idLoteCompra}`);

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
      .populate("event", "name title date location price") 
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
      .populate("event", "name title date location price image") 
      .populate("user", "firstName lastName username email")
      .sort({ createdAt: -1 });

    return res.json(tickets);
  } catch (error) {
    console.error("❌ Error al obtener los tickets del usuario:", error);
    return res.status(500).json({ message: "Error interno al recuperar tus pases." });
  }
});

export default router;