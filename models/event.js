import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    
    // 📍 UBICACIÓN Y SEGMENTACIÓN GEOGRÁFICA
    department: { type: String, trim: true },
    neighborhood: { type: String, trim: true, default: "" }, // 👈 Añadido para el control de barrios/localidades

    // 👶 FRANJA ETARIA
    ageRange: { type: String, default: "sin_limite" }, // 👈 Añadido para segmentación de edad ("sin_limite", "18-25", etc.)

    date: { type: String, trim: true },
    time: { type: String, trim: true },

    // 💰 PRECIO DEL EVENTO
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    altPrice: { type: Number }, // 👈 Añadido por si manejas un precio alternativo en el futuro

    // 🎟️ GESTIÓN Y CONTROL DE CUPOS DINÁMICOS
    hasCapacityLimit: { type: Boolean, default: false }, // 👈 Define si el evento tiene tope de personas
    maxCapacity: { type: Number, default: 0 },          // 👈 Cantidad máxima de lugares permitidos
    ticketsSold: { type: Number, default: 0 },          // 👈 Contador automático que alimenta la resta del front

    image: { type: String, default: "/img/default_event.jpg" },

    // 🔗 WhatsApp
    whatsappLink: { type: String, trim: true },
    whatsappQR: { type: String, trim: true },

    // 📊 Info opcional
    groupMembersCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true } // Asegura compatibilidad con tu filtro de eventos públicos activos
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
