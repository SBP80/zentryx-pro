export function getSession() {
  return localStorage.getItem("zentryx_session");
}

export function setSession(username) {
  localStorage.setItem("zentryx_session", username);
}

export function clearSession() {
  localStorage.removeItem("zentryx_session");
}