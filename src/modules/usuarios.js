// ===============================
// ZENTRYX PRO - USUARIOS
// V3111 - OFFLINE INSTANTANEO PRO
// V3156 - VALIDACIÓN PIN SEGURA
// V3141 - LIMPIA ETIQUETA DUPLICADA CONVENIO EN LABORAL
// V3144 - NAVEGACIÓN HISTORIAL/AUDITORÍA + IMPRESIÓN CON SALIDA + TEXTOS LEGIBLES
// V3145 - IMPRESIÓN DIRECTA COMPATIBLE CON iPhone/iPad PWA
// V3146 - IMPRESIÓN PDF NATIVA PARA iPhone/iPad PWA
// V3147 - VOLVER DESDE EDITAR REGRESA A LA FICHA DEL MISMO USUARIO
// V3148 - BUSCADOR EMAIL EMPRESA + SINCRONIZACION DE CACHE DE USUARIOS
// V3149 - BUSQUEDA REMOTA DE RESPALDO PARA EMAIL EMPRESA CUANDO LA CACHE LOCAL ESTA ANTIGUA
// V3150 - BUSQUEDA EMAIL REMOTA DIRECTA SIN DEPENDER DE CACHE NI ILIKE
// V3151 - BUSQUEDA EMAIL EMPRESA ROBUSTA + LIMPIEZA DE CARACTERES INVISIBLES
// V3152 - CORRIGE RESULTADO REMOTO VACIO QUE PODIA OCULTAR COINCIDENCIAS LOCALES
// V3153 - BUSCADOR DIRECTO ROBUSTO EN TODOS LOS CAMPOS + EMAIL EMPRESA LITERAL/NORMALIZADO
// V3154 - ACCESO INDIVIDUAL A MÓDULOS
// V3155 - SOLO MÓDULOS ACTIVOS DE EMPRESA EN PERMISOS
// V3156 - LABORAL: FILA ACTIVA ÚNICA + PRECIOS PERSONALES/HEREDADOS DE EMPRESA
// V3157 - LABORAL: CONSERVA PRECIO PROPIO AL USAR BASE DE EMPRESA
// V3158 - LABORAL PRO: HERENCIA DE JORNADA, CONVENIO, VACACIONES, ASUNTOS Y CALENDARIO
// V3160 - CONTROL RETIRADO DE PERMISOS + MEJORAS V3159
// V3163 - RESUMEN LABORAL COMPLETO EN TIEMPO REAL + CACHE OFFLINE SIN CREDENCIALES
// ===============================
(function(){
"use strict";

window.ZX_USUARIOS_VERSION="3162";

const ZX_USUARIOS_CACHE_KEY="zentryx_cache_usuarios";

function zxUsuariosOffline(){
  return typeof navigator!=="undefined" && navigator.onLine===false;
}

function zxUsuariosCacheSeguro(usuario){
  if(!usuario || typeof usuario!=="object" || Array.isArray(usuario)) return usuario;

  const copia={...usuario};
  [
    "pin_hash",
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "token",
    "session_token"
  ].forEach(function(campo){ delete copia[campo]; });

  return copia;
}

function zxUsuariosListaCacheSegura(datos){
  return (Array.isArray(datos) ? datos : []).map(zxUsuariosCacheSeguro);
}

function zxUsuariosLeerCache(){
  try{
    const raw=localStorage.getItem(ZX_USUARIOS_CACHE_KEY);
    const data=raw ? JSON.parse(raw) : [];
    const segura=zxUsuariosListaCacheSegura(data);

    // Limpia también cachés antiguas que pudieran contener pin_hash.
    if(Array.isArray(data) && JSON.stringify(segura)!==JSON.stringify(data)){
      localStorage.setItem(ZX_USUARIOS_CACHE_KEY,JSON.stringify(segura));
    }

    return segura;
  }catch(e){
    return [];
  }
}

function zxUsuariosGuardarCache(datos){
  try{
    localStorage.setItem(ZX_USUARIOS_CACHE_KEY,JSON.stringify(zxUsuariosListaCacheSegura(datos)));
  }catch(e){}
}

// Al cargar el módulo, depura también una caché creada por versiones anteriores.
zxUsuariosLeerCache();

function zxUsuariosActualizarCacheUsuario(usuarioId,datos){
  const id=String(usuarioId || (datos && datos.id) || "");
  if(!id || !datos) return;

  const lista=Array.isArray(ZX_USUARIOS_CACHE) ? ZX_USUARIOS_CACHE.slice() : [];
  const i=lista.findIndex(u=>String((u && u.id) || "")===id);

  if(i>=0){
    lista[i]={...lista[i],...datos,id:lista[i].id || usuarioId};
  }else{
    lista.push({...datos,id:usuarioId});
  }

  ZX_USUARIOS_CACHE=lista;
  zxUsuariosGuardarCache(lista);
}

function zxUsuariosEsErrorRed(e){
  const msg=String((e && (e.message || e.name)) || e || "");
  return zxUsuariosOffline() ||
    (e && (e.name==="ZentryxOffline" || e.name==="ZentryxTimeout")) ||
    /offline|sin conexión|timeout|network|fetch|failed/i.test(msg);
}


const DOC_BUCKET="zentryx-usuarios-docs";
const FOTO_BUCKET="zentryx-usuarios";

let ZX_FILTRO_USUARIOS="activos";
let ZX_BUSQUEDA_USUARIOS="";
let ZX_USUARIOS_CACHE=[];
let ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ=0;
let ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER=null;
let ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
let ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
let ZX_USUARIOS_PERMISOS_EDITANDO={};

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

function normalizarTexto(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function normalizarEmailBusqueda(v){
  let s=String(v ?? "");

  try{
    s=s.normalize("NFKD");
  }catch(e){}

  // Elimina marcas diacríticas, espacios y caracteres de formato/control
  // que pueden quedar guardados de forma invisible al copiar desde iPhone.
  try{
    s=s.replace(/\p{M}+/gu,"")
       .replace(/[\p{Cf}\p{Cc}\p{Z}]+/gu,"");
  }catch(e){
    s=s.replace(/[\u0300-\u036f]/g,"")
       .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFE00-\uFE0F\uFEFF]/g,"")
       .replace(/\s+/g,"");
  }

  return s
    .replace(/[。．｡]/g,".")
    .toLowerCase()
    .trim();
}

function soloNumeros(v){
  return String(v ?? "").replace(/\D/g,"");
}

function fechaES(v){
  if(!v) return "-";
  const d=new Date(v);
  if(Number.isNaN(d.getTime())){
    const s=String(v);
    if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      const p=s.slice(0,10).split("-");
      return p[2]+"/"+p[1]+"/"+p[0];
    }
    return s;
  }

  return String(d.getDate()).padStart(2,"0")+"/"+
         String(d.getMonth()+1).padStart(2,"0")+"/"+
         d.getFullYear();
}

function horaES(v){
  if(!v) return "";
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return "";
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function rolLocal(){return String(sesion().rol || "").toLowerCase()}
function usuarioLocal(){return String(sesion().usuario || "").toLowerCase()}
function esAdminLocal(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esEncargadoLocal(){return rolLocal()==="encargado"}
function esGerenteLocal(){return rolLocal()==="gerente"}
function esSupervisorLocal(){return rolLocal()==="supervisor"}

function idSesion(){return String(sesion().id || "")}
function esMismoUsuario(u){return String(u && u.id || "")===idSesion()}
function esRolGestion(){return esGerenteLocal() || esSupervisorLocal() || esEncargadoLocal()}

function puedeEntrarUsuarios(){return !["invitado",""].includes(rolLocal()) || usuarioLocal()==="admin"}
function puedeCrear(){return esAdminLocal()}
function puedeEditar(){return esAdminLocal()}
function puedeReset(){return esAdminLocal()}
function puedeEliminar(){return esAdminLocal()}
function puedeReactivar(){return esAdminLocal()}
function puedeGestionarDocs(u){return esAdminLocal()}
function puedeSubirDocs(u){return esAdminLocal()}
function puedeBorrarDocs(u){return esAdminLocal()}

const ZX_MODULOS_ASIGNABLES=[
  {id:"fichaje",label:"Fichaje"},
  {id:"agenda",label:"Agenda"},
  {id:"clientes",label:"Clientes"},
  {id:"trabajos",label:"Trabajos"},
  {id:"almacen",label:"Almacén"},
  {id:"usuarios",label:"Usuarios"},
  {id:"vehiculos",label:"Vehículos"},
  {id:"horas_extra",label:"Horas"},
  {id:"manual",label:"Manual"}
];

const ZX_MODULOS_USUARIO_POR_DEFECTO=new Set([
  "fichaje","agenda","clientes","trabajos","manual"
]);

function zxObjeto(v){
  return v && typeof v==="object" && !Array.isArray(v) ? v : {};
}

function zxPermisosUsuario(u){
  return zxObjeto(u && u.permisos);
}

function zxAccesoModuloGuardado(u,id){
  const permisos=zxPermisosUsuario(u);
  const modulos=zxObjeto(permisos.modulos);
  if(Object.prototype.hasOwnProperty.call(modulos,id)) return modulos[id]===true;
  return ZX_MODULOS_USUARIO_POR_DEFECTO.has(id);
}

function zxModuloEmpresaActivo(id){
  try{
    if(window.ZENTRYX && typeof window.ZENTRYX.moduloActivo==="function"){
      return window.ZENTRYX.moduloActivo(id)!==false;
    }

    const cfg=window.ZENTRYX && window.ZENTRYX.config;
    if(cfg && cfg.modulos && Object.prototype.hasOwnProperty.call(cfg.modulos,id)){
      return cfg.modulos[id]!==false;
    }
  }catch(e){}

  // Si la configuración todavía no ha cargado, no ocultamos módulos por error.
  return true;
}

function zxModulosAsignablesActivos(){
  return ZX_MODULOS_ASIGNABLES.filter(function(m){
    return zxModuloEmpresaActivo(m.id);
  });
}

function zxPermisosEditorHTML(u){
  const activos=zxModulosAsignablesActivos();

  return `
    <section class="zx_user_permissions_box" id="zx_user_permissions_editor">
      <div class="zx_user_permissions_head">
        <h3>Acceso a módulos</h3>
        <p>El administrador decide qué módulos puede abrir este usuario. Solo se muestran los módulos activos para la empresa. Los administradores tienen acceso automático a todos los módulos activos.</p>
      </div>
      <div class="zx_user_permissions_grid">
        ${activos.map(function(m){
          const checked=zxAccesoModuloGuardado(u,m.id);
          return `
            <label class="zx_user_permission_item" for="u_perm_${m.id}">
              <span>${limpiar(m.label)}</span>
              <input id="u_perm_${m.id}" type="checkbox" ${checked ? "checked" : ""}>
            </label>
          `;
        }).join("")}
      </div>
      <div class="zx_user_permissions_note">Inicio permanece disponible para todos los usuarios con sesión. Ajustes queda reservado a Administrador. Los módulos desactivados en Ajustes no se muestran aquí.</div>
    </section>
  `;
}

function zxLeerPermisosFormulario(){
  const permisos=JSON.parse(JSON.stringify(zxObjeto(ZX_USUARIOS_PERMISOS_EDITANDO)));
  const modulosPrevios=zxObjeto(permisos.modulos);
  permisos.modulos=Object.assign({},modulosPrevios);
  const rolElegido=normalizarTexto((document.getElementById("u_rol") || {}).value || "");

  ZX_MODULOS_ASIGNABLES.forEach(function(m){
    // Los módulos desactivados para la empresa no aparecen en el formulario y
    // conservan su valor anterior para no alterar permisos al editar otros datos.
    if(!zxModuloEmpresaActivo(m.id)) return;

    const el=document.getElementById("u_perm_"+m.id);
    if(!el) return;
    permisos.modulos[m.id]=rolElegido==="invitado" ? false : !!el.checked;
  });

  // Clave antigua: Control ya forma parte de Fichaje.
  delete permisos.modulos.control_fichajes;

  return permisos;
}

/*
PERMISOS USUARIOS V3134
- Administrador: todo.
- Gerente/Supervisor/Encargado: consulta general, sin modificar usuarios.
- Operario/Técnico/Oficina/Comercial/Administrativo: consulta general, sin modificar usuarios.
- Invitado: sin acceso.
- Documentos personales: administrador o propio usuario.
- Historial/Auditoría: administrador, mandos o propio usuario.
- Laboral: visible en consulta para usuarios con acceso, editable solo administrador.
*/
function puedeVerPrivado(u){
  return esAdminLocal() || esRolGestion() || esMismoUsuario(u);
}

function puedeVerDocs(u){
  return esAdminLocal() || esMismoUsuario(u);
}

function puedeVerDatosPersonales(u){
  return esAdminLocal() || esRolGestion() || esMismoUsuario(u);
}

function puedeVerDatosEmergencia(u){
  return esAdminLocal() || esRolGestion() || esMismoUsuario(u);
}

function puedeVerDatosLaboralesSensibles(u){
  return esAdminLocal() || esGerenteLocal() || esMismoUsuario(u);
}

function puedeVerLaboral(u){
  return esAdminLocal() || esRolGestion() || esMismoUsuario(u);
}

function puedeEditarLaboral(u){
  return esAdminLocal();
}

function puedeVerUsuario(u){
  return puedeEntrarUsuarios();
}

function hashPin(pin){
  return btoa(String(pin));
}

function cerrarModal(){
  const m=document.getElementById("zx_modal");
  if(m) m.remove();
}

function esperarRepintadoTrasModal(){
  return new Promise(function(resolve){
    requestAnimationFrame(function(){
      requestAnimationFrame(resolve);
    });
  });
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

function inicialUsuario(u){
  return limpiar((u.nombre || u.usuario || "?").charAt(0).toUpperCase());
}

function avatar(u){
  if(u.foto_url){
    return `<img class="zx_user_avatar" src="${limpiar(u.foto_url)}" alt="Foto">`;
  }

  return `<div class="zx_user_avatar zx_user_avatar_empty">${inicialUsuario(u)}</div>`;
}

function avatarMini(u){
  if(u.foto_url){
    return `<img class="zx_user_row_avatar" src="${limpiar(u.foto_url)}" alt="Foto">`;
  }

  return `<div class="zx_user_row_avatar zx_user_avatar_empty">${inicialUsuario(u)}</div>`;
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

  document.getElementById("tel_llamar").onclick=()=>location.href="tel:"+n;
  document.getElementById("tel_sms").onclick=()=>location.href="sms:"+n;
  document.getElementById("tel_whatsapp").onclick=()=>location.href="https://wa.me/"+n.replace("+","");
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

  document.getElementById("map_apple").onclick=()=>location.href="https://maps.apple.com/?q="+q;
  document.getElementById("map_google").onclick=()=>location.href="https://www.google.com/maps/search/?api=1&query="+q;
  document.getElementById("map_waze").onclick=()=>location.href="https://waze.com/ul?q="+q;
  document.getElementById("map_cancelar").onclick=cerrarModal;
}

function mensajeInterno(){
  alert("Mensajería interna pendiente.");
}

function claseRol(rol){
  const r=normalizarTexto(rol);

  if(r==="administrador") return "zx_rol_admin";
  if(r==="gerente") return "zx_rol_gerente";
  if(r==="supervisor") return "zx_rol_supervisor";
  if(r==="encargado") return "zx_rol_encargado";
  if(r==="administrativo") return "zx_rol_administ";
  if(r==="comercial") return "zx_rol_comercial";
  if(r==="tecnico") return "zx_rol_tecnico";
  if(r==="operario") return "zx_rol_operario";
  if(r==="invitado") return "zx_rol_invitado";

  return "zx_rol_default";
}

function badgeRol(rol){
  return `<span class="zx_rol_badge ${claseRol(rol)}">${limpiar(rol || "-")}</span>`;
}

function textoBusquedaUsuario(u){
  return normalizarTexto([
    u.nombre,
    u.usuario,
    u.dni,
    u.rol,
    u.estado,
    u.activo===false ? "inactivo inactiva baja" : "activo activa alta",
    u.telefono_personal,
    u.telefono_empresa,
    u.email_personal,
    u.email_empresa,
    u.emergencia_nombre,
    u.emergencia_relacion,
    u.emergencia_telefono,
    u.emergencia_email,
    u.emergencia_observaciones,
    u.via_tipo,
    u.calle,
    u.numero,
    u.portal,
    u.escalera,
    u.piso,
    u.puerta,
    u.poblacion,
    u.provincia,
    u.codigo_postal,
    u.pais,
    direccionCompleta(u)
  ].join(" "));
}

function coincideBusqueda(u,busqueda){
  const original=String(busqueda ?? "").trim();
  if(!original) return true;

  // V3153: primera comprobación literal, sin transformar el contenido del email.
  // Se usa NFC para que caracteres como ñ coincidan aunque iPhone/Safari los
  // entregue con una composición Unicode distinta.
  let qLiteral=original;
  try{ qLiteral=qLiteral.normalize("NFC"); }catch(e){}
  qLiteral=qLiteral.toLowerCase();

  const camposDirectos=[
    u && u.nombre,
    u && u.usuario,
    u && u.dni,
    u && u.rol,
    u && u.estado,
    u && u.telefono_personal,
    u && u.telefono_empresa,
    u && u.email_personal,
    u && u.email_empresa,
    u && u.emergencia_nombre,
    u && u.emergencia_relacion,
    u && u.emergencia_telefono,
    u && u.emergencia_email,
    u && u.emergencia_observaciones,
    u && u.via_tipo,
    u && u.calle,
    u && u.numero,
    u && u.portal,
    u && u.escalera,
    u && u.piso,
    u && u.puerta,
    u && u.poblacion,
    u && u.provincia,
    u && u.codigo_postal,
    u && u.pais,
    direccionCompleta(u || {})
  ];

  for(const valor of camposDirectos){
    if(valor===null || valor===undefined) continue;
    let s=String(valor).trim();
    try{ s=s.normalize("NFC"); }catch(e){}
    if(s.toLowerCase().includes(qLiteral)) return true;
  }

  // Segunda comprobación específica para email. Elimina espacios, marcas
  // diacríticas y caracteres invisibles tanto del texto buscado como del dato.
  const qEmail=normalizarEmailBusqueda(original);
  if(qEmail && qEmail.includes("@")){
    const emailPersonal=normalizarEmailBusqueda(u && u.email_personal);
    const emailEmpresa=normalizarEmailBusqueda(u && u.email_empresa);

    if((emailPersonal && emailPersonal.includes(qEmail)) ||
       (emailEmpresa && emailEmpresa.includes(qEmail))){
      return true;
    }
  }

  // Búsqueda general normalizada para nombres, direcciones y resto de campos.
  const q=normalizarTexto(original);
  const texto=textoBusquedaUsuario(u || {});

  if(texto.includes(q)) return true;

  const palabras=q
    .split(/\s+/)
    .map(p=>p.trim())
    .filter(Boolean);

  if(palabras.length && palabras.every(p=>texto.includes(p))){
    return true;
  }

  const qNumeros=soloNumeros(q);

  if(qNumeros){
    const numeros=soloNumeros([
      u && u.telefono_personal,
      u && u.telefono_empresa,
      u && u.emergencia_telefono,
      u && u.dni,
      u && u.codigo_postal,
      u && u.numero,
      u && u.piso,
      u && u.puerta
    ].join(" "));

    if(numeros.includes(qNumeros)){
      return true;
    }
  }

  return false;
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
    const gerente=rol==="gerente";
    const supervisor=rol==="supervisor";

    let ok=false;

    if(accion==="crear") ok=admin;
    if(accion==="editar") ok=admin;
    if(accion==="reset") ok=admin;
    if(accion==="eliminar") ok=admin;
    if(accion==="reactivar") ok=admin;
    if(accion==="docs") ok=admin;
    if(accion==="laboral") ok=admin;

    if(!ok){
      alert("No tienes permiso.");
      return;
    }

    const seguridad=window.ZENTRYX_SECURITY;
    if(!seguridad || typeof seguridad.verifyPin!=="function"){
      alert("No se pudo cargar el sistema de seguridad del PIN.");
      return;
    }

    const pruebaSesion=typeof seguridad.verifySessionPin==="function"
      ? await seguridad.verifySessionPin(pin)
      : {ok:false,available:false};

    if(pruebaSesion && pruebaSesion.ok){
      cerrarModal();
      await esperarRepintadoTrasModal();
      if(typeof callback==="function") await callback();
      return;
    }

    let hashGuardado=String(u.pin_hash || "");
    try{
      const usuarioLocal=JSON.parse(localStorage.getItem("usuario") || "null");
      if(usuarioLocal && String(usuarioLocal.id || "")===String(u.id || "") && usuarioLocal.pin_hash){
        hashGuardado=String(usuarioLocal.pin_hash);
      }
    }catch(e){}

    let verificacion=null;
    try{
      verificacion=await seguridad.verifyPin(pin,hashGuardado);
      if((!verificacion || !verificacion.ok) && hashGuardado!==String(u.pin_hash || "")){
        verificacion=await seguridad.verifyPin(pin,String(u.pin_hash || ""));
      }
    }catch(e){
      verificacion={ok:false};
    }

    if(!verificacion || !verificacion.ok){
      alert(pruebaSesion && pruebaSesion.available ? "PIN incorrecto." : "Vuelve a iniciar sesión una vez para validar el PIN con el sistema actualizado.");
      return;
    }

    cerrarModal();
    await esperarRepintadoTrasModal();

    if(typeof callback==="function"){
      await callback();
    }
  };
}

async function cargarUsuarios(){
  if(!puedeEntrarUsuarios()){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Usuarios</h2>
        <div class="zx_text">No tienes permiso para acceder a Usuarios.</div>
      </div>
    `;
    return [];
  }

  if(zxUsuariosOffline()){
    ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
    return filtrarUsuariosEnMemoria();
  }

  const cliente=sb();

  if(!cliente){
    ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
    return filtrarUsuariosEnMemoria();
  }

  try{
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
      if(zxUsuariosEsErrorRed(res.error)){
        ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
        return filtrarUsuariosEnMemoria();
      }

      app().innerHTML=`
        <div class="zx_card">
          <h2>Error</h2>
          <div class="zx_text">${limpiar(res.error.message)}</div>
        </div>
      `;
      return [];
    }

    ZX_USUARIOS_CACHE=zxUsuariosListaCacheSegura(res.data || []);
    zxUsuariosGuardarCache(ZX_USUARIOS_CACHE);
    return filtrarUsuariosEnMemoria();
  }catch(e){
    if(zxUsuariosEsErrorRed(e)){
      ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
      return filtrarUsuariosEnMemoria();
    }

    console.warn("Usuarios: error cargando",e);
    ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
    return filtrarUsuariosEnMemoria();
  }
}

function filtrarUsuariosEnMemoria(){
  const q=String(ZX_BUSQUEDA_USUARIOS || "").trim();
  const base=(ZX_USUARIOS_CACHE || []).filter(puedeVerUsuario);

  if(!q){
    return base;
  }

  // V3153: la lista completa cargada es siempre la fuente principal de búsqueda.
  // Un resultado remoto vacío o antiguo nunca puede ocultar una coincidencia
  // que sí existe en los datos cargados (por ejemplo email_empresa).
  let candidatos=base.slice();

  if(Array.isArray(ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS)){
    const vistos=new Set(candidatos.map(u=>String((u && u.id) || "")));
    ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS.forEach(function(u){
      const id=String((u && u.id) || "");
      if(!id || vistos.has(id)) return;
      if(!puedeVerUsuario(u)) return;
      vistos.add(id);
      candidatos.push(u);
    });
  }

  return candidatos.filter(function(u){
    return coincideBusqueda(u,q);
  });
}

function renderListaUsuarios(datos){
  return `
    ${
      datos.length
      ? datos.map(renderUsuario).join("")
      : `
        <div class="zx_card">
          <div class="zx_text">No hay usuarios que coincidan con este filtro o búsqueda.</div>
        </div>
      `
    }
  `;
}

function pintarListaUsuarios(){
  const lista=document.getElementById("zx_usuarios_lista");
  const contador=document.getElementById("zx_usuarios_contador");
  const resumen=document.getElementById("zx_usuarios_resumen_filtro");
  const datos=filtrarUsuariosEnMemoria();

  if(contador){
    contador.textContent=datos.length+" usuario(s)";
  }

  if(resumen){
    resumen.innerHTML=textoResumenFiltroUsuarios(datos.length);
  }

  if(lista){
    lista.innerHTML=renderListaUsuarios(datos);
    conectarAccionesUsuarios(datos);
  }
}

function renderFiltroUsuarios(){
  return `
    <div class="zx_user_toolbar">
      <div class="zx_user_search">
        <input
          id="zx_buscar_usuarios"
          type="search"
          value="${limpiar(ZX_BUSQUEDA_USUARIOS)}"
          placeholder="Buscar usuario, DNI, teléfono, email, localidad..."
          autocomplete="off"
        >

        ${
          ZX_BUSQUEDA_USUARIOS
          ? `<button id="zx_limpiar_busqueda_usuarios" type="button">✕</button>`
          : ``
        }
      </div>

      <div class="zx_user_filter">
        <button class="${ZX_FILTRO_USUARIOS==="activos" ? "zx_filter_on" : ""}" data-user-filter="activos">Activos</button>
        <button class="${ZX_FILTRO_USUARIOS==="inactivos" ? "zx_filter_on" : ""}" data-user-filter="inactivos">Inactivos</button>
        <button class="${ZX_FILTRO_USUARIOS==="todos" ? "zx_filter_on" : ""}" data-user-filter="todos">Todos</button>
      </div>
    </div>
  `;
}

function textoResumenFiltroUsuarios(total){
  const partes=[];

  if(ZX_FILTRO_USUARIOS==="activos") partes.push("Activos");
  if(ZX_FILTRO_USUARIOS==="inactivos") partes.push("Inactivos");
  if(ZX_FILTRO_USUARIOS==="todos") partes.push("Todos");

  if(ZX_BUSQUEDA_USUARIOS.trim()){
    partes.push("Búsqueda: "+ZX_BUSQUEDA_USUARIOS.trim());
  }

  return `${limpiar(total)} resultado(s) · ${limpiar(partes.join(" · "))}`;
}

function renderResumenFiltroUsuarios(total){
  return `
    <div class="zx_user_filter_resume" id="zx_usuarios_resumen_filtro">
      ${textoResumenFiltroUsuarios(total)}
    </div>
  `;
}

function programarBusquedaEmailEmpresaRemota(busqueda){
  if(ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER){
    clearTimeout(ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER);
    ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER=null;
  }

  const original=String(busqueda || "").trim();
  const qEmail=normalizarEmailBusqueda(original);

  if(!qEmail || !qEmail.includes("@")){
    ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ++;
    ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
    ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
    return;
  }

  if(zxUsuariosOffline() || !sb()){
    ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ++;
    ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
    ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
    return;
  }

  const seq=++ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ;

  ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER=setTimeout(async function(){
    ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER=null;

    if(seq!==ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ) return;
    if(normalizarEmailBusqueda(ZX_BUSQUEDA_USUARIOS)!==qEmail) return;

    try{
      // Para búsquedas de email se obtiene la lista directamente del backend
      // y se filtra en el dispositivo. Así no dependemos de una cache antigua
      // ni del comportamiento de ILIKE con caracteres especiales.
      let consulta=sb()
        .from("usuarios")
        .select("*")
        .order("nombre",{ascending:true})
        .limit(500);

      if(ZX_FILTRO_USUARIOS==="activos"){
        consulta=consulta.eq("activo",true);
      }
      if(ZX_FILTRO_USUARIOS==="inactivos"){
        consulta=consulta.eq("activo",false);
      }

      const res=await consulta;

      if(seq!==ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ) return;
      if(normalizarEmailBusqueda(ZX_BUSQUEDA_USUARIOS)!==qEmail) return;
      if(res.error || !Array.isArray(res.data)) return;

      const remotos=res.data.filter(function(u){
        return puedeVerUsuario(u) && coincideBusqueda(u,original);
      });

      // La respuesta remota pasa a ser la fuente de verdad para esta búsqueda.
      ZX_EMAIL_BUSQUEDA_REMOTA_Q=qEmail;
      ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=remotos;

      // Renovamos también la cache general con las filas obtenidas.
      ZX_USUARIOS_CACHE=zxUsuariosListaCacheSegura(res.data.slice());
      zxUsuariosGuardarCache(ZX_USUARIOS_CACHE);

      pintarListaUsuarios();
    }catch(e){
      // Se mantiene el resultado local si la red falla.
    }
  },180);
}

function conectarBuscadorUsuarios(){
  const buscar=document.getElementById("zx_buscar_usuarios");

  if(buscar){
    buscar.oninput=function(){
      const anterior=normalizarEmailBusqueda(ZX_BUSQUEDA_USUARIOS);
      ZX_BUSQUEDA_USUARIOS=buscar.value || "";
      const actual=normalizarEmailBusqueda(ZX_BUSQUEDA_USUARIOS);

      // V3153: al cambiar el texto se invalida cualquier respuesta remota anterior
      // antes de repintar, evitando que un [] antiguo deje la pantalla en 0.
      if(anterior!==actual){
        ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
        ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
      }

      pintarListaUsuarios();
      programarBusquedaEmailEmpresaRemota(ZX_BUSQUEDA_USUARIOS);

      const limpiarBusqueda=document.getElementById("zx_limpiar_busqueda_usuarios");
      if(!limpiarBusqueda && ZX_BUSQUEDA_USUARIOS){
        const caja=buscar.closest(".zx_user_search");
        if(caja){
          caja.insertAdjacentHTML("beforeend",`<button id="zx_limpiar_busqueda_usuarios" type="button">✕</button>`);
          conectarBotonLimpiarBusqueda();
        }
      }

      if(limpiarBusqueda && !ZX_BUSQUEDA_USUARIOS){
        limpiarBusqueda.remove();
      }
    };
  }

  conectarBotonLimpiarBusqueda();

  document.querySelectorAll("[data-user-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_FILTRO_USUARIOS=btn.dataset.userFilter || "activos";
      ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
      ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
      ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ++;
      ZX_usuarios();
    };
  });
}

function conectarBotonLimpiarBusqueda(){
  const limpiarBusqueda=document.getElementById("zx_limpiar_busqueda_usuarios");
  const buscar=document.getElementById("zx_buscar_usuarios");

  if(limpiarBusqueda){
    limpiarBusqueda.onclick=function(){
      ZX_BUSQUEDA_USUARIOS="";
      ZX_EMAIL_BUSQUEDA_REMOTA_Q="";
      ZX_EMAIL_BUSQUEDA_REMOTA_RESULTADOS=null;
      ZX_EMAIL_EMPRESA_BUSQUEDA_SEQ++;
      if(ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER){
        clearTimeout(ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER);
        ZX_EMAIL_EMPRESA_BUSQUEDA_TIMER=null;
      }
      if(buscar) buscar.value="";
      limpiarBusqueda.remove();
      pintarListaUsuarios();
      if(buscar) buscar.focus();
    };
  }
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

function fechaHoraES(v){
  if(!v) return "-";

  try{
    const d=new Date(v);
    if(isNaN(d.getTime())) return "-";

    const dd=String(d.getDate()).padStart(2,"0");
    const mm=String(d.getMonth()+1).padStart(2,"0");
    const yy=d.getFullYear();
    const hh=String(d.getHours()).padStart(2,"0");
    const mi=String(d.getMinutes()).padStart(2,"0");

    return dd+"/"+mm+"/"+yy+" · "+hh+":"+mi;
  }catch(e){
    return "-";
  }
}

function valorUltimoAcceso(u){
  return u.ultimo_acceso ||
         u.last_login ||
         u.last_sign_in_at ||
         u.ultimo_login ||
         u.acceso_ultimo ||
         "";
}

async function cargarUltimoFichajeUsuario(usuarioId){
  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .order("created_at",{ascending:false})
      .limit(1);

    if(!r.error && r.data && r.data.length){
      return r.data[0];
    }
  }catch(e){}

  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("user_id",String(usuarioId))
      .order("created_at",{ascending:false})
      .limit(1);

    if(!r.error && r.data && r.data.length){
      return r.data[0];
    }
  }catch(e){}

  return null;
}

function textoUltimoFichaje(f){
  if(!f) return "-";

  const tipo=f.tipo || f.accion || f.estado || "fichaje";
  const fecha=f.created_at || f.fecha_hora || f.fecha || f.hora || "";

  return String(tipo).replaceAll("_"," ")+" · "+fechaHoraES(fecha);
}

async function consultarTablaUsuario(tabla,usuarioId,limite){
  const campos=["usuario_id","user_id","trabajador_id","empleado_id"];

  for(const campo of campos){
    try{
      const r=await sb()
        .from(tabla)
        .select("*")
        .eq(campo,String(usuarioId))
        .limit(limite || 100);

      if(!r.error){
        return r.data || [];
      }
    }catch(e){}
  }

  return [];
}

async function cargarResumenRapidoUsuario(usuarioId){
  const solicitudes=await consultarTablaUsuario("solicitudes_laborales",usuarioId,80);
  const horas=await consultarTablaUsuario("horas_extra_pro",usuarioId,120);
  const jornadas=await consultarTablaUsuario("jornadas",usuarioId,80);

  const estado=function(x){
    return String(x.estado || x.estado_admin || x.validacion_estado || "").toLowerCase();
  };

  const solicitudesPendientes=solicitudes.filter(s=>estado(s).includes("pend")).length;
  const solicitudesAprobadas=solicitudes.filter(s=>estado(s).includes("aprob")).length;

  const horasPendientes=horas.filter(h=>{
    const e=estado(h);
    return e.includes("pend") || e==="";
  }).length;

  const horasValidadas=horas.filter(h=>{
    const e=estado(h);
    return e.includes("valid") || e.includes("aprob");
  }).length;

  const horasPagadas=horas.filter(h=>{
    const e=estado(h);
    return e.includes("pagad") || e.includes("cobrad");
  }).length;

  const jornadasAbiertas=jornadas.filter(j=>{
    const e=estado(j);
    return e.includes("abierta") || e.includes("abierto") || j.abierta===true || !j.fin;
  }).length;

  return {
    solicitudesPendientes,
    solicitudesAprobadas,
    horasPendientes,
    horasValidadas,
    horasPagadas,
    jornadasAbiertas
  };
}

function zxPdfTextoSeguro(valor){
  const mapa={
    8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,
    710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,
    8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,
    8482:153,353:154,8250:155,339:156,382:158,376:159
  };

  let salida="";
  for(const ch of String(valor ?? "")){
    const cp=ch.codePointAt(0);
    let b;

    if(cp<=255) b=cp;
    else if(Object.prototype.hasOwnProperty.call(mapa,cp)) b=mapa[cp];
    else b=63;

    if(b===10 || b===13 || b===9){
      salida+=" ";
      continue;
    }

    const c=String.fromCharCode(b);
    if(c==="\\" || c==="(" || c===")") salida+="\\"+c;
    else salida+=c;
  }

  return salida;
}

function zxPdfBytes(binario){
  const out=new Uint8Array(binario.length);
  for(let i=0;i<binario.length;i++) out[i]=binario.charCodeAt(i)&255;
  return out;
}

function zxPdfLimpiarTexto(valor){
  return String(valor ?? "")
    .replace(/\s+/g," ")
    .trim();
}

function zxPdfValor(valor,sufijo=""){
  const s=zxPdfLimpiarTexto(valor);
  return s ? s+sufijo : "Sin dato";
}

function zxPdfPartirLinea(texto,maxCaracteres){
  const limpio=zxPdfLimpiarTexto(texto);
  if(!limpio) return [""];

  const palabras=limpio.split(" ");
  const lineas=[];
  let actual="";

  palabras.forEach(function(palabra){
    if(!actual){
      actual=palabra;
      return;
    }

    if((actual+" "+palabra).length<=maxCaracteres){
      actual+=" "+palabra;
    }else{
      lineas.push(actual);
      actual=palabra;
    }
  });

  if(actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function zxPdfDiasLaborales(l){
  if(!l) return "Sin dato";

  const dias=[
    l.trabaja_lunes ? "Lunes" : "",
    l.trabaja_martes ? "Martes" : "",
    l.trabaja_miercoles ? "Miércoles" : "",
    l.trabaja_jueves ? "Jueves" : "",
    l.trabaja_viernes ? "Viernes" : "",
    l.trabaja_sabado ? "Sábado" : "",
    l.trabaja_domingo ? "Domingo" : ""
  ].filter(Boolean);

  return dias.length ? dias.join(", ") : "Sin dato";
}

function zxCrearPdfFichaUsuario(u,ultimoFichaje,resumenRapido,laboral){
  const nombre=zxPdfValor(u && (u.nombre || u.usuario));
  const rol=zxPdfValor(u && u.rol);
  const estado=(u && u.activo!==false) ? "Activo" : "Inactivo";
  const calendario=laboral
    ? [laboral.pais,laboral.comunidad,laboral.provincia,laboral.localidad].filter(Boolean).join(" · ")
    : "";

  const entradas=[];
  const titulo=function(texto){entradas.push({texto:texto,tamano:21,negrita:true,antes:0,despues:12});};
  const seccion=function(texto){entradas.push({texto:texto,tamano:14,negrita:true,antes:12,despues:5});};
  const linea=function(etiqueta,valor){entradas.push({texto:etiqueta+": "+zxPdfValor(valor),tamano:10.5,negrita:false,antes:0,despues:1});};

  titulo("Ficha de usuario");
  entradas.push({texto:nombre,tamano:17,negrita:true,antes:0,despues:3});
  linea("Rol",rol);
  linea("Estado",estado);

  seccion("Resumen");
  linea("Último acceso",fechaHoraES(valorUltimoAcceso(u)));
  linea("Último fichaje",textoUltimoFichaje(ultimoFichaje));
  if(resumenRapido){
    linea("Solicitudes pendientes",resumenRapido.solicitudesPendientes || 0);
    linea("Solicitudes aprobadas",resumenRapido.solicitudesAprobadas || 0);
    linea("Horas extra pendientes",resumenRapido.horasPendientes || 0);
    linea("Horas extra validadas",resumenRapido.horasValidadas || 0);
    linea("Horas extra pagadas/cobradas",resumenRapido.horasPagadas || 0);
    linea("Jornadas abiertas",resumenRapido.jornadasAbiertas || 0);
  }

  if(laboral){
    seccion("Resumen laboral");
    linea("Horas por día",laboral.horas_dia!==null && laboral.horas_dia!==undefined ? zxPdfValor(laboral.horas_dia)+" h" : "Sin dato");
    linea("Horas por semana",laboral.horas_semana!==null && laboral.horas_semana!==undefined ? zxPdfValor(laboral.horas_semana)+" h" : "Sin dato");
    linea("Vacaciones anuales",laboral.vacaciones_dias!==null && laboral.vacaciones_dias!==undefined ? laboral.vacaciones_dias+" días" : "Sin dato");
    linea("Asuntos propios",laboral.asuntos_propios!==null && laboral.asuntos_propios!==undefined ? laboral.asuntos_propios+" h" : "Sin dato");
    linea("Días de trabajo",zxPdfDiasLaborales(laboral));
    linea("Calendario",calendario || "Sin dato");
    linea("Convenio",laboral.convenio || "Sin dato");
  }

  seccion("Datos de contacto");
  linea("Teléfono de empresa",u && u.telefono_empresa);
  linea("Email de empresa",u && u.email_empresa);

  if(puedeVerDatosPersonales(u)){
    linea("Teléfono personal",u && u.telefono_personal);
    linea("Email personal",u && u.email_personal);

    seccion("Datos personales");
    linea("Usuario",u && u.usuario);
    linea("DNI / NIE",u && u.dni);

    seccion("Dirección");
    entradas.push({texto:zxPdfValor(direccionCompleta(u)),tamano:10.5,negrita:false,antes:0,despues:1});
  }

  if(puedeVerDatosEmergencia(u) && tieneEmergencia(u)){
    seccion("Contacto de emergencia");
    linea("Nombre",u && u.emergencia_nombre);
    linea("Relación",u && u.emergencia_relacion);
    linea("Teléfono",u && u.emergencia_telefono);
    linea("Email",u && u.emergencia_email);
    if(u && u.emergencia_observaciones) linea("Observaciones",u.emergencia_observaciones);
  }

  const paginas=[[]];
  let pagina=paginas[0];
  let y=800;
  const margenInferior=48;

  const nuevaPagina=function(){
    pagina=[];
    paginas.push(pagina);
    y=800;
  };

  entradas.forEach(function(e){
    const tamano=Number(e.tamano || 10.5);
    const alto=Math.max(14,tamano*1.35);
    const max=Math.max(32,Math.floor(94*(10.5/tamano)));
    const lineas=zxPdfPartirLinea(e.texto,max);
    const espacioAntes=Number(e.antes || 0);
    const espacioDespues=Number(e.despues || 0);

    if(y-espacioAntes-(lineas.length*alto)-espacioDespues<margenInferior) nuevaPagina();
    y-=espacioAntes;

    lineas.forEach(function(txt){
      pagina.push({texto:txt,x:44,y:y,tamano:tamano,negrita:!!e.negrita});
      y-=alto;
    });

    y-=espacioDespues;
  });

  const objetos=[];
  objetos[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objetos[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objetos[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  const kids=[];
  paginas.forEach(function(comandos,indice){
    const paginaObj=5+(indice*2);
    const contenidoObj=paginaObj+1;
    kids.push(paginaObj+' 0 R');

    let stream='';
    comandos.forEach(function(c){
      const fuente=c.negrita ? 'F2' : 'F1';
      stream+='BT /'+fuente+' '+c.tamano+' Tf 1 0 0 1 '+c.x+' '+c.y+' Tm ('+zxPdfTextoSeguro(c.texto)+') Tj ET\n';
    });

    objetos[paginaObj]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contenidoObj+' 0 R >>';
    objetos[contenidoObj]='<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream';
  });

  objetos[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+paginas.length+' >>';

  let pdf='%PDF-1.4\n%âãÏÓ\n';
  const offsets=[0];
  const maxObj=objetos.length-1;

  for(let i=1;i<=maxObj;i++){
    offsets[i]=pdf.length;
    pdf+=i+' 0 obj\n'+objetos[i]+'\nendobj\n';
  }

  const xref=pdf.length;
  pdf+='xref\n0 '+(maxObj+1)+'\n';
  pdf+='0000000000 65535 f \n';

  for(let i=1;i<=maxObj;i++){
    pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  }

  pdf+='trailer\n<< /Size '+(maxObj+1)+' /Root 1 0 R >>\n';
  pdf+='startxref\n'+xref+'\n%%EOF';

  return new Blob([zxPdfBytes(pdf)],{type:'application/pdf'});
}

function zxNombreArchivoFicha(u){
  const base=String((u && (u.nombre || u.usuario)) || 'usuario')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'_')
    .replace(/^_+|_+$/g,'');

  return 'Ficha_'+(base || 'usuario')+'.pdf';
}

async function imprimirFichaActual(u,ultimoFichaje,resumenRapido,laboral){
  let pdf;

  try{
    pdf=zxCrearPdfFichaUsuario(u,ultimoFichaje,resumenRapido,laboral);
  }catch(e){
    console.error('Error creando PDF de usuario',e);
    alert('No se pudo preparar la ficha para imprimir.');
    return;
  }

  const nombreArchivo=zxNombreArchivoFicha(u);
  let archivo=null;

  try{
    archivo=new File([pdf],nombreArchivo,{type:'application/pdf'});
  }catch(e){}

  // En iPhone/iPad instalado como PWA, window.print() puede no abrir nada.
  // La hoja nativa de iOS sí permite trabajar con un PDF real y desde ella
  // puede elegirse Imprimir, Guardar en Archivos, Mail, etc.
  if(archivo && navigator.share){
    try{
      const datos={
        title:'Ficha de usuario',
        text:'Ficha de '+String((u && (u.nombre || u.usuario)) || 'usuario'),
        files:[archivo]
      };

      if(!navigator.canShare || navigator.canShare({files:[archivo]})){
        await navigator.share(datos);
        return;
      }
    }catch(e){
      if(e && e.name==='AbortError') return;
      console.warn('No se pudo abrir la hoja de compartir para impresión',e);
    }
  }

  // Respaldo para equipos donde compartir archivos no esté disponible:
  // abrir el PDF real para usar las opciones de impresión del navegador.
  const url=URL.createObjectURL(pdf);
  const ventana=window.open(url,'_blank');

  if(!ventana){
    const a=document.createElement('a');
    a.href=url;
    a.download=nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  setTimeout(function(){
    try{URL.revokeObjectURL(url)}catch(e){}
  },60000);
}

function renderResumenLaboralFicha(l){
  if(!l) return "";

  const dias=[
    l.trabaja_lunes ? "L" : "",
    l.trabaja_martes ? "M" : "",
    l.trabaja_miercoles ? "X" : "",
    l.trabaja_jueves ? "J" : "",
    l.trabaja_viernes ? "V" : "",
    l.trabaja_sabado ? "S" : "",
    l.trabaja_domingo ? "D" : ""
  ].filter(Boolean).join(" ");

  return `
    <div class="zx_ficha_bloque zx_ficha_laboral_mini">
      <h3>Resumen laboral</h3>

      <div class="zx_ficha_laboral_grid">
        <div>
          <span>Horas/día</span>
          <b>${limpiar(l.horas_dia ?? "-")} ${l.horas_dia!==null && l.horas_dia!==undefined ? "h" : ""}</b>
        </div>

        <div>
          <span>Horas/semana</span>
          <b>${limpiar(l.horas_semana ?? "-")} ${l.horas_semana!==null && l.horas_semana!==undefined ? "h" : ""}</b>
        </div>

        <div>
          <span>Vacaciones</span>
          <b>${limpiar(l.vacaciones_dias ?? "-")} ${l.vacaciones_dias!==null && l.vacaciones_dias!==undefined ? "días" : ""}</b>
        </div>

        <div>
          <span>Asuntos propios</span>
          <b>${limpiar(l.asuntos_propios ?? "-")} ${l.asuntos_propios!==null && l.asuntos_propios!==undefined ? "h" : ""}</b>
        </div>
      </div>

      <div class="zx_ficha_laboral_linea">
        <b>Días:</b> ${limpiar(dias || "-")}
      </div>

      <div class="zx_ficha_laboral_linea">
        <b>Calendario:</b> ${limpiar([l.pais,l.comunidad,l.provincia,l.localidad].filter(Boolean).join(" · ") || "-")}
      </div>

      <div class="zx_ficha_laboral_linea">
        <b>Convenio:</b> ${limpiar(l.convenio || "-")}
      </div>
    </div>
  `;
}

function renderResumenRapidoFicha(r){
  if(!r) return "";

  return `
    <div class="zx_ficha_resumen_rapido">
      <div>
        <span>Solicitudes pendientes</span>
        <b>${limpiar(r.solicitudesPendientes || 0)}</b>
      </div>

      <div>
        <span>Solicitudes aprobadas</span>
        <b>${limpiar(r.solicitudesAprobadas || 0)}</b>
      </div>

      <div>
        <span>Horas extra pendientes</span>
        <b>${limpiar(r.horasPendientes || 0)}</b>
      </div>

      <div>
        <span>Horas extra validadas</span>
        <b>${limpiar(r.horasValidadas || 0)}</b>
      </div>

      <div>
        <span>Horas extra pagadas/cobradas</span>
        <b>${limpiar(r.horasPagadas || 0)}</b>
      </div>

      <div class="${Number(r.jornadasAbiertas || 0)>0 ? "zx_resumen_alerta" : ""}">
        <span>Jornadas abiertas</span>
        <b>${limpiar(r.jornadasAbiertas || 0)}</b>
      </div>
    </div>
  `;
}

function renderIndicadoresFicha(u,ultimoFichaje){
  const activo=u.activo!==false;
  const ultimoAcceso=valorUltimoAcceso(u);

  return `
    <div class="zx_ficha_indicadores">
      <div class="${activo ? "zx_ind_ok" : "zx_ind_bad"}">
        <span>Estado</span>
        <b>${activo ? "Activo" : "Inactivo"}</b>
      </div>

      <div>
        <span>Último acceso</span>
        <b>${limpiar(fechaHoraES(ultimoAcceso))}</b>
      </div>

      <div>
        <span>Último fichaje</span>
        <b>${limpiar(textoUltimoFichaje(ultimoFichaje))}</b>
      </div>
    </div>
  `;
}

function renderFichaUsuario(u,ultimoFichaje,resumenRapido,resumenLaboralMini){
  const activo=u.activo!==false;
  const pinEstado=u.debe_crear_pin ? "Pendiente" : "Activo";
  const verPersonales=puedeVerDatosPersonales(u);
  const verPrivado=puedeVerPrivado(u);
  const verLaboral=puedeVerLaboral(u);
  const verEmergencia=puedeVerDatosEmergencia(u);

  return `
    <div class="zx_ficha_usuario">
      <div class="zx_ficha_head">
        ${avatar(u)}
        <div>
          <div class="zx_ficha_nombre">${limpiar(u.nombre || u.usuario || "-")}</div>
          <div class="zx_ficha_meta">${badgeRol(u.rol)} <span>${limpiar(u.estado || "-")}</span></div>
        </div>
      </div>

      ${verPrivado ? renderIndicadoresFicha(u,ultimoFichaje) : ""}

      ${
        verPrivado
        ? renderResumenRapidoFicha(resumenRapido)
        : ""
      }

      ${
        verLaboral
        ? renderResumenLaboralFicha(resumenLaboralMini)
        : ""
      }

      <div class="zx_ficha_bloque">
        <h3>Datos visibles</h3>
        <div class="zx_user_data">
          <b>Nombre:</b> ${limpiar(u.nombre || "-")}<br>
          <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
          <b>Tel. empresa:</b> ${limpiar(u.telefono_empresa || "-")}<br>
          <b>Email empresa:</b> ${limpiar(u.email_empresa || "-")}
        </div>
      </div>

      ${
        verPersonales
        ? `
          <div class="zx_ficha_bloque">
            <h3>Datos personales</h3>
            <div class="zx_user_data">
              <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
              <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
              <b>Activo:</b> ${activo ? "Sí" : "No"}<br>
              <b>PIN:</b> ${limpiar(pinEstado)}
            </div>
          </div>

          <div class="zx_ficha_bloque">
            <h3>Contacto personal</h3>
            <div class="zx_contact_box">
              <b>Tel. personal:</b> ${limpiar(u.telefono_personal || "-")}<br>
              <b>Email personal:</b> ${limpiar(u.email_personal || "-")}
            </div>
          </div>

          <div class="zx_ficha_bloque">
            <h3>Dirección</h3>
            <div class="zx_user_data">${limpiar(direccionCompleta(u) || "-")}</div>
          </div>
        `
        : `
          <div class="zx_privacidad_box">
            Vista limitada por permisos.
          </div>
        `
      }

      ${verEmergencia ? textoEmergencia(u) : ""}
    </div>
  `;
}

function renderUsuario(u){
  const activo=u.activo!==false;
  const telefono=u.telefono_personal || u.telefono_empresa || "";

  return `
    <div class="zx_user_row ${activo ? "" : "zx_user_inactivo"}">
      <div class="zx_user_row_main">
        ${avatarMini(u)}

        <div class="zx_user_row_info">
          <div class="zx_user_row_name">${limpiar(u.nombre || u.usuario || "-")}</div>
          <div class="zx_user_row_meta">${badgeRol(u.rol)} <span>${limpiar(u.estado || "-")}</span></div>
          ${telefono ? `<div class="zx_user_row_phone">${limpiar(telefono)}</div>` : ""}
        </div>

        <button class="zx_user_open_btn" data-action="abrir_ficha" data-id="${limpiar(u.id)}">
          Abrir
        </button>
      </div>
    </div>
  `;
}

async function abrirFichaUsuario(u){
  if(!puedeVerUsuario(u)){
    alert("No tienes permiso para abrir esta ficha.");
    return;
  }

  const dir=direccionCompleta(u);
  const activo=u.activo!==false;
  const ultimoFichaje=await cargarUltimoFichajeUsuario(u.id);
  const resumenRapido=await cargarResumenRapidoUsuario(u.id);
  const resumenLaboralMini=await cargarLaboralUsuario(u.id);

  modal("Ficha de usuario",`
    <div class="zx_user_top_actions">
      <button type="button" class="zx_user_top_back" id="f_volver_top">← Volver</button>
      ${puedeEditar() ? `<button type="button" class="zx_user_top_primary" id="f_editar_top">✏️ Editar</button>` : ``}
    </div>

    ${renderFichaUsuario(u,ultimoFichaje,resumenRapido,resumenLaboralMini)}

    <div class="zx_ficha_acciones">
      ${puedeVerDatosPersonales(u) && u.telefono_personal ? `<button class="zx_action_btn" id="f_tel_personal">Tel. personal</button>` : ""}
      ${u.telefono_empresa ? `<button class="zx_action_btn" id="f_tel_empresa">Tel. empresa</button>` : ""}
      ${puedeVerDatosPersonales(u) && u.email_personal ? `<button class="zx_action_btn" id="f_mail_personal">Email personal</button>` : ""}
      ${u.email_empresa ? `<button class="zx_action_btn" id="f_mail_empresa">Email empresa</button>` : ""}
      ${puedeVerDatosPersonales(u) && dir ? `<button class="zx_action_btn" id="f_mapa">Mapa</button>` : ""}
      ${puedeVerDatosEmergencia(u) && u.emergencia_telefono ? `<button class="zx_action_btn zx_red" id="f_emergencia_tel">Emergencia</button>` : ""}
      ${puedeVerDatosEmergencia(u) && u.emergencia_email ? `<button class="zx_action_btn zx_orange" id="f_emergencia_mail">Mail emergencia</button>` : ""}
    </div>

    <div class="zx_ficha_acciones">
      ${puedeVerLaboral(u) ? `<button class="zx_action_btn zx_laboral" id="f_laboral">Laboral</button>` : ""}
      ${puedeVerDocs(u) ? `<button class="zx_action_btn zx_blue" id="f_dni">DNI</button>` : ""}
      ${puedeVerDocs(u) ? `<button class="zx_action_btn zx_blue" id="f_docs">Documentos</button>` : ""}
      ${puedeVerPrivado(u) ? `<button class="zx_action_btn zx_purple" id="f_historial">Historial</button>` : ""}
      ${puedeVerPrivado(u) ? `<button class="zx_action_btn zx_purple" id="f_auditoria">Auditoría</button>` : ""}
      <button class="zx_action_btn zx_green" id="f_imprimir">Imprimir ficha</button>
      ${puedeReset() ? `<button class="zx_action_btn zx_orange" id="f_reset">Reset PIN</button>` : ""}
      ${
        activo
        ? `${puedeEliminar() ? `<button class="zx_action_btn zx_red" id="f_desactivar">Desactivar</button>` : ""}`
        : `${puedeReactivar() ? `<button class="zx_action_btn zx_green" id="f_reactivar">Reactivar</button>` : ""}`
      }
    </div>

  `);

  const asignar=function(id,fn){
    const el=document.getElementById(id);
    if(el) el.onclick=fn;
  };

  asignar("f_volver_top",cerrarModal);
  asignar("f_editar_top",()=>pedirPinConPermiso("editar",()=>editarUsuario(u.id)));
  asignar("f_tel_personal",()=>menuTelefono(u.telefono_personal));
  asignar("f_tel_empresa",()=>menuTelefono(u.telefono_empresa));
  asignar("f_mail_personal",()=>enviarMail(u.email_personal));
  asignar("f_mail_empresa",()=>enviarMail(u.email_empresa));
  asignar("f_mapa",()=>menuMapa(dir));
  asignar("f_emergencia_tel",()=>menuTelefono(u.emergencia_telefono));
  asignar("f_emergencia_mail",()=>enviarMail(u.emergencia_email));
  asignar("f_laboral",()=>verLaboralUsuario(u));
  asignar("f_dni",()=>verDniUsuario(u));
  asignar("f_docs",()=>verDocumentosUsuario(u,"ficha"));
  asignar("f_historial",()=>verHistorialUsuario(u));
  asignar("f_auditoria",()=>verAuditoriaUsuario(u));
  asignar("f_imprimir",()=>imprimirFichaActual(u,ultimoFichaje,resumenRapido,resumenLaboralMini));
  asignar("f_reset",()=>pedirPinConPermiso("reset",()=>resetPin(u.id,u.nombre || u.usuario || "usuario")));
  asignar("f_desactivar",()=>pedirPinConPermiso("eliminar",()=>desactivarUsuario(u.id,u.nombre || u.usuario || "usuario",u.usuario)));
  asignar("f_reactivar",()=>pedirPinConPermiso("reactivar",()=>reactivarUsuario(u.id,u.nombre || u.usuario || "usuario")));
}

function renderUsuariosPantalla(usuarios){
  app().innerHTML=`
    <div class="zx_card zx_usuarios_head">
      <div class="zx_usuarios_head_top">
        <div>
          <h2>Usuarios</h2>
          <div class="zx_text" id="zx_usuarios_contador">${usuarios.length} usuario(s)</div>
        </div>

        ${
          puedeCrear()
          ? `<button class="zx_btn_mini zx_verde" id="btn_crear_usuario">Crear</button>`
          : ``
        }
      </div>

      ${renderFiltroUsuarios()}

      ${renderResumenFiltroUsuarios(usuarios.length)}
    </div>

    <div class="zx_usuarios_lista" id="zx_usuarios_lista">
      ${renderListaUsuarios(usuarios)}
    </div>
  `;

  conectarBuscadorUsuarios();

  const crear=document.getElementById("btn_crear_usuario");

  if(crear){
    crear.onclick=function(){
      pedirPinConPermiso("crear",function(){
        formulario({});
      });
    };
  }

  conectarAccionesUsuarios(usuarios);
}

window.ZENTRYX_UI_usuarios=async function(){
  if(zxUsuariosOffline()){
    ZX_USUARIOS_CACHE=zxUsuariosLeerCache();
    renderUsuariosPantalla(filtrarUsuariosEnMemoria());
    return;
  }

  renderUsuariosPantalla(ZX_USUARIOS_CACHE.length ? filtrarUsuariosEnMemoria() : zxUsuariosLeerCache());

  const usuarios=await cargarUsuarios();
  renderUsuariosPantalla(usuarios);
};

function conectarAccionesUsuarios(usuarios){
  document.querySelectorAll("[data-action]").forEach(function(btn){
    btn.onclick=function(){
      const a=btn.dataset.action;
      const u=usuarios.find(x=>String(x.id)===String(btn.dataset.id));

      if(a==="abrir_ficha" && u){
        abrirFichaUsuario(u);
      }
    };
  });
}

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

function inputNum(id,label,value,step,unidad){
  const sufijo=String(unidad||"").trim();
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <div class="zx_num_unit_wrap">
      <input id="${id}" type="number" step="${step || "1"}" value="${limpiar(value ?? "")}" placeholder="${limpiar(label)}">
      ${sufijo ? `<span class="zx_num_unit">${limpiar(sufijo)}</span>` : ""}
    </div>
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
  ZX_USUARIOS_PERMISOS_EDITANDO=JSON.parse(JSON.stringify(zxPermisosUsuario(u)));

  modal(editando ? "Editar usuario" : "Crear usuario",`
    <div class="zx_user_top_actions">
      <button type="button" class="zx_user_top_back" id="btn_cancelar_usuario_top">← Volver</button>
      <button type="button" class="zx_user_top_primary" id="btn_guardar_usuario_top">💾 ${editando ? "Guardar" : "Crear"}</button>
    </div>

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

    ${selectSimple("u_rol","Rol",u.rol,[
      "Administrador",
      "Gerente",
      "Supervisor",
      "Encargado",
      "Administrativo",
      "Comercial",
      "Técnico",
      "Operario",
      "Oficina",
      "Invitado"
    ])}

    ${zxPermisosEditorHTML(u)}

    ${selectSimple("u_estado","Estado",u.estado || "Activo",["Activo","Inactivo"])}

  `);

  const guardarActual=function(){
    guardarUsuario(u.id || null,u.foto_url || null);
  };

  const cancelarArriba=document.getElementById("btn_cancelar_usuario_top");
  const guardarArriba=document.getElementById("btn_guardar_usuario_top");

  if(cancelarArriba){
    cancelarArriba.onclick=function(){
      if(editando){
        abrirFichaUsuario(u);
      }else{
        cerrarModal();
      }
    };
  }
  if(guardarArriba) guardarArriba.onclick=guardarActual;
}

async function editarUsuario(id){
  if(!puedeEditar()){
    alert("No tienes permiso para editar usuarios.");
    return;
  }

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

    permisos:zxLeerPermisosFormulario(),
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

function camposAuditablesUsuario(){
  return [
    "nombre",
    "usuario",
    "dni",
    "telefono_personal",
    "telefono_empresa",
    "email_personal",
    "email_empresa",
    "via_tipo",
    "calle",
    "numero",
    "portal",
    "escalera",
    "piso",
    "puerta",
    "poblacion",
    "provincia",
    "codigo_postal",
    "pais",
    "emergencia_nombre",
    "emergencia_relacion",
    "emergencia_telefono",
    "emergencia_email",
    "permisos",
    "rol",
    "estado",
    "activo"
  ];
}

function calcularCambiosUsuario(antes,despues){
  const cambios=[];

  camposAuditablesUsuario().forEach(function(campo){
    const valorAntes=(antes && antes[campo]) ?? "";
    const valorDespues=(despues && despues[campo]) ?? "";
    const a=typeof valorAntes==="object" ? JSON.stringify(valorAntes || {}) : String(valorAntes);
    const b=typeof valorDespues==="object" ? JSON.stringify(valorDespues || {}) : String(valorDespues);

    if(a!==b){
      cambios.push({
        campo,
        antes:a,
        despues:b
      });
    }
  });

  return cambios;
}

async function registrarAuditoriaUsuario(usuarioId,accion,cambios){
  const s=sesion();
  const detalle=JSON.stringify(cambios || []);
  const ahora=new Date().toISOString();

  const fila={
    usuario_id:String(usuarioId || ""),
    fecha:ahora,
    accion:String(accion || ""),
    detalle,
    realizado_por:s.usuario || "",
    realizado_por_id:s.id || null,
    created_at:ahora
  };

  const r=await sb()
    .from("usuarios_auditoria")
    .insert([fila]);

  if(r.error){
    alert("Error guardando auditoría: "+r.error.message);
    console.error("AUDITORIA ERROR:",r.error,fila);
    return false;
  }

  return true;
}

async function cargarUsuarioAntesDeGuardar(id){
  if(!id) return null;

  try{
    const r=await sb()
      .from("usuarios")
      .select("*")
      .eq("id",id)
      .limit(1);

    if(!r.error && r.data && r.data.length){
      return r.data[0];
    }
  }catch(e){}

  return null;
}

async function guardarUsuario(id,fotoActual){
  if(id && !puedeEditar()){
    alert("No tienes permiso para editar usuarios.");
    return;
  }

  if(!id && !puedeCrear()){
    alert("No tienes permiso para crear usuarios.");
    return;
  }

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

  const antes=await cargarUsuarioAntesDeGuardar(id);

  const file=document.getElementById("u_foto").files[0] || null;
  const nuevaFoto=await subirFoto(file,usuario);
  const datos=datosFormulario(nuevaFoto || fotoActual || null,id);

  const res=id
    ? await sb().from("usuarios").update(datos).eq("id",id)
    : await sb().from("usuarios").insert([datos]).select("id").limit(1);

  if(res.error){
    alert("Error guardando: "+res.error.message);
    return;
  }

  const usuarioId=id || (res.data && res.data[0] ? res.data[0].id : "");

  // Mantener la copia local al día con todos los campos guardados.
  // Es importante para que las búsquedas sigan funcionando aunque la
  // siguiente lectura de red use temporalmente la cache.
  zxUsuariosActualizarCacheUsuario(usuarioId,{...datos,id:usuarioId});

  if(id){
    const cambios=calcularCambiosUsuario(antes,datos);
    if(cambios.length){
      await registrarAuditoriaUsuario(usuarioId,"editar_usuario",cambios);
    }
  }else{
    await registrarAuditoriaUsuario(usuarioId,"crear_usuario",[{campo:"usuario",antes:"",despues:datos.usuario || ""}]);
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
    rol:datos.rol || s.rol,
    permisos:datos.permisos && typeof datos.permisos==="object" ? datos.permisos : (s.permisos || {})
  }));
}

async function resetPin(id,nombre){
  if(!puedeReset()){
    alert("No tienes permiso para resetear PIN.");
    return;
  }

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

  await registrarAuditoriaUsuario(id,"reset_pin",[{campo:"pin",antes:"activo",despues:"pendiente"}]);

  alert("PIN reseteado.");
  ZX_usuarios();
}

async function desactivarUsuario(id,nombre,usuario){
  if(!puedeEliminar()){
    alert("No tienes permiso para desactivar usuarios.");
    return;
  }

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

  await registrarAuditoriaUsuario(id,"desactivar_usuario",[{campo:"activo",antes:"true",despues:"false"}]);

  ZX_usuarios();
}

async function reactivarUsuario(id,nombre){
  if(!puedeReactivar()){
    alert("No tienes permiso para reactivar usuarios.");
    return;
  }

  if(!confirm("¿Reactivar usuario "+nombre+"?")) return;

  const res=await sb()
    .from("usuarios")
    .update({
      activo:true,
      estado:"Activo",
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(res.error){
    alert("Error reactivando usuario: "+res.error.message);
    return;
  }

  await registrarAuditoriaUsuario(id,"reactivar_usuario",[{campo:"activo",antes:"false",despues:"true"}]);

  alert("Usuario reactivado.");
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
  return selectSimple(id,label,valor,opciones);
}

async function cargarBackupPreciosLaborales(usuarioId){
  try{
    const r=await sb()
      .from("config_laboral")
      .select("precio_extra,precio_extra_nocturna,precio_extra_festiva,updated_at")
      .eq("usuario_id",String(usuarioId))
      .order("updated_at",{ascending:false})
      .limit(1);

    if(!r.error && r.data && r.data.length) return r.data[0];
  }catch(e){}

  return null;
}

function aplicarBackupPreciosLaborales(l,backup){
  const out=Object.assign({},l || {});

  const propio=function(campo,hereda){
    const actual=Number(out[campo] ?? 0);
    if(!hereda) return Number.isFinite(actual) ? actual : 0;

    if(backup && backup[campo]!==null && backup[campo]!==undefined){
      const b=Number(backup[campo]);
      if(Number.isFinite(b)) return b;
    }

    return Number.isFinite(actual) ? actual : 0;
  };

  out.precio_propio_extra=propio("precio_extra",out.hereda_precio_extra===true);
  out.precio_propio_extra_nocturna=propio("precio_extra_nocturna",out.hereda_precio_extra_nocturna===true);
  out.precio_propio_extra_festiva=propio("precio_extra_festiva",out.hereda_precio_extra_festiva===true);

  return out;
}

async function cargarLaboralUsuario(usuarioId){
  const core=window.ZENTRYX_LABORAL;
  const basePromise=(core && typeof core.cargarBaseEmpresa==="function") ? core.cargarBaseEmpresa() : Promise.resolve({});
  const efectivoPromise=(core && typeof core.resolverUsuario==="function") ? core.resolverUsuario(usuarioId) : Promise.resolve(null);
  const backupPromise=cargarBackupPreciosLaborales(usuarioId);

  let h=await sb().from("horarios_usuario").select("*").eq("usuario_id",String(usuarioId)).eq("activo",true).order("actualizado_en",{ascending:false}).limit(1);
  if((h.error || !h.data || !h.data.length)){
    const h2=await sb().from("horarios_usuario").select("*").eq("user_id",String(usuarioId)).eq("activo",true).order("actualizado_en",{ascending:false}).limit(1);
    if(!h2.error && h2.data && h2.data.length) h=h2;
  }

  const [base,efectivo,backup]=await Promise.all([basePromise,efectivoPromise,backupPromise]);

  if(!h.error && h.data && h.data.length){
    return normalizarLaboralDesdeHorario(h.data[0],backup,base,efectivo);
  }

  if(backup){
    const c=await sb().from("config_laboral").select("*").eq("usuario_id",String(usuarioId)).order("updated_at",{ascending:false}).limit(1);
    if(!c.error && c.data && c.data.length){
      return aplicarBackupPreciosLaborales(normalizarLaboralDesdeConfig(c.data[0],base,efectivo),c.data[0]);
    }
  }

  return null;
}

function normalizarLaboralDesdeHorario(h,backup,baseEmpresa,efectivo){
  const base=baseEmpresa || {};
  const meta=(h && h.laboral_meta && typeof h.laboral_meta==="object" && !Array.isArray(h.laboral_meta)) ? h.laboral_meta : {};
  const metaActiva=meta.inicializado===true || Number(meta.version||0)>=1;
  const diasNombres=["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
  const fila={}; diasNombres.forEach(k=>fila[k]=Number(h[k]??0));
  const jornadaMeta=meta.jornada_propia && typeof meta.jornada_propia==="object" ? meta.jornada_propia : {};
  const jornadaPropia={};
  diasNombres.forEach(k=>jornadaPropia[k]=Number(metaActiva && jornadaMeta[k]!==undefined ? jornadaMeta[k] : fila[k]));

  const conv=metaActiva && meta.convenio_propio && typeof meta.convenio_propio==="object" ? meta.convenio_propio : {};
  const vac=metaActiva && meta.vacaciones_propias && typeof meta.vacaciones_propias==="object" ? meta.vacaciones_propias : {};
  const cal=metaActiva && meta.calendario_propio && typeof meta.calendario_propio==="object" ? meta.calendario_propio : {};
  const ef=efectivo || {};
  const diasEf=diasNombres.map(k=>Number(ef[k]!==undefined ? ef[k] : fila[k]));
  const primerDia=diasEf.find(x=>x>0) || 0;
  const suma=diasEf.reduce((a,b)=>a+b,0);

  const out={
    id:h.id,
    usuario_id:h.usuario_id || h.user_id || "",
    usuario:h.usuario || "",
    nombre:h.nombre || "",
    horas_dia:Number((primerDia/60).toFixed(2)),
    horas_semana:Number((suma/60).toFixed(2)),
    trabaja_lunes:diasEf[0]>0,trabaja_martes:diasEf[1]>0,trabaja_miercoles:diasEf[2]>0,trabaja_jueves:diasEf[3]>0,trabaja_viernes:diasEf[4]>0,trabaja_sabado:diasEf[5]>0,trabaja_domingo:diasEf[6]>0,
    jornada_propia:jornadaPropia,
    hereda_jornada:metaActiva ? meta.hereda_jornada===true : false,

    convenio:String(ef.convenio ?? h.convenio ?? ""),
    convenio_referencia:String(ef.convenio_referencia ?? ""),
    convenio_vigencia_desde:String(ef.convenio_vigencia_desde ?? ""),
    convenio_vigencia_hasta:String(ef.convenio_vigencia_hasta ?? ""),
    convenio_propio:String(metaActiva ? (conv.nombre ?? h.convenio ?? "") : (h.convenio ?? "")),
    convenio_propio_referencia:String(metaActiva ? (conv.referencia ?? "") : ""),
    convenio_propio_desde:String(metaActiva ? (conv.vigencia_desde ?? "") : ""),
    convenio_propio_hasta:String(metaActiva ? (conv.vigencia_hasta ?? "") : ""),
    hereda_convenio:metaActiva ? meta.hereda_convenio===true : false,

    vacaciones_dias:Number(ef.vacaciones ?? h.vacaciones ?? 30),
    vacaciones_tipo:String(ef.vacaciones_tipo || base.vacaciones_tipo || "naturales"),
    vacaciones_propias:Number(metaActiva ? (vac.dias ?? h.vacaciones ?? 30) : (h.vacaciones ?? 30)),
    vacaciones_propias_tipo:String(metaActiva ? (vac.tipo || base.vacaciones_tipo || "naturales") : (base.vacaciones_tipo || "naturales")),
    hereda_vacaciones:metaActiva ? meta.hereda_vacaciones===true : false,

    asuntos_propios:Number(ef.asuntos_horas ?? h.asuntos_horas ?? h.asuntos ?? 0),
    asuntos_propios_personal:Number(metaActiva ? (meta.asuntos_propios_horas ?? h.asuntos_horas ?? h.asuntos ?? 0) : (h.asuntos_horas ?? h.asuntos ?? 0)),
    hereda_asuntos:metaActiva ? meta.hereda_asuntos===true : false,

    pais:String(ef.pais ?? h.pais ?? "España"),comunidad:String(ef.comunidad ?? h.comunidad ?? ""),provincia:String(ef.provincia ?? h.provincia ?? ""),localidad:String(ef.localidad ?? h.localidad ?? ""),
    calendario_propio:{
      pais:String(metaActiva ? (cal.pais ?? h.pais ?? "España") : (h.pais ?? "España")),
      pais_codigo:String(metaActiva ? (cal.pais_codigo ?? "") : ""),
      comunidad:String(metaActiva ? (cal.comunidad ?? h.comunidad ?? "") : (h.comunidad ?? "")),
      provincia:String(metaActiva ? (cal.provincia ?? h.provincia ?? "") : (h.provincia ?? "")),
      localidad:String(metaActiva ? (cal.localidad ?? h.localidad ?? "") : (h.localidad ?? ""))
    },
    hereda_calendario:metaActiva ? meta.hereda_calendario===true : false,

    precio_extra:Number(h.precio_extra ?? 0),precio_extra_nocturna:Number(h.precio_extra_nocturna ?? 0),precio_extra_festiva:Number(h.precio_extra_festiva ?? 0),
    precio_propio_extra:Number(h.precio_extra ?? 0),precio_propio_extra_nocturna:Number(h.precio_extra_nocturna ?? 0),precio_propio_extra_festiva:Number(h.precio_extra_festiva ?? 0),
    hereda_precio_extra:h.precio_extra===null || h.precio_extra===undefined,
    hereda_precio_extra_nocturna:h.precio_extra_nocturna===null || h.precio_extra_nocturna===undefined,
    hereda_precio_extra_festiva:h.precio_extra_festiva===null || h.precio_extra_festiva===undefined,
    _base_empresa:base,
    _meta_inicializada:metaActiva
  };

  return aplicarBackupPreciosLaborales(out,backup);
}

function normalizarLaboralDesdeConfig(c,baseEmpresa,efectivo){
  const base=baseEmpresa || {};
  const dias={
    lunes:c.trabaja_lunes!==false ? Number(c.horas_dia||8)*60 : 0,
    martes:c.trabaja_martes!==false ? Number(c.horas_dia||8)*60 : 0,
    miercoles:c.trabaja_miercoles!==false ? Number(c.horas_dia||8)*60 : 0,
    jueves:c.trabaja_jueves!==false ? Number(c.horas_dia||8)*60 : 0,
    viernes:c.trabaja_viernes!==false ? Number(c.horas_dia||8)*60 : 0,
    sabado:c.trabaja_sabado===true ? Number(c.horas_dia||8)*60 : 0,
    domingo:c.trabaja_domingo===true ? Number(c.horas_dia||8)*60 : 0
  };
  const ef=efectivo || {};
  return {
    id:c.id,usuario_id:c.usuario_id||"",usuario:c.usuario||"",nombre:c.nombre||"",
    horas_dia:Number(c.horas_dia||8),horas_semana:Number(c.horas_semana||40),
    trabaja_lunes:dias.lunes>0,trabaja_martes:dias.martes>0,trabaja_miercoles:dias.miercoles>0,trabaja_jueves:dias.jueves>0,trabaja_viernes:dias.viernes>0,trabaja_sabado:dias.sabado>0,trabaja_domingo:dias.domingo>0,
    jornada_propia:dias,hereda_jornada:false,
    vacaciones_dias:Number(c.vacaciones_dias||30),vacaciones_tipo:String(base.vacaciones_tipo||"naturales"),vacaciones_propias:Number(c.vacaciones_dias||30),vacaciones_propias_tipo:String(base.vacaciones_tipo||"naturales"),hereda_vacaciones:false,
    asuntos_propios:Number(c.asuntos_propios||0),asuntos_propios_personal:Number(c.asuntos_propios||0),hereda_asuntos:false,
    pais:c.pais||"España",comunidad:c.comunidad||"",provincia:c.provincia||"",localidad:c.localidad||"",
    calendario_propio:{pais:c.pais||"España",pais_codigo:"",comunidad:c.comunidad||"",provincia:c.provincia||"",localidad:c.localidad||""},hereda_calendario:false,
    convenio:c.convenio||"",convenio_referencia:"",convenio_vigencia_desde:"",convenio_vigencia_hasta:"",convenio_propio:c.convenio||"",convenio_propio_referencia:"",convenio_propio_desde:"",convenio_propio_hasta:"",hereda_convenio:false,
    precio_extra:Number(c.precio_extra||0),precio_extra_nocturna:Number(c.precio_extra_nocturna||0),precio_extra_festiva:Number(c.precio_extra_festiva||0),
    precio_propio_extra:Number(c.precio_extra||0),precio_propio_extra_nocturna:Number(c.precio_extra_nocturna||0),precio_propio_extra_festiva:Number(c.precio_extra_festiva||0),
    hereda_precio_extra:false,hereda_precio_extra_nocturna:false,hereda_precio_extra_festiva:false,
    _base_empresa:base,_meta_inicializada:false
  };
}

function laboralDefault(u,baseEmpresa){
  const b=baseEmpresa || {lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,horas_semana:40,convenio:"",vacaciones:30,vacaciones_tipo:"naturales",asuntos_horas:0,pais:"España",comunidad:"",provincia:"",localidad:""};
  const dias={}; ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>dias[k]=Number(b[k]||0));
  const total=Object.values(dias).reduce((a,n)=>a+Number(n||0),0)/60;
  const primer=Object.values(dias).find(n=>Number(n)>0) || 0;
  return {
    id:null,usuario_id:String(u.id||""),usuario:u.usuario||"",nombre:u.nombre||"",
    horas_dia:Number((primer/60).toFixed(2)),horas_semana:Number(total.toFixed(2)),
    trabaja_lunes:dias.lunes>0,trabaja_martes:dias.martes>0,trabaja_miercoles:dias.miercoles>0,trabaja_jueves:dias.jueves>0,trabaja_viernes:dias.viernes>0,trabaja_sabado:dias.sabado>0,trabaja_domingo:dias.domingo>0,
    jornada_propia:Object.assign({},dias),hereda_jornada:true,
    vacaciones_dias:Number(b.vacaciones??30),vacaciones_tipo:String(b.vacaciones_tipo||"naturales"),vacaciones_propias:Number(b.vacaciones??30),vacaciones_propias_tipo:String(b.vacaciones_tipo||"naturales"),hereda_vacaciones:true,
    asuntos_propios:Number(b.asuntos_horas??0),asuntos_propios_personal:Number(b.asuntos_horas??0),hereda_asuntos:true,
    pais:b.pais||u.pais||"España",comunidad:b.comunidad||"",provincia:b.provincia||u.provincia||"",localidad:b.localidad||u.poblacion||"",
    calendario_propio:{pais:b.pais||u.pais||"España",pais_codigo:b.pais_codigo||"",comunidad:b.comunidad||"",provincia:b.provincia||u.provincia||"",localidad:b.localidad||u.poblacion||""},hereda_calendario:true,
    convenio:b.convenio||"",convenio_referencia:b.convenio_referencia||"",convenio_vigencia_desde:b.convenio_vigencia_desde||"",convenio_vigencia_hasta:b.convenio_vigencia_hasta||"",
    convenio_propio:b.convenio||"",convenio_propio_referencia:b.convenio_referencia||"",convenio_propio_desde:b.convenio_vigencia_desde||"",convenio_propio_hasta:b.convenio_vigencia_hasta||"",hereda_convenio:true,
    precio_extra:Number(b.precio_extra||0),precio_extra_nocturna:Number(b.precio_extra_nocturna||0),precio_extra_festiva:Number(b.precio_extra_festiva||0),
    precio_propio_extra:0,precio_propio_extra_nocturna:0,precio_propio_extra_festiva:0,
    hereda_precio_extra:true,hereda_precio_extra_nocturna:true,hereda_precio_extra_festiva:true,_base_empresa:b,_meta_inicializada:true
  };
}

function resumenLaboral(l,consumo){
  const bloqueConsumo=consumo ? renderResumenConsumo(l,consumo) : "";

  return `
    <div class="zx_laboral_resumen">
      <div><b id="lab_res_horas_dia">${limpiar(l.horas_dia ?? 0)} h</b><span>Horas/día</span></div>
      <div><b id="lab_res_horas_semana">${limpiar(l.horas_semana ?? 0)} h</b><span>Horas/semana</span></div>
      <div><b id="lab_res_vacaciones">${limpiar(l.vacaciones_dias ?? 0)} días</b><span>Vacaciones asignadas</span></div>
      <div><b id="lab_res_asuntos">${limpiar(l.asuntos_propios ?? 0)} h</b><span>Asuntos propios asignados</span></div>
    </div>

    ${bloqueConsumo}
  `;
}

function cargarDatalistLocalidades(provincia,valorActual){
  const dl=document.getElementById("lab_localidad_lista");
  if(!dl) return;

  const lista=opcionesLocalidades(provincia,valorActual);

  dl.innerHTML=lista.map(function(l){
    return `<option value="${limpiar(l)}"></option>`;
  }).join("");
}

function fechaSolicitud(s){
  return s.fecha || s.fecha_inicio || s.desde || s.inicio || s.created_at || "";
}

function fechaFinSolicitud(s){
  return s.fecha_fin || s.hasta || s.fin || s.fecha || s.fecha_inicio || s.desde || s.inicio || "";
}

function horasSolicitud(s){
  const h=Number(s.horas || s.total_horas || s.asuntos_horas || s.duracion_horas || 0);
  if(Number.isFinite(h) && h>0) return h;

  const tipo=tipoSolicitudNormalizado(s.tipo || s.categoria || "");
  if(tipo.includes("asuntos")){
    return diasEntreFechas(fechaSolicitud(s),fechaFinSolicitud(s))*8;
  }

  return 0;
}

function etiquetaTipoSolicitud(tipo){
  const t=tipoSolicitudNormalizado(tipo);

  if(t.includes("vacacion")) return "Vacaciones";
  if(t.includes("asuntos")) return "Asuntos propios";
  if(t.includes("baja")) return "Baja";
  if(t.includes("permiso")) return "Permiso";
  if(t.includes("ausencia")) return "Ausencia";

  return String(tipo || "Solicitud").replaceAll("_"," ");
}

function renderHistorialLaboral(solicitudes){
  const lista=(solicitudes || [])
    .slice()
    .sort(function(a,b){
      return String(fechaSolicitud(b)).localeCompare(String(fechaSolicitud(a)));
    })
    .slice(0,12);

  if(!lista.length){
    return `
      <h3 class="zx_form_subtitle">Historial laboral</h3>
      <div class="zx_text">Sin solicitudes laborales registradas.</div>
    `;
  }

  return `
    <h3 class="zx_form_subtitle">Historial laboral</h3>
    <div class="zx_solicitudes_laboral_lista">
      ${lista.map(function(s){
        const tipo=etiquetaTipoSolicitud(s.tipo || s.categoria || "");
        const estado=String(s.estado || "-").replaceAll("_"," ");
        const ini=fechaSolicitud(s);
        const fin=fechaFinSolicitud(s);
        const dias=diasEntreFechas(ini,fin);
        const horas=horasSolicitud(s);

        let detalle="";

        if(tipo==="Asuntos propios"){
          detalle=textoHorasLaboral(horas);
        }else if(dias>0){
          detalle=textoNumeroLaboral(dias)+" día"+(dias===1 ? "" : "s");
        }

        return `
          <div class="zx_solicitud_laboral_item">
            <div>
              <b>${limpiar(tipo)}</b>
              <span>${limpiar(fechaES(ini))}${fin && fechaISO(fin)!==fechaISO(ini) ? " - "+limpiar(fechaES(fin)) : ""}</span>
            </div>

            <div>
              <em>${limpiar(estado)}</em>
              ${detalle ? `<span>${limpiar(detalle)}</span>` : ``}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}


const ZX_LAB_DIAS_PRO=[
  ["lunes","Lunes"],["martes","Martes"],["miercoles","Miércoles"],["jueves","Jueves"],["viernes","Viernes"],["sabado","Sábado"],["domingo","Domingo"]
];
function zxLabMinutosTexto(min){
  const n=Math.max(0,Math.round(Number(min)||0)),h=Math.floor(n/60),m=n%60;
  return h+" h "+String(m).padStart(2,"0")+" min";
}
function zxLabTotalDias(dias){return ZX_LAB_DIAS_PRO.reduce((n,x)=>n+Number((dias||{})[x[0]]||0),0)}
function zxLabHorasInput(min){return Number((Number(min||0)/60).toFixed(2))}
function zxLabResumenCalendario(c){return [c?.pais,c?.comunidad,c?.provincia,c?.localidad].filter(Boolean).join(" · ") || "Sin ubicación"}
function zxLabTipoVacaciones(t){return String(t||"naturales")==="laborables" ? "laborables" : "naturales"}
function zxLabCampoTexto(id,label,value,type){
  return `<label class="zx_label" for="${id}">${limpiar(label)}</label><input id="${id}" type="${type||"text"}" value="${limpiar(value||"")}" placeholder="${limpiar(label)}">`;
}
function zxLabBloque(id,html){return `<div id="${id}" style="padding:12px;border:1px solid #dbe4ef;border-radius:18px;margin:8px 0 14px;background:rgba(248,250,252,.72)">${html}</div>`}
function zxLabDeshabilitar(ids,disabled){
  ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.disabled=!!disabled;el.style.opacity=disabled?".62":"1";el.setAttribute("aria-disabled",disabled?"true":"false")});
}
function zxLabRefrescarTotalPropio(){
  let total=0;
  ZX_LAB_DIAS_PRO.forEach(([k])=>{total+=Math.round(numVal("lab_j_"+k,0)*60)});
  const el=document.getElementById("lab_total_propio"); if(el)el.textContent=zxLabMinutosTexto(total);
}
function zxLabRefrescarResumenJornada(baseEmpresa){
  const hereda=document.getElementById("lab_hereda_jornada")?.checked===true;
  let minutos=[];
  if(hereda){
    minutos=ZX_LAB_DIAS_PRO.map(([k])=>Math.max(0,Number((baseEmpresa||{})[k]||0)));
  }else{
    minutos=ZX_LAB_DIAS_PRO.map(([k])=>Math.max(0,Math.round(numVal("lab_j_"+k,0)*60)));
  }
  const total=minutos.reduce((a,n)=>a+n,0);
  const primer=minutos.find(n=>n>0)||0;
  const dia=document.getElementById("lab_res_horas_dia");
  const semana=document.getElementById("lab_res_horas_semana");
  if(dia)dia.textContent=limpiar(Number((primer/60).toFixed(2)))+" h";
  if(semana)semana.textContent=limpiar(Number((total/60).toFixed(2)))+" h";
}
function zxLabRefrescarResumenVacaciones(baseEmpresa){
  const hereda=document.getElementById("lab_hereda_vacaciones")?.checked===true;
  const valor=hereda ? Number((baseEmpresa||{}).vacaciones||0) : numVal("lab_vacaciones",0);
  const el=document.getElementById("lab_res_vacaciones");
  if(el)el.textContent=limpiar(valor)+" días";
}
function zxLabRefrescarResumenAsuntos(baseEmpresa){
  const hereda=document.getElementById("lab_hereda_asuntos")?.checked===true;
  const valor=hereda ? Number((baseEmpresa||{}).asuntos_horas||0) : numVal("lab_asuntos",0);
  const el=document.getElementById("lab_res_asuntos");
  if(el)el.textContent=limpiar(valor)+" h";
}
function activarHerenciasLaboralPro(baseEmpresa){
  const grupos=[
    ["lab_hereda_jornada",ZX_LAB_DIAS_PRO.map(([k])=>"lab_j_"+k)],
    ["lab_hereda_convenio",["lab_convenio","lab_convenio_ref","lab_convenio_desde","lab_convenio_hasta"]],
    ["lab_hereda_vacaciones",["lab_vacaciones","lab_vacaciones_tipo"]],
    ["lab_hereda_asuntos",["lab_asuntos"]],
    ["lab_hereda_calendario",["lab_pais","lab_comunidad","lab_provincia","lab_localidad"]]
  ];
  grupos.forEach(([checkId,ids])=>{
    const c=document.getElementById(checkId); if(!c)return;
    const f=()=>{
      zxLabDeshabilitar(ids,c.checked===true);
      if(checkId==="lab_hereda_jornada")zxLabRefrescarResumenJornada(baseEmpresa);
      if(checkId==="lab_hereda_vacaciones")zxLabRefrescarResumenVacaciones(baseEmpresa);
      if(checkId==="lab_hereda_asuntos")zxLabRefrescarResumenAsuntos(baseEmpresa);
    };
    c.onchange=f;f();
  });
  ZX_LAB_DIAS_PRO.forEach(([k])=>{
    const el=document.getElementById("lab_j_"+k);
    if(el)el.addEventListener("input",()=>{zxLabRefrescarTotalPropio();zxLabRefrescarResumenJornada(baseEmpresa)});
  });
  document.getElementById("lab_vacaciones")?.addEventListener("input",()=>zxLabRefrescarResumenVacaciones(baseEmpresa));
  document.getElementById("lab_asuntos")?.addEventListener("input",()=>zxLabRefrescarResumenAsuntos(baseEmpresa));
  zxLabRefrescarTotalPropio();
  zxLabRefrescarResumenJornada(baseEmpresa);
  zxLabRefrescarResumenVacaciones(baseEmpresa);
  zxLabRefrescarResumenAsuntos(baseEmpresa);
}

async function verLaboralUsuario(u){
  if(!puedeVerLaboral(u)){alert("No tienes permiso para ver laboral.");return;}

  let baseEmpresa={lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,horas_semana:40,convenio:"",vacaciones:30,vacaciones_tipo:"naturales",asuntos_horas:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,pais:"España",comunidad:"",provincia:"",localidad:""};
  try{if(window.ZENTRYX_LABORAL?.cargarBaseEmpresa)baseEmpresa=Object.assign(baseEmpresa,await window.ZENTRYX_LABORAL.cargarBaseEmpresa())}catch(e){}
  const actual=await cargarLaboralUsuario(u.id);
  const l=actual || laboralDefault(u,baseEmpresa);
  const solicitudes=await cargarSolicitudesUsuario(String(u.id||""));
  const consumo=calcularConsumoLaboral(solicitudes);
  const editable=puedeEditarLaboral(u);
  const jp=l.jornada_propia||{};
  const cp=l.calendario_propio||{};
  const baseSemana=zxLabTotalDias(baseEmpresa);
  const baseVacTipo=zxLabTipoVacaciones(baseEmpresa.vacaciones_tipo);
  const baseCal=zxLabResumenCalendario(baseEmpresa);

  modal("Laboral",`
    <div class="zx_user_top_actions">
      <button type="button" class="zx_user_top_back" id="lab_volver_top">← Volver</button>
      ${editable?`<button type="button" class="zx_user_top_primary" id="lab_guardar_top">💾 Guardar</button>`:``}
    </div>
    <div class="zx_text"><b>${limpiar(u.nombre||u.usuario||"Usuario")}</b></div>
    <div class="zx_text" style="margin:8px 0 12px">Cada bloque puede seguir la base de empresa o conservar una condición propia. Las jornadas ya cerradas no cambian al modificar estos datos.</div>
    ${resumenLaboral(l,consumo)}
    ${renderHistorialLaboral(solicitudes)}

    <h3 class="zx_form_subtitle">Jornada semanal</h3>
    ${check("lab_hereda_jornada","Usar jornada de empresa · "+zxLabMinutosTexto(baseSemana),l.hereda_jornada===true)}
    ${zxLabBloque("lab_jornada_personal",`
      <div class="zx_text" style="margin-bottom:8px"><b>Jornada propia</b> · 0 horas significa día no laborable.</div>
      ${ZX_LAB_DIAS_PRO.map(([k,n])=>inputNum("lab_j_"+k,n,zxLabHorasInput(jp[k]),"0.25","h")).join("")}
      <div class="zx_text" style="margin-top:10px">Total semanal propio: <b id="lab_total_propio">${zxLabMinutosTexto(zxLabTotalDias(jp))}</b></div>
    `)}

    <h3 class="zx_form_subtitle">Convenio</h3>
    ${check("lab_hereda_convenio","Usar convenio de empresa · "+String(baseEmpresa.convenio||"Sin definir"),l.hereda_convenio===true)}
    ${baseEmpresa.convenio_referencia?`<div class="zx_text">Referencia empresa: ${limpiar(baseEmpresa.convenio_referencia)}</div>`:``}
    ${zxLabBloque("lab_convenio_personal",`
      <label class="zx_label" for="lab_convenio">Convenio propio</label>
      <input id="lab_convenio" list="lab_convenios_lista" value="${limpiar(l.convenio_propio||"")}" placeholder="Convenio propio">
      <datalist id="lab_convenios_lista">${ZX_CONVENIOS.filter(Boolean).map(x=>`<option value="${limpiar(x)}"></option>`).join("")}</datalist>
      ${zxLabCampoTexto("lab_convenio_ref","Referencia / código / publicación",l.convenio_propio_referencia||"")}
      ${zxLabCampoTexto("lab_convenio_desde","Vigente desde",l.convenio_propio_desde||"","date")}
      ${zxLabCampoTexto("lab_convenio_hasta","Vigente hasta",l.convenio_propio_hasta||"","date")}
    `)}

    <h3 class="zx_form_subtitle">Vacaciones</h3>
    ${check("lab_hereda_vacaciones","Usar base empresa/convenio · "+Number(baseEmpresa.vacaciones||0)+" días "+baseVacTipo,l.hereda_vacaciones===true)}
    ${zxLabBloque("lab_vacaciones_personal",`
      ${inputNum("lab_vacaciones","Vacaciones propias",l.vacaciones_propias,"0.5","días")}
      ${selectLaboral("lab_vacaciones_tipo","Cómputo de vacaciones",l.vacaciones_propias_tipo||"naturales",["naturales","laborables"])}
    `)}

    <h3 class="zx_form_subtitle">Asuntos propios</h3>
    ${check("lab_hereda_asuntos","Usar base empresa/convenio · "+Number(baseEmpresa.asuntos_horas||0)+" h/año",l.hereda_asuntos===true)}
    ${zxLabBloque("lab_asuntos_personal",inputNum("lab_asuntos","Asuntos propios personales",l.asuntos_propios_personal,"0.25","h/año"))}

    ${puedeVerDatosLaboralesSensibles(u)?`
      <h3 class="zx_form_subtitle">Precios horas extra</h3>
      <div class="zx_text" style="margin-bottom:10px">Cada tarifa puede usar la base de empresa o un precio propio del trabajador.</div>
      ${check("lab_hereda_precio_extra","Usar base empresa · Extra normal ("+Number(baseEmpresa.precio_extra||0).toFixed(2)+" €/h)",l.hereda_precio_extra===true)}
      ${inputNum("lab_precio_extra","Precio propio · Extra normal",l.precio_propio_extra??l.precio_extra,"0.01","€/h")}
      ${check("lab_hereda_precio_extra_nocturna","Usar base empresa · Extra nocturna ("+Number(baseEmpresa.precio_extra_nocturna||0).toFixed(2)+" €/h)",l.hereda_precio_extra_nocturna===true)}
      ${inputNum("lab_precio_extra_nocturna","Precio propio · Extra nocturna",l.precio_propio_extra_nocturna??l.precio_extra_nocturna,"0.01","€/h")}
      ${check("lab_hereda_precio_extra_festiva","Usar base empresa · Extra festiva ("+Number(baseEmpresa.precio_extra_festiva||0).toFixed(2)+" €/h)",l.hereda_precio_extra_festiva===true)}
      ${inputNum("lab_precio_extra_festiva","Precio propio · Extra festiva",l.precio_propio_extra_festiva??l.precio_extra_festiva,"0.01","€/h")}
    `:``}

    <h3 class="zx_form_subtitle">Calendario laboral</h3>
    ${check("lab_hereda_calendario","Usar calendario de empresa · "+baseCal,l.hereda_calendario===true)}
    ${zxLabBloque("lab_calendario_personal",`
      ${input("lab_pais","País",cp.pais||"España","text")}
      ${input("lab_comunidad","Comunidad / región",cp.comunidad||"","text")}
      ${input("lab_provincia","Provincia / estado / departamento",cp.provincia||"","text")}
      ${inputConLista("lab_localidad","Localidad / municipio / ciudad",cp.localidad||"","lab_localidad_lista")}
    `)}
  `);

  document.getElementById("lab_volver_top")?.addEventListener("click",cerrarModal);
  cargarDatalistLocalidades(cp.provincia||"",cp.localidad||"");
  activarFiltrosUbicacion();
  activarHerenciasLaboralPro(baseEmpresa);
  activarHerenciaPreciosLaboral(baseEmpresa);

  const guardar=document.getElementById("lab_guardar_top");
  if(guardar){guardar.onclick=function(){const datos=leerDatosLaboralesFormulario(u);pedirPinConPermiso("laboral",function(){guardarLaboralDatos(datos,u)})}}
}

function activarHerenciaPreciosLaboral(baseEmpresa){
  const pares=[
    ["lab_hereda_precio_extra","lab_precio_extra"],
    ["lab_hereda_precio_extra_nocturna","lab_precio_extra_nocturna"],
    ["lab_hereda_precio_extra_festiva","lab_precio_extra_festiva"]
  ];

  pares.forEach(function(par){
    const checkEl=document.getElementById(par[0]);
    const inputEl=document.getElementById(par[1]);
    if(!checkEl || !inputEl) return;

    const refrescar=function(){
      const hereda=checkEl.checked===true;
      inputEl.disabled=hereda;
      inputEl.style.opacity=hereda ? ".65" : "1";
      inputEl.setAttribute("aria-disabled",hereda ? "true" : "false");
    };

    checkEl.onchange=refrescar;
    refrescar();
  });
}

function activarFiltrosUbicacion(){
  const comunidad=document.getElementById("lab_comunidad");
  const provincia=document.getElementById("lab_provincia");
  const localidad=document.getElementById("lab_localidad");
  if(!comunidad || !provincia || !localidad) return;

  let timer=null;
  comunidad.oninput=function(){
    const exact=Object.keys(ZX_PROVINCIAS_POR_COMUNIDAD).find(x=>normalizarTexto(x)===normalizarTexto(comunidad.value));
    if(exact && !provincia.value){
      const lista=ZX_PROVINCIAS_POR_COMUNIDAD[exact]||[];
      if(lista.length===1) provincia.value=lista[0];
    }
  };
  provincia.oninput=function(){
    const p=provincia.value.trim();
    const com=Object.entries(ZX_PROVINCIAS_POR_COMUNIDAD).find(([,lista])=>lista.some(x=>normalizarTexto(x)===normalizarTexto(p)));
    if(com) comunidad.value=com[0];
    cargarDatalistLocalidades(p,localidad.value);
  };
  localidad.oninput=function(){
    clearTimeout(timer);
    timer=setTimeout(async function(){
      const q=localidad.value.trim(); if(q.length<2)return;
      try{
        const core=window.ZENTRYX_LABORAL;
        if(!core?.buscarLocalidades)return;
        const pais=document.getElementById("lab_pais")?.value||"España";
        const codigo=core.codigoPais?.(pais)||"ES";
        const lista=await core.buscarLocalidades(q,codigo);
        const dl=document.getElementById("lab_localidad_lista");
        if(dl)dl.innerHTML=(lista||[]).map(x=>`<option value="${limpiar(x.nombre||"")}"></option>`).join("");
        const exact=(lista||[]).find(x=>normalizarTexto(x.nombre)===normalizarTexto(q));
        if(exact){
          if(exact.provincia)provincia.value=exact.provincia;
          if(exact.comunidad)comunidad.value=exact.comunidad;
          if(exact.pais){const pe=document.getElementById("lab_pais");if(pe)pe.value=exact.pais}
        }
      }catch(e){}
    },300);
  };
}

function numVal(id,def){
  const el=document.getElementById(id);
  if(!el) return def;

  const n=Number(String(el.value || "").replace(",","."));
  return Number.isFinite(n) ? n : def;
}

function leerDatosLaboralesFormulario(u){
  const jornada={}; ZX_LAB_DIAS_PRO.forEach(([k])=>jornada[k]=Math.max(0,Math.round(numVal("lab_j_"+k,0)*60)));
  const totalMin=zxLabTotalDias(jornada);
  const primerMin=ZX_LAB_DIAS_PRO.map(([k])=>jornada[k]).find(x=>x>0)||0;
  const pais=(document.getElementById("lab_pais")?.value||"España").trim()||"España";
  const core=window.ZENTRYX_LABORAL;
  return {
    usuario_id:String(u.id||""),usuario:String(u.usuario||""),nombre:String(u.nombre||u.usuario||""),
    jornada_propia:jornada,horas_dia:Number((primerMin/60).toFixed(2)),horas_semana:Number((totalMin/60).toFixed(2)),
    trabaja_lunes:jornada.lunes>0,trabaja_martes:jornada.martes>0,trabaja_miercoles:jornada.miercoles>0,trabaja_jueves:jornada.jueves>0,trabaja_viernes:jornada.viernes>0,trabaja_sabado:jornada.sabado>0,trabaja_domingo:jornada.domingo>0,
    hereda_jornada:document.getElementById("lab_hereda_jornada")?.checked===true,
    convenio:(document.getElementById("lab_convenio")?.value||"").trim(),
    convenio_referencia:(document.getElementById("lab_convenio_ref")?.value||"").trim(),
    convenio_vigencia_desde:document.getElementById("lab_convenio_desde")?.value||"",
    convenio_vigencia_hasta:document.getElementById("lab_convenio_hasta")?.value||"",
    hereda_convenio:document.getElementById("lab_hereda_convenio")?.checked===true,
    vacaciones_dias:numVal("lab_vacaciones",30),vacaciones_tipo:document.getElementById("lab_vacaciones_tipo")?.value||"naturales",hereda_vacaciones:document.getElementById("lab_hereda_vacaciones")?.checked===true,
    asuntos_propios:numVal("lab_asuntos",0),hereda_asuntos:document.getElementById("lab_hereda_asuntos")?.checked===true,
    precio_extra:numVal("lab_precio_extra",0),precio_extra_nocturna:numVal("lab_precio_extra_nocturna",0),precio_extra_festiva:numVal("lab_precio_extra_festiva",0),
    hereda_precio_extra:document.getElementById("lab_hereda_precio_extra")?.checked===true,hereda_precio_extra_nocturna:document.getElementById("lab_hereda_precio_extra_nocturna")?.checked===true,hereda_precio_extra_festiva:document.getElementById("lab_hereda_precio_extra_festiva")?.checked===true,
    pais,pais_codigo:core?.codigoPais?.(pais)||"",comunidad:(document.getElementById("lab_comunidad")?.value||"").trim(),provincia:(document.getElementById("lab_provincia")?.value||"").trim(),localidad:(document.getElementById("lab_localidad")?.value||"").trim(),
    hereda_calendario:document.getElementById("lab_hereda_calendario")?.checked===true
  };
}

async function guardarBackupPreciosLaborales(datos){
  const usuarioId=String(datos.usuario_id||"");
  if(!usuarioId)return {error:{message:"Usuario laboral sin identificador."}};
  const j=datos.jornada_propia||{};
  const diasActivos=ZX_LAB_DIAS_PRO.filter(([k])=>Number(j[k]||0)>0).length;
  const horasDia=diasActivos?Number((ZX_LAB_DIAS_PRO.map(([k])=>Number(j[k]||0)).find(x=>x>0)/60).toFixed(2)):0;
  const data={
    usuario_id:usuarioId,usuario:String(datos.usuario||""),nombre:String(datos.nombre||""),
    horas_dia:horasDia,horas_semana:Number((zxLabTotalDias(j)/60).toFixed(2)),
    trabaja_lunes:Number(j.lunes||0)>0,trabaja_martes:Number(j.martes||0)>0,trabaja_miercoles:Number(j.miercoles||0)>0,trabaja_jueves:Number(j.jueves||0)>0,trabaja_viernes:Number(j.viernes||0)>0,trabaja_sabado:Number(j.sabado||0)>0,trabaja_domingo:Number(j.domingo||0)>0,
    vacaciones_dias:Number(datos.vacaciones_dias||0),asuntos_propios:Number(datos.asuntos_propios||0),
    pais:String(datos.pais||"España"),comunidad:String(datos.comunidad||""),provincia:String(datos.provincia||""),localidad:String(datos.localidad||""),convenio:String(datos.convenio||""),
    precio_extra:Number(datos.precio_extra||0),precio_extra_nocturna:Number(datos.precio_extra_nocturna||0),precio_extra_festiva:Number(datos.precio_extra_festiva||0),updated_at:new Date().toISOString()
  };
  const buscado=await sb().from("config_laboral").select("id,updated_at").eq("usuario_id",usuarioId).order("updated_at",{ascending:false}).limit(1);
  if(buscado.error)return buscado;
  if(buscado.data&&buscado.data.length)return await sb().from("config_laboral").update(data).eq("id",buscado.data[0].id);
  data.created_at=new Date().toISOString();return await sb().from("config_laboral").insert([data]);
}

function zxLabAudValorNumero(v){
  const n=Number(v);
  return Number.isFinite(n) ? String(Number(n.toFixed(4))) : "";
}

function zxLabAudValorTexto(v){
  return String(v ?? "").trim();
}

function zxLabAudValorBool(v){
  return v===true ? "true" : "false";
}

function zxLabAudSnapshotActual(l){
  const x=l||{};
  const j=x.jornada_propia||{};
  const c=x.calendario_propio||{};
  return {
    hereda_jornada:zxLabAudValorBool(x.hereda_jornada===true),
    jornada_lunes:zxLabAudValorNumero(Number(j.lunes||0)/60),
    jornada_martes:zxLabAudValorNumero(Number(j.martes||0)/60),
    jornada_miercoles:zxLabAudValorNumero(Number(j.miercoles||0)/60),
    jornada_jueves:zxLabAudValorNumero(Number(j.jueves||0)/60),
    jornada_viernes:zxLabAudValorNumero(Number(j.viernes||0)/60),
    jornada_sabado:zxLabAudValorNumero(Number(j.sabado||0)/60),
    jornada_domingo:zxLabAudValorNumero(Number(j.domingo||0)/60),
    hereda_convenio:zxLabAudValorBool(x.hereda_convenio===true),
    convenio:zxLabAudValorTexto(x.convenio_propio),
    convenio_referencia:zxLabAudValorTexto(x.convenio_propio_referencia),
    convenio_vigencia_desde:zxLabAudValorTexto(x.convenio_propio_desde),
    convenio_vigencia_hasta:zxLabAudValorTexto(x.convenio_propio_hasta),
    hereda_vacaciones:zxLabAudValorBool(x.hereda_vacaciones===true),
    vacaciones_dias:zxLabAudValorNumero(x.vacaciones_propias),
    vacaciones_tipo:zxLabAudValorTexto(x.vacaciones_propias_tipo||"naturales"),
    hereda_asuntos:zxLabAudValorBool(x.hereda_asuntos===true),
    asuntos_propios:zxLabAudValorNumero(x.asuntos_propios_personal),
    hereda_precio_extra:zxLabAudValorBool(x.hereda_precio_extra===true),
    precio_extra:zxLabAudValorNumero(x.precio_propio_extra),
    hereda_precio_extra_nocturna:zxLabAudValorBool(x.hereda_precio_extra_nocturna===true),
    precio_extra_nocturna:zxLabAudValorNumero(x.precio_propio_extra_nocturna),
    hereda_precio_extra_festiva:zxLabAudValorBool(x.hereda_precio_extra_festiva===true),
    precio_extra_festiva:zxLabAudValorNumero(x.precio_propio_extra_festiva),
    hereda_calendario:zxLabAudValorBool(x.hereda_calendario===true),
    pais:zxLabAudValorTexto(c.pais||x.pais||"España"),
    comunidad:zxLabAudValorTexto(c.comunidad||""),
    provincia:zxLabAudValorTexto(c.provincia||""),
    localidad:zxLabAudValorTexto(c.localidad||"")
  };
}

function zxLabAudSnapshotFormulario(datos){
  const d=datos||{};
  const j=d.jornada_propia||{};
  return {
    hereda_jornada:zxLabAudValorBool(d.hereda_jornada===true),
    jornada_lunes:zxLabAudValorNumero(Number(j.lunes||0)/60),
    jornada_martes:zxLabAudValorNumero(Number(j.martes||0)/60),
    jornada_miercoles:zxLabAudValorNumero(Number(j.miercoles||0)/60),
    jornada_jueves:zxLabAudValorNumero(Number(j.jueves||0)/60),
    jornada_viernes:zxLabAudValorNumero(Number(j.viernes||0)/60),
    jornada_sabado:zxLabAudValorNumero(Number(j.sabado||0)/60),
    jornada_domingo:zxLabAudValorNumero(Number(j.domingo||0)/60),
    hereda_convenio:zxLabAudValorBool(d.hereda_convenio===true),
    convenio:zxLabAudValorTexto(d.convenio),
    convenio_referencia:zxLabAudValorTexto(d.convenio_referencia),
    convenio_vigencia_desde:zxLabAudValorTexto(d.convenio_vigencia_desde),
    convenio_vigencia_hasta:zxLabAudValorTexto(d.convenio_vigencia_hasta),
    hereda_vacaciones:zxLabAudValorBool(d.hereda_vacaciones===true),
    vacaciones_dias:zxLabAudValorNumero(d.vacaciones_dias),
    vacaciones_tipo:zxLabAudValorTexto(d.vacaciones_tipo||"naturales"),
    hereda_asuntos:zxLabAudValorBool(d.hereda_asuntos===true),
    asuntos_propios:zxLabAudValorNumero(d.asuntos_propios),
    hereda_precio_extra:zxLabAudValorBool(d.hereda_precio_extra===true),
    precio_extra:zxLabAudValorNumero(d.precio_extra),
    hereda_precio_extra_nocturna:zxLabAudValorBool(d.hereda_precio_extra_nocturna===true),
    precio_extra_nocturna:zxLabAudValorNumero(d.precio_extra_nocturna),
    hereda_precio_extra_festiva:zxLabAudValorBool(d.hereda_precio_extra_festiva===true),
    precio_extra_festiva:zxLabAudValorNumero(d.precio_extra_festiva),
    hereda_calendario:zxLabAudValorBool(d.hereda_calendario===true),
    pais:zxLabAudValorTexto(d.pais||"España"),
    comunidad:zxLabAudValorTexto(d.comunidad),
    provincia:zxLabAudValorTexto(d.provincia),
    localidad:zxLabAudValorTexto(d.localidad)
  };
}

function zxLabAudCambios(antes,despues){
  const a=zxLabAudSnapshotActual(antes);
  const b=zxLabAudSnapshotFormulario(despues);
  return Object.keys(b).filter(function(campo){return String(a[campo]??"")!==String(b[campo]??"")}).map(function(campo){
    return {campo:campo,antes:String(a[campo]??""),despues:String(b[campo]??"")};
  });
}

async function guardarLaboralDatos(datos,u){
  if(!esAdminLocal()){alert("No tienes permiso para modificar datos laborales.");return;}
  let anterior=null;
  try{anterior=await cargarLaboralUsuario(datos.usuario_id)}catch(e){}
  if(!anterior){
    let base={};
    try{if(window.ZENTRYX_LABORAL?.cargarBaseEmpresa)base=await window.ZENTRYX_LABORAL.cargarBaseEmpresa()}catch(e){}
    anterior=laboralDefault(u||{id:datos.usuario_id,usuario:datos.usuario,nombre:datos.nombre},base);
  }
  const cambiosAuditoria=zxLabAudCambios(anterior,datos);
  const backup=await guardarBackupPreciosLaborales(datos);
  if(backup&&backup.error){alert("Error conservando valores personales: "+backup.error.message);return;}
  const r=await guardarHorarioUsuario(datos);
  if(r&&r.error){alert("Error guardando horarios_usuario: "+r.error.message);return;}

  let efectivo=null;
  try{if(window.ZENTRYX_LABORAL?.resolverUsuario)efectivo=await window.ZENTRYX_LABORAL.resolverUsuario(datos.usuario_id)}catch(e){}
  await guardarSaldoAusenciasUsuario(datos,efectivo);
  if(cambiosAuditoria.length){
    await registrarAuditoriaUsuario(datos.usuario_id,"laboral_modificado",cambiosAuditoria);
  }
  alert("Datos laborales guardados.");
  if(u){await verLaboralUsuario(u)}else{ZX_usuarios()}
}



async function guardarSaldoAusenciasUsuario(datos,efectivo){
  try{
    const anio=new Date().getFullYear(),usuarioId=String(datos.usuario_id||"");if(!usuarioId)return;
    const buscado=await sb().from("saldos_ausencias").select("id").eq("user_id",usuarioId).eq("anio",anio).limit(1);if(buscado.error)return;
    const vac=efectivo&&efectivo.vacaciones!==undefined?efectivo.vacaciones:datos.vacaciones_dias;
    const asu=efectivo&&efectivo.asuntos_horas!==undefined?efectivo.asuntos_horas:datos.asuntos_propios;
    const saldo={user_id:usuarioId,anio,dias_vacaciones:Number(vac||0),dias_asuntos_propios:Number(asu||0)};
    if(buscado.data&&buscado.data.length)await sb().from("saldos_ausencias").update(saldo).eq("id",buscado.data[0].id);else{saldo.created_at=new Date().toISOString();await sb().from("saldos_ausencias").insert([saldo])}
  }catch(e){}
}

async function guardarHorarioUsuario(datos){
  let base={lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,convenio:"",vacaciones:30,vacaciones_tipo:"naturales",asuntos_horas:0,pais:"España",pais_codigo:"",comunidad:"",provincia:"",localidad:""};
  try{if(window.ZENTRYX_LABORAL?.cargarBaseEmpresa)base=Object.assign(base,await window.ZENTRYX_LABORAL.cargarBaseEmpresa())}catch(e){}
  const propia=datos.jornada_propia||{};
  const dias={}; ZX_LAB_DIAS_PRO.forEach(([k])=>dias[k]=Math.max(0,Math.round(Number(datos.hereda_jornada?base[k]:propia[k])||0)));
  const conv=datos.hereda_convenio?{
    nombre:String(base.convenio||""),referencia:String(base.convenio_referencia||""),vigencia_desde:String(base.convenio_vigencia_desde||""),vigencia_hasta:String(base.convenio_vigencia_hasta||"")
  }:{nombre:String(datos.convenio||""),referencia:String(datos.convenio_referencia||""),vigencia_desde:String(datos.convenio_vigencia_desde||""),vigencia_hasta:String(datos.convenio_vigencia_hasta||"")};
  const vacaciones=datos.hereda_vacaciones?Number(base.vacaciones||0):Number(datos.vacaciones_dias||0);
  const asuntos=datos.hereda_asuntos?Number(base.asuntos_horas||0):Number(datos.asuntos_propios||0);
  const cal=datos.hereda_calendario?{
    pais:String(base.pais||"España"),pais_codigo:String(base.pais_codigo||""),comunidad:String(base.comunidad||""),provincia:String(base.provincia||""),localidad:String(base.localidad||"")
  }:{pais:String(datos.pais||"España"),pais_codigo:String(datos.pais_codigo||""),comunidad:String(datos.comunidad||""),provincia:String(datos.provincia||""),localidad:String(datos.localidad||"")};

  const laboralMeta={
    version:1,inicializado:true,
    hereda_jornada:!!datos.hereda_jornada,jornada_propia:Object.fromEntries(ZX_LAB_DIAS_PRO.map(([k])=>[k,Math.max(0,Math.round(Number(propia[k])||0))])),
    hereda_convenio:!!datos.hereda_convenio,convenio_propio:{nombre:String(datos.convenio||""),referencia:String(datos.convenio_referencia||""),vigencia_desde:String(datos.convenio_vigencia_desde||""),vigencia_hasta:String(datos.convenio_vigencia_hasta||"")},
    hereda_vacaciones:!!datos.hereda_vacaciones,vacaciones_propias:{dias:Number(datos.vacaciones_dias||0),tipo:String(datos.vacaciones_tipo||"naturales")},
    hereda_asuntos:!!datos.hereda_asuntos,asuntos_propios_horas:Number(datos.asuntos_propios||0),
    hereda_calendario:!!datos.hereda_calendario,calendario_propio:{pais:String(datos.pais||"España"),pais_codigo:String(datos.pais_codigo||""),comunidad:String(datos.comunidad||""),provincia:String(datos.provincia||""),localidad:String(datos.localidad||"")}
  };

  const horario={
    user_id:String(datos.usuario_id||""),usuario_id:String(datos.usuario_id||""),usuario:String(datos.usuario||""),nombre:String(datos.nombre||""),trabaja:true,activo:true,
    lunes:dias.lunes,martes:dias.martes,miercoles:dias.miercoles,jueves:dias.jueves,viernes:dias.viernes,sabado:dias.sabado,domingo:dias.domingo,
    vacaciones:vacaciones,asuntos:asuntos,asuntos_horas:asuntos,convenio:conv.nombre,
    precio_extra:datos.hereda_precio_extra?null:Number(datos.precio_extra||0),precio_extra_nocturna:datos.hereda_precio_extra_nocturna?null:Number(datos.precio_extra_nocturna||0),precio_extra_festiva:datos.hereda_precio_extra_festiva?null:Number(datos.precio_extra_festiva||0),
    pais:cal.pais,comunidad:cal.comunidad,provincia:cal.provincia,localidad:cal.localidad,laboral_meta:laboralMeta,actualizado_en:new Date().toISOString()
  };

  const [porUsuarioId,porUserId]=await Promise.all([
    sb().from("horarios_usuario").select("id,actualizado_en").eq("usuario_id",String(datos.usuario_id)).eq("activo",true),
    sb().from("horarios_usuario").select("id,actualizado_en").eq("user_id",String(datos.usuario_id)).eq("activo",true)
  ]);
  const mapa=new Map();[...(porUsuarioId.data||[]),...(porUserId.data||[])].forEach(f=>{if(f&&f.id!==undefined)mapa.set(String(f.id),f)});
  const activas=Array.from(mapa.values()).sort((a,b)=>new Date(b.actualizado_en||0)-new Date(a.actualizado_en||0));
  if(activas.length){
    const principal=activas[0];
    const upd=await sb().from("horarios_usuario").update(horario).eq("id",principal.id);if(upd.error)return upd;
    const sobrantes=activas.slice(1).map(x=>x.id);if(sobrantes.length)await sb().from("horarios_usuario").update({activo:false,actualizado_en:new Date().toISOString()}).in("id",sobrantes);
    return upd;
  }
  return await sb().from("horarios_usuario").insert([horario]);
}

/* RESUMEN LABORAL */
async function cargarSolicitudesUsuario(usuarioId){
  const a=await consultaHistorial("solicitudes_laborales","usuario_id",usuarioId,"created_at");
  const b=await consultaHistorial("solicitudes_laborales","user_id",usuarioId,"created_at");

  const mapa=new Map();

  [...a,...b].forEach(s=>{
    const k=String(s.id || JSON.stringify(s));
    if(!mapa.has(k)) mapa.set(k,s);
  });

  return Array.from(mapa.values());
}

function calcularConsumoLaboral(solicitudes){
  let vacacionesDias=0;
  let vacacionesPendientes=0;
  let asuntosHoras=0;
  let asuntosPendientes=0;
  let permisos=0;
  let bajas=0;

  solicitudes.forEach(s=>{
    const tipo=tipoSolicitudNormalizado(s.tipo || s.categoria || "");
    const estado=tipoSolicitudNormalizado(s.estado || "");

    const aprobada=estado==="aprobada" || estado==="aprobado" || estado==="aceptada" || estado==="aceptado";
    const pendiente=estado==="pendiente" || estado==="solicitada" || estado==="solicitado";

    const dias=diasEntreFechas(s.fecha || s.fecha_inicio || s.desde || s.inicio,s.fecha_fin || s.hasta || s.fin);
    const horas=Number(s.horas || s.total_horas || s.asuntos_horas || s.duracion_horas || 0);

    if(tipo.includes("vacacion")){
      if(aprobada) vacacionesDias+=dias;
      if(pendiente) vacacionesPendientes+=dias;
      return;
    }

    if(tipo.includes("asuntos")){
      const h=horas>0 ? horas : dias*8;
      if(aprobada) asuntosHoras+=h;
      if(pendiente) asuntosPendientes+=h;
      return;
    }

    if(tipo.includes("baja")){
      if(aprobada) bajas+=dias;
      return;
    }

    if(tipo.includes("permiso") || tipo.includes("ausencia")){
      if(aprobada) permisos+=dias;
    }
  });

  return {
    vacacionesDias,
    vacacionesPendientes,
    asuntosHoras,
    asuntosPendientes,
    permisos,
    bajas
  };
}

function numeroLaboral(v){
  const n=Number(v || 0);
  if(!Number.isFinite(n)) return 0;
  return Math.round(n*100)/100;
}

function textoNumeroLaboral(v){
  const n=numeroLaboral(v);
  if(Number.isInteger(n)) return String(n);
  return String(n).replace(".",",");
}

function textoHorasLaboral(v){
  const n=numeroLaboral(v);
  const totalMin=Math.round(n*60);
  const h=Math.floor(totalMin/60);
  const m=totalMin%60;

  if(totalMin<=0) return "0 h";
  if(m===0) return h+" h";
  if(h===0) return m+" min";

  return h+" h "+m+" min";
}

function porcentajeConsumo(consumido,asignado){
  const a=Number(asignado || 0);
  const c=Number(consumido || 0);

  if(!a || a<=0) return 0;

  return Math.max(0,Math.min(100,Math.round((c/a)*100)));
}

function claseSaldo(restante){
  const r=Number(restante || 0);
  if(r<0) return "zx_saldo_mal";
  if(r===0) return "zx_saldo_cero";
  return "zx_saldo_ok";
}

function avisoSaldo(nombre,restante,unidad){
  const r=Number(restante || 0);

  if(r>=0) return "";

  return `
    <div class="zx_saldo_alerta">
      Aviso: ${limpiar(nombre)} tiene saldo negativo de ${limpiar(textoNumeroLaboral(Math.abs(r)))} ${limpiar(unidad)}.
    </div>
  `;
}

function estadoSaldo(restante,asignado){
  const r=Number(restante || 0);
  const a=Number(asignado || 0);

  if(r<=0) return "zx_saldo_mal";
  if(a>0 && r<=a*0.25) return "zx_saldo_cero";

  return "zx_saldo_ok";
}

function renderUso(pct){
  if(Number(pct || 0)<=1) return "";
  return `<p>Uso: ${limpiar(pct)}%</p>`;
}

function renderResumenConsumo(l,consumo){
  const vacacionesAsignadas=numeroLaboral(l.vacaciones_dias || 0);
  const asuntosAsignados=numeroLaboral(l.asuntos_propios || 0);

  const vacacionesConsumidas=numeroLaboral(consumo.vacacionesDias || 0);
  const vacacionesPendientes=numeroLaboral(consumo.vacacionesPendientes || 0);
  const asuntosConsumidos=numeroLaboral(consumo.asuntosHoras || 0);
  const asuntosPendientes=numeroLaboral(consumo.asuntosPendientes || 0);

  const vacacionesRestantes=numeroLaboral(vacacionesAsignadas-vacacionesConsumidas);
  const asuntosRestantes=numeroLaboral(asuntosAsignados-asuntosConsumidos);

  const pctVacaciones=porcentajeConsumo(vacacionesConsumidas,vacacionesAsignadas);
  const pctAsuntos=porcentajeConsumo(asuntosConsumidos,asuntosAsignados);

  return `
    <h3 class="zx_form_subtitle">Disponibilidad</h3>

    ${avisoSaldo("Vacaciones",vacacionesRestantes,"días")}
    ${avisoSaldo("Asuntos propios",asuntosRestantes,"horas")}

    <div class="zx_consumo_grid">
      <div class="zx_consumo_card ${estadoSaldo(vacacionesRestantes,vacacionesAsignadas)}">
        <h3>Vacaciones</h3>
        <b>${limpiar(textoNumeroLaboral(vacacionesRestantes))} días</b>
        <span>Disponibles</span>

        <div class="zx_barra_consumo">
          <div style="width:${limpiar(pctVacaciones)}%"></div>
        </div>

        <p>Asignadas: ${limpiar(textoNumeroLaboral(vacacionesAsignadas))}</p>
        <p>Consumidas: ${limpiar(textoNumeroLaboral(vacacionesConsumidas))}</p>
        <p>Pendientes: ${limpiar(textoNumeroLaboral(vacacionesPendientes))}</p>
        ${renderUso(pctVacaciones)}
      </div>

      <div class="zx_consumo_card ${estadoSaldo(asuntosRestantes,asuntosAsignados)}">
        <h3>Asuntos propios</h3>
        <b>${limpiar(textoHorasLaboral(asuntosRestantes))}</b>
        <span>Disponibles</span>

        <div class="zx_barra_consumo">
          <div style="width:${limpiar(pctAsuntos)}%"></div>
        </div>

        <p>Asignadas: ${limpiar(textoHorasLaboral(asuntosAsignados))}</p>
        <p>Consumidas: ${limpiar(textoHorasLaboral(asuntosConsumidos))}</p>
        <p>Pendientes: ${limpiar(textoHorasLaboral(asuntosPendientes))}</p>
        ${renderUso(pctAsuntos)}
      </div>

      <div class="zx_consumo_card">
        <h3>Otros</h3>
        <b>${limpiar(textoNumeroLaboral(consumo.permisos || 0))} días</b>
        <span>Permisos aprobados</span>
        <p>Bajas aprobadas: ${limpiar(textoNumeroLaboral(consumo.bajas || 0))} días</p>
      </div>
    </div>
  `;
}

/* HISTORIAL */
async function consultaHistorial(tabla,campo,usuarioId,orden){
  try{
    const r=await sb()
      .from(tabla)
      .select("*")
      .eq(campo,String(usuarioId))
      .order(orden,{ascending:false})
      .limit(30);

    if(r.error) return [];
    return r.data || [];
  }catch(e){
    return [];
  }
}

async function cargarHistorialUsuario(u){
  const usuarioId=String(u.id || "");

  const jornadasA=await consultaHistorial("jornadas","usuario_id",usuarioId,"fecha");
  const jornadasB=await consultaHistorial("jornadas","user_id",usuarioId,"fecha");
  const fichajesA=await consultaHistorial("fichajes","usuario_id",usuarioId,"created_at");
  const fichajesB=await consultaHistorial("fichajes","user_id",usuarioId,"created_at");
  const horasA=await consultaHistorial("horas_extra_pro","usuario_id",usuarioId,"fecha");
  const horasB=await consultaHistorial("horas_extra_pro","user_id",usuarioId,"fecha");
  const solicitudesA=await consultaHistorial("solicitudes_laborales","usuario_id",usuarioId,"created_at");
  const solicitudesB=await consultaHistorial("solicitudes_laborales","user_id",usuarioId,"created_at");

  const unirSinDuplicados=function(a,b){
    const mapa=new Map();
    [...(a||[]),...(b||[])].forEach(function(x){
      if(!x)return;
      const clave=x.id!==undefined && x.id!==null ? "id:"+String(x.id) : "row:"+JSON.stringify(x);
      if(!mapa.has(clave)) mapa.set(clave,x);
    });
    return Array.from(mapa.values());
  };

  return {
    jornadas:unirSinDuplicados(jornadasA,jornadasB),
    fichajes:unirSinDuplicados(fichajesA,fichajesB),
    horas:unirSinDuplicados(horasA,horasB),
    solicitudes:unirSinDuplicados(solicitudesA,solicitudesB)
  };
}

function textoMinutos(min){
  const n=Number(min || 0);
  if(!Number.isFinite(n) || n<=0) return "0 h";
  const h=Math.floor(n/60);
  const m=n%60;
  return h+" h"+(m ? " "+m+" min" : "");
}

function textoEstadoHistorial(v){
  const original=String(v || "").trim();
  const clave=normalizarTexto(original).replaceAll(" ","_").replaceAll("-","_");
  const mapa={
    pendiente:"Pendiente",
    validada:"Validada",
    validado:"Validada",
    validada_admin:"Validada por administrador",
    validado_admin:"Validada por administrador",
    aprobada:"Aprobada",
    aprobado:"Aprobado",
    cobrada:"Cobrada",
    cobrado:"Cobrado",
    pagada:"Pagada",
    pagado:"Pagado",
    rechazada:"Rechazada",
    rechazado:"Rechazado"
  };

  return mapa[clave] || (original ? original.replaceAll("_"," ") : "Pendiente");
}

function fechaISO(v){
  if(!v) return "";
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return "";
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function diasEntreFechas(inicio,fin){
  const a=fechaISO(inicio);
  const b=fechaISO(fin || inicio);

  if(!a) return 0;

  const da=new Date(a+"T00:00:00");
  const db=new Date((b || a)+"T00:00:00");

  if(Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0;

  const ms=db.getTime()-da.getTime();
  return Math.max(1,Math.round(ms/86400000)+1);
}

function tipoSolicitudNormalizado(v){
  return normalizarTexto(v).replaceAll(" ","_").replaceAll("-","_");
}

function itemHistorial(titulo,meta,detalle){
  return `
    <div class="zx_hist_item">
      <b>${limpiar(titulo || "-")}</b>
      <span>${limpiar(meta || "")}</span>
      ${detalle ? `<p>${limpiar(detalle)}</p>` : ""}
    </div>
  `;
}

function renderHistorialJornadas(lista){
  if(!lista.length) return `<div class="zx_text">Sin jornadas registradas.</div>`;

  return lista.slice(0,12).map(j=>{
    const fecha=fechaES(j.fecha || j.created_at || j.inicio);
    const estado=j.estado || (j.cerrada ? "Cerrada" : "Abierta");
    const minutos=textoMinutos(j.minutos_trabajados || j.minutos_total || j.total_minutos || 0);
    const extra=textoMinutos(j.minutos_extra || 0);

    return itemHistorial(
      "Jornada "+fecha,
      estado,
      "Trabajado: "+minutos+" · Extra: "+extra
    );
  }).join("");
}

function textoTipoFichajeHistorial(v){
  const original=String(v||"").trim();
  const clave=normalizarTexto(original).replaceAll(" ","_").replaceAll("-","_");
  const mapa={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio de descanso",
    fin_descanso:"Fin de descanso",
    inicio_comida:"Inicio de comida",
    fin_comida:"Fin de comida",
    descanso:"Descanso",
    comida:"Comida"
  };
  return mapa[clave] || (original ? original.replaceAll("_"," ") : "Fichaje");
}

function textoTipoHoraExtraHistorial(v){
  const original=String(v||"").trim();
  const clave=normalizarTexto(original).replaceAll(" ","_").replaceAll("-","_");
  const mapa={normal:"Normal",nocturna:"Nocturna",festiva:"Festiva",extra_normal:"Extra normal",extra_nocturna:"Extra nocturna",extra_festiva:"Extra festiva"};
  return mapa[clave] || (original ? original.replaceAll("_"," ") : "Hora extra");
}

function renderHistorialFichajes(lista){
  if(!lista.length) return `<div class="zx_text">Sin fichajes registrados.</div>`;

  return lista.slice(0,12).map(f=>{
    const fecha=fechaES(f.created_at || f.fecha || f.hora);
    const hora=horaES(f.created_at || f.hora || f.fecha);
    const tipo=textoTipoFichajeHistorial(f.tipo || f.accion || f.estado || "Fichaje");
    const detalle=[
      f.direccion,
      f.vehiculo_matricula ? "Vehículo: "+f.vehiculo_matricula : "",
      f.km ? "Km: "+f.km : ""
    ].filter(Boolean).join(" · ");

    return itemHistorial(tipo,fecha+(hora ? " · "+hora : ""),detalle);
  }).join("");
}

function renderHistorialHoras(lista){
  if(!lista.length) return `<div class="zx_text">Sin horas extra registradas.</div>`;

  return lista.slice(0,12).map(h=>{
    const fecha=fechaES(h.fecha || h.created_at);
    const minutos=textoMinutos(h.minutos || h.minutos_extra || h.total_minutos || 0);
    const estado=textoEstadoHistorial(h.estado || (h.pagada ? "Pagada" : "Pendiente"));
    const tipo=textoTipoHoraExtraHistorial(h.tipo || "Hora extra");

    return itemHistorial(tipo,fecha+" · "+estado,minutos);
  }).join("");
}

function renderHistorialSolicitudes(lista){
  if(!lista.length) return `<div class="zx_text">Sin solicitudes registradas.</div>`;

  return lista.slice(0,12).map(s=>{
    const fecha=fechaES(s.fecha || s.created_at || s.desde);
    const hasta=s.hasta || s.fecha_fin ? " - "+fechaES(s.hasta || s.fecha_fin) : "";
    const tipo=s.tipo || "Solicitud";
    const estado=s.estado || "Pendiente";

    return itemHistorial(tipo,fecha+hasta+" · "+estado,s.motivo || s.observaciones || "");
  }).join("");
}

async function verHistorialUsuario(u){
  modal("Historial",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="hist_volver_top">← Volver</button>
    </div>
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>
    <div class="zx_text">Cargando historial...</div>
  `);

  const volverCarga=document.getElementById("hist_volver_top");
  if(volverCarga) volverCarga.onclick=function(){abrirFichaUsuario(u)};

  const h=await cargarHistorialUsuario(u);

  modal("Historial",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="hist_volver_top">← Volver</button>
    </div>
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    <details class="zx_hist_section" open>
      <summary>Jornadas</summary>
      ${renderHistorialJornadas(h.jornadas)}
    </details>

    <details class="zx_hist_section">
      <summary>Fichajes</summary>
      ${renderHistorialFichajes(h.fichajes)}
    </details>

    <details class="zx_hist_section">
      <summary>Horas extra</summary>
      ${renderHistorialHoras(h.horas)}
    </details>

    <details class="zx_hist_section">
      <summary>Solicitudes</summary>
      ${renderHistorialSolicitudes(h.solicitudes)}
    </details>
  `);

  const volver=document.getElementById("hist_volver_top");
  if(volver) volver.onclick=function(){abrirFichaUsuario(u)};
}

/* AUDITORIA USUARIO */
async function cargarAuditoriaUsuario(usuarioId){
  try{
    const r=await sb()
      .from("usuarios_auditoria")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .order("created_at",{ascending:false})
      .limit(80);

    if(!r.error && r.data){
      return r.data.map(x=>({
        fecha:x.fecha || x.created_at,
        accion:x.accion,
        usuario:x.realizado_por,
        detalle:x.detalle
      }));
    }
  }catch(e){}

  try{
    const r=await sb()
      .from("historial_usuario")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .order("created_at",{ascending:false})
      .limit(50);

    if(!r.error && r.data){
      return r.data.map(x=>({
        fecha:x.created_at,
        accion:x.accion,
        usuario:x.realizado_por,
        detalle:x.cambios
      }));
    }
  }catch(e2){}

  try{
    const r=await sb()
      .from("historial_modificaciones")
      .select("*")
      .eq("tabla","usuarios")
      .eq("registro_id",String(usuarioId))
      .order("created_at",{ascending:false})
      .limit(50);

    if(!r.error && r.data){
      return r.data.map(x=>({
        fecha:x.created_at,
        accion:x.accion,
        usuario:x.usuario,
        detalle:x.detalle
      }));
    }
  }catch(e3){}

  return [];
}

function parseDetalleAuditoria(v){
  try{
    const x=JSON.parse(v || "[]");
    if(Array.isArray(x)) return x;
  }catch(e){}

  return [];
}

function etiquetaAccionAuditoria(accion){
  const clave=normalizarTexto(accion).replaceAll(" ","_").replaceAll("-","_");
  const mapa={
    documento_eliminado:"Documento eliminado",
    documento_renombrado:"Documento renombrado",
    documento_subido:"Documento subido",
    laboral_modificado:"Datos laborales modificados",
    editar_usuario:"Usuario editado",
    crear_usuario:"Usuario creado",
    reset_pin:"PIN restablecido",
    desactivar_usuario:"Usuario desactivado",
    reactivar_usuario:"Usuario reactivado"
  };

  if(mapa[clave]) return mapa[clave];
  const texto=String(accion || "").replaceAll("_"," ").trim();
  return texto ? texto.charAt(0).toUpperCase()+texto.slice(1) : "Acción";
}

function etiquetaCampoAuditoria(campo,accion){
  const clave=String(campo || "").trim();
  const accionClave=normalizarTexto(accion).replaceAll(" ","_").replaceAll("-","_");

  if(clave==="nombre" && accionClave.startsWith("documento_")) return "Nombre del documento";
  if(clave==="tipo" && accionClave.startsWith("documento_")) return "Tipo de documento";

  const mapa={
    nombre:"Nombre",
    usuario:"Usuario",
    dni:"DNI / NIE",
    telefono_personal:"Teléfono personal",
    telefono_empresa:"Teléfono de empresa",
    email_personal:"Email personal",
    email_empresa:"Email de empresa",
    via_tipo:"Tipo de vía",
    calle:"Calle / nombre de vía",
    numero:"Número",
    portal:"Portal",
    escalera:"Escalera",
    piso:"Piso",
    puerta:"Puerta",
    poblacion:"Población",
    provincia:"Provincia",
    codigo_postal:"Código postal",
    pais:"País",
    emergencia_nombre:"Nombre del contacto de emergencia",
    emergencia_relacion:"Relación",
    emergencia_telefono:"Teléfono de emergencia",
    emergencia_email:"Email de emergencia",
    emergencia_observaciones:"Observaciones de emergencia",
    rol:"Rol",
    estado:"Estado",
    activo:"Activo",
    pin:"PIN",
    horas_dia:"Horas por día",
    horas_semana:"Horas por semana",
    hereda_jornada:"Usar jornada de empresa",
    jornada_lunes:"Jornada lunes",
    jornada_martes:"Jornada martes",
    jornada_miercoles:"Jornada miércoles",
    jornada_jueves:"Jornada jueves",
    jornada_viernes:"Jornada viernes",
    jornada_sabado:"Jornada sábado",
    jornada_domingo:"Jornada domingo",
    hereda_convenio:"Usar convenio de empresa",
    convenio_referencia:"Referencia de convenio",
    convenio_vigencia_desde:"Convenio vigente desde",
    convenio_vigencia_hasta:"Convenio vigente hasta",
    hereda_vacaciones:"Usar vacaciones de empresa/convenio",
    vacaciones_dias:"Vacaciones anuales",
    vacaciones_tipo:"Cómputo de vacaciones",
    hereda_asuntos:"Usar asuntos propios de empresa/convenio",
    asuntos_propios:"Asuntos propios",
    hereda_precio_extra:"Usar precio de empresa · Extra normal",
    precio_extra:"Precio hora extra normal",
    hereda_precio_extra_nocturna:"Usar precio de empresa · Extra nocturna",
    precio_extra_nocturna:"Precio hora extra nocturna",
    hereda_precio_extra_festiva:"Usar precio de empresa · Extra festiva",
    precio_extra_festiva:"Precio hora extra festiva",
    hereda_calendario:"Usar calendario de empresa",
    comunidad:"Comunidad autónoma",
    localidad:"Localidad",
    convenio:"Convenio",
    documento:"Nombre del documento",
    documento_id:"Documento"
  };

  return mapa[clave] || String(clave || "Campo").replaceAll("_"," ");
}

function valorAuditoriaVisible(campo,valor,accion){
  const s=String(valor ?? "").trim();
  if(!s) return "Sin dato";

  const clave=normalizarTexto(s).replaceAll(" ","_").replaceAll("-","_");
  const campoClave=String(campo || "");

  if(campoClave==="documento_id" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s)){
    return "Documento registrado";
  }

  const documentos={
    dni_frontal:"DNI frontal",
    dni_trasero:"DNI trasero",
    contrato:"Contrato",
    certificado:"Certificado",
    carnet:"Carnet",
    formacion:"Formación",
    otro:"Otro"
  };
  if(documentos[clave]) return documentos[clave];

  if(clave==="validada_admin" || clave==="validado_admin") return "Validada por administrador";
  if(campoClave.startsWith("jornada_")) return s+" h";
  if(campoClave==="vacaciones_dias") return s+" días";
  if(campoClave==="asuntos_propios") return s+" h/año";
  if(campoClave==="precio_extra" || campoClave==="precio_extra_nocturna" || campoClave==="precio_extra_festiva") return s+" €/h";
  if(campoClave==="vacaciones_tipo" && clave==="naturales") return "Días naturales";
  if(campoClave==="vacaciones_tipo" && clave==="laborables") return "Días laborables";
  if(clave==="true") return "Sí";
  if(clave==="false") return "No";
  if(clave==="eliminado") return "Eliminado";
  if(clave==="activo") return "Activo";
  if(clave==="pendiente") return "Pendiente";

  return s.replaceAll("_"," ");
}

function renderAuditoriaCambios(detalle,accion){
  const cambios=parseDetalleAuditoria(detalle);

  if(!cambios.length){
    return `<div class="zx_text">Sin detalle de campos.</div>`;
  }

  return cambios.map(c=>{
    const campo=String(c.campo || "");
    const etiqueta=etiquetaCampoAuditoria(campo,accion);
    const antes=valorAuditoriaVisible(campo,c.antes,accion);
    const despues=valorAuditoriaVisible(campo,c.despues,accion);

    if(campo==="documento_id"){
      return `
        <div class="zx_audit_cambio">
          <b>${limpiar(etiqueta)}</b>
          <span>Estado: ${limpiar(despues)}</span>
        </div>
      `;
    }

    return `
      <div class="zx_audit_cambio">
        <b>${limpiar(etiqueta)}</b>
        <span>Antes: ${limpiar(antes)}</span>
        <span>Después: ${limpiar(despues)}</span>
      </div>
    `;
  }).join("");
}

async function verAuditoriaUsuario(u){
  modal("Auditoría",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="audit_volver_top">← Volver</button>
    </div>
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>
    <div class="zx_text">Cargando auditoría...</div>
  `);

  const volverCarga=document.getElementById("audit_volver_top");
  if(volverCarga) volverCarga.onclick=function(){abrirFichaUsuario(u)};

  const datos=await cargarAuditoriaUsuario(u.id);

  modal("Auditoría",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="audit_volver_top">← Volver</button>
    </div>
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    ${
      datos.length
      ? datos.map(a=>`
        <details class="zx_audit_item">
          <summary>
            <b>${limpiar(etiquetaAccionAuditoria(a.accion))}</b>
            <span>${limpiar(fechaHoraES(a.fecha))} · ${limpiar(a.usuario || "-")}</span>
          </summary>
          ${renderAuditoriaCambios(a.detalle,a.accion)}
        </details>
      `).join("")
      : `<div class="zx_text">Sin auditoría registrada.</div>`
    }
  `);

  const volver=document.getElementById("audit_volver_top");
  if(volver) volver.onclick=function(){abrirFichaUsuario(u)};
}

/* DOCUMENTOS */
async function cargarDocumentos(usuarioId){
  const r=await sb()
    .from("usuarios_documentos")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .or("eliminado.is.null,eliminado.eq.false")
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

function esImagen(url,nombre){
  const t=String(url || nombre || "").toLowerCase();
  return t.endsWith(".jpg") || t.endsWith(".jpeg") || t.endsWith(".png") || t.endsWith(".webp") || t.endsWith(".gif");
}

function esPDF(url,nombre){
  const t=String(url || nombre || "").toLowerCase();
  return t.endsWith(".pdf");
}

async function subirDocumentoUsuario(file,usuarioId,tipo){
  if(!file) return null;

  const limpio=String(file.name || "documento").replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=String(usuarioId)+"/"+tipo+"/"+Date.now()+"_"+limpio;

  const r=await sb().storage.from(DOC_BUCKET).upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo documento: "+r.error.message);
    return null;
  }

  return sb().storage.from(DOC_BUCKET).getPublicUrl(path).data.publicUrl;
}

function vistaPreviaDocumento(d){
  if(esImagen(d.url,d.nombre)){
    return `<img class="zx_doc_preview_img" src="${limpiar(d.url)}" alt="${limpiar(d.nombre || "Documento")}">`;
  }

  if(esPDF(d.url,d.nombre)){
    return `<iframe class="zx_doc_preview_pdf" src="${limpiar(d.url)}"></iframe>`;
  }

  return `<div class="zx_text">Vista previa no disponible para este tipo de archivo.</div>`;
}

function abrirVistaDocumento(d,u,origen="ficha"){
  modal("Vista previa",`
    <div class="zx_text"><b>${limpiar(d.nombre || "Documento")}</b></div>
    <div class="zx_doc_preview_box">${vistaPreviaDocumento(d)}</div>
    <button class="zx_btn_big zx_azul" id="doc_preview_abrir">Abrir archivo</button>
    <button class="zx_btn_big zx_gris" id="doc_preview_cerrar">← Volver</button>
  `);

  document.getElementById("doc_preview_abrir").onclick=function(){
    window.open(d.url,"_blank");
  };

  document.getElementById("doc_preview_cerrar").onclick=function(){
    verDocumentosUsuario(u,origen);
  };
}

async function renombrarDocumento(id,nombreActual,u,origen="ficha"){
  if(!puedeGestionarDocs(u)){
    alert("No tienes permiso para renombrar documentos.");
    return;
  }

  const nuevo=prompt("Nuevo nombre del documento:",nombreActual || "");
  if(nuevo===null) return;

  const limpio=String(nuevo || "").trim();
  if(!limpio){
    alert("El nombre no puede estar vacío.");
    return;
  }

  const r=await sb()
    .from("usuarios_documentos")
    .update({nombre:limpio,updated_at:new Date().toISOString()})
    .eq("id",id);

  if(r.error){
    alert("Error renombrando documento: "+r.error.message);
    return;
  }

  await registrarAuditoriaUsuario(u.id,"documento_renombrado",[
    {campo:"documento",antes:String(nombreActual || ""),despues:limpio}
  ]);

  await verDocumentosUsuario(u,origen);
}

async function borrarDocumentoLogico(id,u,origen="ficha"){
  if(!puedeBorrarDocs(u)){
    alert("No tienes permiso para borrar documentos.");
    return false;
  }

  const r=await sb()
    .from("usuarios_documentos")
    .update({
      eliminado:true,
      updated_at:new Date().toISOString()
    })
    .eq("id",String(id))
    .eq("usuario_id",String(u.id))
    .select("id,eliminado,nombre,tipo");

  if(r.error){
    alert("Error borrando documento: "+r.error.message);
    await verDocumentosUsuario(u,origen);
    return false;
  }

  const fila=(r.data || [])[0] || null;

  if(!fila || fila.eliminado!==true){
    alert("No se pudo borrar el documento. No se confirmó el cambio en la base de datos.");
    await verDocumentosUsuario(u,origen);
    return false;
  }

  await registrarAuditoriaUsuario(u.id,"documento_eliminado",[
    {
      campo:"documento",
      antes:String(fila.nombre || textoTipoDoc(fila.tipo) || "Documento"),
      despues:"Eliminado"
    }
  ]);

  await verDocumentosUsuario(u,origen);
  return true;
}

async function verDniUsuario(u){
  const docs=await cargarDocumentos(u.id);
  const frontal=docs.find(d=>String(d.tipo||"")==="dni_frontal") || null;
  const trasero=docs.find(d=>String(d.tipo||"")==="dni_trasero") || null;

  modal("DNI",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="dni_volver_top">← Volver</button>
    </div>

    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    <div class="zx_dni_grid">
      <div class="zx_dni_box">
        <h3>DNI frontal</h3>
        ${
          frontal
          ? `
            <div class="zx_doc_preview_box">${vistaPreviaDocumento(frontal)}</div>
            <button class="zx_btn_big zx_azul" id="dni_frontal_abrir">Abrir frontal</button>
          `
          : `<div class="zx_text">No hay DNI frontal subido.</div>`
        }
      </div>

      <div class="zx_dni_box">
        <h3>DNI trasero</h3>
        ${
          trasero
          ? `
            <div class="zx_doc_preview_box">${vistaPreviaDocumento(trasero)}</div>
            <button class="zx_btn_big zx_azul" id="dni_trasero_abrir">Abrir trasero</button>
          `
          : `<div class="zx_text">No hay DNI trasero subido.</div>`
        }
      </div>
    </div>

    <button class="zx_btn_big zx_blue" id="dni_ir_docs">Gestionar documentos</button>
  `);

  document.getElementById("dni_volver_top").onclick=function(){
    abrirFichaUsuario(u);
  };

  const b1=document.getElementById("dni_frontal_abrir");
  if(b1 && frontal) b1.onclick=function(){window.open(frontal.url,"_blank")};

  const b2=document.getElementById("dni_trasero_abrir");
  if(b2 && trasero) b2.onclick=function(){window.open(trasero.url,"_blank")};

  document.getElementById("dni_ir_docs").onclick=function(){
    verDocumentosUsuario(u,"dni");
  };
}

async function verDocumentosUsuario(u,origen="ficha"){
  if(!puedeVerDocs(u)){
    alert("No tienes permiso para ver documentos.");
    return;
  }

  const docs=await cargarDocumentos(u.id);

  modal("Documentos",`
    <div class="zx_user_top_actions zx_user_top_single">
      <button type="button" class="zx_user_top_back" id="doc_cerrar_top">${origen==="dni" ? "← DNI" : "← Volver"}</button>
    </div>

    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    ${
      puedeSubirDocs(u)
      ? `
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
      `
      : `<div class="zx_text">Modo consulta: no puedes subir ni modificar documentos.</div>`
    }

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
            <button class="zx_action_btn zx_azul" data-doc-preview="${limpiar(d.id)}">Vista</button>
            <button class="zx_action_btn zx_blue" data-doc-open="${limpiar(d.url)}">Abrir</button>
            ${puedeGestionarDocs(u) ? `<button class="zx_action_btn zx_orange" data-doc-rename="${limpiar(d.id)}">Renombrar</button>` : ""}
            ${puedeBorrarDocs(u) ? `<button class="zx_action_btn zx_red" data-doc-del="${limpiar(d.id)}">Borrar</button>` : ""}
          </div>
        `).join("")
        : `<div class="zx_text">Sin documentos.</div>`
      }
    </div>
  `);

  document.getElementById("doc_cerrar_top").onclick=function(){
    if(origen==="dni"){
      verDniUsuario(u);
    }else{
      abrirFichaUsuario(u);
    }
  };

  const docSubir=document.getElementById("doc_subir");
  if(docSubir){
    docSubir.onclick=async function(){
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
        eliminado:false,
        creado_por:s.usuario || "",
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }]);

    if(r.error){
      alert("Error guardando documento: "+r.error.message);
      return;
    }

    await registrarAuditoriaUsuario(u.id,"documento_subido",[
      {campo:"tipo",antes:"",despues:tipo},
      {campo:"nombre",antes:"",despues:nombre}
    ]);

    await verDocumentosUsuario(u,origen);
    };
  }

  document.querySelectorAll("[data-doc-open]").forEach(btn=>{
    btn.onclick=function(){window.open(btn.dataset.docOpen,"_blank")};
  });

  document.querySelectorAll("[data-doc-preview]").forEach(btn=>{
    btn.onclick=function(){
      const d=docs.find(x=>String(x.id)===String(btn.dataset.docPreview));
      if(d) abrirVistaDocumento(d,u,origen);
    };
  });

  document.querySelectorAll("[data-doc-rename]").forEach(btn=>{
    btn.onclick=function(){
      const d=docs.find(x=>String(x.id)===String(btn.dataset.docRename));
      if(d) renombrarDocumento(d.id,d.nombre,u,origen);
    };
  });

  document.querySelectorAll("[data-doc-del]").forEach(btn=>{
    btn.onclick=function(){
      pedirPinConPermiso("docs",async function(){
        if(!confirm("¿Borrar documento?")){
          await verDocumentosUsuario(u,origen);
          return;
        }
        await borrarDocumentoLogico(btn.dataset.docDel,u,origen);
      });
    };
  });
}

(function estilos(){
  if(document.getElementById("zx_usuarios_v3144")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3144";

  s.innerHTML=`
    .zx_usuarios_head_top{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .zx_btn_mini{border:0;border-radius:14px;padding:12px 18px;font-weight:900;font-size:15px}
    .zx_user_toolbar{display:flex;flex-direction:column;gap:12px;margin-top:14px}
    .zx_user_search{position:relative}
    .zx_user_search input{width:100%;margin:0!important;padding-right:48px!important}
    .zx_user_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e5e7eb;width:32px;height:32px;border-radius:10px;font-weight:900}
    .zx_user_filter{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .zx_user_filter button{border:0;border-radius:14px;background:#e5e7eb;color:#111827;padding:12px;font-weight:900}
    .zx_user_filter_resume{margin-top:10px;color:#64748b;font-size:13px;font-weight:900;line-height:1.35}
    .zx_filter_on{background:#2563eb!important;color:white!important}
    .zx_usuarios_lista{display:flex;flex-direction:column;gap:10px}
    .zx_user_row{background:white;border:1px solid #d1d5db;border-radius:18px;padding:10px 12px;box-shadow:0 3px 12px rgba(0,0,0,.035);overflow:hidden}
    .zx_user_inactivo{opacity:.65;border-left:8px solid #dc2626}
    .zx_user_row_main{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center}
    .zx_user_row_avatar{width:52px;height:52px;border-radius:15px;object-fit:cover;background:#e5e7eb}
    .zx_user_avatar{width:72px;height:72px;border-radius:18px;object-fit:cover;background:#e5e7eb}
    .zx_user_avatar_empty{background:linear-gradient(135deg,#2563eb,#10b981);color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900}
    .zx_user_row_name{font-size:18px;font-weight:900;color:#0f172a;line-height:1.15;word-break:break-word}
    .zx_user_row_meta,.zx_user_row_phone{color:#64748b;font-size:13px;font-weight:800;margin-top:2px;word-break:break-word}
    .zx_user_permissions_box{margin:18px 0;padding:16px;border:1px solid #dbe3ef;border-radius:20px;background:#f8fafc}
    .zx_user_permissions_head h3{margin:0 0 5px;color:#071330;font-size:18px;font-weight:950}
    .zx_user_permissions_head p{margin:0 0 13px;color:#64748b;font-size:13px;font-weight:800;line-height:1.4}
    .zx_user_permissions_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .zx_user_permission_item{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;padding:10px 12px;border:1px solid #dbe3ef;border-radius:15px;background:#fff;color:#0f172a;font-weight:900}
    .zx_user_permission_item input{width:24px;height:24px;accent-color:#2563eb}
    .zx_user_permissions_note{margin-top:12px;color:#64748b;font-size:12px;font-weight:800;line-height:1.4}
    @media(max-width:520px){.zx_user_permissions_grid{grid-template-columns:1fr}}
    .zx_rol_badge{display:inline-block;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:900;line-height:1;background:#e5e7eb;color:#111827;margin-right:5px}
    .zx_rol_admin{background:#dc2626;color:white}
    .zx_rol_gerente{background:#7c3aed;color:white}
    .zx_rol_supervisor{background:#2563eb;color:white}
    .zx_rol_encargado{background:#0f766e;color:white}
    .zx_rol_administ{background:#0891b2;color:white}
    .zx_rol_comercial{background:#f59e0b;color:#3b2500}
    .zx_rol_tecnico{background:#16a34a;color:white}
    .zx_rol_operario{background:#334155;color:white}
    .zx_rol_invitado{background:#e5e7eb;color:#475569}
    .zx_user_open_btn{border:0;border-radius:12px;background:#2563eb;color:white;padding:10px 12px;font-size:13px;font-weight:900}
    .zx_user_top_actions{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 18px;padding:6px 0 12px;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 8px 12px rgba(255,255,255,.98)}
    .zx_user_top_actions.zx_user_top_single{grid-template-columns:1fr}
    .zx_user_top_actions button{border-radius:14px;padding:13px 12px;font-size:15px;font-weight:900;cursor:pointer}
    .zx_user_top_back{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8}
    .zx_user_top_primary{border:0;background:#2563eb;color:white}
    .zx_ficha_head{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center;margin-bottom:14px}
    .zx_ficha_nombre{font-size:23px;font-weight:900;color:#0f172a;line-height:1.15}
    .zx_ficha_meta{font-size:14px;font-weight:800;color:#64748b;margin-top:4px}
    .zx_ficha_bloque{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin:10px 0}
    .zx_ficha_bloque h3{margin:0 0 8px 0;font-size:16px;color:#0f172a}
    .zx_ficha_acciones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .zx_action_btn{border:0;border-radius:14px;padding:12px;font-size:14px;font-weight:900;background:#e5e7eb;color:#111827}
    .zx_blue,.zx_azul{background:#2563eb!important;color:white!important}
    .zx_green{background:#16a34a!important;color:white!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_orange{background:#facc15!important;color:#3b2500!important}
    .zx_purple{background:#7c3aed!important;color:white!important}
    .zx_laboral{background:#0f766e!important;color:white!important}
    .zx_contact_box{background:#f8fafc;border:1px solid #e5e7eb;border-left:8px solid #2563eb;border-radius:16px;padding:12px;margin:12px 0;font-size:15px;font-weight:700;line-height:1.5}
    .zx_emergencia_box{background:#fff1f2;border:1px solid #fecdd3;border-left:8px solid #dc2626;border-radius:16px;padding:12px;margin:12px 0;color:#7f1d1d;font-size:15px;font-weight:800;line-height:1.5}
    .zx_privacidad_box{background:#f8fafc;border:1px solid #e5e7eb;border-left:8px solid #64748b;border-radius:16px;padding:12px;margin:12px 0;color:#334155;font-size:14px;font-weight:900;line-height:1.4}
    .zx_user_data{color:#334155;line-height:1.6;font-size:15px;font-weight:700}
    .zx_ficha_indicadores{display:grid;grid-template-columns:1fr;gap:10px;margin:8px 0 16px}
    .zx_ficha_indicadores div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;border-left:7px solid #2563eb}
    .zx_ficha_indicadores span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-bottom:3px}
    .zx_ficha_indicadores b{display:block;color:#0f172a;font-size:16px;font-weight:900;line-height:1.25}
    .zx_ficha_indicadores .zx_ind_ok{border-left-color:#16a34a}
    .zx_ficha_indicadores .zx_ind_bad{border-left-color:#dc2626;background:#fff1f2}
    .zx_ficha_resumen_rapido{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 16px}
    .zx_ficha_resumen_rapido div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px}
    .zx_ficha_resumen_rapido span{display:block;color:#64748b;font-size:12px;font-weight:900;line-height:1.25}
    .zx_ficha_resumen_rapido b{display:block;color:#0f172a;font-size:28px;font-weight:900;margin-top:4px}
    .zx_ficha_resumen_rapido .zx_resumen_alerta{background:#fff1f2;border-color:#fecdd3}
    .zx_ficha_resumen_rapido .zx_resumen_alerta b{color:#dc2626}
    .zx_ficha_laboral_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}
    .zx_ficha_laboral_grid div{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:10px}
    .zx_ficha_laboral_grid span{display:block;color:#64748b;font-size:12px;font-weight:900}
    .zx_ficha_laboral_grid b{display:block;color:#0f172a;font-size:22px;font-weight:900;margin-top:4px}
    .zx_ficha_laboral_linea{color:#334155;font-size:14px;font-weight:800;line-height:1.4;margin-top:7px}
    .zx_ficha_laboral_linea b{color:#0f172a}
    .zx_laboral_resumen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .zx_laboral_resumen div{background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:14px;text-align:center}
    .zx_laboral_resumen b{display:block;font-size:28px;font-weight:900;color:#0f172a}
    .zx_laboral_resumen span{display:block;color:#64748b;font-size:14px;font-weight:900;margin-top:4px}
    .zx_num_unit_wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:stretch;margin-bottom:12px}
    .zx_num_unit_wrap input{margin-bottom:0!important;min-width:0}
    .zx_num_unit{display:flex;align-items:center;justify-content:center;min-width:58px;padding:0 13px;border:1px solid #cbd5e1;border-radius:14px;background:#f1f5f9;color:#334155;font-size:15px;font-weight:950;white-space:nowrap}
    html[data-zx-theme="dark"] .zx_num_unit{background:#1f2937;color:#f8fafc;border-color:#475569}
    .zx_checks_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .zx_check{display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;font-weight:900;color:#0f172a}
    .zx_check input{width:auto!important;margin:0!important;transform:scale(1.2)}
    .zx_doc_item{display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:12px;margin-top:10px}
    .zx_doc_item span{color:#64748b;font-weight:800}
    .zx_doc_preview_box{margin-top:14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:18px;padding:10px;overflow:hidden}
    .zx_doc_preview_img{width:100%;border-radius:14px;display:block}
    .zx_doc_preview_pdf{width:100%;height:68vh;border:0;border-radius:14px;background:white}
    .zx_hist_section{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin:12px 0}
    .zx_hist_section summary{font-size:17px;font-weight:900;color:#0f172a;cursor:pointer}
    .zx_hist_item{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:11px;margin-top:9px}
    .zx_hist_item b{display:block;color:#0f172a;font-size:15px;font-weight:900}
    .zx_hist_item span{display:block;color:#64748b;font-size:13px;font-weight:800;margin-top:3px}
    .zx_hist_item p{margin:6px 0 0 0;color:#334155;font-size:13px;font-weight:700;line-height:1.35}
    .zx_audit_item{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin:10px 0}
    .zx_audit_item summary{cursor:pointer}
    .zx_audit_item summary b{display:block;color:#0f172a;font-size:15px;font-weight:900;text-transform:capitalize}
    .zx_audit_item summary span{display:block;color:#64748b;font-size:13px;font-weight:800;margin-top:3px}
    .zx_audit_cambio{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-top:8px}
    .zx_audit_cambio b{display:block;color:#0f172a;font-size:13px;font-weight:900}
    .zx_audit_cambio span{display:block;color:#334155;font-size:12px;font-weight:800;margin-top:3px;word-break:break-word}
    .zx_dni_grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}
    .zx_dni_box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px}
    .zx_dni_box h3{margin:0 0 8px 0;font-size:17px;color:#0f172a}
    .zx_consumo_grid{display:grid;grid-template-columns:1fr;gap:10px;margin:12px 0}
    .zx_consumo_card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:13px}
    .zx_consumo_card h3{margin:0 0 8px 0;color:#0f172a;font-size:17px}
    .zx_consumo_card b{display:block;font-size:30px;font-weight:900;color:#0f172a}
    .zx_consumo_card span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-bottom:8px}
    .zx_consumo_card p{margin:4px 0;color:#334155;font-size:14px;font-weight:800;line-height:1.3}
    .zx_saldo_ok{border-left:7px solid #16a34a}
    .zx_saldo_cero{border-left:7px solid #facc15}
    .zx_saldo_mal{border-left:7px solid #dc2626;background:#fff1f2}
    .zx_saldo_alerta{background:#fff1f2;border:1px solid #fecdd3;border-left:7px solid #dc2626;color:#7f1d1d;border-radius:16px;padding:12px;margin:10px 0;font-size:14px;font-weight:900;line-height:1.35}
    .zx_barra_consumo{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin:10px 0 12px}
    .zx_barra_consumo div{height:100%;background:#2563eb;border-radius:999px}
    .zx_saldo_ok .zx_barra_consumo div{background:#16a34a}
    .zx_saldo_cero .zx_barra_consumo div{background:#facc15}
    .zx_saldo_mal .zx_barra_consumo div{background:#dc2626}
    .zx_solicitudes_laboral_lista{display:flex;flex-direction:column;gap:8px;margin:10px 0 18px}
    .zx_solicitud_laboral_item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px}
    .zx_solicitud_laboral_item b{display:block;color:#0f172a;font-size:15px;font-weight:900}
    .zx_solicitud_laboral_item span{display:block;color:#64748b;font-size:13px;font-weight:800;margin-top:3px}
    .zx_solicitud_laboral_item em{display:block;font-style:normal;text-align:right;color:#334155;font-size:13px;font-weight:900;text-transform:capitalize}

    @media(max-width:430px){
      .zx_user_filter,.zx_ficha_acciones,.zx_doc_item,.zx_checks_grid{grid-template-columns:1fr}
      .zx_user_row_main{grid-template-columns:48px 1fr auto}
      .zx_user_row_avatar{width:48px;height:48px;border-radius:14px}
      .zx_user_row_name{font-size:17px}
      .zx_user_open_btn{padding:9px 10px;font-size:12px}
    }
  `;

  document.head.appendChild(s);
})();

})();
