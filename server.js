import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// =============================
// 🛣️ Rutas
// =============================
import eventsRouter from "./routes/events.js";
import usersRoutes from "./routes/users.js";
import ticketRoutes from "./routes/tickets.js";
import paymentsRoutes from "./routes/payments.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js"; // ✅ ESTA ERA LA QUE FALTABA

const app = express();
const server = http.createServer(app);

// =============================
// 🔌 Socket.io
// =============================
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// =============================
// 🧩 Middlewares
// =============================

// 🔐 CORS
app.use(
  cors({
    origin: [
      "https://meetandgouy.com",
      "https://www.meetandgouy.com",
      "https://meetandgof.netlify.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    credentials: true
  })
);

// Parse URL-encoded (Mercado Pago, forms)
app.use(express.urlencoded({ extended: true }));

// Parse JSON
app.use(express.json({ limit: "10mb" }));

// =============================
// 🛣️ API ROUTES
// =============================
app.use("/api/events", eventsRouter);
app.use("/api/events", ticketRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes); // ✅ QR público

// =============================
// 🔁 WebSockets
// =============================
io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);
});

// =============================
// 🗄️ Database
// =============================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado");
    console.log("🧪 DB NAME:", mongoose.connection.name);
    console.log("🧪 DB HOST:", mongoose.connection.host);
  })
  .catch((err) => console.error("❌ Mongo error:", err));

// =============================
// 🚀 Server
// =============================
server.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
