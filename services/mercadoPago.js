import { MercadoPagoConfig, Preference } from "mercadopago";

// =============================
// 🔐 Configuración Mercado Pago
// =============================
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN // APP_USR-...
});

const preferenceClient = new Preference(client);

// =============================
// 🧾 Crear preferencia de pago
// (Sirve para eventos y suscripciones)
// =============================
export async function createPaymentPreference({ event, user, ticketId }) {
  try {
    const price = Number(event.price);

    if (!price || price <= 0) {
      throw new Error("Precio del evento inválido");
    }

    const preference = await preferenceClient.create({
      body: {
        // =============================
        // 🔗 Referencia externa (OBLIGATORIA)
        // =============================
        external_reference: `ticket_${ticketId}`,

        items: [
          {
            // ✅ Código interno del item (mejora aprobación)
            id: `event_${event._id}`,

            title: event.name,
            description: `Entrada para ${event.name}`,

            // ✅ Categoría del item (muy importante)
            category_id: "tickets",

            quantity: 1,
            currency_id: "UYU",
            unit_price: price
          }
        ],

        payer: {
          name: user.username || "Usuario",
          email: user.email
        },

        // =============================
        // 🔁 URLs de retorno
        // =============================
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment-success.html`,
          failure: `${process.env.FRONTEND_URL}/payment-failure.html`,
          pending: `${process.env.FRONTEND_URL}/payment-pending.html`
        },

        auto_return: "approved",

        // =============================
        // 🔔 Webhook
        // =============================
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,

        // =============================
        // 🧠 Metadata (clave para backend)
        // =============================
        metadata: {
          ticketId: ticketId.toString(),
          eventId: event._id.toString(),
          userId: user._id.toString(),
          type: "event"
        }
      }
    });

    return preference;

  } catch (error) {
    console.error("❌ Error creando preferencia MP:", error.message);
    throw error;
  }
}
