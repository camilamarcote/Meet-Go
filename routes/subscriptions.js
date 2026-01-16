import express from "express";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import User from "../models/User.js";
import { sendSubscriptionMail } from "../utils/mailer.js";

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preapprovalClient = new PreApproval(mpClient);

router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type !== "preapproval") {
      return res.sendStatus(200);
    }

    const subscription = await preapprovalClient.get({
      id: data.id
    });

    if (subscription.status === "authorized") {
      const userId = subscription.external_reference.replace("subscription_", "");

      const user = await User.findByIdAndUpdate(
        userId,
        {
          subscription: {
            isActive: true,
            plan: "monthly",
            startedAt: new Date(),
            validUntil: subscription.auto_recurring?.end_date || null
          }
        },
        { new: true }
      );

      if (user?.email) {
        await sendSubscriptionMail(user);
      }

      console.log("✅ Suscripción activada:", subscription.id);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Webhook suscripción:", error);
    res.sendStatus(500);
  }
});

export default router;
