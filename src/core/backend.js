// ===============================
// ZENTRYX PRO - BACKEND MANAGER
// V3120 - NÚCLEO DE DATOS, CACHE Y OFFLINE
// ===============================
(function(){
"use strict";

const ZX_BACKEND_VERSION="3120";
const CACHE_PREFIX="zentryx_backend_cache_";
const QUEUE_KEY="zentryx_backend_queue";
const META_KEY="zentryx_backend_meta";

function now(){
  return new Date().toISOString();
}

function text(v){
  return String(v ?? "");
}

function norm(v){
  return text(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function uuid(){
  try{
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  }catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function readJSON(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}

function writeJSON(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    return false;
  }
}

function removeKey(key){
  try{
    localStorage.removeItem(key);
    return true;
  }catch(e){
    return false;
  }
}

function cacheKey(table){
  return CACHE_PREFIX+norm(table);
}

function isOnline(){
  return typeof navigator==="undefined" ? true : navigator.onLine!==false;
}

function getZentryx(){
  return window.ZENTRYX || window.ZX || null;
}

function getSupabase(){
  const zx=getZentryx();

  if(zx && typeof zx.sb==="function"){
    try{
      const c=zx.sb();
      if(c) return c;
    }catch(e){}
  }

  return window.sb || window.supabaseClient || null;
}

function timeoutMs(type){
  const zx=getZentryx();
  const t=(zx && zx.timeouts) || {};

  if(type==="write") return Number(t.escritura || 11000);
  if(type==="sync") return Number(t.sincronizacion || 12000);
  if(type==="test") return Number(t.test || 4500);

  return Number(t.lectura || 8500);
}

function withTimeout(promise,ms,label){
  const zx=getZentryx();

  if(zx && typeof zx.conTimeout==="function"){
    return zx.conTimeout(promise,ms,label);
  }

  let timer=null;

  const timeout=new Promise(function(_,reject){
    timer=setTimeout(function(){
      const e=new Error("Tiempo de espera agotado");
      e.name="ZentryxTimeout";
      e.codigo="ZX_TIMEOUT";
      e.label=label || "backend";
      reject(e);
    },ms);
  });

  return Promise.race([promise,timeout]).finally(function(){
    if(timer) clearTimeout(timer);
  });
}

function isNetworkError(e){
  const msg=text((e && (e.message || e.name)) || e);

  return !isOnline() ||
    (e && (e.name==="ZentryxOffline" || e.name==="ZentryxTimeout")) ||
    /offline|sin conexión|timeout|network|fetch|failed|abort/i.test(msg);
}

function session(){
  const zx=getZentryx();

  if(zx && typeof zx.usuarioActual==="function"){
    try{return zx.usuarioActual() || {};}catch(e){}
  }

  return readJSON("zentryx_session",{});
}

function cacheGet(table){
  const data=readJSON(cacheKey(table),[]);
  return Array.isArray(data) ? data : [];
}

function cacheSet(table,data){
  const list=Array.isArray(data) ? data : [];
  writeJSON(cacheKey(table),list);

  const meta=readJSON(META_KEY,{});
  meta[norm(table)]={updated_at:now(),items:list.length};
  writeJSON(META_KEY,meta);

  return list;
}

function cacheUpsert(table,item,field){
  field=field || "id";

  if(!item || item[field]===undefined || item[field]===null || item[field]===""){
    return false;
  }

  const list=cacheGet(table);
  const idx=list.findIndex(function(x){
    return String(x && x[field])===String(item[field]);
  });

  if(idx>=0){
    list[idx]=Object.assign({},list[idx],item);
  }else{
    list.unshift(item);
  }

  cacheSet(table,list);
  return true;
}

function cacheDelete(table,value,field){
  field=field || "id";

  const list=cacheGet(table).filter(function(x){
    return String(x && x[field])!==String(value);
  });

  cacheSet(table,list);
  return true;
}

function queueGet(){
  const q=readJSON(QUEUE_KEY,[]);
  return Array.isArray(q) ? q : [];
}

function queueSet(list){
  return writeJSON(QUEUE_KEY,Array.isArray(list) ? list : []);
}

function queuePending(){
  return queueGet().filter(function(x){
    return x && x.status==="pending";
  });
}

function queueAdd(op){
  const user=session();
  const list=queueGet();

  const item=Object.assign({
    id:uuid(),
    status:"pending",
    created_at:now(),
    attempts:0,
    user_id:user.id || "",
    user:user.usuario || user.nombre || "",
    empresa_id:user.empresa_id || "demo"
  },op || {});

  const exists=list.some(function(x){
    return x && x.status==="pending" &&
      String(x.table||"")===String(item.table||"") &&
      String(x.action||"")===String(item.action||"") &&
      String(x.field||"id")===String(item.field||"id") &&
      String(x.value||"")===String(item.value||"") &&
      JSON.stringify(x.data||null)===JSON.stringify(item.data||null);
  });

  if(!exists){
    list.push(item);
    queueSet(list);
  }

  notify();

  return item;
}

function notify(){
  const zx=getZentryx();

  if(zx && typeof zx.actualizarEstadoConexion==="function"){
    try{zx.actualizarEstadoConexion();}catch(e){}
  }

  try{
    window.dispatchEvent(new CustomEvent("zentryx:backend",{
      detail:status()
    }));
  }catch(e){}
}

function applyCacheWrite(table,action,data,field,value){
  field=field || "id";

  if(action==="insert" || action==="upsert"){
    const arr=Array.isArray(data) ? data : [data];
    arr.forEach(function(item){
      if(item && item[field]!==undefined) cacheUpsert(table,item,field);
      else if(item && item.id!==undefined) cacheUpsert(table,item,"id");
    });
  }

  if(action==="update"){
    const cached=Object.assign({},data || {});
    cached[field]=value;
    cacheUpsert(table,cached,field);
  }

  if(action==="delete"){
    cacheDelete(table,value,field);
  }
}

async function get(table,options){
  options=options || {};
  const client=getSupabase();

  if(!isOnline() || !client){
    return {
      data:cacheGet(table),
      error:null,
      offline:true,
      source:"cache"
    };
  }

  try{
    let query=client.from(table).select(options.select || "*");

    if(Array.isArray(options.eq)){
      options.eq.forEach(function(f){
        query=query.eq(f[0],f[1]);
      });
    }

    if(Array.isArray(options.neq)){
      options.neq.forEach(function(f){
        query=query.neq(f[0],f[1]);
      });
    }

    if(Array.isArray(options.gte)){
      options.gte.forEach(function(f){
        query=query.gte(f[0],f[1]);
      });
    }

    if(Array.isArray(options.lte)){
      options.lte.forEach(function(f){
        query=query.lte(f[0],f[1]);
      });
    }

    if(Array.isArray(options.order)){
      options.order.forEach(function(f){
        query=query.order(f[0],f[1] || {});
      });
    }

    if(options.limit){
      query=query.limit(Number(options.limit));
    }

    if(typeof options.query==="function"){
      query=options.query(query);
    }

    const r=await withTimeout(query,timeoutMs("read"),"backend_get_"+table);

    if(r && r.error) throw r.error;

    const data=Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);
    cacheSet(table,data);

    return {
      data:data,
      error:null,
      offline:false,
      source:"backend"
    };

  }catch(e){
    if(isNetworkError(e)){
      return {
        data:cacheGet(table),
        error:null,
        offline:true,
        degraded:true,
        source:"cache",
        message:e.message || "Sin conexión"
      };
    }

    return {
      data:cacheGet(table),
      error:e,
      offline:false,
      source:"cache"
    };
  }
}

async function insert(table,data,options){
  return write("insert",table,data,options || {});
}

async function upsert(table,data,options){
  return write("upsert",table,data,options || {});
}

async function update(table,data,options){
  options=options || {};
  return write("update",table,data,options);
}

async function remove(table,options){
  options=options || {};
  return write("delete",table,null,options);
}

async function write(action,table,data,options){
  options=options || {};

  const field=options.field || options.campo || "id";
  const value=options.value ?? options.valor ?? (data && data[field]) ?? "";
  const client=getSupabase();

  if(!isOnline() || !client){
    applyCacheWrite(table,action,data,field,value);
    queueAdd({
      table:table,
      action:action,
      data:data,
      field:field,
      value:value,
      reason:"offline"
    });

    return {
      data:data,
      error:null,
      offline:true,
      queued:true
    };
  }

  try{
    let query=null;

    if(action==="insert"){
      query=client.from(table).insert(Array.isArray(data) ? data : [data]);
    }

    if(action==="upsert"){
      query=client.from(table).upsert(Array.isArray(data) ? data : [data]);
    }

    if(action==="update"){
      query=client.from(table).update(data).eq(field,value);
    }

    if(action==="delete"){
      query=client.from(table).delete().eq(field,value);
    }

    const r=await withTimeout(query,timeoutMs("write"),"backend_write_"+table+"_"+action);

    if(r && r.error) throw r.error;

    applyCacheWrite(table,action,data,field,value);

    return {
      data:(r && r.data) || data || null,
      error:null,
      offline:false,
      queued:false
    };

  }catch(e){
    if(isNetworkError(e)){
      applyCacheWrite(table,action,data,field,value);
      queueAdd({
        table:table,
        action:action,
        data:data,
        field:field,
        value:value,
        reason:"network_error",
        error:e.message || String(e)
      });

      return {
        data:data,
        error:null,
        offline:true,
        degraded:true,
        queued:true,
        message:"Guardado pendiente por conexión"
      };
    }

    return {
      data:null,
      error:e,
      offline:false,
      queued:false
    };
  }
}

async function sync(){
  if(!isOnline()){
    notify();
    return {ok:false,offline:true,pending:queuePending().length};
  }

  const client=getSupabase();

  if(!client){
    return {ok:false,error:"Sin backend",pending:queuePending().length};
  }

  const list=queueGet();
  let done=0;

  for(const item of list){
    if(!item || item.status!=="pending") continue;

    try{
      item.attempts=(item.attempts || 0)+1;
      item.last_attempt_at=now();

      let q=null;
      const table=item.table;
      const field=item.field || "id";
      const value=item.value;

      if(item.action==="insert"){
        q=client.from(table).insert(Array.isArray(item.data) ? item.data : [item.data]);
      }else if(item.action==="upsert"){
        q=client.from(table).upsert(Array.isArray(item.data) ? item.data : [item.data]);
      }else if(item.action==="update"){
        q=client.from(table).update(item.data).eq(field,value);
      }else if(item.action==="delete"){
        q=client.from(table).delete().eq(field,value);
      }else{
        item.status="error";
        item.error="Acción no soportada";
        continue;
      }

      const r=await withTimeout(q,timeoutMs("sync"),"backend_sync_"+table+"_"+item.action);

      if(r && r.error) throw r.error;

      item.status="synced";
      item.synced_at=now();
      item.error="";
      done++;

    }catch(e){
      item.error=e.message || String(e);

      if(isNetworkError(e)){
        break;
      }
    }
  }

  queueSet(list);
  notify();

  return {
    ok:queuePending().length===0,
    synced:done,
    pending:queuePending().length
  };
}

function clearCache(table){
  if(table){
    return removeKey(cacheKey(table));
  }

  Object.keys(localStorage).forEach(function(k){
    if(k.indexOf(CACHE_PREFIX)===0){
      removeKey(k);
    }
  });

  return true;
}

function status(){
  return {
    version:ZX_BACKEND_VERSION,
    online:isOnline(),
    pending:queuePending().length,
    queue_total:queueGet().length,
    meta:readJSON(META_KEY,{}),
    at:now()
  };
}

const Backend={
  version:ZX_BACKEND_VERSION,
  get:get,
  insert:insert,
  upsert:upsert,
  update:update,
  delete:remove,
  remove:remove,
  sync:sync,
  status:status,
  cache:{
    get:cacheGet,
    set:cacheSet,
    upsert:cacheUpsert,
    delete:cacheDelete,
    clear:clearCache
  },
  queue:{
    get:queueGet,
    pending:queuePending,
    add:queueAdd
  },
  utils:{
    online:isOnline,
    networkError:isNetworkError,
    uuid:uuid,
    now:now
  }
};

window.ZENTRYX_BACKEND=Backend;

window.ZENTRYX=window.ZENTRYX || {};
window.ZENTRYX.Backend=Backend;
window.ZENTRYX.backend=Backend;

window.addEventListener("online",function(){
  setTimeout(sync,800);
});

console.log("Zentryx BackendManager V"+ZX_BACKEND_VERSION+" cargado");

})();
