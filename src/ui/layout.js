// ===============================
// ZENTRYX PRO - LAYOUT
// V3099 - NAVEGACION ESTABLE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3099";
let ZX_RELOJ_TIMER=null;
let ZX_AGENDA_TIMER=null;
const ZX_HORAS_FUNC_INICIAL=window.ZX_horas_extra || null;

function $(id){return document.getElementById(id)}
function app(){return $("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}
}

function usuarioActual(){
  const s=sesion();
  return {id:s.id||"",usuario:s.usuario||"",rol:s.rol||""};
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizar(v){
  return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

function esAdmin(){
  const u=usuarioActual();
  return normalizar(u.rol)==="administrador" || normalizar(u.usuario)==="admin";
}

function hoyISO(){return new Date().toISOString().slice(0,10)}

function formatoFechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function limpiarLayout(){
  ["zx_topbar","zx_nav","zx_reloj","zx_postit","zx_css"].forEach(function(id){
    const el=$(id);
    if(el) el.remove();
  });

  if(ZX_RELOJ_TIMER){clearInterval(ZX_RELOJ_TIMER);ZX_RELOJ_TIMER=null}
  if(ZX_AGENDA_TIMER){clearInterval(ZX_AGENDA_TIMER);ZX_AGENDA_TIMER=null}
}

function estilos(){
  const css=document.createElement("style");
  css.id="zx_css";
  css.innerHTML=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;padding:0;width:100%;max-width:100%;min-height:100%;background:#eef2f7;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;overflow-x:hidden}
    body{min-height:100vh;padding-bottom:calc(env(safe-area-inset-bottom) + 132px)}
    body.zx_modal_abierto #zx_postit{display:none!important}
    button,input,select,textarea{font-family:inherit}button{cursor:pointer}
    #zx_topbar{width:100%;background:#071330;color:white;padding:16px}
    #zx_topbar_inner{width:100%;max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
    #zx_brand{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
    #zx_logo{width:54px;height:54px;min-width:54px;border-radius:16px;background:linear-gradient(135deg,#2563eb,#10b981);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:white}
    #zx_brand_txt{min-width:0}#zx_brand_txt h1{margin:0;font-size:24px;line-height:1.05;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #zx_brand_txt div{margin-top:4px;color:#cbd5e1;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #zx_salir{border:0;border-radius:16px;background:#dc2626;color:white;padding:14px 18px;font-size:17px;font-weight:900;flex:none}
    #zx_reloj{width:100%;background:#0f172a;color:white;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:10px 16px}
    #zx_reloj_inner{width:100%;max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
    #zx_fecha{color:#cbd5e1;font-size:14px;font-weight:900;white-space:nowrap}#zx_hora{color:white;font-size:28px;font-weight:900;letter-spacing:.5px;white-space:nowrap;line-height:1.05}
    #zx_agenda_btn{border:0;border-radius:20px;background:#facc15;color:#422006;padding:12px 18px;min-width:92px;font-size:21px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 18px rgba(0,0,0,.18);flex:none}
    #zx_nav{width:100%;background:#071330;padding:12px 12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
    #zx_nav_inner{width:100%;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
    .zx_nav_btn{width:100%;border:0;border-radius:16px;background:#334155;color:white;padding:14px 8px;font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
    .zx_nav_btn.zx_activo{background:#2563eb}
    #app{width:100%;max-width:1180px;margin:0 auto;padding:18px 16px;overflow-x:hidden}
    .zx_card{width:100%;background:white;border:1px solid #d1d5db;border-radius:24px;padding:22px;margin-bottom:18px;box-shadow:0 8px 22px rgba(15,23,42,.06);overflow:hidden}
    .zx_card h2{margin:0 0 14px;color:#0f172a;font-size:32px;line-height:1.1;font-weight:900}.zx_card h3{margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.15;font-weight:900}
    .zx_text{color:#64748b;font-size:17px;line-height:1.45;font-weight:750}
    .zx_btn_big,.zx_btn{width:100%;border:0;border-radius:20px;padding:18px;margin-top:12px;font-size:19px;font-weight:900;color:white;text-align:center;display:block;text-decoration:none}
    .zx_rojo{background:#dc2626}.zx_azul{background:#2563eb}.zx_verde{background:#16a34a}.zx_naranja{background:#ea580c}.zx_morado{background:#7c3aed}.zx_gris{background:#64748b}
    input,select,textarea{width:100%;border:1px solid #cbd5e1;border-radius:16px;padding:15px;margin-top:10px;font-size:17px;color:#0f172a;background:white}
    #zx_postit{position:fixed;right:18px;bottom:calc(env(safe-area-inset-bottom) + 34px);width:66px;height:66px;border-radius:50%;border:4px solid white;background:#facc15;color:#422006;font-size:30px;font-weight:900;z-index:9000;box-shadow:0 12px 32px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
    .zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:99999}
    .zx_modal_caja{width:100%;max-width:620px;max-height:90vh;overflow-y:auto;background:white;border-radius:28px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.38)}
    .zx_modal_caja h2{margin:0 0 14px;color:#0f172a;font-size:30px;font-weight:900}
    .zx_list_item{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:12px}.zx_list_title{color:#0f172a;font-size:17px;font-weight:900;line-height:1.35;white-space:pre-wrap}.zx_list_meta{margin-top:8px;color:#64748b;font-size:14px;font-weight:800;line-height:1.4}.zx_list_desc{margin-top:8px;color:#475569;font-size:15px;font-weight:750;line-height:1.4;white-space:pre-wrap}
    @media(max-width:430px){#zx_topbar{padding:14px 14px 12px}#zx_logo{width:50px;height:50px;min-width:50px;font-size:28px}#zx_brand_txt h1{font-size:22px}#zx_brand_txt div{font-size:13px}#zx_salir{padding:12px 15px;font-size:15px}#zx_reloj_inner{gap:10px}#zx_hora{font-size:27px}#zx_fecha{font-size:13px}#zx_agenda_btn{min-width:86px;padding:10px 14px;font-size:20px}.zx_nav_btn{font-size:15px;padding:13px 8px}#app{padding:16px 12px}.zx_card{padding:20px;border-radius:22px}.zx_card h2{font-size:31px}.zx_card h3{font-size:23px}}
    @media(min-width:700px){#zx_nav_inner{grid-template-columns:repeat(4,1fr)}#app{padding:24px}}
    @media(min-width:1024px){#zx_nav_inner{grid-template-columns:repeat(6,1fr)}.zx_card{padding:28px}}
  `;
  document.head.appendChild(css);
}

function topbar(){
  const u=usuarioActual();
  const t=document.createElement("div");
  t.id="zx_topbar";
  t.innerHTML=`
    <div id="zx_topbar_inner">
      <div id="zx_brand">
        <div id="zx_logo">Z</div>
        <div id="zx_brand_txt"><h1>Zentryx PRO</h1><div>${limpiar(u.usuario || "usuario")} · ${limpiar(u.rol || "Sin rol")}</div></div>
      </div>
      <button id="zx_salir" type="button">Salir</button>
    </div>
  `;
  document.body.insertBefore(t,app());
  $("zx_salir").onclick=function(){
    localStorage.removeItem("zentryx_session");
    localStorage.removeItem("usuario");
    location.href="index.html?v="+ZX_VERSION;
  };
}

function reloj(){
  const r=document.createElement("div");
  r.id="zx_reloj";
  r.innerHTML=`
    <div id="zx_reloj_inner">
      <div><div id="zx_fecha">--/--/----</div><div id="zx_hora">--:--</div></div>
      <button id="zx_agenda_btn" type="button" onclick="ZX_abrirAgendaHoy()">📅</button>
    </div>
  `;
  document.body.insertBefore(r,app());
  actualizarReloj();
  ZX_RELOJ_TIMER=setInterval(actualizarReloj,1000);
  actualizarContadorAgenda();
  ZX_AGENDA_TIMER=setInterval(actualizarContadorAgenda,60000);
}

function actualizarReloj(){
  const d=new Date();
  const fecha=d.toLocaleDateString("es-ES",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
  const hora=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  if($("zx_fecha")) $("zx_fecha").textContent=fecha;
  if($("zx_hora")) $("zx_hora").textContent=hora;
}

async function eventosHoy(){
  const f=hoyISO();
  const u=usuarioActual();
  const r=await sb().from("agenda_eventos").select("*").lte("fecha_inicio",f).gte("fecha_fin",f).neq("estado","completado").neq("estado","cancelado").order("hora_inicio",{ascending:true}).limit(30);
  if(r.error) return [];
  let datos=r.data || [];
  if(!esAdmin()){
    datos=datos.filter(e=>String(e.visible_para || "todos")==="todos" || String(e.usuario_id || "")===String(u.id || ""));
  }
  return datos;
}

async function actualizarContadorAgenda(){
  const btn=$("zx_agenda_btn");
  if(!btn) return;
  try{
    const datos=await eventosHoy();
    btn.textContent=datos.length ? "📅 "+datos.length : "📅";
    btn.title="Agenda de hoy";
  }catch(e){btn.textContent="📅"}
}

function textoTipo(t){
  const m={recordatorio:"Nota",trabajo:"Trabajo",cita:"Cita",vacaciones:"Vacaciones",permiso:"Permiso",revision:"Revisión",libranza:"Libranza",baja_medica:"Baja médica",asuntos_propios:"Asuntos propios",festivo:"Festivo"};
  return m[t] || t || "Evento";
}

function renderEventoHoy(e){
  const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "Sin hora";
  const icono=e.tipo==="recordatorio" ? "📝" : e.tipo==="trabajo" ? "🔧" : "📅";
  return `
    <div class="zx_list_item">
      <div class="zx_list_title">${icono} ${limpiar(e.titulo || "Evento")}</div>
      <div class="zx_list_meta">${limpiar(hora)} · ${limpiar(textoTipo(e.tipo))}${e.usuario ? "<br>Operario: "+limpiar(e.usuario) : ""}${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}</div>
      ${e.descripcion ? `<div class="zx_list_desc">${limpiar(e.descripcion)}</div>` : ""}
      ${e.tipo==="trabajo" && e.origen==="trabajos" && e.origen_id ? `<button class="zx_btn_big zx_azul" onclick="ZX_abrirTrabajoDesdeLayout('${limpiar(e.origen_id)}')">Abrir trabajo</button>` : ""}
    </div>
  `;
}

window.ZX_abrirTrabajoDesdeLayout=function(id){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
  window.ZX_TRABAJO_ABRIR_ID=String(id || "");
  if(window.ZX_trabajos){window.ZX_trabajos();return}
  alert("No se ha cargado Trabajos.");
};

window.ZX_abrirAgendaHoy=async function(){
  const anterior=$("zx_modal_agenda_hoy");
  if(anterior) anterior.remove();
  document.body.classList.add("zx_modal_abierto");
  const modal=document.createElement("div");
  modal.id="zx_modal_agenda_hoy";
  modal.innerHTML=`
    <div class="zx_modal_fondo"><div class="zx_modal_caja">
      <h2>Agenda de hoy</h2>
      <div id="zx_agenda_hoy_lista" class="zx_text">Cargando...</div>
      <button class="zx_btn_big zx_verde" onclick="ZX_abrirAgendaDesdePanel()">Abrir Agenda</button>
      <button class="zx_btn_big zx_gris" onclick="ZX_cerrarModalAgendaHoy()">Cerrar</button>
    </div></div>
  `;
  document.body.appendChild(modal);
  const lista=$("zx_agenda_hoy_lista");
  const datos=await eventosHoy();
  if(lista) lista.innerHTML=datos.length ? datos.map(renderEventoHoy).join("") : `<div class="zx_text">Sin citas ni notas para hoy.</div>`;
};

window.ZX_cerrarModalAgendaHoy=function(){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_abrirAgendaDesdePanel=function(){
  window.ZX_cerrarModalAgendaHoy();
  if(window.ZX_abrirAgenda){window.ZX_abrirAgenda();return}
  if(window.ZX_agenda) window.ZX_agenda();
};

function puedeVerModulo(modulo){
  if(esAdmin()) return true;
  return ["inicio","fichaje","agenda","clientes","trabajos","usuarios","horas_extra"].includes(modulo);
}

function botonNav(modulo,texto,accion){
  if(!puedeVerModulo(modulo)) return "";
  return `<button class="zx_nav_btn" data-modulo="${modulo}" type="button" onclick="${accion}">${texto}</button>`;
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";
  n.innerHTML=`
    <div id="zx_nav_inner">
      ${botonNav("inicio","Inicio","ZX_inicio()")}
      ${botonNav("fichaje","Fichaje","ZX_abrirFichaje()")}
      ${botonNav("agenda","Agenda","ZX_abrirAgenda()")}
      ${botonNav("clientes","Clientes","ZX_abrirClientes()")}
      ${botonNav("trabajos","Trabajos","ZX_abrirTrabajos()")}
      ${botonNav("usuarios","Usuarios","ZX_usuarios()")}
      ${botonNav("horas_extra","Horas","ZX_abrirHorasExtra()")}
      ${botonNav("configuracion","Config.","ZX_configuracion()")}
    </div>
  `;
  document.body.insertBefore(n,app());
}

function activo(nombre){
  const objetivo=String(nombre || "")==="horas" ? "horas_extra" : String(nombre || "");
  if(window.ZENTRYX && typeof window.ZENTRYX.marcarModuloActivo==="function"){
    window.ZENTRYX.marcarModuloActivo(objetivo);
    return;
  }
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(String(b.dataset.modulo || "")===objetivo) b.classList.add("zx_activo");
  });
}

function abrirModulo(nombre,callback){
  if(!puedeVerModulo(nombre)){
    activo("");
    app().innerHTML=`<div class="zx_card"><h2>Sin permiso</h2><div class="zx_text">Tu usuario no tiene acceso a este módulo.</div></div>`;
    return;
  }
  activo(nombre);
  if(callback) callback();
}

async function cargarNotas(){
  const u=usuarioActual();
  const r=await sb().from("agenda_eventos").select("*").eq("tipo","recordatorio").or("usuario_id.eq."+u.id+",visible_para.eq.todos").order("created_at",{ascending:false}).limit(20);
  if(r.error) return [];
  return r.data || [];
}

function renderNota(n){
  return `
    <div class="zx_list_item">
      <div class="zx_list_title">📝 ${limpiar(n.descripcion || n.titulo || "")}</div>
      <div class="zx_list_meta">${limpiar(formatoFechaES(n.fecha_inicio || ""))}${n.hora_inicio ? " · "+limpiar(String(n.hora_inicio).slice(0,5)) : ""}</div>
      <button class="zx_btn_big zx_rojo" onclick="ZX_borrarNotaRapida('${n.id}')">Borrar</button>
    </div>
  `;
}

window.ZX_abrirNotasRapidas=async function(){
  const anterior=$("zx_modal_notas");
  if(anterior) anterior.remove();
  document.body.classList.add("zx_modal_abierto");
  const modal=document.createElement("div");
  modal.id="zx_modal_notas";
  modal.innerHTML=`
    <div class="zx_modal_fondo"><div class="zx_modal_caja">
      <h2>Notas rápidas</h2>
      <textarea id="zx_nota_rapida_texto" rows="5" placeholder="Escribe una nota o recordatorio..."></textarea>
      <label class="zx_text" style="display:block;margin-top:12px;">Fecha del aviso</label>
      <input id="zx_nota_rapida_fecha" type="date" value="${hoyISO()}">
      <label class="zx_text" style="display:block;margin-top:12px;">Hora del aviso</label>
      <input id="zx_nota_rapida_hora" type="time">
      <button class="zx_btn_big zx_verde" onclick="ZX_guardarNotaRapida()">Guardar nota</button>
      <div id="zx_notas_rapidas_lista" style="margin-top:18px;"></div>
      <button class="zx_btn_big zx_gris" onclick="ZX_cerrarNotasRapidas()">Cerrar</button>
    </div></div>
  `;
  document.body.appendChild(modal);
  const notas=await cargarNotas();
  const lista=$("zx_notas_rapidas_lista");
  if(lista) lista.innerHTML=notas.length ? notas.map(renderNota).join("") : `<div class="zx_text">Sin notas.</div>`;
};

window.ZX_cerrarNotasRapidas=function(){
  const m=$("zx_modal_notas");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_guardarNotaRapida=async function(){
  const u=usuarioActual();
  const texto=String($("zx_nota_rapida_texto")?.value || "").trim();
  const fecha=$("zx_nota_rapida_fecha")?.value || hoyISO();
  const hora=$("zx_nota_rapida_hora")?.value || null;
  if(!texto){alert("Escribe una nota.");return}
  const r=await sb().from("agenda_eventos").insert([{tipo:"recordatorio",titulo:texto.slice(0,60),descripcion:texto,fecha_inicio:fecha,fecha_fin:fecha,hora_inicio:hora,usuario_id:String(u.id || ""),usuario:u.usuario || "",estado:"activo",prioridad:"normal",creado_por:u.usuario || "",visible_para:"todos",recordatorio:true,origen:"postit"}]);
  if(r.error){alert("Error guardando nota: "+r.error.message);return}
  ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

window.ZX_borrarNotaRapida=async function(id){
  if(!confirm("¿Borrar esta nota?")) return;
  const r=await sb().from("agenda_eventos").delete().eq("id",id);
  if(r.error){alert("Error borrando nota: "+r.error.message);return}
  ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

function botonPostit(){
  const b=document.createElement("button");
  b.id="zx_postit";
  b.type="button";
  b.textContent="📝";
  b.onclick=function(){if(window.ZX_abrirNotasRapidas) window.ZX_abrirNotasRapidas()};
  document.body.appendChild(b);
}

window.ZX_inicio=function(){abrirModulo("inicio",function(){if(window.ZENTRYX_UI_inicio) window.ZENTRYX_UI_inicio()})};

window.ZX_abrirFichaje=function(){
  abrirModulo("fichaje",function(){
    if(window.ZX_fichaje_real){window.ZX_fichaje_real();return}
    if(window.ZX_fichaje){window.ZX_fichaje();return}
    app().innerHTML=`<div class="zx_card"><h2>Fichaje</h2><div class="zx_text">No se ha cargado fichaje.js.</div></div>`;
  });
};

window.ZX_abrirAgenda=function(){
  abrirModulo("agenda",function(){
    if(window.ZX_agenda){window.ZX_agenda();return}
    app().innerHTML=`<div class="zx_card"><h2>Agenda</h2><div class="zx_text">No se ha cargado agenda.js.</div></div>`;
  });
};

window.ZX_abrirClientes=function(){
  abrirModulo("clientes",function(){
    if(window.ZX_clientes){window.ZX_clientes();return}
    app().innerHTML=`<div class="zx_card"><h2>Clientes</h2><div class="zx_text">No se ha cargado clientes.js.</div></div>`;
  });
};

window.ZX_abrirTrabajos=function(){
  abrirModulo("trabajos",function(){
    if(window.ZX_trabajos){window.ZX_trabajos();return}
    app().innerHTML=`<div class="zx_card"><h2>Trabajos</h2><div class="zx_text">No se ha cargado trabajos.js.</div></div>`;
  });
};

window.ZX_usuarios=function(){
  abrirModulo("usuarios",function(){
    if(window.ZENTRYX_UI_usuarios){window.ZENTRYX_UI_usuarios();return}
    app().innerHTML=`<div class="zx_card"><h2>Usuarios</h2><div class="zx_text">No se ha cargado usuarios.js.</div></div>`;
  });
};

window.ZX_abrirHorasExtra=function(){
  abrirModulo("horas_extra",function(){
    const fActual=window.ZX_horas_extra;
    if(typeof fActual==="function" && fActual!==window.ZX_abrirHorasExtra){fActual();activo("horas_extra");return}
    if(typeof ZX_HORAS_FUNC_INICIAL==="function"){ZX_HORAS_FUNC_INICIAL();activo("horas_extra");return}
    if(window.ZENTRYX_UI_horas_extra){window.ZENTRYX_UI_horas_extra();activo("horas_extra");return}
    app().innerHTML=`<div class="zx_card"><h2>Horas</h2><div class="zx_text">No se ha cargado horas_extra.js.</div></div>`;
  });
};

window.ZX_vehiculos=function(){abrirModulo("vehiculos",function(){app().innerHTML=`<div class="zx_card"><h2>Vehículos</h2><div class="zx_text">Módulo vehículos pendiente.</div></div>`})};
window.ZX_incidencias=function(){abrirModulo("incidencias",function(){app().innerHTML=`<div class="zx_card"><h2>Incidencias</h2><div class="zx_text">Módulo incidencias pendiente.</div></div>`})};
window.ZX_informes=function(){abrirModulo("informes",function(){app().innerHTML=`<div class="zx_card"><h2>Informes</h2><div class="zx_text">Módulo informes pendiente.</div></div>`})};

window.ZX_configuracion=function(){
  abrirModulo("configuracion",function(){
    if(window.ZX_configLaboral){window.ZX_configLaboral();return}
    if(window.ZX_config_laboral){window.ZX_config_laboral();return}
    app().innerHTML=`<div class="zx_card"><h2>Configuración</h2><div class="zx_text">No se ha cargado config_laboral.js.</div></div>`;
  });
};

window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    limpiarLayout();
    estilos();
    topbar();
    reloj();
    nav();
    botonPostit();
  }
};

console.log("ZENTRYX layout.js V3099 cargado");

})();
