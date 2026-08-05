// ===============================
// ZENTRYX PRO - BACKEND MANAGER
// V3122 - COLA DIAGNOSTICADA, REINTENTOS Y MANTENIMIENTO SEGURO
// ===============================
(function(){
"use strict";

const ZX_BACKEND_VERSION="3122";
const RUNTIME_KEY="__zentryx_backend_runtime";
const MAX_SYNCED_QUEUE_ITEMS=100;
const MAX_QUEUE_ATTEMPTS=8;
const STALE_QUEUE_DAYS=14;
const CACHE_PREFIX="zentryx_backend_cache_";
const QUEUE_KEY="zentryx_backend_queue";
const META_KEY="zentryx_backend_meta";

const previousRuntime=window[RUNTIME_KEY];
if(previousRuntime && typeof previousRuntime.destroy==="function"){
  try{previousRuntime.destroy();}catch(e){}
}

let syncPromise=null;
let onlineHandler=null;

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

function cacheMerge(table,data,field){
  field=field || "id";
  const incoming=Array.isArray(data) ? data : [];
  const current=cacheGet(table);
  const index=new Map();

  current.forEach(function(item){
    if(item && item[field]!==undefined && item[field]!==null){
      index.set(String(item[field]),item);
    }
  });

  incoming.forEach(function(item){
    if(!item || item[field]===undefined || item[field]===null) return;
    const key=String(item[field]);
    index.set(key,Object.assign({},index.get(key) || {},item));
  });

  const merged=Array.from(index.values());
  cacheSet(table,merged);
  return merged;
}

function isFilteredGet(options){
  return Boolean(
    options && (
      (Array.isArray(options.eq) && options.eq.length) ||
      (Array.isArray(options.neq) && options.neq.length) ||
      (Array.isArray(options.gte) && options.gte.length) ||
      (Array.isArray(options.lte) && options.lte.length) ||
      (Array.isArray(options.order) && options.order.length) ||
      options.limit ||
      typeof options.query==="function"
    )
  );
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

function compactQueue(list){
  const source=Array.isArray(list) ? list : [];
  const pending=source.filter(function(item){
    return item && item.status==="pending";
  });
  const other=source.filter(function(item){
    return item && item.status!=="pending";
  }).slice(-MAX_SYNCED_QUEUE_ITEMS);
  return pending.concat(other);
}

function queueSet(list){
  return writeJSON(QUEUE_KEY,compactQueue(list));
}

function queuePending(){
  return queueGet().filter(function(x){
    return x && x.status==="pending";
  });
}


function queueDiagnostics(){
  const list=queueGet();
  const nowMs=Date.now();
  const out={total:list.length,pending:0,synced:0,error:0,stale:0,oldest_pending:null,by_action:{insert:0,upsert:0,update:0,delete:0,other:0},by_table:{}};
  list.forEach(function(item){
    if(!item) return;
    const status=String(item.status||"pending");
    if(status==="pending") out.pending++; else if(status==="synced") out.synced++; else if(status==="error") out.error++;
    const action=String(item.action||"other").toLowerCase();
    if(Object.prototype.hasOwnProperty.call(out.by_action,action)) out.by_action[action]++; else out.by_action.other++;
    const table=String(item.table||"sin_tabla");
    out.by_table[table]=(out.by_table[table]||0)+1;
    if(status==="pending"){
      const created=Date.parse(item.created_at||"");
      if(Number.isFinite(created)){
        if(!out.oldest_pending || created<Date.parse(out.oldest_pending)) out.oldest_pending=item.created_at;
        if(nowMs-created>STALE_QUEUE_DAYS*86400000) out.stale++;
      }
    }
  });
  return out;
}

function queuePrune(){
  const list=queueGet();
  const seen=new Set();
  const cleaned=[];
  let duplicates=0, removedSynced=0;
  list.forEach(function(item){
    if(!item) return;
    if(item.status==="synced"){
      const t=Date.parse(item.synced_at||item.created_at||"");
      if(Number.isFinite(t) && Date.now()-t>7*86400000){ removedSynced++; return; }
    }
    const key=[item.status||"pending",item.table||"",item.action||"",item.field||"id",String(item.value||""),JSON.stringify(item.data||null)].join("|");
    if((item.status||"pending")==="pending" && seen.has(key)){ duplicates++; return; }
    seen.add(key);
    cleaned.push(item);
  });
  queueSet(cleaned);
  return {duplicates:duplicates,removed_synced:removedSynced,total:cleaned.length};
}

function queueRetryErrors(){
  const list=queueGet();
  let changed=0;
  list.forEach(function(item){
    if(item && item.status==="error"){
      item.status="pending"; item.attempts=0; item.error=""; delete item.failed_at; changed++;
    }
  });
  queueSet(list);
  notify();
  return changed;
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

    // Una consulta filtrada no debe reemplazar toda la caché de la tabla.
    // Se fusiona por id para conservar datos disponibles sin conexión.
    if(isFilteredGet(options)){
      cacheMerge(table,data,options.cacheField || "id");
    }else{
      cacheSet(table,data);
    }

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

async function syncInternal(){
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

    if((item.attempts || 0)>=MAX_QUEUE_ATTEMPTS){
      item.status="error";
      item.error=item.error || "Máximo de reintentos alcanzado";
      item.failed_at=now();
      continue;
    }

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

function sync(){
  if(syncPromise) return syncPromise;

  syncPromise=syncInternal().finally(function(){
    syncPromise=null;
  });

  return syncPromise;
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
    merge:cacheMerge,
    upsert:cacheUpsert,
    delete:cacheDelete,
    clear:clearCache
  },
  queue:{
    get:queueGet,
    pending:queuePending,
    add:queueAdd,
    diagnostics:queueDiagnostics,
    prune:queuePrune,
    retryErrors:queueRetryErrors
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

onlineHandler=function(){
  setTimeout(function(){ queuePrune(); sync(); },800);
};

window.addEventListener("online",onlineHandler);
setTimeout(function(){ queuePrune(); if(isOnline()) sync(); },1200);

window[RUNTIME_KEY]={
  version:ZX_BACKEND_VERSION,
  destroy:function(){
    if(onlineHandler){
      try{window.removeEventListener("online",onlineHandler);}catch(e){}
    }
    onlineHandler=null;
  }
};

console.log("Zentryx BackendManager V"+ZX_BACKEND_VERSION+" cargado");

})();
