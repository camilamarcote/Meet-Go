import express from "express";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import User from "../models/user.js";

const router = express.Router();

// =============================
// 📂 MULTER CONFIG
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + ext;
    cb(null, fileName);
  }
});

const upload = multer({ storage });


// =============================
// 🟢 REGISTER (con imagen + bcrypt)
// =============================
router.post("/register", upload.single("profileImage"), async (req, res) => {
  try {
    console.log("📩 Datos recibidos (register):", req.body);

    const {
      firstName,
      lastName,
      username,
      email,
      password,
      age,
      department,
      personality,
      style,
      bio,
      interests,
      nationality,
      languages
    } = req.body;

    // 🔐 Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Imagen
    const profileImage = req.file ? `/uploads/${req.file.filename}` : "";

    // Parsear intereses
    const parsedInterests =
      typeof interests === "string" ? JSON.parse(interests) : interests;

    // Parsear idiomas
    const parsedLanguages =
      typeof languages === "string" ? JSON.parse(languages) : languages;

    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      age,
      department: department || "",
      nationality,
      languages: parsedLanguages || [],
      personality,
      style,
      bio,
      interests: parsedInterests || [],
      profileImage,
    });

    await newUser.save();

    res.status(201).json({
      message: "Usuario registrado con éxito",
      user: newUser,
    });

  } catch (error) {
    console.error("❌ Error en register:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "El usuario o email ya existe",
      });
    }

    res.status(500).json({ message: "Error al registrar usuario" });
  }
});


// =============================
// 🟡 LOGIN (email o username + bcrypt)
// =============================
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }],
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
      user: foundUser,
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Error en login" });
  }
});


// =============================
// 🔵 GET USER BY ID
// =============================
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(user);

  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});


// =============================
// 🟣 UPDATE PROFILE (con imagen)
// =============================
router.put("/:id", upload.single("profileImage"), async (req, res) => {
  try {
    console.log("📩 Datos recibidos (update):", req.body);

    const updates = { ...req.body };

    // Imagen nueva
    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    // Intereses
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = JSON.parse(updates.interests);
    }

    // Idiomas
    if (updates.languages && typeof updates.languages === "string") {
      updates.languages = JSON.parse(updates.languages);
    }

    // 🔐 Si se cambia la contraseña
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({
      message: "Perfil actualizado",
      user: updatedUser,
    });

  } catch (error) {
    console.error("❌ Error al actualizar:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

export default router;
