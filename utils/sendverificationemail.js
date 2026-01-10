import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  const verificationLink = `${process.env.FRONT_URL}/verify.html?token=${token}`;

  await transporter.sendMail({
    from: `"Meet&Go" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Confirmá tu cuenta en Meet&Go",
    html: `
      <h2>Bienvenida/o a Meet&Go 🎉</h2>
      <p>Para activar tu cuenta, hacé click acá:</p>
      <a href="${verificationLink}">Confirmar mi cuenta</a>
    `
  });
};
