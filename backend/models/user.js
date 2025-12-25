import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  firstName: { type: String, trim: true, required: true },
  lastName: { type: String, trim: true, required: true },

  username: { type: String, unique: true, required: true, trim: true },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
  },

  age: { type: Number, min: 0, required: true },
  department: { type: String, trim: true, required: true },

  interests: { type: [String], default: [] },
  personality: { type: String, trim: true, default: "" },
  style: { type: String, trim: true, default: "" },
  bio: { type: String, trim: true, default: "" },

  profileImage: { type: String, default: "" },

  password: { type: String, required: true },

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

    canceledAt: { type: Date }, // si se dio de baja
  },

  // =========================
  // 🎟️ ROLES
  // =========================
  roles: { type: [String], default: [] }, // ej: ["user", "organizer", "admin"]
  isOrganizer: { type: Boolean, default: false },

}, { timestamps: true });

export default mongoose.model("User", UserSchema);
