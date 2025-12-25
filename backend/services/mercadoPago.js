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

        back_urls: {
          success: "http://localhost:5000/api/payments/success",
          failure: "http://localhost:5000/api/payments/failure",
          pending: "http://localhost:5000/api/payments/pending"
        },

        auto_return: "approved",

        metadata: {
          ticketId: ticketId.toString(),
          eventId: event._id.toString(),
          userId: user._id.toString()
        }
      }
    });

    return preference;

  } catch (error) {
    console.error("❌ Error creando preferencia MP:", error);
    throw error;
  }
}
