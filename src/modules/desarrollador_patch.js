// ZENTRYX PRO - desarrollador_patch.js
// V1001 - TABLAS MOVIL, CACHE Y ESTADOS
(function(){
"use strict";

const PATCH_VERSION="1001";
const VERSION_CACHE_KEEP=2;

function esClaveCache(k){
  return k.indexOf("zentryx_cache_")===0 || k.indexOf("zentryx_backend_cache_")===0;
}

function instalarCSS(){
  if(document.getElementById("zx_dev_patch_css_v1001")) return;
  const st=document.createElement("style");
  st.id="zx_dev_patch_css_v1001";
  st.textContent=`
    .zx_dev_table{table-layout:fixed!important;width:100%!important}
    .zx_dev_table td{
      word-break:normal!important;
      overflow-wrap:anywhere!important;
      white-space:normal!important;
      line-height:1.35!important
    }
    .zx_dev_table td:first-child{
      width:42%!important;
      min-width:130px!important;
      font-weight:900!important
    }
    .zx_dev_table td:nth-child(2){width:auto!important}
    .zx_dev_table td:last-child:not(:nth-child(2)){
      width:25%!important;
      text-align:left!important
    }
    .zx_dev_card[data-zx-dev-section="cache"] .zx_dev_table td:first-child,
    .zx_dev_card[data-zx-dev-section="localstorage"] .zx_dev_table td:first-child{
      width:70%!important
    }
    .zx_dev_card[data-zx-dev-section="cache"] .zx_dev_table td:nth-child(2),
    .zx_dev_card[data-zx-dev-section="cache"] .zx_dev_table td:nth-child(3){
      width:15%!important
    }
    .zx_dev_summary{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin:10px 0 14px
    }
    .zx_dev_summary_item{
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:16px;
      padding:12px;
      min-width:0
    }
    .zx_dev_summary_item b{
      display:block;
      color:#071330;
      font-size:22px;
      font-weight:950;
      overflow-wrap:anywhere
    }
    .zx_dev_summary_item span{
      display:block;
      margin-top:4px;
      color:#64748b;
      font-size:12px;
      font-weight:900
    }
    .zx_dev_details{
      border:1px solid #e2e8f0;
      border-radius:16px;
      overflow:hidden;
      margin-top:10px
    }
    .zx_dev_details summary{
      list-style:none;
      cursor:pointer;
      padding:13px 14px;
      font-weight:950;
      color:#1d4ed8;
      background:#eff6ff
    }
    .zx_dev_details summary::-webkit-details-marker{display:none}
    .zx_dev_details>div{padding:0 10px 10px}
    .zx_dev_note{
      padding:10px 12px;
      margin-top:8px;
      border-radius:12px;
      background:#f1f5f9;
      color:#475569;
      font-size:12px;
      font-weight:850;
      line-height:1.4
    }
    @media(max-width:430px){
      .zx_dev_card{padding:16px!important}
      .zx_dev_table{font-size:12px!important}
      .zx_dev_table td{padding:9px 5px!important}
      .zx_dev_table td:first-child{width:40%!important;min-width:0!important}
      .zx_dev_card[data-zx-dev-section="cache"] .zx_dev_table td:first-child,
      .zx_dev_card[data-zx-dev-section="localstorage"] .zx_dev_table td:first-child{
        width:72%!important
      }
    }
  `;
  document.head.appendChild(st);
}

function gruposVersionados(){
  const grupos=new Map();
  Object.keys(localStorage).forEach(function(k){
    if(!esClaveCache(k)) return;
    const m=k.match(/^(.*)_v(\d+)(?::.*)?$/i);
    if(!m) return;
    const base=m[1], version=Number(m[2]);
    if(!Number.isFinite(version)) return;
    if(!grupos.has(base)) grupos.set(base,[]);
    grupos.get(base).push({key:k,version:version});
  });
  return grupos;
}

function limpiarCacheVersionadaAntigua(){
  let eliminadas=0;
  try{
    gruposVersionados().forEach(function(lista){
      lista.sort(function(a,b){return b.version-a.version;});
      lista.slice(VERSION_CACHE_KEEP).forEach(function(item){
        localStorage.removeItem(item.key);
        eliminadas++;
      });
    });
  }catch(e){
    console.warn("No se pudo depurar caché antigua",e);
  }
  return eliminadas;
}

function contarCache(){
  let claves=0, caracteres=0;
  try{
    Object.keys(localStorage).forEach(function(k){
      if(!esClaveCache(k)) return;
      claves++;
      caracteres+=String(localStorage.getItem(k)||"").length;
    });
  }catch(e){}
  return {claves:claves,kb:Math.round(caracteres/1024)};
}

function colaPendiente(){
  try{
    if(window.ZENTRYX_BACKEND && window.ZENTRYX_BACKEND.queue &&
       typeof window.ZENTRYX_BACKEND.queue.pending==="function"){
      const q=window.ZENTRYX_BACKEND.queue.pending();
      return Array.isArray(q)?q:[];
    }
  }catch(e){}
  try{
    const q=JSON.parse(localStorage.getItem("zentryx_offline_queue")||"[]");
    return Array.isArray(q)?q.filter(function(x){
      return x && (x.estado==="pendiente" || x.status==="pending");
    }):[];
  }catch(e){return [];}
}

function marcarSecciones(root){
  root.querySelectorAll(".zx_dev_card").forEach(function(card){
    const h=card.querySelector("h2,h3");
    if(!h) return;
    const t=(h.textContent||"").trim().toLowerCase();
    if(t==="caché local") card.dataset.zxDevSection="cache";
    if(t==="localstorage") card.dataset.zxDevSection="localstorage";
    if(t==="cola offline") card.dataset.zxDevSection="queue";
    if(t==="módulos cargados") card.dataset.zxDevSection="modules";
  });
}

function resumenCard(card,items){
  if(card.querySelector(".zx_dev_summary")) return;
  const h=card.querySelector("h3");
  if(!h) return;
  const box=document.createElement("div");
  box.className="zx_dev_summary";
  box.innerHTML=items.map(function(x){
    return `<div class="zx_dev_summary_item"><b>${x.valor}</b><span>${x.etiqueta}</span></div>`;
  }).join("");
  h.insertAdjacentElement("afterend",box);
}

function hacerDesplegable(card,titulo){
  if(card.querySelector(".zx_dev_details")) return;
  const tablas=[...card.children].filter(function(el){
    return el.matches("table.zx_dev_table,.zx_dev_log");
  });
  if(!tablas.length) return;
  const details=document.createElement("details");
  details.className="zx_dev_details";
  const summary=document.createElement("summary");
  summary.textContent=titulo;
  const body=document.createElement("div");
  tablas.forEach(function(el){body.appendChild(el);});
  details.appendChild(summary);
  details.appendChild(body);
  card.appendChild(details);
}

function corregirModuloControl(root){
  const card=root.querySelector('[data-zx-dev-section="modules"]');
  if(!card) return;
  card.querySelectorAll("tr").forEach(function(tr){
    const celdas=tr.querySelectorAll("td");
    if(celdas.length<3) return;
    if((celdas[0].textContent||"").trim()!=="control_fichajes") return;
    celdas[2].innerHTML='<span style="color:#64748b;font-weight:950">Desactivado</span>';
    if(!tr.nextElementSibling || !tr.nextElementSibling.classList.contains("zx_dev_control_note")){
      const nota=document.createElement("tr");
      nota.className="zx_dev_control_note";
      nota.innerHTML='<td colspan="3"><div class="zx_dev_note">Desactivado de forma intencionada: es una copia antigua que interfería con Fichaje.</div></td>';
      tr.insertAdjacentElement("afterend",nota);
    }
  });
}

function mejorarPanel(){
  const root=document.getElementById("app");
  if(!root || !root.querySelector(".zx_dev_grid")) return;
  marcarSecciones(root);

  const cacheInfo=contarCache();
  const queue=colaPendiente();

  const cacheCard=root.querySelector('[data-zx-dev-section="cache"]');
  if(cacheCard){
    resumenCard(cacheCard,[
      {valor:String(cacheInfo.claves),etiqueta:"Claves de caché"},
      {valor:String(cacheInfo.kb)+" KB",etiqueta:"Tamaño aproximado"}
    ]);
    hacerDesplegable(cacheCard,"Mostrar claves de caché");
  }

  const queueCard=root.querySelector('[data-zx-dev-section="queue"]');
  if(queueCard){
    const tipos={insert:0,update:0,delete:0,otros:0};
    queue.forEach(function(x){
      const op=String(x.action||x.operacion||"").toLowerCase();
      if(op.includes("insert")) tipos.insert++;
      else if(op.includes("update")) tipos.update++;
      else if(op.includes("delete")) tipos.delete++;
      else tipos.otros++;
    });
    resumenCard(queueCard,[
      {valor:String(queue.length),etiqueta:"Operaciones pendientes"},
      {valor:String(tipos.insert),etiqueta:"Inserciones"},
      {valor:String(tipos.update),etiqueta:"Actualizaciones"},
      {valor:String(tipos.delete+tipos.otros),etiqueta:"Otras operaciones"}
    ]);
    hacerDesplegable(queueCard,"Mostrar operaciones pendientes");
  }

  const localCard=root.querySelector('[data-zx-dev-section="localstorage"]');
  if(localCard) hacerDesplegable(localCard,"Mostrar claves locales");

  corregirModuloControl(root);
}

function envolverRender(){
  if(typeof window.ZX_desarrollador!=="function" || window.ZX_desarrollador.__zxPatched) return;
  const original=window.ZX_desarrollador;
  const wrapped=function(){
    const r=original.apply(this,arguments);
    setTimeout(mejorarPanel,0);
    setTimeout(mejorarPanel,120);
    return r;
  };
  wrapped.__zxPatched=true;
  window.ZX_desarrollador=wrapped;
  window.ZENTRYX=window.ZENTRYX||{};
  window.ZENTRYX.desarrollador=wrapped;
}

instalarCSS();
const eliminadas=limpiarCacheVersionadaAntigua();
if(eliminadas) console.log("Zentryx Dev Patch: cachés antiguas eliminadas:",eliminadas);
envolverRender();

document.addEventListener("DOMContentLoaded",function(){
  instalarCSS();
  envolverRender();
  setTimeout(mejorarPanel,300);
},{once:true});

console.log("Zentryx desarrollador_patch.js V"+PATCH_VERSION+" cargado");
})();
