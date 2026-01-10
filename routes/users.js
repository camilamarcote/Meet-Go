import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/user.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";

const router = express.Router();
const upload = multer().single("profileImage");

/* =============================
   🟢 REGISTER
============================= */
router.post("/register", upload, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      age,
      department,
      nationality,
      personality,
      style,
      bio,
      interests,
      languages
    } = req.body;

    if (!firstName || !lastName || !username || !email || !password || !age || !nationality) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const safeParse = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    };

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      age,
      department: department || "",
      nationality,
      interests: safeParse(interests),
      languages: safeParse(languages),
      personality: personality || "",
      style: style || "",
      bio: bio || "",
      profileImage: "",
      verificationToken,
      isVerified: false
    });

    await newUser.save();
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "Registro exitoso. Revisá tu email para confirmar tu cuenta."
    });

  } catch (error) {
    console.error("❌ Register error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Usuario o email ya existe" });
    }

    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

/* =============================
   🟢 VERIFY EMAIL
============================= */
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ message: "Token inválido" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.json({ message: "Cuenta verificada con éxito" });

  } catch (error) {
    res.status(500).json({ message: "Error al verificar cuenta" });
  }
});

/* =============================
   🟡 LOGIN
============================= */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }]
    }).select("+password");

    if (!foundUser) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    if (!foundUser.isVerified) {
      return res.status(403).json({
        message: "Debes verificar tu email antes de iniciar sesión"
      });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    foundUser.password = undefined;

    res.json({
      message: "Login exitoso",
      user: {
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        isOrganizer: foundUser.isOrganizer,
        profileImage: foundUser.profileImage,
        subscription: foundUser.subscription,
        isVerified: foundUser.isVerified
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error en login" });
  }
});

export default router;
