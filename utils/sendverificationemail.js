import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("❌ RESEND_API_KEY no definida en Render");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
  try {
    const FRONT_URL =
      process.env.FRONT_URL ||
      process.env.FRONTEND_URL ||
      "https://meetandgof.netlify.app";

    const link = `${FRONT_URL}/verify.html?token=${token}`;

    console.log("📧 Enviando verificación a:", email);
    console.log("🔗 Link:", link);

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

    console.log("✅ Email enviado correctamente");

  } catch (error) {
    console.error("❌ Error enviando email:", error);
    throw error;
  }
};
