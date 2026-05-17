// ===============================
// ZENTRYX PRO - INICIO
// V3049 - ACCESO RÁPIDO ESTABLE
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}

// ===============================
// INICIO PRINCIPAL
// ===============================
window.ZX_inicio=function(){

  // activar botón navegación
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio"){
      b.classList.add("zx_activo");
    }
  });

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">
        Sistema Zentryx PRO activo
      </div>
    </div>

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" onclick="ZX_fichaje()">
        Fichaje
      </button>

      <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">
        Usuarios
      </button>

      <button class="zx_btn_big zx_verde" onclick="ZX_moduloPendiente('Vehículos')">
        Vehículos
      </button>

      <button class="zx_btn_big zx_naranja" onclick="ZX_moduloPendiente('Incidencias')">
        Incidencias
      </button>

      <button class="zx_btn_big zx_morado" onclick="ZX_moduloPendiente('Informes')">
        Informes
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_configLaboral()">
        Config. laboral
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_irAdmin()">
        Panel admin
      </button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        Versión: V3049<br><br>
        ✔ Fichaje PRO activo<br>
        ✔ Usuarios conectado<br>
        ✔ Configuración laboral operativa<br><br>
        Próximo: festivos + horas extra automáticas
      </div>
    </div>
  `;
};

// ===============================
// IR A PANEL ADMIN
// ===============================
window.ZX_irAdmin=function(){
  if(window.ZX_fichaje){
    ZX_fichaje();

    setTimeout(()=>{
      if(window.ZX_toggleAdmin){
        ZX_toggleAdmin();
      }
    },300);
  }
};

// ===============================
// MÓDULOS PENDIENTES
// ===============================
window.ZX_moduloPendiente=function(nombre){
  alert(nombre+" pendiente de desarrollar.");
};

})();