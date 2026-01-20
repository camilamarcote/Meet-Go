import jwt from "jsonwebtoken"; 
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("❌ Auth error:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

// ===============================
// 👮 SOLO ORGANIZADORAS
// ===============================
export const adminOnly = (req, res, next) => {
  if (!req.user?.isOrganizer) {
    return res.status(403).json({ message: "Acceso restringido" });
  }
  next();
};
