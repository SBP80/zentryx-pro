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
      <h2 style="margin-top:0;">Zentryx</h2>

      <input id="user" placeholder="Usuario" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;box-sizing:border-box;">
      <input id="pass" type="password" placeholder="Contraseña" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;box-sizing:border-box;">

      <button id="login" style="width:100%;height:45px;">Entrar</button>

      <div id="msg" style="margin-top:10px;color:red;"></div>
    </div>
  `;

  document.getElementById("login").onclick = () => {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();

    if (!user || !pass) {
      document.getElementById("msg").innerText = "Escribe usuario y contraseña";
      return;
    }

    if (user === "admin" && pass === "1234") {
      setSession(user);
      renderHome();
    } else {
      document.getElementById("msg").innerText = "Usuario o contraseña incorrectos";
    }
  };
}

function renderHome() {
  const user = getSession();

  app.innerHTML = `
    <div style="max-width:500px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:12px;text-align:center;font-family:Arial;">
      <h1>Bienvenido</h1>
      <p>Usuario activo: <b>${user || ""}</b></p>
      <button id="logout" style="height:42px;padding:0 18px;">Cerrar sesión</button>
    </div>
  `;

  document.getElementById("logout").onclick = () => {
    clearSession();
    renderLogin();
  };
}

function init() {
  const user = getSession();

  if (user) {
    renderHome();
  } else {
    renderLogin();
  }
}

init();