import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();
const upload = multer().single("profileImage");

const FRONT_URL =
  process.env.FRONT_URL || "https://meetandgof.netlify.app";


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

    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({ message: "El usuario o el email ya existe" });
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

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    await sendVerificationEmail(email, token);
    await newUser.save();

    res.status(201).json({
      message: "Registro exitoso. Revisá tu email para verificar tu cuenta."
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "No se pudo completar el registro" });
  }
});

/* =============================
   📧 VERIFY EMAIL (REDIRECT)
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

    // 👇 SI YA ESTÁ VERIFICADO → OK IGUAL
    if (user.isVerified) {
      return res.json({
        message: "La cuenta ya estaba verificada"
      });
    }

    user.isVerified = true;
    await user.save();

    return res.json({
      message: "Cuenta verificada correctamente"
    });

  } catch (error) {
    console.error("❌ Verify error:", error);
    return res.status(400).json({
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

    const token = jwt.sign(
      { id: foundUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    foundUser.password = undefined;

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email,
        isVerified: foundUser.isVerified
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error en login" });
  }
});


/* =============================
   👤 GET PERFIL
============================= */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ message: "Error al cargar perfil" });
  }
});

/* =============================
   ✏️ UPDATE PERFIL
============================= */
router.put(
  "/me",
  authMiddleware,
  upload,
  async (req, res) => {
    try {
      const updates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username: req.body.username,
        age: req.body.age,
        department: req.body.department || "",
        personality: req.body.personality || "",
        bio: req.body.bio || ""
      };

      // eliminar undefined
      Object.keys(updates).forEach(
        key => updates[key] === undefined && delete updates[key]
      );

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true }
      );

      res.json({
        message: "Perfil actualizado",
        user
      });
    } catch (error) {
      console.error("❌ Update profile error:", error);
      res.status(500).json({ message: "Error al actualizar perfil" });
    }
  }
);


export default router;
