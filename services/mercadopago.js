import pkg from "mercadopago";
const { MercadoPagoConfig, Preference, Preapproval } = pkg;

// =============================
// 🔐 Configuración base
// =============================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// =============================
// Clientes
// =============================
const preferenceClient = new Preference(mpClient);
const preapprovalClient = new Preapproval(mpClient);

// ======================================================
// 🎟️ PAGO DE EVENTO (mantiene compatibilidad)
// ======================================================
export async function createPaymentPreference({
  event,
  user,
  ticketId
}) {
  const price = Number(event.price);

  if (!price || price <= 0) {
    throw new Error("Precio del evento inválido");
  }

  return preferenceClient.create({
    body: {
      external_reference: `ticket_${ticketId}`,
      items: [
        {
          id: `event_${event._id}`,
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
        ticketId,
        eventId: event._id,
        userId: user._id,
        type: "event"
      }
    }
  });
}

// ======================================================
// 🔁 SUSCRIPCIÓN MENSUAL
// ======================================================
export async function createSubscription({ user }) {
  return preapprovalClient.create({
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
}
