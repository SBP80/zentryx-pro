// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3113 - MEJORAS VISUALES Y EDICIÓN SEGURA
// ===============================
(function(){
"use strict";

// ===============================
// VARIABLES
// ===============================
let ZX_VER_ULTIMOS=false;
let ZX_VER_ADMIN=false;
let ZX_VER_MIS_JORNADAS=false;
let ZX_VER_TODAS_JORNADAS=false;
let ZX_FILTRO_TODAS_Q="";
let ZX_FILTRO_TODAS_ESTADO="";
let ZX_FILTRO_TODAS_DESDE="";
let ZX_FILTRO_TODAS_HASTA="";
let ZX_TIMER=null;
let ZX_RT_CANAL=null;
let ZX_RENDER_ID=0;
let ZX_RT_RENDER_TIMER=null;

// ===============================
// BASE
// ===============================
function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" ||
         String(s.usuario||"").toLowerCase()==="admin";
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function ahora(){return new Date().toISOString()}

function uuidSeguro(){
  try{if(window.crypto && crypto.randomUUID) return crypto.randomUUID()}
  catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function guardarScroll(){
  try{sessionStorage.setItem("zx_scroll_fichaje",String(window.scrollY||0));}catch(e){}
}

function restaurarScroll(){
  try{
    const y=Number(sessionStorage.getItem("zx_scroll_fichaje")||0);
    if(y>0) requestAnimationFrame(()=>window.scrollTo(0,y));
  }catch(e){}
}

function seleccionarJornadaLive(id){
  const out=[];
  document.querySelectorAll("[data-live-jornada-resumen]").forEach(el=>{
    if(String(el.getAttribute("data-live-jornada-resumen")||"")===String(id||"")) out.push(el);
  });
  return out;
}

// ===============================
// FECHAS Y HORAS
// ===============================
function fechaHoyISO(){return fechaLocalISO(new Date())}

function fechaLocalISO(valor){
  const d=valor ? new Date(valor) : new Date();
  if(isNaN(d.getTime())){
    const h=new Date();
    h.setMinutes(h.getMinutes()-h.getTimezoneOffset());
    return h.toISOString().slice(0,10);
  }
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function formatoFechaES(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  if(p.length===3) return p[2]+"/"+p[1]+"/"+p[0];
  return limpiar(f);
}

function fechaCorta(f){
  if(!f) return "-";
  const d=new Date(f);
  if(isNaN(d.getTime())) return "-";
  return String(d.getDate()).padStart(2,"0")+"/"+
         String(d.getMonth()+1).padStart(2,"0")+"/"+
         d.getFullYear()+" "+
         String(d.getHours()).padStart(2,"0")+":"+
         String(d.getMinutes()).padStart(2,"0");
}

function fechaCortaSeg(f){
  if(!f) return "-";
  const d=new Date(f);
  if(isNaN(d.getTime())) return "-";
  return String(d.getDate()).padStart(2,"0")+"/"+
         String(d.getMonth()+1).padStart(2,"0")+"/"+
         d.getFullYear()+" "+
         String(d.getHours()).padStart(2,"0")+":"+
         String(d.getMinutes()).padStart(2,"0")+":"+
         String(d.getSeconds()).padStart(2,"0");
}

function formatoSeg(seg){
  seg=Math.max(0,Math.floor(seg||0));
  const h=Math.floor(seg/3600);
  const m=Math.floor((seg%3600)/60);
  const s=seg%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function formatoMin(min){return formatoSeg(Number(min||0)*60)}

function segundosEntre(a,b){
  const da=new Date(a);
  const db=new Date(b);
  if(isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.max(0,Math.floor((db-da)/1000));
}

function toInputFecha(f){
  if(!f) return "";
  const d=new Date(f);
  if(isNaN(d.getTime())) return "";
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}

function fromInputFecha(v){
  if(!v) return null;
  const d=new Date(v);
  if(isNaN(d.getTime())) return null;
  return d.toISOString();
}

function diaSemana(fechaISOtxt){
  const d=new Date(fechaISOtxt);
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][d.getDay()];
}

function minutosDesdeHora(hora){
  if(!hora) return null;
  const txt=String(hora);
  if(txt.includes("T")){
    const d=new Date(txt);
    return d.getHours()*60+d.getMinutes();
  }
  if(txt.includes(":")){
    const p=txt.split(":");
    return Number(p[0]||0)*60+Number(p[1]||0);
  }
  return null;
}

function normalizarTexto(v){
  return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}


// ===============================
// OFFLINE RÁPIDO V3112
// ===============================
const ZX_FICHAJE_CACHE_KEY="zentryx_fichaje_cache_v3112";

function zxOffline(){
  return typeof navigator!=="undefined" && navigator.onLine===false;
}

function zxLeerCache(){
  try{
    const raw=localStorage.getItem(ZX_FICHAJE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){return {};}
}

function zxGuardarCache(parcial){
  try{
    const actual=zxLeerCache();
    localStorage.setItem(ZX_FICHAJE_CACHE_KEY,JSON.stringify({
      ...actual,
      ...(parcial||{}),
      actualizado_en:ahora()
    }));
  }catch(e){}
}

function zxCacheLista(nombre){
  const c=zxLeerCache();
  return Array.isArray(c[nombre]) ? c[nombre] : [];
}

function zxCacheValor(nombre,fallback){
  const c=zxLeerCache();
  return c[nombre]===undefined ? fallback : c[nombre];
}

function zxLaboralOffline(){
  return {
    objetivoSeg:480*60,
    objetivoBaseSeg:480*60,
    minutosJustificados:0,
    tipoAusencia:null,
    observacion:"",
    solicitudId:null,
    bloquearFichaje:false,
    solicitudes:[],
    festivo:false,
    tipoFestivo:null,
    nombreFestivo:null,
    offline:true
  };
}

function normalizarComunidadDesdeProvincia(provincia){
  const p=normalizarTexto(provincia);
  const mapa={
    "madrid":"madrid",
    "barcelona":"cataluna","girona":"cataluna","lleida":"cataluna","tarragona":"cataluna",
    "valencia":"comunidad valenciana","alicante":"comunidad valenciana","castellon":"comunidad valenciana",
    "sevilla":"andalucia","malaga":"andalucia","cadiz":"andalucia","cordoba":"andalucia","granada":"andalucia","huelva":"andalucia","jaen":"andalucia","almeria":"andalucia",
    "zaragoza":"aragon","huesca":"aragon","teruel":"aragon",
    "oviedo":"asturias","asturias":"asturias",
    "baleares":"baleares","illes balears":"baleares",
    "las palmas":"canarias","santa cruz de tenerife":"canarias",
    "cantabria":"cantabria",
    "albacete":"castilla-la mancha","ciudad real":"castilla-la mancha","cuenca":"castilla-la mancha","guadalajara":"castilla-la mancha","toledo":"castilla-la mancha",
    "avila":"castilla y leon","burgos":"castilla y leon","leon":"castilla y leon","palencia":"castilla y leon","salamanca":"castilla y leon","segovia":"castilla y leon","soria":"castilla y leon","valladolid":"castilla y leon","zamora":"castilla y leon",
    "caceres":"extremadura","badajoz":"extremadura",
    "a coruna":"galicia","coruna":"galicia","lugo":"galicia","ourense":"galicia","pontevedra":"galicia",
    "murcia":"murcia","navarra":"navarra",
    "alava":"pais vasco","araba":"pais vasco","bizkaia":"pais vasco","vizcaya":"pais vasco","gipuzkoa":"pais vasco","guipuzcoa":"pais vasco",
    "la rioja":"la rioja","ceuta":"ceuta","melilla":"melilla"
  };
  return mapa[p] || p;
}

// ===============================
// TIPOS Y ESTADOS
// ===============================
function textoTipo(t){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso",
    inicio_comida:"Inicio comida",
    fin_comida:"Fin comida"
  };
  return m[t] || t;
}

function estadoDesdeTipo(tipo){
  if(!tipo) return "fuera";
  if(tipo==="entrada") return "dentro";
  if(tipo==="salida") return "fuera";
  if(tipo==="inicio_descanso") return "descanso";
  if(tipo==="fin_descanso") return "dentro";
  if(tipo==="inicio_comida") return "comida";
  if(tipo==="fin_comida") return "dentro";
  return "fuera";
}

function textoEstado(e){
  if(e==="dentro") return "Trabajando";
  if(e==="descanso") return "Descanso";
  if(e==="comida") return "Comida";
  return "Fuera";
}

function colorEstado(e){
  if(e==="dentro") return "#16a34a";
  if(e==="descanso") return "#f59e0b";
  if(e==="comida") return "#ea580c";
  return "#64748b";
}

function iconoEstado(e){
  if(e==="dentro") return "🟢";
  if(e==="descanso") return "⏸️";
  if(e==="comida") return "🍽️";
  return "🔴";
}

function textoBotonFichar(estado){
  if(estado==="fuera") return "Iniciar jornada";
  if(estado==="dentro") return "Acciones de jornada";
  if(estado==="descanso") return "Finalizar descanso";
  if(estado==="comida") return "Finalizar comida";
  return "Fichar";
}

function iconoTipo(tipo){
  const m={entrada:"🟢",salida:"🔴",inicio_descanso:"⏸️",fin_descanso:"▶️",inicio_comida:"🍽️",fin_comida:"✅"};
  return m[tipo] || "⏱️";
}

function claseTipo(tipo){
  const m={entrada:"tipo_entrada",salida:"tipo_salida",inicio_descanso:"tipo_inicio_descanso",fin_descanso:"tipo_fin_descanso",inicio_comida:"tipo_inicio_comida",fin_comida:"tipo_fin_comida"};
  return m[tipo] || "tipo_otro";
}

function colorTipo(tipo){
  const m={entrada:"#16a34a",salida:"#dc2626",inicio_descanso:"#f59e0b",fin_descanso:"#2563eb",inicio_comida:"#7c3aed",fin_comida:"#0f766e"};
  return m[tipo] || "#64748b";
}

function dispositivoCorto(ua){
  const txt=String(ua||"");
  if(!txt) return "";
  if(/iPad/i.test(txt) || (/Macintosh/i.test(txt) && /Mobile/i.test(txt))) return "iPad";
  if(/iPhone/i.test(txt)) return "iPhone";
  if(/Android/i.test(txt) && /Mobile/i.test(txt)) return "Android";
  if(/Android/i.test(txt)) return "Tablet Android";
  if(/Windows/i.test(txt)) return "PC Windows";
  if(/Macintosh|Mac OS/i.test(txt)) return "Mac";
  return "Dispositivo";
}

function direccionCorta(dir){
  const d=String(dir||"").trim();
  if(!d) return "";
  return d.length>82 ? d.slice(0,82).trim()+"…" : d;
}

function mapaUrl(lat,lng,direccion){
  if(lat!==null && lat!==undefined && lng!==null && lng!==undefined && lat!=="" && lng!==""){
    return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(String(lat)+","+String(lng));
  }
  if(direccion){
    return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(String(direccion));
  }
  return "";
}

// ===============================
// VEHÍCULOS
// ===============================
async function vehiculosLibres(){
  if(zxOffline()) return zxCacheLista("vehiculosLibres");
  try{
    const r=await sb()
      .from("vehiculos")
      .select("id,matricula,marca,modelo,km_actual,activo,en_uso")
      .eq("activo",true)
      .eq("en_uso",false)
      .order("matricula",{ascending:true});
    if(r.error) return [];
    zxGuardarCache({vehiculosLibres:r.data||[]});
    return r.data||[];
  }catch(e){return zxCacheLista("vehiculosLibres")}
}

async function vehiculoPorId(id){
  if(!id) return null;
  try{
    const r=await sb().from("vehiculos").select("*").eq("id",String(id)).maybeSingle();
    if(r.error || !r.data) return null;
    return r.data;
  }catch(e){return null}
}

async function marcarVehiculoEntrada(v,km){
  if(!v || !v.id) return {error:null};
  const s=sesion();
  const r=await sb().from("vehiculos").update({
    en_uso:true,
    usuario_id:String(s.id||""),
    usuario_asignado:s.nombre||s.usuario||"",
    km_actual:Number(km)
  }).eq("id",String(v.id));
  return r || {error:null};
}

async function marcarVehiculoSalida(id,km){
  if(!id) return {error:null};
  const r=await sb().from("vehiculos").update({
    en_uso:false,
    usuario_id:null,
    usuario_asignado:"",
    km_actual:Number(km)
  }).eq("id",String(id));
  return r || {error:null};
}

function textoVehiculoJornada(j){
  if(!j || !j.vehiculo_matricula) return "";
  return `<br>🚗 <b>${limpiar(j.vehiculo_matricula)}</b> · Km ${limpiar(j.km_entrada??"-")} / ${limpiar(j.km_salida??"-")}`;
}

function textoVehiculoFichaje(f){
  if(!f || !f.vehiculo_matricula) return "";
  return `<div class="zx_fichaje_meta">🚗 <b>${limpiar(f.vehiculo_matricula)}</b>${f.km_vehiculo!=null ? " · "+limpiar(f.km_vehiculo)+" km" : ""}</div>`;
}

// ===============================
// AUDITORÍA Y AVISOS
// ===============================
async function insertarAuditoria(accion,detalle,usuarioObjetivoId){
  const s=sesion();
  try{
    await sb().from("auditoria").insert([{
      id:uuidSeguro(),
      usuario_id:String(s.id||""),
      usuario:s.usuario||"",
      nombre:s.nombre||"",
      modulo:"fichaje",
      accion:String(accion||""),
      detalle:String(detalle||""),
      usuario_objetivo_id:usuarioObjetivoId ? String(usuarioObjetivoId) : null,
      created_at:ahora()
    }]);
  }catch(e){}
}

function dispositivoAuditoria(){
  const s=sesion();
  return [
    "Usuario sesión: "+String(s.usuario||""),
    "Rol: "+String(s.rol||""),
    "URL: "+String(location.href||""),
    "Dispositivo: "+String(navigator.userAgent||"")
  ].join(" | ");
}

function valorFichajeAuditoria(f){
  if(!f)return null;
  return {
    id:f.id||null,
    jornada_id:f.jornada_id||null,
    usuario_id:f.usuario_id||null,
    usuario:f.usuario||"",
    nombre:f.nombre||"",
    tipo:f.tipo||"",
    fecha_hora:f.created_at||null,
    fecha_hora_es:fechaCortaSeg(f.created_at),
    direccion:f.direccion||"",
    lat:f.lat==null?null:f.lat,
    lng:f.lng==null?null:f.lng,
    vehiculo_id:f.vehiculo_id||null,
    vehiculo_matricula:f.vehiculo_matricula||null,
    km_vehiculo:f.km_vehiculo==null?null:f.km_vehiculo,
    modificado_por:f.modificado_por||"",
    modificado_en:f.modificado_en||null,
    motivo_modificacion:f.motivo_modificacion||""
  };
}

function detalleAuditoriaFichaje(accion,motivo,anterior,nuevo){
  const datos={
    accion:String(accion||""),
    motivo:String(motivo||""),
    realizado_por:sesion().usuario||"",
    realizado_en:ahora(),
    dispositivo:dispositivoAuditoria(),
    anterior:valorFichajeAuditoria(anterior),
    nuevo:valorFichajeAuditoria(nuevo)
  };

  try{return JSON.stringify(datos,null,2)}
  catch(e){return String(accion||"")+". Motivo: "+String(motivo||"")}
}

function detalleAuditoriaJornada(accion,motivo,jornada,fichajes){
  const datos={
    accion:String(accion||""),
    motivo:String(motivo||""),
    realizado_por:sesion().usuario||"",
    realizado_en:ahora(),
    dispositivo:dispositivoAuditoria(),
    jornada:jornada||null,
    fichajes:(fichajes||[]).map(valorFichajeAuditoria)
  };

  try{return JSON.stringify(datos,null,2)}
  catch(e){return String(accion||"")+". Motivo: "+String(motivo||"")}
}

async function insertarAviso(usuarioId,titulo,mensaje,tipo){
  try{
    await sb().from("notificaciones").insert([{
      id:uuidSeguro(),
      usuario_id:String(usuarioId),
      titulo:String(titulo||""),
      mensaje:String(mensaje||""),
      tipo:String(tipo||"fichaje"),
      leida:false,
      created_at:ahora()
    }]);
  }catch(e){
    try{
      await sb().from("avisos").insert([{
        id:uuidSeguro(),
        usuario_id:String(usuarioId),
        titulo:String(titulo||""),
        mensaje:String(mensaje||""),
        tipo:String(tipo||"fichaje"),
        leida:false,
        created_at:ahora()
      }]);
    }catch(e2){}
  }
}

function pedirMotivo(txt){
  const motivo=prompt(txt||"Indica el motivo.");
  if(!motivo || !String(motivo).trim()){
    alert("Motivo obligatorio.");
    return null;
  }
  return String(motivo).trim();
}

function hashPin(pin){
  try{return btoa(String(pin))}
  catch(e){return String(pin)}
}

async function validarAdminOperacion(){
  const s=sesion();

  if(!esAdmin()){
    alert("Solo administrador.");
    return false;
  }

  const pin=prompt("Introduce PIN de administrador.");
  if(!pin || !/^[0-9]{4}$/.test(String(pin).trim())){
    alert("PIN inválido.");
    return false;
  }

  try{
    const r=await sb()
      .from("usuarios")
      .select("id,usuario,rol,pin_hash,debe_crear_pin")
      .eq("id",String(s.id||""))
      .maybeSingle();

    if(r.error || !r.data){
      alert("No se pudo validar el PIN.");
      return false;
    }

    const rol=String(r.data.rol||"").toLowerCase();
    const usuario=String(r.data.usuario||"").toLowerCase();
    const admin=rol==="administrador" || usuario==="admin";

    if(!admin){
      alert("Solo administrador.");
      return false;
    }

    if(r.data.debe_crear_pin || !r.data.pin_hash){
      alert("El administrador no tiene PIN activo. Crea o restablece el PIN desde Usuarios.");
      return false;
    }

    if(hashPin(String(pin).trim())!==String(r.data.pin_hash||"")){
      alert("PIN incorrecto.");
      return false;
    }

    return true;
  }catch(e){
    alert("No se pudo validar el PIN.");
    return false;
  }
}

// ===============================
// SOLICITUDES Y CONTEXTO LABORAL
// ===============================
function textoTipoSolicitudFichaje(tipo){
  const m={
    asuntos_propios:"Asuntos propios",
    vacaciones:"Vacaciones",
    permiso_retribuido:"Permiso retribuido",
    permiso_sin_sueldo:"Permiso sin sueldo",
    baja_medica:"Baja médica",
    otros:"Otro permiso"
  };
  return m[tipo] || tipo || "";
}

async function solicitudesDelDia(fechaISOtxt,usuarioIdOpcional){
  if(zxOffline()) return [];
  const s=sesion();
  const uid=usuarioIdOpcional || s.id;
  const fecha=fechaLocalISO(fechaISOtxt||new Date());
  try{
    const r=await sb()
      .from("solicitudes_laborales")
      .select("*")
      .eq("usuario_id",String(uid))
      .eq("estado","aprobada")
      .lte("fecha_inicio",fecha)
      .gte("fecha_fin",fecha);
    if(r.error || !r.data) return [];
    return r.data||[];
  }catch(e){return []}
}

function bloqueoHorarioActual(solicitudes){
  if(!solicitudes || !solicitudes.length) return {bloqueado:false};
  const now=new Date();
  const actual=now.getHours()*60+now.getMinutes();

  for(const s of solicitudes){
    if(!s.hora_inicio || !s.hora_fin) continue;
    const min1=minutosDesdeHora(s.hora_inicio);
    const min2=minutosDesdeHora(s.hora_fin);
    if(min1===null || min2===null) continue;

    let dentro=false;
    if(min1<=min2) dentro=actual>=min1 && actual<=min2;
    else dentro=actual>=min1 || actual<=min2;

    if(dentro){
      return {bloqueado:true,inicio:s.hora_inicio,fin:s.hora_fin,tipo:s.tipo,texto:textoTipoSolicitudFichaje(s.tipo),solicitud:s};
    }
  }

  return {bloqueado:false};
}

function analizarSolicitudesDia(lista){
  const resultado={tipo:null,solicitudId:null,minutosJustificados:0,bloquearFichaje:false,observacion:""};
  if(!lista || !lista.length) return resultado;

  const prioridad=["baja_medica","vacaciones","permiso_retribuido","permiso_sin_sueldo","otros","asuntos_propios"];
  lista.sort((a,b)=>prioridad.indexOf(a.tipo)-prioridad.indexOf(b.tipo));

  const sol=lista[0];
  resultado.tipo=sol.tipo;
  resultado.solicitudId=sol.id;
  resultado.observacion=textoTipoSolicitudFichaje(sol.tipo);

  if(sol.tipo==="baja_medica"){
    resultado.bloquearFichaje=true;
    resultado.minutosJustificados=24*60;
    return resultado;
  }

  if(sol.tipo==="vacaciones"){
    resultado.minutosJustificados=24*60;
    return resultado;
  }

  if(sol.tipo==="asuntos_propios"){
    resultado.minutosJustificados=Math.round(Number(sol.total_horas||0)*60);
    return resultado;
  }

  if(Number(sol.total_horas||0)>0) resultado.minutosJustificados=Math.round(Number(sol.total_horas||0)*60);
  else if(Number(sol.total_dias||0)>0) resultado.minutosJustificados=24*60;

  return resultado;
}

async function contextoLaboralDia(fechaISOtxt,usuarioIdOpcional){
  const solicitudes=await solicitudesDelDia(fechaISOtxt,usuarioIdOpcional);
  const analisis=analizarSolicitudesDia(solicitudes);
  return {solicitudes,...analisis};
}

// ===============================
// FESTIVOS Y OBJETIVO
// ===============================
async function esFestivo(fechaTxt,usuarioIdOpcional){
  if(zxOffline()) return {es:false,tipo:null,nombre:null,offline:true};
  const s=sesion();
  const uid=usuarioIdOpcional || s.id;
  const fecha=fechaLocalISO(fechaTxt||new Date());

  let conf={data:null};
  try{
    conf=await sb()
      .from("config_laboral")
      .select("pais,provincia,localidad")
      .eq("usuario_id",String(uid))
      .maybeSingle();
  }catch(e){}

  const paisUsuario=normalizarTexto(conf.data?.pais||"España");
  const provinciaUsuario=normalizarTexto(conf.data?.provincia||"");
  const localidadUsuario=normalizarTexto(conf.data?.localidad||"");
  const comunidadUsuario=normalizarComunidadDesdeProvincia(provinciaUsuario);

  let r=null;
  try{r=await sb().from("festivos").select("*").eq("fecha",fecha)}catch(e){return {es:false,tipo:null,nombre:null}}
  if(r.error || !r.data || !r.data.length) return {es:false,tipo:null,nombre:null};

  for(const f of r.data){
    const tipo=normalizarTexto(f.tipo||"");
    const pais=normalizarTexto(f.pais||"");
    const provincia=normalizarTexto(f.provincia||"");
    const localidad=normalizarTexto(f.localidad||"");
    const comunidad=normalizarTexto(f.comunidad||"");

    if(tipo==="nacional"){
      if(!pais || pais==="empty" || pais===paisUsuario) return {es:true,tipo:f.tipo||"nacional",nombre:f.nombre||"Festivo"};
    }

    if(tipo==="autonomico"){
      if(comunidad && comunidad!=="empty" && (comunidad===comunidadUsuario || comunidad===provinciaUsuario)){
        return {es:true,tipo:f.tipo||"autonomico",nombre:f.nombre||"Festivo"};
      }
    }

    if(tipo==="local"){
      if(localidad && localidad!=="empty" && localidad===localidadUsuario){
        return {es:true,tipo:f.tipo||"local",nombre:f.nombre||"Festivo"};
      }
    }

    if(provincia && provincia!=="empty" && provincia===provinciaUsuario && tipo!=="local"){
      return {es:true,tipo:f.tipo||"festivo",nombre:f.nombre||"Festivo"};
    }
  }

  return {es:false,tipo:null,nombre:null};
}

async function objetivoDiaPRO(fechaISOtxt,usuarioIdOpcional){
  if(zxOffline()) return zxLaboralOffline();
  const s=sesion();
  const uid=usuarioIdOpcional || s.id;
  const fecha=fechaLocalISO(fechaISOtxt||new Date());

  let objetivoBaseSeg=480*60;
  const festivo=await esFestivo(fecha,uid);

  if(festivo.es){
    objetivoBaseSeg=0;
  }else{
    try{
      const r=await sb()
        .from("horarios_usuario")
        .select("*")
        .eq("usuario_id",String(uid))
        .eq("activo",true)
        .limit(1);

      if(!r.error && r.data && r.data.length){
        const h=r.data[0];
        const dia=diaSemana(fecha);
        objetivoBaseSeg=Number(h[dia]||0)*60;
      }
    }catch(e){}
  }

  const contexto=await contextoLaboralDia(fecha,uid);

  let objetivoFinalSeg=objetivoBaseSeg;
  let minutosJustificados=0;
  let tipoAusencia=null;
  let observacion="";
  let solicitudId=null;
  let bloquearFichaje=false;

  if(contexto && contexto.tipo){
    tipoAusencia=contexto.tipo;
    minutosJustificados=Number(contexto.minutosJustificados||0);
    observacion=textoTipoSolicitudFichaje(contexto.tipo);
    solicitudId=contexto.solicitudId||null;
    bloquearFichaje=!!contexto.bloquearFichaje;

    if(contexto.tipo==="vacaciones" || contexto.tipo==="baja_medica" || (minutosJustificados>=24*60 && contexto.tipo!=="asuntos_propios")){
      objetivoFinalSeg=0;
    }else if(minutosJustificados>0){
      objetivoFinalSeg=Math.max(0,objetivoBaseSeg-(minutosJustificados*60));
    }
  }

  return {
    objetivoSeg:objetivoFinalSeg,
    objetivoBaseSeg,
    minutosJustificados,
    tipoAusencia,
    observacion,
    solicitudId,
    bloquearFichaje,
    solicitudes:contexto.solicitudes||[],
    festivo:festivo.es,
    tipoFestivo:festivo.tipo,
    nombreFestivo:festivo.nombre
  };
}

// ===============================
// GEOLOCALIZACIÓN
// ===============================
async function obtenerUbicacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){
      resolve({lat:null,lng:null,direccion:null});
      return;
    }

    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;

      try{
        const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng);
        const data=await r.json();
        resolve({lat,lng,direccion:data.display_name||null});
      }catch(e){
        resolve({lat,lng,direccion:null});
      }
    },()=>{
      resolve({lat:null,lng:null,direccion:null});
    },{
      enableHighAccuracy:true,
      timeout:8000,
      maximumAge:0
    });
  });
}

// ===============================
// JORNADAS Y FICHAJES
// ===============================
async function jornadaAbierta(){
  if(zxOffline()) return zxCacheValor("jornadaAbierta",null);
  const s=sesion();
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(s.id))
      .eq("estado","abierta")
      .order("created_at",{ascending:false})
      .limit(1);

    if(r.error || !r.data || !r.data.length){zxGuardarCache({jornadaAbierta:null});return null;}
    zxGuardarCache({jornadaAbierta:r.data[0]});
    return r.data[0];
  }catch(e){return zxCacheValor("jornadaAbierta",null);}
}

async function jornadasUsuarioFecha(usuarioId,fecha){
  if(zxOffline()) return zxCacheLista("jornadasUsuarioFecha").filter(j=>String(j.usuario_id)===String(usuarioId) && String(j.fecha).slice(0,10)===String(fecha).slice(0,10));
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("fecha",String(fecha).slice(0,10))
      .order("created_at",{ascending:false});

    if(r.error || !r.data) return [];
    zxGuardarCache({jornadasUsuarioFecha:r.data||[]});
    return r.data||[];
  }catch(e){return zxCacheLista("jornadasUsuarioFecha");}
}

async function ultimaJornadaUsuario(){
  if(zxOffline()) return zxCacheValor("ultimaJornada",null);
  const s=sesion();
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(s.id))
      .order("created_at",{ascending:false})
      .limit(1);

    if(r.error || !r.data || !r.data.length) return null;
    zxGuardarCache({ultimaJornada:r.data[0]});
    return r.data[0];
  }catch(e){return zxCacheValor("ultimaJornada",null);}
}

async function fichajesDeJornada(jornadaId){
  if(zxOffline()) return zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===String(jornadaId));
  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("jornada_id",String(jornadaId))
      .order("created_at",{ascending:true});

    if(r.error) return [];
    const cache=zxLeerCache();
    const otros=(Array.isArray(cache.fichajes)?cache.fichajes:[]).filter(f=>String(f.jornada_id)!==String(jornadaId));
    zxGuardarCache({fichajes:otros.concat(r.data||[])});
    return r.data||[];
  }catch(e){return zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===String(jornadaId));}
}

async function estadoActual(){
  const j=await jornadaAbierta();
  if(!j) return {estado:"fuera",jornada:null,eventos:[]};

  const eventos=await fichajesDeJornada(j.id);
  const ultimo=eventos.length ? eventos[eventos.length-1] : null;

  return {estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),jornada:j,eventos};
}

async function estadoActualOptimizado(){
  const s=sesion();

  if(zxOffline()){
    const jornadas=zxCacheLista("jornadasUsuario");
    const abierta=jornadas.find(j=>String(j.estado||"")==="abierta") || null;
    if(!abierta){
      return {estado:"fuera",jornada:null,eventos:[],ultima:jornadas.length ? jornadas[0] : null,jornadasUsuario:jornadas.slice(0,8),offline:true};
    }
    const eventos=zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===String(abierta.id));
    const ultimo=eventos.length ? eventos[eventos.length-1] : null;
    return {estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),jornada:abierta,eventos,ultima:jornadas.length ? jornadas[0] : abierta,jornadasUsuario:jornadas.slice(0,8),offline:true};
  }

  let r={error:true,data:[]};
  try{
    r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(s.id))
      .order("created_at",{ascending:false})
      .limit(20);
  }catch(e){
    r={error:true,data:zxCacheLista("jornadasUsuario")};
  }

  const jornadas=(!r.error && r.data) ? (r.data||[]) : zxCacheLista("jornadasUsuario");
  if(!r.error && r.data) zxGuardarCache({jornadasUsuario:jornadas,ultimaJornada:jornadas.length ? jornadas[0] : null});
  const abierta=jornadas.find(j=>String(j.estado||"")==="abierta") || null;

  if(!abierta){
    return {
      estado:"fuera",
      jornada:null,
      eventos:[],
      ultima:jornadas.length ? jornadas[0] : null,
      jornadasUsuario:jornadas.slice(0,8)
    };
  }

  const eventos=await fichajesDeJornada(abierta.id);
  const ultimo=eventos.length ? eventos[eventos.length-1] : null;

  return {
    estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),
    jornada:abierta,
    eventos,
    ultima:jornadas.length ? jornadas[0] : abierta,
    jornadasUsuario:jornadas.slice(0,8)
  };
}

// ===============================
// CÁLCULO ÚNICO
// ===============================
function calcularEnVivo(eventos,estado){
  const lista=(eventos||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

  let trabajadoSeg=0;
  let descansoSeg=0;
  let comidaSeg=0;

  let entrada=null;
  let salida=null;
  let inicioTrabajo=null;
  let inicioDescanso=null;
  let inicioComida=null;

  const now=ahora();

  lista.forEach(e=>{
    const tipo=e.tipo;
    const t=e.created_at;

    if(tipo==="entrada"){
      entrada=t;
      inicioTrabajo=t;
      inicioDescanso=null;
      inicioComida=null;
    }

    if(tipo==="inicio_descanso"){
      if(inicioTrabajo){
        trabajadoSeg+=segundosEntre(inicioTrabajo,t);
        inicioTrabajo=null;
      }
      inicioDescanso=t;
    }

    if(tipo==="fin_descanso"){
      if(inicioDescanso){
        descansoSeg+=segundosEntre(inicioDescanso,t);
        inicioDescanso=null;
      }
      inicioTrabajo=t;
    }

    if(tipo==="inicio_comida"){
      if(inicioTrabajo){
        trabajadoSeg+=segundosEntre(inicioTrabajo,t);
        inicioTrabajo=null;
      }
      inicioComida=t;
    }

    if(tipo==="fin_comida"){
      if(inicioComida){
        comidaSeg+=segundosEntre(inicioComida,t);
        inicioComida=null;
      }
      inicioTrabajo=t;
    }

    if(tipo==="salida"){
      salida=t;

      if(inicioTrabajo){
        trabajadoSeg+=segundosEntre(inicioTrabajo,t);
        inicioTrabajo=null;
      }

      if(inicioDescanso){
        descansoSeg+=segundosEntre(inicioDescanso,t);
        inicioDescanso=null;
      }

      if(inicioComida){
        comidaSeg+=segundosEntre(inicioComida,t);
        inicioComida=null;
      }
    }
  });

  if(!salida){
    if(estado==="dentro" && inicioTrabajo) trabajadoSeg+=segundosEntre(inicioTrabajo,now);
    if(estado==="descanso" && inicioDescanso) descansoSeg+=segundosEntre(inicioDescanso,now);
    if(estado==="comida" && inicioComida) comidaSeg+=segundosEntre(inicioComida,now);
  }

  return {entrada,salida,trabajadoSeg,descansoSeg,comidaSeg};
}

function resumenDesdeJornada(j){
  const tieneSegundos =
    j &&
    (j.segundos_trabajados!==undefined ||
     j.segundos_descanso!==undefined ||
     j.segundos_comida!==undefined);

  return {
    entrada:j?.entrada||null,
    salida:j?.salida||null,
    trabajadoSeg:tieneSegundos ? Number(j?.segundos_trabajados||0) : Math.round(Number(j?.minutos_trabajados||0)*60),
    descansoSeg:tieneSegundos ? Number(j?.segundos_descanso||0) : Math.round(Number(j?.minutos_descanso||0)*60),
    comidaSeg:tieneSegundos ? Number(j?.segundos_comida||0) : Math.round(Number(j?.minutos_comida||0)*60)
  };
}

function jornadaEsAdicional(j){
  const txt=String(j?.observacion_laboral||"");
  return txt.includes("Jornada extra creada por administrador") || txt.includes("Jornada adicional del mismo día");
}

function objetivoJornadaSeg(j,laboral){
  if(jornadaEsAdicional(j)) return 0;
  if(j && j.estado==="cerrada"){
    if(j.segundos_objetivo!==undefined && j.segundos_objetivo!==null){
      return Number(j.segundos_objetivo||0);
    }
    return Math.round(Number(j.minutos_objetivo||0)*60);
  }
  return Number(laboral?.objetivoSeg||0);
}

async function resumenVisualJornada(j,eventosPrecargados=null){
  if(!j) return {resumen:{trabajadoSeg:0,descansoSeg:0,comidaSeg:0},objetivoSeg:0,laboral:null,eventos:[],estado:"fuera"};

  const laboral=await objetivoDiaPRO(j.fecha||fechaHoyISO(),j.usuario_id);
  const obj=objetivoJornadaSeg(j,laboral);
  const eventos=Array.isArray(eventosPrecargados) ? eventosPrecargados : await fichajesDeJornada(j.id);

  if(eventos.length){
    const ultimo=eventos[eventos.length-1];
    const estado=j.estado==="cerrada" ? "fuera" : estadoDesdeTipo(ultimo ? ultimo.tipo : null);
    return {resumen:calcularEnVivo(eventos,estado),objetivoSeg:obj,laboral,eventos,estado};
  }

  return {resumen:resumenDesdeJornada(j),objetivoSeg:obj,laboral,eventos:[],estado:"fuera"};
}

// ===============================
// OPCIONES Y MODAL
// ===============================
function opcionesPermitidas(estado){
  if(estado==="fuera") return [{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];

  if(estado==="dentro"){
    return [
      {tipo:"salida",texto:"Salida",clase:"zx_rojo"},
      {tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},
      {tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}
    ];
  }

  if(estado==="descanso") return [{tipo:"fin_descanso",texto:"Fin descanso",clase:"zx_azul"}];
  if(estado==="comida") return [{tipo:"fin_comida",texto:"Fin comida",clase:"zx_azul"}];

  return [];
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_fichaje");
  if(m) m.remove();
}

async function abrirMenu(estado,jornadaActual=null){
  cerrarModal();

  const ops=opcionesPermitidas(estado);
  const libres=estado==="fuera" ? await vehiculosLibres() : [];
  const tieneVehiculo=!!(jornadaActual && jornadaActual.vehiculo_id);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(textoBotonFichar(estado))}</h2>

        ${estado==="fuera" ? `
          <label class="zx_label">Vehículo</label>
          <select id="zx_fichaje_vehiculo">
            <option value="">Sin vehículo</option>
            ${libres.map(v=>`
              <option value="${limpiar(v.id)}" data-km="${limpiar(v.km_actual??0)}">
                ${limpiar(v.matricula||"")} ${limpiar(v.marca||"")} ${limpiar(v.modelo||"")} · ${limpiar(v.km_actual??0)} km
              </option>
            `).join("")}
          </select>

          <label class="zx_label">Km entrada</label>
          <input id="zx_fichaje_km_entrada" type="number" placeholder="Km actuales del vehículo" inputmode="numeric">
        ` : ""}

        ${estado==="dentro" && tieneVehiculo ? `
          <div class="zx_text" style="font-weight:900;margin:10px 0;">
            Vehículo: <b>${limpiar(jornadaActual.vehiculo_matricula||"")}</b><br>
            Km entrada: <b>${limpiar(jornadaActual.km_entrada??"-")}</b>
          </div>

          <label class="zx_label">Km salida</label>
          <input id="zx_fichaje_km_salida" type="number" value="${limpiar(jornadaActual.km_salida ?? jornadaActual.km_entrada ?? "")}" placeholder="Km de salida" inputmode="numeric">
        ` : ""}

        ${estado!=="fuera" && jornadaActual ? `
          <div class="zx_modal_contexto">
            Jornada iniciada: <b>${limpiar(fechaCorta(jornadaActual.entrada||jornadaActual.created_at||""))}</b><br>
            Estado actual: <b>${limpiar(textoEstado(estado))}</b>
          </div>
        ` : ""}

        <div class="zx_text" style="margin-bottom:12px;color:#dc2626;font-weight:900;">
          Revisa bien antes de guardar. Después quedará registrado con hora, ubicación y dispositivo. GPS obligatorio si está activado por la empresa.
        </div>

        ${ops.map(o=>`
          <button class="zx_btn_big ${o.clase}" data-fichaje="${o.tipo}">
            ${o.texto}
          </button>
        `).join("")}

        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">
          Cancelar
        </button>
      </div>
    </div>
  `);

  const sel=document.getElementById("zx_fichaje_vehiculo");
  const kmEntrada=document.getElementById("zx_fichaje_km_entrada");
  if(sel && kmEntrada){
    sel.onchange=function(){
      const opt=sel.options[sel.selectedIndex];
      kmEntrada.value=opt && opt.value ? String(opt.dataset.km||"") : "";
    };
  }

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.fichaje;
      const datosModal={
        vehiculoId:document.getElementById("zx_fichaje_vehiculo")?.value||"",
        kmEntrada:document.getElementById("zx_fichaje_km_entrada")?.value||"",
        kmSalida:document.getElementById("zx_fichaje_km_salida")?.value||""
      };
      const ok=confirm("Confirmar fichaje: "+textoTipo(tipo)+"\n\n¿Seguro que quieres guardar este registro?");
      if(!ok) return;
      cerrarModal();
      registrar(tipo,datosModal);
    };
  });

  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

// ===============================
// CREAR / INSERTAR / RECALCULAR
// ===============================
async function crearJornada(motivoAdmin,datosVehiculo=null){
  const s=sesion();
  const fecha=fechaHoyISO();
  const jornadasDia=await jornadasUsuarioFecha(s.id,fecha);
  const abierta=jornadasDia.find(j=>j.estado==="abierta");

  if(abierta) return abierta;

  const cerradas=jornadasDia.filter(j=>j.estado==="cerrada");

  const entrada=ahora();
  const laboral=await objetivoDiaPRO(fecha,s.id);

  let objetivoMin=Math.floor(Number(laboral.objetivoSeg||0)/60);

  if(cerradas.length){
    objetivoMin=0;
  }

  let observacion=laboral.observacion;

  if(cerradas.length && motivoAdmin){
    observacion="Jornada extra creada por administrador. Motivo: "+motivoAdmin;
  }else if(cerradas.length){
    observacion="Jornada adicional del mismo día.";
  }

  const datos={
    usuario_id:String(s.id),
    usuario:s.usuario||"",
    nombre:s.nombre||"",
    fecha,
    entrada,
    estado:"abierta",
    es_festivo:laboral.festivo,
    tipo_festivo:laboral.tipoFestivo,
    solicitud_id:laboral.solicitudId,
    tipo_ausencia:laboral.tipoAusencia,
    minutos_justificados:laboral.minutosJustificados,
    observacion_laboral:observacion,
    minutos_trabajados:0,
    minutos_descanso:0,
    minutos_comida:0,
    minutos_objetivo:objetivoMin,
    minutos_extra:0,
    minutos_faltantes:objetivoMin,
    horas_extra:0,
    vehiculo_id:datosVehiculo&&datosVehiculo.id?String(datosVehiculo.id):null,
    vehiculo_matricula:datosVehiculo&&datosVehiculo.matricula?String(datosVehiculo.matricula):null,
    km_entrada:datosVehiculo&&datosVehiculo.km!=null?Number(datosVehiculo.km):null,
    km_salida:null,
    created_at:ahora()
  };

  const r=await sb().from("jornadas").insert([datos]).select().single();

  if(r.error){
    alert("Error creando jornada: "+r.error.message);
    return null;
  }

  if(cerradas.length){
    await insertarAuditoria(
      motivoAdmin ? "crear_jornada_extra_admin" : "crear_jornada_adicional",
      motivoAdmin ? "Jornada extra creada por admin. Motivo: "+motivoAdmin : "Jornada adicional creada el mismo día.",
      s.id
    );

    await insertarAviso(
      s.id,
      motivoAdmin ? "Jornada extra creada" : "Jornada adicional creada",
      motivoAdmin ? "Se ha creado una jornada extra. Motivo: "+motivoAdmin : "Se ha creado una jornada adicional en el mismo día.",
      "fichaje"
    );
  }

  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo,veh=null){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario||"",
      nombre:s.nombre||"",
      jornada_id:String(jornadaId),
      tipo,
      lat:geo.lat,
      lng:geo.lng,
      direccion:geo.direccion,
      dispositivo:navigator.userAgent,
      vehiculo_id:veh&&veh.id?String(veh.id):null,
      vehiculo_matricula:veh&&veh.matricula?String(veh.matricula):null,
      km_vehiculo:veh&&veh.km!=null?Number(veh.km):null,
      created_at:ahora()
    }]);

  if(r.error){
    alert("Error al guardar fichaje: "+r.error.message);
    return false;
  }

  return true;
}

async function sincronizarHorasExtra(jornadaId,c,laboral,extraSeg,jornada){
  const minutos=Math.floor(extraSeg/60);
  const uid=String(jornada?.usuario_id||sesion().id||"");

  const existente=await sb()
    .from("horas_extra_pro")
    .select("*")
    .eq("jornada_id",String(jornadaId))
    .limit(1);

  const reg=existente.data && existente.data.length ? existente.data[0] : null;

  if(minutos<=0){
    if(reg && !["pagada","cobrada","cobrada_trabajador"].includes(reg.estado)){
      await sb().from("horas_extra_pro").delete().eq("jornada_id",String(jornadaId));
    }
    return;
  }

  const horasDecimal=Number((minutos/60).toFixed(2));
  const precioHora=15;
  const importe=Number((horasDecimal*precioHora).toFixed(2));

  if(reg){
    if(["pagada","cobrada","cobrada_trabajador"].includes(reg.estado)) return;

    await sb()
      .from("horas_extra_pro")
      .update({
        minutos,
        horas_decimal:horasDecimal,
        precio_hora:precioHora,
        importe,
        tipo:laboral.festivo ? "festivo" : "normal",
        observacion:laboral.observacion||jornada?.observacion_laboral||"",
        updated_at:ahora()
      })
      .eq("jornada_id",String(jornadaId));

    return;
  }

  await sb()
    .from("horas_extra_pro")
    .insert([{
      usuario_id:uid,
      usuario:jornada?.usuario||sesion().usuario||"",
      nombre:jornada?.nombre||sesion().nombre||"",
      jornada_id:String(jornadaId),
      fecha:fechaLocalISO(c.entrada||new Date()),
      tipo:laboral.festivo ? "festivo" : "normal",
      minutos,
      horas_decimal:horasDecimal,
      precio_hora:precioHora,
      importe,
      estado:"pendiente_trabajador",
      observacion:laboral.observacion||jornada?.observacion_laboral||""
    }]);
}

async function recalcularJornada(jornadaId){
  if(!jornadaId) return;

  const rj=await sb().from("jornadas").select("*").eq("id",jornadaId).single();
  if(rj.error || !rj.data) return;
  const jornada=rj.data;

  const eventos=await fichajesDeJornada(jornadaId);

  if(!eventos.length){
    if(jornada.vehiculo_id){
      await marcarVehiculoSalida(jornada.vehiculo_id,jornada.km_salida||jornada.km_entrada||0);
    }
    await sb().from("horas_extra_pro").delete().eq("jornada_id",String(jornadaId));
    await sb().from("jornadas").delete().eq("id",jornadaId);
    return;
  }

  const ultimo=eventos[eventos.length-1];
  const nuevoEstado=ultimo && ultimo.tipo==="salida" ? "cerrada" : "abierta";
  const estadoCalculo=estadoDesdeTipo(ultimo ? ultimo.tipo : null);

  const c=calcularEnVivo(eventos,estadoCalculo);
  const fechaBase=fechaLocalISO(c.entrada||jornada.fecha||new Date());
  const laboral=await objetivoDiaPRO(fechaBase,jornada.usuario_id);

  let objetivoSeg=Number(laboral.objetivoSeg||0);

  if(jornadaEsAdicional(jornada)){
    objetivoSeg=0;
  }

  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);

  await sincronizarHorasExtra(jornadaId,c,laboral,extraSeg,jornada);

  const datos={
    salida:c.salida,

    minutos_trabajados:Math.floor(c.trabajadoSeg/60),
    minutos_descanso:Math.floor(c.descansoSeg/60),
    minutos_comida:Math.floor(c.comidaSeg/60),
    minutos_objetivo:Math.floor(objetivoSeg/60),
    minutos_extra:Math.floor(extraSeg/60),
    minutos_faltantes:Math.floor(faltanteSeg/60),
    horas_extra:Math.floor(extraSeg/60),

    segundos_trabajados:Math.floor(c.trabajadoSeg),
    segundos_descanso:Math.floor(c.descansoSeg),
    segundos_comida:Math.floor(c.comidaSeg),
    segundos_objetivo:Math.floor(objetivoSeg),
    segundos_extra:Math.floor(extraSeg),
    segundos_faltantes:Math.floor(faltanteSeg),

    es_festivo:laboral.festivo,
    tipo_festivo:laboral.tipoFestivo,
    solicitud_id:laboral.solicitudId,
    tipo_ausencia:laboral.tipoAusencia,
    minutos_justificados:laboral.minutosJustificados,
    estado:nuevoEstado
  };

  const r=await sb().from("jornadas").update(datos).eq("id",jornadaId);

  if(r.error){
    alert("Error recalculando jornada: "+r.error.message);
  }
}

async function registrar(tipo,datosModal=null){
  guardarScroll();
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const fecha=fechaHoyISO();
  const laboral=await objetivoDiaPRO(fecha,s.id);

  if(laboral.bloquearFichaje && tipo==="entrada"){
    alert("No se puede fichar: existe una baja médica aprobada para hoy.");
    return;
  }

  const bloqueo=bloqueoHorarioActual(laboral.solicitudes);

  if(bloqueo.bloqueado && tipo==="entrada"){
    alert("No puedes fichar.\nPermiso activo: "+bloqueo.inicio+" - "+bloqueo.fin);
    return;
  }

  const est=await estadoActual();
  let jornada=est.jornada;
  let motivoAdmin=null;
  let veh=null;
  let vehMarcado=false;

  if(tipo==="entrada"){
    const jornadasDia=await jornadasUsuarioFecha(s.id,fecha);
    const cerradas=jornadasDia.filter(j=>j.estado==="cerrada");

    if(cerradas.length && esAdmin()){
      if(!(await validarAdminOperacion())) return;
      motivoAdmin=pedirMotivo("Motivo para crear otra jornada hoy.");
      if(!motivoAdmin) return;
    }
  }

  if(tipo==="entrada" && est.estado!=="fuera"){
    alert("Ya tienes una jornada abierta.");
    return;
  }

  if(tipo!=="entrada" && !jornada){
    alert("No hay jornada abierta.");
    return;
  }

  if(tipo==="inicio_descanso" && est.estado!=="dentro"){
    alert("Solo puedes iniciar descanso trabajando.");
    return;
  }

  if(tipo==="fin_descanso" && est.estado!=="descanso"){
    alert("No estás en descanso.");
    return;
  }

  if(tipo==="inicio_comida" && est.estado!=="dentro"){
    alert("Solo puedes iniciar comida trabajando.");
    return;
  }

  if(tipo==="fin_comida" && est.estado!=="comida"){
    alert("No estás en comida.");
    return;
  }

  if(tipo==="salida" && (est.estado==="descanso" || est.estado==="comida")){
    alert("Primero termina descanso o comida.");
    return;
  }

  if(tipo==="entrada"){
    const vehiculoId=String(datosModal?.vehiculoId||"");
    const kmTxt=String(datosModal?.kmEntrada||"");

    if(vehiculoId){
      const v=await vehiculoPorId(vehiculoId);
      if(!v){
        alert("Vehículo no encontrado.");
        return;
      }
      if(v.activo===false || v.activo==="false"){
        alert("El vehículo no está activo.");
        return;
      }
      if(v.en_uso===true || v.en_uso==="true"){
        alert("El vehículo ya está en uso.");
        return;
      }

      const km=Number(kmTxt);
      if(!Number.isFinite(km) || km<0){
        alert("Km de entrada inválidos.");
        return;
      }
      if(Number(v.km_actual||0)>0 && km<Number(v.km_actual||0)){
        alert("Los km de entrada no pueden ser menores que los km actuales del vehículo.");
        return;
      }

      veh={id:v.id,matricula:v.matricula,km};
      const mv=await marcarVehiculoEntrada(v,km);
      if(mv.error){
        alert("No se pudo marcar el vehículo en uso: "+mv.error.message);
        return;
      }
      vehMarcado=true;
    }

    jornada=await crearJornada(motivoAdmin,veh);
    if(!jornada){
      if(vehMarcado && veh && veh.id) await marcarVehiculoSalida(veh.id,veh.km);
      return;
    }
  }

  if(tipo==="salida" && jornada && jornada.vehiculo_id){
    const kmTxt=String(datosModal?.kmSalida||"").trim();
    if(!kmTxt){
      alert("Indica los km de salida del vehículo.");
      return;
    }

    const km=Number(kmTxt);
    if(!Number.isFinite(km) || km<0){
      alert("Km de salida inválidos.");
      return;
    }
    if(jornada.km_entrada!=null && km<Number(jornada.km_entrada)){
      alert("Los km de salida no pueden ser menores que los km de entrada.");
      return;
    }

    veh={id:jornada.vehiculo_id,matricula:jornada.vehiculo_matricula,km};

    const rj=await sb().from("jornadas").update({km_salida:km}).eq("id",String(jornada.id));
    if(rj.error){
      alert("No se pudieron guardar los km de salida: "+rj.error.message);
      return;
    }

    const rv=await marcarVehiculoSalida(jornada.vehiculo_id,km);
    if(rv.error){
      alert("No se pudo liberar el vehículo: "+rv.error.message);
      return;
    }
  }

  const geo=await obtenerUbicacion();
  const ok=await insertarFichaje(tipo,jornada.id,geo,veh);
  if(!ok){
    // Si falla el registro del fichaje, dejamos jornada y vehículo en un estado coherente.
    if(tipo==="entrada"){
      if(vehMarcado && veh && veh.id) await marcarVehiculoSalida(veh.id,veh.km);
      await recalcularJornada(jornada.id);
    }

    if(tipo==="salida" && jornada && jornada.vehiculo_id){
      await sb().from("jornadas").update({km_salida:null}).eq("id",String(jornada.id));
      await marcarVehiculoEntrada({id:jornada.vehiculo_id},jornada.km_entrada||0);
    }

    return;
  }

  await insertarAuditoria("fichaje_"+tipo,"Fichaje registrado: "+textoTipo(tipo),s.id);
  await recalcularJornada(jornada.id);

  if(tipo==="salida"){
    await crearEventoAgendaExtra(jornada.id);
  }

  await ZX_fichaje_real();
  restaurarScroll();
}

// ===============================
// AGENDA EXTRA AL CERRAR JORNADA
// ===============================
async function crearEventoAgendaExtra(jornadaId){
  try{
    const rj=await sb().from("jornadas").select("*").eq("id",jornadaId).single();
    if(rj.error || !rj.data) return;

    const j=rj.data;
    if(Number(j.minutos_extra||0)<=0) return;

    const existe=await sb()
      .from("agenda_eventos")
      .select("id")
      .eq("origen","fichaje_extra")
      .eq("origen_id",String(jornadaId))
      .limit(1);

    if(existe.data && existe.data.length) return;

    await sb().from("agenda_eventos").insert([{
      id:uuidSeguro(),
      titulo:"Trabajo extraordinario - "+(j.nombre||j.usuario||""),
      tipo:"horas_extra",
      fecha:j.fecha,
      inicio:j.entrada,
      fin:j.salida,
      usuario_id:j.usuario_id,
      usuario:j.usuario||"",
      nombre:j.nombre||"",
      descripcion:"Jornada cerrada con "+formatoMin(j.minutos_extra)+" de horas extra.",
      origen:"fichaje_extra",
      origen_id:String(jornadaId),
      created_at:ahora()
    }]);
  }catch(e){}
}

// ===============================
// CONSULTAS LISTADOS
// ===============================
async function ultimosFichajes(){
  if(zxOffline()) return zxCacheLista("ultimosFichajes");
  const s=sesion();
  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("usuario_id",String(s.id))
      .order("created_at",{ascending:false})
      .limit(8);

    if(r.error) return [];
    zxGuardarCache({ultimosFichajes:r.data||[]});
    return r.data||[];
  }catch(e){return zxCacheLista("ultimosFichajes");}
}

async function jornadasUsuario(){
  if(zxOffline()) return zxCacheLista("jornadasUsuario");
  const s=sesion();
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(s.id))
      .order("created_at",{ascending:false})
      .limit(8);

    if(r.error) return [];
    zxGuardarCache({jornadasUsuario:r.data||[]});
    return r.data||[];
  }catch(e){return zxCacheLista("jornadasUsuario");}
}

async function jornadasAdminHoy(){
  if(zxOffline()) return zxCacheLista("adminHoy");
  const s=sesion();
  const hoy=fechaHoyISO();

  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("fecha",hoy)
      .neq("usuario_id",String(s.id||""))
      .order("created_at",{ascending:false})
      .limit(80);

    if(r.error) return [];
    zxGuardarCache({adminHoy:r.data||[]});
    return r.data||[];
  }catch(e){return zxCacheLista("adminHoy");}
}

async function jornadasAdminTodas(){
  if(zxOffline()) return zxCacheLista("adminTodas");
  const s=sesion();

  let q=sb()
    .from("jornadas")
    .select("*")
    .neq("usuario_id",String(s.id||""))
    .order("fecha",{ascending:false})
    .order("created_at",{ascending:false})
    .limit(150);

  if(ZX_FILTRO_TODAS_DESDE){
    q=q.gte("fecha",String(ZX_FILTRO_TODAS_DESDE).slice(0,10));
  }

  if(ZX_FILTRO_TODAS_HASTA){
    q=q.lte("fecha",String(ZX_FILTRO_TODAS_HASTA).slice(0,10));
  }

  if(ZX_FILTRO_TODAS_ESTADO){
    q=q.eq("estado",String(ZX_FILTRO_TODAS_ESTADO));
  }

  let r=null;
  try{r=await q;}catch(e){return zxCacheLista("adminTodas");}
  if(r.error) return [];

  let datos=(r.data||[]).filter(j=>String(j.usuario_id)!==String(s.id));
  const txt=normalizarTexto(ZX_FILTRO_TODAS_Q);

  if(txt){
    datos=datos.filter(j=>{
      const bolsa=[
        j.nombre,j.usuario,j.fecha,j.estado,j.vehiculo_matricula,
        j.observacion_laboral,j.tipo_ausencia,j.tipo_festivo
      ].map(x=>normalizarTexto(x)).join(" ");
      return bolsa.includes(txt);
    });
  }

  zxGuardarCache({adminTodas:datos});
  return datos;
}

// ===============================
// BORRAR Y EDITAR
// ===============================
async function borrarJornada(id){
  guardarScroll();
  if(!(await validarAdminOperacion())) return;

  const motivo=pedirMotivo("Motivo para borrar la jornada.");
  if(!motivo) return;

  const r0=await sb().from("jornadas").select("*").eq("id",id).single();

  if(r0.error || !r0.data){
    alert("No se pudo cargar la jornada.");
    return;
  }

  const ok=confirm("Vas a eliminar la jornada completa y todos sus fichajes. Esta acción recalculará horas, incidencias, vehículo y horas extra. ¿Deseas continuar?");
  if(!ok) return;

  const fichajesAntes=await fichajesDeJornada(id);

  if(r0.data.vehiculo_id){
    await marcarVehiculoSalida(r0.data.vehiculo_id,r0.data.km_salida||r0.data.km_entrada||0);
  }

  const f=await sb().from("fichajes").delete().eq("jornada_id",String(id));

  if(f.error){
    alert("Error eliminando fichajes: "+f.error.message);
    return;
  }

  await sb().from("horas_extra_pro").delete().eq("jornada_id",String(id));

  const j=await sb().from("jornadas").delete().eq("id",id);

  if(j.error){
    alert("Error eliminando jornada: "+j.error.message);
    return;
  }

  await insertarAuditoria("borrar_jornada",detalleAuditoriaJornada("BORRAR_JORNADA",motivo,r0.data,fichajesAntes),r0.data.usuario_id);
  await insertarAviso(r0.data.usuario_id,"Jornada borrada","Se ha borrado una jornada tuya. Motivo: "+motivo,"fichaje");

  cerrarModal();
  await ZX_fichaje_real();
  restaurarScroll();
}

async function borrarFichaje(id){
  guardarScroll();
  if(!(await validarAdminOperacion())) return;

  const motivo=pedirMotivo("Motivo para borrar el fichaje.");
  if(!motivo) return;

  const r0=await sb().from("fichajes").select("*").eq("id",id).single();

  if(r0.error || !r0.data){
    alert("No se pudo cargar el fichaje.");
    return;
  }

  const ok=confirm("Vas a eliminar este fichaje. Esta acción puede modificar el tiempo trabajado, vehículo, horas extra, incidencias y el estado de la jornada. ¿Deseas continuar?");
  if(!ok) return;

  const r=await sb().from("fichajes").delete().eq("id",id);

  if(r.error){
    alert("Error eliminando fichaje: "+r.error.message);
    return;
  }

  const restantes=await fichajesDeJornada(r0.data.jornada_id);

  if(!restantes.length){
    const j0=await sb().from("jornadas").select("*").eq("id",r0.data.jornada_id).maybeSingle();
    if(j0.data && j0.data.vehiculo_id){
      await marcarVehiculoSalida(j0.data.vehiculo_id,j0.data.km_salida||j0.data.km_entrada||0);
    }
    await sb().from("horas_extra_pro").delete().eq("jornada_id",String(r0.data.jornada_id));
    await sb().from("jornadas").delete().eq("id",r0.data.jornada_id);
  }else{
    await recalcularJornada(r0.data.jornada_id);
  }

  await insertarAuditoria("borrar_fichaje",detalleAuditoriaFichaje("BORRAR_FICHAJE",motivo,r0.data,null),r0.data.usuario_id);
  await insertarAviso(r0.data.usuario_id,"Fichaje borrado","Se ha borrado un fichaje tuyo. Motivo: "+motivo,"fichaje");

  cerrarModal();
  await ZX_fichaje_real();
  restaurarScroll();
}

async function actualizarVehiculoPorEdicion(fichajeAnterior,nuevoFichaje){
  const tipo=String(nuevoFichaje.tipo||"");
  const jornadaId=String(nuevoFichaje.jornada_id||"");
  const jornadaRes=await sb().from("jornadas").select("*").eq("id",jornadaId).maybeSingle();
  const jornada=jornadaRes.data||null;

  const vehId=nuevoFichaje.vehiculo_id||jornada?.vehiculo_id||null;
  const matricula=nuevoFichaje.vehiculo_matricula||jornada?.vehiculo_matricula||null;
  const km=nuevoFichaje.km_vehiculo==="" || nuevoFichaje.km_vehiculo==null ? null : Number(nuevoFichaje.km_vehiculo);

  if(tipo==="entrada"){
    const data={
      vehiculo_id:vehId?String(vehId):null,
      vehiculo_matricula:matricula?String(matricula):null,
      km_entrada:km==null?null:Number(km)
    };
    await sb().from("jornadas").update(data).eq("id",jornadaId);

    if(vehId && km!=null){
      await marcarVehiculoEntrada({id:vehId},km);
    }
  }

  if(tipo==="salida"){
    const data={
      km_salida:km==null?null:Number(km)
    };
    if(vehId && !jornada?.vehiculo_id){
      data.vehiculo_id=String(vehId);
      data.vehiculo_matricula=matricula?String(matricula):null;
    }
    await sb().from("jornadas").update(data).eq("id",jornadaId);

    if(vehId && km!=null){
      await marcarVehiculoSalida(vehId,km);
    }
  }
}

async function editarFichaje(id){
  guardarScroll();
  if(!(await validarAdminOperacion())) return;

  const motivoInicial=pedirMotivo("Motivo para modificar este fichaje.");
  if(!motivoInicial) return;

  const r=await sb().from("fichajes").select("*").eq("id",id).single();

  if(r.error || !r.data){
    alert("No se pudo cargar el fichaje.");
    return;
  }

  const f=r.data;
  const jr=await sb().from("jornadas").select("*").eq("id",f.jornada_id).maybeSingle();
  const jornada=jr.data||null;
  const libres=await vehiculosLibres();
  const vehActualId=f.vehiculo_id || jornada?.vehiculo_id || "";
  const vehActualMat=f.vehiculo_matricula || jornada?.vehiculo_matricula || "";
  const kmActual=f.km_vehiculo ?? (f.tipo==="entrada" ? jornada?.km_entrada : (f.tipo==="salida" ? jornada?.km_salida : null));

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Modificar fichaje</h2>

        <label class="zx_label">Tipo</label>
        <div class="zx_readonly_box">${iconoTipo(f.tipo)} <b>${limpiar(textoTipo(f.tipo))}</b></div>
        <input id="zx_edit_tipo" type="hidden" value="${limpiar(f.tipo)}">
        <div class="zx_help_text">Por seguridad, el tipo de fichaje no se cambia desde esta edición. Si hay una secuencia incorrecta, borra y crea el registro correcto.</div>

        <label class="zx_label">Fecha y hora</label>
        <input id="zx_edit_fecha" type="datetime-local" value="${limpiar(toInputFecha(f.created_at))}">

        <div id="zx_edit_bloque_vehiculo">
          <label class="zx_label">Vehículo</label>
          <select id="zx_edit_vehiculo">
            <option value="">Sin vehículo</option>
            ${vehActualId ? `<option value="${limpiar(vehActualId)}" data-matricula="${limpiar(vehActualMat)}" selected>${limpiar(vehActualMat||"Vehículo actual")}</option>` : ""}
            ${libres.filter(v=>String(v.id)!==String(vehActualId)).map(v=>`
              <option value="${limpiar(v.id)}" data-matricula="${limpiar(v.matricula||"")}" data-km="${limpiar(v.km_actual??0)}">
                ${limpiar(v.matricula||"")} ${limpiar(v.marca||"")} ${limpiar(v.modelo||"")} · ${limpiar(v.km_actual??0)} km
              </option>
            `).join("")}
          </select>

          <label class="zx_label">Kilómetros</label>
          <input id="zx_edit_km" type="number" inputmode="numeric" value="${limpiar(kmActual??"")}" placeholder="Km del vehículo">
        </div>

        <label class="zx_label">Dirección</label>
        <textarea id="zx_edit_direccion" rows="3" readonly>${limpiar(f.direccion||"")}</textarea>

        <label class="zx_label">Latitud</label>
        <input id="zx_edit_lat" type="number" step="any" value="${limpiar(f.lat||"")}" readonly>

        <label class="zx_label">Longitud</label>
        <input id="zx_edit_lng" type="number" step="any" value="${limpiar(f.lng||"")}" readonly>

        <div class="zx_help_text">La dirección y las coordenadas son datos de geolocalización. No se editan manualmente para conservar la trazabilidad.</div>

        <button class="zx_btn_big zx_azul" id="zx_guardar_edit_fichaje">Guardar cambios</button>
        <button class="zx_btn_big zx_gris" id="zx_cancelar_edit_fichaje">Cancelar</button>
      </div>
    </div>
  `);

  function refrescarBloqueVehiculo(){
    const tipo=document.getElementById("zx_edit_tipo").value;
    const bloque=document.getElementById("zx_edit_bloque_vehiculo");
    if(!bloque) return;
    bloque.style.display=(tipo==="entrada" || tipo==="salida") ? "block" : "none";
  }

  document.getElementById("zx_edit_tipo").onchange=refrescarBloqueVehiculo;
  refrescarBloqueVehiculo();

  const selVeh=document.getElementById("zx_edit_vehiculo");
  const inputKm=document.getElementById("zx_edit_km");
  if(selVeh && inputKm){
    selVeh.onchange=function(){
      const opt=selVeh.options[selVeh.selectedIndex];
      if(opt && opt.dataset.km && !inputKm.value) inputKm.value=opt.dataset.km;
    };
  }

  document.getElementById("zx_cancelar_edit_fichaje").onclick=cerrarModal;

  document.getElementById("zx_guardar_edit_fichaje").onclick=async function(){
    const tipo=document.getElementById("zx_edit_tipo").value;
    if(String(tipo)!==String(f.tipo)){
      alert("No se permite cambiar el tipo de fichaje desde esta edición.");
      return;
    }
    const fecha=fromInputFecha(document.getElementById("zx_edit_fecha").value);
    const direccion=document.getElementById("zx_edit_direccion").value.trim();
    const lat=document.getElementById("zx_edit_lat").value;
    const lng=document.getElementById("zx_edit_lng").value;

    const vehSelect=document.getElementById("zx_edit_vehiculo");
    const vehiculoId=vehSelect ? vehSelect.value : "";
    const vehOpt=vehSelect ? vehSelect.options[vehSelect.selectedIndex] : null;
    const vehiculoMatricula=vehOpt ? (vehOpt.dataset.matricula || vehOpt.textContent.trim().split(" ")[0] || "") : "";
    const kmTxt=document.getElementById("zx_edit_km")?.value ?? "";

    if(!fecha){
      alert("Fecha inválida.");
      return;
    }

    let kmValor=null;
    if((tipo==="entrada" || tipo==="salida") && vehiculoId){
      if(kmTxt===""){
        alert("Indica los kilómetros del vehículo.");
        return;
      }
      kmValor=Number(kmTxt);
      if(!Number.isFinite(kmValor) || kmValor<0){
        alert("Kilómetros inválidos.");
        return;
      }
    }

    if(tipo==="salida" && jornada && jornada.km_entrada!=null && kmValor!=null && kmValor<Number(jornada.km_entrada)){
      alert("Los km de salida no pueden ser menores que los km de entrada.");
      return;
    }

    const nuevoFichaje={
      ...f,
      tipo,
      created_at:fecha,
      direccion,
      lat:lat==="" ? null : Number(lat),
      lng:lng==="" ? null : Number(lng),
      vehiculo_id:(tipo==="entrada" || tipo==="salida") && vehiculoId ? String(vehiculoId) : null,
      vehiculo_matricula:(tipo==="entrada" || tipo==="salida") && vehiculoId ? String(vehiculoMatricula||"") : null,
      km_vehiculo:(tipo==="entrada" || tipo==="salida") && vehiculoId && kmValor!=null ? Number(kmValor) : null,
      modificado_por:sesion().usuario||"",
      motivo_modificacion:motivoInicial,
      modificado_en:ahora()
    };

    const rr=await sb()
      .from("fichajes")
      .update({
        tipo:nuevoFichaje.tipo,
        created_at:nuevoFichaje.created_at,
        direccion:nuevoFichaje.direccion,
        lat:nuevoFichaje.lat,
        lng:nuevoFichaje.lng,
        vehiculo_id:nuevoFichaje.vehiculo_id,
        vehiculo_matricula:nuevoFichaje.vehiculo_matricula,
        km_vehiculo:nuevoFichaje.km_vehiculo,
        modificado_por:nuevoFichaje.modificado_por,
        motivo_modificacion:nuevoFichaje.motivo_modificacion,
        modificado_en:nuevoFichaje.modificado_en
      })
      .eq("id",id);

    if(rr.error){
      alert("Error guardando: "+rr.error.message);
      return;
    }

    await actualizarVehiculoPorEdicion(f,nuevoFichaje);
    cerrarModal();

    await recalcularJornada(f.jornada_id);
    await insertarAuditoria("modificar_fichaje",detalleAuditoriaFichaje("MODIFICAR_FICHAJE",motivoInicial,f,nuevoFichaje),f.usuario_id);
    await insertarAviso(f.usuario_id,"Fichaje modificado","Se ha modificado un fichaje tuyo. Motivo: "+motivoInicial,"fichaje");

    await ZX_fichaje_real();
    restaurarScroll();
  };
}

async function verFichajesJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichajes jornada</h2>

        ${eventos.length ? eventos.map(f=>renderFichajeMini(f)).join("") : `<div class="zx_text">Sin fichajes.</div>`}

        <button class="zx_btn_big zx_gris" id="zx_cerrar_fichajes_jornada">
          Cerrar
        </button>
      </div>
    </div>
  `);

  document.getElementById("zx_cerrar_fichajes_jornada").onclick=cerrarModal;

  document.querySelectorAll("[data-editar-fichaje]").forEach(btn=>{
    btn.onclick=function(){editarFichaje(btn.dataset.editarFichaje)};
  });

  document.querySelectorAll("[data-borrar-fichaje]").forEach(btn=>{
    btn.onclick=function(){borrarFichaje(btn.dataset.borrarFichaje)};
  });
}

// ===============================
// RENDER
// ===============================
function resumenHTML(resumen,objetivoSeg,laboral=null){
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const faltaSeg=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));
  const minutosJustificados=laboral ? Number(laboral.minutosJustificados||0) : 0;
  const bloqueo=laboral ? bloqueoHorarioActual(laboral.solicitudes) : {bloqueado:false};

  const tarjetas=[
    ["Trabajado",formatoSeg(resumen.trabajadoSeg),"trabajado","zx_resumen_ok"],
    ["Descanso",formatoSeg(resumen.descansoSeg),"descanso","zx_resumen_pause"],
    ["Comida",formatoSeg(resumen.comidaSeg),"comida","zx_resumen_food"],
    ["Justificado",formatoMin(minutosJustificados),"justificado","zx_resumen_info"],
    ["Objetivo",formatoSeg(objetivoSeg),"objetivo","zx_resumen_obj"],
    ["Extra",formatoSeg(extraSeg),"extra",extraSeg>0?"zx_resumen_extra":"zx_resumen_neutral"],
    ["Falta",formatoSeg(faltaSeg),"falta",faltaSeg>0?"zx_resumen_warn":"zx_resumen_neutral"]
  ];

  return `
    <div class="zx_text">
      ${laboral && laboral.festivo ? `<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Día festivo${laboral.nombreFestivo ? ": "+limpiar(laboral.nombreFestivo) : ""}</div>` : ""}
      ${laboral && laboral.tipoAusencia ? `<div style="color:#2563eb;font-weight:900;margin-bottom:8px;">${limpiar(laboral.observacion)}</div>` : ""}
      ${bloqueo.bloqueado ? `<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Permiso activo: ${limpiar(bloqueo.inicio)} - ${limpiar(bloqueo.fin)}</div>` : ""}
    </div>

    <div class="zx_resumen_grid">
      ${tarjetas.map(t=>`
        <div class="zx_resumen_card ${t[3]}">
          <span>${limpiar(t[0])}</span>
          <b data-live-campo="${limpiar(t[2])}">${limpiar(t[1])}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function resumenLineaHTML(resumen,objetivoSeg,j=null){
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const faltaSeg=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));

  return `
    <div class="zx_jornada_resumen_grid">
      <div><span>Trab.</span><b>${formatoSeg(resumen.trabajadoSeg)}</b></div>
      <div><span>Obj.</span><b>${formatoSeg(objetivoSeg)}</b></div>
      <div><span>Desc.</span><b>${formatoSeg(resumen.descansoSeg)}</b></div>
      <div><span>Comida</span><b>${formatoSeg(resumen.comidaSeg)}</b></div>
      <div><span>Just.</span><b>${formatoMin(j ? (j.minutos_justificados||0) : 0)}</b></div>
      <div class="${extraSeg>0 ? "zx_extra_destacado" : ""}"><span>Extra</span><b>${formatoSeg(extraSeg)}</b></div>
      <div class="${faltaSeg>0 ? "zx_falta_destacada" : ""}"><span>Falta</span><b>${formatoSeg(faltaSeg)}</b></div>
    </div>
    ${textoVehiculoJornada(j)}
    ${j && j.es_festivo ? `<br><b style="color:#dc2626;">Festivo</b>` : ""}
    ${j && j.observacion_laboral ? `<br><b style="color:#2563eb;">${limpiar(j.observacion_laboral)}</b>` : ""}
  `;
}

function renderFichajeMini(f){
  const adminActivo=esAdmin();
  const urlMapa=mapaUrl(f.lat,f.lng,f.direccion);
  const dispositivo=dispositivoCorto(f.dispositivo);
  const modificado=!!(f.motivo_modificacion || f.modificado_en || f.modificado_por);

  return `
    <div class="zx_fichaje_item ${claseTipo(f.tipo)}" style="--zx-tipo-color:${colorTipo(f.tipo)}">
      <div class="zx_fichaje_head">
        <div class="zx_fichaje_tipo">
          <span>${iconoTipo(f.tipo)}</span>
          <b>${limpiar(textoTipo(f.tipo))}</b>
        </div>
        <div class="zx_fichaje_hora">${limpiar(fechaCorta(f.created_at))}</div>
      </div>

      <div class="zx_fichaje_info">
        ${textoVehiculoFichaje(f)}
        ${dispositivo ? `<div class="zx_fichaje_meta">📱 ${limpiar(dispositivo)}</div>` : ""}
        ${f.direccion ? `<div class="zx_fichaje_meta">📍 ${limpiar(direccionCorta(f.direccion))}</div>` : ""}
        ${(f.lat!=null && f.lng!=null) ? `<div class="zx_fichaje_meta zx_coord">GPS: ${limpiar(f.lat)}, ${limpiar(f.lng)}</div>` : ""}
      </div>

      ${urlMapa ? `<a class="zx_mapa_btn" href="${limpiar(urlMapa)}" target="_blank" rel="noopener">Abrir mapa</a>` : ""}

      ${modificado ? `
        <div class="zx_modificado_box">
          ✏️ Modificado por <b>${limpiar(f.modificado_por||"-")}</b><br>
          ${limpiar(fechaCorta(f.modificado_en||""))}<br>
          Motivo: ${limpiar(f.motivo_modificacion||"-")}
        </div>
      ` : ""}

      ${adminActivo ? `
        <div class="zx_edit_grid">
          <button class="zx_admin_btn zx_admin_editar" data-editar-fichaje="${f.id}">Modificar</button>
          <button class="zx_admin_btn zx_admin_borrar" data-borrar-fichaje="${f.id}">Borrar</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderJornadaMini(j,admin){
  const resumen=j.__resumen || resumenDesdeJornada(j);
  const objetivoSeg=Number(j.__objetivoSeg ?? Number(j.minutos_objetivo||0)*60);
  const abierta=j.estado==="abierta";
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const estadoTxt=String(j.estado||"-");

  return `
    <div class="zx_admin_row zx_jornada_card" ${abierta ? `data-live-jornada="${limpiar(j.id)}"` : ""}>
      <div class="zx_admin_row_top">
        <b>${limpiar(j.nombre||j.usuario||"-")}</b>
        <span>${limpiar(formatoFechaES(j.fecha||""))}</span>
      </div>

      <div class="zx_jornada_chips">
        <span class="zx_admin_estado ${limpiar(j.estado||"")}">${limpiar(estadoTxt)}</span>
        ${extraSeg>0 ? `<span class="zx_chip zx_chip_extra">Extra ${formatoSeg(extraSeg)}</span>` : ""}
        ${j.vehiculo_matricula ? `<span class="zx_chip">🚗 ${limpiar(j.vehiculo_matricula)}</span>` : ""}
      </div>

      <div class="zx_admin_data" ${abierta ? `data-live-jornada-resumen="${limpiar(j.id)}"` : ""}>
        ${resumenLineaHTML(resumen,objetivoSeg,j)}
      </div>

      ${admin ? `
        <div class="zx_edit_grid zx_jornada_acciones">
          <button class="zx_admin_btn zx_admin_editar" data-ver-fichajes-jornada="${j.id}">Fichajes</button>
          <button class="zx_admin_btn zx_admin_borrar zx_btn_borrar_peq" data-borrar-jornada="${j.id}">Borrar</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderAdminResumen(jornadasHoy){
  let totalTrabSeg=0,totalExtraSeg=0,totalFaltaSeg=0,abiertas=0,cerradas=0,festivas=0,justificadas=0;

  jornadasHoy.forEach(j=>{
    const resumen=j.__resumen || resumenDesdeJornada(j);
    const objetivoSeg=Number(j.__objetivoSeg ?? (j.segundos_objetivo!==undefined ? Number(j.segundos_objetivo||0) : Number(j.minutos_objetivo||0)*60));
    totalTrabSeg+=Math.floor(Number(resumen.trabajadoSeg||0));
    totalExtraSeg+=Math.floor(Math.max(0,Number(resumen.trabajadoSeg||0)-objetivoSeg));
    totalFaltaSeg+=Math.floor(Math.max(0,objetivoSeg-Number(resumen.trabajadoSeg||0)));
    if(j.estado==="abierta") abiertas++;
    if(j.estado==="cerrada") cerradas++;
    if(j.es_festivo) festivas++;
    if(Number(j.minutos_justificados||0)>0) justificadas++;
  });

  return `
    <div class="zx_admin_summary">
      <div><b>${jornadasHoy.length}</b><span>Jornadas</span></div>
      <div><b>${abiertas}</b><span>Abiertas</span></div>
      <div><b>${cerradas}</b><span>Cerradas</span></div>
      <div><b>${formatoSeg(totalTrabSeg)}</b><span>Trabajado</span></div>
      <div><b>${formatoSeg(totalExtraSeg)}</b><span>Extra</span></div>
      <div><b>${formatoSeg(totalFaltaSeg)}</b><span>Falta</span></div>
      <div><b>${festivas}</b><span>Festivas</span></div>
      <div><b>${justificadas}</b><span>Justificadas</span></div>
    </div>
  `;
}

function renderTodasJornadasAdmin(jornadas){
  return `
    <div class="zx_filtro_admin_jornadas">
      <label class="zx_label">Buscar</label>
      <input id="zx_admin_todas_q" type="search" value="${limpiar(ZX_FILTRO_TODAS_Q)}" placeholder="Nombre, usuario, matrícula, estado...">

      <label class="zx_label">Estado</label>
      <select id="zx_admin_todas_estado">
        <option value="" ${ZX_FILTRO_TODAS_ESTADO===""?"selected":""}>Todos</option>
        <option value="abierta" ${ZX_FILTRO_TODAS_ESTADO==="abierta"?"selected":""}>Abiertas</option>
        <option value="cerrada" ${ZX_FILTRO_TODAS_ESTADO==="cerrada"?"selected":""}>Cerradas</option>
      </select>

      <div class="zx_filtro_fechas">
        <div>
          <label class="zx_label">Desde</label>
          <input id="zx_admin_todas_desde" type="date" value="${limpiar(ZX_FILTRO_TODAS_DESDE)}">
        </div>
        <div>
          <label class="zx_label">Hasta</label>
          <input id="zx_admin_todas_hasta" type="date" value="${limpiar(ZX_FILTRO_TODAS_HASTA)}">
        </div>
      </div>

      <div class="zx_edit_grid">
        <button class="zx_admin_btn zx_admin_editar" onclick="ZX_aplicarFiltroTodasJornadas()">Buscar</button>
        <button class="zx_admin_btn zx_admin_borrar" onclick="ZX_limpiarFiltroTodasJornadas()">Limpiar</button>
      </div>
    </div>

    <div class="zx_text" style="margin-top:12px;font-weight:900;">
      Mostrando ${jornadas.length} jornada${jornadas.length===1?"":"s"} de empleados. No incluye tus propias jornadas.
    </div>

    ${jornadas.length ? jornadas.map(j=>renderJornadaMini(j,true)).join("") : `<div class="zx_text">Sin jornadas con estos filtros.</div>`}
  `;
}

// ===============================
// ESTILOS
// ===============================
function estilosAdminCompacto(){
  if(document.getElementById("zx_admin_compacto_css")) return;

  const s=document.createElement("style");
  s.id="zx_admin_compacto_css";

  s.innerHTML=`
    .zx_admin_summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0;}
    .zx_admin_summary div{background:#f1f5f9;border-radius:16px;padding:14px;text-align:center;}
    .zx_admin_summary b{display:block;font-size:23px;color:#0f172a;font-weight:900;}
    .zx_admin_summary span{font-size:13px;color:#64748b;font-weight:800;}

    .zx_admin_row{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:10px;}
    .zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:16px;color:#0f172a;font-weight:900;}
    .zx_admin_row_top span{color:#64748b;font-size:14px;white-space:nowrap;}

    .zx_admin_estado{display:inline-block;margin:8px 0;padding:5px 10px;border-radius:999px;background:#64748b;color:white;font-size:13px;font-weight:900;}
    .zx_admin_estado.abierta{background:#f59e0b}
    .zx_admin_estado.cerrada{background:#2563eb}
    .zx_admin_estado.validada{background:#7c3aed}
    .zx_admin_estado.pagada{background:#16a34a}

    .zx_admin_data{color:#64748b;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word;}
    .zx_admin_btn{width:100%;border:0;border-radius:14px;margin-top:10px;padding:12px;color:white;font-size:16px;font-weight:900;}
    .zx_admin_editar{background:#2563eb}
    .zx_admin_borrar{background:#dc2626}
    .zx_edit_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
    .zx_filtro_admin_jornadas{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:12px;}
    .zx_filtro_fechas{display:grid;grid-template-columns:1fr 1fr;gap:10px;}

    .zx_label{display:block;margin-top:14px;margin-bottom:6px;color:#64748b;font-weight:900;font-size:15px;}

    .zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;justify-content:center;align-items:center;padding:14px;z-index:9999;}
    .zx_modal_caja{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;background:white;border-radius:22px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);}
    .zx_modal_caja select,.zx_modal_caja input,.zx_modal_caja textarea{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-size:16px;font-weight:800;color:#0f172a;background:#f8fafc;}
    .zx_modal_caja input[readonly],.zx_modal_caja textarea[readonly]{background:#eef2f7;color:#64748b;}

    .zx_estado_actual{display:inline-flex;align-items:center;gap:10px;font-size:31px;font-weight:950;margin-top:10px;border:2px solid;border-radius:20px;padding:10px 14px;background:#f8fafc;}
    .zx_estado_actual span{font-size:26px}

    .zx_resumen_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px;}
    .zx_resumen_card{border-radius:16px;padding:12px;background:#f8fafc;border:1px solid #e5e7eb;}
    .zx_resumen_card span{display:block;font-size:12px;color:#64748b;font-weight:950;text-transform:uppercase;letter-spacing:.3px;}
    .zx_resumen_card b{display:block;margin-top:4px;font-size:20px;color:#0f172a;font-weight:950;}
    .zx_resumen_ok{border-color:#bbf7d0;background:#f0fdf4}
    .zx_resumen_pause{border-color:#fde68a;background:#fffbeb}
    .zx_resumen_food{border-color:#fed7aa;background:#fff7ed}
    .zx_resumen_info{border-color:#bfdbfe;background:#eff6ff}
    .zx_resumen_extra{border-color:#bbf7d0;background:#ecfdf5}
    .zx_resumen_warn{border-color:#fecaca;background:#fef2f2}

    .zx_jornada_resumen_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;}
    .zx_jornada_resumen_grid div{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:8px;}
    .zx_jornada_resumen_grid span{display:block;color:#64748b;font-size:12px;font-weight:950;}
    .zx_jornada_resumen_grid b{display:block;color:#0f172a;font-size:15px;font-weight:950;}
    .zx_extra_destacado{border-color:#86efac!important;background:#f0fdf4!important;}
    .zx_extra_destacado b{color:#16a34a!important;}
    .zx_falta_destacada{border-color:#fecaca!important;background:#fef2f2!important;}
    .zx_falta_destacada b{color:#dc2626!important;}

    .zx_jornada_chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;}
    .zx_chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#e2e8f0;color:#334155;padding:5px 10px;font-size:12px;font-weight:950;}
    .zx_chip_extra{background:#dcfce7;color:#166534;}
    .zx_jornada_acciones{grid-template-columns:1fr auto;}
    .zx_btn_borrar_peq{padding-left:14px!important;padding-right:14px!important;}

    .zx_fichaje_item{background:#f8fafc;border:1px solid #d1d5db;border-left:7px solid var(--zx-tipo-color,#64748b);border-radius:18px;padding:14px;margin-top:10px;}
    .zx_fichaje_head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .zx_fichaje_tipo{display:flex;align-items:center;gap:8px;color:#0f172a;font-size:17px;font-weight:950;}
    .zx_fichaje_hora{font-size:18px;color:#0f172a;font-weight:950;text-align:right;white-space:nowrap;}
    .zx_fichaje_info{margin-top:10px;}
    .zx_fichaje_meta{color:#475569;font-size:14px;line-height:1.4;font-weight:850;margin-top:4px;word-break:break-word;}
    .zx_coord{font-size:12px;color:#64748b;}
    .zx_mapa_btn{display:inline-block;margin-top:10px;border-radius:999px;padding:9px 12px;background:#dbeafe;color:#1d4ed8;text-decoration:none;font-size:13px;font-weight:950;}
    .zx_modificado_box{margin-top:10px;border-radius:14px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;padding:10px;font-size:13px;font-weight:850;line-height:1.4;}
    .zx_readonly_box{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-size:16px;font-weight:900;color:#0f172a;background:#eef2f7;}
    .zx_help_text{margin-top:8px;color:#64748b;font-size:13px;font-weight:850;line-height:1.35;}
    .zx_modal_contexto{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:14px;padding:10px;margin:10px 0 12px;font-size:14px;font-weight:850;line-height:1.35;}

    @media(min-width:700px){
      .zx_admin_summary{grid-template-columns:repeat(4,1fr);}
      .zx_resumen_grid{grid-template-columns:repeat(4,minmax(0,1fr));}
      .zx_jornada_resumen_grid{grid-template-columns:repeat(4,minmax(0,1fr));}
    }
  `;

  document.head.appendChild(s);
}

// ===============================
// TIEMPO REAL
// ===============================
function solicitarRenderFichaje(){
  if(ZX_RT_RENDER_TIMER) clearTimeout(ZX_RT_RENDER_TIMER);
  ZX_RT_RENDER_TIMER=setTimeout(function(){
    ZX_RT_RENDER_TIMER=null;
    if(typeof window.ZX_fichaje_real==="function") window.ZX_fichaje_real();
  },350);
}

function iniciarTiempoReal(){
  if(ZX_RT_CANAL || !sb() || !sb().channel) return;

  try{
    ZX_RT_CANAL=sb()
      .channel("zx_fichaje_rt_v3105")
      .on("postgres_changes",{event:"*",schema:"public",table:"jornadas"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"fichajes"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"horas_extra_pro"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"vehiculos"},solicitarRenderFichaje)
      .subscribe();
  }catch(e){}
}

// ===============================
// TOGGLES
// ===============================
window.ZX_toggleUltimos=function(){
  guardarScroll();
  ZX_VER_ULTIMOS=!ZX_VER_ULTIMOS;
  ZX_fichaje_real().then(restaurarScroll);
};

window.ZX_toggleAdmin=function(){
  guardarScroll();
  ZX_VER_ADMIN=!ZX_VER_ADMIN;
  ZX_fichaje_real().then(restaurarScroll);
};

window.ZX_toggleTodasJornadas=function(){
  guardarScroll();
  ZX_VER_TODAS_JORNADAS=!ZX_VER_TODAS_JORNADAS;
  ZX_fichaje_real().then(restaurarScroll);
};

window.ZX_aplicarFiltroTodasJornadas=function(){
  guardarScroll();
  ZX_FILTRO_TODAS_Q=document.getElementById("zx_admin_todas_q")?.value||"";
  ZX_FILTRO_TODAS_ESTADO=document.getElementById("zx_admin_todas_estado")?.value||"";
  ZX_FILTRO_TODAS_DESDE=document.getElementById("zx_admin_todas_desde")?.value||"";
  ZX_FILTRO_TODAS_HASTA=document.getElementById("zx_admin_todas_hasta")?.value||"";
  ZX_VER_TODAS_JORNADAS=true;
  ZX_fichaje_real().then(restaurarScroll);
};

window.ZX_limpiarFiltroTodasJornadas=function(){
  guardarScroll();
  ZX_FILTRO_TODAS_Q="";
  ZX_FILTRO_TODAS_ESTADO="";
  ZX_FILTRO_TODAS_DESDE="";
  ZX_FILTRO_TODAS_HASTA="";
  ZX_VER_TODAS_JORNADAS=true;
  ZX_fichaje_real().then(restaurarScroll);
};

window.ZX_toggleMisJornadas=function(){
  guardarScroll();
  ZX_VER_MIS_JORNADAS=!ZX_VER_MIS_JORNADAS;
  ZX_fichaje_real().then(restaurarScroll);
};

// ===============================
// ACTUALIZACIÓN EN VIVO SIN REPINTAR TODA LA PANTALLA
// ===============================
async function actualizarVivo(jornadaId,objSec,lab,jornada=null,eventosBase=null){
  try{
    const eventos=Array.isArray(eventosBase) ? eventosBase : await fichajesDeJornada(jornadaId);
    const ultimo=eventos.length ? eventos[eventos.length-1] : null;
    const estado=estadoDesdeTipo(ultimo ? ultimo.tipo : null);
    const r=calcularEnVivo(eventos,estado);

    const extra=Math.max(0,Number(r.trabajadoSeg||0)-Number(objSec||0));
    const falta=Math.max(0,Number(objSec||0)-Number(r.trabajadoSeg||0));

    const resumenCont=document.getElementById("zx_resumen_tiempo");
    if(resumenCont){
      const campos=resumenCont.querySelectorAll("[data-live-campo]");
      campos.forEach(c=>{
        const k=c.dataset.liveCampo;
        if(k==="trabajado") c.textContent=formatoSeg(r.trabajadoSeg);
        if(k==="descanso") c.textContent=formatoSeg(r.descansoSeg);
        if(k==="comida") c.textContent=formatoSeg(r.comidaSeg);
        if(k==="objetivo") c.textContent=formatoSeg(objSec);
        if(k==="extra") c.textContent=formatoSeg(extra);
        if(k==="falta") c.textContent=formatoSeg(falta);
      });
    }

    seleccionarJornadaLive(jornadaId).forEach(el=>{
      el.innerHTML=resumenLineaHTML(r,objSec,jornada);
    });
  }catch(e){}
}

// ===============================
// PANTALLA PRINCIPAL
// ===============================
window.ZX_fichaje_real=async function(){
  const renderId=++ZX_RENDER_ID;
  estilosAdminCompacto();
  iniciarTiempoReal();

  if(ZX_TIMER){
    clearInterval(ZX_TIMER);
    ZX_TIMER=null;
  }

  if(ZX_RT_RENDER_TIMER){
    clearTimeout(ZX_RT_RENDER_TIMER);
    ZX_RT_RENDER_TIMER=null;
  }

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="fichaje") b.classList.add("zx_activo");
  });

  const est=await estadoActualOptimizado();
  const adminActivo=esAdmin();

  const [hist,jornadas,adminHoy,adminTodas]=await Promise.all([
    ZX_VER_ULTIMOS ? ultimosFichajes() : Promise.resolve([]),
    ZX_VER_MIS_JORNADAS ? Promise.resolve(est.jornadasUsuario||[]) : Promise.resolve([]),
    (adminActivo && ZX_VER_ADMIN) ? jornadasAdminHoy() : Promise.resolve([]),
    (adminActivo && ZX_VER_TODAS_JORNADAS) ? jornadasAdminTodas() : Promise.resolve([])
  ]);

  const ultima=est.ultima||null;

  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0};
  let objetivoSeg=480*60;
  let laboral=null;

  if(est.jornada){
    const rv=await resumenVisualJornada(est.jornada,est.eventos);
    resumen=rv.resumen;
    objetivoSeg=rv.objetivoSeg;
    laboral=rv.laboral;
  }else if(ultima && ultima.estado==="cerrada" && String(ultima.fecha)===fechaHoyISO()){
    const rv=await resumenVisualJornada(ultima);
    resumen=rv.resumen;
    objetivoSeg=rv.objetivoSeg;
    laboral=rv.laboral;
  }else{
    laboral=await objetivoDiaPRO(fechaHoyISO());
    objetivoSeg=laboral.objetivoSeg;
  }

  if(renderId!==ZX_RENDER_ID) return;

  // Optimización V3105:
  // No se consulta Supabase cada segundo para el contador en vivo.
  // El contador usa los fichajes ya cargados y solo se refresca completo con acciones reales o tiempo real agrupado.

  const bloqueoActual=bloqueoHorarioActual(laboral ? laboral.solicitudes : []);

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>

      <div class="zx_estado_actual" style="color:${colorEstado(est.estado)};border-color:${colorEstado(est.estado)};">
        <span>${iconoEstado(est.estado)}</span>
        <b>${textoEstado(est.estado)}</b>
      </div>

      ${est.jornada && est.jornada.vehiculo_matricula ? `
        <div class="zx_text" style="margin-top:12px;">
          Vehículo: <b>${limpiar(est.jornada.vehiculo_matricula)}</b><br>
          Km entrada: <b>${limpiar(est.jornada.km_entrada??"-")}</b>
        </div>
      ` : ""}

      ${laboral && laboral.bloquearFichaje ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Fichaje bloqueado por baja médica aprobada.</div>` : ""}
      ${bloqueoActual.bloqueado ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Permiso activo: ${limpiar(bloqueoActual.inicio)} - ${limpiar(bloqueoActual.fin)}</div>` : ""}

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">
        ${limpiar(textoBotonFichar(est.estado))}
      </button>
    </div>

    <div class="zx_card">
      <h2>Resumen ${est.jornada ? "en vivo" : "última jornada"}</h2>
      <div id="zx_resumen_tiempo">
        ${resumenHTML(resumen,objetivoSeg,laboral)}
      </div>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">
        ${ZX_VER_MIS_JORNADAS ? "Ocultar mis jornadas" : "Ver mis jornadas"}
      </button>

      ${ZX_VER_MIS_JORNADAS ? (jornadas.length ? jornadas.map(j=>renderJornadaMini(j,esAdmin())).join("") : `<div class="zx_text">Sin jornadas.</div>`) : ""}
    </div>

    ${adminActivo ? `
      <div class="zx_card">
        <button class="zx_btn_big zx_gris" onclick="ZX_toggleAdmin()">
          ${ZX_VER_ADMIN ? "Ocultar panel admin" : "Ver panel admin"}
        </button>

        ${ZX_VER_ADMIN ? `
          ${renderAdminResumen(adminHoy)}
          <h3 style="font-size:24px;margin:18px 0 8px;">Hoy</h3>
          ${adminHoy.length ? adminHoy.slice(0,10).map(j=>renderJornadaMini(j,true)).join("") : `<div class="zx_text">Sin jornadas de empleados hoy. Tus propias jornadas están en "Mis jornadas".</div>`}
        ` : ""}
      </div>

      <div class="zx_card">
        <button class="zx_btn_big zx_gris" onclick="ZX_toggleTodasJornadas()">
          ${ZX_VER_TODAS_JORNADAS ? "Ocultar jornadas de usuarios" : "Ver jornadas de usuarios"}
        </button>

        ${ZX_VER_TODAS_JORNADAS ? `
          <h3 style="font-size:24px;margin:18px 0 8px;">Jornadas de usuarios</h3>
          ${renderTodasJornadasAdmin(adminTodas)}
        ` : ""}
      </div>
    ` : ""}

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleUltimos()">
        ${ZX_VER_ULTIMOS ? "Ocultar últimos fichajes" : "Ver últimos fichajes"}
      </button>

      ${ZX_VER_ULTIMOS ? (hist.length ? hist.map(h=>renderFichajeMini(h)).join("") : `<div class="zx_text">Sin registros.</div>`) : ""}
    </div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){
    abrirMenu(est.estado,est.jornada);
  };

  document.querySelectorAll("[data-editar-fichaje]").forEach(btn=>{
    btn.onclick=function(){editarFichaje(btn.dataset.editarFichaje)};
  });

  document.querySelectorAll("[data-borrar-fichaje]").forEach(btn=>{
    btn.onclick=function(){borrarFichaje(btn.dataset.borrarFichaje)};
  });

  document.querySelectorAll("[data-borrar-jornada]").forEach(btn=>{
    btn.onclick=function(){borrarJornada(btn.dataset.borrarJornada)};
  });

  document.querySelectorAll("[data-ver-fichajes-jornada]").forEach(btn=>{
    btn.onclick=function(){verFichajesJornada(btn.dataset.verFichajesJornada)};
  });

  if(est.jornada){
    const liveId=est.jornada.id;
    const liveObj=objetivoSeg;
    const liveJornada=est.jornada;
    const liveEventos=est.eventos||[];
    actualizarVivo(liveId,liveObj,laboral,liveJornada,liveEventos);
    ZX_TIMER=setInterval(function(){
      actualizarVivo(liveId,liveObj,laboral,liveJornada,liveEventos);
    },1000);
  }
};

// ===============================
// COMPATIBILIDAD
// ===============================
window.ZX_fichaje=window.ZX_fichaje_real;

// ===============================
// FIN MÓDULO
// ===============================
})();