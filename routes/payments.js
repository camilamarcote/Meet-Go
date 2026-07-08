import express from "express";
import EventTicket from "../models/eventTicket.js";
import Event from "../models/event.js"; 
import User from "../models/user.js"; 
import { createPaymentPreference } from "../services/mercadopago.js";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { sendTicketMail } from "../utils/mailer.js"; 
import { protect } from "../middlewares/auth.js";

const router = express.Router();

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

router.post("/payments/create/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    console.log(`=== 🚀 [NUEVO FLUJO] Procesando Ticket Maestro: ${ticketId} ===`);

    const ticketMaestro = await EventTicket.findById(ticketId).populate("event").populate("user");

    if (!ticketMaestro) return res.status(404).json({ message: "Ticket no encontrado" });
    if (ticketMaestro.payment?.status === "paid") return res.status(409).json({ message: "Ticket ya pagado" });

    const ticketsDelGrupo = await EventTicket.find({
      event: ticketMaestro.event?._id,
      cartId: ticketMaestro.cartId 
    }).populate("user").populate("event");

    const cantidadEntradas = ticketsDelGrupo.length || 1;

    // 🎯 AQUÍ SE CAPTURA EL PRECIO REAL ALMACENADO EN EL TICKET (Sea 0, 500, o 700)
    const price = Number(ticketMaestro.payment?.amount ?? ticketMaestro.event?.price ?? 0);
    const isGratis = price <= 0;

    if (isGratis) {
      console.log(`🎁 [GRATIS] Procesando ${cantidadEntradas} entrada(s) a $0.`);
      const transactionIdComun = `FREE-${Date.now()}`;

      for (const t of ticketsDelGrupo) {
        t.payment = { status: "paid", amount: 0, transactionId: transactionIdComun, paidAt: new Date() };
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
          } catch (mErr) { console.error("❌ Error mail:", mErr); }
        }
      }
      return res.json({ status: "paid", message: "Tickets gratis confirmados", init_point: null });
    }

    console.log(`💰 [DE PAGO] Enviando a Mercado Pago: $${price} por entrada. Total entradas: ${cantidadEntradas}`);

    const payerData = ticketMaestro.guestEmail ? {
      name: ticketMaestro.guestName || "Invitado",
      email: ticketMaestro.guestEmail,
      id: "guest"
    } : {
      name: ticketMaestro.user?.name || "Usuario Meet&Go",
      email: ticketMaestro.user?.email,
      id: ticketMaestro.user?._id
    };

    // 🎯 CLAVE: Le pasamos el parámetro explícito 'finalUnitPrice'
    const preference = await createPaymentPreference({
      event: ticketMaestro.event,
      user: payerData,
      ticketId: ticketMaestro._id,
      quantity: cantidadEntradas,
      finalUnitPrice: price // 👈 Enviado directamente sin intermediarios
    });

    return res.json({ status: "pending", init_point: preference.init_point });

  } catch (error) {
    console.error("❌ Error crítico general:", error);
    return res.status(500).json({ message: "Error procesando el ticket" });
  }
});

// El resto del archivo (webhook y my-tickets) queda igual...
router.post("/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== "payment" || !data?.id) return res.sendStatus(200);

    const payment = await new Payment(mpClient).get({ id: data.id });
    if (payment.status === "approved") {
      const ticketIdMaestro = payment.external_reference;
      if (!ticketIdMaestro) return res.sendStatus(200);

      const ticketMaestro = await EventTicket.findById(ticketIdMaestro);
      if (!ticketMaestro || ticketMaestro.payment?.status === "paid") return res.sendStatus(200);

      const ticketsDelGrupo = await EventTicket.find({ event: ticketMaestro.event, cartId: ticketMaestro.cartId }).populate("user").populate("event");

      for (const t of ticketsDelGrupo) {
        const recipientEmail = t.guestEmail || t.user?.email;
        if (recipientEmail) {
          try { await sendTicketMail({ to: recipientEmail, userName: t.user?.name || t.guestName || "Invitado", event: t.event, ticket: t }); } catch (e) { console.error(e); }
        }
        t.payment = {
          status: "paid",
          amount: t.payment?.amount ?? t.event?.price || 0,
          transactionId: payment.id,
          paidAt: new Date()
        };
        await t.save();
      }
    }
    return res.sendStatus(200);
  } catch (e) { console.error(e); return res.sendStatus(500); }
});

router.get("/my-tickets", protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const misTickets = await EventTicket.find({ $and: [ { $or: [ { user: userId }, { guestEmail: req.user?.email } ] }, { "payment.status": "paid" } ] }).populate("event").sort({ createdAt: -1 });
    return res.json(misTickets);
  } catch (e) { return res.status(500).json({ message: "Error" }); }
});

export default router;