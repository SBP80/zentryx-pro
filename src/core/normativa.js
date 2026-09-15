// ===============================
// ZENTRYX PRO - NORMATIVA V1001
// Catálogo central de reglas normativas y control de revisiones.
// Una actualización que cambie criterios de cálculo DEBE cambiar el ruleset.
// Los proyectos guardados conservan el ruleset con el que fueron calculados.
// ===============================
(function(){
"use strict";

const VERSION="1001";

const CATALOGO={
  extraccion:{
    clave:"extraccion",
    ruleset:"ES-CTE-HS3-RD450-2022_EXTRACCION",
    verificado_el:"2026-09-06",
    ambito:"España",
    cte:{nombre:"CTE · DB HS 3 Calidad del aire interior",consolidado:"RD 450/2022",ref:"HS 3 · apartados 2 y 4"},
    rite:{nombre:"RITE · IT 1.1.4.2.5 Aire de extracción",consolidado:"texto consolidado BOE",ref:"IT 1.1.4.2.5"}
  },
  fontaneria:{
    clave:"fontaneria",
    ruleset:"ES-CTE-HS4-SUMINISTRO-AGUA",
    verificado_el:"2026-09-09",
    ambito:"España",
    cte:{nombre:"CTE · DB HS 4 Suministro de agua",ref_caudales:"HS 4 · tabla 2.1",ref_dimensionado:"HS 4 · apartados 4.2 y 4.3"}
  },
  saneamiento:{
    clave:"saneamiento",
    ruleset:"ES-CTE-HS5-EVACUACION-AGUAS",
    verificado_el:"2026-09-12",
    ambito:"España",
    cte:{nombre:"CTE · DB HS 5 Evacuación de aguas",ref:"HS 5 · tablas 4.1, 4.3 y 4.5 · apartados 3.3.3.1 a 3.3.3.4, 4.1.1 y 4.1.3"}
  },
  acs_sanitaria:{
    clave:"acs_sanitaria",
    ruleset:"ES-RD487-ACS",
    verificado_el:"2026-09-10",
    ambito:"España",
    norma:"RD 487/2022 modificado por RD 614/2024"
  }
};

function copiar(v){
  try{return JSON.parse(JSON.stringify(v))}catch(e){return v&&typeof v==="object"?Object.assign({},v):v}
}

function actual(clave){
  const x=CATALOGO[String(clave||"")];
  return x?copiar(x):null;
}

function comparar(clave,guardada){
  const cur=CATALOGO[String(clave||"")];
  if(!cur)return {estado:"sin_catalogo",requiere_revision:false,actual:null,guardada:guardada||null};
  const g=guardada&&typeof guardada==="object"&&!Array.isArray(guardada)?guardada:null;
  if(!g||!g.ruleset)return {estado:"sin_version_guardada",requiere_revision:true,actual:copiar(cur),guardada:g};
  if(String(g.ruleset)!==String(cur.ruleset))return {estado:"actualizacion_disponible",requiere_revision:true,actual:copiar(cur),guardada:copiar(g)};
  return {estado:"actual",requiere_revision:false,actual:copiar(cur),guardada:copiar(g)};
}

function snapshot(clave,extra){
  const cur=actual(clave)||{};
  const out={
    ruleset:cur.ruleset||null,
    verificado_el:cur.verificado_el||null,
    catalogo_version:VERSION
  };
  ["cte","rite","norma","ambito"].forEach(k=>{if(cur[k]!=null)out[k]=copiar(cur[k])});
  return Object.assign(out,extra&&typeof extra==="object"?copiar(extra):{});
}

function resumenComparacion(clave,guardada){
  const c=comparar(clave,guardada);
  if(c.estado==="actual")return "Normativa actual";
  if(c.estado==="actualizacion_disponible")return "Revisión normativa disponible";
  if(c.estado==="sin_version_guardada")return "Normativa sin versión registrada";
  return "Normativa sin catálogo";
}

window.ZENTRYX_NORMATIVA={
  version:VERSION,
  catalogo:copiar(CATALOGO),
  actual,
  comparar,
  snapshot,
  resumenComparacion,
  politica_actualizacion:{
    recalculo_automatico:false,
    conserva_historico:true,
    regla:"Cuando cambie un criterio de cálculo debe publicarse un ruleset nuevo. Los proyectos existentes no se recalculan ni se sobrescriben automáticamente; se marcan para revisión y la nueva versión se registra solo al guardar tras revisarlos."
  }
};
window.ZENTRYX_MODULE_VERSIONS=window.ZENTRYX_MODULE_VERSIONS||{};
window.ZENTRYX_MODULE_VERSIONS.normativa=VERSION;
console.log("ZENTRYX normativa.js V"+VERSION+" cargado");
})();
