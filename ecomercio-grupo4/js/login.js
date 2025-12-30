document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;

  try {
    const response = await fetch("https://meetgo-backend.onrender.com/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Error al iniciar sesión");
      return;
    }

    // 🔐 Guardar sesión
    localStorage.setItem("token", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.user));

    // 🚀 Redirigir
    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Error en login frontend:", error);
    alert("Error de conexión con el servidor");
  }
});
