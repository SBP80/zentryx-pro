// ===============================
// ZENTRYX PRO - UI LAYOUT
// V2651 (estable profesional)
// ===============================
(function(){
"use strict";

const ZX_VERSION="2651";

function $(id){return document.getElementById(id)}
function app(){return $("app")}

function limpiarTexto(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function usuario(){
  try{
    const u=JSON.parse(localStorage.getItem("zentryx_session")||"{}");
    return {
      usuario:u.usuario || "admin",
      rol:u.rol || "Administrador"
    };
  }catch{
    return {usuario:"admin",rol:"Administrador"};
  }
}

function estilos(){
  const viejo=$("zx_layout_styles");
  if(viejo) viejo.remove();

  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`

  *{
    box-sizing:border-box;
    -webkit-tap-highlight-color:transparent;
  }

  html,body{
    margin:0;
    padding:0;
    background:#eef2f7;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
    overflow-x:hidden;
  }

  body{
    padding-bottom:40px;
  }

  /* HEADER */
  #zx_topbar{
    background:#071330;
    color:white;
    padding:calc(env(safe-area-inset-top) + 12px) 14px 14px;
  }

  #zx_topbar_inner{
    max-width:1200px;
    margin:0 auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
  }

  #zx_brand{
    display:flex;
    align-items:center;
    gap:10px;
  }

  #zx_logo{
    width:48px;
    height:48px;
    border-radius:14px;
    background:linear-gradient(135deg,#2563eb,#10b981);
    display:flex;
    align-items:center;
    justify-content:center;
    color:white;
    font-size:26px;
    font-weight:900;
  }

  #zx_brand h1{
    margin:0;
    font-size:20px;
    font-weight:900;
  }

  #zx_brand p{
    margin:2px 0 0;
    font-size:13px;
    color:#cbd5e1;
  }

  #zx_salir{
    border:0;
    border-radius:14px;
    background:#dc2626;
    color:white;
    padding:12px 16px;
    font-weight:900;
  }

  /* NAV */
  #zx_nav{
    background:#071330;
    padding:10px;
  }

  #zx_nav_inner{
    max-width:1200px;
    margin:0 auto;
    display:flex;
    gap:8px;
    overflow-x:auto;
  }

  .zx_nav_btn{
    border:0;
    border-radius:14px;
    background:#334155;
    color:white;
    padding:12px 14px;
    font-weight:800;
    min-width:100px;
  }

  .zx_activo{
    background:#2563eb;
  }

  /* APP */
  #app{
    max-width:1200px;
    margin:0 auto;
    padding:16px;
  }

  .zx_card{
    background:white;
    border-radius:22px;
    padding:22px;
    margin-bottom:18px;
    border:1px solid #d1d5db;
  }

  .zx_card h2{
    margin:0 0 14px;
    font-size:28px;
    font-weight:900;
  }

  .zx_text{
    color:#6b7280;
    font-size:16px;
    line-height:1.5;
  }

  .zx_btn{
    width:100%;
    border:0;
    border-radius:18px;
    padding:18px;
    margin-top:12px;
    font-size:18px;
    font-weight:900;
    color:white;
  }

  .zx_rojo{background:#dc2626}
  .zx_azul{background:#2563eb}
  .zx_verde{background:#16a34a}
  .zx_naranja{background:#ea580c}
  .zx_morado{background:#7c3aed}

  @media(min-width:768px){
    #app{padding:24px}
    .zx_card h2{font-size:32px}
  }

  `;

  document.head.appendChild(css);
}

function topbar(){
  let t=$("zx_topbar");
  if(!t){
    t=document.createElement("div");
    t.id="zx_topbar";
    document.body.prepend(t);
  }

  const u=usuario();

  t.innerHTML=`
    <div id="zx_topbar_inner">
      <div id="zx_brand">
        <div id="zx_logo">Z</div>
        <div>
          <h1>Zentryx PRO</h1>
          <p>${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</p>
        </div>
      </div>
      <button id="zx_salir">Salir</button>
    </div>
  `;

  $("zx_salir").onclick=logout;
}

function nav(){
  let n=$("zx_nav");
  if(!n){
    n=document.createElement("div");
    n.id="zx_nav";
    document.body.insertBefore(n,app());
  }

  n.innerHTML=`
    <div id="zx_nav_inner">
      <button class="zx_nav_btn" onclick="ZX_inicio()">Inicio</button>
      <button class="zx_nav_btn" onclick="ZX_fichaje()">Fichaje</button>
      <button class="zx_nav_btn" onclick="ZX_usuarios()">Usuarios</button>
      <button class="zx_nav_btn" onclick="ZX_vehiculos()">Vehículos</button>
      <button class="zx_nav_btn" onclick="ZX_incidencias()">Incidencias</button>
      <button class="zx_nav_btn" onclick="ZX_informes()">Informes</button>
    </div>
  `;
}

window.logout=function(){
  localStorage.clear();
  location.href="index.html?v="+ZX_VERSION;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

window.ZX_fichaje=function(){
  if(window.ZENTRYX_UI_fichaje){
    window.ZENTRYX_UI_fichaje();
  }
};

window.ZX_usuarios=function(){
  if(window.ZENTRYX_UI_usuarios){
    window.ZENTRYX_UI_usuarios();
  }else{
    app().innerHTML=`<div class="zx_card"><h2>Usuarios</h2><div class="zx_text">Pendiente</div></div>`;
  }
};

window.ZX_vehiculos=function(){
  if(window.ZENTRYX_UI_abrirVehiculos){
    window.ZENTRYX_UI_abrirVehiculos();
  }
};

window.ZX_incidencias=function(){
  app().innerHTML=`<div class="zx_card"><h2>Incidencias</h2></div>`;
};

window.ZX_informes=function(){
  app().innerHTML=`<div class="zx_card"><h2>Informes</h2></div>`;
};

function iniciar(){
  estilos();
  topbar();
  nav();

  setTimeout(()=>{
    ZX_inicio();
  },50);
}

window.ZENTRYX_UI_LAYOUT={
  iniciar
};

document.readyState==="loading"
  ? document.addEventListener("DOMContentLoaded",iniciar)
  : iniciar();

})();