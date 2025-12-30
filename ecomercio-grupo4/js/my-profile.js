const API_URL = "https://meetgo-backend.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {

  const authUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!authUser || !authUser.id || !authUser.token) {
    alert("No hay usuario logueado");
    window.location.href = "welcome.html";
    return;
  }

  const token = authUser.token;
  const userId = authUser.id;
  const form = document.getElementById("profileForm");
  const profileImageInput = document.getElementById("profileImage");
  const profileImagePreview = document.getElementById("currentProfileImage");

  /* ======================
     CARGAR PERFIL
  ====================== */
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      alert("Error al cargar perfil");
      return;
    }

    const user = await res.json();

    form.firstName.value = user.firstName || "";
    form.lastName.value = user.lastName || "";
    form.username.value = user.username || "";
    form.email.value = user.email || "";
    form.age.value = user.age || "";
    form.department.value = user.department || "";
    form.personality.value = user.personality || "";
    form.bio.value = user.bio || "";

    profileImagePreview.src = user.profileImage
      ? `${API_URL}${user.profileImage}`
      : "img/default-user.png";

  } catch (error) {
    alert("Error al cargar perfil");
  }

  /* ======================
     ACTUALIZAR PERFIL
  ====================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("firstName", form.firstName.value);
    formData.append("lastName", form.lastName.value);
    formData.append("username", form.username.value);
    formData.append("age", form.age.value);
    formData.append("department", form.department.value || "");
    formData.append("personality", form.personality.value);
    formData.append("bio", form.bio.value);

    if (profileImageInput.files.length > 0) {
      formData.append("profileImage", profileImageInput.files[0]);
    }

    try {
      const updateRes = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await updateRes.json();

      if (!updateRes.ok) {
        alert(data.message || "Error al actualizar");
        return;
      }

      alert("Perfil actualizado");

      localStorage.setItem("currentUser", JSON.stringify({
        ...authUser,
        username: data.user.username,
        profileImage: data.user.profileImage
      }));

      window.location.href = "index.html";

    } catch (error) {
      alert("Error al actualizar perfil");
    }
  });
});
