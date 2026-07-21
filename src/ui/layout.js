// ===============================
// ZENTRYX PRO - LAYOUT
// V3130 - NAVEGACIÓN PROFESIONAL Y MENÚ DE USUARIO
// ===============================
(function(){
"use strict";

const ZX_VERSION="3130";

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
  ["zx_topbar","zx_reloj","zx_nav","zx_postit","zx_css"].forEach(function(id){
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
      gap:8px;
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


    #zx_reloj{
      width:100%;
      background:rgba(255,255,255,.82);
      border-bottom:1px solid var(--zx-line);
      padding:6px 12px;
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
      font-size:19px;
      font-weight:950;
      letter-spacing:-.2px;
      white-space:nowrap;
      line-height:1.05;
    }

    #zx_agenda_btn{
      border-radius:12px;
      background:#fff7ed;
      color:#c2410c;
      padding:7px 10px;
      min-width:56px;
      font-size:18px;
      font-weight:950;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      box-shadow:0 8px 18px rgba(249,115,22,.13);
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
      background:rgba(255,255,255,.94);
      border-bottom:1px solid var(--zx-line);
      padding:7px 10px;
      z-index:6500;
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

    /* MÓVIL: navegación horizontal de una sola fila.
       Todos los módulos siguen accesibles sin ocupar media pantalla. */
    @media(max-width:639px){
      #zx_topbar{padding:6px 10px}
      #zx_logo{
        width:36px;
        height:36px;
        min-width:36px;
        border-radius:12px;
      }
      #zx_brand_txt h1{font-size:17px}
      #zx_brand_txt div{font-size:10px}
      #zx_user_btn{width:34px;height:34px;min-width:34px;font-size:12px}

      #zx_reloj{padding:4px 10px}
      #zx_reloj_inner{gap:7px}
      #zx_reloj_inner>div{
        min-width:0;
        display:flex;
        align-items:center;
        gap:7px;
        flex:1;
      }
      #zx_fecha{
        max-width:68%;
        overflow:hidden;
        text-overflow:ellipsis;
        font-size:10px;
      }
      #zx_hora{
        font-size:13px;
        line-height:1;
      }
      #zx_agenda_btn{
        min-width:48px;
        padding:5px 7px;
        border-radius:11px;
      }
      .zx_calendar_top_button{
        width:25px;
        height:25px;
      }

      #zx_nav{
        position:sticky;
        top:50px;
        padding:5px 8px;
        overflow:hidden;
        box-shadow:0 4px 12px rgba(15,23,42,.035);
      }
      #zx_nav_inner{
        display:flex;
        grid-template-columns:none;
        gap:5px;
        overflow-x:auto;
        overflow-y:hidden;
        scroll-snap-type:x proximity;
        overscroll-behavior-x:contain;
        scrollbar-width:none;
        padding:1px 1px 2px;
      }
      #zx_nav_inner::-webkit-scrollbar{display:none}
      .zx_nav_btn{
        flex:0 0 auto;
        width:auto;
        min-width:91px;
        min-height:42px;
        border-radius:10px;
        padding:5px 8px;
        font-size:10px;
        gap:6px;
        scroll-snap-align:start;
      }
      .zx_nav_icon{
        width:25px;
        height:25px;
        min-width:25px;
        border-radius:8px;
        font-size:16px;
      }
      .zx_calendar_nav{
        width:25px;
        height:25px;
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
            <button class="zx_user_menu_item" id="zx_menu_ajustes" type="button">⚙️ <span>Ajustes</span></button>
            <button class="zx_user_menu_item" id="zx_menu_cambiar" type="button">👥 <span>Cambiar usuario</span></button>
            <button class="zx_user_menu_item zx_danger" id="zx_menu_salir" type="button">↪️ <span>Cerrar sesión</span></button>
          </div>
        </div>
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

  const userBtn=$("zx_user_btn");
  const userMenu=$("zx_user_menu");

  function cerrarMenuUsuario(){
    if(!userMenu || !userBtn) return;
    userMenu.hidden=true;
    userBtn.setAttribute("aria-expanded","false");
  }

  function abrirModuloDesdeMenu(id){
    cerrarMenuUsuario();
    const btn=document.querySelector(`.zx_nav_btn[data-modulo="${id}"]`);
    if(btn){
      btn.click();
      return;
    }
    if(id==="ajustes" && window.ZX_ajustes) window.ZX_ajustes();
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

  document.addEventListener("click",cerrarMenuUsuario);

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
  const r=document.createElement("div");
  r.id="zx_reloj";
  r.innerHTML=`
    <div id="zx_reloj_inner">
      <div>
        <div id="zx_fecha">--/--/----</div>
        <div id="zx_hora">--:--</div>
      </div>
      <button id="zx_agenda_btn" type="button">${iconoCalendarioHTML("zx_calendar_top_button")}<span id="zx_agenda_count"></span></button>
    </div>
  `;

  document.body.insertBefore(r,app());

  $("zx_agenda_btn").onclick=function(){
    if(window.ZX_abrirAgendaHoy) window.ZX_abrirAgendaHoy();
  };

  actualizarReloj();
  ZX_RELOJ_TIMER=setInterval(actualizarReloj,30000);

  actualizarContadorAgenda();
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
          <button class="zx_nav_btn" data-modulo="${limpiar(m.id)}" type="button" title="${limpiar(m.texto)}" aria-label="${limpiar(m.texto)}">
            <span class="zx_nav_icon" style="background:${m.bg};color:${m.color};">${m.id==="agenda" ? iconoCalendarioHTML("zx_calendar_nav") : limpiar(m.icono)}</span>
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
