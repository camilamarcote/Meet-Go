import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import User from "../models/user.js";

const router = express.Router();

/* =============================
   📂 MULTER (SIN DISK STORAGE)
   Evita crash en Render
============================= */
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

    // 🛑 Validaciones mínimas
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

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🛡️ Parseo seguro de arrays
    const safeParseArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    };

    const parsedInterests = safeParseArray(interests);
    const parsedLanguages = safeParseArray(languages);

    // ⚠️ Imagen desactivada temporalmente
    const profileImage = "";

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      age,
      department: department || "",
      nationality,
      interests: parsedInterests,
      languages: parsedLanguages,
      personality: personality || "",
      style: style || "",
      bio: bio || "",
      profileImage
    });

    await newUser.save();

    res.status(201).json({
      message: "Usuario registrado con éxito",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error("❌ Register error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "El usuario o el email ya existe"
      });
    }

    res.status(500).json({
      message: "Error al registrar usuario"
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
    });

    if (!foundUser) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    res.json({
      message: "Login exitoso",
      user: {
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        isOrganizer: foundUser.isOrganizer,
        profileImage: foundUser.profileImage,
        subscription: foundUser.subscription
      }
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Error en login" });
  }
});

export default router;
