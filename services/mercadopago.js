import mercadopago from "mercadopago";
import { MercadoPagoConfig, Preference } from "mercadopago";

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
            title: event.name,
            quantity: 1,
            currency_id: "UYU",
            unit_price: price
          }
        ],
        payer: {
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
        transaction_amount: 390, // monto ejemplo en UYU
        currency_id: "UYU"
      },
      back_url: `${process.env.FRONTEND_URL}/suscripcion-success.html`,
      notification_url: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,
      status: "pending"
    });

    return response.body;

  } catch (error) {
    console.error("❌ ERROR MERCADO PAGO SUSCRIPCIÓN:", {
      message: error.message,
      status: error.status,
      response: error.response?.data
    });

    throw error;
  }
}
