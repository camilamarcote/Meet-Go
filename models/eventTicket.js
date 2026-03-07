import mongoose from "mongoose";

const EventTicketSchema = new mongoose.Schema({

  // =========================
  // 👤 USUARIO
  // =========================
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // 🔍 mejora búsquedas
  },

  // =========================
  // 🎉 EVENTO
  // =========================
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    index: true
  },

  // =========================
  // 💳 TIPO DE ACCESO
  // =========================
  accessType: {
    type: String,
    enum: ["subscription", "single-event"],
    required: true
  },

  // =========================
  // 💰 PAGO
  // =========================
  payment: {
    status: {
      type: String,
      enum: ["pending", "paid", "free"],
      default: "pending"
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    paidAt: {
      type: Date,
      default: null
    },
      paymentId: {
    type: String,
    default: null
  }
  },

  // =========================
  // 🔐 QR
  // =========================
  qrCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  qrImage: {
    type: String,
    default: null
  },

  // =========================
  // 🚪 CONTROL DE INGRESO
  // =========================
  used: {
    type: Boolean,
    default: false
  },

  usedAt: {
    type: Date,
    default: null
  },

  // =========================
  // ⏳ VALIDEZ
  // =========================
  validUntil: {
    type: Date,
    required: true
  }

}, {
  timestamps: true
});

// 🚫 Evita tickets duplicados por usuario + evento
EventTicketSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model("EventTicket", EventTicketSchema);
