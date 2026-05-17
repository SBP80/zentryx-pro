// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3047 - FIX USER_ID + SELECTORES
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
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

// ===============================
// SELECTOR HORAS + MINUTOS
// ===============================
function selectorTiempo(id, valorMin=480){
  const h=Math.floor(valorMin/60);
  const m=valorMin%60;

  return `
    <div style="display:flex;gap:10px">
      <select id="${id}_h" style="flex:1">
        ${[...Array(13).keys()].map(x=>`
          <option value="${x}" ${x===h?"selected":""}>${x} h</option>
        `).join("")}
      </select>

      <select id="${id}_m" style="flex:1">
        ${[0,15,30,45].map(x=>`
          <option value="${x}" ${x===m?"selected":""}>${x} min</option>
        `).join("")}
      </select>
    </div>
  `;
}

function leerTiempo(id){
  const h=Number(document.getElementById(id+"_h").value||0);
  const m=Number(document.getElementById(id+"_m").value||0);
  return (h*60)+m;
}

// ===============================
// CARGAR DATOS
// ===============================
async function cargar(){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error || !r.data.length){
    return {
      lunes:480, martes:480, miercoles:480,
      jueves:480, viernes:480, sabado:0, domingo:0,
      vacaciones:30,
      asuntos:6,
      pais:"España",
      provincia:"",
      localidad:""
    };
  }

  return r.data[0];
}

// ===============================
// GUARDAR
// ===============================
async function guardar(){
  const s=sesion();

  const data={
    usuario_id:String(s.id),
    user_id:String(s.id), // 🔥 FIX CLAVE

    lunes:leerTiempo("lunes"),
    martes:leerTiempo("martes"),
    miercoles:leerTiempo("miercoles"),
    jueves:leerTiempo("jueves"),
    viernes:leerTiempo("viernes"),
    sabado:leerTiempo("sabado"),
    domingo:leerTiempo("domingo"),

    vacaciones:Number(document.getElementById("vacaciones").value||0),
    asuntos:Number(document.getElementById("asuntos").value||0),

    pais:document.getElementById("pais").value,
    provincia:document.getElementById("provincia").value,
    localidad:document.getElementById("localidad").value
  };

  const r=await sb()
    .from("horarios_usuario")
    .upsert(data,{onConflict:"usuario_id"});

  if(r.error){
    alert("Error guardando: "+r.error.message);
    return;
  }

  alert("Configuración guardada correctamente");
}

// ===============================
// UI
// ===============================
window.ZX_configLaboral=async function(){

  const d=await cargar();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada</h3>

      <label>Lunes</label>${selectorTiempo("lunes",d.lunes)}
      <label>Martes</label>${selectorTiempo("martes",d.martes)}
      <label>Miércoles</label>${selectorTiempo("miercoles",d.miercoles)}
      <label>Jueves</label>${selectorTiempo("jueves",d.jueves)}
      <label>Viernes</label>${selectorTiempo("viernes",d.viernes)}
      <label>Sábado</label>${selectorTiempo("sabado",d.sabado)}
      <label>Domingo</label>${selectorTiempo("domingo",d.domingo)}
    </div>

    <div class="zx_card">
      <h3>Vacaciones</h3>

      <label>Días vacaciones</label>
      <input id="vacaciones" type="number" value="${limpiar(d.vacaciones)}">

      <label>Asuntos propios</label>
      <input id="asuntos" type="number" value="${limpiar(d.asuntos)}">
    </div>

    <div class="zx_card">
      <h3>Calendario laboral</h3>

      <label>País</label>
      <input id="pais" value="${limpiar(d.pais)}">

      <label>Provincia</label>
      <input id="provincia" value="${limpiar(d.provincia)}">

      <label>Localidad</label>
      <input id="localidad" value="${limpiar(d.localidad)}">

      <button class="zx_btn_big zx_azul" id="zx_festivos">
        Cargar festivos
      </button>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_verde" id="zx_guardar">
        Guardar configuración
      </button>
    </div>
  `;

  document.getElementById("zx_guardar").onclick=guardar;

  document.getElementById("zx_festivos").onclick=function(){
    alert("Próximamente: descarga automática de festivos");
  };
};

})();