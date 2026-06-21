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
      📥 CARGAR PERFIL (GET)
     ======================================================== */
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Error al obtener perfil desde el servidor");

    const user = await res.json();

    // Rellenar campos de texto de manera segura
    form.firstName.value = user.firstName || "";
    form.lastName.value = user.lastName || "";
    form.username.value = user.username || "";
    form.email.value = user.email || "";
    form.age.value = user.age || "";
    form.phone.value = user.phone || "";
    form.nationality.value = user.nationality || "";
    form.department.value = user.department || "";
    
    // Si agregaste el campo barrio en tu HTML (opcional, mapeado con tu modelo de Mongoose)
    if (form.neighborhood) form.neighborhood.value = user.neighborhood || "";
    
    form.personality.value = user.personality || "";
    form.style.value = user.style || "";
    form.bio.value = user.bio || "";

    /* 🌐 IDIOMAS (CHECKBOXES) */
    if (user.languages && Array.isArray(user.languages)) {
      user.languages.forEach(lang => {
        const checkbox = document.querySelector(`input[name="languages"][value="${lang}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    /* 🎯 INTERESES (CHECKBOXES) */
    if (user.interests && Array.isArray(user.interests)) {
      user.interests.forEach(int => {
        const checkbox = document.querySelector(`input[name="interests"][value="${int}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    /* 🔒 RESTRICCIONES DE EDICIÓN */
    form.email.disabled = true;
    form.username.disabled = true;

  } catch (error) {
    console.error("❌ Error cargando perfil:", error);
    alert("Error al cargar los datos de tu perfil. Por favor, reintenta.");
  }

  /* ========================================================
      ✏️ GUARDAR CAMBIOS (PUT)
     ======================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Capturar arrays dinámicos de los checkboxes seleccionados
    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

    // Creamos el FormData a partir del formulario
    const formData = new FormData(form);
    
    // Serializar arrays para que Multer y Express los interpreten sin problemas
    formData.set("languages", JSON.stringify(languages));
    formData.set("interests", JSON.stringify(interests));

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}` // ⚠️ IMPORTANTE: No pasar Content-Type manual cuando se usa FormData
        },
        body: formData
      });

      const updatedUser = await res.json();

      if (!res.ok) {
        throw new Error(updatedUser.message || "Error al actualizar perfil");
      }

      /* 🔄 ACTUALIZAR LOCALSTORAGE COMPLETO SINK PERDER METADATOS */
      // Guardamos tanto el objeto raíz como la subestructura 'user' que consumen tus secciones
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

      /* 🚀 REDIRECCIÓN AL HOME */
      window.location.href = "index.html";

    } catch (error) {
      console.error("❌ Error en actualización:", error);
      alert(error.message || "No se pudo actualizar el perfil.");
    }
  });
});