import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import adminRoutes from "./routes/admin.js";


// =============================
// 🛣️ Rutas
// =============================
import eventsRouter from "./routes/events.js";
import usersRoutes from "./routes/users.js";
import ticketRoutes from "./routes/tickets.js";
import paymentsRoutes from "./routes/payments.js";
import subscriptionRoutes from "./routes/subscriptions.js";

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
// 🧩 Middlewares (CLAVE)
// =============================

// 🔐 CORS
app.use(
  cors({
    origin: [
      "https://meetandgouy.com",
      "https://www.meetandgouy.com",
      "https://meetandgof.netlify.app", // lo dejamos por transición
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    credentials: true
  })
);


// 🔴 ESTO ES LO QUE TE FALTABA
app.use(express.urlencoded({ extended: true }));

// JSON (para login, pagos, etc.)
app.use(express.json({ limit: "10mb" }));

// =============================
// 🛣️ API
// =============================
app.use("/api/events", eventsRouter);
app.use("/api/events", ticketRoutes);
app.use("/api/users", usersRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);


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
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Mongo error:", err));


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

