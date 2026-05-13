(function(){
"use strict";

const ZX_VERSION="2652";

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
  const css=document.createElement("style");

  css.innerHTML=`
    body{margin:0}

    #zx_top{
      background:#071330;
      color:white;
      padding:14px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    #zx_nav{
      background:#071330;
      padding:10px;
      display:flex;
      gap:8px;
      overflow-x:auto;
    }

    .btn{
      background:#334155;
      color:white;
      border:0;
      padding:10px;
      border-radius:12px;
      font-weight:700;
    }

    #app{
      padding:16px;
      max-width:1000px;
      margin:auto;
    }

    .card{
      background:white;
      padding:20px;
      border-radius:16px;
      margin-bottom:16px;
    }
  `;

  document.head.appendChild(css);
}

function pintar(){

  const u=usuario();

  document.body.insertAdjacentHTML("afterbegin",`
    <div id="zx_top">
      <div>Zentryx · ${u.usuario || "admin"}</div>
      <button onclick="logout()">Salir</button>
    </div>

    <div id="zx_nav">
      <button class="btn" onclick="ZX_inicio()">Inicio</button>
      <button class="btn" onclick="ZX_fichaje()">Fichaje</button>
      <button class="btn" onclick="ZX_usuarios()">Usuarios</button>
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
    pintar();
  }
};

})();