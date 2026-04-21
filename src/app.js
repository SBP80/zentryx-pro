const app = document.getElementById("app");

function getSession() {
  return localStorage.getItem("zentryx_session");
}

function setSession(username) {
  localStorage.setItem("zentryx_session", username);
}

function clearSession() {
  localStorage.removeItem("zentryx_session");
}

function renderLogin() {
  app.innerHTML = `
    <div style="max-width:400px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:12px;font-family:Arial;">
      <h2>Zentryx</h2>

      <input id="user" placeholder="Usuario" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;">
      <input id="pass" type="password" placeholder="Contraseña" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;">

      <button id="login" style="width:100%;height:45px;">Entrar</button>

      <div id="msg" style="margin-top:10px;color:red;"></div>
    </div>
  `;

  document.getElementById("login").onclick = () => {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();

    if (user === "admin" && pass === "1234") {
      setSession(user);
      renderMenu();
    } else {
      document.getElementById("msg").innerText = "Datos incorrectos";
    }
  };
}

function renderMenu() {
  const user = getSession();

  app.innerHTML = `
    <div style="max-width:500px;margin:40px auto;font-family:Arial;">
      <h2>Panel principal</h2>
      <p>Usuario: <b>${user}</b></p>

      <button id="btn_inicio" style="width:100%;height:45px;margin-bottom:10px;">Inicio</button>
      <button id="btn_fichajes" style="width:100%;height:45px;margin-bottom:10px;">Fichajes</button>

      <button id="logout" style="width:100%;height:45px;margin-top:20px;">Cerrar sesión</button>
    </div>
  `;

  document.getElementById("btn_inicio").onclick = renderInicio;
  document.getElementById("btn_fichajes").onclick = renderFichajes;
  document.getElementById("logout").onclick = () => {
    clearSession();
    renderLogin();
  };
}

function renderInicio() {
  app.innerHTML = `
    <div style="max-width:500px;margin:40px auto;font-family:Arial;">
      <h2>Inicio</h2>
      <p>Bienvenido al sistema Zentryx</p>
      <button onclick="renderMenu()">Volver</button>
    </div>
  `;
}

function renderFichajes() {
  app.innerHTML = `
    <div style="max-width:500px;margin:40px auto;font-family:Arial;">
      <h2>Fichajes</h2>
      <p>Módulo en construcción</p>
      <button onclick="renderMenu()">Volver</button>
    </div>
  `;
}

window.renderMenu = renderMenu;

function init() {
  const user = getSession();
  if (user) {
    renderMenu();
  } else {
    renderLogin();
  }
}

init();