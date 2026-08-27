// ===============================
// ZENTRYX PRO - LABORAL CORE V1003
// Configuración base de empresa, calendario laboral y festivos aplicables.
// ===============================
(function(){
"use strict";

const VERSION="1003";
const EMPRESA_TABLE="config_empresa";
const FESTIVOS_TABLE="festivos";
const HORARIOS_TABLE="horarios_usuario";
const GEO_CACHE_KEY="zentryx_geo_cache_v1";
const PAISES_ISO={"espana":"ES","portugal":"PT","francia":"FR","italia":"IT","alemania":"DE","andorra":"AD","reino unido":"GB","irlanda":"IE","belgica":"BE","paises bajos":"NL","suiza":"CH"};

function sb(){return window.sb || window.supabaseClient || null}
function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}
}
function empresaId(){
  const s=sesion();
  return String(s.empresa_id || "demo").trim() || "demo";
}
function normalizar(v){
  return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}
function isoFecha(v){
  if(!v) return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d=new Date(v);
  if(isNaN(d.getTime())) return "";
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function fechaEntre(fecha,desde,hasta){return fecha>=desde && fecha<=hasta}
function clonar(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}

const PROVINCIAS_POR_COMUNIDAD={
  "Andalucía":["Almería","Cádiz","Córdoba","Granada","Huelva","Jaén","Málaga","Sevilla"],
  "Aragón":["Huesca","Teruel","Zaragoza"],
  "Asturias":["Asturias"],
  "Baleares":["Baleares"],
  "Canarias":["Las Palmas","Santa Cruz de Tenerife"],
  "Cantabria":["Cantabria"],
  "Castilla-La Mancha":["Albacete","Ciudad Real","Cuenca","Guadalajara","Toledo"],
  "Castilla y León":["Ávila","Burgos","León","Palencia","Salamanca","Segovia","Soria","Valladolid","Zamora"],
  "Cataluña":["Barcelona","Girona","Lleida","Tarragona"],
  "Comunidad Valenciana":["Alicante","Castellón","Valencia"],
  "Extremadura":["Badajoz","Cáceres"],
  "Galicia":["A Coruña","Lugo","Ourense","Pontevedra"],
  "La Rioja":["La Rioja"],
  "Madrid":["Madrid"],
  "Murcia":["Murcia"],
  "Navarra":["Navarra"],
  "País Vasco":["Álava","Bizkaia","Gipuzkoa"],
  "Ceuta":["Ceuta"],
  "Melilla":["Melilla"]
};
const COMUNIDADES=Object.keys(PROVINCIAS_POR_COMUNIDAD);
const PROVINCIAS=Object.values(PROVINCIAS_POR_COMUNIDAD).flat();
const LOCALIDADES_FALLBACK={
  "Madrid":["Madrid","Alcalá de Henares","Pozuelo del Rey","Torrejón de Ardoz","Coslada","San Fernando de Henares","Mejorada del Campo","Loeches","Arganda del Rey","Campo Real","Nuevo Baztán","Valverde de Alcalá","Villalbilla","Meco","Camarma de Esteruelas","Torres de la Alameda"],
  "Badajoz":["Badajoz","Mérida","Don Benito","Villanueva de la Serena","Almendralejo","Zafra"],
  "Cáceres":["Cáceres","Plasencia","Navalmoral de la Mata","Coria","Trujillo","Miajadas"]
};

function comunidadDeProvincia(provincia){
  const p=normalizar(provincia);
  for(const [com,lista] of Object.entries(PROVINCIAS_POR_COMUNIDAD)){
    if(lista.some(x=>normalizar(x)===p)) return com;
  }
  return "";
}

const MADRID_2026_BASE=[
  ["2026-01-01","Año Nuevo","nacional"],
  ["2026-01-06","Epifanía del Señor","nacional"],
  ["2026-04-02","Jueves Santo","nacional"],
  ["2026-04-03","Viernes Santo","nacional"],
  ["2026-05-01","Fiesta del Trabajo","nacional"],
  ["2026-05-02","Fiesta de la Comunidad de Madrid","autonomico"],
  ["2026-08-15","Asunción de la Virgen","nacional"],
  ["2026-10-12","Fiesta Nacional de España","nacional"],
  ["2026-11-02","Traslado de Todos los Santos","nacional"],
  ["2026-12-07","Traslado del Día de la Constitución Española","nacional"],
  ["2026-12-08","Inmaculada Concepción","nacional"],
  ["2026-12-25","Natividad del Señor","nacional"]
];

const MADRID_2026_LOCALES={
  "alcala de henares":["2026-08-06","2026-10-09"],
  "madrid":["2026-05-15","2026-11-09"],
  "pozuelo del rey":["2026-05-15","2026-09-28"],
  "torrejon de ardoz":["2026-06-22","2026-06-23"],
  "coslada":["2026-05-15","2026-06-15"],
  "san fernando de henares":["2026-05-15","2026-05-29"],
  "mejorada del campo":["2026-09-21","2026-09-22"],
  "loeches":["2026-09-10","2026-09-11"],
  "arganda del rey":["2026-09-11","2026-09-14"],
  "campo real":["2026-05-15","2026-09-14"],
  "nuevo baztan":["2026-05-11","2026-12-03"],
  "valverde de alcala":["2026-05-15","2026-09-04"],
  "villalbilla":["2026-05-04","2026-09-25"]
};

const FUENTE_BOE_2026={
  nombre:"BOE · Calendario laboral 2026",
  url:"https://www.boe.es/eli/es/res/2025/10/17/(2)",
  comprobado_en:"2026-08-27"
};

const FUENTE_MADRID_2026={
  nombre:"Comunidad de Madrid · Calendario laboral 2026",
  url:"https://www.comunidad.madrid/empleo/calendario-laboral-comunidad-madrid-municipios",
  comprobado_en:"2026-08-27"
};

function baseLaboral(){
  return {
    version:1,
    lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,horas_semana:40,
    convenio:"Metal",vacaciones:30,asuntos_horas:16,
    precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,
    regla_festivo_nocturno:"festivo",
    pais:"España",pais_codigo:"ES",comunidad:"Madrid",provincia:"Madrid",localidad:"",anio:new Date().getFullYear(),
    fuente_festivos:"oficial_verificada"
  };
}
function unirLaboral(base,data){return Object.assign({},base||{},data&&typeof data==="object"?data:{})}

async function horarioUsuario(usuarioId){
  const cliente=sb(); if(!cliente || !usuarioId) return null;
  try{
    let r=await cliente.from(HORARIOS_TABLE).select("*").eq("usuario_id",String(usuarioId)).eq("activo",true).order("actualizado_en",{ascending:false}).limit(1);
    if(!r.error && r.data && r.data.length) return r.data[0];
  }catch(e){}
  try{
    const r=await cliente.from(HORARIOS_TABLE).select("*").eq("usuario_id",String(usuarioId)).eq("activo",true).limit(1);
    if(!r.error && r.data && r.data.length) return r.data[0];
  }catch(e){}
  return null;
}

function baseDesdeHorario(h){
  if(!h) return baseLaboral();
  return unirLaboral(baseLaboral(),{
    lunes:Number(h.lunes??480),martes:Number(h.martes??480),miercoles:Number(h.miercoles??480),jueves:Number(h.jueves??480),viernes:Number(h.viernes??480),sabado:Number(h.sabado??0),domingo:Number(h.domingo??0),horas_semana:Number(h.horas_semana??0),
    convenio:h.convenio||"Metal",vacaciones:Number(h.vacaciones??30),asuntos_horas:Number(h.asuntos_horas??h.asuntos??16),
    precio_hora:Number(h.precio_hora??0),precio_extra:Number(h.precio_extra??0),precio_extra_nocturna:Number(h.precio_extra_nocturna??0),precio_extra_festiva:Number(h.precio_extra_festiva??0),
    pais:h.pais||"España",pais_codigo:normalizar(h.pais)==="espana"?"ES":"",comunidad:h.comunidad||comunidadDeProvincia(h.provincia)||"Madrid",provincia:h.provincia||"",localidad:h.localidad||"",anio:Number(h.anio||new Date().getFullYear())
  });
}

async function cargarBaseEmpresa(){
  const cliente=sb();
  const fallback=baseDesdeHorario(await horarioUsuario(sesion().id));
  if(!cliente || navigator.onLine===false) return fallback;
  try{
    const r=await cliente.from(EMPRESA_TABLE).select("empresa_id,laboral").eq("empresa_id",empresaId()).maybeSingle();
    if(!r.error && r.data && r.data.laboral && typeof r.data.laboral==="object"){
      return unirLaboral(fallback,r.data.laboral);
    }
  }catch(e){}
  return fallback;
}

async function guardarBaseEmpresa(data){
  const cliente=sb();
  if(!cliente) return {error:new Error("Sin conexión con la base de datos")};
  const s=sesion();
  const fila={empresa_id:empresaId(),laboral:unirLaboral(baseLaboral(),data),updated_at:new Date().toISOString(),updated_by:s.usuario||s.id||""};
  try{return await cliente.from(EMPRESA_TABLE).upsert([fila],{onConflict:"empresa_id"})}catch(e){return {error:e}}
}

async function resolverUsuario(usuarioId){
  const [base,h]=await Promise.all([cargarBaseEmpresa(),horarioUsuario(usuarioId)]);
  if(!h) return clonar(base);
  // Las filas actuales de horarios_usuario son excepciones personales. Los campos vacíos heredan la base.
  const out=clonar(base);
  ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>{if(h[k]!==null && h[k]!==undefined) out[k]=Number(h[k])});
  if(h.convenio) out.convenio=h.convenio;
  if(h.vacaciones!==null && h.vacaciones!==undefined) out.vacaciones=Number(h.vacaciones);
  if((h.asuntos_horas??h.asuntos)!==null && (h.asuntos_horas??h.asuntos)!==undefined) out.asuntos_horas=Number(h.asuntos_horas??h.asuntos);
  ["precio_hora","precio_extra","precio_extra_nocturna","precio_extra_festiva"].forEach(k=>{if(h[k]!==null && h[k]!==undefined) out[k]=Number(h[k])});
  if(h.pais) out.pais=h.pais;
  if(h.comunidad) out.comunidad=h.comunidad;
  if(h.provincia) out.provincia=h.provincia;
  if(h.localidad) out.localidad=h.localidad;
  if(!Number(out.horas_semana)) out.horas_semana=["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,k)=>n+Number(out[k]||0),0)/60;
  return out;
}

function ambitoFestivo(f){return normalizar(f?.ambito || f?.tipo || (f?.origen==="empresa"?"empresa":"nacional"))}
function aplicaFestivo(f,cfg){
  const amb=ambitoFestivo(f);
  const pais=normalizar(f.pais||"");
  if(pais && pais!==normalizar(cfg.pais||"")) return false;
  if(amb==="nacional") return true;
  if(amb==="autonomico") return !!f.comunidad && normalizar(f.comunidad)===normalizar(cfg.comunidad);
  if(amb==="provincial") return !!f.provincia && normalizar(f.provincia)===normalizar(cfg.provincia);
  if(amb==="local") return !!f.localidad && normalizar(f.localidad)===normalizar(cfg.localidad);
  if(amb==="empresa"){
    if(f.localidad && normalizar(f.localidad)!==normalizar(cfg.localidad)) return false;
    if(f.provincia && normalizar(f.provincia)!==normalizar(cfg.provincia)) return false;
    if(f.comunidad && normalizar(f.comunidad)!==normalizar(cfg.comunidad)) return false;
    return true;
  }
  return false;
}

async function leerFestivosAnio(anio){
  const cliente=sb(); if(!cliente) return [];
  try{
    let q=cliente.from(FESTIVOS_TABLE).select("*").eq("anio",Number(anio)).order("fecha",{ascending:true});
    const r=await q;
    if(r.error) return [];
    const eid=empresaId();
    return (r.data||[]).filter(f=>!f.empresa_id || String(f.empresa_id)===eid);
  }catch(e){return []}
}

async function festivosAplicables(anio,cfg){
  const lista=await leerFestivosAnio(anio);
  return lista.filter(f=>aplicaFestivo(f,cfg));
}

async function festivosUsuarioEnFecha(fecha,usuarioId){
  const f=isoFecha(fecha); if(!f) return {es:false,festivos:[]};
  const cfg=await resolverUsuario(usuarioId||sesion().id);
  const lista=(await festivosAplicables(Number(f.slice(0,4)),cfg)).filter(x=>isoFecha(x.fecha)===f);
  const orden={empresa:5,local:4,provincial:3,autonomico:2,nacional:1};
  lista.sort((a,b)=>(orden[ambitoFestivo(b)]||0)-(orden[ambitoFestivo(a)]||0));
  return {es:lista.length>0,festivos:lista,principal:lista[0]||null,cfg};
}

function oficialMadrid2026(cfg){
  if(normalizar(cfg.pais)!=="espana" || normalizar(cfg.comunidad)!=="madrid" || Number(cfg.anio)!==2026) return null;
  const out=MADRID_2026_BASE.map(([fecha,nombre,ambito])=>{
    const fuente=ambito==="nacional"?FUENTE_BOE_2026:FUENTE_MADRID_2026;
    return {
      fecha,nombre,pais:"España",tipo:ambito,ambito,comunidad:ambito==="autonomico"?"Madrid":"",provincia:"",localidad:"",anio:2026,
      origen:"oficial",fuente:fuente.nombre,fuente_url:fuente.url,verificado:true,computa_extra:true
    };
  });
  const loc=MADRID_2026_LOCALES[normalizar(cfg.localidad)];
  if(loc){
    loc.forEach(fecha=>out.push({
      fecha,nombre:"Fiesta local · "+cfg.localidad,pais:"España",tipo:"local",ambito:"local",comunidad:"Madrid",provincia:cfg.provincia||"Madrid",localidad:cfg.localidad,anio:2026,
      origen:"oficial",fuente:FUENTE_MADRID_2026.nombre,fuente_url:FUENTE_MADRID_2026.url,verificado:true,computa_extra:true
    }));
  }
  return {festivos:out,localesDisponibles:!!loc,fuente:FUENTE_MADRID_2026};
}

async function guardarFestivosOficiales(cfg){
  const cliente=sb(); if(!cliente) return {ok:false,mensaje:"Sin conexión con la base de datos."};
  const paquete=oficialMadrid2026(cfg);
  if(!paquete){
    return {ok:false,mensaje:"Todavía no hay un paquete oficial verificado para esa ubicación y año. No se cargarán datos aproximados como si fueran oficiales."};
  }
  const eid=empresaId();
  const filas=paquete.festivos.map(f=>Object.assign({},f,{empresa_id:eid,updated_at:new Date().toISOString(),created_by:sesion().usuario||sesion().id||""}));
  try{
    const existentes=await cliente.from(FESTIVOS_TABLE).select("id,empresa_id,anio,origen,tipo,ambito,localidad").eq("anio",Number(cfg.anio));
    if(existentes.error) return {ok:false,mensaje:existentes.error.message};
    const ids=(existentes.data||[]).filter(f=>
      (!f.empresa_id || String(f.empresa_id)===eid) && ["oficial","legacy_oficial"].includes(String(f.origen||""))
    ).map(f=>f.id).filter(Boolean);
    if(ids.length){
      const del=await cliente.from(FESTIVOS_TABLE).delete().in("id",ids);
      if(del.error) return {ok:false,mensaje:del.error.message};
    }
    const ins=await cliente.from(FESTIVOS_TABLE).insert(filas);
    if(ins.error) return {ok:false,mensaje:ins.error.message};
    return {ok:true,cantidad:filas.length,localesDisponibles:paquete.localesDisponibles,fuente:paquete.fuente};
  }catch(e){return {ok:false,mensaje:e.message||"Error guardando festivos."}}
}

async function eventosFestivosRango(desde,hasta,usuarioId){
  const cfg=await resolverUsuario(usuarioId||sesion().id);
  const años=[];
  for(let y=Number(desde.slice(0,4));y<=Number(hasta.slice(0,4));y++) años.push(y);
  const listas=await Promise.all(años.map(y=>festivosAplicables(y,cfg)));
  const mapa=new Map();
  listas.flat().forEach(f=>{
    const fecha=isoFecha(f.fecha); if(!fecha || !fechaEntre(fecha,desde,hasta)) return;
    const k=fecha+"|"+ambitoFestivo(f)+"|"+normalizar(f.nombre);
    if(mapa.has(k)) return;
    mapa.set(k,{
      id:"festivo:"+(f.id||k),tipo:"festivo",origen:"festivos",origen_id:String(f.id||k),titulo:f.nombre||"Festivo",descripcion:"Festivo "+ambitoFestivo(f),estado:"activo",
      fecha_inicio:fecha,fecha_fin:fecha,hora_inicio:"",hora_fin:"",festivo_ambito:ambitoFestivo(f),festivo_verificado:!!f.verificado,festivo_computa_extra:f.computa_extra!==false
    });
  });
  return Array.from(mapa.values());
}

async function avisosPlanificacion(jornadas,equipo){
  const lista=[];
  const miembros=Array.isArray(equipo)?equipo:[];
  for(const j of (jornadas||[])){
    if(!j.fecha) continue;
    for(const u of miembros){
      const r=await festivosUsuarioEnFecha(j.fecha,u.id);
      if(r.es){
        const nombres=r.festivos.map(f=>f.nombre||"Festivo").join(" + ");
        lista.push({fecha:j.fecha,usuario_id:u.id,usuario:u.nombre||u.usuario||"Usuario",nombres,festivos:r.festivos});
      }
    }
  }
  return lista;
}

function leerGeoCache(){try{return JSON.parse(localStorage.getItem(GEO_CACHE_KEY)||"[]")}catch(e){return []}}
function guardarGeoCache(lista){try{localStorage.setItem(GEO_CACHE_KEY,JSON.stringify((lista||[]).slice(0,80)))}catch(e){}}

async function buscarLocalidades(texto,paisCodigo="ES"){
  const q=String(texto||"").trim();
  const local=[];
  Object.entries(LOCALIDADES_FALLBACK).forEach(([prov,lista])=>lista.forEach(nombre=>{
    if(normalizar(nombre).includes(normalizar(q))) local.push({nombre,provincia:prov,comunidad:comunidadDeProvincia(prov),pais:"España",pais_codigo:"ES",origen:"local"});
  }));
  if(q.length<3 || navigator.onLine===false) return local.slice(0,10);
  try{
    const url="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes="+encodeURIComponent(String(paisCodigo||"ES").toLowerCase())+"&q="+encodeURIComponent(q);
    const r=await fetch(url,{headers:{"Accept-Language":"es"}});
    const data=await r.json();
    const rem=(Array.isArray(data)?data:[]).map(x=>{
      const a=x.address||{};
      const nombre=a.city||a.town||a.village||a.municipality||a.hamlet||String(x.display_name||"").split(",")[0];
      const provincia=a.province||a.county||a.state_district||"";
      const comunidad=a.state||comunidadDeProvincia(provincia)||"";
      return {nombre,provincia,comunidad,pais:a.country||"España",pais_codigo:String(a.country_code||paisCodigo||"ES").toUpperCase(),origen:"nominatim"};
    }).filter(x=>x.nombre);
    const combinado=[...local,...rem];
    const unicos=[]; const seen=new Set();
    combinado.forEach(x=>{const k=normalizar(x.nombre)+"|"+normalizar(x.provincia);if(!seen.has(k)){seen.add(k);unicos.push(x)}});
    guardarGeoCache([...unicos,...leerGeoCache()]);
    return unicos.slice(0,12);
  }catch(e){
    return [...local,...leerGeoCache().filter(x=>normalizar(x.nombre).includes(normalizar(q)))].slice(0,10);
  }
}

window.ZENTRYX_LABORAL={
  version:VERSION,empresaId,baseLaboral,cargarBaseEmpresa,guardarBaseEmpresa,horarioUsuario,resolverUsuario,
  festivosAplicables,festivosUsuarioEnFecha,eventosFestivosRango,avisosPlanificacion,guardarFestivosOficiales,oficialMadrid2026,
  ambitoFestivo,aplicaFestivo,comunidadDeProvincia,buscarLocalidades,
  geo:{comunidades:COMUNIDADES,provincias:PROVINCIAS,provinciasPorComunidad:PROVINCIAS_POR_COMUNIDAD,localidadesFallback:LOCALIDADES_FALLBACK}
};
console.log("ZENTRYX laboral_core.js V"+VERSION+" cargado");
})();
