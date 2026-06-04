// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3060 - FESTIVOS SEGÚN FORMULARIO CORREGIDO
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

function normalizar(v){
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"");
}

function formatoFechaES(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : String(f);
}

function anioActual(){
  return new Date().getFullYear();
}

const CONVENIOS={
  "Metal":{vacaciones:30,asuntos_horas:16,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Construcción":{vacaciones:30,asuntos_horas:20,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Oficinas":{vacaciones:23,asuntos_horas:12,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0},
  "Personalizado":{vacaciones:30,asuntos_horas:16,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0}
};

const COMUNIDADES=[
  "Andalucía","Aragón","Asturias","Baleares","Canarias","Cantabria",
  "Castilla-La Mancha","Castilla y León","Cataluña","Comunidad Valenciana",
  "Extremadura","Galicia","La Rioja","Madrid","Murcia",
  "Navarra","País Vasco","Ceuta","Melilla"
];

function selectorTiempo(id,val=480){
  const h=Math.floor((Number(val)||0)/60);
  const m=(Number(val)||0)%60;

  return `
    <div class="zx_hm_row">
      <select id="${id}_h">
        ${[...Array(13).keys()].map(i=>`<option value="${i}" ${i===h?"selected":""}>${i}h</option>`).join("")}
      </select>
      <select id="${id}_m">
        ${[0,15,30,45].map(i=>`<option value="${i}" ${i===m?"selected":""}>${i}m</option>`).join("")}
      </select>
    </div>
  `;
}

function leerTiempo(id){
  return Number(document.getElementById(id+"_h").value||0)*60+
         Number(document.getElementById(id+"_m").value||0);
}

function selectorComunidad(valor){
  return `
    <select id="comunidad" class="zx_input">
      ${COMUNIDADES.map(c=>`
        <option value="${limpiar(c)}" ${normalizar(valor)===normalizar(c)?"selected":""}>${limpiar(c)}</option>
      `).join("")}
    </select>
  `;
}

function tipoFestivoTexto(t){
  if(t==="nacional") return "Nacional";
  if(t==="autonomico") return "Autonómico";
  if(t==="provincial") return "Provincial";
  if(t==="local") return "Local";
  return t || "";
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
      usuario_id:String(s.id||""),
      user_id:String(s.id||""),
      usuario:s.usuario||"",
      nombre:s.nombre||"",
      lunes:480,
      martes:480,
      miercoles:480,
      jueves:480,
      viernes:480,
      sabado:0,
      domingo:0,
      convenio:"Metal",
      vacaciones:30,
      asuntos_horas:16,
      precio_hora:0,
      precio_extra:0,
      precio_extra_nocturna:0,
      precio_extra_festiva:0,
      pais:"España",
      comunidad:"Madrid",
      provincia:"",
      localidad:"",
      anio:anioActual(),
      activo:true
    };
  }

  const d=r.data[0];

  return {
    usuario_id:d.usuario_id,
    user_id:d.user_id,
    usuario:d.usuario,
    nombre:d.nombre,
    lunes:Number(d.lunes||480),
    martes:Number(d.martes||480),
    miercoles:Number(d.miercoles||480),
    jueves:Number(d.jueves||480),
    viernes:Number(d.viernes||480),
    sabado:Number(d.sabado||0),
    domingo:Number(d.domingo||0),
    convenio:d.convenio||"Metal",
    vacaciones:Number(d.vacaciones||30),
    asuntos_horas:Number(d.asuntos_horas||16),
    precio_hora:Number(d.precio_hora||0),
    precio_extra:Number(d.precio_extra||0),
    precio_extra_nocturna:Number(d.precio_extra_nocturna||0),
    precio_extra_festiva:Number(d.precio_extra_festiva||0),
    pais:d.pais||"España",
    comunidad:d.comunidad||"Madrid",
    provincia:d.provincia||"",
    localidad:d.localidad||"",
    anio:Number(d.anio||anioActual()),
    activo:d.activo!==false
  };
}

function leerConfigPantalla(){
  const s=sesion();

  return {
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
    asuntos_horas:Number(document.getElementById("asuntos_horas").value||0),
    precio_hora:Number(document.getElementById("precio_hora").value||0),
    precio_extra:Number(document.getElementById("precio_extra").value||0),
    precio_extra_nocturna:Number(document.getElementById("precio_extra_nocturna").value||0),
    precio_extra_festiva:Number(document.getElementById("precio_extra_festiva").value||0),
    pais:document.getElementById("pais").value.trim(),
    comunidad:document.getElementById("comunidad").value,
    provincia:document.getElementById("provincia").value.trim(),
    localidad:document.getElementById("localidad").value.trim(),
    anio:Number(document.getElementById("anio").value||anioActual()),
    activo:true
  };
}

async function guardarConfigSilencioso(){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return false;
  }

  const data=leerConfigPantalla();

  const r=await sb()
    .from("horarios_usuario")
    .upsert([data],{onConflict:"usuario_id"});

  if(r.error){
    alert("Error guardando configuración: "+r.error.message);
    return false;
  }

  return true;
}

async function guardarConfig(){
  const ok=await guardarConfigSilencioso();
  if(!ok) return;
  alert("Configuración guardada correctamente");
  ZX_configLaboral();
}

async function cargarFestivosLista(anio,comunidad,provincia,localidad){
  const r=await sb()
    .from("festivos")
    .select("*")
    .eq("anio",Number(anio))
    .order("fecha",{ascending:true});

  if(r.error) return [];

  const com=normalizar(comunidad);
  const prov=normalizar(provincia);
  const loc=normalizar(localidad);

  return (r.data||[]).filter(f=>{
    const tipo=normalizar(f.tipo||"nacional");

    if(tipo==="nacional") return true;

    if(tipo==="autonomico"){
      return normalizar(f.comunidad)===com;
    }

    if(tipo==="provincial"){
      return normalizar(f.provincia)===prov;
    }

    if(tipo==="local"){
      return normalizar(f.localidad)===loc;
    }

    return false;
  });
}

function renderFestivo(f){
  const tipo=String(f.tipo||"nacional");

  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(f.nombre||"Festivo")}</b>
        <span>${formatoFechaES(f.fecha)}</span>
      </div>

      <div class="zx_admin_data">
        Tipo: <b>${limpiar(tipoFestivoTexto(tipo))}</b><br>
        ${f.comunidad ? "Comunidad: "+limpiar(f.comunidad)+"<br>" : ""}
        ${f.provincia ? "Provincia: "+limpiar(f.provincia)+"<br>" : ""}
        ${f.localidad ? "Localidad: "+limpiar(f.localidad) : ""}
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

  const fecha=f ? String(f.fecha||"").slice(0,10) : "";
  const nombre=f ? f.nombre||"" : "";
  const tipo=f ? f.tipo||"local" : "local";

  const comunidad=f
    ? f.comunidad||document.getElementById("comunidad")?.value||""
    : document.getElementById("comunidad")?.value||"";

  const provincia=f
    ? f.provincia||document.getElementById("provincia")?.value||""
    : document.getElementById("provincia")?.value||"";

  const localidad=f
    ? f.localidad||document.getElementById("localidad")?.value||""
    : document.getElementById("localidad")?.value||"";

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_festivo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${f ? "Editar festivo" : "Añadir festivo"}</h2>

        <label class="zx_label">Fecha</label>
        <input id="fx_fecha" type="date" value="${limpiar(fecha)}">

        <label class="zx_label">Nombre</label>
        <input id="fx_nombre" value="${limpiar(nombre)}">

        <label class="zx_label">Tipo</label>
        <select id="fx_tipo">
          <option value="nacional" ${tipo==="nacional"?"selected":""}>Nacional</option>
          <option value="autonomico" ${tipo==="autonomico"?"selected":""}>Autonómico</option>
          <option value="provincial" ${tipo==="provincial"?"selected":""}>Provincial</option>
          <option value="local" ${tipo==="local"?"selected":""}>Local</option>
        </select>

        <label class="zx_label">Comunidad autónoma</label>
        <input id="fx_comunidad" value="${limpiar(comunidad)}">

        <label class="zx_label">Provincia</label>
        <input id="fx_provincia" value="${limpiar(provincia)}">

        <label class="zx_label">Localidad</label>
        <input id="fx_localidad" value="${limpiar(localidad)}">

        <div class="zx_modal_botones">
          <button class="zx_btn_big zx_verde" id="fx_guardar">Guardar</button>
          <button class="zx_btn_big zx_gris" id="fx_cancelar">Cancelar</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById("fx_cancelar").onclick=cerrarModalFestivo;

  document.getElementById("fx_guardar").onclick=async function(){
    const fecha=document.getElementById("fx_fecha").value;
    const nombre=document.getElementById("fx_nombre").value.trim();
    const tipo=document.getElementById("fx_tipo").value;
    const comunidad=document.getElementById("fx_comunidad").value.trim();
    const provincia=document.getElementById("fx_provincia").value.trim();
    const localidad=document.getElementById("fx_localidad").value.trim();

    if(!fecha || !nombre){
      alert("Fecha y nombre obligatorios.");
      return;
    }

    const data={
      fecha,
      nombre,
      anio:new Date(fecha).getFullYear(),
      pais:"España",
      tipo,
      comunidad,
      provincia,
      localidad
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

function mapearComunidadNager(counties){
  if(!Array.isArray(counties) || !counties.length) return "";

  const txt=counties.join(" ").toLowerCase();

  if(txt.includes("es-md")) return "Madrid";
  if(txt.includes("es-an")) return "Andalucía";
  if(txt.includes("es-ar")) return "Aragón";
  if(txt.includes("es-as")) return "Asturias";
  if(txt.includes("es-ib")) return "Baleares";
  if(txt.includes("es-cn")) return "Canarias";
  if(txt.includes("es-cb")) return "Cantabria";
  if(txt.includes("es-cm")) return "Castilla-La Mancha";
  if(txt.includes("es-cl")) return "Castilla y León";
  if(txt.includes("es-ct")) return "Cataluña";
  if(txt.includes("es-vc")) return "Comunidad Valenciana";
  if(txt.includes("es-ex")) return "Extremadura";
  if(txt.includes("es-ga")) return "Galicia";
  if(txt.includes("es-ri")) return "La Rioja";
  if(txt.includes("es-mc")) return "Murcia";
  if(txt.includes("es-nc")) return "Navarra";
  if(txt.includes("es-pv")) return "País Vasco";
  if(txt.includes("es-ce")) return "Ceuta";
  if(txt.includes("es-ml")) return "Melilla";

  return "";
}

async function descargarFestivos(){
  const ok=await guardarConfigSilencioso();
  if(!ok) return;

  const cfg=leerConfigPantalla();
  const anio=Number(cfg.anio||anioActual());

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
      .in("tipo",["nacional","autonomico"]);

    const insert=data.map(f=>{
      const comunidad=mapearComunidadNager(f.counties);
      const tipo=comunidad ? "autonomico" : "nacional";

      return {
        fecha:f.date,
        nombre:f.localName || f.name || "Festivo",
        pais:"España",
        tipo,
        comunidad,
        provincia:"",
        localidad:"",
        anio
      };
    });

    const r=await sb()
      .from("festivos")
      .insert(insert);

    if(r.error){
      alert("Error guardando festivos: "+r.error.message);
      return;
    }

    alert("Festivos oficiales cargados: "+insert.length);
    ZX_configLaboral();

  }catch(e){
    alert("Error conectando con festivos.");
  }
}

function aplicarConvenio(nombre){
  const cfg=CONVENIOS[nombre] || CONVENIOS.Personalizado;

  document.getElementById("vacaciones").value=cfg.vacaciones;
  document.getElementById("asuntos_horas").value=cfg.asuntos_horas;
  document.getElementById("precio_hora").value=cfg.precio_hora;
  document.getElementById("precio_extra").value=cfg.precio_extra;
  document.getElementById("precio_extra_nocturna").value=cfg.precio_extra_nocturna;
  document.getElementById("precio_extra_festiva").value=cfg.precio_extra_festiva;
}

window.ZX_configLaboral=async function(){
  const c=await cargarConfig();
  const anioCfg=Number(c.anio||anioActual());

  const festivos=await cargarFestivosLista(
    anioCfg,
    c.comunidad,
    c.provincia,
    c.localidad
  );

  app().innerHTML=`
    <div class="zx_card">
      <h2>Config. laboral</h2>

      <h3>Jornada semanal</h3>

      <div class="zx_label">Lunes</div>
      ${selectorTiempo("lunes",c.lunes)}

      <div class="zx_label">Martes</div>
      ${selectorTiempo("martes",c.martes)}

      <div class="zx_label">Miércoles</div>
      ${selectorTiempo("miercoles",c.miercoles)}

      <div class="zx_label">Jueves</div>
      ${selectorTiempo("jueves",c.jueves)}

      <div class="zx_label">Viernes</div>
      ${selectorTiempo("viernes",c.viernes)}

      <div class="zx_label">Sábado</div>
      ${selectorTiempo("sabado",c.sabado)}

      <div class="zx_label">Domingo</div>
      ${selectorTiempo("domingo",c.domingo)}
    </div>

    <div class="zx_card">
      <h3>Convenio</h3>

      <div class="zx_label">Convenio aplicable</div>
      <select id="convenio" class="zx_input">
        ${Object.keys(CONVENIOS).map(k=>`
          <option value="${limpiar(k)}" ${c.convenio===k?"selected":""}>${limpiar(k)}</option>
        `).join("")}
      </select>

      <div class="zx_text">Los valores del convenio se aplican como base. El administrador puede ajustar excepciones por trabajador.</div>

      <div class="zx_label">Vacaciones según convenio / ajuste trabajador (días)</div>
      <input id="vacaciones" type="number" class="zx_input" value="${limpiar(c.vacaciones)}">

      <div class="zx_label">Asuntos propios según convenio / ajuste trabajador (horas/año)</div>
      <input id="asuntos_horas" type="number" class="zx_input" value="${limpiar(c.asuntos_horas)}">
    </div>

    <div class="zx_card">
      <h3>Precios horas</h3>

      <div class="zx_label">Precio hora normal</div>
      <input id="precio_hora" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_hora)}">

      <div class="zx_label">Precio hora extra normal</div>
      <input id="precio_extra" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra)}">

      <div class="zx_label">Precio hora extra nocturna</div>
      <input id="precio_extra_nocturna" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_nocturna)}">

      <div class="zx_label">Precio hora extra festiva</div>
      <input id="precio_extra_festiva" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_festiva)}">
    </div>

    <div class="zx_card">
      <h3>Calendario laboral</h3>

      <div class="zx_label">País</div>
      <input id="pais" class="zx_input" value="${limpiar(c.pais||"España")}">

      <div class="zx_label">Año vigente</div>
      <input id="anio" type="number" class="zx_input" value="${limpiar(anioCfg)}">

      <div class="zx_label">Comunidad autónoma</div>
      ${selectorComunidad(c.comunidad)}

      <div class="zx_label">Provincia</div>
      <input id="provincia" class="zx_input" value="${limpiar(c.provincia||"")}">

      <div class="zx_label">Localidad</div>
      <input id="localidad" class="zx_input" value="${limpiar(c.localidad||"")}">

      <button class="zx_btn_big zx_azul" id="zx_descargar_festivos">Descargar festivos oficiales</button>
      <button class="zx_btn_big zx_verde" id="zx_nuevo_festivo">Añadir festivo manual</button>
    </div>

    <div class="zx_card">
      <h3>Festivos aplicables ${limpiar(anioCfg)}</h3>

      <div class="zx_text">
        Se muestran festivos nacionales, autonómicos de la comunidad seleccionada y los provinciales/locales añadidos manualmente.
      </div>

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
    aplicarConvenio(this.value);
  };

  document.getElementById("zx_guardar_config").onclick=guardarConfig;
  document.getElementById("zx_descargar_festivos").onclick=descargarFestivos;

  document.getElementById("zx_nuevo_festivo").onclick=function(){
    abrirModalFestivo(null);
  };

  document.querySelectorAll("[data-del-festivo]").forEach(b=>{
    b.onclick=function(){
      borrarFestivo(b.dataset.delFestivo);
    };
  });

  document.querySelectorAll("[data-edit-festivo]").forEach(b=>{
    const f=festivos.find(x=>String(x.id)===String(b.dataset.editFestivo));
    b.onclick=function(){
      abrirModalFestivo(f);
    };
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

    .zx_admin_row{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:10px;
    }

    .zx_admin_row_top{
      display:flex;
      justify-content:space-between;
      gap:8px;
      font-size:16px;
      color:#0f172a;
      font-weight:900;
    }

    .zx_admin_row_top span{
      color:#64748b;
      font-size:14px;
      white-space:nowrap;
    }

    .zx_admin_data{
      color:#64748b;
      font-size:15px;
      line-height:1.45;
      font-weight:800;
      word-break:break-word;
      margin-top:8px;
    }

    .zx_admin_btn{
      width:100%;
      border:0;
      border-radius:14px;
      margin-top:10px;
      padding:12px;
      color:white;
      font-size:16px;
      font-weight:900;
    }

    .zx_admin_editar{background:#2563eb}
    .zx_admin_borrar{background:#dc2626}

    .zx_edit_grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:10px;
    }

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.55);
      display:flex;
      justify-content:center;
      align-items:center;
      padding:14px;
      z-index:9999;
    }

    .zx_modal_caja{
      width:100%;
      max-width:520px;
      max-height:90vh;
      overflow-y:auto;
      background:white;
      border-radius:22px;
      padding:20px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);
    }

    .zx_modal_caja select,
    .zx_modal_caja input,
    .zx_modal_caja textarea{
      width:100%;
      border:1px solid #cbd5e1;
      border-radius:14px;
      padding:12px;
      font-size:16px;
      font-weight:800;
      color:#0f172a;
      background:#f8fafc;
    }

    .zx_modal_botones{
      position:sticky;
      bottom:-20px;
      background:white;
      padding-top:12px;
      padding-bottom:2px;
      margin-top:14px;
    }
  `;
  document.head.appendChild(s);
})();

})();