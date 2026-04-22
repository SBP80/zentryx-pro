import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://idtaamivqbiuxtjywuux.supabase.co",
  "sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx"
);

// comprobar sesión
const userGuardado = localStorage.getItem("user");

if (userGuardado) {
  cargarApp(JSON.parse(userGuardado));
} else {
  pintarLogin();
}

// LOGIN UI
function pintarLogin() {
  document.getElementById("app").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;padding:20px;">
      <input id="usuario" placeholder="Usuario">
      <input id="password" type="password" placeholder="Contraseña">
      <button id="loginBtn">Entrar</button>
    </div>
  `;

  document.getElementById("loginBtn").addEventListener("click", login);
}

// LOGIN lógica
async function login() {
  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("usuario", usuario)
    .eq("password", password)
    .single();

  if (error || !data) {
    alert("Usuario o contraseña incorrectos");
    return;
  }

  localStorage.setItem("user", JSON.stringify(data));
  cargarApp(data);
}

// APP
function cargarApp(user) {
  document.getElementById("app").innerHTML = `
    <div style="padding:20px;">
      <h2>Bienvenido ${user.nombre}</h2>
      <p>Rol: ${user.rol}</p>

      <button id="logout">Cerrar sesión</button>

      <div id="contenido"></div>
    </div>
  `;

  document.getElementById("logout").onclick = () => {
    localStorage.removeItem("user");
    location.reload();
  };

  // control por rol
  if (user.rol === "admin") {
    document.getElementById("contenido").innerHTML = `
      <h3>Panel Administrador</h3>
      <p>Acceso total</p>
    `;
  } else {
    document.getElementById("contenido").innerHTML = `
      <h3>Zona Operario</h3>
      <p>Acceso limitado</p>
    `;
  }
}