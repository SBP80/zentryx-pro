// ===============================
// ZENTRYX PRO - UI LAYOUT PRO
// V2653
// ===============================
(function(){
"use strict";

const ZX_VERSION="2653";

function $(id){return document.getElementById(id)}
function app(){return $("app")}

function usuario(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session")||"{}");
  }catch{
    return {};
  }
}

function estilos(){
  const viejo=$("zx_css");
  if(viejo) viejo.remove();

  const css=document.createElement("style");
  css.id="zx_css";

  css.innerHTML=`

  *{box-sizing:border-box}

  body{
    margin:0;
    background:#eef2f7;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial;
  }

  /* HEADER */
  #zx_header{
    background:#071330;
    color:white;
    padding:16px;
  }

  #zx_header_inner{
    max-width:1100px;
    margin:auto;
    display:flex;
    justify-content:space-between;
    align-items:center;
  }

  #zx_user{
    font-weight:700;
    font-size:18px;
  }

  #zx_salir{
    background:#dc2626;
    border:0;
    color:white;
    padding:10px 14px;
    border-radius:10px;
    font-weight:800;
  }

  /* NAV */
  #zx_nav{
    background:#071330;
    padding:10px;
  }

  #zx_nav_inner{
    max-width:1100px;
    margin:auto;
    display:flex;
    gap:10px;
  }

  .zx_btn_nav{
    flex:1;
    background:#334155;
    border:0;
    color:white;
    padding:14px;
    border-radius:14px;
    font-weight:800;
    font-size:16px;
  }

  /* CONTENIDO */
  #app{
    max-width:1100px;
    margin:auto;
    padding:18px;
  }

  .zx_card{
    background:white;
    border-radius:18px;
    padding:22px;
    margin-bottom:18px;
    box-shadow:0 6px 18px rgba(0,0,0,.05);
  }

  .zx_card h2{
    margin:0 0 10px;
    font-size:26px;
  }

  .zx_text{
    color:#6b7280;
    font-size:16px;
  }

  /* BOTONES GRANDES */
  .zx_btn_big{
    width:100%;
    border:0;
    padding:18px;
    margin-top:12px;
    border-radius:16px;
    font-size:18px;
    font-weight:900;
    color:white;
  }

  .rojo{background:#dc2626}
  .azul{background:#2563eb}
  .verde{background:#16a34a}

  `;

  document.head.appendChild(css);
}

function header(){
  const u=usuario();

  document.body.insertAdjacentHTML("afterbegin",`
    <div id="zx_header">
      <div id="zx_header_inner">
        <div id="zx_user">Zentryx · ${u.usuario || "admin"}</div>
        <button id="zx_salir">Salir</button>
      </div>
    </div>
  `);

  $("zx_salir").onclick=logout;
}

function nav(){
  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_nav">
      <div id="zx_nav_inner">
        <button class="zx_btn_nav" onclick="ZX_inicio()">Inicio</button>
        <button class="zx_btn_nav" onclick="ZX_fichaje()">Fichaje</button>
        <button class="zx_btn_nav" onclick="ZX_usuarios()">Usuarios</button>
      </div>
    </div>
  `);
}

window.logout=function(){
  localStorage.removeItem("zentryx_session");
  location.href="index.html?v="+ZX_VERSION;
};

window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    estilos();
    header();
    nav();
  }
};

})();