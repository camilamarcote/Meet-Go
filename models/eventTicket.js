import mongoose from "mongoose";

const EventTicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Permitimos que sea null para invitados
    index: true
  },
  guestEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  // 👥 NUEVOS CAMPOS: Capturan los datos obligatorios del modal de invitados
  guestName: {
    type: String,
    required: false,
    trim: true
  },
  guestPhone: {
    type: String,
    required: false,
    trim: true
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    index: true
  },
  accessType: {
    type: String,
    enum: ["subscription", "single-event"],
    required: true,
    default: "single-event" // 💡 Agregamos valor por defecto para que no falle con invitados
  },
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
    transactionId: {
      type: String,
      default: null
    }
  },
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
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  validUntil: {
    type: Date,
    required: true,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  }
}, {
  timestamps: true
});

// 1. Unicidad para usuarios registrados (ignora a los invitados)
EventTicketSchema.index(
  { user: 1, event: 1 }, 
  { unique: true, partialFilterExpression: { user: { $exists: true, $gt: null } } }
);

// 2. Unicidad para invitados por email (evita compras duplicadas del mismo invitado)
EventTicketSchema.index(
  { guestEmail: 1, event: 1 }, 
  { unique: true, partialFilterExpression: { guestEmail: { $exists: true, $gt: null } } }
);

export default mongoose.model("EventTicket", EventTicketSchema);