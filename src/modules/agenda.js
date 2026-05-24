// ===============================
// ZENTRYX PRO - AGENDA GLOBAL
// V3081 - CALENDARIO + EVENTOS
// ===============================
(function(){
"use strict";

// ===============================
// BASE
// ===============================
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
// FECHAS
// ===============================
function hoy(){
  const f=new Date();
  return f.toISOString().slice(0,10);
}

function formatoFecha(f){
  if(!f) return "";
  const p=f.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

// ===============================
// CARGAR EVENTOS
// ===============================
async function cargarEventos(){
  const s=sesion();

  let q=sb()
    .from("agenda_eventos")
    .select("*")
    .order("fecha_inicio",{ascending:true});

  const r=await q;

  if(r.error){
    alert("Error cargando agenda: "+r.error.message);
    return [];
  }

  return r.data || [];
}

// ===============================
// GUARDAR EVENTO
// ===============================
async function guardarEvento(){

  const s=sesion();

  const data={
    tipo:document.getElementById("ag_tipo").value,
    titulo:document.getElementById("ag_titulo").value.trim(),
    descripcion:document.getElementById("ag_desc").value.trim(),
    fecha_inicio:document.getElementById("ag_fecha").value,
    hora_inicio:document.getElementById("ag_hora").value,
    usuario_id:String(s.id||""),
    usuario:s.usuario||"",
    creado_por:s.usuario||"",
    estado:"activo",
    origen:"manual"
  };

  if(!data.titulo || !data.fecha_inicio){
    alert("Faltan datos");
    return;
  }

  const r=await sb()
    .from("agenda_eventos")
    .insert([data]);

  if(r.error){
    alert("Error guardando evento: "+r.error.message);
    return;
  }

  ZX_agenda();
}

// ===============================
// BORRAR
// ===============================
async function borrarEvento(id){

  if(!confirm("Eliminar evento")) return;

  const r=await sb()
    .from("agenda_eventos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando");
    return;
  }

  ZX_agenda();
}

// ===============================
// RENDER EVENTO
// ===============================
function renderEvento(e){
  return `
    <div class="zx_card">

      <h3>${limpiar(e.titulo)}</h3>

      <div class="zx_text">
        Fecha: <b>${formatoFecha(e.fecha_inicio)}</b><br>
        Hora: <b>${limpiar(e.hora_inicio||"--")}</b><br>
        Tipo: <b>${limpiar(e.tipo)}</b><br>
        ${e.descripcion ? "Desc: "+limpiar(e.descripcion)+"<br>" : ""}
        ${e.usuario ? "Usuario: "+limpiar(e.usuario) : ""}
      </div>

      <button class="zx_btn_big zx_rojo"
        onclick="ZX_borrarEvento('${e.id}')">
        Borrar
      </button>

    </div>
  `;
}

// ===============================
// FORMULARIO
// ===============================
function formulario(){
  return `
    <div class="zx_card">

      <h2>Nuevo evento</h2>

      <div class="zx_label">Tipo</div>
      <select id="ag_tipo" class="zx_input">
        <option value="recordatorio">Recordatorio</option>
        <option value="vacaciones">Vacaciones</option>
        <option value="permiso">Permiso</option>
        <option value="trabajo">Trabajo</option>
        <option value="cita">Cita</option>
      </select>

      <div class="zx_label">Título</div>
      <input id="ag_titulo" class="zx_input">

      <div class="zx_label">Descripción</div>
      <input id="ag_desc" class="zx_input">

      <div class="zx_label">Fecha</div>
      <input id="ag_fecha" type="date" class="zx_input" value="${hoy()}">

      <div class="zx_label">Hora</div>
      <input id="ag_hora" type="time" class="zx_input">

      <button class="zx_btn_big zx_verde"
        onclick="ZX_guardarEvento()">
        Guardar evento
      </button>

    </div>
  `;
}

// ===============================
// PANTALLA
// ===============================
window.ZX_agenda=async function(){

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
  });

  const eventos=await cargarEventos();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Agenda</h2>
      <div class="zx_text">
        Calendario global de empresa
      </div>
    </div>

    ${formulario()}

    ${
      eventos.length
      ? eventos.map(renderEvento).join("")
      : `<div class="zx_card">
          <div class="zx_text">Sin eventos</div>
         </div>`
    }
  `;
};

// ===============================
// ACCIONES GLOBAL
// ===============================
window.ZX_guardarEvento=guardarEvento;
window.ZX_borrarEvento=borrarEvento;

// ===============================
// FIN
// ===============================
})();