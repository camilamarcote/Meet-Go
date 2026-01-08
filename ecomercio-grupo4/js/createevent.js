// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://meetgo-backend.onrender.com";

const eventForm = document.getElementById("eventForm");

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    alert("Debes iniciar sesión");
    return;
  }

  const formData = new FormData();

  formData.append("name", eventName.value);
  formData.append("description", eventDescription.value);
  formData.append("category", eventCategory.value);
  formData.append("department", eventDepartment.value);
  formData.append("date", eventDate.value);
  formData.append("time", eventTime.value);
  formData.append("price", Number(eventPrice.value) || 0);

  if (eventImage.files.length) {
    formData.append("image", eventImage.files[0]);
  }

  if (eventWhatsapp.value.trim()) {
    formData.append("whatsappLink", eventWhatsapp.value.trim());
  }

  if (eventQR.files.length) {
    formData.append("whatsappQR", eventQR.files[0]);
  }

  try {
    const res = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      body: formData
      // ❗ NO agregar headers Content-Type con FormData
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error backend:", text);
      alert("❌ Error creando evento");
      return;
    }

    const data = await res.json();

    alert("✅ Evento creado correctamente");
    eventForm.reset();

  } catch (error) {
    console.error("❌ Error de red:", error);
    alert("Error de conexión con el servidor");
  }
});
