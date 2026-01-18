import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { protect } from "../middlewares/auth.js";
import { generateToken } from "../utils/jwt.js";
import { sendVerificationEmail } from "../utils/sendverificationemail.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

/* =============================
   📦 MULTER (MEMORIA)
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
      phone, // <-- NUEVO
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
      phone: phone || "", // <-- NUEVO
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

    console.log("🟢 SUBSCRIPTION LOGIN:", foundUser.subscription);

    const token = generateToken(foundUser);

    res.json({
      token,
      user: {
        _id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        username: foundUser.username,
        email: foundUser.email,
        phone: foundUser.phone, // <-- NUEVO
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
      phone: req.body.phone, // <-- NUEVO
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

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");

    res.json(user);
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

export default router;

