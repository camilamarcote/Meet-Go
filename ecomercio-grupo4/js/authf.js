const API_URL = "https://api.meetandgouy.com";

export async function refreshCurrentUser() {
  const storedUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!storedUser?.token) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${storedUser.token}`
      }
    });

    if (!res.ok) throw new Error();

    const freshUser = await res.json();

    const updatedUser = {
      ...storedUser,
      ...freshUser
    };

    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    return updatedUser;

  } catch (err) {
    console.error("❌ Error refrescando usuario", err);
    return storedUser;
  }
}
