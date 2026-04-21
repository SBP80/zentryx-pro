const app = document.getElementById("app");

function renderLogin() {
  app.innerHTML = `
    <div style="max-width:400px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:12px;font-family:Arial;">
      <h2 style="margin-top:0;">Zentryx</h2>

      <input id="user" placeholder="Usuario" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;">
      <input id="pass" type="password" placeholder="Contraseña" style="width:100%;height:40px;margin-bottom:10px;padding:0 10px;">

      <button id="login" style="width:100%;height:45px;">Entrar</button>

      <div id="msg" style="margin-top:10px;color:red;"></div>
    </div>
  `;

  document.getElementById("login").onclick = () => {
    const user = document.getElementById("user").value;
    const pass = document.getElementById("pass").value;

    if (user === "admin" && pass === "1234") {
      renderHome();
    } else {
      document.getElementById("msg").innerText = "Usuario o contraseña incorrectos";
    }
  };
}

function renderHome() {
  app.innerHTML = `
    <div style="max-width:500px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:12px;text-align:center;font-family:Arial;">
      <h1>Bienvenido</h1>
      <p>Login correcto</p>
      <button onclick="logout()">Cerrar sesión</button>
    </div>
  `;
}

function logout() {
  renderLogin();
}

window.logout = logout;

renderLogin();