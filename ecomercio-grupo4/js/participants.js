const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
const container = document.getElementById("participantsList");

async function loadParticipants() {
  const res = await fetch(
  `https://meetgo-backend.onrender.com/events/${eventId}`
);

  const event = await res.json();

  container.innerHTML = event.participants.map(p => `
    <div class="col-md-4">
      <div class="card p-3 text-center">
        <img src="${p.profileImage}" class="rounded-circle mb-2" width="80" height="80">
        <h5>${p.name}</h5>
        <p class="text-muted">@${p.username}</p>
        <p>${p.age ? p.age + " años" : ""}</p>
      </div>
    </div>
  `).join("");
}

loadParticipants();
