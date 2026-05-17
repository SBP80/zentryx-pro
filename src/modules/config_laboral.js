// ===============================
// ZENTRYX PRO - CONFIG LABORAL
// V3042 - AUTO BOTÓN + CONFIG COMPLETA
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
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function insertarBotonConfigLaboral(){
  if(document.getElementById("zx_btn_config_laboral_auto")) return;

  const botones=[...document.querySelectorAll("button")];
  const panel=botones.find(b=>b.textContent.trim().toLowerCase().includes("panel admin"));

  const btn=document.createElement("button");
  btn.id="zx_btn_config_laboral_auto";
  btn.className="zx_btn_big zx_gris";
  btn.type="button";
  btn.textContent="Config. laboral";
  btn.onclick=function(){
    ZX_config_laboral();
  };

  if(panel && panel.parentElement){
    panel.parentElement.appendChild(btn);
  }
}

async function cargarConfig(){
  const s=sesion();

  const r=await sb()
    .from("config_laboral_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error) return null;

  if(!r.data || !r.data.length){
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
    localidad:document.getElementById("zx_localidad").value.trim(),
    provincia:document.getElementById("zx_provincia").value.trim(),
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

  alert("Configuración guardada");
}

function inputDia(id,label,value){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${label}</b>
        <span>min/día</span>
      </div>
      <input id="${id}" type="number" value="${limpiar(value)}">
    </div>
  `;
}

window.ZX_config_laboral=async function(){
  const c=await cargarConfig();

  if(!c){
    alert("No se pudo cargar configuración laboral.");
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>
      <div class="zx_text">Jornada por trabajador</div>

      ${inputDia("zx_lunes","Lunes",c.lunes_min)}
      ${inputDia("zx_martes","Martes",c.martes_min)}
      ${inputDia("zx_miercoles","Miércoles",c.miercoles_min)}
      ${inputDia("zx_jueves","Jueves",c.jueves_min)}
      ${inputDia("zx_viernes","Viernes",c.viernes_min)}
      ${inputDia("zx_sabado","Sábado",c.sabado_min)}
      ${inputDia("zx_domingo","Domingo",c.domingo_min)}
    </div>

    <div class="zx_card">
      <h2>Vacaciones y permisos</h2>

      <div class="zx_label">Días de vacaciones</div>
      <input id="zx_vacaciones" type="number" value="${limpiar(c.vacaciones_dias)}">

      <div class="zx_label">Días de asuntos propios</div>
      <input id="zx_asuntos" type="number" value="${limpiar(c.asuntos_propios_dias)}">
    </div>

    <div class="zx_card">
      <h2>Calendario laboral</h2>

      <div class="zx_label">Localidad</div>
      <input id="zx_localidad" value="${limpiar(c.localidad)}">

      <div class="zx_label">Provincia</div>
      <input id="zx_provincia" value="${limpiar(c.provincia)}">
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_azul" id="zx_guardar_config_laboral">
        Guardar configuración
      </button>
    </div>
  `;

  document.getElementById("zx_guardar_config_laboral").onclick=guardarConfig;
};

setInterval(insertarBotonConfigLaboral,1000);

})();