// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3050 - HORARIOS + CONVENIO + FESTIVOS
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

function selectorTiempo(id, valorMin=480){
  const h=Math.floor((valorMin||0)/60);
  const m=(valorMin||0)%60;

  return `
    <div class="zx_hm_row">
      <select id="${id}_h">
        ${[...Array(13).keys()].map(x=>`
          <option value="${x}" ${x===h?"selected":""}>${x} h</option>
        `).join("")}
      </select>

      <select id="${id}_m">
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
  return h*60+m;
}

async function cargar(){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error || !r.data || !r.data.length){
    return {
      lunes:480,
      martes:480,
      miercoles:480,
      jueves:480,
      viernes:480,
      sabado:0,
      domingo:0,
      vacaciones:30,
      asuntos:6,
      convenio:"Personalizado",
      precio_hora:0,
      precio_extra:0,
      precio_extra_nocturna:0,
      precio_extra_festiva:0,
      pais:"España",
      provincia:"",
      localidad:"",
      anio:new Date().getFullYear()
    };
  }

  return r.data[0];
}

async function guardar(){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const data={
    usuario_id:String(s.id),
    user_id:String(s.id),
    usuario:s.usuario || "",
    nombre:s.nombre || "",

    lunes:leerTiempo("lunes"),
    martes:leerTiempo("martes"),
    miercoles:leerTiempo("miercoles"),
    jueves:leerTiempo("jueves"),
    viernes:leerTiempo("viernes"),
    sabado:leerTiempo("sabado"),
    domingo:leerTiempo("domingo"),

    vacaciones:Number(document.getElementById("vacaciones").value||0),
    asuntos:Number(document.getElementById("asuntos").value||0),

    convenio:document.getElementById("convenio").value,
    precio_hora:Number(document.getElementById("precio_hora").value||0),
    precio_extra:Number(document.getElementById("precio_extra").value||0),
    precio_extra_nocturna:Number(document.getElementById("precio_extra_nocturna").value||0),
    precio_extra_festiva:Number(document.getElementById("precio_extra_festiva").value||0),

    pais:document.getElementById("pais").value.trim(),
    provincia:document.getElementById("provincia").value.trim(),
    localidad:document.getElementById("localidad").value.trim(),
    anio:Number(document.getElementById("anio").value||new Date().getFullYear()),

    activo:true
  };

  const r=await sb()
    .from("horarios_usuario")
    .upsert([data],{onConflict:"usuario_id"});

  if(r.error){
    alert("Error guardando: "+r.error.message);
    return;
  }

  alert("Configuración guardada correctamente");
}

async function cargarFestivos(){
  const pais=document.getElementById("pais").value.trim() || "España";
  const provincia=document.getElementById("provincia").value.trim();
  const localidad=document.getElementById("localidad").value.trim();
  const anio=Number(document.getElementById("anio").value||new Date().getFullYear());

  if(pais.toLowerCase()!=="españa" && pais.toLowerCase()!=="espana"){
    alert("Por ahora solo está preparado para España.");
    return;
  }

  if(!anio){
    alert("Año obligatorio.");
    return;
  }

  try{
    const res=await fetch("https://date.nager.at/api/v3/PublicHolidays/"+anio+"/ES");
    const data=await res.json();

    if(!Array.isArray(data)){
      alert("No se pudieron cargar festivos.");
      return;
    }

    await sb()
      .from("festivos")
      .delete()
      .eq("anio",anio)
      .eq("provincia",provincia)
      .eq("localidad",localidad);

    const festivos=data.map(f=>({
      fecha:f.date,
      nombre:f.localName || f.name || "Festivo",
      pais:"España",
      provincia,
      localidad,
      anio
    }));

    const r=await sb()
      .from("festivos")
      .insert(festivos);

    if(r.error){
      alert("Error guardando festivos: "+r.error.message);
      return;
    }

    alert("Festivos cargados: "+festivos.length);

  }catch(e){
    alert("Error conectando con festivos.");
  }
}

window.ZX_configLaboral=async function(){
  const d=await cargar();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada semanal</h3>

      <div class="zx_label">Lunes</div>
      ${selectorTiempo("lunes",d.lunes)}

      <div class="zx_label">Martes</div>
      ${selectorTiempo("martes",d.martes)}

      <div class="zx_label">Miércoles</div>
      ${selectorTiempo("miercoles",d.miercoles)}

      <div class="zx_label">Jueves</div>
      ${selectorTiempo("jueves",d.jueves)}

      <div class="zx_label">Viernes</div>
      ${selectorTiempo("viernes",d.viernes)}

      <div class="zx_label">Sábado</div>
      ${selectorTiempo("sabado",d.sabado)}

      <div class="zx_label">Domingo</div>
      ${selectorTiempo("domingo",d.domingo)}
    </div>

    <div class="zx_card">
      <h3>Convenio</h3>

      <div class="zx_label">Convenio</div>
      <select id="convenio" class="zx_input">
        <option value="Metal" ${d.convenio==="Metal"?"selected":""}>Metal</option>
        <option value="Construcción" ${d.convenio==="Construcción"?"selected":""}>Construcción</option>
        <option value="Oficinas" ${d.convenio==="Oficinas"?"selected":""}>Oficinas</option>
        <option value="Personalizado" ${d.convenio==="Personalizado"?"selected":""}>Personalizado</option>
      </select>

      <div class="zx_label">Precio hora normal</div>
      <input id="precio_hora" type="number" step="0.01" class="zx_input" value="${limpiar(d.precio_hora || 0)}">

      <div class="zx_label">Precio hora extra normal</div>
      <input id="precio_extra" type="number" step="0.01" class="zx_input" value="${limpiar(d.precio_extra || 0)}">

      <div class="zx_label">Precio hora extra nocturna</div>
      <input id="precio_extra_nocturna" type="number" step="0.01" class="zx_input" value="${limpiar(d.precio_extra_nocturna || 0)}">

      <div class="zx_label">Precio hora extra festiva</div>
      <input id="precio_extra_festiva" type="number" step="0.01" class="zx_input" value="${limpiar(d.precio_extra_festiva || 0)}">
    </div>

    <div class="zx_card">
      <h3>Vacaciones y permisos</h3>

      <div class="zx_label">Días vacaciones</div>
      <input id="vacaciones" type="number" class="zx_input" value="${limpiar(d.vacaciones || 30)}">

      <div class="zx_label">Días asuntos propios</div>
      <input id="asuntos" type="number" class="zx_input" value="${limpiar(d.asuntos || 6)}">
    </div>

    <div class="zx_card">
      <h3>Calendario laboral</h3>

      <div class="zx_label">País</div>
      <input id="pais" class="zx_input" value="${limpiar(d.pais || "España")}">

      <div class="zx_label">Provincia</div>
      <input id="provincia" class="zx_input" value="${limpiar(d.provincia || "")}">

      <div class="zx_label">Localidad</div>
      <input id="localidad" class="zx_input" value="${limpiar(d.localidad || "")}">

      <div class="zx_label">Año</div>
      <input id="anio" type="number" class="zx_input" value="${limpiar(d.anio || new Date().getFullYear())}">

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
  document.getElementById("zx_festivos").onclick=cargarFestivos;
};

window.ZX_config_laboral=window.ZX_configLaboral;

(function(){
  if(document.getElementById("zx_config_laboral_css")) return;

  const s=document.createElement("style");
  s.id="zx_config_laboral_css";
  s.innerHTML=`
    .zx_input{
      width:100%;
      padding:16px;
      border-radius:16px;
      border:1px solid #cbd5e1;
      margin-bottom:14px;
      font-size:18px;
      font-weight:800;
      color:#0f172a;
      background:white;
    }

    .zx_label{
      font-weight:900;
      margin:14px 0 6px;
      color:#334155;
      font-size:18px;
    }

    .zx_hm_row{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      margin-bottom:14px;
    }

    .zx_hm_row select{
      width:100%;
      padding:16px;
      border-radius:16px;
      border:1px solid #cbd5e1;
      background:white;
      font-size:18px;
      font-weight:900;
      color:#0f172a;
    }
  `;
  document.head.appendChild(s);
})();

})();