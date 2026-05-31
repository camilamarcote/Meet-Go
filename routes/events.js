import express from "express";
import multer from "multer";
import Event from "../models/event.js";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// =============================
// 📦 MULTER (MEMORIA)
// =============================
const upload = multer({
  storage: multer.memoryStorage()
});

// =============================
// 🟢 TODOS LOS EVENTOS (PROTEGIDO)
// =============================
router.get("/", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user.experienceProfile?.completed) {
      return res.status(403).json({
        code: "PROFILE_INCOMPLETE",
        message: "Perfil de experiencia incompleto"
      });
    }

    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);

  } catch (error) {
    console.error("❌ Error cargando eventos:", error);
    res.status(500).json({ message: "Error al cargar eventos" });
  }
});

// =============================
// 🌍 NUEVO ENDPOINT PÚBLICO - TODOS LOS EVENTOS (SIN AUTENTICACIÓN)
// =============================
router.get("/public/all", async (req, res) => {
  try {
    const events = await Event.find({ isActive: { $ne: false } }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error("❌ Error cargando eventos públicos:", error);
    res.status(500).json({ message: "Error al cargar eventos" });
  }
});

// =============================
// 🔵 EVENTO POR ID (PROTEGIDO)
// =============================
router.get("/:id", protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user.experienceProfile?.completed) {
      return res.status(403).json({
        code: "PROFILE_INCOMPLETE",
        message: "Perfil de experiencia incompleto"
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.json(event);

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    res.status(500).json({ message: "Error al cargar evento" });
  }
});

// =============================
// 🌍 NUEVO ENDPOINT PÚBLICO - EVENTO POR ID (SIN AUTENTICACIÓN)
// =============================
router.get("/public/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.json(event);
  } catch (error) {
    console.error("❌ Error cargando evento público:", error);
    res.status(500).json({ message: "Error al cargar evento" });
  }
});

// =============================
// 🟣 CREAR EVENTO MODIFICADO
// =============================
router.post(
  "/",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "whatsappQR", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Destructuramos las nuevas variables enviadas desde el frontend
      const {
        name,
        description,
        category,
        department,
        neighborhood,      // 📍 Añadido
        ageRange,          // 👶 Añadido
        hasCapacityLimit,  // 🎟️ Añadido
        maxCapacity,       // 🎟️ Añadido
        date,
        time,
        price,
        altPrice,          // 💰 Añadido (Opcional)
        whatsappLink,
        groupMembersCount
      } = req.body;

      let imageUrl = "";
      let qrUrl = "";

      // 🖼️ IMAGEN CLOUDINARY
      if (req.files?.image?.[0]) {
        const imageUpload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "events" },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          ).end(req.files.image[0].buffer);
        });
        imageUrl = imageUpload.secure_url;
      }

      // 📲 QR WHATSAPP CLOUDINARY
      if (req.files?.whatsappQR?.[0]) {
        const qrUpload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "whatsapp_qr" },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          ).end(req.files.whatsappQR[0].buffer);
        });
        qrUrl = qrUpload.secure_url;
      }

      // Construcción del documento Mongoose parseando tipos de datos correctamente
      const newEvent = new Event({
        name,
        description,
        category,
        department,
        neighborhood,                                       // Guardamos barrio
        ageRange: ageRange || "sin_limite",                // Fallback por seguridad
        hasCapacityLimit: hasCapacityLimit === "true",     // Viene como String, convertimos a Boolean
        maxCapacity: hasCapacityLimit === "true" ? (Number(maxCapacity) || 0) : 0, 
        ticketsSold: 0,                                    // Empezamos limpio en cero
        date,
        time,
        price: Number(price) || 0,
        altPrice: altPrice ? Number(altPrice) : undefined, // Guardamos precio alternativo si existe
        image: imageUrl,
        whatsappLink,
        whatsappQR: qrUrl,
        groupMembersCount: groupMembersCount || 0,
        isActive: true 
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);

    } catch (error) {
      console.error("❌ Error creando evento:", error);
      res.status(500).json({ message: "Error creando evento" });
    }
  }
);

export default router;