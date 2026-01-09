import express from "express";
import mercadopago from "../config/mercadopago.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { userId } = req.body;

  try {
    const subscription = await mercadopago.preapproval.create({
      reason: "Suscripción mensual Meet&Go",
      external_reference: userId,
      payer_email: "test_user_123@test.com", // ⚠️ luego usar email real
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 10,
        currency_id: "USD"
      },
      back_url: "https://meetandgof.netlify.app/suscripcion-success.html",
      status: "pending"
    });

    res.json({
      init_point: subscription.body.init_point
    });

  } catch (error) {
    console.error("❌ Error Mercado Pago:", error);
    res.status(500).json({ message: "Error creando suscripción" });
  }
});

export default router;
