import express from "express";
import multer from "multer";
import Event from "../models/event.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// =============================
// 📦 MULTER (MEMORIA, NO DISCO)
// =============================
const upload = multer({
  storage: multer.memoryStorage()
});

// =============================
// 🟢 TODOS LOS EVENTOS
// =============================
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// 🔵 EVENTO POR ID
// =============================
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =============================
// 🟣 CREAR EVENTO (CLOUDINARY)
// =============================
router.post(
  "/",
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

      // =============================
      // 🖼️ SUBIR IMAGEN PRINCIPAL
      // =============================
      if (req.files?.image?.[0]) {
        const imageUpload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "events" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.files.image[0].buffer);
        });

        imageUrl = imageUpload.secure_url;
      }

      // =============================
      // 📲 SUBIR QR DE WHATSAPP
      // =============================
      if (req.files?.whatsappQR?.[0]) {
        const qrUpload = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "whatsapp_qr" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.files.whatsappQR[0].buffer);
        });

        qrUrl = qrUpload.secure_url;
      }

      // =============================
      // 🧾 GUARDAR EVENTO
      // =============================
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
