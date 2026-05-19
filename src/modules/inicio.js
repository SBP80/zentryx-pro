// ===============================
// ZENTRYX PRO - INICIO
// V3066 - AVISOS SOLICITUDES EN INICIO
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" ||
         String(s.usuario||"").toLowerCase()==="admin";
}

async function contarSolicitudesPendientes(){
  if(!esAdmin()) return 0;

  const r=await sb()
    .from("solicitudes_laborales")
    .select("id",{count:"exact",head:true})
    .eq("estado","pendiente");

  if(r.error) return 0;
  return r.count || 0;
}

window.ZX_inicio=async function(){

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio"){
      b.classList.add("zx_activo");
    }
  });

  const pendientes=await contarSolicitudesPendientes();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">
        Sistema Zentryx PRO activo
      </div>
    </div>

    ${
      esAdmin() && pendientes>0
      ? `
        <div class="zx_card" style="border:2px solid #f59e0b;background:#fff7ed;">
          <h2 style="color:#9a3412;">Avisos</h2>
          <div class="zx_text" style="font-weight:900;color:#9a3412;">
            Hay ${pendientes} solicitud${pendientes===1 ? "" : "es"} pendiente${pendientes===1 ? "" : "s"} de revisar.
          </div>

          <button class="zx_btn_big zx_naranja" onclick="ZX_solicitudes()">
            Ver solicitudes pendientes
          </button>
        </div>
      `
      : ""
    }

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

      <button class="zx_btn_big ${pendientes>0 ? "zx_naranja" : "zx_gris"}" onclick="ZX_solicitudes()">
         Solicitudes${pendientes>0 ? " ("+pendientes+")" : ""}
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_irAdmin()">
        Panel admin
      </button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        Versión: V3066<br><br>
        Fichaje PRO activo.<br>
        Configuración laboral activa.<br>
        Solicitudes laborales activas.
      </div>
    </div>
  `;
};

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

window.ZX_moduloPendiente=function(nombre){
  alert(nombre+" pendiente de desarrollar.");
};

})();