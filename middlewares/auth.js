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
// 🔓 AUTENTICACIÓN OPCIONAL
// ===============================
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      
      if (user) {
        req.user = user;
      }
    }
    
    next(); // Continuar incluso si no hay usuario autenticado

  } catch (error) {
    // Si hay error con el token, continuamos sin usuario
    console.log("⚠️ Token inválido, continuando como usuario anónimo");
    next();
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

// ===============================
// 🔓 MIDDLEWARE QUE NO BLOQUEA POR PERFIL INCOMPLETO
// ===============================
export const optionalProfile = async (req, res, next) => {
  // Este middleware solo agrega el usuario si existe, pero nunca bloquea
  await optionalAuth(req, res, next);
};