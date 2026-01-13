import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";
import { generateToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";

const router = express.Router();

/* =============================
   📦 MULTER
============================= */
const upload = multer({ storage: multer.memoryStorage() });

/* =============================
   👤 PERFIL
============================= */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener perfil" });
  }
});

/* =============================
   📧 VERIFY (link del mail)
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=true`);
  } catch (error) {
    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=error`);
  }
});

/* =============================
   🔁 RESEND VERIFICATION
============================= */
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "La cuenta ya está verificada" });
    }

    const token = generateToken(user);
    user.verificationToken = token;
    await user.save();

    await sendVerificationEmail(user.email, token);

    res.json({ message: "Email de verificación reenviado" });
  } catch (error) {
    console.error("❌ Resend error:", error);
    res.status(500).json({ message: "Error al reenviar email" });
  }
});

/* =============================
   📝 REGISTER
============================= */
router.post("/register", upload.single("profileImage"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      age,
      nationality,
      department,
      personality,
      style,
      bio
    } = req.body;

    if (!password) {
      return res.status(400).json({ message: "La contraseña es obligatoria" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial"
      });
    }

    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({ message: "Usuario o email ya existe" });
    }

    const languages = req.body.languages
      ? JSON.parse(req.body.languages)
      : [];

    const interests = req.body.interests
      ? JSON.parse(req.body.interests)
      : [];

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      age,
      nationality,
      department: department || "",
      personality: personality || "",
      style: style || "",
      bio: bio || "",
      languages,
      interests,
      profileImage: req.file ? req.file.originalname : ""
    });

    const token = generateToken(user);
    user.verificationToken = token;
    await user.save();

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
    res.status(500).json({ message: "Error en login" });
  }
});

export default router;
