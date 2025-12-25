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

  // ======================
  // SUBMIT FINAL REGISTRO
  // ======================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Intereses
    const interestChecks = [
      ...document.querySelectorAll("input[type='checkbox']:checked")
    ];
    const interests = interestChecks.map(i => i.value);

    const formData = new FormData();

    formData.append("firstName", form.firstName.value);
    formData.append("lastName", form.lastName.value);
    formData.append("username", form.username.value);
    formData.append("email", form.email.value);
    formData.append("password", form.password.value);
    formData.append("age", form.age.value);
    formData.append("department", form.department.value);
    formData.append("personality", form.personality.value);
    formData.append("style", form.style.value);
    formData.append("bio", form.bio.value);

    // Intereses como JSON string
    formData.append("interests", JSON.stringify(interests));

    // Imagen
    if (form.profileImage.files.length > 0) {
      formData.append("profileImage", form.profileImage.files[0]);
    }

    try {
      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message);
        return;
      }

      alert("Registro completado con éxito");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 300);

    } catch (error) {
      console.error("❌ Error register:", error);
      alert("Error del servidor");
    }
  });

});

