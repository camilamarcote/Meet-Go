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
      📥 CARGAR PERFIL (GET) - Rellenado de campos corregido
     ======================================================== */
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al obtener perfil desde el servidor");

    const user = await res.json();

    // 1. Rellenar campos de texto de manera segura
    form.firstName.value = user.firstName || "";
    form.lastName.value = user.lastName || "";
    form.username.value = user.username || "";
    form.email.value = user.email || "";
    form.age.value = user.age || "";
    form.phone.value = user.phone || "";
    form.nationality.value = user.nationality || "";
    form.department.value = user.department || "";
    form.personality.value = user.personality || "";
    form.bio.value = user.bio || "";

    // 2. Rellenar Radio Button ("style") de forma segura
    if (user.style) {
      const radio = form.querySelector(`input[name="style"][value="${user.style}"]`);
      if (radio) radio.checked = true;
    }

    // 3. Rellenar Checkboxes de IDIOMAS (Normalizando a minúsculas y limpiando tildes)
    if (user.languages && Array.isArray(user.languages)) {
      user.languages.forEach(lang => {
        if (!lang) return;
        // Normalizar el valor de la base de datos para emparejarlo con el HTML
        const normalizedLang = lang.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const checkbox = form.querySelector(`input[name="languages"][value="${normalizedLang}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // 4. Rellenar Checkboxes de INTERESES (Normalizando string)
    if (user.interests && Array.isArray(user.interests)) {
      user.interests.forEach(int => {
        if (!int) return;
        const normalizedInt = int.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const checkbox = form.querySelector(`input[name="interests"][value="${normalizedInt}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Restricciones de edición normales
    form.email.disabled = true;
    form.username.disabled = true;

  } catch (error) {
    console.error("❌ Error cargando perfil:", error);
    alert("Error al cargar los datos de tu perfil. Por favor, reintenta.");
  }

  /* ========================================================
      ✏️ GUARDAR CAMBIOS (PUT) - Envío Limpio sin duplicados
     ======================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Recolectar dinámicamente los checkboxes seleccionados por el usuario
    const interests = Array.from(
      form.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      form.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    // Creamos un FormData manual y controlado para evitar sobreescrituras con Multer
    const formData = new FormData();
    formData.append("firstName", form.firstName.value);
    formData.append("lastName", form.lastName.value);
    formData.append("age", form.age.value);
    formData.append("nationality", form.nationality.value);
    formData.append("department", form.department.value);
    formData.append("phone", form.phone.value);
    formData.append("personality", form.personality.value);
    formData.append("bio", form.bio.value);

    // Capturar radio button de estilo
    const styleRadio = form.querySelector("input[name='style']:checked");
    if (styleRadio) {
      formData.append("style", styleRadio.value);
    }

    // Serializar los arrays como cadenas JSON limpias
    formData.append("languages", JSON.stringify(languages));
    formData.append("interests", JSON.stringify(interests));

    // Capturar el archivo de imagen de perfil si el usuario seleccionó uno
    if (form.profileImage.files[0]) {
      formData.append("profileImage", form.profileImage.files[0]);
    }

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}` 
          // ⚠️ Recordatorio: NO agregues Content-Type aquí, el navegador lo gestiona solo
        },
        body: formData
      });

      const updatedUser = await res.json();

      if (!res.ok) {
        throw new Error(updatedUser.message || "Error al actualizar perfil");
      }

      /* 🔄 Actualizar el LocalStorage local para reflejar los cambios en vivo */
      const newSessionData = { 
        ...authUser,
        user: {
          ...authUser.user,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          profileImage: updatedUser.profileImage || authUser.user?.profileImage
        }
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