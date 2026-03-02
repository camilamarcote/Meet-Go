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

      // ✅ QR válido con URL pública
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
   ✅ ACTIVAR SUSCRIPCIÓN MANUAL
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
        message: "Suscripción activada manualmente",
        subscription: user.subscription
      });
    } catch (error) {
      console.error("❌ Error activando suscripción:", error);
      res.status(500).json({ message: "Error activando suscripción" });
    }
  }
);

import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";

/* ===============================
   🚫 DESACTIVAR SUSCRIPCIÓN (ADMIN)
=============================== */
router.post(
  "/deactivate-subscription/:userId",
  protect,
  isAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      user.subscription.isActive = false;
      user.subscription.canceledAt = new Date();
      user.subscription.validUntil = null;
      user.subscription.plan = null;

      await user.save();

      res.json({
        message: "Suscripción dada de baja correctamente"
      });

    } catch (error) {
      console.error("❌ Error al dar de baja:", error);
      res.status(500).json({
        message: "Error al desactivar suscripción"
      });
    }
  }
);

export default router;
