import QRCode from "qrcode";

export async function generateSubscriptionQR(user) {
  const publicUrl = `${process.env.API_URL}/users/public/subscription-status/${user._id}`;

  const qrImage = await QRCode.toDataURL(publicUrl);

  return {
    qrImage,
    url: publicUrl
  };
}
