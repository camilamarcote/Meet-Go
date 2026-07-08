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
// 🎟️ PAGO DE EVENTO (Soporte precio dinámico / altPrice)
// =============================
export async function createPaymentPreference({ event, user, ticketId, quantity = 1, overridePrice = null }) {
  try {
    if (!event || !user || !ticketId) {
      throw new Error("Datos insuficientes para crear el pago");
    }

    // 🎯 CLAVE: Si se pasa overridePrice (ej. amount calculado en el ticket), se usa ese.
    // De lo contrario, cae de regreso en event.price.
    const finalPrice = overridePrice !== null ? Number(overridePrice) : Number(event.price);

    if (isNaN(finalPrice) || finalPrice <= 0) {
      throw new Error("Precio calculado inválido");
    }

    const inputQuantity = Number(quantity);
    if (isNaN(inputQuantity) || inputQuantity < 1) {
      throw new Error("Cantidad de entradas inválida");
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
            quantity: inputQuantity, 
            currency_id: "UYU",
            unit_price: finalPrice
          }
        ],

        payer: {
          email: user.email,
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
          userId: user._id ? user._id.toString() : (user.id ? user.id.toString() : "guest_user"),
          type: "event",
          quantity: inputQuantity
        }
      }
    });

    console.log(`🧾 Preference creada con éxito para ${inputQuantity} entrada(s) a $${finalPrice} c/u. ID:`, preference.id);
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