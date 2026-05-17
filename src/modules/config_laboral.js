// ===============================
// ZENTRYX PRO - CONFIG LABORAL
// V3041 COMPLETO
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// ===============================
// CARGAR CONFIG
// ===============================
async function cargarConfig(){
  const s=sesion();

  const r=await sb()
    .from("config_laboral_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error) return null;

  if(!r.data.length){
    return {
      lunes_min:480,
      martes_min:480,
      miercoles_min:480,
      jueves_min:480,
      viernes_min:480,
      sabado_min:0,
      domingo_min:0,
      vacaciones_dias:30,
      asuntos_propios_dias:6,
      localidad:"",
      provincia:""
    };
  }

  return r.data[0];
}

// ===============================
// GUARDAR CONFIG
// ===============================
async function guardarConfig(){
  const s=sesion();

  const datos={
    usuario_id:String(s.id),
    usuario:s.usuario || "",
    nombre:s.nombre || "",

    lunes_min:Number(document.getElementById("zx_lunes").value || 0),
    martes_min:Number(document.getElementById("zx_martes").value || 0),
    miercoles_min:Number(document.getElementById("zx_miercoles").value || 0),
    jueves_min:Number(document.getElementById("zx_jueves").value || 0),
    viernes_min:Number(document.getElementById("zx_viernes").value || 0),
    sabado_min:Number(document.getElementById("zx_sabado").value || 0),
    domingo_min:Number(document.getElementById("zx_domingo").value || 0),

    vacaciones_dias:Number(document.getElementById("zx_vacaciones").value || 0),
    asuntos_propios_dias:Number(document.getElementById("zx_asuntos").value || 0),

    localidad:document.getElementById("zx_localidad").value,
    provincia:document.getElementById("zx_provincia").value,

    activo:true
  };

  const existente=await sb()
    .from("config_laboral_usuario")
    .select("id")
    .eq("usuario_id",datos.usuario_id)
    .limit(1);

  let r;

  if(existente.data && existente.data.length){
    r=await sb()
      .from("config_laboral_usuario")
      .update(datos)
      .eq("usuario_id",datos.usuario_id);
  }else{
    r=await sb()
      .from("config_laboral_usuario")
      .insert([datos]);
  }

  if(r.error){
    alert("Error guardando: "+r.error.message);
    return;
  }

  alert("Guardado correctamente");
}

// ===============================
// UI
// ===============================
window.ZENTRYX_UI_config_laboral=async function(){

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="config_laboral"){
      b.classList.add("zx_activo");
    }
  });

  const c=await cargarConfig();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Configuración laboral</h2>

      <div class="zx_label">Horas por día (minutos)</div>

      <input id="zx_lunes" value="${c.lunes_min}">
      <input id="zx_martes" value="${c.martes_min}">
      <input id="zx_miercoles" value="${c.miercoles_min}">
      <input id="zx_jueves" value="${c.jueves_min}">
      <input id="zx_viernes" value="${c.viernes_min}">
      <input id="zx_sabado" value="${c.sabado_min}">
      <input id="zx_domingo" value="${c.domingo_min}">
    </div>

    <div class="zx_card">
      <h2>Vacaciones</h2>

      <div class="zx_label">Días vacaciones</div>
      <input id="zx_vacaciones" value="${c.vacaciones_dias}">

      <div class="zx_label">Asuntos propios</div>
      <input id="zx_asuntos" value="${c.asuntos_propios_dias}">
    </div>

    <div class="zx_card">
      <h2>Ubicación laboral</h2>

      <div class="zx_label">Localidad</div>
      <input id="zx_localidad" value="${limpiar(c.localidad)}">

      <div class="zx_label">Provincia</div>
      <input id="zx_provincia" value="${limpiar(c.provincia)}">
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_azul" id="zx_guardar_config">
        GUARDAR CONFIGURACIÓN
      </button>
    </div>
  `;

  document.getElementById("zx_guardar_config").onclick=guardarConfig;
};

})();