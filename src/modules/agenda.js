// ===============================
// ZENTRYX PRO - AGENDA
// V3134 - TRABAJOS DIRECTOS, SIN DUPLICAR EN AGENDA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3134";
const TABLA="agenda_eventos";
const CACHE_KEY="zentryx_cache_agenda_eventos";

let ZX_AGENDA_FECHA=new Date();
let ZX_AGENDA_CACHE=[];
let ZX_AGENDA_FILTRO="todos";
let ZX_AGENDA_CARGANDO=false;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
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
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function esAdmin(){
  const s=sesion();
  return normalizar(s.rol)==="administrador" || normalizar(s.usuario)==="admin";
}

function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function isoFecha(d){
  const x=new Date(d);
  return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
}

function normalizarFecha(f){
  if(!f) return "";
  const s=String(f).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){
    const p=s.split("/");
    return p[2]+"-"+p[1]+"-"+p[0];
  }
  return s.slice(0,10);
}

function formatoFecha(f){
  const x=normalizarFecha(f);
  if(!x) return "";
  const p=x.split("-");
  return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : limpiar(f);
}

function sumarDias(fecha,dias){
  const d=new Date(fecha+"T12:00:00");
  d.setDate(d.getDate()+dias);
  return isoFecha(d);
}

function primerDiaMes(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function ultimoDiaMes(d){return new Date(d.getFullYear(),d.getMonth()+1,0)}
function nombreMes(d){return d.toLocaleDateString("es-ES",{month:"long",year:"numeric"})}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}


// ===============================
// CACHÉ PREVENTIVA DE TRABAJOS
// Descarga hoy y mañana con detalle completo y conserva
// una ficha básica para los próximos siete días.
// ===============================
const ZX_PREFETCH_DB="zentryx_offline_trabajos_v1";
const ZX_PREFETCH_STORE="paquetes";
const ZX_PREFETCH_FILES_CACHE="zentryx-trabajos-archivos-v1";
const ZX_PREFETCH_RETENCION_DIAS=2;
let ZX_PREFETCH_EN_CURSO=false;

function abrirDBPrefetch(){
  return new Promise(function(resolve,reject){
    if(!window.indexedDB){reject(new Error("IndexedDB no disponible"));return;}
    const req=indexedDB.open(ZX_PREFETCH_DB,1);
    req.onupgradeneeded=function(){
      const db=req.result;
      if(!db.objectStoreNames.contains(ZX_PREFETCH_STORE)){
        const st=db.createObjectStore(ZX_PREFETCH_STORE,{keyPath:"trabajo_id"});
        st.createIndex("fecha_fin","fecha_fin",{unique:false});
        st.createIndex("usuario_id","usuario_id",{unique:false});
      }
    };
    req.onsuccess=function(){resolve(req.result)};
    req.onerror=function(){reject(req.error || new Error("No se pudo abrir la caché"));};
  });
}

async function guardarPaqueteOffline(paquete){
  const db=await abrirDBPrefetch();
  return new Promise(function(resolve,reject){
    const tx=db.transaction(ZX_PREFETCH_STORE,"readwrite");
    tx.objectStore(ZX_PREFETCH_STORE).put(paquete);
    tx.oncomplete=function(){db.close();resolve(true)};
    tx.onerror=function(){db.close();reject(tx.error)};
  });
}

async function leerPaqueteOffline(trabajoId){
  try{
    const db=await abrirDBPrefetch();
    return await new Promise(function(resolve){
      const tx=db.transaction(ZX_PREFETCH_STORE,"readonly");
      const req=tx.objectStore(ZX_PREFETCH_STORE).get(String(trabajoId));
      req.onsuccess=function(){db.close();resolve(req.result || null)};
      req.onerror=function(){db.close();resolve(null)};
    });
  }catch(e){return null;}
}

async function borrarPaqueteOffline(trabajoId){
  try{
    const anterior=await leerPaqueteOffline(trabajoId);
    const db=await abrirDBPrefetch();
    await new Promise(function(resolve){
      const tx=db.transaction(ZX_PREFETCH_STORE,"readwrite");
      tx.objectStore(ZX_PREFETCH_STORE).delete(String(trabajoId));
      tx.oncomplete=function(){db.close();resolve()};
      tx.onerror=function(){db.close();resolve()};
    });
    if(anterior && Array.isArray(anterior.archivos)){
      const cache=await caches.open(ZX_PREFETCH_FILES_CACHE);
      for(const a of anterior.archivos){
        const url=String(a.url || a.public_url || a.archivo_url || "").trim();
        if(url) await cache.delete(url).catch(function(){});
      }
    }
  }catch(e){}
}

async function listarPaquetesOffline(){
  try{
    const db=await abrirDBPrefetch();
    return await new Promise(function(resolve){
      const tx=db.transaction(ZX_PREFETCH_STORE,"readonly");
      const req=tx.objectStore(ZX_PREFETCH_STORE).getAll();
      req.onsuccess=function(){db.close();resolve(req.result || [])};
      req.onerror=function(){db.close();resolve([])};
    });
  }catch(e){return [];}
}

async function consultaLista(tabla,columna,id,ordenCampo="created_at",asc=false){
  try{
    const r=await sb().from(tabla).select("*").eq(columna,String(id)).order(ordenCampo,{ascending:asc});
    return r.error ? [] : (r.data || []);
  }catch(e){return [];}
}

function urlArchivoTrabajo(a){
  return String(a?.url || a?.public_url || a?.archivo_url || a?.ruta_publica || "").trim();
}

async function cachearArchivosTrabajo(archivos){
  if(!navigator.onLine || !window.caches || !Array.isArray(archivos)) return;
  let estimate=null;
  try{estimate=await navigator.storage?.estimate?.()}catch(e){}
  const disponible=estimate && estimate.quota ? Number(estimate.quota)-Number(estimate.usage||0) : null;
  if(disponible!==null && disponible<25*1024*1024) return;

  const cache=await caches.open(ZX_PREFETCH_FILES_CACHE);
  for(const a of archivos){
    const url=urlArchivoTrabajo(a);
    if(!url) continue;
    try{
      const ya=await cache.match(url);
      if(ya) continue;
      const res=await fetch(url,{cache:"no-store"});
      if(res.ok) await cache.put(url,res.clone());
    }catch(e){}
  }
}

async function construirPaqueteTrabajo(evento,completo){
  const trabajoId=String(evento.origen_id || "");
  if(!trabajoId) return null;

  const rt=await sb().from("trabajos").select("*").eq("id",trabajoId).maybeSingle();
  if(rt.error || !rt.data) return null;
  const trabajo=rt.data;

  let cliente=null;
  const clienteId=trabajo.cliente_id || evento.cliente_id || null;
  if(clienteId){
    try{
      const rc=await sb().from("clientes").select("*").eq("id",String(clienteId)).maybeSingle();
      if(!rc.error) cliente=rc.data || null;
    }catch(e){}
  }

  let planificacion=[],materiales=[],archivos=[],historial=[];
  if(completo){
    [planificacion,materiales,archivos,historial]=await Promise.all([
      consultaLista("trabajos_planificacion","trabajo_id",trabajoId,"fecha",true),
      consultaLista("trabajos_materiales","trabajo_id",trabajoId),
      consultaLista("trabajos_archivos","trabajo_id",trabajoId),
      consultaLista("trabajos_historial","trabajo_id",trabajoId)
    ]);
    await cachearArchivosTrabajo(archivos);
  }

  return {
    trabajo_id:trabajoId,
    usuario_id:String(sesion().id || ""),
    fecha_inicio:normalizarFecha(evento.fecha_inicio),
    fecha_fin:normalizarFecha(evento.fecha_fin || evento.fecha_inicio),
    nivel:completo ? "completo" : "basico",
    evento,
    trabajo,
    cliente,
    planificacion,
    materiales,
    archivos,
    historial,
    descargado_en:new Date().toISOString(),
    sincronizado:true
  };
}

async function limpiarCachePreventiva(eventosVigentes){
  const vigentes=new Set((eventosVigentes || []).map(function(e){return String(e.origen_id || "")}));
  const paquetes=await listarPaquetesOffline();
  const limite=new Date();
  limite.setDate(limite.getDate()-ZX_PREFETCH_RETENCION_DIAS);
  const limiteISO=isoFecha(limite);

  for(const p of paquetes){
    const terminadoEvento=normalizar(p?.evento?.estado)==="terminado" || normalizar(p?.evento?.estado)==="completado" || normalizar(p?.evento?.estado)==="cancelado";
    const antiguo=String(p.fecha_fin || "")<limiteISO;
    if(terminadoEvento || (antiguo && !vigentes.has(String(p.trabajo_id)))){
      await borrarPaqueteOffline(p.trabajo_id);
    }
  }
}

async function prepararTrabajosOffline(eventos){
  if(ZX_PREFETCH_EN_CURSO || !navigator.onLine || !sb()) return;
  ZX_PREFETCH_EN_CURSO=true;
  try{
    const s=sesion();
    const fHoy=hoy();
    const fManana=sumarDias(fHoy,1);
    const fSiete=sumarDias(fHoy,7);

    const asignados=(eventos || []).filter(function(e){
      if(!esTrabajo(e) || terminado(e) || cancelado(e)) return false;
      const f=normalizarFecha(e.fecha_inicio);
      const visible=String(e.visible_para || "todos")==="todos" || String(e.usuario_id || "")===String(s.id || "");
      return visible && f>=fHoy && f<=fSiete;
    });

    const unicos=[];
    const ids=new Set();
    for(const e of asignados){
      const id=String(e.origen_id || "");
      if(!id || ids.has(id)) continue;
      ids.add(id);
      unicos.push(e);
    }

    for(const e of unicos){
      const fecha=normalizarFecha(e.fecha_inicio);
      const completo=fecha<=fManana;
      const anterior=await leerPaqueteOffline(e.origen_id);
      const yaCompleto=anterior && anterior.nivel==="completo";
      const reciente=anterior && segundosEntreFechas(anterior.descargado_en,new Date().toISOString())<6*3600;
      if((completo ? yaCompleto : !!anterior) && reciente) continue;

      const paquete=await construirPaqueteTrabajo(e,completo);
      if(paquete) await guardarPaqueteOffline(paquete);
    }

    await limpiarCachePreventiva(unicos);
    localStorage.setItem("zentryx_prefetch_ultimo",new Date().toISOString());
  }catch(e){
    console.error("Caché preventiva:",e);
  }finally{
    ZX_PREFETCH_EN_CURSO=false;
  }
}

function segundosEntreFechas(a,b){
  const da=new Date(a),db=new Date(b);
  if(isNaN(da.getTime()) || isNaN(db.getTime())) return Infinity;
  return Math.max(0,Math.floor((db-da)/1000));
}

window.ZX_TRABAJO_OFFLINE={
  leer:leerPaqueteOffline,
  listar:listarPaquetesOffline,
  refrescar:function(){return prepararTrabajosOffline(ZX_AGENDA_CACHE)},
  borrar:borrarPaqueteOffline
};

function setEstado(tipo){
  if(zx() && typeof zx().setSyncStatus==="function") zx().setSyncStatus(tipo);
}

function textoTipo(tipo){
  const m={
    trabajo:"Trabajo",
    cita:"Cita",
    vacaciones:"Vacaciones",
    asuntos_propios:"Asuntos propios",
    permiso:"Permiso",
    baja_medica:"Baja médica",
    recordatorio:"Nota",
    revision:"Revisión",
    libranza:"Libranza",
    festivo:"Festivo"
  };
  return m[tipo] || tipo || "Evento";
}

function textoEstado(e){
  const m={
    activo:"Activo",
    pendiente:"Pendiente",
    completado:"Terminado",
    terminado:"Terminado",
    cancelado:"Cancelado"
  };
  return m[e] || e || "Activo";
}

function colorTipo(tipo){
  const t=String(tipo || "").toLowerCase();
  if(t==="trabajo") return "trabajo";
  if(t==="cita") return "cita";
  if(t==="vacaciones") return "vacaciones";
  if(t==="asuntos_propios") return "asuntos";
  if(t==="permiso") return "permiso";
  if(t==="baja_medica") return "baja";
  if(t==="recordatorio") return "nota";
  if(t==="revision") return "revision";
  if(t==="festivo") return "festivo";
  if(t==="libranza") return "libranza";
  return "default";
}

function esTrabajo(e){
  return String(e?.tipo || "")==="trabajo" &&
         String(e?.origen || "")==="trabajos" &&
         String(e?.origen_id || "");
}

function terminado(e){
  const estado=normalizar(e?.estado);
  return estado==="completado" || estado==="terminado";
}

function cancelado(e){
  return normalizar(e?.estado)==="cancelado";
}

function eventosDia(fecha){
  const f=normalizarFecha(fecha);

  return ZX_AGENDA_CACHE.filter(function(e){
    const ini=normalizarFecha(e.fecha_inicio);
    const fin=normalizarFecha(e.fecha_fin || e.fecha_inicio);
    return f>=ini && f<=fin;
  });
}

function filtrarEventos(lista){
  if(ZX_AGENDA_FILTRO==="todos") return lista;
  return lista.filter(e=>String(e.tipo || "")===ZX_AGENDA_FILTRO);
}

function rangoMes(){
  const inicio=isoFecha(primerDiaMes(ZX_AGENDA_FECHA));
  const fin=isoFecha(ultimoDiaMes(ZX_AGENDA_FECHA));

  return {
    desde:sumarDias(inicio,-10),
    hasta:sumarDias(fin,20)
  };
}


function eventoDesdeTrabajo(t,p){
  const plan=p || {};
  const fecha=normalizarFecha(plan.fecha || t.fecha || hoy());
  const horaInicio=plan.hora_inicio || t.hora_inicio || null;
  const horaFin=plan.hora_fin || t.hora_fin || null;
  const usuarioId=String(plan.usuario_id || t.usuario_id || "");
  const usuario=plan.usuario || t.usuario || "";
  const planId=String(plan.id || "base");

  return {
    id:`trabajo:${String(t.id)}:${planId}`,
    tipo:"trabajo",
    titulo:t.titulo || "Trabajo",
    descripcion:t.descripcion || t.notas || "",
    fecha_inicio:fecha,
    fecha_fin:fecha,
    hora_inicio:horaInicio,
    hora_fin:horaFin,
    cliente_id:String(t.cliente_id || ""),
    cliente:t.cliente || "",
    usuario_id:usuarioId,
    usuario:usuario,
    estado:t.estado==="terminado" ? "completado" : (t.estado || "pendiente"),
    prioridad:t.prioridad || "media",
    visible_para:"todos",
    origen:"trabajos",
    origen_id:String(t.id),
    fuente_directa:true,
    direccion:t.direccion_obra || t.direccion || "",
    telefono:t.telefono_contacto || "",
    created_at:t.created_at || null,
    updated_at:t.updated_at || null
  };
}

function esVisibleTrabajoParaUsuario(t,p,s){
  if(esAdmin()) return true;
  const uid=String((p && p.usuario_id) || t.usuario_id || "");
  return uid && uid===String(s.id || "");
}

async function cargarTrabajosDirectos(desde,hasta){
  if(!navigator.onLine || !sb()) return [];

  try{
    const s=sesion();

    const [rt,rp]=await Promise.all([
      sb().from("trabajos").select("*")
        .eq("archivado",false),
      sb().from("trabajos_planificacion").select("*")
        .gte("fecha",desde)
        .lte("fecha",hasta)
        .order("fecha",{ascending:true})
        .order("hora_inicio",{ascending:true})
    ]);

    if(rt.error) throw rt.error;
    if(rp.error) throw rp.error;

    const trabajos=(rt.data || []).filter(function(t){
      return normalizar(t.estado)!=="cancelado";
    });
    const planes=rp.data || [];
    const porTrabajo=new Map();

    planes.forEach(function(p){
      const id=String(p.trabajo_id || "");
      if(!id) return;
      if(!porTrabajo.has(id)) porTrabajo.set(id,[]);
      porTrabajo.get(id).push(p);
    });

    const eventos=[];

    trabajos.forEach(function(t){
      const id=String(t.id || "");
      const lista=porTrabajo.get(id) || [];

      if(lista.length){
        lista.forEach(function(p){
          if(!esVisibleTrabajoParaUsuario(t,p,s)) return;
          eventos.push(eventoDesdeTrabajo(t,p));
        });
        return;
      }

      const fecha=normalizarFecha(t.fecha);
      if(!fecha || fecha<desde || fecha>hasta) return;
      if(!esVisibleTrabajoParaUsuario(t,null,s)) return;
      eventos.push(eventoDesdeTrabajo(t,null));
    });

    return eventos;
  }catch(e){
    console.error("Trabajos directos en Agenda:",e);
    return [];
  }
}

function combinarEventosAgenda(eventosAgenda,eventosTrabajo){
  const manuales=(eventosAgenda || []).filter(function(e){
    return !(String(e.origen || "")==="trabajos" && String(e.origen_id || ""));
  });

  const mapa=new Map();
  manuales.concat(eventosTrabajo || []).forEach(function(e){
    const clave=String(e.id || `${e.tipo}:${e.fecha_inicio}:${e.hora_inicio}:${e.titulo}`);
    mapa.set(clave,e);
  });

  return Array.from(mapa.values()).sort(function(a,b){
    const fa=String(a.fecha_inicio || "")+" "+String(a.hora_inicio || "");
    const fb=String(b.fecha_inicio || "")+" "+String(b.hora_inicio || "");
    return fa.localeCompare(fb);
  });
}

async function cargarEventos(){
  if(ZX_AGENDA_CARGANDO) return ZX_AGENDA_CACHE;
  ZX_AGENDA_CARGANDO=true;

  const s=sesion();
  const r=rangoMes();

  if(!navigator.onLine || !sb()){
    ZX_AGENDA_CACHE=leerCache();
    ZX_AGENDA_CARGANDO=false;
    return ZX_AGENDA_CACHE;
  }

  try{
    let res;

    if(zx() && typeof zx().selectCache==="function"){
      res=await zx().selectCache(TABLA,function(q){
        return q
          .select("*")
          .lte("fecha_inicio",r.hasta)
          .gte("fecha_fin",r.desde)
          .order("fecha_inicio",{ascending:true})
          .order("hora_inicio",{ascending:true});
      });
    }else{
      res=await sb()
        .from(TABLA)
        .select("*")
        .lte("fecha_inicio",r.hasta)
        .gte("fecha_fin",r.desde)
        .order("fecha_inicio",{ascending:true})
        .order("hora_inicio",{ascending:true});
    }

    if(res.error) throw res.error;

    let eventosAgenda=res.data || [];

    if(!esAdmin()){
      eventosAgenda=eventosAgenda.filter(function(e){
        return String(e.visible_para || "todos")==="todos" ||
               String(e.usuario_id || "")===String(s.id || "");
      });
    }

    const trabajosDirectos=await cargarTrabajosDirectos(r.desde,r.hasta);
    const datos=combinarEventosAgenda(eventosAgenda,trabajosDirectos);

    ZX_AGENDA_CACHE=datos;
    guardarCache(datos);
    prepararTrabajosOffline(datos);

  }catch(e){
    console.error(e);
    ZX_AGENDA_CACHE=leerCache();
  }

  ZX_AGENDA_CARGANDO=false;
  return ZX_AGENDA_CACHE;
}

function pintarShell(){
  app().innerHTML=`
    <div class="zx_ag_shell">
      ${renderCabecera()}
      <div id="zx_ag_calendario">${renderCalendarioSkeleton()}</div>
      <div id="zx_ag_listas">${renderListasSkeleton()}</div>
    </div>
  `;
}

function repintarDatos(){
  const cal=document.getElementById("zx_ag_calendario");
  const listas=document.getElementById("zx_ag_listas");

  if(cal) cal.innerHTML=renderCalendario();
  if(listas) listas.innerHTML=renderListas();
}

function renderCabecera(){
  const tipos=[
    ["todos","Todos","🌐"],
    ["trabajo","Trabajos","🛠️"],
    ["cita","Citas","📌"],
    ["recordatorio","Notas","📝"],
    ["vacaciones","Vacaciones","🌴"],
    ["permiso","Permisos","🟡"],
    ["festivo","Festivos","🎉"]
  ];

  return `
    <section class="zx_ag_panel zx_ag_header">
      <div>
        <h2>Agenda</h2>
        <p>Calendario de trabajos, citas, notas, permisos y festivos.</p>
      </div>
      <button class="zx_ag_new" onclick="ZX_ag_nuevo('${hoy()}')">＋ Nuevo</button>
      <div class="zx_ag_filters">
        ${tipos.map(function(t){
          return `<button class="${ZX_AGENDA_FILTRO===t[0] ? "on" : ""}" onclick="ZX_ag_filtro('${t[0]}')">${t[2]} ${t[1]}</button>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCalendarioSkeleton(){
  return `
    <section class="zx_ag_panel">
      <div class="zx_ag_month_head">
        <button onclick="ZX_ag_mesAnterior()">‹</button>
        <div>
          <h3>${limpiar(nombreMes(ZX_AGENDA_FECHA))}</h3>
          <button onclick="ZX_ag_hoy()">Hoy</button>
        </div>
        <button onclick="ZX_ag_mesSiguiente()">›</button>
      </div>
      <div class="zx_ag_loading">Cargando calendario...</div>
    </section>
  `;
}

function renderListasSkeleton(){
  return `
    <section class="zx_ag_panel">
      <h3>Eventos</h3>
      <div class="zx_ag_loading">Cargando eventos...</div>
    </section>
  `;
}

function renderCalendario(){
  const inicio=primerDiaMes(ZX_AGENDA_FECHA);
  const fin=ultimoDiaMes(ZX_AGENDA_FECHA);
  const primer=(inicio.getDay()+6)%7;
  const diasMes=fin.getDate();

  let html=`
    <section class="zx_ag_panel">
      <div class="zx_ag_month_head">
        <button onclick="ZX_ag_mesAnterior()">‹</button>
        <div>
          <h3>${limpiar(nombreMes(ZX_AGENDA_FECHA))}</h3>
          <button onclick="ZX_ag_hoy()">Hoy</button>
        </div>
        <button onclick="ZX_ag_mesSiguiente()">›</button>
      </div>

      <div class="zx_ag_weekdays">
        <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div>
      </div>

      <div class="zx_ag_calendar">
  `;

  for(let i=0;i<primer;i++){
    html+=`<div class="zx_ag_day empty"></div>`;
  }

  for(let d=1;d<=diasMes;d++){
    const fecha=isoFecha(new Date(ZX_AGENDA_FECHA.getFullYear(),ZX_AGENDA_FECHA.getMonth(),d));
    const evs=filtrarEventos(eventosDia(fecha));
    const claseHoy=fecha===hoy() ? "today" : "";

    html+=`
      <button class="zx_ag_day ${claseHoy}" onclick="ZX_ag_verDia('${fecha}')">
        <b>${d}</b>
        ${evs.slice(0,3).map(function(e){
          return `<span class="${colorTipo(e.tipo)}">${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5)+" " : "")}${limpiar(e.titulo || "")}</span>`;
        }).join("")}
        ${evs.length>3 ? `<em>+${evs.length-3}</em>` : ""}
      </button>
    `;
  }

  html+=`
      </div>
    </section>
  `;

  return html;
}

function renderEvento(e){
  const trabajo=esTrabajo(e);
  const done=terminado(e);
  const canc=cancelado(e);

  let acciones="";

  if(trabajo){
    acciones+=`<button class="blue" onclick="ZX_ag_abrirTrabajo('${limpiar(e.origen_id)}')">🛠️ Abrir trabajo</button>`;
    if(e.direccion){
      acciones+=`<button class="green" onclick="ZX_ag_mapa('${limpiar(e.direccion)}')">📍 Mapa</button>`;
    }
  }else{
    acciones+=`<button class="blue" onclick="ZX_ag_editar('${limpiar(e.id)}')">Editar</button>`;

    if(!done && !canc){
      acciones+=`<button class="green" onclick="ZX_ag_completar('${limpiar(e.id)}')">Hecho</button>`;
      acciones+=`<button class="orange" onclick="ZX_ag_cancelar('${limpiar(e.id)}')">Cancelar</button>`;
    }

    acciones+=`<button class="red" onclick="ZX_ag_borrar('${limpiar(e.id)}')">Borrar</button>`;
  }

  return `
    <article class="zx_ag_event ${colorTipo(e.tipo)}">
      <div class="zx_ag_event_top">
        <div>
          <b>${limpiar(e.titulo || "Evento")}</b>
          <span>${limpiar(textoTipo(e.tipo))} · ${limpiar(textoEstado(e.estado))}</span>
        </div>
        <em>${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}</em>
      </div>

      <div class="zx_ag_event_txt">
        ${e.usuario ? `<p>👤 ${limpiar(e.usuario)}</p>` : ""}
        ${e.cliente ? `<p>👥 ${limpiar(e.cliente)}</p>` : ""}
        ${e.vehiculo ? `<p>🚗 ${limpiar(e.vehiculo)}</p>` : ""}
        ${e.descripcion ? `<p>${limpiar(e.descripcion)}</p>` : ""}
        ${trabajo ? `<p><b>Vinculado a trabajo</b></p>` : ""}
      </div>

      <div class="zx_ag_actions">${acciones}</div>
    </article>
  `;
}

function renderListaTitulo(titulo,lista,vacio){
  return `
    <section class="zx_ag_panel">
      <h3>${limpiar(titulo)}</h3>
      ${lista.length ? lista.map(renderEvento).join("") : `<div class="zx_ag_empty">${limpiar(vacio)}</div>`}
    </section>
  `;
}

function renderListas(){
  const fHoy=hoy();
  const manana=sumarDias(fHoy,1);
  const siete=sumarDias(fHoy,7);

  const hoyEventos=filtrarEventos(eventosDia(fHoy));
  const mananaEventos=filtrarEventos(eventosDia(manana));
  const proximos=filtrarEventos(ZX_AGENDA_CACHE.filter(function(e){
    const f=normalizarFecha(e.fecha_inicio);
    return f>manana && f<=siete && !terminado(e) && !cancelado(e);
  }));

  return `
    <div class="zx_ag_lists">
      ${renderListaTitulo("Hoy",hoyEventos,"Sin eventos para hoy.")}
      ${renderListaTitulo("Mañana",mananaEventos,"Sin eventos para mañana.")}
      ${renderListaTitulo("Próximos 7 días",proximos,"Sin próximos eventos.")}
    </div>
  `;
}

async function cargarUsuarios(){
  if(!navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("usuarios")
      .select("id,nombre,usuario,rol,activo")
      .eq("activo",true)
      .order("nombre",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarClientes(){
  if(!navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("clientes")
      .select("id,nombre,razon_social,cliente,empresa,nombre_comercial")
      .order("nombre",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarVehiculos(){
  if(!navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("vehiculos")
      .select("id,matricula,marca,modelo,activo")
      .order("matricula",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

function nombreCliente(c){
  return c.nombre || c.razon_social || c.cliente || c.empresa || c.nombre_comercial || "";
}

function nombreVehiculo(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ");
}

function opciones(lista,valor,tipo){
  const vacio=tipo==="usuario" ? "Sin asignar" : tipo==="cliente" ? "Sin cliente" : "Sin vehículo";

  return `<option value="">${vacio}</option>`+lista.map(function(x){
    let nombre="";

    if(tipo==="usuario") nombre=x.nombre || x.usuario || "";
    if(tipo==="cliente") nombre=nombreCliente(x);
    if(tipo==="vehiculo") nombre=nombreVehiculo(x);

    return `<option value="${limpiar(nombre)}" data-id="${limpiar(x.id || "")}" ${String(valor || "")===String(nombre) ? "selected" : ""}>${limpiar(nombre)}</option>`;
  }).join("");
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_agenda");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modalBase(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");

  const div=document.createElement("div");
  div.id="zx_modal_agenda";
  div.className="zx_modal_fondo";
  div.innerHTML=`<div class="zx_modal_caja">${html}</div>`;
  document.body.appendChild(div);
}

async function abrirModalEvento(e,fecha){
  e=e || {};

  modalBase(`
    <h2>${e.id ? "Editar evento" : "Nuevo evento"}</h2>

    ${esTrabajo(e) ? `<div class="zx_ag_notice">Este evento está vinculado a un trabajo. Los cambios importantes deben hacerse desde Trabajos.</div>` : ""}

    <label class="zx_ag_label">Tipo</label>
    <select id="ag_tipo" ${esTrabajo(e) ? "disabled" : ""}>
      <option value="cita" ${e.tipo==="cita" ? "selected" : ""}>Cita</option>
      <option value="trabajo" ${e.tipo==="trabajo" ? "selected" : ""}>Trabajo</option>
      <option value="recordatorio" ${e.tipo==="recordatorio" ? "selected" : ""}>Nota</option>
      <option value="revision" ${e.tipo==="revision" ? "selected" : ""}>Revisión</option>
      <option value="permiso" ${e.tipo==="permiso" ? "selected" : ""}>Permiso</option>
      <option value="vacaciones" ${e.tipo==="vacaciones" ? "selected" : ""}>Vacaciones</option>
      <option value="asuntos_propios" ${e.tipo==="asuntos_propios" ? "selected" : ""}>Asuntos propios</option>
      <option value="baja_medica" ${e.tipo==="baja_medica" ? "selected" : ""}>Baja médica</option>
      <option value="libranza" ${e.tipo==="libranza" ? "selected" : ""}>Libranza</option>
      <option value="festivo" ${e.tipo==="festivo" ? "selected" : ""}>Festivo</option>
    </select>

    <label class="zx_ag_label">Título</label>
    <input id="ag_titulo" value="${limpiar(e.titulo || "")}" placeholder="Título">

    <div class="zx_ag_grid2">
      <div>
        <label class="zx_ag_label">Fecha inicio</label>
        <input id="ag_fecha_inicio" type="date" value="${limpiar(normalizarFecha(e.fecha_inicio || fecha || hoy()))}">
      </div>
      <div>
        <label class="zx_ag_label">Fecha fin</label>
        <input id="ag_fecha_fin" type="date" value="${limpiar(normalizarFecha(e.fecha_fin || e.fecha_inicio || fecha || hoy()))}">
      </div>
    </div>

    <div class="zx_ag_grid2">
      <div>
        <label class="zx_ag_label">Hora inicio</label>
        <input id="ag_hora_inicio" type="time" value="${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}">
      </div>
      <div>
        <label class="zx_ag_label">Hora fin</label>
        <input id="ag_hora_fin" type="time" value="${limpiar(e.hora_fin ? String(e.hora_fin).slice(0,5) : "")}">
      </div>
    </div>

    <label class="zx_ag_label">Operario</label>
    <select id="ag_usuario"><option value="">Cargando...</option></select>

    <label class="zx_ag_label">Cliente</label>
    <select id="ag_cliente"><option value="">Cargando...</option></select>

    <label class="zx_ag_label">Vehículo</label>
    <select id="ag_vehiculo"><option value="">Cargando...</option></select>

    <label class="zx_ag_label">Descripción</label>
    <textarea id="ag_descripcion" rows="4">${limpiar(e.descripcion || "")}</textarea>

    <label class="zx_ag_label">Prioridad</label>
    <select id="ag_prioridad">
      <option value="normal" ${e.prioridad==="normal" ? "selected" : ""}>Normal</option>
      <option value="alta" ${e.prioridad==="alta" ? "selected" : ""}>Alta</option>
      <option value="urgente" ${e.prioridad==="urgente" ? "selected" : ""}>Urgente</option>
    </select>

    <button class="zx_btn_big zx_verde" id="ag_guardar">Guardar</button>
    <button class="zx_btn_big zx_gris" id="ag_cancelar">Cancelar</button>
  `);

  document.getElementById("ag_cancelar").onclick=cerrarModal;
  document.getElementById("ag_guardar").onclick=function(){guardarEvento(e.id || null,e)};

  const [usuarios,clientes,vehiculos]=await Promise.all([
    cargarUsuarios(),
    cargarClientes(),
    cargarVehiculos()
  ]);

  const uSel=document.getElementById("ag_usuario");
  const cSel=document.getElementById("ag_cliente");
  const vSel=document.getElementById("ag_vehiculo");

  if(uSel) uSel.innerHTML=opciones(usuarios,e.usuario,"usuario");
  if(cSel) cSel.innerHTML=opciones(clientes,e.cliente,"cliente");
  if(vSel) vSel.innerHTML=opciones(vehiculos,e.vehiculo,"vehiculo");
}

function dataFormulario(original){
  const u=document.getElementById("ag_usuario");
  const c=document.getElementById("ag_cliente");
  const v=document.getElementById("ag_vehiculo");
  const s=sesion();

  return {
    tipo:document.getElementById("ag_tipo").value || original.tipo || "cita",
    titulo:String(document.getElementById("ag_titulo").value || "").trim(),
    descripcion:String(document.getElementById("ag_descripcion").value || "").trim(),
    fecha_inicio:document.getElementById("ag_fecha_inicio").value,
    fecha_fin:document.getElementById("ag_fecha_fin").value || document.getElementById("ag_fecha_inicio").value,
    hora_inicio:document.getElementById("ag_hora_inicio").value || null,
    hora_fin:document.getElementById("ag_hora_fin").value || null,
    usuario_id:u && u.selectedOptions[0] ? String(u.selectedOptions[0].dataset.id || "") : "",
    usuario:u ? u.value : "",
    cliente_id:c && c.selectedOptions[0] ? String(c.selectedOptions[0].dataset.id || "") : "",
    cliente:c ? c.value : "",
    vehiculo_id:v && v.selectedOptions[0] ? String(v.selectedOptions[0].dataset.id || "") : "",
    vehiculo:v ? v.value : "",
    prioridad:document.getElementById("ag_prioridad").value || "normal",
    estado:original.estado || "activo",
    visible_para:"todos",
    creado_por:original.creado_por || s.usuario || "sistema",
    origen:original.origen || "manual",
    origen_id:original.origen_id || null
  };
}

function validarEvento(data){
  if(!data.titulo){
    alert("El título es obligatorio.");
    return false;
  }

  if(!data.fecha_inicio){
    alert("La fecha de inicio es obligatoria.");
    return false;
  }

  if(data.fecha_fin && data.fecha_fin<data.fecha_inicio){
    alert("La fecha fin no puede ser anterior a la fecha de inicio.");
    return false;
  }

  return true;
}

async function guardarEvento(id,original){
  original=original || {};
  const data=dataFormulario(original);

  if(!validarEvento(data)) return;

  try{
    let r;

    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id
        ? await zx().update(TABLA,data,"id",id)
        : await zx().insert(TABLA,[data]);
    }else if(id){
      r=await sb().from(TABLA).update(data).eq("id",id);
    }else{
      r=await sb().from(TABLA).insert([data]);
    }

    if(r && r.error) throw r.error;

    cerrarModal();
    await recargarAgenda();

  }catch(e){
    alert("No se pudo guardar: "+(e.message || "Error"));
  }
}

async function cambiarEstado(id,estado){
  if(!id) return;

  try{
    let r;

    if(zx() && typeof zx().update==="function"){
      r=await zx().update(TABLA,{estado:estado},"id",id);
    }else{
      r=await sb().from(TABLA).update({estado:estado}).eq("id",id);
    }

    if(r && r.error) throw r.error;

    await recargarAgenda();

  }catch(e){
    alert("No se pudo actualizar el evento.");
  }
}

async function borrarEvento(id){
  if(!id) return;
  if(!confirm("¿Borrar este evento?")) return;

  try{
    let r;

    if(zx() && typeof zx().remove==="function"){
      r=await zx().remove(TABLA,"id",id);
    }else{
      r=await sb().from(TABLA).delete().eq("id",id);
    }

    if(r && r.error) throw r.error;

    await recargarAgenda();

  }catch(e){
    alert("No se pudo borrar el evento.");
  }
}

async function recargarAgenda(){
  ZX_AGENDA_CACHE=[];
  await cargarEventos();
  repintarDatos();
  setEstado("synced");
}

window.ZX_ag_nuevo=function(fecha){
  abrirModalEvento(null,fecha || hoy());
};

window.ZX_ag_editar=function(id){
  const e=ZX_AGENDA_CACHE.find(x=>String(x.id)===String(id));
  if(e) abrirModalEvento(e);
};

window.ZX_ag_completar=function(id){
  cambiarEstado(id,"completado");
};

window.ZX_ag_cancelar=function(id){
  cambiarEstado(id,"cancelado");
};

window.ZX_ag_borrar=function(id){
  borrarEvento(id);
};

window.ZX_ag_mapa=function(direccion){
  const d=String(direccion || "").trim();
  if(!d) return;
  window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(d),"_blank");
};

window.ZX_ag_abrirTrabajo=function(id){
  cerrarModal();

  window.ZX_TRABAJO_ABRIR_ID=String(id || "");

  if(window.ZX_trabajos){
    window.ZX_trabajos();
    return;
  }

  if(window.ZX_abrirTrabajos){
    window.ZX_abrirTrabajos();
    return;
  }

  alert("No se ha cargado Trabajos.");
};

window.ZX_ag_verDia=function(fecha){
  const lista=filtrarEventos(eventosDia(fecha));

  modalBase(`
    <h2>${formatoFecha(fecha)}</h2>
    ${lista.length ? lista.map(renderEvento).join("") : `<div class="zx_text">Sin eventos.</div>`}
    <button class="zx_btn_big zx_verde" onclick="ZX_ag_nuevo('${limpiar(fecha)}')">Nuevo evento</button>
    <button class="zx_btn_big zx_gris" onclick="document.getElementById('zx_modal_agenda').remove();document.body.classList.remove('zx_modal_abierto')">Cerrar</button>
  `);
};

window.ZX_ag_mesAnterior=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()-1);
  window.ZX_agenda();
};

window.ZX_ag_mesSiguiente=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()+1);
  window.ZX_agenda();
};

window.ZX_ag_hoy=function(){
  ZX_AGENDA_FECHA=new Date();
  window.ZX_agenda();
};

window.ZX_ag_filtro=function(tipo){
  ZX_AGENDA_FILTRO=tipo;
  window.ZX_agenda();
};

function instalarCSS(){
  const old=document.getElementById("zx_agenda_css_v3108");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_agenda_css_v3108";
  s.innerHTML=`
    .zx_ag_shell{
      display:grid;
      grid-template-columns:1fr;
      gap:14px;
      padding-bottom:calc(env(safe-area-inset-bottom) + 118px);
    }

    .zx_ag_panel{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:26px;
      padding:18px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
      overflow:hidden;
    }

    .zx_ag_header{
      display:grid;
      grid-template-columns:1fr auto;
      gap:12px;
      align-items:start;
    }

    .zx_ag_header h2{
      margin:0;
      color:#071330;
      font-size:30px;
      line-height:1.05;
      font-weight:950;
      letter-spacing:-.5px;
    }

    .zx_ag_header p{
      margin:8px 0 0;
      color:#64748b;
      font-size:15px;
      font-weight:850;
      line-height:1.35;
    }

    .zx_ag_new{
      border:0;
      border-radius:18px;
      background:#16a34a;
      color:white;
      padding:14px 16px;
      font-size:16px;
      font-weight:950;
      white-space:nowrap;
    }

    .zx_ag_filters{
      grid-column:1/-1;
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding-bottom:3px;
    }

    .zx_ag_filters button{
      border:0;
      border-radius:999px;
      padding:10px 13px;
      background:#f1f5f9;
      color:#334155;
      font-size:13px;
      font-weight:950;
      white-space:nowrap;
    }

    .zx_ag_filters button.on{
      background:#2563eb;
      color:white;
    }

    .zx_ag_month_head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:14px;
    }

    .zx_ag_month_head>button{
      width:52px;
      height:52px;
      border:0;
      border-radius:18px;
      background:#dbeafe;
      color:#2563eb;
      font-size:30px;
      font-weight:950;
    }

    .zx_ag_month_head h3{
      margin:0;
      color:#071330;
      text-align:center;
      font-size:24px;
      font-weight:950;
      text-transform:capitalize;
    }

    .zx_ag_month_head div button{
      display:block;
      margin:8px auto 0;
      border:0;
      border-radius:999px;
      background:#f1f5f9;
      color:#334155;
      padding:8px 14px;
      font-size:13px;
      font-weight:950;
    }

    .zx_ag_weekdays,
    .zx_ag_calendar{
      display:grid;
      grid-template-columns:repeat(7,minmax(0,1fr));
      gap:6px;
    }

    .zx_ag_weekdays{
      margin-bottom:8px;
    }

    .zx_ag_weekdays div{
      text-align:center;
      color:#64748b;
      font-size:12px;
      font-weight:950;
    }

    .zx_ag_day{
      min-height:82px;
      border:1px solid #dbe3ef;
      border-radius:16px;
      background:#f8fafc;
      padding:7px;
      text-align:left;
      overflow:hidden;
    }

    .zx_ag_day.empty{
      background:transparent;
      border:0;
      pointer-events:none;
    }

    .zx_ag_day.today{
      background:#eff6ff;
      border:2px solid #2563eb;
    }

    .zx_ag_day b{
      display:block;
      color:#071330;
      font-size:14px;
      font-weight:950;
      margin-bottom:5px;
    }

    .zx_ag_day span{
      display:block;
      border-radius:8px;
      padding:3px 5px;
      margin-top:3px;
      color:white;
      font-size:9px;
      line-height:1.15;
      font-weight:900;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .zx_ag_day em{
      display:block;
      margin-top:4px;
      color:#64748b;
      font-size:10px;
      font-style:normal;
      font-weight:950;
    }

    .zx_ag_loading,
    .zx_ag_empty{
      color:#64748b;
      font-size:16px;
      font-weight:850;
      padding:12px 0;
    }

    .zx_ag_lists{
      display:grid;
      grid-template-columns:1fr;
      gap:14px;
    }

    .zx_ag_event{
      border-radius:22px;
      padding:15px;
      margin-top:12px;
      color:white;
      box-shadow:0 10px 24px rgba(15,23,42,.08);
    }

    .zx_ag_event_top{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:flex-start;
    }

    .zx_ag_event_top b{
      display:block;
      font-size:18px;
      line-height:1.2;
      font-weight:950;
    }

    .zx_ag_event_top span{
      display:block;
      margin-top:5px;
      font-size:13px;
      font-weight:850;
      opacity:.92;
    }

    .zx_ag_event_top em{
      font-style:normal;
      font-size:15px;
      font-weight:950;
      white-space:nowrap;
    }

    .zx_ag_event_txt{
      margin-top:10px;
      font-size:14px;
      line-height:1.35;
      font-weight:800;
    }

    .zx_ag_event_txt p{
      margin:4px 0;
    }

    .zx_ag_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin-top:14px;
    }

    .zx_ag_actions button{
      border:0;
      border-radius:15px;
      padding:12px 8px;
      color:white;
      font-size:14px;
      font-weight:950;
    }

    .zx_ag_actions .blue{background:#2563eb}
    .zx_ag_actions .green{background:#16a34a}
    .zx_ag_actions .orange{background:#f97316}
    .zx_ag_actions .red{background:#dc2626}

    .zx_ag_event.trabajo,
    .zx_ag_day span.trabajo{background:#2563eb}
    .zx_ag_event.cita,
    .zx_ag_day span.cita{background:#7c3aed}
    .zx_ag_event.vacaciones,
    .zx_ag_day span.vacaciones{background:#16a34a}
    .zx_ag_event.asuntos,
    .zx_ag_day span.asuntos{background:#0ea5e9}
    .zx_ag_event.permiso,
    .zx_ag_day span.permiso{background:#f59e0b}
    .zx_ag_event.baja,
    .zx_ag_day span.baja{background:#dc2626}
    .zx_ag_event.nota,
    .zx_ag_day span.nota{background:#64748b}
    .zx_ag_event.revision,
    .zx_ag_day span.revision{background:#0f766e}
    .zx_ag_event.festivo,
    .zx_ag_day span.festivo{background:#9333ea}
    .zx_ag_event.libranza,
    .zx_ag_day span.libranza{background:#0891b2}
    .zx_ag_event.default,
    .zx_ag_day span.default{background:#334155}

    .zx_ag_label{
      display:block;
      margin-top:13px;
      margin-bottom:6px;
      color:#475569;
      font-size:14px;
      font-weight:950;
    }

    .zx_ag_grid2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .zx_ag_notice{
      background:#fff7ed;
      border:1px solid #fed7aa;
      color:#9a3412;
      border-radius:18px;
      padding:14px;
      margin-bottom:14px;
      font-size:15px;
      font-weight:900;
      line-height:1.35;
    }

    #zx_modal_agenda input,
    #zx_modal_agenda select,
    #zx_modal_agenda textarea{
      width:100%;
      border:1px solid #dbe3ef;
      border-radius:16px;
      padding:13px;
      font-size:16px;
      font-weight:800;
      color:#071330;
      background:#f8fafc;
    }

    @media(max-width:390px){
      .zx_ag_panel{padding:15px;border-radius:22px}
      .zx_ag_header h2{font-size:27px}
      .zx_ag_day{min-height:72px;padding:5px;border-radius:13px}
      .zx_ag_day b{font-size:12px}
      .zx_ag_day span{font-size:8px;padding:2px 4px}
      .zx_ag_grid2{grid-template-columns:1fr}
      .zx_ag_actions{grid-template-columns:1fr}
    }

    @media(min-width:760px){
      .zx_ag_shell{
        padding-bottom:32px;
      }

      .zx_ag_lists{
        grid-template-columns:repeat(3,minmax(0,1fr));
      }

      .zx_ag_day{
        min-height:112px;
      }

      .zx_ag_day span{
        font-size:11px;
      }
    }

    @media(min-width:1100px){
      .zx_ag_panel{padding:22px}
      .zx_ag_day{min-height:128px}
    }
  `;

  document.head.appendChild(s);
}

window.ZX_agenda=async function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("agenda");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="agenda") b.classList.add("zx_activo");
    });
  }

  pintarShell();

  setTimeout(async function(){
    await cargarEventos();
    repintarDatos();
  },20);
};

window.addEventListener("online",function(){
  setTimeout(function(){prepararTrabajosOffline(ZX_AGENDA_CACHE)},1200);
});

window.ZX_abrirAgenda=window.ZX_agenda;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("agenda",{
    nombre:"Agenda",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX agenda.js V"+ZX_VERSION+" cargado");

})();