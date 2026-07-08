import express from "express";
import EventTicket from "../models/eventTicket.js";
import Event from "../models/event.js"; 
import User from "../models/user.js"; 
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../utils/mailer.js"; 
import { protect } from "../middlewares/auth.js";

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// ========================================================
// 💳 CREAR PREFERENCIA DE PAGO (O CONFIRMAR SI ES GRATIS)
// ========================================================
router.post("/payments/create/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;

    console.log(`=== 🚀 [NUEVO FLUJO POR ROLES] Procesando Ticket Maestro: ${ticketId} ===`);

    const ticketMaestro = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticketMaestro) {
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticketMaestro.payment?.status === "paid") {
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    // Identificar el lote completo de tickets
    const ticketsDelGrupo = await EventTicket.find({
      event: ticketMaestro.event?._id,
      cartId: ticketMaestro.cartId 
    }).populate("user").populate("event");

    const cantidadEntradas = ticketsDelGrupo.length || 1;

    // 🕵️‍♂️ CAMINO 1: BUSCAR Y EVALUAR AL USUARIO EN LA BASE DE DATOS
    let esSuscriptorValido = false;
    if (ticketMaestro.user?._id) {
      const usuarioEnDb = await User.findById(ticketMaestro.user._id);
      if (usuarioEnDb) {
        esSuscriptorValido = usuarioEnDb.isSubscriber === true || usuarioEnDb.roles?.includes("admin");
      }
    }

    // 🎯 CAMINO 2: ASIGNACIÓN DE PRECIO EN BASE AL ATRIBUTO EVALUADO
    // Si es suscriptor válido mira "altPrice", si no mira "price"
    const precioUnitario = esSuscriptorValido 
      ? Number(ticketMaestro.event?.altPrice ?? 0) 
      : Number(ticketMaestro.event?.price ?? 0);

    const isGratis = precioUnitario <= 0;

    // 🌟 VALIDACIÓN PARA EVENTOS GRATUITOS (O CUANDO ALTPRICE SEA 0)
    if (isGratis) {
      console.log(`🎁 [CAMINO SUSCRIPTOR GRATIS] Procesando ${cantidadEntradas} pases a $0`);

      const transactionIdComun = `FREE-${Date.now()}`;

      for (const t of ticketsDelGrupo) {
        t.payment = {
          status: "paid",
          amount: 0,
          transactionId: transactionIdComun,
          paidAt: new Date()
        };
        await t.save();

        const recipientEmail = t.guestEmail || t.user?.email;
        if (recipientEmail) {
          try {
            await sendTicketMail({
              to: recipientEmail,
              userName: t.user?.name || t.guestName || "Invitado",
              event: t.event,
              ticket: t
            });
          } catch (mailError) {
            console.error(`❌ Error enviando correo:`, mailError);
          }
        }
      }

      return res.json({
        status: "paid",
        message: `${cantidadEntradas} ticket(s) confirmado(s) sin costo`,
        init_point: null
      });
    }

    // 🔥 CAMINO DE PAGO: SE ENVÍA EL ATRIBUTO EVALUADO DIRECTAMENTE
    console.log(`💰 [CAMINO DE PAGO] Suscriptor: ${esSuscriptorValido} -> Atributo asignado: ${esSuscriptorValido ? "altPrice" : "price"} ($${precioUnitario})`);

    const payerData = ticketMaestro.guestEmail ? {
      name: ticketMaestro.guestName || "Invitado",
      email: ticketMaestro.guestEmail,
      id: "guest"
    } : {
      name: ticketMaestro.user?.name || "Usuario Meet&Go",
      email: ticketMaestro.user?.email,
      id: ticketMaestro.user?._id
    };

    // Le pasamos el precio unitario final ya resuelto de forma limpia
    const preference = await createPaymentPreference({
      event: ticketMaestro.event,
      user: payerData,
      ticketId: ticketMaestro._id,
      quantity: cantidadEntradas,
      targetPrice: precioUnitario 
    });

    return res.json({ 
      status: "pending",
      init_point: preference.init_point 
    });

  } catch (error) {
    console.error("❌ Error crítico en pasarela:", error);
    return res.status(500).json({ message: "Error procesando el ticket" });
  }
});

// ==========================================
// 🔔 WEBHOOK ENTRANTE DE MERCADO PAGO
// ==========================================
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== "payment" || !data?.id) return res.sendStatus(200);

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status === "approved") {
      const ticketIdMaestro = payment.external_reference;
      if (!ticketIdMaestro) return res.sendStatus(200);

      const ticketMaestro = await EventTicket.findById(ticketIdMaestro);
      if (!ticketMaestro || ticketMaestro.payment?.status === "paid") return res.sendStatus(200);

      const ticketsDelGrupo = await EventTicket.find({
        event: ticketMaestro.event,
        cartId: ticketMaestro.cartId 
      }).populate("user").populate("event");

      // Volvemos a evaluar el precio real para guardarlo en el historial del ticket aprobado
      let esSuscriptorValido = false;
      if (ticketMaestro.user) {
        const usuarioEnDb = await User.findById(ticketMaestro.user);
        esSuscriptorValido = usuarioEnDb && (usuarioEnDb.isSubscriber === true || usuarioEnDb.roles?.includes("admin"));
      }
      const precioCobrado = esSuscriptorValido ? (ticketMaestro.event?.altPrice ?? 0) : (ticketMaestro.event?.price ?? 0);

      for (const t of ticketsDelGrupo) {
        const recipientEmail = t.guestEmail || t.user?.email;
        if (recipientEmail) {
          try {
            await sendTicketMail({
              to: recipientEmail,
              userName: t.user?.name || t.guestName || "Invitado",
              event: t.event,
              ticket: t
            });
          } catch (mErr) {
            console.error(mErr);
          }
        }

        t.payment = {
          status: "paid",
          amount: precioCobrado, 
          transactionId: payment.id,
          paidAt: new Date()
        };
        await t.save();
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.get("/my-tickets", protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const misTickets = await EventTicket.find({
      $and: [
        { $or: [ { user: userId }, { guestEmail: req.user?.email } ] },
        { "payment.status": "paid" }
      ]
    }).populate("event").sort({ createdAt: -1 });
    return res.json(misTickets);
  } catch (e) {
    return res.status(500).json({ message: "Error" });
  }
});

export default router;