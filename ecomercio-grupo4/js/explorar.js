// =============================
// 🌐 API BASE
// =============================
const API_URL = "https://meetgo-backend.onrender.com";

const eventsContainer = document.getElementById("eventsContainer");

/* =============================
   🖼️ Imagen por categoría
============================= */
function getCategoryImage(category) {
  const images = {
    Cultural: "img/default_cultural.jpg",
    Recreativa: "img/default_recreativa.jpg",
    Deportiva: "img/default_deportiva.jpg",
    Gastronómica: "img/default_gastronomica.jpg"
  };
  return images[category] || "img/default_event.jpg";
}

/* =============================
   📦 Cargar eventos
============================= */
async function loadEvents() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error("Error al obtener eventos");

    const events = await res.json();
    eventsContainer.innerHTML = "";

    events.forEach(event => {
      const img =
        event.image && event.image.startsWith("http")
          ? event.image
          : getCategoryImage(event.category);

      const price = Number(event.price) || 0;

      const card = `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 shadow-sm">
            <img src="${img}" class="card-img-top" alt="Imagen del evento">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${event.name}</h5>
              <p class="card-text small">${event.description || ""}</p>

              <div class="mb-2">
                <span class="badge bg-primary">${event.category}</span>
              </div>

              <p class="text-muted small mb-1">
                ${event.date} · ${event.time}
              </p>

              <p class="fw-bold">
                ${price === 0 ? "🎉 Gratis" : `$${price}`}
              </p>

              <div class="mt-auto d-grid">
                <a href="eventinfo.html?id=${event._id}" class="btn btn-primary btn-sm">
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
