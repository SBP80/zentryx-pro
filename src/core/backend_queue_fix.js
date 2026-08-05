// ZENTRYX PRO - backend_queue_fix.js
// V1003 - REPARACIÓN DE COLA GPS Y MATERIALES ANTIGUOS
(function(){
"use strict";

const FIX_VERSION="1003";
const QUEUE_KEY="zentryx_backend_queue";
let sincronizacionAutomaticaLanzada=false;

function leerCola(){
  try{
    const data=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");
    return Array.isArray(data)?data:[];
  }catch(e){
    return [];
  }
}

function guardarCola(lista){
  localStorage.setItem(QUEUE_KEY,JSON.stringify(Array.isArray(lista)?lista:[]));
}

function texto(v){
  return v===null||v===undefined?"":String(v);
}

function materialLimpio(obj){
  if(!obj || typeof obj!=="object" || Array.isArray(obj)) return obj;

  // La tabla real trabajos_materiales de esta instalación conserva
  // únicamente los campos básicos. Las propiedades comerciales antiguas
  // pertenecen a la biblioteca local de materiales y no deben enviarse aquí.
  const material=texto(obj.material||obj.nombre).trim();
  const limpio={
    trabajo_id:obj.trabajo_id,
    material:material,
    cantidad:Number(obj.cantidad||0),
    unidad:texto(obj.unidad||"ud").trim()||"ud",
    notas:texto(obj.notas).trim(),
    preparado:Boolean(obj.preparado)
  };

  if(obj.id) limpio.id=obj.id;
  if(obj.created_at) limpio.created_at=obj.created_at;
  if(!Number.isFinite(limpio.cantidad)) limpio.cantidad=0;

  return limpio;
}

function puntoGpsLimpio(obj){
  if(!obj || typeof obj!=="object" || Array.isArray(obj)) return obj;
  const limpio={...obj};

  if(limpio.origen==="gps_alta_precision") limpio.origen="gps";
  if(!["gps","cache_offline","manual"].includes(texto(limpio.origen))){
    limpio.origen=navigator.onLine===false?"cache_offline":"gps";
  }

  if(limpio.usuario_id===null || limpio.usuario_id===undefined){
    limpio.usuario_id="";
  }

  return limpio;
}

function corregirDato(tabla,data){
  const nombre=texto(tabla).toLowerCase();

  if(nombre==="rutas_vehiculos_puntos"){
    return Array.isArray(data)?data.map(puntoGpsLimpio):puntoGpsLimpio(data);
  }

  if(nombre==="trabajos_materiales"){
    return Array.isArray(data)?data.map(materialLimpio):materialLimpio(data);
  }

  return data;
}

function esErrorReparable(item){
  const err=texto(item&&item.error).toLowerCase();
  const tabla=texto(item&&item.table).toLowerCase();

  return (
    tabla==="rutas_vehiculos_puntos" ||
    tabla==="trabajos_materiales" ||
    err.includes("origen_check") ||
    err.includes("schema cache") ||
    err.includes("could not find the")
  );
}

function corregirOperacion(item){
  if(!item || typeof item!=="object") return item;

  const copia={...item};
  copia.data=corregirDato(copia.table,copia.data);

  if(esErrorReparable(copia) || copia.status==="error"){
    copia.status="pending";
    copia.attempts=0;
    copia.reason="";
    copia.error="";
    copia.last_attempt_at="";
    delete copia.failed_at;
  }

  return copia;
}

function repararColaCompleta(){
  const original=leerCola();
  let corregidas=0;

  const nueva=original.map(function(item){
    const antes=JSON.stringify(item);
    const despues=corregirOperacion(item);
    if(JSON.stringify(despues)!==antes) corregidas++;
    return despues;
  });

  guardarCola(nueva);
  emitirEstado();

  return {
    total:nueva.length,
    corregidas:corregidas,
    pendientes:nueva.filter(x=>x&&(x.status||"pending")==="pending").length
  };
}

function claveOperacion(item){
  return [
    item.status||"pending",
    item.table||"",
    item.action||"",
    item.field||"id",
    texto(item.value),
    JSON.stringify(corregirDato(item.table,item.data))
  ].join("|");
}

function deduplicarCola(){
  const lista=leerCola().map(corregirOperacion);
  const vistas=new Set();
  const limpia=[];
  let duplicados=0;
  let sincronizadosAntiguos=0;

  lista.forEach(function(item){
    if(!item) return;

    if(item.status==="synced"){
      const fecha=Date.parse(item.synced_at||item.created_at||"");
      if(Number.isFinite(fecha) && Date.now()-fecha>7*86400000){
        sincronizadosAntiguos++;
        return;
      }
    }

    const clave=claveOperacion(item);
    if((item.status||"pending")==="pending" && vistas.has(clave)){
      duplicados++;
      return;
    }

    vistas.add(clave);
    limpia.push(item);
  });

  guardarCola(limpia);
  emitirEstado();

  return {
    duplicates:duplicados,
    removed_synced:sincronizadosAntiguos,
    corrected:lista.length,
    total:limpia.length
  };
}

function emitirEstado(){
  try{
    const backend=window.ZENTRYX_BACKEND;
    window.dispatchEvent(new CustomEvent("zentryx:backend",{
      detail:backend&&typeof backend.status==="function"
        ?backend.status()
        :{pending:leerCola().filter(x=>x&&(x.status||"pending")==="pending").length}
    }));
  }catch(e){}
}

async function sincronizarTrasReparar(backend){
  if(sincronizacionAutomaticaLanzada || navigator.onLine===false) return;
  if(!backend || typeof backend.sync!=="function") return;

  sincronizacionAutomaticaLanzada=true;
  try{
    await backend.sync();
  }catch(e){
    console.warn("Zentryx V1003: sincronización automática pendiente.",e);
  }finally{
    emitirEstado();
  }
}

function instalar(){
  const backend=window.ZENTRYX_BACKEND;
  if(!backend) return false;
  if(backend.__zxQueueFixVersion===FIX_VERSION) return true;

  backend.__zxQueueFixVersion=FIX_VERSION;
  backend.queue=backend.queue||{};

  const insertOriginal=typeof backend.insert==="function" ? backend.insert.bind(backend) : null;
  const upsertOriginal=typeof backend.upsert==="function" ? backend.upsert.bind(backend) : null;
  const updateOriginal=typeof backend.update==="function" ? backend.update.bind(backend) : null;
  const syncOriginal=typeof backend.sync==="function" ? backend.sync.bind(backend) : null;
  const addOriginal=typeof backend.queue.add==="function" ? backend.queue.add.bind(backend.queue) : null;

  if(insertOriginal && !backend.insert.__zxV1003){
    const fn=function(tabla,data,opciones){
      return insertOriginal(tabla,corregirDato(tabla,data),opciones);
    };
    fn.__zxV1003=true;
    backend.insert=fn;
  }

  if(upsertOriginal && !backend.upsert.__zxV1003){
    const fn=function(tabla,data,opciones){
      return upsertOriginal(tabla,corregirDato(tabla,data),opciones);
    };
    fn.__zxV1003=true;
    backend.upsert=fn;
  }

  if(updateOriginal && !backend.update.__zxV1003){
    const fn=function(tabla,data,opciones){
      return updateOriginal(tabla,corregirDato(tabla,data),opciones);
    };
    fn.__zxV1003=true;
    backend.update=fn;
  }

  if(addOriginal){
    backend.queue.add=function(op){
      const copia={...(op||{})};
      copia.data=corregirDato(copia.table,copia.data);
      return addOriginal(copia);
    };
  }

  backend.queue.prune=deduplicarCola;

  backend.queue.retryErrors=function(){
    const antes=leerCola();
    let reactivadas=0;
    const nueva=antes.map(function(item){
      const corregida=corregirOperacion(item);
      if(JSON.stringify(item)!==JSON.stringify(corregida)) reactivadas++;
      return corregida;
    });
    guardarCola(nueva);
    emitirEstado();
    return reactivadas;
  };

  if(syncOriginal){
    backend.sync=async function(){
      repararColaCompleta();
      const resultado=await syncOriginal();
      emitirEstado();
      return resultado;
    };
  }

  window.ZENTRYX=window.ZENTRYX||{};
  window.ZENTRYX.Backend=backend;
  window.ZENTRYX.backend=backend;
  window.ZENTRYX.repararCola=function(){
    const reparada=repararColaCompleta();
    const depurada=deduplicarCola();
    return {...reparada,...depurada};
  };

  const inicial=repararColaCompleta();
  console.log("Zentryx backend_queue_fix V"+FIX_VERSION+" cargado.",inicial);

  setTimeout(function(){sincronizarTrasReparar(backend)},1200);
  return true;
}

if(!instalar()){
  document.addEventListener("DOMContentLoaded",instalar,{once:true});
  setTimeout(instalar,100);
  setTimeout(instalar,500);
  setTimeout(instalar,1200);
}
})();