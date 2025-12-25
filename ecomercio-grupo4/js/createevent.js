const eventForm = document.getElementById("eventForm");

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) return alert("Debes iniciar sesión");

  const formData = new FormData();

  formData.append("name", eventName.value);
  formData.append("description", eventDescription.value);
  formData.append("category", eventCategory.value);
  formData.append("department", eventDepartment.value);
  formData.append("date", eventDate.value);
  formData.append("time", eventTime.value);
  formData.append("price", Number(eventPrice.value) || 0);

  if (eventImage.files.length)
    formData.append("image", eventImage.files[0]);

  if (eventWhatsapp.value.trim())
    formData.append("whatsappLink", eventWhatsapp.value.trim());

  if (eventQR.files.length)
    formData.append("whatsappQR", eventQR.files[0]);

  const res = await fetch("http://localhost:5000/events", {
    method: "POST",
    body: formData
  });

  if (res.ok) {
    alert("✅ Evento creado");
    eventForm.reset();
  } else {
    alert("❌ Error creando evento");
  }
});
