// ===============================
// ZENTRYX PRO - INICIO
// V3072
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sb(){
  return window.sb || window.supabaseClient;
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
  return String(s.rol || "").toLowerCase()==="administrador" ||
         String(s.usuario || "").toLowerCase()==="admin";
}

function activarBotonInicio(){
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");

    if(b.dataset.modulo==="inicio"){
      b.classList.add("zx_activo");
    }
  });
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

async function contarHorasExtraPendientes(){
  const s=sesion();

  let q=sb()
    .from("horas_extra_pro")
    .select("id",{count:"exact",head:true});

  if(esAdmin()){
    q=q.in("estado",["pendiente","validada_usuario","validada_admin"]);
  }else{
    q=q
      .eq("usuario_id",String(s.id))
      .in("estado",["pendiente","validada_admin","pagada"]);
  }

  const r=await q;

  if(r.error) return 0;
  return r.count || 0;
}

function abrirFichaje(){
  if(window.ZX_abrirFichaje){
    window.ZX_abrirFichaje();
    return;
  }

  if(window.ZX_fichaje_real){
    window.ZX_fichaje_real();
    return;
  }

  if(window.ZX_fichaje){
    window.ZX_fichaje();
  }
}

function abrirModulo(nombre,fn){
  if(typeof fn==="function"){
    fn();
    return;
  }

  alert(nombre+" pendiente.");
}

window.ZENTRYX_UI_inicio=async function(){

  activarBotonInicio();

  const pendientesSolicitudes=await contarSolicitudesPendientes();
  const pendientesHorasExtra=await contarHorasExtraPendientes();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>

      <div class="zx_text">
        Sistema Zentryx PRO activo
      </div>
    </div>

    ${
      esAdmin() && pendientesSolicitudes>0
      ? `
        <div class="zx_card" style="border:2px solid #f59e0b;background:#fff7ed;">
          <h2 style="color:#9a3412;">Avisos</h2>

          <div class="zx_text" style="font-weight:900;color:#9a3412;">
            Hay ${pendientesSolicitudes} solicitud${pendientesSolicitudes===1 ? "" : "es"} pendiente${pendientesSolicitudes===1 ? "" : "s"}.
          </div>

          <button class="zx_btn_big zx_naranja" id="zx_inicio_ver_solicitudes">
            Ver solicitudes
          </button>
        </div>
      `
      : ""
    }

    ${
      pendientesHorasExtra>0
      ? `
        <div class="zx_card" style="border:2px solid #7c3aed;background:#f5f3ff;">
          <h2 style="color:#5b21b6;">Horas extra</h2>

          <div class="zx_text" style="font-weight:900;color:#5b21b6;">
            Hay ${pendientesHorasExtra} registro${pendientesHorasExtra===1 ? "" : "s"} de horas extra pendiente${pendientesHorasExtra===1 ? "" : "s"}.
          </div>

          <button class="zx_btn_big zx_morado" id="zx_inicio_ver_horas_extra">
            Ver horas extra
          </button>
        </div>
      `
      : ""
    }

    <div class="zx_card">
      <h2>Acceso rápido</h2>

      <button class="zx_btn_big zx_rojo" id="zx_inicio_fichaje">
        Fichaje
      </button>

      <button class="zx_btn_big zx_azul" id="zx_inicio_usuarios">
        Usuarios
      </button>

      <button class="zx_btn_big zx_verde" id="zx_inicio_vehiculos">
        Vehículos
      </button>

      <button class="zx_btn_big zx_naranja" id="zx_inicio_incidencias">
        Incidencias
      </button>

      <button class="zx_btn_big zx_morado" id="zx_inicio_informes">
        Informes
      </button>

      <button class="zx_btn_big zx_gris" id="zx_inicio_config_laboral">
        Config. laboral
      </button>

      <button class="zx_btn_big ${pendientesSolicitudes>0 ? "zx_naranja" : "zx_gris"}" id="zx_inicio_solicitudes">
        Solicitudes${pendientesSolicitudes>0 ? " ("+pendientesSolicitudes+")" : ""}
      </button>

      <button class="zx_btn_big ${pendientesHorasExtra>0 ? "zx_morado" : "zx_gris"}" id="zx_inicio_horas_extra">
        Horas extra${pendientesHorasExtra>0 ? " ("+pendientesHorasExtra+")" : ""}
      </button>

      <button class="zx_btn_big zx_gris" id="zx_inicio_panel_admin">
        Panel admin
      </button>
    </div>

    <div class="zx_card">
      <h2>Estado sistema</h2>

      <div class="zx_text">
        Versión: V3072
        <br><br>

        ✔ Fichaje PRO activo
        <br>

        ✔ Configuración laboral activa
        <br>

        ✔ Solicitudes integradas
        <br>

        ✔ Horas extra activo
      </div>
    </div>
  `;

  const btnFichaje=document.getElementById("zx_inicio_fichaje");
  if(btnFichaje){
    btnFichaje.onclick=abrirFichaje;
  }

  const btnUsuarios=document.getElementById("zx_inicio_usuarios");
  if(btnUsuarios){
    btnUsuarios.onclick=function(){
      abrirModulo("Usuarios",window.ZX_usuarios);
    };
  }

  const btnVehiculos=document.getElementById("zx_inicio_vehiculos");
  if(btnVehiculos){
    btnVehiculos.onclick=function(){
      abrirModulo("Vehículos",window.ZX_vehiculos);
    };
  }

  const btnIncidencias=document.getElementById("zx_inicio_incidencias");
  if(btnIncidencias){
    btnIncidencias.onclick=function(){
      abrirModulo("Incidencias",window.ZX_incidencias);
    };
  }

  const btnInformes=document.getElementById("zx_inicio_informes");
  if(btnInformes){
    btnInformes.onclick=function(){
      abrirModulo("Informes",window.ZX_informes);
    };
  }

  const btnConfig=document.getElementById("zx_inicio_config_laboral");
  if(btnConfig){
    btnConfig.onclick=function(){
      abrirModulo("Config. laboral",window.ZX_configLaboral);
    };
  }

  const btnSolicitudes=document.getElementById("zx_inicio_solicitudes");
  if(btnSolicitudes){
    btnSolicitudes.onclick=function(){
      abrirModulo("Solicitudes",window.ZX_solicitudes);
    };
  }

  const btnAvisoSolicitudes=document.getElementById("zx_inicio_ver_solicitudes");
  if(btnAvisoSolicitudes){
    btnAvisoSolicitudes.onclick=function(){
      abrirModulo("Solicitudes",window.ZX_solicitudes);
    };
  }

  const btnHorasExtra=document.getElementById("zx_inicio_horas_extra");
  if(btnHorasExtra){
    btnHorasExtra.onclick=function(){
      abrirModulo("Horas extra",window.ZX_horas_extra);
    };
  }

  const btnAvisoHorasExtra=document.getElementById("zx_inicio_ver_horas_extra");
  if(btnAvisoHorasExtra){
    btnAvisoHorasExtra.onclick=function(){
      abrirModulo("Horas extra",window.ZX_horas_extra);
    };
  }

  const btnPanel=document.getElementById("zx_inicio_panel_admin");
  if(btnPanel){
    btnPanel.onclick=function(){
      abrirFichaje();

      setTimeout(function(){
        if(window.ZX_toggleAdmin){
          window.ZX_toggleAdmin();
        }
      },300);
    };
  }
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

})();