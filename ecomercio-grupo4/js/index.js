document.addEventListener("DOMContentLoaded", () => {

  // Si el usuario no está logueado → lo mando al login
  const authUser = localStorage.getItem("currentUser");
  if (!authUser) {
    return window.location.href = "welcome.html";
  }

  // Navegación desde las tarjetas del Index
  const gastronomia = document.getElementById("gastronomia");
  const naturaleza = document.getElementById("naturaleza");
  const cultural = document.getElementById("cultural");

  if (gastronomia) {
    gastronomia.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "gastronomia");
      window.location = "explorar.html";
    });
  }

  if (naturaleza) {
    naturaleza.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "naturaleza");
      window.location = "explorar.html";
    });
  }

  if (cultural) {
    cultural.addEventListener("click", () => {
      localStorage.setItem("selectedCategory", "cultural");
      window.location = "explorar.html";
    });
  }
});
