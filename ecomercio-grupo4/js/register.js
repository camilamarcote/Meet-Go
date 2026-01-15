const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* ============================
       🔐 VALIDACIÓN PASSWORD
    ============================ */
    const password = form.password.value;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert(
        "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo"
      );
      return;
    }

    /* ============================
       📌 CHECKBOXES
    ============================ */
    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    /* ============================
       📦 FORM DATA
    ============================ */
    const formData = new FormData(form);

    // 🔹 IMPORTANTE: enviar arrays como JSON
    formData.set("languages", JSON.stringify(languages));
    formData.set("interests", JSON.stringify(interests));

    /* ============================
       🚀 REQUEST
    ============================ */
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Error en el registro");
        return;
      }

      alert("🎉 Registro exitoso. Revisá tu email para verificar la cuenta.");
      window.location.href = "login.html";

    } catch (error) {
      console.error("❌ Error registro:", error);
      alert("No se pudo conectar con el servidor");
    }
  });
});
