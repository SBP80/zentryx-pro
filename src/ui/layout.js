(function(){
"use strict";

window.ZENTRYX = window.ZENTRYX || {};
window.ZENTRYX.version = "2638";

let relojTimer = null;

function app(){
  return document.getElementById("app");
}

function usuario(){
  try{
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  }catch(e){
    return {};
  }
}

function fecha(){
  return new Date().toLocaleDateString("es-ES",{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });
}

function hora(){
  return new Date().toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });
}

function estilos(){

  const viejo=document.getElementById("zx_layout_styles");
  if(viejo) viejo.remove();

  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`

    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
    }

    html,
    body{
      margin:0;
      padding:0;
      overflow-x:hidden;
      background:#eef2f7;
      font-family:Arial,Helvetica,sans-serif;
      color:#111827;
    }

    body{
      padding-bottom:110px;
    }

    #app{
      width:100%;
      padding:14px;
      min-height:100vh;
    }

    #zx_header{
      background:#071330;
      color:white;
      padding:18px 16px 20px;
    }

    #zx_top{
      display:flex;
      flex-direction:column;
      gap:14px;
    }

    #zx_titulo{
      margin:0;
      font-size:24px;
      line-height:1.1;
      font-weight:900;
    }

    #zx_fecha{
      margin-top:8px;
      font-size:14px;
      color:#cbd5e1;
      line-height:1.3;
    }

    #zx_hora{
      margin-top:10px;
      font-size:28px;
      line-height:1;
      font-weight:900;
    }

    #zx_salir{
      width:100%;
      border:0;
      border-radius:16px;
      background:#dc2626;
      color:white;
      padding:14px;
      font-size:16px;
      font-weight:900;
    }

    #zx_usuario_barra{
      position:fixed;
      left:0;
      right:0;
      bottom:74px;
      z-index:9998;

      background:#071330;
      color:white;

      display:flex;
      align-items:center;
      gap:12px;

      padding:12px 14px;

      border-top:1px solid rgba(255,255,255,.08);
    }

    #zx_logo{
      width:48px;
      height:48px;
      border-radius:14px;

      background:linear-gradient(135deg,#2563eb,#10b981);

      display:flex;
      align-items:center;
      justify-content:center;

      font-size:24px;
      font-weight:900;

      flex-shrink:0;
    }

    #zx_nombre_app{
      font-size:16px;
      font-weight:900;
      line-height:1.1;
    }

    #zx_usuario_texto{
      margin-top:3px;
      color:#cbd5e1;
      font-size:13px;
      line-height:1.2;
    }

    #zx_nav{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:9999;

      display:flex;
      gap:10px;

      overflow-x:auto;

      padding:12px 14px;

      background:#071330;

      border-top:1px solid rgba(255,255,255,.08);
    }

    #zx_nav::-webkit-scrollbar{
      display:none;
    }

    .zx_btn_nav{
      flex:0 0 auto;

      border:1px solid rgba(255,255,255,.10);
      border-radius:14px;

      background:#374151;
      color:white;

      padding:12px 18px;

      font-size:14px;
      font-weight:800;

      white-space:nowrap;
    }

    .zx_card{
      width:100%;

      background:white;

      border-radius:24px;

      padding:20px;

      margin-bottom:16px;

      border:1px solid #d1d5db;

      box-shadow:0 8px 24px rgba(0,0,0,.05);
    }

    .zx_card h1{
      margin:0 0 16px;
      font-size:24px;
      line-height:1.1;
      font-weight:900;
      color:#0f172a;
    }

    @media(min-width:768px){

      #zx_header{
        padding:28px;
      }

      #zx_titulo{
        font-size:40px;
      }

      #zx_fecha{
        font-size:18px;
      }

      #zx_hora{
        font-size:46px;
      }

      #zx_salir{
        width:auto;
        padding:16px 28px;
        font-size:18px;
      }

      #zx_top{
        flex-direction:row;
        align-items:flex-start;
        justify-content:space-between;
      }

      #app{
        padding:24px;
        padding-bottom:140px;
      }

      .zx_card{
        padding:28px;
      }

      .zx_card h1{
        font-size:34px;
      }

      .zx_btn_nav{
        font-size:16px;
        padding:14px 20px;
      }

      #zx_usuario_barra{
        bottom:82px;
        padding:14px 22px;
      }

      #zx_logo{
        width:54px;
        height:54px;
        font-size:28px;
      }

      #zx_nombre_app{
        font-size:20px;
      }

      #zx_usuario_texto{
        font-size:15px;
      }
    }

  `;

  document.head.appendChild(css);
}

function header(){

  let h=document.getElementById("zx_header");

  if(!h){
    h=document.createElement("header");
    h.id="zx_header";
    document.body.prepend(h);
  }

  h.innerHTML=`
    <div id="zx_top">

      <div>
        <h1 id="zx_titulo">
          Zentryx V2638
        </h1>

        <div id="zx_fecha">
          ${fecha()}
        </div>

        <div id="zx_hora">
          ${hora()}
        </div>
      </div>

      <button id="zx_salir" type="button">
        Salir
      </button>

    </div>
  `;

  const salir=document.getElementById("zx_salir");

  salir.onclick=function(e){

    e.preventDefault();
    e.stopPropagation();

    localStorage.removeItem("usuario");
    localStorage.removeItem("zx_estado_jornada");
    localStorage.removeItem("zx_ultimo_fichaje");

    localStorage.removeItem("zentryx_vehiculo_fichaje_id");
    localStorage.removeItem("zentryx_vehiculo_fichaje_matricula");
    localStorage.removeItem("zentryx_vehiculo_fichaje_km");

    window.location.replace("./index.html?v=2638");
  };

  if(relojTimer){
    clearInterval(relojTimer);
  }

  relojTimer=setInterval(function(){

    const f=document.getElementById("zx_fecha");
    const r=document.getElementById("zx_hora");

    if(f) f.textContent=fecha();
    if(r) r.textContent=hora();

  },1000);
}

function barraUsuario(){

  let b=document.getElementById("zx_usuario_barra");

  if(!b){
    b=document.createElement("div");
    b.id="zx_usuario_barra";
    document.body.appendChild(b);
  }

  const u=usuario();

  b.innerHTML=`

    <div id="zx_logo">
      Z
    </div>

    <div>

      <div id="zx_nombre_app">
        Zentryx PRO
      </div>

      <div id="zx_usuario_texto">
        ${(u.usuario || "admin")} · ${(u.rol || "admin")}
      </div>

    </div>

  `;
}

function boton(texto,accion){

  return `
    <button
      class="zx_btn_nav"
      type="button"
      onclick="${accion}"
    >
      ${texto}
    </button>
  `;
}

function nav(){

  let n=document.getElementById("zx_nav");

  if(!n){
    n=document.createElement("div");
    n.id="zx_nav";
    document.body.appendChild(n);
  }

  n.innerHTML=`

    ${boton("Inicio","ZX_inicio()")}
    ${boton("Fichaje","ZX_fichaje()")}
    ${boton("Usuarios","ZX_usuarios()")}
    ${boton("Vehículos","ZX_vehiculos()")}
    ${boton("Incidencias","ZX_incidencias()")}
    ${boton("Informes","ZX_informes()")}

  `;
}

window.ZX_usuarios=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h1>Usuarios</h1>
      <p>Módulo usuarios pendiente.</p>
    </div>
  `;
};

window.ZX_incidencias=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h1>Incidencias</h1>
      <p>Módulo incidencias pendiente.</p>
    </div>
  `;
};

window.ZX_informes=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h1>Informes</h1>
      <p>Módulo informes pendiente.</p>
    </div>
  `;
};

window.ZX_vehiculos=function(){

  if(window.ZENTRYX_UI_abrirVehiculos){
    window.ZENTRYX_UI_abrirVehiculos();
    return;
  }

  if(window.ZX_VEHICULOS_ABRIR){
    window.ZX_VEHICULOS_ABRIR();
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h1>Vehículos</h1>
      <p>No cargado.</p>
    </div>
  `;
};

window.ZX_fichaje=function(){

  if(window.ZENTRYX_UI_fichaje){
    window.ZENTRYX_UI_fichaje();
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h1>Fichaje</h1>
      <p>No cargado.</p>
    </div>
  `;
};

function iniciar(){

  estilos();
  header();
  barraUsuario();
  nav();

  setTimeout(function(){

    if(window.ZX_inicio){
      window.ZX_inicio();
    }

  },100);
}

if(document.readyState==="loading"){

  document.addEventListener(
    "DOMContentLoaded",
    iniciar
  );

}else{

  iniciar();

}

})();