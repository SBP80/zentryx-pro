// ZENTRYX PRO - desarrollador_diagnostico.js
// V1003 - DIAGNÓSTICO SIN COMPONENTES RETIRADOS
(function(){
"use strict";

const VERSION="1003";
const QUEUE_KEY="zentryx_backend_queue";
const LOG_KEY="zentryx_dev_logs";

function esc(v){
  return String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function leerJSON(clave,defecto){
  try{
    const raw=localStorage.getItem(clave);
    return raw?JSON.parse(raw):defecto;
  }catch(e){
    return defecto;
  }
}

function bytesLocales(){
  let caracteres=0;
  let claves=0;
  try{
    Object.keys(localStorage).forEach(function(k){
      claves++;
      caracteres+=String(localStorage.getItem(k)||"").length;
    });
  }catch(e){}
  return {claves:claves,caracteres:caracteres,kb:Math.round(caracteres/1024)};
}

function estadoCola(){
  const resultado={
    backend_status:null,
    backend_pending:null,
    api_pending:null,
    local_pending:null,
    efectivo:0,
    discrepancia:false,
    detalle:""
  };

  try{
    if(window.ZENTRYX_BACKEND&&typeof window.ZENTRYX_BACKEND.status==="function"){
      const st=window.ZENTRYX_BACKEND.status()||{};
      resultado.backend_status=st;
      if(Number.isFinite(Number(st.pending))) resultado.backend_pending=Math.max(0,Number(st.pending));
    }
  }catch(e){}

  try{
    if(window.ZENTRYX_BACKEND&&window.ZENTRYX_BACKEND.queue&&typeof window.ZENTRYX_BACKEND.queue.pending==="function"){
      const q=window.ZENTRYX_BACKEND.queue.pending();
      if(Array.isArray(q)) resultado.api_pending=q.filter(function(x){return x&&x.status==="pending";}).length;
    }
  }catch(e){}

  const local=leerJSON(QUEUE_KEY,[]);
  if(Array.isArray(local)){
    resultado.local_pending=local.filter(function(x){return x&&x.status==="pending";}).length;
  }

  const valores=[resultado.backend_pending,resultado.api_pending,resultado.local_pending]
    .filter(function(v){return Number.isFinite(v);});

  // La cifra oficial es status().pending. Solo se recurre a la API o a localStorage
  // cuando el backend todavía no ha terminado de cargar.
  if(Number.isFinite(resultado.backend_pending)) resultado.efectivo=resultado.backend_pending;
  else if(Number.isFinite(resultado.api_pending)) resultado.efectivo=resultado.api_pending;
  else if(Number.isFinite(resultado.local_pending)) resultado.efectivo=resultado.local_pending;

  resultado.discrepancia=valores.length>1&&new Set(valores).size>1;
  if(resultado.discrepancia){
    resultado.detalle="Backend: "+String(resultado.backend_pending??"—")+
      " · API: "+String(resultado.api_pending??"—")+
      " · almacenamiento local: "+String(resultado.local_pending??"—");
  }
  return resultado;
}

function modulosEsperados(){
  return [
    ["Inicio","ZENTRYX_UI_inicio",true],
    ["Fichaje","ZX_fichaje_real",true],
    ["Agenda","ZX_agenda",true],
    ["Clientes","ZX_clientes",true],
    ["Trabajos","ZX_trabajos",true],
    ["Almacén","ZX_almacen",true],
    ["Usuarios","ZENTRYX_UI_usuarios",true],
    ["Horas extra","ZX_horas_extra",true],
    ["Manual","ZX_abrirManual",true],
    ["Vehículos","ZX_vehiculos",true],
    ["Ajustes","ZX_configuracion",true],
    ["Desarrollador","ZX_desarrollador",true]
  ].map(function(x){
    const cargado=typeof window[x[1]]==="function";
    return {nombre:x[0],funcion:x[1],esperado:x[2],cargado:cargado,correcto:x[2]?cargado:!cargado};
  });
}

function scriptsDuplicados(){
  const vistos=new Map();
  try{
    document.querySelectorAll("script[src]").forEach(function(s){
      const src=String(s.getAttribute("src")||"");
      const base=src.split("?")[0];
      if(!base) return;
      vistos.set(base,(vistos.get(base)||0)+1);
    });
  }catch(e){}
  return [...vistos.entries()].filter(function(x){return x[1]>1;}).map(function(x){return {src:x[0],veces:x[1]};});
}

function cachesVersionadas(){
  const grupos=new Map();
  try{
    Object.keys(localStorage).forEach(function(k){
      if(!k.startsWith("zentryx_cache_")&&!k.startsWith("zentryx_backend_cache_")) return;
      const m=k.match(/^(.*)_v(\d+)(?::.*)?$/i);
      if(!m) return;
      const base=m[1];
      const version=Number(m[2]);
      if(!grupos.has(base)) grupos.set(base,[]);
      grupos.get(base).push({clave:k,version:version});
    });
  }catch(e){}
  const antiguas=[];
  grupos.forEach(function(lista,base){
    const versiones=[...new Set(lista.map(function(x){return x.version;}))].sort(function(a,b){return b-a;});
    if(versiones.length<=2) return;
    const conservar=new Set(versiones.slice(0,2));
    lista.forEach(function(x){if(!conservar.has(x.version)) antiguas.push({base:base,clave:x.clave,version:x.version});});
  });
  return antiguas;
}

function logsRecientes(){
  const logs=leerJSON(LOG_KEY,[]);
  if(!Array.isArray(logs)) return [];
  const limite=Date.now()-24*60*60*1000;
  return logs.filter(function(x){
    const t=Date.parse(x&&x.fecha||"");
    const tipo=String(x&&x.tipo||"").toLowerCase();
    return Number.isFinite(t)&&t>=limite&&(tipo.includes("error")||tipo.includes("promise"));
  });
}

function revisar(){
  const modulos=modulosEsperados();
  const modulosMal=modulos.filter(function(x){return !x.correcto;});
  const colaEstado=estadoCola();
  const duplicados=scriptsDuplicados();
  const cacheAntigua=cachesVersionadas();
  const errores24h=logsRecientes();
  const almacenamiento=bytesLocales();
  const backendOk=!!(window.ZENTRYX_BACKEND&&typeof window.ZENTRYX_BACKEND.status==="function");
  const supabaseOk=!!(window.sb&&typeof window.sb.from==="function");
  const online=navigator.onLine!==false;
  const versionVisible=String(window.ZX_VERSION||"");
  const titleVersion=(document.title.match(/V(\d+)/i)||[])[1]||"";
  const versionOk=!!versionVisible&&versionVisible===titleVersion;
  const red=leerJSON("zentryx_network_status",null)||leerJSON("zentryx_backend_network",null)||{};
  const latencia=Number(red.latencia_ms);

  const avisos=[];
  if(!online) avisos.push({nivel:"error",titulo:"Sin conexión",detalle:"El dispositivo no tiene acceso a Internet."});
  if(!backendOk) avisos.push({nivel:"error",titulo:"Backend no disponible",detalle:"No se encuentra ZENTRYX_BACKEND.status()."});
  if(!supabaseOk) avisos.push({nivel:"error",titulo:"Supabase no disponible",detalle:"El cliente de base de datos no está cargado."});
  if(!versionOk) avisos.push({nivel:"aviso",titulo:"Versión incoherente",detalle:"Título V"+(titleVersion||"—")+" y despliegue "+(versionVisible||"—")+" no coinciden."});
  modulosMal.forEach(function(m){
    avisos.push({nivel:"error",titulo:"Módulo incorrecto: "+m.nombre,detalle:m.esperado?"No se ha cargado "+m.funcion:"La copia antigua "+m.funcion+" está activa."});
  });
  if(colaEstado.efectivo>0) avisos.push({nivel:"aviso",titulo:"Cola pendiente",detalle:colaEstado.efectivo+" operaciones esperan sincronización."});
  if(colaEstado.discrepancia) avisos.push({nivel:"aviso",titulo:"Datos de cola desiguales",detalle:colaEstado.detalle});
  if(duplicados.length) avisos.push({nivel:"aviso",titulo:"Scripts repetidos",detalle:duplicados.length+" archivos JavaScript aparecen más de una vez."});
  if(cacheAntigua.length) avisos.push({nivel:"aviso",titulo:"Caché antigua",detalle:cacheAntigua.length+" claves versionadas antiguas pueden eliminarse."});
  if(errores24h.length) avisos.push({nivel:"aviso",titulo:"Errores recientes",detalle:errores24h.length+" errores técnicos registrados durante las últimas 24 horas."});
  if(almacenamiento.kb>3500) avisos.push({nivel:"aviso",titulo:"Almacenamiento local alto",detalle:"Zentryx ocupa aproximadamente "+almacenamiento.kb+" KB en este dispositivo."});
  if(Number.isFinite(latencia)&&latencia>1500) avisos.push({nivel:"aviso",titulo:"Conexión lenta",detalle:"La última latencia registrada fue de "+latencia+" ms."});

  const errores=avisos.filter(function(x){return x.nivel==="error";}).length;
  const advertencias=avisos.filter(function(x){return x.nivel==="aviso";}).length;
  const puntuacion=Math.max(0,100-(errores*25)-(advertencias*7));
  const estado=errores?"Atención":advertencias?"Revisión":"Correcto";
  return {estado,puntuacion,avisos,modulos,colaEstado,duplicados,cacheAntigua,errores24h,almacenamiento,backendOk,supabaseOk,online,versionOk,versionVisible,titleVersion,latencia};
}

function colorEstado(estado){
  return estado==="Correcto"?"#16a34a":estado==="Revisión"?"#d97706":"#dc2626";
}

function filaEstado(ok,textoOk,textoMal){
  return `<span class="zx_diag_estado ${ok?"ok":"bad"}">${ok?esc(textoOk):esc(textoMal)}</span>`;
}

function crearCard(d){
  const card=document.createElement("section");
  card.className="zx_dev_card full";
  card.dataset.zxDevSection="diagnostico_avanzado";

  const avisos=d.avisos.length?d.avisos.map(function(a){
    return `<div class="zx_diag_aviso ${a.nivel}"><b>${esc(a.titulo)}</b><span>${esc(a.detalle)}</span></div>`;
  }).join(""):`<div class="zx_diag_aviso ok"><b>Sin incidencias activas</b><span>Las comprobaciones automáticas han terminado correctamente.</span></div>`;

  const modulos=d.modulos.map(function(m){
    return `<tr><td>${esc(m.nombre)}</td><td>${esc(m.funcion)}</td><td>${filaEstado(m.correcto,"Correcto",m.esperado?"No cargado":"Activo")}</td></tr>`;
  }).join("");

  const scripts=d.duplicados.length?d.duplicados.map(function(x){return `<li>${esc(x.src)} · ${x.veces} veces</li>`;}).join(""):"<li>Ninguno</li>";
  const caches=d.cacheAntigua.length?d.cacheAntigua.slice(0,30).map(function(x){return `<li>${esc(x.clave)}</li>`;}).join(""):"<li>Ninguna</li>";
  const errores=d.errores24h.length?d.errores24h.slice(0,20).map(function(x){return `<li>${esc(x.fecha)} · ${esc(x.mensaje||x.tipo)}</li>`;}).join(""):"<li>Ninguno</li>";

  card.innerHTML=`
    <h2>Diagnóstico automático</h2>
    <div class="zx_dev_text">Comprobación local de carga, sincronización, caché, almacenamiento y errores recientes.</div>
    <div class="zx_diag_kpis">
      <div><b style="color:${colorEstado(d.estado)}">${esc(d.estado)}</b><span>Estado · ${d.puntuacion}/100</span></div>
      <div><b>${d.avisos.length}</b><span>Avisos</span></div>
      <div><b>${d.colaEstado.efectivo}</b><span>Cola real</span></div>
      <div><b>${d.almacenamiento.kb} KB</b><span>Datos locales</span></div>
    </div>
    <div class="zx_diag_checks">
      <div><span>Internet</span>${filaEstado(d.online,"Disponible","Sin conexión")}</div>
      <div><span>Backend</span>${filaEstado(d.backendOk,"Disponible","No cargado")}</div>
      <div><span>Supabase</span>${filaEstado(d.supabaseOk,"Disponible","No cargado")}</div>
      <div><span>Módulos</span>${filaEstado(d.modulos.every(function(x){return x.correcto;}),"Correctos","Revisar")}</div>
      <div><span>Versión</span>${filaEstado(d.versionOk,"V"+d.versionVisible,"Revisar")}</div>
      <div><span>Sincronización</span>${filaEstado(d.colaEstado.efectivo===0,"Al día",d.colaEstado.efectivo+" pendientes")}</div>
    </div>
    <div class="zx_diag_avisos">${avisos}</div>
    <details class="zx_dev_details"><summary>Ver comprobación de cola</summary><div><ul>
      <li>Backend: ${esc(d.colaEstado.backend_pending??"No disponible")}</li>
      <li>API de cola: ${esc(d.colaEstado.api_pending??"No disponible")}</li>
      <li>Almacenamiento local: ${esc(d.colaEstado.local_pending??"No disponible")}</li>
      <li>Valor usado: ${esc(d.colaEstado.efectivo)}</li>
    </ul></div></details>
    <details class="zx_dev_details"><summary>Ver comprobación de módulos</summary><div><table class="zx_dev_table">${modulos}</table></div></details>
    <details class="zx_dev_details"><summary>Ver scripts repetidos</summary><div><ul>${scripts}</ul></div></details>
    <details class="zx_dev_details"><summary>Ver caché antigua</summary><div><ul>${caches}</ul></div></details>
    <details class="zx_dev_details"><summary>Ver errores de las últimas 24 horas</summary><div><ul>${errores}</ul></div></details>
    <button type="button" class="zx_diag_actualizar">Actualizar diagnóstico</button>
  `;
  card.querySelector(".zx_diag_actualizar").addEventListener("click",function(){mejorar();});
  return card;
}

function css(){
  if(document.getElementById("zx_dev_diagnostico_css")) return;
  const st=document.createElement("style");
  st.id="zx_dev_diagnostico_css";
  st.textContent=`
    .zx_diag_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}
    .zx_diag_kpis>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px;min-width:0}
    .zx_diag_kpis b{display:block;font-size:23px;font-weight:950;color:#071330;overflow-wrap:anywhere}
    .zx_diag_kpis span{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:900}
    .zx_diag_checks{display:grid;gap:8px;margin:12px 0}
    .zx_diag_checks>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:13px;background:#fff}
    .zx_diag_checks>div>span:first-child{font-weight:900;color:#334155}
    .zx_diag_estado{display:inline-block;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950}
    .zx_diag_estado.ok{background:#dcfce7;color:#166534}
    .zx_diag_estado.bad{background:#fee2e2;color:#991b1b}
    .zx_diag_avisos{display:grid;gap:8px;margin:12px 0}
    .zx_diag_aviso{border-radius:14px;padding:11px 12px;border:1px solid #e2e8f0}
    .zx_diag_aviso b,.zx_diag_aviso span{display:block}
    .zx_diag_aviso span{margin-top:3px;font-size:12px;line-height:1.4;font-weight:750}
    .zx_diag_aviso.ok{background:#f0fdf4;color:#166534;border-color:#bbf7d0}
    .zx_diag_aviso.aviso{background:#fffbeb;color:#92400e;border-color:#fde68a}
    .zx_diag_aviso.error{background:#fef2f2;color:#991b1b;border-color:#fecaca}
    .zx_diag_actualizar{width:100%;border:0;border-radius:14px;padding:13px;margin-top:12px;background:#2563eb;color:white;font-weight:950;font-size:14px}
    @media(min-width:760px){.zx_diag_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_diag_checks{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(st);
}

function mejorar(){
  const root=document.getElementById("app");
  if(!root||!root.querySelector(".zx_dev_grid")) return;
  root.querySelectorAll('[data-zx-dev-section="diagnostico_avanzado"]').forEach(function(x){x.remove();});
  const grid=root.querySelector(".zx_dev_grid");
  const card=crearCard(revisar());
  const salud=grid.querySelector('[data-zx-dev-section="salud"]');
  if(salud&&salud.nextSibling) grid.insertBefore(card,salud.nextSibling);
  else grid.insertBefore(card,grid.firstChild);
}

function envolver(){
  if(typeof window.ZX_desarrollador!=="function"||window.ZX_desarrollador.__zxDiagnostico) return;
  const original=window.ZX_desarrollador;
  const nueva=function(){
    const r=original.apply(this,arguments);
    setTimeout(mejorar,20);
    setTimeout(mejorar,240);
    return r;
  };
  nueva.__zxDiagnostico=true;
  window.ZX_desarrollador=nueva;
  window.ZENTRYX=window.ZENTRYX||{};
  window.ZENTRYX.desarrollador=nueva;
}

css();
envolver();
document.addEventListener("DOMContentLoaded",function(){css();envolver();setTimeout(mejorar,500);},{once:true});
window.addEventListener("zentryx:backend",function(){setTimeout(mejorar,100);});

console.log("Zentryx desarrollador_diagnostico.js V"+VERSION+" cargado");
})();
