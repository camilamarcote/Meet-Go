console.log("myprofile.js cargado");

document.addEventListener("DOMContentLoaded", async () => {

  /* =====================================================
     0) VALIDAR LOGIN
  ===================================================== */
  const authUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!authUser || !authUser.id) {
    alert("No hay usuario logueado");
    window.location.href = "welcome.html";
    return;
  }

  const userId = authUser.id;
  const form = document.getElementById("profileForm");
  const profileImageInput = document.getElementById("profileImage");
  const profileImagePreview = document.getElementById("currentProfileImage");



  /* =====================================================
     1) PREVIEW DE IMAGEN
  ===================================================== */
  profileImageInput.addEventListener("change", () => {
    const file = profileImageInput.files[0];
    if (file) {
      profileImagePreview.src = URL.createObjectURL(file);
    }
  });



  /* =====================================================
     2) CARGAR DATOS DEL USUARIO
  ===================================================== */
  try {
    const res = await fetch(`http://localhost:5000/api/users/${userId}`);
    if (!res.ok) {
      alert("Error al cargar los datos del usuario");
      return;
    }

    const user = await res.json();


    // Rellenar campos
    form.firstName.value = user.firstName || "";
    form.lastName.value = user.lastName || "";
    form.username.value = user.username || "";
    form.email.value = user.email || "";
    form.age.value = user.age || "";
    form.department.value = user.department || "";
    form.personality.value = user.personality || "";
    form.bio.value = user.bio || "";

    // Estilo (radios)
    if (user.style) {
      const radio = document.querySelector(`input[name="style"][value="${user.style}"]`);
      if (radio) radio.checked = true;
    }

    // Intereses (checkboxes)
    if (Array.isArray(user.interests)) {
      user.interests.forEach((interest) => {
        const checkbox = document.querySelector(
          `input[type="checkbox"][value="${interest}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    }

    // Imagen actual
    profileImagePreview.src = user.profileImage
      ? `http://localhost:5000${user.profileImage}`
      : "img/default-user.png";

  } catch (error) {
    console.error("❌ Error al cargar perfil:", error);
    alert("Error al cargar perfil");
  }



  /* =====================================================
     3) SUBMIT — ACTUALIZAR PERFIL
  ===================================================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("👉 SUBMIT DISPARADO");

    const formData = new FormData();

    formData.append("firstName", form.firstName.value);
    formData.append("lastName", form.lastName.value);
    formData.append("username", form.username.value);
    formData.append("age", form.age.value);
    formData.append("department", form.department.value);
    formData.append("personality", form.personality.value);
    formData.append("bio", form.bio.value);

    // Estilo
    const selectedStyle = document.querySelector("input[name='style']:checked");
    formData.append("style", selectedStyle ? selectedStyle.value : "");

    // Intereses
    const selectedInterests = [
      ...document.querySelectorAll("input[type='checkbox']:checked")
    ].map(i => i.value);

    formData.append("interests", JSON.stringify(selectedInterests));

    // Imagen
    if (profileImageInput.files.length > 0) {
      formData.append("profileImage", profileImageInput.files[0]);
    }



    /* =====================================================
       4) PETICIÓN PUT PARA ACTUALIZAR
    ===================================================== */
    try {
      const updateRes = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: "PUT",
        body: formData
      });

      const updateData = await updateRes.json();
      console.log("📦 Respuesta del servidor:", updateData);

      if (!updateRes.ok) {
        return alert(updateData.message || "Error al actualizar");
      }

      alert("Perfil actualizado correctamente");


      /* ==============================
         5) ACTUALIZAR LOCALSTORAGE
      ============================== */
      const updatedSmallUser = {
        id: updateData.user._id,
        username: updateData.user.username,
        email: updateData.user.email,
        profileImage: updateData.user.profileImage || "",
        isOrganizer: updateData.user.isOrganizer
      };

      localStorage.setItem("currentUser", JSON.stringify(updatedSmallUser));


      /* ==============================
         6) REDIRIGIR A HOME
      ============================== */
      window.location.href = "index.html";

    } catch (error) {
      console.error("❌ Error al actualizar:", error);
      alert("Error al actualizar perfil");
    }
  });

});
