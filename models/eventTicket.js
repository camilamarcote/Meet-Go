import mongoose from "mongoose";

const EventTicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
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

EventTicketSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model("EventTicket", EventTicketSchema);