// ZENTRYX PRO - desarrollador_salud.js
// V1001 - SALUD DEL SISTEMA, DIAGNÓSTICO DE COLA Y SQL ORIENTATIVO
(function(){
"use strict";

const VERSION="1001";
const QUEUE_KEY="zentryx_backend_queue";

function esc(v){
  return String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function cola(){
  try{
    const x=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");
    return Array.isArray(x)?x:[];
  }catch(e){return []}
}

function diagnosticar(){
  const lista=cola();
  const pendientes=lista.filter(x=>x&&(x.status||"pending")==="pending");
  const errores={gps:0,materiales:0,otros:0};
  const tablas={};

  pendientes.forEach(function(x){
    const t=String(x.table||"desconocida");
    const e=String(x.error||"").toLowerCase();
    tablas[t]=(tablas[t]||0)+1;

    if(t==="rutas_vehiculos_puntos" || e.includes("origen_check")) errores.gps++;
    else if(t==="trabajos_materiales" || e.includes("schema cache")) errores.materiales++;
    else errores.otros++;
  });

  const backend=window.ZENTRYX_BACKEND;
  const estado=backend&&typeof backend.status==="function"?backend.status():{};
  const red=navigator.onLine!==false;
  const salud=!red?"Sin conexión":pendientes.length===0?"Correcto":pendientes.length<=2?"Revisión menor":"Atención";

  return {lista,pendientes,errores,tablas,estado,red,salud};
}

function sqlOrientativo(d){
  const bloques=[];

  if(d.errores.gps){
    bloques.push(
`-- Revisar los valores permitidos del campo origen
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.rutas_vehiculos_puntos'::regclass
  and conname = 'rutas_vehiculos_puntos_origen_check';`
    );
  }

  if(d.errores.materiales){
    bloques.push(
`-- Revisar columnas reales de trabajos_materiales
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'trabajos_materiales'
order by ordinal_position;`
    );
  }

  return bloques.join("\n\n");
}

function crearCard(d){
  const card=document.createElement("section");
  card.className="zx_dev_card";
  card.dataset.zxDevSection="salud";
  const tablas=Object.entries(d.tablas)
    .map(([k,v])=>`<li><b>${esc(k)}</b>: ${v}</li>`).join("");

  const color=d.salud==="Correcto"?"#16a34a":d.salud==="Revisión menor"?"#d97706":"#dc2626";
  const sql=sqlOrientativo(d);

  card.innerHTML=`
    <h2>Salud del sistema</h2>
    <div class="zx_dev_health_grid">
      <div><b style="color:${color}">${esc(d.salud)}</b><span>Estado general</span></div>
      <div><b>${d.pendientes.length}</b><span>Operaciones pendientes</span></div>
      <div><b>${d.errores.gps}</b><span>Errores GPS</span></div>
      <div><b>${d.errores.materiales}</b><span>Errores de materiales</span></div>
    </div>
    ${tablas?`<details class="zx_dev_details"><summary>Ver tablas afectadas</summary><div><ul>${tablas}</ul></div></details>`:""}
    ${sql?`<details class="zx_dev_details"><summary>Ver SQL de comprobación</summary><div><pre class="zx_dev_sql">${esc(sql)}</pre><button type="button" class="zx_dev_copy_sql">Copiar SQL</button></div></details>`:""}
    <div class="zx_dev_note">
      El panel no modifica la estructura de Supabase. El SQL mostrado sirve para comprobar el esquema antes de hacer cambios.
    </div>
  `;

  const btn=card.querySelector(".zx_dev_copy_sql");
  if(btn){
    btn.addEventListener("click",async function(){
      try{
        await navigator.clipboard.writeText(sql);
        alert("SQL copiado.");
      }catch(e){
        prompt("Copia este SQL:",sql);
      }
    });
  }

  return card;
}

function css(){
  if(document.getElementById("zx_dev_salud_css")) return;
  const s=document.createElement("style");
  s.id="zx_dev_salud_css";
  s.textContent=`
    .zx_dev_health_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .zx_dev_health_grid>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px;min-width:0}
    .zx_dev_health_grid b{display:block;font-size:24px;font-weight:950;color:#071330;overflow-wrap:anywhere}
    .zx_dev_health_grid span{display:block;margin-top:5px;color:#64748b;font-size:12px;font-weight:900}
    .zx_dev_sql{white-space:pre-wrap;overflow-wrap:anywhere;background:#0f172a;color:#f8fafc;padding:12px;border-radius:12px;font-size:12px;line-height:1.45}
    .zx_dev_copy_sql{width:100%;border:0;border-radius:12px;padding:12px;margin-top:10px;background:#2563eb;color:white;font-weight:900}
  `;
  document.head.appendChild(s);
}

function mejorar(){
  const root=document.getElementById("app");
  if(!root || !root.querySelector(".zx_dev_grid")) return;

  root.querySelectorAll('[data-zx-dev-section="salud"]').forEach(x=>x.remove());
  const card=crearCard(diagnosticar());
  const grid=root.querySelector(".zx_dev_grid");
  grid.insertBefore(card,grid.firstChild);
}

function envolver(){
  if(typeof window.ZX_desarrollador!=="function" || window.ZX_desarrollador.__zxSalud) return;
  const original=window.ZX_desarrollador;
  const nueva=function(){
    const r=original.apply(this,arguments);
    setTimeout(mejorar,0);
    setTimeout(mejorar,180);
    return r;
  };
  nueva.__zxSalud=true;
  window.ZX_desarrollador=nueva;
  window.ZENTRYX=window.ZENTRYX||{};
  window.ZENTRYX.desarrollador=nueva;
}

css();
envolver();
document.addEventListener("DOMContentLoaded",function(){
  css();
  envolver();
  setTimeout(mejorar,400);
},{once:true});
window.addEventListener("zentryx:backend",function(){setTimeout(mejorar,50)});

console.log("Zentryx desarrollador_salud.js V"+VERSION+" cargado");
})();