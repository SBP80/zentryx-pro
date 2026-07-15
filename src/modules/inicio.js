// ===============================
// ZENTRYX PRO - MI DÍA
// V3137 - SELECTOR DE NAVEGACIÓN EN MI DÍA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3137";
const CACHE_KEY="zentryx_mi_dia_v3137";
const CACHE_MAX_MS=72*60*60*1000;
let ZX_MI_DIA_RENDER=0;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual() || {};
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}catch(e){return {}}
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
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function esAdmin(){
  const s=sesion();
  return normalizar(s.rol)==="administrador" || normalizar(s.usuario)==="admin";
}

function ahoraISO(){return new Date().toISOString()}

function fechaLocalISO(valor){
  const d=valor ? new Date(valor) : new Date();
  if(isNaN(d.getTime())) return "";
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function hoy(){return fechaLocalISO(new Date())}

function manana(){
  const d=new Date();
  d.setDate(d.getDate()+1);
  return fechaLocalISO(d);
}

function fechaES(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : String(f);
}

function horaCorta(v){
  if(!v) return "--:--";
  const txt=String(v);
  if(/^\d{2}:\d{2}/.test(txt)) return txt.slice(0,5);
  const d=new Date(v);
  if(isNaN(d.getTime())) return "--:--";
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}

function duracionDesde(v){
  if(!v) return "";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "";
  const min=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
  if(min<60) return min+" min";
  const h=Math.floor(min/60);
  const m=min%60;
  return h+" h"+(m ? " "+m+" min" : "");
}

function leerCache(){
  try{
    const c=JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if(!c || !c.guardado_en) return null;
    return c;
  }catch(e){return null}
}

function guardarCache(data){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify({
      ...data,
      guardado_en:Date.now(),
      actualizado_en:ahoraISO()
    }));
  }catch(e){}
}

async function consulta(fn,fallback){
  if(!navigator.onLine || !sb()) return fallback;
  try{
    const r=await fn(sb());
    if(!r || r.error) return fallback;
    return r.data ?? fallback;
  }catch(e){return fallback}
}

function direccionTrabajo(t){
  return [
    t.direccion_obra || t.direccion,
    t.numero,
    t.poblacion,
    t.provincia,
    t.codigo_postal || t.cp
  ].filter(Boolean).join(", ");
}

function fechaTrabajo(t){
  return String(t.__plan_fecha || t.fecha || t.fecha_inicio || "").slice(0,10);
}

function horaTrabajo(t){
  return t.__plan_hora || t.hora_inicio || t.hora || t.inicio || "";
}

function usuarioCoincide(t,s){
  if(esAdmin()) return true;

  const sid=String(s.id || "");
  const su=normalizar(s.usuario || "");
  const sn=normalizar(s.nombre || "");

  const ids=[
    t.usuario_id,t.tecnico_id,t.asignado_a,t.responsable_id,
    t.__plan_usuario_id,t.__plan_tecnico_id,
    ...(Array.isArray(t.__equipo_ids) ? t.__equipo_ids : [])
  ].filter(function(v){
    return v!==null && v!==undefined && v!=="";
  }).map(String);

  if(sid && ids.includes(sid)) return true;

  const nombres=[
    t.usuario,t.tecnico,t.tecnico_nombre,t.responsable,t.asignado_nombre,
    t.__plan_usuario,t.__plan_tecnico,
    ...(Array.isArray(t.__equipo_nombres) ? t.__equipo_nombres : [])
  ].map(normalizar).filter(Boolean);

  if(su && nombres.includes(su)) return true;
  if(sn && nombres.includes(sn)) return true;

  return ids.length===0 && nombres.length===0;
}

function estadoActivoTrabajo(t){
  const e=normalizar(t.estado || "pendiente");
  return !["terminado","completado","cancelado","archivado"].includes(e);
}

async function cargarTrabajosDia(){
  const s=sesion();
  const fHoy=hoy();
  const fManana=manana();

  const [trabajos,planes]=await Promise.all([
    consulta(c=>c.from("trabajos").select("*").gte("fecha",fHoy).lte("fecha",fManana).limit(250),[]),
    consulta(c=>c.from("trabajos_planificacion").select("*").gte("fecha",fHoy).lte("fecha",fManana).limit(500),[])
  ]);

  const mapa=new Map();

  (trabajos || []).forEach(function(t){
    mapa.set(String(t.id),{
      ...t,
      __equipo_ids:[],
      __equipo_nombres:[]
    });
  });

  (planes || []).forEach(function(p){
    const id=String(p.trabajo_id || p.id_trabajo || "");
    if(!id) return;

    const base=mapa.get(id) || {
      id:id,
      __equipo_ids:[],
      __equipo_nombres:[]
    };

    const equipoIds=Array.isArray(base.__equipo_ids) ? [...base.__equipo_ids] : [];
    const equipoNombres=Array.isArray(base.__equipo_nombres) ? [...base.__equipo_nombres] : [];

    const usuarioId=String(p.usuario_id || p.tecnico_id || "");
    const usuarioNombre=String(p.usuario || p.tecnico || p.usuario_nombre || p.tecnico_nombre || "").trim();

    if(usuarioId && !equipoIds.includes(usuarioId)) equipoIds.push(usuarioId);
    if(usuarioNombre && !equipoNombres.some(function(n){return normalizar(n)===normalizar(usuarioNombre)})){
      equipoNombres.push(usuarioNombre);
    }

    mapa.set(id,{
      ...base,
      __plan_fecha:base.__plan_fecha || p.fecha || p.fecha_inicio || base.fecha,
      __plan_hora:base.__plan_hora || p.hora_inicio || p.hora || base.hora_inicio,
      __plan_hora_fin:base.__plan_hora_fin || p.hora_fin || base.hora_fin,
      __equipo_ids:equipoIds,
      __equipo_nombres:equipoNombres
    });
  });

  const idsFaltantes=Array.from(mapa.values())
    .filter(function(t){return !t.titulo && t.id})
    .map(function(t){return String(t.id)});

  if(idsFaltantes.length && navigator.onLine && sb()){
    const faltantes=await consulta(
      c=>c.from("trabajos").select("*").in("id",idsFaltantes).limit(250),
      []
    );

    (faltantes || []).forEach(function(t){
      const previo=mapa.get(String(t.id)) || {};
      mapa.set(String(t.id),{
        ...t,
        __plan_fecha:previo.__plan_fecha,
        __plan_hora:previo.__plan_hora,
        __plan_hora_fin:previo.__plan_hora_fin,
        __equipo_ids:previo.__equipo_ids || [],
        __equipo_nombres:previo.__equipo_nombres || []
      });
    });
  }

  return Array.from(mapa.values())
    .filter(estadoActivoTrabajo)
    .filter(function(t){return usuarioCoincide(t,s)})
    .filter(function(t){return [fHoy,fManana].includes(fechaTrabajo(t))})
    .sort(function(a,b){
      const ak=fechaTrabajo(a)+" "+horaTrabajo(a);
      const bk=fechaTrabajo(b)+" "+horaTrabajo(b);
      return ak.localeCompare(bk);
    });
}

async function cargarJornada(){
  const s=sesion();
  const lista=await consulta(c=>c
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id || ""))
    .eq("estado","abierta")
    .order("created_at",{ascending:false})
    .limit(1),[]);
  return lista && lista[0] ? lista[0] : null;
}

async function cargarUsoVehiculo(){
  const s=sesion();
  const lista=await consulta(c=>c
    .from("usos_vehiculos")
    .select("*")
    .eq("usuario_id",String(s.id || ""))
    .in("estado",["en_uso","pendiente_devolucion"])
    .order("inicio_at",{ascending:false})
    .limit(1),[]);
  return lista && lista[0] ? lista[0] : null;
}

async function cargarAvisos(){
  const s=sesion();
  const lista=await consulta(c=>c
    .from("notificaciones")
    .select("*")
    .eq("usuario_id",String(s.id || ""))
    .eq("leida",false)
    .order("created_at",{ascending:false})
    .limit(5),[]);
  return lista || [];
}

async function cargarMiDia(){
  const cache=leerCache();

  if(!navigator.onLine || !sb()){
    return {
      trabajos:cache?.trabajos || [],
      jornada:cache?.jornada || null,
      vehiculo:cache?.vehiculo || null,
      avisos:cache?.avisos || [],
      offline:true,
      cache_antigua:cache ? (Date.now()-Number(cache.guardado_en || 0)>CACHE_MAX_MS) : true,
      actualizado_en:cache?.actualizado_en || null
    };
  }

  const [trabajos,jornada,vehiculo,avisos]=await Promise.all([
    cargarTrabajosDia(),
    cargarJornada(),
    cargarUsoVehiculo(),
    cargarAvisos()
  ]);

  const data={trabajos,jornada,vehiculo,avisos,offline:false,cache_antigua:false};
  guardarCache(data);
  return data;
}

function proximoTrabajo(lista){
  const hoyLista=(lista || []).filter(t=>fechaTrabajo(t)===hoy());
  if(!hoyLista.length) return null;
  const curso=hoyLista.find(t=>normalizar(t.estado)==="en_curso");
  return curso || hoyLista[0];
}

function abrirTrabajo(id){
  window.ZX_TRABAJO_ABRIR_ID=String(id || "");
  if(typeof window.ZX_trabajos==="function") window.ZX_trabajos();
}

function cerrarSelectorMapas(){
  const modal=document.getElementById("zx_md_map_modal");
  if(modal) modal.remove();
}

function abrirNavegador(tipo,dir){
  const destino=String(dir || "").trim();
  if(!destino) return;

  const encoded=encodeURIComponent(destino);

  if(tipo==="google"){
    window.open(
      "https://www.google.com/maps/dir/?api=1&destination="+encoded,
      "_blank",
      "noopener"
    );
    return;
  }

  if(tipo==="apple"){
    window.location.href="maps://?daddr="+encoded+"&dirflg=d";
    return;
  }

  if(tipo==="waze"){
    const appUrl="waze://?q="+encoded+"&navigate=yes";
    const webUrl="https://www.waze.com/ul?q="+encoded+"&navigate=yes";
    let abierta=false;

    const detectar=function(){
      if(document.hidden) abierta=true;
    };

    document.addEventListener("visibilitychange",detectar,{once:true});
    window.location.href=appUrl;

    setTimeout(function(){
      if(!abierta && !document.hidden){
        window.open(webUrl,"_blank","noopener");
      }
    },1300);
  }
}

function abrirMapa(dir){
  const destino=String(dir || "").trim();

  if(!destino){
    alert("Este trabajo no tiene una dirección válida.");
    return;
  }

  cerrarSelectorMapas();

  const modal=document.createElement("div");
  modal.id="zx_md_map_modal";
  modal.className="zx_md_map_modal";
  modal.innerHTML=`
    <div class="zx_md_map_backdrop" data-map-close="1"></div>
    <div class="zx_md_map_sheet" role="dialog" aria-modal="true" aria-label="Elegir aplicación de navegación">
      <div class="zx_md_map_handle"></div>
      <h2>¿Con qué mapa quieres ir?</h2>
      <p>${limpiar(destino)}</p>

      <button type="button" class="zx_md_map_btn google" data-map-app="google">
        🗺️ Google Maps
      </button>

      <button type="button" class="zx_md_map_btn apple" data-map-app="apple">
         Mapas
      </button>

      <button type="button" class="zx_md_map_btn waze" data-map-app="waze">
        🚙 Waze
      </button>

      <button type="button" class="zx_md_map_cancel" data-map-close="1">
        Cancelar
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll("[data-map-close]").forEach(function(btn){
    btn.onclick=cerrarSelectorMapas;
  });

  modal.querySelectorAll("[data-map-app]").forEach(function(btn){
    btn.onclick=function(){
      const tipo=String(btn.dataset.mapApp || "");
      cerrarSelectorMapas();
      abrirNavegador(tipo,destino);
    };
  });
}

function llamar(tel){
  const n=String(tel || "").replace(/[^\d+]/g,"");
  if(n) location.href="tel:"+n;
}

function renderConexion(data){
  if(!data.offline) return `<span class="zx_md_sync ok">✓ Sincronizado</span>`;
  if(data.cache_antigua) return `<span class="zx_md_sync warn">⚠ Sin conexión · datos antiguos</span>`;
  return `<span class="zx_md_sync pending">↻ Sin conexión · disponible</span>`;
}

function renderEstadoJornada(j){
  if(j){
    return `
      <div class="zx_md_status working">
        <span class="zx_md_status_icon">🟢</span>
        <div><small>Jornada</small><b>Trabajando</b></div>
      </div>
      <button class="zx_md_primary" onclick="ZX_abrirFichaje()">⏱ Gestionar jornada</button>
    `;
  }

  return `
    <div class="zx_md_status off">
      <span class="zx_md_status_icon">⚪</span>
      <div><small>Jornada</small><b>Sin iniciar</b></div>
    </div>
    <button class="zx_md_primary" onclick="ZX_abrirFichaje()">▶ Comenzar mi día</button>
  `;
}

function renderVehiculo(v){
  if(!v){
    return `
      <div class="zx_md_inline">
        <span>🚗</span>
        <div><small>Vehículo</small><b>Sin vehículo</b></div>
        <button onclick="ZX_abrirVehiculos()">Coger</button>
      </div>
    `;
  }

  return `
    <div class="zx_md_inline vehicle">
      <span>🚐</span>
      <div>
        <small>Vehículo actual</small>
        <b>${limpiar(v.vehiculo_matricula || "Vehículo")}</b>
        <em>${limpiar(duracionDesde(v.inicio_at))}${v.km_inicio!=null ? " · "+limpiar(v.km_inicio)+" km" : ""}</em>
      </div>
      <button onclick="ZX_abrirVehiculos()">Gestionar</button>
    </div>
  `;
}

function renderTrabajo(t){
  if(!t){
    return `
      <section class="zx_md_card zx_md_empty">
        <div class="zx_md_empty_icon">📭</div>
        <h3>No tienes trabajos para hoy</h3>
        <p>Puedes consultar los próximos días en Agenda.</p>
        <button onclick="ZX_abrirAgenda()">📅 Ver agenda</button>
      </section>
    `;
  }

  const dir=direccionTrabajo(t);
  const tel=t.telefono_contacto || t.telefono || t.cliente_telefono || "";
  const hora=horaTrabajo(t);

  return `
    <section class="zx_md_card zx_md_next">
      <div class="zx_md_card_head">
        <div>
          <small>Próximo trabajo${hora ? " · "+limpiar(horaCorta(hora)) : ""}</small>
          <h3>${limpiar(t.titulo || t.nombre || "Trabajo")}</h3>
        </div>
        <span class="zx_md_badge ${normalizar(t.estado)==="en_curso" ? "course" : "pending"}">${limpiar(t.estado || "pendiente")}</span>
      </div>

      ${t.cliente ? `<div class="zx_md_detail">👤 <b>${limpiar(t.cliente)}</b></div>` : ""}
      ${Array.isArray(t.__equipo_nombres) && t.__equipo_nombres.length ? `<div class="zx_md_detail">👥 ${limpiar(t.__equipo_nombres.join(", "))}</div>` : ""}
      ${dir ? `<div class="zx_md_detail">📍 ${limpiar(dir)}</div>` : ""}
      ${t.descripcion ? `<div class="zx_md_description">${limpiar(t.descripcion)}</div>` : ""}

      <button class="zx_md_work" onclick="ZX_miDia_abrirTrabajo('${limpiar(t.id)}')">📋 Abrir trabajo</button>

      <div class="zx_md_quick">
        ${dir ? `<button onclick="ZX_miDia_mapa('${limpiar(dir)}')">🧭 Ruta</button>` : ""}
        ${tel ? `<button onclick="ZX_miDia_llamar('${limpiar(tel)}')">📞 Llamar</button>` : ""}
        <button onclick="ZX_abrirAgenda()">📅 Agenda</button>
      </div>
    </section>
  `;
}

function renderSiguientes(lista,actual){
  const otros=(lista || []).filter(t=>!actual || String(t.id)!==String(actual.id)).slice(0,3);
  if(!otros.length) return "";

  return `
    <section class="zx_md_card zx_md_later">
      <h3>Después</h3>
      ${otros.map(t=>`
        <button class="zx_md_later_row" onclick="ZX_miDia_abrirTrabajo('${limpiar(t.id)}')">
          <span>${fechaTrabajo(t)===hoy() ? horaCorta(horaTrabajo(t)) : fechaES(fechaTrabajo(t))}</span>
          <div><b>${limpiar(t.titulo || "Trabajo")}</b><small>${limpiar(t.cliente || direccionTrabajo(t) || "")}</small></div>
          <i>›</i>
        </button>
      `).join("")}
    </section>
  `;
}

function renderAvisos(lista){
  if(!lista || !lista.length) return "";
  return `
    <section class="zx_md_card zx_md_alerts">
      <h3>Avisos</h3>
      ${lista.slice(0,3).map(a=>`
        <div class="zx_md_alert">
          <span>🔔</span>
          <div><b>${limpiar(a.titulo || "Aviso")}</b><small>${limpiar(a.mensaje || "")}</small></div>
        </div>
      `).join("")}
    </section>
  `;
}

function estilos(){
  const old=document.getElementById("zx_mi_dia_css");
  if(old) old.remove();
  const s=document.createElement("style");
  s.id="zx_mi_dia_css";
  s.textContent=`
    #app{padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_md{display:grid;gap:14px;max-width:920px;margin:0 auto}
    .zx_md_hero{background:linear-gradient(135deg,#fff,#f3f7ff);border:1px solid #dbe3ef;border-radius:26px;padding:20px;box-shadow:0 12px 28px rgba(15,23,42,.06)}
    .zx_md_hero_top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .zx_md_hero h2{margin:0;color:#071330;font-size:28px;line-height:1.05;font-weight:950}
    .zx_md_hero p{margin:7px 0 0;color:#64748b;font-size:14px;font-weight:850}
    .zx_md_sync{display:inline-flex;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:950;white-space:nowrap}.zx_md_sync.ok{background:#dcfce7;color:#166534}.zx_md_sync.pending{background:#fef3c7;color:#92400e}.zx_md_sync.warn{background:#fee2e2;color:#991b1b}
    .zx_md_day{display:grid;grid-template-columns:1fr;gap:12px;margin-top:18px}
    .zx_md_status,.zx_md_inline{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;border:1px solid #dbe3ef;border-radius:20px;padding:13px;background:#fff}
    .zx_md_status{grid-template-columns:auto 1fr}.zx_md_status_icon,.zx_md_inline>span{font-size:25px}.zx_md_status small,.zx_md_inline small{display:block;color:#64748b;font-size:12px;font-weight:950;text-transform:uppercase}.zx_md_status b,.zx_md_inline b{display:block;color:#071330;font-size:18px;font-weight:950;margin-top:2px}.zx_md_inline em{display:block;color:#64748b;font-size:12px;font-style:normal;font-weight:850;margin-top:3px}
    .zx_md_inline button{border:0;border-radius:13px;background:#e0e7ff;color:#3730a3;padding:10px 11px;font-size:13px;font-weight:950}.zx_md_inline.vehicle button{background:#dbeafe;color:#1d4ed8}
    .zx_md_primary,.zx_md_work{width:100%;border:0;border-radius:18px;padding:16px;background:#2563eb;color:#fff;font-size:18px;font-weight:950;box-shadow:0 9px 20px rgba(37,99,235,.22)}
    .zx_md_card{background:#fff;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06)}
    .zx_md_card_head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.zx_md_card_head small{color:#64748b;font-size:13px;font-weight:950}.zx_md_card h3{margin:4px 0 14px;color:#071330;font-size:24px;line-height:1.12;font-weight:950}.zx_md_badge{border-radius:999px;padding:7px 9px;font-size:11px;font-weight:950;text-transform:capitalize}.zx_md_badge.pending{background:#fef3c7;color:#92400e}.zx_md_badge.course{background:#dcfce7;color:#166534}
    .zx_md_detail{color:#334155;font-size:15px;font-weight:850;line-height:1.35;margin-top:9px}.zx_md_description{margin:13px 0;background:#f8fafc;border-radius:16px;padding:12px;color:#475569;font-size:14px;font-weight:800;line-height:1.4}.zx_md_work{margin-top:16px;background:#16a34a;box-shadow:0 9px 20px rgba(22,163,74,.2)}
    .zx_md_quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.zx_md_quick button{border:0;border-radius:14px;padding:12px 7px;background:#f1f5f9;color:#334155;font-size:13px;font-weight:950}
    .zx_md_map_modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center}
    .zx_md_map_backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px)}
    .zx_md_map_sheet{position:relative;width:min(680px,100%);background:#fff;border-radius:28px 28px 0 0;padding:18px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -18px 45px rgba(15,23,42,.24);display:grid;gap:12px}
    .zx_md_map_handle{width:54px;height:5px;border-radius:999px;background:#cbd5e1;margin:0 auto 3px}
    .zx_md_map_sheet h2{margin:0;color:#071330;font-size:24px;font-weight:950}
    .zx_md_map_sheet p{margin:0 0 4px;color:#64748b;font-size:14px;font-weight:800;line-height:1.4}
    .zx_md_map_btn,.zx_md_map_cancel{width:100%;border:0;border-radius:18px;padding:16px;font-size:17px;font-weight:950}
    .zx_md_map_btn.google{background:#2563eb;color:#fff}
    .zx_md_map_btn.apple{background:#111827;color:#fff}
    .zx_md_map_btn.waze{background:#16a34a;color:#fff}
    .zx_md_map_cancel{background:#e2e8f0;color:#334155}
    .zx_md_empty{text-align:center}.zx_md_empty_icon{font-size:42px}.zx_md_empty h3{margin:8px 0}.zx_md_empty p{color:#64748b;font-weight:800}.zx_md_empty button{border:0;border-radius:16px;background:#7c3aed;color:#fff;padding:13px 18px;font-weight:950}
    .zx_md_later h3,.zx_md_alerts h3{font-size:20px;margin:0 0 10px}.zx_md_later_row{width:100%;border:0;border-top:1px solid #edf2f7;background:transparent;padding:12px 0;display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:9px;text-align:left;align-items:center}.zx_md_later_row>span{color:#2563eb;font-size:12px;font-weight:950}.zx_md_later_row b{display:block;color:#071330;font-size:14px;font-weight:950}.zx_md_later_row small{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:2px}.zx_md_later_row i{font-style:normal;color:#94a3b8;font-size:22px}
    .zx_md_alert{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:10px 0;border-top:1px solid #edf2f7}.zx_md_alert b{display:block;color:#071330;font-size:14px;font-weight:950}.zx_md_alert small{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:3px;line-height:1.35}
    @media(min-width:700px){#app{padding-bottom:32px}.zx_md_day{grid-template-columns:1fr 1fr}.zx_md_primary{grid-column:1/-1}.zx_md_quick{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:390px){.zx_md_hero{padding:16px}.zx_md_hero h2{font-size:25px}.zx_md_card{padding:15px}.zx_md_card h3{font-size:21px}.zx_md_quick button{font-size:12px}}
  `;
  document.head.appendChild(s);
}

window.ZX_miDia_abrirTrabajo=abrirTrabajo;
window.ZX_miDia_mapa=abrirMapa;
window.ZX_miDia_llamar=llamar;

window.ZENTRYX_UI_inicio=async function(){
  const renderId=++ZX_MI_DIA_RENDER;
  estilos();

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="inicio") b.classList.add("zx_activo");
  });

  const s=sesion();
  const nombre=(s.nombre || s.usuario || "").split(" ")[0] || "Hola";

  app().innerHTML=`
    <div class="zx_md">
      <section class="zx_md_hero">
        <div class="zx_md_hero_top"><div><h2>Hola, ${limpiar(nombre)} 👋</h2><p>Preparando tu día...</p></div><span class="zx_md_sync pending">↻ Cargando</span></div>
      </section>
    </div>
  `;

  const data=await cargarMiDia();
  if(renderId!==ZX_MI_DIA_RENDER) return;

  const actual=proximoTrabajo(data.trabajos);
  const hoyCount=(data.trabajos || []).filter(t=>fechaTrabajo(t)===hoy()).length;

  app().innerHTML=`
    <div class="zx_md">
      <section class="zx_md_hero">
        <div class="zx_md_hero_top">
          <div><h2>${esAdmin() ? "Panel de hoy" : "Hola, "+limpiar(nombre)+" 👋"}</h2><p>${esAdmin() ? "Resumen operativo de la empresa." : (hoyCount ? "Tienes "+hoyCount+" trabajo"+(hoyCount===1?"":"s")+" hoy." : "Tu día está preparado.")}</p></div>
          ${renderConexion(data)}
        </div>
        <div class="zx_md_day">
          ${renderEstadoJornada(data.jornada)}
          ${renderVehiculo(data.vehiculo)}
        </div>
      </section>

      ${renderTrabajo(actual)}
      ${renderSiguientes(data.trabajos,actual)}
      ${renderAvisos(data.avisos)}
    </div>
  `;
};

window.ZX_inicio=function(){
  if(window.ZENTRYX_UI_inicio) window.ZENTRYX_UI_inicio();
};

function refrescarMiDiaVisible(){
  if(document.querySelector(".zx_md") && typeof window.ZX_inicio==="function"){
    window.ZX_inicio();
  }
}

window.addEventListener("online",refrescarMiDiaVisible);
window.addEventListener("zentryx:trabajo:equipo_actualizado",refrescarMiDiaVisible);
window.addEventListener("zentryx:trabajo:actualizado",refrescarMiDiaVisible);
window.addEventListener("zentryx:sync:complete",refrescarMiDiaVisible);

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("inicio",{nombre:"Mi día",activo:true,version:ZX_VERSION});
}

console.log("ZENTRYX inicio.js V"+ZX_VERSION+" cargado");
})();
