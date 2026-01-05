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
    const price = Number(event.price);

    if (!price || price <= 0) {
      throw new Error("Precio del evento inválido");
    }

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            title: event.name,
            description: `Entrada para ${event.name}`,
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
          userId: user._id.toString()
        }
      }
    });

    return preference;

  } catch (error) {
    console.error("❌ Error creando preferencia MP:", error.message);
    throw error;
  }
}
