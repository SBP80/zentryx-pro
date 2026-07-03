// ===============================
// ZENTRYX PRO - INICIO
// V3106 - CENTRO DIARIO RESPONSIVE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3106";
const CACHE_KEY="zentryx_cache_inicio_v3106";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function zx(){
  return window.ZENTRYX || window.ZX || null;
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function"){
    return zx().usuarioActual();
  }

  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function esAdmin(){
  const s=sesion();
  return String(s.rol || "").toLowerCase()==="administrador" ||
         String(s.usuario || "").toLowerCase()==="admin";
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
  min=Number(min || 0);
  const h=Math.floor(min/60);
  const m=min%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

function guardarCache(data){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify(data || {}));
  }catch(e){}
}

function leerCache(){
  try{
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  }catch(e){
    return {};
  }
}

async function safeQuery(fn,fallback){
  const cliente=sb();

  if(!navigator.onLine || !cliente){
    return fallback;
  }

  try{
    const r=await fn(cliente);
    if(r && r.error) return fallback;
    return r && "data" in r ? (r.data || fallback) : fallback;
  }catch(e){
    return fallback;
  }
}

async function safeCount(tabla,fn){
  const cliente=sb();

  if(!navigator.onLine || !cliente){
    return 0;
  }

  try{
    let q=cliente.from(tabla).select("id",{count:"exact",head:true});
    if(typeof fn==="function") q=fn(q);
    const r=await q;
    return r.error ? 0 : (r.count || 0);
  }catch(e){
    return 0;
  }
}

async function cargarAgendaHoy(){
  return safeQuery(function(cliente){
    return cliente
      .from("agenda_eventos")
      .select("*")
      .lte("fecha_inicio",hoy())
      .gte("fecha_fin",hoy())
      .neq("estado","completado")
      .neq("estado","cancelado")
      .order("hora_inicio",{ascending:true})
      .limit(5);
  },[]);
}

async function cargarJornadasHoy(){
  const cliente=sb();

  if(!navigator.onLine || !cliente){
    return [];
  }

  try{
    let q=cliente
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

async function cargarDashboard(){
  const cache=leerCache();

  const data={
    agenda:await cargarAgendaHoy(),
    jornadas:await cargarJornadasHoy(),
    clientes:await safeCount("clientes"),
    trabajosHoy:await safeCount("agenda_eventos",function(q){
      return q
        .eq("tipo","trabajo")
        .lte("fecha_inicio",hoy())
        .gte("fecha_fin",hoy())
        .neq("estado","cancelado");
    }),
    vehiculosUso:await safeCount("vehiculos",function(q){
      return q.eq("en_uso",true);
    }),
    solicitudes:esAdmin() ? await safeCount("solicitudes_laborales",function(q){
      return q.eq("estado","pendiente");
    }) : 0,
    horasExtra:esAdmin() ? await safeCount("horas_extra_pro",function(q){
      return q.in("estado",["pendiente","validada_usuario","validada_admin"]);
    }) : 0,
    actualizado:new Date().toISOString()
  };

  if(navigator.onLine){
    guardarCache(data);
    return data;
  }

  return Object.assign({
    agenda:[],
    jornadas:[],
    clientes:0,
    trabajosHoy:0,
    vehiculosUso:0,
    solicitudes:0,
    horasExtra:0
  },cache);
}

function resumenJornadas(jornadas){
  let abiertas=0;
  let trabajado=0;
  let extra=0;

  jornadas.forEach(function(j){
    if(j.estado==="abierta") abiertas++;
    trabajado+=Number(j.minutos_trabajados || 0);
    extra+=Number(j.minutos_extra || j.horas_extra || 0);
  });

  return {
    total:jornadas.length,
    abiertas:abiertas,
    trabajado:trabajado,
    extra:extra
  };
}

function kpi(icono,label,valor,clase){
  return `
    <div class="zx_home_kpi">
      <div class="zx_home_kpi_icon ${clase || ""}">${icono}</div>
      <div class="zx_home_kpi_label">${limpiar(label)}</div>
      <div class="zx_home_kpi_value">${limpiar(valor)}</div>
    </div>
  `;
}

function renderKPIs(data){
  const j=resumenJornadas(data.jornadas);

  return `
    <section class="zx_home_kpis">
      ${kpi("📈","Trabajos hoy",data.trabajosHoy || 0,"blue")}
      ${kpi("👥","Clientes",data.clientes || 0,"green")}
      ${kpi("⏱️","Horas hoy",formatoMin(j.trabajado),"orange")}
      ${kpi("🚗","Vehículos en uso",data.vehiculosUso || 0,"purple")}
    </section>
  `;
}

function renderAgenda(lista){
  if(!lista.length){
    return `<div class="zx_home_empty">Sin eventos hoy.</div>`;
  }

  return lista.map(function(e){
    const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "--:--";
    const tipo=e.tipo==="trabajo" ? "Trabajo" : e.tipo==="recordatorio" ? "Nota" : "Evento";
    const clase=e.tipo==="trabajo" ? "orange" : e.tipo==="recordatorio" ? "green" : "blue";

    return `
      <div class="zx_home_event">
        <div class="zx_home_event_time">${limpiar(hora)}</div>
        <div class="zx_home_event_body">
          <b>${limpiar(e.titulo || "Evento")}</b>
          ${e.descripcion ? `<span>${limpiar(e.descripcion)}</span>` : ""}
        </div>
        <div class="zx_home_event_tag ${clase}">${tipo}</div>
      </div>
    `;
  }).join("");
}

function renderJornadas(data){
  const j=resumenJornadas(data.jornadas);

  return `
    <div class="zx_home_stats">
      <div><b>${j.total}</b><span>Jornadas</span></div>
      <div><b>${j.abiertas}</b><span>Abiertas</span></div>
      <div><b>${formatoMin(j.trabajado)}</b><span>Trabajado</span></div>
      <div><b>${formatoMin(j.extra)}</b><span>Extra</span></div>
    </div>
  `;
}

function renderCentroDiario(){
  return `
    <div class="zx_home_ops">
      <div class="zx_home_op">
        <span>🌦️</span>
        <div>
          <b>Clima por obra</b>
          <small>Preparado para previsión por dirección.</small>
        </div>
      </div>

      <div class="zx_home_op">
        <span>🚦</span>
        <div>
          <b>Tráfico y rutas</b>
          <small>Base lista para tiempos de llegada.</small>
        </div>
      </div>

      <div class="zx_home_op">
        <span>🎙️</span>
        <div>
          <b>Modo voz</b>
          <small>Materiales, notas e incidencias hablando.</small>
        </div>
      </div>
    </div>
  `;
}

function renderAcciones(data){
  if(esAdmin()){
    return `
      <div class="zx_home_actions">
        <button class="blue" onclick="ZX_abrirFichaje()">Fichaje</button>
        <button class="green" onclick="ZX_usuarios()">Usuarios</button>
        <button class="purple" onclick="ZX_abrirAgenda()">Agenda</button>
        <button class="gray" onclick="ZX_configuracion()">Ajustes</button>
        ${data.horasExtra>0 ? `<button class="wide purple" onclick="ZX_abrirHorasExtra()">Horas extra pendientes: ${data.horasExtra}</button>` : ""}
        ${data.solicitudes>0 ? `<button class="wide orange" onclick="ZX_solicitudes()">Solicitudes pendientes: ${data.solicitudes}</button>` : ""}
      </div>
    `;
  }

  return `
    <div class="zx_home_actions">
      <button class="blue" onclick="ZX_abrirFichaje()">Fichar</button>
      <button class="purple" onclick="ZX_abrirAgenda()">Mi agenda</button>
      <button class="green" onclick="ZX_abrirTrabajos()">Trabajos</button>
      <button class="gray" onclick="ZX_abrirHorasExtra()">Horas</button>
    </div>
  `;
}

function estilosInicio(){
  const old=document.getElementById("zx_inicio_css");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_inicio_css";
  s.innerHTML=`
    #app{
      padding-bottom:calc(env(safe-area-inset-bottom) + 118px);
    }

    .zx_home{
      display:grid;
      grid-template-columns:1fr;
      gap:14px;
    }

    .zx_home_hero{
      background:linear-gradient(135deg,#ffffff,#f8fbff);
      border:1px solid #dbe3ef;
      border-radius:26px;
      padding:20px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
      position:relative;
      overflow:hidden;
    }

    .zx_home_hero h2{
      margin:0;
      color:#071330;
      font-size:28px;
      line-height:1.08;
      font-weight:950;
      letter-spacing:-.5px;
    }

    .zx_home_hero p{
      margin:8px 0 0;
      color:#64748b;
      font-size:15px;
      line-height:1.35;
      font-weight:850;
    }

    .zx_home_kpis{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
    }

    .zx_home_kpi{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:24px;
      padding:16px;
      min-height:148px;
      box-shadow:0 10px 24px rgba(15,23,42,.055);
      display:flex;
      flex-direction:column;
      justify-content:space-between;
    }

    .zx_home_kpi_icon{
      width:48px;
      height:48px;
      border-radius:16px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:25px;
      box-shadow:0 8px 18px rgba(15,23,42,.06);
    }

    .zx_home_kpi_icon.blue{background:#dbeafe}
    .zx_home_kpi_icon.green{background:#dcfce7}
    .zx_home_kpi_icon.orange{background:#ffedd5}
    .zx_home_kpi_icon.purple{background:#f3e8ff}

    .zx_home_kpi_label{
      color:#64748b;
      font-size:15px;
      font-weight:900;
      line-height:1.2;
      margin-top:14px;
    }

    .zx_home_kpi_value{
      color:#071330;
      font-size:32px;
      line-height:1;
      font-weight:950;
      letter-spacing:-.4px;
      margin-top:8px;
    }

    .zx_home_panel{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:26px;
      padding:20px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
      overflow:hidden;
    }

    .zx_home_panel h3{
      margin:0 0 14px;
      color:#071330;
      font-size:25px;
      line-height:1.1;
      font-weight:950;
      letter-spacing:-.35px;
    }

    .zx_home_empty{
      color:#64748b;
      font-size:16px;
      font-weight:850;
      padding:8px 0 12px;
    }

    .zx_home_event{
      display:grid;
      grid-template-columns:48px minmax(0,1fr) auto;
      gap:10px;
      align-items:start;
      padding:12px 0;
      border-bottom:1px solid #edf2f7;
    }

    .zx_home_event:last-child{
      border-bottom:0;
    }

    .zx_home_event_time{
      color:#2563eb;
      font-size:13px;
      font-weight:950;
      padding-top:2px;
    }

    .zx_home_event_body b{
      display:block;
      color:#071330;
      font-size:15px;
      line-height:1.25;
      font-weight:950;
    }

    .zx_home_event_body span{
      display:block;
      color:#64748b;
      font-size:13px;
      line-height:1.35;
      font-weight:800;
      margin-top:3px;
    }

    .zx_home_event_tag{
      border-radius:999px;
      padding:6px 8px;
      font-size:11px;
      font-weight:950;
      white-space:nowrap;
    }

    .zx_home_event_tag.blue{background:#dbeafe;color:#1d4ed8}
    .zx_home_event_tag.green{background:#dcfce7;color:#166534}
    .zx_home_event_tag.orange{background:#ffedd5;color:#c2410c}

    .zx_home_stats{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }

    .zx_home_stats div{
      background:#f8fafc;
      border:1px solid #dbe3ef;
      border-radius:18px;
      padding:14px 10px;
      text-align:center;
    }

    .zx_home_stats b{
      display:block;
      font-size:25px;
      line-height:1;
      font-weight:950;
      color:#071330;
    }

    .zx_home_stats span{
      display:block;
      margin-top:6px;
      font-size:13px;
      font-weight:900;
      color:#64748b;
    }

    .zx_home_ops{
      display:grid;
      grid-template-columns:1fr;
      gap:10px;
    }

    .zx_home_op{
      background:#f8fafc;
      border:1px solid #dbe3ef;
      border-radius:20px;
      padding:13px;
      display:grid;
      grid-template-columns:46px minmax(0,1fr);
      gap:12px;
      align-items:center;
    }

    .zx_home_op span{
      width:46px;
      height:46px;
      border-radius:16px;
      background:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:23px;
      box-shadow:0 8px 18px rgba(15,23,42,.06);
    }

    .zx_home_op b{
      color:#071330;
      font-size:16px;
      line-height:1.2;
      font-weight:950;
    }

    .zx_home_op small{
      display:block;
      color:#64748b;
      font-size:13px;
      line-height:1.3;
      font-weight:800;
      margin-top:3px;
    }

    .zx_home_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }

    .zx_home_actions button{
      border:0;
      border-radius:18px;
      min-height:58px;
      padding:14px 10px;
      color:white;
      font-size:18px;
      line-height:1.1;
      font-weight:950;
    }

    .zx_home_actions .wide{
      grid-column:1/-1;
    }

    .zx_home_actions .blue{background:#2563eb}
    .zx_home_actions .green{background:#16a34a}
    .zx_home_actions .purple{background:#7c3aed}
    .zx_home_actions .gray{background:#64748b}
    .zx_home_actions .orange{background:#f97316}

    .zx_home_btn_line{
      width:100%;
      border:0;
      border-radius:18px;
      background:#2563eb;
      color:white;
      padding:15px;
      margin-top:14px;
      font-size:16px;
      font-weight:950;
    }

    @media(max-width:390px){
      .zx_home_hero h2{font-size:25px}
      .zx_home_panel h3{font-size:22px}
      .zx_home_kpi{min-height:132px;padding:14px}
      .zx_home_kpi_value{font-size:28px}
      .zx_home_op{grid-template-columns:42px 1fr}
      .zx_home_op span{width:42px;height:42px}
      .zx_home_actions button{font-size:16px}
    }

    @media(min-width:700px){
      #app{
        padding-bottom:32px;
      }

      .zx_home{
        grid-template-columns:1.25fr .75fr;
        gap:16px;
      }

      .zx_home_full{
        grid-column:1/-1;
      }

      .zx_home_kpis{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }

      .zx_home_kpi{
        min-height:138px;
      }

      .zx_home_stats{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }

      .zx_home_ops{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }

      .zx_home_actions{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }
    }

    @media(min-width:1100px){
      .zx_home{
        grid-template-columns:1.1fr .9fr;
      }

      .zx_home_panel,
      .zx_home_hero{
        padding:24px;
      }
    }
  `;

  document.head.appendChild(s);
}

window.ZENTRYX_UI_inicio=async function(){
  estilosInicio();

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio") b.classList.add("zx_activo");
  });

  const s=sesion();
  const nombre=s.nombre || s.usuario || "Sergio";

  app().innerHTML=`
    <div class="zx_home">
      <section class="zx_home_hero zx_home_full">
        <h2>Panel diario 👋</h2>
        <p>Cargando información de hoy...</p>
      </section>
    </div>
  `;

  const data=await cargarDashboard();

  app().innerHTML=`
    <div class="zx_home">
      <section class="zx_home_hero zx_home_full">
        <h2>${esAdmin() ? "Panel diario" : "Hola, "+limpiar(nombre)} 👋</h2>
        <p>${esAdmin() ? "Resumen de empresa, agenda, personal y avisos." : "Tu jornada, próximos trabajos y avisos."}</p>
      </section>

      <div class="zx_home_full">
        ${renderKPIs(data)}
      </div>

      <section class="zx_home_panel">
        <h3>Agenda de hoy</h3>
        ${renderAgenda(data.agenda)}
        <button class="zx_home_btn_line" onclick="ZX_abrirAgenda()">Ver agenda completa</button>
      </section>

      <section class="zx_home_panel">
        <h3>${esAdmin() ? "Jornadas de hoy" : "Mi jornada"}</h3>
        ${renderJornadas(data)}
      </section>

      <section class="zx_home_panel zx_home_full">
        <h3>Centro diario</h3>
        ${renderCentroDiario()}
      </section>

      <section class="zx_home_panel zx_home_full">
        <h3>Accesos rápidos</h3>
        ${renderAcciones(data)}
      </section>
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