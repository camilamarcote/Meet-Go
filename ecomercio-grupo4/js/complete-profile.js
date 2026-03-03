const API_URL = "https://api.meetandgouy.com";

document.getElementById("experienceForm").addEventListener("submit", async e => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) return location.href = "login.html";

  const form = e.target;

  const body = {
    icebreakers: {
      favoriteMovie: form.favoriteMovie.value,
      favoriteSong: form.favoriteSong.value,
      favoriteFood: form.favoriteFood.value,
      dreamTrip: form.dreamTrip.value
    },
    socialStyle: {
      groupPreference: form.groupPreference.value,
      conversationStyle: form.conversationStyle.value,
      initiatesConversation: form.initiatesConversation.value
    },
    expectations: {
      lookingFor: [...form.querySelectorAll("input[name='lookingFor']:checked")]
        .map(i => i.value),
      discomforts: []
    }
  };

  const res = await fetch(`${API_URL}/api/users/me/experience`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    alert("Error al guardar perfil");
    return;
  }

  window.location.href = "events.html";
});