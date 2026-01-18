import express from "express";
import User from "../models/User.js";
import { protect, adminOnly } from "../middlewares/auth.js";
import { sendSubscriptionMail } from "../utils/mailer.js";
import QRCode from "qrcode";

const router = express.Router();

router.post("/send-subscription-mail/:userId", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // QR con ID del usuario (o lo que vos quieras)
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
});

export default router;
