// ===============================
// ZENTRYX PRO - INICIO
// V3034
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sesion(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function esAdmin(){
  const s=sesion();
  const rol=String(s.rol || "").toLowerCase();
  const usuario=String(s.usuario || "").toLowerCase();
  return rol==="administrador" || usuario==="admin";
}

window.ZENTRYX_UI_inicio=function(){
  const admin=esAdmin();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">Sistema Zentryx PRO activo.</div>
    </div>

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" onclick="ZX_fichaje()">Fichaje</button>
      <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">Usuarios</button>
      <button class="zx_btn_big zx_verde" onclick="ZX_vehiculos()">Vehículos</button>
      <button class="zx_btn_big zx_naranja" onclick="ZX_incidencias()">Incidencias</button>
      <button class="zx_btn_big zx_morado" onclick="ZX_informes()">Informes</button>

      ${
        admin
        ? `<button class="zx_btn_big zx_gris" onclick="ZX_ir_admin_fichaje()">Panel admin</button>`
        : ""
      }
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>
      <div class="zx_text">
        Versión: V3034<br><br>
        Fichaje PRO activo.<br><br>
        Usuarios conectado a Supabase.<br><br>
        Panel admin disponible para administrador.
      </div>
    </div>
  `;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

window.ZX_ir_admin_fichaje=function(){
  if(window.ZX_fichaje){
    window.ZX_fichaje();

    setTimeout(function(){
      if(window.ZX_toggleAdmin){
        window.ZX_toggleAdmin();
      }
    },500);
  }
};

})();