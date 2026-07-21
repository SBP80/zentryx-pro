// ===============================
// ZENTRYX PRO - LAYOUT
// V3124 - CONSERVAR MÓDULO ACTIVO EN IOS
// ===============================
(function(){
"use strict";

const ZX_VERSION="3124";

let ZX_RELOJ_TIMER=null;
let ZX_AGENDA_TIMER=null;
const ZX_LAST_MODULE_KEY="zentryx_last_module";

function $(id){return document.getElementById(id)}
function app(){return $("app")}
function sb(){return window.sb || window.supabaseClient || null}

function zx(){
  return window.ZENTRYX || window.ZX || null;
}

function sesion(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function usuarioActual(){
  const s=sesion();
  return {
    id:s.id || "",
    usuario:s.usuario || s.nombre || "",
    nombre:s.nombre || s.usuario || "",
    rol:s.rol || "",
    empresa_id:s.empresa_id || "demo"
  };
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
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function esAdmin(){
  const u=usuarioActual();
  return normalizar(u.rol)==="administrador" || normalizar(u.usuario)==="admin";
}

function esDesarrollador(){
  const u=usuarioActual();
  const rol=normalizar(u.rol);
  const usuario=normalizar(u.usuario);
  return rol==="desarrollador" || rol==="developer" || rol==="dev" ||
         usuario==="desarrollador" || usuario==="developer" || usuario==="dev";
}

function hoyISO(){
  return new Date().toISOString().slice(0,10);
}

function formatoFechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function limpiarLayout(){
  ["zx_topbar","zx_reloj","zx_nav","zx_postit","zx_css","zx_actionbar"].forEach(function(id){
    const el=$(id);
    if(el) el.remove();
  });

  if(ZX_RELOJ_TIMER){
    clearInterval(ZX_RELOJ_TIMER);
    ZX_RELOJ_TIMER=null;
  }

  if(ZX_AGENDA_TIMER){
    clearInterval(ZX_AGENDA_TIMER);
    ZX_AGENDA_TIMER=null;
  }
}

function estilos(){
  const css=document.createElement("style");
  css.id="zx_css";
  css.innerHTML=`
    :root{
      --zx-primary:#2563eb;
      --zx-bg:#f4f7fb;
      --zx-card:#ffffff;
      --zx-text:#071330;
      --zx-muted:#64748b;
      --zx-line:#dbe3ef;
      --zx-soft:#f8fafc;
      --zx-green:#16a34a;
      --zx-red:#dc2626;
      --zx-orange:#f97316;
      --zx-purple:#7c3aed;
      --zx-cyan:#0891b2;
      --zx-gray:#64748b;
      --zx-shadow:0 12px 28px rgba(15,23,42,.07);
    }

    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

    html,body{
      margin:0;
      padding:0;
      width:100%;
      min-height:100%;
      background:var(--zx-bg);
      color:var(--zx-text);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      overflow-x:hidden;
    }

    body{
      min-height:100vh;
      padding-bottom:calc(env(safe-area-inset-bottom) + 132px);
    }

    body.zx_modal_abierto #zx_postit,
    body.zx_modal_abierto #zx_actionbar{
      display:none!important;
    }

    button,input,select,textarea{font-family:inherit}
    button{cursor:pointer;border:0}
    button:active{transform:scale(.99)}
    button:disabled{opacity:.55;cursor:not-allowed}

    #zx_topbar{
      width:100%;
      background:linear-gradient(135deg,#ffffff,#eef5ff);
      border-bottom:1px solid var(--zx-line);
      padding:10px 14px;
      position:sticky;
      top:0;
      z-index:8000;
      backdrop-filter:blur(18px);
    }

    #zx_topbar_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
      flex:1;
    }

    #zx_logo{
      width:42px;
      height:42px;
      min-width:42px;
      border-radius:15px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      font-weight:950;
      color:white;
      box-shadow:0 10px 22px rgba(37,99,235,.25);
    }

    #zx_brand_txt{min-width:0}

    #zx_brand_txt h1{
      margin:0;
      font-size:20px;
      line-height:1.05;
      font-weight:950;
      letter-spacing:-.3px;
      color:#071330;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_brand_txt div{
      margin-top:3px;
      color:var(--zx-muted);
      font-size:12px;
      font-weight:850;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_salir{
      border-radius:14px;
      background:#fee2e2;
      color:#991b1b;
      padding:11px 13px;
      font-size:14px;
      font-weight:950;
      flex:none;
    }

    #zx_reloj{
      width:100%;
      background:rgba(255,255,255,.82);
      border-bottom:1px solid var(--zx-line);
      padding:8px 14px;
      z-index:7000;
    }

    #zx_reloj_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    #zx_fecha{
      color:var(--zx-muted);
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
      text-transform:capitalize;
    }

    #zx_hora{
      color:#071330;
      font-size:22px;
      font-weight:950;
      letter-spacing:-.2px;
      white-space:nowrap;
      line-height:1.05;
    }

    #zx_agenda_btn{
      border-radius:16px;
      background:#fff7ed;
      color:#c2410c;
      padding:10px 14px;
      min-width:78px;
      font-size:18px;
      font-weight:950;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      box-shadow:0 8px 18px rgba(249,115,22,.13);
      flex:none;
    }

    #zx_nav{
      width:100%;
      background:rgba(255,255,255,.88);
      border-bottom:1px solid var(--zx-line);
      padding:10px 12px;
      z-index:6500;
    }

    #zx_nav_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:8px;
    }

    .zx_nav_btn{
      width:100%;
      min-height:70px;
      border-radius:20px;
      background:white;
      color:#334155;
      padding:8px 6px;
      font-size:12px;
      font-weight:950;
      border:1px solid var(--zx-line);
      box-shadow:0 8px 18px rgba(15,23,42,.045);
      text-align:center;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:6px;
    }

    .zx_nav_icon{
      width:34px;
      height:34px;
      border-radius:13px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:22px;
      line-height:1;
      box-shadow:0 8px 18px rgba(15,23,42,.06);
    }

    .zx_nav_btn.zx_activo{
      background:var(--zx-primary);
      color:white;
      border-color:var(--zx-primary);
      box-shadow:0 12px 24px rgba(37,99,235,.22);
    }

    .zx_nav_btn.zx_activo .zx_nav_icon{
      background:rgba(255,255,255,.18)!important;
      box-shadow:none;
    }

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:16px 12px;
      overflow-x:hidden;
    }

    .zx_card{
      width:100%;
      background:var(--zx-card);
      border:1px solid var(--zx-line);
      border-radius:26px;
      padding:20px;
      margin-bottom:16px;
      box-shadow:var(--zx-shadow);
      overflow:hidden;
    }

    .zx_card h2{
      margin:0 0 12px;
      color:#071330;
      font-size:30px;
      line-height:1.1;
      font-weight:950;
      letter-spacing:-.5px;
    }

    .zx_card h3{
      margin:0 0 12px;
      color:#071330;
      font-size:23px;
      line-height:1.15;
      font-weight:950;
      letter-spacing:-.3px;
    }

    .zx_text{
      color:var(--zx-muted);
      font-size:16px;
      line-height:1.42;
      font-weight:800;
    }

    .zx_btn_big,.zx_btn{
      width:100%;
      border-radius:18px;
      padding:16px;
      margin-top:12px;
      font-size:17px;
      font-weight:950;
      color:white;
      text-align:center;
      display:block;
      text-decoration:none;
    }

    .zx_rojo{background:var(--zx-red)}
    .zx_azul{background:var(--zx-primary)}
    .zx_verde{background:var(--zx-green)}
    .zx_naranja{background:var(--zx-orange)}
    .zx_morado{background:var(--zx-purple)}
    .zx_gris{background:var(--zx-gray)}

    input,select,textarea{
      width:100%;
      border:1px solid var(--zx-line);
      border-radius:16px;
      padding:14px;
      margin-top:10px;
      font-size:16px;
      color:var(--zx-text);
      background:white;
      outline:none;
    }

    input:focus,select:focus,textarea:focus{
      border-color:var(--zx-primary);
      box-shadow:0 0 0 4px rgba(37,99,235,.12);
    }

    #zx_postit{
      position:fixed;
      right:16px;
      bottom:calc(env(safe-area-inset-bottom) + 76px);
      width:58px;
      height:58px;
      border-radius:20px;
      background:#fef3c7;
      color:#92400e;
      font-size:26px;
      font-weight:950;
      z-index:9000;
      box-shadow:0 14px 34px rgba(15,23,42,.22);
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid #fde68a;
    }

    #zx_actionbar{
      position:fixed;
      left:10px;
      right:10px;
      bottom:calc(env(safe-area-inset-bottom) + 10px);
      z-index:8500;
      background:rgba(255,255,255,.93);
      border:1px solid var(--zx-line);
      border-radius:24px;
      padding:8px;
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:7px;
      box-shadow:0 18px 46px rgba(15,23,42,.18);
      backdrop-filter:blur(18px);
      max-width:620px;
      margin:0 auto;
    }

    .zx_action_btn{
      border-radius:17px;
      background:#f8fafc;
      color:#334155;
      padding:9px 5px;
      font-size:11px;
      font-weight:950;
      min-height:54px;
      display:flex;
      flex-direction:column;
      gap:4px;
      align-items:center;
      justify-content:center;
    }

    .zx_action_btn span{
      width:30px;
      height:30px;
      border-radius:12px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:20px;
    }

    .zx_action_fichar span{background:#dcfce7;color:#16a34a}
    .zx_action_agenda span{background:#f3e8ff;color:#7c3aed}
    .zx_action_trabajos span{background:#dbeafe;color:#2563eb}
    .zx_action_nota span{background:#fef3c7;color:#d97706}

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.56);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:16px;
      z-index:99999;
    }

    .zx_modal_caja{
      width:100%;
      max-width:620px;
      max-height:90vh;
      overflow-y:auto;
      background:white;
      border-radius:28px;
      padding:22px;
      box-shadow:0 24px 70px rgba(15,23,42,.38);
    }

    .zx_modal_caja h2{
      margin:0 0 14px;
      color:#071330;
      font-size:29px;
      font-weight:950;
      letter-spacing:-.4px;
    }

    .zx_list_item{
      background:var(--zx-soft);
      border:1px solid var(--zx-line);
      border-radius:18px;
      padding:14px;
      margin-top:12px;
    }

    .zx_list_title{
      color:#071330;
      font-size:16px;
      font-weight:950;
      line-height:1.35;
      white-space:pre-wrap;
    }

    .zx_list_meta{
      margin-top:8px;
      color:var(--zx-muted);
      font-size:13px;
      font-weight:850;
      line-height:1.4;
    }

    .zx_list_desc{
      margin-top:8px;
      color:#475569;
      font-size:14px;
      font-weight:800;
      line-height:1.4;
      white-space:pre-wrap;
    }

    @media(max-width:390px){
      #zx_nav_inner{grid-template-columns:repeat(3,1fr)}
      .zx_nav_btn{min-height:66px}
      #zx_brand_txt h1{font-size:18px}
      #zx_logo{width:40px;height:40px;min-width:40px}
      #zx_hora{font-size:20px}
    }

    @media(min-width:760px){
      #zx_nav_inner{grid-template-columns:repeat(6,1fr)}
      #app{padding:24px}
      #zx_actionbar{display:none}
      body{padding-bottom:40px}
    }

    @media(min-width:1120px){
      #zx_nav_inner{grid-template-columns:repeat(10,1fr)}
    }
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
        <div id="zx_brand_txt">
          <h1>Zentryx PRO</h1>
          <div>${limpiar(u.usuario || u.nombre || "usuario")} · ${limpiar(u.rol || "Sin rol")}</div>
        </div>
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
      <div>
        <div id="zx_fecha">--/--/----</div>
        <div id="zx_hora">--:--</div>
      </div>
      <button id="zx_agenda_btn" type="button">📅</button>
    </div>
  `;

  document.body.insertBefore(r,app());

  $("zx_agenda_btn").onclick=function(){
    if(window.ZX_abrirAgendaHoy) window.ZX_abrirAgendaHoy();
  };

  actualizarReloj();
  ZX_RELOJ_TIMER=setInterval(actualizarReloj,1000);

  actualizarContadorAgenda();
  ZX_AGENDA_TIMER=setInterval(actualizarContadorAgenda,60000);
}

function actualizarReloj(){
  const d=new Date();

  const fecha=d.toLocaleDateString("es-ES",{
    weekday:"long",
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  });

  const hora=d.toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });

  if($("zx_fecha")) $("zx_fecha").textContent=fecha;
  if($("zx_hora")) $("zx_hora").textContent=hora;
}

async function eventosHoy(){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return [];

  const f=hoyISO();
  const u=usuarioActual();

  const r=await cliente
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",f)
    .gte("fecha_fin",f)
    .neq("estado","completado")
    .neq("estado","cancelado")
    .order("hora_inicio",{ascending:true})
    .limit(30);

  if(r.error) return [];

  let datos=r.data || [];

  if(!esAdmin()){
    datos=datos.filter(function(e){
      return String(e.visible_para || "todos")==="todos" ||
             String(e.usuario_id || "")===String(u.id || "");
    });
  }

  return datos;
}

async function actualizarContadorAgenda(){
  const btn=$("zx_agenda_btn");
  if(!btn) return;

  try{
    const datos=await eventosHoy();
    btn.textContent=datos.length ? "📅 "+datos.length : "📅";
  }catch(e){
    btn.textContent="📅";
  }
}

function textoTipo(t){
  const m={
    recordatorio:"Nota",
    trabajo:"Trabajo",
    cita:"Cita",
    vacaciones:"Vacaciones",
    permiso:"Permiso",
    revision:"Revisión",
    libranza:"Libranza",
    baja_medica:"Baja médica",
    asuntos_propios:"Asuntos propios",
    festivo:"Festivo"
  };

  return m[t] || t || "Evento";
}

function renderEventoHoy(e){
  const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "Sin hora";
  const icono=e.tipo==="recordatorio" ? "📝" : e.tipo==="trabajo" ? "🛠️" : "📅";

  return `
    <div class="zx_list_item">
      <div class="zx_list_title">${icono} ${limpiar(e.titulo || "Evento")}</div>
      <div class="zx_list_meta">
        ${limpiar(hora)} · ${limpiar(textoTipo(e.tipo))}
        ${e.usuario ? "<br>Usuario: "+limpiar(e.usuario) : ""}
        ${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}
        ${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}
      </div>
      ${e.descripcion ? `<div class="zx_list_desc">${limpiar(e.descripcion)}</div>` : ""}
      ${
        e.tipo==="trabajo" && e.origen==="trabajos" && e.origen_id
        ? `<button class="zx_btn_big zx_azul" data-zx-open-trabajo="${limpiar(e.origen_id)}">Abrir trabajo</button>`
        : ""
      }
    </div>
  `;
}

window.ZX_abrirTrabajoDesdeLayout=function(id){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();

  document.body.classList.remove("zx_modal_abierto");

  window.ZX_TRABAJO_ABRIR_ID=String(id || "");

  if(window.ZX_trabajos){
    window.ZX_trabajos();
    activo("trabajos");
    return;
  }

  alert("No se ha cargado Trabajos.");
};

window.ZX_abrirAgendaHoy=async function(){
  const anterior=$("zx_modal_agenda_hoy");
  if(anterior) anterior.remove();

  document.body.classList.add("zx_modal_abierto");

  const modal=document.createElement("div");
  modal.id="zx_modal_agenda_hoy";
  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Agenda de hoy</h2>
        <div id="zx_agenda_hoy_lista" class="zx_text">Cargando...</div>
        <button class="zx_btn_big zx_verde" id="zx_agenda_hoy_abrir">Abrir Agenda</button>
        <button class="zx_btn_big zx_gris" id="zx_agenda_hoy_cerrar">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("zx_agenda_hoy_cerrar").onclick=window.ZX_cerrarModalAgendaHoy;
  $("zx_agenda_hoy_abrir").onclick=window.ZX_abrirAgendaDesdePanel;

  const lista=$("zx_agenda_hoy_lista");

  try{
    const datos=await eventosHoy();

    lista.innerHTML=datos.length
      ? datos.map(renderEventoHoy).join("")
      : `<div class="zx_text">Sin citas ni notas para hoy.</div>`;

    document.querySelectorAll("[data-zx-open-trabajo]").forEach(function(b){
      b.onclick=function(){
        window.ZX_abrirTrabajoDesdeLayout(b.dataset.zxOpenTrabajo);
      };
    });

  }catch(e){
    lista.innerHTML=`<div class="zx_text">No se pudo cargar la agenda de hoy.</div>`;
  }
};

window.ZX_cerrarModalAgendaHoy=function(){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_abrirAgendaDesdePanel=function(){
  window.ZX_cerrarModalAgendaHoy();

  if(window.ZX_abrirAgenda){
    window.ZX_abrirAgenda();
    return;
  }

  if(window.ZX_agenda) window.ZX_agenda();
};

const MODULOS=[
  {id:"inicio",texto:"Inicio",icono:"🏠",color:"#2563eb",bg:"#dbeafe",admin:false},
  {id:"fichaje",texto:"Fichaje",icono:"⏱️",color:"#16a34a",bg:"#dcfce7",admin:false},
  {id:"agenda",texto:"Agenda",icono:"📅",color:"#7c3aed",bg:"#f3e8ff",admin:false},
  {id:"clientes",texto:"Clientes",icono:"👥",color:"#f97316",bg:"#ffedd5",admin:false},
  {id:"trabajos",texto:"Trabajos",icono:"🛠️",color:"#2563eb",bg:"#dbeafe",admin:false},
  {id:"usuarios",texto:"Usuarios",icono:"👤",color:"#0891b2",bg:"#cffafe",admin:true},
  {id:"horas_extra",texto:"Horas",icono:"➕",color:"#f59e0b",bg:"#fef3c7",admin:true},
  {id:"control_fichajes",texto:"Control",icono:"✅",color:"#22c55e",bg:"#dcfce7",admin:true},
  {id:"vehiculos",texto:"Vehículos",icono:"🚗",color:"#3b82f6",bg:"#dbeafe",admin:true},
  {id:"desarrollador",texto:"Dev",icono:"🛠️",color:"#0f172a",bg:"#e2e8f0",admin:true,dev:true},
  {id:"configuracion",texto:"Ajustes",icono:"⚙️",color:"#7c3aed",bg:"#f3e8ff",admin:true}
];

function moduloActivo(nombre){
  if(zx() && typeof zx().moduloActivo==="function"){
    return zx().moduloActivo(nombre);
  }

  return true;
}


function guardarModuloActual(nombre){
  const id=String(nombre||"").trim();
  if(!id) return;
  window.ZX_MODULO_ACTUAL=id;
  try{sessionStorage.setItem(ZX_LAST_MODULE_KEY,id)}catch(e){}
  try{localStorage.setItem(ZX_LAST_MODULE_KEY,id)}catch(e){}
}

function leerModuloActual(){
  if(window.ZX_MODULO_ACTUAL) return String(window.ZX_MODULO_ACTUAL);
  try{
    const s=sessionStorage.getItem(ZX_LAST_MODULE_KEY);
    if(s) return s;
  }catch(e){}
  try{
    const s=localStorage.getItem(ZX_LAST_MODULE_KEY);
    if(s) return s;
  }catch(e){}
  return "inicio";
}

function moduloVisibleEnDOM(){
  const activoBtn=document.querySelector('.zx_nav_btn.zx_activo[data-modulo]');
  return activoBtn ? String(activoBtn.dataset.modulo||"") : "";
}

function puedeVerModulo(modulo){
  const m=MODULOS.find(function(x){return x.id===modulo});
  if(!m) return false;
  if(!moduloActivo(modulo)) return false;
  if(m.dev) return esDesarrollador();
  if(!m.admin) return true;
  return esAdmin() || esDesarrollador();
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    <div id="zx_nav_inner">
      ${MODULOS.filter(function(m){return puedeVerModulo(m.id)}).map(function(m){
        return `
          <button class="zx_nav_btn" data-modulo="${limpiar(m.id)}" type="button">
            <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${limpiar(m.icono)}</span>
            ${limpiar(m.texto)}
          </button>
        `;
      }).join("")}
    </div>
  `;

  document.body.insertBefore(n,app());

  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.onclick=function(){
      abrirModuloPorId(btn.dataset.modulo);
    };
  });
}

function activo(nombre){
  const objetivo=String(nombre || "")==="horas" ? "horas_extra" : String(nombre || "");

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");

    if(String(b.dataset.modulo || "")===objetivo){
      b.classList.add("zx_activo");
    }
  });

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo(objetivo);
  }

  if(objetivo) guardarModuloActual(objetivo);
}

function abrirModulo(nombre,callback){
  if(!puedeVerModulo(nombre)){
    activo("");
    app().innerHTML=`
      <div class="zx_card">
        <h2>Sin permiso</h2>
        <div class="zx_text">Tu usuario no tiene acceso a este módulo.</div>
      </div>
    `;
    return;
  }

  activo(nombre);

  try{
    if(callback) callback();
  }catch(e){
    console.error(e);
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">No se pudo abrir esta pantalla.</div>
      </div>
    `;
  }
}

function restaurarModuloActual(){
  let id=leerModuloActual();
  if(!puedeVerModulo(id)) id="inicio";
  abrirModuloPorId(id);
}

function abrirModuloPorId(id){
  const mapa={
    inicio:window.ZX_inicio,
    fichaje:window.ZX_abrirFichaje,
    agenda:window.ZX_abrirAgenda,
    clientes:window.ZX_abrirClientes,
    trabajos:window.ZX_abrirTrabajos,
    usuarios:window.ZX_usuarios,
    horas_extra:window.ZX_abrirHorasExtra,
    control_fichajes:window.ZX_abrirControlFichajes,
    vehiculos:window.ZX_vehiculos,
    desarrollador:window.ZX_abrirDesarrollador,
    configuracion:window.ZX_configuracion
  };

  if(typeof mapa[id]==="function"){
    mapa[id]();
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>${limpiar(id || "Pantalla")}</h2>
      <div class="zx_text">Esta pantalla no está disponible.</div>
    </div>
  `;
}

async function cargarNotas(){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return [];

  const u=usuarioActual();

  const r=await cliente
    .from("agenda_eventos")
    .select("*")
    .eq("tipo","recordatorio")
    .or("usuario_id.eq."+u.id+",visible_para.eq.todos")
    .order("created_at",{ascending:false})
    .limit(20);

  if(r.error) return [];
  return r.data || [];
}

function renderNota(n){
  return `
    <div class="zx_list_item">
      <div class="zx_list_title">📝 ${limpiar(n.descripcion || n.titulo || "")}</div>
      <div class="zx_list_meta">
        ${limpiar(formatoFechaES(n.fecha_inicio || ""))}
        ${n.hora_inicio ? " · "+limpiar(String(n.hora_inicio).slice(0,5)) : ""}
      </div>
      <button class="zx_btn_big zx_rojo" data-zx-borrar-nota="${limpiar(n.id)}">Borrar</button>
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
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Notas rápidas</h2>

        <textarea id="zx_nota_rapida_texto" rows="5" placeholder="Escribe una nota o recordatorio..."></textarea>

        <label class="zx_text" style="display:block;margin-top:12px;">Fecha del aviso</label>
        <input id="zx_nota_rapida_fecha" type="date" value="${hoyISO()}">

        <label class="zx_text" style="display:block;margin-top:12px;">Hora del aviso</label>
        <input id="zx_nota_rapida_hora" type="time">

        <button class="zx_btn_big zx_verde" id="zx_guardar_nota_rapida">Guardar nota</button>

        <div id="zx_notas_rapidas_lista" style="margin-top:18px;"></div>

        <button class="zx_btn_big zx_gris" id="zx_cerrar_notas_rapidas">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("zx_guardar_nota_rapida").onclick=window.ZX_guardarNotaRapida;
  $("zx_cerrar_notas_rapidas").onclick=window.ZX_cerrarNotasRapidas;

  const notas=await cargarNotas();
  const lista=$("zx_notas_rapidas_lista");

  if(lista){
    lista.innerHTML=notas.length
      ? notas.map(renderNota).join("")
      : `<div class="zx_text">Sin notas.</div>`;
  }

  document.querySelectorAll("[data-zx-borrar-nota]").forEach(function(b){
    b.onclick=function(){
      window.ZX_borrarNotaRapida(b.dataset.zxBorrarNota);
    };
  });
};

window.ZX_cerrarNotasRapidas=function(){
  const m=$("zx_modal_notas");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_guardarNotaRapida=async function(){
  const cliente=sb();
  const u=usuarioActual();

  const texto=String($("zx_nota_rapida_texto")?.value || "").trim();
  const fecha=$("zx_nota_rapida_fecha")?.value || hoyISO();
  const hora=$("zx_nota_rapida_hora")?.value || null;

  if(!texto){
    alert("Escribe una nota.");
    return;
  }

  const data={
    tipo:"recordatorio",
    titulo:texto.slice(0,60),
    descripcion:texto,
    fecha_inicio:fecha,
    fecha_fin:fecha,
    hora_inicio:hora,
    usuario_id:String(u.id || ""),
    usuario:u.usuario || "",
    estado:"activo",
    prioridad:"normal",
    creado_por:u.usuario || "",
    visible_para:"todos",
    recordatorio:true,
    origen:"postit"
  };

  if((!navigator.onLine || !cliente) && zx() && typeof zx().guardarOffline==="function"){
    zx().guardarOffline("agenda_eventos","insert",[data]);
    alert("Nota guardada sin conexión.");
    window.ZX_cerrarNotasRapidas();
    return;
  }

  if(!cliente){
    alert("No hay conexión con la base de datos.");
    return;
  }

  const r=await cliente.from("agenda_eventos").insert([data]);

  if(r.error){
    alert("Error guardando nota: "+r.error.message);
    return;
  }

  window.ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

window.ZX_borrarNotaRapida=async function(id){
  if(!confirm("¿Borrar esta nota?")) return;

  const cliente=sb();

  if(!cliente){
    alert("No hay conexión con la base de datos.");
    return;
  }

  const r=await cliente.from("agenda_eventos").delete().eq("id",id);

  if(r.error){
    alert("Error borrando nota: "+r.error.message);
    return;
  }

  window.ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

function botonPostit(){
  const b=document.createElement("button");
  b.id="zx_postit";
  b.type="button";
  b.textContent="📝";
  b.onclick=function(){
    if(window.ZX_abrirNotasRapidas) window.ZX_abrirNotasRapidas();
  };
  document.body.appendChild(b);
}

function actionbar(){
  const bar=document.createElement("div");
  bar.id="zx_actionbar";
  bar.innerHTML=`
    <button class="zx_action_btn zx_action_fichar" type="button" data-zx-action="fichaje"><span>⏱️</span>Fichar</button>
    <button class="zx_action_btn zx_action_agenda" type="button" data-zx-action="agenda"><span>📅</span>Agenda</button>
    <button class="zx_action_btn zx_action_trabajos" type="button" data-zx-action="trabajos"><span>🛠️</span>Trabajo</button>
    <button class="zx_action_btn zx_action_nota" type="button" data-zx-action="nota"><span>📝</span>Nota</button>
  `;

  document.body.appendChild(bar);

  bar.querySelectorAll("[data-zx-action]").forEach(function(btn){
    btn.onclick=function(){
      const a=btn.dataset.zxAction;

      if(a==="fichaje" && window.ZX_abrirFichaje) window.ZX_abrirFichaje();
      if(a==="agenda" && window.ZX_abrirAgenda) window.ZX_abrirAgenda();
      if(a==="trabajos" && window.ZX_abrirTrabajos) window.ZX_abrirTrabajos();
      if(a==="nota" && window.ZX_abrirNotasRapidas) window.ZX_abrirNotasRapidas();
    };
  });
}

function instalarRutas(){
  const modInicio=window.ZENTRYX_UI_inicio;
  const modFichaje=window.ZX_fichaje_real || window.ZX_fichaje;
  const modAgenda=window.ZX_agenda;
  const modClientes=window.ZX_clientes;
  const modTrabajos=window.ZX_trabajos;
  const modUsuarios=window.ZENTRYX_UI_usuarios || window.ZX_usuarios;
  const modHoras=window.ZX_horas_extra || window.ZENTRYX_UI_horas_extra;
  const modControl=window.ZX_control_fichajes || window.ZX_controlFichajes;
  const modVehiculos=window.ZX_vehiculos || window.ZENTRYX_UI_abrirVehiculos;
  const modDev=window.ZX_desarrollador || (window.ZENTRYX && window.ZENTRYX.desarrollador);
  const modConfig=window.ZX_configuracion || window.ZENTRYX_UI_configuracion || window.ZX_configuracion_pro || window.ZX_configLaboral || window.ZX_config_laboral;

  window.ZX_inicio=function(){
    abrirModulo("inicio",function(){
      if(typeof modInicio==="function"){modInicio();return}
      app().innerHTML=`<div class="zx_card"><h2>Inicio</h2><div class="zx_text">No se ha cargado inicio.js.</div></div>`;
    });
  };

  window.ZX_abrirFichaje=function(){
    abrirModulo("fichaje",function(){
      if(typeof modFichaje==="function"){modFichaje();return}
      app().innerHTML=`<div class="zx_card"><h2>Fichaje</h2><div class="zx_text">No se ha cargado fichaje.js.</div></div>`;
    });
  };

  window.ZX_abrirAgenda=function(){
    abrirModulo("agenda",function(){
      if(typeof modAgenda==="function"){modAgenda();return}
      app().innerHTML=`<div class="zx_card"><h2>Agenda</h2><div class="zx_text">No se ha cargado agenda.js.</div></div>`;
    });
  };

  window.ZX_abrirClientes=function(){
    abrirModulo("clientes",function(){
      if(typeof modClientes==="function"){modClientes();return}
      app().innerHTML=`<div class="zx_card"><h2>Clientes</h2><div class="zx_text">No se ha cargado clientes.js.</div></div>`;
    });
  };

  window.ZX_abrirTrabajos=function(){
    abrirModulo("trabajos",function(){
      if(typeof modTrabajos==="function"){modTrabajos();return}
      app().innerHTML=`<div class="zx_card"><h2>Trabajos</h2><div class="zx_text">No se ha cargado trabajos.js.</div></div>`;
    });
  };

  window.ZX_usuarios=function(){
    abrirModulo("usuarios",function(){
      if(typeof modUsuarios==="function"){modUsuarios();return}
      app().innerHTML=`<div class="zx_card"><h2>Usuarios</h2><div class="zx_text">No se ha cargado usuarios.js.</div></div>`;
    });
  };

  window.ZX_abrirHorasExtra=function(){
    abrirModulo("horas_extra",function(){
      if(typeof modHoras==="function" && modHoras!==window.ZX_abrirHorasExtra){modHoras();activo("horas_extra");return}
      app().innerHTML=`<div class="zx_card"><h2>Horas</h2><div class="zx_text">No se ha cargado horas_extra.js.</div></div>`;
    });
  };

  window.ZX_abrirControlFichajes=function(){
    abrirModulo("control_fichajes",function(){
      if(typeof modControl==="function"){modControl();return}
      app().innerHTML=`<div class="zx_card"><h2>Control</h2><div class="zx_text">No se ha cargado control_fichajes.js.</div></div>`;
    });
  };

  window.ZX_vehiculos=function(){
    abrirModulo("vehiculos",function(){
      if(typeof modVehiculos==="function" && modVehiculos!==window.ZX_vehiculos){modVehiculos();return}
      app().innerHTML=`<div class="zx_card"><h2>Vehículos</h2><div class="zx_text">No se ha cargado vehiculos.js.</div></div>`;
    });
  };

  window.ZX_abrirDesarrollador=function(){
    abrirModulo("desarrollador",function(){
      if(typeof modDev==="function"){modDev();return}
      app().innerHTML=`<div class="zx_card"><h2>Desarrollador</h2><div class="zx_text">No se ha cargado desarrollador.js.</div></div>`;
    });
  };

  window.ZX_configuracion=function(){
    abrirModulo("configuracion",function(){
      if(typeof modConfig==="function" && modConfig!==window.ZX_configuracion){modConfig();return}
      app().innerHTML=`<div class="zx_card"><h2>Ajustes</h2><div class="zx_text">No se ha cargado configuracion.js.</div></div>`;
    });
  };
}

window.ZENTRYX_UI_LAYOUT={
  restaurarModulo:restaurarModuloActual,
  moduloActual:leerModuloActual,
  iniciar:function(){
    limpiarLayout();
    estilos();
    instalarRutas();
    topbar();
    reloj();
    nav();
    botonPostit();
    actionbar();

    const asegurarModulo=function(){
      if(document.hidden) return;
      const esperado=leerModuloActual();
      const visible=moduloVisibleEnDOM();
      if(esperado && visible && esperado!==visible){
        restaurarModuloActual();
      }
    };

    document.addEventListener("visibilitychange",function(){
      if(!document.hidden){
        setTimeout(asegurarModulo,80);
        setTimeout(asegurarModulo,500);
      }
    });
    window.addEventListener("pageshow",function(){setTimeout(asegurarModulo,120)});
    window.addEventListener("focus",function(){setTimeout(asegurarModulo,180)});

    if(location.hash && location.hash.replace("#","")==="desarrollador"){
      setTimeout(function(){
        abrirModuloPorId("desarrollador");
      },250);
    }

    if(zx() && typeof zx().actualizarEstadoConexion==="function"){
      zx().actualizarEstadoConexion();
    }
  }
};

console.log("ZENTRYX layout.js V"+ZX_VERSION+" cargado");

})();
