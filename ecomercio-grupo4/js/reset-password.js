const API_URL = "https://api.meetandgouy.com";
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("newPassword").value;

  if (!token) {
    alert("Token inválido");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error al cambiar contraseña");
      return;
    }

    alert("✅ Contraseña actualizada");
    window.location.href = "login.html";

  } catch {
    alert("Error de conexión");
  }
});
