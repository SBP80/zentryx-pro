// ===============================
// ZENTRYX PRO - INICIO
// V3103
// ===============================
(function(){
"use strict";

const ZX_VERSION="3103";
const CACHE_KEY="zentryx_cache_inicio";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function zx(){
  return window.ZENTRYX || window.ZX || null;
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function"){
    return zx().usuarioActual();
  }

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

function guardarCache(data){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(data || {}))}
  catch(e){}
}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}")}
  catch(e){return {}}
}

async function safeQuery(fn,fallback){
  if(!navigator.onLine || !sb()) return fallback;

  try{
    const r=await fn();
    if(r && r.error) return fallback;
    return r && "data" in r ? (r.data || fallback) : fallback;
  }catch(e){
    return fallback;
  }
}

async function cargarAgendaHoy(){
  return safeQuery(function(){
    return sb()
      .from("agenda_eventos")
      .select("*")
      .lte("fecha_inicio",hoy())
      .gte("fecha_fin",hoy())
      .neq("estado","completado")
      .neq("estado","cancelado")
      .order("hora_inicio",{ascending:true})
      .limit(6);
  },[]);
}

async function cargarJornadasHoy(){
  if(!sb()) return [];

  try{
    let q=sb()
      .from("jornadas")
      .select("*")
      .eq("fecha",hoy());

    if(!esAdmin()){
      q=q.eq("usuario_id",String(sesion().id || ""));
    }

    const r=await q;
    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function contar(tabla,filtro){
  if(!navigator.onLine || !sb()) return 0;

  try{
    let q=sb().from(tabla).select("id",{count:"exact",head:true});
    if(typeof filtro==="function") q=filtro(q);
    const r=await q;
    return r.error ? 0 : (r.count || 0);
  }catch(e){
    return 0;
  }
}

async function cargarDashboard(){
  const cache=leerCache();

  const data={
    agenda:await cargarAgendaHoy(),
    jornadas:await cargarJornadasHoy(),
    solicitudes:esAdmin() ? await contar("solicitudes_laborales",q=>q.eq("estado","pendiente")) : 0,
    horasExtra:esAdmin() ? await contar("horas_extra_pro",q=>q.in("estado",["pendiente","validada_usuario","validada_admin"])) : 0,
    clientes:await contar("clientes"),
    trabajosHoy:await contar("agenda_eventos",q=>q.eq("tipo","trabajo").lte("fecha_inicio",hoy()).gte("fecha_fin",hoy()).neq("estado","cancelado")),
    vehiculosUso:await contar("vehiculos",q=>q.eq("en_uso",true)),
    actualizado:new Date().toISOString()
  };

  const hayDatos=Object.values(data).some(v=>Array.isArray(v) ? v.length : Number(v||0)>0);

  if(hayDatos || navigator.onLine){
    guardarCache(data);
    return data;
  }

  return Object.assign({
    agenda:[],
    jornadas:[],
    solicitudes:0,
    horasExtra:0,
    clientes:0,
    trabajosHoy:0,
    vehiculosUso:0
  },cache);
}

function calcularJornadas(jornadas){
  let abiertas=0;
  let trabajado=0;
  let extra=0;

  jornadas.forEach(j=>{
    if(j.estado==="abierta") abiertas++;
    trabajado+=Number(j.minutos_trabajados||0);
    extra+=Number(j.minutos_extra||j.horas_extra||0);
  });

  return {
    total:jornadas.length,
    abiertas,
    trabajado,
    extra
  };
}

function renderAgenda(lista){
  if(!lista.length){
    return `<div class="zx_home_empty">Sin eventos hoy.</div>`;
  }

  return lista.map(e=>{
    const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "--:--";
    const tipo=e.tipo==="trabajo" ? "Trabajo" : e.tipo==="recordatorio" ? "Nota" : "Evento";
    const color=e.tipo==="trabajo" ? "orange" : e.tipo==="recordatorio" ? "green" : "blue";

    return `
      <div class="zx_home_event">
        <div class="zx_home_event_time">${limpiar(hora)}</div>
        <div class="zx_home_event_body">
          <b>${limpiar(e.titulo || "Evento")}</b>
          ${e.descripcion ? `<span>${limpiar(e.descripcion)}</span>` : ""}
          ${e.usuario ? `<small>${limpiar(e.usuario)}</small>` : ""}
        </div>
        <em class="${color}">${tipo}</em>
      </div>
    `;
  }).join("");
}

function renderKPIs(data){
  const j=calcularJornadas(data.jornadas);

  return `
    <div class="zx_home_kpis">
      <div class="zx_home_kpi">
        <span class="zx_home_icon blue">📈</span>
        <small>Trabajos hoy</small>
        <b>${limpiar(data.trabajosHoy || 0)}</b>
      </div>
      <div class="zx_home_kpi">
        <span class="zx_home_icon green">👥</span>
        <small>Clientes</small>
        <b>${limpiar(data.clientes || 0)}</b>
      </div>
      <div class="zx_home_kpi">
        <span class="zx_home_icon orange">⏱</span>
        <small>Horas hoy</small>
        <b>${formatoMin(j.trabajado)}</b>
      </div>
      <div class="zx_home_kpi">
        <span class="zx_home_icon purple">🚗</span>
        <small>Vehículos en uso</small>
        <b>${limpiar(data.vehiculosUso || 0)}</b>
      </div>
    </div>
  `;
}

function renderJornada(data){
  const j=calcularJornadas(data.jornadas);

  return `
    <div class="zx_home_stats">
      <div><b>${j.total}</b><span>Jornadas</span></div>
      <div><b>${j.abiertas}</b><span>Abiertas</span></div>
      <div><b>${formatoMin(j.trabajado)}</b><span>Trabajado</span></div>
      <div><b>${formatoMin(j.extra)}</b><span>Extra</span></div>
    </div>
  `;
}

function renderOperativa(){
  return `
    <div class="zx_home_ops">
      <div>
        <span>🌦</span>
        <b>Clima por obra</b>
        <small>Preparado para tiempo actual y previsión por dirección.</small>
      </div>
      <div>
        <span>🚦</span>
        <b>Tráfico y rutas</b>
        <small>Base lista para tiempos de llegada y ruta a cada trabajo.</small>
      </div>
      <div>
        <span>🎙</span>
        <b>Modo voz</b>
        <small>Preparado para añadir material, notas e incidencias hablando.</small>
      </div>
    </div>
  `;
}

function renderAccionesAdmin(data){
  return `
    <div class="zx_home_actions">
      <button class="blue" onclick="ZX_abrirFichaje()">Fichaje</button>
      <button class="green" onclick="ZX_usuarios()">Usuarios</button>
      <button class="purple" onclick="ZX_abrirAgenda()">Agenda</button>
      <button class="gray" onclick="ZX_configuracion()">Ajustes</button>
      ${data.solicitudes>0 ? `<button class="orange wide" onclick="ZX_solicitudes()">Solicitudes pendientes: ${data.solicitudes}</button>` : ""}
      ${data.horasExtra>0 ? `<button class="purple wide" onclick="ZX_abrirHorasExtra()">Horas extra pendientes: ${data.horasExtra}</button>` : ""}
    </div>
  `;
}

function renderAccionesOperario(){
  return `
    <div class="zx_home_actions">
      <button class="red" onclick="ZX_abrirFichaje()">Fichar</button>
      <button class="purple" onclick="ZX_abrirAgenda()">Mi agenda</button>
      <button class="blue" onclick="ZX_abrirHorasExtra()">Mis horas</button>
      <button class="green" onclick="ZX_abrirTrabajos()">Trabajos</button>
    </div>
  `;
}

function estilosInicio(){
  if(document.getElementById("zx_inicio_css")) return;

  const s=document.createElement("style");
  s.id="zx_inicio_css";
  s.innerHTML=`
    .zx_home_shell{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
    }
    .zx_home_hero{
      background:linear-gradient(135deg,#ffffff,#f8fbff);
      border:1px solid #dbe3ef;
      border-radius:28px;
      padding:24px;
      box-shadow:0 14px 32px rgba(15,23,42,.07);
    }
    .zx_home_hero h2{
      margin:0;
      font-size:30px;
      font-weight:950;
      color:#071330;
      letter-spacing:-.4px;
    }
    .zx_home_hero p{
      margin:8px 0 0;
      color:#64748b;
      font-size:16px;
      font-weight:800;
      line-height:1.35;
    }
    .zx_home_kpis{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:12px;
    }
    .zx_home_kpi{
      background:#fff;
      border:1px solid #dbe3ef;
      border-radius:22px;
      padding:16px;
      box-shadow:0 10px 24px rgba(15,23,42,.06);
    }
    .zx_home_icon{
      width:42px;
      height:42px;
      border-radius:14px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:22px;
      margin-bottom:12px;
    }
    .zx_home_icon.blue{background:#2563eb}
    .zx_home_icon.green{background:#16a34a}
    .zx_home_icon.orange{background:#f97316}
    .zx_home_icon.purple{background:#7c3aed}
    .zx_home_kpi small{
      display:block;
      color:#64748b;
      font-size:13px;
      font-weight:900;
    }
    .zx_home_kpi b{
      display:block;
      margin-top:5px;
      color:#071330;
      font-size:28px;
      font-weight:950;
    }
    .zx_home_panel{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:28px;
      padding:22px;
      box-shadow:0 14px 32px rgba(15,23,42,.07);
    }
    .zx_home_panel h3{
      margin:0 0 16px;
      color:#071330;
      font-size:23px;
      font-weight:950;
    }
    .zx_home_event{
      display:grid;
      grid-template-columns:54px 1fr auto;
      gap:12px;
      align-items:start;
      padding:13px 0;
      border-bottom:1px solid #edf2f7;
    }
    .zx_home_event:last-child{border-bottom:0}
    .zx_home_event_time{
      color:#2563eb;
      font-size:14px;
      font-weight:950;
    }
    .zx_home_event_body b{
      display:block;
      color:#071330;
      font-size:15px;
      font-weight:950;
    }
    .zx_home_event_body span{
      display:block;
      margin-top:3px;
      color:#64748b;
      font-size:13px;
      font-weight:750;
    }
    .zx_home_event_body small{
      display:block;
      margin-top:5px;
      color:#94a3b8;
      font-size:12px;
      font-weight:850;
    }
    .zx_home_event em{
      border-radius:999px;
      padding:6px 9px;
      font-size:11px;
      font-style:normal;
      font-weight:950;
      white-space:nowrap;
    }
    .zx_home_event em.blue{background:#dbeafe;color:#1d4ed8}
    .zx_home_event em.green{background:#dcfce7;color:#166534}
    .zx_home_event em.orange{background:#ffedd5;color:#c2410c}
    .zx_home_empty{
      color:#64748b;
      font-weight:850;
      padding:12px 0;
    }
    .zx_home_stats{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }
    .zx_home_stats div{
      background:#f8fafc;
      border:1px solid #dbe3ef;
      border-radius:18px;
      padding:14px;
      text-align:center;
    }
    .zx_home_stats b{
      display:block;
      font-size:24px;
      font-weight:950;
      color:#071330;
    }
    .zx_home_stats span{
      display:block;
      margin-top:4px;
      font-size:13px;
      font-weight:900;
      color:#64748b;
    }
    .zx_home_actions{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }
    .zx_home_actions button{
      border:0;
      border-radius:18px;
      padding:17px 12px;
      color:white;
      font-size:17px;
      font-weight:950;
    }
    .zx_home_actions .wide{grid-column:1/-1}
    .zx_home_actions .red{background:#dc2626}
    .zx_home_actions .blue{background:#2563eb}
    .zx_home_actions .green{background:#16a34a}
    .zx_home_actions .purple{background:#7c3aed}
    .zx_home_actions .orange{background:#f97316}
    .zx_home_actions .gray{background:#64748b}
    .zx_home_ops{
      display:grid;
      grid-template-columns:1fr;
      gap:12px;
    }
    .zx_home_ops div{
      background:#f8fafc;
      border:1px solid #dbe3ef;
      border-radius:20px;
      padding:15px;
      display:grid;
      grid-template-columns:42px 1fr;
      column-gap:12px;
      align-items:center;
    }
    .zx_home_ops span{
      width:42px;
      height:42px;
      border-radius:14px;
      background:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:23px;
      box-shadow:0 8px 18px rgba(15,23,42,.07);
      grid-row:span 2;
    }
    .zx_home_ops b{
      color:#071330;
      font-size:15px;
      font-weight:950;
    }
    .zx_home_ops small{
      color:#64748b;
      font-size:13px;
      font-weight:800;
      line-height:1.35;
    }
    @media(min-width:760px){
      .zx_home_shell{
        grid-template-columns:1.25fr .75fr;
      }
      .zx_home_full{grid-column:1/-1}
      .zx_home_kpis{grid-template-columns:repeat(4,1fr)}
      .zx_home_stats{grid-template-columns:repeat(4,1fr)}
      .zx_home_ops{grid-template-columns:repeat(3,1fr)}
    }
  `;
  document.head.appendChild(s);
}

window.ZENTRYX_UI_inicio=async function(){
  estilosInicio();

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio") b.classList.add("zx_activo");
  });

  const s=sesion();
  const nombre=s.nombre || s.usuario || "Sergio";

  app().innerHTML=`
    <div class="zx_home_hero">
      <h2>Hola, ${limpiar(nombre)} 👋</h2>
      <p>Cargando panel diario...</p>
    </div>
  `;

  const data=await cargarDashboard();

  app().innerHTML=`
    <div class="zx_home_shell">
      <div class="zx_home_hero zx_home_full">
        <h2>${esAdmin() ? "Panel diario" : "Mi día de trabajo"} 👋</h2>
        <p>${esAdmin() ? "Resumen de empresa, agenda, personal y avisos." : "Tu jornada, tareas y avisos de hoy."}</p>
      </div>

      <div class="zx_home_full">
        ${renderKPIs(data)}
      </div>

      <div class="zx_home_panel">
        <h3>Agenda de hoy</h3>
        ${renderAgenda(data.agenda)}
        <button class="zx_btn_big zx_azul" onclick="ZX_abrirAgenda()">Ver agenda completa</button>
      </div>

      <div class="zx_home_panel">
        <h3>${esAdmin() ? "Jornadas de hoy" : "Mi jornada"}</h3>
        ${renderJornada(data)}
      </div>

      <div class="zx_home_panel zx_home_full">
        <h3>Centro diario</h3>
        ${renderOperativa()}
      </div>

      <div class="zx_home_panel zx_home_full">
        <h3>Accesos rápidos</h3>
        ${esAdmin() ? renderAccionesAdmin(data) : renderAccionesOperario()}
      </div>
    </div>
  `;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio){
    window.ZENTRYX_UI_inicio();
  }
};

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("inicio",{
    nombre:"Inicio",
    activo:true,
    version:ZX_VERSION
  });
}

})();