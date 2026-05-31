// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://api.meetandgouy.com";

const eventForm = document.getElementById("eventForm");
const departmentSelect = document.getElementById("eventDepartment");
const neighborhoodSelect = document.getElementById("eventNeighborhood");

// Nuevos selectores añadidos para franja etaria y cupos
const ageRangeSelect = document.getElementById("eventAgeRange");
const hasCapacityLimitSelect = document.getElementById("eventHasCapacityLimit");
const maxCapacityInput = document.getElementById("eventMaxCapacity");
const capacityGroupContainer = document.getElementById("capacityGroupContainer");

// =============================
// 🔐 CONTROL DE USUARIO
// =============================
const user = JSON.parse(localStorage.getItem("currentUser"));

if (!user || !user.token) {
  alert("Debes iniciar sesión");
  window.location.href = "login.html";
}

if (!user.isOrganizer && !user.roles?.includes("admin")) {
  alert("Solo organizadores pueden crear eventos");
  window.location.href = "events.html";
}

// =============================
// 📍 Barrios por departamento
// =============================
const neighborhoodsByDepartment = {
  Montevideo: [
    "Centro", "Cordón", "Pocitos", "Punta Carretas", "Parque Rodó", 
    "Carrasco", "Buceo", "Malvín", "Ciudad Vieja", "Prado", "Sayago", "Colón"
  ],
  Canelones: ["Las Piedras", "La Paz", "Ciudad de la Costa", "Pando"],
  Maldonado: ["Punta del Este", "San Carlos", "Piriápolis"],
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
    neighborhoodSelect.innerHTML = `<option value="">Seleccioná un departamento primero</option>`;
    return;
  }

  neighborhoodSelect.disabled = false;
  neighborhoodSelect.innerHTML = `<option value="">Seleccionar</option>`;

  neighborhoodsByDepartment[department].forEach(neighborhood => {
    const option = document.createElement("option");
    option.value = neighborhood;
    option.textContent = neighborhood;
    neighborhoodSelect.appendChild(option);
  });
});

// =============================
// 🔄 Control Visual de Cupos (Ocultar/Mostrar input de cantidad)
// =============================
if (hasCapacityLimitSelect && capacityGroupContainer) {
  hasCapacityLimitSelect.addEventListener("change", () => {
    // Si seleccionan "SÍ" (true), mostramos el contenedor del input numérico
    if (hasCapacityLimitSelect.value === "true") {
      capacityGroupContainer.style.display = "block";
      maxCapacityInput.required = true; // Hacemos obligatorio el campo si hay límite
    } else {
      capacityGroupContainer.style.display = "none";
      maxCapacityInput.required = false;
      maxCapacityInput.value = ""; // Limpiamos el valor si se arrepienten
    }
  });
}

// =============================
// 📝 ENVIAR FORMULARIO
// =============================
eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();

  formData.append("name", eventName.value);
  formData.append("description", eventDescription.value);
  formData.append("category", eventCategory.value);
  formData.append("department", eventDepartment.value);
  formData.append("neighborhood", eventNeighborhood.value);
  formData.append("date", eventDate.value);
  formData.append("time", eventTime.value);
  formData.append("price", Number(eventPrice.value) || 0);

  // 👶 Franja Etaria (Mandará 'sin_limite' o el rango clásico elegido)
  if (ageRangeSelect) {
    formData.append("ageRange", ageRangeSelect.value);
  }

  // 🎟️ Lógica e Inclusión de Cupos Limitados
  const hasLimit = hasCapacityLimitSelect ? hasCapacityLimitSelect.value === "true" : false;
  formData.append("hasCapacityLimit", hasLimit);
  
  if (hasLimit && maxCapacityInput && maxCapacityInput.value) {
    formData.append("maxCapacity", Number(maxCapacityInput.value));
  }

  // Precio alternativo
  if (eventAltPrice.value) {
    formData.append("altPrice", Number(eventAltPrice.value));
  }

  // Imagen del evento
  if (eventImage.files.length) {
    formData.append("image", eventImage.files[0]);
  }

  // Link de whatsapp
  if (eventWhatsapp.value.trim()) {
    formData.append("whatsappLink", eventWhatsapp.value.trim());
  }

  // QR de whatsapp
  if (eventQR.files.length) {
    formData.append("whatsappQR", eventQR.files[0]);
  }

  try {
    const res = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.token}`
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Error backend:", data);
      alert(data.message || "Error creando evento");
      return;
    }

    alert("✅ Evento creado correctamente");

    eventForm.reset();
    neighborhoodSelect.disabled = true;
    
    // Ocultar de nuevo el campo de cupos al resetear
    if (capacityGroupContainer) {
      capacityGroupContainer.style.display = "none";
    }

  } catch (error) {
    console.error("❌ Error de red:", error);
    alert("Error de conexión con el servidor");
  }
});