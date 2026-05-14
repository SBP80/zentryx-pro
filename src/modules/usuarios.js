// ===============================
// ZENTRYX PRO - USUARIOS SUPABASE
// V2666
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function error(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Error</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button class="zx_btn_big zx_gris" onclick="ZX_usuarios()">Volver</button>
    </div>
  `;
}

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    error("Supabase no conectado.");
    return [];
  }

  const res=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado")
    .order("id",{ascending:true});

  if(res.error){
    error(res.error.message);
    return [];
  }

  return res.data || [];
}

window.ZENTRYX_UI_usuarios=async function(){
  const usuarios=await cargarUsuarios();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Gestión completa de usuarios.</div>
      <button class="zx_btn_big zx_verde" onclick="ZX_USER_CREAR()">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        usuarios.length
        ? usuarios.map(u=>`
          <div class="zx_item">
            <div class="zx_item_titulo">${limpiar(u.nombre || "-")}</div>

            <div class="zx_item_texto">
              <b>ID:</b> ${limpiar(u.id)}<br>
              <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
              <b>Teléfono:</b> ${u.telefono ? `<a href="tel:${limpiar(u.telefono)}">${limpiar(u.telefono)}</a>` : "-"}<br>
              <b>Email:</b> ${u.email ? `<a href="mailto:${limpiar(u.email)}">${limpiar(u.email)}</a>` : "-"}<br>
              <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
              <b>Estado:</b> ${limpiar(u.estado || "-")}
            </div>

            <button class="zx_btn_big zx_azul" onclick="ZX_USER_EDITAR(${u.id})">Editar</button>
          </div>
        `).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
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

      <button class="zx_btn_big zx_verde" onclick="ZX_USER_GUARDAR()">Guardar</button>
      <button class="zx_btn_big zx_gris" onclick="ZX_usuarios()">Cancelar</button>
    </div>
  `;
};

window.ZX_USER_GUARDAR=async function(){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const res=await cliente
    .from("usuarios")
    .insert([{
      nombre,
      usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value
    }]);

  if(res.error){
    alert("Error al guardar: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

window.ZX_USER_EDITAR=async function(id){
  const cliente=sb();

  const res=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado")
    .eq("id",id)
    .maybeSingle();

  if(res.error){
    error("Error cargando usuario: "+res.error.message);
    return;
  }

  if(!res.data){
    error("Usuario no encontrado.");
    return;
  }

  const u=res.data;

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

      <button class="zx_btn_big zx_azul" onclick="ZX_USER_ACTUALIZAR(${u.id})">Guardar cambios</button>
      <button class="zx_btn_big zx_gris" onclick="ZX_usuarios()">Volver</button>
    </div>
  `;
};

window.ZX_USER_ACTUALIZAR=async function(id){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const res=await cliente
    .from("usuarios")
    .update({
      nombre,
      usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value
    })
    .eq("id",id);

  if(res.error){
    alert("Error al actualizar: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

})();