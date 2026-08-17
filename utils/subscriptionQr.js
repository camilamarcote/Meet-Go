import QRCode from "qrcode";

export const generateTicketQR = async (ticketId) => {
  try {
    // 🔗 La URL exacta que debe abrir la cámara del celular
    const verifyUrl = `https://meetandgouy.com/verify-ticket.html?tid=${ticketId}`;
    
    // Generar la imagen Base64 a partir de la URL de verificación
    const qrImage = await QRCode.toDataURL(verifyUrl);
    
    return { qrImage, verifyUrl };
  } catch (error) {
    console.error("Error generando QR:", error);
    throw error;
  }
};