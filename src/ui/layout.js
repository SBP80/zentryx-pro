// ===============================
// ZENTRYX PRO - LAYOUT
// V3152 - MANUAL DESDE MENU DE APLICACIONES
// ===============================
(function(){
"use strict";

const ZX_VERSION="3152";

let ZX_RELOJ_TIMER=null;
let ZX_AGENDA_TIMER=null;
let ZX_LAYOUT_CLEANUPS=[];

function registrarLimpieza(fn){
  if(typeof fn==="function") ZX_LAYOUT_CLEANUPS.push(fn);
  return fn;
}

function escuchar(objetivo,evento,handler,opciones){
  if(!objetivo || typeof objetivo.addEventListener!=="function") return function(){};
  objetivo.addEventListener(evento,handler,opciones);
  const quitar=function(){
    try{objetivo.removeEventListener(evento,handler,opciones)}catch(e){}
  };
  registrarLimpieza(quitar);
  return quitar;
}

function ejecutarLimpiezasLayout(){
  const pendientes=ZX_LAYOUT_CLEANUPS.splice(0);
  pendientes.reverse().forEach(function(fn){
    try{fn()}catch(e){console.warn("Zentryx: limpieza de layout incompleta",e)}
  });
}
const ZX_LAST_MODULE_KEY="zentryx_last_module";
const ZX_RECENT_MODULES_KEY="zentryx_recent_modules";
const ZX_FAVORITE_MODULES_KEY="zentryx_favorite_modules";
const ZX_ROUTER_HISTORY_KEY="zentryx_router_history_v1";
const ZX_ROUTER_CONTEXT_KEY="zentryx_router_context_v1";
const ZX_ROUTER_CURRENT_KEY="zentryx_router_current_v1";
const ZX_ROUTER_MAX_HISTORY=30;
const ZX_ROUTER_DUPLICATE_WINDOW=250;
let ZX_ROUTER_RESTORE_TIMER=null;
let ZX_ROUTER_LAST_OPEN={key:"",at:0};

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

function puedeUsarNotasRapidas(){
  const u=usuarioActual();
  const rol=normalizar(u.rol);

  // Preparado para el sistema definitivo de permisos.
  // Si la sesión incluye el permiso, prevalece sobre el rol.
  const s=sesion();
  const permisos=s.permisos || s.permissions || {};
  if(Object.prototype.hasOwnProperty.call(permisos,"notas_rapidas")){
    return permisos.notas_rapidas===true;
  }

  return [
    "administrador",
    "desarrollador",
    "developer",
    "encargado",
    "jefe",
    "jefe de equipo",
    "coordinador",
    "oficina"
  ].includes(rol);
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
  ejecutarLimpiezasLayout();

  [
    "zx_topbar","zx_reloj","zx_nav","zx_postit","zx_actionbar","zx_css",
    "zx_modules_backdrop","zx_favorites_editor_backdrop","zx_modal_notas"
  ].forEach(function(id){
    const el=$(id);
    if(el) el.remove();
  });

  document.body.classList.remove("zx_modal_abierto");
  document.documentElement.style.removeProperty("--zx-topbar-fixed-height");
  const contenido=app();
  if(contenido) contenido.style.marginTop="";

  if(window.__ZX_FIXED_HEADER_OBSERVER){
    try{window.__ZX_FIXED_HEADER_OBSERVER.disconnect()}catch(e){}
    window.__ZX_FIXED_HEADER_OBSERVER=null;
  }

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
      padding-bottom:calc(env(safe-area-inset-bottom) + 24px);
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
      padding:8px 12px;
      position:fixed;
      top:0;
      left:0;
      right:0;
      z-index:8000;
      padding-top:calc(8px + env(safe-area-inset-top));
      box-shadow:0 4px 18px rgba(15,23,42,.055);
      backdrop-filter:blur(18px);
    }

    #zx_topbar_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      grid-template-areas:
        "brand actions"
        "meta meta";
      align-items:center;
      gap:5px 8px;
    }

    #zx_brand{grid-area:brand}
    #zx_topbar_actions{grid-area:actions}

    #zx_header_meta{
      grid-area:meta;
      min-width:0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      padding-top:5px;
      border-top:1px solid rgba(203,213,225,.72);
    }

    #zx_header_datetime{
      min-width:0;
      display:flex;
      align-items:baseline;
      gap:8px;
      overflow:hidden;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:8px;
      min-width:0;
      flex:1;
    }

    #zx_logo{
      width:38px;
      height:38px;
      min-width:38px;
      border-radius:13px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:17px;
      font-weight:950;
      color:white;
      box-shadow:0 10px 22px rgba(37,99,235,.25);
    }

    #zx_brand_txt{min-width:0}

    #zx_brand_txt h1{
      margin:0;
      font-size:18px;
      line-height:1.05;
      font-weight:950;
      letter-spacing:-.3px;
      color:#071330;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_brand_txt div{
      margin-top:2px;
      color:var(--zx-muted);
      font-size:11px;
      font-weight:850;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    #zx_user_menu_wrap{
      position:relative;
      flex:none;
    }

    #zx_user_btn{
      width:36px;
      height:36px;
      min-width:36px;
      border-radius:50%;
      border:2px solid #dbeafe;
      background:linear-gradient(135deg,#2563eb,#7c3aed);
      color:#fff;
      font-size:13px;
      font-weight:1000;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 7px 16px rgba(37,99,235,.18);
    }

    #zx_user_btn[aria-expanded="true"]{
      box-shadow:0 0 0 4px rgba(37,99,235,.12);
    }

    #zx_user_menu{
      position:absolute;
      top:44px;
      right:0;
      width:min(250px,calc(100vw - 24px));
      background:#fff;
      border:1px solid var(--zx-line);
      border-radius:18px;
      padding:8px;
      box-shadow:0 20px 50px rgba(15,23,42,.20);
      z-index:99999;
    }

    #zx_user_menu[hidden]{display:none!important}

    .zx_user_menu_head{
      padding:9px 10px 11px;
      border-bottom:1px solid var(--zx-line);
      margin-bottom:5px;
    }

    .zx_user_menu_name{
      color:#071330;
      font-size:14px;
      font-weight:1000;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .zx_user_menu_role{
      margin-top:2px;
      color:var(--zx-muted);
      font-size:11px;
      font-weight:850;
    }

    .zx_user_menu_item{
      width:100%;
      min-height:42px;
      border-radius:12px;
      padding:9px 10px;
      background:transparent;
      color:#334155;
      font-size:12px;
      font-weight:900;
      text-align:left;
      display:flex;
      align-items:center;
      gap:9px;
    }

    .zx_user_menu_item:active{background:#f1f5f9}
    .zx_user_menu_item.zx_danger{color:#b91c1c}


    #zx_reloj{display:none!important}
    #zx_reloj_inner{display:none!important}

    #zx_fecha{
      min-width:0;
      max-width:70%;
      overflow:hidden;
      text-overflow:ellipsis;
      color:var(--zx-muted);
      font-size:11px;
      font-weight:900;
      white-space:nowrap;
      text-transform:capitalize;
    }

    #zx_hora{
      color:#071330;
      font-size:13px;
      font-weight:1000;
      letter-spacing:-.1px;
      white-space:nowrap;
      line-height:1;
    }

    #zx_agenda_btn{
      border-radius:10px;
      background:#fff7ed;
      color:#c2410c;
      padding:4px 7px;
      min-width:42px;
      min-height:30px;
      font-size:14px;
      font-weight:950;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:5px;
      box-shadow:none;
      flex:none;
    }



    #zx_topbar_actions{
      display:flex;
      align-items:center;
      justify-content:flex-end;
      gap:7px;
      flex:none;
    }

    #zx_connection_slot{
      display:flex;
      align-items:center;
      min-width:12px;
    }

    #zx_connection_slot #zx_connection_status{
      position:static!important;
      left:auto!important;
      right:auto!important;
      bottom:auto!important;
      z-index:auto!important;
      min-width:12px;
      max-width:132px;
      padding:6px 8px!important;
      border-radius:999px!important;
      box-shadow:none!important;
      font-size:10px!important;
      font-weight:950!important;
      line-height:1!important;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      pointer-events:auto!important;
    }

    @media(max-width:430px){
      #zx_connection_slot #zx_connection_status{
        width:12px;
        height:12px;
        padding:0!important;
        border-radius:50%!important;
        color:transparent!important;
        font-size:0!important;
        overflow:hidden;
      }

      #zx_connection_slot #zx_connection_status::before{
        content:"";
        display:block;
        width:12px;
        height:12px;
        border-radius:50%;
        background:#22c55e;
      }

      #zx_connection_slot #zx_connection_status.zx_offline::before{background:#eab308}
      #zx_connection_slot #zx_connection_status.zx_degraded::before{background:#f97316}
      #zx_connection_slot #zx_connection_status.zx_syncing::before{background:#3b82f6}
      #zx_connection_slot #zx_connection_status.zx_synced::before{background:#22c55e}
    }

    .zx_calendar_icon{
      position:relative;
      width:28px;
      height:28px;
      border-radius:7px;
      background:#fff;
      border:2px solid currentColor;
      display:inline-flex;
      align-items:flex-end;
      justify-content:center;
      overflow:hidden;
      box-sizing:border-box;
      flex:none;
      line-height:1;
    }

    .zx_calendar_top{
      position:absolute;
      left:0;
      right:0;
      top:0;
      height:7px;
      background:currentColor;
    }

    .zx_calendar_day{
      display:block;
      padding-bottom:3px;
      color:#071330;
      font-size:13px;
      font-weight:1000;
      letter-spacing:-.5px;
    }

    #zx_agenda_count{
      min-width:20px;
      height:20px;
      border-radius:999px;
      background:#ea580c;
      color:#fff;
      align-items:center;
      justify-content:center;
      padding:0 6px;
      font-size:11px;
      font-weight:1000;
      display:none;
    }

    .zx_calendar_nav{
      width:30px;
      height:30px;
      color:#7c3aed;
    }

    #zx_nav{
      width:100%;
      position:fixed;
      left:0;
      right:0;
      top:var(--zx-topbar-fixed-height,82px);
      background:rgba(255,255,255,.94);
      border-bottom:1px solid var(--zx-line);
      padding:7px 10px;
      z-index:7900;
      box-shadow:0 5px 16px rgba(15,23,42,.045);
      backdrop-filter:blur(16px);
    }

    #zx_nav_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:grid;
      grid-template-columns:repeat(5,1fr);
      gap:6px;
    }

    .zx_nav_btn{
      width:100%;
      min-height:46px;
      border-radius:13px;
      background:white;
      color:#334155;
      padding:5px 8px;
      font-size:11px;
      font-weight:950;
      border:1px solid var(--zx-line);
      box-shadow:0 5px 12px rgba(15,23,42,.04);
      text-align:left;
      display:flex;
      flex-direction:row;
      align-items:center;
      justify-content:flex-start;
      gap:7px;
      white-space:nowrap;
    }

    .zx_nav_icon{
      width:28px;
      height:28px;
      min-width:28px;
      border-radius:9px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
      line-height:1;
      box-shadow:none;
    }

    .zx_nav_btn{
      position:relative;
    }

    .zx_nav_btn.zx_activo{
      background:#eff6ff;
      color:#1d4ed8;
      border-color:#bfdbfe;
      box-shadow:none;
    }

    .zx_nav_btn.zx_activo::after{
      content:"";
      position:absolute;
      left:12px;
      right:12px;
      bottom:-1px;
      height:3px;
      border-radius:999px 999px 0 0;
      background:#2563eb;
    }

    .zx_nav_btn.zx_activo .zx_nav_icon{
      background:#dbeafe!important;
      box-shadow:none;
    }


    #zx_nav_more{
      position:relative;
    }

    #zx_nav_more.zx_activo{
      background:#eff6ff;
      color:#1d4ed8;
      border-color:#bfdbfe;
    }

    #zx_nav_more.zx_activo::after{
      content:"";
      position:absolute;
      left:12px;
      right:12px;
      bottom:-1px;
      height:3px;
      border-radius:999px 999px 0 0;
      background:#2563eb;
    }

    #zx_modules_backdrop{
      position:fixed;
      inset:0;
      z-index:99990;
      background:rgba(15,23,42,.34);
      backdrop-filter:blur(5px);
      display:flex;
      align-items:flex-end;
      justify-content:center;
      padding:12px;
    }

    #zx_modules_backdrop[hidden]{display:none!important}

    #zx_modules_panel{
      width:min(720px,100%);
      max-height:min(78vh,760px);
      overflow:auto;
      background:#fff;
      border:1px solid var(--zx-line);
      border-radius:26px;
      padding:14px;
      box-shadow:0 28px 80px rgba(15,23,42,.28);
    }

    .zx_modules_head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:3px 3px 12px;
    }

    .zx_modules_title{
      color:#071330;
      font-size:20px;
      font-weight:1000;
      letter-spacing:-.3px;
    }

    #zx_modules_close{
      width:38px;
      height:38px;
      border-radius:12px;
      background:#f1f5f9;
      color:#334155;
      font-size:18px;
      font-weight:1000;
    }


    #zx_modules_search_wrap{
      position:relative;
      margin:0 0 12px;
    }

    #zx_modules_search{
      width:100%;
      min-height:46px;
      border:1px solid var(--zx-line);
      border-radius:14px;
      background:#f8fafc;
      color:#0f172a;
      padding:10px 42px 10px 14px;
      font-size:14px;
      font-weight:800;
      outline:none;
    }

    #zx_modules_search:focus{
      background:#fff;
      border-color:#93c5fd;
      box-shadow:0 0 0 4px rgba(37,99,235,.10);
    }

    #zx_modules_search_icon{
      position:absolute;
      right:14px;
      top:50%;
      transform:translateY(-50%);
      color:#64748b;
      font-size:17px;
      pointer-events:none;
    }

    #zx_global_results{
      margin:0 0 16px;
    }

    #zx_global_results[hidden]{display:none!important}

    .zx_global_results_head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin:0 2px 8px;
    }

    .zx_global_results_title{
      color:#64748b;
      font-size:11px;
      font-weight:1000;
      text-transform:uppercase;
      letter-spacing:.5px;
    }

    #zx_global_results_count{
      color:#64748b;
      font-size:11px;
      font-weight:900;
    }

    #zx_global_results_list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .zx_global_result{
      width:100%;
      min-height:62px;
      padding:10px 11px;
      border:1px solid #dbe3ef;
      border-radius:15px;
      background:#fff;
      color:#334155;
      display:grid;
      grid-template-columns:auto minmax(0,1fr) auto;
      align-items:center;
      gap:10px;
      text-align:left;
      box-shadow:0 3px 10px rgba(15,23,42,.035);
    }

    .zx_global_result_icon{
      width:38px;
      height:38px;
      min-width:38px;
      border-radius:13px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:20px;
      font-weight:1000;
    }

    .zx_global_result_text{min-width:0}

    .zx_global_result_title{
      display:block;
      overflow:hidden;
      color:#0f172a;
      font-size:13px;
      font-weight:1000;
      line-height:1.25;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .zx_global_result_meta{
      display:block;
      overflow:hidden;
      margin-top:3px;
      color:#64748b;
      font-size:11px;
      font-weight:800;
      line-height:1.25;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .zx_global_result_type{
      padding:5px 8px;
      border-radius:999px;
      background:#f1f5f9;
      color:#475569;
      font-size:10px;
      font-weight:1000;
      white-space:nowrap;
    }

    .zx_global_results_note{
      margin:8px 2px 0;
      color:#94a3b8;
      font-size:10px;
      font-weight:750;
      line-height:1.35;
    }

    .zx_command_shortcut{
      display:none;
      position:absolute;
      right:12px;
      top:50%;
      transform:translateY(-50%);
      padding:4px 7px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:#f8fafc;
      color:#64748b;
      font-size:10px;
      font-weight:950;
      line-height:1;
      pointer-events:none;
      white-space:nowrap;
    }

    .zx_global_result:focus-visible,
    #zx_modules_search:focus-visible,
    #zx_modules_close:focus-visible,
    #zx_favorites_manage:focus-visible{
      outline:3px solid rgba(37,99,235,.24);
      outline-offset:2px;
    }

    @media(max-width:639px){
      #zx_global_results{margin:0 0 14px}
      .zx_global_results_head{margin:0 1px 8px}
      #zx_global_results_list{gap:7px}

      .zx_global_result{
        min-height:68px;
        padding:10px;
        grid-template-columns:auto minmax(0,1fr);
        gap:10px;
        border-radius:14px;
      }

      .zx_global_result_icon{
        width:40px;
        height:40px;
        min-width:40px;
        border-radius:12px;
      }

      .zx_global_result_title{
        font-size:13px;
        white-space:normal;
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
      }

      .zx_global_result_meta{
        font-size:10.5px;
        white-space:normal;
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
      }

      .zx_global_result_type{
        grid-column:2;
        justify-self:start;
        margin-top:-3px;
        padding:4px 7px;
      }
    }

    @media(min-width:640px) and (max-width:1099px){
      #zx_modules_panel{
        width:min(92vw,820px);
        max-height:88vh;
        padding:18px;
      }

      #zx_modules_search{
        min-height:52px;
        font-size:16px;
      }

      #zx_global_results_list{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }

      .zx_global_result{min-height:76px}

      #zx_modules_grid{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }

      #zx_modules_favorites_list{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        overflow:visible;
      }

      .zx_favorite_item{min-width:0}
    }

    @media(min-width:1100px){
      #zx_modules_backdrop{
        align-items:center;
        justify-content:center;
        padding:28px;
      }

      #zx_modules_panel{
        width:min(1120px,92vw);
        max-height:min(86vh,900px);
        padding:22px;
        border-radius:28px;
      }

      .zx_modules_title{font-size:24px}
      #zx_modules_search_wrap{margin-bottom:18px}

      #zx_modules_search{
        min-height:56px;
        padding-right:78px;
        border-radius:16px;
        font-size:17px;
      }

      .zx_command_shortcut{
        display:inline-flex;
        align-items:center;
      }

      #zx_global_results{margin-bottom:22px}

      #zx_global_results_list{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:11px;
      }

      .zx_global_result{
        min-height:80px;
        padding:12px;
        transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
      }

      .zx_global_result:hover{
        transform:translateY(-1px);
        border-color:#bfdbfe;
        box-shadow:0 10px 24px rgba(15,23,42,.08);
      }

      #zx_modules_favorites_list{
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        overflow:visible;
        gap:10px;
      }

      .zx_favorite_item{min-width:0}

      .zx_favorite_open{
        min-height:68px;
        transition:transform .15s ease,box-shadow .15s ease;
      }

      .zx_favorite_open:hover{
        transform:translateY(-1px);
        box-shadow:0 9px 20px rgba(15,23,42,.08);
      }

      #zx_modules_grid{
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:10px;
      }

      #zx_favorites_editor_panel{
        width:min(900px,92vw);
      }

      #zx_favorites_available{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
    }

    #zx_modules_empty{
      padding:24px 12px;
      color:var(--zx-muted);
      font-size:13px;
      font-weight:850;
      text-align:center;
    }

    #zx_modules_empty[hidden]{display:none!important}


    #zx_modules_favorites{
      margin:0 0 16px;
    }

    #zx_modules_favorites[hidden]{display:none!important}

    .zx_favorites_header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin:0 2px 9px;
    }

    .zx_favorites_header .zx_modules_section_title{
      margin:0;
    }

    #zx_favorites_manage{
      min-height:34px;
      padding:0 13px;
      border:1px solid #cbd5e1;
      border-radius:11px;
      background:#fff;
      color:#334155;
      font-size:12px;
      font-weight:950;
    }

    #zx_modules_favorites_list{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:1px 1px 5px;
      scrollbar-width:none;
      -webkit-overflow-scrolling:touch;
    }

    #zx_modules_favorites_list::-webkit-scrollbar{display:none}

    .zx_favorite_item{
      flex:0 0 126px;
      min-width:126px;
    }

    .zx_favorite_item[hidden]{display:none!important}

    .zx_favorite_open{
      width:100%;
      min-height:58px;
      padding:9px 10px;
      border:1px solid #dbe3ef;
      border-radius:15px;
      background:#fff;
      color:#334155;
      display:flex;
      align-items:center;
      gap:9px;
      font-size:11px;
      font-weight:950;
      text-align:left;
      box-shadow:0 3px 10px rgba(15,23,42,.04);
    }

    .zx_favorite_open .zx_nav_icon{
      width:32px;
      height:32px;
      min-width:32px;
      font-size:19px;
    }

    #zx_favorites_editor_backdrop{
      position:fixed;
      inset:0;
      z-index:100020;
      display:flex;
      align-items:flex-end;
      justify-content:center;
      padding:12px;
      background:rgba(15,23,42,.42);
      backdrop-filter:blur(5px);
    }

    #zx_favorites_editor_backdrop[hidden]{display:none!important}

    #zx_favorites_editor_panel{
      width:min(720px,100%);
      max-height:min(86vh,820px);
      overflow:auto;
      border:1px solid var(--zx-line);
      border-radius:24px;
      background:#fff;
      box-shadow:0 28px 80px rgba(15,23,42,.30);
    }

    .zx_favorites_editor_head{
      position:sticky;
      top:0;
      z-index:3;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:14px;
      border-bottom:1px solid var(--zx-line);
      background:#fff;
    }

    .zx_favorites_editor_title{
      font-size:18px;
      font-weight:1000;
      color:#0f172a;
    }

    .zx_favorites_editor_close{
      width:40px;
      height:40px;
      border-radius:12px;
      background:#f1f5f9;
      color:#334155;
      font-size:18px;
      font-weight:1000;
    }

    .zx_favorites_editor_body{
      padding:14px;
    }

    .zx_favorites_editor_intro{
      margin:0 0 14px;
      padding:12px 13px;
      border:1px solid #dbeafe;
      border-radius:14px;
      background:#f8fbff;
      color:#475569;
      font-size:12px;
      font-weight:750;
      line-height:1.45;
    }

    .zx_favorites_editor_section{
      margin:0 0 16px;
    }

    .zx_favorites_editor_section_title{
      margin:0 0 9px;
      color:#64748b;
      font-size:11px;
      font-weight:1000;
      text-transform:uppercase;
      letter-spacing:.5px;
    }

    #zx_favorites_selected{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .zx_favorites_selected_empty{
      padding:16px;
      border:1px dashed #cbd5e1;
      border-radius:14px;
      color:#64748b;
      font-size:12px;
      font-weight:800;
      text-align:center;
    }

    .zx_favorite_selected_row{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      align-items:center;
      gap:10px;
      padding:9px;
      border:1px solid #dbe3ef;
      border-radius:14px;
      background:#fff;
    }

    .zx_favorite_selected_info{
      min-width:0;
      display:flex;
      align-items:center;
      gap:9px;
      color:#334155;
      font-size:12px;
      font-weight:950;
    }

    .zx_favorite_selected_info .zx_nav_icon{
      width:32px;
      height:32px;
      min-width:32px;
      font-size:19px;
    }

    .zx_favorite_selected_controls{
      display:flex;
      gap:6px;
    }

    .zx_favorite_selected_btn{
      min-height:40px;
      min-width:52px;
      padding:0 10px;
      border:1px solid #cbd5e1;
      border-radius:10px;
      background:#fff;
      color:#334155;
      font-size:11px;
      font-weight:1000;
    }

    .zx_favorite_selected_btn:disabled{opacity:.35}

    .zx_favorite_selected_remove{
      border-color:#fecaca;
      background:#fff7f7;
      color:#b91c1c;
    }

    #zx_favorites_available{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
    }

    .zx_favorite_choice{
      min-height:58px;
      padding:9px;
      border:1px solid #dbe3ef;
      border-radius:14px;
      background:#fff;
      color:#334155;
      display:flex;
      align-items:center;
      gap:9px;
      text-align:left;
      font-size:11px;
      font-weight:950;
    }

    .zx_favorite_choice .zx_nav_icon{
      width:32px;
      height:32px;
      min-width:32px;
      font-size:19px;
    }

    .zx_favorite_choice.zx_selected{
      border-color:#60a5fa;
      background:#eff6ff;
      color:#1d4ed8;
      box-shadow:0 0 0 2px rgba(37,99,235,.08);
    }

    .zx_favorite_choice_mark{
      margin-left:auto;
      min-width:24px;
      color:#2563eb;
      font-size:18px;
      font-weight:1000;
      text-align:center;
    }

    .zx_favorites_editor_footer{
      position:sticky;
      bottom:0;
      z-index:3;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:9px;
      padding:12px 14px calc(12px + env(safe-area-inset-bottom));
      border-top:1px solid var(--zx-line);
      background:#fff;
    }

    .zx_favorites_editor_footer button{
      min-height:48px;
      border-radius:13px;
      font-size:13px;
      font-weight:1000;
    }

    #zx_favorites_cancel{
      border:1px solid #cbd5e1;
      background:#fff;
      color:#334155;
    }

    #zx_favorites_save{
      background:#2563eb;
      color:#fff;
    }

    #zx_modules_recent{
      margin:0 0 14px;
    }

    #zx_modules_recent[hidden]{display:none!important}

    #zx_modules_recent_list{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:1px 1px 4px;
      scrollbar-width:none;
      -webkit-overflow-scrolling:touch;
    }

    #zx_modules_recent_list::-webkit-scrollbar{display:none}

    .zx_recent_btn{
      flex:0 0 auto;
      min-width:106px;
      min-height:48px;
      border:1px solid var(--zx-line);
      border-radius:14px;
      background:#f8fafc;
      color:#334155;
      padding:7px 10px;
      display:flex;
      align-items:center;
      gap:8px;
      font-size:11px;
      font-weight:950;
      text-align:left;
    }

    .zx_recent_btn[hidden]{display:none!important}

    .zx_recent_btn .zx_nav_icon{
      width:30px;
      height:30px;
      min-width:30px;
      font-size:18px;
    }

    #zx_modules_grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    }

    .zx_module_full_btn[hidden],
    .zx_tool_btn[hidden]{
      display:none!important;
    }

    .zx_module_full_btn{
      position:relative;
      min-width:0;
      min-height:72px;
      border:1px solid var(--zx-line);
      border-radius:16px;
      background:#fff;
      color:#334155;
      padding:9px 7px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:6px;
      font-size:11px;
      font-weight:950;
      text-align:center;
    }

    .zx_module_full_btn.zx_activo{
      background:#eff6ff;
      color:#1d4ed8;
      border-color:#93c5fd;
      box-shadow:0 0 0 2px rgba(37,99,235,.08);
    }

    .zx_module_full_btn .zx_nav_icon{
      width:32px;
      height:32px;
      min-width:32px;
      font-size:20px;
    }


    #zx_modules_tools{
      margin-top:12px;
      padding-top:12px;
      border-top:1px solid var(--zx-line);
    }

    #zx_modules_tools[hidden]{display:none!important}

    .zx_modules_section_title{
      margin:0 2px 8px;
      color:var(--zx-muted);
      font-size:11px;
      font-weight:1000;
      text-transform:uppercase;
      letter-spacing:.5px;
    }

    .zx_tool_btn{
      width:100%;
      min-height:52px;
      border:1px solid #fde68a;
      border-radius:15px;
      background:#fffbeb;
      color:#92400e;
      padding:9px 11px;
      display:flex;
      align-items:center;
      justify-content:flex-start;
      gap:10px;
      font-size:12px;
      font-weight:950;
      text-align:left;
    }

    .zx_tool_icon{
      width:32px;
      height:32px;
      min-width:32px;
      border-radius:10px;
      background:#fef3c7;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
    }

    @media(min-width:640px){
      #zx_modules_backdrop{
        align-items:center;
      }
      #zx_modules_grid{
        grid-template-columns:repeat(5,minmax(0,1fr));
      }
    }

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:12px 10px;
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

    /* iPhone/móvil: el menú se convierte en una pantalla fija completa.
       La cabecera y el buscador permanecen arriba al abrir el teclado. */
    @media(max-width:639px){
      #zx_modules_backdrop{
        position:fixed;
        inset:0;
        width:100%;
        height:100vh;
        height:100dvh;
        padding:0;
        align-items:flex-start;
        justify-content:stretch;
        background:#fff;
        backdrop-filter:none;
        overflow:hidden;
        overscroll-behavior:none;
      }

      #zx_modules_panel{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        max-height:none;
        margin:0;
        padding:0 12px calc(16px + env(safe-area-inset-bottom));
        border:0;
        border-radius:0;
        box-shadow:none;
        overflow-y:auto;
        overflow-x:hidden;
        overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        background:#fff;
      }

      .zx_modules_head{
        position:sticky;
        top:0;
        z-index:4;
        min-height:calc(58px + env(safe-area-inset-top));
        padding:calc(8px + env(safe-area-inset-top)) 2px 8px;
        background:#fff;
        border-bottom:1px solid var(--zx-line);
      }

      .zx_modules_title{
        font-size:20px;
      }

      #zx_modules_close{
        width:40px;
        height:40px;
        min-width:40px;
      }

      #zx_modules_search_wrap{
        position:sticky;
        top:calc(58px + env(safe-area-inset-top));
        z-index:3;
        margin:0 -2px 12px;
        padding:10px 2px 8px;
        background:#fff;
      }

      #zx_modules_search{
        min-height:48px;
        font-size:16px;
      }

      #zx_modules_grid{
        grid-template-columns:repeat(3,minmax(0,1fr));
        padding-bottom:2px;
      }

      #zx_favorites_editor_backdrop{
        padding:0;
        align-items:flex-start;
        background:#fff;
        backdrop-filter:none;
      }

      #zx_favorites_editor_panel{
        width:100%;
        height:100vh;
        height:100dvh;
        max-height:none;
        border:0;
        border-radius:0;
        box-shadow:none;
        overscroll-behavior:contain;
      }

      .zx_favorites_editor_head{
        padding:calc(8px + env(safe-area-inset-top)) 12px 8px;
      }

      .zx_favorites_editor_body{
        padding:12px;
      }

      #zx_favorites_available{
        grid-template-columns:1fr;
      }

      .zx_favorite_selected_row{
        grid-template-columns:1fr;
      }

      .zx_favorite_selected_controls{
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
      }

      .zx_favorite_selected_btn{
        min-width:0;
      }

      body.zx_modal_abierto{
        position:fixed;
        width:100%;
        overflow:hidden!important;
        touch-action:none;
      }
    }

    /* MÓVIL: navegación horizontal de una sola fila.
       Todos los módulos siguen accesibles sin ocupar media pantalla. */
    @media(max-width:639px){
      #zx_topbar{padding:calc(6px + env(safe-area-inset-top)) 10px 6px}
      #zx_logo{
        width:36px;
        height:36px;
        min-width:36px;
        border-radius:12px;
      }
      #zx_brand_txt h1{font-size:17px}
      #zx_brand_txt div{font-size:10px}
      #zx_user_btn{width:34px;height:34px;min-width:34px;font-size:12px}

      #zx_header_meta{
        padding-top:4px;
        gap:6px;
      }
      #zx_header_datetime{gap:6px}
      #zx_fecha{max-width:72%;font-size:10px}
      #zx_hora{font-size:12px}
      #zx_agenda_btn{
        min-width:38px;
        min-height:28px;
        padding:3px 6px;
        border-radius:9px;
      }
      .zx_calendar_top_button{
        width:23px;
        height:23px;
      }

      #zx_nav{
        position:fixed;
        top:var(--zx-topbar-fixed-height,82px);
        padding:5px 8px;
        overflow:hidden;
        box-shadow:0 4px 12px rgba(15,23,42,.035);
      }
      #zx_nav_inner{
        display:grid;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:5px;
        padding:1px;
      }
      .zx_nav_btn{
        min-width:0;
        width:100%;
        min-height:48px;
        border-radius:10px;
        padding:5px 2px;
        font-size:9px;
        gap:3px;
        flex-direction:column;
        justify-content:center;
        text-align:center;
        overflow:hidden;
      }
      .zx_nav_btn .zx_nav_label{
        width:100%;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .zx_nav_icon{
        width:24px;
        height:24px;
        min-width:24px;
        border-radius:8px;
        font-size:16px;
      }
      .zx_calendar_nav{
        width:24px;
        height:24px;
      }
      .zx_calendar_nav .zx_calendar_day{
        font-size:10px;
        padding-bottom:2px;
      }

      #app{
        padding:9px 8px;
      }
      .zx_card{
        border-radius:21px;
        padding:16px;
        margin-bottom:12px;
      }
      .zx_card h2{font-size:26px}
      .zx_card h3{font-size:20px}
      .zx_text{font-size:15px}

      #zx_postit{
        right:11px;
        bottom:calc(env(safe-area-inset-bottom) + 14px);
        width:48px;
        height:48px;
        border-radius:16px;
        font-size:21px;
      }
    }

    /* TABLETA: rejilla compacta, contenido con más aire. */
    @media(min-width:640px) and (max-width:1099px){
      #zx_nav_inner{grid-template-columns:repeat(6,1fr)}
      .zx_nav_btn{min-height:58px}
      #app{padding:18px}
      body{padding-bottom:34px}
    }

    /* PC: todos los módulos en una fila y contenido ancho. */
    @media(min-width:1100px){
      #zx_nav_inner{grid-template-columns:repeat(10,1fr)}
      #app{padding:24px}
      #zx_topbar_inner,
      #zx_reloj_inner,
      #zx_nav_inner,
      #app{max-width:1320px}
      body{padding-bottom:40px}
    }
  `;
  document.head.appendChild(css);
}

function inicialesUsuario(u){
  const base=String((u && (u.nombre || u.usuario)) || "U").trim();
  const partes=base.split(/\s+/).filter(Boolean);
  if(!partes.length) return "U";
  if(partes.length===1) return partes[0].slice(0,2).toUpperCase();
  return (partes[0][0]+partes[partes.length-1][0]).toUpperCase();
}

function actualizarCabeceraFijaReal(){
  const top=$("zx_topbar");
  const nav=$("zx_nav");
  const contenido=app();
  if(!top || !nav || !contenido) return;

  const altoTop=Math.ceil(top.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--zx-topbar-fixed-height",altoTop+"px");

  requestAnimationFrame(function(){
    const altoNav=Math.ceil(nav.getBoundingClientRect().height);
    const total=altoTop+altoNav;
    contenido.style.marginTop=total+"px";
  });
}

function instalarCabeceraFijaReal(){
  actualizarCabeceraFijaReal();

  const top=$("zx_topbar");
  const nav=$("zx_nav");
  if(typeof ResizeObserver!=="undefined") {
    const ro=new ResizeObserver(actualizarCabeceraFijaReal);
    if(top) ro.observe(top);
    if(nav) ro.observe(nav);
    window.__ZX_FIXED_HEADER_OBSERVER=ro;
    registrarLimpieza(function(){
      try{ro.disconnect()}catch(e){}
      if(window.__ZX_FIXED_HEADER_OBSERVER===ro) window.__ZX_FIXED_HEADER_OBSERVER=null;
    });
  }

  const alOrientar=function(){
    setTimeout(actualizarCabeceraFijaReal,80);
    setTimeout(actualizarCabeceraFijaReal,350);
  };

  escuchar(window,"resize",actualizarCabeceraFijaReal,{passive:true});
  escuchar(window,"orientationchange",alOrientar,{passive:true});
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
      <div id="zx_topbar_actions">
        <div id="zx_connection_slot" aria-label="Estado de conexión"></div>
        <div id="zx_user_menu_wrap">
          <button id="zx_user_btn" type="button" aria-label="Abrir menú de usuario" aria-expanded="false">
            ${limpiar(inicialesUsuario(u))}
          </button>
          <div id="zx_user_menu" hidden>
            <div class="zx_user_menu_head">
              <div class="zx_user_menu_name">${limpiar(u.nombre || u.usuario || "Usuario")}</div>
              <div class="zx_user_menu_role">${limpiar(u.rol || "Sin rol")}</div>
            </div>
            <button class="zx_user_menu_item" id="zx_menu_manual" type="button">📖 <span>Manual de uso</span></button>
            <button class="zx_user_menu_item" id="zx_menu_ajustes" type="button">⚙️ <span>Ajustes</span></button>
            <button class="zx_user_menu_item" id="zx_menu_cambiar" type="button">👥 <span>Cambiar usuario</span></button>
            <button class="zx_user_menu_item zx_danger" id="zx_menu_salir" type="button">↪️ <span>Cerrar sesión</span></button>
          </div>
        </div>
      </div>
      <div id="zx_header_meta">
        <div id="zx_header_datetime">
          <div id="zx_fecha">--/--/----</div>
          <div id="zx_hora">--:--</div>
        </div>
        <button id="zx_agenda_btn" type="button" aria-label="Abrir Agenda de hoy">
          ${iconoCalendarioHTML("zx_calendar_top_button")}
          <span id="zx_agenda_count"></span>
        </button>
      </div>
    </div>
  `;

  document.body.insertBefore(t,app());

  function integrarEstadoConexion(){
    const slot=$("zx_connection_slot");
    const estado=$("zx_connection_status");
    if(slot && estado && estado.parentElement!==slot){
      slot.appendChild(estado);
      estado.title=estado.textContent || "Estado de conexión";
    }
  }

  integrarEstadoConexion();

  const observadorConexion=new MutationObserver(function(){
    integrarEstadoConexion();
  });
  observadorConexion.observe(document.body,{childList:true,subtree:false});
  registrarLimpieza(function(){observadorConexion.disconnect()});

  const userBtn=$("zx_user_btn");
  const userMenu=$("zx_user_menu");

  function cerrarMenuUsuario(){
    if(!userMenu || !userBtn) return;
    userMenu.hidden=true;
    userBtn.setAttribute("aria-expanded","false");
  }

  function abrirManualDirecto(){
    cerrarMenuUsuario();
    try{cerrarMenuModulos()}catch(e){}

    // Evita que una recomendación automática tape el Manual justo al abrirlo.
    try{sessionStorage.setItem("zentryx_asistente_mostrado_sesion","1")}catch(e){}

    const fn=window.ZX_abrirManual || window.ZX_manual;
    if(typeof fn==="function"){
      try{
        fn();
        activo("manual");
        guardarModuloActual("manual");
        zxRouterGuardarRutaActual("manual",{source:"manual_directo"});
        document.dispatchEvent(new CustomEvent("zentryx:navigation",{
          detail:{modulo:"manual",opciones:{source:"manual_directo"},ruta:{modulo:"manual"}}
        }));
        return true;
      }catch(e){
        console.error("[Zentryx Layout] Error al abrir Manual:",e);
        app().innerHTML=`
          <div class="zx_card">
            <h2>📖 Manual de uso</h2>
            <div class="zx_text">El Manual está cargado pero ha fallado al abrirse.</div>
            <div class="zx_text" style="margin-top:10px;word-break:break-word;">${limpiar(String(e && (e.stack || e.message) || e))}</div>
          </div>
        `;
        activo("manual");
        return false;
      }
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>📖 Manual de uso</h2>
        <div class="zx_text">El archivo manual.js no ha expuesto ZX_abrirManual / ZX_manual.</div>
        <div class="zx_text" style="margin-top:10px;">Manual detectado: ${limpiar(String(window.ZX_MANUAL_VERSION || "no cargado"))}</div>
      </div>
    `;
    activo("manual");
    guardarModuloActual("manual");
    return false;
  }

  function abrirModuloDesdeMenu(id){
    cerrarMenuUsuario();

    if(String(id||"")==="manual"){
      return abrirManualDirecto();
    }

    // Para el resto de módulos se mantiene el router general.
    try{
      if(window.ZX_ROUTER && typeof window.ZX_ROUTER.open==="function"){
        const ok=window.ZX_ROUTER.open(id,{source:"menu_usuario",force:true});
        if(ok!==false) return true;
      }
    }catch(e){
      console.warn("[Zentryx Layout] Router menú:",e);
    }

    // Respaldo con botón visible si existe.
    const btn=document.querySelector(`.zx_nav_btn[data-modulo="${id}"]`);
    if(btn){
      btn.click();
      return true;
    }

    // Respaldo directo para módulos accesibles desde el menú.
    const directos={
      manual:window.ZX_abrirManual || window.ZX_manual,
      ajustes:window.ZX_ajustes || window.ZX_configuracion,
      configuracion:window.ZX_configuracion
    };
    const fn=directos[id];
    if(typeof fn==="function"){
      fn();
      return true;
    }

    return false;
  }

  userBtn.onclick=function(ev){
    ev.stopPropagation();
    const abrir=userMenu.hidden;
    userMenu.hidden=!abrir;
    userBtn.setAttribute("aria-expanded",abrir ? "true" : "false");
  };

  userMenu.onclick=function(ev){
    ev.stopPropagation();
  };

  escuchar(document,"click",cerrarMenuUsuario);

  $("zx_menu_manual").onclick=function(){
    abrirModuloDesdeMenu("manual");
  };

  $("zx_menu_ajustes").onclick=function(){
    abrirModuloDesdeMenu("ajustes");
  };

  function cerrarSesion(){
    localStorage.removeItem("zentryx_session");
    localStorage.removeItem("usuario");
    location.href="index.html?v="+ZX_VERSION;
  }

  $("zx_menu_cambiar").onclick=cerrarSesion;
  $("zx_menu_salir").onclick=cerrarSesion;
}


function diaActualCalendario(){
  return String(new Date().getDate());
}

function iconoCalendarioHTML(claseExtra=""){
  return `<span class="zx_calendar_icon ${claseExtra}" aria-hidden="true">
    <span class="zx_calendar_top"></span>
    <span class="zx_calendar_day">${diaActualCalendario()}</span>
  </span>`;
}

function actualizarIconosCalendario(){
  document.querySelectorAll(".zx_calendar_day").forEach(function(el){
    el.textContent=diaActualCalendario();
  });
}

function reloj(){
  const agendaBtn=$("zx_agenda_btn");

  if(agendaBtn){
    agendaBtn.onclick=function(){
      if(window.ZX_abrirAgendaHoy) window.ZX_abrirAgendaHoy();
    };
  }

  actualizarReloj();

  if(ZX_RELOJ_TIMER) clearInterval(ZX_RELOJ_TIMER);
  ZX_RELOJ_TIMER=setInterval(actualizarReloj,30000);

  actualizarContadorAgenda();

  if(ZX_AGENDA_TIMER) clearInterval(ZX_AGENDA_TIMER);
  ZX_AGENDA_TIMER=setInterval(actualizarContadorAgenda,60000);
}

function actualizarReloj(){
  const d=new Date();

  const fecha=d.toLocaleDateString("es-ES",{
    weekday:"short",
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  }).replace(".","");

  const hora=d.toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit"
  });

  if($("zx_fecha")) $("zx_fecha").textContent=fecha;
  if($("zx_hora")) $("zx_hora").textContent=hora;
  actualizarIconosCalendario();
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
  const count=$("zx_agenda_count");
  if(!btn || !count) return;

  actualizarIconosCalendario();

  try{
    const datos=await eventosHoy();
    count.textContent=datos.length ? String(datos.length) : "";
    count.style.display=datos.length ? "inline-flex" : "none";
  }catch(e){
    count.textContent="";
    count.style.display="none";
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
  ZXRouter.open("trabajos",{recordId:String(id || ""),source:"agenda_hoy"});
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
  {id:"almacen",texto:"Almacén",icono:"📦",color:"#0f766e",bg:"#ccfbf1",admin:true},
  {id:"usuarios",texto:"Usuarios",icono:"👤",color:"#0891b2",bg:"#cffafe",admin:true},
  {id:"horas_extra",texto:"Horas",icono:"➕",color:"#f59e0b",bg:"#fef3c7",admin:true},
  {id:"control_fichajes",texto:"Control",icono:"✅",color:"#22c55e",bg:"#dcfce7",admin:true},
  {id:"vehiculos",texto:"Vehículos",icono:"🚗",color:"#3b82f6",bg:"#dbeafe",admin:true},
  {id:"manual",texto:"Manual",icono:"📖",color:"#2563eb",bg:"#dbeafe",admin:false},
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

function modulosVisibles(){
  return MODULOS.filter(function(m){return puedeVerModulo(m.id)});
}

function idsFavoritosNavegacion(){
  return ["inicio","fichaje","agenda","trabajos"];
}

function moduloEsFavorito(id){
  return idsFavoritosNavegacion().includes(String(id||""));
}

function claveModulosFavoritos(){
  const u=usuarioActual();
  return `${ZX_FAVORITE_MODULES_KEY}_${u.empresa_id || "demo"}_${u.id || u.usuario || "anonimo"}`;
}

function leerModulosFavoritos(){
  try{
    const datos=JSON.parse(localStorage.getItem(claveModulosFavoritos()) || "[]");
    if(!Array.isArray(datos)) return [];
    return datos
      .map(function(id){return String(id||"")})
      .filter(function(id,index,lista){
        return id && lista.indexOf(id)===index && puedeVerModulo(id);
      })
      .slice(0,12);
  }catch(e){
    return [];
  }
}

function guardarModulosFavoritos(ids){
  const limpios=(Array.isArray(ids) ? ids : [])
    .map(function(id){return String(id||"")})
    .filter(function(id,index,lista){
      return id && lista.indexOf(id)===index && puedeVerModulo(id);
    })
    .slice(0,12);

  try{
    localStorage.setItem(claveModulosFavoritos(),JSON.stringify(limpios));
  }catch(e){}
}

let ZX_FAVORITES_DRAFT=[];

function abrirEditorFavoritos(){
  ZX_FAVORITES_DRAFT=leerModulosFavoritos().slice();
  renderizarEditorFavoritos();

  const fondo=$("zx_favorites_editor_backdrop");
  if(fondo) fondo.hidden=false;
}

function cerrarEditorFavoritos(){
  const fondo=$("zx_favorites_editor_backdrop");
  if(fondo) fondo.hidden=true;
  ZX_FAVORITES_DRAFT=[];
}

function alternarFavoritoBorrador(id){
  id=String(id||"");
  if(!id || !puedeVerModulo(id)) return;

  const indice=ZX_FAVORITES_DRAFT.indexOf(id);
  if(indice>=0){
    ZX_FAVORITES_DRAFT.splice(indice,1);
  }else if(ZX_FAVORITES_DRAFT.length<12){
    ZX_FAVORITES_DRAFT.push(id);
  }

  renderizarEditorFavoritos();
}

function moverFavoritoBorrador(id,direccion){
  const indice=ZX_FAVORITES_DRAFT.indexOf(String(id||""));
  const destino=indice+Number(direccion||0);

  if(indice<0 || destino<0 || destino>=ZX_FAVORITES_DRAFT.length) return;

  const temporal=ZX_FAVORITES_DRAFT[indice];
  ZX_FAVORITES_DRAFT[indice]=ZX_FAVORITES_DRAFT[destino];
  ZX_FAVORITES_DRAFT[destino]=temporal;
  renderizarEditorFavoritos();
}

function renderizarEditorFavoritos(){
  const seleccionados=$("zx_favorites_selected");
  const disponibles=$("zx_favorites_available");
  if(!seleccionados || !disponibles) return;

  const modulos=modulosVisibles();

  const seleccion=ZX_FAVORITES_DRAFT
    .map(function(id){return modulos.find(function(m){return m.id===id})})
    .filter(Boolean);

  seleccionados.innerHTML=seleccion.length ? seleccion.map(function(m,index){
    return `
      <div class="zx_favorite_selected_row">
        <div class="zx_favorite_selected_info">
          <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_favorite_edit") : limpiar(m.icono)}</span>
          <span>${limpiar(m.texto)}</span>
        </div>
        <div class="zx_favorite_selected_controls">
          <button class="zx_favorite_selected_btn zx_favorite_move_up" data-modulo="${limpiar(m.id)}" type="button" ${index===0 ? "disabled" : ""}>Subir</button>
          <button class="zx_favorite_selected_btn zx_favorite_move_down" data-modulo="${limpiar(m.id)}" type="button" ${index===seleccion.length-1 ? "disabled" : ""}>Bajar</button>
          <button class="zx_favorite_selected_btn zx_favorite_selected_remove" data-modulo="${limpiar(m.id)}" type="button">Quitar</button>
        </div>
      </div>
    `;
  }).join("") : '<div class="zx_favorites_selected_empty">No hay favoritos seleccionados.</div>';

  disponibles.innerHTML=modulos.map(function(m){
    const seleccionado=ZX_FAVORITES_DRAFT.includes(m.id);
    return `
      <button class="zx_favorite_choice ${seleccionado ? "zx_selected" : ""}" data-modulo="${limpiar(m.id)}" type="button">
        <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_favorite_choice") : limpiar(m.icono)}</span>
        <span>${limpiar(m.texto)}</span>
        <span class="zx_favorite_choice_mark">${seleccionado ? "✓" : "+"}</span>
      </button>
    `;
  }).join("");

  seleccionados.querySelectorAll(".zx_favorite_move_up").forEach(function(btn){
    btn.onclick=function(){moverFavoritoBorrador(btn.dataset.modulo,-1)};
  });

  seleccionados.querySelectorAll(".zx_favorite_move_down").forEach(function(btn){
    btn.onclick=function(){moverFavoritoBorrador(btn.dataset.modulo,1)};
  });

  seleccionados.querySelectorAll(".zx_favorite_selected_remove").forEach(function(btn){
    btn.onclick=function(){alternarFavoritoBorrador(btn.dataset.modulo)};
  });

  disponibles.querySelectorAll(".zx_favorite_choice").forEach(function(btn){
    btn.onclick=function(){alternarFavoritoBorrador(btn.dataset.modulo)};
  });
}

function renderizarModulosFavoritos(){
  const contenedor=$("zx_modules_favorites");
  const lista=$("zx_modules_favorites_list");
  if(!contenedor || !lista) return;

  const favoritos=leerModulosFavoritos()
    .map(function(id){return MODULOS.find(function(m){return m.id===id})})
    .filter(Boolean);

  contenedor.hidden=false;

  lista.innerHTML=favoritos.length ? favoritos.map(function(m){
    return `
      <div class="zx_favorite_item" data-modulo="${limpiar(m.id)}" data-busqueda="${limpiar(("favorito fijado "+m.texto+" "+m.id).toLowerCase())}">
        <button class="zx_favorite_open" data-modulo="${limpiar(m.id)}" type="button">
          <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_favorite") : limpiar(m.icono)}</span>
          <span>${limpiar(m.texto)}</span>
        </button>
      </div>
    `;
  }).join("") : '<div class="zx_favorites_selected_empty">No tienes favoritos configurados.</div>';

  lista.querySelectorAll(".zx_favorite_open").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.modulo;
      cerrarMenuModulos();
      abrirModuloPorId(id);
    };
  });
}

function claveModulosRecientes(){
  const u=usuarioActual();
  return `${ZX_RECENT_MODULES_KEY}_${u.empresa_id || "demo"}_${u.id || u.usuario || "anonimo"}`;
}

function leerModulosRecientes(){
  try{
    const datos=JSON.parse(localStorage.getItem(claveModulosRecientes()) || "[]");
    if(!Array.isArray(datos)) return [];
    return datos
      .map(function(id){return String(id||"")})
      .filter(function(id,index,lista){
        return id && lista.indexOf(id)===index && puedeVerModulo(id);
      })
      .slice(0,5);
  }catch(e){
    return [];
  }
}

function guardarModuloReciente(id){
  id=String(id||"");
  if(!id || !puedeVerModulo(id)) return;

  const recientes=leerModulosRecientes().filter(function(actual){
    return actual!==id;
  });

  recientes.unshift(id);

  try{
    localStorage.setItem(claveModulosRecientes(),JSON.stringify(recientes.slice(0,5)));
  }catch(e){}
}

function renderizarModulosRecientes(){
  const contenedor=$("zx_modules_recent");
  const lista=$("zx_modules_recent_list");
  if(!contenedor || !lista) return;

  const recientes=leerModulosRecientes()
    .map(function(id){return MODULOS.find(function(m){return m.id===id})})
    .filter(Boolean);

  contenedor.hidden=recientes.length===0;
  lista.innerHTML=recientes.map(function(m){
    return `
      <button class="zx_recent_btn" data-modulo="${limpiar(m.id)}" data-busqueda="${limpiar(("reciente "+m.texto+" "+m.id).toLowerCase())}" type="button">
        <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_recent") : limpiar(m.icono)}</span>
        <span>${limpiar(m.texto)}</span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll(".zx_recent_btn").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.modulo;
      cerrarMenuModulos();
      abrirModuloPorId(id);
    };
  });
}

function normalizarGlobal(valor){
  return String(valor||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .trim();
}

function leerCacheGlobal(clave){
  try{
    const datos=JSON.parse(localStorage.getItem(clave) || "[]");
    return Array.isArray(datos) ? datos : [];
  }catch(e){
    return [];
  }
}

function leerCacheVehiculosGlobal(){
  const claves=["zentryx_cache_vehiculos_v3144","zentryx_cache_vehiculos","zentryx_vehiculos_cache"];

  for(const clave of claves){
    const lista=leerCacheGlobal(clave);
    if(lista.length) return lista;
  }

  try{
    for(let i=0;i<localStorage.length;i++){
      const clave=localStorage.key(i);
      if(/^zentryx_cache_vehiculos/i.test(String(clave||""))){
        const lista=leerCacheGlobal(clave);
        if(lista.length) return lista;
      }
    }
  }catch(e){}

  return [];
}

function primerValor(registro,claves,defecto){
  for(const clave of claves){
    const valor=registro && registro[clave];
    if(valor!==null && valor!==undefined && String(valor).trim()){
      return String(valor).trim();
    }
  }
  return defecto || "";
}

function textoGlobalRegistro(registro){
  if(!registro || typeof registro!=="object") return "";

  return normalizarGlobal(
    Object.keys(registro)
      .filter(function(clave){
        return !/pin|password|hash|token|firma|foto|archivo|documento|contenido|base64/i.test(clave);
      })
      .map(function(clave){
        const valor=registro[clave];
        if(valor===null || valor===undefined || typeof valor==="object") return "";
        return String(valor);
      })
      .join(" ")
  );
}

function resultadosGlobales(termino){
  termino=normalizarGlobal(termino);
  if(termino.length<2) return [];

  const configuraciones=[
    {
      modulo:"clientes",tipo:"Cliente",icono:"👥",bg:"#dbeafe",color:"#2563eb",
      datos:leerCacheGlobal("zentryx_cache_clientes"),
      titulo:function(r){return primerValor(r,["nombre","razon_social","empresa","nombre_comercial"],"Cliente")},
      meta:function(r){return [primerValor(r,["telefono","telefono_principal","movil"],""),primerValor(r,["email","email_principal"],""),primerValor(r,["poblacion","localidad","direccion"],"")].filter(Boolean).join(" · ")}
    },
    {
      modulo:"trabajos",tipo:"Trabajo",icono:"🛠️",bg:"#dbeafe",color:"#2563eb",
      datos:leerCacheGlobal("zentryx_cache_trabajos"),
      titulo:function(r){return primerValor(r,["titulo","nombre","descripcion"],"Trabajo")},
      meta:function(r){return [primerValor(r,["cliente_nombre","cliente","direccion_obra","direccion"],""),primerValor(r,["estado"],"")].filter(Boolean).join(" · ")}
    },
    {
      modulo:"usuarios",tipo:"Usuario",icono:"👤",bg:"#ede9fe",color:"#7c3aed",
      datos:leerCacheGlobal("zentryx_cache_usuarios"),
      titulo:function(r){return [r&&r.nombre,r&&r.apellidos].filter(Boolean).join(" ").trim() || primerValor(r,["usuario","nombre_completo"],"Usuario")},
      meta:function(r){return [primerValor(r,["rol","puesto"],""),primerValor(r,["telefono_personal","telefono_empresa","telefono"],""),primerValor(r,["email_empresa","email_personal","email"],"")].filter(Boolean).join(" · ")}
    },
    {
      modulo:"vehiculos",tipo:"Vehículo",icono:"🚐",bg:"#dcfce7",color:"#16a34a",
      datos:leerCacheVehiculosGlobal(),
      titulo:function(r){
        const matricula=primerValor(r,["matricula"],"");
        const modelo=[primerValor(r,["marca"],""),primerValor(r,["modelo"],"")].filter(Boolean).join(" ");
        return [matricula,modelo].filter(Boolean).join(" · ") || "Vehículo";
      },
      meta:function(r){return [primerValor(r,["usuario_nombre","usuario_asignado_nombre","estado"],""),primerValor(r,["km_actual","kilometros"],"")].filter(Boolean).join(" · ")}
    }
  ];

  const resultados=[];

  configuraciones.forEach(function(config){
    if(!puedeVerModulo(config.modulo)) return;

    config.datos.forEach(function(registro){
      if(resultados.length>=20 || !textoGlobalRegistro(registro).includes(termino)) return;

      resultados.push({
        modulo:config.modulo,
        tipo:config.tipo,
        icono:config.icono,
        bg:config.bg,
        color:config.color,
        id:primerValor(registro,["id","uuid"],""),
        titulo:config.titulo(registro),
        meta:config.meta(registro),
        busqueda:termino
      });
    });
  });

  return resultados.slice(0,12);
}

function aplicarBusquedaEnModulo(modulo,termino){
  const mapa={
    clientes:"zx_buscar_clientes",
    trabajos:"zx_buscar_trabajos",
    usuarios:"zx_buscar_usuarios",
    vehiculos:"zx_buscar_vehiculos"
  };

  const id=mapa[modulo];
  if(!id) return;

  let intentos=0;
  const timer=setInterval(function(){
    intentos++;
    const input=$(id);

    if(input){
      clearInterval(timer);
      input.value=termino || "";
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.dispatchEvent(new Event("change",{bubbles:true}));
      try{input.focus()}catch(e){}
    }else if(intentos>=20){
      clearInterval(timer);
    }
  },100);
}

function abrirResultadoGlobal(resultado){
  if(!resultado) return;

  cerrarMenuModulos();
  ZXRouter.open(resultado.modulo,{
    recordId:resultado.id || "",
    query:resultado.modulo==="trabajos" && resultado.id ? "" : (resultado.titulo || resultado.busqueda || ""),
    source:"busqueda_global"
  });
}

function pintarResultadosGlobales(termino){
  const bloque=$("zx_global_results");
  const lista=$("zx_global_results_list");
  const contador=$("zx_global_results_count");
  if(!bloque || !lista || !contador) return 0;

  const resultados=resultadosGlobales(termino);
  bloque.hidden=normalizarGlobal(termino).length<2 || resultados.length===0;
  contador.textContent=resultados.length ? `${resultados.length} resultado${resultados.length===1 ? "" : "s"}` : "";

  lista.innerHTML=resultados.map(function(r,index){
    return `
      <button class="zx_global_result" data-global-index="${index}" type="button" aria-label="Abrir ${limpiar(r.tipo)}: ${limpiar(r.titulo)}">
        <span class="zx_global_result_icon" style="background:${r.bg};color:${r.color};">${limpiar(r.icono)}</span>
        <span class="zx_global_result_text">
          <span class="zx_global_result_title">${limpiar(r.titulo)}</span>
          <span class="zx_global_result_meta">${limpiar(r.meta || "Abrir en "+r.tipo)}</span>
        </span>
        <span class="zx_global_result_type">${limpiar(r.tipo)}</span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll(".zx_global_result").forEach(function(btn){
    btn.onclick=function(){
      abrirResultadoGlobal(resultados[Number(btn.dataset.globalIndex)]);
    };
  });

  return resultados.length;
}

function cerrarMenuModulos(){
  const fondo=$("zx_modules_backdrop");
  if(fondo) fondo.hidden=true;

  const scrollY=Number(document.body.dataset.zxMenuScrollY||0);
  document.body.classList.remove("zx_modal_abierto");
  document.body.style.top="";
  delete document.body.dataset.zxMenuScrollY;

  if(window.innerWidth<640){
    window.scrollTo(0,scrollY);
  }
}

function abrirMenuModulos(){
  const fondo=$("zx_modules_backdrop");
  if(!fondo) return;

  const buscador=$("zx_modules_search");
  if(buscador) buscador.value="";

  document.querySelectorAll(".zx_module_full_btn,.zx_tool_btn,.zx_favorite_item,.zx_recent_btn").forEach(function(btn){
    btn.hidden=false;
  });

  const grid=$("zx_modules_grid");
  if(grid) grid.hidden=false;
  const tituloModulos=$("zx_modules_main_title");
  if(tituloModulos) tituloModulos.hidden=false;

  const tools=$("zx_modules_tools");
  if(tools) tools.hidden=!puedeUsarNotasRapidas();
  const vacio=$("zx_modules_empty");
  if(vacio) vacio.hidden=true;

  const globales=$("zx_global_results");
  if(globales) globales.hidden=true;
  const globalLista=$("zx_global_results_list");
  if(globalLista) globalLista.innerHTML="";

  if(window.innerWidth<640){
    const scrollY=window.scrollY||document.documentElement.scrollTop||0;
    document.body.dataset.zxMenuScrollY=String(scrollY);
    document.body.style.top=`-${scrollY}px`;
  }

  renderizarModulosFavoritos();
  renderizarModulosRecientes();

  fondo.hidden=false;
  document.body.classList.add("zx_modal_abierto");
  actualizarActivoMenuCompleto(leerModuloActual());

  if(window.innerWidth>=640 && buscador){
    setTimeout(function(){buscador.focus()},50);
  }
}

function actualizarActivoMenuCompleto(id){
  document.querySelectorAll(".zx_module_full_btn").forEach(function(btn){
    btn.classList.toggle("zx_activo",String(btn.dataset.modulo||"")===String(id||""));
  });
}

function montarMenuCompletoModulos(){
  const anterior=$("zx_modules_backdrop");
  if(anterior) anterior.remove();

  const fondo=document.createElement("div");
  fondo.id="zx_modules_backdrop";
  fondo.hidden=true;
  fondo.innerHTML=`
    <div id="zx_modules_panel" role="dialog" aria-modal="true" aria-label="Todos los módulos">
      <div class="zx_modules_head">
        <div class="zx_modules_title">Menú de aplicaciones</div>
        <button id="zx_modules_close" type="button" aria-label="Cerrar">✕</button>
      </div>

      <div id="zx_modules_search_wrap">
        <input id="zx_modules_search" type="search" placeholder="Buscar módulos, clientes, trabajos, usuarios…" autocomplete="off" spellcheck="false" inputmode="search" enterkeyhint="search" aria-label="Buscar en Zentryx PRO">
        <span id="zx_modules_search_icon">🔍</span>
        <span class="zx_command_shortcut" aria-hidden="true">Ctrl K</span>
      </div>

      <div id="zx_global_results" hidden>
        <div class="zx_global_results_head">
          <div class="zx_global_results_title">Resultados de la aplicación</div>
          <div id="zx_global_results_count"></div>
        </div>
        <div id="zx_global_results_list"></div>
        <div class="zx_global_results_note">Búsqueda instantánea sobre la información disponible en el dispositivo. Funciona también sin cobertura.</div>
      </div>

      <div id="zx_modules_favorites">
        <div class="zx_favorites_header">
          <div class="zx_modules_section_title">Favoritos</div>
          <button id="zx_favorites_manage" type="button">Gestionar</button>
        </div>
        <div id="zx_modules_favorites_list"></div>
      </div>

      <div id="zx_modules_recent" hidden>
        <div class="zx_modules_section_title">Recientes</div>
        <div id="zx_modules_recent_list"></div>
      </div>

      <div class="zx_modules_section_title" id="zx_modules_main_title">Módulos</div>
      <div id="zx_modules_grid">
        ${modulosVisibles().map(function(m){
          return `
            <button class="zx_module_full_btn" data-modulo="${limpiar(m.id)}" data-busqueda="${limpiar((m.texto+" "+m.id).toLowerCase())}" type="button">
              <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_nav") : limpiar(m.icono)}</span>
              <span>${limpiar(m.texto)}</span>
            </button>
          `;
        }).join("")}
      </div>

      <div id="zx_modules_empty" hidden>No se encontraron resultados. Prueba con un nombre, teléfono, matrícula, dirección o título de trabajo.</div>

      <div id="zx_modules_tools" ${puedeUsarNotasRapidas() ? "" : "hidden"}>
        <div class="zx_modules_section_title">Herramientas</div>
        <button class="zx_tool_btn" id="zx_tool_notas" data-busqueda="notas rápidas postit recordatorio herramienta" type="button">
          <span class="zx_tool_icon">📝</span>
          <span>Notas rápidas</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(fondo);

  const editor=document.createElement("div");
  editor.id="zx_favorites_editor_backdrop";
  editor.hidden=true;
  editor.innerHTML=`
    <div id="zx_favorites_editor_panel" role="dialog" aria-modal="true" aria-label="Gestionar favoritos">
      <div class="zx_favorites_editor_head">
        <div class="zx_favorites_editor_title">Gestionar favoritos</div>
        <button class="zx_favorites_editor_close" id="zx_favorites_editor_close" type="button" aria-label="Cerrar">✕</button>
      </div>

      <div class="zx_favorites_editor_body">
        <p class="zx_favorites_editor_intro">
          Los cambios solo se aplican al pulsar Guardar. Selecciona los módulos que quieres ver como favoritos y ordénalos desde la lista superior.
        </p>

        <section class="zx_favorites_editor_section">
          <div class="zx_favorites_editor_section_title">Orden de favoritos</div>
          <div id="zx_favorites_selected"></div>
        </section>

        <section class="zx_favorites_editor_section">
          <div class="zx_favorites_editor_section_title">Módulos disponibles</div>
          <div id="zx_favorites_available"></div>
        </section>
      </div>

      <div class="zx_favorites_editor_footer">
        <button id="zx_favorites_cancel" type="button">Cancelar</button>
        <button id="zx_favorites_save" type="button">Guardar cambios</button>
      </div>
    </div>
  `;
  document.body.appendChild(editor);

  const buscador=$("zx_modules_search");

  function normalizarBusqueda(valor){
    return String(valor||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .trim();
  }

  function filtrarMenuAplicaciones(){
    const termino=normalizarBusqueda(buscador ? buscador.value : "");
    const panel=$("zx_modules_panel");
    if(!panel) return;

    let visibles=0;
    const globalesVisibles=pintarResultadosGlobales(termino);

    panel.querySelectorAll(".zx_module_full_btn,.zx_tool_btn,.zx_recent_btn,.zx_favorite_item").forEach(function(btn){
      const texto=normalizarBusqueda(btn.dataset.busqueda || btn.textContent);
      const mostrar=!termino || texto.includes(termino);
      btn.hidden=!mostrar;
      if(mostrar) visibles++;
    });

    const favoritos=$("zx_modules_favorites");
    if(favoritos){
      const items=Array.from(favoritos.querySelectorAll(".zx_favorite_item"));
      const favoritosVisibles=items.some(function(item){return !item.hidden});
      favoritos.hidden=!!termino && items.length>0 && !favoritosVisibles;
    }

    const recientes=$("zx_modules_recent");
    if(recientes){
      const recientesVisibles=Array.from(recientes.querySelectorAll(".zx_recent_btn"))
        .some(function(btn){return !btn.hidden});
      recientes.hidden=!recientesVisibles;
    }

    const grid=$("zx_modules_grid");
    const tituloModulos=$("zx_modules_main_title");
    if(grid && tituloModulos){
      const modulosVisibles=Array.from(grid.querySelectorAll(".zx_module_full_btn"))
        .some(function(btn){return !btn.hidden});
      grid.hidden=!modulosVisibles;
      tituloModulos.hidden=!modulosVisibles;
    }

    const tools=$("zx_modules_tools");
    if(tools){
      const herramientasVisibles=Array.from(tools.querySelectorAll(".zx_tool_btn"))
        .some(function(btn){return !btn.hidden});
      tools.hidden=!herramientasVisibles;
    }

    const vacio=$("zx_modules_empty");
    if(vacio) vacio.hidden=(visibles+globalesVisibles)>0;
  }

  if(buscador){
    buscador.addEventListener("input",filtrarMenuAplicaciones);
  }

  $("zx_modules_close").onclick=cerrarMenuModulos;
  fondo.onclick=function(ev){
    if(ev.target===fondo) cerrarMenuModulos();
  };

  const gestionar=$("zx_favorites_manage");
  if(gestionar) gestionar.onclick=abrirEditorFavoritos;

  const cerrarEditor=$("zx_favorites_editor_close");
  if(cerrarEditor) cerrarEditor.onclick=cerrarEditorFavoritos;

  const cancelar=$("zx_favorites_cancel");
  if(cancelar) cancelar.onclick=cerrarEditorFavoritos;

  const guardar=$("zx_favorites_save");
  if(guardar){
    guardar.onclick=function(){
      guardarModulosFavoritos(ZX_FAVORITES_DRAFT);
      cerrarEditorFavoritos();
      renderizarModulosFavoritos();
    };
  }

  editor.onclick=function(ev){
    if(ev.target===editor) cerrarEditorFavoritos();
  };

  escuchar(document,"keydown",function(ev){
    const tecla=String(ev.key||"").toLowerCase();

    if((ev.ctrlKey || ev.metaKey) && tecla==="k"){
      ev.preventDefault();
      abrirMenuModulos();
      setTimeout(function(){
        const input=$("zx_modules_search");
        if(input) input.focus();
      },30);
      return;
    }

    if(ev.key==="Escape"){
      const editorFavoritos=$("zx_favorites_editor_backdrop");
      if(editorFavoritos && !editorFavoritos.hidden){
        cerrarEditorFavoritos();
        return;
      }

      const menu=$("zx_modules_backdrop");
      if(menu && !menu.hidden){
        cerrarMenuModulos();
      }
    }
  });

  document.querySelectorAll(".zx_module_full_btn").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.modulo;
      cerrarMenuModulos();
      abrirModuloPorId(id);
    };
  });

  const notas=$("zx_tool_notas");
  if(notas){
    notas.onclick=function(){
      cerrarMenuModulos();
      if(window.ZX_abrirNotasRapidas) window.ZX_abrirNotasRapidas();
    };
  }
}

function nav(){
  const visibles=modulosVisibles();
  const favoritos=idsFavoritosNavegacion()
    .map(function(id){return visibles.find(function(m){return m.id===id})})
    .filter(Boolean);

  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    <div id="zx_nav_inner">
      ${favoritos.map(function(m){
        return `
          <button class="zx_nav_btn" data-modulo="${limpiar(m.id)}" type="button" title="${limpiar(m.texto)}" aria-label="${limpiar(m.texto)}">
            <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_nav") : limpiar(m.icono)}</span>
            <span class="zx_nav_label">${limpiar(m.texto)}</span>
          </button>
        `;
      }).join("")}
      <button class="zx_nav_btn" id="zx_nav_more" type="button" title="Abrir menú" aria-label="Abrir menú">
        <span class="zx_nav_icon" style="background:#e2e8f0;color:#334155;">☰</span>
        <span class="zx_nav_label">Menú</span>
      </button>
    </div>
  `;

  document.body.insertBefore(n,app());

  document.querySelectorAll(".zx_nav_btn[data-modulo]").forEach(function(btn){
    btn.onclick=function(){
      abrirModuloPorId(btn.dataset.modulo);
    };
  });

  $("zx_nav_more").onclick=abrirMenuModulos;
  montarMenuCompletoModulos();
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

  const more=$("zx_nav_more");
  if(more){
    more.classList.toggle("zx_activo",!!objetivo && !moduloEsFavorito(objetivo));
  }

  actualizarActivoMenuCompleto(objetivo);

  if(objetivo){
    guardarModuloActual(objetivo);
    guardarModuloReciente(objetivo);
  }
}


function zxRouterNormalizarModulo(modulo){
  const id=String(modulo || "").trim().toLowerCase();
  return id==="horas" ? "horas_extra" : id;
}

function zxRouterLeerJSON(clave,defecto){
  try{
    const valor=JSON.parse(sessionStorage.getItem(clave) || "null");
    return valor===null ? defecto : valor;
  }catch(e){
    return defecto;
  }
}

function zxRouterGuardarJSON(clave,valor){
  try{sessionStorage.setItem(clave,JSON.stringify(valor))}catch(e){}
}

function zxRouterSelectorSeguro(valor){
  try{return CSS.escape(String(valor || ""))}catch(e){return String(valor || "").replace(/["\\]/g,"\\$&")}
}

function zxRouterCapturarContexto(modulo){
  const id=zxRouterNormalizarModulo(modulo || leerModuloActual());
  if(!id || !app()) return null;

  const campos={};
  app().querySelectorAll('input[id],select[id],textarea[id]').forEach(function(el){
    if(el.type==="password" || el.type==="file") return;
    campos[el.id]={
      value:el.type==="checkbox" || el.type==="radio" ? !!el.checked : el.value,
      tipo:el.type || el.tagName.toLowerCase()
    };
  });

  const activoEl=app().querySelector('[data-tab].active,[data-tab].activo,[data-pestana].active,[data-pestana].activo,.tab.active,.pestana.activa');
  const contexto={
    modulo:id,
    scrollY:Math.max(0,window.scrollY || document.documentElement.scrollTop || 0),
    campos:campos,
    tab:activoEl ? (activoEl.dataset.tab || activoEl.dataset.pestana || activoEl.id || "") : "",
    actualizado:new Date().toISOString()
  };

  const todos=zxRouterLeerJSON(ZX_ROUTER_CONTEXT_KEY,{});
  todos[id]=contexto;
  zxRouterGuardarJSON(ZX_ROUTER_CONTEXT_KEY,todos);
  return contexto;
}

function zxRouterCancelarRestauracion(){
  if(ZX_ROUTER_RESTORE_TIMER){
    clearInterval(ZX_ROUTER_RESTORE_TIMER);
    ZX_ROUTER_RESTORE_TIMER=null;
  }
}

function zxRouterRestaurarContexto(modulo,opciones){
  zxRouterCancelarRestauracion();

  const id=zxRouterNormalizarModulo(modulo);
  const todos=zxRouterLeerJSON(ZX_ROUTER_CONTEXT_KEY,{});
  const contexto=todos[id];
  if(!contexto) return false;

  const opts=opciones || {};
  let intentos=0;
  ZX_ROUTER_RESTORE_TIMER=setInterval(function(){
    intentos++;
    const raiz=app();
    if(!raiz){
      if(intentos>=15) zxRouterCancelarRestauracion();
      return;
    }

    Object.keys(contexto.campos || {}).forEach(function(campoId){
      const el=$(campoId);
      const dato=contexto.campos[campoId];
      if(!el || !dato) return;
      if(dato.tipo==="checkbox" || dato.tipo==="radio") el.checked=!!dato.value;
      else el.value=dato.value == null ? "" : dato.value;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    });

    if(contexto.tab){
      const v=zxRouterSelectorSeguro(contexto.tab);
      const tab=raiz.querySelector('[data-tab="'+v+'"],[data-pestana="'+v+'"],#'+v);
      if(tab && typeof tab.click==="function") tab.click();
    }

    if(opts.restaurarScroll!==false){
      window.scrollTo({top:Number(contexto.scrollY || 0),left:0,behavior:"auto"});
    }

    if(raiz.children.length || intentos>=15) zxRouterCancelarRestauracion();
  },80);
  return true;
}

function zxRouterRutaActual(){
  const guardada=zxRouterLeerJSON(ZX_ROUTER_CURRENT_KEY,null);
  const modulo=zxRouterNormalizarModulo(leerModuloActual());
  if(guardada && guardada.modulo===modulo){
    return {
      modulo:modulo,
      recordId:String(guardada.recordId || ""),
      query:String(guardada.query || ""),
      timestamp:Number(guardada.timestamp || Date.now())
    };
  }
  return {modulo:modulo,recordId:"",query:"",timestamp:Date.now()};
}

function zxRouterGuardarRutaActual(modulo,opciones){
  const opts=opciones || {};
  const ruta={
    modulo:zxRouterNormalizarModulo(modulo),
    recordId:String(opts.recordId || opts.id || ""),
    query:String(opts.query || ""),
    timestamp:Date.now()
  };
  zxRouterGuardarJSON(ZX_ROUTER_CURRENT_KEY,ruta);
  return ruta;
}

function zxRouterEsAperturaDuplicada(modulo,opciones){
  const opts=opciones || {};
  if(opts.force===true) return false;
  const key=[modulo,String(opts.recordId || opts.id || ""),String(opts.query || "")].join("|");
  const ahora=Date.now();
  const duplicada=ZX_ROUTER_LAST_OPEN.key===key && (ahora-ZX_ROUTER_LAST_OPEN.at)<ZX_ROUTER_DUPLICATE_WINDOW;
  ZX_ROUTER_LAST_OPEN={key:key,at:ahora};
  return duplicada;
}

function zxRouterLeerHistorial(){
  const h=zxRouterLeerJSON(ZX_ROUTER_HISTORY_KEY,[]);
  return Array.isArray(h) ? h : [];
}

function zxRouterGuardarHistorial(historial){
  zxRouterGuardarJSON(ZX_ROUTER_HISTORY_KEY,(historial || []).slice(-ZX_ROUTER_MAX_HISTORY));
}

function zxRouterPrepararRegistro(modulo,recordId){
  const id=String(recordId || "").trim();
  if(!id) return;
  if(modulo==="trabajos") window.ZX_TRABAJO_ABRIR_ID=id;
  window.ZX_ROUTER_RECORD={modulo:modulo,id:id,timestamp:Date.now()};
  try{sessionStorage.setItem("zentryx_router_record",JSON.stringify(window.ZX_ROUTER_RECORD))}catch(e){}
}

function zxRouterEjecutarModulo(id){
  const mapa={
    inicio:window.ZX_inicio,
    fichaje:window.ZX_abrirFichaje,
    agenda:window.ZX_abrirAgenda,
    clientes:window.ZX_abrirClientes,
    trabajos:window.ZX_abrirTrabajos,
    almacen:window.ZX_abrirAlmacen || window.ZX_almacen,
    usuarios:window.ZX_usuarios,
    horas_extra:window.ZX_abrirHorasExtra,
    control_fichajes:window.ZX_abrirControlFichajes,
    vehiculos:window.ZX_vehiculos,
    manual:window.ZX_abrirManual || window.ZX_manual,
    desarrollador:window.ZX_abrirDesarrollador,
    configuracion:window.ZX_configuracion
  };

  if(typeof mapa[id]==="function"){
    mapa[id]();
    return true;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>${limpiar(id || "Pantalla")}</h2>
      <div class="zx_text">Esta pantalla no está disponible.</div>
    </div>
  `;
  return false;
}

const ZXRouter={
  version:"1.1",
  open:function(modulo,opciones){
    const id=zxRouterNormalizarModulo(modulo);
    const opts=typeof opciones==="string" ? {recordId:opciones} : Object.assign({},opciones || {});
    if(!id || zxRouterEsAperturaDuplicada(id,opts)) return false;

    zxRouterCancelarRestauracion();

    const anterior=zxRouterRutaActual();
    if(anterior.modulo && anterior.modulo!==id) zxRouterCapturarContexto(anterior.modulo);

    if(opts.replace!==true && anterior.modulo && anterior.modulo!==id){
      const historial=zxRouterLeerHistorial();
      const ultimo=historial[historial.length-1];
      const mismaRuta=ultimo && ultimo.modulo===anterior.modulo &&
        String(ultimo.recordId || "")===String(anterior.recordId || "") &&
        String(ultimo.query || "")===String(anterior.query || "");
      if(!mismaRuta){
        historial.push(anterior);
        zxRouterGuardarHistorial(historial);
      }
    }

    zxRouterPrepararRegistro(id,opts.recordId || opts.id);
    const abierto=zxRouterEjecutarModulo(id);
    if(!abierto) return false;

    const ruta=zxRouterGuardarRutaActual(id,opts);

    if(opts.query){
      setTimeout(function(){aplicarBusquedaEnModulo(id,String(opts.query || ""))},180);
    }else if(opts.restore!==false && !(opts.recordId || opts.id)){
      zxRouterRestaurarContexto(id,opts);
    }

    document.dispatchEvent(new CustomEvent("zentryx:navigation",{detail:{modulo:id,opciones:opts,ruta:ruta}}));
    return true;
  },
  replace:function(modulo,opciones){
    return this.open(modulo,Object.assign({},opciones || {},{replace:true}));
  },
  back:function(){
    zxRouterCapturarContexto(leerModuloActual());
    const historial=zxRouterLeerHistorial();
    const anterior=historial.pop();
    zxRouterGuardarHistorial(historial);
    if(!anterior) return this.open("inicio",{replace:true});
    return this.open(anterior.modulo,{replace:true,restore:true,recordId:anterior.recordId || "",query:anterior.query || ""});
  },
  current:function(){return zxRouterRutaActual()},
  history:function(){return zxRouterLeerHistorial().slice()},
  saveContext:function(){return zxRouterCapturarContexto(leerModuloActual())},
  restoreContext:function(modulo){return zxRouterRestaurarContexto(modulo || leerModuloActual(),{})},
  clear:function(){
    zxRouterCancelarRestauracion();
    zxRouterGuardarHistorial([]);
    zxRouterGuardarJSON(ZX_ROUTER_CONTEXT_KEY,{});
    try{sessionStorage.removeItem(ZX_ROUTER_CURRENT_KEY)}catch(e){}
  }
};

window.ZXRouter=ZXRouter;
window.ZX_ROUTER=ZXRouter;

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
  ZXRouter.replace(id,{restore:true,source:"restaurar"});
}

function abrirModuloPorId(id,opciones){
  if(String(id||"")==="manual"){
    cerrarMenuModulos();

    try{sessionStorage.setItem("zentryx_asistente_mostrado_sesion","1")}catch(e){}

    const fn=window.ZX_abrirManual || window.ZX_manual;
    if(typeof fn==="function"){
      try{
        fn();
        activo("manual");
        guardarModuloActual("manual");
        zxRouterGuardarRutaActual("manual",{source:"menu_aplicaciones"});
        document.dispatchEvent(new CustomEvent("zentryx:navigation",{
          detail:{modulo:"manual",opciones:{source:"menu_aplicaciones"},ruta:{modulo:"manual"}}
        }));
        return true;
      }catch(e){
        console.error("[Zentryx Layout] Manual desde aplicaciones:",e);
        app().innerHTML=`
          <div class="zx_card">
            <h2>📖 Manual de uso</h2>
            <div class="zx_text">El Manual está cargado pero ha fallado al abrirse.</div>
            <div class="zx_text" style="margin-top:10px;word-break:break-word;">${limpiar(String(e && (e.stack || e.message) || e))}</div>
          </div>
        `;
        activo("manual");
        guardarModuloActual("manual");
        return false;
      }
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>📖 Manual de uso</h2>
        <div class="zx_text">No se ha encontrado la función del Manual.</div>
        <div class="zx_text" style="margin-top:10px;">Versión detectada: ${limpiar(String(window.ZX_MANUAL_VERSION || "no cargado"))}</div>
      </div>
    `;
    activo("manual");
    guardarModuloActual("manual");
    return false;
  }

  return ZXRouter.open(id,opciones || {});
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
  const modAlmacen=window.ZX_almacen;
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

  window.ZX_abrirAlmacen=function(){
    abrirModulo("almacen",function(){
      if(typeof modAlmacen==="function"){modAlmacen();return}
      app().innerHTML=`<div class="zx_card"><h2>Almacén</h2><div class="zx_text">No se ha cargado almacen.js.</div></div>`;
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
  router:ZXRouter,
  volver:function(){return ZXRouter.back()},
  iniciar:function(){
    limpiarLayout();
    estilos();
    instalarRutas();
    topbar();
    reloj();
    nav();
    instalarCabeceraFijaReal();

    const asegurarModulo=function(){
      if(document.hidden) return;
      const esperado=leerModuloActual();
      const visible=moduloVisibleEnDOM();
      if(esperado && visible && esperado!==visible){
        restaurarModuloActual();
      }
    };

    escuchar(document,"visibilitychange",function(){
      if(!document.hidden){
        setTimeout(asegurarModulo,80);
        setTimeout(asegurarModulo,500);
      }
    });
    escuchar(window,"pageshow",function(){setTimeout(asegurarModulo,120)});
    escuchar(window,"focus",function(){setTimeout(asegurarModulo,180)});

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
