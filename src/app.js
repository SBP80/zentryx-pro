import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://idtaamivqbiuxtjywuux.supabase.co",
  "sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx"
);

const app = document.getElementById("app");

const state = {
  user: null,
  currentView: "inicio"
};

init();

function init() {
  const savedUser = localStorage.getItem("user");

  if (savedUser) {
    state.user = JSON.parse(savedUser);
    renderAppShell();
    return;
  }

  renderLogin();
}

function renderLogin() {
  document.title = "Zentryx";

  app.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#f3f4f6;
      font-family:Arial,sans-serif;
      padding:20px;
      box-sizing:border-box;
    ">
      <div style="
        width:100%;
        max-width:420px;
        background:#ffffff;
        border:1px solid #d1d5db;
        border-radius:18px;
        padding:24px;
        box-sizing:border-box;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);
      ">
        <h1 style="margin:0 0 8px 0;font-size:32px;">Zentryx</h1>
        <p style="margin:0 0 20px 0;color:#6b7280;">Acceso al sistema</p>

        <input
          id="usuario"
          placeholder="Usuario"
          style="
            width:100%;
            height:48px;
            margin-bottom:10px;
            padding:0 14px;
            border:1px solid #d1d5db;
            border-radius:12px;
            box-sizing:border-box;
            font-size:16px;
          "
        >

        <input
          id="password"
          type="password"
          placeholder="Contraseña"
          style="
            width:100%;
            height:48px;
            margin-bottom:12px;
            padding:0 14px;
            border:1px solid #d1d5db;
            border-radius:12px;
            box-sizing:border-box;
            font-size:16px;
          "
        >

        <button
          id="loginBtn"
          style="
            width:100%;
            height:48px;
            border:none;
            border-radius:12px;
            background:#111827;
            color:#ffffff;
            font-size:16px;
            font-weight:700;
          "
        >
          Entrar
        </button>

        <div id="loginMsg" style="margin-top:12px;color:#b91c1c;font-size:14px;"></div>
      </div>
    </div>
  `;

  document.getElementById("loginBtn").addEventListener("click", login);
}

async function login() {
  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("loginMsg");

  msg.textContent = "";

  if (!usuario || !password) {
    msg.textContent = "Escribe usuario y contraseña";
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("usuario", usuario)
    .eq("password", password)
    .single();

  if (error || !data) {
    msg.textContent = "Usuario o contraseña incorrectos";
    return;
  }

  state.user = data;
  localStorage.setItem("user", JSON.stringify(data));
  state.currentView = "inicio";
  renderAppShell();
}

function renderAppShell() {
  document.title = "Zentryx";

  app.innerHTML = `
    <div style="
      min-height:100vh;
      background:#f3f4f6;
      font-family:Arial,sans-serif;
      color:#111827;
    ">
      <header style="
        position:sticky;
        top:0;
        z-index:10;
        background:#111827;
        color:#ffffff;
        padding:16px;
        box-sizing:border-box;
      ">
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        ">
          <div>
            <div style="font-size:24px;font-weight:800;">Zentryx</div>
            <div style="font-size:13px;opacity:0.85;">
              ${state.user.nombre} · ${state.user.rol}
            </div>
          </div>

          <button
            id="logoutBtn"
            style="
              height:40px;
              padding:0 14px;
              border:none;
              border-radius:10px;
              background:#dc2626;
              color:#ffffff;
              font-weight:700;
            "
          >
            Salir
          </button>
        </div>
      </header>

      <div style="padding:16px;box-sizing:border-box;">
        <nav style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-bottom:16px;
        ">
          <button id="navInicio" style="${navButtonStyle(state.currentView === "inicio")}">Inicio</button>
          <button id="navUsuarios" style="${navButtonStyle(state.currentView === "usuarios")}">Usuarios</button>
          <button id="navConfiguracion" style="${navButtonStyle(state.currentView === "configuracion")}">Configuración</button>
        </nav>

        <main id="view" style="
          background:#ffffff;
          border:1px solid #d1d5db;
          border-radius:18px;
          padding:18px;
          box-sizing:border-box;
          min-height:300px;
          box-shadow:0 10px 30px rgba(0,0,0,0.05);
        "></main>
      </div>
    </div>
  `;

  document.getElementById("logoutBtn").onclick = logout;
  document.getElementById("navInicio").onclick = () => changeView("inicio");
  document.getElementById("navUsuarios").onclick = () => changeView("usuarios");
  document.getElementById("navConfiguracion").onclick = () => changeView("configuracion");

  renderCurrentView();
}

function navButtonStyle(active) {
  return `
    height:42px;
    padding:0 14px;
    border:none;
    border-radius:12px;
    font-size:15px;
    font-weight:700;
    background:${active ? "#111827" : "#e5e7eb"};
    color:${active ? "#ffffff" : "#111827"};
  `;
}

function changeView(view) {
  state.currentView = view;
  renderAppShell();
}

function renderCurrentView() {
  const view = document.getElementById("view");

  if (state.currentView === "inicio") {
    view.innerHTML = `
      <h2 style="margin-top:0;">Inicio</h2>
      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:12px;
      ">
        <div style="padding:14px;border:1px solid #d1d5db;border-radius:14px;">
          <div style="font-size:13px;color:#6b7280;">Usuario activo</div>
          <div style="font-size:20px;font-weight:800;margin-top:8px;">${state.user.nombre}</div>
        </div>

        <div style="padding:14px;border:1px solid #d1d5db;border-radius:14px;">
          <div style="font-size:13px;color:#6b7280;">Rol</div>
          <div style="font-size:20px;font-weight:800;margin-top:8px;">${state.user.rol}</div>
        </div>

        <div style="padding:14px;border:1px solid #d1d5db;border-radius:14px;">
          <div style="font-size:13px;color:#6b7280;">Estado</div>
          <div style="font-size:20px;font-weight:800;margin-top:8px;">Online</div>
        </div>
      </div>

      <div style="margin-top:18px;padding:14px;border:1px solid #d1d5db;border-radius:14px;">
        Base inicial lista. Ya podemos empezar a montar módulos reales.
      </div>
    `;
    return;
  }

  if (state.currentView === "usuarios") {
    renderUsuariosView(view);
    return;
  }

  if (state.currentView === "configuracion") {
    renderConfiguracionView(view);
  }
}

async function renderUsuariosView(view) {
  view.innerHTML = `<div>Cargando usuarios...</div>`;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    view.innerHTML = `<div style="color:#b91c1c;">Error cargando usuarios</div>`;
    return;
  }

  const rows = (data || []).map((user) => `
    <div style="
      border:1px solid #d1d5db;
      border-radius:14px;
      padding:12px;
      margin-bottom:10px;
    ">
      <div style="font-size:18px;font-weight:800;">${user.nombre}</div>
      <div style="margin-top:4px;color:#374151;">Usuario: ${user.usuario}</div>
      <div style="margin-top:4px;color:#374151;">Rol: ${user.rol}</div>
    </div>
  `).join("");

  view.innerHTML = `
    <h2 style="margin-top:0;">Usuarios</h2>

    <div style="
      border:1px solid #d1d5db;
      border-radius:14px;
      padding:14px;
      margin-bottom:16px;
    ">
      <h3 style="margin-top:0;">Nuevo usuario</h3>

      <input id="newNombre" placeholder="Nombre" style="${inputStyle()}">
      <input id="newUsuario" placeholder="Usuario" style="${inputStyle()}">
      <input id="newPassword" placeholder="Contraseña" style="${inputStyle()}">
      <input id="newRol" placeholder="Rol" value="operario" style="${inputStyle()}">

      <button id="saveUserBtn" style="${primaryButtonStyle()}">Guardar usuario</button>
      <div id="userMsg" style="margin-top:10px;font-size:14px;"></div>
    </div>

    <div>
      <h3 style="margin-top:0;">Listado</h3>
      ${rows || "<div>No hay usuarios</div>"}
    </div>
  `;

  document.getElementById("saveUserBtn").onclick = crearUsuario;
}

async function crearUsuario() {
  const nombre = document.getElementById("newNombre").value.trim();
  const usuario = document.getElementById("newUsuario").value.trim();
  const password = document.getElementById("newPassword").value.trim();
  const rol = document.getElementById("newRol").value.trim() || "operario";
  const msg = document.getElementById("userMsg");

  msg.style.color = "#b91c1c";
  msg.textContent = "";

  if (!nombre || !usuario || !password) {
    msg.textContent = "Completa nombre, usuario y contraseña";
    return;
  }

  const { error } = await supabase
    .from("users")
    .insert([{ nombre, usuario, password, rol }]);

  if (error) {
    msg.textContent = "Error guardando usuario";
    return;
  }

  msg.style.color = "#15803d";
  msg.textContent = "Usuario guardado correctamente";

  renderUsuariosView(document.getElementById("view"));
}

function renderConfiguracionView(view) {
  view.innerHTML = `
    <h2 style="margin-top:0;">Configuración</h2>

    <div style="
      border:1px solid #d1d5db;
      border-radius:14px;
      padding:14px;
      margin-bottom:12px;
    ">
      <div style="font-size:13px;color:#6b7280;">Proyecto</div>
      <div style="font-size:18px;font-weight:800;margin-top:8px;">Zentryx pro</div>
    </div>

    <div style="
      border:1px solid #d1d5db;
      border-radius:14px;
      padding:14px;
    ">
      <div style="font-size:13px;color:#6b7280;">Base de datos</div>
      <div style="font-size:16px;font-weight:700;margin-top:8px;">Supabase conectada</div>
      <div style="margin-top:6px;color:#374151;">Proyecto listo para seguir creciendo.</div>
    </div>
  `;
}

function logout() {
  localStorage.removeItem("user");
  state.user = null;
  state.currentView = "inicio";
  renderLogin();
}

function inputStyle() {
  return `
    width:100%;
    height:46px;
    margin-bottom:10px;
    padding:0 12px;
    border:1px solid #d1d5db;
    border-radius:12px;
    box-sizing:border-box;
    font-size:15px;
  `;
}

function primaryButtonStyle() {
  return `
    width:100%;
    height:46px;
    border:none;
    border-radius:12px;
    background:#111827;
    color:#ffffff;
    font-size:15px;
    font-weight:700;
  `;
}