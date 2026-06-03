import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

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

// Middlewares - Lista de Orígenes Permitidos
const allowedOrigins = [
  "https://meetandgouy.com",
  "https://www.meetandgouy.com",
  "http://meetandgouy.com",
  "http://www.meetandgouy.com",
  "https://meetandgof.netlify.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://meetandgo-frontend.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); 
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));

// ========================================================
// 🛣️ REGISTRO DE RUTAS
// ========================================================
app.use("/api/events", eventsRouter);
app.use("/api/users", usersRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

// Enrutadores espejo para tickets: Esto asegura que responda a /api/tickets y /api/admin/tickets sin fallar
app.use("/api", ticketRoutes); 
app.use("/api/admin", ticketRoutes);

// =============================
// 🗄️ Conexión Base de Datos MongoDB
// =============================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => { 
    console.log("✅ MongoDB conectado exitosamente");
    
    // 🔥 CÓDIGO TEMPORAL PARA BORRAR EL ÍNDICE BLOQUEANTE DE USUARIOS REPETIDOS
    try {
      await mongoose.connection.collection('eventtickets').dropIndex('user_1_event_1');
      console.log("🚀 [LIMPIEZA] Índice 'user_1_event_1' borrado con éxito.");
    } catch (err) {
      console.log("ℹ️ [LIMPIEZA] El índice 'user_1_event_1' no existía o ya fue procesado.");
    }

    // 🔥 NUEVO CÓDIGO TEMPORAL PARA BORRAR EL ÍNDICE DE MAILS DE INVITADOS DUPLICADOS
    try {
      await mongoose.connection.collection('eventtickets').dropIndex('guestEmail_1_event_1');
      console.log("🚀 [LIMPIEZA] Índice 'guestEmail_1_event_1' removido de la DB con éxito.");
    } catch (err) {
      console.log("ℹ️ [LIMPIEZA] El índice 'guestEmail_1_event_1' ya fue eliminado de MongoDB.");
    }

  })
  .catch((err) => console.error("❌ Error crítico en MongoDB:", err));

// =============================
// 🚀 Inicialización del Servidor
// =============================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo de forma global en el puerto ${PORT}`);
});