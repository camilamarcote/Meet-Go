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
import { verifyFirebaseToken } from "../services/firebaseService.js";

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
      interests
    } = req.body;

    if (!firstName || !lastName || !email || !password || !age) {
      return res.status(400).json({ message: "Todos los campos obligatorios deben estar completos" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial"
      });
    }

    const exists = await User.findOne({
      $or: [{ email }, { username: username || email }]
    });

    if (exists) {
      return res.status(400).json({ message: "El email o usuario ya está registrado" });
    }

    let parsedInterests = [];
    if (interests) {
      try {
        parsedInterests = typeof interests === "string" ? JSON.parse(interests) : interests;
      } catch (e) {
        parsedInterests = [];
      }
    }

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
      username: username || email,
      email,
      phone: phone || "",
      isPhoneVerified: false,
      password: hashedPassword,
      age: parseInt(age),
      nationality: "Uruguay",
      department: "",
      interests: parsedInterests,
      languages: [],
      personality: "",
      style: "",
      bio: "",
      profileImage: profileImageUrl,
      isVerified: false,
      roles: ["user"],
      subscription: { isActive: false },
      experienceProfile: {
        completed: false,
        icebreakers: { favoriteMovie: "", favoriteSong: "", favoriteFood: "", dreamTrip: "" },
        socialStyle: { groupPreference: "", conversationStyle: "", initiatesConversation: "" },
        expectations: { lookingFor: [], discomforts: [] }
      }
    });

    const token = generateToken(user);
    user.verificationToken = token;
    await user.save();

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
   🔥 VERIFICACIÓN DE TELÉFONO (FIREBASE)
============================= */
router.post("/verify-phone-firebase", protect, async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Token de Firebase no proporcionado" });
    }

    // Valida el idToken enviado desde el Frontend con Firebase Admin
    const decodedToken = await verifyFirebaseToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualiza el número y lo marca como verificado
    user.phone = phoneNumber;
    user.isPhoneVerified = true;
    await user.save();

    res.json({
      message: "Teléfono verificado correctamente con Firebase",
      phone: phoneNumber,
      isPhoneVerified: true
    });
  } catch (error) {
    console.error("❌ Error en verificación de Firebase:", error);
    res.status(401).json({ message: "Token inválido o expirado" });
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
        isPhoneVerified: foundUser.isPhoneVerified,
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
   ✅ VERIFY ACCOUNT (EMAIL)
============================= */
router.get("/verify", async (req, res) => {
  const frontendUrl = process.env.FRONT_URL || "https://meetandgof.netlify.app";

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token faltante" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationToken = null;
      await user.save();
    }

    return res.redirect(`${frontendUrl}/login.html?verified=true`);
  } catch (error) {
    console.error("❌ Verify error details:", error);
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

    if (!user) {
      return res.json({ message: "Si el email existe, se enviará un enlace" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60;
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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
      age: req.body.age ? parseInt(req.body.age) : undefined,
      nationality: req.body.nationality,
      department: req.body.department,
      phone: req.body.phone,
      personality: req.body.personality,
      style: req.body.style,
      bio: req.body.bio
    };

    if (req.body.languages) {
      try {
        updates.languages =
          typeof req.body.languages === "string"
            ? JSON.parse(req.body.languages)
            : req.body.languages;
      } catch (e) {
        updates.languages = [];
      }
    }

    if (req.body.interests) {
      try {
        updates.interests =
          typeof req.body.interests === "string"
            ? JSON.parse(req.body.interests)
            : req.body.interests;
      } catch (e) {
        updates.interests = [];
      }
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

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

/* =============================
   🎯 EXPERIENCE PROFILE
============================= */
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

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true
    }).select("-password");

    res.json(user);
  } catch (error) {
    console.error("❌ Experience profile error:", error);
    res.status(500).json({ message: "Error al guardar perfil de experiencia" });
  }
});

/* =============================
   🌐 OAUTH GOOGLE LOGIN / REGISTER
============================= */
router.post("/oauth/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token de Google no proporcionado" });
    }

    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: "Token de Google inválido o expirado" });
    }

    const googleUser = await googleRes.json();
    const { email, given_name, family_name, picture } = googleUser;

    if (!email) {
      return res.status(400).json({ message: "No se pudo obtener el email de Google" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomSuffix = crypto.randomBytes(3).toString("hex");
      user = await User.create({
        firstName: given_name || "Usuario",
        lastName: family_name || "Google",
        username: `${email.split("@")[0]}_${randomSuffix}`,
        email: email,
        password: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10),
        age: 18,
        isVerified: true,
        profileImage: picture || "",
        interests: ["Social"],
        subscription: { isActive: false }
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const appToken = generateToken(user);

    return res.json({
      token: appToken,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error("❌ Error en OAuth Google:", error);
    return res.status(500).json({ message: "Error interno al autenticar con Google" });
  }
});

export default router;