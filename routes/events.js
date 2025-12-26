import express from "express";
import multer from "multer";
import Event from "../../models/event.js";

const router = express.Router();

// =============================
// 📂 MULTER
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// =============================
// 🖼️ IMÁGENES POR DEFECTO
// =============================
const defaultImages = {
  Cultural: "/img/default_cultural.jpg",
  Recreativa: "/img/default_recreativa.jpg",
  Deportiva: "/img/default_deportiva.jpg",
  Gastronómica: "/img/default_gastronomica.jpg",
  default: "/img/default_event.jpg",
};

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
// 🟣 CREAR EVENTO
// =============================
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "whatsappQR", maxCount: 1 },
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
        groupMembersCount,
      } = req.body;

      const imagePath = req.files?.image
        ? `/uploads/${req.files.image[0].filename}`
        : defaultImages[category] || defaultImages.default;

      const qrPath = req.files?.whatsappQR
        ? `/uploads/${req.files.whatsappQR[0].filename}`
        : "";

      const newEvent = new Event({
        name,
        description,
        category,
        department,
        date,
        time,
        price: Number(price) || 0,
        image: imagePath,
        whatsappLink,
        whatsappQR: qrPath,
        groupMembersCount: groupMembersCount || 0,
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);

    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  }
);

export default router;
