const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = form.password.value;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert("Contraseña insegura");
      return;
    }

    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    const formData = new FormData(form);
    formData.set("languages", JSON.stringify(languages));
    formData.set("interests", JSON.stringify(interests));

    try {
      const res = await fetch(
        `${API_URL}/api/users/register`,
        {
          method: "POST",
          body: formData
        }
      );

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Error en registro");
        return;
      }

      alert("Registro exitoso 🎉 Revisá tu email.");
      window.location.href = "login.html";

    } catch {
      alert("No se pudo conectar con el servidor");
    }
  });
});
