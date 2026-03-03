// middleware/experienceProfile.js

export const requireExperienceProfile = (req, res, next) => {
  // seguridad extra
  if (!req.user) {
    return res.status(401).json({ message: "No autorizado" });
  }

  // si no existe o no está completo
  if (!req.user.experienceProfile || !req.user.experienceProfile.completed) {
    return res.status(403).json({
      code: "PROFILE_INCOMPLETE",
      message: "Perfil de experiencia incompleto"
    });
  }

  next();
};