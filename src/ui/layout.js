import { getSession, clearSession } from "../core/session.js";

export function layout(title, content, state) {
  const user = state.users.find(u => u.usuario === getSession());

  return `
    <div style="max-width:650px;margin:20px auto;padding:16px;font-family:Arial;">
      <div style="border:1px solid #ddd;border-radius:16px;padding:18px;">

        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div>
            <div style="font-size:26px;font-weight:bold;">${state.company.nombre}</div>
            <div style="color:#666;">${title}</div>
          </div>
          <div style="text-align:right;">
            <div><b>${user?.nombre || ""}</b></div>
            <div>${user?.rol || ""}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <button id="nav_inicio">Inicio</button>
          <button id="nav_usuarios">Usuarios</button>
          <button id="nav_config">Configuración</button>
          <button id="nav_logout">Cerrar sesión</button>
        </div>

        <div>${content}</div>

      </div>
    </div>
  `;
}

export function bindLayoutEvents(app, state, handlers) {
  document.getElementById("nav_inicio").onclick = handlers.onInicio;
  document.getElementById("nav_usuarios").onclick = handlers.onUsuarios;
  document.getElementById("nav_config").onclick = handlers.onConfiguracion;
  document.getElementById("nav_logout").onclick = () => {
    clearSession();
    handlers.onLogout();
  };
}