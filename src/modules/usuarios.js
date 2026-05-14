// ===============================
// ZENTRYX PRO - USUARIOS SUPABASE
// V2667
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

function pintarError(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Error</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button id="btn_volver_error" class="zx_btn_big zx_gris">Volver</button>
    </div>
  `;

  document.getElementById("btn_volver_error").onclick=function(){
    ZX_usuarios();
  };
}

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    pintarError("Supabase no conectado.");
    return [];
  }

  const {data,error}=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado")
    .order("id",{ascending:true});

  if(error){
    pintarError(error.message);
    return [];
  }

  return data || [];
}

window.ZENTRYX_UI_usuarios=async function(){
  const root=app();
  if(!root) return;

  root.innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Cargando usuarios...</div>
    </div>
  `;

  const usuarios=await cargarUsuarios();

  root.innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Gestión completa de usuarios.</div>
      <button id="btn_crear_usuario" class="zx_btn_big zx_verde">Crear usuario</button>
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

            <button class="zx_btn_big zx_azul btn_editar_usuario" data-id="${limpiar(u.id)}">
              Editar
            </button>
          </div>
        `).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  document.getElementById("btn_crear_usuario").onclick=function(){
    ZX_USER_CREAR();
  };

  document.querySelectorAll(".btn_editar_usuario").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.getAttribute("data-id");
      ZX_USER_EDITAR(id);
    };
  });
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

      <button id="btn_guardar_usuario" class="zx_btn_big zx_verde">Guardar</button>
      <button id="btn_cancelar_usuario" class="zx_btn_big zx_gris">Cancelar</button>
    </div>
  `;

  document.getElementById("btn_guardar_usuario").onclick=function(){
    ZX_USER_GUARDAR();
  };

  document.getElementById("btn_cancelar_usuario").onclick=function(){
    ZX_usuarios();
  };
};

window.ZX_USER_GUARDAR=async function(){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const {error}=await cliente
    .from("usuarios")
    .insert([{
      nombre:nombre,
      usuario:usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value
    }]);

  if(error){
    alert("Error al guardar: "+error.message);
    return;
  }

  ZX_usuarios();
};

window.ZX_USER_EDITAR=async function(id){
  const cliente=sb();

  const {data,error}=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado")
    .eq("id",id)
    .maybeSingle();

  if(error){
    pintarError("Error cargando usuario: "+error.message);
    return;
  }

  if(!data){
    pintarError("Usuario no encontrado.");
    return;
  }

  const u=data;

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

      <button id="btn_actualizar_usuario" class="zx_btn_big zx_azul">Guardar cambios</button>
      <button id="btn_volver_usuario" class="zx_btn_big zx_gris">Volver</button>
    </div>
  `;

  document.getElementById("btn_actualizar_usuario").onclick=function(){
    ZX_USER_ACTUALIZAR(id);
  };

  document.getElementById("btn_volver_usuario").onclick=function(){
    ZX_usuarios();
  };
};

window.ZX_USER_ACTUALIZAR=async function(id){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const {error}=await cliente
    .from("usuarios")
    .update({
      nombre:nombre,
      usuario:usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value
    })
    .eq("id",id);

  if(error){
    alert("Error al actualizar: "+error.message);
    return;
  }

  ZX_usuarios();
};

})();