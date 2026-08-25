// ===============================
// ZENTRYX PRO - APP BASE
// V3118 - DEV SOLO PARA DESARROLLADOR
// ===============================
(function(){
"use strict";

const ZX_VERSION="3118";

const SUPABASE_URL="https://idtaamivqbiuxtjywuux.supabase.co";
const SUPABASE_KEY="sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

const SESSION_KEY="zentryx_session";
const USER_KEY="usuario";
const CONFIG_KEY="zentryx_config";
const EMPRESA_CONFIG_TABLE="config_empresa";
const OFFLINE_QUEUE_KEY="zentryx_offline_queue";
const OFFLINE_CACHE_PREFIX="zentryx_cache_";
const FETCH_WRAPPED_KEY="__zentryx_fetch_protegido";
const LEGACY_FETCH_WRAPPED_KEY="__zentryx_fetch_protegido_v3114";
const RUNTIME_KEY="__zentryx_app_runtime";

let ZX_SERVICIOS_INICIADOS=false;
let ZX_SYNC_TIMER=null;
let ZX_NET_TIMER=null;
let ZX_RUNTIME=null;
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
  test:4500,
  fetch_get:8500,
  fetch_post:12000,
  fetch_general:10000
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

function timeoutPorOperacion(operacion){
  operacion=normalizar(operacion || "lectura");

  if(operacion==="insert" || operacion==="update" || operacion==="upsert" || operacion==="delete" || operacion==="rpc" || operacion==="write"){
    return ZX_TIMEOUTS.escritura;
  }

  if(operacion==="sync" || operacion==="sincronizacion"){
    return ZX_TIMEOUTS.sincronizacion;
  }

  if(operacion==="test"){
    return ZX_TIMEOUTS.test;
  }

  return ZX_TIMEOUTS.lectura;
}

function timeoutPorFetch(input,init){
  const method=normalizar((init && init.method) || "get");
  const url=texto(typeof input==="string" ? input : (input && input.url) || "");

  if(method==="get" || method==="head"){
    return ZX_TIMEOUTS.fetch_get;
  }

  if(url.indexOf("/rest/v1/")>=0 || url.indexOf(SUPABASE_URL)>=0){
    return ZX_TIMEOUTS.fetch_post;
  }

  return ZX_TIMEOUTS.fetch_general;
}

function crearErrorAbortado(ms,url){
  const e=errorTimeout(ms);
  e.etiqueta="fetch";
  e.url=url || "";
  return e;
}

function instalarFetchProtegido(){
  if(!window.fetch || window[FETCH_WRAPPED_KEY] || window[LEGACY_FETCH_WRAPPED_KEY]){
    return;
  }

  const fetchOriginal=window.fetch.bind(window);

  window[FETCH_WRAPPED_KEY]=true;
  window[LEGACY_FETCH_WRAPPED_KEY]=true;
  window.__zentryx_fetch_original=window.__zentryx_fetch_original || fetchOriginal;

  window.fetch=function(input,init){
    init=init || {};
    const ms=timeoutPorFetch(input,init);
    const url=texto(typeof input==="string" ? input : (input && input.url) || "");
    const inicio=Date.now();

    if(typeof navigator!=="undefined" && !navigator.onLine){
      const e=new Error("Sin conexión");
      e.name="ZentryxOffline";
      e.codigo="ZX_OFFLINE";
      registrarResultadoRed(false,null,e);
      return Promise.reject(e);
    }

    if(typeof AbortController==="undefined"){
      return conTimeout(fetchOriginal(input,init),ms,"fetch")
        .then(function(r){
          registrarResultadoRed(true,Date.now()-inicio,null);
          return r;
        })
        .catch(function(e){
          registrarResultadoRed(false,Date.now()-inicio,e);
          throw e;
        });
    }

    const controller=new AbortController();
    const timer=setTimeout(function(){
      try{ controller.abort(); }catch(e){}
    },ms);

    const nextInit=Object.assign({},init,{signal:controller.signal});

    return fetchOriginal(input,nextInit)
      .then(function(r){
        registrarResultadoRed(!!r && r.ok!==false,Date.now()-inicio,null);
        return r;
      })
      .catch(function(e){
        const finalError=(e && e.name==="AbortError") ? crearErrorAbortado(ms,url) : e;
        registrarResultadoRed(false,Date.now()-inicio,finalError);
        throw finalError;
      })
      .finally(function(){
        clearTimeout(timer);
      });
  };
}

function envolverConsultaSupabase(obj,meta){
  if(!obj || (typeof obj!=="object" && typeof obj!=="function")){
    return obj;
  }

  if(obj.__zx_wrapped_query){
    return obj;
  }

  meta=Object.assign({
    tabla:"",
    operacion:"lectura"
  },meta || {});

  const escritura={
    insert:true,
    update:true,
    upsert:true,
    delete:true
  };

  const lectura={
    select:true,
    single:true,
    maybeSingle:true
  };

  return new Proxy(obj,{
    get:function(target,prop,receiver){
      if(prop==="__zx_wrapped_query") return true;

      if(prop==="then" || prop==="catch" || prop==="finally"){
        const ms=timeoutPorOperacion(meta.operacion);
        const etiqueta="supabase_"+(meta.operacion || "query")+(meta.tabla ? "_"+meta.tabla : "");

        return function(){
          const args=Array.prototype.slice.call(arguments);
          const inicio=Date.now();

          const p=conTimeout(Promise.resolve(target),ms,etiqueta)
            .then(function(r){
              registrarResultadoRed(!(r && r.error),Date.now()-inicio,(r && r.error) || null);
              return r;
            })
            .catch(function(e){
              registrarResultadoRed(false,Date.now()-inicio,e);
              throw e;
            });

          return p[prop].apply(p,args);
        };
      }

      const value=Reflect.get(target,prop,receiver);

      if(typeof value!=="function"){
        return value;
      }

      return function(){
        const args=Array.prototype.slice.call(arguments);
        const nextMeta=Object.assign({},meta);

        if(escritura[prop]){
          nextMeta.operacion=String(prop);
        }else if(lectura[prop]){
          nextMeta.operacion="lectura";
        }

        const result=value.apply(target,args);
        return envolverConsultaSupabase(result,nextMeta);
      };
    }
  });
}

function crearClienteSupabaseProtegido(cliente){
  if(!cliente || cliente.__zx_wrapped_client){
    return cliente;
  }

  return new Proxy(cliente,{
    get:function(target,prop,receiver){
      if(prop==="__zx_wrapped_client") return true;

      const value=Reflect.get(target,prop,receiver);

      if(prop==="from" && typeof value==="function"){
        return function(tabla){
          const result=value.call(target,tabla);
          return envolverConsultaSupabase(result,{
            tabla:tabla,
            operacion:"lectura"
          });
        };
      }

      if(prop==="rpc" && typeof value==="function"){
        return function(nombre,params,options){
          const result=value.call(target,nombre,params,options);
          return envolverConsultaSupabase(result,{
            tabla:nombre,
            operacion:"rpc"
          });
        };
      }

      return value;
    }
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
  return e.name==="ZentryxTimeout" || e.codigo==="ZX_TIMEOUT" || e.name==="ZentryxOffline" || e.codigo==="ZX_OFFLINE" || /timeout|network|fetch|failed|abort|offline|conex/i.test(texto(e.message));
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
  instalarFetchProtegido();

  if(window.sb && window.sb.__zx_wrapped_client) return window.sb;
  if(window.supabaseClient && window.supabaseClient.__zx_wrapped_client) return window.supabaseClient;

  let cliente=window.sb || window.supabaseClient || null;

  if(!cliente){
    if(!window.supabase || !window.supabase.createClient){
      return null;
    }

    cliente=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  }

  const protegido=crearClienteSupabaseProtegido(cliente);

  window.sb=protegido;
  window.supabaseClient=protegido;

  return protegido;
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

function esDesarrollador(){
  const r=rol();
  const u=usuario();

  return r==="desarrollador" ||
         r==="developer" ||
         r==="dev" ||
         u==="desarrollador" ||
         u==="developer" ||
         u==="dev";
}

function esAdmin(){
  return esDesarrollador() || rol()==="administrador" || usuario()==="admin";
}

function esTecnicoSistema(){
  return esDesarrollador();
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
      almacen:true,
      usuarios:true,
      vehiculos:true,
      horas_extra:true,
      control_fichajes:true,
      configuracion:true,
      config_laboral:true,
      solicitudes:true,
      diagnostico:true
    }
  };
}

function leerConfig(){
  const saved=storageGet(CONFIG_KEY,{});
  const base=configBase();

  const cfg=Object.assign({},base,saved || {});
  cfg.modulos=Object.assign({},base.modulos,(saved && saved.modulos) || {});

  // Inicio y Ajustes son zonas protegidas para evitar dejar la aplicación sin salida.
  cfg.modulos.inicio=true;
  cfg.modulos.configuracion=true;

  return cfg;
}

function guardarConfig(config){
  const base=leerConfig();
  const next=Object.assign({},base,config || {});

  next.modulos=Object.assign({},base.modulos,(config && config.modulos) || {});
  next.modulos.inicio=true;
  next.modulos.configuracion=true;

  storageSet(CONFIG_KEY,next);

  if(window.ZENTRYX){
    window.ZENTRYX.config=next;
  }

  return next;
}

function empresaActualId(){
  const u=usuarioActual();
  return String(u.empresa_id || "demo").trim() || "demo";
}

function modulosEmpresaNormalizados(modulos){
  const base=configBase().modulos;
  const out=Object.assign({},base,modulos && typeof modulos==="object" ? modulos : {});
  out.inicio=true;
  out.configuracion=true;
  return out;
}

function notificarCambioModulos(modulos,origen){
  try{
    window.dispatchEvent(new CustomEvent("zentryx:moduleschange",{
      detail:{
        modulos:Object.assign({},modulos || {}),
        origen:origen || "local"
      }
    }));
  }catch(e){}
}

async function cargarConfigEmpresa(){
  const local=leerConfig();
  const cliente=getSupabase();

  if(!cliente || (typeof navigator!=="undefined" && navigator.onLine===false)){
    return local;
  }

  try{
    const empresaId=empresaActualId();
    const consulta=cliente
      .from(EMPRESA_CONFIG_TABLE)
      .select("empresa_id,modulos,updated_at")
      .eq("empresa_id",empresaId)
      .maybeSingle();

    const r=await conTimeout(consulta,Math.min(ZX_TIMEOUTS.lectura,5000),"config_empresa");

    if(r && !r.error && r.data && r.data.modulos && typeof r.data.modulos==="object"){
      const modulos=modulosEmpresaNormalizados(r.data.modulos);
      const next=guardarConfig({modulos:modulos});
      notificarCambioModulos(next.modulos,"remoto");
      return next;
    }
  }catch(e){
    console.warn("Zentryx: no se pudo cargar la configuración de módulos de empresa",e);
  }

  return local;
}

async function guardarModulosEmpresa(modulos){
  const normalizados=modulosEmpresaNormalizados(modulos);
  const next=guardarConfig({modulos:normalizados});
  notificarCambioModulos(next.modulos,"local");

  const fila={
    empresa_id:empresaActualId(),
    modulos:normalizados,
    updated_at:ahoraISO(),
    updated_by:usuarioActual().usuario || usuarioActual().id || ""
  };

  const r=await upsert(EMPRESA_CONFIG_TABLE,fila);
  return Object.assign({config:next},r || {});
}

async function refrescarAccesoUsuarioActual(){
  const actual=usuarioActual();
  const cliente=getSupabase();

  if(!actual.id || !cliente || (typeof navigator!=="undefined" && navigator.onLine===false)){
    return actual;
  }

  try{
    const consulta=cliente
      .from("usuarios")
      .select("id,usuario,nombre,rol,empresa_id,permisos,activo,estado")
      .eq("id",actual.id)
      .maybeSingle();

    const r=await conTimeout(consulta,Math.min(ZX_TIMEOUTS.lectura,5000),"usuario_acceso_actual");
    if(r && !r.error && r.data){
      if(r.data.activo===false || normalizar(r.data.estado)==="inactivo"){
        if(typeof window.ZENTRYX_logout==="function") window.ZENTRYX_logout();
        return actual;
      }

      const ses=sesion();
      const actualizado=Object.assign({},ses,{
        usuario:r.data.usuario || ses.usuario,
        nombre:r.data.nombre || ses.nombre,
        rol:r.data.rol || ses.rol,
        empresa_id:r.data.empresa_id || ses.empresa_id || "demo",
        permisos:r.data.permisos && typeof r.data.permisos==="object" ? r.data.permisos : {}
      });
      storageSet(SESSION_KEY,actualizado);

      const local=usuarioLocal();
      storageSet(USER_KEY,Object.assign({},local,r.data));
      return usuarioActual();
    }
  }catch(e){
    console.warn("Zentryx: no se pudo actualizar el acceso del usuario",e);
  }

  return actual;
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

  const nuevo=Object.assign({
    id:uuid(),
    estado:"pendiente",
    creado_en:ahoraISO(),
    intentos:0,
    usuario:u.usuario || "",
    empresa_id:u.empresa_id || "demo"
  },item || {});

  const existe=lista.some(function(x){
    return x && x.estado==="pendiente" &&
      x.tabla===nuevo.tabla &&
      x.operacion===nuevo.operacion &&
      String(x.campo || "")===String(nuevo.campo || "") &&
      String(x.valor || "")===String(nuevo.valor || "") &&
      JSON.stringify(x.data || null)===JSON.stringify(nuevo.data || null);
  });

  if(!existe){
    lista.push(nuevo);
  }

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
        top:calc(env(safe-area-inset-top) + 10px);
        right:12px;
        left:auto;
        bottom:auto;
        z-index:999999;
        border:0;
        border-radius:999px;
        padding:7px 10px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
        font-size:11px;
        font-weight:900;
        line-height:1;
        color:#0f172a;
        background:#dcfce7;
        box-shadow:0 8px 22px rgba(15,23,42,.16);
        pointer-events:none;
        white-space:nowrap;
      }
      #zx_connection_status[hidden]{display:none!important}
      #zx_connection_status.zx_offline{background:#fef3c7;color:#92400e}
      #zx_connection_status.zx_degraded{background:#ffedd5;color:#9a3412}
      #zx_connection_status.zx_syncing{background:#dbeafe;color:#1d4ed8}
      #zx_connection_status.zx_synced{background:#dcfce7;color:#166534}
      @media(min-width:760px){
        #zx_connection_status{
          top:16px;
          right:16px;
        }
      }
    `;
    document.head.appendChild(st);
  }

  return el;
}

function ajustarVisibilidadEstadoConexion(el,tipo){
  if(!el) return;

  const integrado=!!document.getElementById("zx_connection_slot");
  const normal=tipo==="online" || tipo==="synced";

  // En Login, el estado correcto no ocupa espacio ni tapa botones.
  // Los avisos reales (offline, débil, sincronizando o pendientes) sí se muestran.
  el.hidden=!integrado && normal;
}

function renderEstadoConexion(tipo){
  const el=ensureEstadoConexion();
  const red=estadoRed();

  el.className="";

  if(tipo==="syncing"){
    el.classList.add("zx_syncing");
    el.textContent="🔄 Sincronizando";
    ajustarVisibilidadEstadoConexion(el,"syncing");
    return;
  }

  if(tipo==="offline" || !red.online){
    el.classList.add("zx_offline");
    el.textContent="🟡 Sin conexión";
    ajustarVisibilidadEstadoConexion(el,"offline");
    return;
  }

  if(tipo==="degraded" || red.calidad==="mala" || red.calidad==="degradada"){
    el.classList.add("zx_degraded");
    el.textContent="🟠 Conexión débil";
    ajustarVisibilidadEstadoConexion(el,"degraded");
    return;
  }

  if(colaPendiente().length>0){
    el.classList.add("zx_syncing");
    el.textContent="🔄 Pendiente";
    ajustarVisibilidadEstadoConexion(el,"syncing");
    return;
  }

  el.classList.add("zx_synced");
  el.textContent=tipo==="synced" ? "✅ Sincronizado" : "🟢 Conectado";
  ajustarVisibilidadEstadoConexion(el,tipo==="synced" ? "synced" : "online");
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

const ZX_MODULOS_LEGACY_VISIBLES=new Set([
  "inicio","fichaje","agenda","clientes","trabajos","manual"
]);

function permisosModulosUsuario(){
  const p=usuarioActual().permisos || {};
  if(p.modulos && typeof p.modulos==="object" && !Array.isArray(p.modulos)){
    return p.modulos;
  }
  return {};
}

function puedeVerModuloUsuario(modulo){
  modulo=aliasModulo(modulo || "");

  // El panel Dev es una excepción de seguridad: solo el rol/usuario
  // Desarrollador puede verlo. Un Administrador normal no hereda este acceso.
  if(modulo==="desarrollador") return esDesarrollador();

  if(esDesarrollador()) return true;
  if(!moduloActivo(modulo)) return false;
  if(esAdmin()) return true;

  // Inicio permanece disponible para cualquier usuario con sesión válida.
  if(modulo==="inicio") return true;
  // Invitado conserva el perfil sin acceso operativo.
  if(rol()==="invitado") return false;
  // Ajustes queda reservado al administrador/desarrollador.
  if(modulo==="configuracion") return false;

  const permisos=permisosModulosUsuario();
  if(Object.prototype.hasOwnProperty.call(permisos,modulo)){
    return permisos[modulo]===true;
  }

  // Compatibilidad con usuarios aún no configurados individualmente.
  return ZX_MODULOS_LEGACY_VISIBLES.has(modulo);
}

function puede(accion,modulo){
  modulo=aliasModulo(modulo || "");
  accion=normalizar(accion || "");

  if(esDesarrollador()) return true;

  if(["diagnostico","logs","sistema","backend","offline","cache","sync","desarrollo"].includes(modulo)){
    return esTecnicoSistema();
  }

  if(accion==="ver"){
    return puedeVerModuloUsuario(modulo);
  }

  if(esAdmin()) return true;

  const u=usuarioActual();
  const permisos=u.permisos || {};
  const acciones=permisos.acciones && typeof permisos.acciones==="object" ? permisos.acciones : {};

  if(acciones[modulo] && acciones[modulo][accion]===true){
    return true;
  }

  // Compatibilidad con el formato anterior previsto en el código.
  if(permisos[modulo] && typeof permisos[modulo]==="object" && permisos[modulo][accion]===true){
    return true;
  }

  return false;
}

function aplicarTemaGuardado(){
  if(!window.ZENTRYX_STORE || typeof window.ZENTRYX_STORE.getTheme!=="function") return;
  const t=window.ZENTRYX_STORE.getTheme();

  if(typeof window.ZENTRYX_STORE.applyTheme==="function"){
    window.ZENTRYX_STORE.applyTheme(t);
    return;
  }

  if(document.documentElement){
    document.documentElement.style.setProperty("--zx-primary",t.color || "#2563eb");
    document.documentElement.style.setProperty("--zx-radius",t.radio || "26px");
  }

  if(document.body){
    document.body.classList.toggle("zx_compacto",!!t.compacto);
    document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);
  }
}

function estadoTecnico(){
  if(!esTecnicoSistema()){
    return {ok:false,error:"Acceso reservado a desarrollador"};
  }

  return {
    ok:true,
    version:ZX_VERSION,
    fecha:ahoraISO(),
    red:estadoRed(),
    cola:colaLeer(),
    cola_pendiente:colaPendiente().length,
    cache_keys:Object.keys(localStorage || {}).filter(function(k){return String(k).indexOf(OFFLINE_CACHE_PREFIX)===0;}),
    usuario:usuarioActual(),
    modulos:listarModulos(),
    backend:{
      proveedor:"supabase",
      url:SUPABASE_URL,
      preparado_servidor_local:true,
      preparado_nas:true
    }
  };
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

function limpiarRuntimeAnterior(){
  const anterior=window[RUNTIME_KEY];

  if(anterior && typeof anterior.dispose==="function"){
    try{ anterior.dispose(); }catch(e){}
  }
}

function crearRuntime(){
  const timers=new Set();
  const listeners=[];

  function addTimer(id,tipo){
    timers.add({id:id,tipo:tipo});
    return id;
  }

  function addListener(target,tipo,handler,opciones){
    target.addEventListener(tipo,handler,opciones);
    listeners.push({target:target,tipo:tipo,handler:handler,opciones:opciones});
  }

  function dispose(){
    timers.forEach(function(t){
      if(t.tipo==="interval") clearInterval(t.id);
      else clearTimeout(t.id);
    });
    timers.clear();

    listeners.forEach(function(l){
      try{ l.target.removeEventListener(l.tipo,l.handler,l.opciones); }catch(e){}
    });
    listeners.length=0;

    ZX_SYNC_TIMER=null;
    ZX_NET_TIMER=null;
    ZX_SERVICIOS_INICIADOS=false;
  }

  return {
    addTimeout:function(fn,ms){ return addTimer(setTimeout(fn,ms),"timeout"); },
    addInterval:function(fn,ms){ return addTimer(setInterval(fn,ms),"interval"); },
    addListener:addListener,
    dispose:dispose
  };
}

function iniciarServiciosLigeros(){
  if(ZX_SERVICIOS_INICIADOS) return;

  ZX_SERVICIOS_INICIADOS=true;

  limpiarRuntimeAnterior();
  ZX_RUNTIME=crearRuntime();
  window[RUNTIME_KEY]=ZX_RUNTIME;

  instalarFetchProtegido();
  aplicarTemaGuardado();
  actualizarEstadoConexion();

  const onOnline=function(){
    setSyncStatus("syncing");
    ZX_RUNTIME.addTimeout(syncOfflineQueue,600);
  };

  const onOffline=function(){
    setSyncStatus("offline");
  };

  const onPageShow=function(){
    aplicarTemaGuardado();
    actualizarEstadoConexion();
  };

  ZX_RUNTIME.addListener(window,"online",onOnline);
  ZX_RUNTIME.addListener(window,"offline",onOffline);
  ZX_RUNTIME.addListener(window,"pageshow",onPageShow);

  ZX_NET_TIMER=ZX_RUNTIME.addInterval(function(){
    testConexion();
  },90000);

  ZX_RUNTIME.addTimeout(testConexion,2500);

  ZX_SYNC_TIMER=ZX_RUNTIME.addInterval(function(){
    actualizarEstadoConexion();

    if(navigator.onLine && colaPendiente().length>0){
      syncOfflineQueue();
    }
  },60000);

  if(navigator.onLine && colaPendiente().length>0){
    ZX_RUNTIME.addTimeout(syncOfflineQueue,1600);
  }
}

function bootDOM(){
  instalarFetchProtegido();
  ensureEstadoConexion();
  renderEstadoConexion(navigator.onLine ? "online" : "offline");

  setTimeout(iniciarServiciosLigeros,900);
}

instalarFetchProtegido();

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
window.ZENTRYX.esDesarrollador=esDesarrollador;
window.ZENTRYX.esTecnicoSistema=esTecnicoSistema;
window.ZENTRYX.puede=puede;

window.ZENTRYX.limpiar=limpiar;
window.ZENTRYX.normalizar=normalizar;
window.ZENTRYX.fechaISO=fechaISO;
window.ZENTRYX.ahoraISO=ahoraISO;
window.ZENTRYX.formatoFechaES=formatoFechaES;
window.ZENTRYX.formatoFechaHoraES=formatoFechaHoraES;
window.ZENTRYX.uuid=uuid;

window.ZENTRYX.guardarConfig=guardarConfig;
window.ZENTRYX.cargarConfigEmpresa=cargarConfigEmpresa;
window.ZENTRYX.guardarModulosEmpresa=guardarModulosEmpresa;
window.ZENTRYX.refrescarAccesoUsuarioActual=refrescarAccesoUsuarioActual;
window.ZENTRYX.puedeVerModuloUsuario=puedeVerModuloUsuario;
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
window.ZENTRYX.fetchProtegido=window.fetch;

window.ZENTRYX.audit=audit;
window.ZENTRYX.estadoTecnico=estadoTecnico;
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
