// ===============================
// ZENTRYX PRO - INICIO PRO
// V3089 - LIMPIO + AGENDA + ACCIÓN
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

// ===============================
// CARGAR AGENDA HOY
// ===============================
async function cargarHoy(){
  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .eq("fecha_inicio",hoy)
    .neq("estado","completado")
    .order("hora_inicio",{ascending:true})
    .limit(5);

  if(r.error) return [];

  return r.data || [];
}

// ===============================
// RENDER AGENDA
// ===============================
function renderAgenda(lista){

  if(!lista.length){
    return `
      <div class="zx_card">
        <h3>Agenda hoy</h3>
        <div class="zx_text">Sin tareas para hoy</div>

        <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">
          Abrir agenda
        </button>
      </div>
    `;
  }

  return `
    <div class="zx_card">
      <h3>Agenda hoy</h3>

      ${lista.map(e=>`
        <div style="
          padding:12px;
          border-bottom:1px solid #e5e7eb;
        ">
          <div style="font-weight:900;">
            ${e.hora_inicio ? e.hora_inicio.slice(0,5)+" · " : ""}
            ${e.titulo || "Evento"}
          </div>

          ${
            e.descripcion
            ? `<div style="color:#64748b;font-size:14px;margin-top:4px;">
                ${e.descripcion}
               </div>`
            : ""
          }
        </div>
      `).join("")}

      <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">
        Ver agenda completa
      </button>
    </div>
  `;
}

// ===============================
// ACCIONES RÁPIDAS
// ===============================
function acciones(){

  return `
    <div class="zx_card">
      <h3>Acciones</h3>

      <button class="zx_btn_big zx_rojo" onclick="ZX_abrirFichaje()">
        Fichar
      </button>

      ${
        esAdmin()
        ? `
          <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">
            Usuarios
          </button>

          <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">
            Agenda
          </button>
        `
        : `
          <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">
            Mi agenda
          </button>
        `
      }
    </div>
  `;
}

// ===============================
// RESUMEN SIMPLE
// ===============================
async function resumen(){

  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("jornadas")
    .select("minutos_trabajados,minutos_extra")
    .eq("fecha",hoy);

  if(r.error) return "";

  let trab=0;
  let extra=0;

  (r.data||[]).forEach(j=>{
    trab+=Number(j.minutos_trabajados||0);
    extra+=Number(j.minutos_extra||0);
  });

  function fmt(m){
    const h=Math.floor(m/60);
    const mm=m%60;
    return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0");
  }

  return `
    <div class="zx_card">
      <h3>Hoy</h3>

      <div class="zx_text">
        Trabajado: <b>${fmt(trab)}</b><br>
        Horas extra: <b>${fmt(extra)}</b>
      </div>
    </div>
  `;
}

// ===============================
// MAIN
// ===============================
window.ZENTRYX_UI_inicio=async function(){

  const agenda=await cargarHoy();
  const res=await resumen();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">Todo listo para trabajar</div>
    </div>

    ${renderAgenda(agenda)}

    ${acciones()}

    ${res}
  `;
};

})();