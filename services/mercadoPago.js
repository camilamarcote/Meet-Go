import { MercadoPagoConfig, Preference, Preapproval } from "mercadopago";

// =============================
// 🔐 Configuración base
// =============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN // APP_USR-...
});

// =============================
// 🎟️ Pago de eventos (Preference)
// =============================
const preferenceClient = new Preference(mpClient);

// =============================
// 🔁 Suscripciones (Preapproval)
// =============================
const preapprovalClient = new Preapproval(mpClient);

/* ======================================================
   🎟️ CREAR PAGO DE EVENTO (ONE-TIME PAYMENT)
====================================================== */
export async function createEventPaymentPreference({
  event,
  user,
  ticketId
}) {
  try {
    const price = Number(event.price);

    if (!price || price <= 0) {
      throw new Error("Precio del evento inválido");
    }

    const preference = await preferenceClient.create({
      body: {
        external_reference: `ticket_${ticketId}`,

        items: [
          {
            id: `event_${event._id}`,
            title: event.name,
            description: `Entrada para ${event.name}`,
            category_id: "events",
            quantity: 1,
            currency_id: "UYU",
            unit_price: price
          }
        ],

        payer: {
          name: user.username || "Usuario",
          email: user.email
        },

        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment-success.html`,
          failure: `${process.env.FRONTEND_URL}/payment-failure.html`,
          pending: `${process.env.FRONTEND_URL}/payment-pending.html`
        },

        auto_return: "approved",

        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,

        metadata: {
          ticketId: ticketId.toString(),
          eventId: event._id.toString(),
          userId: user._id.toString(),
          type: "event"
        },

        statement_descriptor: "MEET&GO"
      }
    });

    return preference;

  } catch (error) {
    console.error("❌ Error creando preferencia de evento:", error);
    throw error;
  }
}

/* ======================================================
   🔁 CREAR SUSCRIPCIÓN MENSUAL
====================================================== */
export async function createSubscription({ user }) {
  try {
    const subscription = await preapprovalClient.create({
      body: {
        reason: "Suscripción mensual Meet&Go",

        external_reference: `subscription_${user._id}`,

        payer_email: user.email,

        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 10,
          currency_id: "USD"
        },

        back_url: `${process.env.FRONTEND_URL}/suscripcion-success.html`,

        notification_url: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,

        status: "pending"
      }
    });

    return subscription;

  } catch (error) {
    console.error("❌ Error creando suscripción MP:", error);
    throw error;
  }
}
