// ===============================
// ZENTRYX PRO - MÓDULO USUARIOS
// V2646
// ===============================
(function(){
"use strict";

const ZX_VERSION="2646";

// ===============================
// HELPERS
// ===============================

function $(id){
  return document.getElementById(id);
}

function app(){
  return $("app");
}

function limpiarTexto(valor){
  return String(valor ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===============================
// STORE
// ===============================

function loadState(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_state")) || {usuarios:[]};
  }catch{
    return {usuarios:[]};
  }
}

function saveState(state){
  localStorage.setItem("zentryx_state",JSON.stringify(state));
}

// ===============================
// UI
// ===============================

function tarjetaUsuario(u){

  return `
    <div class="zx_hist_item">
      <div class="zx_hist_tipo">${limpiarTexto(u.nombre)}</div>
      <div class="zx_hist_fecha">${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</div>

      <button class="zx_btn zx_gris" onclick="ZX_eliminarUsuario('${u.usuario}')">
        Eliminar
      </button>
    </div>
  `;
}

function pintar(){

  const root=app();
  if(!root) return;

  const state=loadState();
  const lista=state.usuarios || [];

  root.innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>

      <input id="u_nombre" placeholder="Nombre" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;">
      <input id="u_usuario" placeholder="Usuario" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;">
      <input id="u_pass" placeholder="Contraseña" type="password" style="width:100%;height:44px;margin-bottom:10px;padding:0 12px;">

      <button id="crear_usuario" class="zx_btn zx_verde">
        Crear usuario
      </button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        lista.length
        ? lista.map(tarjetaUsuario).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  eventos();
}

// ===============================
// EVENTOS
// ===============================

function eventos(){

  $("crear_usuario").onclick=function(){

    const nombre=$("u_nombre").value.trim();
    const usuario=$("u_usuario").value.trim();
    const password=$("u_pass").value.trim();

    if(!nombre || !usuario || !password){
      alert("Completa todos los campos.");
      return;
    }

    const state=loadState();

    const existe=state.usuarios.some(u=>u.usuario===usuario);

    if(existe){
      alert("Usuario ya existe.");
      return;
    }

    state.usuarios.push({
      id:Date.now(),
      nombre:nombre,
      usuario:usuario,
      password:password,
      rol:"Usuario",
      activo:true
    });

    saveState(state);

    pintar();
  };
}

// ===============================
// ELIMINAR
// ===============================

window.ZX_eliminarUsuario=function(usuario){

  if(!confirm("Eliminar usuario?")) return;

  const state=loadState();

  state.usuarios=state.usuarios.filter(u=>u.usuario!==usuario);

  saveState(state);

  pintar();
};

// ===============================
// EXPORT
// ===============================

window.ZX_usuarios=pintar;
window.ZENTRYX_UI_usuarios=pintar;

if(window.ZENTRYX && window.ZENTRYX.registrarModulo){
  window.ZENTRYX.registrarModulo("usuarios",{
    nombre:"Usuarios",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("Usuarios cargado V"+ZX_VERSION);

})();