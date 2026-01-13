import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";

import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";

const router = express.Router();

/* =============================
   👤 PERFIL ACTUAL (/me)
============================= */
router.get("/me", protect, async (req, res) => {
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
   ✏️ ACTUALIZAR PERFIL (/me)
============================= */
router.put("/me", protect, async (req, res) => {
  try {
    // Parse arrays si vienen como string
    if (req.body.languages) {
      req.body.languages = JSON.parse(req.body.languages);
    }
    if (req.body.interests) {
      req.body.interests = JSON.parse(req.body.interests);
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
      req.user.id,
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
   📧 VERIFY EMAIL
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=true`);

  } catch (error) {
    console.error("❌ Verify error:", error);
    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
  }
});


/* =============================
   📝 REGISTER
============================= */
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      age,
      nationality
    } = req.body;

    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({ message: "Usuario o email ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      age,
      nationality
    });

    const token = generateToken(user);
    await sendVerificationEmail(user.email, token);

    res.status(201).json({
      message: "Usuario creado. Revisá tu email para verificar la cuenta"
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "Error en registro" });
  }
});

/* =============================
   🔐 LOGIN
============================= */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }]
    }).select("+password");

    if (!foundUser) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(password, foundUser.password);
    if (!ok) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    if (!foundUser.isVerified) {
      return res.status(403).json({ message: "Cuenta no verificada" });
    }

    const token = generateToken(foundUser);

    res.json({
      token,
      user: {
        _id: foundUser._id,
        username: foundUser.username,
        profileImage: foundUser.profileImage
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error en login" });
  }
});


export default router;
