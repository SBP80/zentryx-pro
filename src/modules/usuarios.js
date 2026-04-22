import { layout, bindLayoutEvents } from "../ui/layout.js";
import { saveState } from "../core/store.js";

export function renderUsuarios(app, state, handlers) {
  const list = state.users.map(u => `
    <div style="border:1px solid #ddd;padding:10px;margin-bottom:8px;border-radius:10px;">
      <b>${u.nombre}</b><br>
      ${u.usuario} - ${u.rol}
    </div>
  `).join("");

  const content = `
    <h3>Usuarios</h3>

    <input id="u_nombre" placeholder="Nombre" style="width:100%;height:40px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
    <input id="u_usuario" placeholder="Usuario" style="width:100%;height:40px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
    <input id="u_pass" placeholder="Contraseña" style="width:100%;height:40px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">

    <button id="add_user" style="width:100%;height:42px;">Crear usuario</button>

    <div style="margin-top:12px;">${list}</div>
  `;

  app.innerHTML = layout("Usuarios", content, state);
  bindLayoutEvents(app, state, handlers);

  document.getElementById("add_user").onclick = () => {
    const nombre = document.getElementById("u_nombre").value.trim();
    const usuario = document.getElementById("u_usuario").value.trim();
    const password = document.getElementById("u_pass").value.trim();

    if (!nombre || !usuario || !password) return;

    state.users.push({
      id: Date.now(),
      nombre,
      usuario,
      password,
      rol: "Usuario"
    });

    saveState(state);
    renderUsuarios(app, state, handlers);
  };
}