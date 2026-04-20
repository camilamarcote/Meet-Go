import jwt from "jsonwebtoken"; 
import User from "../models/User.js";

// ===============================
// 🔒 PROTECCIÓN ESTRICTA
// ===============================
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No autorizado. Inicie sesión." });
    }

    const token = authHeader.split(" ")[1];
    
    // Si el token es "null" o "undefined" (común en errores de frontend)
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ message: "Sesión no válida." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado." });
  }
};

// ===============================
// 🔓 AUTENTICACIÓN OPCIONAL (Para Invitados)
// ===============================
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      
      // Solo intentamos verificar si el token no es literal "null"
      if (token && token !== "null" && token !== "undefined") {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) req.user = user;
      }
    }
    
    // IMPORTANTE: Siempre llama a next() fuera del bloque if
    next(); 
  } catch (error) {
    console.log("⚠️ Continuando como usuario anónimo");
    next(); // Si el token falla, seguimos como invitado
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user?.isOrganizer) {
    return res.status(403).json({ message: "Acceso restringido: Solo organizadores" });
  }
  next();
};

export const optionalProfile = async (req, res, next) => {
  await optionalAuth(req, res, next);
};