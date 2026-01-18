function renderUsers(users) {
  if (!Array.isArray(users)) {
    console.error("users no es un array:", users);
    return;
  }

  const container = document.getElementById("usersContainer");
  container.innerHTML = "";

  users.forEach(user => {
    container.innerHTML += `
      <div class="user-card">
        <h3>${user.username}</h3>

        <p>📧 ${user.email}</p>
        <p>🎂 Edad: ${user.age ?? "—"}</p>
        <p>🌎 ${user.nationality ?? "—"}</p>

        <p>
          🟢 Estado:
          <span class="badge ${user.isVerified ? "success" : "warning"}">
            ${user.isVerified ? "Verificada" : "No verificada"}
          </span>
        </p>

        <p>
          👮 Rol:
          <span class="badge admin">
            ${user.isOrganizer ? "Organizadora" : "Usuaria"}
          </span>
        </p>

        <p>⭐ Intereses: ${user.interests?.join(", ") || "—"}</p>
        <p>🗣️ Idiomas: ${user.languages?.join(", ") || "—"}</p>

        <button class="mail-btn" onclick="sendMail('${user._id}')">
          ✉️ Enviar mail
        </button>
      </div>
    `;
  });
}
