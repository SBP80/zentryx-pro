import { getSession, setSession, clearSession } from "./core/session.js";
import { loadState, saveState } from "./core/store.js";
import { renderInicio } from "./modules/inicio.js";
import { renderUsuarios } from "./modules/usuarios.js";
import { renderConfiguracion } from "./modules/configuracion.js";

const app = document.getElementById("app");

let state = loadState();

function updateBrowserTitle() {
  document.title = state.company?.nombre?.trim() || "Zentryx";
}

function renderLogin() {
  updateBrowserTitle();

  app.innerHTML = `
    <div style="max-width:400px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:16px;font-family:Arial,sans-serif;">
      <h2 style="margin-top:0;">${state.company?.nombre || "Zentryx"}</h2>

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
    state = loadState();
    updateBrowserTitle();
    renderLogin();
  }
};

function init() {
  state = loadState();
  saveState(state);
  updateBrowserTitle();

  if (getSession()) {
    renderInicio(app, state, handlers);
  } else {
    renderLogin();
  }
}

init();