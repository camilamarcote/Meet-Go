console.log("login.js cargado");

const loginForm = document.getElementById("loginForm");
const loginUser = document.getElementById("loginUser");   // <--- CORREGIDO
const loginPass = document.getElementById("loginPass");   // <--- CORREGIDO

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const res = await fetch("http://localhost:5000/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: loginUser.value,
      password: loginPass.value
    })
  });

  const data = await res.json();

  if (!res.ok) return alert(data.message);

  const smallUser = {
    id: data.user._id,
    username: data.user.username,
    email: data.user.email,
    profileImage: data.user.profileImage || "",
    isOrganizer: data.user.isOrganizer === true
  };

  localStorage.setItem("currentUser", JSON.stringify(smallUser));

  window.location.href = "index.html";
});
