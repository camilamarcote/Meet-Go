import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
  const FRONT_URL =
    process.env.FRONTEND_URL ||
    process.env.FRONT_URL || // 👈 ESTA ES LA CLAVE EN TU CASO
    "https://meetandgof.netlify.app";

  if (!FRONT_URL) {
    throw new Error("FRONTEND_URL / FRONT_URL no definida");
  }

  const link = `${FRONT_URL}/verify.html?token=${token}`;

  console.log("🔗 Verification link:", link); // 🔍 se ve en Render logs

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
};
