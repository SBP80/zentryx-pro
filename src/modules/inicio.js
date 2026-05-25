// ===============================
// ZENTRYX PRO - INICIO
// V3090 - DASHBOARD LIMPIO + ADAPTATIVO
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

// ===============================
// SESIÓN
// ===============================
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
// UTILIDADES
// ===============================
function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatoMin(min){
  min=Number(min||0);
  const h=Math.floor(min/60);
  const m=min%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

// ===============================
// AGENDA HOY
// ===============================
async function agendaHoy(){

  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",hoy)
    .gte("fecha_fin",hoy)
    .neq("estado","completado")
    .neq("estado","cancelado")
    .order("hora_inicio",{ascending:true})
    .limit(5);

  if(r.error) return [];

  return r.data || [];
}

function renderAgenda(lista){

  if(!lista.length){
    return `
      <div class="zx_text">
        Sin eventos hoy
      </div>
    `;
  }

  return lista.map(e=>{

    const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "--:--";

    return `
      <div style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:900;font-size:18px;">
          ${limpiar(hora)} · ${limpiar(e.titulo || "Evento")}
        </div>

        ${
          e.descripcion
          ? `<div class="zx_text">${limpiar(e.descripcion)}</div>`
          : ""
        }
      </div>
    `;

  }).join("");
}

// ===============================
// RESUMEN HOY (FICHAJE)
// ===============================
async function resumenHoy(){

  const s=sesion();
  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("fecha",hoy);

  if(r.error || !r.data) return {min:0,extra:0};

  let min=0;
  let extra=0;

  r.data.forEach(j=>{
    min+=Number(j.minutos || 0);
    extra+=Number(j.minutos_extra || 0);
  });

  return {min,extra};
}

// ===============================
// ACCIONES RÁPIDAS
// ===============================
function acciones(){

  if(esAdmin()){
    return `
      <div class="zx_card">
        <h3>Acciones</h3>

        <button class="zx_btn_big zx_rojo" onclick="ZX_abrirFichaje()">Fichar</button>
        <button class="zx_btn_big zx_azul" onclick="ZX_usuarios()">Usuarios</button>
        <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">Agenda</button>
      </div>
    `;
  }

  return `
    <div class="zx_card">
      <h3>Acciones</h3>

      <button class="zx_btn_big zx_rojo" onclick="ZX_abrirFichaje()">Fichar</button>
      <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">Mi agenda</button>
    </div>
  `;
}

// ===============================
// RENDER PRINCIPAL
// ===============================
window.ZENTRYX_UI_inicio=async function(){

  const agenda=await agendaHoy();
  const resumen=await resumenHoy();

  app().innerHTML=`

    <!-- CABECERA -->
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">
        Todo listo para trabajar
      </div>
    </div>

    <!-- AGENDA -->
    <div class="zx_card">
      <h3>Agenda hoy</h3>

      ${renderAgenda(agenda)}

      <button class="zx_btn zx_gris" onclick="ZX_abrirAgenda()">
        Ver agenda completa
      </button>
    </div>

    <!-- RESUMEN SOLO OPERARIO -->
    ${
      !esAdmin()
      ? `
        <div class="zx_card">
          <h3>Hoy</h3>

          <div class="zx_text">
            Trabajado: <b>${formatoMin(resumen.min)}</b><br>
            Horas extra: <b>${formatoMin(resumen.extra)}</b>
          </div>
        </div>
      `
      : ""
    }

    <!-- ACCIONES -->
    ${acciones()}

  `;
};

})();