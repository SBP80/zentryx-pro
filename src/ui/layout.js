// ===============================
// ZENTRYX PRO - LAYOUT
// V3069
// ===============================
(function(){
"use strict";

const ZX_VERSION="3069";

function $(id){return document.getElementById(id)}
function app(){return $("app")}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function usuarioActual(){
  const s=sesion();
  return {
    usuario:s.usuario || "admin",
    rol:s.rol || "Administrador"
  };
}

function rolActual(){
  return String(usuarioActual().rol || "").toLowerCase();
}

function usuarioNombre(){
  return String(usuarioActual().usuario || "").toLowerCase();
}

function esAdmin(){
  return rolActual()==="administrador" || usuarioNombre()==="admin";
}

function puedeVerModulo(modulo){
  if(esAdmin()) return true;
  return ["inicio","fichaje"].includes(modulo);
}

function limpiarTexto(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function limpiarLayoutAnterior(){
  ["zx_header","zx_footer","zx_top","zx_nav","zx_topbar","zx_layout_styles","zx_css"].forEach(id=>{
    const el=$(id);
    if(el) el.remove();
  });
}

function estilos(){
  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

    html,body{
      margin:0;
      padding:0;
      background:#eef2f7;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      color:#0f172a;
      overflow-x:hidden;
    }

    body{
      min-height:100vh;
      padding-bottom:calc(env(safe-area-inset-bottom) + 40px);
    }

    #zx_topbar{
      background:#071330;
      color:white;
      padding:18px 16px;
    }

    #zx_topbar_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }

    #zx_logo{
      width:54px;
      height:54px;
      border-radius:16px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:30px;
      font-weight:900;
      flex:none;
    }

    #zx_brand h1{
      margin:0;
      font-size:24px;
      line-height:1.1;
      font-weight:900;
      white-space:nowrap;
    }

    #zx_brand p{
      margin:4px 0 0;
      color:#cbd5e1;
      font-size:14px;
      font-weight:700;
      white-space:nowrap;
    }

    #zx_salir{
      border:0;
      border-radius:16px;
      background:#dc2626;
      color:white;
      padding:14px 18px;
      font-size:17px;
      font-weight:900;
      flex:none;
    }

    #zx_nav{
      background:#071330;
      padding:0 16px 16px;
      border-bottom:1px solid rgba(255,255,255,.08);
    }

    #zx_nav_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      gap:10px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    #zx_nav_inner::-webkit-scrollbar{display:none}

    .zx_nav_btn{
      flex:0 0 auto;
      min-width:118px;
      border:0;
      border-radius:18px;
      background:#334155;
      color:white;
      padding:16px 18px;
      font-size:17px;
      font-weight:900;
      white-space:nowrap;
    }

    .zx_nav_btn.zx_activo{background:#2563eb}

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:18px 16px;
    }

    .zx_card{
      background:white;
      border-radius:24px;
      padding:24px;
      margin-bottom:18px;
      border:1px solid #d1d5db;
      box-shadow:0 8px 22px rgba(15,23,42,.06);
    }

    .zx_card h2{
      margin:0 0 14px;
      font-size:32px;
      line-height:1.1;
      font-weight:900;
      color:#0f172a;
    }

    .zx_text{
      color:#6b7280;
      font-size:17px;
      line-height:1.5;
      font-weight:650;
    }

    .zx_btn_big,
    .zx_btn{
      width:100%;
      border:0;
      border-radius:20px;
      padding:19px;
      margin-top:14px;
      font-size:20px;
      font-weight:900;
      color:white;
      display:block;
      text-align:center;
    }

    .zx_rojo{background:#dc2626}
    .zx_azul{background:#2563eb}
    .zx_verde{background:#16a34a}
    .zx_naranja{background:#ea580c}
    .zx_morado{background:#7c3aed}
    .zx_gris{background:#64748b}

    input,select,textarea{
      width:100%;
      border:1px solid #d1d5db;
      border-radius:16px;
      padding:15px;
      margin-top:10px;
      font-size:17px;
      background:white;
      color:#0f172a;
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
        <div>
          <h1>Zentryx PRO</h1>
          <p>${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</p>
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

function botonNav(modulo,texto,accion){
  if(!puedeVerModulo(modulo)) return "";

  return `
    <button class="zx_nav_btn" data-modulo="${modulo}" type="button" onclick="${accion}">
      ${texto}
    </button>
  `;
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    <div id="zx_nav_inner">
      ${botonNav("inicio","Inicio","ZX_inicio()")}
      ${botonNav("fichaje","Fichaje","ZX_abrirFichaje()")}
      ${botonNav("usuarios","Usuarios","ZX_usuarios()")}
      ${botonNav("vehiculos","Vehículos","ZX_vehiculos()")}
      ${botonNav("incidencias","Incidencias","ZX_incidencias()")}
      ${botonNav("informes","Informes","ZX_informes()")}
      ${botonNav("configuracion","Configuración","ZX_configuracion()")}
    </div>
  `;

  document.body.insertBefore(n,app());
}

function activo(nombre){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo===nombre){
      b.classList.add("zx_activo");
    }
  });
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

  if(callback){
    callback();
  }
}

window.ZX_inicio=function(){
  abrirModulo("inicio",function(){
    if(window.ZENTRYX_UI_inicio){
      window.ZENTRYX_UI_inicio();
    }
  });
};

window.ZX_abrirFichaje=function(){
  abrirModulo("fichaje",function(){
    if(window.ZX_fichaje_real){
      window.ZX_fichaje_real();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Fichaje</h2>
        <div class="zx_text">El archivo fichaje.js no ha cargado correctamente.</div>
      </div>
    `;
  });
};

window.ZX_usuarios=function(){
  abrirModulo("usuarios",function(){
    if(window.ZENTRYX_UI_usuarios){
      window.ZENTRYX_UI_usuarios();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Usuarios</h2>
        <div class="zx_text">Módulo usuarios pendiente.</div>
      </div>
    `;
  });
};

window.ZX_vehiculos=function(){
  abrirModulo("vehiculos",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Vehículos</h2>
        <div class="zx_text">Módulo vehículos pendiente.</div>
      </div>
    `;
  });
};

window.ZX_incidencias=function(){
  abrirModulo("incidencias",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Incidencias</h2>
        <div class="zx_text">Módulo incidencias pendiente.</div>
      </div>
    `;
  });
};

window.ZX_informes=function(){
  abrirModulo("informes",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Informes</h2>
        <div class="zx_text">Módulo informes pendiente.</div>
      </div>
    `;
  });
};

window.ZX_configuracion=function(){
  abrirModulo("configuracion",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Configuración</h2>
        <div class="zx_text">Módulo configuración pendiente.</div>
      </div>
    `;
  });
};

window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    limpiarLayoutAnterior();
    estilos();
    topbar();
    nav();
  }
};

})();