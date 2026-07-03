// ===============================
// ZENTRYX PRO - APP BASE
// V3106
// ===============================
(function(){
"use strict";

const ZX_VERSION="3106";

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
  if(window.crypto && crypto.randomUUID){
    return crypto.randomUUID();
  }

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

  if(isNaN(d.getTime())){
    return formatoFechaES(valor);
  }

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
  const helper=typeof window.ZENTRYX_readSession==="function"
    ? window.ZENTRYX_readSession()
    : null;

  if(helper && helper.id && helper.usuario){
    return helper;
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

function configBase(){
  return {
    empresa_id:"demo",
    producto:"Zentryx PRO",
    modo:"desarrollo",
    comercial:true,
    offline:true,
    sincronizacion_automatica:true,
    modulos:{
      inicio:true,
      fichaje:true,
      agenda:true,
      clientes:true,
      trabajos:true,
      usuarios:true,
      vehiculos:true,
      horas_extra:true,
      control_fichajes:true,
      configuracion:true,
      config_laboral:true,
      solicitudes:true
    }
  };
}

function leerConfig(){
  const saved=storageGet(CONFIG_KEY,{});
  const base=configBase();

  const next=Object.assign({},base,saved || {});
  next.modulos=Object.assign({},base.modulos,(saved && saved.modulos) || {});

  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.getModulos==="function"){
    next.modulos=Object.assign({},next.modulos,window.ZENTRYX_STORE.getModulos());
  }

  return next;
}

function guardarConfig(config){
  const base=leerConfig();
  const next=Object.assign({},base,config || {});
  next.modulos=Object.assign({},base.modulos,(config && config.modulos) || {});
  storageSet(CONFIG_KEY,next);

  if(window.ZENTRYX){
    window.ZENTRYX.config=next;
  }

  return next;
}

function aliasModulo(nombre){
  const k=normalizar(nombre);

  const aliases={
    horas:"horas_extra",
    control:"control_fichajes",
    config:"configuracion",
    ajustes:"configuracion",
    configuracion_laboral:"config_laboral"
  };

  return aliases[k] || k;
}

function moduloActivo(nombre){
  const key=aliasModulo(nombre);
  const cfg=leerConfig();

  if(!cfg.modulos) return true;
  if(cfg.modulos[key]===false) return false;

  return true;
}

function registrarModulo(nombre,modulo){
  if(!nombre) return false;

  const key=aliasModulo(nombre);

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
  return window.ZENTRYX.modulos[aliasModulo(nombre)] || null;
}

function listarModulos(){
  return Object.keys(window.ZENTRYX.modulos || {});
}

function marcarModuloActivo(nombre){
  const n=aliasModulo(nombre);

  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.classList.remove("zx_activo");

    if(aliasModulo(btn.dataset.modulo)===n){
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

function cacheUpsert(tabla,item,campo){
  campo=campo || "id";

  if(!item || !item[campo]) return false;

  const lista=cacheLeer(tabla);
  const idx=lista.findIndex(function(x){
    return String(x[campo])===String(item[campo]);
  });

  if(idx>=0){
    lista[idx]=Object.assign({},lista[idx],item);
  }else{
    lista.unshift(item);
  }

  return cacheGuardar(tabla,lista);
}

function cacheDelete(tabla,valor,campo){
  campo=campo || "id";

  const lista=cacheLeer(tabla).filter(function(x){
    return String(x[campo])!==String(valor);
  });

  return cacheGuardar(tabla,lista);
}

function colaLeer(){
  return storageGet(OFFLINE_QUEUE_KEY,[]);
}

function colaGuardar(lista){
  return storageSet(OFFLINE_QUEUE_KEY,Array.isArray(lista) ? lista : []);
}

function colaPendiente(){
  return colaLeer().filter(function(i){
    return i && i.estado==="pendiente";
  });
}

function colaAdd(item){
  const lista=colaLeer();

  lista.push(Object.assign({
    id:uuid(),
    estado:"pendiente",
    creado_en:ahoraISO(),
    intentos:0,
    usuario:usuarioActual().usuario || "",
    empresa_id:usuarioActual().empresa_id || "demo"
  },item || {}));

  colaGuardar(lista);
  actualizarEstadoConexion();

  return lista;
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
        left:12px;
        bottom:calc(env(safe-area-inset-bottom) + 12px);
        z-index:999999;
        border:0;
        border-radius:999px;
        padding:8px 12px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
        font-size:12px;
        font-weight:900;
        color:#0f172a;
        background:#dcfce7;
        box-shadow:0 10px 28px rgba(15,23,42,.18);
        pointer-events:none;
      }
      #zx_connection_status.zx_offline{background:#fef3c7;color:#92400e}
      #zx_connection_status.zx_syncing{background:#dbeafe;color:#1d4ed8}
      #zx_connection_status.zx_synced{background:#dcfce7;color:#166534}
      @media(min-width:760px){
        #zx_connection_status{
          right:16px;
          left:auto;
          bottom:16px;
        }
      }
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

function audit(tabla,accion,registro_id,descripcion,extra){
  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.addAudit==="function"){
    window.ZENTRYX_STORE.addAudit(tabla,accion,registro_id,descripcion,extra || null);
  }
}

async function syncOfflineQueue(){
  if(!navigator.onLine){
    actualizarEstadoConexion();
    return {ok:false,offline:true};
  }

  const cliente=getSupabase();

  if(!cliente){
    return {ok:false,error:"Sin Supabase"};
  }

  const lista=colaLeer();
  const pendientes=lista.filter(function(i){
    return i && i.estado==="pendiente";
  });

  if(!pendientes.length){
    actualizarEstadoConexion();
    return {ok:true,sincronizados:0,pendientes:0};
  }

  setSyncStatus("syncing");

  let sincronizados=0;

  for(const item of pendientes){
    try{
      item.intentos=(item.intentos || 0)+1;
      item.ultimo_intento=ahoraISO();

      let r=null;

      if(item.operacion==="insert"){
        r=await cliente.from(item.tabla).insert(item.data);
      }else if(item.operacion==="update"){
        r=await cliente.from(item.tabla).update(item.data).eq(item.campo || "id",item.valor);
      }else if(item.operacion==="upsert"){
        r=await cliente.from(item.tabla).upsert(item.data);
      }else if(item.operacion==="delete"){
        r=await cliente.from(item.tabla).delete().eq(item.campo || "id",item.valor);
      }else{
        item.error="Operación no soportada";
        continue;
      }

      if(r && r.error){
        item.error=r.error.message || "Error";
        continue;
      }

      item.estado="sincronizado";
      item.sincronizado_en=ahoraISO();
      item.error="";
      sincronizados++;

      audit(item.tabla,item.operacion,item.valor || "", "Sincronizado sin conexión", item);

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

  return {
    ok:quedan===0,
    sincronizados:sincronizados,
    pendientes:quedan
  };
}

async function selectCache(tabla,consulta){
  const cliente=getSupabase();

  if(!navigator.onLine || !cliente){
    return {
      data:cacheLeer(tabla),
      error:null,
      offline:true
    };
  }

  try{
    const r=typeof consulta==="function"
      ? await consulta(cliente.from(tabla))
      : await cliente.from(tabla).select("*");

    if(!r.error && Array.isArray(r.data)){
      cacheGuardar(tabla,r.data);
    }

    return r;

  }catch(e){
    return {
      data:cacheLeer(tabla),
      error:null,
      offline:true
    };
  }
}

async function insert(tabla,data,opciones){
  opciones=opciones || {};

  const cliente=getSupabase();
  const payload=Array.isArray(data) ? data : [data];

  if(!navigator.onLine || !cliente){
    payload.forEach(function(item){
      if(item && item.id) cacheUpsert(tabla,item);
    });

    colaAdd({
      tabla:tabla,
      operacion:"insert",
      data:payload,
      campo:opciones.campo || "id",
      valor:opciones.valor || ""
    });

    return {data:payload,error:null,offline:true};
  }

  const r=await cliente.from(tabla).insert(payload);

  if(!r.error){
    audit(tabla,"insert",opciones.valor || "", "Registro creado", payload);
  }

  return r;
}

async function update(tabla,data,campo,valor){
  campo=campo || "id";

  const cliente=getSupabase();

  if(!navigator.onLine || !cliente){
    cacheUpsert(tabla,Object.assign({},data,{[campo]:valor}),campo);

    colaAdd({
      tabla:tabla,
      operacion:"update",
      data:data,
      campo:campo,
      valor:valor
    });

    return {data:data,error:null,offline:true};
  }

  const r=await cliente.from(tabla).update(data).eq(campo,valor);

  if(!r.error){
    audit(tabla,"update",valor,"Registro actualizado",data);
  }

  return r;
}

async function upsert(tabla,data){
  const cliente=getSupabase();
  const payload=Array.isArray(data) ? data : [data];

  if(!navigator.onLine || !cliente){
    payload.forEach(function(item){
      if(item && item.id) cacheUpsert(tabla,item);
    });

    colaAdd({
      tabla:tabla,
      operacion:"upsert",
      data:payload
    });

    return {data:payload,error:null,offline:true};
  }

  const r=await cliente.from(tabla).upsert(payload);

  if(!r.error){
    audit(tabla,"upsert","", "Registro guardado", payload);
  }

  return r;
}

async function remove(tabla,campo,valor){
  campo=campo || "id";

  const cliente=getSupabase();

  if(!navigator.onLine || !cliente){
    cacheDelete(tabla,valor,campo);

    colaAdd({
      tabla:tabla,
      operacion:"delete",
      campo:campo,
      valor:valor
    });

    return {data:null,error:null,offline:true};
  }

  const r=await cliente.from(tabla).delete().eq(campo,valor);

  if(!r.error){
    audit(tabla,"delete",valor,"Registro eliminado",null);
  }

  return r;
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

function puede(accion,modulo){
  if(esAdmin()) return true;

  const u=usuarioActual();
  const permisos=u.permisos || {};

  modulo=aliasModulo(modulo || "");
  accion=normalizar(accion || "");

  if(permisos[modulo] && permisos[modulo][accion]===true){
    return true;
  }

  if(accion==="ver" && moduloActivo(modulo)){
    return true;
  }

  return false;
}

function aplicarTemaGuardado(){
  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.getTheme==="function"){
    const t=window.ZENTRYX_STORE.getTheme();

    if(document.documentElement){
      document.documentElement.style.setProperty("--zx-primary",t.color || "#2563eb");
      document.documentElement.style.setProperty("--zx-radius",t.radio || "26px");
    }

    if(document.body){
      document.body.classList.toggle("zx_compacto",!!t.compacto);
      document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);
    }
  }
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
  aplicarTemaGuardado();
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
    aplicarTemaGuardado();
    actualizarEstadoConexion();

    if(navigator.onLine){
      syncOfflineQueue();
    }
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
window.ZENTRYX.puede=puede;

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
window.ZENTRYX.cacheUpsert=cacheUpsert;
window.ZENTRYX.cacheDelete=cacheDelete;
window.ZENTRYX.selectCache=selectCache;

window.ZENTRYX.insert=insert;
window.ZENTRYX.update=update;
window.ZENTRYX.upsert=upsert;
window.ZENTRYX.remove=remove;

window.ZENTRYX.guardarOffline=guardarOffline;
window.ZENTRYX.colaLeer=colaLeer;
window.ZENTRYX.colaPendiente=colaPendiente;
window.ZENTRYX.syncOfflineQueue=syncOfflineQueue;

window.ZENTRYX.audit=audit;
window.ZENTRYX.estadoSistema=estadoSistema;
window.ZENTRYX.actualizarEstadoConexion=actualizarEstadoConexion;
window.ZENTRYX.setSyncStatus=setSyncStatus;
window.ZENTRYX.aplicarTemaGuardado=aplicarTemaGuardado;

window.ZENTRYX.services=window.ZENTRYX.services || {};
window.ZENTRYX.services.storage={
  get:storageGet,
  set:storageSet,
  remove:storageRemove
};
window.ZENTRYX.services.offline={
  queue:colaAdd,
  pending:colaPendiente,
  sync:syncOfflineQueue
};
window.ZENTRYX.services.db={
  selectCache:selectCache,
  insert:insert,
  update:update,
  upsert:upsert,
  remove:remove
};

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