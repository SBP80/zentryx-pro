// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3044 - COMPLETO + BOTÓN AUTOMÁTICO
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

// ===============================
// SELECTORES HORAS
// ===============================
function selectHoras(id, valorMin){
  const h=Math.floor((valorMin||0)/60);
  const m=(valorMin||0)%60;

  return `
    <div class="zx_hm_row">
      <select id="${id}_h">
        ${[...Array(13).keys()].map(i=>`
          <option value="${i}" ${i===h?"selected":""}>${i} h</option>
        `).join("")}
      </select>

      <select id="${id}_m">
        ${[0,15,30,45].map(i=>`
          <option value="${i}" ${i===m?"selected":""}>${i} min</option>
        `).join("")}
      </select>
    </div>
  `;
}

function getMin(id){
  const h=parseInt(document.getElementById(id+"_h").value||0);
  const m=parseInt(document.getElementById(id+"_m").value||0);
  return h*60+m;
}

// ===============================
// GUARDAR CONFIG
// ===============================
async function guardar(){
  const s=sesion();

  const data={
    usuario_id:String(s.id),

    lunes:getMin("lun"),
    martes:getMin("mar"),
    miercoles:getMin("mie"),
    jueves:getMin("jue"),
    viernes:getMin("vie"),
    sabado:getMin("sab"),
    domingo:getMin("dom"),

    vacaciones:parseInt(document.getElementById("vac").value||0),
    asuntos:parseInt(document.getElementById("asu").value||0),

    convenio:document.getElementById("convenio").value,
    precio_hora:parseFloat(document.getElementById("precio_hora").value||0),
    precio_extra:parseFloat(document.getElementById("precio_extra").value||0),

    pais:document.getElementById("pais").value,
    provincia:document.getElementById("provincia").value,
    localidad:document.getElementById("localidad").value,
    anio:document.getElementById("anio").value,

    activo:true
  };

  const r=await sb()
    .from("horarios_usuario")
    .upsert([data],{onConflict:"usuario_id"});

  if(r.error){
    alert("Error guardando: "+r.error.message);
    return;
  }

  alert("Configuración guardada");
}

// ===============================
// FESTIVOS (FASE SIGUIENTE)
// ===============================
function cargarFestivos(){
  alert("Aquí conectaremos festivos reales");
}

// ===============================
// RENDER
// ===============================
window.ZX_configLaboral=async function(){

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada semanal</h3>

      <div class="zx_label">Lunes</div>
      ${selectHoras("lun",480)}

      <div class="zx_label">Martes</div>
      ${selectHoras("mar",480)}

      <div class="zx_label">Miércoles</div>
      ${selectHoras("mie",480)}

      <div class="zx_label">Jueves</div>
      ${selectHoras("jue",480)}

      <div class="zx_label">Viernes</div>
      ${selectHoras("vie",480)}

      <div class="zx_label">Sábado</div>
      ${selectHoras("sab",0)}

      <div class="zx_label">Domingo</div>
      ${selectHoras("dom",0)}
    </div>

    <div class="zx_card">
      <h3>Convenio</h3>

      <select id="convenio" class="zx_input">
        <option>Metal</option>
        <option>Construcción</option>
        <option>Oficinas</option>
        <option>Personalizado</option>
      </select>

      <div class="zx_label">Precio hora</div>
      <input id="precio_hora" type="number" class="zx_input" value="12">

      <div class="zx_label">Precio hora extra</div>
      <input id="precio_extra" type="number" class="zx_input" value="18">
    </div>

    <div class="zx_card">
      <h3>Vacaciones y permisos</h3>

      <div class="zx_label">Vacaciones</div>
      <input id="vac" type="number" class="zx_input" value="30">

      <div class="zx_label">Asuntos propios</div>
      <input id="asu" type="number" class="zx_input" value="6">
    </div>

    <div class="zx_card">
      <h3>Calendario laboral</h3>

      <div class="zx_label">País</div>
      <input id="pais" class="zx_input" value="España">

      <div class="zx_label">Provincia</div>
      <input id="provincia" class="zx_input">

      <div class="zx_label">Localidad</div>
      <input id="localidad" class="zx_input">

      <div class="zx_label">Año</div>
      <input id="anio" class="zx_input" value="${new Date().getFullYear()}">

      <button class="zx_btn_big zx_azul" id="btn_festivos">
        Cargar festivos
      </button>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_verde" id="guardar">
        Guardar configuración
      </button>
    </div>
  `;

  document.getElementById("guardar").onclick=guardar;
  document.getElementById("btn_festivos").onclick=cargarFestivos;
};

// ===============================
// BOTÓN AUTOMÁTICO EN INICIO
// ===============================
function insertarBoton(){

  if(document.getElementById("zx_btn_config_laboral")) return;

  const botones=[...document.querySelectorAll("button")];

  const panel=botones.find(b=>
    b.textContent.toLowerCase().includes("panel admin")
  );

  if(!panel) return;

  const btn=document.createElement("button");
  btn.id="zx_btn_config_laboral";
  btn.className="zx_btn_big zx_gris";
  btn.textContent="Config. laboral";

  btn.onclick=function(){
    window.ZX_configLaboral();
  };

  panel.parentElement.appendChild(btn);
}

setInterval(insertarBoton,1000);

// ===============================
// ESTILOS
// ===============================
(function(){
  if(document.getElementById("zx_config_css")) return;

  const s=document.createElement("style");
  s.id="zx_config_css";
  s.innerHTML=`
    .zx_input{
      width:100%;
      padding:12px;
      border-radius:12px;
      border:1px solid #ccc;
      margin-bottom:10px;
    }

    .zx_label{
      font-weight:800;
      margin:10px 0 4px;
    }

    .zx_hm_row{
      display:flex;
      gap:10px;
      margin-bottom:10px;
    }

    .zx_hm_row select{
      flex:1;
      padding:10px;
      border-radius:10px;
    }
  `;
  document.head.appendChild(s);
})();

})();