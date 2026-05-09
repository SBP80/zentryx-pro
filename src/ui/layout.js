(function(){
"use strict";

window.ZENTRYX = window.ZENTRYX || {};
window.ZENTRYX.version = "2637";

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

  if(viejo){
    viejo.remove();
  }

  const css=document.createElement("style");

  css.id="zx_layout_styles";

  css.innerHTML=`

    *{
      box-sizing:border-box;
    }

    html,
    body{
      margin:0;
      padding:0;
      width:100%;
      max-width:100%;
      overflow-x:hidden;
      background:#eef2f7;
      font-family:Arial,Helvetica,sans-serif;
      color:#111827;
    }

    body{
      padding-bottom:240px;
    }

    #zx_header{
      background:#0f172a;
      color:white;
      padding:
        calc(env(safe-area-inset-top) + 22px)
        20px
        22px;
    }

    #zx_top{
      display:flex;
      flex-direction:column;
      gap:20px;
    }

    #zx_titulo{
      margin:0;
      font-size:62px;
      font-weight:900;
      line-height:1;
      word-break:break-word;
    }

    #zx_fecha{
      margin-top:18px;
      color:#cbd5e1;
      font-size:28px;
      line-height:1.3;
    }

    #zx_hora{
      margin-top:18px;
      font-size:64px;
      font-weight:900;
      line-height:1;
    }

    #zx_salir{
      width:100%;
      border:0;
      border-radius:28px;
      background:#dc2626;
      color:white;
      padding:26px;
      font-size:34px;
      font-weight:900;
    }

    #app{
      width:100%;
      max-width:100%;
      padding:18px;
      overflow-x:hidden;
    }

    .zx_card{
      width:100%;
      background:white;
      border-radius:34px;
      padding:34px;
      margin-bottom:22px;
      border:1px solid #d1d5db;
      box-shadow:0 10px 30px rgba(0,0,0,.05);
      overflow:hidden;
    }

    .zx_card h1{
      margin:0 0 24px;
      font-size:76px;
      line-height:1;
      font-weight:900;
      word-break:break-word;
      color:#0f172a;
    }

    #zx_nav{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:99999;

      background:#0f172a;

      padding:
        18px
        18px
        calc(env(safe-area-inset-bottom) + 24px);

      border-top:1px solid rgba(255,255,255,.08);

      overflow-x:auto;
      overflow-y:hidden;

      white-space:nowrap;

      display:flex;
      gap:16px;

      -webkit-overflow-scrolling:touch;

      box-shadow:0 -10px 30px rgba(0,0,0,.25);
    }

    #zx_nav::-webkit-scrollbar{
      display:none;
    }

    .zx_btn_nav{
      flex:0 0 auto;

      min-width:190px;

      border-radius:24px;

      border:2px solid rgba(255,255,255,.18);

      background:#374151;
      color:white;

      padding:24px 22px;

      font-size:26px;
      font-weight:900;

      white-space:nowrap;
    }

    #zx_usuario_barra{
      position:fixed;

      left:0;
      right:0;

      bottom:132px;

      z-index:99998;

      display:flex;
      align-items:center;
      gap:18px;

      padding:22px 20px;

      background:#111827;

      border-top:1px solid rgba(255,255,255,.08);

      box-shadow:0 -8px 24px rgba(0,0,0,.25);
    }

    #zx_logo{
      width:90px;
      height:90px;
      border-radius:24px;

      background:linear-gradient(
        135deg,
        #2563eb,
        #10b981
      );

      display:flex;
      align-items:center;
      justify-content:center;

      color:white;
      font-size:52px;
      font-weight:900;

      flex:none;
    }

    #zx_nombre_app{
      color:white;
      font-size:30px;
      font-weight:900;
      line-height:1.1;
    }

    #zx_usuario_texto{
      margin-top:8px;
      color:#d1d5db;
      font-size:22px;
    }

    @media (max-width:700px){

      #zx_titulo{
        font-size:42px;
      }

      #zx_fecha{
        font-size:20px;
      }

      #zx_hora{
        font-size:48px;
      }

      #zx_salir{
        font-size:28px;
        padding:22px;
      }

      .zx_card{
        padding:24px;
        border-radius:26px;
      }

      .zx_card h1{
        font-size:42px;
      }

      .zx_btn_nav{
        min-width:170px;
        font-size:22px;
        padding:20px 18px;
      }

      #zx_logo{
        width:70px;
        height:70px;
        font-size:38px;
      }

      #zx_nombre_app{
        font-size:22px;
      }

      #zx_usuario_texto{
        font-size:16px;
      }

      #zx_usuario_barra{
        bottom:118px;
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
          Zentryx V2637
        </h1>

        <div id="zx_fecha">
          ${fecha()}
        </div>

        <div id="zx_hora">
          ${hora()}
        </div>

      </div>

      <button id="zx_salir">
        Salir
      </button>

    </div>
  `;

  document.getElementById("zx_salir").onclick=function(){

    localStorage.removeItem("usuario");

    window.location.replace(
      "./index.html?v=2637"
    );
  };

  if(relojTimer){
    clearInterval(relojTimer);
  }

  relojTimer=setInterval(function(){

    const f=document.getElementById("zx_fecha");
    const r=document.getElementById("zx_hora");

    if(f){
      f.textContent=fecha();
    }

    if(r){
      r.textContent=hora();
    }

  },1000);
}

function barraUsuario(){

  let barra=document.getElementById("zx_usuario_barra");

  if(!barra){

    barra=document.createElement("div");
    barra.id="zx_usuario_barra";

    document.body.appendChild(barra);
  }

  const u=usuario();

  barra.innerHTML=`

    <div id="zx_logo">
      Z
    </div>

    <div>

      <div id="zx_nombre_app">
        Zentryx PRO
      </div>

      <div id="zx_usuario_texto">
        ${u.usuario || "admin"} · ${u.rol || "admin"}
      </div>

    </div>

  `;
}

function boton(texto,accion){

  return `
    <button
      class="zx_btn_nav"
      onclick="${accion}"
    >
      ${texto}
    </button>
  `;
}

function nav(){

  let nav=document.getElementById("zx_nav");

  if(!nav){

    nav=document.createElement("div");
    nav.id="zx_nav";

    document.body.appendChild(nav);
  }

  nav.innerHTML=`
    ${boton("Inicio","ZX_inicio()")}
    ${boton("Fichaje","ZX_fichaje()")}
    ${boton("Usuarios","ZX_usuarios()")}
    ${boton("Vehículos","ZX_vehiculos()")}
    ${boton("Incidencias","ZX_incidencias()")}
    ${boton("Informes","ZX_informes()")}
    ${boton("Configuración","ZX_configuracion()")}
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

window.ZX_configuracion=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h1>Configuración</h1>
      <p>Módulo configuración pendiente.</p>
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

  nav();

  barraUsuario();

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