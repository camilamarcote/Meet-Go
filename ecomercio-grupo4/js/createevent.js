// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://api.meetandgouy.com";
;

const eventForm = document.getElementById("eventForm");
const departmentSelect = document.getElementById("eventDepartment");
const neighborhoodSelect = document.getElementById("eventNeighborhood");

// =============================
// 📍 Barrios por departamento
// =============================
const neighborhoodsByDepartment = {
  Montevideo: [ 
    "Centro",
    "Cordón",
    "Pocitos",
    "Punta Carretas",
    "Carrasco",
    "Buceo",
    "Malvín",
    "Ciudad Vieja",
    "Prado",
    "Sayago",
    "Colón"
  ],
  Canelones: [
    "Las Piedras",
    "La Paz",
    "Ciudad de la Costa",
    "Pando"
  ],
  Maldonado: [
    "Punta del Este",
    "San Carlos",
    "Piriápolis"
  ],
  Colonia: ["Colonia del Sacramento", "Carmelo"],
  Salto: ["Salto"],
  Paysandú: ["Paysandú"],
  Rivera: ["Rivera"],
  "San José": ["San José de Mayo"],
  Tacuarembó: ["Tacuarembó"],
  Rocha: ["Rocha", "La Paloma", "Chuy"]
};

// =============================
// 🔄 Cargar barrios dinámicos
// =============================
departmentSelect.addEventListener("change", () => {
  const department = departmentSelect.value;
  neighborhoodSelect.innerHTML = "";

  if (!department || !neighborhoodsByDepartment[department]) {
    neighborhoodSelect.disabled = true;
    neighborhoodSelect.innerHTML =
      `<option value="">Seleccioná un departamento primero</option>`;
    return;
  }

  neighborhoodSelect.disabled = false;
  neighborhoodSelect.innerHTML =
    `<option value="">Seleccionar</option>`;

  neighborhoodsByDepartment[department].forEach(neighborhood => {
    const option = document.createElement("option");
    option.value = neighborhood;
    option.textContent = neighborhood;
    neighborhoodSelect.appendChild(option);
  });
});

// =============================
// 📝 Enviar formulario
// =============================
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
  formData.append("neighborhood", eventNeighborhood.value);
  formData.append("date", eventDate.value);
  formData.append("time", eventTime.value);
  formData.append("price", Number(eventPrice.value) || 0);

  // Precio alternativo (opcional)
  if (eventAltPrice.value) {
    formData.append("altPrice", Number(eventAltPrice.value));
  }

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
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Error backend:", text);
      alert("❌ Error creando evento");
      return;
    }

    alert("✅ Evento creado correctamente");
    eventForm.reset();
    neighborhoodSelect.disabled = true;

  } catch (error) {
    console.error("❌ Error de red:", error);
    alert("Error de conexión con el servidor");
  }
});
