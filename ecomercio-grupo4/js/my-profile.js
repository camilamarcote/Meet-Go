const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", async () => {
  const authUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!authUser?.token) {
    window.location.href = "welcome.html";
    return;
  }

  const token = authUser.token;
  const form = document.getElementById("profileForm");
  const editBtn = document.getElementById("editProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const saveBtn = document.getElementById("saveProfileBtn");
  const avatarInput = document.getElementById("avatarInput");
  const profilePreview = document.getElementById("profilePreview");

  // Control de estados de la interfaz (Ver vs Editar)
  let isEditing = false;
  const toggleEditMode = (edit) => {
    isEditing = edit;
    // Habilitar/Deshabilitar inputs (excepto email y username)
    Array.from(form.elements).forEach(el => {
      if (el.name !== "email" && el.name !== "username" && el.id !== "editProfileBtn") {
        el.disabled = !edit;
      }
    });
    // Alternar visibilidad de botones
    editBtn.classList.toggle("hidden", edit);
    cancelBtn.classList.toggle("hidden", !edit);
    saveBtn.classList.toggle("hidden", !edit);
    avatarInput.style.display = edit ? "block" : "none";
  };

  /* ========================================================
      📥 CARGAR PERFIL DE USUARIO
     ======================================================== */
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error al obtener perfil desde el servidor");
    const user = await res.json();

    // Rellenar imagen de perfil
    if (user.profileImage) {
      profilePreview.src = user.profileImage;
    }

    // Rellenar datos de texto de forma segura
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

    // Rellenar Radio Button (Estilo Social)
    if (user.style) {
      const radio = document.querySelector(`input[name="style"][value="${user.style}"]`);
      if (radio) radio.checked = true;
    }

    // Rellenar Checkboxes (Idiomas)
    if (user.languages && Array.isArray(user.languages)) {
      user.languages.forEach(lang => {
        const checkbox = document.querySelector(`input[name="languages"][value="${lang}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Rellenar Checkboxes (Intereses)
    if (user.interests && Array.isArray(user.interests)) {
      user.interests.forEach(int => {
        const checkbox = document.querySelector(`input[name="interests"][value="${int}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // Inicializar todo deshabilitado (Modo Lectura/Red Social)
    toggleEditMode(false);

  } catch (error) {
    console.error("❌ Error cargando perfil:", error);
    alert("Error al cargar los datos de tu perfil.");
  }

  /* ========================================================
      🔄 MANEJO DE EVENTOS (BOTONES)
     ======================================================== */
  editBtn.addEventListener("click", () => toggleEditMode(true));
  cancelBtn.addEventListener("click", () => window.location.reload());

  // Previsualización instantánea de la imagen elegida
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      profilePreview.src = URL.createObjectURL(file);
    }
  });

  /* ========================================================
      ✏️ GUARDAR CAMBIOS (PUT)
     ======================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = Array.from(document.querySelectorAll("input[name='interests']:checked")).map(i => i.value);
    const languages = Array.from(document.querySelectorAll("input[name='languages']:checked")).map(l => l.value);

    // Creamos un FormData limpio de manera manual para evitar duplicados molestos con Multer
    const formData = new FormData();
    formData.append("firstName", form.firstName.value);
    formData.append("lastName", form.lastName.value);
    formData.append("age", form.age.value);
    formData.append("nationality", form.nationality.value);
    formData.append("department", form.department.value);
    formData.append("phone", form.phone.value);
    formData.append("personality", form.personality.value);
    formData.append("bio", form.bio.value);
    
    // Capturar valor del Radio Button seleccionado
    const styleSelected = document.querySelector("input[name='style']:checked");
    if (styleSelected) formData.append("style", styleSelected.value);

    // Enviar arrays serializados correctamente
    formData.append("languages", JSON.stringify(languages));
    formData.append("interests", JSON.stringify(interests));

    // Si cambió la foto, la adjuntamos
    if (avatarInput.files[0]) {
      formData.append("profileImage", avatarInput.files[0]);
    }

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const updatedUser = await res.json();

      if (!res.ok) throw new Error(updatedUser.message || "Error al actualizar perfil");

      // Actualizar la sesión guardada localmente
      const newSessionData = { 
        ...authUser,
        user: {
          ...authUser.user,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          profileImage: updatedUser.profileImage || authUser.user?.profileImage
        }
      };
      
      localStorage.setItem("currentUser", JSON.stringify(newSessionData));
      alert("✅ ¡Perfil actualizado correctamente!");
      toggleEditMode(false);
      window.location.reload(); // Recargar para ver el diseño limpio actualizado

    } catch (error) {
      console.error("❌ Error en actualización:", error);
      alert(error.message || "No se pudo actualizar el perfil.");
    }
  });
});