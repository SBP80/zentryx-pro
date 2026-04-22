import { getSession, setSession, clearSession } from "./core/session.js";
import { renderInicio } from "./modules/inicio.js";
import { renderUsuarios } from "./modules/usuarios.js";
import { renderConfiguracion } from "./modules/configuracion.js";

const app = document.getElementById("app");

let state = {
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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("zentryx_state"));
    if (saved) {
      state = saved;
    }
  } catch {
    // no hacer nada
  }
}

function saveState() {
  localStorage.setItem("zentryx_state", JSON.stringify(state));
}

function renderLogin() {
  app.innerHTML = `
    <div style="max-width:400px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:16px;font-family:Arial,sans-serif;">
      <h2 style="margin-top:0;">Zentryx</h2>

      <input id="user" placeholder="Usuario" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;box-sizing:border-box;">
      <input id="pass" type="password" placeholder="Contraseña" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;box-sizing:border-box;">

      <button id="login" style="width:100%;height:46px;">Entrar</button>

      <div id="msg" style="margin-top:12px;color:#c00;"></div>
    </div>
  `;

  document.getElementById("login").onclick = () => {
    const usuario = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value.trim();
    const msg = document.getElementById("msg");

    if (!usuario || !password) {
      msg.innerText = "Escribe usuario y contraseña";
      return;
    }

    const found = state.users.find(
      (u) => u.usuario === usuario && u.password === password
    );

    if (!found) {
      msg.innerText = "Usuario o contraseña incorrectos";
      return;
    }

    setSession(found.usuario);
    renderInicio(app, state, handlers);
  };
}

const handlers = {
  onInicio: () => renderInicio(app, state, handlers),
  onUsuarios: () => renderUsuarios(app, state, handlers),
  onConfiguracion: () => renderConfiguracion(app, state, handlers),
  onLogout: () => {
    clearSession();
    renderLogin();
  }
};

function init() {
  loadState();
  saveState();

  if (getSession()) {
    renderInicio(app, state, handlers);
  } else {
    renderLogin();
  }
}

init();