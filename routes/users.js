import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";

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
    console.error(error);
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
      return res.redirect(
        `${process.env.FRONT_URL}/login.html?verified=error`
      );
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.redirect(
        `${process.env.FRONT_URL}/login.html?verified=error`
      );
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    return res.redirect(
      `${process.env.FRONT_URL}/login.html?verified=true`
    );
  } catch (error) {
    console.error(error);
    return res.redirect(
      `${process.env.FRONT_URL}/login.html?verified=error`
    );
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
      return res
        .status(400)
        .json({ message: "La cuenta ya está verificada" });
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
   📝 REGISTER (CON CLOUDINARY)
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

    /* 🔐 PASSWORD */
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

    /* 🔎 EXISTENCIA */
    const exists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (exists) {
      return res.status(400).json({ message: "Usuario o email ya existe" });
    }

    /* 📌 ARRAYS */
    const languages = req.body.languages
      ? JSON.parse(req.body.languages)
      : [];

    const interests = req.body.interests
      ? JSON.parse(req.body.interests)
      : [];

    /* ☁️ CLOUDINARY */
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

    /* 👤 CREATE USER */
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
      profileImage: profileImageUrl
    });

    /* 📧 VERIFICACIÓN */
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
    console.error(error);
    res.status(500).json({ message: "Error en login" });
  }
});

/* =============================
   ✏️ UPDATE PROFILE (CON CLOUDINARY)
============================= */
router.put("/me", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      age: req.body.age,
      nationality: req.body.nationality,
      department: req.body.department,
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

    /* ☁️ CLOUDINARY UPDATE */
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

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

export default router;
