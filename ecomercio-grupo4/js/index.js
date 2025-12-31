document.addEventListener("DOMContentLoaded", () => {

  // Navegación desde las tarjetas del Index
  const gastronomia = document.getElementById("gastronomia");
  const naturaleza = document.getElementById("naturaleza");
  const cultural = document.getElementById("cultural");

  if (gastronomia) {
    gastronomia.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "gastronomia");
      window.location.href = "explorar.html";
    });
  }

  if (naturaleza) {
    naturaleza.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "naturaleza");
      window.location.href = "explorar.html";
    });
  }

  if (cultural) {
    cultural.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "cultural");
      window.location.href = "explorar.html";
    });
  }

});
