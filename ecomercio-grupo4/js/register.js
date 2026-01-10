document.addEventListener("DOMContentLoaded", () => {

  const steps = document.querySelectorAll(".form-step");
  const nextBtns = document.querySelectorAll(".next-step");
  const prevBtns = document.querySelectorAll(".prev-step");
  const form = document.querySelector("#registerForm");

  let current = 0; 

  function showStep(n) {
    steps.forEach((step, idx) => {
      step.style.display = idx === n ? "block" : "none";
    });
  }

  showStep(current);

  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!validateStep(current)) return;
      current++;
      showStep(current);
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      current--;
      showStep(current);
    });
  });

  function validateStep(n) {
    const step = steps[n];
    const inputs = step.querySelectorAll("input, select, textarea");

    for (let input of inputs) {
      if (input.hasAttribute("required") && !input.value.trim()) {
        alert("Por favor completa todos los campos obligatorios.");
        return false;
      }
    }
    return true;
  }

  /* ======================
     SUBMIT REGISTRO
  ====================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = [
      ...document.querySelectorAll(
        ".form-step:nth-of-type(2) input[type='checkbox']:checked"
      )
    ].map(i => i.value);

    const languages = [
      ...document.querySelectorAll(
        ".form-step:nth-of-type(3) .checkbox-card input[type='checkbox']:checked"
      )
    ].map(l => l.value);

    const formData = new FormData();

    formData.append("firstName", form.firstName.value.trim());
    formData.append("lastName", form.lastName.value.trim());
    formData.append("username", form.username.value.trim());
    formData.append("email", form.email.value.trim());
    formData.append("password", form.password.value);
    formData.append("age", form.age.value);

    formData.append("nationality", form.nationality.value);
    formData.append("department", form.department?.value || "");

    formData.append("personality", form.personality?.value || "");
    formData.append("style", form.style?.value || "");
    formData.append("bio", form.bio?.value || "");

    // ✅ SIEMPRE arrays válidos
    formData.append("languages", JSON.stringify(languages || []));
    formData.append("interests", JSON.stringify(interests || []));

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

      // 👇 LEER COMO TEXTO PRIMERO
      const text = await res.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.error("Respuesta no JSON:", text);
        alert("Error del servidor. Intenta nuevamente.");
        return;
      }

      if (!res.ok) {
        alert(result.message || "Error en el registro");
        return;
      }

      alert("Registro completado con éxito 🎉");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 300);

    } catch (error) {
      console.error("❌ Error register:", error);
      alert("No se pudo conectar con el servidor");
    }
  });

});
