import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
  const FRONT_URL =
    process.env.FRONT_URL ||
    "https://meetandgof.netlify.app";

  const link = `${FRONT_URL}/verify.html?token=${token}`;

  console.log("🔗 Verification link:", link);

  try {
    await resend.emails.send({
      from: "Meet&Go <no-reply@meetandgouy.com>",
      to: email,
      subject: "Confirmá tu cuenta en Meet&Go",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Bienvenida/o a Meet&Go 🎉</h2>
          <p>Para activar tu cuenta hacé click en el siguiente botón:</p>

          <p style="margin: 24px 0">
            <a
              href="${link}"
              style="
                background:#4f46e5;
                color:#ffffff;
                padding:12px 20px;
                text-decoration:none;
                border-radius:6px;
                font-weight:bold;
                display:inline-block;
              "
            >
              Confirmar mi cuenta
            </a>
          </p>

          <p style="font-size:12px; color:#666">
            Si no creaste una cuenta en Meet&Go, podés ignorar este mensaje.
          </p>
        </div>
      `
    });

    console.log("📧 Mail de verificación enviado a:", email);
  } catch (error) {
    console.error("❌ Error enviando mail de verificación:", error);
    throw error;
  }
};
