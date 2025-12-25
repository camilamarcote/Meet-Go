// js/categories.js
document.addEventListener("DOMContentLoaded", () => {
  const categories = [
    {
      name: "Naturaleza",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      description: "Explorá la belleza natural y conectá con otros aventureros."
    },
    {
      name: "Gastronomía",
      image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9",
      description: "Disfrutá de experiencias culinarias y cafés locales."
    },
    {
      name: "Cultural",
      image: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade",
      description: "Talleres, museos, recitales y actividades artísticas."
    },
    {
      name: "Deportes",
      image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25",
      description: "Movete y divertite con actividades deportivas y al aire libre."
    }
  ];

  const container = document.getElementById("category-container");

  categories.forEach(cat => {
    const card = document.createElement("div");
    card.classList.add("col-md-3", "mb-4");

    card.innerHTML = `
      <div class="card h-100 shadow-sm category-card" style="cursor:pointer;">
        <img src="${cat.image}" class="card-img-top" alt="${cat.name}">
        <div class="card-body text-center">
          <h5 class="card-title fw-bold">${cat.name}</h5>
          <p class="card-text text-muted">${cat.description}</p>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", cat.name);
      window.location.href = "events.html";
    });

    container.appendChild(card);
  });
});
