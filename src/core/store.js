const defaultState = {
  company: {
    nombre: "Zentryx"
  },
  users: [
    {
      id: 1,
      usuario: "admin",
      password: "1234",
      nombre: "Administrador",
      rol: "Administrador"
    }
  ]
};

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("zentryx_state"));
    return saved || structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem("zentryx_state", JSON.stringify(state));
}