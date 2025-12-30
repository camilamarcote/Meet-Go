import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      roles: user.roles,
      isOrganizer: user.isOrganizer
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
