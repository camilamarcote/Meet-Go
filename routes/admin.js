import express from "express";
import User from "../models/User.js";
import { protect, adminOnly } from "../middlewares/auth.js";
import { sendSubscriptionMail } from "../utils/mailer.js";
import QRCode from "qrcode";

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

      const qrImage = await QRCode.toDataURL(
        `meetandgo-user:${user._id}`
      );

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

export default router;
