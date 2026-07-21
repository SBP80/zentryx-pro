// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3139 - SINCRONIZACIÓN SIN CAMBIAR DE MÓDULO
// ===============================
(function(){
"use strict";

// Fichajes recién guardados que deben verse de inmediato aunque la lectura remota tarde unos instantes.
const ZX_FICHAJES_OPTIMISTAS=new Map();

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
let ZX_SYNC_TIMER=null;
let ZX_SYNC_BUSY=false;
let ZX_SYNC_FIRMA="";
let ZX_SYNC_LISTENERS=false;
let ZX_RT_ESTADO="desconectado";
let ZX_ULTIMO_RENDER_REMOTO=0;

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

function horaCorta(f){
  if(!f) return "--:--";
  const d=new Date(f);
  if(isNaN(d.getTime())) return "--:--";
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
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
  if(estado==="dentro") return "Elegir acción";
  if(estado==="descanso") return "Finalizar descanso";
  if(estado==="comida") return "Finalizar comida";
  return "Fichar";
}

function accionDirectaEstado(estado){
  if(estado==="descanso") return "fin_descanso";
  if(estado==="comida") return "fin_comida";
  return null;
}

function subtituloEstado(est){
  if(!est || !est.jornada) return "No hay jornada abierta.";
  const eventos=Array.isArray(est.eventos) ? est.eventos : [];
  const ultimo=eventos.length ? eventos[eventos.length-1] : null;
  if(!ultimo){
    const entrada=est.jornada?.entrada||est.jornada?.created_at||null;
    return entrada ? "Entrada registrada: "+horaCorta(entrada)+" · Actualizando fichajes…" : "Jornada abierta · Actualizando fichajes…";
  }
  const partes=["Último fichaje: "+textoTipo(ultimo.tipo), fechaCorta(ultimo.created_at)];
  if(ultimo.direccion) partes.push(direccionCorta(ultimo.direccion));
  return partes.filter(Boolean).join(" · ");
}

function renderBotonSeccion(titulo,subtitulo,abierto,onclick){
  return `
    <button class="zx_section_toggle ${abierto ? "abierto" : ""}" onclick="${onclick}">
      <span>${limpiar(abierto ? titulo.replace(/^Ver /,"Ocultar ") : titulo)}</span>
      ${subtitulo ? `<small>${limpiar(subtitulo)}</small>` : ""}
    </button>
  `;
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
// VEHÍCULO RÁPIDO DENTRO DE FICHAJE V3133
// ===============================
function identidadVehiculoRapido(){
  const s=sesion();
  return {
    id:String(s.id||s.usuario_id||""),
    usuario:String(s.usuario||""),
    nombre:String(s.nombre||s.usuario||"Usuario"),
    empresa_id:s.empresa_id ? String(s.empresa_id) : null
  };
}

function estadoFlotaRapido(v){
  const e=String(v?.estado_flota||"").toLowerCase();
  if(e) return e;
  return v?.en_uso ? "en_uso" : "libre";
}

function tipoAsignacionVehiculoRapido(v){
  const t=String(v?.tipo_asignacion||v?.asignacion_tipo||v?.tipo_uso||"").trim().toLowerCase();
  if(["habitual","permanente","fijo","asignado"].includes(t)) return "habitual";
  if(["temporal","reserva","reservado"].includes(t)) return t;
  // Compatibilidad con la estructura actual: si el vehículo tiene responsable y no
  // existe una fecha/estado de devolución, se considera asignación habitual.
  if((v?.usuario_actual_id||v?.usuario_asignado||v?.usuario_actual_nombre) &&
     !["pendiente_devolucion","reservado"].includes(estadoFlotaRapido(v))) return "habitual";
  return t||"temporal";
}

function esAsignacionHabitualRapido(v){
  return !!v && tipoAsignacionVehiculoRapido(v)==="habitual";
}

function vehiculoSnapshotRapido(v){
  if(!v) return null;
  return {id:String(v.id||""),matricula:v.matricula||null,km:Number(v.km_actual||0)};
}

function nombreVehiculoRapido(v){
  return [v?.matricula,v?.marca,v?.modelo].filter(Boolean).join(" · ") || "Vehículo";
}

function responsableVehiculoRapido(v){
  return String(v?.usuario_actual_nombre||v?.usuario_asignado||"").trim();
}

function esResponsableVehiculoRapido(v){
  const u=identidadVehiculoRapido();
  if(!v || !u.id) return false;
  if(String(v.usuario_actual_id||"")===u.id) return true;
  return responsableVehiculoRapido(v).toLowerCase()===u.nombre.toLowerCase();
}

function duracionUsoRapido(fecha){
  if(!fecha) return "";
  const ms=Math.max(0,Date.now()-new Date(fecha).getTime());
  if(!Number.isFinite(ms)) return "";
  const min=Math.floor(ms/60000);
  const h=Math.floor(min/60);
  const m=min%60;
  return h>0 ? `${h} h ${m} min` : `${Math.max(1,m)} min`;
}

async function cargarEstadoVehiculoRapido(){
  const u=identidadVehiculoRapido();
  const cache=zxCacheValor("vehiculoRapido",null);

  if(!u.id){
    return {actual:null,recomendado:null,vehiculos:[],offline:false};
  }

  if(zxOffline()){
    return cache ? {...cache,offline:true} : {actual:null,recomendado:null,vehiculos:[],offline:true};
  }

  try{
    const [rv,ru]=await Promise.all([
      sb().from("vehiculos").select("*").eq("activo",true).order("matricula",{ascending:true}),
      sb().from("usos_vehiculos").select("vehiculo_id,inicio_at").eq("usuario_id",u.id).order("inicio_at",{ascending:false}).limit(1)
    ]);

    if(rv.error) throw rv.error;

    const vehiculos=rv.data||[];
    const actual=vehiculos.find(v=>esResponsableVehiculoRapido(v) && ["asignado","en_uso","pendiente_devolucion"].includes(estadoFlotaRapido(v))) || null;
    const ultimoId=ru && !ru.error && ru.data && ru.data[0] ? String(ru.data[0].vehiculo_id||"") : "";
    let recomendado=vehiculos.find(v=>String(v.id)===ultimoId && estadoFlotaRapido(v)==="libre") || null;
    if(!recomendado) recomendado=vehiculos.find(v=>estadoFlotaRapido(v)==="libre") || null;
    if(!recomendado) recomendado=vehiculos.find(v=>!esResponsableVehiculoRapido(v) && estadoFlotaRapido(v)==="en_uso") || null;

    const info={actual,recomendado,vehiculos,offline:false};
    zxGuardarCache({vehiculoRapido:info});
    return info;
  }catch(e){
    return cache ? {...cache,offline:false,desactualizado:true} : {actual:null,recomendado:null,vehiculos:[],offline:false,error:true};
  }
}

function renderVehiculoRapido(info,estadoJornada){
  const actual=info?.actual||null;
  const trabajando=String(estadoJornada||"")!=="fuera";

  if(actual){
    const habitual=esAsignacionHabitualRapido(actual);
    const pendiente=estadoFlotaRapido(actual)==="pendiente_devolucion";
    return `
      <button class="zx_vehicle_strip zx_vehicle_strip_active" id="zx_vehicle_manage" type="button">
        <span class="zx_vehicle_strip_icon">🚗</span>
        <span class="zx_vehicle_strip_text">
          <small>${pendiente?"Pendiente de devolución":habitual?"Vehículo asignado":"Vehículo actual"}</small>
          <b>${limpiar(actual.matricula||"Vehículo")}</b>
          <em>${habitual&&!pendiente?"Asignación habitual · ":limpiar(duracionUsoRapido(actual.uso_iniciado_at)||"Ahora")+" · "}${limpiar(actual.km_actual??"-")} km</em>
        </span>
        <span class="zx_vehicle_strip_action">Ver vehículo ›</span>
      </button>`;
  }

  return `
    <div class="zx_vehicle_strip zx_vehicle_strip_empty">
      <span class="zx_vehicle_strip_icon">🚗</span>
      <span class="zx_vehicle_strip_text">
        <small>Vehículo</small>
        <b>Sin vehículo</b>
        <em>${trabajando ? "Puedes coger uno cuando lo necesites" : "Se elige al iniciar la jornada"}</em>
      </span>
      ${trabajando ? `<button class="zx_vehicle_strip_action zx_vehicle_take" id="zx_vehicle_choose" type="button">Coger ›</button>` : ``}
    </div>`;
}

function cerrarModalVehiculoRapido(){
  const m=document.getElementById("zx_modal_vehiculo_rapido");
  if(m) m.remove();
}

function insertarModalVehiculoRapido(html){
  cerrarModalVehiculoRapido();
  document.body.insertAdjacentHTML("beforeend",`<div id="zx_modal_vehiculo_rapido" class="zx_modal_fondo"><div class="zx_modal_caja zx_vehicle_modal">${html}</div></div>`);
}

async function posicionVehiculoRapido(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({lat:null,lng:null});return;}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),
      ()=>resolve({lat:null,lng:null}),
      {enableHighAccuracy:true,timeout:7000,maximumAge:60000}
    );
  });
}

async function asignarVehiculoRapido(v,info,km,ocupado,motivo){
  const kmBase=Number(v.km_actual||0);
  const kmFinal=Number(km);
  if(!Number.isFinite(kmFinal) || kmFinal<kmBase) throw new Error("Los kilómetros no pueden ser inferiores a los registrados.");

  const u=identidadVehiculoRapido();
  const pos=await posicionVehiculoRapido();
  const now=ahora();
  const nuevoId=uuidSeguro();
  const anterior=v.uso_actual_id||null;

  if(ocupado && anterior){
    const rc=await sb().from("usos_vehiculos").update({
      estado:"transferido",fin_at:now,km_fin:kmFinal,lat_fin:pos.lat,lng_fin:pos.lng,
      motivo_fin:"Transferido a "+u.nombre,actualizado_por:u.id
    }).eq("id",String(anterior));
    if(rc.error) throw rc.error;
  }

  const uso={
    id:nuevoId,empresa_id:u.empresa_id,vehiculo_id:String(v.id),vehiculo_matricula:v.matricula||null,
    usuario_id:u.id,usuario:u.usuario,nombre_usuario:u.nombre,estado:"en_uso",inicio_at:now,
    km_inicio:kmFinal,lat_inicio:pos.lat,lng_inicio:pos.lng,
    motivo_inicio:motivo||(ocupado?"Cambio de responsable desde Fichaje":"Uso rápido desde Fichaje"),
    dispositivo_inicio:navigator.userAgent||"",uso_anterior_id:anterior,
    usuario_anterior_id:ocupado?String(v.usuario_actual_id||"")||null:null,
    usuario_anterior_nombre:ocupado?responsableVehiculoRapido(v)||null:null,
    tomado_sin_liberacion:ocupado,seguimiento_gps_activo:v.seguimiento_gps_habilitado===true,creado_por:u.id
  };
  const ri=await sb().from("usos_vehiculos").insert([uso]);
  if(ri.error) throw ri.error;

  if(ocupado){
    const rt=await sb().from("transferencias_vehiculos").insert([{
      id:uuidSeguro(),empresa_id:u.empresa_id,vehiculo_id:String(v.id),vehiculo_matricula:v.matricula||null,
      uso_anterior_id:anterior,uso_nuevo_id:nuevoId,usuario_anterior_id:v.usuario_actual_id||null,
      nombre_anterior:responsableVehiculoRapido(v)||null,usuario_nuevo_id:u.id,usuario_nuevo:u.usuario,
      nombre_nuevo:u.nombre,estado:"confirmada",km_transferencia:kmFinal,lat:pos.lat,lng:pos.lng,
      mensaje_usuario_anterior:u.nombre+" está utilizando el vehículo "+(v.matricula||""),avisar_al_liberar:true,
      respuesta_usuario_anterior:"pendiente",motivo:"Cambio confirmado desde Fichaje",
      dispositivo:navigator.userAgent||"",confirmado_por:u.id,confirmado_at:now
    }]);
    if(rt.error) throw rt.error;
  }

  const rv=await sb().from("vehiculos").update({
    uso_actual_id:nuevoId,usuario_actual_id:u.id,usuario_actual_nombre:u.nombre,uso_iniciado_at:now,
    estado_flota:"en_uso",km_actual:kmFinal,en_uso:true,usuario_asignado:u.nombre
  }).eq("id",String(v.id));
  if(rv.error) throw rv.error;
  return {vehiculo:v,usoId:nuevoId};
}

async function usarVehiculoRapido(id,info,onSuccess){
  const v=(info?.vehiculos||[]).find(x=>String(x.id)===String(id));
  if(!v){alert("Vehículo no encontrado.");return;}
  const ocupado=estadoFlotaRapido(v)==="en_uso" && !esResponsableVehiculoRapido(v);
  if(ocupado){
    const ok=confirm(`Este vehículo lo está utilizando ${responsableVehiculoRapido(v)||"otro usuario"}.\n\n¿Quieres asumir su uso?`);
    if(!ok) return;
  }
  const kmBase=Number(v.km_actual||0);
  insertarModalVehiculoRapido(`
    <h2>${ocupado ? "🔄 Asumir vehículo" : "🚗 Coger vehículo"}</h2>
    <div class="zx_vehicle_modal_card">
      <b>${limpiar(nombreVehiculoRapido(v))}</b>
      <span>${ocupado ? "Ahora lo usa "+limpiar(responsableVehiculoRapido(v)||"otro usuario") : "Disponible"}</span>
    </div>
    <label class="zx_label">Kilómetros actuales</label>
    <input id="zx_vehicle_km_start" type="number" inputmode="decimal" value="${limpiar(kmBase)}">
    <button class="zx_btn_big zx_verde" id="zx_vehicle_use_ok">🚗 Confirmar</button>
    <button class="zx_btn_big zx_gris" id="zx_vehicle_use_cancel">Cancelar</button>
  `);
  document.getElementById("zx_vehicle_use_cancel").onclick=cerrarModalVehiculoRapido;
  document.getElementById("zx_vehicle_use_ok").onclick=async function(){
    const btn=this;btn.disabled=true;btn.textContent="Guardando...";
    try{
      const km=Number(document.getElementById("zx_vehicle_km_start").value||0);
      await asignarVehiculoRapido(v,info,km,ocupado,"Uso rápido desde Fichaje");
      cerrarModalVehiculoRapido();
      if(typeof onSuccess==="function") await onSuccess(v);
      else await window.ZX_fichaje_real();
    }catch(e){btn.disabled=false;btn.textContent="🚗 Confirmar";alert("No se pudo asignar el vehículo: "+(e.message||"Error"));}
  };
}

async function abrirSelectorVehiculoRapido(info){
  const items=(info?.vehiculos||[]).filter(v=>String(v.activo)!=="false");
  insertarModalVehiculoRapido(`
    <h2>🚗 Elegir vehículo</h2>
    <div class="zx_vehicle_picker">
      ${items.length ? items.map(v=>{
        const libre=estadoFlotaRapido(v)==="libre";
        const propio=esResponsableVehiculoRapido(v);
        return `<button class="zx_vehicle_pick" data-quick-veh="${limpiar(v.id)}">
          <span class="ico">🚗</span>
          <span class="txt"><b>${limpiar(v.matricula||"Vehículo")}</b><small>${limpiar(v.marca||"")} ${limpiar(v.modelo||"")}</small></span>
          <span class="state ${libre?"free":propio?"mine":"busy"}">${libre?"Libre":propio?"Tu vehículo":"Lo usa "+limpiar(responsableVehiculoRapido(v)||"otro")}</span>
        </button>`;
      }).join("") : `<div class="zx_text">No hay vehículos activos.</div>`}
    </div>
    <button class="zx_btn_big zx_gris" id="zx_vehicle_picker_close">Cerrar</button>
  `);
  document.getElementById("zx_vehicle_picker_close").onclick=cerrarModalVehiculoRapido;
  document.querySelectorAll("[data-quick-veh]").forEach(b=>b.onclick=function(){const id=this.dataset.quickVeh;cerrarModalVehiculoRapido();usarVehiculoRapido(id,info);});
}

async function devolverVehiculoRapido(info){
  const v=info?.actual;
  if(!v) return;
  const kmBase=Number(v.km_actual||0);
  insertarModalVehiculoRapido(`
    <h2>📤 Devolver vehículo</h2>
    <div class="zx_vehicle_modal_card"><b>${limpiar(nombreVehiculoRapido(v))}</b><span>Uso actual</span></div>
    <label class="zx_label">Kilómetros finales</label>
    <input id="zx_vehicle_km_end" type="number" inputmode="decimal" value="${limpiar(kmBase)}">
    <button class="zx_btn_big zx_verde" id="zx_vehicle_return_ok">✅ Confirmar devolución</button>
    <button class="zx_btn_big zx_gris" id="zx_vehicle_return_cancel">Cancelar</button>
  `);
  document.getElementById("zx_vehicle_return_cancel").onclick=cerrarModalVehiculoRapido;
  document.getElementById("zx_vehicle_return_ok").onclick=async function(){
    const km=Number(document.getElementById("zx_vehicle_km_end").value||0);
    if(km<kmBase){alert("Los kilómetros finales no pueden ser inferiores a los actuales.");return;}
    const btn=this;btn.disabled=true;btn.textContent="Guardando...";
    try{
      const u=identidadVehiculoRapido(); const pos=await posicionVehiculoRapido(); const now=ahora();
      if(v.uso_actual_id){
        const ru=await sb().from("usos_vehiculos").update({estado:"devuelto",fin_at:now,km_fin:km,lat_fin:pos.lat,lng_fin:pos.lng,motivo_fin:"Devolución rápida desde Fichaje",dispositivo_fin:navigator.userAgent||"",actualizado_por:u.id}).eq("id",String(v.uso_actual_id));
        if(ru.error) throw ru.error;
      }
      const rv=await sb().from("vehiculos").update({uso_actual_id:null,usuario_actual_id:null,usuario_actual_nombre:null,uso_iniciado_at:null,estado_flota:"libre",km_actual:km,en_uso:false,usuario_asignado:""}).eq("id",String(v.id));
      if(rv.error) throw rv.error;
      cerrarModalVehiculoRapido(); await window.ZX_fichaje_real();
    }catch(e){btn.disabled=false;btn.textContent="✅ Confirmar devolución";alert("No se pudo devolver el vehículo: "+(e.message||"Error"));}
  };
}

function abrirGestionVehiculoRapido(info){
  const v=info?.actual;
  if(!v) return;
  const habitual=esAsignacionHabitualRapido(v);
  const pendiente=estadoFlotaRapido(v)==="pendiente_devolucion";
  insertarModalVehiculoRapido(`
    <h2>🚗 ${limpiar(v.matricula||"Vehículo")}</h2>
    <div class="zx_vehicle_modal_card">
      <b>${limpiar(nombreVehiculoRapido(v))}</b>
      <span>${habitual&&!pendiente?"Asignación habitual":"Uso temporal"} · ${limpiar(v.km_actual??"-")} km</span>
    </div>
    <button class="zx_btn_big zx_azul" id="zx_vehicle_manage_file">📄 Ver vehículo</button>
    <button class="zx_btn_big zx_gris" id="zx_vehicle_manage_change">🔄 Cambiar vehículo</button>
    ${(!habitual||pendiente)?`<button class="zx_btn_big zx_naranja" id="zx_vehicle_manage_return">📤 Devolver vehículo</button>`:""}
    <button class="zx_btn_big zx_blanco" id="zx_vehicle_manage_close">Cerrar</button>
  `);
  document.getElementById("zx_vehicle_manage_close").onclick=cerrarModalVehiculoRapido;
  document.getElementById("zx_vehicle_manage_change").onclick=()=>{cerrarModalVehiculoRapido();abrirSelectorVehiculoRapido(info);};
  const ret=document.getElementById("zx_vehicle_manage_return");
  if(ret) ret.onclick=()=>{cerrarModalVehiculoRapido();devolverVehiculoRapido(info);};
  document.getElementById("zx_vehicle_manage_file").onclick=()=>{cerrarModalVehiculoRapido();guardarScroll();if(typeof window.ZX_vehiculos==="function") window.ZX_vehiculos();};
}

function abrirInicioJornadaSimple(info){
  const libres=(info?.vehiculos||[]).filter(v=>estadoFlotaRapido(v)==="libre");
  const rec=info?.recomendado && estadoFlotaRapido(info.recomendado)==="libre" ? info.recomendado : (libres[0]||null);
  const kmBase=Number(rec?.km_actual||0);

  insertarModalVehiculoRapido(`
    <h2>▶️ Empezar jornada</h2>
    ${rec ? `
      <div class="zx_start_vehicle_choice">
        <div class="zx_start_vehicle_title"><span>🚗</span><div><small>Vehículo habitual</small><b>${limpiar(rec.matricula||"Vehículo")}</b></div></div>
        <label class="zx_label">Kilómetros actuales</label>
        <input id="zx_start_vehicle_km" type="number" inputmode="decimal" value="${limpiar(kmBase)}">
        <button class="zx_btn_big zx_verde" id="zx_start_with_vehicle">🚗 Empezar con ${limpiar(rec.matricula||"vehículo")}</button>
      </div>` : ``}
    <button class="zx_btn_big zx_azul" id="zx_start_without_vehicle">👤 Empezar sin vehículo</button>
    ${libres.length>1 ? `<button class="zx_btn_big zx_gris" id="zx_start_other_vehicle">🔎 Elegir otro</button>` : ``}
    <button class="zx_btn_big zx_blanco" id="zx_start_cancel">Cancelar</button>
  `);

  document.getElementById("zx_start_cancel").onclick=cerrarModalVehiculoRapido;
  document.getElementById("zx_start_without_vehicle").onclick=async function(){
    const btn=this;btn.disabled=true;btn.textContent="Iniciando...";
    cerrarModalVehiculoRapido();
    await registrar("entrada",{});
  };
  const withVeh=document.getElementById("zx_start_with_vehicle");
  if(withVeh) withVeh.onclick=async function(){
    const btn=this;btn.disabled=true;btn.textContent="Iniciando...";
    try{
      const km=Number(document.getElementById("zx_start_vehicle_km").value||0);
      await asignarVehiculoRapido(rec,info,km,false,"Vehículo elegido al iniciar jornada");
      cerrarModalVehiculoRapido();
      await registrar("entrada",{vehiculo:{id:String(rec.id),matricula:rec.matricula||null,km}});
    }catch(e){btn.disabled=false;btn.textContent="🚗 Empezar con "+String(rec.matricula||"vehículo");alert("No se pudo iniciar: "+(e.message||"Error"));}
  };
  const other=document.getElementById("zx_start_other_vehicle");
  if(other) other.onclick=()=>{cerrarModalVehiculoRapido();abrirSelectorVehiculoRapido(info);};
}

function enlazarVehiculoRapido(info){
  const choose=document.getElementById("zx_vehicle_choose");
  if(choose) choose.onclick=()=>abrirSelectorVehiculoRapido(info);
  const manage=document.getElementById("zx_vehicle_manage");
  if(manage) manage.onclick=()=>abrirGestionVehiculoRapido(info);
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
// CONFIGURACIÓN HISTÓRICA DE JORNADA
// ===============================
function numeroSeguro(v,def=0){
  const n=Number(v);
  return Number.isFinite(n) ? n : Number(def||0);
}

function horaSQL(v){
  if(v===null || v===undefined || v==="") return null;
  const txt=String(v).trim();
  if(!txt) return null;
  return txt.length>=8 ? txt.slice(0,8) : txt.slice(0,5);
}

async function horarioUsuarioActivo(usuarioId){
  if(zxOffline()) return null;
  try{
    const r=await sb()
      .from("horarios_usuario")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("activo",true)
      .order("actualizado_en",{ascending:false})
      .limit(1);
    if(!r.error && r.data && r.data.length) return r.data[0];
  }catch(e){}

  try{
    const r=await sb()
      .from("horarios_usuario")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("activo",true)
      .limit(1);
    if(!r.error && r.data && r.data.length) return r.data[0];
  }catch(e){}

  return null;
}

async function configControlUsuario(usuarioId){
  if(zxOffline()) return null;

  for(const campo of ["user_id","usuario_id"]){
    try{
      const r=await sb()
        .from("config_control_fichaje")
        .select("*")
        .eq(campo,String(usuarioId))
        .limit(1);
      if(!r.error && r.data && r.data.length) return r.data[0];
    }catch(e){}
  }

  return null;
}

function valorDiaHorario(h,dia){
  if(!h) return 0;
  return Math.max(0,numeroSeguro(h[dia],0));
}

function jornadaTieneSnapshot(j){
  return !!(j && (j.config_copiada_en || j.config_origen==="snapshot_jornada_v1"));
}

function valorSnapshotComparable(v){
  if(v===null || v===undefined || v==="") return null;
  if(typeof v==="boolean") return v;
  const n=Number(v);
  if(Number.isFinite(n) && String(v).trim()!=="") return n;
  return String(v).trim();
}

function segundosOrdinariosJornada(j){
  if(!j) return 0;

  const trabajados=(j.segundos_trabajados!==undefined && j.segundos_trabajados!==null)
    ? Math.max(0,numeroSeguro(j.segundos_trabajados,0))
    : Math.max(0,numeroSeguro(j.minutos_trabajados,0)*60);

  const objetivo=(j.segundos_objetivo!==undefined && j.segundos_objetivo!==null)
    ? Math.max(0,numeroSeguro(j.segundos_objetivo,0))
    : Math.max(0,numeroSeguro(j.minutos_objetivo,0)*60);

  return Math.min(trabajados,objetivo);
}

function cambioConfiguracionEntreJornadas(anterior,snapshotActual){
  if(!anterior || !snapshotActual || !jornadaTieneSnapshot(anterior)) return false;

  const campos=[
    "config_dia_semana",
    "config_minutos_dia",
    "config_horas_semana",
    "config_hora_entrada",
    "config_hora_salida",
    "config_margen_entrada",
    "config_margen_salida",
    "config_descanso_max",
    "config_comida_max",
    "config_jornada_max_horas",
    "config_es_dia_laborable",
    "config_vacaciones_anuales",
    "config_asuntos_propios_horas",
    "config_precio_extra",
    "config_precio_extra_nocturna",
    "config_precio_extra_festiva",
    "config_pais",
    "config_comunidad",
    "config_provincia",
    "config_localidad",
    "config_convenio"
  ];

  return campos.some(campo=>{
    return valorSnapshotComparable(anterior[campo])!==valorSnapshotComparable(snapshotActual[campo]);
  });
}

async function crearSnapshotConfiguracion(fecha,usuarioId,laboral,objetivoSeg){
  const [h,control]=await Promise.all([
    horarioUsuarioActivo(usuarioId),
    configControlUsuario(usuarioId)
  ]);

  const dia=diaSemana(fecha);
  const minutosDia=h ? valorDiaHorario(h,dia) : Math.floor(numeroSeguro(objetivoSeg,0)/60);
  const esLaborable=minutosDia>0;

  return {
    config_copiada_en:ahora(),
    config_dia_semana:dia,
    config_minutos_dia:minutosDia,
    config_horas_semana:numeroSeguro(h?.horas_semana,0),
    config_hora_entrada:horaSQL(control?.entrada ?? control?.hora_entrada ?? h?.entrada ?? h?.hora_entrada),
    config_hora_salida:horaSQL(control?.salida ?? control?.hora_salida ?? h?.salida ?? h?.hora_salida),
    config_margen_entrada:Math.max(0,numeroSeguro(control?.margen_entrada,0)),
    config_margen_salida:Math.max(0,numeroSeguro(control?.margen_salida,0)),
    config_descanso_max:Math.max(0,numeroSeguro(control?.descanso_max ?? control?.descanso_min ?? h?.descanso_min ?? h?.minutos_descanso,0)),
    config_comida_max:Math.max(0,numeroSeguro(control?.comida_max,0)),
    config_jornada_max_horas:Math.max(0,numeroSeguro(control?.jornada_max_horas,0)),
    config_es_dia_laborable:esLaborable,
    config_vacaciones_anuales:Math.max(0,numeroSeguro(h?.vacaciones,0)),
    config_asuntos_propios_horas:Math.max(0,numeroSeguro(h?.asuntos_horas ?? h?.asuntos,0)),
    config_precio_extra:Math.max(0,numeroSeguro(h?.precio_extra ?? h?.precio_hora ?? h?.precio_hora_extra,0)),
    config_precio_extra_nocturna:Math.max(0,numeroSeguro(h?.precio_extra_nocturna ?? h?.precio_hora_extra_nocturna,0)),
    config_precio_extra_festiva:Math.max(0,numeroSeguro(h?.precio_extra_festiva ?? h?.precio_hora_extra_festiva,0)),
    config_pais:String(h?.pais ?? laboral?.pais ?? ""),
    config_comunidad:String(h?.comunidad ?? ""),
    config_provincia:String(h?.provincia ?? ""),
    config_localidad:String(h?.localidad ?? ""),
    config_convenio:String(h?.convenio ?? ""),
    config_origen:"snapshot_jornada_v1"
  };
}

function laboralDesdeJornada(j){
  let objetivoSeg=(j?.segundos_objetivo!==undefined && j?.segundos_objetivo!==null)
    ? numeroSeguro(j.segundos_objetivo,0)
    : Math.round(numeroSeguro(j?.minutos_objetivo,0)*60);

  // Si la jornada ya tiene una copia histórica válida, esa copia manda.
  // Corrige también jornadas creadas con segundos_objetivo=0 por el fallo anterior.
  if(
    jornadaTieneSnapshot(j) &&
    numeroSeguro(j?.config_minutos_dia,0)>0 &&
    objetivoSeg<=0
  ){
    objetivoSeg=Math.round(numeroSeguro(j.config_minutos_dia,0)*60);
  }

  return {
    objetivoSeg,
    objetivoBaseSeg:jornadaTieneSnapshot(j)
      ? Math.max(0,numeroSeguro(j?.config_minutos_dia,0)*60)
      : objetivoSeg,
    minutosJustificados:numeroSeguro(j?.minutos_justificados,0),
    tipoAusencia:j?.tipo_ausencia||null,
    observacion:j?.observacion_laboral||"",
    solicitudId:j?.solicitud_id||null,
    bloquearFichaje:false,
    solicitudes:[],
    festivo:!!j?.es_festivo,
    tipoFestivo:j?.tipo_festivo||null,
    nombreFestivo:null,
    snapshot:jornadaTieneSnapshot(j)
  };
}

function precioExtraJornada(j,laboral){
  if(!j) return 0;
  if(laboral?.festivo || j.es_festivo){
    const festiva=numeroSeguro(j.config_precio_extra_festiva,0);
    if(festiva>0) return festiva;
  }
  return Math.max(0,numeroSeguro(j.config_precio_extra,0));
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
  const jid=String(jornadaId||"");
  const optimistas=Array.from(ZX_FICHAJES_OPTIMISTAS.values()).filter(f=>String(f.jornada_id)===jid);

  if(zxOffline()){
    const base=zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===jid);
    return fusionarFichajes(base,optimistas);
  }

  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("jornada_id",jid)
      .order("created_at",{ascending:true});

    if(r.error) return fusionarFichajes(zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===jid),optimistas);

    const remotos=r.data||[];
    const idsRemotos=new Set(remotos.map(f=>String(f.id||"")));
    optimistas.forEach(f=>{
      if(f.id && idsRemotos.has(String(f.id))) ZX_FICHAJES_OPTIMISTAS.delete(String(f.id));
    });

    const cache=zxLeerCache();
    const otros=(Array.isArray(cache.fichajes)?cache.fichajes:[]).filter(f=>String(f.jornada_id)!==jid);
    const unidos=fusionarFichajes(remotos,Array.from(ZX_FICHAJES_OPTIMISTAS.values()).filter(f=>String(f.jornada_id)===jid));
    zxGuardarCache({fichajes:otros.concat(unidos)});
    return unidos;
  }catch(e){
    return fusionarFichajes(zxCacheLista("fichajes").filter(f=>String(f.jornada_id)===jid),optimistas);
  }
}

function fusionarFichajes(base,extra){
  const mapa=new Map();
  [...(base||[]),...(extra||[])].forEach(f=>{
    if(!f) return;
    const clave=String(f.id||f.__zx_operacion_id||[f.jornada_id,f.tipo,f.created_at].join("|"));
    mapa.set(clave,f);
  });
  return Array.from(mapa.values()).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
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
  // El objetivo guardado en la jornada manda siempre.
  // Una jornada adicional solo tendrá objetivo 0 cuando así se guardó al crearla,
  // nunca por el texto de su observación.
  let objetivoSeg=Number(laboral?.objetivoSeg||0);

  if(j && j.estado==="cerrada"){
    const guardadoSeg=(j.segundos_objetivo!==undefined && j.segundos_objetivo!==null)
      ? Number(j.segundos_objetivo||0)
      : Math.round(Number(j.minutos_objetivo||0)*60);

    if(guardadoSeg>0) objetivoSeg=guardadoSeg;
  }

  if(
    objetivoSeg<=0 &&
    jornadaTieneSnapshot(j) &&
    Number(j?.config_minutos_dia||0)>0
  ){
    objetivoSeg=Math.round(Number(j.config_minutos_dia||0)*60);
  }

  return Math.max(0,objetivoSeg);
}

async function resumenVisualJornada(j,eventosPrecargados=null){
  if(!j) return {resumen:{trabajadoSeg:0,descansoSeg:0,comidaSeg:0},objetivoSeg:0,laboral:null,eventos:[],estado:"fuera"};

  // La jornada siempre se muestra con la configuración que quedó guardada al crearla.
  // Nunca se vuelve a leer el horario actual para reinterpretar una jornada anterior.
  const laboral=laboralDesdeJornada(j);
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

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(textoBotonFichar(estado))}</h2>

        ${estado!=="fuera" && jornadaActual ? `
          <div class="zx_modal_contexto">
            Jornada iniciada: <b>${limpiar(fechaCorta(jornadaActual.entrada||jornadaActual.created_at||""))}</b><br>
            Estado actual: <b>${limpiar(textoEstado(estado))}</b>
          </div>
        ` : ""}

        <div class="zx_modal_contexto" style="margin-bottom:12px;">
          El uso de vehículos se gestiona de forma independiente desde el módulo <b>Vehículos</b>.
          Puedes iniciar o finalizar la jornada sin coger ni devolver ningún vehículo.
        </div>

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

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.fichaje;
      const ok=confirm("Confirmar fichaje: "+textoTipo(tipo)+"\n\n¿Seguro que quieres guardar este registro?");
      if(!ok) return;
      cerrarModal();
      registrar(tipo);
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
  const snapshot=await crearSnapshotConfiguracion(fecha,s.id,laboral,laboral.objetivoSeg);

  // El objetivo de esta jornada se fija con la copia histórica recién creada.
  // Los cambios posteriores nunca alteran jornadas ya creadas.
  let objetivoMin=Math.max(0,Math.floor(Number(snapshot.config_minutos_dia||0)));

  const ultimaCerrada=cerradas.length
    ? [...cerradas].sort((a,b)=>new Date(b.created_at||b.entrada||0)-new Date(a.created_at||a.entrada||0))[0]
    : null;

  // Cuando hay varias jornadas el mismo día con la misma configuración,
  // la nueva jornada recibe únicamente el objetivo pendiente del día.
  // Así, el tiempo ya trabajado no se convierte por error en horas extra.
  // Si la configuración cambió, la nueva jornada conserva el objetivo completo
  // de la nueva configuración y las jornadas anteriores no se modifican.
  const configuracionCambio=!!(ultimaCerrada && cambioConfiguracionEntreJornadas(ultimaCerrada,snapshot));
  const esJornadaContinuacion=!!(cerradas.length && !configuracionCambio);

  let objetivoSeg=objetivoMin*60;

  if(esJornadaContinuacion && ultimaCerrada){
    // La continuación parte únicamente del objetivo pendiente de la jornada
    // cerrada inmediatamente anterior. Así evitamos descontar otra vez jornadas
    // antiguas del mismo día o registros de prueba y mantenemos una cadena exacta:
    // objetivo anterior - tiempo ordinario realmente trabajado.
    const objetivoAnteriorSeg=(ultimaCerrada.segundos_objetivo!==undefined && ultimaCerrada.segundos_objetivo!==null)
      ? Math.max(0,numeroSeguro(ultimaCerrada.segundos_objetivo,0))
      : Math.max(0,numeroSeguro(ultimaCerrada.minutos_objetivo,0)*60);

    const ordinarioAnteriorSeg=segundosOrdinariosJornada(ultimaCerrada);
    objetivoSeg=Math.max(0,objetivoAnteriorSeg-ordinarioAnteriorSeg);
    objetivoMin=Math.ceil(objetivoSeg/60);
  }

  let observacion=laboral.observacion;

  if(esJornadaContinuacion && objetivoSeg<=0 && motivoAdmin){
    observacion="Jornada extra creada por administrador. Motivo: "+motivoAdmin;
  }else if(esJornadaContinuacion && objetivoSeg<=0){
    observacion="Jornada adicional del mismo día, con el objetivo diario ya completado.";
  }else if(esJornadaContinuacion){
    observacion="Continuación de la jornada del mismo día. Objetivo pendiente conservado.";
  }else if(configuracionCambio){
    observacion=[observacion,"Nueva jornada iniciada tras un cambio de configuración laboral."].filter(Boolean).join(" ");
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
    segundos_trabajados:0,
    segundos_descanso:0,
    segundos_comida:0,
    segundos_objetivo:objetivoSeg,
    segundos_extra:0,
    segundos_faltantes:objetivoSeg,
    vehiculo_id:datosVehiculo&&datosVehiculo.id?String(datosVehiculo.id):null,
    vehiculo_matricula:datosVehiculo&&datosVehiculo.matricula?String(datosVehiculo.matricula):null,
    km_entrada:datosVehiculo&&datosVehiculo.km!=null?Number(datosVehiculo.km):null,
    km_salida:null,
    created_at:ahora(),
    ...snapshot
  };

  const r=await sb().from("jornadas").insert([datos]).select().single();

  if(r.error){
    alert("Error creando jornada: "+r.error.message);
    return null;
  }

  if(esJornadaContinuacion){
    const objetivoCompletado=objetivoSeg<=0;
    await insertarAuditoria(
      objetivoCompletado && motivoAdmin ? "crear_jornada_extra_admin" : (objetivoCompletado ? "crear_jornada_adicional" : "continuar_jornada_mismo_dia"),
      objetivoCompletado
        ? (motivoAdmin ? "Jornada extra creada por admin. Motivo: "+motivoAdmin : "Jornada adicional creada con el objetivo diario ya completado.")
        : "Nueva jornada del mismo día creada con el objetivo pendiente, sin recalcular las jornadas anteriores.",
      s.id
    );

    await insertarAviso(
      s.id,
      objetivoCompletado && motivoAdmin ? "Jornada extra creada" : (objetivoCompletado ? "Jornada adicional creada" : "Jornada continuada"),
      objetivoCompletado
        ? (motivoAdmin ? "Se ha creado una jornada extra. Motivo: "+motivoAdmin : "Se ha creado una jornada adicional porque el objetivo diario ya estaba completado.")
        : "Se ha creado una nueva jornada con el tiempo pendiente del objetivo diario.",
      "fichaje"
    );
  }else if(configuracionCambio){
    await insertarAuditoria(
      "crear_jornada_nueva_configuracion",
      "Nueva jornada creada con la configuración laboral vigente, sin modificar jornadas anteriores.",
      s.id
    );
  }

  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo,veh=null,operacionId=null){
  const s=sesion();
  const payload={
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
  };

  const r=await sb().from("fichajes").insert([payload]).select("*").single();

  if(r.error){
    alert("Error al guardar fichaje: "+r.error.message);
    return null;
  }

  const guardado={...(r.data||payload),__zx_operacion_id:operacionId||null,__zx_optimista:true};
  const clave=String(guardado.id||operacionId||[guardado.jornada_id,guardado.tipo,guardado.created_at].join("|"));
  ZX_FICHAJES_OPTIMISTAS.set(clave,guardado);

  const cache=zxLeerCache();
  const lista=Array.isArray(cache.fichajes)?cache.fichajes:[];
  zxGuardarCache({fichajes:fusionarFichajes(lista,[guardado])});
  return guardado;
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
  // El precio también pertenece a la configuración histórica de esta jornada.
  // No se usa el precio vigente del usuario para modificar horas ya registradas.
  const precioHora=precioExtraJornada(jornada,laboral);
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
    // El vehículo actual se gestiona desde usos_vehiculos. Borrar una jornada
    // histórica nunca debe liberar ni reasignar un vehículo de la flota.
    await sb().from("horas_extra_pro").delete().eq("jornada_id",String(jornadaId));
    await sb().from("jornadas").delete().eq("id",jornadaId);
    return;
  }

  const ultimo=eventos[eventos.length-1];
  const nuevoEstado=ultimo && ultimo.tipo==="salida" ? "cerrada" : "abierta";
  const estadoCalculo=estadoDesdeTipo(ultimo ? ultimo.tipo : null);

  const c=calcularEnVivo(eventos,estadoCalculo);

  // Regla histórica: una vez creada la jornada, su objetivo y sus condiciones
  // salen solo de la propia fila de jornadas. Los cambios posteriores del usuario
  // se aplicarán únicamente a jornadas nuevas.
  const laboral=laboralDesdeJornada(jornada);
  let objetivoSeg=objetivoJornadaSeg(jornada,laboral);

  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);

  await sincronizarHorasExtra(jornadaId,c,laboral,extraSeg,jornada);

  const entradaVehiculo=eventos.find(f=>f.tipo==="entrada" && (f.vehiculo_id||f.vehiculo_matricula));
  const salidaVehiculo=[...eventos].reverse().find(f=>f.tipo==="salida" && (f.vehiculo_id||f.vehiculo_matricula));

  const datos={
    salida:c.salida,

    // El kilometraje de la jornada sale de los fichajes de entrada/salida.
    // No modifica la asignación ni libera el vehículo habitual.
    vehiculo_id:entradaVehiculo?.vehiculo_id || jornada.vehiculo_id || null,
    vehiculo_matricula:entradaVehiculo?.vehiculo_matricula || jornada.vehiculo_matricula || null,
    km_entrada:entradaVehiculo?.km_vehiculo ?? jornada.km_entrada ?? null,
    km_salida:salidaVehiculo?.km_vehiculo ?? jornada.km_salida ?? null,

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

    // No se sobrescriben festivo, ausencia, solicitud ni snapshot de configuración.
    // Esos datos quedaron fijados al abrir la jornada.
    estado:nuevoEstado
  };

  const r=await sb().from("jornadas").update(datos).eq("id",jornadaId);

  if(r.error){
    alert("Error recalculando jornada: "+r.error.message);
  }
}

async function snapshotVehiculoJornada(tipo,jornada,vehiculoExplicito){
  if(vehiculoExplicito) return vehiculoExplicito;

  try{
    // En la entrada se enlaza automáticamente el vehículo habitual ya asignado.
    if(tipo==="entrada"){
      const info=await cargarEstadoVehiculoRapido();
      if(info?.actual && esAsignacionHabitualRapido(info.actual)){
        return vehiculoSnapshotRapido(info.actual);
      }
      return null;
    }

    // En la salida se toma el kilometraje actual del mismo vehículo de la jornada.
    // Si no puede leerse, se conserva el dato histórico sin bloquear el fichaje.
    if(tipo==="salida" && jornada?.vehiculo_id){
      const v=await vehiculoPorId(jornada.vehiculo_id);
      if(v) return vehiculoSnapshotRapido(v);
      return {
        id:String(jornada.vehiculo_id),
        matricula:jornada.vehiculo_matricula||null,
        km:jornada.km_salida ?? jornada.km_entrada ?? null
      };
    }
  }catch(e){}

  return null;
}

function notificarCambioFichaje(tipo,jornadaId){
  const detalle={tipo,jornada_id:String(jornadaId||""),usuario_id:String(sesion().id||""),at:Date.now()};
  [
    "zentryx:fichaje-actualizado",
    "zentryx:jornada-actualizada",
    "zentryx:inicio-refresh",
    "zentryx:vehiculos-refresh",
    "zentryx:agenda-refresh",
    "zentryx:horas-refresh"
  ].forEach(nombre=>{
    try{window.dispatchEvent(new CustomEvent(nombre,{detail:detalle}));}catch(e){}
  });
}


async function refrescarDiaActual(tipo,jornadaId,fichajeGuardado=null){
  notificarCambioFichaje(tipo,jornadaId);

  // Primer render inmediato con el evento ya confirmado por Supabase.
  await window.ZX_fichaje_real();

  // Segunda lectura corta para sustituir el evento optimista por el registro remoto definitivo.
  // No bloquea la interfaz y corrige posibles retrasos de lectura o caché.
  setTimeout(async()=>{
    try{
      await fichajesDeJornada(jornadaId);
      if(typeof window.ZX_fichaje_real==="function") await window.ZX_fichaje_real();
    }catch(e){}
  },350);
}

let ZX_MOTOR_JORNADA_EN_CURSO=false;
let ZX_MOTOR_JORNADA_ULTIMA_OPERACION=null;

function idOperacionMotor(tipo){
  return ["jornada",String(sesion().id||"sin_usuario"),String(tipo||"evento"),Date.now(),Math.random().toString(36).slice(2,8)].join(":");
}

function detalleMotorJornada(tipo,jornada,vehiculo,geo,operacionId){
  const partes=[
    "Motor de jornada: "+textoTipo(tipo),
    "Operación: "+operacionId,
    jornada?.id ? "Jornada: "+String(jornada.id) : null,
    vehiculo?.matricula ? "Vehículo: "+String(vehiculo.matricula) : "Sin vehículo asociado",
    vehiculo?.km!=null ? "Km: "+String(vehiculo.km) : null,
    geo?.lat!=null && geo?.lng!=null ? "GPS registrado" : "GPS no disponible"
  ].filter(Boolean);
  return partes.join(" · ");
}

async function ejecutarMotorJornada(tipo,opciones={}){
  if(ZX_MOTOR_JORNADA_EN_CURSO){
    console.warn("[Zentryx Fichaje] Operación ignorada: el motor de jornada ya está procesando otra acción.");
    return false;
  }

  ZX_MOTOR_JORNADA_EN_CURSO=true;
  const operacionId=idOperacionMotor(tipo);
  ZX_MOTOR_JORNADA_ULTIMA_OPERACION=operacionId;

  try{
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

  if(tipo==="entrada"){
    const jornadasDia=await jornadasUsuarioFecha(s.id,fecha);
    const cerradas=jornadasDia.filter(j=>j.estado==="cerrada");

    if(cerradas.length){
      const continuar=confirm(
        "Ya existe una jornada cerrada hoy.\n\n"+
        "¿Quieres iniciar una nueva jornada?"
      );
      if(!continuar) return;
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

  const vehiculoExplicito=opciones&&opciones.vehiculo ? opciones.vehiculo : null;
  const vehiculoEvento=await snapshotVehiculoJornada(tipo,jornada,vehiculoExplicito);

  if(tipo==="entrada"){
    jornada=await crearJornada(motivoAdmin,vehiculoEvento);
    if(!jornada) return;
  }

  const geo=await obtenerUbicacion();
  const fichajeGuardado=await insertarFichaje(tipo,jornada.id,geo,vehiculoEvento,operacionId);
  if(!fichajeGuardado){
    if(tipo==="entrada"){
      await recalcularJornada(jornada.id);
    }
    return;
  }

  await recalcularJornada(jornada.id);

  if(tipo==="salida"){
    await crearEventoAgendaExtra(jornada.id);
  }

  await insertarAuditoria(
    "motor_jornada_"+tipo,
    detalleMotorJornada(tipo,jornada,vehiculoEvento,geo,operacionId),
    s.id
  );

  await refrescarDiaActual(tipo,jornada.id,fichajeGuardado);
  restaurarScroll();
  return true;
  }catch(error){
    console.error("[Zentryx Fichaje] Error en motor de jornada",error);
    try{
      await insertarAuditoria(
        "motor_jornada_error",
        "Operación "+operacionId+" · "+textoTipo(tipo)+" · "+String(error?.message||error),
        sesion().id
      );
    }catch(e){}
    alert("No se pudo completar el fichaje. Comprueba la conexión y vuelve a intentarlo.");
    return false;
  }finally{
    ZX_MOTOR_JORNADA_EN_CURSO=false;
  }
}

async function registrar(tipo,opciones={}){
  return ejecutarMotorJornada(tipo,opciones);
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

  const ok=confirm("Vas a eliminar la jornada completa y todos sus fichajes. Esta acción recalculará horas y horas extra, pero no modificará el uso actual de ningún vehículo. ¿Deseas continuar?");
  if(!ok) return;

  const fichajesAntes=await fichajesDeJornada(id);

  // Los datos de vehículo que pueda contener una jornada antigua son históricos.
  // Su borrado no modifica la asignación actual de la flota.
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

  const ok=confirm("Vas a eliminar este fichaje. Esta acción puede modificar el tiempo trabajado, las horas extra y el estado de la jornada, pero no modificará el uso actual de ningún vehículo. ¿Deseas continuar?");
  if(!ok) return;

  const r=await sb().from("fichajes").delete().eq("id",id);

  if(r.error){
    alert("Error eliminando fichaje: "+r.error.message);
    return;
  }

  const restantes=await fichajesDeJornada(r0.data.jornada_id);

  if(!restantes.length){
    const j0=await sb().from("jornadas").select("*").eq("id",r0.data.jornada_id).maybeSingle();
    // El vehículo actual se controla mediante usos_vehiculos, no mediante
    // el fichaje histórico que se está eliminando.
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
  const jornadaRes=await sb().from("jornadas").select("vehiculo_id,vehiculo_matricula").eq("id",jornadaId).maybeSingle();
  const jornada=jornadaRes.data||null;

  const vehId=nuevoFichaje.vehiculo_id||jornada?.vehiculo_id||null;
  const matricula=nuevoFichaje.vehiculo_matricula||jornada?.vehiculo_matricula||null;
  const km=nuevoFichaje.km_vehiculo==="" || nuevoFichaje.km_vehiculo==null ? null : Number(nuevoFichaje.km_vehiculo);

  // Compatibilidad con jornadas antiguas: solo se actualiza su información
  // histórica. Nunca se cambia el responsable actual del vehículo, porque esa
  // responsabilidad pertenece a usos_vehiculos.
  if(tipo==="entrada"){
    await sb().from("jornadas").update({
      vehiculo_id:vehId?String(vehId):null,
      vehiculo_matricula:matricula?String(matricula):null,
      km_entrada:km==null?null:Number(km)
    }).eq("id",jornadaId);
  }

  if(tipo==="salida"){
    const data={km_salida:km==null?null:Number(km)};
    if(vehId && !jornada?.vehiculo_id){
      data.vehiculo_id=String(vehId);
      data.vehiculo_matricula=matricula?String(matricula):null;
    }
    await sb().from("jornadas").update(data).eq("id",jornadaId);
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
function objetivoVisualSeg(jornada,objetivoCalculoSeg){
  // El objetivo mostrado debe ser la jornada configurada para ese día.
  // El cálculo de falta y extra mantiene el objetivo pendiente de la jornada
  // para conservar correctamente las continuaciones del mismo día.
  const minutosConfig=Number(jornada?.config_minutos_dia||0);
  if(minutosConfig>0) return Math.max(0,Math.round(minutosConfig*60));

  const segundosGuardados=Number(jornada?.segundos_objetivo||0);
  const minutosGuardados=Number(jornada?.minutos_objetivo||0);
  if(segundosGuardados>0) return Math.max(0,Math.round(segundosGuardados));
  if(minutosGuardados>0) return Math.max(0,Math.round(minutosGuardados*60));

  return Math.max(0,Number(objetivoCalculoSeg||0));
}

function resumenHTML(resumen,objetivoSeg,laboral=null,jornada=null){
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const faltaSeg=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));
  const ordinarioSeg=Math.min(Number(resumen.trabajadoSeg||0),Number(objetivoSeg||0));
  const minutosJustificados=laboral ? Number(laboral.minutosJustificados||0) : Number(jornada?.minutos_justificados||0);
  const bloqueo=laboral ? bloqueoHorarioActual(laboral.solicitudes) : {bloqueado:false};
  const objetivoMostradoSeg=objetivoVisualSeg(jornada,objetivoSeg);

  const tarjetas=[
    ["Entrada",horaCorta(resumen.entrada||jornada?.entrada),"entrada_hora","zx_resumen_info"],
    ["Salida",horaCorta(resumen.salida||jornada?.salida),"salida_hora","zx_resumen_info"],
    ["Trabajado",formatoSeg(resumen.trabajadoSeg),"trabajado","zx_resumen_ok"],
    ["Ordinario",formatoSeg(ordinarioSeg),"ordinario","zx_resumen_obj"],
    ["Descanso",formatoSeg(resumen.descansoSeg),"descanso","zx_resumen_pause"],
    ["Comida",formatoSeg(resumen.comidaSeg),"comida","zx_resumen_food"],
    ["Justificado",formatoMin(minutosJustificados),"justificado","zx_resumen_info"],
    ["Objetivo",formatoSeg(objetivoMostradoSeg),"objetivo","zx_resumen_obj"],
    ["Extra",formatoSeg(extraSeg),"extra",extraSeg>0?"zx_resumen_extra":"zx_resumen_neutral"],
    ["Falta",formatoSeg(faltaSeg),"falta",faltaSeg>0?"zx_resumen_warn":"zx_resumen_neutral"]
  ];

  return `
    <div class="zx_text">
      ${laboral && laboral.festivo ? `<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Día festivo${laboral.nombreFestivo ? ": "+limpiar(laboral.nombreFestivo) : ""}</div>` : ""}
      ${laboral && laboral.tipoAusencia ? `<div style="color:#2563eb;font-weight:900;margin-bottom:8px;">${limpiar(laboral.observacion)}</div>` : ""}
      ${bloqueo.bloqueado ? `<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Permiso activo: ${limpiar(bloqueo.inicio)} - ${limpiar(bloqueo.fin)}</div>` : ""}
      ${jornada && jornada.vehiculo_matricula ? `<div class="zx_resumen_vehiculo">🚗 <b>${limpiar(jornada.vehiculo_matricula)}</b> · Km ${limpiar(jornada.km_entrada??"-")} / ${limpiar(jornada.km_salida??"-")}</div>` : ""}
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
  const objetivoMostradoSeg=objetivoVisualSeg(j,objetivoSeg);

  return `
    <div class="zx_jornada_resumen_grid">
      <div><span>Trabajado</span><b>${formatoSeg(resumen.trabajadoSeg)}</b></div>
      <div><span>Objetivo</span><b>${formatoSeg(objetivoMostradoSeg)}</b></div>
      <div><span>Descanso</span><b>${formatoSeg(resumen.descansoSeg)}</b></div>
      <div><span>Comida</span><b>${formatoSeg(resumen.comidaSeg)}</b></div>
      <div><span>Justificado</span><b>${formatoMin(j ? (j.minutos_justificados||0) : 0)}</b></div>
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

function renderResumenPrincipal(j,resumen,objetivoSeg,laboral,titulo){
  if(!j){
    return `<div class="zx_card"><h2>${limpiar(titulo)}</h2><div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg,laboral,null)}</div></div>`;
  }
  return `
    <div class="zx_card zx_resumen_principal_click" data-abrir-resumen-jornada="${limpiar(j.id)}" role="button" tabindex="0">
      <div class="zx_resumen_titulo_fila">
        <h2>${limpiar(titulo)}</h2>
        <span>Ver fichajes ›</span>
      </div>
      <div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg,laboral,j)}</div>
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
    .zx_estado_sub{margin-top:10px;color:#64748b;font-size:14px;font-weight:900;line-height:1.35;}
    .zx_section_toggle{width:100%;border:0;border-radius:18px;padding:18px;background:#64748b;color:white;text-align:left;font-weight:950;box-shadow:0 8px 22px rgba(15,23,42,.12);}
    .zx_section_toggle span{display:block;font-size:20px;line-height:1.15;}
    .zx_section_toggle small{display:block;margin-top:6px;font-size:13px;opacity:.9;font-weight:850;}
    .zx_section_toggle.abierto{background:#334155;}

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
    .zx_resumen_vehiculo{margin:8px 0 2px;padding:10px 12px;border-radius:14px;background:#f1f5f9;color:#334155;font-weight:900;}
    .zx_resumen_principal_click{cursor:pointer;}
    .zx_resumen_principal_click:active{transform:scale(.995);}
    .zx_resumen_titulo_fila{display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .zx_resumen_titulo_fila h2{margin:0;}
    .zx_resumen_titulo_fila span{color:#2563eb;font-size:13px;font-weight:950;white-space:nowrap;}

    .zx_vehicle_strip{width:100%;margin-top:14px;border:1px solid #dbe3ef;border-radius:19px;padding:12px;background:#f8fafc;display:grid;grid-template-columns:46px 1fr auto;gap:10px;align-items:center;text-align:left}
    button.zx_vehicle_strip{cursor:pointer}
    .zx_vehicle_strip_icon{width:46px;height:46px;border-radius:15px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:23px}
    .zx_vehicle_strip_text small,.zx_vehicle_strip_text b,.zx_vehicle_strip_text em{display:block}
    .zx_vehicle_strip_text small{color:#64748b;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.3px}
    .zx_vehicle_strip_text b{color:#071330;font-size:18px;line-height:1.1;font-weight:950;margin-top:2px}
    .zx_vehicle_strip_text em{color:#64748b;font-size:12px;font-style:normal;font-weight:850;margin-top:3px}
    .zx_vehicle_strip_action{border:0;background:transparent;color:#2563eb;font-size:13px;font-weight:950;white-space:nowrap;padding:9px 4px}
    .zx_vehicle_take{border-radius:13px;background:#dcfce7;color:#166534;padding:10px 12px}
    .zx_vehicle_strip_active{border-color:#bfdbfe;background:#eff6ff}
    .zx_vehicle_modal h2{margin-top:0}
    .zx_vehicle_modal_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:14px;margin-bottom:12px}
    .zx_vehicle_modal_card b,.zx_vehicle_modal_card span{display:block}.zx_vehicle_modal_card b{font-size:19px;color:#071330}.zx_vehicle_modal_card span{margin-top:4px;color:#64748b;font-weight:850}
    .zx_vehicle_picker{display:grid;gap:9px;max-height:55vh;overflow:auto;margin:12px 0}
    .zx_vehicle_pick{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;width:100%;border:1px solid #dbe3ef;border-radius:17px;background:#f8fafc;padding:11px;text-align:left}
    .zx_vehicle_pick .ico{font-size:23px}.zx_vehicle_pick .txt b,.zx_vehicle_pick .txt small{display:block}.zx_vehicle_pick .txt b{color:#071330;font-size:16px}.zx_vehicle_pick .txt small{color:#64748b;font-size:12px;font-weight:850;margin-top:3px}
    .zx_vehicle_pick .state{border-radius:999px;padding:7px 9px;font-size:11px;font-weight:950;white-space:nowrap}.zx_vehicle_pick .state.free{background:#dcfce7;color:#166534}.zx_vehicle_pick .state.mine{background:#dbeafe;color:#1d4ed8}.zx_vehicle_pick .state.busy{background:#ffedd5;color:#9a3412}
    .zx_start_vehicle_choice{border:1px solid #bbf7d0;background:#f0fdf4;border-radius:20px;padding:14px;margin:10px 0 12px}
    .zx_start_vehicle_title{display:flex;align-items:center;gap:10px;margin-bottom:10px}.zx_start_vehicle_title>span{font-size:27px}.zx_start_vehicle_title small,.zx_start_vehicle_title b{display:block}.zx_start_vehicle_title small{color:#64748b;font-size:11px;font-weight:950;text-transform:uppercase}.zx_start_vehicle_title b{color:#071330;font-size:20px;font-weight:950}
    .zx_naranja{background:#f97316!important;color:white!important}.zx_blanco{background:white!important;color:#334155!important;border:1px solid #dbe3ef!important}

    @media(max-width:390px){.zx_vehicle_strip{grid-template-columns:42px 1fr}.zx_vehicle_strip_action{grid-column:2;justify-self:start;padding-left:0}.zx_vehicle_take{padding:8px 11px}.zx_vehicle_pick{grid-template-columns:38px 1fr}.zx_vehicle_pick .state{grid-column:2;justify-self:start}}

    @media(min-width:700px){
      .zx_admin_summary{grid-template-columns:repeat(4,1fr);}
      .zx_resumen_grid{grid-template-columns:repeat(4,minmax(0,1fr));}
      .zx_jornada_resumen_grid{grid-template-columns:repeat(4,minmax(0,1fr));}
    }
  `;

  document.head.appendChild(s);
}

// ===============================
// SINCRONIZACIÓN MULTIDISPOSITIVO
// ===============================
function fichajeEstaActivo(){
  if(String(window.ZX_MODULO_ACTUAL||"")!=="fichaje") return false;
  const nav=document.querySelector('.zx_nav_btn.zx_activo[data-modulo="fichaje"]');
  return !!nav;
}

function solicitarRenderFichaje(){
  if(ZX_RT_RENDER_TIMER) clearTimeout(ZX_RT_RENDER_TIMER);

  ZX_RT_RENDER_TIMER=setTimeout(async function(){
    ZX_RT_RENDER_TIMER=null;

    if(document.hidden) return;
    if(!fichajeEstaActivo()) return;
    if(document.getElementById("zx_modal_fichaje")) return;

    const t=Date.now();
    if(t-ZX_ULTIMO_RENDER_REMOTO<700) return;
    ZX_ULTIMO_RENDER_REMOTO=t;

    if(typeof window.ZX_fichaje_real==="function"){
      await window.ZX_fichaje_real();
    }
  },220);
}

function detenerTiempoReal(){
  if(!ZX_RT_CANAL) return;

  try{
    const cliente=sb();
    if(cliente && typeof cliente.removeChannel==="function"){
      cliente.removeChannel(ZX_RT_CANAL);
    }
  }catch(e){}

  ZX_RT_CANAL=null;
  ZX_RT_ESTADO="desconectado";
}

function iniciarTiempoReal(){
  const cliente=sb();
  if(!cliente || typeof cliente.channel!=="function") return;
  if(ZX_RT_CANAL && ZX_RT_ESTADO==="conectado") return;

  detenerTiempoReal();

  try{
    const s=sesion();
    const canalNombre="zx_fichaje_rt_"+String(s.id||"usuario")+"_"+Math.random().toString(36).slice(2,9);

    ZX_RT_CANAL=cliente
      .channel(canalNombre)
      .on("postgres_changes",{event:"*",schema:"public",table:"jornadas"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"fichajes"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"horas_extra_pro"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"vehiculos"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"usos_vehiculos"},solicitarRenderFichaje)
      .on("postgres_changes",{event:"*",schema:"public",table:"transferencias_vehiculos"},solicitarRenderFichaje)
      .subscribe(function(status){
        const st=String(status||"");

        if(st==="SUBSCRIBED"){
          ZX_RT_ESTADO="conectado";
          return;
        }

        if(st==="CHANNEL_ERROR" || st==="TIMED_OUT" || st==="CLOSED"){
          ZX_RT_ESTADO="error";
          setTimeout(function(){
            detenerTiempoReal();
            iniciarTiempoReal();
          },2500);
        }
      });
  }catch(e){
    ZX_RT_CANAL=null;
    ZX_RT_ESTADO="error";
  }
}

async function firmaSincronizacion(){
  if(zxOffline()) return "offline";

  const cliente=sb();
  const s=sesion();
  if(!cliente || !s.id) return "sin_sesion";

  try{
    const consultas=[
      cliente
        .from("jornadas")
        .select("id,usuario_id,estado,entrada,salida,segundos_trabajados,segundos_descanso,segundos_comida,segundos_objetivo,segundos_extra,segundos_faltantes,minutos_trabajados,minutos_descanso,minutos_comida,minutos_objetivo,minutos_extra,minutos_faltantes,km_entrada,km_salida,vehiculo_id,created_at")
        .eq("usuario_id",String(s.id))
        .order("created_at",{ascending:false})
        .limit(4),
      cliente
        .from("fichajes")
        .select("id,jornada_id,usuario_id,tipo,created_at,modificado_en")
        .eq("usuario_id",String(s.id))
        .order("created_at",{ascending:false})
        .limit(8)
    ];

    if(esAdmin() && (ZX_VER_ADMIN || ZX_VER_TODAS_JORNADAS)){
      consultas.push(
        cliente
          .from("jornadas")
          .select("id,usuario_id,estado,entrada,salida,segundos_trabajados,segundos_descanso,segundos_comida,segundos_objetivo,segundos_extra,segundos_faltantes,minutos_trabajados,minutos_descanso,minutos_comida,minutos_objetivo,minutos_extra,minutos_faltantes,created_at")
          .neq("usuario_id",String(s.id))
          .order("created_at",{ascending:false})
          .limit(20)
      );
    }

    const resultados=await Promise.all(consultas);
    const datos=resultados.map(r=>r && !r.error ? (r.data||[]) : []);
    return JSON.stringify(datos);
  }catch(e){
    return "error";
  }
}

async function comprobarCambiosRemotos(forzarRender=false){
  if(ZX_SYNC_BUSY || document.hidden || zxOffline()) return;
  if(!fichajeEstaActivo()) return;
  if(document.getElementById("zx_modal_fichaje")) return;

  ZX_SYNC_BUSY=true;
  try{
    const nuevaFirma=await firmaSincronizacion();

    if(!ZX_SYNC_FIRMA){
      ZX_SYNC_FIRMA=nuevaFirma;
      if(forzarRender) solicitarRenderFichaje();
      return;
    }

    if(forzarRender || nuevaFirma!==ZX_SYNC_FIRMA){
      ZX_SYNC_FIRMA=nuevaFirma;
      solicitarRenderFichaje();
    }
  }finally{
    ZX_SYNC_BUSY=false;
  }
}

function iniciarSincronizacionRespaldo(){
  if(!ZX_SYNC_TIMER){
    ZX_SYNC_TIMER=setInterval(function(){
      comprobarCambiosRemotos(false);
    },2500);
  }

  if(ZX_SYNC_LISTENERS) return;
  ZX_SYNC_LISTENERS=true;

  document.addEventListener("visibilitychange",function(){
    if(!document.hidden){
      ZX_SYNC_FIRMA="";
      iniciarTiempoReal();
      comprobarCambiosRemotos(true);
    }
  });

  window.addEventListener("focus",function(){
    ZX_SYNC_FIRMA="";
    comprobarCambiosRemotos(true);
  });

  window.addEventListener("online",function(){
    ZX_SYNC_FIRMA="";
    detenerTiempoReal();
    iniciarTiempoReal();
    comprobarCambiosRemotos(true);
  });

  window.addEventListener("offline",function(){
    ZX_SYNC_FIRMA="offline";
  });
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
    const objetivoMostradoSeg=objetivoVisualSeg(jornada,objSec);

    const resumenCont=document.getElementById("zx_resumen_tiempo");
    if(resumenCont){
      const campos=resumenCont.querySelectorAll("[data-live-campo]");
      campos.forEach(c=>{
        const k=c.dataset.liveCampo;
        if(k==="trabajado") c.textContent=formatoSeg(r.trabajadoSeg);
        if(k==="descanso") c.textContent=formatoSeg(r.descansoSeg);
        if(k==="comida") c.textContent=formatoSeg(r.comidaSeg);
        if(k==="objetivo") c.textContent=formatoSeg(objetivoMostradoSeg);
        if(k==="ordinario") c.textContent=formatoSeg(Math.min(Number(r.trabajadoSeg||0),Number(objSec||0)));
        if(k==="entrada_hora") c.textContent=horaCorta(r.entrada||jornada?.entrada);
        if(k==="salida_hora") c.textContent=horaCorta(r.salida||jornada?.salida);
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
  iniciarSincronizacionRespaldo();

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

  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0,entrada:null,salida:null};
  let objetivoSeg=480*60;
  let laboral=null;
  let jornadaResumen=null;

  if(est.jornada){
    const rv=await resumenVisualJornada(est.jornada,est.eventos);
    resumen=rv.resumen;
    objetivoSeg=rv.objetivoSeg;
    laboral=rv.laboral;
    jornadaResumen=est.jornada;
  }else if(ultima){
    const rv=await resumenVisualJornada(ultima);
    resumen=rv.resumen;
    objetivoSeg=rv.objetivoSeg;
    laboral=rv.laboral;
    jornadaResumen=ultima;
  }else{
    laboral=await objetivoDiaPRO(fechaHoyISO());
    objetivoSeg=laboral.objetivoSeg;
  }

  if(renderId!==ZX_RENDER_ID) return;

  // Optimización V3105:
  // No se consulta Supabase cada segundo para el contador en vivo.
  // El contador usa los fichajes ya cargados y solo se refresca completo con acciones reales o tiempo real agrupado.

  const bloqueoActual=bloqueoHorarioActual(laboral ? laboral.solicitudes : []);
  const vehiculoRapido=await cargarEstadoVehiculoRapido();
  if(renderId!==ZX_RENDER_ID) return;
  const accionDirecta=accionDirectaEstado(est.estado);
  const misCount=(est.jornadasUsuario||[]).length;
  const ultimosTxt=ZX_VER_ULTIMOS ? String(hist.length)+" registros" : "Últimos movimientos";
  const panelTxt=ZX_VER_ADMIN ? String(adminHoy.length)+" jornadas hoy" : "Empleados de hoy";
  const todasTxt=ZX_VER_TODAS_JORNADAS ? String(adminTodas.length)+" jornadas" : "Histórico de empleados";

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>

      <div class="zx_estado_actual" style="color:${colorEstado(est.estado)};border-color:${colorEstado(est.estado)};">
        <span>${iconoEstado(est.estado)}</span>
        <b>${textoEstado(est.estado)}</b>
      </div>
      <div class="zx_estado_sub">${limpiar(subtituloEstado(est))}</div>

      ${renderVehiculoRapido(vehiculoRapido,est.estado)}

      ${laboral && laboral.bloquearFichaje ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Fichaje bloqueado por baja médica aprobada.</div>` : ""}
      ${bloqueoActual.bloqueado ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Permiso activo: ${limpiar(bloqueoActual.inicio)} - ${limpiar(bloqueoActual.fin)}</div>` : ""}

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">
        ${limpiar(textoBotonFichar(est.estado))}
      </button>
    </div>

    ${renderResumenPrincipal(jornadaResumen,resumen,objetivoSeg,laboral,est.jornada ? "Resumen en vivo" : "Resumen última jornada")}

    <div class="zx_card">
      ${renderBotonSeccion("Ver mis jornadas", misCount ? "Últimas "+misCount+" jornadas" : "Sin jornadas recientes", ZX_VER_MIS_JORNADAS, "ZX_toggleMisJornadas()") }

      ${ZX_VER_MIS_JORNADAS ? (jornadas.length ? jornadas.map(j=>renderJornadaMini(j,esAdmin())).join("") : `<div class="zx_text">Sin jornadas.</div>`) : ""}
    </div>

    ${adminActivo ? `
      <div class="zx_card">
        ${renderBotonSeccion("Ver panel admin", panelTxt, ZX_VER_ADMIN, "ZX_toggleAdmin()") }

        ${ZX_VER_ADMIN ? `
          ${renderAdminResumen(adminHoy)}
          <h3 style="font-size:24px;margin:18px 0 8px;">Hoy</h3>
          ${adminHoy.length ? adminHoy.slice(0,10).map(j=>renderJornadaMini(j,true)).join("") : `<div class="zx_text">Sin jornadas de empleados hoy. Tus propias jornadas están en "Mis jornadas".</div>`}
        ` : ""}
      </div>

      <div class="zx_card">
        ${renderBotonSeccion("Ver jornadas de usuarios", todasTxt, ZX_VER_TODAS_JORNADAS, "ZX_toggleTodasJornadas()") }

        ${ZX_VER_TODAS_JORNADAS ? `
          <h3 style="font-size:24px;margin:18px 0 8px;">Jornadas de usuarios</h3>
          ${renderTodasJornadasAdmin(adminTodas)}
        ` : ""}
      </div>
    ` : ""}

    <div class="zx_card">
      ${renderBotonSeccion("Ver últimos fichajes", ultimosTxt, ZX_VER_ULTIMOS, "ZX_toggleUltimos()") }

      ${ZX_VER_ULTIMOS ? (hist.length ? hist.map(h=>renderFichajeMini(h)).join("") : `<div class="zx_text">Sin registros.</div>`) : ""}
    </div>
  `;

  enlazarVehiculoRapido(vehiculoRapido);

  document.getElementById("zx_btn_fichar").onclick=function(){
    if(accionDirecta==="entrada" && !vehiculoRapido.actual){
      abrirInicioJornadaSimple(vehiculoRapido);
      return;
    }
    if(accionDirecta){
      const ok=confirm("Confirmar fichaje: "+textoTipo(accionDirecta)+"\n\n¿Seguro que quieres guardar este registro?");
      if(ok){
        const veh=accionDirecta==="entrada" && vehiculoRapido.actual
          ? vehiculoSnapshotRapido(vehiculoRapido.actual)
          : null;
        registrar(accionDirecta,{vehiculo:veh});
      }
      return;
    }
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

  document.querySelectorAll("[data-abrir-resumen-jornada]").forEach(el=>{
    const abrir=function(){verFichajesJornada(el.dataset.abrirResumenJornada)};
    el.onclick=abrir;
    el.onkeydown=function(e){if(e.key==="Enter" || e.key===" "){e.preventDefault();abrir();}};
  });

  firmaSincronizacion().then(function(f){
    if(f && f!=="error") ZX_SYNC_FIRMA=f;
  }).catch(function(){});

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