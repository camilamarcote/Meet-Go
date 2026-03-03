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

    // 🔒 PERFIL DE EXPERIENCIA OBLIGATORIO
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
// 🟣 CREAR EVENTO
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
      const {
        name,
        description,
        category,
        department,
        date,
        time,
        price,
        whatsappLink,
        groupMembersCount
      } = req.body;

      let imageUrl = "";
      let qrUrl = "";

      // 🖼️ IMAGEN
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

      // 📲 QR WHATSAPP
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

      const newEvent = new Event({
        name,
        description,
        category,
        department,
        date,
        time,
        price: Number(price) || 0,
        image: imageUrl,
        whatsappLink,
        whatsappQR: qrUrl,
        groupMembersCount: groupMembersCount || 0
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