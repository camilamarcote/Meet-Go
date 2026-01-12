import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";

const router = express.Router();

/* =============================
   👤 PERFIL ACTUAL (/me)
============================= */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
});

/* =============================
   ✏️ ACTUALIZAR PERFIL
============================= */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      age: req.body.age,
      nationality: req.body.nationality,
      department: req.body.department || "",
      personality: req.body.personality || "",
      style: req.body.style || "",
      bio: req.body.bio || "",
      languages: req.body.languages || [],
      interests: req.body.interests || []
    };

    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Perfil actualizado",
      user: updatedUser
    });

  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

/* =============================
   📧 VERIFY EMAIL (REDIRECT)
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(
        `${process.env.FRONT_URL}/login.html?verified=error`
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.redirect(
        `${process.env.FRONT_URL}/login.html?verified=error`
      );
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    return res.redirect(
      `${process.env.FRONT_URL}/login.html?verified=true`
    );

  } catch (error) {
    console.error("❌ Verify error:", error);
    return res.redirect(
      `${process.env.FRONT_URL}/login.html?verified=error`
    );
  }
});

export default router;
