// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V2660
// ===============================
(function(){
"use strict";

const KEY="zentryx_usuarios";

function app(){
  return document.getElementById("app");
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// ===============================
// DATA
// ===============================
function getUsuarios(){
  try{
    return JSON.parse(localStorage.getItem(KEY)) || [];
  }catch{
    return [];
  }
}

function setUsuarios(data){
  localStorage.setItem(KEY, JSON.stringify(data));
}

// ===============================
// UI LISTADO
// ===============================
function render(){

  let lista=getUsuarios();

  // Si no hay admin lo crea
  if(lista.length===0){
    lista.push({
      id:Date.now(),
      nombre:"Administrador",
      usuario:"admin",
      telefono:"",
      email:"",
      rol:"Administrador",
      estado:"Activo"
    });
    setUsuarios(lista);
  }

  let html=`
  <div class="zx_card">
    <h2>Usuarios</h2>
    <div class="zx_text">Gestión completa de usuarios</div>

    <button class="zx_btn zx_verde" onclick="ZX_USER_CREAR()">Crear usuario</button>
  </div>

  <div class="zx_card">
    <h2>Listado</h2>
  `;

  lista.forEach(u=>{
    html+=`
      <div class="zx_card" style="margin-top:12px">
        <h2>${limpiar(u.nombre)}</h2>

        <div class="zx_text">
          Usuario: ${limpiar(u.usuario)}<br>
          Teléfono: ${limpiar(u.telefono)}<br>
          Email: ${limpiar(u.email)}<br>
          Rol: ${limpiar(u.rol)}<br>
          Estado: ${limpiar(u.estado)}
        </div>

        <button class="zx_btn zx_azul" onclick="ZX_USER_EDIT(${u.id})">Editar</button>
      </div>
    `;
  });

  html+=`</div>`;

  app().innerHTML=html;
}

// ===============================
// FORM CREAR
// ===============================
window.ZX_USER_CREAR=function(){

  app().innerHTML=`
  <div class="zx_card">
    <h2>Nuevo usuario</h2>

    <input id="u_nombre" placeholder="Nombre" class="zx_input"><br><br>
    <input id="u_usuario" placeholder="Usuario" class="zx_input"><br><br>
    <input id="u_tel" placeholder="Teléfono" class="zx_input"><br><br>
    <input id="u_email" placeholder="Email" class="zx_input"><br><br>

    <select id="u_rol" class="zx_input">
      <option>Administrador</option>
      <option>Encargado</option>
      <option>Operario</option>
      <option>Oficina</option>
    </select><br><br>

    <select id="u_estado" class="zx_input">
      <option>Activo</option>
      <option>Inactivo</option>
    </select><br><br>

    <button class="zx_btn zx_verde" onclick="ZX_USER_GUARD()">Guardar</button>
    <button class="zx_btn zx_gris" onclick="ZX_usuarios()">Cancelar</button>
  </div>
  `;
};

// ===============================
// GUARDAR
// ===============================
window.ZX_USER_GUARD=function(){

  const data=getUsuarios();

  data.push({
    id:Date.now(),
    nombre:document.getElementById("u_nombre").value,
    usuario:document.getElementById("u_usuario").value,
    telefono:document.getElementById("u_tel").value,
    email:document.getElementById("u_email").value,
    rol:document.getElementById("u_rol").value,
    estado:document.getElementById("u_estado").value
  });

  setUsuarios(data);

  ZX_usuarios();
};

// ===============================
// EDITAR
// ===============================
window.ZX_USER_EDIT=function(id){

  const data=getUsuarios();
  const u=data.find(x=>x.id===id);

  app().innerHTML=`
  <div class="zx_card">
    <h2>Editar usuario</h2>

    <input id="u_nombre" value="${limpiar(u.nombre)}" class="zx_input"><br><br>
    <input id="u_usuario" value="${limpiar(u.usuario)}" class="zx_input"><br><br>
    <input id="u_tel" value="${limpiar(u.telefono)}" class="zx_input"><br><br>
    <input id="u_email" value="${limpiar(u.email)}" class="zx_input"><br><br>

    <button class="zx_btn zx_azul" onclick="ZX_USER_UPDATE(${id})">Guardar cambios</button>
    <button class="zx_btn zx_gris" onclick="ZX_usuarios()">Volver</button>
  </div>
  `;
};

// ===============================
// UPDATE
// ===============================
window.ZX_USER_UPDATE=function(id){

  let data=getUsuarios();

  data=data.map(u=>{
    if(u.id===id){
      u.nombre=document.getElementById("u_nombre").value;
      u.usuario=document.getElementById("u_usuario").value;
      u.telefono=document.getElementById("u_tel").value;
      u.email=document.getElementById("u_email").value;
    }
    return u;
  });

  setUsuarios(data);

  ZX_usuarios();
};

// ===============================
window.ZENTRYX_UI_usuarios=render;

})();