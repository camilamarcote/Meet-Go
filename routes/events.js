import express from "express";
import multer from "multer";
import Event from "../models/event.js";
import cloudinary from "../config/cloudinary.js";
import { protect, optionalAuth } from "../middlewares/auth.js";

const router = express.Router();

// =============================
// 📦 MULTER (MEMORIA)
// =============================
const upload = multer({
  storage: multer.memoryStorage()
});

// =============================
// 🟢 TODOS LOS EVENTOS (PÚBLICO - SIN AUTENTICACIÓN OBLIGATORIA)
// =============================
router.get("/", optionalAuth, async (req, res) => {
  try {
    // Obtener todos los eventos activos
    let query = { isActive: true };
    
    // Si el usuario está autenticado y tiene perfil completo, mostrar todos los eventos
    // Si no, mostrar solo eventos públicos (sin restricciones adicionales)
    if (req.user && req.user.experienceProfile?.completed) {
      // Usuario autenticado con perfil completo - ver todos los eventos
      const events = await Event.find(query).sort({ createdAt: -1 });
      return res.json(events);
    } else {
      // Usuario no autenticado o perfil incompleto - mostrar solo eventos públicos
      // Por ahora mostramos todos los eventos, pero puedes agregar un campo "isPublic" si lo necesitas
      const events = await Event.find(query).sort({ createdAt: -1 });
      return res.json(events);
    }
    
  } catch (error) {
    console.error("❌ Error cargando eventos:", error);
    res.status(500).json({ message: "Error al cargar eventos" });
  }
});

// =============================
// 🔵 EVENTO POR ID (PÚBLICO - SIN AUTENTICACIÓN OBLIGATORIA)
// =============================
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Verificar si el evento está activo
    if (event.isActive === false) {
      return res.status(404).json({ message: "Evento no disponible" });
    }

    res.json(event);

  } catch (error) {
    console.error("❌ Error cargando evento:", error);
    res.status(500).json({ message: "Error al cargar evento" });
  }
});

// =============================
// 🟣 CREAR EVENTO (SOLO ORGANIZADORAS)
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
      // Verificar que el usuario sea organizadora
      if (!req.user.isOrganizer) {
        return res.status(403).json({ message: "Solo organizadoras pueden crear eventos" });
      }

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
        isActive = true,
        isPublic = true
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
        groupMembersCount: groupMembersCount || 0,
        isActive: isActive === 'true' || isActive === true,
        isPublic: isPublic === 'true' || isPublic === true
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);

    } catch (error) {
      console.error("❌ Error creando evento:", error);
      res.status(500).json({ message: "Error creando evento" });
    }
  }
);

// =============================
// ✏️ ACTUALIZAR EVENTO (SOLO ORGANIZADORAS)
// =============================
router.put(
  "/:id",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "whatsappQR", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Verificar que el usuario sea organizadora
      if (!req.user.isOrganizer) {
        return res.status(403).json({ message: "Solo organizadoras pueden editar eventos" });
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Evento no encontrado" });
      }

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
        isActive,
        isPublic
      } = req.body;

      // Actualizar campos
      if (name) event.name = name;
      if (description) event.description = description;
      if (category) event.category = category;
      if (department) event.department = department;
      if (date) event.date = date;
      if (time) event.time = time;
      if (price) event.price = Number(price);
      if (whatsappLink) event.whatsappLink = whatsappLink;
      if (groupMembersCount) event.groupMembersCount = groupMembersCount;
      if (isActive !== undefined) event.isActive = isActive === 'true' || isActive === true;
      if (isPublic !== undefined) event.isPublic = isPublic === 'true' || isPublic === true;

      // Actualizar imágenes si se suben nuevas
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
        event.image = imageUpload.secure_url;
      }

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
        event.whatsappQR = qrUpload.secure_url;
      }

      const updatedEvent = await event.save();
      res.json(updatedEvent);

    } catch (error) {
      console.error("❌ Error actualizando evento:", error);
      res.status(500).json({ message: "Error actualizando evento" });
    }
  }
);

// =============================
// 🗑️ ELIMINAR EVENTO (SOLO ORGANIZADORAS)
// =============================
router.delete("/:id", protect, async (req, res) => {
  try {
    // Verificar que el usuario sea organizadora
    if (!req.user.isOrganizer) {
      return res.status(403).json({ message: "Solo organizadoras pueden eliminar eventos" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    // Soft delete - marcar como inactivo
    event.isActive = false;
    await event.save();

    res.json({ message: "Evento eliminado correctamente" });

  } catch (error) {
    console.error("❌ Error eliminando evento:", error);
    res.status(500).json({ message: "Error eliminando evento" });
  }
});

export default router;