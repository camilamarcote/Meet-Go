import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },

    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    age: { type: Number, min: 0, required: true },

    department: { type: String, trim: true, default: "" },

    nationality: { type: String, trim: true, required: true },

    languages: { type: [String], default: [] },
    interests: { type: [String], default: [] },

    personality: { type: String, trim: true, default: "" },
    style: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },

    profileImage: { type: String, default: "" },

    // 🔐 EMAIL VERIFICATION
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      default: null
    },

    // 🔁 SUSCRIPCIÓN
    subscription: {
      isActive: { type: Boolean, default: false },
      plan: {
        type: String,
        enum: ["monthly", "annual", null],
        default: null
      },
      startedAt: { type: Date, default: null },
      validUntil: { type: Date, default: null },
      canceledAt: { type: Date, default: null }
    },

    roles: { type: [String], default: ["user"] },
    isOrganizer: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
