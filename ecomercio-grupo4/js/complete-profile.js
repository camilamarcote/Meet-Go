/*const API_URL = "https://api.meetandgouy.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("experienceForm");
  const token = localStorage.getItem("token");

  if (!form) return;
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const payload = {
      // 🎲 Ice breakers
      favoriteMovie: formData.get("favoriteMovie"),
      favoriteSong: formData.get("favoriteSong"),
      favoriteFood: formData.get("favoriteFood"),
      dreamTrip: formData.get("dreamTrip"),

      // 🧠 Dinámicas sociales
      groupPreference: formData.get("groupPreference"),
      conversationStyle: formData.get("conversationStyle"),
      initiatesConversation: formData.get("initiatesConversation"),

      // 🎯 Qué busca
      lookingFor: formData.getAll("lookingFor"),

      // ✨ PERFIL DE EXPERIENCIA
      interests: formData.getAll("interests"),
      personality: formData.get("personality"),
      style: formData.get("style"),
      languages: formData.getAll("languages"),
      bio: formData.get("bio")
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

      if (!res.ok) throw new Error("Error guardando perfil");

      window.location.href = "explorar.html";

    } catch (err) {
      console.error("❌ Error:", err);
      alert("Ocurrió un error guardando tu perfil.");
    }
  });
});*/