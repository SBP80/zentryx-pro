// ===============================
// ZENTRYX PRO - APP BASE
// V3101
// ===============================
(function(){
"use strict";

const ZX_VERSION="3101";

const SUPABASE_URL="https://idtaamivqbiuxtjywuux.supabase.co";
const SUPABASE_KEY="sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";
const CONFIG_KEY="zentryx_config";
const OFFLINE_QUEUE_KEY="zentryx_offline_queue";
const OFFLINE_CACHE_PREFIX="zentryx_cache_";

function safeJSONParse(raw,fallback){
  try{
    if(raw===null || raw===undefined || raw==="") return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}

function storageGet(key,fallback){
  try{
    return safeJSONParse(localStorage.getItem(key),fallback);
  }catch(e){
    return fallback;
  }
}

function storageSet(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    return false;
  }
}

function storageRemove(key){
  try{
    localStorage.removeItem(key);
    return true;
  }catch(e){
    return false;
  }
}

function texto(v){
  return String(v ?? "");
}

function limpiar(v){
  return texto(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizar(v){
  return texto(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function ahoraISO(){
  return new Date().toISOString();
}

function fechaISO(){
  return new Date().toISOString().slice(0,10);
}

function uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();

  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function formatoFechaES(valor){
  if(!valor) return "";
  const s=texto(valor).slice(0,10);

  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)){
    return limpiar(s);
  }

  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function formatoFechaHoraES(valor){
  if(!valor) return "";

  const d=new Date(valor);
  if(isNaN(d.getTime())) return formatoFechaES(valor);

  return d.toLocaleString("es-ES",{
    day:"2-digit",
    month:"2-digit",
    year:"numeric",
    hour:"2-digit",
    minute:"2-digit"
  });
}

function getSupabase(){
  if(window.sb) return window.sb;
  if(window.supabaseClient) return window.supabaseClient;

  if(!window.supabase || !window.supabase.createClient){
    console.error("Supabase no está disponible.");
    return null;
  }

  const cliente=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  window.sb=cliente;
  window.supabaseClient=cliente;
  return cliente;
}

function sesion(){
  const fromHelper=typeof window.ZENTRYX_readSession==="function"
    ? window.ZENTRYX_readSession()
    : null;

  if(fromHelper && fromHelper.id && fromHelper.usuario){
    return fromHelper;
  }

  const s=storageGet(SESSION_KEY,{});
  return s && typeof s==="object" ? s : {};
}

function usuarioLocal(){
  const u=storageGet(USER_KEY,{});
  return u && typeof u==="object" ? u : {};
}

function usuarioActual(){
  const s=sesion();
  const u=usuarioLocal();

  return {
    id:s.id || u.id || "",
    usuario:s.usuario || u.usuario || "",
    nombre:s.nombre || u.nombre || s.usuario || u.usuario || "",
    rol:s.rol || u.rol || "Usuario",
    empresa_id:s.empresa_id || u.empresa_id || "demo"
  };
}

function rol(){
  return normalizar(usuarioActual().rol);
}

function usuario(){
  return normalizar(usuarioActual().usuario);
}

function esAdmin(){
  return rol()==="administrador" || usuario()==="admin";
}

function leerConfig(){
  const saved=storageGet(CONFIG_KEY,{});

  return Object.assign({
    empresa_id:"demo",
    producto:"Zentryx PRO",
    modo:"desarrollo",
    comercial:true,
    modulos:{
      inicio:true,
      fichaje:true,
      agenda:true,
      clientes:true,
      trabajos:true,
      usuarios:true,
      horas:true,
      control:true,
      config:true,
      vehiculos:true
    }
  },saved || {});
}

function guardarConfig(config){
  const base=leerConfig();
  const next=Object.assign({},base,config || {});
  storageSet(CONFIG_KEY,next);
  window.ZENTRYX.config=next;
  return next;
}

function moduloActivo(nombre){
  const cfg=leerConfig();
  const key=normalizar(nombre);
  if(!cfg.modulos) return true;
  if(cfg.modulos[key]===false) return false;
  return true;
}

function registrarModulo(nombre,modulo){
  if(!nombre) return false;

  const key=normalizar(nombre);

  window.ZENTRYX.modulos[key]=Object.assign({
    id:key,
    nombre:nombre,
    activo:moduloActivo(key),
    version:"",
    registrado_en:ahoraISO()
  },modulo || {});

  return true;
}

function obtenerModulo(nombre){
  return window.ZENTRYX.modulos[normalizar(nombre)] || null;
}

function listarModulos(){
  return Object.keys(window.ZENTRYX.modulos || {});
}

function marcarModuloActivo(nombre){
  const n=texto(nombre);

  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.classList.remove("zx_activo");

    if(texto(btn.dataset.modulo)===n){
      btn.classList.add("zx_activo");
    }
  });
}

function cacheKey(tabla){
  return OFFLINE_CACHE_PREFIX+normalizar(tabla);
}

function cacheLeer(tabla){
  return storageGet(cacheKey(tabla),[]);
}

function cacheGuardar(tabla,datos){
  return storageSet(cacheKey(tabla),Array.isArray(datos) ? datos : []);
}

function colaLeer(){
  return storageGet(OFFLINE_QUEUE_KEY,[]);
}

function colaGuardar(lista){
  return storageSet(OFFLINE_QUEUE_KEY,Array.isArray(lista) ? lista : []);
}

function colaAdd(item){
  const lista=colaLeer();

  lista.push(Object.assign({
    id:uuid(),
    estado:"pendiente",
    creado_en:ahoraISO(),
    intentos:0
  },item || {}));

  colaGuardar(lista);
  actualizarEstadoConexion();
  return lista;
}

function colaPendiente(){
  return colaLeer().filter(function(i){
    return i && i.estado==="pendiente";
  });
}

function setSyncStatus(tipo){
  if(typeof window.ZENTRYX_SET_SYNC_STATUS==="function"){
    window.ZENTRYX_SET_SYNC_STATUS(tipo);
  }

  renderEstadoConexion(tipo);
}

function ensureEstadoConexion(){
  let el=document.getElementById("zx_connection_status");

  if(!el){
    el=document.createElement("div");
    el.id="zx_connection_status";
    document.body.appendChild(el);
  }

  if(!document.getElementById("zx_connection_status_css")){
    const st=document.createElement("style");
    st.id="zx_connection_status_css";
    st.innerHTML=`
      #zx_connection_status{
        position:fixed;
        right:12px;
        bottom:calc(env(safe-area-inset-bottom) + 12px);
        z-index:999999;
        border:0;
        border-radius:999px;
        padding:9px 13px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
        font-size:12px;
        font-weight:900;
        color:#0f172a;
        background:#dcfce7;
        box-shadow:0 10px 28px rgba(15,23,42,.22);
        pointer-events:none;
      }
      #zx_connection_status.zx_offline{background:#fef3c7;color:#92400e}
      #zx_connection_status.zx_syncing{background:#dbeafe;color:#1d4ed8}
      #zx_connection_status.zx_synced{background:#dcfce7;color:#166534}
    `;
    document.head.appendChild(st);
  }

  return el;
}

function renderEstadoConexion(tipo){
  const el=ensureEstadoConexion();

  el.className="";

  if(tipo==="syncing"){
    el.classList.add("zx_syncing");
    el.textContent="🔄 Sincronizando";
    return;
  }

  if(tipo==="offline" || !navigator.onLine){
    el.classList.add("zx_offline");
    el.textContent="🟡 Sin conexión";
    return;
  }

  if(colaPendiente().length>0){
    el.classList.add("zx_syncing");
    el.textContent="🔄 Pendiente";
    return;
  }

  el.classList.add("zx_synced");
  el.textContent=tipo==="synced" ? "✅ Sincronizado" : "🟢 Conectado";
}

function actualizarEstadoConexion(){
  if(!navigator.onLine){
    renderEstadoConexion("offline");
    return;
  }

  if(colaPendiente().length>0){
    renderEstadoConexion("syncing");
    return;
  }

  renderEstadoConexion("online");
}

async function syncOfflineQueue(){
  if(!navigator.onLine) {
    actualizarEstadoConexion();
    return {ok:false,offline:true};
  }

  const sb=getSupabase();
  if(!sb) return {ok:false,error:"Sin Supabase"};

  const lista=colaLeer();
  const pendientes=lista.filter(function(i){
    return i && i.estado==="pendiente";
  });

  if(!pendientes.length){
    actualizarEstadoConexion();
    return {ok:true,sincronizados:0};
  }

  setSyncStatus("syncing");

  let sincronizados=0;

  for(const item of pendientes){
    try{
      item.intentos=(item.intentos || 0)+1;
      item.ultimo_intento=ahoraISO();

      let r=null;

      if(item.operacion==="insert"){
        r=await sb.from(item.tabla).insert(item.data);
      }else if(item.operacion==="update"){
        r=await sb.from(item.tabla).update(item.data).eq(item.campo || "id",item.valor);
      }else if(item.operacion==="upsert"){
        r=await sb.from(item.tabla).upsert(item.data);
      }else if(item.operacion==="delete"){
        r=await sb.from(item.tabla).delete().eq(item.campo || "id",item.valor);
      }

      if(r && r.error){
        item.error=r.error.message || "Error";
        continue;
      }

      item.estado="sincronizado";
      item.sincronizado_en=ahoraISO();
      item.error="";
      sincronizados++;

    }catch(e){
      item.error=e && e.message ? e.message : "Error";
    }
  }

  colaGuardar(lista);

  const quedan=colaPendiente().length;

  if(quedan>0){
    renderEstadoConexion("syncing");
  }else{
    renderEstadoConexion("synced");
    setTimeout(actualizarEstadoConexion,1400);
  }

  return {ok:quedan===0,sincronizados:sincronizados,pendientes:quedan};
}

async function selectCache(tabla,consulta){
  const sb=getSupabase();

  if(!navigator.onLine || !sb){
    return {data:cacheLeer(tabla),error:null,offline:true};
  }

  try{
    const r=typeof consulta==="function"
      ? await consulta(sb.from(tabla))
      : await sb.from(tabla).select("*");

    if(!r.error && Array.isArray(r.data)){
      cacheGuardar(tabla,r.data);
    }

    return r;
  }catch(e){
    return {data:cacheLeer(tabla),error:null,offline:true};
  }
}

function guardarOffline(tabla,operacion,data,campo,valor){
  colaAdd({
    tabla:tabla,
    operacion:operacion,
    data:data || null,
    campo:campo || "id",
    valor:valor || (data && data.id) || ""
  });
}

function estadoSistema(){
  return {
    nombre:"Zentryx PRO",
    version:ZX_VERSION,
    fecha:ahoraISO(),
    conectado:navigator.onLine,
    cola_pendiente:colaPendiente().length,
    usuario:usuarioActual(),
    config:leerConfig(),
    modulos:listarModulos()
  };
}

function bootDOM(){
  ensureEstadoConexion();
  actualizarEstadoConexion();

  const obs=new MutationObserver(function(){
    ensureEstadoConexion();
    actualizarEstadoConexion();
  });

  if(document.body){
    obs.observe(document.body,{childList:true});
  }

  window.addEventListener("online",function(){
    setSyncStatus("syncing");
    syncOfflineQueue();
  });

  window.addEventListener("offline",function(){
    setSyncStatus("offline");
  });

  window.addEventListener("pageshow",function(){
    actualizarEstadoConexion();
    if(navigator.onLine) syncOfflineQueue();
  });

  setInterval(function(){
    actualizarEstadoConexion();
    if(navigator.onLine && colaPendiente().length>0){
      syncOfflineQueue();
    }
  },30000);
}

window.ZENTRYX=window.ZENTRYX || {};
window.ZENTRYX.version=ZX_VERSION;
window.ZENTRYX.nombre="Zentryx PRO";
window.ZENTRYX.estado="app cargada";
window.ZENTRYX.modulos=window.ZENTRYX.modulos || {};
window.ZENTRYX.config=leerConfig();

window.ZENTRYX.sb=getSupabase;
window.ZENTRYX.sesion=sesion;
window.ZENTRYX.usuarioActual=usuarioActual;
window.ZENTRYX.usuario=usuario;
window.ZENTRYX.rol=rol;
window.ZENTRYX.esAdmin=esAdmin;

window.ZENTRYX.limpiar=limpiar;
window.ZENTRYX.normalizar=normalizar;
window.ZENTRYX.fechaISO=fechaISO;
window.ZENTRYX.ahoraISO=ahoraISO;
window.ZENTRYX.formatoFechaES=formatoFechaES;
window.ZENTRYX.formatoFechaHoraES=formatoFechaHoraES;
window.ZENTRYX.uuid=uuid;

window.ZENTRYX.guardarConfig=guardarConfig;
window.ZENTRYX.moduloActivo=moduloActivo;
window.ZENTRYX.registrarModulo=registrarModulo;
window.ZENTRYX.obtenerModulo=obtenerModulo;
window.ZENTRYX.listarModulos=listarModulos;
window.ZENTRYX.marcarModuloActivo=marcarModuloActivo;

window.ZENTRYX.cacheLeer=cacheLeer;
window.ZENTRYX.cacheGuardar=cacheGuardar;
window.ZENTRYX.selectCache=selectCache;
window.ZENTRYX.guardarOffline=guardarOffline;
window.ZENTRYX.colaLeer=colaLeer;
window.ZENTRYX.colaPendiente=colaPendiente;
window.ZENTRYX.syncOfflineQueue=syncOfflineQueue;

window.ZENTRYX.estadoSistema=estadoSistema;
window.ZENTRYX.actualizarEstadoConexion=actualizarEstadoConexion;
window.ZENTRYX.setSyncStatus=setSyncStatus;

window.ZX=window.ZENTRYX;

window.sb=getSupabase();
window.supabaseClient=window.sb;

registrarModulo("app",{
  nombre:"App",
  activo:true,
  version:ZX_VERSION,
  descripcion:"Base general de arranque, estado, módulos, caché local y cola offline"
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bootDOM);
}else{
  bootDOM();
}

console.log("Zentryx PRO app cargada V"+ZX_VERSION);

})();