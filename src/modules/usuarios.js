// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V2662
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

const KEY="zentryx_usuarios";

function usuariosBase(){
  return [
    {
      id:1,
      nombre:"Administrador",
      usuario:"admin",
      telefono:"",
      email:"",
      rol:"Administrador",
      estado:"Activo"
    }
  ];
}

function getUsuarios(){
  try{
    const data=JSON.parse(localStorage.getItem(KEY));
    if(Array.isArray(data) && data.length) return data;
  }catch(e){}

  const base=usuariosBase();
  localStorage.setItem(KEY,JSON.stringify(base));
  return base;
}

function setUsuarios(data){
  localStorage.setItem(KEY,JSON.stringify(data));
}

window.ZENTRYX_UI_usuarios=function(){
  const root=app();
  if(!root) return;

  const lista=getUsuarios();

  root.innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Gestión completa de usuarios.</div>
      <button class="zx_btn_big zx_verde" type="button" onclick="ZX_USER_CREAR()">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        lista.map(u=>`
          <div class="zx_item">
            <div class="zx_item_titulo">${limpiar(u.nombre)}</div>
            <div class="zx_item_texto">
              <b>Usuario:</b> ${limpiar(u.usuario)}<br>
              <b>Teléfono:</b> ${u.telefono ? `<a href="tel:${limpiar(u.telefono)}">${limpiar(u.telefono)}</a>` : "-"}<br>
              <b>Email:</b> ${u.email ? `<a href="mailto:${limpiar(u.email)}">${limpiar(u.email)}</a>` : "-"}<br>
              <b>Rol:</b> ${limpiar(u.rol)}<br>
              <b>Estado:</b> ${limpiar(u.estado)}
            </div>

            <button class="zx_btn_big zx_azul" type="button" onclick="ZX_USER_EDITAR(${u.id})">Editar</button>
          </div>
        `).join("")
      }
    </div>
  `;
};

window.ZX_usuarios=function(){
  window.ZENTRYX_UI_usuarios();
};

window.ZX_USER_CREAR=function(){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Crear usuario</h2>

      <input id="u_nombre" placeholder="Nombre completo">
      <input id="u_usuario" placeholder="Usuario">
      <input id="u_telefono" placeholder="Teléfono">
      <input id="u_email" placeholder="Email">

      <select id="u_rol">
        <option>Administrador</option>
        <option>Encargado</option>
        <option>Operario</option>
        <option>Oficina</option>
      </select>

      <select id="u_estado">
        <option>Activo</option>
        <option>Inactivo</option>
      </select>

      <button class="zx_btn_big zx_verde" type="button" onclick="ZX_USER_GUARDAR()">Guardar</button>
      <button class="zx_btn_big zx_gris" type="button" onclick="ZX_usuarios()">Cancelar</button>
    </div>
  `;
};

window.ZX_USER_GUARDAR=function(){
  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const lista=getUsuarios();

  if(lista.some(u=>u.usuario===usuario)){
    alert("Ese usuario ya existe.");
    return;
  }

  lista.push({
    id:Date.now(),
    nombre,
    usuario,
    telefono:document.getElementById("u_telefono").value.trim(),
    email:document.getElementById("u_email").value.trim(),
    rol:document.getElementById("u_rol").value,
    estado:document.getElementById("u_estado").value
  });

  setUsuarios(lista);
  ZX_usuarios();
};

window.ZX_USER_EDITAR=function(id){
  const lista=getUsuarios();
  const u=lista.find(x=>x.id===id);

  if(!u){
    alert("Usuario no encontrado.");
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>Editar usuario</h2>

      <input id="u_nombre" value="${limpiar(u.nombre)}" placeholder="Nombre completo">
      <input id="u_usuario" value="${limpiar(u.usuario)}" placeholder="Usuario">
      <input id="u_telefono" value="${limpiar(u.telefono)}" placeholder="Teléfono">
      <input id="u_email" value="${limpiar(u.email)}" placeholder="Email">

      <select id="u_rol">
        <option ${u.rol==="Administrador" ? "selected" : ""}>Administrador</option>
        <option ${u.rol==="Encargado" ? "selected" : ""}>Encargado</option>
        <option ${u.rol==="Operario" ? "selected" : ""}>Operario</option>
        <option ${u.rol==="Oficina" ? "selected" : ""}>Oficina</option>
      </select>

      <select id="u_estado">
        <option ${u.estado==="Activo" ? "selected" : ""}>Activo</option>
        <option ${u.estado==="Inactivo" ? "selected" : ""}>Inactivo</option>
      </select>

      <button class="zx_btn_big zx_azul" type="button" onclick="ZX_USER_ACTUALIZAR(${id})">Guardar cambios</button>
      <button class="zx_btn_big zx_gris" type="button" onclick="ZX_usuarios()">Volver</button>
    </div>
  `;
};

window.ZX_USER_ACTUALIZAR=function(id){
  const lista=getUsuarios();

  const nuevo=lista.map(u=>{
    if(u.id===id){
      return {
        ...u,
        nombre:document.getElementById("u_nombre").value.trim(),
        usuario:document.getElementById("u_usuario").value.trim(),
        telefono:document.getElementById("u_telefono").value.trim(),
        email:document.getElementById("u_email").value.trim(),
        rol:document.getElementById("u_rol").value,
        estado:document.getElementById("u_estado").value
      };
    }
    return u;
  });

  setUsuarios(nuevo);
  ZX_usuarios();
};

})();