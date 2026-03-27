import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";
import { generateToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";
import { sendResetPasswordEmail } from "../utils/sendResetPasswordEmail.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

/* =============================
   📦 MULTER (MEMORIA)
============================= */
const upload = multer({ storage: multer.memoryStorage() });

/* =============================
   🔓 PUBLIC – ESTADO SUSCRIPCIÓN (QR)
============================= */
router.get("/public/subscription-status/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ isActive: false });
    }

    res.json({
      isActive: user.subscription?.isActive === true,
      name: `${user.firstName} ${user.lastName}`,
      validUntil: user.subscription?.validUntil
    });
  } catch (error) {
    console.error("❌ Subscription status error:", error);
    res.status(500).json({ isActive: false });
  }
});

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
    console.error("❌ Get profile error:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
});

/* =============================
   📝 REGISTER (VERSIÓN SIMPLIFICADA)
============================= */
router.post("/register", upload.single("profileImage"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      phone,
      password,
      age,
      interests
    } = req.body;

    // Validaciones básicas
    if (!firstName || !lastName || !email || !password || !age) {
      return res.status(400).json({ message: "Todos los campos obligatorios deben estar completos" });
    }

    // Validar contraseña
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial"
      });
    }

    // Verificar si el usuario ya existe
    const exists = await User.findOne({
      $or: [{ email }, { username: username || email }]
    });

    if (exists) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    // Parsear intereses si vienen como string JSON
    let parsedInterests = [];
    if (interests) {
      try {
        parsedInterests = typeof interests === 'string' ? JSON.parse(interests) : interests;
      } catch (e) {
        parsedInterests = [];
      }
    }

    // Subir imagen de perfil si existe
    let profileImageUrl = "";
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "meetandgo/users",
          resource_type: "image"
        }
      );
      profileImageUrl = uploadResult.secure_url;
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con valores por defecto para campos obligatorios
    const user = await User.create({
      firstName,
      lastName,
      username: username || email, // Usar email como username si no se proporciona
      email,
      phone: phone || "",
      password: hashedPassword,
      age: parseInt(age),
      nationality: "Uruguay", // Valor por defecto
      department: "", // Vacío por defecto
      interests: parsedInterests,
      languages: [], // Array vacío por defecto
      personality: "",
      style: "",
      bio: "",
      profileImage: profileImageUrl,
      isVerified: false,
      roles: ["user"],
      subscription: { isActive: false },
      // Perfil de experiencia completado por defecto como falso
      experienceProfile: {
        completed: false,
        icebreakers: {
          favoriteMovie: "",
          favoriteSong: "",
          favoriteFood: "",
          dreamTrip: ""
        },
        socialStyle: {
          groupPreference: "",
          conversationStyle: "",
          initiatesConversation: ""
        },
        expectations: {
          lookingFor: [],
          discomforts: []
        }
      }
    });

    // Generar token de verificación
    const token = generateToken(user);
    user.verificationToken = token;
    await user.save();

    // Enviar email de verificación
    await sendVerificationEmail(user.email, token);

    res.status(201).json({
      message: "Usuario creado exitosamente. Revisá tu email para verificar la cuenta",
      userId: user._id
    });

  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ message: "Error en registro: " + error.message });
  }
});

/* =============================
   🔐 LOGIN
============================= */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({ message: "Faltan credenciales" });
    }

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }]
    }).select("+password");

    if (!foundUser) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (!foundUser.isVerified) {
      return res.status(403).json({ message: "Cuenta no verificada" });
    }

    const token = generateToken(foundUser);

    res.json({
      token,
      user: {
        _id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        username: foundUser.username,
        email: foundUser.email,
        phone: foundUser.phone,
        profileImage: foundUser.profileImage,
        isOrganizer: foundUser.isOrganizer,
        roles: foundUser.roles,
        subscription: foundUser.subscription
      }
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
});
/* =============================
   ✅ VERIFY ACCOUNT
============================= */
router.get("/verify", async (req, res) => {
  console.log("🔍 Verify endpoint called");
  console.log("📝 Token recibido:", req.query.token);
  
  try {
    const { token } = req.query;

    if (!token) {
      console.log("❌ No token provided");
      return res.status(400).json({ message: "Token faltante" });
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔓 Token decodificado:", decoded);

    const user = await User.findById(decoded.id);
    console.log("👤 Usuario encontrado:", user ? user.email : "No encontrado");

    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (!user.isVerified) {
      console.log("✅ Verificando usuario...");
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();
      console.log("✅ Usuario verificado exitosamente");
    } else {
      console.log("ℹ️ Usuario ya estaba verificado");
    }

    const frontendUrl = process.env.FRONT_URL || "https://meetandgof.netlify.app";
    console.log("🔄 Redirigiendo a:", `${frontendUrl}/login.html?verified=true`);
    
    // Redirigir al frontend
    return res.redirect(`${frontendUrl}/login.html?verified=true`);
    
  } catch (error) {
    console.error("❌ Verify error details:", error);
    const frontendUrl = process.env.FRONT_URL || "https://meetandgof.netlify.app";
    return res.redirect(`${frontendUrl}/login.html?verified=false`);
  }
});
/* =============================
   🔁 FORGOT PASSWORD
============================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requerido" });
    }

    const user = await User.findOne({ email });

    // Seguridad: no revelar si existe
    if (!user) {
      return res.json({ message: "Si el email existe, se enviará un enlace" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hora
    await user.save();

    await sendResetPasswordEmail(user.email, token);

    res.json({ message: "Email de recuperación enviado" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Error al procesar solicitud" });
  }
});

/* =============================
   🔐 RESET PASSWORD
============================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "La contraseña no cumple los requisitos"
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Error al cambiar contraseña" });
  }
});

/* =============================
   ✏️ UPDATE PROFILE
============================= */
router.put("/me", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      age: req.body.age,
      nationality: req.body.nationality,
      department: req.body.department,
      phone: req.body.phone,
      personality: req.body.personality,
      style: req.body.style,
      bio: req.body.bio
    };

    if (req.body.languages) {
      updates.languages = JSON.parse(req.body.languages);
    }

    if (req.body.interests) {
      updates.interests = JSON.parse(req.body.interests);
    }

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "meetandgo/users",
          resource_type: "image"
        }
      );
      updates.profileImage = uploadResult.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true
    }).select("-password");

    res.json(user);
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

router.put("/me/experience", protect, async (req, res) => {
  try {
    const updates = {
      experienceProfile: {
        completed: true,
        icebreakers: req.body.icebreakers,
        socialStyle: req.body.socialStyle,
        expectations: req.body.expectations
      }
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error("❌ Experience profile error:", error);
    res.status(500).json({ message: "Error al guardar perfil de experiencia" });
  }
});




export default router;
