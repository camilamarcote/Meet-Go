const API_URL = "https://api.meetandgouy.com";
const user = JSON.parse(localStorage.getItem("currentUser"));

if (!user?.id) {
  window.location.href = "login.html";
}

const container = document.getElementById("myEventsContainer");

fetch(`${API_URL}/api/tickets/my/${user.id}`)
  .then(res => res.json())
  .then(tickets => {
    if (!tickets.length) {
      container.innerHTML = "<p>No estás inscripto en ningún evento.</p>";
      return;
    }

    tickets.forEach(t => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <h3>${t.event.name}</h3>
        <p>📅 ${t.event.date} – ${t.event.time}</p>
        <p>🎫 ${t.accessType}</p>
        <img src="${t.qrImage}" width="120"/>
      `;
      container.appendChild(div);
    });
  });
