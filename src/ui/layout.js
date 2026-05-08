// ===============================
// ZENTRYX V2634 - LAYOUT LIMPIO
// Archivo: src/ui/layout.js
// ===============================

(function(){
"use strict";

window.ZENTRYX = window.ZENTRYX || {};
window.ZENTRYX.version = "2634";

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

  const viejo = document.getElementById("zx_layout_styles");

  if(viejo){
    viejo.remove();
  }

  const css = document.createElement("style");

  css.id = "zx_layout_styles";

  css.innerHTML = `

    *{
      box-sizing:border-box;
    }

    html,
    body{
      margin:0;
      padding:0;
      background:#eef2f7;
      color:#111827;
      font-family:Arial,Helvetica,sans-serif;
      overflow-x:hidden;
    }

    body{
      min-height:100vh;
    }

    #zx_layout{
      width:100%;
      min-height:100vh;
    }

    #zx_header{
      background:#0f172a;
      color:white;
      padding:24px 20px;
    }

    #zx_top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:18px;
    }

    #zx_titulo{
      margin:0;
      font-size:42px;
      line-height:1;
      font-weight:900;
    }

    #zx_fecha{
      margin-top:12px;
      color:#cbd5e1;
      font-size:20px;
      line-height:1.4;
    }

    #zx_hora{
      margin-top:14px;
      font-size:40px;
      font-weight:900;
    }

    #zx_salir{
      border:0;
      border-radius:20px;
      background:#dc2626;
      color:white;
      padding:18px 24px;
      font-size:24px;
      font-weight:900;
    }

    #zx_usuario_barra{
      background:#111827;
      color:white;
      display:flex;
      align-items:center;
      gap:16px;
      padding:18px 20px;
    }

    #zx_logo{
      width:58px;
      height:58px;
      border-radius:16px;
      background:linear-gradient(135deg,#2563eb,#16a34a);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:32px;
      font-weight:900;
      flex:0 0 auto;
    }

    #zx_nombre_app{
      font-size:22px;
      font-weight:900;
    }

    #zx_usuario_texto{
      margin-top:4px;
      color:#cbd5e1;
      font-size:17px;
    }
        #zx_nav{
      position:sticky;
      top:0;
      z-index:9999;
      background:#1f2937;
      display:flex;
      gap:12px;
      overflow-x:auto;
      padding:14px 20px;
      box-shadow:0 10px 24px rgba(0,0,0,.18);
    }

    #zx_nav::-webkit-scrollbar{
      display:none;
    }

    .zx_btn_nav{
      flex:0 0 auto;
      border:1px solid rgba(255,255,255,.35);
      background:#374151;
      color:white;
      border-radius:14px;
      padding:14px 18px;
      font-size:17px;
      font-weight:800;
      white-space:nowrap;
    }

    .zx_btn_nav:active{
      transform:scale(.98);
    }

    #app{
      width:100%;
      padding:18px;
      padding-bottom:40px;
    }

    .zx_card{
      background:white;
      border-radius:26px;
      padding:24px;
      margin-bottom:18px;
      border:1px solid #d1d5db;
      box-shadow:0 10px 30px rgba(0,0,0,.06);
      overflow:hidden;
    }

    .zx_card h1{
      margin:0 0 18px;
      font-size:34px;
      line-height:1.1;
      font-weight:900;
      color:#0f172a;
      word-break:break-word;
    }

    button{
      cursor:pointer;
    }

    @media (max-width:640px){

      #zx_top{
        flex-direction:column;
      }

      #zx_salir{
        width:100%;
      }

      #zx_titulo{
        font-size:34px;
      }

      #zx_hora{
        font-size:34px;
      }

      .zx_card{
        padding:20px;
      }

      .zx_card h1{
        font-size:30px;
      }

    }

  `;

  document.head.appendChild(css);

}

function header(){

  let h = document.getElementById("zx_header");

  if(!h){

    h = document.createElement("header");

    h.id = "zx_header";

    document.body.prepend(h);

  }

  h.innerHTML = `
    <div id="zx_top">

      <div>

        <h1 id="zx_titulo">
          Zentryx V2634
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
    const salir = document.getElementById("zx_salir");

  if(salir){

    salir.onclick = function(e){

      e.preventDefault();

      e.stopPropagation();

      localStorage.removeItem("usuario");
      localStorage.removeItem("zx_estado_jornada");
      localStorage.removeItem("zx_ultimo_fichaje");

      localStorage.removeItem("zentryx_vehiculo_fichaje_id");
      localStorage.removeItem("zentryx_vehiculo_fichaje_matricula");
      localStorage.removeItem("zentryx_vehiculo_fichaje_km");

      window.location.href = "index.html?v=2634";

    };

  }

  if(relojTimer){
    clearInterval(relojTimer);
  }

  relojTimer = setInterval(function(){

    const f = document.getElementById("zx_fecha");
    const r = document.getElementById("zx_hora");

    if(f){
      f.textContent = fecha();
    }

    if(r){
      r.textContent = hora();
    }

  },1000);

}

function barraUsuario(){

  let barra = document.getElementById("zx_usuario_barra");

  if(!barra){

    barra = document.createElement("div");

    barra.id = "zx_usuario_barra";

    document.body.appendChild(barra);

  }

  const u = usuario();

  barra.innerHTML = `
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
      type="button"
      onclick="${accion}"
    >
      ${texto}
    </button>
  `;

}
function nav(){

  let nav = document.getElementById("zx_nav");

  if(!nav){

    nav = document.createElement("div");

    nav.id = "zx_nav";

    document.body.appendChild(nav);

  }

  nav.innerHTML = `

    ${boton("Inicio","ZX_inicio()")}

    ${boton("Fichaje","ZX_fichaje()")}

    ${boton("Usuarios","ZX_usuarios()")}

    ${boton("Vehículos","ZX_vehiculos()")}

    ${boton("Incidencias","ZX_incidencias()")}

    ${boton("Informes","ZX_informes()")}

    ${boton("Configuración","ZX_configuracion()")}

  `;

}

window.ZX_incidencias = function(){

  app().innerHTML = `
    <div class="zx_card">

      <h1>
        Incidencias
      </h1>

      <p>
        Módulo incidencias pendiente.
      </p>

    </div>
  `;

};

window.ZX_informes = function(){

  app().innerHTML = `
    <div class="zx_card">

      <h1>
        Informes
      </h1>

      <p>
        Módulo informes pendiente.
      </p>

    </div>
  `;

};

window.ZX_configuracion = function(){

  app().innerHTML = `
    <div class="zx_card">

      <h1>
        Configuración
      </h1>

      <p>
        Módulo configuración pendiente.
      </p>

    </div>
  `;

};
window.ZX_vehiculos = function(){

  if(window.ZENTRYX_UI_abrirVehiculos){

    window.ZENTRYX_UI_abrirVehiculos();

    return;

  }

  if(window.ZX_VEHICULOS_ABRIR){

    window.ZX_VEHICULOS_ABRIR();

    return;

  }

  app().innerHTML = `
    <div class="zx_card">

      <h1>
        Vehículos
      </h1>

      <p>
        No cargado.
      </p>

    </div>
  `;

};

window.ZX_fichaje = function(){

  if(window.ZENTRYX_UI_fichaje){

    window.ZENTRYX_UI_fichaje();

    return;

  }

  app().innerHTML = `
    <div class="zx_card">

      <h1>
        Fichaje
      </h1>

      <p>
        No cargado.
      </p>

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

if(document.readyState === "loading"){

  document.addEventListener(
    "DOMContentLoaded",
    iniciar
  );

}else{

  iniciar();

}

})();
