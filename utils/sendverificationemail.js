import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
  const link = `${process.env.FRONTEND_URL}/verify.html?token=${token}`;

  await resend.emails.send({
    from: "Meet&Go <onboarding@resend.dev>",
    to: email,
    subject: "Confirmá tu cuenta en Meet&Go",
    html: `
      <h2>Bienvenida/o a Meet&Go 🎉</h2>
      <p>Para activar tu cuenta hacé click acá:</p>
      <a href="${link}">Confirmar mi cuenta</a>
    `
  });

  console.log("🔗 Verification link:", link);

};
