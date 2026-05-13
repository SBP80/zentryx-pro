// ===============================
// ZENTRYX PRO - USUARIOS (SUPABASE)
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

// ===============================
// GET USUARIOS
// ===============================
async function getUsuarios(){
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id",{ascending:true});

  if(error){
    console.error(error);
    return [];
  }

  return data;
}

// ===============================
// RENDER
// ===============================
async function render(){

  const usuarios = await getUsuarios();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">
        Gestión completa de usuarios.
      </div>

      <button class="zx_btn zx_verde" onclick="ZX_crearUsuario()">
        Crear usuario
      </button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>

      ${usuarios.map(u=>`
        <div class="zx_card" style="border:1px solid #e5e7eb">

          <h3 style="margin-bottom:10px">${u.nombre}</h3>

          <div class="zx_text">
            <b>Usuario:</b> ${u.usuario}<br>
            <b>Teléfono:</b> ${u.telefono || "-"}<br>
            <b>Email:</b> ${u.email || "-"}<br>
            <b>Rol:</b> ${u.rol}<br>
            <b>Estado:</b> ${u.estado}
          </div>

          <button class="zx_btn zx_azul" onclick="ZX_editarUsuario(${u.id})">
            Editar
          </button>

        </div>
      `).join("")}

    </div>
  `;
}

// ===============================
// CREAR
// ===============================
window.ZX_crearUsuario=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h2>Crear usuario</h2>

      <input id="nombre" placeholder="Nombre" class="zx_input">
      <input id="usuario" placeholder="Usuario" class="zx_input">
      <input id="telefono" placeholder="Teléfono" class="zx_input">
      <input id="email" placeholder="Email" class="zx_input">

      <select id="rol" class="zx_input">
        <option>Administrador</option>
        <option>Encargado</option>
        <option>Operario</option>
        <option>Administrativo</option>
      </select>

      <select id="estado" class="zx_input">
        <option>Activo</option>
        <option>Inactivo</option>
      </select>

      <button class="zx_btn zx_verde" onclick="guardarNuevo()">
        Guardar
      </button>

      <button class="zx_btn" onclick="ZX_usuarios()">
        Volver
      </button>
    </div>
  `;
};

window.guardarNuevo=async function(){

  const nombre=document.getElementById("nombre").value.trim();
  const usuario=document.getElementById("usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario obligatorios");
    return;
  }

  const { error } = await supabase
    .from("usuarios")
    .insert([{
      nombre,
      usuario,
      telefono:document.getElementById("telefono").value,
      email:document.getElementById("email").value,
      rol:document.getElementById("rol").value,
      estado:document.getElementById("estado").value
    }]);

  if(error){
    alert("Error al guardar");
    console.error(error);
    return;
  }

  ZX_usuarios();
};

// ===============================
// EDITAR
// ===============================
window.ZX_editarUsuario=async function(id){

  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id",id)
    .single();

  const u=data;

  app().innerHTML=`
    <div class="zx_card">
      <h2>Editar usuario</h2>

      <input id="nombre" value="${u.nombre}" class="zx_input">
      <input id="usuario" value="${u.usuario}" class="zx_input">
      <input id="telefono" value="${u.telefono}" class="zx_input">
      <input id="email" value="${u.email}" class="zx_input">

      <select id="rol" class="zx_input">
        <option ${u.rol==="Administrador"?"selected":""}>Administrador</option>
        <option ${u.rol==="Encargado"?"selected":""}>Encargado</option>
        <option ${u.rol==="Operario"?"selected":""}>Operario</option>
        <option ${u.rol==="Administrativo"?"selected":""}>Administrativo</option>
      </select>

      <select id="estado" class="zx_input">
        <option ${u.estado==="Activo"?"selected":""}>Activo</option>
        <option ${u.estado==="Inactivo"?"selected":""}>Inactivo</option>
      </select>

      <button class="zx_btn zx_azul" onclick="guardarEdit(${id})">
        Guardar cambios
      </button>

      <button class="zx_btn" onclick="ZX_usuarios()">
        Volver
      </button>
    </div>
  `;
};

window.guardarEdit=async function(id){

  const { error } = await supabase
    .from("usuarios")
    .update({
      nombre:document.getElementById("nombre").value,
      usuario:document.getElementById("usuario").value,
      telefono:document.getElementById("telefono").value,
      email:document.getElementById("email").value,
      rol:document.getElementById("rol").value,
      estado:document.getElementById("estado").value
    })
    .eq("id",id);

  if(error){
    alert("Error al actualizar");
    console.error(error);
    return;
  }

  ZX_usuarios();
};

// ===============================
window.ZENTRYX_UI_usuarios=render;

})();