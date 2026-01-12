document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = [
      ...document.querySelectorAll("input[name='interests']:checked")
    ].map(i => i.value);

    const languages = [
      ...document.querySelectorAll("input[name='languages']:checked")
    ].map(l => l.value);

    const formData = new FormData();

    formData.append("firstName", form.firstName.value.trim());
    formData.append("lastName", form.lastName.value.trim());
    formData.append("username", form.username.value.trim());
    formData.append("email", form.email.value.trim());
    formData.append("password", form.password.value);
    formData.append("age", form.age.value);

    formData.append("nationality", form.nationality.value);
    formData.append("department", form.department.value || "");

    formData.append("personality", form.personality.value || "");
    formData.append("style", form.style?.value || "");
    formData.append("bio", form.bio.value || "");

    formData.append("languages", JSON.stringify(languages));
    formData.append("interests", JSON.stringify(interests));

    if (form.profileImage.files.length > 0) {
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

      const text = await res.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch {
        alert("Error del servidor.");
        return;
      }

      if (!res.ok) {
        alert(result.message || "Error en el registro");
        return;
      }

      // 👇 MENSAJE CLAVE PARA VERIFICACIÓN
      alert(
        "Registro exitoso 🎉\n\nTe enviamos un mail para verificar tu cuenta antes de iniciar sesión."
      );

      window.location.href = "login.html";

    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    }
  });
});
