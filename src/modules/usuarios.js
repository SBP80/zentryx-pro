// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V2673
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function direccionCompleta(u){
  return [u.direccion,u.poblacion,u.provincia,u.codigo_postal]
    .filter(Boolean)
    .join(", ");
}

function pintarError(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Error</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button class="zx_btn_big zx_gris" id="btn_error_volver">Volver</button>
    </div>
  `;
  document.getElementById("btn_error_volver").onclick=function(){ZX_usuarios()};
}

function avatar(u){
  if(u.foto_url){
    return `<img src="${limpiar(u.foto_url)}" style="width:84px;height:84px;border-radius:22px;object-fit:cover;margin-bottom:12px;">`;
  }

  return `<div style="width:84px;height:84px;border-radius:22px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:#64748b;margin-bottom:12px;">${limpiar((u.nombre||"?").charAt(0))}</div>`;
}

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    pintarError("Supabase no conectado.");
    return [];
  }

  const res=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado,foto_url,dni,direccion,poblacion,provincia,codigo_postal")
    .order("id",{ascending:true});

  if(res.error){
    pintarError(res.error.message);
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
      <button class="zx_btn_big zx_verde" id="btn_crear_usuario">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        usuarios.length
        ? usuarios.map(u=>{
          const direccion=direccionCompleta(u);
          return `
            <div class="zx_item">
              ${avatar(u)}

              <div class="zx_item_titulo">${limpiar(u.nombre || "-")}</div>

              <div class="zx_item_texto">
                <b>ID:</b> ${limpiar(u.id)}<br>
                <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
                <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
                <b>Teléfono:</b> ${limpiar(u.telefono || "-")}<br>
                <b>Email:</b> ${u.email ? `<a href="mailto:${limpiar(u.email)}">${limpiar(u.email)}</a>` : "-"}<br>
                <b>Dirección:</b> ${limpiar(direccion || "-")}<br>
                <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
                <b>Estado:</b> ${limpiar(u.estado || "-")}
              </div>

              ${u.telefono ? `<button class="zx_btn_big zx_gris btn_tel" data-tel="${limpiar(u.telefono)}">Teléfono</button>` : ""}
              ${direccion ? `<button class="zx_btn_big zx_gris btn_mapa" data-dir="${limpiar(direccion)}">Abrir mapa</button>` : ""}

              <button class="zx_btn_big zx_azul btn_editar" data-id="${limpiar(u.id)}">Editar</button>
              <button class="zx_btn_big zx_rojo btn_eliminar" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Eliminar</button>
            </div>
          `;
        }).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  document.getElementById("btn_crear_usuario").onclick=function(){ZX_USER_CREAR()};

  document.querySelectorAll(".btn_editar").forEach(function(btn){
    btn.onclick=function(){ZX_USER_EDITAR(btn.dataset.id)};
  });

  document.querySelectorAll(".btn_eliminar").forEach(function(btn){
    btn.onclick=function(){ZX_USER_ELIMINAR(btn.dataset.id,btn.dataset.nombre)};
  });

  document.querySelectorAll(".btn_tel").forEach(function(btn){
    btn.onclick=function(){ZX_MENU_TELEFONO(btn.dataset.tel)};
  });

  document.querySelectorAll(".btn_mapa").forEach(function(btn){
    btn.onclick=function(){ZX_MENU_MAPA(btn.dataset.dir)};
  });
};

window.ZX_usuarios=function(){
  window.ZENTRYX_UI_usuarios();
};

window.ZX_MENU_TELEFONO=function(tel){
  const numero=String(tel || "").replace(/\s+/g,"");
  const opcion=prompt("1 - Llamar\n2 - SMS\n3 - WhatsApp");

  if(opcion==="1") location.href="tel:"+numero;
  if(opcion==="2") location.href="sms:"+numero;
  if(opcion==="3") window.open("https://wa.me/"+numero,"_blank");
};

window.ZX_MENU_MAPA=function(dir){
  const q=encodeURIComponent(dir);
  const opcion=prompt("1 - Apple Maps\n2 - Google Maps\n3 - Waze");

  if(opcion==="1") window.open("https://maps.apple.com/?q="+q,"_blank");
  if(opcion==="2") window.open("https://www.google.com/maps/search/?api=1&query="+q,"_blank");
  if(opcion==="3") window.open("https://waze.com/ul?q="+q,"_blank");
};

function formulario(u){
  const esEditar=!!u.id;

  app().innerHTML=`
    <div class="zx_card">
      <h2>${esEditar ? "Editar usuario" : "Crear usuario"}</h2>

      ${esEditar ? avatar(u) : ""}

      <input id="u_foto" type="file" accept="image/*">
      <input id="u_nombre" value="${limpiar(u.nombre || "")}" placeholder="Nombre completo">
      <input id="u_usuario" value="${limpiar(u.usuario || "")}" placeholder="Usuario">
      <input id="u_dni" value="${limpiar(u.dni || "")}" placeholder="DNI">

      <input id="u_telefono" value="${limpiar(u.telefono || "")}" placeholder="Teléfono">
      <input id="u_email" value="${limpiar(u.email || "")}" placeholder="Email">

      <input id="u_direccion" value="${limpiar(u.direccion || "")}" placeholder="Dirección">
      <input id="u_poblacion" value="${limpiar(u.poblacion || "")}" placeholder="Población">
      <input id="u_provincia" value="${limpiar(u.provincia || "")}" placeholder="Provincia">
      <input id="u_codigo_postal" value="${limpiar(u.codigo_postal || "")}" placeholder="Código postal">

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

      <button class="zx_btn_big ${esEditar ? "zx_azul" : "zx_verde"}" id="btn_guardar_usuario">
        ${esEditar ? "Guardar cambios" : "Guardar"}
      </button>

      <button class="zx_btn_big zx_gris" id="btn_cancelar_usuario">Cancelar</button>
    </div>
  `;

  document.getElementById("btn_guardar_usuario").onclick=function(){
    ZX_USER_GUARDAR(u.id || null,u.foto_url || null);
  };

  document.getElementById("btn_cancelar_usuario").onclick=function(){
    ZX_usuarios();
  };
}

window.ZX_USER_CREAR=function(){
  formulario({});
};

window.ZX_USER_EDITAR=async function(id){
  const cliente=sb();

  const res=await cliente
    .from("usuarios")
    .select("id,nombre,usuario,telefono,email,rol,estado,foto_url,dni,direccion,poblacion,provincia,codigo_postal")
    .eq("id",id)
    .maybeSingle();

  if(res.error || !res.data){
    pintarError(res.error ? res.error.message : "Usuario no encontrado.");
    return;
  }

  formulario(res.data);
};

async function subirFoto(file,usuario){
  if(!file) return null;

  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const path="usuarios/"+usuario+"_"+Date.now()+"."+ext;

  const res=await sb().storage
    .from("zentryx-usuarios")
    .upload(path,file,{upsert:true});

  if(res.error){
    alert("Error subiendo foto: "+res.error.message);
    return null;
  }

  return sb().storage
    .from("zentryx-usuarios")
    .getPublicUrl(path).data.publicUrl;
}

window.ZX_USER_GUARDAR=async function(id,fotoActual){
  const cliente=sb();

  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const nuevaFoto=await subirFoto(file,usuario);

  const datos={
    nombre:nombre,
    usuario:usuario,
    dni:document.getElementById("u_dni").value.trim(),
    telefono:document.getElementById("u_telefono").value.trim(),
    email:document.getElementById("u_email").value.trim(),
    direccion:document.getElementById("u_direccion").value.trim(),
    poblacion:document.getElementById("u_poblacion").value.trim(),
    provincia:document.getElementById("u_provincia").value.trim(),
    codigo_postal:document.getElementById("u_codigo_postal").value.trim(),
    rol:document.getElementById("u_rol").value,
    estado:document.getElementById("u_estado").value,
    foto_url:nuevaFoto || fotoActual || null
  };

  let res;

  if(id){
    res=await cliente.from("usuarios").update(datos).eq("id",id);
  }else{
    res=await cliente.from("usuarios").insert([datos]);
  }

  if(res.error){
    alert("Error guardando: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

window.ZX_USER_ELIMINAR=async function(id,nombre){
  if(!confirm("¿Eliminar usuario: "+nombre+"?\n\nEsta acción no se puede deshacer.")) return;

  const res=await sb().from("usuarios").delete().eq("id",id);

  if(res.error){
    alert("Error eliminando: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

})();