// ZENTRYX PRO - backend_queue_fix.js
// V1001 - CORRECCIÓN DE COLA, DATOS GPS Y MATERIALES
(function(){
"use strict";

const FIX_VERSION="1001";
const QUEUE_KEY="zentryx_backend_queue";

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

function limpiarObjetoMaterial(obj){
  if(!obj || typeof obj!=="object" || Array.isArray(obj)) return obj;

  const limpio={...obj};

  // Columnas confirmadas en la tabla actual.
  const permitidas=new Set([
    "id","trabajo_id","material","cantidad","unidad","notas",
    "referencia","proveedor","precio_compra","precio_venta",
    "preparado","created_at"
  ]);

  Object.keys(limpio).forEach(function(k){
    if(!permitidas.has(k)) delete limpio[k];
  });

  if(!limpio.material && obj.nombre) limpio.material=String(obj.nombre);
  return limpio;
}

function corregirDato(tabla,data){
  const nombre=String(tabla||"").toLowerCase();

  if(nombre==="rutas_vehiculos_puntos"){
    const corregir=function(x){
      if(!x || typeof x!=="object") return x;
      const y={...x};

      if(y.origen==="gps_alta_precision") y.origen="gps";
      if(!["gps","cache_offline","manual"].includes(String(y.origen||""))){
        y.origen=navigator.onLine===false?"cache_offline":"gps";
      }

      // La base exige usuario_id; no se inventa un usuario distinto.
      if(y.usuario_id===null || y.usuario_id===undefined) y.usuario_id="";
      return y;
    };
    return Array.isArray(data)?data.map(corregir):corregir(data);
  }

  if(nombre==="trabajos_materiales"){
    return Array.isArray(data)
      ? data.map(limpiarObjetoMaterial)
      : limpiarObjetoMaterial(data);
  }

  return data;
}

function corregirOperacion(item){
  if(!item || typeof item!=="object") return item;
  const copia={...item};
  copia.data=corregirDato(copia.table,copia.data);

  // Permite que vuelva a probarse aunque hubiera agotado intentos.
  if(copia.status==="pending" || copia.status==="error"){
    copia.status="pending";
    copia.attempts=0;
    copia.error="";
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

  try{
    window.dispatchEvent(new CustomEvent("zentryx:backend",{
      detail:{pending:nueva.filter(x=>x&&x.status==="pending").length}
    }));
  }catch(e){}

  return {
    total:nueva.length,
    corregidas:corregidas,
    pendientes:nueva.filter(x=>x&&x.status==="pending").length
  };
}

function deduplicarCola(){
  const lista=leerCola().map(corregirOperacion);
  const vistos=new Set();
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

    const clave=[
      item.status||"pending",
      item.table||"",
      item.action||"",
      item.field||"id",
      String(item.value||""),
      JSON.stringify(item.data||null)
    ].join("|");

    if((item.status||"pending")==="pending" && vistos.has(clave)){
      duplicados++;
      return;
    }

    vistos.add(clave);
    limpia.push(item);
  });

  guardarCola(limpia);

  return {
    duplicates:duplicados,
    removed_synced:sincronizadosAntiguos,
    corrected:lista.length,
    total:limpia.length
  };
}

function instalar(){
  const backend=window.ZENTRYX_BACKEND;
  if(!backend || backend.__zxQueueFixInstalled) return false;

  backend.__zxQueueFixInstalled=true;
  backend.queue=backend.queue||{};

  const insertOriginal=typeof backend.insert==="function" ? backend.insert.bind(backend) : null;
  const upsertOriginal=typeof backend.upsert==="function" ? backend.upsert.bind(backend) : null;
  const updateOriginal=typeof backend.update==="function" ? backend.update.bind(backend) : null;
  const syncOriginal=typeof backend.sync==="function" ? backend.sync.bind(backend) : null;
  const addOriginal=typeof backend.queue.add==="function" ? backend.queue.add.bind(backend.queue) : null;

  if(insertOriginal){
    backend.insert=function(tabla,data,opciones){
      return insertOriginal(tabla,corregirDato(tabla,data),opciones);
    };
  }

  if(upsertOriginal){
    backend.upsert=function(tabla,data,opciones){
      return upsertOriginal(tabla,corregirDato(tabla,data),opciones);
    };
  }

  if(updateOriginal){
    backend.update=function(tabla,data,opciones){
      return updateOriginal(tabla,corregirDato(tabla,data),opciones);
    };
  }

  if(addOriginal){
    backend.queue.add=function(op){
      const copia={...(op||{})};
      copia.data=corregirDato(copia.table,copia.data);
      return addOriginal(copia);
    };
  }

  backend.queue.prune=function(){
    const resultado=deduplicarCola();
    if(typeof backend.status==="function"){
      try{
        window.dispatchEvent(new CustomEvent("zentryx:backend",{detail:backend.status()}));
      }catch(e){}
    }
    return resultado;
  };

  backend.queue.retryErrors=function(){
    const lista=leerCola();
    let reactivadas=0;

    const nueva=lista.map(function(item){
      if(!item) return item;
      const antes=JSON.stringify(item);
      const despues=corregirOperacion(item);
      if(JSON.stringify(despues)!==antes) reactivadas++;
      return despues;
    });

    guardarCola(nueva);

    try{
      window.dispatchEvent(new CustomEvent("zentryx:backend",{
        detail:typeof backend.status==="function"?backend.status():{}
      }));
    }catch(e){}

    return reactivadas;
  };

  if(syncOriginal){
    backend.sync=async function(){
      repararColaCompleta();
      return syncOriginal();
    };
  }

  window.ZENTRYX=window.ZENTRYX||{};
  window.ZENTRYX.Backend=backend;
  window.ZENTRYX.backend=backend;

  const inicial=repararColaCompleta();
  console.log(
    "Zentryx backend_queue_fix V"+FIX_VERSION+" cargado.",
    "Operaciones corregidas:",inicial.corregidas
  );

  return true;
}

if(!instalar()){
  document.addEventListener("DOMContentLoaded",instalar,{once:true});
  setTimeout(instalar,100);
  setTimeout(instalar,500);
}
})();
