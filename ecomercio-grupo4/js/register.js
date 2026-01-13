document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = form.password.value;

    // 🔐 Validación de contraseña
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert(
        "La contraseña debe tener:\n" +
        "- Mínimo 8 caracteres\n" +
        "- 1 mayúscula\n" +
        "- 1 minúscula\n" +
        "- 1 número\n" +
        "- 1 carácter especial"
      );
      return;
    }

    // 🔹 Checkboxes
    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    // 🔹 FormData
    const formData = new FormData();
    formData.append("firstName", form.firstName.value.trim());
    formData.append("lastName", form.lastName.value.trim());
    formData.append("username", form.username.value.trim());
    formData.append("email", form.email.value.trim());
    formData.append("password", password); // 👈 GARANTIZADO
    formData.append("age", form.age.value);
    formData.append("nationality", form.nationality.value);
    formData.append("department", form.department.value || "");
    formData.append("personality", form.personality.value || "");
    formData.append("style", form.style?.value || "");
    formData.append("bio", form.bio.value || "");
    formData.append("languages", JSON.stringify(languages));
    formData.append("interests", JSON.stringify(interests));

    if (form.profileImage?.files?.length > 0) {
      formData.append("profileImage", form.profileImage.files[0]);
    }

    try {
      const res = await fetch(
        "https://meetgo-backend.onrender.com/api/users/register",
        {
          method: "POST",
          body: formData
        }
      );

      const result = await res.json();

      if (!res.ok) {
        console.error("❌ Error backend:", result);
        alert(result.message || "Error en el registro");
        return;
      }

      alert(
        "Registro exitoso 🎉\n\nRevisá tu email para verificar tu cuenta."
      );

      window.location.href = "login.html";

    } catch (error) {
      console.error("❌ Error de red:", error);
      alert("No se pudo conectar con el servidor");
    }
  });
});
