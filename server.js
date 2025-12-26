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

const app = express();
const server = http.createServer(app);

// =============================
// 🔌 Socket.io
// =============================
const io = new Server(server, {
  cors: { origin: "*" }
});

// =============================
// 🧩 Middlewares
// =============================
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =============================
// 🛣️ Rutas API
// =============================
app.use("/events", eventsRouter);
app.use("/api/users", usersRoutes);
app.use("/api", ticketRoutes);
app.use("/api", paymentsRoutes);

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
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar:", err));

// =============================
// 🚀 Server
// =============================
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
