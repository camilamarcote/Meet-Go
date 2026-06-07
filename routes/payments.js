import express from "express";
import EventTicket from "../models/eventTicket.js";
import Event from "../models/event.js"; 
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../utils/mailer.js"; 
import { protect } from "../middlewares/auth.js"; // 👈 Tu middleware real e importación única

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

    console.log(`=== 🚀 [NUEVO FLUJO INTEGRADO] Procesando Ticket Maestro: ${ticketId} ===`);

    const ticketMaestro = await EventTicket.findById(ticketId)
      .populate("event")
      .populate("user");

    if (!ticketMaestro) {
      console.error(`❌ [NUEVO FLUJO] Ticket de referencia ${ticketId} no encontrado en la base de datos.`);
      return res.status(404).json({ message: "Ticket no encontrado" });
    }

    if (ticketMaestro.payment?.status === "paid") {
      console.log(`⚠️ [NUEVO FLUJO] El ticket ${ticketId} ya estaba pagado.`);
      return res.status(409).json({ message: "Ticket ya pagado" });
    }

    // 🎯 IDENTIFICAR GRUPO: Buscamos todos los tickets generados en lote compartiendo el mismo código
    const ticketsDelGrupo = await EventTicket.find({
      event: ticketMaestro.event?._id,
      qrCode: ticketMaestro.qrCode
    }).populate("user").populate("event");

    const cantidadEntradas = ticketsDelGrupo.length || 1;
    console.log(`📦 Se detectó un grupo de ${cantidadEntradas} ticket(s) asociados a esta transacción.`);

    const price = ticketMaestro.event?.price;
    const isGratis = price === 0 || price === "0" || !price || Number(price) <= 0;

    // 🌟 VALIDACIÓN PARA EVENTOS GRATUITOS (PROCESAMIENTO EN LOTE)
    if (isGratis) {
      console.log(`🎁 [NUEVO FLUJO - GRATIS] Validado como GRATUITO. Procesando ${cantidadEntradas} entrada(s).`);

      const transactionIdComun = `FREE-${Date.now()}`;

      // Recorremos cada ticket del grupo gratis para activarlo y enviar su respectivo mail
      for (const t of ticketsDelGrupo) {
        t.payment = {
          status: "paid",
          amount: 0,
          transactionId: transactionIdComun,
          paidAt: new Date()
        };
        await t.save();

        const recipientEmail = t.guestEmail || t.user?.email;
        const userName = t.user?.name || t.guestName || "Invitado";
        const eventData = t.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

        if (recipientEmail) {
          try {
            await sendTicketMail({
              to: recipientEmail,
              userName: userName,
              event: eventData,
              ticket: t
            });
          } catch (mailError) {
            console.error(`❌ Error enviando correo para ticket ${t._id}:`, mailError);
          }
        }
      }

      return res.json({
        status: "paid",
        message: `${cantidadEntradas} ticket(s) gratuito(s) confirmado(s) con éxito`,
        init_point: null
      });
    }

    // 🔥 FLUJO EXCLUSIVO PARA EVENTOS DE PAGO
    console.log(`💰 [NUEVO FLUJO - DE PAGO] Precio unitario: ${price}. Multiplicando x ${cantidadEntradas}...`);

    const payerData = ticketMaestro.guestEmail ? {
      name: ticketMaestro.guestName || "Invitado",
      email: ticketMaestro.guestEmail,
      id: "guest"
    } : {
      name: ticketMaestro.user?.name || "Usuario Meet&Go",
      email: ticketMaestro.user?.email,
      id: ticketMaestro.user?._id
    };

    // Pasamos la cantidad al generador de preferencias de MP
    const preference = await createPaymentPreference({
      event: ticketMaestro.event,
      user: payerData,
      ticketId: ticketMaestro._id,
      quantity: cantidadEntradas 
    });

    return res.json({ 
      status: "pending",
      init_point: preference.init_point 
    });

  } catch (error) {
    console.error("❌ [NUEVO FLUJO] Error crítico general:", error);
    return res.status(500).json({ message: "Error procesando el ticket" });
  }
});

// ==========================================
// 🔔 WEBHOOK ENTRANTE DE MERCADO PAGO
// ==========================================
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "payment" || !data?.id) {
      return res.sendStatus(200);
    }

    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: data.id });

    console.log(`🚀 [WEBHOOK MP] Pago Recibido ID: ${payment.id} - Estado: ${payment.status}`);

    if (payment.status === "approved") {
      const ticketIdMaestro = payment.external_reference || payment.metadata?.ticket_id || payment.metadata?.ticketid; 

      console.log(`🔍 [WEBHOOK MP] Buscando Ticket Maestro ID: ${ticketIdMaestro}`);

      if (!ticketIdMaestro) {
        console.warn("⚠️ [WEBHOOK MP] Pago aprobado omitido: No se halló ticketId de referencia.");
        return res.sendStatus(200);
      }

      const ticketMaestro = await EventTicket.findById(ticketIdMaestro);

      if (!ticketMaestro) {
        console.error(`❌ [WEBHOOK MP] El ticket maestro ${ticketIdMaestro} no existe en la BD.`);
        return res.sendStatus(200);
      }

      if (ticketMaestro.payment?.status === "paid") {
        console.log(`⚠️ [WEBHOOK MP] El ticket ya figuraba como pagado. Omitiendo duplicados.`);
        return res.sendStatus(200);
      }

      // Traemos todos los tickets que pertenecen al lote grupal de la compra
      const ticketsDelGrupo = await EventTicket.find({
        event: ticketMaestro.event,
        qrCode: ticketMaestro.qrCode
      }).populate("user").populate("event");

      const cantidadEntradas = ticketsDelGrupo.length || 1;

      // 🛠️ NOTA DE CONTROL: La sumatoria de "ticketsSold" ya se procesó de forma segura al 
      // hacer el POST inicial en routes/tickets.js. Aquí solo procesamos la liberación de los pases.

      // Procesamos cada ticket aprobado del grupo para guardar estados y enviar emails individuales
      for (const t of ticketsDelGrupo) {
        const recipientEmail = t.guestEmail || t.user?.email;
        const userName = t.user?.name || t.guestName || "Invitado";
        const eventData = t.event || { name: "Evento Meet & Go", date: "Ver en la App", department: "Uruguay" };

        if (recipientEmail) {
          try {
            await sendTicketMail({
              to: recipientEmail,
              userName: userName,
              event: eventData,
              ticket: t
            });
          } catch (mailError) {
            console.error("❌ [WEBHOOK MP] Error enviando correo por Resend:", mailError);
          }
        }

        t.payment = {
          status: "paid",
          amount: t.event?.price || 0, 
          transactionId: payment.id,
          paidAt: new Date()
        };
        await t.save();
      }

      console.log(`🎟 [WEBHOOK MP] Se actualizaron ${cantidadEntradas} tickets a estado 'paid' exitosamente.`);
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ [WEBHOOK MP] Error general en la ejecución:", error);
    return res.sendStatus(500);
  }
});

// ========================================================
// 🎟️ 🔥 ENDPOINT INTEGRADO: OBTENER TICKETS DEL USUARIO
// ========================================================
router.get("/my-tickets", protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado de forma válida" });
    }

    console.log(`🔍 [GET MY TICKETS] Buscando pases activos para el usuario ID: ${userId} o Email: ${userEmail}`);

    const misTickets = await EventTicket.find({
      $and: [
        {
          $or: [
            { user: userId },
            { guestEmail: userEmail }
          ]
        },
        { "payment.status": "paid" } 
      ]
    })
    .populate("event")
    .sort({ createdAt: -1 }); 

    console.log(`✅ [GET MY TICKETS] Se encontraron ${misTickets.length} tickets válidos.`);
    return res.json(misTickets);

  } catch (error) {
    console.error("❌ [GET MY TICKETS] Error en la consulta:", error);
    return res.status(500).json({ message: "Error interno al obtener los pases del usuario" });
  }
});

export default router;