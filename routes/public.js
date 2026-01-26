import express from "express";
import User from "../models/User.js";

const router = express.Router();

/* ===============================
   🔓 VERIFICAR SUSCRIPCIÓN (QR)
=============================== */
router.get("/subscription-status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("username subscription");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      isActive: user.subscription?.isActive === true,
      name: user.username,
      validUntil: user.subscription?.validUntil || null
    });

  } catch (error) {
    console.error("❌ Error verificando suscripción:", error);
    res.status(500).json({ message: "Error verificando suscripción" });
  }
});

export default router;
