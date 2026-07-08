import { MercadoPagoConfig, Preference, PreApproval } from "mercadopago";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(mpClient);

// =============================
// 🎟️ PAGO DE EVENTO
// =============================
export async function createPaymentPreference({ event, user, ticketId, quantity = 1, targetPrice }) {
  try {
    if (!event || !user || !ticketId) {
      throw new Error("Datos insuficientes para crear el pago");
    }

    // Asignamos directamente el precio evaluado por el controlador (price o altPrice)
    const price = Number(targetPrice);

    if (isNaN(price) || price <= 0) {
      throw new Error("Precio inválido para procesar en Mercado Pago");
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
            unit_price: price // 💸 Aquí va el precio del camino correspondiente
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

    console.log(`🧾 Preferencia generada con éxito en Mercado Pago. Valor unitario enviado: $${price}`);
    return preference;

  } catch (error) {
    console.error("❌ Error creando pago Mercado Pago", error);
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
    console.error("❌ Error suscripción Mercado Pago", error);
    throw error;
  }
}