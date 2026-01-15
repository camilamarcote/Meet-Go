import mercadopago from "mercadopago";
import { MercadoPagoConfig, Preference } from "mercadopago";

// =============================
// 🔐 Configuración base
// =============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(mpClient);

// =============================
// 🎟️ PAGO DE EVENTO (ONE-TIME)
// =============================
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
            id: ticketId.toString(),
            title: event.name,
            description: `Entrada para ${event.name}`,
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

    return response;

  } catch (error) {
    console.error("❌ Error creando pago:", error);
    throw error;
  }
}

// =============================
// 🔁 SUSCRIPCIÓN MENSUAL
// =============================
export async function createSubscription({ user }) {
  try {
    const response = await mercadopago.preapproval.create({
      reason: "Suscripción mensual Meet&Go",
      external_reference: `subscription_${user._id}`,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 390,
        currency_id: "UYU"
      },
      back_url: `${process.env.FRONT_URL}/suscripcion-success.html`,
      notification_url: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,
      status: "pending"
    });

    return response.body;

  } catch (error) {
    console.error("❌ ERROR MERCADO PAGO SUSCRIPCIÓN:", error);
    throw error;
  }
}
