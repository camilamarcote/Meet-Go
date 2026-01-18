import express from "express";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

/* =============================
   👮 PANEL ORGANIZADORAS
============================= */
router.get("/users", protect, async (req, res) => {
  try {
    if (!req.user.isOrganizer) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    const users = await User.find().select("-password");
    res.json(users);

  } catch (error) {
    console.error("❌ Admin users error:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

export default router;
