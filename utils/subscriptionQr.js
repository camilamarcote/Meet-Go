import QRCode from "qrcode";

export async function generateTicketQR(ticketId) {
  // URL pública de verificación del ticket en tu web
  const publicUrl = `https://meetandgouy.com/verify-ticket.html?tid=${ticketId}`;

  // Genera el código QR en formato base64 DataURL
  const qrImage = await QRCode.toDataURL(publicUrl);

  return {
    qrImage,
    url: publicUrl
  };
}