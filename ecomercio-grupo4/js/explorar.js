const API_URL = "https://api.meetandgouy.com";

// ============================
// ⭐ OCULTAR BANNER SI ESTÁ SUSCRIPTO
// ============================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const subscriptionBanner = document.getElementById("subscription-banner");

const isSubscribed = currentUser?.subscription?.isActive === true;

if (subscriptionBanner && isSubscribed) {
  subscriptionBanner.style.display = "none";
}


const eventsContainer = document.getElementById("eventsContainer");

async function loadEvents() {
  try {
    const res = await fetch(`${API_URL}/api/events`);
    if (!res.ok) throw new Error();

    const events = await res.json();
    eventsContainer.innerHTML = "";

    events.forEach(event => {
      const price = Number(event.price) || 0;

      eventsContainer.innerHTML += `
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 shadow-sm">
            <img src="${event.image || "img/default_event.jpg"}" class="card-img-top">
            <div class="card-body d-flex flex-column">
              <h5>${event.name}</h5>
              <p>${event.description || ""}</p>
              <a href="eventinfo.html?id=${event._id}" class="btn btn-primary btn-sm mt-auto">
                Ver evento
              </a>
            </div>
          </div>
        </div>`;
    });

  } catch (err) {
    console.error(err);
  }
}

loadEvents();
