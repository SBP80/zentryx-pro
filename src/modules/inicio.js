// ===============================
// ZENTRYX PRO - INICIO
// V3068
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

window.ZENTRYX_UI_inicio=async function(){

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
            Hay ${pendientes} solicitud${pendientes===1?"":"es"} pendiente${pendientes===1?"":"s"}.
          </div>

          <button class="zx_btn_big zx_naranja" onclick="ZX_solicitudes()">
            Ver solicitudes
          </button>
        </div>
      `
      : ""
    }

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" onclick="ZX_abrirFichaje()">
        Fichaje
      </button>

      <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">
        Usuarios
      </button>

      <button class="zx_btn_big zx_verde" onclick="ZX_vehiculos()">
        Vehículos
      </button>

      <button class="zx_btn_big zx_naranja" onclick="ZX_incidencias()">
        Incidencias
      </button>

      <button class="zx_btn_big zx_morado" onclick="ZX_informes()">
        Informes
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_configLaboral()">
        Config. laboral
      </button>

      <button class="zx_btn_big ${pendientes>0 ? "zx_naranja" : "zx_gris"}" onclick="ZX_solicitudes()">
        Solicitudes${pendientes>0 ? " ("+pendientes+")" : ""}
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_abrirFichaje();setTimeout(()=>{if(window.ZX_toggleAdmin)ZX_toggleAdmin()},300)">
        Panel admin
      </button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        Versión: V3068<br><br>
        ✔ Fichaje PRO activo<br>
        ✔ Configuración laboral activa<br>
        ✔ Solicitudes activas
      </div>
    </div>
  `;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

})();