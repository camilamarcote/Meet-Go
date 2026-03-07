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
// 🎟️ PAGO DE EVENTO
// =============================
const preferenceClient = new Preference(mpClient);

export async function createPaymentPreference({ event, user, ticketId }) {

  try {

    if (!event || !user || !ticketId) {
      throw new Error("Datos insuficientes para crear el pago");
    }

    const price = Number(event.price);

    if (!price || price <= 0) {
      throw new Error("Precio inválido");
    }

    const preference = await preferenceClient.create({
      body: {

        statement_descriptor: "MEETANDGO",

        external_reference: ticketId.toString(),

        items: [
          {
            id: ticketId.toString(),
            title: event.name,
            description: event.description || "Entrada a evento",
            category_id: "tickets",
            quantity: 1,
            currency_id: "UYU",
            unit_price: price
          }
        ],

        payer: {
          email: user.email,
          first_name: user.firstName || "Usuario",
          last_name: user.lastName || "Meet&Go"
        },

        back_urls: {
          success: `${process.env.FRONT_URL}/payment-success.html`,
          failure: `${process.env.FRONT_URL}/payment-failure.html`,
          pending: `${process.env.FRONT_URL}/payment-pending.html`
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

    // 🔎 DEBUG
    console.log("🧾 Preference creada:", preference.id);
    console.log("🔗 Init point:", preference.init_point);

    return preference;

  } catch (error) {

    console.error("❌ Error creando pago Mercado Pago");

    if (error.cause) {
      console.error("MP Error:", error.cause);
    } else {
      console.error(error);
    }

    throw error;
  }
}


// =============================
// 🔁 SUSCRIPCIÓN MENSUAL
// =============================
const preapprovalClient = new PreApproval(mpClient);

export async function createSubscription({ user }) {

  try {

    if (!user || !user.email) {
      throw new Error("Usuario inválido para suscripción");
    }

    const subscription = await preapprovalClient.create({
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

    console.log("🧾 Subscription ID:", subscription.id);
    console.log("🔗 Init point:", subscription.init_point);

    return subscription;

  } catch (error) {

    console.error("❌ Error suscripción Mercado Pago");

    if (error.cause) {
      console.error("MP Error:", error.cause);
    } else {
      console.error(error);
    }

    throw error;
  }
}