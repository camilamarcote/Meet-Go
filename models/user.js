import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    age: { type: Number, min: 0, required: true },

    // 📍 Ahora opcional
    department: {
      type: String,
      trim: true,
      default: "",
    },

    // 🌍 NUEVO — obligatorio
    nationality: {
      type: String,
      trim: true,
      required: true,
    },

    // 🗣️ NUEVO — múltiples idiomas
    languages: {
      type: [String],
      default: [],
    },

    // 💡 Perfil
    interests: { type: [String], default: [] },
    personality: { type: String, trim: true, default: "" },
    style: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },

    profileImage: { type: String, default: "" },

    // =========================
    // 🔐 SUSCRIPCIÓN
    // =========================
    subscription: {
      isActive: { type: Boolean, default: false },

      plan: {
        type: String,
        enum: ["monthly", "annual", null],
        default: null,
      },

      startedAt: { type: Date },
      validUntil: { type: Date },
      canceledAt: { type: Date },
    },

    // =========================
    // 🎟️ ROLES
    // =========================
    roles: { type: [String], default: ["user"] },
    isOrganizer: { type: Boolean, default: false },

  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
