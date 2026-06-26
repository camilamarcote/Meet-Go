const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  if (!form) {
    console.error("❌ No se encontró el formulario de registro");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* ============================
        🔐 VALIDACIÓN PASSWORD
       ============================ */
    const passwordInput = form.querySelector("input[name='password']");
    if (!passwordInput) {
      alert("❌ Error crítico: Falta el campo de contraseña en el HTML.");
      return;
    }
    const password = passwordInput.value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert("La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo");
      return;
    }

    /* ============================
        📌 OBTENER DATOS BASICOS
       ============================ */
    const firstName = form.querySelector("input[name='firstName']").value;
    const lastName = form.querySelector("input[name='lastName']").value;
    const username = form.querySelector("input[name='username']").value; // 🎯 NUEVO EXTRAÍDO
    const email = form.querySelector("input[name='email']").value;
    const age = parseInt(form.querySelector("input[name='age']").value);
    const phone = form.querySelector("input[name='phone']").value;

    // Campos Select / Radio / Textarea nuevos de tu interfaz:
    const nationality = form.querySelector("[name='nationality']").value;
    const department = form.querySelector("[name='department']").value;
    const personality = form.querySelector("[name='personality']").value;
    const bio = form.querySelector("textarea[name='bio']")?.value || "";

    const styleRadio = form.querySelector("input[name='style']:checked");
    const style = styleRadio ? styleRadio.value : "";

    /* ============================
        📌 CHECKBOXES (INTERESES E IDIOMAS)
       ============================ */
    const interests = Array.from(
      form.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      form.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    if (interests.length === 0) {
      alert("Por favor, selecciona al menos un interés");
      return;
    }

    if (age < 18) {
      alert("Debes tener al menos 18 años para registrarte");
      return;
    }

    if (!phone || phone.trim() === "") {
      alert("Por favor, ingresa tu número de celular");
      return;
    }

    /* ============================
        📦 PREPARAR DATOS COMPLETOS
       ============================ */
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(), // 🎯 Enviado al backend
      email: email.trim().toLowerCase(),
      password: password,
      age: age,
      phone: phone.trim(),
      nationality: nationality,
      department: department,
      personality: personality,
      style: style,
      languages: languages,
      interests: interests,
      bio: bio.trim()
    };

    console.log("📤 Enviando datos de registro...", userData);

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ Error: ${data.message || "No se pudo registrar"}`);
        return;
      }

      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");

      alert("🎉 ¡Registro exitoso! Revisá tu email para verificar la cuenta antes de iniciar sesión.");
      
      setTimeout(() => {
        window.location.href = "login.html?registered=true";
      }, 2000);

    } catch (error) {
      console.error("❌ Error de conexión:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
  });
});