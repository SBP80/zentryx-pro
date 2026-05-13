// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V2654
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function estadoBase(){
  return {
    empresa:{id:"demo",nombre:"Zentryx"},
    usuarios:[
      {
        id:1,
        usuario:"admin",
        password:"1234",
        nombre:"Administrador",
        rol:"Administrador",
        telefono:"",
        email:"",
        direccion:"",
        activo:true
      }
    ]
  };
}

function cargarEstado(){
  try{
    const raw=localStorage.getItem("zentryx_state");
    if(!raw){
      const base=estadoBase();
      localStorage.setItem("zentryx_state",JSON.stringify(base));
      return base;
    }

    const state=JSON.parse(raw);

    if(!Array.isArray(state.usuarios)){
      state.usuarios=estadoBase().usuarios;
    }

    return state;
  }catch{
    const base=estadoBase();
    localStorage.setItem("zentryx_state",JSON.stringify(base));
    return base;
  }
}

function guardarEstado(state){
  localStorage.setItem("zentryx_state",JSON.stringify(state));
}

function usuarioActual(){
  try{
    const s=JSON.parse(localStorage.getItem("zentryx_session")||"{}");
    return s.usuario || "admin";
  }catch{
    return "admin";
  }
}

function esAdmin(){
  try{
    const s=JSON.parse(localStorage.getItem("zentryx_session")||"{}");
    return s.rol==="Administrador";
  }catch{
    return false;
  }
}

function tarjeta(u){
  return `
    <div class="zx_card">
      <h2>${limpiar(u.nombre || "-")}</h2>

      <div class="zx_text">
        <b>Usuario:</b> ${limpiar(u.usuario)}<br>
        <b>Rol:</b> ${limpiar(u.rol)}<br>
        <b>Estado:</b> ${u.activo===false ? "Inactivo" : "Activo"}<br>
        ${u.telefono ? `<b>Teléfono:</b> <a href="tel:${limpiar(u.telefono)}">${limpiar(u.telefono)}</a><br>` : ""}
        ${u.email ? `<b>Email:</b> <a href="mailto:${limpiar(u.email)}">${limpiar(u.email)}</a><br>` : ""}
        ${u.direccion ? `<b>Dirección:</b> ${limpiar(u.direccion)}<br>` : ""}
      </div>

      <button class="zx_btn_big azul" onclick="ZX_editarUsuario('${u.id}')">
        Editar
      </button>

      ${
        u.usuario!=="admin"
        ? `<button class="zx_btn_big rojo" onclick="ZX_eliminarUsuario('${u.id}')">Eliminar</button>`
        : ""
      }
    </div>
  `;
}

window.ZX_usuarios=function(){
  const root=app();
  const state=cargarEstado();
  const usuarios=state.usuarios || [];

  if(!root) return;

  root.innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">
        Gestión de usuarios, roles y datos principales.
      </div>

      ${
        esAdmin()
        ? `<button class="zx_btn_big verde" onclick="ZX_nuevoUsuario()">Crear usuario</button>`
        : `<div class="zx_text">Solo el administrador puede crear usuarios.</div>`
      }
    </div>

    ${usuarios.map(tarjeta).join("")}
  `;
};

window.ZX_nuevoUsuario=function(){
  if(!esAdmin()){
    alert("Sin permiso.");
    return;
  }

  const nombre=prompt("Nombre completo:");
  if(!nombre) return;

  const usuario=prompt("Usuario:");
  if(!usuario) return;

  const password=prompt("Contraseña:");
  if(!password) return;

  const rol=prompt("Rol: Administrador, Encargado o Usuario","Usuario") || "Usuario";
  const telefono=prompt("Teléfono:","") || "";
  const email=prompt("Email:","") || "";
  const direccion=prompt("Dirección:","") || "";

  const state=cargarEstado();

  if(state.usuarios.some(u=>u.usuario===usuario)){
    alert("Ese usuario ya existe.");
    return;
  }

  state.usuarios.push({
    id:Date.now(),
    usuario,
    password,
    nombre,
    rol,
    telefono,
    email,
    direccion,
    activo:true
  });

  guardarEstado(state);
  ZX_usuarios();
};

window.ZX_editarUsuario=function(id){
  const state=cargarEstado();
  const u=state.usuarios.find(x=>String(x.id)===String(id));

  if(!u){
    alert("Usuario no encontrado.");
    return;
  }

  const soyYo=u.usuario===usuarioActual();

  if(!esAdmin() && !soyYo){
    alert("Sin permiso.");
    return;
  }

  u.nombre=prompt("Nombre:",u.nombre || "") || u.nombre;
  u.telefono=prompt("Teléfono:",u.telefono || "") || "";
  u.email=prompt("Email:",u.email || "") || "";
  u.direccion=prompt("Dirección:",u.direccion || "") || "";

  if(esAdmin()){
    u.rol=prompt("Rol:",u.rol || "Usuario") || u.rol;
    const activo=confirm("¿Usuario activo?");
    u.activo=activo;
  }

  guardarEstado(state);
  ZX_usuarios();
};

window.ZX_eliminarUsuario=function(id){
  if(!esAdmin()){
    alert("Sin permiso.");
    return;
  }

  const state=cargarEstado();
  const u=state.usuarios.find(x=>String(x.id)===String(id));

  if(!u || u.usuario==="admin"){
    alert("No se puede eliminar este usuario.");
    return;
  }

  if(!confirm("Eliminar usuario?")) return;

  state.usuarios=state.usuarios.filter(x=>String(x.id)!==String(id));
  guardarEstado(state);
  ZX_usuarios();
};

})();