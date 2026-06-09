// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3104 - USUARIOS + LABORAL CORREGIDO
// ===============================
(function(){
"use strict";

const DOC_BUCKET="zentryx-usuarios-docs";
const FOTO_BUCKET="zentryx-usuarios";

const ZX_PROVINCIAS_POR_COMUNIDAD={
  "Andalucía":["Almería","Cádiz","Córdoba","Granada","Huelva","Jaén","Málaga","Sevilla"],
  "Aragón":["Huesca","Teruel","Zaragoza"],
  "Asturias":["Asturias"],
  "Baleares":["Baleares"],
  "Canarias":["Las Palmas","Santa Cruz de Tenerife"],
  "Cantabria":["Cantabria"],
  "Castilla-La Mancha":["Albacete","Ciudad Real","Cuenca","Guadalajara","Toledo"],
  "Castilla y León":["Ávila","Burgos","León","Palencia","Salamanca","Segovia","Soria","Valladolid","Zamora"],
  "Cataluña":["Barcelona","Girona","Lleida","Tarragona"],
  "Comunidad Valenciana":["Alicante","Castellón","Valencia"],
  "Extremadura":["Badajoz","Cáceres"],
  "Galicia":["A Coruña","Lugo","Ourense","Pontevedra"],
  "La Rioja":["La Rioja"],
  "Madrid":["Madrid"],
  "Murcia":["Murcia"],
  "Navarra":["Navarra"],
  "País Vasco":["Álava","Bizkaia","Gipuzkoa"],
  "Ceuta":["Ceuta"],
  "Melilla":["Melilla"]
};

const ZX_COMUNIDADES=["",...Object.keys(ZX_PROVINCIAS_POR_COMUNIDAD)];

const ZX_LOCALIDADES_POR_PROVINCIA={
  "Madrid":["Madrid","Alcalá de Henares","Pozuelo del Rey","Torrejón de Ardoz","Coslada","San Fernando de Henares"],
  "Badajoz":["Badajoz","Mérida","Don Benito","Villanueva de la Serena","Almendralejo","Zafra"],
  "Cáceres":["Cáceres","Plasencia","Navalmoral de la Mata","Coria","Trujillo","Miajadas"]
};

const ZX_CONVENIOS=[
  "",
  "Oficinas",
  "Metal",
  "Construcción",
  "Fontanería",
  "Climatización",
  "Electricidad",
  "Comercio",
  "Hostelería",
  "Transporte",
  "Otro"
];

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
      .limit(1);

    if(res.error || !res.data || !res.data.length){
      alert("No se pudo validar el usuario.");
      return;
    }

    const u=res.data[0];
    const rol=String(u.rol || "").toLowerCase();
    const usuario=String(u.usuario || "").toLowerCase();

    const admin=rol==="administrador" || usuario==="admin";
    const encargado=rol==="encargado";

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

    if(hashPin(pin)!==u.pin_hash){
      alert("PIN incorrecto.");
      return;
    }

    cerrarModal();

    if(typeof callback==="function"){
      callback();
    }
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

function mensajeInterno(){
  alert("Mensajería interna pendiente.");
}

async function cargarUsuarios(){
  const cliente=sb();

  if(!cliente){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">Supabase no conectado.</div>
      </div>
    `;
    return [];
  }

  const res=await cliente
    .from("usuarios")
    .select("*")
    .eq("activo",true)
    .order("nombre",{ascending:true});

  if(res.error){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">${limpiar(res.error.message)}</div>
      </div>
    `;
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
      <div class="zx_text">Directorio interno, contacto, documentación y datos laborales.</div>
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
      if(a==="mensaje") mensajeInterno();

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

  if(window.ZENTRYX_UI_usuarios){
    window.ZENTRYX_UI_usuarios();
  }
};

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function inputNum(id,label,value,step){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="number" step="${step || "1"}" value="${limpiar(value ?? "")}" placeholder="${limpiar(label)}">
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

function selectSimple(id,label,valor,opciones){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <select id="${id}">
      ${opciones.map(function(o){
        return `<option value="${limpiar(o)}" ${String(valor||"")===String(o) ? "selected" : ""}>${limpiar(o || "Seleccionar")}</option>`;
      }).join("")}
    </select>
  `;
}

function selectVia(valor){
  return selectSimple("u_via_tipo","Tipo de vía",valor,[
    "",
    "Calle",
    "Avenida",
    "Plaza",
    "Camino",
    "Carretera",
    "Paseo",
    "Ronda",
    "Travesía",
    "Urbanización",
    "Polígono"
  ]);
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

    ${selectSimple("u_rol","Rol",u.rol,["Administrador","Encargado","Operario","Oficina"])}
    ${selectSimple("u_estado","Estado",u.estado || "Activo",["Activo","Inactivo"])}

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
    .limit(1);

  if(res.error || !res.data || !res.data.length){
    alert("No se pudo cargar el usuario.");
    return;
  }

  formulario(res.data[0]);
}
async function subirFoto(file,usuario){
  if(!file) return null;

  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const limpio=String(usuario || "usuario").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="fotos/"+limpio+"_"+Date.now()+"."+ext;

  const res=await sb().storage
    .from(FOTO_BUCKET)
    .upload(path,file,{upsert:true});

  if(res.error){
    alert("Error subiendo foto: "+res.error.message);
    return null;
  }

  return sb().storage
    .from(FOTO_BUCKET)
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
    datos.created_at=new Date().toISOString();
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
  if(telefono && !/^\+?[0-9]{9,15}$/.test(telefono.replace(/\s/g,""))){alert("Teléfono no válido.");return false}
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
    .limit(1);

  if(dup.error){
    alert("Error comprobando usuario: "+dup.error.message);
    return;
  }

  if(dup.data && dup.data.length && String(dup.data[0].id)!==String(id || "")){
    alert("Ese usuario ya existe.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const nuevaFoto=await subirFoto(file,usuario);
  const datos=datosFormulario(nuevaFoto || fotoActual || null,id);

  let res;

  if(id){
    res=await sb()
      .from("usuarios")
      .update(datos)
      .eq("id",id);
  }else{
    res=await sb()
      .from("usuarios")
      .insert([datos]);
  }

  if(res.error){
    alert("Error guardando: "+res.error.message);
    return;
  }

  actualizarSesionSiEsUsuarioActual(id,datos);

  cerrarModal();
  ZX_usuarios();
}

function actualizarSesionSiEsUsuarioActual(id,datos){
  const s=sesion();

  if(!id || String(s.id||"")!==String(id)) return;

  const nueva={
    ...s,
    usuario:datos.usuario || s.usuario,
    nombre:datos.nombre || s.nombre,
    rol:datos.rol || s.rol
  };

  localStorage.setItem("zentryx_session",JSON.stringify(nueva));
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

  if(!confirm("¿Desactivar usuario "+nombre+"?")) return;

  const res=await sb()
    .from("usuarios")
    .update({
      activo:false,
      estado:"Inactivo",
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(res.error){
    alert("Error desactivando usuario: "+res.error.message);
    return;
  }

  ZX_usuarios();
}
function opcionesProvincias(comunidad,provinciaActual){
  const base=ZX_PROVINCIAS_POR_COMUNIDAD[comunidad] || [];
  const lista=[...base];

  if(provinciaActual && !lista.includes(provinciaActual)){
    lista.unshift(provinciaActual);
  }

  return lista;
}

function opcionesLocalidades(provincia,localidadActual){
  const base=ZX_LOCALIDADES_POR_PROVINCIA[provincia] || [];
  const lista=[...base];

  if(localidadActual && !lista.includes(localidadActual)){
    lista.unshift(localidadActual);
  }

  return lista;
}

function selectLaboral(id,label,valor,opciones){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <select id="${id}">
      ${opciones.map(function(o){
        return `<option value="${limpiar(o)}" ${String(valor||"")===String(o) ? "selected" : ""}>${limpiar(o || "Seleccionar")}</option>`;
      }).join("")}
    </select>
  `;
}

async function cargarLaboralUsuario(usuarioId){
  const h=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .eq("activo",true)
    .limit(1);

  if(!h.error && h.data && h.data.length){
    return normalizarLaboralDesdeHorario(h.data[0]);
  }

  const c=await sb()
    .from("config_laboral")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .limit(1);

  if(!c.error && c.data && c.data.length){
    return normalizarLaboralDesdeConfig(c.data[0]);
  }

  return null;
}

function normalizarLaboralDesdeHorario(h){
  const dias=[
    Number(h.lunes||0),
    Number(h.martes||0),
    Number(h.miercoles||0),
    Number(h.jueves||0),
    Number(h.viernes||0),
    Number(h.sabado||0),
    Number(h.domingo||0)
  ];

  const primerDia=dias.find(x=>x>0) || 480;

  return {
    id:h.id,
    usuario_id:h.usuario_id || h.user_id || "",
    usuario:h.usuario || "",
    nombre:h.nombre || "",
    horas_dia:Number((primerDia/60).toFixed(2)),
    horas_semana:Number((dias.reduce((a,b)=>a+b,0)/60).toFixed(2)),
    trabaja_lunes:dias[0]>0,
    trabaja_martes:dias[1]>0,
    trabaja_miercoles:dias[2]>0,
    trabaja_jueves:dias[3]>0,
    trabaja_viernes:dias[4]>0,
    trabaja_sabado:dias[5]>0,
    trabaja_domingo:dias[6]>0,
    vacaciones_dias:Number(h.vacaciones||30),
    asuntos_propios:Number(h.asuntos_horas || h.asuntos || 0),
    pais:h.pais || "España",
    comunidad:h.comunidad || "",
    provincia:h.provincia || "",
    localidad:h.localidad || "",
    convenio:h.convenio || "",
    precio_extra:Number(h.precio_extra || 0),
    precio_extra_nocturna:Number(h.precio_extra_nocturna || 0),
    precio_extra_festiva:Number(h.precio_extra_festiva || 0)
  };
}

function normalizarLaboralDesdeConfig(c){
  return {
    id:c.id,
    usuario_id:c.usuario_id || "",
    usuario:c.usuario || "",
    nombre:c.nombre || "",
    horas_dia:Number(c.horas_dia || 8),
    horas_semana:Number(c.horas_semana || 40),
    trabaja_lunes:c.trabaja_lunes!==false,
    trabaja_martes:c.trabaja_martes!==false,
    trabaja_miercoles:c.trabaja_miercoles!==false,
    trabaja_jueves:c.trabaja_jueves!==false,
    trabaja_viernes:c.trabaja_viernes!==false,
    trabaja_sabado:c.trabaja_sabado===true,
    trabaja_domingo:c.trabaja_domingo===true,
    vacaciones_dias:Number(c.vacaciones_dias || 30),
    asuntos_propios:Number(c.asuntos_propios || 0),
    pais:c.pais || "España",
    comunidad:c.comunidad || "",
    provincia:c.provincia || "",
    localidad:c.localidad || "",
    convenio:c.convenio || "",
    precio_extra:Number(c.precio_extra || 0),
    precio_extra_nocturna:Number(c.precio_extra_nocturna || 0),
    precio_extra_festiva:Number(c.precio_extra_festiva || 0)
  };
}

function laboralDefault(u){
  return {
    id:null,
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
    pais:u.pais || "España",
    comunidad:"",
    provincia:u.provincia || "",
    localidad:u.poblacion || "",
    convenio:"",
    precio_extra:0,
    precio_extra_nocturna:0,
    precio_extra_festiva:0
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

  const provincias=opcionesProvincias(l.comunidad,l.provincia);
  const localidades=opcionesLocalidades(l.provincia,l.localidad);

  modal("Laboral",`
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    ${resumenLaboral(l)}

    <h3 class="zx_form_subtitle">Jornada</h3>
    ${inputNum("lab_horas_dia","Horas por día",l.horas_dia,"0.25")}
    ${inputNum("lab_horas_semana","Horas por semana",l.horas_semana,"0.25")}

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
    ${inputNum("lab_vacaciones","Vacaciones anuales en días",l.vacaciones_dias,"1")}
    ${inputNum("lab_asuntos","Asuntos propios en horas",l.asuntos_propios,"0.25")}

    <h3 class="zx_form_subtitle">Precios horas extra</h3>
    ${inputNum("lab_precio_extra","Precio hora extra",l.precio_extra,"0.01")}
    ${inputNum("lab_precio_extra_nocturna","Precio hora extra nocturna",l.precio_extra_nocturna,"0.01")}
    ${inputNum("lab_precio_extra_festiva","Precio hora extra festiva",l.precio_extra_festiva,"0.01")}

    <h3 class="zx_form_subtitle">Calendario laboral</h3>
    ${selectLaboral("lab_pais","País",l.pais || "España",["España"])}
    ${selectLaboral("lab_comunidad","Comunidad autónoma",l.comunidad,ZX_COMUNIDADES)}
    ${selectLaboral("lab_provincia","Provincia",l.provincia,["",...provincias])}
    ${selectLaboral("lab_localidad","Localidad",l.localidad,["",...localidades])}

    <h3 class="zx_form_subtitle">Convenio</h3>
    ${selectLaboral("lab_convenio","Convenio",l.convenio,ZX_CONVENIOS)}

    ${editable ? `<button class="zx_btn_big zx_verde" id="lab_guardar">Guardar laboral</button>` : ``}
    <button class="zx_btn_big zx_gris" id="lab_cerrar">Cerrar</button>
  `);

  document.getElementById("lab_cerrar").onclick=cerrarModal;
  activarFiltrosUbicacion();

  const guardar=document.getElementById("lab_guardar");
  if(guardar){
    guardar.onclick=function(){
      const datos=leerDatosLaboralesFormulario(u);
      pedirPinConPermiso("laboral",function(){
        guardarLaboralDatos(datos);
      });
    };
  }
}

function activarFiltrosUbicacion(){
  const comunidad=document.getElementById("lab_comunidad");
  const provincia=document.getElementById("lab_provincia");
  const localidad=document.getElementById("lab_localidad");

  if(!comunidad || !provincia || !localidad) return;

  comunidad.onchange=function(){
    const provincias=opcionesProvincias(comunidad.value,"");

    provincia.innerHTML=[
      `<option value="">Seleccionar</option>`,
      ...provincias.map(p=>`<option value="${limpiar(p)}">${limpiar(p)}</option>`)
    ].join("");

    localidad.innerHTML=`<option value="">Seleccionar</option>`;
  };

  provincia.onchange=function(){
    const localidades=opcionesLocalidades(provincia.value,"");

    localidad.innerHTML=[
      `<option value="">Seleccionar</option>`,
      ...localidades.map(l=>`<option value="${limpiar(l)}">${limpiar(l)}</option>`)
    ].join("");
  };
}

function numVal(id,def){
  const el=document.getElementById(id);
  if(!el) return def;

  const n=Number(String(el.value || "").replace(",","."));
  return Number.isFinite(n) ? n : def;
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

    precio_extra:numVal("lab_precio_extra",0),
    precio_extra_nocturna:numVal("lab_precio_extra_nocturna",0),
    precio_extra_festiva:numVal("lab_precio_extra_festiva",0),

    pais:document.getElementById("lab_pais").value.trim() || "España",
    comunidad:document.getElementById("lab_comunidad").value.trim(),
    provincia:document.getElementById("lab_provincia").value.trim(),
    localidad:document.getElementById("lab_localidad").value.trim(),
    convenio:document.getElementById("lab_convenio").value.trim()
  };
}

async function guardarLaboralDatos(datos){
  const r1=await guardarConfigLaboral(datos);
  if(r1 && r1.error){
    alert("Error guardando config_laboral: "+r1.error.message);
    return;
  }

  const r2=await guardarHorarioUsuario(datos);
  if(r2 && r2.error){
    alert("Error guardando horarios_usuario: "+r2.error.message);
    return;
  }

  alert("Datos laborales guardados.");
  cerrarModal();
  ZX_usuarios();
}

async function guardarConfigLaboral(datos){
  const buscado=await sb()
    .from("config_laboral")
    .select("id")
    .eq("usuario_id",String(datos.usuario_id))
    .limit(1);

  if(buscado.error) return buscado;

  const data={
    usuario_id:String(datos.usuario_id),
    usuario:String(datos.usuario || ""),
    nombre:String(datos.nombre || ""),

    horas_dia:Number(datos.horas_dia || 8),
    horas_semana:Number(datos.horas_semana || 40),

    trabaja_lunes:!!datos.trabaja_lunes,
    trabaja_martes:!!datos.trabaja_martes,
    trabaja_miercoles:!!datos.trabaja_miercoles,
    trabaja_jueves:!!datos.trabaja_jueves,
    trabaja_viernes:!!datos.trabaja_viernes,
    trabaja_sabado:!!datos.trabaja_sabado,
    trabaja_domingo:!!datos.trabaja_domingo,

    vacaciones_dias:Math.round(Number(datos.vacaciones_dias || 0)),
    asuntos_propios:Number(datos.asuntos_propios || 0),

    pais:String(datos.pais || "España"),
    comunidad:String(datos.comunidad || ""),
    provincia:String(datos.provincia || ""),
    localidad:String(datos.localidad || ""),

    convenio:String(datos.convenio || ""),
    precio_extra:Number(datos.precio_extra || 0),
    precio_extra_nocturna:Number(datos.precio_extra_nocturna || 0),
    precio_extra_festiva:Number(datos.precio_extra_festiva || 0),

    updated_at:new Date().toISOString()
  };

  if(buscado.data && buscado.data.length){
    return await sb()
      .from("config_laboral")
      .update(data)
      .eq("id",buscado.data[0].id);
  }

  data.created_at=new Date().toISOString();

  return await sb()
    .from("config_laboral")
    .insert([data]);
}

async function guardarHorarioUsuario(datos){
  const minutosDia=Math.round(Number(datos.horas_dia || 0) * 60);

  const horario={
    user_id:String(datos.usuario_id || ""),
    usuario_id:String(datos.usuario_id || ""),
    usuario:String(datos.usuario || ""),
    nombre:String(datos.nombre || ""),

    trabaja:true,
    activo:true,

    lunes:datos.trabaja_lunes ? minutosDia : 0,
    martes:datos.trabaja_martes ? minutosDia : 0,
    miercoles:datos.trabaja_miercoles ? minutosDia : 0,
    jueves:datos.trabaja_jueves ? minutosDia : 0,
    viernes:datos.trabaja_viernes ? minutosDia : 0,
    sabado:datos.trabaja_sabado ? minutosDia : 0,
    domingo:datos.trabaja_domingo ? minutosDia : 0,

    vacaciones:Math.round(Number(datos.vacaciones_dias || 0)),
    asuntos:Number(datos.asuntos_propios || 0),
    asuntos_horas:Number(datos.asuntos_propios || 0),

    convenio:String(datos.convenio || ""),
    precio_extra:Number(datos.precio_extra || 0),
    precio_extra_nocturna:Number(datos.precio_extra_nocturna || 0),
    precio_extra_festiva:Number(datos.precio_extra_festiva || 0),

    pais:String(datos.pais || "España"),
    comunidad:String(datos.comunidad || ""),
    provincia:String(datos.provincia || ""),
    localidad:String(datos.localidad || ""),

    actualizado_en:new Date().toISOString()
  };

  const buscado=await sb()
    .from("horarios_usuario")
    .select("id")
    .eq("usuario_id",String(datos.usuario_id))
    .eq("activo",true)
    .limit(1);

  if(buscado.error) return buscado;

  if(buscado.data && buscado.data.length){
    return await sb()
      .from("horarios_usuario")
      .update(horario)
      .eq("id",buscado.data[0].id);
  }

  return await sb()
    .from("horarios_usuario")
    .insert([horario]);
}

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
            ${esAdminLocal() ? `<button class="zx_action_btn zx_red" data-doc-del="${limpiar(d.id)}">Borrar</button>` : ""}
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
        creado_por:s.usuario || "",
        created_at:new Date().toISOString()
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

(function estilos(){
  if(document.getElementById("zx_usuarios_v3104")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3104";

  s.innerHTML=`
    .zx_user_card{background:white;border:1px solid #d1d5db;border-radius:24px;padding:22px;margin:18px 0;box-shadow:0 8px 24px rgba(0,0,0,.04);overflow:hidden}
    .zx_user_top{display:grid;grid-template-columns:92px 1fr;gap:18px;align-items:center;margin-bottom:14px}
    .zx_user_avatar{width:92px;height:92px;border-radius:24px;object-fit:cover;background:#e5e7eb}
    .zx_user_avatar_empty{background:linear-gradient(135deg,#2563eb,#10b981);color:white;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900}
    .zx_user_name{font-size:30px;font-weight:900;color:#0f172a;margin-bottom:4px;word-break:break-word}
    .zx_user_sub,.zx_user_phone{color:#64748b;font-size:18px;font-weight:900;line-height:1.35;word-break:break-word}
    .zx_user_data{color:#334155;font-size:18px;line-height:1.55;font-weight:700;word-break:break-word}
    .zx_user_data_small{margin-top:12px}
    .zx_user_details{margin:12px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:12px}
    .zx_user_details summary{color:#2563eb;font-size:18px;font-weight:900;cursor:pointer}
    .zx_user_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .zx_action_btn{border:0;border-radius:16px;background:#e5e7eb;padding:14px;font-size:17px;font-weight:900;color:#111827}
    .zx_blue{background:#2563eb!important;color:white!important}
    .zx_orange{background:#facc15!important;color:#3b2500!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_purple{background:#7c3aed!important;color:white!important}
    .zx_laboral{background:#0f766e!important;color:white!important}
    .zx_laboral_resumen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .zx_laboral_resumen div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:14px;text-align:center}
    .zx_laboral_resumen b{display:block;font-size:28px;font-weight:900;color:#0f172a}
    .zx_laboral_resumen span{display:block;color:#64748b;font-size:14px;font-weight:900;margin-top:4px}
    .zx_checks_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .zx_check{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;font-weight:900;color:#0f172a}
    .zx_check input{width:auto!important;margin:0!important;transform:scale(1.2)}
    .zx_doc_item{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:12px;margin-top:10px}
    .zx_doc_item span{color:#64748b;font-weight:800}

    @media(max-width:430px){
      .zx_user_top{grid-template-columns:76px 1fr;gap:14px}
      .zx_user_avatar{width:76px;height:76px;border-radius:22px}
      .zx_user_name{font-size:28px}
      .zx_user_actions,.zx_doc_item,.zx_checks_grid{grid-template-columns:1fr}
    }
  `;

  document.head.appendChild(s);
})();

})();