// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3055 - CONVENIOS + FESTIVOS CRUD + FECHAS ES
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

function formatoFechaES(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  if(p.length===3) return p[2]+"/"+p[1]+"/"+p[0];
  return f;
}

const CONVENIOS={
  "Metal":{vacaciones:30,asuntos:6,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Construcción":{vacaciones:30,asuntos:4,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Oficinas":{vacaciones:23,asuntos:2,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Personalizado":{vacaciones:30,asuntos:6,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0}
};

function selectorTiempo(id,val=480){
  const h=Math.floor((val||0)/60);
  const m=(val||0)%60;

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

function leerTiempo(id){
  return Number(document.getElementById(id+"_h").value||0)*60+
         Number(document.getElementById(id+"_m").value||0);
}

async function cargarConfig(){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error || !r.data || !r.data.length){
    return {
      lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,
      vacaciones:30,asuntos:6,
      convenio:"Metal",
      precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,
      pais:"España",provincia:"",localidad:"",anio:new Date().getFullYear()
    };
  }

  return r.data[0];
}

async function guardarConfig(){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const data={
    usuario_id:String(s.id),
    user_id:String(s.id),
    usuario:s.usuario||"",
    nombre:s.nombre||"",

    lunes:leerTiempo("lunes"),
    martes:leerTiempo("martes"),
    miercoles:leerTiempo("miercoles"),
    jueves:leerTiempo("jueves"),
    viernes:leerTiempo("viernes"),
    sabado:leerTiempo("sabado"),
    domingo:leerTiempo("domingo"),

    convenio:document.getElementById("convenio").value,
    vacaciones:Number(document.getElementById("vacaciones").value||0),
    asuntos:Number(document.getElementById("asuntos").value||0),

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

  alert("Configuración guardada");
}

async function cargarFestivosLista(anio){
  const r=await sb()
    .from("festivos")
    .select("*")
    .eq("anio",Number(anio))
    .order("fecha",{ascending:true});

  if(r.error) return [];
  return r.data||[];
}

function renderFestivo(f){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(f.nombre||"Festivo")}</b>
        <span>${limpiar(formatoFechaES(f.fecha))}</span>
      </div>

      <div class="zx_admin_data">
        ${limpiar(f.provincia||"")} ${f.localidad ? "· "+limpiar(f.localidad) : ""}
      </div>

      <div class="zx_edit_grid">
        <button class="zx_admin_btn zx_admin_editar" data-edit-festivo="${f.id}">Editar</button>
        <button class="zx_admin_btn zx_admin_borrar" data-del-festivo="${f.id}">Borrar</button>
      </div>
    </div>
  `;
}

function cerrarModalFestivo(){
  const m=document.getElementById("zx_modal_festivo");
  if(m) m.remove();
}

function abrirModalFestivo(f=null){
  cerrarModalFestivo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_festivo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${f ? "Editar festivo" : "Añadir festivo"}</h2>

        <label class="zx_label">Fecha</label>
        <input id="fx_fecha" type="date" value="${limpiar(f?f.fecha:"")}">

        <label class="zx_label">Nombre</label>
        <input id="fx_nombre" value="${limpiar(f?f.nombre:"")}">

        <button class="zx_btn_big zx_verde" id="fx_guardar">Guardar</button>
        <button class="zx_btn_big zx_gris" id="fx_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("fx_cancelar").onclick=cerrarModalFestivo;

  document.getElementById("fx_guardar").onclick=async function(){
    const fecha=document.getElementById("fx_fecha").value;
    const nombre=document.getElementById("fx_nombre").value.trim();

    if(!fecha || !nombre){
      alert("Fecha y nombre obligatorios.");
      return;
    }

    const data={
      fecha,
      nombre,
      anio:new Date(fecha).getFullYear(),
      pais:document.getElementById("pais")?.value || "España",
      provincia:document.getElementById("provincia")?.value || "",
      localidad:document.getElementById("localidad")?.value || ""
    };

    let r;

    if(f){
      r=await sb().from("festivos").update(data).eq("id",f.id);
    }else{
      r=await sb().from("festivos").insert([data]);
    }

    if(r.error){
      alert("Error guardando festivo: "+r.error.message);
      return;
    }

    cerrarModalFestivo();
    ZX_configLaboral();
  };
}

async function borrarFestivo(id){
  if(!confirm("¿Eliminar festivo?")) return;

  const r=await sb()
    .from("festivos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando festivo: "+r.error.message);
    return;
  }

  ZX_configLaboral();
}

async function descargarFestivos(){
  const anio=Number(document.getElementById("anio").value||new Date().getFullYear());
  const provincia=document.getElementById("provincia").value.trim();
  const localidad=document.getElementById("localidad").value.trim();

  try{
    const res=await fetch("https://date.nager.at/api/v3/PublicHolidays/"+anio+"/ES");
    const data=await res.json();

    if(!Array.isArray(data)){
      alert("No se pudieron descargar festivos.");
      return;
    }

    await sb()
      .from("festivos")
      .delete()
      .eq("anio",anio)
      .eq("provincia",provincia)
      .eq("localidad",localidad);

    const insert=data.map(f=>({
      fecha:f.date,
      nombre:f.localName||f.name||"Festivo",
      pais:"España",
      provincia,
      localidad,
      anio
    }));

    const r=await sb()
      .from("festivos")
      .insert(insert);

    if(r.error){
      alert("Error guardando festivos: "+r.error.message);
      return;
    }

    alert("Festivos cargados: "+insert.length);
    ZX_configLaboral();

  }catch(e){
    alert("Error conectando con festivos.");
  }
}

window.ZX_configLaboral=async function(){
  const c=await cargarConfig();
  const anioActual=c.anio || new Date().getFullYear();
  const festivos=await cargarFestivosLista(anioActual);

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada semanal</h3>

      <div class="zx_label">Lunes</div>${selectorTiempo("lunes",c.lunes)}
      <div class="zx_label">Martes</div>${selectorTiempo("martes",c.martes)}
      <div class="zx_label">Miércoles</div>${selectorTiempo("miercoles",c.miercoles)}
      <div class="zx_label">Jueves</div>${selectorTiempo("jueves",c.jueves)}
      <div class="zx_label">Viernes</div>${selectorTiempo("viernes",c.viernes)}
      <div class="zx_label">Sábado</div>${selectorTiempo("sabado",c.sabado)}
      <div class="zx_label">Domingo</div>${selectorTiempo("domingo",c.domingo)}
    </div>

    <div class="zx_card">
      <h3>Convenio</h3>

      <div class="zx_label">Convenio</div>
      <select id="convenio" class="zx_input">
        ${Object.keys(CONVENIOS).map(k=>`
          <option value="${k}" ${c.convenio===k?"selected":""}>${k}</option>
        `).join("")}
      </select>

      <div class="zx_label">Vacaciones según convenio</div>
      <input id="vacaciones" type="number" class="zx_input" value="${limpiar(c.vacaciones||30)}">

      <div class="zx_label">Asuntos propios según convenio</div>
      <input id="asuntos" type="number" class="zx_input" value="${limpiar(c.asuntos||6)}">
    </div>

    <div class="zx_card">
      <h3>Precios horas</h3>

      <div class="zx_label">Precio hora normal</div>
      <input id="precio_hora" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_hora||0)}">

      <div class="zx_label">Precio hora extra normal</div>
      <input id="precio_extra" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra||0)}">

      <div class="zx_label">Precio hora extra nocturna</div>
      <input id="precio_extra_nocturna" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_nocturna||0)}">

      <div class="zx_label">Precio hora extra festiva</div>
      <input id="precio_extra_festiva" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_festiva||0)}">
    </div>

    <div class="zx_card">
      <h3>Calendario laboral</h3>

      <div class="zx_label">País</div>
      <input id="pais" class="zx_input" value="${limpiar(c.pais||"España")}">

      <div class="zx_label">Provincia</div>
      <input id="provincia" class="zx_input" value="${limpiar(c.provincia||"")}">

      <div class="zx_label">Localidad</div>
      <input id="localidad" class="zx_input" value="${limpiar(c.localidad||"")}">

      <div class="zx_label">Año</div>
      <input id="anio" type="number" class="zx_input" value="${limpiar(anioActual)}">

      <button class="zx_btn_big zx_azul" id="zx_descargar_festivos">Descargar festivos</button>
      <button class="zx_btn_big zx_verde" id="zx_nuevo_festivo">Añadir festivo</button>
    </div>

    <div class="zx_card">
      <h3>Festivos ${limpiar(anioActual)}</h3>

      ${
        festivos.length
        ? festivos.map(renderFestivo).join("")
        : `<div class="zx_text">Sin festivos guardados.</div>`
      }
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_verde" id="zx_guardar_config">Guardar configuración</button>
    </div>
  `;

  document.getElementById("convenio").onchange=function(){
    const cfg=CONVENIOS[this.value] || CONVENIOS.Personalizado;
    document.getElementById("vacaciones").value=cfg.vacaciones;
    document.getElementById("asuntos").value=cfg.asuntos;
    document.getElementById("precio_hora").value=cfg.precio_hora;
    document.getElementById("precio_extra").value=cfg.precio_extra;
    document.getElementById("precio_extra_nocturna").value=cfg.precio_extra_nocturna;
    document.getElementById("precio_extra_festiva").value=cfg.precio_extra_festiva;
  };

  document.getElementById("zx_guardar_config").onclick=guardarConfig;
  document.getElementById("zx_descargar_festivos").onclick=descargarFestivos;
  document.getElementById("zx_nuevo_festivo").onclick=function(){abrirModalFestivo(null)};

  document.querySelectorAll("[data-del-festivo]").forEach(b=>{
    b.onclick=function(){borrarFestivo(b.dataset.delFestivo)};
  });

  document.querySelectorAll("[data-edit-festivo]").forEach(b=>{
    const f=festivos.find(x=>String(x.id)===String(b.dataset.editFestivo));
    b.onclick=function(){abrirModalFestivo(f)};
  });
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