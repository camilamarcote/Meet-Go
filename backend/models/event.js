import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    department: { type: String, trim: true },

    date: { type: String, trim: true },
    time: { type: String, trim: true },

    // 💰 PRECIO DEL EVENTO
    price: {
      type: Number,
      default: 0,
      min: 0
    },

    image: { type: String, default: "/img/default_event.jpg" },

    // 🔗 WhatsApp
    whatsappLink: { type: String, trim: true },
    whatsappQR: { type: String, trim: true },

    // 📊 Info opcional
    groupMembersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
