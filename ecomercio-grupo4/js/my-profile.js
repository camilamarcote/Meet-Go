const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", async () => {
  const authUser = JSON.parse(localStorage.getItem("currentUser"));

  // Verificación estricta de sesión
  if (!authUser?.token) {
    window.location.href = "welcome.html";
    return;
  }

  const token = authUser.token;
  const form = document.getElementById("profileForm");

  if (!form) {
    console.error("❌ No se encontró el elemento #profileForm en el HTML.");
    return;
  }

  /* ========================================================
     📥 CARGAR PERFIL (GET) - Adaptado a tu estructura Real
     ======================================================== */
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al obtener perfil desde el servidor");

    const user = await res.json();
    
    // 🔍 AUDITORÍA EN CONSOLA: Abre F12 para ver exactamente qué llegó del servidor
    console.log("⬇️ Esto es lo que devuelve el servidor /api/users/me:", user);

    // Función auxiliar para rellenar de forma segura sin importar cómo responda el formulario
    const setFieldValue = (inputName, value) => {
      const element = form.elements[inputName] || document.getElementById(inputName);
      if (element) {
        element.value = value || "";
      } else {
        console.warn(`⚠️ No se encontró ningún input en el HTML con name o id: "${inputName}"`);
      }
    };

    // 1. Asignación directa y segura de campos de texto comunes
    setFieldValue("firstName", user.firstName || authUser.firstName);
    setFieldValue("lastName", user.lastName || authUser.lastName);
    setFieldValue("username", user.username || authUser.username);
    setFieldValue("email", user.email || authUser.email);
    setFieldValue("phone", user.phone || authUser.phone);
    setFieldValue("age", user.age || authUser.age);
    setFieldValue("personality", user.personality || authUser.personality);
    setFieldValue("bio", user.bio || authUser.bio);

    // 2. Selects dinámicos
    if (user.nationality || authUser.nationality) {
      setFieldValue("nationality", user.nationality || authUser.nationality);
    }
    if (user.department || authUser.department) {
      setFieldValue("department", user.department || authUser.department);
    }

    // 3. Radio button para el "Style"
    const targetStyle = user.style || authUser.style;
    if (targetStyle) {
      const radioStyle = form.querySelector(`input[name="style"][value="${targetStyle}"]`);
      if (radioStyle) radioStyle.checked = true;
    }

    // 4. Checkboxes de Idiomas
    const languagesArray = user.languages || authUser.languages;
    if (languagesArray && Array.isArray(languagesArray)) {
      languagesArray.forEach(lang => {
        if (!lang) return;
        const cleanLang = lang.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const checkbox = form.querySelector(`input[name="languages"][value="${cleanLang}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // 5. Checkboxes de Intereses
    const interestsArray = user.interests || authUser.interests;
    if (interestsArray && Array.isArray(interestsArray)) {
      interestsArray.forEach(int => {
        if (!int) return;
        const cleanInt = int.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const checkbox = form.querySelector(`input[name="interests"][value="${cleanInt}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Bloqueos de seguridad estándar
    const emailInput = form.elements["email"] || document.getElementById("email");
    const userInput = form.elements["username"] || document.getElementById("username");
    if (emailInput) emailInput.disabled = true;
    if (userInput) userInput.disabled = true;

  } catch (error) {
    console.error("❌ Error cargando perfil:", error);
    alert("Error al cargar los datos de tu perfil. Por favor, reintenta.");
  }

  /* ========================================================
      ✏️ GUARDAR CAMBIOS (PUT) - Sincronizado a la Raíz
     ======================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = Array.from(form.querySelectorAll("input[name='interests']:checked")).map(i => i.value);
    const languages = Array.from(form.querySelectorAll("input[name='languages']:checked")).map(l => l.value);

    const formData = new FormData();
    formData.append("firstName", form.querySelector("[name='firstName']", "#firstName")?.value || "");
    formData.append("lastName", form.querySelector("[name='lastName']", "#lastName")?.value || "");
    formData.append("age", form.querySelector("[name='age']", "#age")?.value || "");
    formData.append("nationality", form.querySelector("[name='nationality']", "#nationality")?.value || "");
    formData.append("department", form.querySelector("[name='department']", "#department")?.value || "");
    formData.append("phone", form.querySelector("[name='phone']", "#phone")?.value || "");
    formData.append("personality", form.querySelector("[name='personality']", "#personality")?.value || "");
    formData.append("bio", form.querySelector("[name='bio']", "#bio")?.value || "");

    const styleRadio = form.querySelector("input[name='style']:checked");
    if (styleRadio) formData.append("style", styleRadio.value);

    formData.append("languages", JSON.stringify(languages));
    formData.append("interests", JSON.stringify(interests));

    if (form.profileImage?.files[0]) {
      formData.append("profileImage", form.profileImage.files[0]);
    }

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const updatedUser = await res.json();
      if (!res.ok) throw new Error(updatedUser.message || "Error al actualizar perfil");

      // 🔄 Guardamos los nuevos datos guardando la estructura plana original en LocalStorage
      const newSessionData = { 
        ...authUser, // Conserva el Token actual
        ...updatedUser // Sobreescribe con los datos nuevos actualizados del servidor
      };
      
      localStorage.setItem("currentUser", JSON.stringify(newSessionData));

      alert("✅ ¡Perfil actualizado correctamente!");
      window.location.href = "index.html";

    } catch (error) {
      console.error("❌ Error en actualización:", error);
      alert(error.message || "No se pudo actualizar el perfil.");
    }
  });
});