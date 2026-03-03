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
   📝 REGISTER
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

    const languages = req.body.languages ? JSON.parse(req.body.languages) : [];
    const interests = req.body.interests ? JSON.parse(req.body.interests) : [];

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      phone: phone || "",
      password: hashedPassword,
      age,
      nationality,
      department: department || "",
      personality: personality || "",
      style: style || "",
      bio: bio || "",
      languages,
      interests,
      profileImage: profileImageUrl,
      isVerified: false,
      roles: ["user"],
      subscription: { isActive: false }
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
   ✅ VERIFY ACCOUNT
============================= */
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Token faltante");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).send("Usuario no encontrado");
    }

    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();
    }

    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=true`);
  } catch (error) {
    console.error("❌ Verify error:", error);
    return res.redirect(`${process.env.FRONT_URL}/login.html?verified=false`);
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
