// ===============================
// ZENTRYX V2627 - UI LAYOUT CENTRAL
// Archivo: src/ui/layout.js
// ===============================

(function(){
"use strict";

window.ZENTRYX = window.ZENTRYX || {};
window.ZENTRYX.version = "2627";

let relojTimer = null;

function usuarioActual(){
  try{
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  }catch(e){
    return {};
  }
}

function app(){
  return document.getElementById("app");
}

function formatoFecha(){
  return new Date().toLocaleDateString("es-ES",{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });
}

function formatoHora(){
  return new Date().toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });
}

function crearEstilos(){

  const viejo = document.getElementById("zx_layout_styles");
  if(viejo) viejo.remove();

  const css = document.createElement("style");
  css.id = "zx_layout_styles";

  css.innerHTML = `

  body{
    margin:0;
    background:#eef2f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
    overflow-x:hidden;
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
    font-size:38px;
    font-weight:900;
    margin:0;
    line-height:1;
  }

  #zx_fecha{
    margin-top:12px;
    font-size:20px;
    color:#cbd5e1;
    line-height:1.25;
  }

  #zx_hora{
    margin-top:14px;
    font-size:34px;
    font-weight:900;
  }

  #zx_salir{
    background:#dc2626;
    color:white;
    border:0;
    border-radius:18px;
    padding:18px 24px;
    font-size:22px;
    font-weight:900;
  }

  #zx_usuario_barra{
    background:#111827;
    color:white;
    padding:18px 20px;
    display:flex;
    align-items:center;
    gap:16px;
  }

  #zx_logo{
    width:54px;
    height:54px;
    border-radius:14px;
    background:linear-gradient(135deg,#2563eb,#16a34a);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:30px;
    font-weight:900;
    flex:0 0 auto;
  }

  #zx_nombre_app{
    font-size:20px;
    font-weight:900;
  }

  #zx_usuario_texto{
    color:#cbd5e1;
    margin-top:4px;
    font-size:16px;
  }

  #zx_nav{
    background:#1f2937;
    padding:12px 20px 18px;
    display:flex;
    gap:12px;
    overflow-x:auto;
  }

  .zx_btn_nav{
    flex:0 0 auto;
    background:#374151;
    color:white;
    border:1px solid rgba(255,255,255,.6);
    padding:14px 18px;
    font-size:17px;
    font-weight:800;
    border-radius:0;
  }

  #app{
    padding:18px;
    min-height:60vh;
  }

  .zx_card{
    background:white;
    border-radius:24px;
    padding:24px;
    margin-bottom:18px;
    border:1px solid #d1d5db;
    box-shadow:0 10px 30px rgba(0,0,0,.06);
  }

  .zx_card h1{
    margin:0 0 16px;
    font-size:34px;
    font-weight:900;
    line-height:1.05;
  }

  .zx_estado{
    display:flex;
    gap:12px;
    flex-wrap:wrap;
    margin-top:20px;
  }

  .zx_badge_rojo{
    background:#fee2e2;
    color:#991b1b;
    border-radius:999px;
    padding:10px 14px;
    font-weight:900;
  }

  .zx_badge_gris{
    background:#e5e7eb;
    color:#111827;
    border-radius:999px;
    padding:10px 14px;
    font-weight:900;
  }

  .zx_grid_botones{
    display:grid;
    grid-template-columns:1fr;
    gap:14px;
  }

  .zx_boton_modulo{
    width:100%;
    border:0;
    border-radius:18px;
    background:#e5e7eb;
    color:#111827;
    padding:18px;
    font-size:21px;
    font-weight:900;
  }

  .zx_boton_modulo.azul{
    background:#2563eb;
    color:white;
  }

  `;

  document.head.appendChild(css);
}

function pintarHeader(){

  let header = document.getElementById("zx_header");

  if(!header){
    header = document.createElement("header");
    header.id = "zx_header";
    document.body.prepend(header);
  }

  header.innerHTML = `
    <div id="zx_top">
      <div>
        <h1 id="zx_titulo">Zentryx V2627</h1>
        <div id="zx_fecha">${formatoFecha()}</div>
        <div id="zx_hora">${formatoHora()}</div>
      </div>

      <button id="zx_salir">Salir</button>
    </div>
  `;

  document.getElementById("zx_salir").onclick = function(){
    localStorage.removeItem("usuario");
    location.href = "index.html";
  };

  if(relojTimer){
    clearInterval(relojTimer);
  }

  relojTimer = setInterval(function(){
    const hora = document.getElementById("zx_hora");
    const fecha = document.getElementById("zx_fecha");

    if(hora) hora.innerHTML = formatoHora();
    if(fecha) fecha.innerHTML = formatoFecha();
  },1000);
}

function pintarUsuario(){

  let barra = document.getElementById("zx_usuario_barra");

  if(!barra){
    barra = document.createElement("div");
    barra.id = "zx_usuario_barra";
    document.body.appendChild(barra);
  }

  const u = usuarioActual();

  barra.innerHTML = `
    <div id="zx_logo">Z</div>

    <div>
      <div id="zx_nombre_app">Zentryx PRO</div>
      <div id="zx_usuario_texto">
        ${(u.usuario || "admin")} · ${(u.rol || "Administrador")}
      </div>
    </div>
  `;
}

function boton(txt,accion){
  return `
    <button class="zx_btn_nav" onclick="${accion}">
      ${txt}
    </button>
  `;
}

function pintarNav(){

  let nav = document.getElementById("zx_nav");

  if(!nav){
    nav = document.createElement("div");
    nav.id = "zx_nav";
    document.body.appendChild(nav);
  }

  nav.innerHTML = `
    ${boton("Inicio","ZX_inicio()")}
    ${boton("Usuarios","ZX_usuarios()")}
    ${boton("Incidencias","ZX_incidencias()")}
    ${boton("Informes","ZX_informes()")}
    ${boton("Vehículos","ZX_vehiculos()")}
  `;
}

function pantallaInicio(){

  const cont = app();
  if(!cont) return;

  const u = usuarioActual();

  cont.innerHTML = `
    <div class="zx_card">
      <h1>Panel principal</h1>

      <h2>${(u.usuario || "Administrador")}</h2>

      <div style="color:#6b7280;font-size:18px;margin-top:8px;">
        ${(u.rol || "admin")}
      </div>

      <div class="zx_estado">
        <div class="zx_badge_rojo">Fuera</div>
        <div class="zx_badge_gris">Estado interno: fuera</div>
      </div>
    </div>

    <div class="zx_card">
      <h1>Inicio</h1>

      <div style="font-size:18px;color:#6b7280;line-height:1.5;">
        Sistema modular activo.
      </div>
    </div>

    <div class="zx_card">
      <h1>Módulos rápidos</h1>

      <div class="zx_grid_botones">
        <button class="zx_boton_modulo azul" onclick="ZX_vehiculos()">Vehículos</button>
        <button class="zx_boton_modulo" onclick="ZX_usuarios()">Usuarios</button>
        <button class="zx_boton_modulo" onclick="ZX_incidencias()">Incidencias</button>
        <button class="zx_boton_modulo" onclick="ZX_informes()">Informes</button>
      </div>
    </div>
  `;
}

window.ZX_inicio = function(){
  pantallaInicio();
};

window.ZX_usuarios = function(){

  const cont = app();

  cont.innerHTML = `
    <div class="zx_card">
      <h1>Usuarios</h1>
      <div style="font-size:18px;color:#6b7280;">
        Módulo preparado para continuar.
      </div>
    </div>
  `;
};

window.ZX_incidencias = function(){

  const cont = app();

  cont.innerHTML = `
    <div class="zx_card">
      <h1>Incidencias</h1>
      <div style="font-size:18px;color:#6b7280;">
        Módulo preparado para continuar.
      </div>
    </div>
  `;
};

window.ZX_informes = function(){

  const cont = app();

  cont.innerHTML = `
    <div class="zx_card">
      <h1>Informes</h1>
      <div style="font-size:18px;color:#6b7280;">
        Módulo preparado para continuar.
      </div>
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

  alert("vehiculos.js no cargado");
};

window.ZENTRYX_UI_inicio = window.ZX_inicio;
window.ZENTRYX_UI_usuarios = window.ZX_usuarios;
window.ZENTRYX_UI_incidencias = window.ZX_incidencias;
window.ZENTRYX_UI_informes = window.ZX_informes;

function iniciar(){

  crearEstilos();
  pintarHeader();
  pintarUsuario();
  pintarNav();
  pantallaInicio();
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded",iniciar);
}else{
  iniciar();
}

})();