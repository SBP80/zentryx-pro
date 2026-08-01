// =====================================
// ZENTRYX PRO - MONITOR DE OFICINA
// V3100 - PANEL OPERATIVO EN TIEMPO REAL
// =====================================
(function(){
"use strict";

const ZX_MONITOR_VERSION="3100";
let timer=null;

function sb(){return window.sb || window.supabaseClient || null}
function app(){return document.getElementById("app")}
function limpiar(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalizar(v){return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function estado(v){
  const n=normalizar(v).replace(/\s+/g,"_");
  if(["terminado","finalizado","completado"].includes(n)) return "terminado";
  if(["en_curso","curso","iniciado","trabajando"].includes(n)) return "en_curso";
  if(["cancelado","anulado","bloqueado"].includes(n)) return "incidencia";
  return "pendiente";
}
function fechaES(v){
  const s=String(v||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0];
}
function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function reloj(){
  const d=new Date();
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}
function instalarCSS(){
  if(document.getElementById("zx_monitor_css")) return;
  const s=document.createElement("style");
  s.id="zx_monitor_css";
  s.textContent=`
    .zx_mon{min-height:100vh;background:#071330;color:white;padding:20px;font-family:system-ui,-apple-system,sans-serif}
    .zx_mon_head{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}
    .zx_mon_head h1{margin:0;font-size:clamp(28px,3vw,52px)}
    .zx_mon_clock{font-size:clamp(28px,4vw,58px);font-weight:950}
    .zx_mon_actions{display:flex;gap:10px;flex-wrap:wrap}
    .zx_mon button{border:0;border-radius:14px;padding:11px 15px;font-weight:900}
    .zx_mon_close{background:#e2e8f0;color:#0f172a}
    .zx_mon_full{background:#2563eb;color:white}
    .zx_mon_grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    .zx_mon_kpi,.zx_mon_panel{background:#0f234a;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:18px}
    .zx_mon_kpi b{display:block;font-size:clamp(34px,4vw,64px)}
    .zx_mon_kpi span{color:#bfdbfe;font-weight:900}
    .zx_mon_panel{grid-column:span 2}
    .zx_mon_panel h2{margin:0 0 13px;font-size:clamp(20px,2vw,32px)}
    .zx_mon_list{display:grid;gap:10px}
    .zx_mon_item{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;background:#122b59;border-radius:16px;padding:13px;border-left:8px solid #f59e0b}
    .zx_mon_item.en_curso{border-left-color:#3b82f6}
    .zx_mon_item.terminado{border-left-color:#22c55e}
    .zx_mon_item.incidencia{border-left-color:#ef4444}
    .zx_mon_item strong{font-size:clamp(16px,1.6vw,24px)}
    .zx_mon_item small{display:block;color:#bfdbfe;margin-top:3px}
    .zx_mon_badge{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:900}
    .zx_mon_empty{color:#94a3b8;padding:18px;text-align:center}
    @media(max-width:900px){.zx_mon_grid{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_mon_panel{grid-column:span 2}}
    @media(max-width:560px){.zx_mon{padding:12px}.zx_mon_head{align-items:flex-start;flex-direction:column}.zx_mon_grid{grid-template-columns:1fr}.zx_mon_panel{grid-column:span 1}}
  `;
  document.head.appendChild(s);
}
async function cargar(){
  if(!sb()) return {trabajos:[],agenda:[],vehiculos:[]};
  const h=hoy();
  const [tr,ag,ve]=await Promise.all([
    sb().from("trabajos").select("*").order("fecha",{ascending:true}).limit(100),
    sb().from("agenda_eventos").select("*").gte("fecha_inicio",h).order("fecha_inicio",{ascending:true}).limit(100),
    sb().from("vehiculos").select("*").limit(100)
  ]);
  return {
    trabajos:tr.error?[]:(tr.data||[]),
    agenda:ag.error?[]:(ag.data||[]),
    vehiculos:ve.error?[]:(ve.data||[])
  };
}
function itemTrabajo(t){
  const est=estado(t.estado);
  const hora=String(t.hora_inicio||"").slice(0,5);
  return `<div class="zx_mon_item ${est}">
    <div style="font-size:28px">${est==="terminado"?"✅":est==="en_curso"?"🔵":est==="incidencia"?"🔴":"🟠"}</div>
    <div><strong>${limpiar(t.titulo||"Trabajo")}</strong><small>${limpiar(t.cliente||"Sin cliente")} · ${limpiar(fechaES(t.fecha))}${hora?" · "+limpiar(hora):""}</small></div>
    <span class="zx_mon_badge">${limpiar((t.estado||"Pendiente").replaceAll("_"," "))}</span>
  </div>`;
}
async function pintar(){
  const data=await cargar();
  const trabajos=data.trabajos.filter(t=>!(t.archivado===true || String(t.archivado)==="true"));
  const pendientes=trabajos.filter(t=>estado(t.estado)==="pendiente");
  const curso=trabajos.filter(t=>estado(t.estado)==="en_curso");
  const terminados=trabajos.filter(t=>estado(t.estado)==="terminado");
  const incidencias=trabajos.filter(t=>estado(t.estado)==="incidencia");
  const hoyLista=trabajos.filter(t=>String(t.fecha||"").slice(0,10)===hoy()).sort((a,b)=>String(a.hora_inicio||"").localeCompare(String(b.hora_inicio||"")));
  const proximos=trabajos.filter(t=>String(t.fecha||"").slice(0,10)>=hoy() && estado(t.estado)!=="terminado").slice(0,12);
  app().innerHTML=`<div class="zx_mon">
    <header class="zx_mon_head">
      <div><h1>🖥️ Monitor de oficina</h1><div style="color:#93c5fd;font-weight:850">${limpiar(fechaES(hoy()))}</div></div>
      <div>
        <div id="zx_mon_clock" class="zx_mon_clock">${reloj()}</div>
        <div class="zx_mon_actions">
          <button class="zx_mon_full" id="zx_mon_full">Pantalla completa</button>
          <button class="zx_mon_close" id="zx_mon_close">Salir</button>
        </div>
      </div>
    </header>
    <section class="zx_mon_grid">
      <div class="zx_mon_kpi"><b>${pendientes.length}</b><span>Pendientes</span></div>
      <div class="zx_mon_kpi"><b>${curso.length}</b><span>En curso</span></div>
      <div class="zx_mon_kpi"><b>${terminados.length}</b><span>Terminados</span></div>
      <div class="zx_mon_kpi"><b>${incidencias.length}</b><span>Incidencias</span></div>
      <article class="zx_mon_panel"><h2>Agenda de hoy</h2><div class="zx_mon_list">${hoyLista.length?hoyLista.map(itemTrabajo).join(""):'<div class="zx_mon_empty">Sin trabajos para hoy.</div>'}</div></article>
      <article class="zx_mon_panel"><h2>Próximos trabajos</h2><div class="zx_mon_list">${proximos.length?proximos.map(itemTrabajo).join(""):'<div class="zx_mon_empty">Sin próximos trabajos.</div>'}</div></article>
      <article class="zx_mon_panel"><h2>Vehículos</h2><div class="zx_mon_list">${data.vehiculos.length?data.vehiculos.slice(0,10).map(v=>`<div class="zx_mon_item ${v.en_uso?"en_curso":""}"><div style="font-size:28px">🚐</div><div><strong>${limpiar(v.matricula||v.nombre||"Vehículo")}</strong><small>${limpiar(v.usuario_asignado||v.estado||"Disponible")}</small></div><span class="zx_mon_badge">${v.en_uso?"En uso":"Disponible"}</span></div>`).join(""):'<div class="zx_mon_empty">Sin vehículos.</div>'}</div></article>
      <article class="zx_mon_panel"><h2>Resumen operativo</h2><div class="zx_mon_list">
        <div class="zx_mon_item"><div style="font-size:28px">📅</div><div><strong>${data.agenda.length}</strong><small>Eventos próximos registrados</small></div></div>
        <div class="zx_mon_item en_curso"><div style="font-size:28px">👷</div><div><strong>${curso.length}</strong><small>Trabajos activos en este momento</small></div></div>
      </div></article>
    </section>
  </div>`;
  document.getElementById("zx_mon_close").onclick=function(){clearInterval(timer);timer=null;if(typeof window.ZX_trabajos==="function")window.ZX_trabajos()};
  document.getElementById("zx_mon_full").onclick=function(){const el=document.documentElement;if(!document.fullscreenElement){el.requestFullscreen?.()}else{document.exitFullscreen?.()}};
}
window.ZX_monitor_oficina=async function(){
  instalarCSS();
  await pintar();
  if(timer) clearInterval(timer);
  timer=setInterval(async function(){
    const clock=document.getElementById("zx_mon_clock");
    if(clock) clock.textContent=reloj();
    await pintar();
  },60000);
};
console.log("ZENTRYX monitor.js V"+ZX_MONITOR_VERSION+" cargado");
})();