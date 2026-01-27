const API_URL = "https://api.meetandgouy.com";

document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Ingresá tu email");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error al enviar el email");
      return;
    }

    alert("📧 Te enviamos un email con instrucciones");
    window.location.href = "login.html";

  } catch (err) {
    alert("No se pudo conectar con el servidor");
  }
});
