import QRCode from "qrcode";

export async function generateSubscriptionQR(user) {
  const publicUrl =
    `https://meetandgouy.com/verify-subscription.html?uid=${user._id}`;

  const qrImage = await QRCode.toDataURL(publicUrl);

  return {
    qrImage,
    url: publicUrl
  };
}
