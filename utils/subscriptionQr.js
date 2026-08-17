import QRCode from "qrcode";

// 🎟️ Generador para Tickets de Eventos
export const generateTicketQR = async (ticketId) => {
  try {
    const verifyUrl = `https://meetandgouy.com/verify-ticket.html?tid=${ticketId}`;
    const qrImage = await QRCode.toDataURL(verifyUrl);
    return { qrImage, verifyUrl };
  } catch (error) {
    console.error("Error generando QR de ticket:", error);
    throw error;
  }
};

// 💳 Generador para Suscripciones (Utilizado por admin.js)
export const generateSubscriptionQR = async (userId) => {
  try {
    const verifyUrl = `https://meetandgouy.com/verify-subscription.html?uid=${userId}`;
    const qrImage = await QRCode.toDataURL(verifyUrl);
    return { qrImage, verifyUrl };
  } catch (error) {
    console.error("Error generando QR de suscripción:", error);
    throw error;
  }
};