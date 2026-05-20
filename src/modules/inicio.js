// ===============================
// ZENTRYX PRO - INICIO
// V3070
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function activarBotonInicio(){

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){

    b.classList.remove("zx_activo");

    if(b.dataset.modulo==="inicio"){
      b.classList.add("zx_activo");
    }

  });

}

window.ZENTRYX_UI_inicio=async function(){

  activarBotonInicio();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>

      <div class="zx_text">
        Sistema Zentryx PRO activo
      </div>
    </div>

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" id="zx_inicio_fichaje">
        Fichaje
      </button>

      <button class="zx_btn_big zx_azul" id="zx_inicio_usuarios">
        Usuarios
      </button>

      <button class="zx_btn_big zx_verde">
        Vehículos
      </button>

      <button class="zx_btn_big zx_naranja">
        Incidencias
      </button>

      <button class="zx_btn_big zx_morado">
        Informes
      </button>

      <button class="zx_btn_big zx_gris">
        Config. laboral
      </button>

      <button class="zx_btn_big zx_gris">
        Solicitudes
      </button>

      <button class="zx_btn_big zx_gris">
        Panel admin
      </button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        Versión: V3070
        <br><br>

        ✔ Fichaje PRO activo
        <br>

        ✔ Configuración laboral activa
        <br>

        ✔ Solicitudes integradas
      </div>
    </div>
  `;

  const btnFichaje=document.getElementById("zx_inicio_fichaje");

  if(btnFichaje){

    btnFichaje.onclick=function(){

      if(window.ZX_fichaje_real){
        window.ZX_fichaje_real();
        return;
      }

      if(window.ZX_fichaje){
        window.ZX_fichaje();
      }

    };

  }

  const btnUsuarios=document.getElementById("zx_inicio_usuarios");

  if(btnUsuarios){

    btnUsuarios.onclick=function(){

      if(window.ZX_usuarios){
        window.ZX_usuarios();
      }

    };

  }

};

})();