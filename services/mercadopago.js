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

const preferenceClient = new Preference(mpClient);

// =============================
// 🎟️ PAGO DE EVENTO
// =============================
export async function createPaymentPreference({ event, user, ticketId }) {
  try {
    if (!event || !user || !ticketId) {
      throw new Error("Datos insuficientes para crear el pago");
    }

    const price = Number(event.price);
    if (isNaN(price) || price <= 0) {
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
          // Ajustamos para que use 'name' (del objeto invitado) o firstName (del usuario real)
          first_name: user.firstName || user.name || "Usuario",
          last_name: user.lastName || "Invitado"
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
          // 🛠️ CORRECCIÓN AQUÍ:
          // Si user._id existe (usuario registrado), lo convierte a string.
          // Si no existe (invitado), usa user.id (que enviamos como "guest") o "guest_user".
          userId: user._id ? user._id.toString() : (user.id ? user.id.toString() : "guest_user"),
          type: "event"
        }
      }
    });

    console.log("🧾 Preference creada:", preference.id);
    return preference;

  } catch (error) {
    console.error("❌ Error creando pago Mercado Pago");
    if (error.cause) {
      console.error("MP Error Details:", JSON.stringify(error.cause, null, 2));
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

    // Para suscripciones, usualmente sí necesitas un ID real de usuario
    const userId = user._id ? user._id.toString() : user.id;

    const subscription = await preapprovalClient.create({
      body: {
        reason: "Suscripción mensual Meet&Go",
        external_reference: `subscription_${userId}`,
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

    return subscription;
  } catch (error) {
    console.error("❌ Error suscripción Mercado Pago");
    throw error;
  }
}