export async function sendResetPasswordEmail(email, token) {
  const resetLink = `${process.env.FRONT_URL}/reset-password.html?token=${token}`;

  // reutilizás nodemailer / resend / lo que ya uses
  await transporter.sendMail({
    to: email,
    subject: "Recuperar contraseña",
    html: `
      <p>Hacé click para cambiar tu contraseña:</p>
      <a href="${resetLink}">Restablecer contraseña</a>
      <p>Este enlace vence en 1 hora.</p>
    `
  });
}
