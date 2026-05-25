// ===============================
// ZENTRYX PRO - INICIO
// V3091 - DASHBOARD ADMIN / OPERARIO
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

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function hoy(){
  return new Date().toISOString().slice(0,10);
}

function formatoMin(min){
  min=Number(min||0);
  const h=Math.floor(min/60);
  const m=min%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

// ===============================
// DATOS
// ===============================
async function cargarAgendaHoy(){
  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",hoy())
    .gte("fecha_fin",hoy())
    .neq("estado","completado")
    .neq("estado","cancelado")
    .order("hora_inicio",{ascending:true})
    .limit(6);

  if(r.error) return [];
  return r.data || [];
}

async function cargarJornadasHoy(){
  let q=sb()
    .from("jornadas")
    .select("*")
    .eq("fecha",hoy());

  if(!esAdmin()){
    const s=sesion();
    q=q.eq("usuario_id",String(s.id));
  }

  const r=await q;

  if(r.error) return [];
  return r.data || [];
}

async function contarSolicitudes(){
  const r=await sb()
    .from("solicitudes_laborales")
    .select("id",{count:"exact",head:true})
    .eq("estado","pendiente");

  if(r.error) return 0;
  return r.count || 0;
}

async function contarHorasExtra(){
  const r=await sb()
    .from("horas_extra_pro")
    .select("id",{count:"exact",head:true})
    .in("estado",["pendiente","validada_usuario","validada_admin"]);

  if(r.error) return 0;
  return r.count || 0;
}

// ===============================
// RENDER
// ===============================
function renderAgenda(lista){
  if(!lista.length){
    return `<div class="zx_text">Sin eventos hoy.</div>`;
  }

  return lista.map(e=>{
    const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "--:--";
    const icono=e.tipo==="recordatorio" ? "📝" : "📅";

    return `
      <div class="zx_list_item">
        <div class="zx_list_title">
          ${icono} ${limpiar(hora)} · ${limpiar(e.titulo || "Evento")}
        </div>

        ${
          e.descripcion
          ? `<div class="zx_list_desc">${limpiar(e.descripcion)}</div>`
          : ""
        }

        ${
          e.usuario
          ? `<div class="zx_list_meta">Operario: ${limpiar(e.usuario)}</div>`
          : ""
        }
      </div>
    `;
  }).join("");
}

function renderResumenJornadas(jornadas){
  let abiertas=0;
  let cerradas=0;
  let trabajado=0;
  let extra=0;

  jornadas.forEach(j=>{
    if(j.estado==="abierta") abiertas++;
    if(j.estado==="cerrada") cerradas++;
    trabajado+=Number(j.minutos_trabajados||0);
    extra+=Number(j.minutos_extra||j.horas_extra||0);
  });

  return `
    <div class="zx_home_stats">
      <div>
        <b>${jornadas.length}</b>
        <span>Jornadas</span>
      </div>
      <div>
        <b>${abiertas}</b>
        <span>Abiertas</span>
      </div>
      <div>
        <b>${formatoMin(trabajado)}</b>
        <span>Trabajado</span>
      </div>
      <div>
        <b>${formatoMin(extra)}</b>
        <span>Extra</span>
      </div>
    </div>
  `;
}

function renderAccionesAdmin(sol,extra){
  return `
    <div class="zx_card">
      <h3>Control rápido</h3>

      <div class="zx_home_grid">
        <button class="zx_home_btn rojo" onclick="ZX_abrirFichaje()">Fichaje</button>
        <button class="zx_home_btn azul" onclick="ZX_usuarios()">Usuarios</button>
        <button class="zx_home_btn morado" onclick="ZX_abrirAgenda()">Agenda</button>
        <button class="zx_home_btn gris" onclick="ZX_configuracion()">Config.</button>
      </div>

      ${
        sol>0
        ? `<button class="zx_btn_big zx_naranja" onclick="ZX_solicitudes()">Solicitudes pendientes: ${sol}</button>`
        : ""
      }

      ${
        extra>0
        ? `<button class="zx_btn_big zx_morado" onclick="ZX_horas_extra()">Horas extra pendientes: ${extra}</button>`
        : ""
      }
    </div>
  `;
}

function renderAccionesOperario(){
  return `
    <div class="zx_card">
      <h3>Mis acciones</h3>

      <button class="zx_btn_big zx_rojo" onclick="ZX_abrirFichaje()">Fichar</button>
      <button class="zx_btn_big zx_morado" onclick="ZX_abrirAgenda()">Mi agenda</button>
      <button class="zx_btn_big zx_azul" onclick="ZX_horas_extra()">Mis horas extra</button>
    </div>
  `;
}

function estilosInicio(){
  if(document.getElementById("zx_inicio_css")) return;

  const s=document.createElement("style");
  s.id="zx_inicio_css";

  s.innerHTML=`
    .zx_home_stats{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
      margin-top:12px;
    }

    .zx_home_stats div{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      text-align:center;
    }

    .zx_home_stats b{
      display:block;
      font-size:24px;
      font-weight:900;
      color:#0f172a;
    }

    .zx_home_stats span{
      display:block;
      margin-top:4px;
      font-size:13px;
      font-weight:900;
      color:#64748b;
    }

    .zx_home_grid{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
      margin-top:10px;
    }

    .zx_home_btn{
      border:0;
      border-radius:20px;
      padding:18px 10px;
      color:white;
      font-size:18px;
      font-weight:900;
    }

    .zx_home_btn.rojo{background:#dc2626}
    .zx_home_btn.azul{background:#2563eb}
    .zx_home_btn.morado{background:#7c3aed}
    .zx_home_btn.gris{background:#64748b}

    @media(min-width:720px){
      .zx_home_stats{
        grid-template-columns:repeat(4,1fr);
      }

      .zx_home_grid{
        grid-template-columns:repeat(4,1fr);
      }
    }
  `;

  document.head.appendChild(s);
}

// ===============================
// PANTALLA
// ===============================
window.ZENTRYX_UI_inicio=async function(){
  estilosInicio();

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio") b.classList.add("zx_activo");
  });

  const agenda=await cargarAgendaHoy();
  const jornadas=await cargarJornadasHoy();
  const solicitudes=esAdmin() ? await contarSolicitudes() : 0;
  const horasExtra=esAdmin() ? await contarHorasExtra() : 0;

  app().innerHTML=`
    <div class="zx_card">
      <h2>Inicio</h2>
      <div class="zx_text">
        ${esAdmin() ? "Panel de control diario." : "Tu jornada y tareas de hoy."}
      </div>
    </div>

    <div class="zx_card">
      <h3>Agenda hoy</h3>
      ${renderAgenda(agenda)}
      <button class="zx_btn_big zx_gris" onclick="ZX_abrirAgenda()">Ver agenda completa</button>
    </div>

    <div class="zx_card">
      <h3>${esAdmin() ? "Resumen empresa hoy" : "Mi jornada hoy"}</h3>
      ${renderResumenJornadas(jornadas)}
    </div>

    ${
      esAdmin()
      ? renderAccionesAdmin(solicitudes,horasExtra)
      : renderAccionesOperario()
    }
  `;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

})();