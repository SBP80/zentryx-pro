// ===============================
// ZENTRYX PRO - LABORAL CORE V1008
// Configuración base de empresa, calendario laboral y festivos aplicables.
// ===============================
(function(){
"use strict";

const VERSION="1008";
const EMPRESA_TABLE="config_empresa";
const FESTIVOS_TABLE="festivos";
const HORARIOS_TABLE="horarios_usuario";
const GEO_CACHE_KEY="zentryx_geo_cache_v1";
const EMPRESA_CACHE_PREFIX="zentryx_laboral_empresa_cache_v1:";
const USUARIO_CACHE_PREFIX="zentryx_laboral_usuario_cache_v1:";
const FESTIVOS_CACHE_PREFIX="zentryx_laboral_festivos_cache_v1:";
const PAISES_ISO={"espana":"ES","portugal":"PT","francia":"FR","italia":"IT","alemania":"DE","andorra":"AD","reino unido":"GB","irlanda":"IE","belgica":"BE","paises bajos":"NL","suiza":"CH"};

function sb(){return window.sb || window.supabaseClient || null}
function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}
}
function empresaId(){
  const s=sesion();
  return String(s.empresa_id || "demo").trim() || "demo";
}
function sinConexion(){
  return typeof navigator!=="undefined" && navigator.onLine===false;
}
function leerCache(key){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){return null}
}
function guardarCache(key,data){
  try{
    localStorage.setItem(key,JSON.stringify({saved_at:new Date().toISOString(),data:data}));
    return true;
  }catch(e){return false}
}
function borrarCache(key){try{localStorage.removeItem(key)}catch(e){}}
function cacheEmpresaKey(){return EMPRESA_CACHE_PREFIX+empresaId()}
function cacheUsuarioKey(usuarioId){return USUARIO_CACHE_PREFIX+empresaId()+":"+String(usuarioId || "")}
function cacheFestivosKey(anio){return FESTIVOS_CACHE_PREFIX+empresaId()+":"+String(Number(anio) || "")}
function datoCache(key){
  const c=leerCache(key);
  return c && Object.prototype.hasOwnProperty.call(c,"data") ? c.data : undefined;
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
    version:2,
    lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,horas_semana:40,
    convenio:"Metal",convenio_referencia:"",convenio_vigencia_desde:"",convenio_vigencia_hasta:"",
    convenio_verificado:false,convenio_fuente_url:"",convenio_documento_url:"",convenio_documento_nombre:"",convenio_documento_path:"",convenio_documento_origen:"",convenio_publicacion_url:"",convenio_ambito:"",convenio_autoridad_laboral:"",
    convenios:[],
    vacaciones:30,vacaciones_tipo:"naturales",asuntos_horas:16,
    precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,
    regla_festivo_nocturno:"festivo",
    pais:"España",pais_codigo:"ES",comunidad:"Madrid",provincia:"Madrid",localidad:"",anio:new Date().getFullYear(),
    fuente_festivos:"oficial_verificada"
  };
}
function unirLaboral(base,data){return Object.assign({},base||{},data&&typeof data==="object"?data:{})}

function idConvenio(v){
  return normalizar(v).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "convenio";
}
function normalizarConvenio(c,idx=0){
  const x=objetoLaboral(c);
  const nombre=String(x.nombre ?? x.convenio ?? "").trim();
  if(!nombre) return null;
  return {
    id:String(x.id || (idConvenio(nombre)+"-"+String(idx+1))).trim(),
    nombre,
    referencia:String(x.referencia ?? x.convenio_referencia ?? "").trim(),
    vigencia_desde:String(x.vigencia_desde ?? x.convenio_vigencia_desde ?? "").slice(0,10),
    vigencia_hasta:String(x.vigencia_hasta ?? x.convenio_vigencia_hasta ?? "").slice(0,10),
    verificado:x.verificado===true || x.convenio_verificado===true,
    fuente_url:String(x.fuente_url ?? x.regcon_url ?? x.convenio_fuente_url ?? "").trim(),
    documento_url:String(x.documento_url ?? x.pdf_url ?? x.convenio_documento_url ?? "").trim(),
    documento_nombre:String(x.documento_nombre ?? x.convenio_documento_nombre ?? "").trim(),
    documento_path:String(x.documento_path ?? x.convenio_documento_path ?? "").trim(),
    documento_origen:String(x.documento_origen ?? x.convenio_documento_origen ?? "").trim(),
    publicacion_url:String(x.publicacion_url ?? x.convenio_publicacion_url ?? "").trim(),
    ambito:String(x.ambito ?? x.convenio_ambito ?? "").trim(),
    autoridad_laboral:String(x.autoridad_laboral ?? x.convenio_autoridad_laboral ?? "").trim(),
    vacaciones:numeroLaboral(x.vacaciones,30),
    vacaciones_tipo:String(x.vacaciones_tipo || "naturales")==="laborables" ? "laborables" : "naturales",
    asuntos_horas:numeroLaboral(x.asuntos_horas,0)
  };
}
function normalizarConvenios(cfg){
  const c=objetoLaboral(cfg);
  const raw=Array.isArray(c.convenios) ? c.convenios : [];
  const lista=raw.map((x,i)=>normalizarConvenio(x,i)).filter(Boolean);
  if(!lista.length && String(c.convenio||"").trim()){
    const migrado=normalizarConvenio({
      id:"principal",nombre:c.convenio,referencia:c.convenio_referencia,
      vigencia_desde:c.convenio_vigencia_desde,vigencia_hasta:c.convenio_vigencia_hasta,
      verificado:c.convenio_verificado,fuente_url:c.convenio_fuente_url,documento_url:c.convenio_documento_url,documento_nombre:c.convenio_documento_nombre,documento_path:c.convenio_documento_path,documento_origen:c.convenio_documento_origen,publicacion_url:c.convenio_publicacion_url,ambito:c.convenio_ambito,autoridad_laboral:c.convenio_autoridad_laboral,
      vacaciones:c.vacaciones,vacaciones_tipo:c.vacaciones_tipo,asuntos_horas:c.asuntos_horas
    },0);
    if(migrado) lista.push(migrado);
  }
  const vistos=new Set();
  return lista.filter(x=>{const k=normalizar(x.nombre)+"|"+normalizar(x.referencia);if(vistos.has(k))return false;vistos.add(k);return true});
}
function buscarConvenio(cfg,idONombre){
  const q=String(idONombre||"").trim(); if(!q)return null;
  const nq=normalizar(q);
  return normalizarConvenios(cfg).find(x=>String(x.id)===q || normalizar(x.nombre)===nq) || null;
}
function aplicarCatalogoConvenios(cfg){
  const out=cfg;
  out.convenios=normalizarConvenios(out);
  let principal=buscarConvenio(out,out.convenio_id || out.convenio);
  if(!principal && out.convenios.length) principal=out.convenios[0];
  if(principal){
    out.convenio_id=principal.id;
    out.convenio=principal.nombre;
    out.convenio_referencia=principal.referencia;
    out.convenio_vigencia_desde=principal.vigencia_desde;
    out.convenio_vigencia_hasta=principal.vigencia_hasta;
    out.convenio_verificado=principal.verificado===true;
    out.convenio_fuente_url=principal.fuente_url||"";
    out.convenio_documento_url=principal.documento_url||"";
    out.convenio_documento_nombre=principal.documento_nombre||"";
    out.convenio_documento_path=principal.documento_path||"";
    out.convenio_documento_origen=principal.documento_origen||"";
    out.convenio_publicacion_url=principal.publicacion_url||"";
    out.convenio_ambito=principal.ambito||"";
    out.convenio_autoridad_laboral=principal.autoridad_laboral||"";
    out.vacaciones=principal.vacaciones;
    out.vacaciones_tipo=principal.vacaciones_tipo;
    out.asuntos_horas=principal.asuntos_horas;
  }
  return out;
}

function objetoLaboral(v){return v && typeof v==="object" && !Array.isArray(v) ? v : {}}
function metaLaboral(h){return objetoLaboral(h && h.laboral_meta)}
function metaLaboralActiva(m){return !!(m && (m.inicializado===true || Number(m.version||0)>=1))}
function numeroLaboral(v,def){const n=Number(v);return Number.isFinite(n)?n:Number(def||0)}
function codigoPais(nombre){return PAISES_ISO[normalizar(nombre)] || ""}
function totalSemanal(cfg){return ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,k)=>n+numeroLaboral(cfg&&cfg[k],0),0)}


async function horarioUsuario(usuarioId){
  if(!usuarioId) return null;
  const key=cacheUsuarioKey(usuarioId);
  const cached=datoCache(key);
  const cliente=sb();

  if(!cliente || sinConexion()) return cached===undefined ? null : cached;

  try{
    const r=await cliente.from(HORARIOS_TABLE).select("*").eq("usuario_id",String(usuarioId)).eq("activo",true).order("actualizado_en",{ascending:false}).limit(1);
    if(!r.error && r.data && r.data.length){
      guardarCache(key,r.data[0]);
      return r.data[0];
    }
  }catch(e){}

  try{
    const r=await cliente.from(HORARIOS_TABLE).select("*").eq("usuario_id",String(usuarioId)).eq("activo",true).limit(1);
    if(!r.error){
      const fila=r.data && r.data.length ? r.data[0] : null;
      guardarCache(key,fila);
      return fila;
    }
  }catch(e){}

  return cached===undefined ? null : cached;
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
  // La base de empresa nunca depende de la fila personal del administrador.
  const fallback=baseLaboral();
  const key=cacheEmpresaKey();
  const cached=datoCache(key);

  if(!cliente || sinConexion()){
    const out=aplicarCatalogoConvenios(unirLaboral(fallback,cached && typeof cached==="object" ? cached : {}));
    out.horas_semana=Number((totalSemanal(out)/60).toFixed(2));
    out.pais_codigo=out.pais_codigo || codigoPais(out.pais);
    return out;
  }

  try{
    const r=await cliente.from(EMPRESA_TABLE).select("empresa_id,laboral").eq("empresa_id",empresaId()).maybeSingle();
    if(!r.error){
      const remoto=r.data && r.data.laboral && typeof r.data.laboral==="object" ? r.data.laboral : {};
      const out=aplicarCatalogoConvenios(unirLaboral(fallback,remoto));
      out.horas_semana=Number((totalSemanal(out)/60).toFixed(2));
      out.pais_codigo=out.pais_codigo || codigoPais(out.pais);
      guardarCache(key,out);
      return out;
    }
  }catch(e){}

  const out=aplicarCatalogoConvenios(unirLaboral(fallback,cached && typeof cached==="object" ? cached : {}));
  out.horas_semana=Number((totalSemanal(out)/60).toFixed(2));
  out.pais_codigo=out.pais_codigo || codigoPais(out.pais);
  return out;
}

async function guardarBaseEmpresa(data){
  const cliente=sb();
  if(!cliente || sinConexion()) return {error:new Error("Sin conexión con la base de datos")};
  const s=sesion();
  const laboral=aplicarCatalogoConvenios(unirLaboral(baseLaboral(),data));
  laboral.horas_semana=Number((totalSemanal(laboral)/60).toFixed(2));
  laboral.pais_codigo=laboral.pais_codigo || codigoPais(laboral.pais);
  const fila={empresa_id:empresaId(),laboral:laboral,updated_at:new Date().toISOString(),updated_by:s.usuario||s.id||""};
  try{
    const r=await cliente.from(EMPRESA_TABLE).upsert([fila],{onConflict:"empresa_id"});
    if(r && !r.error) guardarCache(cacheEmpresaKey(),laboral);
    return r;
  }catch(e){return {error:e}}
}

async function resolverUsuario(usuarioId){
  const [base,h]=await Promise.all([cargarBaseEmpresa(),horarioUsuario(usuarioId)]);
  const out=clonar(base);
  if(!h){
    out.horas_semana=Number((totalSemanal(out)/60).toFixed(2));
    out.pais_codigo=out.pais_codigo || codigoPais(out.pais);
    return out;
  }

  const meta=metaLaboral(h);
  const pro=metaLaboralActiva(meta);

  if(pro){
    const jornada=objetoLaboral(meta.jornada_propia);
    if(meta.hereda_jornada!==true){
      ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>{
        const v=jornada[k]!==undefined && jornada[k]!==null ? jornada[k] : h[k];
        if(v!==undefined && v!==null) out[k]=numeroLaboral(v,0);
      });
    }

    let convenioPersonal=null;
    if(meta.hereda_convenio!==true){
      const c=objetoLaboral(meta.convenio_propio);
      convenioPersonal=buscarConvenio(base,c.id || c.nombre) || normalizarConvenio(c,0);
      if(convenioPersonal){
        out.convenio_id=convenioPersonal.id;
        out.convenio=convenioPersonal.nombre;
        out.convenio_referencia=convenioPersonal.referencia;
        out.convenio_vigencia_desde=convenioPersonal.vigencia_desde;
        out.convenio_vigencia_hasta=convenioPersonal.vigencia_hasta;
      }else{
        out.convenio=String(c.nombre ?? h.convenio ?? "");
        out.convenio_referencia=String(c.referencia ?? "");
        out.convenio_vigencia_desde=String(c.vigencia_desde ?? "");
        out.convenio_vigencia_hasta=String(c.vigencia_hasta ?? "");
      }
    }

    if(meta.hereda_vacaciones!==true){
      const v=objetoLaboral(meta.vacaciones_propias);
      out.vacaciones=numeroLaboral(v.dias!==undefined ? v.dias : h.vacaciones,0);
      out.vacaciones_tipo=String(v.tipo || out.vacaciones_tipo || "naturales");
    }else if(convenioPersonal){
      out.vacaciones=numeroLaboral(convenioPersonal.vacaciones,out.vacaciones);
      out.vacaciones_tipo=String(convenioPersonal.vacaciones_tipo || out.vacaciones_tipo || "naturales");
    }

    if(meta.hereda_asuntos!==true){
      const a=meta.asuntos_propios_horas!==undefined && meta.asuntos_propios_horas!==null
        ? meta.asuntos_propios_horas
        : (h.asuntos_horas ?? h.asuntos);
      out.asuntos_horas=numeroLaboral(a,0);
    }else if(convenioPersonal){
      out.asuntos_horas=numeroLaboral(convenioPersonal.asuntos_horas,out.asuntos_horas);
    }

    if(meta.hereda_calendario!==true){
      const c=objetoLaboral(meta.calendario_propio);
      out.pais=String(c.pais ?? h.pais ?? out.pais ?? "España");
      out.pais_codigo=String(c.pais_codigo || codigoPais(out.pais));
      out.comunidad=String(c.comunidad ?? h.comunidad ?? "");
      out.provincia=String(c.provincia ?? h.provincia ?? "");
      out.localidad=String(c.localidad ?? h.localidad ?? "");
    }
  }else{
    // Compatibilidad: una fila anterior a V3439 conserva sus valores como personales.
    ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>{
      if(h[k]!==null && h[k]!==undefined) out[k]=numeroLaboral(h[k],0);
    });
    if(h.convenio) out.convenio=h.convenio;
    if(h.vacaciones!==null && h.vacaciones!==undefined) out.vacaciones=numeroLaboral(h.vacaciones,0);
    if((h.asuntos_horas??h.asuntos)!==null && (h.asuntos_horas??h.asuntos)!==undefined) out.asuntos_horas=numeroLaboral(h.asuntos_horas??h.asuntos,0);
    if(h.pais) out.pais=h.pais;
    if(h.comunidad) out.comunidad=h.comunidad;
    if(h.provincia) out.provincia=h.provincia;
    if(h.localidad) out.localidad=h.localidad;
  }

  // Las tarifas mantienen el mecanismo ya validado: null hereda empresa; número = precio propio.
  ["precio_hora","precio_extra","precio_extra_nocturna","precio_extra_festiva"].forEach(k=>{
    if(h[k]!==null && h[k]!==undefined) out[k]=numeroLaboral(h[k],0);
  });

  out.horas_semana=Number((totalSemanal(out)/60).toFixed(2));
  out.pais_codigo=out.pais_codigo || codigoPais(out.pais);
  out.laboral_meta=clonar(meta);
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
  const key=cacheFestivosKey(anio);
  const cached=datoCache(key);
  const cliente=sb();
  if(!cliente || sinConexion()) return Array.isArray(cached) ? cached : [];
  try{
    const q=cliente.from(FESTIVOS_TABLE).select("*").eq("anio",Number(anio)).order("fecha",{ascending:true});
    const r=await q;
    if(r.error) return Array.isArray(cached) ? cached : [];
    const eid=empresaId();
    const lista=(r.data||[]).filter(f=>!f.empresa_id || String(f.empresa_id)===eid);
    guardarCache(key,lista);
    return lista;
  }catch(e){return Array.isArray(cached) ? cached : []}
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
    borrarCache(cacheFestivosKey(cfg.anio));
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
  version:VERSION,empresaId,baseLaboral,cargarBaseEmpresa,guardarBaseEmpresa,horarioUsuario,resolverUsuario,normalizarConvenios,buscarConvenio,
  festivosAplicables,festivosUsuarioEnFecha,eventosFestivosRango,avisosPlanificacion,guardarFestivosOficiales,oficialMadrid2026,
  ambitoFestivo,aplicaFestivo,comunidadDeProvincia,codigoPais,buscarLocalidades,
  geo:{comunidades:COMUNIDADES,provincias:PROVINCIAS,provinciasPorComunidad:PROVINCIAS_POR_COMUNIDAD,localidadesFallback:LOCALIDADES_FALLBACK}
};
console.log("ZENTRYX laboral_core.js V"+VERSION+" cargado");
})();
