const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("experienceForm");
  const token = localStorage.getItem("token");

  if (!form) {
    console.error("❌ No se encontró el formulario");
    return;
  }

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const lookingFor = formData.getAll("lookingFor");

    const payload = {
      favoriteMovie: formData.get("favoriteMovie"),
      favoriteSong: formData.get("favoriteSong"),
      favoriteFood: formData.get("favoriteFood"),
      dreamTrip: formData.get("dreamTrip"),
      groupPreference: formData.get("groupPreference"),
      conversationStyle: formData.get("conversationStyle"),
      initiatesConversation: formData.get("initiatesConversation"),
      lookingFor
    };

    try {
      const res = await fetch(`${API_URL}/api/users/me/experience`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Error guardando perfil");
      }

      // ✅ REDIRIGE A EVENTOS
      window.location.href = "explorar.html";

    } catch (err) {
      console.error("❌ Error:", err);
      alert("Ocurrió un error guardando tu perfil. Intentá de nuevo.");
    }
  });
});