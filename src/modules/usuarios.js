// ===============================
// ZENTRYX PRO - USUARIOS
// V3111 - OFFLINE INSTANTANEO PRO
// V3156 - VALIDACIÓN PIN SEGURA
// V3141 - LIMPIA ETIQUETA DUPLICADA CONVENIO EN LABORAL
// ===============================
(function(){
"use strict";

const ZX_USUARIOS_CACHE_KEY="zentryx_cache_usuarios";

function zxUsuariosOffline(){
  return typeof navigator!=="undefined" && navigator.onLine===false;
}

function zxUsuariosLeerCache(){
  try{
    const raw=localStorage.getItem(ZX_USUARIOS_CACHE_KEY);
    const data=raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function zxUsuariosGuardarCache(datos){
  try{
    localStorage.setItem(ZX_USUARIOS_CACHE_KEY,JSON.stringify(Array.isArray(datos) ? datos : []));
  }catch(e){}
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
  const q=normalizarTexto(busqueda);

  if(!q) return true;

  const texto=textoBusquedaUsuario(u);

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
      u.telefono_personal,
      u.telefono_empresa,
      u.emergencia_telefono,
      u.dni,
      u.codigo_postal,
      u.numero,
      u.piso,
      u.puerta
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

    ZX_USUARIOS_CACHE=res.data || [];
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

  return base.filter(function(u){
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

function conectarBuscadorUsuarios(){
  const buscar=document.getElementById("zx_buscar_usuarios");

  if(buscar){
    buscar.oninput=function(){
      ZX_BUSQUEDA_USUARIOS=buscar.value || "";
      pintarListaUsuarios();

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

function imprimirFichaActual(){
  const modal=document.querySelector("#zx_modal .zx_modal_caja");

  if(!modal){
    alert("No hay ficha abierta.");
    return;
  }

  const contenido=modal.innerHTML;
  const w=window.open("","_blank");

  if(!w){
    alert("El navegador ha bloqueado la ventana de impresión.");
    return;
  }

  w.document.open();
  w.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Ficha usuario</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#0f172a;margin:24px;background:white}
        h2{font-size:28px;margin:0 0 18px}
        h3{font-size:18px;margin:0 0 10px}
        button,input,select,textarea{display:none!important}
        img{max-width:120px;border-radius:18px}
        .zx_ficha_head{display:grid;grid-template-columns:120px 1fr;gap:18px;align-items:center;margin-bottom:18px}
        .zx_ficha_nombre{font-size:28px;font-weight:900}
        .zx_ficha_meta{color:#64748b;font-weight:800}
        .zx_ficha_bloque,.zx_contact_box,.zx_emergencia_box,.zx_ficha_indicadores div,.zx_ficha_resumen_rapido div,.zx_ficha_laboral_grid div{border:1px solid #d1d5db;border-radius:14px;padding:12px;margin:10px 0}
        .zx_ficha_resumen_rapido,.zx_ficha_laboral_grid,.zx_ficha_indicadores{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .zx_user_data,.zx_contact_box,.zx_emergencia_box,.zx_ficha_laboral_linea{font-size:14px;line-height:1.5}
        span{color:#64748b;font-weight:800}
        b{font-weight:900}
        @media print{
          body{margin:12mm}
          .zx_ficha_bloque,.zx_contact_box,.zx_emergencia_box{break-inside:avoid}
        }
      </style>
    </head>
    <body>
      ${contenido}
      <script>
        window.onload=function(){
          setTimeout(function(){window.print()},250);
        };
      <\/script>
    </body>
    </html>
  `);
  w.document.close();
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
          <b>${limpiar(l.horas_dia ?? "-")}</b>
        </div>

        <div>
          <span>Horas/semana</span>
          <b>${limpiar(l.horas_semana ?? "-")}</b>
        </div>

        <div>
          <span>Vacaciones</span>
          <b>${limpiar(l.vacaciones_dias ?? "-")}</b>
        </div>

        <div>
          <span>Asuntos propios</span>
          <b>${limpiar(l.asuntos_propios ?? "-")}</b>
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
  asignar("f_imprimir",()=>imprimirFichaActual());
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
    ${selectSimple("u_estado","Estado",u.estado || "Activo",["Activo","Inactivo"])}

  `);

  const guardarActual=function(){
    guardarUsuario(u.id || null,u.foto_url || null);
  };

  const cancelarArriba=document.getElementById("btn_cancelar_usuario_top");
  const guardarArriba=document.getElementById("btn_guardar_usuario_top");

  if(cancelarArriba) cancelarArriba.onclick=cerrarModal;
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
    "rol",
    "estado",
    "activo"
  ];
}

function calcularCambiosUsuario(antes,despues){
  const cambios=[];

  camposAuditablesUsuario().forEach(function(campo){
    const a=String((antes && antes[campo]) ?? "");
    const b=String((despues && despues[campo]) ?? "");

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
    rol:datos.rol || s.rol
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

  const h2=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("user_id",String(usuarioId))
    .eq("activo",true)
    .limit(1);

  if(!h2.error && h2.data && h2.data.length){
    return normalizarLaboralDesdeHorario(h2.data[0]);
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

function resumenLaboral(l,consumo){
  const bloqueConsumo=consumo ? renderResumenConsumo(l,consumo) : "";

  return `
    <div class="zx_laboral_resumen">
      <div><b>${limpiar(l.horas_dia ?? 0)}</b><span>Horas/día</span></div>
      <div><b>${limpiar(l.horas_semana ?? 0)}</b><span>Horas/semana</span></div>
      <div><b>${limpiar(l.vacaciones_dias ?? 0)}</b><span>Vacaciones asignadas</span></div>
      <div><b>${limpiar(l.asuntos_propios ?? 0)}</b><span>Asuntos propios asignados</span></div>
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

async function verLaboralUsuario(u){
  if(!puedeVerLaboral(u)){
    alert("No tienes permiso para ver laboral.");
    return;
  }

  const actual=await cargarLaboralUsuario(u.id);
  const l=actual || laboralDefault(u);
  const solicitudes=await cargarSolicitudesUsuario(String(u.id || ""));
  const consumo=calcularConsumoLaboral(solicitudes);
  const editable=puedeEditarLaboral(u);
  const provincias=opcionesProvincias(l.comunidad,l.provincia);

  modal("Laboral",`
    <div class="zx_user_top_actions">
      <button type="button" class="zx_user_top_back" id="lab_volver_top">← Volver</button>
      ${editable ? `<button type="button" class="zx_user_top_primary" id="lab_guardar_top">💾 Guardar</button>` : ``}
    </div>

    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>
    ${resumenLaboral(l,consumo)}

    ${renderHistorialLaboral(solicitudes)}

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

    ${
      puedeVerDatosLaboralesSensibles(u)
      ? `
        <h3 class="zx_form_subtitle">Precios horas extra</h3>
        ${inputNum("lab_precio_extra","Precio hora extra",l.precio_extra,"0.01")}
        ${inputNum("lab_precio_extra_nocturna","Precio hora extra nocturna",l.precio_extra_nocturna,"0.01")}
        ${inputNum("lab_precio_extra_festiva","Precio hora extra festiva",l.precio_extra_festiva,"0.01")}
      `
      : ``
    }

    <h3 class="zx_form_subtitle">Calendario laboral</h3>
    ${selectLaboral("lab_pais","País",l.pais || "España",["España"])}
    ${selectLaboral("lab_comunidad","Comunidad autónoma",l.comunidad,ZX_COMUNIDADES)}
    ${selectLaboral("lab_provincia","Provincia",l.provincia,["",...provincias])}
    ${inputConLista("lab_localidad","Localidad",l.localidad,"lab_localidad_lista")}

    ${selectLaboral("lab_convenio","Convenio",l.convenio,ZX_CONVENIOS)}

  `);

  const volverArriba=document.getElementById("lab_volver_top");
  if(volverArriba) volverArriba.onclick=cerrarModal;

  cargarDatalistLocalidades(l.provincia,l.localidad);
  activarFiltrosUbicacion();

  const guardar=document.getElementById("lab_guardar_top");
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

    localidad.value="";
    cargarDatalistLocalidades("", "");
  };

  provincia.onchange=function(){
    localidad.value="";
    cargarDatalistLocalidades(provincia.value,"");
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
  if(!esAdminLocal()){
    alert("No tienes permiso para modificar datos laborales.");
    return;
  }

  const r=await guardarHorarioUsuario(datos);

  if(r && r.error){
    alert("Error guardando horarios_usuario: "+r.error.message);
    return;
  }

  await guardarSaldoAusenciasUsuario(datos);
  await registrarAuditoriaUsuario(datos.usuario_id,"laboral_modificado",[
    {campo:"horas_dia",antes:"",despues:String(datos.horas_dia || "")},
    {campo:"horas_semana",antes:"",despues:String(datos.horas_semana || "")},
    {campo:"vacaciones_dias",antes:"",despues:String(datos.vacaciones_dias || "")},
    {campo:"asuntos_propios",antes:"",despues:String(datos.asuntos_propios || "")}
  ]);

  alert("Datos laborales guardados.");
  cerrarModal();
  ZX_usuarios();
}



async function guardarSaldoAusenciasUsuario(datos){
  try{
    const anio=new Date().getFullYear();
    const usuarioId=String(datos.usuario_id || "");

    if(!usuarioId) return;

    const buscado=await sb()
      .from("saldos_ausencias")
      .select("id")
      .eq("user_id",usuarioId)
      .eq("anio",anio)
      .limit(1);

    if(buscado.error) return;

    const saldo={
      user_id:usuarioId,
      anio:anio,
      dias_vacaciones:Math.round(Number(datos.vacaciones_dias || 0)),
      dias_asuntos_propios:Number(datos.asuntos_propios || 0)
    };

    if(buscado.data && buscado.data.length){
      await sb().from("saldos_ausencias").update(saldo).eq("id",buscado.data[0].id);
    }else{
      saldo.created_at=new Date().toISOString();
      await sb().from("saldos_ausencias").insert([saldo]);
    }
  }catch(e){}
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
    return await sb().from("horarios_usuario").update(horario).eq("id",buscado.data[0].id);
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

  return {
    jornadas:[...jornadasA,...jornadasB],
    fichajes:[...fichajesA,...fichajesB],
    horas:[...horasA,...horasB],
    solicitudes:[...solicitudesA,...solicitudesB]
  };
}

function textoMinutos(min){
  const n=Number(min || 0);
  if(!Number.isFinite(n) || n<=0) return "0 h";
  const h=Math.floor(n/60);
  const m=n%60;
  return h+" h"+(m ? " "+m+" min" : "");
}

function fechaISO(v){
  if(!v) return "";
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0,10);
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

function renderHistorialFichajes(lista){
  if(!lista.length) return `<div class="zx_text">Sin fichajes registrados.</div>`;

  return lista.slice(0,12).map(f=>{
    const fecha=fechaES(f.created_at || f.fecha || f.hora);
    const hora=horaES(f.created_at || f.hora || f.fecha);
    const tipo=f.tipo || f.accion || f.estado || "Fichaje";
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
    const estado=h.estado || (h.pagada ? "Pagada" : "Pendiente");
    const tipo=h.tipo || "Hora extra";

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
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>
    <div class="zx_text">Cargando historial...</div>
  `);

  const h=await cargarHistorialUsuario(u);

  modal("Historial",`
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

    <button class="zx_btn_big zx_gris" id="hist_cerrar">Cerrar</button>
  `);

  document.getElementById("hist_cerrar").onclick=cerrarModal;
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

function renderAuditoriaCambios(detalle){
  const cambios=parseDetalleAuditoria(detalle);

  if(!cambios.length){
    return `<div class="zx_text">Sin detalle de campos.</div>`;
  }

  return cambios.map(c=>`
    <div class="zx_audit_cambio">
      <b>${limpiar(c.campo || "-")}</b>
      <span>Antes: ${limpiar(c.antes || "-")}</span>
      <span>Después: ${limpiar(c.despues || "-")}</span>
    </div>
  `).join("");
}

async function verAuditoriaUsuario(u){
  modal("Auditoría",`
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>
    <div class="zx_text">Cargando auditoría...</div>
  `);

  const datos=await cargarAuditoriaUsuario(u.id);

  modal("Auditoría",`
    <div class="zx_text"><b>${limpiar(u.nombre || u.usuario || "Usuario")}</b></div>

    ${
      datos.length
      ? datos.map(a=>`
        <details class="zx_audit_item">
          <summary>
            <b>${limpiar(String(a.accion || "-").replaceAll("_"," "))}</b>
            <span>${limpiar(fechaHoraES(a.fecha))} · ${limpiar(a.usuario || "-")}</span>
          </summary>
          ${renderAuditoriaCambios(a.detalle)}
        </details>
      `).join("")
      : `<div class="zx_text">Sin auditoría registrada.</div>`
    }

    <button class="zx_btn_big zx_gris" id="audit_cerrar">Cerrar</button>
  `);

  document.getElementById("audit_cerrar").onclick=cerrarModal;
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
    .select("id,eliminado");

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
    {campo:"documento_id",antes:String(id || ""),despues:"eliminado"}
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
  if(document.getElementById("zx_usuarios_v3143")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3143";

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
    .zx_user_top_actions{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:-2px 0 16px;padding:4px 0 12px;background:linear-gradient(#fff 82%,rgba(255,255,255,.96));border-bottom:1px solid #e2e8f0}
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
