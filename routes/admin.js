import express from "express";
import User from "../models/User.js";
import { protect, adminOnly } from "../middlewares/auth.js";
import { sendSubscriptionMail } from "../utils/mailer.js";
import { generateSubscriptionQR } from "../utils/subscriptionQr.js";

const router = express.Router();

/* ===============================
   👥 LISTAR USUARIOS (ADMIN)
=============================== */
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -verificationToken");

    res.json(users);
  } catch (error) {
    console.error("❌ Error obteniendo usuarios:", error);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
});

/* ===============================
   ✉️ ENVIAR MAIL DE SUSCRIPCIÓN
=============================== */
router.post(
  "/send-subscription-mail/:userId",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const { qrImage } = await generateSubscriptionQR(user);
      const whatsappLink = process.env.WHATSAPP_GROUP_LINK;

      await sendSubscriptionMail({
        user,
        qrImage,
        whatsappLink
      });

      res.json({ message: "Mail enviado correctamente" });
    } catch (error) {
      console.error("❌ Error enviando mail:", error);
      res.status(500).json({ message: "Error enviando mail" });
    }
  }
);

/* ===============================
   ✅ ACTIVAR SUSCRIPCIÓN
=============================== */
router.post(
  "/activate-subscription/:userId",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.userId,
        {
          subscription: {
            isActive: true,
            plan: "manual",
            startedAt: new Date(),
            validUntil: null,
            canceledAt: null
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json({
        message: "Suscripción activada",
        subscription: user.subscription
      });
    } catch (error) {
      console.error("❌ Error activando suscripción:", error);
      res.status(500).json({ message: "Error activando suscripción" });
    }
  }
);

/* ===============================
   🚫 DESACTIVAR SUSCRIPCIÓN
=============================== */
router.post(
  "/deactivate-subscription/:userId",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      user.subscription.isActive = false;
      user.subscription.plan = null;
      user.subscription.validUntil = null;
      user.subscription.canceledAt = new Date();

      await user.save();

      res.json({
        message: "Suscripción dada de baja correctamente"
      });
    } catch (error) {
      console.error("❌ Error dando de baja:", error);
      res.status(500).json({ message: "Error desactivando suscripción" });
    }
  }
);

export default router;