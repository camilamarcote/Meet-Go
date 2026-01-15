import {
  MercadoPagoConfig,
  Preference,
  PreApproval
} from "mercadopago";

// =============================
// 🔐 Configuración base
// =============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// =============================
// 🎟️ PAGO DE EVENTO (ONE-TIME)
// =============================
const preferenceClient = new Preference(mpClient);

export async function createPaymentPreference({ event, user, ticketId }) {
  try {
    const price = Number(event.price);

    if (!price || price <= 0) {
      throw new Error("Precio inválido");
    }

    const response = await preferenceClient.create({
      body: {
        external_reference: `ticket_${ticketId}`,

        items: [
          {
            id: ticketId.toString(),                 // ✅ recomendado
            title: event.name,
            description: event.description || "Entrada a evento",
            category_id: "tickets",                  // ✅ recomendado
            quantity: 1,
            currency_id: "UYU",
            unit_price: price
          }
        ],

        payer: {
          email: user.email,                         // ✅ obligatorio
          first_name: user.firstName || "Usuario",   // ✅ recomendado
          last_name: user.lastName || "MeetGo"       // ✅ recomendado
        },

        back_urls: {
          success: `${process.env.FRONT_URL}/payment-success`,
          failure: `${process.env.FRONT_URL}/payment-failure`,
          pending: `${process.env.FRONT_URL}/payment-pending`
        },

        auto_return: "approved",

        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,

        metadata: {
          ticketId: ticketId.toString(),
          eventId: event._id.toString(),
          userId: user._id.toString(),
          type: "event"
        }
      }
    });

    return response;

  } catch (error) {
    console.error("❌ Error creando pago Mercado Pago:", error);
    throw error;
  }
}

// =============================
// 🔁 SUSCRIPCIÓN MENSUAL (SDK NUEVO)
// =============================
const preapprovalClient = new PreApproval(mpClient);

export async function createSubscription({ user }) {
  try {
    const response = await preapprovalClient.create({
      body: {
        reason: "Suscripción mensual Meet&Go",
        external_reference: `subscription_${user._id}`,

        payer_email: user.email,

        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 390,
          currency_id: "UYU"
        },

        back_url: `${process.env.FRONT_URL}/suscripcion-success`,
        notification_url: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,

        status: "pending"
      }
    });

    return response;

  } catch (error) {
    console.error("❌ Error suscripción Mercado Pago:", error);
    throw error;
  }
}
