import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const QR_SECRET = process.env.QR_SECRET || "meetandgo_qr_secret";

export async function generateSubscriptionQR(user) {
  // Payload mínimo y seguro
  const payload = {
    userId: user._id.toString(),
    type: "subscription"
  };

  // Token firmado
  const token = jwt.sign(payload, QR_SECRET, {
    expiresIn: "30d" // renovable
  });

  // Generar QR en base64
  const qrImage = await QRCode.toDataURL(token);

  return { qrImage, token };
}
