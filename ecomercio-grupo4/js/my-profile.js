const API_URL = "https://meetgo-backend.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  const stored = JSON.parse(localStorage.getItem("currentUser"));

  if (!stored || !stored.token) {
    alert("No hay usuario logueado");
    window.location.href = "welcome.html";
    return;
  }

  const token = stored.token;
  const form = document.getElementById("profileForm");
  const profileImageInput = document.getElementById("profileImage");
  const profileImagePreview = document.getElementById("currentProfileImage");

  /* ======================
     CARGAR PERFIL
  ====================== */
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error();

    const user = await res.json();

    form.firstName.value = user.firstName || "";
    form.lastName.value = user.lastName || "";
    form.username.value = user.username || "";
    form.email.value = user.email || "";
    form.age.value = user.age || "";
    form.department.value = user.department || "";
    form.personality.value = user.personality || "";
    form.bio.value = user.bio || "";

    profileImagePreview.src =
      user.profileImage || "img/default-user.png";

  } catch {
    alert("Error al cargar perfil");
  }

  /* ======================
     ACTUALIZAR PERFIL
  ====================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error al actualizar");
        return;
      }

      alert("Perfil actualizado correctamente");
      window.location.href = "index.html";

    } catch {
      alert("Error al actualizar perfil");
    }
  });
});
