import mongoose from "mongoose";

const EventTicketSchema = new mongoose.Schema({
  // 🟢 CORRECCIÓN: required ahora es false para permitir invitados
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, 
    index: true
  },
  // 🆕 NUEVO: Para guardar el mail del invitado
  guestEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  // 🆕 NUEVO: Bandera para identificar rápidamente si es invitado
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
    required: true
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
    // Es buena idea guardar el ID de transacción de Mercado Pago aquí
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

/* ⚠️ IMPORTANTE: 
  Cambiamos el índice único. Si dejamos { user: 1, event: 1 }, 
  Dará error cuando 'user' sea null (invitados).
  Este índice solo aplicará la unicidad cuando 'user' exista.
*/
EventTicketSchema.index(
  { user: 1, event: 1 }, 
  { unique: true, partialFilterExpression: { user: { $exists: true } } }
);

// Índice opcional para evitar que un mismo mail de invitado compre el mismo evento dos veces
EventTicketSchema.index(
  { guestEmail: 1, event: 1 }, 
  { unique: true, partialFilterExpression: { guestEmail: { $exists: true } } }
);

export default mongoose.model("EventTicket", EventTicketSchema);