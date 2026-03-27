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
    const password = passwordInput.value;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert(
        "La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo"
      );
      return;
    }

    /* ============================
       📌 OBTENER DATOS DEL FORMULARIO
    ============================ */
    const firstName = form.querySelector("input[name='firstName']").value;
    const lastName = form.querySelector("input[name='lastName']").value;
    const email = form.querySelector("input[name='email']").value;
    const age = parseInt(form.querySelector("input[name='age']").value);
    const phone = form.querySelector("input[name='phone']").value;

    /* ============================
       📌 CHECKBOXES (INTERESES)
    ============================ */
    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    // Validar que al menos haya un interés seleccionado
    if (interests.length === 0) {
      alert("Por favor, selecciona al menos un interés");
      return;
    }

    /* ============================
       📌 VALIDAR EDAD
    ============================ */
    if (age < 18) {
      alert("Debes tener al menos 18 años para registrarte");
      return;
    }

    /* ============================
       📌 VALIDAR CELULAR
    ============================ */
    if (!phone || phone.trim() === "") {
      alert("Por favor, ingresa tu número de celular");
      return;
    }

    /* ============================
       📦 PREPARAR DATOS PARA ENVIAR
    ============================ */
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      age: age,
      phone: phone.trim(),
      interests: interests,
      // Campos requeridos por el modelo User
      username: email.trim().toLowerCase(), // Usamos email como username temporal
      nationality: "Uruguay", // Valor por defecto
      department: "", // Vacío por defecto
      languages: [], // Vacío por defecto
      bio: "", // Vacío por defecto
      personality: "", // Vacío por defecto
      style: "" // Vacío por defecto
    };

    console.log("📤 Enviando datos de registro:", userData);

    try {
      /* ============================
         🚀 ENVIAR AL BACKEND
      ============================ */
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      console.log("📥 Respuesta del servidor:", data);

      if (!response.ok) {
        // Manejar errores específicos
        if (data.message) {
          if (data.message.includes("email") || data.message.includes("Email")) {
            alert("❌ Este email ya está registrado. Por favor, usa otro email o inicia sesión.");
          } else if (data.message.includes("username")) {
            alert("❌ Error con el nombre de usuario. Por favor, intenta de nuevo.");
          } else {
            alert(`❌ Error: ${data.message}`);
          }
        } else {
          alert("❌ Error al registrar usuario. Por favor, intenta de nuevo.");
        }
        return;
      }

      // Registro exitoso
      // 🧹 Limpieza preventiva
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");

      alert("🎉 ¡Registro exitoso! Revisá tu email para verificar la cuenta antes de iniciar sesión.");
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);

    } catch (error) {
      console.error("❌ Error de conexión:", error);
      alert("❌ No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta de nuevo.");
    }
  });
});
