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
import publicRoutes from "./routes/public.js";

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

// 🔐 CORS - CONFIGURACIÓN COMPLETA
const allowedOrigins = [
  "https://meetandgouy.com",
  "https://www.meetandgouy.com",
  "http://meetandgouy.com",
  "http://www.meetandgouy.com",
  "https://meetandgof.netlify.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://meetandgo-frontend.onrender.com" // por si acaso
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`❌ CORS bloqueado: ${origin}`);
        callback(null, true); // Cambiar a false si quieres bloquear estrictamente
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Manejar preflight requests explícitamente
app.options("*", cors());

// Parse URL-encoded (Mercado Pago, forms)
app.use(express.urlencoded({ extended: true }));

// Parse JSON
app.use(express.json({ limit: "10mb" }));

// Logging para debuggear
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// =============================
// 🛣️ API ROUTES
// =============================
app.use("/api/events", eventsRouter);
app.use("/api/events", ticketRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// Ruta de health check para mantener el servidor activo
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});