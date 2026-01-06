const API_URL = "https://meetgo-backend.onrender.com";

const eventsContainer = document.getElementById("eventsContainer");

function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

async function loadEvents() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al obtener eventos");

    const events = await res.json();
    eventsContainer.innerHTML = "";

    events.forEach(event => {
      const img =
        event.image && event.image.trim() !== ""
          ? `${API_URL}${event.image}`
          : getCategoryImage(event.category);

      const card = `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 shadow-sm">
            <img src="${img}" class="card-img-top" alt="Imagen del evento">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${event.name}</h5>
              <p class="card-text">${event.description || ""}</p>
              <p>
                <span class="badge bg-primary">${event.category}</span>
              </p>
              <p class="text-muted">${event.date} ${event.time}</p>
              <div class="mt-auto d-grid gap-2">
                <a href="eventinfo.html?id=${event._id}" class="btn btn-primary">
                  Ver más información
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      eventsContainer.innerHTML += card;
    });

  } catch (err) {
    console.error("❌ Error al cargar eventos:", err);
  }
}

loadEvents();
