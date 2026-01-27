import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  const resetUrl = `${process.env.FRONT_URL}/reset-password.html?token=${token}`;

  await transporter.sendMail({
    from: `"Meet&Go" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Recuperar contraseña",
    html: `
      <p>Hacé click para cambiar tu contraseña:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `
  });
}
