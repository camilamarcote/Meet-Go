const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", async () => {
  const authUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!authUser?.token) {
    window.location.href = "welcome.html";
    return;
  }

  const token = authUser.token;
  const form = document.getElementById("profileForm");

  /* =============================
     📥 CARGAR PERFIL
  ============================== */
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
    form.nationality.value = user.nationality || "";
    form.department.value = user.department || "";
    form.personality.value = user.personality || "";
    form.style.value = user.style || "";
    form.bio.value = user.bio || "";

    /* CHECKBOXES */
    user.languages?.forEach(lang => {
      const cb = document.querySelector(
        `input[name="languages"][value="${lang}"]`
      );
      if (cb) cb.checked = true;
    });

    user.interests?.forEach(int => {
      const cb = document.querySelector(
        `input[name="interests"][value="${int}"]`
      );
      if (cb) cb.checked = true;
    });

    /* NO EDITABLES */
    form.email.disabled = true;
    form.username.disabled = true;

  } catch (error) {
    console.error(error);
    alert("Error al cargar perfil");
  }

  /* =============================
     ✏️ GUARDAR CAMBIOS
  ============================== */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(el => el.value);

    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(el => el.value);

    const formData = new FormData(form);
    formData.set("languages", JSON.stringify(languages));
    formData.set("interests", JSON.stringify(interests));

    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const updatedUser = await res.json();

      if (!res.ok) {
        alert(updatedUser.message || "Error al actualizar perfil");
        return;
      }

      /* 🔄 ACTUALIZAR LOCALSTORAGE */
      const stored = JSON.parse(localStorage.getItem("currentUser"));
      stored.profileImage = updatedUser.profileImage;
      localStorage.setItem("currentUser", JSON.stringify(stored));

      alert("✅ Perfil actualizado correctamente");

      /* 👉 VOLVER AL INDEX */
      window.location.href = "index.html";

    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el perfil");
    }
  });
});
