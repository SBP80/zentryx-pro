// ===============================
// ZENTRYX PRO - APP BASE
// V3107 - ARRANQUE RÁPIDO
// ===============================
(function(){
"use strict";

const ZX_VERSION="3108";

const SUPABASE_URL="https://idtaamivqbiuxtjywuux.supabase.co";
const SUPABASE_KEY="sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";
const CONFIG_KEY="zentryx_config";
const OFFLINE_QUEUE_KEY="zentryx_offline_queue";
const OFFLINE_CACHE_PREFIX="zentryx_cache_";

let ZX_SERVICIOS_INICIADOS=false;
let ZX_SYNC_TIMER=null;
let ZX_NET_TIMER=null;
let ZX_NET_STATE={
  online:typeof navigator!=="undefined" ? navigator.onLine : true,
  calidad:"desconocida",
  latencia_ms:null,
  ultimo_test:null,
  ultimo_error:"",
  fallos_seguidos:0
};

const ZX_TIMEOUTS={
  lectura:8500,
  escritura:11000,
  sincronizacion:12000,
  test:4500
};

function safeJSON(raw,fallback){
  try{
    if(raw===null || raw===undefined || raw==="") return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}

function storageGet(key,fallback){
  try{
    return safeJSON(localStorage.getItem(key),fallback);
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

function errorTimeout(ms){
  const e=new Error("Tiempo de espera agotado ("+ms+" ms)");
  e.name="ZentryxTimeout";
  e.codigo="ZX_TIMEOUT";
  return e;
}

function conTimeout(promise,ms,etiqueta){
  let timer=null;

  const timeout=new Promise(function(_,reject){
    timer=setTimeout(function(){
      const e=errorTimeout(ms);
      e.etiqueta=etiqueta || "red";
      reject(e);
    },ms);
  });

  return Promise.race([promise,timeout]).finally(function(){
    if(timer) clearTimeout(timer);
  });
}

function registrarResultadoRed(ok,ms,error){
  ZX_NET_STATE.online=typeof navigator!=="undefined" ? navigator.onLine : true;
  ZX_NET_STATE.latencia_ms=typeof ms==="number" ? ms : ZX_NET_STATE.latencia_ms;
  ZX_NET_STATE.ultimo_test=ahoraISO();
  ZX_NET_STATE.ultimo_error=error ? texto(error.message || error) : "";

  if(!ZX_NET_STATE.online){
    ZX_NET_STATE.calidad="offline";
    ZX_NET_STATE.fallos_seguidos++;
    return ZX_NET_STATE;
  }

  if(!ok){
    ZX_NET_STATE.fallos_seguidos++;
    ZX_NET_STATE.calidad=ZX_NET_STATE.fallos_seguidos>=2 ? "mala" : "degradada";
    return ZX_NET_STATE;
  }

  ZX_NET_STATE.fallos_seguidos=0;

  if(ms===null || ms===undefined){
    ZX_NET_STATE.calidad="online";
  }else if(ms>6000){
    ZX_NET_STATE.calidad="mala";
  }else if(ms>2500){
    ZX_NET_STATE.calidad="degradada";
  }else{
    ZX_NET_STATE.calidad="buena";
  }

  return ZX_NET_STATE;
}

function estadoRed(){
  ZX_NET_STATE.online=typeof navigator!=="undefined" ? navigator.onLine : true;

  if(!ZX_NET_STATE.online){
    ZX_NET_STATE.calidad="offline";
  }

  return Object.assign({},ZX_NET_STATE,{
    pendiente:colaPendiente().length
  });
}

function esErrorRedLenta(e){
  if(!e) return false;
  return e.name==="ZentryxTimeout" || e.codigo==="ZX_TIMEOUT" || /timeout|network|fetch|failed/i.test(texto(e.message));
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
    empresa_id:s.empresa_id || u.empresa_id || "demo",
    permisos:s.permisos || u.permisos || {}
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

  const cfg=Object.assign({},base,saved || {});
  cfg.modulos=Object.assign({},base.modulos,(saved && saved.modulos) || {});

  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.getModulos==="function"){
    cfg.modulos=Object.assign({},cfg.modulos,window.ZENTRYX_STORE.getModulos());
  }

  return cfg;
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
  return cfg.modulos[key]!==false;
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
  const objetivo=aliasModulo(nombre);

  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.classList.remove("zx_activo");

    if(aliasModulo(btn.dataset.modulo)===objetivo){
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

  if(!item || !item[campo]){
    return false;
  }

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
  const u=usuarioActual();
  const lista=colaLeer();

  lista.push(Object.assign({
    id:uuid(),
    estado:"pendiente",
    creado_en:ahoraISO(),
    intentos:0,
    usuario:u.usuario || "",
    empresa_id:u.empresa_id || "demo"
  },item || {}));

  colaGuardar(lista);
  actualizarEstadoConexion();

  return lista;
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
        bottom:calc(env(safe-area-inset-bottom) + 82px);
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
      #zx_connection_status.zx_degraded{background:#ffedd5;color:#9a3412}
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
  const red=estadoRed();

  el.className="";

  if(tipo==="syncing"){
    el.classList.add("zx_syncing");
    el.textContent="🔄 Sincronizando";
    return;
  }

  if(tipo==="offline" || !red.online){
    el.classList.add("zx_offline");
    el.textContent="🟡 Sin conexión";
    return;
  }

  if(tipo==="degraded" || red.calidad==="mala" || red.calidad==="degradada"){
    el.classList.add("zx_degraded");
    el.textContent="🟠 Conexión débil";
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

function setSyncStatus(tipo){
  renderEstadoConexion(tipo);
}

function actualizarEstadoConexion(){
  if(!document.body) return;

  if(!navigator.onLine){
    renderEstadoConexion("offline");
    return;
  }

  const red=estadoRed();

  if(red.calidad==="mala" || red.calidad==="degradada"){
    renderEstadoConexion("degraded");
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

async function testConexion(){
  if(!navigator.onLine){
    registrarResultadoRed(false,null,"offline");
    actualizarEstadoConexion();
    return estadoRed();
  }

  const cliente=getSupabase();

  if(!cliente){
    registrarResultadoRed(false,null,"Sin Supabase");
    actualizarEstadoConexion();
    return estadoRed();
  }

  const inicio=Date.now();

  try{
    await conTimeout(
      cliente.from("usuarios").select("id").limit(1),
      ZX_TIMEOUTS.test,
      "test_conexion"
    );

    registrarResultadoRed(true,Date.now()-inicio,null);

  }catch(e){
    registrarResultadoRed(false,Date.now()-inicio,e);
  }

  actualizarEstadoConexion();
  return estadoRed();
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
        r=await conTimeout(cliente.from(item.tabla).insert(item.data),ZX_TIMEOUTS.sincronizacion,"sync_insert_"+item.tabla);
      }else if(item.operacion==="update"){
        r=await conTimeout(cliente.from(item.tabla).update(item.data).eq(item.campo || "id",item.valor),ZX_TIMEOUTS.sincronizacion,"sync_update_"+item.tabla);
      }else if(item.operacion==="upsert"){
        r=await conTimeout(cliente.from(item.tabla).upsert(item.data),ZX_TIMEOUTS.sincronizacion,"sync_upsert_"+item.tabla);
      }else if(item.operacion==="delete"){
        r=await conTimeout(cliente.from(item.tabla).delete().eq(item.campo || "id",item.valor),ZX_TIMEOUTS.sincronizacion,"sync_delete_"+item.tabla);
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

      audit(item.tabla,item.operacion,item.valor || "","Sincronizado sin conexión",item);

    }catch(e){
      item.error=e && e.message ? e.message : "Error";
      if(esErrorRedLenta(e)){
        registrarResultadoRed(false,null,e);
        break;
      }
    }
  }

  colaGuardar(lista);

  const quedan=colaPendiente().length;

  if(quedan>0){
    renderEstadoConexion("syncing");
  }else{
    renderEstadoConexion("synced");
    setTimeout(actualizarEstadoConexion,1200);
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
    const inicio=Date.now();
    const query=typeof consulta==="function"
      ? consulta(cliente.from(tabla))
      : cliente.from(tabla).select("*");

    const r=await conTimeout(query,ZX_TIMEOUTS.lectura,"select_"+tabla);

    registrarResultadoRed(!r.error,Date.now()-inicio,r.error || null);

    if(!r.error && Array.isArray(r.data)){
      cacheGuardar(tabla,r.data);
    }

    return r;

  }catch(e){
    registrarResultadoRed(false,null,e);
    return {
      data:cacheLeer(tabla),
      error:null,
      offline:true,
      degradada:esErrorRedLenta(e),
      mensaje:e && e.message ? e.message : "Conexión no disponible"
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

  try{
    const inicio=Date.now();
    const r=await conTimeout(cliente.from(tabla).insert(payload),ZX_TIMEOUTS.escritura,"insert_"+tabla);
    registrarResultadoRed(!r.error,Date.now()-inicio,r.error || null);

    if(!r.error){
      audit(tabla,"insert",opciones.valor || "","Registro creado",payload);
    }

    return r;

  }catch(e){
    registrarResultadoRed(false,null,e);

    payload.forEach(function(item){
      if(item && item.id) cacheUpsert(tabla,item);
    });

    colaAdd({
      tabla:tabla,
      operacion:"insert",
      data:payload,
      campo:opciones.campo || "id",
      valor:opciones.valor || "",
      origen:"timeout"
    });

    return {data:payload,error:null,offline:true,degradada:true,mensaje:e.message || "Guardado pendiente por conexión débil"};
  }
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

  try{
    const inicio=Date.now();
    const r=await conTimeout(cliente.from(tabla).update(data).eq(campo,valor),ZX_TIMEOUTS.escritura,"update_"+tabla);
    registrarResultadoRed(!r.error,Date.now()-inicio,r.error || null);

    if(!r.error){
      audit(tabla,"update",valor,"Registro actualizado",data);
    }

    return r;

  }catch(e){
    registrarResultadoRed(false,null,e);
    cacheUpsert(tabla,Object.assign({},data,{[campo]:valor}),campo);

    colaAdd({
      tabla:tabla,
      operacion:"update",
      data:data,
      campo:campo,
      valor:valor,
      origen:"timeout"
    });

    return {data:data,error:null,offline:true,degradada:true,mensaje:e.message || "Guardado pendiente por conexión débil"};
  }
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

  try{
    const inicio=Date.now();
    const r=await conTimeout(cliente.from(tabla).upsert(payload),ZX_TIMEOUTS.escritura,"upsert_"+tabla);
    registrarResultadoRed(!r.error,Date.now()-inicio,r.error || null);

    if(!r.error){
      audit(tabla,"upsert","","Registro guardado",payload);
    }

    return r;

  }catch(e){
    registrarResultadoRed(false,null,e);

    payload.forEach(function(item){
      if(item && item.id) cacheUpsert(tabla,item);
    });

    colaAdd({
      tabla:tabla,
      operacion:"upsert",
      data:payload,
      origen:"timeout"
    });

    return {data:payload,error:null,offline:true,degradada:true,mensaje:e.message || "Guardado pendiente por conexión débil"};
  }
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

  try{
    const inicio=Date.now();
    const r=await conTimeout(cliente.from(tabla).delete().eq(campo,valor),ZX_TIMEOUTS.escritura,"delete_"+tabla);
    registrarResultadoRed(!r.error,Date.now()-inicio,r.error || null);

    if(!r.error){
      audit(tabla,"delete",valor,"Registro eliminado",null);
    }

    return r;

  }catch(e){
    registrarResultadoRed(false,null,e);
    cacheDelete(tabla,valor,campo);

    colaAdd({
      tabla:tabla,
      operacion:"delete",
      campo:campo,
      valor:valor,
      origen:"timeout"
    });

    return {data:null,error:null,offline:true,degradada:true,mensaje:e.message || "Borrado pendiente por conexión débil"};
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
    red:estadoRed(),
    cola_pendiente:colaPendiente().length,
    usuario:usuarioActual(),
    config:leerConfig(),
    modulos:listarModulos()
  };
}

function iniciarServiciosLigeros(){
  if(ZX_SERVICIOS_INICIADOS) return;

  ZX_SERVICIOS_INICIADOS=true;

  aplicarTemaGuardado();
  actualizarEstadoConexion();

  window.addEventListener("online",function(){
    setSyncStatus("syncing");
    setTimeout(syncOfflineQueue,600);
  });

  window.addEventListener("offline",function(){
    setSyncStatus("offline");
  });

  window.addEventListener("pageshow",function(){
    aplicarTemaGuardado();
    actualizarEstadoConexion();
  });

  if(ZX_SYNC_TIMER){
    clearInterval(ZX_SYNC_TIMER);
  }

  if(ZX_NET_TIMER){
    clearInterval(ZX_NET_TIMER);
  }

  ZX_NET_TIMER=setInterval(function(){
    testConexion();
  },90000);

  setTimeout(testConexion,2500);

  ZX_SYNC_TIMER=setInterval(function(){
    actualizarEstadoConexion();

    if(navigator.onLine && colaPendiente().length>0){
      syncOfflineQueue();
    }
  },60000);

  if(navigator.onLine && colaPendiente().length>0){
    setTimeout(syncOfflineQueue,1600);
  }
}

function bootDOM(){
  ensureEstadoConexion();
  renderEstadoConexion(navigator.onLine ? "online" : "offline");

  setTimeout(iniciarServiciosLigeros,900);
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
window.ZENTRYX.testConexion=testConexion;
window.ZENTRYX.estadoRed=estadoRed;
window.ZENTRYX.conTimeout=conTimeout;
window.ZENTRYX.timeouts=ZX_TIMEOUTS;

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
  sync:syncOfflineQueue,
  network:estadoRed,
  test:testConexion
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
  version:ZX_VERSION
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bootDOM);
}else{
  bootDOM();
}

console.log("Zentryx PRO app.js V"+ZX_VERSION+" cargado");

})();