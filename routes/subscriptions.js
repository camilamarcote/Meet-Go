import express from "express";
import User from "../models/User.js";
import { createSubscription } from "../services/mercadopago.js";

const router = express.Router();

// POST /api/subscriptions/create
router.post("/create", async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const subscription = await createSubscription({ user });

    res.json({
      init_point: subscription.init_point
    });

  } catch (error) {
    console.error("❌ Error creando suscripción:", error);
    res.status(500).json({ message: "Error creando suscripción" });
  }
});

export default router;
