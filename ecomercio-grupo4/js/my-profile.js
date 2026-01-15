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
  ============================= */
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
    if (user.languages) {
      user.languages.forEach(lang => {
        const checkbox = document.querySelector(
          `input[name="languages"][value="${lang}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    }

    if (user.interests) {
      user.interests.forEach(int => {
        const checkbox = document.querySelector(
          `input[name="interests"][value="${int}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    }

    /* NO EDITABLES */
    form.email.disabled = true;
    form.username.disabled = true;

  } catch (error) {
    console.error(error);
    alert("Error al cargar perfil");
  }

  /* =============================
     ✏️ GUARDAR CAMBIOS
  ============================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = Array.from(
      document.querySelectorAll("input[name='interests']:checked")
    ).map(i => i.value);

    const languages = Array.from(
      document.querySelectorAll("input[name='languages']:checked")
    ).map(l => l.value);

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

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Error al actualizar perfil");
        return;
      }

      alert("✅ Perfil actualizado correctamente");

    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el perfil");
    }
  });
});
