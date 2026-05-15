// ===============================
// ZENTRYX PRO - USUARIOS SUPABASE + FOTO
// V2670
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function foto(u){
  return u.foto_url
    ? `<img src="${limpiar(u.foto_url)}" style="width:82px;height:82px;border-radius:22px;object-fit:cover;margin-bottom:12px;">`
    : `<div style="width:82px;height:82px;border-radius:22px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:#64748b;margin-bottom:12px;">${limpiar((u.nombre || "?").charAt(0))}</div>`;
}

function pintarError(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Error</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button id="btn_volver_error" class="zx_btn_big zx_gris">Volver</button>
    </div>
  `;
  document.getElementById("btn_volver_error").onclick=()=>ZX_usuarios();
}

async function cargarUsuarios(){
  const cliente=sb();

  const {data,error}=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado,foto_url")
    .order("id",{ascending:true});

  if(error){
    pintarError(error.message);
    return [];
  }

  return data || [];
}

window.ZENTRYX_UI_usuarios=async function(){
  const usuarios=await cargarUsuarios();

  app().innerHTML=`
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
            ${foto(u)}
            <div class="zx_item_titulo">${limpiar(u.nombre || "-")}</div>

            <div class="zx_item_texto">
              <b>ID:</b> ${limpiar(u.id)}<br>
              <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
              <b>Teléfono:</b> ${u.telefono ? `<a href="tel:${limpiar(u.telefono)}">${limpiar(u.telefono)}</a>` : "-"}<br>
              <b>Email:</b> ${u.email ? `<a href="mailto:${limpiar(u.email)}">${limpiar(u.email)}</a>` : "-"}<br>
              <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
              <b>Estado:</b> ${limpiar(u.estado || "-")}
            </div>

            <button class="zx_btn_big zx_azul btn_editar_usuario" data-id="${limpiar(u.id)}">Editar</button>
            <button class="zx_btn_big zx_rojo btn_eliminar_usuario" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Eliminar</button>
          </div>
        `).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  document.getElementById("btn_crear_usuario").onclick=()=>ZX_USER_CREAR();

  document.querySelectorAll(".btn_editar_usuario").forEach(btn=>{
    btn.onclick=()=>ZX_USER_EDITAR(btn.getAttribute("data-id"));
  });

  document.querySelectorAll(".btn_eliminar_usuario").forEach(btn=>{
    btn.onclick=()=>ZX_USER_ELIMINAR(
      btn.getAttribute("data-id"),
      btn.getAttribute("data-nombre")
    );
  });
};

window.ZX_usuarios=function(){
  window.ZENTRYX_UI_usuarios();
};

window.ZX_USER_CREAR=function(){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Crear usuario</h2>

      <input id="u_foto" type="file" accept="image/*">
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

  document.getElementById("btn_guardar_usuario").onclick=()=>ZX_USER_GUARDAR();
  document.getElementById("btn_cancelar_usuario").onclick=()=>ZX_usuarios();
};

async function subirFoto(file,usuario){
  if(!file) return null;

  const cliente=sb();
  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const nombreArchivo=`usuarios/${usuario}_${Date.now()}.${ext}`;

  const {error}=await cliente.storage
    .from("zentryx-usuarios")
    .upload(nombreArchivo,file,{upsert:true});

  if(error){
    alert("Error subiendo foto: "+error.message);
    return null;
  }

  const {data}=cliente.storage
    .from("zentryx-usuarios")
    .getPublicUrl(nombreArchivo);

  return data.publicUrl;
}

window.ZX_USER_GUARDAR=async function(){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const {data:existente}=await cliente
    .from("usuarios")
    .select("id")
    .eq("usuario",usuario)
    .maybeSingle();

  if(existente){
    alert("Ese usuario ya existe.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const foto_url=await subirFoto(file,usuario);

  const {error}=await cliente
    .from("usuarios")
    .insert([{
      nombre,
      usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value,
      foto_url
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
    .select("id,nombre,usuario,telefono,email,rol,estado,foto_url")
    .eq("id",id)
    .maybeSingle();

  if(error || !data){
    pintarError(error ? error.message : "Usuario no encontrado.");
    return;
  }

  const u=data;

  app().innerHTML=`
    <div class="zx_card">
      <h2>Editar usuario</h2>

      ${foto(u)}
      <input id="u_foto" type="file" accept="image/*">

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

  document.getElementById("btn_actualizar_usuario").onclick=()=>ZX_USER_ACTUALIZAR(id,u.foto_url);
  document.getElementById("btn_volver_usuario").onclick=()=>ZX_usuarios();
};

window.ZX_USER_ACTUALIZAR=async function(id,fotoActual){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const nuevaFoto=await subirFoto(file,usuario);
  const foto_url=nuevaFoto || fotoActual || null;

  const {error}=await cliente
    .from("usuarios")
    .update({
      nombre,
      usuario,
      telefono:document.getElementById("u_telefono").value.trim(),
      email:document.getElementById("u_email").value.trim(),
      rol:document.getElementById("u_rol").value,
      estado:document.getElementById("u_estado").value,
      foto_url
    })
    .eq("id",id);

  if(error){
    alert("Error al actualizar: "+error.message);
    return;
  }

  ZX_usuarios();
};

window.ZX_USER_ELIMINAR=async function(id,nombre){
  if(!confirm("¿Eliminar usuario: "+nombre+"?\n\nEsta acción no se puede deshacer.")) return;

  const {error}=await sb()
    .from("usuarios")
    .delete()
    .eq("id",id);

  if(error){
    alert("Error al eliminar: "+error.message);
    return;
  }

  ZX_usuarios();
};

})();