import express from "express";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import User from "../models/user.js";

const router = express.Router();

/* =============================
   📂 MULTER CONFIG
============================= */
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

/* =============================
   🟢 REGISTER (bcrypt + imagen)
============================= */
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
      nationality,
      personality,
      style,
      bio,
      interests,
      languages
    } = req.body;

    // 🔐 Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Imagen
    const profileImage = req.file ? `/uploads/${req.file.filename}` : "";

    // Parsear arrays
    const parsedInterests =
      typeof interests === "string" ? JSON.parse(interests) : interests;

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
      nationality: nationality || "",
      interests: parsedInterests || [],
      languages: parsedLanguages || [],
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
    console.error("❌ Error en register:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "El usuario o el email ya existe"
      });
    }

    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

/* =============================
   🟡 LOGIN (email o username)
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
        profileImage: foundUser.profileImage
      }
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Error en login" });
  }
});

/* =============================
   🔵 GET USER BY ID
============================= */
router.get("/:id", async (req, res) => {
  try {
    const user = await User
      .findById(req.params.id)
      .select("-password"); // ⛔ ocultar password

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);

  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});

/* =============================
   🟣 UPDATE PROFILE
============================= */
router.put("/:id", upload.single("profileImage"), async (req, res) => {
  try {
    console.log("📩 Datos recibidos (update):", req.body);

    const updates = { ...req.body };

    // Imagen
    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    // Parsear arrays
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = JSON.parse(updates.interests);
    }

    if (updates.languages && typeof updates.languages === "string") {
      updates.languages = JSON.parse(updates.languages);
    }

    // 🔐 Si se cambia contraseña
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      message: "Perfil actualizado",
      user: updatedUser
    });

  } catch (error) {
    console.error("❌ Error al actualizar:", error);
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});

export default router;
