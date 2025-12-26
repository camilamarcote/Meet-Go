import { MercadoPagoConfig, Preference } from "mercadopago";

// =============================
// 🔐 Configuración Mercado Pago
// =============================
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);

// =============================
// 🧾 Crear preferencia de pago
// =============================
export async function createPaymentPreference({ event, user, ticketId }) {
  try {
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            title: event.name,
            description: `Entrada para ${event.name}`,
            quantity: 1,
            currency_id: "UYU",
            unit_price: Number(event.price)
          }
        ],

        payer: {
          name: user.username || user.name,
          email: user.email
        },

        // 🔁 URLs DEL FRONT (NO API)
        back_urls: {
          success: "https://tudominio.com/payment-success.html",
          failure: "https://tudominio.com/payment-failure.html",
          pending: "https://tudominio.com/payment-pending.html"
        },

        auto_return: "approved",

        // 🔔 Webhook (MUY IMPORTANTE)
        notification_url: "https://tudominio.com/api/payments/webhook",

        metadata: {
          ticketId: ticketId.toString(),
          eventId: event._id.toString(),
          userId: user._id.toString()
        }
      }
    });

    console.log("🧾 Preferencia MP creada:", {
      id: preference.id,
      init_point: preference.init_point
    });

    return preference;

  } catch (error) {
    console.error("❌ Error creando preferencia MP:", error);
    throw error;
  }
}
