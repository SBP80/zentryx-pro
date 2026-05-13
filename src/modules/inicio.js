// ===============================
// ZENTRYX PRO - INICIO
// V2661
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

      <button class="zx_btn_big zx_rojo" type="button" onclick="ZX_fichaje()">Fichaje</button>
      <button class="zx_btn_big zx_azul" type="button" onclick="ZX_usuarios()">Usuarios</button>
      <button class="zx_btn_big zx_verde" type="button" onclick="ZX_vehiculos()">Vehículos</button>
      <button class="zx_btn_big zx_naranja" type="button" onclick="ZX_incidencias()">Incidencias</button>
      <button class="zx_btn_big zx_morado" type="button" onclick="ZX_informes()">Informes</button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>
      <div class="zx_text">
        <b>Versión:</b> V2661<br><br>
        Diseño limpio para móvil, tablet y PC.<br><br>
        Preparado para servidor local de empresa o servidor externo.<br><br>
        Módulos activos: Inicio y Usuarios.
      </div>
    </div>
  `;
};

window.ZX_inicio=function(){
  window.ZENTRYX_UI_inicio();
};

})();