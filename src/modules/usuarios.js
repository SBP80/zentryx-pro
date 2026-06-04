// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3094 - DIRECTORIO + DOCUMENTOS + LABORAL CORREGIDO
// ===============================
(function(){
"use strict";

const DOC_BUCKET="zentryx-usuarios-docs";

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

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function rolLocal(){return String(sesion().rol || "").toLowerCase()}
function usuarioLocal(){return String(sesion().usuario || "").toLowerCase()}
function esAdminLocal(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esEncargadoLocal(){return rolLocal()==="encargado"}

function puedeCrear(){return esAdminLocal()}
function puedeEditar(){return esAdminLocal() || esEncargadoLocal()}
function puedeReset(){return esAdminLocal()}
function puedeEliminar(){return esAdminLocal()}

function puedeVerPrivado(u){
  const s=sesion();
  return esAdminLocal() || esEncargadoLocal() || String(s.id||"")===String(u.id||"");
}

function puedeVerDocs(u){
  const s=sesion();
  return esAdminLocal() || String(s.id||"")===String(u.id||"");
}

function puedeVerLaboral(u){
  const s=sesion();
  return esAdminLocal() || esEncargadoLocal() || String(s.id||"")===String(u.id||"");
}

function hashPin(pin){
  return btoa(String(pin));
}

function cerrarModal(){
  const m=document.getElementById("zx_modal");
  if(m) m.remove();
}

function modal(titulo,contenido){
  cerrarModal();
  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(titulo)}</h2>
        ${contenido}
      </div>
    </div>
  `);
}

async function pedirPinConPermiso(accion,callback){
  modal("PIN",`
    <input id="zx_admin_pin" class="zx_pin_input" inputmode="numeric" maxlength="4" placeholder="PIN">
    <button class="zx_btn_big zx_azul" id="zx_admin_ok">Confirmar</button>
    <button class="zx_btn_big zx_gris" id="zx_admin_cancelar">Cancelar</button>
  `);

  document.getElementById("zx_admin_cancelar").onclick=cerrarModal;

  document.getElementById("zx_admin_ok").onclick=async function(){
    const pin=document.getElementById("zx_admin_pin").value.trim();

    if(!/^[0-9]{4}$/.test(pin)){
      alert("PIN inválido.");
      return;
    }

    const s=sesion();

    const res=await sb()
      .from("usuarios")
      .select("id,usuario,rol,pin_hash")
      .eq("id",s.id)
      .maybeSingle();

    if(res.error || !res.data){
      alert("No se pudo validar el usuario.");
      return;
    }

    const rol=String(res.data.rol || "").toLowerCase();
    const usuario=String(res.data.usuario || "").toLowerCase();

    const admin=(rol==="administrador" || usuario==="admin");
    const encargado=(rol==="encargado");

    let ok=false;

    if(accion==="crear") ok=admin;
    if(accion==="editar") ok=admin || encargado;
    if(accion==="reset") ok=admin;
    if(accion==="eliminar") ok=admin;
    if(accion==="docs") ok=admin;
    if(accion==="laboral") ok=admin || encargado;

    if(!ok){
      alert("No tienes permiso.");
      return;
    }

    if(hashPin(pin)!==res.data.pin_hash){
      alert("PIN incorrecto.");
      return;
    }

    cerrarModal();
    callback();
  };
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
    return `<img class="zx_user_avatar" src="${limpiar(u.foto_url)}" alt="Foto">`;
  }

  return `<div class="zx_user_avatar zx_user_avatar_empty">${limpiar((u.nombre || u.usuario || "?").charAt(0).toUpperCase())}</div>`;
}

function telefonoLimpio(tel){
  let n=String(tel || "").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);

  if(!n){
    alert("Sin teléfono.");
    return;
  }

  modal("Teléfono",`
    <button class="zx_btn_big zx_azul" id="tel_llamar">Llamar</button>
    <button class="zx_btn_big zx_verde" id="tel_sms">SMS</button>
    <button class="zx_btn_big zx_verde" id="tel_whatsapp">WhatsApp</button>
    <button class="zx_btn_big zx_gris" id="tel_cancelar">Cancelar</button>
  `);

  document.getElementById("tel_llamar").onclick=function(){location.href="tel:"+n};
  document.getElementById("tel_sms").onclick=function(){location.href="sms:"+n};
  document.getElementById("tel_whatsapp").onclick=function(){location.href="https://wa.me/"+n.replace("+","")};
  document.getElementById("tel_cancelar").onclick=cerrarModal;
}

function enviarMail(email){
  if(!email){
    alert("Sin email.");
    return;
  }
  location.href="mailto:"+email;
}

function menuMapa(dir){
  if(!dir){
    alert("Sin dirección.");
    return;
  }

  const q=encodeURIComponent(dir);

  modal("Mapa",`
    <button class="zx_btn_big zx_azul" id="map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="map_waze">Waze</button>
    <button class="zx_btn_big zx_gris" id="map_cancelar">Cancelar</button>
  `);

  document.getElementById("map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("map_cancelar").onclick=cerrarModal;
}

function mensajeInterno(u){
  alert("Mensajería interna pendiente de conectar con tabla propia de mensajes.");
}

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    app().innerHTML=`<div class="zx_card"><h2>Error</h2><div class="zx_text">Supabase no conectado.</div></div>`;
    return [];
  }

  const res=await cliente
    .from("usuarios")
    .select("*")
    .eq("activo",true)
    .order("nombre",{ascending:true});

  if(res.error){
    app().innerHTML=`<div class="zx_card"><h2>Error</h2><div class="zx_text">${limpiar(res.error.message)}</div></div>`;
    return [];
  }

  return res.data || [];
}

function renderFichaCorta(u){
  const dir=direccionCompleta(u);

  return `
    <details class="zx_user_details">
      <summary>Ver ficha</summary>
      <div class="zx_user_data zx_user_data_small">
        <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
        <b>Teléfono:</b> ${limpiar(u.telefono || "-")}<br>
        <b>Email:</b> ${limpiar(u.email || "-")}<br>
        <b>Dirección:</b> ${limpiar(dir || "-")}
      </div>
    </details>
  `;
}

function renderUsuario(u){
  const dir=direccionCompleta(u);
  const pinEstado=u.debe_crear_pin ? "Pendiente" : "Activo";
  const privado=puedeVerPrivado(u);
  const docs=puedeVerDocs(u);
  const laboral=puedeVerLaboral(u);

  return `
    <div class="zx_user_card">
      <div class="zx_user_top">
        ${avatar(u)}
        <div>
          <div class="zx_user_name">${limpiar(u.nombre || u.usuario || "-")}</div>
          <div class="zx_user_sub">${limpiar(u.rol || "-")} · ${limpiar(u.estado || "-")}</div>
          ${u.telefono ? `<div class="zx_user_phone">${limpiar(u.telefono)}</div>` : ""}
        </div>
      </div>

      ${
        privado
        ? `
          <div class="zx_user_data">
            <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
            <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
            <b>Teléfono:</b> ${limpiar(u.telefono || "-")}<br>
            <b>Email:</b> ${limpiar(u.email || "-")}<br>
            <b>Dirección:</b> ${limpiar(dir || "-")}<br>
            <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
            <b>Estado:</b> ${limpiar(u.estado || "-")}<br>
            <b>PIN:</b> ${limpiar(pinEstado)}
          </div>
        `
        : renderFichaCorta(u)
      }

      <div class="zx_user_actions">
        ${u.telefono ? `<button class="zx_action_btn" data-action="tel" data-tel="${limpiar(u.telefono)}">Teléfono</button>` : ""}
        ${u.email ? `<button class="zx_action_btn" data-action="mail" data-email="${limpiar(u.email)}">Mail</button>` : ""}
        ${dir ? `<button class="zx_action_btn" data-action="mapa" data-dir="${limpiar(dir)}">Mapa</button>` : ""}
        <button class="zx_action_btn zx_purple" data-action="mensaje" data-id="${limpiar(u.id)}">Mensaje</button>
      </div>

      ${
        docs || laboral || puedeEditar() || puedeReset() || puedeEliminar()
        ? `
          <div class="zx_user_actions">
            ${laboral ? `<button class="zx_action_btn zx_laboral" data-action="laboral" data-id="${limpiar(u.id)}">Laboral</button>` : ""}
            ${docs ? `<button class="zx_action_btn zx_blue" data-action="docs" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "Usuario")}">Documentos</button>` : ""}
            ${puedeEditar() ? `<button class="zx_action_btn zx_blue" data-action="editar" data-id="${limpiar(u.id)}">Editar</button>` : ""}
            ${puedeReset() ? `<button class="zx_action_btn zx_orange" data-action="reset" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Reset PIN</button>` : ""}
            ${puedeEliminar() ? `<button class="zx_action_btn zx_red" data-action="eliminar" data-id="${limpiar(u.id)}" data-usuario="${limpiar(u.usuario || "")}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Eliminar</button>` : ""}
          </div>
        `
        : ""
      }
    </div>
  `;
}

window.ZENTRYX_UI_usuarios=async function(){
  const usuarios=await cargarUsuarios();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Directorio interno de empresa, contacto, documentos y permisos.</div>
      ${
        puedeCrear()
        ? `<button class="zx_btn_big zx_verde" id="btn_crear_usuario">Crear usuario</button>`
        : ``
      }
    </div>

    <div class="zx_card">
      <h2>Directorio</h2>
      ${
        usuarios.length
        ? usuarios.map(renderUsuario).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  const crear=document.getElementById("btn_crear_usuario");

  if(crear){
    crear.onclick=function(){
      pedirPinConPermiso("crear",function(){
        formulario({});
      });
    };
  }

  document.querySelectorAll("[data-action]").forEach(function(btn){
    btn.onclick=function(){
      const a=btn.dataset.action;

      if(a==="tel") menuTelefono(btn.dataset.tel);
      if(a==="mail") enviarMail(btn.dataset.email);
      if(a==="mapa") menuMapa(btn.dataset.dir);

      if(a==="mensaje"){
        const u=usuarios.find(x=>String(x.id)===String(btn.dataset.id));
        mensajeInterno(u || {});
      }

      if(a==="laboral"){
        const u=usuarios.find(x=>String(x.id)===String(btn.dataset.id));
        verLaboralUsuario(u || {});
      }

      if(a==="docs"){
        const u=usuarios.find(x=>String(x.id)===String(btn.dataset.id));
        verDocumentosUsuario(u || {id:btn.dataset.id,nombre:btn.dataset.nombre});
      }

      if(a==="editar"){
        pedirPinConPermiso("editar",function(){
          editarUsuario(btn.dataset.id);
        });
      }

      if(a==="reset"){
        pedirPinConPermiso("reset",function(){
          resetPin(btn.dataset.id,btn.dataset.nombre);
        });
      }

      if(a==="eliminar"){
        pedirPinConPermiso("eliminar",function(){
          eliminarUsuario(btn.dataset.id,btn.dataset.nombre,btn.dataset.usuario);
        });
      }
    };
  });
};

window.ZX_usuarios=function(){
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="usuarios") b.classList.add("zx_activo");
  });

  window.ZENTRYX_UI_usuarios();
};

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${label}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${label}">
  `;
}

function inputNum(id,label,value){
  return `
    <label class="zx_label" for="${id}">${label}</label>
    <input id="${id}" type="number" step="0.01" value="${limpiar(value ?? "")}" placeholder="${label}">
  `;
}

function check(id,label,value){
  return `
    <label class="zx_check">
      <input id="${id}" type="checkbox" ${value ? "checked" : ""}>
      <span>${limpiar(label)}</span>
    </label>
  `;
}

function selectVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];

  return `
    <label class="zx_label" for="u_via_tipo">Tipo de vía</label>
    <select id="u_via_tipo">
      ${opciones.map(function(o){
        return `<option value="${limpiar(o)}" ${String(valor||"")===o ? "selected" : ""}>${limpiar(o || "Seleccionar")}</option>`;
      }).join("")}
    </select>
  `;
}

function formulario(u){
  const editando=!!u.id;

  modal(editando ? "Editar usuario" : "Crear usuario",`
    ${editando ? avatar(u) : ""}

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

    <button class="zx_btn_big ${editando ? "zx_azul" : "zx_verde"}" id="btn_guardar_usuario">
      ${editando ? "Guardar cambios" : "Guardar"}
    </button>

    <button class="zx_btn_big zx_gris" id="btn_cancelar_usuario">Cancelar</button>
  `);

  document.getElementById("btn_cancelar_usuario").onclick=cerrarModal;

  document.getElementById("btn_guardar_usuario").onclick=function(){
    guardarUsuario(u.id || null,u.foto_url || null);
  };
}

async function editarUsuario(id){
  const res=await sb()
    .from("usuarios")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(res.error || !res.data){
    alert("No se pudo cargar el usuario.");
    return;
  }

  formulario(res.data);
}

async function subirFoto(file,usuario){
  if(!file) return null;

  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const limpio=String(usuario || "usuario").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="fotos/"+limpio+"_"+Date.now()+"."+ext;

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

function datosFormulario(foto_url,id){
  const datos={
    nombre:document.getElementById("u_nombre").value.trim(),
    usuario:document.getElementById("u_usuario").value.trim(),
    dni:document.getElementById("u_dni").value.trim().toUpperCase(),
    telefono:document.getElementById("u_telefono").value.trim(),
    email:document.getElementById("u_email").value.trim().toLowerCase(),

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
    activo:document.getElementById("u_estado").value==="Activo",
    foto_url:foto_url,
    updated_at:new Date().toISOString()
  };

  if(!id){
    datos.pin_hash=null;
    datos.debe_crear_pin=true;
    datos.pin_intentos=0;
    datos.pin_bloqueado_hasta=null;
    datos.acceso_estado="pendiente";
  }

  return datos;
}

function validarFormulario(){
  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();
  const dni=document.getElementById("u_dni").value.trim();
  const telefono=document.getElementById("u_telefono").value.trim();
  const email=document.getElementById("u_email").value.trim();
  const cp=document.getElementById("u_codigo_postal").value.trim();

  if(!nombre){alert("Nombre obligatorio.");return false}
  if(!usuario){alert("Usuario obligatorio.");return false}
  if(usuario.length<3){alert("Usuario demasiado corto.");return false}
  if(!/^[a-zA-Z0-9_]+$/.test(usuario)){alert("Usuario solo puede tener letras, números y guion bajo.");return false}
  if(dni && !/^[0-9XYZxyz][0-9]{7}[A-Za-z]$/.test(dni)){alert("DNI/NIE no válido.");return false}
  if(telefono && !/^[6789][0-9]{8}$/.test(telefono)){alert("Teléfono no válido.");return false}
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert("Email no válido.");return false}
  if(cp && !/^[0-9]{5}$/.test(cp)){alert("Código postal no válido.");return false}

  return true;
}

async function guardarUsuario(id,fotoActual){
  if(!validarFormulario()) return;

  const usuario=document.getElementById("u_usuario").value.trim();

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
  const datos=datosFormulario(nuevaFoto || fotoActual || null,id);

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

  cerrarModal();
  ZX_usuarios();
}

async function resetPin(id,nombre){
  if(!confirm("¿Resetear PIN de "+nombre+"?")) return;

  const res=await sb()
    .from("usuarios")
    .update({
      pin_hash:null,
      debe_crear_pin:true,
      pin_intentos:0,
      pin_bloqueado_hasta:null,
      pin_restaurado_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(res.error){
    alert("Error reseteando PIN: "+res.error.message);
    return;
  }

  alert("PIN reseteado.");
  ZX_usuarios();
}

async function eliminarUsuario(id,nombre,usuario){
  const s=sesion();

  if(String(usuario || "").toLowerCase()==="admin"){
    alert("No se puede eliminar el administrador principal.");
    return;
  }

  if(String(s.id || "")===String(id)){
    alert("No puedes eliminar tu propio usuario.");
    return;
  }

  if(!confirm("¿Eliminar usuario "+nombre+"?")) return;

  const res=await sb()
    .from("usuarios")
    .delete()
    .eq("id",id);

  if(res.error){
    alert("Error eliminando: "+res.error.message);
    return;
  }

  ZX_usuarios();
}

// ===============================
// LABORAL
// ===============================

async function cargarLaboralUsuario(usuarioId){
  const r=await sb()
    .from("config_laboral")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .maybeSingle();

  if(r.error){
    alert("Error cargando datos laborales: "+r.error.message);
    return null;
  }

  return r.data || null;
}

function laboralDefault(u){
  return {
    usuario_id:String(u.id || ""),
    usuario:u.usuario || "",
    nombre:u.nombre || "",
    horas_dia:8,
    horas_semana:40,
    trabaja_lunes:true,
    trabaja_martes:true,
    trabaja_miercoles:true,
    trabaja_jueves:true,
    trabaja_viernes:true,
    trabaja_sabado:false,
    trabaja_domingo:false,
    vacaciones_dias:30,
    asuntos_propios:0,
    localidad:u.poblacion || "",
    provincia:u.provincia || "",
    pais:u.pais || "España"
  };
}

function resumenLaboral(l){
  return `
    <div class="zx_laboral_resumen">
      <div><b>${limpiar(l.horas_dia ?? 0)}</b><span>Horas/día</span></div>
      <div><b>${limpiar(l.horas_semana ?? 0)}</b><span>Horas/semana</span></div>
      <div><b>${limpiar(l.vacaciones_dias ?? 0)}</b><span>Vacaciones</span></div>
      <div><b>${limpiar(l.asuntos_propios ?? 0)}</b><span>Asuntos propios</span></div>
    </div>
  `;
}

async function verLaboralUsuario(u){
  const actual=await cargarLaboralUsuario(u.id);
  const l=actual || laboralDefault(u);
  const editable=puedeEditar();

  modal("Laboral",`
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    ${resumenLaboral(l)}

    <h3 class="zx_form_subtitle">Jornada</h3>

    ${inputNum("lab_horas_dia","Horas por día",l.horas_dia)}
    ${inputNum("lab_horas_semana","Horas por semana",l.horas_semana)}

    <h3 class="zx_form_subtitle">Días de trabajo</h3>

    <div class="zx_checks_grid">
      ${check("lab_lunes","Lunes",l.trabaja_lunes)}
      ${check("lab_martes","Martes",l.trabaja_martes)}
      ${check("lab_miercoles","Miércoles",l.trabaja_miercoles)}
      ${check("lab_jueves","Jueves",l.trabaja_jueves)}
      ${check("lab_viernes","Viernes",l.trabaja_viernes)}
      ${check("lab_sabado","Sábado",l.trabaja_sabado)}
      ${check("lab_domingo","Domingo",l.trabaja_domingo)}
    </div>

    <h3 class="zx_form_subtitle">Vacaciones y asuntos propios</h3>

    ${inputNum("lab_vacaciones","Vacaciones anuales en días",l.vacaciones_dias)}
    ${inputNum("lab_asuntos","Asuntos propios en horas",l.asuntos_propios)}

    <h3 class="zx_form_subtitle">Calendario laboral</h3>

    ${input("lab_pais","País",l.pais || "España")}
    ${input("lab_provincia","Provincia",l.provincia)}
    ${input("lab_localidad","Localidad",l.localidad)}

    <div class="zx_info_box">
      Los festivos se conectarán después con la tabla de festivos laborales. Este bloque deja preparada la configuración por trabajador.
    </div>

    ${
      editable
      ? `<button class="zx_btn_big zx_verde" id="lab_guardar">Guardar laboral</button>`
      : ``
    }

    <button class="zx_btn_big zx_gris" id="lab_cerrar">Cerrar</button>
  `);

  document.getElementById("lab_cerrar").onclick=cerrarModal;

  const guardar=document.getElementById("lab_guardar");
  if(guardar){
    guardar.onclick=function(){
      const datos=leerDatosLaboralesFormulario(u);

      pedirPinConPermiso("laboral",function(){
        guardarLaboralDatos(datos,actual);
      });
    };
  }
}

function numVal(id,def){
  const el=document.getElementById(id);
  if(!el) return def;

  const n=Number(String(el.value || "").replace(",","."));
  if(Number.isFinite(n)) return n;
  return def;
}

function leerDatosLaboralesFormulario(u){
  return {
    usuario_id:String(u.id || ""),
    usuario:String(u.usuario || ""),
    nombre:String(u.nombre || u.usuario || ""),
    horas_dia:numVal("lab_horas_dia",8),
    horas_semana:numVal("lab_horas_semana",40),
    trabaja_lunes:document.getElementById("lab_lunes").checked,
    trabaja_martes:document.getElementById("lab_martes").checked,
    trabaja_miercoles:document.getElementById("lab_miercoles").checked,
    trabaja_jueves:document.getElementById("lab_jueves").checked,
    trabaja_viernes:document.getElementById("lab_viernes").checked,
    trabaja_sabado:document.getElementById("lab_sabado").checked,
    trabaja_domingo:document.getElementById("lab_domingo").checked,
    vacaciones_dias:numVal("lab_vacaciones",30),
    asuntos_propios:numVal("lab_asuntos",0),
    pais:document.getElementById("lab_pais").value.trim() || "España",
    provincia:document.getElementById("lab_provincia").value.trim(),
    localidad:document.getElementById("lab_localidad").value.trim()
  };
}

async function guardarLaboralDatos(datos,actual){
  let r;

  if(actual && actual.id){
    r=await sb()
      .from("config_laboral")
      .update(datos)
      .eq("id",actual.id);
  }else{
    r=await sb()
      .from("config_laboral")
      .insert([datos]);
  }

  if(r.error){
    alert("Error guardando laboral: "+r.error.message);
    return;
  }

  alert("Datos laborales guardados.");
  cerrarModal();
  ZX_usuarios();
}

// ===============================
// DOCUMENTOS
// ===============================

async function cargarDocumentos(usuarioId){
  const r=await sb()
    .from("usuarios_documentos")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .order("created_at",{ascending:false});

  if(r.error){
    alert("Error cargando documentos: "+r.error.message);
    return [];
  }

  return r.data || [];
}

function textoTipoDoc(tipo){
  const m={
    dni_frontal:"DNI frontal",
    dni_trasero:"DNI trasero",
    contrato:"Contrato",
    certificado:"Certificado",
    carnet:"Carnet",
    formacion:"Formación",
    otro:"Otro"
  };

  return m[tipo] || tipo || "Documento";
}

async function subirDocumentoUsuario(file,usuarioId,tipo){
  if(!file) return null;

  const ext=(file.name.split(".").pop() || "dat").toLowerCase();
  const limpio=String(file.name || "documento").replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=String(usuarioId)+"/"+tipo+"/"+Date.now()+"_"+limpio;

  const r=await sb().storage
    .from(DOC_BUCKET)
    .upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo documento: "+r.error.message);
    return null;
  }

  return sb().storage
    .from(DOC_BUCKET)
    .getPublicUrl(path).data.publicUrl;
}

async function verDocumentosUsuario(u){
  const docs=await cargarDocumentos(u.id);

  modal("Documentos",`
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    <label class="zx_label">Tipo</label>
    <select id="doc_tipo">
      <option value="dni_frontal">DNI frontal</option>
      <option value="dni_trasero">DNI trasero</option>
      <option value="contrato">Contrato</option>
      <option value="certificado">Certificado</option>
      <option value="carnet">Carnet</option>
      <option value="formacion">Formación</option>
      <option value="otro">Otro</option>
    </select>

    <label class="zx_label">Archivo</label>
    <input id="doc_file" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">

    <label class="zx_label">Nombre visible</label>
    <input id="doc_nombre" placeholder="Nombre del documento">

    <button class="zx_btn_big zx_verde" id="doc_subir">Subir documento</button>

    <h3 class="zx_form_subtitle">Archivos guardados</h3>

    <div id="doc_lista">
      ${
        docs.length
        ? docs.map(d=>`
          <div class="zx_doc_item">
            <div>
              <b>${limpiar(d.nombre || "Documento")}</b><br>
              <span>${limpiar(textoTipoDoc(d.tipo))}</span>
            </div>
            <button class="zx_action_btn zx_blue" data-doc-open="${limpiar(d.url)}">Abrir</button>
            ${
              esAdminLocal()
              ? `<button class="zx_action_btn zx_red" data-doc-del="${limpiar(d.id)}">Borrar</button>`
              : ""
            }
          </div>
        `).join("")
        : `<div class="zx_text">Sin documentos.</div>`
      }
    </div>

    <button class="zx_btn_big zx_gris" id="doc_cerrar">Cerrar</button>
  `);

  document.getElementById("doc_cerrar").onclick=cerrarModal;

  document.getElementById("doc_subir").onclick=async function(){
    const file=document.getElementById("doc_file").files[0] || null;
    const tipo=document.getElementById("doc_tipo").value;
    const nombre=document.getElementById("doc_nombre").value.trim() || (file ? file.name : "");

    if(!file){
      alert("Selecciona un archivo.");
      return;
    }

    const url=await subirDocumentoUsuario(file,u.id,tipo);
    if(!url) return;

    const s=sesion();

    const r=await sb()
      .from("usuarios_documentos")
      .insert([{
        usuario_id:String(u.id),
        tipo,
        nombre,
        url,
        creado_por:s.usuario || ""
      }]);

    if(r.error){
      alert("Error guardando documento: "+r.error.message);
      return;
    }

    verDocumentosUsuario(u);
  };

  document.querySelectorAll("[data-doc-open]").forEach(btn=>{
    btn.onclick=function(){
      window.open(btn.dataset.docOpen,"_blank");
    };
  });

  document.querySelectorAll("[data-doc-del]").forEach(btn=>{
    btn.onclick=function(){
      pedirPinConPermiso("docs",async function(){
        if(!confirm("¿Borrar documento?")) return;

        const r=await sb()
          .from("usuarios_documentos")
          .delete()
          .eq("id",btn.dataset.docDel);

        if(r.error){
          alert("Error borrando documento: "+r.error.message);
          return;
        }

        verDocumentosUsuario(u);
      });
    };
  });
}

// ===============================
// ESTILOS
// ===============================

(function estilos(){
  if(document.getElementById("zx_usuarios_v3094")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3094";

  s.innerHTML=`
    .zx_user_card{
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:22px;
      margin:18px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.04);
      overflow:hidden;
    }

    .zx_user_top{
      display:grid;
      grid-template-columns:92px 1fr;
      gap:18px;
      align-items:center;
      margin-bottom:14px;
    }

    .zx_user_avatar{
      width:92px;
      height:92px;
      border-radius:24px;
      object-fit:cover;
      background:#e5e7eb;
    }

    .zx_user_avatar_empty{
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:38px;
      font-weight:900;
    }

    .zx_user_name{
      font-size:30px;
      font-weight:900;
      color:#0f172a;
      margin-bottom:4px;
      word-break:break-word;
    }

    .zx_user_sub,.zx_user_phone{
      color:#64748b;
      font-size:18px;
      font-weight:900;
      line-height:1.35;
      word-break:break-word;
    }

    .zx_user_data{
      color:#334155;
      font-size:18px;
      line-height:1.55;
      font-weight:700;
      word-break:break-word;
    }

    .zx_user_data_small{
      margin-top:12px;
    }

    .zx_user_details{
      margin:12px 0;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:18px;
      padding:12px;
    }

    .zx_user_details summary{
      color:#2563eb;
      font-size:18px;
      font-weight:900;
      cursor:pointer;
    }

    .zx_user_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:14px;
    }

    .zx_action_btn{
      border:0;
      border-radius:16px;
      background:#e5e7eb;
      padding:14px;
      font-size:17px;
      font-weight:900;
      color:#111827;
    }

    .zx_blue{background:#2563eb!important;color:white!important}
    .zx_orange{background:#facc15!important;color:#3b2500!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_purple{background:#7c3aed!important;color:white!important}
    .zx_laboral{background:#0f766e!important;color:white!important}

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(15,23,42,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
    }

    .zx_modal_caja{
      width:100%;
      max-width:520px;
      max-height:88vh;
      overflow:auto;
      background:white;
      border-radius:28px;
      padding:24px;
      box-shadow:0 20px 70px rgba(0,0,0,.35);
    }

    .zx_modal_caja h2{
      margin:0 0 18px;
      font-size:32px;
      font-weight:900;
      color:#0f172a;
    }

    .zx_modal_caja input,
    .zx_modal_caja select,
    .zx_modal_caja textarea{
      width:100%;
      border:1px solid #d1d5db;
      border-radius:16px;
      padding:16px;
      font-size:18px;
      margin-bottom:10px;
      background:#f8fafc;
      color:#0f172a;
      font-weight:800;
    }

    .zx_label{
      display:block;
      margin:12px 0 6px;
      color:#334155;
      font-size:15px;
      font-weight:900;
    }

    .zx_form_subtitle{
      margin:22px 0 8px;
      color:#0f172a;
      font-size:24px;
      font-weight:900;
    }

    .zx_pin_input{
      text-align:center;
      font-size:32px!important;
      letter-spacing:10px;
    }

    .zx_doc_item{
      display:grid;
      grid-template-columns:1fr auto auto;
      gap:8px;
      align-items:center;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:18px;
      padding:12px;
      margin-top:10px;
    }

    .zx_doc_item span{
      color:#64748b;
      font-weight:800;
    }

    .zx_laboral_resumen{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin:14px 0 18px;
    }

    .zx_laboral_resumen div{
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:18px;
      padding:14px;
      text-align:center;
    }

    .zx_laboral_resumen b{
      display:block;
      font-size:28px;
      font-weight:900;
      color:#0f172a;
    }

    .zx_laboral_resumen span{
      display:block;
      color:#64748b;
      font-size:14px;
      font-weight:900;
      margin-top:4px;
    }

    .zx_checks_grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-bottom:10px;
    }

    .zx_check{
      display:flex;
      align-items:center;
      gap:10px;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:12px;
      font-weight:900;
      color:#0f172a;
    }

    .zx_check input{
      width:auto!important;
      margin:0!important;
      transform:scale(1.2);
    }

    .zx_info_box{
      background:#eef2ff;
      border:1px solid #c7d2fe;
      color:#334155;
      padding:14px;
      border-radius:16px;
      font-size:15px;
      font-weight:800;
      line-height:1.4;
      margin:14px 0;
    }

    @media(max-width:430px){
      .zx_user_top{
        grid-template-columns:76px 1fr;
        gap:14px;
      }

      .zx_user_avatar{
        width:76px;
        height:76px;
        border-radius:22px;
      }

      .zx_user_name{
        font-size:28px;
      }

      .zx_user_actions,
      .zx_doc_item,
      .zx_checks_grid{
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(s);
})();

})();