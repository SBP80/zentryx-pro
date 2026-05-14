// ===============================
// ZENTRYX PRO - INICIO
// V2666
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

window.ZENTRYX_UI_inicio=function(){

  if(!app()) return;

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">
        Sistema Zentryx PRO activo.
      </div>
    </div>

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" onclick="ZX_fichaje()">Fichaje</button>
      <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">Usuarios</button>
      <button class="zx_btn_big zx_verde" onclick="ZX_vehiculos()">Vehículos</button>
      <button class="zx_btn_big zx_naranja" onclick="ZX_incidencias()">Incidencias</button>
      <button class="zx_btn_big zx_morado" onclick="ZX_informes()">Informes</button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        <b>Versión:</b> V2666<br><br>
        Diseño limpio para móvil, tablet y PC.<br><br>
        Preparado para servidor local o externo.<br><br>
        Usuarios conectado a Supabase.
      </div>
    </div>
  `;
};

window.ZX_inicio=function(){
  window.ZENTRYX_UI_inicio();
};

})();