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

    if (!firstName || !lastName || !username || !email || !password || !age || !nationality) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // 🔍 Verificar duplicados ANTES
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({
        message: "El usuario o el email ya existe"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const safeParse = (value) => {
      if (!value) return [];
      try {
        return JSON.parse(value);
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
      isVerified: false
    });

    // 🔐 TOKEN JWT (24h)
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

  try {
  await sendVerificationEmail(email, token);
} catch (mailError) {
  console.error("❌ Error enviando mail:", mailError);
  return res.status(400).json({
    message: "No se pudo enviar el email de verificación. Intentalo más tarde."
  });
}

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
   📧 VERIFY EMAIL
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: "Usuario inválido" });
    }

    user.isVerified = true;
    await user.save();

    // 👉 Redirige al login
    res.redirect(`${process.env.FRONTEND_URL}/login.html`);

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
        message: "Debés verificar tu email antes de iniciar sesión"
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
