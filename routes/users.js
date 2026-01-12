import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

    // 🔎 Validación básica
    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !age ||
      !nationality
    ) {
      return res.status(400).json({
        message: "Faltan campos obligatorios"
      });
    }

    // 🔍 Duplicados
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({
        message: "El usuario o el email ya existe"
      });
    }

    // 🔐 Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const safeParse = (value) => {
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    };

    // 👤 Crear usuario (NO guardar todavía)
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
      isVerified: false
    });

    // 🔐 Token verificación (24h)
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 📧 Enviar mail ANTES de guardar
    try {
      await sendVerificationEmail(email, token);
    } catch (mailError) {
      console.error("❌ Error enviando mail:", mailError);
      return res.status(400).json({
        message: "No se pudo enviar el email de verificación. Intentalo más tarde."
      });
    }

    // 💾 Guardar usuario SOLO si el mail salió bien
    await newUser.save();

    res.status(201).json({
      message: "Registro exitoso. Revisá tu email para verificar tu cuenta."
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      message: "No se pudo completar el registro"
    });
  }
});

/* =============================
   📧 VERIFY EMAIL (JSON ONLY)
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        message: "Token faltante"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({
        message: "Usuario inválido"
      });
    }

    if (user.isVerified) {
      return res.json({
        message: "La cuenta ya estaba verificada"
      });
    }

    user.isVerified = true;
    await user.save();

    // ⚠️ IMPORTANTE: NO redirect
    res.json({
      message: "Cuenta verificada correctamente"
    });

  } catch (error) {
    console.error("❌ Verify error:", error);
    res.status(400).json({
      message: "Token inválido o expirado"
    });
  }
});

/* =============================
   🟡 LOGIN
============================= */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({
        message: "Faltan datos"
      });
    }

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }]
    }).select("+password");

    if (!foundUser) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    if (!foundUser.isVerified) {
      return res.status(403).json({
        message: "Debés verificar tu email antes de iniciar sesión"
      });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
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
    res.status(500).json({
      message: "Error en login"
    });
  }
});

export default router;
