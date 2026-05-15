// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V2674
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
  return [
    u.via_tipo,
    u.calle,
    u.numero ? "Nº "+u.numero : "",
    u.portal ? "Portal "+u.portal : "",
    u.escalera ? "Esc. "+u.escalera : "",
    u.piso ? "Piso "+u.piso : "",
    u.puerta ? "Puerta "+u.puerta : "",
    u.poblacion,
    u.provincia,
    u.codigo_postal,
    u.pais
  ].filter(Boolean).join(", ");
}

function avatar(u){
  if(u.foto_url){
    return `<img src="${limpiar(u.foto_url)}" class="zx_user_avatar">`;
  }

  return `
    <div class="zx_user_avatar zx_user_avatar_empty">
      ${limpiar((u.nombre || "?").charAt(0))}
    </div>
  `;
}

function pintarError(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Error</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button class="zx_btn_big zx_gris" id="btn_error_volver">Volver</button>
    </div>
  `;

  document.getElementById("btn_error_volver").onclick=function(){
    ZX_usuarios();
  };
}

function cerrarModal(){
  const m=document.getElementById("zx_modal");
  if(m) m.remove();
}

function modal(titulo,botones){
  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(titulo)}</h2>
        ${botones}
        <button class="zx_btn_big zx_gris" id="zx_modal_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("zx_modal_cancelar").onclick=cerrarModal;
}

window.ZX_MENU_TELEFONO=function(tel){
  const numero=String(tel || "").replace(/\s+/g,"");

  modal("Teléfono",`
    <button class="zx_btn_big zx_azul" id="zx_tel_llamar">Llamar</button>
    <button class="zx_btn_big zx_verde" id="zx_tel_sms">SMS</button>
    <button class="zx_btn_big zx_verde" id="zx_tel_whatsapp">WhatsApp</button>
  `);

  document.getElementById("zx_tel_llamar").onclick=function(){
    location.href="tel:"+numero;
  };

  document.getElementById("zx_tel_sms").onclick=function(){
    location.href="sms:"+numero;
  };

  document.getElementById("zx_tel_whatsapp").onclick=function(){
    window.open("https://wa.me/"+numero,"_blank");
  };
};

window.ZX_MENU_MAPA=function(dir){
  const q=encodeURIComponent(dir);

  modal("Abrir mapa",`
    <button class="zx_btn_big zx_azul" id="zx_map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="zx_map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="zx_map_waze">Waze</button>
  `);

  document.getElementById("zx_map_apple").onclick=function(){
    window.open("https://maps.apple.com/?q="+q,"_blank");
  };

  document.getElementById("zx_map_google").onclick=function(){
    window.open("https://www.google.com/maps/search/?api=1&query="+q,"_blank");
  };

  document.getElementById("zx_map_waze").onclick=function(){
    window.open("https://waze.com/ul?q="+q,"_blank");
  };
};

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    pintarError("Supabase no conectado.");
    return [];
  }

  const res=await cliente
    .from("usuarios")
    .select(`
      id,nombre,usuario,telefono,email,rol,estado,foto_url,dni,
      via_tipo,calle,numero,portal,escalera,piso,puerta,
      poblacion,provincia,codigo_postal,pais
    `)
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
      <div class="zx_text">Gestión de usuarios, datos, contacto y dirección.</div>
      <button class="zx_btn_big zx_verde" id="btn_crear_usuario">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>

      ${
        usuarios.length
        ? usuarios.map(function(u){
          const dir=direccionCompleta(u);

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
                <b>Dirección:</b> ${limpiar(dir || "-")}<br>
                <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
                <b>Estado:</b> ${limpiar(u.estado || "-")}
              </div>

              ${u.telefono ? `<button class="zx_btn_big zx_gris btn_tel" data-tel="${limpiar(u.telefono)}">Teléfono</button>` : ""}
              ${dir ? `<button class="zx_btn_big zx_gris btn_mapa" data-dir="${limpiar(dir)}">Mapa</button>` : ""}

              <button class="zx_btn_big zx_azul btn_editar" data-id="${limpiar(u.id)}">Editar</button>
              <button class="zx_btn_big zx_rojo btn_eliminar" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Eliminar</button>
            </div>
          `;
        }).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  document.getElementById("btn_crear_usuario").onclick=function(){
    ZX_USER_CREAR();
  };

  document.querySelectorAll(".btn_editar").forEach(function(btn){
    btn.onclick=function(){
      ZX_USER_EDITAR(btn.dataset.id);
    };
  });

  document.querySelectorAll(".btn_eliminar").forEach(function(btn){
    btn.onclick=function(){
      ZX_USER_ELIMINAR(btn.dataset.id,btn.dataset.nombre);
    };
  });

  document.querySelectorAll(".btn_tel").forEach(function(btn){
    btn.onclick=function(){
      ZX_MENU_TELEFONO(btn.dataset.tel);
    };
  });

  document.querySelectorAll(".btn_mapa").forEach(function(btn){
    btn.onclick=function(){
      ZX_MENU_MAPA(btn.dataset.dir);
    };
  });
};

window.ZX_usuarios=function(){
  window.ZENTRYX_UI_usuarios();
};

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${label}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${label}">
  `;
}

function selectVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];
  return `
    <label class="zx_label" for="u_via_tipo">Tipo de vía</label>
    <select id="u_via_tipo">
      ${opciones.map(function(o){
        return `<option value="${limpiar(o)}" ${valor===o ? "selected" : ""}>${o || "Seleccionar"}</option>`;
      }).join("")}
    </select>
  `;
}

function formulario(u){
  const esEditar=!!u.id;

  app().innerHTML=`
    <div class="zx_card">
      <h2>${esEditar ? "Editar usuario" : "Crear usuario"}</h2>

      ${esEditar ? avatar(u) : ""}

      <label class="zx_label" for="u_foto">Foto</label>
      <input id="u_foto" type="file" accept="image/*">

      ${input("u_nombre","Nombre completo",u.nombre)}
      ${input("u_usuario","Usuario",u.usuario)}
      ${input("u_dni","DNI / NIE",u.dni)}
      ${input("u_telefono","Teléfono",u.telefono,"tel")}
      ${input("u_email","Email",u.email,"email")}

      <h3 class="zx_form_subtitle">Dirección</h3>

      ${selectVia(u.via_tipo || "")}
      ${input("u_calle","Calle / nombre de vía",u.calle)}
      ${input("u_numero","Número",u.numero)}
      ${input("u_portal","Portal",u.portal)}
      ${input("u_escalera","Escalera",u.escalera)}
      ${input("u_piso","Piso",u.piso)}
      ${input("u_puerta","Puerta",u.puerta)}
      ${input("u_poblacion","Población",u.poblacion)}
      ${input("u_provincia","Provincia",u.provincia)}
      ${input("u_codigo_postal","Código postal",u.codigo_postal)}
      ${input("u_pais","País",u.pais || "España")}

      <label class="zx_label" for="u_rol">Rol</label>
      <select id="u_rol">
        <option ${u.rol==="Administrador" ? "selected" : ""}>Administrador</option>
        <option ${u.rol==="Encargado" ? "selected" : ""}>Encargado</option>
        <option ${u.rol==="Operario" ? "selected" : ""}>Operario</option>
        <option ${u.rol==="Oficina" ? "selected" : ""}>Oficina</option>
      </select>

      <label class="zx_label" for="u_estado">Estado</label>
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
  const res=await sb()
    .from("usuarios")
    .select(`
      id,nombre,usuario,telefono,email,rol,estado,foto_url,dni,
      via_tipo,calle,numero,portal,escalera,piso,puerta,
      poblacion,provincia,codigo_postal,pais
    `)
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

function datosFormulario(foto_url){
  return {
    nombre:document.getElementById("u_nombre").value.trim(),
    usuario:document.getElementById("u_usuario").value.trim(),
    dni:document.getElementById("u_dni").value.trim(),
    telefono:document.getElementById("u_telefono").value.trim(),
    email:document.getElementById("u_email").value.trim(),

    via_tipo:document.getElementById("u_via_tipo").value,
    calle:document.getElementById("u_calle").value.trim(),
    numero:document.getElementById("u_numero").value.trim(),
    portal:document.getElementById("u_portal").value.trim(),
    escalera:document.getElementById("u_escalera").value.trim(),
    piso:document.getElementById("u_piso").value.trim(),
    puerta:document.getElementById("u_puerta").value.trim(),
    poblacion:document.getElementById("u_poblacion").value.trim(),
    provincia:document.getElementById("u_provincia").value.trim(),
    codigo_postal:document.getElementById("u_codigo_postal").value.trim(),
    pais:document.getElementById("u_pais").value.trim(),

    rol:document.getElementById("u_rol").value,
    estado:document.getElementById("u_estado").value,
    foto_url:foto_url
  };
}

window.ZX_USER_GUARDAR=async function(id,fotoActual){
  const usuario=document.getElementById("u_usuario").value.trim();
  const nombre=document.getElementById("u_nombre").value.trim();

  if(!nombre || !usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  const dup=await sb()
    .from("usuarios")
    .select("id")
    .eq("usuario",usuario)
    .maybeSingle();

  if(dup.data && String(dup.data.id)!==String(id || "")){
    alert("Ese usuario ya existe.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const nuevaFoto=await subirFoto(file,usuario);
  const datos=datosFormulario(nuevaFoto || fotoActual || null);

  let res;

  if(id){
    res=await sb().from("usuarios").update(datos).eq("id",id);
  }else{
    res=await sb().from("usuarios").insert([datos]);
  }

  if(res.error){
    alert("Error guardando: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

window.ZX_USER_ELIMINAR=async function(id,nombre){
  if(!confirm("¿Eliminar usuario: "+nombre+"?\n\nEsta acción no se puede deshacer.")) return;

  const res=await sb()
    .from("usuarios")
    .delete()
    .eq("id",id);

  if(res.error){
    alert("Error eliminando: "+res.error.message);
    return;
  }

  ZX_usuarios();
};

(function estilosUsuarios(){
  if(document.getElementById("zx_usuarios_styles")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_styles";
  s.innerHTML=`
    .zx_user_avatar{
      width:84px;
      height:84px;
      border-radius:22px;
      object-fit:cover;
      margin-bottom:12px;
    }

    .zx_user_avatar_empty{
      background:#e5e7eb;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:34px;
      font-weight:900;
      color:#64748b;
    }

    .zx_label{
      display:block;
      margin:18px 0 6px;
      font-size:15px;
      font-weight:900;
      color:#334155;
    }

    .zx_form_subtitle{
      margin:26px 0 4px;
      font-size:24px;
      font-weight:900;
      color:#0f172a;
    }

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(15,23,42,.65);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    }

    .zx_modal_caja{
      width:100%;
      max-width:430px;
      background:white;
      border-radius:28px;
      padding:24px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);
    }

    .zx_modal_caja h2{
      margin:0 0 18px;
      font-size:32px;
      font-weight:900;
    }
  `;
  document.head.appendChild(s);
})();

window.ZX_USER_RESTAURAR_PASSWORD=async function(id,nombre){
  if(!confirm("¿Restaurar contraseña de "+nombre+"?\n\nEl usuario tendrá que crear una nueva al entrar.")) return;

  const res=await sb()
    .from("usuarios")
    .update({
      password_hash:null,
      debe_crear_password:true,
      acceso_estado:"pendiente",
      password_restaurada_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(res.error){
    alert("Error restaurando contraseña: "+res.error.message);
    return;
  }

  alert("Contraseña restaurada.");
  ZX_usuarios();
};
})();