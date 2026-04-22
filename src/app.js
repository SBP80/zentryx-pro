const app = document.getElementById("app");

const state = {
  company: {
    nombre: "Zentryx",
    razonSocial: "",
    cif: "",
    telefono: "",
    email: "",
    direccion: ""
  },
  users: [
    {
      id: 1,
      usuario: "admin",
      password: "1234",
      nombre: "Administrador",
      rol: "Administrador",
      telefono: "",
      email: "",
      activo: true,
      permisos: {
        inicio: true,
        usuarios: true,
        configuracion: true
      },
      notas: ""
    }
  ]
};

function getSession() {
  return localStorage.getItem("zentryx_session");
}

function setSession(username) {
  localStorage.setItem("zentryx_session", username);
}

function clearSession() {
  localStorage.removeItem("zentryx_session");
}

function saveLocalState() {
  localStorage.setItem("zentryx_demo_state", JSON.stringify(state));
}

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem("zentryx_demo_state"));
    if (!saved) return;

    if (saved.company) {
      state.company = { ...state.company, ...saved.company };
    }

    if (Array.isArray(saved.users) && saved.users.length > 0) {
      state.users = saved.users;
    }
  } catch {
    // no hacer nada
  }
}

function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return state.users.find((u) => u.usuario === session) || null;
}

function requireSession() {
  const user = getCurrentUser();
  if (!user) {
    renderLogin();
    return null;
  }
  return user;
}

function layout(title, content) {
  const currentUser = getCurrentUser();

  app.innerHTML = `
    <div style="max-width:650px;margin:20px auto;padding:16px;font-family:Arial,sans-serif;">
      <div style="border:1px solid #ddd;border-radius:16px;padding:18px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;">
          <div>
            <div style="font-size:28px;font-weight:700;">${state.company.nombre || "Zentryx"}</div>
            <div style="font-size:14px;color:#666;">${title}</div>
          </div>
          <div style="text-align:right;font-size:14px;color:#444;">
            <div><b>${currentUser?.nombre || ""}</b></div>
            <div>${currentUser?.rol || ""}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <button id="btn_menu_inicio" style="height:46px;">Inicio</button>
          <button id="btn_menu_usuarios" style="height:46px;">Usuarios</button>
          <button id="btn_menu_config" style="height:46px;">Configuración</button>
          <button id="btn_logout" style="height:46px;">Cerrar sesión</button>
        </div>

        <div>${content}</div>
      </div>
    </div>
  `;

  document.getElementById("btn_menu_inicio").onclick = renderInicio;
  document.getElementById("btn_menu_usuarios").onclick = renderUsuarios;
  document.getElementById("btn_menu_config").onclick = renderConfiguracion;
  document.getElementById("btn_logout").onclick = () => {
    clearSession();
    renderLogin();
  };
}

function renderLogin() {
  app.innerHTML = `
    <div style="max-width:400px;margin:60px auto;padding:20px;border:1px solid #ddd;border-radius:16px;font-family:Arial,sans-serif;background:#fff;">
      <h2 style="margin-top:0;">${state.company.nombre || "Zentryx"}</h2>

      <input id="user" placeholder="Usuario" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;box-sizing:border-box;">
      <input id="pass" type="password" placeholder="Contraseña" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;box-sizing:border-box;">

      <button id="login" style="width:100%;height:46px;">Entrar</button>

      <div id="msg" style="margin-top:12px;color:#c00;"></div>
    </div>
  `;

  document.getElementById("login").onclick = () => {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const msg = document.getElementById("msg");

    if (!user || !pass) {
      msg.innerText = "Escribe usuario y contraseña";
      return;
    }

    const found = state.users.find(
      (u) => u.usuario === user && u.password === pass && u.activo
    );

    if (!found) {
      msg.innerText = "Usuario o contraseña incorrectos";
      return;
    }

    setSession(found.usuario);
    renderInicio();
  };
}

function renderInicio() {
  const user = requireSession();
  if (!user) return;

  layout(
    "Panel principal",
    `
      <div style="display:grid;gap:12px;">
        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Resumen</h3>
          <div style="line-height:1.8;">
            Usuario activo: <b>${user.nombre}</b><br>
            Rol: <b>${user.rol}</b><br>
            Empresa: <b>${state.company.nombre || "Sin definir"}</b>
          </div>
        </div>

        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Estado del sistema</h3>
          <div style="line-height:1.8;">
            Usuarios cargados: <b>${state.users.length}</b><br>
            Sincronización real: <b>Pendiente de conexión</b><br>
            Base actual: <b>Temporal local</b><br>
            Preparado para nube / servidor propio: <b>Sí, en siguiente fase</b>
          </div>
        </div>
      </div>
    `
  );
}

function renderUsuarios() {
  const user = requireSession();
  if (!user) return;

  const rows = state.users
    .map((u) => {
      return `
        <div style="padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:10px;">
          <div style="font-weight:700;">${u.nombre}</div>
          <div style="font-size:14px;color:#555;line-height:1.7;">
            Usuario: ${u.usuario}<br>
            Rol: ${u.rol}<br>
            Teléfono: ${u.telefono || "-"}<br>
            Email: ${u.email || "-"}<br>
            Estado: ${u.activo ? "Activo" : "Inactivo"}
          </div>
          <div style="margin-top:10px;">
            <button onclick="editUser(${u.id})" style="height:40px;">Abrir ficha</button>
          </div>
        </div>
      `;
    })
    .join("");

  layout(
    "Usuarios",
    `
      <div style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Alta rápida de usuario</h3>

          <input id="new_nombre" placeholder="Nombre completo" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="new_usuario" placeholder="Usuario" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="new_password" placeholder="Contraseña" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="new_rol" placeholder="Rol" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="new_telefono" placeholder="Teléfono" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="new_email" placeholder="Email" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">

          <button id="btn_add_user" style="height:44px;width:100%;">Guardar usuario</button>
          <div id="msg_user" style="margin-top:10px;color:#c00;"></div>
        </div>

        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Listado de usuarios</h3>
          ${rows || "<div>No hay usuarios</div>"}
        </div>
      </div>
    `
  );

  document.getElementById("btn_add_user").onclick = () => {
    const nombre = document.getElementById("new_nombre").value.trim();
    const usuario = document.getElementById("new_usuario").value.trim();
    const password = document.getElementById("new_password").value.trim();
    const rol = document.getElementById("new_rol").value.trim() || "Usuario";
    const telefono = document.getElementById("new_telefono").value.trim();
    const email = document.getElementById("new_email").value.trim();
    const msg = document.getElementById("msg_user");

    if (!nombre || !usuario || !password) {
      msg.innerText = "Nombre, usuario y contraseña son obligatorios";
      return;
    }

    if (state.users.some((u) => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      msg.innerText = "Ese usuario ya existe";
      return;
    }

    const newUser = {
      id: Date.now(),
      usuario,
      password,
      nombre,
      rol,
      telefono,
      email,
      activo: true,
      permisos: {
        inicio: true,
        usuarios: false,
        configuracion: false
      },
      notas: ""
    };

    state.users.push(newUser);
    saveLocalState();
    renderUsuarios();
  };
}

function renderUserDetail(userId) {
  const currentUser = requireSession();
  if (!currentUser) return;

  const u = state.users.find((item) => item.id === userId);
  if (!u) {
    renderUsuarios();
    return;
  }

  layout(
    "Ficha de usuario",
    `
      <div style="display:grid;gap:12px;">
        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Datos del usuario</h3>

          <input id="edit_nombre" value="${escapeHtml(u.nombre)}" placeholder="Nombre" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="edit_usuario" value="${escapeHtml(u.usuario)}" placeholder="Usuario" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="edit_password" value="${escapeHtml(u.password)}" placeholder="Contraseña" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="edit_rol" value="${escapeHtml(u.rol)}" placeholder="Rol" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="edit_telefono" value="${escapeHtml(u.telefono || "")}" placeholder="Teléfono" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="edit_email" value="${escapeHtml(u.email || "")}" placeholder="Email" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">

          <label style="display:block;margin:10px 0;">
            <input id="edit_activo" type="checkbox" ${u.activo ? "checked" : ""}>
            Usuario activo
          </label>

          <div style="margin:12px 0 6px 0;font-weight:700;">Permisos</div>
          <label style="display:block;margin:6px 0;"><input id="perm_inicio" type="checkbox" ${u.permisos?.inicio ? "checked" : ""}> Inicio</label>
          <label style="display:block;margin:6px 0;"><input id="perm_usuarios" type="checkbox" ${u.permisos?.usuarios ? "checked" : ""}> Usuarios</label>
          <label style="display:block;margin:6px 0;"><input id="perm_configuracion" type="checkbox" ${u.permisos?.configuracion ? "checked" : ""}> Configuración</label>

          <textarea id="edit_notas" placeholder="Notas" style="width:100%;min-height:90px;margin-top:10px;padding:10px;box-sizing:border-box;">${escapeHtml(u.notas || "")}</textarea>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
            <button id="btn_save_user" style="height:44px;">Guardar cambios</button>
            <button id="btn_back_users" style="height:44px;">Volver</button>
          </div>

          <div id="msg_edit_user" style="margin-top:10px;color:#c00;"></div>
        </div>
      </div>
    `
  );

  document.getElementById("btn_save_user").onclick = () => {
    const nombre = document.getElementById("edit_nombre").value.trim();
    const usuario = document.getElementById("edit_usuario").value.trim();
    const password = document.getElementById("edit_password").value.trim();
    const rol = document.getElementById("edit_rol").value.trim();
    const telefono = document.getElementById("edit_telefono").value.trim();
    const email = document.getElementById("edit_email").value.trim();
    const activo = document.getElementById("edit_activo").checked;
    const notas = document.getElementById("edit_notas").value.trim();
    const msg = document.getElementById("msg_edit_user");

    if (!nombre || !usuario || !password) {
      msg.innerText = "Nombre, usuario y contraseña son obligatorios";
      return;
    }

    const duplicated = state.users.find(
      (item) => item.id !== u.id && item.usuario.toLowerCase() === usuario.toLowerCase()
    );

    if (duplicated) {
      msg.innerText = "Ya existe otro usuario con ese nombre de acceso";
      return;
    }

    u.nombre = nombre;
    u.usuario = usuario;
    u.password = password;
    u.rol = rol || "Usuario";
    u.telefono = telefono;
    u.email = email;
    u.activo = activo;
    u.notas = notas;
    u.permisos = {
      inicio: document.getElementById("perm_inicio").checked,
      usuarios: document.getElementById("perm_usuarios").checked,
      configuracion: document.getElementById("perm_configuracion").checked
    };

    saveLocalState();

    const session = getSession();
    const originalSessionUser = currentUser.usuario;
    if (session === originalSessionUser && originalSessionUser !== u.usuario) {
      setSession(u.usuario);
    }

    renderUserDetail(u.id);
    const newMsg = document.getElementById("msg_edit_user");
    if (newMsg) newMsg.style.color = "#0a7a0a";
    if (newMsg) newMsg.innerText = "Cambios guardados correctamente";
  };

  document.getElementById("btn_back_users").onclick = renderUsuarios;
}

function renderConfiguracion() {
  const user = requireSession();
  if (!user) return;

  layout(
    "Configuración",
    `
      <div style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Datos de empresa</h3>

          <input id="cfg_nombre" value="${escapeHtml(state.company.nombre || "")}" placeholder="Nombre comercial" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="cfg_razon" value="${escapeHtml(state.company.razonSocial || "")}" placeholder="Razón social" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="cfg_cif" value="${escapeHtml(state.company.cif || "")}" placeholder="CIF / NIF" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="cfg_tel" value="${escapeHtml(state.company.telefono || "")}" placeholder="Teléfono" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="cfg_email" value="${escapeHtml(state.company.email || "")}" placeholder="Email" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">
          <input id="cfg_dir" value="${escapeHtml(state.company.direccion || "")}" placeholder="Dirección" style="width:100%;height:42px;margin-bottom:8px;padding:0 10px;box-sizing:border-box;">

          <button id="btn_save_config" style="height:44px;width:100%;">Guardar configuración</button>
          <div id="msg_config" style="margin-top:10px;color:#0a7a0a;"></div>
        </div>

        <div style="padding:14px;border:1px solid #ddd;border-radius:12px;">
          <h3 style="margin-top:0;">Estado técnico</h3>
          <div style="line-height:1.8;">
            Almacenamiento actual: <b>Temporal local</b><br>
            Sincronización multi-dispositivo: <b>Pendiente</b><br>
            Preparación para nube: <b>Sí</b><br>
            Preparación para servidor propio: <b>Sí</b>
          </div>
        </div>
      </div>
    `
  );

  document.getElementById("btn_save_config").onclick = () => {
    state.company.nombre = document.getElementById("cfg_nombre").value.trim();
    state.company.razonSocial = document.getElementById("cfg_razon").value.trim();
    state.company.cif = document.getElementById("cfg_cif").value.trim();
    state.company.telefono = document.getElementById("cfg_tel").value.trim();
    state.company.email = document.getElementById("cfg_email").value.trim();
    state.company.direccion = document.getElementById("cfg_dir").value.trim();

    saveLocalState();
    renderConfiguracion();

    const msg = document.getElementById("msg_config");
    if (msg) msg.innerText = "Configuración guardada correctamente";
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.editUser = renderUserDetail;

function init() {
  loadLocalState();

  const user = getSession();
  if (user) {
    renderInicio();
  } else {
    renderLogin();
  }
}

init();
