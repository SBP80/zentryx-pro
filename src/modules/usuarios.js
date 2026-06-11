// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3110 - BUSCADOR + VISTA COMPACTA
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
  "Madrid":["Madrid","Alcalá de Henares","Pozuelo del Rey","Torrejón de Ardoz","Coslada","San Fernando de Henares","Mejorada del Campo","Loeches","Arganda del Rey","Campo Real","Nuevo Baztán","Valverde de Alcalá"],
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

const ZX_RELACIONES_EMERGENCIA=[
  "",
  "Padre",
  "Madre",
  "Cónyuge",
  "Pareja",
  "Hijo/a",
  "Hermano/a",
  "Familiar",
  "Amigo/a",
  "Otro"
];

let ZX_FILTRO_USUARIOS="activos";
let ZX_BUSQUEDA_USUARIOS="";
let ZX_FILTRO_ROL_USUARIOS="todos";

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
function puedeReactivar(){return esAdminLocal()}

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
    if(accion==="reactivar") ok=admin;
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

  let consulta=cliente
    .from("usuarios")
    .select("*")
    .order("nombre",{ascending:true});

  if(ZX_FILTRO_USUARIOS==="activos"){
    consulta=consulta.eq("activo",true);
  }

  if(ZX_FILTRO_USUARIOS==="inactivos"){
    consulta=consulta.eq("activo",false);
  }

  const res=await consulta;

  if(res.error){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">${limpiar(res.error.message)}</div>
      </div>
    `;
    return [];
  }

  return filtrarUsuarios(res.data || []);
}

function textoUsuarioBuscable(u){
  return [
    u.nombre,
    u.usuario,
    u.dni,
    u.rol,
    u.estado,
    u.telefono_personal,
    u.telefono_empresa,
    u.email_personal,
    u.email_empresa,
    u.emergencia_nombre,
    u.emergencia_telefono,
    u.emergencia_email,
    u.poblacion,
    u.provincia,
    u.pais,
    direccionCompleta(u)
  ].filter(Boolean).join(" ").toLowerCase();
}

function filtrarUsuarios(lista){
  let datos=[...lista];

  const rol=String(ZX_FILTRO_ROL_USUARIOS || "todos").toLowerCase();

  if(rol!=="todos"){
    datos=datos.filter(u=>String(u.rol || "").toLowerCase()===rol);
  }

  const q=String(ZX_BUSQUEDA_USUARIOS || "").trim().toLowerCase();

  if(q){
    datos=datos.filter(u=>textoUsuarioBuscable(u).includes(q));
  }

  return datos;
}
function renderFiltroUsuarios(){
  const roles=["todos","administrador","encargado","operario","oficina"];

  return `
    <div class="zx_user_search_box">
      <input
        id="zx_buscar_usuarios"
        type="search"
        value="${limpiar(ZX_BUSQUEDA_USUARIOS)}"
        placeholder="Buscar usuario, DNI, teléfono, email, población..."
      >

      <button class="zx_btn_big zx_gris" id="zx_limpiar_busqueda_usuarios">
        Limpiar búsqueda
      </button>
    </div>

    <div class="zx_user_filter">
      <button class="${ZX_FILTRO_USUARIOS==="activos" ? "zx_filter_on" : ""}" data-user-filter="activos">Activos</button>
      <button class="${ZX_FILTRO_USUARIOS==="inactivos" ? "zx_filter_on" : ""}" data-user-filter="inactivos">Inactivos</button>
      <button class="${ZX_FILTRO_USUARIOS==="todos" ? "zx_filter_on" : ""}" data-user-filter="todos">Todos</button>
    </div>

    <div class="zx_user_filter zx_user_filter_roles">
      ${roles.map(function(r){
        const txt=r==="todos" ? "Todos los roles" : r.charAt(0).toUpperCase()+r.slice(1);
        return `<button class="${ZX_FILTRO_ROL_USUARIOS===r ? "zx_filter_on" : ""}" data-role-filter="${limpiar(r)}">${limpiar(txt)}</button>`;
      }).join("")}
    </div>
  `;
}

function renderFichaCorta(u){
  const dir=direccionCompleta(u);

  return `
    <div class="zx_user_data zx_user_data_small">
      <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
      <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
      <b>Teléfono personal:</b> ${limpiar(u.telefono_personal || "-")}<br>
      <b>Teléfono empresa:</b> ${limpiar(u.telefono_empresa || "-")}<br>
      <b>Email personal:</b> ${limpiar(u.email_personal || "-")}<br>
      <b>Email empresa:</b> ${limpiar(u.email_empresa || "-")}<br>
      <b>Dirección:</b> ${limpiar(dir || "-")}
    </div>
  `;
}

function tieneEmergencia(u){
  return !!(
    u.emergencia_nombre ||
    u.emergencia_telefono ||
    u.emergencia_email
  );
}

function textoEmergencia(u){
  if(!tieneEmergencia(u)) return "";

  return `
    <div class="zx_emergencia_box">
      <b>Contacto emergencia:</b><br>
      ${limpiar(u.emergencia_nombre || "-")}
      ${u.emergencia_relacion ? " · "+limpiar(u.emergencia_relacion) : ""}<br>
      ${u.emergencia_telefono ? "Teléfono: "+limpiar(u.emergencia_telefono)+"<br>" : ""}
      ${u.emergencia_email ? "Email: "+limpiar(u.emergencia_email)+"<br>" : ""}
      ${u.emergencia_observaciones ? "Notas: "+limpiar(u.emergencia_observaciones) : ""}
    </div>
  `;
}

function renderTelefonosEmails(u){
  return `
    <div class="zx_contact_box">
      <b>Teléfonos y emails</b><br>
      <b>Tel. personal:</b> ${limpiar(u.telefono_personal || "-")}<br>
      <b>Tel. empresa:</b> ${limpiar(u.telefono_empresa || "-")}<br>
      <b>Email personal:</b> ${limpiar(u.email_personal || "-")}<br>
      <b>Email empresa:</b> ${limpiar(u.email_empresa || "-")}
    </div>
  `;
}

function renderDetalleUsuario(u,activo,pinEstado,privado){
  if(!privado){
    return `
      <details class="zx_user_details">
        <summary>Ver ficha</summary>
        ${renderFichaCorta(u)}
      </details>
    `;
  }

  return `
    <details class="zx_user_details">
      <summary>Ver ficha completa</summary>

      <div class="zx_user_data zx_user_data_small">
        <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
        <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
        <b>Dirección:</b> ${limpiar(direccionCompleta(u) || "-")}<br>
        <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
        <b>Estado:</b> ${limpiar(u.estado || "-")}<br>
        <b>Activo:</b> ${activo ? "Sí" : "No"}<br>
        <b>PIN:</b> ${limpiar(pinEstado)}
      </div>

      ${renderTelefonosEmails(u)}
      ${textoEmergencia(u)}
    </details>
  `;
}
function renderUsuario(u){
  const dir=direccionCompleta(u);
  const activo=u.activo!==false;
  const pinEstado=u.debe_crear_pin ? "Pendiente" : "Activo";
  const privado=puedeVerPrivado(u);
  const docs=puedeVerDocs(u);
  const laboral=puedeVerLaboral(u);
  const emergencia=tieneEmergencia(u);
  const telPrincipal=u.telefono_personal || u.telefono_empresa || "";
  const mailPrincipal=u.email_personal || u.email_empresa || "";

  return `
    <div class="zx_user_card ${activo ? "" : "zx_user_inactivo"}">
      <div class="zx_user_top zx_user_top_compact">
        ${avatar(u)}

        <div class="zx_user_main">
          <div class="zx_user_name">${limpiar(u.nombre || u.usuario || "-")}</div>
          <div class="zx_user_sub">${limpiar(u.rol || "-")} · ${limpiar(u.estado || "-")}</div>
          ${telPrincipal ? `<div class="zx_user_phone">${limpiar(telPrincipal)}</div>` : ""}
          ${mailPrincipal ? `<div class="zx_user_mail">${limpiar(mailPrincipal)}</div>` : ""}
        </div>
      </div>

      ${renderDetalleUsuario(u,activo,pinEstado,privado)}

      <div class="zx_user_actions">
        ${telPrincipal ? `<button class="zx_action_btn" data-action="tel" data-tel="${limpiar(telPrincipal)}">Teléfono</button>` : ""}
        ${mailPrincipal ? `<button class="zx_action_btn" data-action="mail" data-email="${limpiar(mailPrincipal)}">Mail</button>` : ""}
        ${dir ? `<button class="zx_action_btn" data-action="mapa" data-dir="${limpiar(dir)}">Mapa</button>` : ""}
        <button class="zx_action_btn zx_purple" data-action="mensaje" data-id="${limpiar(u.id)}">Mensaje</button>
      </div>

      ${
        emergencia
        ? `
          <div class="zx_user_actions">
            ${u.emergencia_telefono ? `<button class="zx_action_btn zx_red" data-action="emergencia_tel" data-tel="${limpiar(u.emergencia_telefono)}">Emergencia</button>` : ""}
            ${u.emergencia_email ? `<button class="zx_action_btn zx_orange" data-action="emergencia_mail" data-email="${limpiar(u.emergencia_email)}">Mail emergencia</button>` : ""}
          </div>
        `
        : ""
      }

      ${
        docs || laboral || puedeEditar() || puedeReset() || puedeEliminar() || puedeReactivar()
        ? `
          <div class="zx_user_actions">
            ${laboral ? `<button class="zx_action_btn zx_laboral" data-action="laboral" data-id="${limpiar(u.id)}">Laboral</button>` : ""}
            ${docs ? `<button class="zx_action_btn zx_blue" data-action="docs" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "Usuario")}">Documentos</button>` : ""}
            ${puedeEditar() ? `<button class="zx_action_btn zx_blue" data-action="editar" data-id="${limpiar(u.id)}">Editar</button>` : ""}
            ${puedeReset() ? `<button class="zx_action_btn zx_orange" data-action="reset" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Reset PIN</button>` : ""}
            ${
              activo
              ? `${puedeEliminar() ? `<button class="zx_action_btn zx_red" data-action="eliminar" data-id="${limpiar(u.id)}" data-usuario="${limpiar(u.usuario || "")}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Desactivar</button>` : ""}`
              : `${puedeReactivar() ? `<button class="zx_action_btn zx_green" data-action="reactivar" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Reactivar</button>` : ""}`
            }
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
      <div class="zx_text">Directorio interno, contacto, documentación, datos laborales y contacto de emergencia.</div>

      ${renderFiltroUsuarios()}

      ${
        puedeCrear()
        ? `<button class="zx_btn_big zx_verde" id="btn_crear_usuario">Crear usuario</button>`
        : ``
      }
    </div>

    <div class="zx_card">
      <h2>Directorio</h2>
      <div class="zx_text">${usuarios.length} usuario(s) encontrados.</div>

      ${
        usuarios.length
        ? usuarios.map(renderUsuario).join("")
        : `<div class="zx_text">No hay usuarios para este filtro o búsqueda.</div>`
      }
    </div>
  `;

  const buscar=document.getElementById("zx_buscar_usuarios");

  if(buscar){
    buscar.oninput=function(){
      ZX_BUSQUEDA_USUARIOS=buscar.value || "";
      clearTimeout(window.ZX_BUSCAR_USUARIOS_TIMER);
      window.ZX_BUSCAR_USUARIOS_TIMER=setTimeout(function(){
        ZX_usuarios();
      },250);
    };
  }

  const limpiarBusqueda=document.getElementById("zx_limpiar_busqueda_usuarios");

  if(limpiarBusqueda){
    limpiarBusqueda.onclick=function(){
      ZX_BUSQUEDA_USUARIOS="";
      ZX_usuarios();
    };
  }

  document.querySelectorAll("[data-user-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_FILTRO_USUARIOS=btn.dataset.userFilter || "activos";
      ZX_usuarios();
    };
  });

  document.querySelectorAll("[data-role-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_FILTRO_ROL_USUARIOS=btn.dataset.roleFilter || "todos";
      ZX_usuarios();
    };
  });

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
      if(a==="emergencia_tel") menuTelefono(btn.dataset.tel);
      if(a==="emergencia_mail") enviarMail(btn.dataset.email);

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
          desactivarUsuario(btn.dataset.id,btn.dataset.nombre,btn.dataset.usuario);
        });
      }

      if(a==="reactivar"){
        pedirPinConPermiso("reactivar",function(){
          reactivarUsuario(btn.dataset.id,btn.dataset.nombre);
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

function inputConLista(id,label,value,datalistId){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" list="${datalistId}" type="text" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
    <datalist id="${datalistId}"></datalist>
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

    <h3 class="zx_form_subtitle">Teléfonos</h3>
    ${input("u_telefono_personal","Teléfono personal",u.telefono_personal,"tel")}
    ${input("u_telefono_empresa","Teléfono empresa",u.telefono_empresa,"tel")}

    <h3 class="zx_form_subtitle">Emails</h3>
    ${input("u_email_personal","Email personal",u.email_personal,"email")}
    ${input("u_email_empresa","Email empresa",u.email_empresa,"email")}

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

    <h3 class="zx_form_subtitle">Contacto de emergencia</h3>
    ${input("u_emergencia_nombre","Nombre completo del contacto",u.emergencia_nombre)}
    ${selectSimple("u_emergencia_relacion","Relación",u.emergencia_relacion,ZX_RELACIONES_EMERGENCIA)}
    ${input("u_emergencia_telefono","Teléfono emergencia",u.emergencia_telefono,"tel")}
    ${input("u_emergencia_email","Email emergencia",u.emergencia_email,"email")}

    <label class="zx_label" for="u_emergencia_observaciones">Observaciones emergencia</label>
    <textarea id="u_emergencia_observaciones" rows="4" placeholder="Observaciones emergencia">${limpiar(u.emergencia_observaciones || "")}</textarea>

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

  const res=await sb().storage.from(FOTO_BUCKET).upload(path,file,{upsert:true});

  if(res.error){
    alert("Error subiendo foto: "+res.error.message);
    return null;
  }

  return sb().storage.from(FOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function datosFormulario(foto_url,id){
  const datos={
    nombre:document.getElementById("u_nombre").value.trim(),
    usuario:document.getElementById("u_usuario").value.trim(),
    dni:document.getElementById("u_dni").value.trim().toUpperCase(),
    telefono_personal:document.getElementById("u_telefono_personal").value.trim(),
    telefono_empresa:document.getElementById("u_telefono_empresa").value.trim(),
    email_personal:document.getElementById("u_email_personal").value.trim().toLowerCase(),
    email_empresa:document.getElementById("u_email_empresa").value.trim().toLowerCase(),
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
    emergencia_nombre:document.getElementById("u_emergencia_nombre").value.trim(),
    emergencia_relacion:document.getElementById("u_emergencia_relacion").value,
    emergencia_telefono:document.getElementById("u_emergencia_telefono").value.trim(),
    emergencia_email:document.getElementById("u_emergencia_email").value.trim().toLowerCase(),
    emergencia_observaciones:document.getElementById("u_emergencia_observaciones").value.trim(),
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

function validarTelefonoFlexible(tel){
  if(!tel) return true;
  return /^\+?[0-9]{9,15}$/.test(String(tel).replace(/\s/g,""));
}

function validarEmailFlexible(email){
  if(!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

function validarFormulario(){
  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();
  const dni=document.getElementById("u_dni").value.trim();
  const cp=document.getElementById("u_codigo_postal").value.trim();

  const telPersonal=document.getElementById("u_telefono_personal").value.trim();
  const telEmpresa=document.getElementById("u_telefono_empresa").value.trim();
  const emailPersonal=document.getElementById("u_email_personal").value.trim();
  const emailEmpresa=document.getElementById("u_email_empresa").value.trim();

  const emNombre=document.getElementById("u_emergencia_nombre").value.trim();
  const emTel=document.getElementById("u_emergencia_telefono").value.trim();
  const emEmail=document.getElementById("u_emergencia_email").value.trim();

  if(!nombre){alert("Nombre obligatorio.");return false}
  if(!usuario){alert("Usuario obligatorio.");return false}
  if(usuario.length<3){alert("Usuario demasiado corto.");return false}
  if(!/^[a-zA-Z0-9_]+$/.test(usuario)){alert("Usuario solo puede tener letras, números y guion bajo.");return false}
  if(dni && !/^[0-9XYZxyz][0-9]{7}[A-Za-z]$/.test(dni)){alert("DNI/NIE no válido.");return false}
  if(!validarTelefonoFlexible(telPersonal)){alert("Teléfono personal no válido.");return false}
  if(!validarTelefonoFlexible(telEmpresa)){alert("Teléfono empresa no válido.");return false}
  if(!validarEmailFlexible(emailPersonal)){alert("Email personal no válido.");return false}
  if(!validarEmailFlexible(emailEmpresa)){alert("Email empresa no válido.");return false}
  if(cp && !/^[0-9]{5}$/.test(cp)){alert("Código postal no válido.");return false}

  if((emTel || emEmail) && !emNombre){
    alert("Si añades contacto de emergencia, indica el nombre de la persona.");
    return false;
  }

  if(!validarTelefonoFlexible(emTel)){alert("Teléfono de emergencia no válido.");return false}
  if(!validarEmailFlexible(emEmail)){alert("Email de emergencia no válido.");return false}

  return true;
}

async function guardarUsuario(id,fotoActual){
  if(!validarFormulario()) return;

  const usuario=document.getElementById("u_usuario").value.trim();

  const dup=await sb().from("usuarios").select("id").eq("usuario",usuario).limit(1);

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

  const res=id
    ? await sb().from("usuarios").update(datos).eq("id",id)
    : await sb().from("usuarios").insert([datos]);

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

  localStorage.setItem("zentryx_session",JSON.stringify({
    ...s,
    usuario:datos.usuario || s.usuario,
    nombre:datos.nombre || s.nombre,
    rol:datos.rol || s.rol
  }));
}

async function resetPin(id,nombre){
  if(!confirm("¿Resetear PIN de "+nombre+"?")) return;

  const res=await sb().from("usuarios").update({
    pin_hash:null,
    debe_crear_pin:true,
    pin_intentos:0,
    pin_bloqueado_hasta:null,
    pin_restaurado_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  }).eq("id",id);

  if(res.error){
    alert("Error reseteando PIN: "+res.error.message);
    return;
  }

  alert("PIN reseteado.");
  ZX_usuarios();
}

async function desactivarUsuario(id,nombre,usuario){
  const s=sesion();

  if(String(usuario || "").toLowerCase()==="admin"){
    alert("No se puede desactivar el administrador principal.");
    return;
  }

  if(String(s.id || "")===String(id)){
    alert("No puedes desactivar tu propio usuario.");
    return;
  }

  if(!confirm("¿Desactivar usuario "+nombre+"?")) return;

  const res=await sb().from("usuarios").update({
    activo:false,
    estado:"Inactivo",
    updated_at:new Date().toISOString()
  }).eq("id",id);

  if(res.error){
    alert("Error desactivando usuario: "+res.error.message);
    return;
  }

  ZX_usuarios();
}

async function reactivarUsuario(id,nombre){
  if(!confirm("¿Reactivar usuario "+nombre+"?")) return;

  const res=await sb().from("usuarios").update({
    activo:true,
    estado:"Activo",
    updated_at:new Date().toISOString()
  }).eq("id",id);

  if(res.error){
    alert("Error reactivando usuario: "+res.error.message);
    return;
  }

  alert("Usuario reactivado.");
  ZX_usuarios();
}

/* Mantén pegado aquí TODO el bloque de V3109 desde:
   function opcionesProvincias(...)
   hasta antes de:
   (function estilos(){...})();
   sin modificarlo.
*/

(function estilos(){
  if(document.getElementById("zx_usuarios_v3110")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3110";

  s.innerHTML=`
    .zx_user_card{background:white;border:1px solid #d1d5db;border-radius:22px;padding:16px;margin:14px 0;box-shadow:0 6px 18px rgba(0,0,0,.04);overflow:hidden}
    .zx_user_inactivo{opacity:.65;border-left:8px solid #dc2626}
    .zx_user_search_box{margin:16px 0}
    .zx_user_search_box input{margin-top:0!important}
    .zx_user_filter{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
    .zx_user_filter_roles{grid-template-columns:repeat(5,1fr)}
    .zx_user_filter button{border:0;border-radius:14px;background:#e5e7eb;color:#111827;padding:11px;font-weight:900;font-size:14px}
    .zx_user_filter .zx_filter_on{background:#2563eb;color:white}
    .zx_user_top{display:grid;grid-template-columns:74px 1fr;gap:14px;align-items:center;margin-bottom:10px}
    .zx_user_avatar{width:74px;height:74px;border-radius:20px;object-fit:cover;background:#e5e7eb}
    .zx_user_avatar_empty{background:linear-gradient(135deg,#2563eb,#10b981);color:white;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900}
    .zx_user_name{font-size:24px;font-weight:900;color:#0f172a;margin-bottom:2px;word-break:break-word}
    .zx_user_sub,.zx_user_phone,.zx_user_mail{color:#64748b;font-size:15px;font-weight:900;line-height:1.3;word-break:break-word}
    .zx_user_data{color:#334155;font-size:16px;line-height:1.5;font-weight:700;word-break:break-word}
    .zx_user_data_small{margin-top:10px}
    .zx_user_details{margin:10px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:10px}
    .zx_user_details summary{color:#2563eb;font-size:16px;font-weight:900;cursor:pointer}
    .zx_user_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .zx_action_btn{border:0;border-radius:14px;background:#e5e7eb;padding:12px;font-size:15px;font-weight:900;color:#111827}
    .zx_blue,.zx_azul{background:#2563eb!important;color:white!important}
    .zx_orange{background:#facc15!important;color:#3b2500!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_green{background:#16a34a!important;color:white!important}
    .zx_purple{background:#7c3aed!important;color:white!important}
    .zx_laboral{background:#0f766e!important;color:white!important}
    .zx_contact_box{background:#f8fafc;border:1px solid #e5e7eb;border-left:8px solid #2563eb;border-radius:16px;padding:12px;margin:12px 0;color:#334155;font-size:15px;font-weight:800;line-height:1.45}
    .zx_emergencia_box{background:#fff1f2;border:1px solid #fecdd3;border-left:8px solid #dc2626;border-radius:16px;padding:12px;margin:12px 0;color:#7f1d1d;font-size:15px;font-weight:800;line-height:1.45}
    .zx_laboral_resumen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .zx_laboral_resumen div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:14px;text-align:center}
    .zx_laboral_resumen b{display:block;font-size:28px;font-weight:900;color:#0f172a}
    .zx_laboral_resumen span{display:block;color:#64748b;font-size:14px;font-weight:900;margin-top:4px}
    .zx_checks_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .zx_check{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;font-weight:900;color:#0f172a}
    .zx_check input{width:auto!important;margin:0!important;transform:scale(1.2)}
    .zx_doc_item{display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:12px;margin-top:10px}
    .zx_doc_item span{color:#64748b;font-weight:800}
    .zx_doc_preview_box{margin-top:14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:10px;overflow:hidden}
    .zx_doc_preview_img{width:100%;border-radius:14px;display:block}
    .zx_doc_preview_pdf{width:100%;height:68vh;border:0;border-radius:14px;background:white}

    @media(max-width:430px){
      .zx_user_top{grid-template-columns:64px 1fr;gap:12px}
      .zx_user_avatar{width:64px;height:64px;border-radius:18px}
      .zx_user_name{font-size:22px}
      .zx_user_actions,.zx_doc_item,.zx_checks_grid,.zx_user_filter,.zx_user_filter_roles{grid-template-columns:1fr}
    }
  `;

  document.head.appendChild(s);
})();

})();