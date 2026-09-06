import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";

// Imports de rutas
import eventsRouter from "./routes/events.js";
import usersRoutes from "./routes/users.js";
import ticketRoutes from "./routes/tickets.js";
import paymentsRoutes from "./routes/payments.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";

const app = express();
const server = http.createServer(app);

// 🟢 Lista Unificada de Orígenes Permitidos (Web + Expo Móvil + Local)
const allowedOrigins = [
  "https://meetandgouy.com",
  "https://www.meetandgouy.com",
  "http://meetandgouy.com",
  "http://www.meetandgouy.com",
  "https://meetandgof.netlify.app",
  "https://meetandgo-frontend.onrender.com",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "https://auth.expo.io"
];

// 🟢 Configuración Única y Segura de CORS
app.use(cors({
  origin: function (origin, callback) {
    // Si no hay origin (petición desde app móvil nativa, Postman, cURL) o está en la lista permitida:
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Si viene de un subdominio o preview de Expo/IP local de desarrollo, permitirlo
    if (origin.includes("localhost") || origin.includes("expo.io") || origin.includes("192.168.")) {
      return callback(null, true);
    }

    console.warn(`⚠️ Origen bloqueado por CORS: ${origin}`);
    return callback(new Error("Acceso denegado por políticas de CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));

/* ========================================================
   Roadmap de Rutas
   ======================================================== */
app.use("/api/events", eventsRouter);
app.use("/api/users", usersRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/tickets", ticketRoutes); 
app.use("/api", paymentsRoutes);

/* ========================================================
   Conexión MongoDB
   ======================================================== */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => { 
    console.log("✅ MongoDB conectado exitosamente");
    
    try {
      await mongoose.connection.collection('eventtickets').dropIndex('user_1_event_1');
      console.log("🚀 [LIMPIEZA] Índice 'user_1_event_1' borrado con éxito.");
    } catch (err) {
      // Índice inexistente o procesado
    }

    try {
      await mongoose.connection.collection('eventtickets').dropIndex('guestEmail_1_event_1');
      console.log("🚀 [LIMPIEZA] Índice 'guestEmail_1_event_1' removido de la DB con éxito.");
    } catch (err) {
      // Índice inexistente o procesado
    }

  })
  .catch((err) => console.error("❌ Error crítico en MongoDB:", err));

/* ========================================================
   Servidor
   ======================================================== */
server.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Servidor corriendo de forma global en el puerto ${PORT}`); 
console.log("🔥🔥🔥 SERVER MEET&GO VERSION DEBUG 2026-09-06"); });