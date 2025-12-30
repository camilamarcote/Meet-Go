import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;

    const foundUser = await User.findOne({
      $or: [{ email: user }, { username: user }]
    });

    if (!foundUser) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = generateToken(foundUser);

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        isOrganizer: foundUser.isOrganizer,
        profileImage: foundUser.profileImage
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Error en login" });
  }
});
