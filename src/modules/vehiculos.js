// ===============================
// ZENTRYX PRO - VEHÍCULOS
// V3207 - AJUSTE VISUAL FICHA/USOS/MOVIMIENTOS EN MÓVIL
// ===============================
(function(){
"use strict";

const ZX_VERSION="3207";
const TABLA="vehiculos";
const CACHE_KEY="zentryx_cache_vehiculos_v3154";
const ASISTENCIA_KEY="zentryx_vehiculos_asistencia_v3154";
const INCIDENCIAS_KEY="zentryx_vehiculos_incidencias_v3154";
let zxEmergencyWakeLock=null;

let ZX_VEH_CACHE=[];
let ZX_VEH_BUSQUEDA="";
let ZX_VEH_FILTRO="activos";
let ZX_VEH_CARGANDO=false;
let ZX_VEH_MODO_OPERATIVO=false;
let ZX_USOS_ACTUALES={};
let ZX_RECUPERACIONES={};
let ZX_GPS_WATCH_ID=null;
let ZX_GPS_USO_ID="";
let ZX_GPS_ULTIMO_PUNTO=null;
let ZX_GPS_ULTIMO_ENVIO=0;
let ZX_GPS_REFRESH_TIMER=null;
let ZX_GPS_REFRESHING=false;
let ZX_GPS_ULTIMO_ERROR="";
let ZX_GPS_ULTIMO_REGISTRO="";
let ZX_GPS_POLL_TIMER=null;
let ZX_GPS_GUARDANDO=false;
let ZX_GPS_ULTIMA_PRECISION=null;
let ZX_GPS_USO_RESUELTO=null;
let ZX_GPS_USO_RESUELTO_AT=0;
let ZX_VEH_INCIDENCIAS_ACTIVAS={};
let ZX_RUTA_MAPA=null;
let ZX_RUTA_LINEA=null;
let ZX_RUTA_MARCADORES=[];
let ZX_RUTA_CANAL=null;
let ZX_RUTA_POLL_TIMER=null;
let ZX_RUTA_VEHICULO_ID="";
let ZX_RUTA_USO_ID="";
let ZX_RUTA_PUNTOS=[];
let ZX_LEAFLET_PROMISE=null;
let ZX_FLOTA_MAPA=null;
let ZX_FLOTA_MARCADORES={};
let ZX_FLOTA_CANAL=null;
let ZX_FLOTA_TIMER=null;
let ZX_FLOTA_ACTUALIZANDO=false;
let ZX_FLOTA_ULTIMAS_POSICIONES={};

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}
function backend(){
  const z=zx();
  return window.ZENTRYX_BACKEND || z?.Backend || z?.backend || null;
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizar(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function normalizarMatricula(v){
  return String(v ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,"");
}

async function existeMatriculaDuplicada(matricula,idActual){
  const objetivo=normalizarMatricula(matricula);
  if(!objetivo) return false;
  const actual=String(idActual || "");

  const comprobar=function(lista){
    return (Array.isArray(lista) ? lista : []).some(function(v){
      return String(v?.id || "")!==actual && normalizarMatricula(v?.matricula)===objetivo;
    });
  };

  // Al crear, la caché sirve como aviso inmediato. Al editar no debe bloquear:
  // una copia local antigua del propio vehículo puede conservar la misma matrícula
  // con un id incompleto o desactualizado. En edición manda la comprobación remota.
  if(!actual){
    if(comprobar(ZX_VEH_CACHE) || comprobar(cacheBackend(TABLA)) || comprobar(leerCache())) return true;
  }

  // La comprobación decisiva se hace contra toda la tabla, sin depender
  // del filtro visible ni de la caché del adaptador.
  if(sb()){
    try{
      const r=await sb().from(TABLA).select("id,matricula");
      if(r && r.error) throw r.error;
      if(comprobar(r && r.data)) return true;
    }catch(e){
      console.error("No se pudo comprobar matrícula duplicada",e);
      throw new Error("No se pudo comprobar si la matrícula ya existe. Revisa la conexión e inténtalo de nuevo.");
    }
  }else{
    throw new Error("No se puede crear el vehículo sin comprobar antes la matrícula.");
  }

  return false;
}

function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function fechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function rol(){return normalizar(sesion().rol || "")}
function usuario(){return normalizar(sesion().usuario || "")}
function esAdmin(){return rol()==="administrador" || usuario()==="admin"}
function puedeEntrar(){
  const z=zx();
  if(z && typeof z.puede==="function"){
    return z.puede("ver","vehiculos")===true;
  }
  // Compatibilidad de seguridad si el controlador general aún no está disponible.
  return rol()!=="invitado" && rol()!=="";
}
function puedeGestionar(){return esAdmin() || ["gerente","supervisor","encargado","administrativo","oficina"].includes(rol())}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}

function numero(v){
  const n=Number(String(v ?? "0").replace(",","."));
  return Number.isFinite(n) ? n : 0;
}


function primerDato(obj,claves){
  for(const k of claves){
    const v=obj && obj[k];
    if(v!==undefined && v!==null && String(v).trim()!=="") return String(v).trim();
  }
  return "";
}

function leerAsistencias(){
  try{return JSON.parse(localStorage.getItem(ASISTENCIA_KEY)||"{}")||{}}
  catch(e){return {}}
}

function guardarAsistenciaLocal(id,data){
  try{
    const all=leerAsistencias();
    all[String(id)]=Object.assign({},all[String(id)]||{},data||{});
    localStorage.setItem(ASISTENCIA_KEY,JSON.stringify(all));
    return true;
  }catch(e){return false}
}

function datosAsistencia(v){
  const local=leerAsistencias()[String(v?.id||"")]||{};
  const pick=(keys,lk)=>primerDato(v,keys)||String(local[lk]||"").trim();
  return {
    compania:pick(["seguro_compania","compania_seguro","aseguradora","seguro_aseguradora"],"compania"),
    poliza:pick(["seguro_poliza","numero_poliza","poliza_seguro","poliza"],"poliza"),
    telefono:pick(["seguro_telefono_asistencia","telefono_asistencia","asistencia_telefono","telefono_grua","seguro_telefono"],"telefono"),
    telefonoAlternativo:pick(["seguro_telefono_alternativo","telefono_asistencia_alternativo"],"telefonoAlternativo"),
    cobertura:pick(["seguro_cobertura","tipo_cobertura","cobertura_seguro"],"cobertura"),
    instrucciones:pick(["seguro_instrucciones","instrucciones_asistencia","observaciones_seguro"],"instrucciones"),
    vencimiento:primerDato(v,["seguro_fecha","seguro_vencimiento","fecha_vencimiento_seguro"]),
    documento:primerDato(v,["seguro_documento_url","poliza_url","documento_seguro_url"])||String(local.documento||"").trim()
  };
}

function telefonoLimpio(v){return String(v||"").replace(/[^+0-9]/g,"")}
function coordTexto(n){return Number.isFinite(Number(n))?Number(n).toFixed(6):"-"}

async function posicionAsistencia(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){resolve({lat:null,lng:null,precision:null,error:"GPS no disponible"});return}
    navigator.geolocation.getCurrentPosition(function(p){
      resolve({lat:p.coords.latitude,lng:p.coords.longitude,precision:p.coords.accuracy||null,error:"",hora:new Date().toISOString()});
    },function(e){
      resolve({lat:null,lng:null,precision:null,error:e&&e.message?e.message:"No se pudo obtener la ubicación",hora:new Date().toISOString()});
    },{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
  });
}

async function direccionDesdeCoordenadas(lat,lng){
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||!navigator.onLine) return null;
  try{
    const url="https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(lat)+"&lon="+encodeURIComponent(lng)+"&zoom=18&addressdetails=1";
    const r=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!r.ok) return null;
    const j=await r.json();
    const a=j.address||{};
    return {
      completa:j.display_name||"",
      carretera:a.road||a.motorway||a.trunk||a.path||"",
      localidad:a.city||a.town||a.village||a.municipality||"",
      provincia:a.state||a.county||"",
      cp:a.postcode||""
    };
  }catch(e){return null}
}

function textoAvisoGrua(v,seg,pos,dir,pkManual,carreteraManual){
  const carretera=String(carreteraManual||dir?.carretera||"").trim();
  const pk=String(pkManual||"").trim();
  const color=String(v.color||"").trim();
  const combustible=String(v.combustible||v.tipo_combustible||"").trim();
  const tipoVehiculo=String(v.tipo||v.tipo_vehiculo||"").trim();
  const propietario=String(v.empresa_propietaria||v.propietario||"").trim();
  return [
    "ASISTENCIA EN CARRETERA - ZENTRYX PRO",
    "Vehículo: "+nombreVehiculo(v),
    "Matrícula: "+(v.matricula||"-"),
    color?"Color: "+color:"",
    combustible?"Combustible: "+combustible:"",
    tipoVehiculo?"Tipo: "+tipoVehiculo:"",
    propietario?"Propietario: "+propietario:"",
    "Kilómetros: "+(v.km_actual??"-"),
    "Responsable: "+(responsableNombre(v)||"Sin responsable"),
    "Solicitante: "+(identidadActual().nombre||"-"),
    "Aseguradora: "+(seg.compania||"No configurada"),
    "Póliza: "+(seg.poliza||"No configurada"),
    "Teléfono asistencia: "+(seg.telefono||"No configurado"),
    seg.telefonoAlternativo?"Teléfono alternativo: "+seg.telefonoAlternativo:"",
    seg.vencimiento?"Vencimiento seguro: "+fechaES(seg.vencimiento):"",
    seg.cobertura?"Cobertura: "+seg.cobertura:"",
    "Dirección: "+(dir?.completa||"No disponible"),
    carretera?"Carretera: "+carretera:"",
    pk?"Punto kilométrico: "+pk:"",
    "Coordenadas: "+coordTexto(pos?.lat)+", "+coordTexto(pos?.lng),
    pos?.precision?"Precisión GPS aproximada: ±"+Math.round(pos.precision)+" m":"",
    seg.instrucciones?"Instrucciones: "+seg.instrucciones:""
  ].filter(Boolean).join("\n");
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function limpiarMapaFlota(){
  if(ZX_FLOTA_TIMER){clearInterval(ZX_FLOTA_TIMER);ZX_FLOTA_TIMER=null;}
  if(ZX_FLOTA_CANAL && sb() && typeof sb().removeChannel==="function"){
    try{sb().removeChannel(ZX_FLOTA_CANAL)}catch(e){}
  }
  ZX_FLOTA_CANAL=null;
  if(ZX_FLOTA_MAPA){try{ZX_FLOTA_MAPA.remove()}catch(e){}}
  ZX_FLOTA_MAPA=null;
  ZX_FLOTA_MARCADORES={};
  ZX_FLOTA_ULTIMAS_POSICIONES={};
}

function limpiarMapaRuta(){
  limpiarMapaFlota();
  if(ZX_RUTA_POLL_TIMER){clearInterval(ZX_RUTA_POLL_TIMER);ZX_RUTA_POLL_TIMER=null;}
  if(ZX_RUTA_CANAL && sb() && typeof sb().removeChannel==="function"){
    try{sb().removeChannel(ZX_RUTA_CANAL)}catch(e){}
  }
  ZX_RUTA_CANAL=null;
  if(ZX_RUTA_MAPA){try{ZX_RUTA_MAPA.remove()}catch(e){}}
  ZX_RUTA_MAPA=null;
  ZX_RUTA_LINEA=null;
  ZX_RUTA_MARCADORES=[];
  ZX_RUTA_VEHICULO_ID="";
  ZX_RUTA_USO_ID="";
  ZX_RUTA_PUNTOS=[];
}

function cerrarModal(){
  limpiarMapaRuta();
  const m=document.getElementById("zx_modal_vehiculo");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modal(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_vehiculo";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja">
    <div class="zx_modal_top_actions">
      <button type="button" class="zx_modal_top_close" id="zx_modal_cerrar_arriba">✕ Cerrar</button>
    </div>
    ${html}
  </div>`;
  document.body.appendChild(d);
  const cerrarArriba=document.getElementById("zx_modal_cerrar_arriba");
  if(cerrarArriba) cerrarArriba.onclick=cerrarModal;
}

function estadoVehiculo(v){
  if(v.activo===false || v.activo==="false") return "inactivo";
  const ef=normalizar(v.estado_flota || "");
  if(["en_uso","pendiente_devolucion"].includes(ef)) return "uso";
  if(["averia","taller","fuera_servicio","reservado"].includes(ef)) return ef;
  if(v.en_uso===true || v.en_uso==="true") return "uso";
  return "libre";
}

function esAsignacionHabitual(v){
  return !!(asignadoId(v) || asignadoNombre(v));
}

function tipoAsignacion(v){
  const t=normalizar(v.tipo_asignacion || v.asignacion_tipo || v.modalidad_asignacion || "");
  if(["temporal","reserva","reservado","compartido"].includes(t)) return t==="reservado" ? "reserva" : t;
  if(["habitual","permanente","fija","fijo"].includes(t)) return "habitual";
  return esAsignacionHabitual(v) ? "habitual" : "";
}

function tipoAsignacionTexto(v){
  const t=tipoAsignacion(v);
  if(t==="temporal") return "Temporal";
  if(t==="reserva") return "Reserva";
  if(t==="compartido") return "Compartido";
  if(t==="habitual") return "Habitual";
  return "Sin asignación";
}

function permiteUsoPersonal(v){
  return v.uso_personal_permitido===true || v.uso_personal_permitido==="true" ||
    normalizar(v.uso_permitido)==="laboral_personal" || normalizar(v.tipo_uso_permitido)==="laboral_personal";
}

function estadoTexto(v){
  const e=estadoVehiculo(v);
  if(e==="uso"){
    if(normalizar(v.estado_flota)==="pendiente_devolucion") return "Pendiente de devolución";
    return esAsignacionHabitual(v) ? "Asignado" : "En uso";
  }
  if(e==="reservado") return "Reservado";
  if(e==="averia") return "Avería";
  if(e==="taller") return "Taller";
  if(e==="fuera_servicio") return "Fuera de servicio";
  if(e==="inactivo") return "Inactivo";
  if(esAsignacionHabitual(v)) return "Asignado";
  return "Libre";
}

function identidadActual(){
  const s=sesion() || {};
  return {
    id:String(s.id || s.user_id || s.usuario_id || ""),
    usuario:String(s.usuario || s.username || ""),
    nombre:String(s.nombre_completo || s.nombre || s.usuario || "Usuario"),
    empresa_id:String(s.empresa_id || "")
  };
}

function asignadoId(v){return String(v.usuario_id || "")}
function asignadoNombre(v){return String(v.usuario_asignado || "")}
function responsableId(v){return String(v.usuario_actual_id || v.usuario_id || "")}
function responsableNombre(v){return String(v.usuario_actual_nombre || v.usuario_asignado || "")}

function tipoUsoRegistro(u){
  const t=normalizar(u?.tipo_uso || "");
  if(t==="personal") return "personal";
  if(t==="laboral") return "laboral";
  // Compatibilidad con históricos creados antes de existir tipo_uso.
  // Solo inferimos laboral cuando hay una relación objetiva con jornada/trabajo
  // o cuando el propio motivo indica explícitamente que viene de Fichaje.
  if(u?.jornada_id || u?.trabajo_id) return "laboral";
  const motivo=normalizar(u?.motivo_inicio || "");
  if(motivo.includes("fichaje") || motivo.includes("trabajo")) return "laboral";
  return "sin_clasificar";
}
function kmUso(u){
  const directo=Number(u?.km_recorridos);
  if(Number.isFinite(directo)&&directo>=0) return directo;
  const ini=Number(u?.km_inicio), fin=Number(u?.km_fin);
  return Number.isFinite(ini)&&Number.isFinite(fin)&&fin>=ini ? fin-ini : 0;
}
function resumenKmUsos(usos){
  return (usos||[]).reduce((r,u)=>{
    const km=kmUso(u);
    r.total+=km;
    r[tipoUsoRegistro(u)]+=km;
    return r;
  },{total:0,laboral:0,personal:0,sin_clasificar:0});
}

function resumenTiposUsos(usos){
  return (usos||[]).reduce((r,u)=>{
    const abierto=["en_uso","pendiente_devolucion"].includes(String(u?.estado||""));
    const t=tipoUsoRegistro(u);
    r.todos++;
    if(abierto) r.en_curso++;
    if(t==="laboral") r.laboral++;
    else if(t==="personal") r.personal++;
    else r.sin_clasificar++;
    return r;
  },{todos:0,laboral:0,personal:0,sin_clasificar:0,en_curso:0});
}
function textoTipoUso(u){
  const t=tipoUsoRegistro(u);
  return t==="laboral"?"Laboral":t==="personal"?"Personal":"Sin clasificar";
}

function textoEstadoUso(estado){
  const e=normalizar(estado||"");
  if(e==="en_uso") return "En curso";
  if(e==="pendiente_devolucion") return "Pendiente de devolución";
  if(e==="devuelto") return "Finalizado";
  if(e==="transferido") return "Transferido";
  if(e==="cancelado") return "Cancelado";
  return estado ? String(estado).replaceAll("_"," ") : "-";
}
function esResponsableActual(v){
  const u=identidadActual();
  return !!u.id && responsableId(v)===u.id;
}

function uuid(){
  try{if(window.crypto && crypto.randomUUID) return crypto.randomUUID()}catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function ahoraISO(){return new Date().toISOString()}

function hashPin(pin){
  try{return btoa(String(pin))}catch(e){return String(pin)}
}

async function validarPinAdministrador(){
  if(!esAdmin()){alert("Solo un administrador puede realizar esta acción.");return false}
  if(!navigator.onLine || !sb()){alert("Necesitas conexión para validar el PIN.");return false}
  const pin=prompt("Introduce PIN de administrador.");
  if(!pin || !/^[0-9]{4}$/.test(String(pin).trim())){alert("PIN inválido.");return false}
  try{
    const s=sesion();
    const r=await sb().from("usuarios").select("id,usuario,rol,pin_hash,debe_crear_pin").eq("id",String(s.id||"")).maybeSingle();
    if(r.error || !r.data){alert("No se pudo validar el PIN.");return false}
    if(normalizar(r.data.rol)!=="administrador" && normalizar(r.data.usuario)!=="admin"){alert("Solo administrador.");return false}
    if(r.data.debe_crear_pin || !r.data.pin_hash){alert("El administrador no tiene PIN activo.");return false}
    const seguridad=window.ZENTRYX_SECURITY;
    if(!seguridad || typeof seguridad.verifyPin!=="function"){
      alert("No se pudo cargar el sistema de seguridad del PIN.");
      return false;
    }

    const pruebaSesion=typeof seguridad.verifySessionPin==="function"
      ? await seguridad.verifySessionPin(pin)
      : {ok:false,available:false};

    if(pruebaSesion && pruebaSesion.ok){
      return true;
    }

    let hashGuardado=String(r.data.pin_hash || "");
    try{
      const usuarioLocal=JSON.parse(localStorage.getItem("usuario") || "null");
      if(usuarioLocal && String(usuarioLocal.id || "")===String(r.data.id || "") && usuarioLocal.pin_hash){
        hashGuardado=String(usuarioLocal.pin_hash);
      }
    }catch(e){}

    let verificacion=null;
    try{
      verificacion=await seguridad.verifyPin(String(pin).trim(),hashGuardado);
      if((!verificacion || !verificacion.ok) && hashGuardado!==String(r.data.pin_hash || "")){
        verificacion=await seguridad.verifyPin(String(pin).trim(),String(r.data.pin_hash || ""));
      }
    }catch(e){
      verificacion={ok:false};
    }
    if(!verificacion || !verificacion.ok){alert(pruebaSesion && pruebaSesion.available ? "PIN incorrecto." : "Vuelve a iniciar sesión una vez para validar el PIN con el sistema actualizado.");return false}
    return true;
  }catch(e){alert("No se pudo validar el PIN.");return false}
}

function pedirMotivoObligatorio(texto){
  const motivo=prompt(texto||"Indica el motivo.");
  if(!motivo || !String(motivo).trim()){alert("Motivo obligatorio.");return null}
  return String(motivo).trim();
}

async function registrarAuditoriaVehiculo(accion,v,motivo,extra){
  const actor=identidadActual();
  const fila={
    id:uuid(),
    vehiculo_id:String(v?.id||""),
    matricula:v?.matricula||"",
    accion:String(accion||""),
    usuario_id:String(actor.id||""),
    usuario:String(actor.nombre||actor.usuario||"Usuario"),
    fecha:ahoraISO(),
    datos:Object.assign({motivo:String(motivo||"")},extra||{})
  };
  const r=await zxInsert("vehiculos_auditoria",fila);
  if(r&&r.error) throw r.error;
  return r;
}


function fechaHoraES(v){
  if(!v) return "-";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "-";
  return String(d.getDate()).padStart(2,"0")+"/"+
    String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+
    String(d.getHours()).padStart(2,"0")+":"+
    String(d.getMinutes()).padStart(2,"0")+":"+
    String(d.getSeconds()).padStart(2,"0");
}

function duracionDesde(v){
  if(!v) return "-";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "-";
  let seg=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
  const h=Math.floor(seg/3600); seg%=3600;
  const m=Math.floor(seg/60); const ss=seg%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");
}

function actualizarDuracionesVisibles(){
  document.querySelectorAll("[data-veh-duration-start]").forEach(function(el){
    const inicio=el.getAttribute("data-veh-duration-start");
    if(inicio) el.textContent=duracionDesde(inicio);
  });
}

function iniciarRelojDuraciones(){
  if(window.ZX_VEH_DURACION_TIMER){
    clearInterval(window.ZX_VEH_DURACION_TIMER);
  }
  actualizarDuracionesVisibles();
  window.ZX_VEH_DURACION_TIMER=setInterval(actualizarDuracionesVisibles,1000);
}


function distanciaMetros(a,b){
  if(!a||!b) return Infinity;
  const R=6371000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(Number(b.lat)-Number(a.lat));
  const dLng=toRad(Number(b.lng)-Number(a.lng));
  const la1=toRad(Number(a.lat));
  const la2=toRad(Number(b.lat));
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}

function detenerSeguimientoGPS(){
  if(ZX_GPS_WATCH_ID!=null && navigator.geolocation){
    try{navigator.geolocation.clearWatch(ZX_GPS_WATCH_ID)}catch(e){}
  }
  if(ZX_GPS_POLL_TIMER){
    clearInterval(ZX_GPS_POLL_TIMER);
    ZX_GPS_POLL_TIMER=null;
  }
  ZX_GPS_WATCH_ID=null;
  ZX_GPS_USO_ID="";
  ZX_GPS_ULTIMO_PUNTO=null;
  ZX_GPS_ULTIMO_ENVIO=0;
  ZX_GPS_ULTIMA_PRECISION=null;
  ZX_GPS_GUARDANDO=false;
  ZX_GPS_USO_RESUELTO=null;
  ZX_GPS_USO_RESUELTO_AT=0;
}

async function resolverUsoGPSVigente(v,usoPropuesto){
  if(!v) return usoPropuesto||null;
  const ahora=Date.now();
  const vehiculoId=String(v.id||"");
  if(ZX_GPS_USO_RESUELTO && ahora-ZX_GPS_USO_RESUELTO_AT<12000 && String(ZX_GPS_USO_RESUELTO.vehiculo_id||"")===vehiculoId){
    return ZX_GPS_USO_RESUELTO;
  }
  const u=identidadActual();
  if(!u.id) return usoPropuesto||null;
  try{
    const cliente=sb();
    if(cliente && navigator.onLine!==false){
      const r=await cliente.from("usos_vehiculos").select("*")
        .eq("vehiculo_id",vehiculoId).eq("usuario_id",String(u.id))
        .in("estado",["en_uso","pendiente_devolucion"])
        .order("inicio_at",{ascending:false}).limit(1);
      if(r&&r.error) throw r.error;
      const vigente=Array.isArray(r?.data)&&r.data.length ? r.data[0] : null;
      if(vigente&&vigente.id){
        ZX_GPS_USO_RESUELTO=vigente; ZX_GPS_USO_RESUELTO_AT=ahora;
        ZX_GPS_USO_ID=String(vigente.id); ZX_USOS_ACTUALES[vehiculoId]=vigente;
        if(v&&typeof v==="object") v.__uso_actual=vigente;
        return vigente;
      }
      ZX_GPS_USO_RESUELTO=null; ZX_GPS_USO_RESUELTO_AT=ahora; return null;
    }
  }catch(e){ ZX_GPS_ULTIMO_ERROR=String(e&&e.message||e||"No se pudo comprobar el uso GPS vigente"); }
  if(usoPropuesto&&usoPropuesto.id){ ZX_GPS_USO_RESUELTO=usoPropuesto; ZX_GPS_USO_RESUELTO_AT=ahora; }
  return usoPropuesto||null;
}

async function guardarPuntoGPS(v,uso,pos){
  if(!v || !uso || !pos || !pos.coords || ZX_GPS_GUARDANDO) return;

  const usoVigente=await resolverUsoGPSVigente(v,uso);
  if(!usoVigente || !usoVigente.id) return;
  uso=usoVigente;

  const lat=Number(pos.coords.latitude);
  const lng=Number(pos.coords.longitude);
  const precision=Number(pos.coords.accuracy);
  const ahora=Date.now();

  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  // Se descartan lecturas muy pobres porque crean saltos y líneas irreales.
  // Con precisión media se aceptan únicamente cuando no existe una lectura mejor reciente.
  if(Number.isFinite(precision) && precision>120) return;

  const punto={lat:lat,lng:lng};
  const distancia=distanciaMetros(ZX_GPS_ULTIMO_PUNTO,punto);
  const transcurrido=ZX_GPS_ULTIMO_ENVIO ? ahora-ZX_GPS_ULTIMO_ENVIO : Infinity;
  const velocidadGps=Number.isFinite(Number(pos.coords.speed))
    ? Math.max(0,Number(pos.coords.speed)*3.6)
    : null;

  // Descarta saltos imposibles causados por una posición defectuosa.
  if(ZX_GPS_ULTIMO_PUNTO && Number.isFinite(distancia) && transcurrido>0){
    const velocidadCalculada=(distancia/(transcurrido/1000))*3.6;
    const limite=(velocidadGps!==null && velocidadGps>5)
      ? Math.max(190,velocidadGps+90)
      : 190;

    if(velocidadCalculada>limite && (!Number.isFinite(precision) || precision>20)){
      return;
    }
  }

  if(ZX_GPS_ULTIMO_ENVIO){
    const buena=Number.isFinite(precision) ? precision<=35 : true;

    // En marcha guarda aproximadamente cada 5 s o cada 5 m.
    // Detenido guarda una confirmación cada 45 s.
    if(distancia>=5){
      if(transcurrido<5000 && !buena) return;
    }else{
      if(transcurrido<45000) return;
    }

    // No sustituye una lectura reciente buena por otra claramente peor.
    if(
      transcurrido<12000 &&
      Number.isFinite(precision) &&
      Number.isFinite(ZX_GPS_ULTIMA_PRECISION) &&
      precision>ZX_GPS_ULTIMA_PRECISION*2.5
    ){
      return;
    }
  }

  const u=identidadActual();
  const data={
    empresa_id:u.empresa_id||null,
    uso_vehiculo_id:String(uso.id),
    vehiculo_id:String(v.id),
    usuario_id:String(u.id),
    registrado_at:new Date(pos.timestamp||ahora).toISOString(),
    lat:punto.lat,
    lng:punto.lng,
    precision_metros:Number.isFinite(precision)?precision:null,
    velocidad_kmh:velocidadGps,
    rumbo_grados:Number.isFinite(Number(pos.coords.heading))?Number(pos.coords.heading):null,
    altitud_metros:Number.isFinite(Number(pos.coords.altitude))?Number(pos.coords.altitude):null,
    origen:navigator.onLine?"gps_alta_precision":"cache_offline",
    sincronizado:!!navigator.onLine,
    dispositivo:navigator.userAgent||""
  };

  ZX_GPS_GUARDANDO=true;

  try{
    const r=await zxInsert("rutas_vehiculos_puntos",data);
    if(r&&r.error) throw r.error;

    ZX_GPS_ULTIMO_PUNTO=punto;
    ZX_GPS_ULTIMO_ENVIO=ahora;
    ZX_GPS_ULTIMO_REGISTRO=data.registrado_at;
    ZX_GPS_ULTIMA_PRECISION=Number.isFinite(precision)?precision:null;
    ZX_GPS_ULTIMO_ERROR="";

    try{
      localStorage.setItem("zentryx_gps_ultimo_estado",JSON.stringify({
        uso_id:String(uso.id),
        vehiculo_id:String(v.id),
        registrado_at:data.registrado_at,
        lat:data.lat,
        lng:data.lng,
        precision_metros:data.precision_metros
      }));
    }catch(e){}
  }finally{
    ZX_GPS_GUARDANDO=false;
  }
}

function solicitarPosicionPrecisa(v,uso){
  if(!navigator.geolocation || document.hidden) return;

  navigator.geolocation.getCurrentPosition(
    function(pos){
      guardarPuntoGPS(v,uso,pos).catch(function(e){
        ZX_GPS_ULTIMO_ERROR=String(e&&e.message||e||"No se pudo guardar la posición");
      });
    },
    function(err){
      ZX_GPS_ULTIMO_ERROR=String(err&&err.message||"No se pudo obtener la ubicación");
    },
    {
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:12000
    }
  );
}

function iniciarWatchGPS(v,uso){
  if(!navigator.geolocation || !v || !uso || !uso.id) return;

  const usoId=String(uso.id);
  if(ZX_GPS_WATCH_ID!=null && ZX_GPS_USO_ID===usoId) return;

  detenerSeguimientoGPS();
  ZX_GPS_USO_ID=usoId;
  ZX_GPS_USO_RESUELTO=uso;
  ZX_GPS_USO_RESUELTO_AT=0;

  ZX_GPS_WATCH_ID=navigator.geolocation.watchPosition(
    function(pos){
      guardarPuntoGPS(v,uso,pos).catch(function(e){
        ZX_GPS_ULTIMO_ERROR=String(e&&e.message||e||"No se pudo guardar la posición");
      });
    },
    function(err){
      ZX_GPS_ULTIMO_ERROR=String(err&&err.message||"No se pudo obtener la ubicación");
    },
    {
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:15000
    }
  );

  // Safari puede entregar pocos eventos del watchPosition.
  // Este sondeo pide una lectura nueva mientras Zentryx está visible.
  solicitarPosicionPrecisa(v,uso);

  ZX_GPS_POLL_TIMER=setInterval(function(){
    solicitarPosicionPrecisa(v,uso);
  },7000);
}

function iniciarSeguimientoGPSActual(){
  if(!navigator.geolocation) return;
  const v=(ZX_VEH_CACHE||[]).find(function(x){
    return esResponsableActual(x)
      && estadoVehiculo(x)==="uso"
      && (x.seguimiento_gps_habilitado===true||x.seguimiento_gps_habilitado==="true");
  });
  if(!v){
    detenerSeguimientoGPS();
    return;
  }
  const uso=v.__uso_actual||null;
  if(!uso||!uso.id){
    detenerSeguimientoGPS();
    return;
  }
  iniciarWatchGPS(v,uso);
}

async function buscarUsoGPSActual(){
  const u=identidadActual();
  if(!u.id) return null;

  const usos=await zxGet("usos_vehiculos",{
    query:function(q){
      return q.eq("usuario_id",String(u.id))
        .in("estado",["en_uso","pendiente_devolucion"])
        .order("inicio_at",{ascending:false})
        .limit(5);
    }
  });

  const uso=(usos.data||[]).find(function(x){
    return String(x.usuario_id||"")===String(u.id)
      && ["en_uso","pendiente_devolucion"].includes(String(x.estado||""));
  })||null;

  if(!uso) return null;

  const vehiculos=await zxGet(TABLA,{
    query:function(q){return q.eq("id",String(uso.vehiculo_id)).limit(1);}
  });
  const v=(vehiculos.data||[]).find(function(x){
    return String(x.id||"")===String(uso.vehiculo_id||"");
  }) || cacheBackend(TABLA).find(function(x){
    return String(x.id||"")===String(uso.vehiculo_id||"");
  }) || null;

  if(!v) return null;
  v.__uso_actual=uso;
  return {vehiculo:v,uso:uso};
}

async function refrescarSeguimientoGPSGlobal(){
  if(ZX_GPS_REFRESHING) return;
  ZX_GPS_REFRESHING=true;
  try{
    if(!navigator.geolocation){
      detenerSeguimientoGPS();
      return;
    }

    const actual=await buscarUsoGPSActual();
    if(!actual){
      detenerSeguimientoGPS();
      return;
    }

    const v=actual.vehiculo;
    const activo=v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true";
    if(!activo){
      detenerSeguimientoGPS();
      return;
    }

    iniciarWatchGPS(v,actual.uso);
  }catch(e){
    ZX_GPS_ULTIMO_ERROR=String(e&&e.message||e||"No se pudo iniciar el seguimiento");
  }finally{
    ZX_GPS_REFRESHING=false;
  }
}

function instalarSeguimientoGPSGlobal(){
  if(window.ZX_GPS_GLOBAL_VEHICULOS_INSTALADO) return;
  window.ZX_GPS_GLOBAL_VEHICULOS_INSTALADO=true;

  const refrescar=function(){
    refrescarSeguimientoGPSGlobal().catch(function(){});
  };

  setTimeout(refrescar,1200);

  if(ZX_GPS_REFRESH_TIMER) clearInterval(ZX_GPS_REFRESH_TIMER);
  ZX_GPS_REFRESH_TIMER=setInterval(refrescar,45000);

  window.addEventListener("online",refrescar);
  window.addEventListener("focus",refrescar);
  document.addEventListener("visibilitychange",function(){
    if(!document.hidden) refrescar();
  });

  [
    "zentryx:vehiculo:cambio",
    "zentryx:vehiculo:asignado",
    "zentryx:vehiculo:devuelto",
    "zentryx:sync:complete"
  ].forEach(function(nombre){
    window.addEventListener(nombre,refrescar);
  });
}

async function insertarNotificacion(usuarioId,titulo,mensaje){
  if(!usuarioId) return;
  try{
    const r=await zxInsert("notificaciones",{
      id:uuid(),
      usuario_id:String(usuarioId),
      titulo:String(titulo||"Vehículo"),
      mensaje:String(mensaje||""),
      tipo:"vehiculo",
      leida:false,
      created_at:ahoraISO()
    });
    if(r && r.error) throw r.error;
  }catch(e){
    try{
      await zxInsert("avisos",{
        id:uuid(), usuario_id:String(usuarioId), titulo:String(titulo||"Vehículo"),
        mensaje:String(mensaje||""), tipo:"vehiculo", leida:false, created_at:ahoraISO()
      });
    }catch(e2){}
  }
}

async function cargarUsosYRecuperaciones(){
  ZX_USOS_ACTUALES={};
  ZX_RECUPERACIONES={};
  const u=identidadActual();

  try{
    const r=await zxGet("usos_vehiculos",{
      query:function(q){
        return q.in("estado",["en_uso","pendiente_devolucion"]).order("inicio_at",{ascending:false});
      }
    });
    (r.data||[])
      .filter(x=>["en_uso","pendiente_devolucion"].includes(String(x.estado||"")))
      .sort((a,b)=>new Date(b.inicio_at||0)-new Date(a.inicio_at||0))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_USOS_ACTUALES[key]) ZX_USOS_ACTUALES[key]=x;
      });
  }catch(e){
    cacheBackend("usos_vehiculos")
      .filter(x=>["en_uso","pendiente_devolucion"].includes(String(x.estado||"")))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_USOS_ACTUALES[key]) ZX_USOS_ACTUALES[key]=x;
      });
  }

  if(!u.id) return;

  try{
    const r=await zxGet("transferencias_vehiculos",{
      query:function(q){
        return q.eq("usuario_anterior_id",u.id)
          .eq("aviso_liberacion_enviado",true)
          .eq("respuesta_usuario_anterior","pendiente")
          .order("created_at",{ascending:false});
      }
    });
    (r.data||[])
      .filter(x=>String(x.usuario_anterior_id||"")===u.id && x.aviso_liberacion_enviado===true && String(x.respuesta_usuario_anterior||"")==="pendiente")
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))
      .forEach(x=>{
        const key=String(x.vehiculo_id||"");
        if(key && !ZX_RECUPERACIONES[key]) ZX_RECUPERACIONES[key]=x;
      });
  }catch(e){}
}

async function cargarDetalleVehiculo(id){
  const vehId=String(id);
  const out={usos:[],transferencias:[],puntos:[],auditoria:[],errores:[]};

  function filasCache(tabla){
    try{
      const data=cacheBackend(tabla);
      return Array.isArray(data)?data:[];
    }catch(e){return []}
  }
  function conTimeout(promesa,ms,etiqueta){
    return Promise.race([
      promesa,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("Tiempo agotado: "+etiqueta)),ms))
    ]);
  }

  // Primero dejamos preparados datos locales para que siempre exista respaldo.
  const cacheUsos=filasCache("usos_vehiculos")
    .filter(x=>String(x.vehiculo_id||"")===vehId)
    .sort((a,b)=>new Date(b.inicio_at||0)-new Date(a.inicio_at||0)).slice(0,30);
  const cacheTransferencias=filasCache("transferencias_vehiculos")
    .filter(x=>String(x.vehiculo_id||"")===vehId)
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,30);
  const cachePuntos=filasCache("rutas_vehiculos_puntos")
    .filter(x=>String(x.vehiculo_id||"")===vehId)
    .sort((a,b)=>new Date(b.registrado_at||0)-new Date(a.registrado_at||0)).slice(0,2000).sort((a,b)=>new Date(a.registrado_at||0)-new Date(b.registrado_at||0));

  function datosAuditoria(a){
    try{
      if(!a) return {};
      if(a.datos && typeof a.datos==="object") return a.datos;
      return JSON.parse(a.datos||"{}")||{};
    }catch(e){return {}}
  }
  const cacheAuditoria=filasCache("vehiculos_auditoria")
    .filter(function(a){
      return String(a.vehiculo_id||"")===vehId;
    })
    .sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0)).slice(0,100);

  async function cargar(tabla,consulta,filtro,orden,limite,clave){
    try{
      const r=await conTimeout(zxGet(tabla,{query:consulta}),5500,tabla);
      if(r&&r.error) throw r.error;
      const filas=(r&&Array.isArray(r.data)?r.data:[]).filter(filtro).sort(orden).slice(0,limite);
      out[clave]=filas;
    }catch(e){
      out.errores.push({
        tabla:tabla,
        clave:clave,
        mensaje:(e&&e.message?e.message:"Error")
      });
    }
  }

  await Promise.all([
    cargar("usos_vehiculos",q=>q.eq("vehiculo_id",vehId).order("inicio_at",{ascending:false}).limit(30),
      x=>String(x.vehiculo_id||"")===vehId,(a,b)=>new Date(b.inicio_at||0)-new Date(a.inicio_at||0),30,"usos"),
    cargar("transferencias_vehiculos",q=>q.eq("vehiculo_id",vehId).order("created_at",{ascending:false}).limit(30),
      x=>String(x.vehiculo_id||"")===vehId,(a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0),30,"transferencias"),
    cargar("rutas_vehiculos_puntos",q=>q.eq("vehiculo_id",vehId).order("registrado_at",{ascending:false}).limit(2000),
      x=>String(x.vehiculo_id||"")===vehId,(a,b)=>new Date(a.registrado_at||0)-new Date(b.registrado_at||0),2000,"puntos"),
    cargar("vehiculos_auditoria",q=>q.eq("vehiculo_id",vehId).order("fecha",{ascending:false}).limit(200),
      function(a){return String(a.vehiculo_id||"")===vehId},
      (a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0),100,"auditoria")
  ]);

  if(!out.usos.length) out.usos=cacheUsos;
  if(!out.transferencias.length) out.transferencias=cacheTransferencias;
  if(!out.puntos.length) out.puntos=cachePuntos;
  if(!out.auditoria.length) out.auditoria=cacheAuditoria;

  const actual=ZX_USOS_ACTUALES[vehId];
  if(!out.usos.length && actual) out.usos=[actual];
  return out;
}

function cargarLeaflet(){
  if(window.L) return Promise.resolve(window.L);
  if(ZX_LEAFLET_PROMISE) return ZX_LEAFLET_PROMISE;
  ZX_LEAFLET_PROMISE=new Promise(function(resolve,reject){
    if(!document.getElementById("zx_leaflet_css")){
      const link=document.createElement("link");
      link.id="zx_leaflet_css";
      link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin="";
      document.head.appendChild(link);
    }
    const existente=document.getElementById("zx_leaflet_js");
    if(existente){
      const esperar=setInterval(function(){
        if(window.L){clearInterval(esperar);resolve(window.L)}
      },50);
      setTimeout(function(){clearInterval(esperar);if(!window.L)reject(new Error("No se pudo cargar el mapa"))},10000);
      return;
    }
    const script=document.createElement("script");
    script.id="zx_leaflet_js";
    script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.crossOrigin="";
    script.onload=function(){window.L?resolve(window.L):reject(new Error("Leaflet no disponible"))};
    script.onerror=function(){reject(new Error("No se pudo cargar el mapa"))};
    document.head.appendChild(script);
  });
  return ZX_LEAFLET_PROMISE;
}

function puntoValido(p){
  return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
}

function ordenarPuntos(puntos){
  const vistos=new Set();
  return (puntos||[]).filter(puntoValido).sort(function(a,b){
    return new Date(a.registrado_at||0)-new Date(b.registrado_at||0);
  }).filter(function(p){
    const k=String(p.id||"")+"|"+Number(p.lat).toFixed(7)+"|"+Number(p.lng).toFixed(7)+"|"+String(p.registrado_at||"");
    if(vistos.has(k)) return false;
    vistos.add(k);return true;
  });
}

function distanciaRuta(puntos){
  let total=0;
  for(let i=1;i<puntos.length;i++) total+=distanciaMetros(puntos[i-1],puntos[i]);
  return total;
}

function puntosCoordenadasUnicas(puntos){
  const vistos=new Set();
  return ordenarPuntos(puntos).filter(function(p){
    const k=Number(p.lat).toFixed(5)+"|"+Number(p.lng).toFixed(5);
    if(vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

function textoDistancia(metros){
  if(!Number.isFinite(metros)) return "0 m";
  return metros>=1000 ? (metros/1000).toFixed(metros>=10000?1:2)+" km" : Math.round(metros)+" m";
}

function crearIconoRuta(tipo){
  const L=window.L;
  const color=tipo==="inicio"?"#16a34a":tipo==="actual"?"#2563eb":"#dc2626";
  const simbolo=tipo==="inicio"?"▶":tipo==="actual"?"●":"■";
  return L.divIcon({
    className:"zx_ruta_marker_wrap",
    html:'<div class="zx_ruta_marker" style="background:'+color+'">'+simbolo+'</div>',
    iconSize:[28,28],iconAnchor:[14,14]
  });
}

function actualizarResumenRuta(){
  const p=ordenarPuntos(ZX_RUTA_PUNTOS);
  const n=document.getElementById("zx_ruta_num_puntos");
  const d=document.getElementById("zx_ruta_distancia");
  const h=document.getElementById("zx_ruta_ultima_hora");
  const cab=document.getElementById("zx_ruta_cab_estado");
  const tab=document.getElementById("zx_ruta_tab_btn");
  const selector=document.getElementById("zx_ruta_selector");
  if(n) n.textContent=String(p.length);
  if(d) d.textContent=textoDistancia(distanciaRuta(p));
  if(h) h.textContent=p.length?fechaHoraES(p[p.length-1].registrado_at):"-";
  if(cab) cab.textContent=p.length ? "Línea trazada con los puntos registrados por Zentryx." : "Todavía no hay posiciones para este uso.";
  if(tab) tab.textContent="Ruta ("+p.length+")";
  if(selector && selector.selectedOptions && selector.selectedOptions[0]){
    const op=selector.selectedOptions[0];
    const usoTxt=op.dataset.usoNombre||"Usuario";
    const fechaTxt=p.length?fechaHoraES(p[p.length-1].registrado_at):(op.dataset.fechaBase||"");
    op.textContent=fechaTxt+" · "+usoTxt+" · "+p.length+" puntos";
  }
}

function dibujarRutaExacta(ajustar){
  if(!ZX_RUTA_MAPA || !window.L) return;
  const L=window.L;
  const puntos=ordenarPuntos(ZX_RUTA_PUNTOS);
  ZX_RUTA_PUNTOS=puntos;
  if(ZX_RUTA_LINEA){try{ZX_RUTA_MAPA.removeLayer(ZX_RUTA_LINEA)}catch(e){}}
  ZX_RUTA_MARCADORES.forEach(function(m){try{ZX_RUTA_MAPA.removeLayer(m)}catch(e){}});
  ZX_RUTA_MARCADORES=[];
  if(!puntos.length){actualizarResumenRuta();return;}
  const latlngs=puntos.map(p=>[Number(p.lat),Number(p.lng)]);
  const unicos=puntosCoordenadasUnicas(puntos);
  const latlngsUnicos=unicos.map(p=>[Number(p.lat),Number(p.lng)]);
  if(latlngsUnicos.length>1){
    ZX_RUTA_LINEA=L.polyline(latlngs,{color:"#2563eb",weight:6,opacity:.9,lineJoin:"round"}).addTo(ZX_RUTA_MAPA);
  }else{
    ZX_RUTA_LINEA=null;
  }
  puntos.forEach(function(p){
    const c=L.circleMarker([Number(p.lat),Number(p.lng)],{radius:3,color:"#1d4ed8",weight:1,fillColor:"#60a5fa",fillOpacity:.65}).addTo(ZX_RUTA_MAPA);
    ZX_RUTA_MARCADORES.push(c);
  });
  const inicio=L.marker(latlngs[0],{icon:crearIconoRuta("inicio")}).addTo(ZX_RUTA_MAPA).bindPopup("Inicio · "+fechaHoraES(puntos[0].registrado_at));
  const finTipo=ZX_RUTA_USO_ID && estadoVehiculo(vehiculoPorId(ZX_RUTA_VEHICULO_ID)||{})==="uso"?"actual":"fin";
  const fin=L.marker(latlngs[latlngs.length-1],{icon:crearIconoRuta(finTipo)}).addTo(ZX_RUTA_MAPA).bindPopup((finTipo==="actual"?"Posición más reciente · ":"Fin · ")+fechaHoraES(puntos[puntos.length-1].registrado_at));
  ZX_RUTA_MARCADORES.push(inicio,fin);
  const estado=document.getElementById("zx_ruta_estado");
  if(estado) estado.textContent=latlngsUnicos.length>1 ? "Recorrido dibujado con los puntos GPS de esta sesión." : "Esta sesión contiene posiciones en el mismo lugar; no existe desplazamiento que dibujar.";
  if(ajustar){
    if(latlngsUnicos.length<=1) ZX_RUTA_MAPA.setView(latlngs[0],17);
    else ZX_RUTA_MAPA.fitBounds(L.latLngBounds(latlngsUnicos),{padding:[24,24]});
  }
  actualizarResumenRuta();
}

async function crearMapaRutaExacta(contenedorId,puntos,vehiculoId,usoId,enDirecto){
  limpiarMapaRuta();
  ZX_RUTA_VEHICULO_ID=String(vehiculoId||"");
  ZX_RUTA_USO_ID=String(usoId||"");
  ZX_RUTA_PUNTOS=ordenarPuntos(puntos);
  const cont=document.getElementById(contenedorId);
  if(!cont) return;
  try{
    const L=await cargarLeaflet();
    if(!document.getElementById(contenedorId)) return;
    ZX_RUTA_MAPA=L.map(contenedorId,{zoomControl:true,attributionControl:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap'
    }).addTo(ZX_RUTA_MAPA);
    dibujarRutaExacta(true);
    setTimeout(function(){if(ZX_RUTA_MAPA)ZX_RUTA_MAPA.invalidateSize()},150);
    if(enDirecto && esAdmin()) iniciarRutaEnDirecto();
  }catch(e){
    cont.innerHTML='<div class="zx_veh_map_error">No se pudo cargar el mapa. Comprueba la conexión.</div>';
  }
}

function agregarPuntoRuta(p){
  if(!puntoValido(p)) return;
  if(ZX_RUTA_USO_ID && String(p.uso_vehiculo_id||"")!==ZX_RUTA_USO_ID) return;
  ZX_RUTA_PUNTOS.push(p);
  dibujarRutaExacta(false);
  const pts=ordenarPuntos(ZX_RUTA_PUNTOS);
  if(ZX_RUTA_MAPA && pts.length) ZX_RUTA_MAPA.panTo([Number(pts[pts.length-1].lat),Number(pts[pts.length-1].lng)],{animate:true});
}

async function refrescarRutaEnDirecto(){
  if(!ZX_RUTA_VEHICULO_ID) return;
  try{
    const r=await zxGet("rutas_vehiculos_puntos",{
      query:q=>{
        let qq=q.eq("vehiculo_id",ZX_RUTA_VEHICULO_ID).order("registrado_at",{ascending:true}).limit(1000);
        if(ZX_RUTA_USO_ID) qq=qq.eq("uso_vehiculo_id",ZX_RUTA_USO_ID);
        return qq;
      }
    });
    if(r&&Array.isArray(r.data)){
      ZX_RUTA_PUNTOS=ordenarPuntos(r.data);
      dibujarRutaExacta(false);
    }
  }catch(e){}
}

function iniciarRutaEnDirecto(){
  const cliente=sb();
  if(cliente && typeof cliente.channel==="function"){
    try{
      ZX_RUTA_CANAL=cliente.channel("zx_ruta_vehiculo_"+ZX_RUTA_VEHICULO_ID+"_"+Date.now())
        .on("postgres_changes",{
          event:"INSERT",schema:"public",table:"rutas_vehiculos_puntos",
          filter:"vehiculo_id=eq."+ZX_RUTA_VEHICULO_ID
        },function(payload){agregarPuntoRuta(payload.new||{})})
        .subscribe();
    }catch(e){}
  }
  ZX_RUTA_POLL_TIMER=setInterval(refrescarRutaEnDirecto,15000);
}



function tiempoDesde(v){
  if(!v) return "Sin datos";
  const d=new Date(v);
  if(isNaN(d.getTime())) return "Sin datos";
  const s=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
  if(s<60) return "Hace "+s+" s";
  if(s<3600) return "Hace "+Math.floor(s/60)+" min";
  if(s<86400) return "Hace "+Math.floor(s/3600)+" h";
  return "Hace "+Math.floor(s/86400)+" días";
}

function colorPosicionFlota(p){
  if(!p || !p.registrado_at) return "#64748b";
  const ms=Date.now()-new Date(p.registrado_at).getTime();
  if(ms<=120000) return "#16a34a";
  if(ms<=600000) return "#f59e0b";
  return "#dc2626";
}

function crearIconoFlota(v,p){
  const L=window.L;
  const color=colorPosicionFlota(p);
  const matricula=limpiar(v.matricula||"Vehículo");
  return L.divIcon({
    className:"zx_flota_marker_wrap",
    html:'<div class="zx_flota_marker" style="background:'+color+'">🚗</div><div class="zx_flota_marker_label">'+matricula+'</div>',
    iconSize:[74,54],
    iconAnchor:[37,27]
  });
}

function ultimoPuntoPorVehiculo(puntos){
  const out={};
  (puntos||[]).filter(puntoValido).forEach(function(p){
    const id=String(p.vehiculo_id||"");
    if(!id) return;
    const anterior=out[id];
    if(!anterior || new Date(p.registrado_at||0)>new Date(anterior.registrado_at||0)) out[id]=p;
  });
  return out;
}

async function cargarPosicionesFlota(){
  const usos=await zxGet("usos_vehiculos",{
    query:function(q){
      return q.in("estado",["en_uso","pendiente_devolucion"]).order("inicio_at",{ascending:false}).limit(500);
    }
  });

  const activos=[];
  const vistos=new Set();
  (usos.data||[]).forEach(function(u){
    const vehId=String(u.vehiculo_id||"");
    if(!vehId || vistos.has(vehId)) return;
    vistos.add(vehId);
    activos.push(u);
  });

  if(!activos.length) return [];

  const ids=activos.map(function(u){return String(u.vehiculo_id)});
  const puntos=await zxGet("rutas_vehiculos_puntos",{
    query:function(q){
      return q.in("vehiculo_id",ids).order("registrado_at",{ascending:false}).limit(Math.max(200,ids.length*30));
    }
  });

  const ultimos=ultimoPuntoPorVehiculo(puntos.data||[]);
  return activos.map(function(uso){
    const vehiculo=ZX_VEH_CACHE.find(function(v){return String(v.id)===String(uso.vehiculo_id)}) || {
      id:String(uso.vehiculo_id||""),
      matricula:uso.vehiculo_matricula||"Vehículo",
      marca:"",
      modelo:"",
      usuario_actual_nombre:uso.usuario_nombre||""
    };
    return {
      uso:uso,
      vehiculo:vehiculo,
      punto:ultimos[String(uso.vehiculo_id||"")]||null
    };
  });
}

function actualizarResumenFlota(items){
  const total=document.getElementById("zx_flota_total");
  const visibles=document.getElementById("zx_flota_visibles");
  const ultima=document.getElementById("zx_flota_ultima");
  const conPos=(items||[]).filter(function(x){return x.punto}).length;
  const ultimaFecha=(items||[]).map(function(x){return x.punto&&x.punto.registrado_at}).filter(Boolean).sort().pop();
  if(total) total.textContent=String((items||[]).length);
  if(visibles) visibles.textContent=String(conPos);
  if(ultima) ultima.textContent=ultimaFecha ? tiempoDesde(ultimaFecha) : "Sin posiciones";
}

function popupVehiculoFlota(item){
  const v=item.vehiculo||{};
  const u=item.uso||{};
  const p=item.punto||{};
  return '<div class="zx_flota_popup">'
    +'<b>'+limpiar(v.matricula||"Vehículo")+'</b>'
    +'<span>'+limpiar([v.marca,v.modelo].filter(Boolean).join(" ")||"")+'</span>'
    +'<span>👤 '+limpiar(u.usuario_nombre||u.usuario_actual_nombre||v.usuario_actual_nombre||"Sin responsable")+'</span>'
    +(p.registrado_at?'<span>🕒 '+limpiar(fechaHoraES(p.registrado_at))+'</span>':'<span>⚠️ Sin posición GPS</span>')
    +(Number.isFinite(Number(p.velocidad_kmh))?'<span>🚗 '+Math.round(Number(p.velocidad_kmh))+' km/h</span>':'')
    +'</div>';
}

function dibujarFlota(items,ajustar){
  if(!ZX_FLOTA_MAPA || !window.L) return;
  const L=window.L;
  const posiciones=[];

  Object.keys(ZX_FLOTA_MARCADORES).forEach(function(id){
    const existe=(items||[]).some(function(x){return String(x.vehiculo.id)===String(id)&&x.punto});
    if(!existe){
      try{ZX_FLOTA_MAPA.removeLayer(ZX_FLOTA_MARCADORES[id])}catch(e){}
      delete ZX_FLOTA_MARCADORES[id];
    }
  });

  (items||[]).forEach(function(item){
    const v=item.vehiculo||{};
    const p=item.punto;
    if(!puntoValido(p)) return;
    const id=String(v.id||item.uso?.vehiculo_id||"");
    const ll=[Number(p.lat),Number(p.lng)];
    posiciones.push(ll);

    let marker=ZX_FLOTA_MARCADORES[id];
    if(!marker){
      marker=L.marker(ll,{icon:crearIconoFlota(v,p)}).addTo(ZX_FLOTA_MAPA);
      ZX_FLOTA_MARCADORES[id]=marker;
    }else{
      marker.setLatLng(ll);
      marker.setIcon(crearIconoFlota(v,p));
    }
    marker.bindPopup(popupVehiculoFlota(item));
  });

  actualizarResumenFlota(items);

  const lista=document.getElementById("zx_flota_lista");
  if(lista){
    lista.innerHTML=(items||[]).map(function(item){
      const v=item.vehiculo||{};
      const u=item.uso||{};
      const p=item.punto||{};
      return '<button type="button" class="zx_flota_item" data-flota-focus="'+limpiar(v.id||u.vehiculo_id||"")+'">'
        +'<span class="zx_flota_dot" style="background:'+colorPosicionFlota(p)+'"></span>'
        +'<strong>'+limpiar(v.matricula||"Vehículo")+'</strong>'
        +'<small>'+limpiar(u.usuario_nombre||v.usuario_actual_nombre||"Sin responsable")+'</small>'
        +'<em>'+limpiar(p.registrado_at?tiempoDesde(p.registrado_at):"Sin posición")+'</em>'
        +'</button>';
    }).join("") || '<div class="zx_veh_empty">No hay vehículos en uso.</div>';

    lista.querySelectorAll("[data-flota-focus]").forEach(function(btn){
      btn.onclick=function(){
        const m=ZX_FLOTA_MARCADORES[String(btn.dataset.flotaFocus||"")];
        if(m && ZX_FLOTA_MAPA){
          ZX_FLOTA_MAPA.setView(m.getLatLng(),16,{animate:true});
          m.openPopup();
        }
      };
    });
  }

  if(ajustar && posiciones.length){
    if(posiciones.length===1) ZX_FLOTA_MAPA.setView(posiciones[0],16);
    else ZX_FLOTA_MAPA.fitBounds(L.latLngBounds(posiciones),{padding:[30,30]});
  }
}

async function refrescarMapaFlota(ajustar){
  if(ZX_FLOTA_ACTUALIZANDO) return;
  ZX_FLOTA_ACTUALIZANDO=true;
  try{
    const items=await cargarPosicionesFlota();
    ZX_FLOTA_ULTIMAS_POSICIONES={};
    items.forEach(function(x){
      if(x.punto) ZX_FLOTA_ULTIMAS_POSICIONES[String(x.vehiculo.id||x.uso.vehiculo_id||"")]=x.punto;
    });
    dibujarFlota(items,!!ajustar);
  }finally{
    ZX_FLOTA_ACTUALIZANDO=false;
  }
}

function iniciarFlotaEnDirecto(){
  const cliente=sb();
  if(cliente && typeof cliente.channel==="function"){
    try{
      ZX_FLOTA_CANAL=cliente.channel("zx_flota_directo_"+Date.now())
        .on("postgres_changes",{
          event:"INSERT",schema:"public",table:"rutas_vehiculos_puntos"
        },function(){refrescarMapaFlota(false).catch(function(){})})
        .on("postgres_changes",{
          event:"*",schema:"public",table:"usos_vehiculos"
        },function(){refrescarMapaFlota(false).catch(function(){})})
        .subscribe();
    }catch(e){}
  }
  ZX_FLOTA_TIMER=setInterval(function(){
    refrescarMapaFlota(false).catch(function(){});
  },15000);
}

async function abrirMapaFlota(){
  if(!esAdmin() && !["gerente","supervisor","encargado"].includes(rol())){
    alert("No tienes permiso para ver la ubicación de toda la flota.");
    return;
  }

  modal(`
    <div class="zx_flota_head">
      <div>
        <h2>Flota en directo</h2>
        <p>Última posición recibida de cada vehículo en uso.</p>
      </div>
      <span class="zx_flota_live">● EN DIRECTO</span>
    </div>

    <div class="zx_flota_stats">
      <div><strong id="zx_flota_total">0</strong><small>En uso</small></div>
      <div><strong id="zx_flota_visibles">0</strong><small>Con GPS</small></div>
      <div><strong id="zx_flota_ultima">-</strong><small>Última señal</small></div>
    </div>

    <div id="zx_flota_mapa" class="zx_flota_mapa"></div>
    <div id="zx_flota_lista" class="zx_flota_lista"></div>

    <button class="zx_btn_big zx_gris" id="zx_flota_cerrar">Cerrar</button>
  `);

  document.getElementById("zx_flota_cerrar").onclick=cerrarModal;

  const cont=document.getElementById("zx_flota_mapa");
  try{
    const L=await cargarLeaflet();
    if(!document.getElementById("zx_flota_mapa")) return;
    ZX_FLOTA_MAPA=L.map("zx_flota_mapa",{zoomControl:true,attributionControl:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:19,
      attribution:"&copy; OpenStreetMap"
    }).addTo(ZX_FLOTA_MAPA);
    await refrescarMapaFlota(true);
    setTimeout(function(){if(ZX_FLOTA_MAPA)ZX_FLOTA_MAPA.invalidateSize()},180);
    iniciarFlotaEnDirecto();
  }catch(e){
    if(cont) cont.innerHTML='<div class="zx_veh_map_error">No se pudo cargar el mapa de flota.</div>';
  }
}

function obtenerPosicion(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){resolve({lat:null,lng:null});return}
    navigator.geolocation.getCurrentPosition(function(p){
      resolve({lat:p.coords.latitude,lng:p.coords.longitude});
    },function(){resolve({lat:null,lng:null})},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
  });
}

async function zxInsert(tabla,data){
  const b=backend();
  if(b && typeof b.insert==="function") return b.insert(tabla,data);
  if(!sb()) return {data:null,error:new Error("Backend no disponible")};
  return sb().from(tabla).insert([data]);
}

async function zxUpdate(tabla,data,campo,valor){
  const b=backend();
  if(b && typeof b.update==="function"){
    return b.update(tabla,data,{field:campo,value:String(valor)});
  }
  if(!sb()) return {data:null,error:new Error("Backend no disponible")};
  return sb().from(tabla).update(data).eq(campo,String(valor));
}

async function zxVehiculoServidor(id){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return {data:null,error:new Error("Sin conexión con Supabase")};
  try{
    const r=await cliente.from(TABLA).select("*").eq("id",String(id)).maybeSingle();
    return r || {data:null,error:null};
  }catch(e){
    return {data:null,error:e};
  }
}

async function zxGuardarVehiculoServidor(id,data){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return {data:null,error:new Error("Sin conexión con Supabase")};
  try{
    const r=await cliente.from(TABLA).update(data).eq("id",String(id)).select("*").maybeSingle();
    if(r && r.error) return r;
    if(!r || !r.data) return {data:null,error:new Error("Supabase no confirmó la actualización del vehículo")};
    return r;
  }catch(e){
    return {data:null,error:e};
  }
}

async function zxGet(tabla,options){
  const b=backend();
  if(b && typeof b.get==="function") return b.get(tabla,options||{});
  if(!sb()) return {data:[],error:null,offline:true,source:"cache"};
  try{
    let q=sb().from(tabla).select(options?.select||"*");
    if(options && typeof options.query==="function") q=options.query(q);
    const r=await q;
    return r || {data:[],error:null};
  }catch(e){
    return {data:[],error:e};
  }
}

function cacheBackend(tabla){
  const b=backend();
  try{
    if(b && b.cache && typeof b.cache.get==="function") return b.cache.get(tabla)||[];
  }catch(e){}
  return [];
}

function nombreVehiculo(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ") || "Vehículo";
}

function textoBusqueda(v){
  return normalizar([
    v.matricula,v.marca,v.modelo,v.usuario_actual_nombre,v.usuario_asignado,v.km_actual,
    v.estado,v.notas,v.itv_fecha,v.seguro_fecha,v.proxima_revision_fecha
  ].join(" "));
}

function prepararVehiculo(v){
  v.__zx_busqueda=textoBusqueda(v);
  return v;
}

function diasHasta(fecha){
  if(!fecha) return null;
  const f=new Date(String(fecha).slice(0,10)+"T12:00:00");
  if(isNaN(f.getTime())) return null;
  const ahora=new Date(hoy()+"T12:00:00");
  return Math.ceil((f.getTime()-ahora.getTime())/86400000);
}

function avisosVehiculo(v){
  const avisos=[];
  const itv=diasHasta(v.itv_fecha);
  const seguro=diasHasta(v.seguro_fecha);
  const revision=diasHasta(v.proxima_revision_fecha);
  const kmActual=numero(v.km_actual);
  const kmRevision=numero(v.proxima_revision_km);

  if(itv!==null){
    if(itv<0) avisos.push({nivel:"critico",texto:"ITV caducada",detalle:Math.abs(itv)+" día(s)"});
    else if(itv<=45) avisos.push({nivel:"aviso",texto:"ITV próxima",detalle:itv+" día(s)"});
  }
  if(seguro!==null){
    if(seguro<0) avisos.push({nivel:"critico",texto:"Seguro caducado",detalle:Math.abs(seguro)+" día(s)"});
    else if(seguro<=45) avisos.push({nivel:"aviso",texto:"Seguro próximo",detalle:seguro+" día(s)"});
  }
  if(revision!==null){
    if(revision<0) avisos.push({nivel:"critico",texto:"Revisión vencida",detalle:Math.abs(revision)+" día(s)"});
    else if(revision<=30) avisos.push({nivel:"aviso",texto:"Revisión próxima",detalle:revision+" día(s)"});
  }
  if(kmRevision>0){
    const restantes=kmRevision-kmActual;
    if(restantes<=0) avisos.push({nivel:"critico",texto:"Revisión por km vencida",detalle:Math.abs(restantes)+" km"});
    else if(restantes<=1000) avisos.push({nivel:"aviso",texto:"Revisión por km próxima",detalle:restantes+" km"});
  }

  const estado=estadoVehiculo(v);
  if(["averia","taller","fuera_servicio"].includes(estado)){
    avisos.push({nivel:"critico",texto:estadoTexto(v),detalle:"No disponible"});
  }

  const incidencias=Array.isArray(v.__incidencias_activas)?v.__incidencias_activas:incidenciasActivasVehiculo(v);
  incidencias.forEach(function(i){
    const sev=normalizar(i.severidad||"media");
    avisos.push({
      nivel:["alta","critica"].includes(sev)?"critico":"aviso",
      texto:"Incidencia "+textoTipoIncidencia(i.tipo),
      detalle:textoEstadoIncidencia(i.estado)+" · "+(sev==="critica"?"Crítica":sev.charAt(0).toUpperCase()+sev.slice(1))
    });
  });

  return avisos;
}

function tieneAvisos(v){
  return avisosVehiculo(v).length>0;
}

function resumenAvisos(){
  const todos=(ZX_VEH_CACHE||[]).flatMap(function(v){
    return avisosVehiculo(v).map(function(a){
      return Object.assign({vehiculo:v},a);
    });
  });
  return {
    todos:todos,
    criticos:todos.filter(function(a){return a.nivel==="critico"}).length,
    proximos:todos.filter(function(a){return a.nivel==="aviso"}).length
  };
}

function filtrarVehiculos(){
  let lista=ZX_VEH_CACHE || [];

  if(ZX_VEH_FILTRO==="activos") lista=lista.filter(v=>estadoVehiculo(v)!=="inactivo");
  if(ZX_VEH_FILTRO==="libres") lista=lista.filter(v=>estadoVehiculo(v)==="libre" && !esAsignacionHabitual(v));
  if(ZX_VEH_FILTRO==="uso") lista=lista.filter(v=>estadoVehiculo(v)==="uso" || esAsignacionHabitual(v));
  if(ZX_VEH_FILTRO==="inactivos") lista=lista.filter(v=>estadoVehiculo(v)==="inactivo");
  if(ZX_VEH_FILTRO==="avisos") lista=lista.filter(tieneAvisos);

  const q=normalizar(ZX_VEH_BUSQUEDA);
  if(q){
    const partes=q.split(/\s+/).filter(Boolean);
    lista=lista.filter(function(v){
      const txt=v.__zx_busqueda || textoBusqueda(v);
      return txt.includes(q) || partes.every(p=>txt.includes(p));
    });
  }

  return lista;
}

async function cargarVehiculos(){
  if(!puedeEntrar()) return [];
  if(ZX_VEH_CARGANDO) return filtrarVehiculos();
  ZX_VEH_CARGANDO=true;

  try{
    await cargarUsosYRecuperaciones();
    await cargarIncidenciasActivasFlota();
    const r=await zxGet(TABLA,{
      query:function(q){return q.order("matricula",{ascending:true});}
    });
    if(r.error && !(r.data||[]).length) throw r.error;

    let datos=Array.isArray(r.data) ? r.data : [];
    if(!datos.length){
      datos=cacheBackend(TABLA);
    }
    if(!datos.length){
      datos=leerCache();
    }

    ZX_VEH_CACHE=datos.map(function(v){
      const copia=Object.assign({},v);
      copia.__uso_actual=ZX_USOS_ACTUALES[String(copia.id)] || null;
      copia.__recuperacion=ZX_RECUPERACIONES[String(copia.id)] || null;
      copia.__incidencias_activas=incidenciasActivasVehiculo(copia);
      return prepararVehiculo(copia);
    });
    guardarCache(ZX_VEH_CACHE);
  }catch(e){
    const datos=cacheBackend(TABLA);
    ZX_VEH_CACHE=(datos.length ? datos : leerCache()).map(function(v){
      const copia=Object.assign({},v);
      copia.__uso_actual=ZX_USOS_ACTUALES[String(copia.id)] || null;
      copia.__recuperacion=ZX_RECUPERACIONES[String(copia.id)] || null;
      copia.__incidencias_activas=incidenciasActivasVehiculo(copia);
      return prepararVehiculo(copia);
    });
  }finally{
    ZX_VEH_CARGANDO=false;
  }

  return filtrarVehiculos();
}

function resumen(){
  const total=ZX_VEH_CACHE.length;
  const activos=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)!=="inactivo").length;
  const inactivos=total-activos;
  const libres=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)==="libre" && !esAsignacionHabitual(v)).length;
  const asignados=ZX_VEH_CACHE.filter(v=>esAsignacionHabitual(v)).length;
  const avisos=resumenAvisos();

  return `
    <div class="zx_veh_kpis">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${activos}</b><span>Activos</span></div>
      <div><b>${inactivos}</b><span>Inactivos</span></div>
      <div><b>${libres}</b><span>Libres</span></div>
      <div><b>${asignados}</b><span>Asignados</span></div>
      <button type="button" class="zx_veh_kpi_alert ${avisos.criticos ? "has-critical" : avisos.proximos ? "has-warning" : ""}" id="zx_veh_kpi_avisos">
        <b>${avisos.criticos+avisos.proximos}</b>
        <span>Avisos</span>
        <small>${avisos.criticos ? avisos.criticos+" urgente(s)" : avisos.proximos ? avisos.proximos+" próximo(s)" : "Todo al día"}</small>
      </button>
    </div>
  `;
}

function toolbar(total){
  const filtros=ZX_VEH_MODO_OPERATIVO ? [
    ["activos","Disponibles"],
    ["libres","Libres"],
    ["uso","En uso / asignados"]
  ] : [
    ["activos","Activos"],
    ["libres","Libres"],
    ["uso","Asignados"],
    ["inactivos","Inactivos"],
    ["avisos","Avisos"],
    ["todos","Todos"]
  ];

  return `
    <div class="zx_veh_toolbar">
      <div class="zx_veh_search">
        <input id="zx_buscar_vehiculos" type="search" value="${limpiar(ZX_VEH_BUSQUEDA)}" placeholder="Buscar matrícula, marca, modelo, usuario o revisión">
        ${ZX_VEH_BUSQUEDA ? `<button id="zx_limpiar_vehiculos" type="button">✕</button>` : ""}
      </div>

      <div class="zx_veh_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_VEH_FILTRO===f[0] ? "on" : ""}" data-veh-filter="${limpiar(f[0])}">${limpiar(f[1])}</button>`;
        }).join("")}
      </div>

      <div class="zx_veh_resume">${total} resultado(s)</div>
    </div>
  `;
}

function badge(v){
  const e=estadoVehiculo(v);
  if(e==="inactivo") return `<span class="off">Inactivo</span>`;
  if(e==="uso") return `<span class="uso">${limpiar(estadoTexto(v))}</span>`;
  if(["averia","taller","fuera_servicio"].includes(e)) return `<span class="off">${limpiar(estadoTexto(v))}</span>`;
  if(e==="reservado") return `<span class="orange">Reservado</span>`;
  if(esAsignacionHabitual(v)) return `<span class="uso">Asignado</span>`;
  return `<span class="libre">Libre</span>`;
}

function alertaFecha(fecha,diasAviso){
  if(!fecha) return "";
  const f=new Date(String(fecha).slice(0,10)+"T12:00:00");
  if(isNaN(f.getTime())) return "";
  const ahora=new Date(hoy()+"T12:00:00");
  const diff=Math.ceil((f.getTime()-ahora.getTime())/86400000);
  if(diff<0) return "caducado";
  if(diff<=diasAviso) return "pronto";
  return "ok";
}

function renderAvisos(v){
  const avisos=avisosVehiculo(v);
  if(!avisos.length) return "";
  return `<div class="zx_veh_alertas">${avisos.map(function(a){
    return `<span class="${a.nivel==="critico" ? "critical" : "warning"}"><b>${limpiar(a.texto)}</b>${a.detalle ? `<small>${limpiar(a.detalle)}</small>` : ""}</span>`;
  }).join("")}</div>`;
}

function fotoVehiculo(v){
  return v.foto_url || v.imagen_url || v.image_url || v.foto || "";
}

function ubicacionVehiculo(v){
  return v.trabajo_actual_nombre || v.trabajo_actual || v.ubicacion_actual || v.ultima_direccion || "";
}

function renderVehiculo(v){
  const estado=estadoVehiculo(v);
  const uso=v.__uso_actual || null;
  const responsable=responsableNombre(v) || "Sin responsable";
  const enUso=estado==="uso";
  const asignado=esAsignacionHabitual(v);
  const pendiente=normalizar(v.estado_flota)==="pendiente_devolucion";
  const inicio=uso?.inicio_at || v.uso_iniciado_at || null;
  const foto=fotoVehiculo(v);
  const ubicacion=ubicacionVehiculo(v);
  const gpsHabilitado=v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true";
  const usoId=String((v.__uso_actual||{}).id||"");
  const gpsActivo=!!usoId && ZX_GPS_USO_ID===usoId;
  const principal = pendiente && (esResponsableActual(v) || puedeGestionar())
    ? `<button class="orange zx_veh_main_action" data-veh-devolver="${limpiar(v.id)}">📤 Devolver vehículo</button>`
    : asignado
      ? `<button class="blue zx_veh_main_action" data-veh-open="${limpiar(v.id)}">🚗 Ver vehículo</button>`
      : (v.__recuperacion && estado==="libre")
        ? `<button class="purple zx_veh_main_action" data-veh-recuperar="${limpiar(v.id)}">↩️ Volver a utilizar</button>`
        : (estado!=="inactivo" && !["averia","taller","fuera_servicio"].includes(estado))
          ? (estado==="uso" && esResponsableActual(v)
              ? `<button class="green zx_veh_main_action" type="button" disabled>🚗 Tu vehículo en uso</button>`
              : `<button class="green zx_veh_main_action" data-veh-tomar="${limpiar(v.id)}">${estado==="uso" ? "🔄 Asumir vehículo" : "🚗 Utilizar vehículo"}</button>`)
          : "";

  const estadoRuta = gpsHabilitado && gpsActivo
    ? `<div><span>🛰️</span><strong>Ruta activa</strong><small>${ZX_GPS_ULTIMO_REGISTRO ? "Último punto "+limpiar(fechaHoraES(ZX_GPS_ULTIMO_REGISTRO))+(Number.isFinite(ZX_GPS_ULTIMA_PRECISION) ? " · ±"+Math.round(ZX_GPS_ULTIMA_PRECISION)+" m" : "") : "Esperando primera posición"}</small></div>`
    : `<div><span>🛰️</span><strong>Sin ruta activa</strong><small>Sin desplazamiento registrado</small></div>`;

  return `
    <article class="zx_veh_card" data-id="${limpiar(v.id)}">
      <div class="zx_veh_card_head">
        <div class="zx_veh_media ${foto ? "has-photo" : ""}">
          ${foto
            ? `<img src="${limpiar(foto)}" alt="${limpiar(v.matricula || "Vehículo")}" loading="lazy" onerror="this.parentElement.classList.remove('has-photo');this.remove()">`
            : `<span>🚗</span>`}
        </div>
        <div class="zx_veh_identity">
          <div class="zx_veh_modelo">${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "Vehículo")}</div>
          <h3>${limpiar(v.matricula || "Sin matrícula")}</h3>
        </div>
        <div class="zx_veh_status_inline">${badge(v)}</div>
      </div>

      ${renderAvisos(v)}

      <div class="zx_veh_fastline">
        <div><span>👤</span><strong>${limpiar(responsable)}</strong><small>${asignado ? "Asignado a · "+tipoAsignacionTexto(v) : "Responsable actual"}</small></div>
        <div><span>🧭</span><strong>${limpiar(v.km_actual ?? 0)} km</strong><small>Kilometraje total</small></div>
        ${!asignado && enUso && inicio ? `<div><span>🕒</span><strong data-veh-duration-start="${limpiar(inicio)}">${limpiar(duracionDesde(inicio))}</strong><small>Desde ${limpiar(fechaHoraES(inicio))}</small></div>` : ""}
        ${ubicacion ? `<div><span>📍</span><strong>${limpiar(ubicacion)}</strong></div>` : ""}
        ${estadoRuta}
      </div>

      ${principal}

      ${gpsActivo ? `<button class="zx_veh_route_quick" type="button" data-veh-route="${limpiar(v.id)}">🛰️ Ver ruta GPS</button>` : ""}

      <button class="zx_veh_more" type="button" data-veh-more="${limpiar(v.id)}">••• Más opciones</button>
      <div class="zx_veh_more_panel" data-veh-more-panel="${limpiar(v.id)}" hidden>
        ${ZX_VEH_MODO_OPERATIVO
          ? `
            <button class="orange" data-veh-grua="${limpiar(v.id)}">🚨 Aviso grúa</button>
            <button class="gray" data-veh-incidencias="${limpiar(v.id)}">⚠️ Incidencias</button>
            ${enUso && esResponsableActual(v) ? `<button class="orange" data-veh-devolver="${limpiar(v.id)}">📤 Finalizar uso</button>` : ""}
          `
          : `
            <button class="blue" data-veh-open="${limpiar(v.id)}">📄 Ficha completa</button>
            <button class="orange" data-veh-grua="${limpiar(v.id)}">🚨 Aviso grúa</button>
            <button class="gray" data-veh-incidencias="${limpiar(v.id)}">⚠️ Incidencias</button>
            <button class="purple" data-veh-history="${limpiar(v.id)}">🧾 Historial de uso</button>
            <button class="gray" data-veh-movements="${limpiar(v.id)}">🧭 Movimientos</button>
            <button class="gray" data-veh-changes="${limpiar(v.id)}">🔄 Cambios de responsable</button>
            ${gpsHabilitado ? `<button class="gray" data-veh-route="${limpiar(v.id)}">🛰️ Historial GPS</button>` : ""}
            ${puedeGestionar() ? `<button class="gray" data-veh-asignar="${limpiar(v.id)}">${asignado ? "👤 Cambiar responsable" : "👤 Asignar responsable"}</button><button class="gray" data-veh-edit="${limpiar(v.id)}">✏️ Editar ficha</button>` : ""}
            ${enUso && (esResponsableActual(v) || puedeGestionar()) ? `<button class="orange" data-veh-devolver="${limpiar(v.id)}">📤 Finalizar uso</button>` : ""}
            ${esAdmin() ? `<details class="zx_veh_admin_actions"><summary>🔐 Administración</summary>${estado!=="inactivo" ? `<button class="red" data-veh-desactivar="${limpiar(v.id)}">⛔ Desactivar vehículo</button>` : `<button class="green" data-veh-activar="${limpiar(v.id)}">✅ Activar vehículo</button><button class="red" data-veh-eliminar="${limpiar(v.id)}">🗑️ Eliminar definitivamente</button>`}</details>` : ""}
          `}
      </div>
    </article>
  `;
}

function renderListado(lista){
  if(!lista.length) return `<div class="zx_veh_empty">No hay vehículos con este filtro.</div>`;
  return lista.map(renderVehiculo).join("");
}

function pintarShell(lista){
  app().innerHTML=`
    <div class="zx_veh_shell">
      <section class="zx_veh_panel zx_veh_header">
        <div>
          <div class="zx_veh_titleline"><h2>Vehículos</h2><span class="zx_veh_version">V${ZX_VERSION}</span></div>
          <p>Uso real, responsables, kilómetros, documentación, ITV, seguro y revisiones.</p>
          ${navigator.onLine ? "" : `<div class="zx_veh_offline">🟡 Sin conexión · los cambios se guardarán pendientes</div>`}
        </div>
        <div class="zx_veh_header_actions">
          ${!ZX_VEH_MODO_OPERATIVO && (esAdmin() || ["gerente","supervisor","encargado"].includes(rol())) ? `<button class="zx_veh_live_btn" id="btn_mapa_flota">📍 Flota en directo</button>` : ""}
          ${!ZX_VEH_MODO_OPERATIVO && puedeGestionar() ? `<button class="zx_veh_new" id="btn_nuevo_vehiculo">＋ Crear</button>` : ""}
        </div>
      </section>

      <section class="zx_veh_panel">
        ${resumen()}
        ${toolbar(lista.length)}
      </section>

      <section class="zx_veh_panel">
        <div class="zx_veh_list_head">
          <h3>Listado</h3>
          <span>${lista.length} vehículo(s)</span>
        </div>
        <div id="zx_vehiculos_lista" class="zx_veh_list">${renderListado(lista)}</div>
      </section>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_vehiculo");
  if(nuevo) nuevo.onclick=function(){abrirFormulario({})};

  const mapaFlota=document.getElementById("btn_mapa_flota");
  if(mapaFlota) mapaFlota.onclick=function(){abrirMapaFlota()};

  const kpiAvisos=document.getElementById("zx_veh_kpi_avisos");
  if(kpiAvisos) kpiAvisos.onclick=function(){
    const resumenActual=resumenAvisos();
    if(!resumenActual.todos.length){
      alert("No hay avisos pendientes en la flota.");
      return;
    }
    ZX_VEH_FILTRO="avisos";
    repintarLista();
  };

  conectarEventos();
}

function repintarLista(){
  const lista=filtrarVehiculos();
  const box=document.getElementById("zx_vehiculos_lista");
  if(box){
    box.innerHTML=renderListado(lista);
    conectarEventos();
  }
}

function conectarEventos(){
  const buscar=document.getElementById("zx_buscar_vehiculos");
  if(buscar){
    buscar.oninput=function(){
      ZX_VEH_BUSQUEDA=buscar.value || "";
      repintarLista();
    };
  }

  const limpiarBtn=document.getElementById("zx_limpiar_vehiculos");
  if(limpiarBtn){
    limpiarBtn.onclick=function(){
      ZX_VEH_BUSQUEDA="";
      if(buscar) buscar.value="";
      repintarLista();
    };
  }

  document.querySelectorAll("[data-veh-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_VEH_FILTRO=btn.dataset.vehFilter || "activos";
      document.querySelectorAll("[data-veh-filter]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      repintarLista();
    };
  });

  document.querySelectorAll("[data-veh-open]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehOpen,"datos")}});
  document.querySelectorAll("[data-veh-grua]").forEach(btn=>{btn.onclick=function(){abrirAvisoGrua(btn.dataset.vehGrua)}});
  document.querySelectorAll("[data-veh-incidencias]").forEach(btn=>{btn.onclick=function(){abrirIncidenciasVehiculo(btn.dataset.vehIncidencias)}});
  document.querySelectorAll("[data-veh-route]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehRoute,"ruta")}});
  document.querySelectorAll("[data-veh-history]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehHistory,"historial")}});
  document.querySelectorAll("[data-veh-movements]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehMovements,"movimientos")}});
  document.querySelectorAll("[data-veh-changes]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehChanges,"transferencias")}});
  document.querySelectorAll("[data-veh-edit]").forEach(btn=>{btn.onclick=function(){editarVehiculo(btn.dataset.vehEdit)}});
  document.querySelectorAll("[data-veh-asignar]").forEach(btn=>{btn.onclick=function(){gestionarAsignacionVehiculo(btn.dataset.vehAsignar)}});
  document.querySelectorAll("[data-veh-tomar]").forEach(btn=>{btn.onclick=function(){tomarVehiculo(btn.dataset.vehTomar)}});
  document.querySelectorAll("[data-veh-recuperar]").forEach(btn=>{btn.onclick=function(){tomarVehiculo(btn.dataset.vehRecuperar)}});
  document.querySelectorAll("[data-veh-devolver]").forEach(btn=>{btn.onclick=function(){devolverVehiculo(btn.dataset.vehDevolver)}});
  document.querySelectorAll("[data-veh-activar]").forEach(btn=>{btn.onclick=function(){activarVehiculo(btn.dataset.vehActivar)}});
  document.querySelectorAll("[data-veh-desactivar]").forEach(btn=>{btn.onclick=function(){desactivarVehiculo(btn.dataset.vehDesactivar)}});
  document.querySelectorAll("[data-veh-eliminar]").forEach(btn=>{btn.onclick=function(){eliminarVehiculo(btn.dataset.vehEliminar)}});
  document.querySelectorAll("[data-veh-more]").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.vehMore;
      const panel=document.querySelector(`[data-veh-more-panel="${CSS.escape(id)}"]`);
      if(!panel) return;
      const abrir=panel.hasAttribute("hidden");
      document.querySelectorAll("[data-veh-more-panel]").forEach(p=>p.setAttribute("hidden",""));
      document.querySelectorAll("[data-veh-more]").forEach(b=>b.textContent="••• Más opciones");
      if(abrir){panel.removeAttribute("hidden");btn.textContent="✕ Cerrar opciones";}
    };
  });
}

function input(id,label,value,type){
  return `
    <label class="zx_veh_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}



async function activarPantallaEmergencia(){
  try{
    if("wakeLock" in navigator){
      zxEmergencyWakeLock=await navigator.wakeLock.request("screen");
    }
  }catch(e){}
}

async function liberarPantallaEmergencia(){
  try{
    if(zxEmergencyWakeLock){
      await zxEmergencyWakeLock.release();
      zxEmergencyWakeLock=null;
    }
  }catch(e){}
}

function seguroCaducado(fecha){
  if(!fecha) return false;
  const d=new Date(fecha);
  if(Number.isNaN(d.getTime())) return false;
  const hoy=new Date();
  hoy.setHours(0,0,0,0);
  return d<hoy;
}

function mensajeAsistencia(v,seg,pos,dir,pk,carretera){
  const mapa=(Number.isFinite(Number(pos?.lat))&&Number.isFinite(Number(pos?.lng)))
    ?"https://www.google.com/maps?q="+encodeURIComponent(pos.lat+","+pos.lng)
    :"";
  return [
    "🚨 ASISTENCIA VEHÍCULO",
    "Matrícula: "+(v.matricula||"-"),
    "Vehículo: "+([v.marca,v.modelo].filter(Boolean).join(" ")||"-"),
    "Responsable: "+(responsableNombre(v)||"Sin responsable"),
    "Solicitante: "+(identidadActual().nombre||"-"),
    "Kilómetros: "+(v.km_actual??"-"),
    "Aseguradora: "+(seg.compania||"-"),
    "Póliza: "+(seg.poliza||"-"),
    "Teléfono asistencia: "+(seg.telefono||"-"),
    "Dirección: "+(dir?.completa||"-"),
    "Carretera / vía: "+(carretera||dir?.carretera||"-"),
    "Punto kilométrico: "+(pk||"-"),
    "Coordenadas: "+coordTexto(pos?.lat)+", "+coordTexto(pos?.lng),
    mapa?("Mapa: "+mapa):"",
    "Hora: "+new Date().toLocaleString("es-ES")
  ].filter(Boolean).join("\n");
}

function abrirWhatsAppConTexto(texto,telefono){
  const limpio=telefonoLimpio(telefono||"");
  const url=limpio
    ?"https://wa.me/"+encodeURIComponent(limpio)+"?text="+encodeURIComponent(texto)
    :"https://wa.me/?text="+encodeURIComponent(texto);
  window.open(url,"_blank","noopener");
}

async function abrirAvisoGrua(id){
  await activarPantallaEmergencia();
  let v=vehiculoPorId(id);
  if(navigator.onLine && sb()) {
    const remoto=await zxVehiculoServidor(id);
    if(remoto && remoto.data){
      const fresco=prepararVehiculo(Object.assign({},remoto.data,{
        __uso_actual:ZX_USOS_ACTUALES[String(id)] || null,
        __recuperacion:ZX_RECUPERACIONES[String(id)] || null
      }));
      const idx=ZX_VEH_CACHE.findIndex(x=>String(x.id)===String(id));
      if(idx>=0) ZX_VEH_CACHE[idx]=fresco; else ZX_VEH_CACHE.push(fresco);
      guardarCache(ZX_VEH_CACHE);
      v=fresco;
    }
  }
  if(!v){alert("Vehículo no encontrado.");return}
  const seg=datosAsistencia(v);

  modal(`
    <h2>🚨 Centro de emergencia</h2>

    <div class="zx_emergency_quick">
      <a href="tel:112" class="zx_emergency_112">🆘 LLAMAR AL 112</a>
      ${seg.telefono
        ? `<a class="zx_emergency_assistance" id="zx_grua_llamar_top" href="tel:${limpiar(telefonoLimpio(seg.telefono))}">🚛 LLAMAR A ASISTENCIA</a>`
        : `<button class="zx_emergency_assistance disabled" type="button">🚛 ASISTENCIA NO CONFIGURADA</button>`}
      <button id="zx_grua_avisar_empresa" class="zx_emergency_company">🏢 Avisar empresa</button>
      <button id="zx_grua_registrar" class="zx_emergency_incident">📋 Registrar incidencia</button>
      <button id="zx_grua_accidente" class="zx_emergency_accident">🚗 Asistente de accidente</button>
      <button id="zx_grua_whatsapp" class="zx_emergency_whatsapp">💬 Enviar por WhatsApp</button>
    </div>

    <div class="zx_grua_vehicle">
      <strong>${limpiar(v.matricula||"Vehículo")}</strong>
      <span>${limpiar([v.marca,v.modelo].filter(Boolean).join(" ")||"")}</span>
      <div class="zx_vehicle_emergency_grid">
        <div><small>Color</small><b>${limpiar(v.color||"-")}</b></div>
        <div><small>Combustible</small><b>${limpiar(v.combustible||v.tipo_combustible||"-")}</b></div>
        <div><small>Tipo</small><b>${limpiar(v.tipo||v.tipo_vehiculo||"-")}</b></div>
        <div><small>Propietario</small><b>${limpiar(v.empresa_propietaria||v.propietario||"-")}</b></div>
        <div><small>Kilómetros</small><b>${limpiar(v.km_actual??"-")}</b></div>
        <div><small>Responsable</small><b>${limpiar(responsableNombre(v)||"Sin responsable")}</b></div>
        <div class="wide"><small>Última revisión</small><b>${limpiar(fechaES(v.fecha_revision||v.ultima_revision)||"-")}</b></div>
      </div>
    </div>

    <div class="zx_grua_notice">
      Mantén esta pantalla abierta durante la llamada. Aquí tendrás visibles la póliza, el vehículo y tu ubicación exacta.
    </div>

    <section class="zx_grua_section">
      <h3>🛡 Seguro y asistencia</h3>
      <div class="zx_grua_insurance">
        <div><span>Aseguradora</span><b>${limpiar(seg.compania||"No configurada")}</b></div>
        <div><span>N.º póliza</span><b>${limpiar(seg.poliza||"No configurado")}</b></div>
        <div><span>Teléfono</span><b>${limpiar(seg.telefono||"No configurado")}</b></div>
        <div class="${seguroCaducado(seg.vencimiento)?"expired":""}"><span>Vencimiento</span><b>${limpiar(fechaES(seg.vencimiento)||"-")}${seguroCaducado(seg.vencimiento)?" · CADUCADO":""}</b></div>
        ${seg.cobertura?`<div class="wide"><span>Cobertura</span><b>${limpiar(seg.cobertura)}</b></div>`:""}
        ${seg.franquicia?`<div><span>Franquicia</span><b>${limpiar(seg.franquicia)}</b></div>`:""}
        ${seg.expediente?`<div><span>N.º expediente</span><b>${limpiar(seg.expediente)}</b></div>`:""}
        ${seg.instrucciones?`<div class="wide"><span>Instrucciones</span><b>${limpiar(seg.instrucciones)}</b></div>`:""}
      </div>
    </section>

    <section class="zx_grua_section">
      <h3>📍 Ubicación</h3>
      <div id="zx_grua_location" class="zx_grua_location">
        <b>Localizando posición exacta…</b>
        <span>Autoriza el acceso al GPS si Safari lo solicita.</span>
      </div>
    </section>

    <div class="zx_grua_manual">
      <label class="zx_veh_label" for="zx_grua_carretera">Carretera / vía</label>
      <input id="zx_grua_carretera" placeholder="Ej.: A-3, M-219…">
      <label class="zx_veh_label" for="zx_grua_pk">Punto kilométrico (si lo conoces)</label>
      <input id="zx_grua_pk" inputmode="decimal" placeholder="Ej.: 41,5">
      <small>El punto kilométrico solo se muestra cuando se introduce o puede identificarse con fiabilidad.</small>
    </div>

    <div class="zx_grua_actions">
      ${seg.telefono
        ? `<a class="call" id="zx_grua_llamar" href="tel:${limpiar(telefonoLimpio(seg.telefono))}">📞 LLAMAR A ASISTENCIA</a>`
        : `<button class="disabled" type="button">📞 TELÉFONO NO CONFIGURADO</button>`}
      <button class="blue" id="zx_grua_copiar">📋 Copiar todos los datos</button>
      <button class="purple" id="zx_grua_compartir">↗️ Compartir ubicación</button>
      <a class="maps" id="zx_grua_google" href="#" target="_blank" rel="noopener">🌍 Google Maps</a>
      <a class="apple" id="zx_grua_apple" href="#" target="_blank" rel="noopener"> Apple Maps</a>
      <button class="softblue" id="zx_grua_copiar_coord">🧭 Copiar coordenadas</button>
      <button class="softblue" id="zx_grua_copiar_dir">🏠 Copiar dirección</button>
      <button class="gray" id="zx_grua_relocalizar">🔄 Actualizar ubicación</button>
      ${puedeGestionar()?`<button class="orange" id="zx_grua_configurar">⚙️ Configurar seguro</button>`:""}
      <button class="gray" id="zx_grua_cerrar">Cerrar</button>
    </div>
  `);

  let pos={lat:null,lng:null,precision:null,error:"",hora:new Date().toISOString()};
  let dir=null;

  function horaGPS(){
    try{return new Date(pos.hora||Date.now()).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
    catch(e){return "-"}
  }

  function direccionCorta(){
    if(!dir) return "Dirección no disponible";
    return dir.completa||[dir.carretera,dir.localidad,dir.provincia].filter(Boolean).join(", ")||"Dirección no disponible";
  }

  async function localizar(){
    const box=document.getElementById("zx_grua_location");
    if(box) box.innerHTML="<b>📍 Localizando posición exacta…</b><span>Puede tardar unos segundos.</span>";
    pos=await posicionAsistencia();
    dir=await direccionDesdeCoordenadas(pos.lat,pos.lng);
    if(!document.getElementById("zx_grua_location")) return;

    const direccion=direccionCorta();
    box.innerHTML=`
      <div class="zx_location_row wide"><span>Dirección</span><b>${limpiar(direccion)}</b></div>
      <div class="zx_location_row"><span>Municipio</span><b>${limpiar(dir?.localidad||"-")}</b></div>
      <div class="zx_location_row"><span>Provincia</span><b>${limpiar(dir?.provincia||"-")}</b></div>
      <div class="zx_location_row"><span>Código postal</span><b>${limpiar(dir?.codigo_postal||dir?.cp||"-")}</b></div>
      <div class="zx_location_row"><span>Latitud</span><b>${limpiar(coordTexto(pos.lat))}</b></div>
      <div class="zx_location_row"><span>Longitud</span><b>${limpiar(coordTexto(pos.lng))}</b></div>
      <div class="zx_location_row"><span>Precisión</span><b>${pos.precision?"±"+Math.round(pos.precision)+" m":"-"}</b></div>
      <div class="zx_location_row"><span>Hora GPS</span><b>${limpiar(horaGPS())}</b></div>
      ${pos.error?`<em class="wide">${limpiar(pos.error)}</em>`:""}
    `;

    const carretera=document.getElementById("zx_grua_carretera");
    if(carretera&&!carretera.value&&dir?.carretera) carretera.value=dir.carretera;

    if(Number.isFinite(Number(pos.lat))){
      const q=encodeURIComponent(pos.lat+","+pos.lng);
      const google=document.getElementById("zx_grua_google");
      const apple=document.getElementById("zx_grua_apple");
      if(google) google.href="https://www.google.com/maps?q="+q;
      if(apple) apple.href="https://maps.apple.com/?q="+q;
    }
  }

  function textoActual(){
    const fechaGPS=fechaES(pos?.hora||new Date().toISOString())||fechaES(new Date().toISOString());
    return textoAvisoGrua(v,seg,pos,dir,valor("zx_grua_pk"),valor("zx_grua_carretera"))
      +"\nFecha GPS: "+fechaGPS
      +"\nHora GPS: "+horaGPS();
  }

  document.getElementById("zx_grua_cerrar").onclick=async function(){
    await liberarPantallaEmergencia();
    cerrarModal();
  };
  document.getElementById("zx_grua_relocalizar").onclick=localizar;

  document.getElementById("zx_grua_copiar").onclick=async function(){
    try{await navigator.clipboard.writeText(textoActual());alert("Datos copiados.")}
    catch(e){prompt("Copia estos datos:",textoActual())}
  };

  document.getElementById("zx_grua_copiar_coord").onclick=async function(){
    const t=coordTexto(pos.lat)+", "+coordTexto(pos.lng);
    try{await navigator.clipboard.writeText(t);alert("Coordenadas copiadas.")}
    catch(e){prompt("Copia las coordenadas:",t)}
  };

  document.getElementById("zx_grua_copiar_dir").onclick=async function(){
    const t=direccionCorta();
    try{await navigator.clipboard.writeText(t);alert("Dirección copiada.")}
    catch(e){prompt("Copia la dirección:",t)}
  };

  document.getElementById("zx_grua_compartir").onclick=async function(){
    const text=textoActual();
    try{
      if(navigator.share) await navigator.share({title:"Asistencia "+(v.matricula||""),text});
      else throw new Error();
    }catch(e){
      try{await navigator.clipboard.writeText(text);alert("Datos copiados para compartir.")}catch(x){}
    }
  };

  document.getElementById("zx_grua_avisar_empresa").onclick=async function(){
    const text="AVISO A EMPRESA\n"+textoActual();
    try{
      if(navigator.share) await navigator.share({title:"Incidencia "+(v.matricula||""),text});
      else throw new Error();
    }catch(e){
      try{await navigator.clipboard.writeText(text);alert("Aviso copiado. Puedes enviarlo a la empresa.")}catch(x){}
    }
  };

  document.getElementById("zx_grua_registrar").onclick=function(){
    abrirRegistroIncidencia(v,seg,pos,dir,valor("zx_grua_pk"),valor("zx_grua_carretera"),false);
  };

  document.getElementById("zx_grua_accidente").onclick=function(){
    abrirAsistenteAccidente(v,seg,pos,dir,valor("zx_grua_pk"),valor("zx_grua_carretera"));
  };

  document.getElementById("zx_grua_whatsapp").onclick=function(){
    abrirWhatsAppConTexto(textoActual(),seg.whatsapp||seg.telefono||"");
  };

  const configurar=document.getElementById("zx_grua_configurar");
  if(configurar) configurar.onclick=function(){editarAsistencia(v)};

  await localizar();
}

function leerIncidenciasLocales(){
  try{return JSON.parse(localStorage.getItem(INCIDENCIAS_KEY)||"[]")||[]}
  catch(e){return []}
}

function guardarIncidenciaLocal(inc){
  try{
    const lista=leerIncidenciasLocales();
    lista.unshift(inc);
    localStorage.setItem(INCIDENCIAS_KEY,JSON.stringify(lista.slice(0,250)));
    return true;
  }catch(e){return false}
}

function textoTipoIncidencia(tipo){
  const t=normalizar(tipo||"");
  const mapa={
    averia:"Avería",
    accidente:"Accidente",
    pinchazo:"Pinchazo",
    golpe:"Golpe / daños",
    mecanica:"Mecánica",
    electrica:"Eléctrica / batería",
    documentacion:"Documentación",
    otro:"Otro"
  };
  return mapa[t]||String(tipo||"Incidencia").replaceAll("_"," ");
}

function textoEstadoIncidencia(estado){
  const e=normalizar(estado||"");
  const mapa={
    abierta:"Abierta",
    en_revision:"En revisión",
    resuelta:"Resuelta",
    cerrada:"Cerrada",
    cancelada:"Cancelada"
  };
  return mapa[e]||String(estado||"-").replaceAll("_"," ");
}

function claseIncidencia(estado,severidad){
  const e=normalizar(estado||"");
  const s=normalizar(severidad||"");
  if(e==="cerrada"||e==="resuelta") return "resuelta";
  if(s==="critica"||s==="alta") return "alta";
  return "abierta";
}

async function cargarIncidenciasVehiculo(vehiculoId){
  try{
    const r=await zxGet("vehiculos_incidencias",{
      query:function(q){
        return q.eq("vehiculo_id",String(vehiculoId)).order("created_at",{ascending:false}).limit(100);
      }
    });
    if(r&&r.error) throw r.error;
    return Array.isArray(r?.data)?r.data:[];
  }catch(e){
    console.error("No se pudieron cargar incidencias del vehículo",e);
    return [];
  }
}


async function cargarIncidenciasActivasFlota(){
  const mapa={};
  try{
    const r=await zxGet("vehiculos_incidencias",{
      query:function(q){
        return q.in("estado",["abierta","en_revision"]).order("created_at",{ascending:false}).limit(500);
      }
    });
    if(r&&r.error) throw r.error;
    (Array.isArray(r?.data)?r.data:[]).forEach(function(i){
      const id=String(i.vehiculo_id||"");
      if(!id) return;
      if(!mapa[id]) mapa[id]=[];
      mapa[id].push(i);
    });
  }catch(e){
    console.warn("No se pudieron cargar las incidencias activas de la flota.",e);
  }
  ZX_VEH_INCIDENCIAS_ACTIVAS=mapa;
  return mapa;
}

function incidenciasActivasVehiculo(v){
  return ZX_VEH_INCIDENCIAS_ACTIVAS[String(v?.id||"")]||[];
}

function nivelMaximoIncidencias(lista){
  const orden={baja:1,media:2,alta:3,critica:4};
  let max="baja",valor=0;
  (lista||[]).forEach(function(i){
    const s=normalizar(i.severidad||"media");
    const n=orden[s]||2;
    if(n>valor){valor=n;max=s}
  });
  return lista&&lista.length?max:"";
}

function resumenIncidenciasParaUso(lista){
  return (lista||[]).map(function(i){
    return "• "+textoTipoIncidencia(i.tipo)+" · "+textoEstadoIncidencia(i.estado)+" · "+String(i.severidad||"media").toUpperCase()+"\n  "+String(i.descripcion||"Sin descripción");
  }).join("\n");
}

async function cargarAuditoriaIncidencia(v,incidenciaId){
  try{
    const r=await zxGet("vehiculos_auditoria",{
      query:function(q){
        return q.eq("vehiculo_id",String(v.id)).order("fecha",{ascending:false}).limit(250);
      }
    });
    if(r&&r.error) throw r.error;
    const filas=Array.isArray(r?.data)?r.data:[];
    return filas.filter(function(a){
      const d=a&&a.datos&&typeof a.datos==="object" ? a.datos : {};
      return String(d.incidencia_id||"")===String(incidenciaId||"");
    });
  }catch(e){
    console.error("No se pudo cargar la auditoría de la incidencia",e);
    return [];
  }
}

function opcionesEstadoIncidencia(actual){
  return [
    ["abierta","Abierta"],
    ["en_revision","En revisión"],
    ["resuelta","Resuelta"],
    ["cerrada","Cerrada"],
    ["cancelada","Cancelada"]
  ].map(function(x){
    return `<option value="${x[0]}" ${String(actual)===x[0]?"selected":""}>${x[1]}</option>`;
  }).join("");
}

function opcionesSeveridadIncidencia(actual){
  return [
    ["baja","Baja"],
    ["media","Media"],
    ["alta","Alta"],
    ["critica","Crítica"]
  ].map(function(x){
    return `<option value="${x[0]}" ${String(actual)===x[0]?"selected":""}>${x[1]}</option>`;
  }).join("");
}

function textoAccionAuditoriaIncidencia(a){
  const acc=String(a?.accion||"");
  const mapa={
    incidencia_creada:"Incidencia registrada",
    incidencia_actualizada:"Cambios guardados",
    incidencia_seguimiento:"Seguimiento añadido",
    incidencia_resuelta:"Incidencia resuelta",
    incidencia_cerrada:"Incidencia cerrada",
    incidencia_reabierta:"Incidencia reabierta",
    incidencia_cancelada:"Incidencia cancelada"
  };
  return mapa[acc]||acc.replaceAll("_"," ");
}

async function abrirDetalleIncidencia(vehiculoId,incidenciaId){
  const v=ZX_VEH_CACHE.find(x=>String(x.id)===String(vehiculoId));
  if(!v){alert("Vehículo no encontrado.");return}

  const lista=await cargarIncidenciasVehiculo(v.id);
  const inc=lista.find(x=>String(x.id)===String(incidenciaId));
  if(!inc){alert("Incidencia no encontrada.");return}

  const puede=puedeGestionar();
  const auditoria=await cargarAuditoriaIncidencia(v,inc.id);

  const historial=auditoria.length ? auditoria.map(function(a){
    const d=a&&a.datos&&typeof a.datos==="object" ? a.datos : {};
    const comentario=String(d.comentario||d.seguimiento||d.motivo||"").trim();
    const cambio=(d.estado_anterior||d.estado_nuevo)
      ? `<div class="zx_inc_audit_change">${limpiar(d.estado_anterior||"-")} → ${limpiar(d.estado_nuevo||"-")}</div>`
      : "";
    return `<div class="zx_inc_audit_item">
      <div class="zx_inc_audit_top">
        <strong>${limpiar(textoAccionAuditoriaIncidencia(a))}</strong>
        <time>${limpiar(fechaHoraES(a.fecha))}</time>
      </div>
      <div class="zx_inc_audit_user">${limpiar(a.usuario||"-")}</div>
      ${cambio}
      ${comentario?`<p>${limpiar(comentario)}</p>`:""}
    </div>`;
  }).join("") : `<div class="zx_veh_empty">Sin seguimientos todavía.</div>`;

  modal(`
    <div class="zx_veh_view_head">
      <h2>⚠️ ${limpiar(textoTipoIncidencia(inc.tipo))}</h2>
      <button class="zx_view_action blue" id="zx_inc_det_volver_arriba">← Volver</button>
    </div>
    <div class="zx_inc_detail_head">
      <span class="zx_inc_status">${limpiar(textoEstadoIncidencia(inc.estado))}</span>
      <span class="zx_inc_severity">Severidad: ${limpiar(String(inc.severidad||"media"))}</span>
    </div>

    <div class="zx_inc_detail_grid">
      <div><small>FECHA</small><b>${limpiar(fechaHoraES(inc.created_at))}</b></div>
      <div><small>REGISTRADA POR</small><b>${limpiar(inc.nombre_usuario||inc.usuario||"-")}</b></div>
      <div><small>KILÓMETROS</small><b>${inc.km!=null?limpiar(inc.km)+" km":"-"}</b></div>
      <div><small>VEHÍCULO</small><b>${limpiar(inc.vehiculo_matricula||v.matricula||"-")}</b></div>
      ${inc.direccion?`<div class="wide"><small>UBICACIÓN</small><b>${limpiar(inc.direccion)}</b></div>`:""}
      ${inc.aseguradora||inc.poliza?`<div class="wide"><small>SEGURO</small><b>${limpiar([inc.aseguradora,inc.poliza].filter(Boolean).join(" · "))}</b></div>`:""}
    </div>

    <div class="zx_inc_description">
      <small>DESCRIPCIÓN</small>
      <p>${limpiar(inc.descripcion||"Sin descripción")}</p>
    </div>

    ${puede?`
      <div class="zx_inc_manage">
        <h3>Gestionar incidencia</h3>
        <div class="zx_inc_manage_grid">
          <label>Estado
            <select id="zx_inc_det_estado">${opcionesEstadoIncidencia(inc.estado)}</select>
          </label>
          <label>Severidad
            <select id="zx_inc_det_severidad">${opcionesSeveridadIncidencia(inc.severidad)}</select>
          </label>
        </div>
        <label>Seguimiento / comentario
          <textarea id="zx_inc_det_comentario" rows="4" placeholder="Añade una actuación, diagnóstico, llamada, reparación pendiente..."></textarea>
        </label>
        <label>Solución
          <textarea id="zx_inc_det_solucion" rows="3" placeholder="Indica la solución cuando corresponda">${limpiar(inc.solucion||"")}</textarea>
        </label>
        <button class="zx_btn_big zx_verde" id="zx_inc_det_guardar">Guardar cambios</button>
      </div>
    `:""}

    <h3>Historial</h3>
    <div class="zx_inc_audit_list">${historial}</div>

    <button class="zx_btn_big zx_gris" id="zx_inc_det_volver">Volver a incidencias</button>
  `);

  document.getElementById("zx_inc_det_volver").onclick=function(){
    abrirIncidenciasVehiculo(v.id);
  };
  const volverIncArriba=document.getElementById("zx_inc_det_volver_arriba");
  if(volverIncArriba) volverIncArriba.onclick=function(){
    abrirIncidenciasVehiculo(v.id);
  };

  if(puede){
    document.getElementById("zx_inc_det_guardar").onclick=async function(){
      const btn=this;
      const estadoNuevo=valor("zx_inc_det_estado")||inc.estado||"abierta";
      const severidadNueva=valor("zx_inc_det_severidad")||inc.severidad||"media";
      const comentario=valor("zx_inc_det_comentario");
      const solucion=valor("zx_inc_det_solucion");
      const estadoAnterior=String(inc.estado||"abierta");
      const severidadAnterior=String(inc.severidad||"media");
      const ahora=ahoraISO();
      const s=sesion();

      if(estadoNuevo==="cerrada" && !String(solucion||"").trim()){
        alert("Para cerrar la incidencia indica la solución.");
        return;
      }

      btn.disabled=true;
      btn.textContent="Guardando…";

      try{
        const cambios={
          estado:estadoNuevo,
          severidad:severidadNueva,
          updated_at:ahora,
          solucion:String(solucion||"").trim()||null
        };

        if(String(comentario||"").trim()){
          cambios.comentario_revision=String(comentario).trim();
          cambios.revisado_por=String(s.id||s.usuario||"");
          cambios.revisado_en=ahora;
        }

        if(estadoNuevo==="cerrada"){
          cambios.cerrado_por=String(s.id||s.usuario||"");
          cambios.cerrado_en=ahora;
        }else if(estadoAnterior==="cerrada" && estadoNuevo!=="cerrada"){
          cambios.cerrado_por=null;
          cambios.cerrado_en=null;
        }

        const r=await zxUpdate("vehiculos_incidencias",cambios,"id",inc.id);
        if(r&&r.error) throw r.error;

        let accion="incidencia_actualizada";
        if(estadoAnterior!==estadoNuevo){
          if(estadoNuevo==="resuelta") accion="incidencia_resuelta";
          else if(estadoNuevo==="cerrada") accion="incidencia_cerrada";
          else if(estadoNuevo==="cancelada") accion="incidencia_cancelada";
          else if(estadoAnterior==="cerrada"||estadoAnterior==="resuelta"||estadoAnterior==="cancelada") accion="incidencia_reabierta";
        }else if(String(comentario||"").trim()){
          accion="incidencia_seguimiento";
        }

        await registrarAuditoriaVehiculo(
          accion,
          v,
          String(comentario||"").trim(),
          {
            incidencia_id:String(inc.id),
            tipo:inc.tipo,
            estado_anterior:estadoAnterior,
            estado_nuevo:estadoNuevo,
            severidad_anterior:severidadAnterior,
            severidad_nueva:severidadNueva,
            comentario:String(comentario||"").trim(),
            solucion:String(solucion||"").trim()
          }
        );

        alert("Incidencia actualizada.");
        abrirDetalleIncidencia(v.id,inc.id);
      }catch(e){
        console.error(e);
        alert("No se pudieron guardar los cambios de la incidencia.");
        btn.disabled=false;
        btn.textContent="Guardar cambios";
      }
    };
  }
}

async function abrirIncidenciasVehiculo(vehiculoId){
  const v=ZX_VEH_CACHE.find(x=>String(x.id)===String(vehiculoId));
  if(!v){alert("Vehículo no encontrado.");return}

  modal(`
    <h2>⚠️ Incidencias del vehículo</h2>
    <div class="zx_veh_nota_form">Cargando incidencias sincronizadas…</div>
    <div id="zx_veh_incidencias_lista"></div>
    <button class="zx_btn_big zx_naranja" id="zx_veh_incidencia_nueva">＋ Registrar incidencia</button>
    <button class="zx_btn_big zx_gris" id="zx_veh_incidencias_cerrar">Cerrar</button>
  `);

  document.getElementById("zx_veh_incidencias_cerrar").onclick=function(){cerrarModal()};
  document.getElementById("zx_veh_incidencia_nueva").onclick=function(){abrirRegistroIncidenciaDirecta(v)};

  const lista=await cargarIncidenciasVehiculo(v.id);
  const box=document.getElementById("zx_veh_incidencias_lista");
  const nota=document.querySelector("#zx_modal_vehiculo .zx_veh_nota_form");
  if(nota) nota.textContent=lista.length
    ? lista.length+" incidencia(s) registrada(s) en este vehículo."
    : "No hay incidencias registradas para este vehículo.";

  if(!box) return;
  if(!lista.length){
    box.innerHTML=`<div class="zx_veh_empty">Sin incidencias.</div>`;
    return;
  }

  box.innerHTML=lista.map(function(i){
    const km=i.km!=null ? `${limpiar(i.km)} km` : "-";
    return `<button type="button" class="zx_veh_incident_card ${claseIncidencia(i.estado,i.severidad)}" data-inc-open="${limpiar(i.id)}">
      <div class="zx_veh_incident_head">
        <strong>${limpiar(textoTipoIncidencia(i.tipo))}</strong>
        <span>${limpiar(textoEstadoIncidencia(i.estado))} · ${limpiar(String(i.severidad||"media").charAt(0).toUpperCase()+String(i.severidad||"media").slice(1))}</span>
      </div>
      <time>${limpiar(fechaHoraES(i.created_at))}</time>
      <p>${limpiar(i.descripcion||i.titulo||"Sin descripción")}</p>
      <div class="zx_veh_incident_grid">
        <div><small>REGISTRADA POR</small><b>${limpiar(i.nombre_usuario||i.usuario||"-")}</b></div>
        <div><small>KILÓMETROS</small><b>${km}</b></div>
        ${i.direccion?`<div class="wide"><small>UBICACIÓN</small><b>${limpiar(i.direccion)}</b></div>`:""}
        ${i.aseguradora||i.poliza?`<div class="wide"><small>SEGURO</small><b>${limpiar([i.aseguradora,i.poliza].filter(Boolean).join(" · "))}</b></div>`:""}
      </div>
      <div class="zx_inc_open_hint">Ver y gestionar ›</div>
    </button>`;
  }).join("");

  box.querySelectorAll("[data-inc-open]").forEach(function(btn){
    btn.onclick=function(){
      abrirDetalleIncidencia(v.id,btn.dataset.incOpen);
    };
  });
}

async function guardarIncidenciaCentral(v,seg,pos,dir,pk,carretera,tipo,descripcion,severidad){
  const u=identidadActual();
  if(!u.id) throw new Error("No se pudo identificar al usuario.");

  const uso=ZX_USOS_ACTUALES[String(v.id)] || v.__uso_actual || null;
  const carreteraTxt=String(carretera||dir?.carretera||"").trim();
  const pkTxt=String(pk||"").trim();
  const partesDireccion=[
    String(dir?.completa||"").trim(),
    carreteraTxt ? "Vía: "+carreteraTxt : "",
    pkTxt ? "PK: "+pkTxt : ""
  ].filter(Boolean);

  const fila={
    id:uuid(),
    empresa_id:u.empresa_id||null,
    vehiculo_id:String(v.id),
    vehiculo_matricula:v.matricula||null,
    uso_vehiculo_id:uso?.id||null,
    usuario_id:u.id,
    usuario:u.usuario||null,
    nombre_usuario:u.nombre||null,
    tipo:String(tipo||"otro"),
    estado:"abierta",
    severidad:["baja","media","alta","critica"].includes(normalizar(severidad))?normalizar(severidad):"media",
    titulo:textoTipoIncidencia(tipo)+" · "+(v.matricula||"Vehículo"),
    descripcion:String(descripcion||"").trim()||"Sin descripción",
    km:v.km_actual!=null?Number(v.km_actual):null,
    lat:Number.isFinite(Number(pos?.lat))?Number(pos.lat):null,
    lng:Number.isFinite(Number(pos?.lng))?Number(pos.lng):null,
    direccion:partesDireccion.join(" · ")||null,
    precision_metros:Number.isFinite(Number(pos?.precision))?Number(pos.precision):null,
    aseguradora:seg.compania||null,
    poliza:seg.poliza||null,
    telefono_asistencia:seg.telefono||null,
    creado_por:u.id,
    dispositivo:navigator.userAgent||"",
    created_at:ahoraISO(),
    updated_at:ahoraISO()
  };

  const r=await zxInsert("vehiculos_incidencias",fila);
  if(r&&r.error) throw r.error;

  try{
    await registrarAuditoriaVehiculo(
      "incidencia_creada",
      v,
      fila.descripcion,
      {
        incidencia_id:String(fila.id),
        tipo:fila.tipo,
        estado_nuevo:fila.estado,
        severidad_nueva:fila.severidad,
        comentario:fila.descripcion
      }
    );
  }catch(e){
    console.warn("La incidencia se guardó, pero no se pudo registrar su auditoría.",e);
  }

  return fila;
}


async function abrirRegistroIncidenciaDirecta(v){
  if(!v){alert("Vehículo no encontrado.");return}
  const seg=datosAsistencia(v);
  modal(`
    <h2>📋 Registrar incidencia</h2>
    <div class="zx_veh_nota_form">Preparando ubicación y datos del vehículo…</div>
    <div style="padding:18px;text-align:center;font-weight:800">Localizando…</div>
    <button class="zx_btn_big zx_gris" id="zx_inc_directa_cancelar">Cancelar</button>
  `);
  const cancelar=document.getElementById("zx_inc_directa_cancelar");
  if(cancelar) cancelar.onclick=function(){abrirIncidenciasVehiculo(v.id)};

  let pos={lat:null,lng:null,precision:null,error:"",hora:ahoraISO()};
  let dir=null;
  try{
    pos=await posicionAsistencia();
    if(Number.isFinite(Number(pos?.lat))&&Number.isFinite(Number(pos?.lng))){
      dir=await direccionDesdeCoordenadas(pos.lat,pos.lng);
    }
  }catch(e){
    console.warn("No se pudo preparar la ubicación de la incidencia.",e);
  }
  abrirRegistroIncidencia(v,seg,pos,dir,"",dir?.carretera||"",true);
}

function abrirRegistroIncidencia(v,seg,pos,dir,pk,carretera,volverAIncidencias){
  modal(`
    <h2>📋 Registrar incidencia</h2>
    <div class="zx_veh_nota_form">La incidencia quedará sincronizada para poder consultarla desde los dispositivos autorizados.</div>
    <div class="zx_veh_form">
      <label class="zx_veh_label" for="zx_inc_tipo">Tipo</label>
      <select id="zx_inc_tipo">
        <option value="averia">Avería</option>
        <option value="accidente">Accidente</option>
        <option value="pinchazo">Pinchazo</option>
        <option value="golpe">Golpe / daños</option>
        <option value="mecanica">Mecánica</option>
        <option value="electrica">Eléctrica / batería</option>
        <option value="documentacion">Documentación</option>
        <option value="otro">Otro</option>
      </select>
      <label class="zx_veh_label" for="zx_inc_severidad">Gravedad</label>
      <select id="zx_inc_severidad">
        <option value="baja">Baja</option>
        <option value="media" selected>Media</option>
        <option value="alta">Alta</option>
        <option value="critica">Crítica</option>
      </select>
      <label class="zx_veh_label" for="zx_inc_descripcion">Descripción</label>
      <textarea id="zx_inc_descripcion" rows="5" placeholder="Describe brevemente qué ha ocurrido"></textarea>
    </div>
    <button class="zx_btn_big zx_naranja" id="zx_inc_guardar">Guardar incidencia</button>
    <button class="zx_btn_big zx_gris" id="zx_inc_cancelar">Cancelar</button>
  `);

  document.getElementById("zx_inc_cancelar").onclick=function(){volverAIncidencias?abrirIncidenciasVehiculo(v.id):abrirAvisoGrua(v.id)};
  document.getElementById("zx_inc_guardar").onclick=async function(){
    const btn=this;
    const tipo=valor("zx_inc_tipo")||"otro";
    const severidad=valor("zx_inc_severidad")||"media";
    const descripcion=valor("zx_inc_descripcion");
    if(!descripcion){alert("Escribe una descripción breve de la incidencia.");return}

    btn.disabled=true;
    btn.textContent="Guardando…";

    try{
      const fila=await guardarIncidenciaCentral(v,seg,pos,dir,pk,carretera,tipo,descripcion,severidad);
      try{
        const locales=leerIncidenciasLocales().filter(x=>String(x.id||"")!==String(fila.id));
        localStorage.setItem(INCIDENCIAS_KEY,JSON.stringify(locales.slice(0,250)));
      }catch(e){}
      alert("Incidencia registrada y sincronizada.");
      abrirIncidenciasVehiculo(v.id);
    }catch(e){
      const local={
        id:uuid(),
        vehiculo_id:String(v.id),
        matricula:v.matricula||"",
        usuario_id:identidadActual().id||"",
        usuario_nombre:identidadActual().nombre||"",
        tipo,
        severidad,
        descripcion,
        fecha:ahoraISO(),
        km:v.km_actual??null,
        lat:pos?.lat??null,
        lng:pos?.lng??null,
        precision:pos?.precision??null,
        direccion:dir?.completa||"",
        carretera:carretera||dir?.carretera||"",
        punto_km:pk||"",
        aseguradora:seg.compania||"",
        poliza:seg.poliza||"",
        estado:"pendiente_sincronizar"
      };
      guardarIncidenciaLocal(local);
      alert("No se pudo sincronizar la incidencia ahora. Ha quedado guardada en este dispositivo como pendiente.");
      volverAIncidencias?abrirIncidenciasVehiculo(v.id):abrirAvisoGrua(v.id);
    }
  };
}

function leerFotosAccidente(input){
  return new Promise((resolve)=>{
    const files=Array.from(input?.files||[]).slice(0,6);
    if(!files.length){resolve([]);return}
    const out=[];
    let pending=files.length;
    files.forEach(file=>{
      const reader=new FileReader();
      reader.onload=()=>{out.push({name:file.name,type:file.type,data:reader.result});if(--pending===0)resolve(out)};
      reader.onerror=()=>{if(--pending===0)resolve(out)};
      reader.readAsDataURL(file);
    });
  });
}

function abrirAsistenteAccidente(v,seg,pos,dir,pk,carretera){
  modal(`
    <h2>🚗 Asistente de accidente</h2>
    <div class="zx_veh_nota_form">
      Registra solo información objetiva. Ante heridos, riesgo o peligro en la vía, llama primero al 112.
    </div>

    <div class="zx_accident_alerts">
      <a href="tel:112">🆘 Llamar al 112</a>
      ${seg.telefono?`<a href="tel:${limpiar(telefonoLimpio(seg.telefono))}">🚛 Llamar a asistencia</a>`:""}
    </div>

    <div class="zx_veh_form">
      <label class="zx_veh_label" for="zx_acc_heridos">¿Hay heridos?</label>
      <select id="zx_acc_heridos">
        <option value="no">No</option>
        <option value="si">Sí</option>
        <option value="no_se">No lo sé</option>
      </select>

      <label class="zx_veh_label" for="zx_acc_policia">Intervención policial</label>
      <select id="zx_acc_policia">
        <option value="no">No</option>
        <option value="si">Sí</option>
        <option value="solicitada">Solicitada</option>
      </select>

      <label class="zx_veh_label" for="zx_acc_danos">Daños del vehículo</label>
      <textarea id="zx_acc_danos" rows="3" placeholder="Describe los daños visibles"></textarea>

      <label class="zx_veh_label" for="zx_acc_testigos">Testigos</label>
      <textarea id="zx_acc_testigos" rows="3" placeholder="Nombre y teléfono, si los hay"></textarea>

      <label class="zx_veh_label" for="zx_acc_contrario">Datos del contrario</label>
      <textarea id="zx_acc_contrario" rows="4" placeholder="Matrícula, nombre, teléfono, aseguradora…"></textarea>

      <label class="zx_veh_label" for="zx_acc_descripcion">Qué ha ocurrido</label>
      <textarea id="zx_acc_descripcion" rows="5" placeholder="Describe brevemente los hechos"></textarea>

      <div class="zx_voice_row">
        <button type="button" id="zx_acc_dictar">🎤 Dictar</button>
        <span id="zx_acc_dictado_estado"></span>
      </div>

      <label class="zx_veh_label" for="zx_acc_fotos">Fotografías (máximo 6)</label>
      <input id="zx_acc_fotos" type="file" accept="image/*" capture="environment" multiple>
      <small>Haz fotos generales, daños, matrículas y señalización sin ponerte en peligro.</small>
    </div>

    <button class="zx_btn_big zx_naranja" id="zx_acc_guardar">Guardar accidente</button>
    <button class="zx_btn_big zx_gris" id="zx_acc_cancelar">Cancelar</button>
  `);

  document.getElementById("zx_acc_cancelar").onclick=function(){abrirAvisoGrua(v.id)};

  const dictar=document.getElementById("zx_acc_dictar");
  if(dictar){
    dictar.onclick=function(){
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){alert("El dictado no está disponible en este navegador.");return}
      const rec=new SR();
      rec.lang="es-ES";
      rec.interimResults=false;
      rec.maxAlternatives=1;
      document.getElementById("zx_acc_dictado_estado").textContent="Escuchando…";
      rec.onresult=e=>{
        const txt=e.results?.[0]?.[0]?.transcript||"";
        const ta=document.getElementById("zx_acc_descripcion");
        ta.value=(ta.value?ta.value+" ":"")+txt;
      };
      rec.onerror=()=>document.getElementById("zx_acc_dictado_estado").textContent="No se pudo dictar.";
      rec.onend=()=>document.getElementById("zx_acc_dictado_estado").textContent="";
      rec.start();
    };
  }

  document.getElementById("zx_acc_guardar").onclick=async function(){
    const fotos=await leerFotosAccidente(document.getElementById("zx_acc_fotos"));
    const inc={
      id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),
      vehiculo_id:v.id,
      matricula:v.matricula||"",
      usuario_id:identidadActual().id||"",
      usuario_nombre:responsableNombre(v)||identidadActual().nombre||"",
      tipo:"accidente",
      descripcion:valor("zx_acc_descripcion"),
      datos_contrario:valor("zx_acc_contrario"),
      danos_vehiculo:valor("zx_acc_danos"),
      testigos:valor("zx_acc_testigos"),
      heridos:valor("zx_acc_heridos"),
      policia:valor("zx_acc_policia"),
      fotos,
      fecha:new Date().toISOString(),
      km:v.km_actual??null,
      lat:pos?.lat??null,
      lng:pos?.lng??null,
      precision:pos?.precision??null,
      direccion:dir?.completa||"",
      carretera:carretera||dir?.carretera||"",
      punto_km:pk||"",
      aseguradora:seg.compania||"",
      poliza:seg.poliza||"",
      estado:"registrada_local"
    };
    if(!guardarIncidenciaLocal(inc)){alert("No se pudo guardar el accidente.");return}
    alert("Accidente registrado en el dispositivo.");
    abrirAvisoGrua(v.id);
  };
}

function editarAsistencia(v){
  const d=datosAsistencia(v);
  modal(`
    <h2>Seguro y asistencia</h2>
    
    <div class="zx_veh_form">
      ${input("zx_as_compania","Aseguradora",d.compania)}
      ${input("zx_as_poliza","Número de póliza",d.poliza)}
      ${input("zx_as_telefono","Teléfono de asistencia",d.telefono,"tel")}
      ${input("zx_as_telefono2","Teléfono alternativo",d.telefonoAlternativo,"tel")}
      ${input("zx_as_vencimiento","Vencimiento del seguro",d.vencimiento,"date")}
      ${input("zx_as_cobertura","Cobertura",d.cobertura)}
      <label class="zx_veh_label" for="zx_as_instrucciones">Instrucciones especiales</label>
      <textarea id="zx_as_instrucciones" rows="4" placeholder="Asistencia desde km 0, franquicia, pasos especiales…">${limpiar(d.instrucciones)}</textarea>
    </div>
    <button class="zx_btn_big zx_verde" id="zx_as_guardar">Guardar configuración</button>
    <button class="zx_btn_big zx_gris" id="zx_as_cancelar">Cancelar</button>
  `);
  document.getElementById("zx_as_cancelar").onclick=function(){abrirAvisoGrua(v.id)};
  document.getElementById("zx_as_guardar").onclick=async function(){
    if(!navigator.onLine || !sb()){
      alert("Necesitas conexión para guardar los datos del seguro y compartirlos con todos los dispositivos.");
      return;
    }
    const btn=document.getElementById("zx_as_guardar");
    const data={
      seguro_compania:valor("zx_as_compania")||null,
      seguro_poliza:valor("zx_as_poliza")||null,
      seguro_telefono_asistencia:valor("zx_as_telefono")||null,
      seguro_telefono_alternativo:valor("zx_as_telefono2")||null,
      seguro_fecha:valor("zx_as_vencimiento")||null,
      seguro_cobertura:valor("zx_as_cobertura")||null,
      seguro_instrucciones:valor("zx_as_instrucciones")||null,
      updated_at:ahoraISO()
    };
    btn.disabled=true; btn.textContent="Guardando...";
    try{
      const r=await zxGuardarVehiculoServidor(v.id,data);
      if(r && r.error) throw r.error;
      const remoto=r && r.data ? r.data : null;
      if(!remoto) throw new Error("Supabase no devolvió el vehículo actualizado");

      const comprobaciones=[
        ["seguro_compania",data.seguro_compania],
        ["seguro_poliza",data.seguro_poliza],
        ["seguro_telefono_asistencia",data.seguro_telefono_asistencia],
        ["seguro_telefono_alternativo",data.seguro_telefono_alternativo],
        ["seguro_fecha",data.seguro_fecha],
        ["seguro_cobertura",data.seguro_cobertura],
        ["seguro_instrucciones",data.seguro_instrucciones]
      ];
      const distinto=comprobaciones.find(([k,esperado])=>String(remoto[k]??"")!==String(esperado??""));
      if(distinto) throw new Error("Supabase no confirmó correctamente el campo "+distinto[0]);

      guardarAsistenciaLocal(v.id,{
        compania:remoto.seguro_compania||"",
        poliza:remoto.seguro_poliza||"",
        telefono:remoto.seguro_telefono_asistencia||"",
        telefonoAlternativo:remoto.seguro_telefono_alternativo||"",
        cobertura:remoto.seguro_cobertura||"",
        instrucciones:remoto.seguro_instrucciones||""
      });

      const fresco=prepararVehiculo(Object.assign({},remoto,{
        __uso_actual:ZX_USOS_ACTUALES[String(v.id)] || null,
        __recuperacion:ZX_RECUPERACIONES[String(v.id)] || null
      }));
      const idx=ZX_VEH_CACHE.findIndex(x=>String(x.id)===String(v.id));
      if(idx>=0) ZX_VEH_CACHE[idx]=fresco; else ZX_VEH_CACHE.push(fresco);
      guardarCache(ZX_VEH_CACHE);
      await abrirAvisoGrua(v.id);
    }catch(e){
      alert("No se pudo guardar el seguro en Supabase: "+String(e?.message||e||"Error desconocido"));
      btn.disabled=false; btn.textContent="Guardar configuración";
    }
  };
}

function abrirFormulario(v){
  v=v || {};
  if(!puedeGestionar()){alert("No tienes permiso.");return}

  modal(`
    <h2>${v.id ? "Editar ficha del vehículo" : "Nuevo vehículo"}</h2>

    <div class="zx_veh_form">
      <h3>Datos principales</h3>
      ${input("veh_matricula","Matrícula",v.matricula)}
      <div class="zx_veh_grid2">
        <div>${input("veh_marca","Marca",v.marca)}</div>
        <div>${input("veh_modelo","Modelo",v.modelo)}</div>
      </div>
      ${input("veh_km","Km actuales",v.km_actual || 0,"number")}

      <div class="zx_veh_grid2">
        <div>
          <label class="zx_veh_label">Estado</label>
          <div class="zx_veh_readonly">${v.id ? limpiar(estadoTexto(v)) : "Activo"}</div>
        </div>
        <div>
          <label class="zx_veh_label" for="veh_gps">Seguimiento GPS</label>
          <select id="veh_gps">
            <option value="false" ${v.seguimiento_gps_habilitado!==true && v.seguimiento_gps_habilitado!=="true" ? "selected" : ""}>Desactivado</option>
            <option value="true" ${v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true" ? "selected" : ""}>Activado</option>
          </select>
        </div>
      </div>
      <div class="zx_veh_nota_form">La activación y desactivación se gestionan desde <b>Administración</b>, con PIN y motivo.</div>

      <h3>Revisiones y documentación</h3>
      <div class="zx_veh_grid2">
        <div>${input("veh_itv","Fecha ITV",v.itv_fecha,"date")}</div>
        <div>${input("veh_seguro","Vencimiento seguro",v.seguro_fecha,"date")}</div>
      </div>
      <div class="zx_veh_nota_form">Los datos de asistencia se configuran desde <b>Aviso grúa</b>.</div>
      <div class="zx_veh_grid2">
        <div>${input("veh_revision","Próxima revisión",v.proxima_revision_fecha,"date")}</div>
        <div>${input("veh_revision_km","Km próxima revisión",v.proxima_revision_km,"number")}</div>
      </div>

      <label class="zx_veh_label" for="veh_doc">Documento</label>
      <div class="zx_veh_file_wrap"><input id="veh_doc" type="file" accept="image/*,.pdf,.doc,.docx"></div>
      ${v.documento_url ? `<a class="zx_btn_big zx_azul" href="${limpiar(v.documento_url)}" target="_blank">Ver documento actual</a>` : ""}

      <label class="zx_veh_label" for="veh_notas">Notas</label>
      <textarea id="veh_notas" rows="4">${limpiar(v.notas || "")}</textarea>
    </div>

    <button class="zx_btn_big zx_verde" id="veh_guardar">Guardar</button>
    <button class="zx_btn_big zx_gris" id="veh_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_cancelar").onclick=cerrarModal;
  document.getElementById("veh_guardar").onclick=function(){guardarVehiculo(v.id || null,v.documento_url || null,v.documento_nombre || null)};
}

function vehiculoPorId(id){
  return ZX_VEH_CACHE.find(v=>String(v.id)===String(id)) || null;
}

async function editarVehiculo(id){
  const local=vehiculoPorId(id);
  if(!navigator.onLine || !sb()){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado sin conexión.");
    return;
  }

  try{
    const r=await sb().from(TABLA).select("*").eq("id",String(id)).maybeSingle();
    if(r.error || !r.data){
      if(local){abrirFormulario(local);return}
      alert("Vehículo no encontrado.");
      return;
    }
    abrirFormulario(r.data);
  }catch(e){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado.");
  }
}

async function subirDocumento(file,matricula){
  if(!file) return null;
  if(!navigator.onLine || !sb()){
    alert("Para subir documentos necesitas conexión.");
    return null;
  }

  const ext=(file.name.split(".").pop() || "dat").toLowerCase();
  const clean=String(matricula || "vehiculo").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="vehiculos/"+clean+"_"+Date.now()+"."+ext;

  const buckets=["zentryx-vehiculos","zentryx-trabajos","zentryx-clientes"];

  for(const bucket of buckets){
    try{
      const r=await sb().storage.from(bucket).upload(path,file,{upsert:true});
      if(!r.error){
        return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }
    }catch(e){}
  }

  alert("No se pudo subir el documento.");
  return null;
}

async function guardarVehiculo(id,docActual,nombreDocActual){
  const matricula=normalizarMatricula(valor("veh_matricula"));
  if(!matricula){alert("La matrícula es obligatoria.");return}

  if(await existeMatriculaDuplicada(matricula,id)){
    alert("Ya existe un vehículo con la matrícula "+matricula+".");
    return;
  }

  const km=numero(valor("veh_km"));
  if(km<0){alert("Los km no pueden ser negativos.");return}

  const file=(document.getElementById("veh_doc")?.files || [])[0] || null;
  if(file){
    const permitido=/^(image\/|application\/pdf$|application\/msword$|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$)/i.test(String(file.type||""));
    if(!permitido){alert("Formato de documento no permitido.");return}
    if(Number(file.size||0)>15*1024*1024){alert("El documento supera el límite de 15 MB.");return}
  }
  const boton=document.getElementById("veh_guardar");
  if(boton){boton.disabled=true;boton.textContent="Guardando..."}
  const docUrl=await subirDocumento(file,matricula);
  if(file && !docUrl){if(boton){boton.disabled=false;boton.textContent="Guardar"}return}

  const data={
    matricula:matricula,
    marca:valor("veh_marca"),
    modelo:valor("veh_modelo"),
    km_actual:km,
    activo:id ? (vehiculoPorId(id)?.activo!==false && vehiculoPorId(id)?.activo!=="false") : true,
    seguimiento_gps_habilitado:valor("veh_gps")==="true",
    itv_fecha:valor("veh_itv") || null,
    seguro_fecha:valor("veh_seguro") || null,
    proxima_revision_fecha:valor("veh_revision") || null,
    proxima_revision_km:valor("veh_revision_km") ? numero(valor("veh_revision_km")) : null,
    documento_url:docUrl || docActual || null,
    documento_nombre:file ? file.name : nombreDocActual || null,
    notas:valor("veh_notas")
  };

  try{
    let r;
    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id ? await zx().update(TABLA,data,"id",id) : await zx().insert(TABLA,[data]);
    }else if(id){
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }else{
      r=await sb().from(TABLA).insert([data]);
    }

    if(r && r.error) throw r.error;

    const guardado=Object.assign({},vehiculoPorId(id)||{},data,{id:id||((r&&r.data&&r.data[0]&&r.data[0].id)||"")});
    await registrarAuditoriaVehiculo(id?"editar_vehiculo":"crear_vehiculo",guardado,id?"Edición de ficha":"Alta de vehículo",{campos:Object.keys(data)});
    cerrarModal();
    await recargarVehiculosActual();
  }catch(e){
    if(boton){boton.disabled=false;boton.textContent="Guardar"}
    alert("Error guardando vehículo: "+(e.message || "Error"));
  }
}

async function actualizarVehiculo(id,data){
  try{
    let r;
    if(zx() && typeof zx().update==="function"){
      r=await zx().update(TABLA,data,"id",id);
    }else{
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }
    if(r && r.error) throw r.error;
    await recargarVehiculosActual();
  }catch(e){
    alert("No se pudo actualizar el vehículo.");
  }
}


async function cargarUsuariosActivosVehiculo(){
  if(!sb()) throw new Error("No hay conexión con la base de datos.");
  const r=await sb().from("usuarios").select("*").eq("activo",true).order("nombre",{ascending:true});
  if(r.error) throw r.error;
  return (r.data||[]).map(function(u){
    return {
      id:String(u.id||""),
      nombre:String(u.nombre_completo||u.nombre||u.usuario||"Usuario"),
      usuario:String(u.usuario||"")
    };
  }).filter(u=>u.id);
}

async function gestionarAsignacionVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(!puedeGestionar()){alert("No tienes permiso para cambiar el responsable.");return}
  if(estadoVehiculo(v)==="inactivo"){alert("No se puede asignar un vehículo inactivo.");return}

  let usuarios=[];
  try{
    usuarios=await cargarUsuariosActivosVehiculo();
  }catch(e){
    alert("No se pudieron cargar los usuarios activos: "+(e.message||"Error"));
    return;
  }
  if(!usuarios.length){alert("No hay usuarios activos disponibles.");return}

  const actualId=asignadoId(v);
  modal(`
    <h2>${actualId ? "Cambiar responsable" : "Asignar responsable"}</h2>
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Responsable habitual</b><span>${limpiar(asignadoNombre(v)||"Sin asignar")}</span></p>
      ${v.usuario_actual_nombre ? `<p><b>Usuario actual</b><span>${limpiar(v.usuario_actual_nombre)}</span></p>` : ""}
    </div>
    <label class="zx_veh_label" for="veh_responsable_asignado">Nuevo responsable</label>
    <select id="veh_responsable_asignado">
      <option value="">Selecciona un usuario</option>
      ${usuarios.map(u=>`<option value="${limpiar(u.id)}" ${u.id===actualId?"selected":""}>${limpiar(u.nombre)}${u.usuario&&u.usuario!==u.nombre?" · "+limpiar(u.usuario):""}</option>`).join("")}
    </select>
    <label class="zx_veh_label" for="veh_asignacion_motivo">Motivo / observación</label>
    <textarea id="veh_asignacion_motivo" rows="3" placeholder="Indica el motivo del cambio"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_asignar_ok">${actualId?"Guardar cambio":"Asignar vehículo"}</button>
    ${actualId ? `<button class="zx_btn_big zx_naranja" id="veh_retirar_asignacion">Dejar sin responsable</button>` : ""}
    <button class="zx_btn_big zx_gris" id="veh_asignar_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_asignar_cancelar").onclick=cerrarModal;

  document.getElementById("veh_asignar_ok").onclick=async function(){
    const nuevoId=valor("veh_responsable_asignado");
    const nuevo=usuarios.find(u=>u.id===nuevoId);
    if(!nuevo){alert("Selecciona un usuario.");return}
    if(nuevo.id===actualId){alert("Ese usuario ya es el responsable habitual.");return}
    const motivo=String(valor("veh_asignacion_motivo")||"").trim();
    if(!motivo){
      alert("Debes indicar el motivo del cambio de responsable.");
      document.getElementById("veh_asignacion_motivo")?.focus();
      return;
    }
    if(!confirm((actualId?"¿Cambiar":"¿Asignar")+" el responsable habitual a "+nuevo.nombre+"?")) return;

    const btn=document.getElementById("veh_asignar_ok");
    btn.disabled=true; btn.textContent="Guardando...";
    const anteriorId=actualId||"";
    const anteriorNombre=asignadoNombre(v)||"Sin responsable";
    try{
      const r=await zxUpdate(TABLA,{
        usuario_id:nuevo.id,
        usuario_asignado:nuevo.nombre,
        updated_at:ahoraISO()
      },"id",id);
      if(r&&r.error) throw r.error;

      try{
        await registrarAuditoriaVehiculo(actualId?"cambiar_responsable":"asignar_responsable",v,motivo,{
          usuario_anterior_id:anteriorId||null,
          nombre_anterior:anteriorNombre,
          usuario_nuevo_id:nuevo.id,
          nombre_nuevo:nuevo.nombre
        });
      }catch(auditError){
        const rollback=await zxUpdate(TABLA,{
          usuario_id:anteriorId||null,
          usuario_asignado:actualId?anteriorNombre:"",
          updated_at:ahoraISO()
        },"id",id);
        if(rollback&&rollback.error) throw new Error("Falló el historial y tampoco se pudo restaurar la asignación anterior.");
        throw new Error("No se registró el historial. El cambio se ha cancelado.");
      }
      cerrarModal();
      await recargarVehiculosActual();
    }catch(e){
      btn.disabled=false; btn.textContent=actualId?"Guardar cambio":"Asignar vehículo";
      alert("No se pudo cambiar el responsable: "+(e.message||"Error"));
    }
  };

  const retirar=document.getElementById("veh_retirar_asignacion");
  if(retirar) retirar.onclick=async function(){
    const motivo=String(valor("veh_asignacion_motivo")||"").trim();
    if(!motivo){
      alert("Debes indicar el motivo para dejar el vehículo sin responsable.");
      document.getElementById("veh_asignacion_motivo")?.focus();
      return;
    }
    if(!confirm("¿Dejar este vehículo sin responsable habitual?")) return;
    retirar.disabled=true; retirar.textContent="Guardando...";
    try{
      const anteriorId=asignadoId(v);
      const anteriorNombre=asignadoNombre(v)||"Sin responsable";
      const r=await zxUpdate(TABLA,{usuario_id:null,usuario_asignado:"",updated_at:ahoraISO()},"id",id);
      if(r&&r.error) throw r.error;
      try{
        await registrarAuditoriaVehiculo("retirar_responsable",v,motivo,{
          usuario_anterior_id:anteriorId||null,
          nombre_anterior:anteriorNombre,
          usuario_nuevo_id:null,
          nombre_nuevo:"Sin responsable"
        });
      }catch(auditError){
        const rollback=await zxUpdate(TABLA,{usuario_id:anteriorId||null,usuario_asignado:anteriorNombre,updated_at:ahoraISO()},"id",id);
        if(rollback&&rollback.error) throw new Error("Falló el historial y tampoco se pudo restaurar el responsable.");
        throw new Error("No se registró el historial. El cambio se ha cancelado.");
      }
      cerrarModal();
      await recargarVehiculosActual();
    }catch(e){
      retirar.disabled=false; retirar.textContent="Dejar sin responsable";
      alert("No se pudo retirar el responsable: "+(e.message||"Error"));
    }
  };
}

async function tomarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(estadoVehiculo(v)==="inactivo"){alert("Este vehículo está inactivo.");return}

  const actual=responsableNombre(v);
  const ocupado=estadoVehiculo(v)==="uso" && !esResponsableActual(v);

  let incidenciasActivas=[];
  try{
    incidenciasActivas=(await cargarIncidenciasVehiculo(v.id)).filter(function(i){
      return ["abierta","en_revision"].includes(normalizar(i.estado||""));
    });
  }catch(e){incidenciasActivas=[]}

  const nivelIncidencia=nivelMaximoIncidencias(incidenciasActivas);
  const incidenciaBloqueante=["alta","critica"].includes(nivelIncidencia);
  const avisoIncidencias=incidenciasActivas.length
    ? `<div class="zx_veh_aviso ${incidenciaBloqueante?"danger":""}">
        <b>⚠️ ${incidenciasActivas.length} incidencia(s) activa(s)</b>
        <small>${limpiar(resumenIncidenciasParaUso(incidenciasActivas)).replaceAll("\n","<br>")}</small>
        ${incidenciaBloqueante
          ? `<strong>Severidad ${nivelIncidencia==="critica"?"crítica":"alta"}: requiere autorización de administrador para utilizar el vehículo.</strong>`
          : `<strong>Debes confirmar que conoces estas incidencias antes de continuar.</strong>`}
      </div>`
    : "";

  modal(`
    <h2>${ocupado ? "Cambiar responsable" : "Utilizar vehículo"}</h2>
    ${ocupado ? `<div class="zx_veh_aviso">Este vehículo está asignado ahora mismo a <b>${limpiar(actual || "otro usuario")}</b>. ¿Quieres utilizarlo?</div>` : ""}
    ${avisoIncidencias}
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Km registrados</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_inicio_uso">Kilómetros al recogerlo</label>
    <input id="veh_km_inicio_uso" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_motivo_uso">Observación opcional</label>
    <textarea id="veh_motivo_uso" rows="3" placeholder="Solo si necesitas indicar algo"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_tomar_ok">${ocupado ? "Sí, utilizarlo" : "Confirmar uso"}</button>
    <button class="zx_btn_big zx_gris" id="veh_tomar_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_tomar_cancelar").onclick=cerrarModal;
  document.getElementById("veh_tomar_ok").onclick=async function(){
    const km=numero(valor("veh_km_inicio_uso"));
    if(km<numero(v.km_actual)){alert("Los kilómetros no pueden ser inferiores a los registrados.");return}

    let autorizacionIncidencia=false;
    if(incidenciasActivas.length){
      const resumen=resumenIncidenciasParaUso(incidenciasActivas);

      if(incidenciaBloqueante){
        if(!esAdmin()){
          alert("Este vehículo tiene una incidencia de severidad "+(nivelIncidencia==="critica"?"crítica":"alta")+" y no puede utilizarse sin autorización de administrador.");
          return;
        }
        if(!confirm("El vehículo tiene incidencias de severidad "+(nivelIncidencia==="critica"?"CRÍTICA":"ALTA")+":\n\n"+resumen+"\n\n¿Solicitar autorización de administrador para continuar?")) return;
        const pinOk=await validarPinAdministrador();
        if(!pinOk) return;
        autorizacionIncidencia=true;
      }else{
        if(!confirm("Este vehículo tiene incidencias activas:\n\n"+resumen+"\n\n¿Confirmas que las conoces y quieres continuar?")) return;
        autorizacionIncidencia=true;
      }
    }

    const btn=document.getElementById("veh_tomar_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      if(!u.id) throw new Error("No se ha podido identificar al usuario.");
      const pos=await obtenerPosicion();
      const now=ahoraISO();
      const usoAnteriorId=v.uso_actual_id || null;
      const nuevoUsoId=uuid();

      if(ocupado && usoAnteriorId){
        const rCerrar=await zxUpdate("usos_vehiculos",{
          estado:"transferido",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:"Transferido a "+u.nombre,
          actualizado_por:u.id
        },"id",usoAnteriorId);
        if(rCerrar && rCerrar.error) throw rCerrar.error;
      }

      const nuevoUso={
        id:nuevoUsoId,
        empresa_id:u.empresa_id || null,
        vehiculo_id:String(v.id),
        vehiculo_matricula:v.matricula || null,
        usuario_id:u.id,
        usuario:u.usuario || null,
        nombre_usuario:u.nombre,
        estado:"en_uso",
        tipo_uso:"laboral",
        inicio_at:now,
        km_inicio:km,
        lat_inicio:pos.lat,
        lng_inicio:pos.lng,
        motivo_inicio:valor("veh_motivo_uso") || (ocupado ? "Cambio de responsable" : "Uso directo"),
        dispositivo_inicio:navigator.userAgent || "",
        uso_anterior_id:usoAnteriorId,
        usuario_anterior_id:ocupado ? String(v.usuario_actual_id||"") || null : null,
        usuario_anterior_nombre:ocupado ? String(v.usuario_actual_nombre||actual||"") || null : null,
        tomado_sin_liberacion:ocupado,
        seguimiento_gps_activo:v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true",
        creado_por:u.id
      };

      const rUso=await zxInsert("usos_vehiculos",nuevoUso);
      if(rUso && rUso.error) throw rUso.error;

      if(ocupado){
        const rTransfer=await zxInsert("transferencias_vehiculos",{
          id:uuid(),
          empresa_id:u.empresa_id || null,
          vehiculo_id:String(v.id),
          vehiculo_matricula:v.matricula || null,
          uso_anterior_id:usoAnteriorId,
          uso_nuevo_id:nuevoUsoId,
          usuario_anterior_id:String(v.usuario_actual_id||"") || null,
          nombre_anterior:actual || null,
          usuario_nuevo_id:u.id,
          usuario_nuevo:u.usuario || null,
          nombre_nuevo:u.nombre,
          estado:"confirmada",
          km_transferencia:km,
          lat:pos.lat,
          lng:pos.lng,
          mensaje_usuario_anterior:u.nombre+" está utilizando el vehículo "+(v.matricula || ""),
          avisar_al_liberar:true,
          respuesta_usuario_anterior:"pendiente",
          motivo:"Cambio de responsable confirmado",
          dispositivo:navigator.userAgent || "",
          confirmado_por:u.id,
          confirmado_at:now
        });
        if(rTransfer && rTransfer.error) throw rTransfer.error;
        await insertarNotificacion(
          responsableId(v),
          "Vehículo asumido por otro usuario",
          u.nombre+" está utilizando el vehículo "+(v.matricula||"")+". Te avisaremos cuando quede libre."
        );
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:nuevoUsoId,
        usuario_actual_id:u.id,
        usuario_actual_nombre:u.nombre,
        uso_iniciado_at:now,
        estado_flota:"en_uso",
        km_actual:km,
        en_uso:true
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      if(v.__recuperacion && v.__recuperacion.id){
        try{await zxUpdate("transferencias_vehiculos",{respuesta_usuario_anterior:"volver_a_usar"},"id",v.__recuperacion.id)}catch(e){}
      }

      if(autorizacionIncidencia){
        try{
          await registrarAuditoriaVehiculo(
            incidenciaBloqueante?"uso_con_incidencia_autorizado":"uso_con_incidencia_advertida",
            v,
            "Uso iniciado con incidencias activas conocidas",
            {
              uso_id:String(nuevoUsoId),
              incidencias:incidenciasActivas.map(function(i){
                return {id:String(i.id),tipo:i.tipo,estado:i.estado,severidad:i.severidad,descripcion:i.descripcion||""};
              }),
              nivel_maximo:nivelIncidencia,
              autorizado_por:identidadActual().nombre||identidadActual().usuario||"Usuario"
            }
          );
        }catch(e){
          console.warn("No se pudo registrar la aceptación de incidencias.",e);
        }
      }

      cerrarModal();
      await recargarVehiculosActual();
    }catch(e){
      btn.disabled=false;
      btn.textContent=ocupado ? "Sí, utilizarlo" : "Confirmar uso";
      alert("No se pudo asignar el vehículo: "+(e.message || "Error"));
    }
  };
}

async function devolverVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(!esResponsableActual(v) && !puedeGestionar()){
    alert("Solo el responsable actual o un administrador puede finalizar este uso.");
    return;
  }

  let usuariosTransferencia=[];
  try{
    usuariosTransferencia=await cargarUsuariosActivosVehiculo();
  }catch(e){
    usuariosTransferencia=[];
  }
  const responsableActualId=String(v.usuario_actual_id||responsableId(v)||"");
  usuariosTransferencia=usuariosTransferencia.filter(x=>String(x.id)!==responsableActualId);

  modal(`
    <h2>Finalizar uso</h2>
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Responsable</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_salida">Kilómetros actuales</label>
    <input id="veh_km_salida" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_observacion_salida">Incidencia u observación</label>
    <textarea id="veh_observacion_salida" rows="3" placeholder="Déjalo vacío si todo está correcto"></textarea>

    <div class="zx_veh_fin_acciones">
      <button class="zx_btn_big zx_verde" id="veh_devolver_ok">📥 Devolver y dejar libre</button>
      ${usuariosTransferencia.length ? `<button class="zx_btn_big zx_azul" id="veh_transferir_abrir">🔄 Transferir a otro trabajador</button>` : ""}
    </div>

    <div id="veh_transferir_panel" style="display:none;margin-top:14px;padding:14px;border:1px solid #dbe4ef;border-radius:18px;background:#f8fbff">
      <h3 style="margin-top:0">Transferir vehículo</h3>
      <label class="zx_veh_label" for="veh_transferir_usuario">Nuevo responsable</label>
      <select id="veh_transferir_usuario">
        <option value="">Selecciona un trabajador</option>
        ${usuariosTransferencia.map(u=>`<option value="${limpiar(u.id)}">${limpiar(u.nombre)}${u.usuario&&u.usuario!==u.nombre?" · "+limpiar(u.usuario):""}</option>`).join("")}
      </select>
      <label class="zx_veh_label" for="veh_transferir_motivo">Motivo</label>
      <textarea id="veh_transferir_motivo" rows="3" placeholder="Entrega, cambio de turno, sustitución..."></textarea>
      <button class="zx_btn_big zx_verde" id="veh_transferir_ok">Confirmar transferencia</button>
      <button class="zx_btn_big zx_gris" id="veh_transferir_cancelar">Cancelar transferencia</button>
    </div>

    <button class="zx_btn_big zx_gris" id="veh_devolver_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_devolver_cancelar").onclick=cerrarModal;
  const abrirTransfer=document.getElementById("veh_transferir_abrir");
  const panelTransfer=document.getElementById("veh_transferir_panel");
  if(abrirTransfer) abrirTransfer.onclick=function(){
    panelTransfer.style.display="block";
    abrirTransfer.style.display="none";
  };
  const cancelarTransfer=document.getElementById("veh_transferir_cancelar");
  if(cancelarTransfer) cancelarTransfer.onclick=function(){
    panelTransfer.style.display="none";
    if(abrirTransfer) abrirTransfer.style.display="";
  };

  document.getElementById("veh_devolver_ok").onclick=async function(){
    const km=numero(valor("veh_km_salida"));
    if(km<numero(v.km_actual)){alert("Los kilómetros finales no pueden ser inferiores a los actuales.");return}
    const btn=document.getElementById("veh_devolver_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      const pos=await obtenerPosicion();
      const now=ahoraISO();

      if(v.uso_actual_id){
        const rUso=await zxUpdate("usos_vehiculos",{
          estado:"devuelto",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:valor("veh_observacion_salida") || "Devolución normal",
          dispositivo_fin:navigator.userAgent || "",
          actualizado_por:u.id || null
        },"id",v.uso_actual_id);
        if(rUso && rUso.error) throw rUso.error;
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:null,
        usuario_actual_id:null,
        usuario_actual_nombre:null,
        uso_iniciado_at:null,
        estado_flota:"libre",
        km_actual:km,
        en_uso:false
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      try{
        const tr=await sb().from("transferencias_vehiculos").select("*")
          .eq("uso_nuevo_id",String(v.uso_actual_id||""))
          .eq("avisar_al_liberar",true)
          .order("created_at",{ascending:false}).limit(1);
        const t=tr.data&&tr.data[0] ? tr.data[0] : null;
        if(t && t.usuario_anterior_id){
          await zxUpdate("transferencias_vehiculos",{
            aviso_liberacion_enviado:true,
            mensaje_usuario_anterior:(u.nombre||responsableNombre(v)||"El usuario")+" ya ha liberado el vehículo "+(v.matricula||"")
          },"id",t.id);
          await insertarNotificacion(
            t.usuario_anterior_id,
            "Vehículo libre",
            (u.nombre||responsableNombre(v)||"El usuario")+" ha liberado el vehículo "+(v.matricula||"")+". Puedes volver a utilizarlo desde Vehículos."
          );
        }
      }catch(e){}

      detenerSeguimientoGPS();
      cerrarModal();
      await recargarVehiculosActual();
    }catch(e){
      btn.disabled=false;
      btn.textContent="📥 Devolver y dejar libre";
      alert("No se pudo devolver el vehículo: "+(e.message || "Error"));
    }
  };

  const btnTransfer=document.getElementById("veh_transferir_ok");
  if(btnTransfer) btnTransfer.onclick=async function(){
    const km=numero(valor("veh_km_salida"));
    if(km<numero(v.km_actual)){alert("Los kilómetros no pueden ser inferiores a los actuales.");return}
    const nuevoId=String(valor("veh_transferir_usuario")||"");
    const nuevo=usuariosTransferencia.find(x=>String(x.id)===nuevoId);
    if(!nuevo){alert("Selecciona el trabajador que recibe el vehículo.");return}
    const motivo=String(valor("veh_transferir_motivo")||valor("veh_observacion_salida")||"").trim();
    if(!motivo){alert("Indica el motivo de la transferencia.");return}
    if(!confirm("¿Transferir el vehículo a "+nuevo.nombre+"?")) return;

    btnTransfer.disabled=true;
    btnTransfer.textContent="Transfiriendo...";

    try{
      const u=identidadActual();
      const pos=await obtenerPosicion();
      const now=ahoraISO();
      const usoAnteriorId=String(v.uso_actual_id||"")||null;
      const anteriorId=String(v.usuario_actual_id||responsableId(v)||"")||null;
      const anteriorNombre=responsableNombre(v)||null;

      if(!usoAnteriorId) throw new Error("No se ha encontrado el uso activo que debe cerrarse.");

      // Si un intento anterior quedó a medias, reutilizamos el uso nuevo ya creado
      // en vez de duplicarlo. Esto permite completar la transferencia con seguridad.
      let nuevoUsoId=null;
      let usoNuevoExistente=null;
      try{
        const cliente=sb();
        if(cliente && navigator.onLine!==false){
          const q=await cliente
            .from("usos_vehiculos")
            .select("*")
            .eq("uso_anterior_id",usoAnteriorId)
            .eq("usuario_id",nuevo.id)
            .in("estado",["en_uso","pendiente_devolucion"])
            .order("inicio_at",{ascending:false})
            .limit(1);
          if(q&&q.error) throw q.error;
          if(Array.isArray(q?.data)&&q.data.length) usoNuevoExistente=q.data[0];
        }
      }catch(e){
        // Si no puede comprobarse, seguimos con el flujo normal y las protecciones locales.
      }

      if(usoNuevoExistente&&usoNuevoExistente.id){
        nuevoUsoId=String(usoNuevoExistente.id);
      }else{
        const rCerrar=await zxUpdate("usos_vehiculos",{
          estado:"transferido",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          direccion_fin:null,
          motivo_fin:"Transferido a "+nuevo.nombre+" · "+motivo,
          dispositivo_fin:navigator.userAgent||"",
          actualizado_por:u.id||null
        },"id",usoAnteriorId);
        if(rCerrar&&rCerrar.error) throw rCerrar.error;

        nuevoUsoId=uuid();
        const nuevoUso={
          id:nuevoUsoId,
          empresa_id:u.empresa_id||null,
          vehiculo_id:String(v.id),
          vehiculo_matricula:v.matricula||null,
          usuario_id:nuevo.id,
          usuario:nuevo.usuario||null,
          nombre_usuario:nuevo.nombre,
          estado:"en_uso",
          tipo_uso:"laboral",
          inicio_at:now,
          km_inicio:km,
          lat_inicio:pos.lat,
          lng_inicio:pos.lng,
          motivo_inicio:"Transferencia recibida de "+(anteriorNombre||"otro trabajador")+" · "+motivo,
          dispositivo_inicio:navigator.userAgent||"",
          uso_anterior_id:usoAnteriorId,
          usuario_anterior_id:anteriorId,
          usuario_anterior_nombre:anteriorNombre,
          tomado_sin_liberacion:false,
          seguimiento_gps_activo:false,
          creado_por:u.id||null
        };
        const rNuevo=await zxInsert("usos_vehiculos",nuevoUso);
        if(rNuevo&&rNuevo.error) throw rNuevo.error;
      }

      // Evita duplicar el registro de transferencia si el intento anterior lo creó.
      let transferenciaExistente=false;
      try{
        const cliente=sb();
        if(cliente && navigator.onLine!==false){
          const q=await cliente
            .from("transferencias_vehiculos")
            .select("id")
            .eq("uso_anterior_id",usoAnteriorId)
            .eq("uso_nuevo_id",nuevoUsoId)
            .eq("usuario_nuevo_id",nuevo.id)
            .limit(1);
          if(q&&q.error) throw q.error;
          transferenciaExistente=Array.isArray(q?.data)&&q.data.length>0;
        }
      }catch(e){}

      if(!transferenciaExistente){
        const transferenciaId=uuid();
        const rTransfer=await zxInsert("transferencias_vehiculos",{
          id:transferenciaId,
          empresa_id:u.empresa_id||null,
          vehiculo_id:String(v.id),
          vehiculo_matricula:v.matricula||null,
          uso_anterior_id:usoAnteriorId,
          uso_nuevo_id:nuevoUsoId,
          usuario_anterior_id:anteriorId,
          usuario_anterior:v.usuario_actual||null,
          nombre_anterior:anteriorNombre,
          usuario_nuevo_id:nuevo.id,
          usuario_nuevo:nuevo.usuario||null,
          nombre_nuevo:nuevo.nombre,
          estado:"confirmada",
          km_transferencia:km,
          lat:pos.lat,
          lng:pos.lng,
          direccion:null,
          mensaje_usuario_anterior:"Vehículo transferido a "+nuevo.nombre,
          avisar_al_liberar:false,
          aviso_liberacion_enviado:false,
          // respuesta_usuario_anterior se deja NULL: la transferencia ya fue confirmada
          // por quien tiene el vehículo y no requiere respuesta posterior.
          motivo:motivo,
          dispositivo:navigator.userAgent||"",
          // Guardamos el nombre visible del usuario que ejecuta la transferencia.
          // confirmado_por es TEXT y así la auditoría no depende de resolver IDs después.
          confirmado_por:String(u.nombre||u.usuario||u.id||"Usuario"),
          confirmado_at:now
        });
        if(rTransfer&&rTransfer.error) throw rTransfer.error;
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:nuevoUsoId,
        usuario_actual_id:nuevo.id,
        usuario_actual_nombre:nuevo.nombre,
        uso_iniciado_at:now,
        estado_flota:"en_uso",
        km_actual:km,
        en_uso:true
      },"id",id);
      if(rVeh&&rVeh.error) throw rVeh.error;

      try{
        await registrarAuditoriaVehiculo("transferir_vehiculo",v,motivo,{
          uso_anterior_id:usoAnteriorId,
          uso_nuevo_id:nuevoUsoId,
          usuario_anterior_id:anteriorId,
          nombre_anterior:anteriorNombre,
          usuario_nuevo_id:nuevo.id,
          nombre_nuevo:nuevo.nombre,
          km_transferencia:km
        });
      }catch(e){}

      try{
        await insertarNotificacion(
          nuevo.id,
          "Vehículo transferido",
          (anteriorNombre||u.nombre||"Un usuario")+" te ha transferido el vehículo "+(v.matricula||"")+" a "+km+" km."
        );
      }catch(e){}

      detenerSeguimientoGPS();
      cerrarModal();
      await recargarVehiculosActual();
    }catch(e){
      btnTransfer.disabled=false;
      btnTransfer.textContent="Confirmar transferencia";
      alert("No se pudo transferir el vehículo: "+(e.message||"Error"));
    }
  };
}

async function desactivarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v) return;
  if(estadoVehiculo(v)==="uso"){alert("Primero debe devolverse el vehículo.");return}
  if(!confirm("¿Desactivar este vehículo? Dejará de estar disponible para su uso.")) return;
  const motivo=pedirMotivoObligatorio("Motivo de la desactivación.");
  if(!motivo) return;
  if(!await validarPinAdministrador()) return;
  await actualizarVehiculo(id,{activo:false,estado_flota:"libre",en_uso:false,usuario_asignado:"",usuario_actual_id:null,usuario_actual_nombre:null});
  await registrarAuditoriaVehiculo("desactivar_vehiculo",v,motivo,{estado_anterior:estadoTexto(v),estado_nuevo:"Inactivo"});
}

async function activarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v) return;
  if(!confirm("¿Activar este vehículo?")) return;
  const motivo=pedirMotivoObligatorio("Motivo de la activación.");
  if(!motivo) return;
  if(!await validarPinAdministrador()) return;
  await actualizarVehiculo(id,{activo:true,estado_flota:"libre",en_uso:false});
  await registrarAuditoriaVehiculo("activar_vehiculo",v,motivo,{estado_anterior:"Inactivo",estado_nuevo:"Activo"});
}

async function contarRelacion(tabla,campo,id){
  try{
    const r=await sb().from(tabla).select("id",{count:"exact",head:true}).eq(campo,String(id));
    if(r.error) return null;
    return Number(r.count||0);
  }catch(e){return null}
}

async function eliminarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v || !esAdmin()) return;
  if(estadoVehiculo(v)!=="inactivo"){alert("Primero debes desactivar el vehículo.");return}
  if(responsableId(v) || responsableNombre(v) || v.uso_actual_id){alert("No se puede eliminar porque todavía tiene una asignación o uso vinculado.");return}
  if(!navigator.onLine || !sb()){alert("Necesitas conexión para comprobar las relaciones y eliminarlo.");return}
  const relaciones=[
    ["usos_vehiculos","vehiculo_id","usos"],
    ["transferencias_vehiculos","vehiculo_id","cambios de responsable"],
    ["rutas_vehiculos_puntos","vehiculo_id","puntos GPS"]
  ];
  const encontradas=[];
  for(const [tabla,campo,nombre] of relaciones){
    const n=await contarRelacion(tabla,campo,id);
    if(n===null){alert("No se pudo comprobar si el vehículo tiene datos vinculados.");return}
    if(n>0) encontradas.push(nombre+" ("+n+")");
  }
  if(encontradas.length){alert("No se puede eliminar porque conserva historial: "+encontradas.join(", ")+". Déjalo inactivo para mantener la trazabilidad.");return}
  if(!confirm("Vas a eliminar definitivamente "+nombreVehiculo(v)+". Esta acción no se puede deshacer.")) return;
  const motivo=pedirMotivoObligatorio("Motivo de la eliminación definitiva.");
  if(!motivo) return;
  if(!await validarPinAdministrador()) return;
  try{
    await registrarAuditoriaVehiculo("eliminar_vehiculo",v,motivo,{eliminacion_definitiva:true});

    const cliente=sb();
    const borrado=await cliente.from(TABLA).delete().eq("id",String(id)).select("id");
    if(borrado.error) throw borrado.error;

    const comprobacion=await cliente.from(TABLA).select("id").eq("id",String(id)).maybeSingle();
    if(comprobacion.error && String(comprobacion.error.code||"")!=="PGRST116") throw comprobacion.error;
    if(comprobacion.data){
      alert("El vehículo no se ha eliminado. Supabase ha rechazado el borrado por permisos o políticas RLS.");
      return;
    }

    try{if(zx() && typeof zx().cacheDelete==="function") zx().cacheDelete(TABLA,id,"id")}catch(e){}
    ZX_VEH_CACHE=ZX_VEH_CACHE.filter(function(item){return String(item.id)!==String(id)});
    cerrarModal();
    alert("Vehículo eliminado definitivamente.");
    await recargarVehiculosActual();
  }catch(e){alert("No se pudo eliminar el vehículo: "+(e.message||"Error"))}
}



async function cerrarUsoPendiente(vehiculoId,usoId){
  const v=vehiculoPorId(vehiculoId);
  if(!v) return;
  const detalle=await cargarDetalleVehiculo(vehiculoId);
  const uso=(detalle.usos||[]).find(function(x){return String(x.id||"")===String(usoId||"")});
  if(!uso){alert("Uso no encontrado.");return}
  if(!["en_uso","pendiente_devolucion"].includes(String(uso.estado||""))){alert("Este uso ya está cerrado.");return}
  if(!esAdmin()){alert("Solo un administrador puede cerrar un uso antiguo pendiente.");return}
  const kmDefecto=Math.max(numero(v.km_actual),numero(uso.km_inicio));
  const kmTexto=prompt("Kilómetros finales del vehículo.",String(kmDefecto));
  if(kmTexto===null) return;
  const kmFin=numero(kmTexto);
  if(kmFin<numero(uso.km_inicio)){alert("Los kilómetros finales no pueden ser inferiores a los iniciales.");return}
  const motivo=pedirMotivoObligatorio("Motivo del cierre manual del uso pendiente.");
  if(!motivo) return;
  if(!await validarPinAdministrador()) return;
  try{
    const actual=identidadActual();
    const ahora=ahoraISO();
    const r=await zxUpdate("usos_vehiculos",{
      estado:"devuelto",
      fin_at:ahora,
      km_fin:kmFin,
      motivo_fin:"Cierre manual: "+motivo,
      actualizado_por:actual.id||null,
      updated_at:ahora
    },"id",usoId);
    if(r&&r.error) throw r.error;
    if(String(v.uso_actual_id||"")===String(usoId||"")){
      const rv=await zxUpdate(TABLA,{
        uso_actual_id:null,
        en_uso:false,
        estado_flota:"libre",
        km_actual:Math.max(numero(v.km_actual),kmFin),
        updated_at:ahora
      },"id",vehiculoId);
      if(rv&&rv.error) throw rv.error;
    }
    await registrarAuditoriaVehiculo("cerrar_uso_pendiente",v,motivo,{uso_id:String(usoId),km_fin:kmFin});
    alert("Uso pendiente cerrado correctamente.");
    cerrarModal();
    await recargarVehiculosActual();
    await abrirFicha(vehiculoId,"historial");
  }catch(e){alert("No se pudo cerrar el uso pendiente: "+(e.message||"Error"))}
}

async function abrirDetalleUso(vehiculoId,usoId){
  const v=vehiculoPorId(vehiculoId);
  if(!v) return;
  const detalle=await cargarDetalleVehiculo(vehiculoId);
  const uso=(detalle.usos||[]).find(function(x){return String(x.id||"")===String(usoId||"")});
  if(!uso){alert("Uso no encontrado.");return}
  const puntos=(detalle.puntos||[]).filter(function(p){return String(p.uso_vehiculo_id||"")===String(usoId||"")});
  const abierto=["en_uso","pendiente_devolucion"].includes(String(uso.estado||""));
  const tipo=textoTipoUso(uso);
  const recorrido=kmUso(uso);
  function campo(nombre,valor){
    if(valor===undefined||valor===null||String(valor).trim()==="") valor="-";
    return `<p><b>${limpiar(nombre)}</b><span>${limpiar(valor)}</span></p>`;
  }
  modal(`
    <div class="zx_veh_view_head">
      <h2>Detalle del uso</h2>
      <button class="zx_view_action blue" id="zx_volver_usos_arriba">← Volver</button>
    </div>
    <div class="zx_veh_badges"><span class="${abierto?"warning":"ok"}">${abierto?"En curso":"Finalizado"}</span></div>
    <div class="zx_veh_info ficha">
      ${campo("Vehículo",nombreVehiculo(v))}
      ${campo("Responsable",uso.nombre_usuario||uso.usuario||"Usuario")}
      ${campo("Clasificación",tipo)}
      ${campo("Estado",uso.estado||"-")}
      ${campo("Inicio",fechaHoraES(uso.inicio_at))}
      ${campo("Fin",uso.fin_at?fechaHoraES(uso.fin_at):"Pendiente")}
      ${campo("Km iniciales",uso.km_inicio)}
      ${campo("Km finales",uso.km_fin!=null?uso.km_fin:"Pendiente")}
      ${campo("Recorrido",uso.km_fin!=null?recorrido+" km":"Pendiente")}
      ${campo("Motivo de inicio",uso.motivo_inicio||"-")}
      ${campo("Motivo de fin",uso.motivo_fin||"-")}
      ${campo("Ubicación inicial",uso.direccion_inicio||uso.ubicacion_inicio||((uso.lat_inicio!=null&&uso.lng_inicio!=null)?uso.lat_inicio+", "+uso.lng_inicio:"-"))}
      ${campo("Ubicación final",uso.direccion_fin||uso.ubicacion_fin||((uso.lat_fin!=null&&uso.lng_fin!=null)?uso.lat_fin+", "+uso.lng_fin:"-"))}
      ${campo("Dispositivo de inicio",uso.dispositivo_inicio||"-")}
      ${campo("Dispositivo de fin",uso.dispositivo_fin||"-")}
      ${campo("Puntos GPS",puntos.length)}
      ${campo("ID del uso",uso.id||"-")}
    </div>
    <div class="zx_veh_actions ficha_actions">
      ${abierto&&esAdmin()?`<button class="orange" id="zx_cerrar_uso_pendiente">Cerrar uso pendiente</button>`:""}
      <button class="blue" id="zx_volver_usos">Volver a usos</button>
      <button class="gray" id="zx_cerrar_detalle_uso">Cerrar</button>
    </div>
  `);
  const cerrarPendiente=document.getElementById("zx_cerrar_uso_pendiente");
  if(cerrarPendiente) cerrarPendiente.onclick=function(){cerrarUsoPendiente(vehiculoId,usoId)};
  document.getElementById("zx_volver_usos").onclick=function(){abrirFicha(vehiculoId,"historial")};
  const volverArriba=document.getElementById("zx_volver_usos_arriba");
  if(volverArriba) volverArriba.onclick=function(){abrirFicha(vehiculoId,"historial")};
  document.getElementById("zx_cerrar_detalle_uso").onclick=cerrarModal;
}

async function clasificarUsoVehiculo(usoId,vehiculoId,tipo){
  tipo=tipo==="personal"?"personal":"laboral";
  const v=vehiculoPorId(vehiculoId);
  if(!v) return;
  const detalle=await cargarDetalleVehiculo(vehiculoId);
  const uso=(detalle.usos||[]).find(function(x){return String(x.id)===String(usoId)});
  if(!uso){alert("Uso no encontrado.");return}
  const actual=identidadActual();
  const permitido=esAdmin() || (actual.id && String(uso.usuario_id||"")===actual.id);
  if(!permitido){alert("Solo el usuario del uso o un administrador puede clasificarlo.");return}
  if(tipoUsoRegistro(uso)===tipo){alert("Este recorrido ya está clasificado como "+(tipo==="personal"?"personal":"laboral")+".");return}
  if(!confirm("¿Clasificar este recorrido como "+(tipo==="personal"?"personal":"laboral")+"?")) return;
  const tipoAnterior=tipoUsoRegistro(uso);
  try{
    const r=await zxUpdate("usos_vehiculos",{tipo_uso:tipo,actualizado_por:actual.id,updated_at:ahoraISO()},"id",usoId);
    if(r&&r.error) throw r.error;
    try{
      await registrarAuditoriaVehiculo("clasificar_uso",v,"Clasificación de recorrido",{uso_id:String(usoId),tipo_anterior:tipoAnterior,tipo_uso:tipo});
    }catch(auditError){
      const valorAnterior=tipoAnterior==="sin_clasificar"?null:tipoAnterior;
      const rollback=await zxUpdate("usos_vehiculos",{tipo_uso:valorAnterior,actualizado_por:actual.id,updated_at:ahoraISO()},"id",usoId);
      if(rollback&&rollback.error) throw new Error("No se registró el historial y tampoco se pudo restaurar la clasificación anterior.");
      throw new Error("No se registró el historial. El cambio se ha cancelado para no dejar datos sin trazabilidad.");
    }
    cerrarModal();
    await recargarVehiculosActual();
    await abrirFicha(vehiculoId,"historial");
  }catch(e){alert("No se pudo clasificar el recorrido: "+(e.message||"Error"))}
}

async function abrirFicha(id,tabInicial){
  tabInicial=tabInicial || "datos";
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}

  modal(`
    <div class="zx_veh_view_head">
      <h2>${limpiar(nombreVehiculo(v))}</h2>
      ${puedeGestionar()?`<button class="zx_view_action blue" id="veh_ficha_editar_arriba">✏️ Editar</button>`:""}
    </div>
    <div class="zx_veh_loading">Cargando historial...</div>
    <button class="zx_btn_big zx_gris" id="veh_ficha_cerrar">Cerrar</button>
  `);
  document.getElementById("veh_ficha_cerrar").onclick=cerrarModal;
  const editarArribaCarga=document.getElementById("veh_ficha_editar_arriba");
  if(editarArribaCarga) editarArribaCarga.onclick=function(){editarVehiculo(id)};

  try{
  let detalle;
  try{
    detalle=await cargarDetalleVehiculo(id);
  }catch(e){
    modal(`
      <h2>${limpiar(nombreVehiculo(v))}</h2>
      <div class="zx_veh_empty">No se pudo cargar la ficha del vehículo.</div>
      <p class="zx_veh_error">${limpiar(e&&e.message||"Error de carga")}</p>
      <button class="zx_btn_big zx_gris" id="veh_ficha_cerrar_error">Cerrar</button>
    `);
    document.getElementById("veh_ficha_cerrar_error").onclick=cerrarModal;
    return;
  }
  const usos=detalle.usos||[];
  const transferencias=detalle.transferencias||[];

  // Resuelve el usuario que ejecutó realmente cada transferencia.
  // confirmado_por guarda el ID del usuario autenticado que confirmó la acción;
  // usuario_nuevo es el receptor del vehículo y no debe mostrarse como autor.
  const autoresTransferencia={};
  try{
    const idsAutor=[...new Set(transferencias.map(t=>String(t.confirmado_por||"")).filter(Boolean))];
    if(idsAutor.length && sb() && navigator.onLine!==false){
      const ru=await sb().from("usuarios").select("id,nombre_completo,nombre,usuario").in("id",idsAutor);
      if(ru && !ru.error && Array.isArray(ru.data)){
        ru.data.forEach(function(x){
          autoresTransferencia[String(x.id)]=String(x.nombre_completo||x.nombre||x.usuario||"Usuario");
        });
      }
    }
  }catch(e){}

  const todosPuntos=detalle.puntos||[];
  const auditoriaVehiculo=detalle.auditoria||[];
  const usoActual=v.__uso_actual||null;
  let usoRutaId=usoActual&&usoActual.id?String(usoActual.id):"";
  if(!usoRutaId && todosPuntos.length){
    const ultimo=todosPuntos[todosPuntos.length-1];
    usoRutaId=String(ultimo.uso_vehiculo_id||"");
  }
  let puntos=ordenarPuntos(usoRutaId ? todosPuntos.filter(p=>String(p.uso_vehiculo_id||"")===usoRutaId) : todosPuntos);
  const gruposRuta={};
  todosPuntos.forEach(function(p){
    const k=String(p.uso_vehiculo_id||"sin_uso");
    (gruposRuta[k]||(gruposRuta[k]=[])).push(p);
  });
  const rutasDisponibles=Object.keys(gruposRuta).map(function(k){
    const pts=ordenarPuntos(gruposRuta[k]);
    const uso=usos.find(u=>String(u.id||"")===k)||null;
    return {id:k,puntos:pts,uso:uso,ultima:pts.length?pts[pts.length-1].registrado_at:null};
  });
  if(usoActual&&usoActual.id&&!rutasDisponibles.some(r=>String(r.id)===String(usoActual.id))){
    rutasDisponibles.push({id:String(usoActual.id),puntos:[],uso:usoActual,ultima:usoActual.inicio_at||usoActual.created_at||null});
  }
  rutasDisponibles.sort(function(a,b){
    const aActivo=usoActual&&String(a.id)===String(usoActual.id);
    const bActivo=usoActual&&String(b.id)===String(usoActual.id);
    if(aActivo&&!bActivo) return -1;
    if(bActivo&&!aActivo) return 1;
    return new Date(b.ultima||0)-new Date(a.ultima||0);
  });
  const rutaEnDirecto=!!(usoActual&&usoRutaId&&estadoVehiculo(v)==="uso");

  usos.sort((a,b)=>new Date(b.inicio_at||b.created_at||0)-new Date(a.inicio_at||a.created_at||0));
  const resumenKm=resumenKmUsos(usos);
  const resumenTipos=resumenTiposUsos(usos);

  function claseTipoUso(t){
    return t==="laboral"?"laboral":t==="personal"?"personal":"sin_clasificar";
  }

  function renderTarjetaUso(u){
    const tipoNormal=tipoUsoRegistro(u);
    const tipoTexto=textoTipoUso(u);
    const abierto=["en_uso","pendiente_devolucion"].includes(String(u.estado||""));
    const filtro=abierto?"en_curso":tipoNormal;
    const km=kmUso(u);
    const puedeClasificar=esAdmin() || (identidadActual().id && String(u.usuario_id||"")===identidadActual().id);
    const kmTxt=(u.km_inicio!=null?u.km_inicio:"-")+" → "+(u.km_fin!=null?u.km_fin:"-");
    const controles=puedeClasificar && u.km_fin!=null ? `<div class="zx_uso_selector" role="group" aria-label="Clasificación del recorrido">
      <button class="${tipoNormal==="laboral"?"activo laboral":""}" aria-pressed="${tipoNormal==="laboral"?"true":"false"}" data-uso-clasificar="laboral" data-uso-id="${limpiar(u.id)}">${tipoNormal==="laboral"?"✓ ":""}🚗 Laboral</button>
      <button class="${tipoNormal==="personal"?"activo personal":""}" aria-pressed="${tipoNormal==="personal"?"true":"false"}" data-uso-clasificar="personal" data-uso-id="${limpiar(u.id)}">${tipoNormal==="personal"?"✓ ":""}🏠 Personal</button>
    </div>`:"";
    return `<article class="zx_uso_card ${claseTipoUso(tipoNormal)}" data-uso-detalle="${limpiar(u.id)}" data-uso-filtro="${filtro}">
      <div class="zx_uso_card_top">
        <div><strong>${limpiar(u.nombre_usuario||u.usuario||"Usuario")}</strong><time>${limpiar(fechaHoraES(u.inicio_at))}</time></div>
        <span class="zx_uso_tipo ${claseTipoUso(tipoNormal)}">${limpiar(tipoTexto)}</span>
      </div>
      <div class="zx_uso_meta">
        <span>${limpiar(textoEstadoUso(u.estado))}</span>
        <b>${u.km_fin!=null && km===0 ? "Sin desplazamiento · Km "+limpiar(kmTxt) : "Km "+limpiar(kmTxt)+(u.km_fin!=null?" · "+limpiar(km)+" km":"")}</b>
      </div>
      <button type="button" class="zx_uso_detalle" data-uso-detalle-boton="${limpiar(u.id)}">Ver detalle ›</button>
      ${controles}
    </article>`;
  }

  const usoHtml=usos.length?usos.map(renderTarjetaUso).join(""):`<div class="zx_veh_empty">Todavía no hay usos registrados.</div>`;


  function primerValor(obj,claves){
    for(const k of claves){
      const v=obj&&obj[k];
      if(v!==undefined&&v!==null&&String(v).trim()!=="") return v;
    }
    return "";
  }
  function ubicacionMovimiento(obj){
    return primerValor(obj,["direccion","ubicacion","direccion_inicio","direccion_fin","localizacion","gps_direccion"]);
  }
  function dispositivoMovimiento(obj){
    return primerValor(obj,["dispositivo","device","device_name","nombre_dispositivo"]);
  }
  function iconoMovimiento(tipo){
    return tipo==="inicio"?"🟢":tipo==="fin"?"🔴":tipo==="transferencia"?"🔄":tipo==="clasificacion"?"🏷️":tipo==="laboral"?"🚗":tipo==="personal"?"🏠":"📍";
  }
  function claseMovimiento(tipo){
    return "zx_mov_"+(tipo||"otro");
  }
  function renderMovimiento(m){
    const filas=[];
    if(m.responsable) filas.push(`<div><span>Responsable</span><b>${limpiar(m.responsable)}</b></div>`);
    if(m.clasificacion) filas.push(`<div><span>Clasificación</span><b>${limpiar(m.clasificacion)}</b></div>`);
    if(m.kmInicio!==""&&m.kmInicio!=null) filas.push(`<div><span>Km iniciales</span><b>${limpiar(m.kmInicio)}</b></div>`);
    if(m.kmFin!==""&&m.kmFin!=null) filas.push(`<div><span>Km finales</span><b>${limpiar(m.kmFin)}</b></div>`);
    if(m.kmRecorridos!==""&&m.kmRecorridos!=null) filas.push(`<div><span>Recorrido</span><b>${limpiar(m.kmRecorridos)} km</b></div>`);
    if(m.ubicacion) filas.push(`<div class="zx_mov_wide"><span>Ubicación</span><b>${limpiar(m.ubicacion)}</b></div>`);
    if(m.dispositivo) filas.push(`<div class="zx_mov_wide"><span>Dispositivo</span><b>${limpiar(m.dispositivo)}</b></div>`);
    if(m.observaciones) filas.push(`<div class="zx_mov_wide"><span>Observaciones</span><b>${limpiar(m.observaciones)}</b></div>`);
    return `<article class="zx_veh_mov ${claseMovimiento(m.tipo)}">
      <header><i>${iconoMovimiento(m.tipo)}</i><div><strong>${limpiar(m.titulo)}</strong><time>${limpiar(fechaHoraES(m.fecha))}</time></div></header>
      ${filas.length?`<div class="zx_mov_grid">${filas.join("")}</div>`:""}
    </article>`;
  }

  function cabeceraDiaMovimiento(fecha){
    try{
      const d=new Date(fecha);
      if(Number.isNaN(d.getTime())) return fechaES(fecha)||"Sin fecha";
      const dia=new Intl.DateTimeFormat("es-ES",{weekday:"long"}).format(d).toUpperCase();
      return dia+" · "+String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();
    }catch(e){
      return fechaES(fecha)||"Sin fecha";
    }
  }

  function renderMovimientosAgrupados(lista){
    if(!lista.length) return `<div class="zx_veh_empty">No hay movimientos registrados.</div>`;
    const grupos=new Map();
    lista.forEach(function(m){
      const clave=fechaES(m.fecha)||"Sin fecha";
      if(!grupos.has(clave)) grupos.set(clave,[]);
      grupos.get(clave).push(m);
    });
    return Array.from(grupos.entries()).map(function(par){
      const primera=par[1]&&par[1][0]?par[1][0].fecha:null;
      return `<section class="zx_mov_dia"><div class="zx_mov_dia_titulo"><span>${limpiar(cabeceraDiaMovimiento(primera))}</span></div>${par[1].map(renderMovimiento).join("")}</section>`;
    }).join("");
  }

  const movimientos=[];
  usos.forEach(function(u){
    const clas=textoTipoUso(u);
    const tipoClas=tipoUsoRegistro(u);
    movimientos.push({
      fecha:u.inicio_at||u.created_at,
      titulo:"Inicio de uso",
      tipo:tipoClas==="laboral"?"laboral":tipoClas==="personal"?"personal":"inicio",
      responsable:u.nombre_usuario||u.usuario||"Usuario",
      clasificacion:clas==="Sin clasificar"?"Pendiente":clas,
      kmInicio:u.km_inicio,
      ubicacion:ubicacionMovimiento(u),
      dispositivo:dispositivoMovimiento(u),
      observaciones:primerValor(u,["observaciones","notas","motivo_inicio"])
    });
    if(u.fin_at||u.km_fin!=null) movimientos.push({
      fecha:u.fin_at||u.updated_at,
      titulo:u.estado==="transferido"?"Uso transferido":"Fin de uso",
      tipo:u.estado==="transferido"?"transferencia":"fin",
      responsable:u.nombre_usuario||u.usuario||"Usuario",
      clasificacion:clas==="Sin clasificar"?"Pendiente":clas,
      kmInicio:u.km_inicio,
      kmFin:u.km_fin,
      kmRecorridos:kmUso(u),
      ubicacion:primerValor(u,["direccion_fin","ubicacion_fin","direccion","ubicacion"]),
      dispositivo:dispositivoMovimiento(u),
      observaciones:primerValor(u,["motivo_fin","observaciones","notas", "estado"])||"Uso finalizado"
    });
  });
  transferencias.forEach(function(t){
    movimientos.push({
      fecha:t.confirmado_at||t.created_at,
      titulo:"Cambio de responsable",
      tipo:"transferencia",
      responsable:(t.nombre_anterior||"Sin responsable")+" → "+(t.nombre_nuevo||"Usuario"),
      kmInicio:t.km_transferencia,
      ubicacion:ubicacionMovimiento(t),
      dispositivo:dispositivoMovimiento(t),
      observaciones:primerValor(t,["motivo","observaciones","notas"])||"Cambio de responsable"
    });
  });

  auditoriaVehiculo.forEach(function(a){
    if(String(a.accion||"")!=="clasificar_uso") return;
    let d={};
    try{d=(a.datos&&typeof a.datos==="object")?a.datos:JSON.parse(a.datos||"{}")}catch(e){}
    const nueva=d.tipo_uso==="personal"?"Personal":d.tipo_uso==="laboral"?"Laboral":"Sin clasificar";
    const anterior=d.tipo_anterior==="personal"?"Personal":d.tipo_anterior==="laboral"?"Laboral":d.tipo_anterior==="sin_clasificar"?"Sin clasificar":"";
    movimientos.push({
      fecha:a.fecha,
      titulo:"Clasificación modificada",
      tipo:"clasificacion",
      responsable:a.usuario||"Usuario",
      clasificacion:nueva,
      observaciones:(anterior?anterior+" → ":"")+nueva
    });
  });
  movimientos.sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  const movimientosHtml=renderMovimientosAgrupados(movimientos);

  const cambiosAsignacion=auditoriaVehiculo.filter(function(a){
    return ["asignar_responsable","cambiar_responsable","retirar_responsable"].includes(String(a.accion||""));
  }).map(function(a){
    let d={}; try{d=(a.datos&&typeof a.datos==="object")?a.datos:JSON.parse(a.datos||"{}")}catch(e){}
    return {
      fecha:a.fecha,
      anterior:d.nombre_anterior||"Sin responsable",
      nuevo:d.nombre_nuevo||"Sin responsable",
      motivo:d.motivo||"Cambio de responsable",
      realizado:a.usuario||"Usuario"
    };
  });
  // Para transferencias creadas desde la app, la auditoría conserva el nombre
  // visible del usuario que ejecutó la acción. La usamos también como respaldo
  // para históricos donde confirmado_por no coincide con usuarios.id.
  const autoresAuditoriaTransferencia={};
  auditoriaVehiculo.filter(function(a){
    return String(a.accion||"")==="transferir_vehiculo";
  }).forEach(function(a){
    let d={}; try{d=(a.datos&&typeof a.datos==="object")?a.datos:JSON.parse(a.datos||"{}")}catch(e){}
    const clave=[String(d.uso_anterior_id||""),String(d.uso_nuevo_id||""),String(d.usuario_nuevo_id||"")].join("|");
    if(clave!=="||") autoresAuditoriaTransferencia[clave]=String(a.usuario||"Usuario");
  });

  const cambiosResponsable=transferencias.map(function(t){
    const clave=[String(t.uso_anterior_id||""),String(t.uso_nuevo_id||""),String(t.usuario_nuevo_id||"")].join("|");
    const autorAuditoria=autoresAuditoriaTransferencia[clave]||"";
    const confirmadoRaw=String(t.confirmado_por||"").trim();
    const autorUsuario=autoresTransferencia[confirmadoRaw]||"";
    const pareceId=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(confirmadoRaw) || /^zx_/i.test(confirmadoRaw);
    const autorGuardado=confirmadoRaw && !pareceId ? confirmadoRaw : "";
    return {
      fecha:t.confirmado_at||t.created_at,
      anterior:t.nombre_anterior||"Sin responsable",
      nuevo:t.nombre_nuevo||"Usuario",
      motivo:t.motivo||"Cambio durante el uso",
      realizado:autorAuditoria||autorUsuario||autorGuardado||"Usuario"
    };
  }).concat(cambiosAsignacion).sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));
  const transHtml=cambiosResponsable.length ? cambiosResponsable.map(function(t){
    return `<div class="zx_veh_hist_item"><b>${limpiar(t.anterior)} → ${limpiar(t.nuevo)}</b><span>${limpiar(fechaHoraES(t.fecha))}</span><small>${limpiar(t.motivo)} · Realizado por ${limpiar(t.realizado)}</small></div>`;
  }).join("") : `<div class="zx_veh_empty">No hay cambios de responsable registrados.</div>`;

  const falloUsos=(detalle.errores||[]).some(function(e){
    if(typeof e==="string") return e.indexOf("usos_vehiculos:")===0;
    return e && (e.clave==="usos" || e.tabla==="usos_vehiculos");
  });
  const avisoCarga=(falloUsos && !usos.length)
    ? `<div class="zx_veh_notice warning">No se pudo cargar el historial de usos. Puedes seguir usando la ficha y volver a intentarlo más tarde.</div>`
    : "";

  modal(`
    <div class="zx_veh_view_head">
      <h2>${limpiar(nombreVehiculo(v))}</h2>
      ${puedeGestionar()?`<button class="zx_view_action blue" id="veh_ficha_editar_arriba">✏️ Editar</button>`:""}
    </div>
    ${avisoCarga}
    <div class="zx_veh_badges">${badge(v)}</div>
    ${renderAvisos(v)}

    <div class="zx_veh_tabs">
      <button class="${tabInicial==="datos" ? "on" : ""}" data-veh-tab="datos">Datos</button>
      <button class="${tabInicial==="historial" ? "on" : ""}" data-veh-tab="historial">Usos (${usos.length})</button>
      <button class="${tabInicial==="movimientos" ? "on" : ""}" data-veh-tab="movimientos">Movimientos (${movimientos.length})</button>
      <button class="${tabInicial==="transferencias" ? "on" : ""}" data-veh-tab="transferencias">Cambios (${cambiosResponsable.length})</button>
      <button id="zx_ruta_tab_btn" class="${tabInicial==="ruta" ? "on" : ""}" data-veh-tab="ruta">Ruta (${puntos.length})</button>
    </div>

    <div class="zx_veh_tab ${tabInicial==="datos" ? "on" : ""}" data-veh-panel="datos">
      <div class="zx_veh_info ficha">
        <p><b>Matrícula</b><span>${limpiar(v.matricula || "-")}</span></p>
        <p><b>Marca / modelo</b><span>${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "-")}</span></p>
        <p><b>Km actuales</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
        <p><b>Km registrados en usos</b><span>${limpiar(resumenKm.total)} km</span></p>
        <p><b>Km laborales</b><span>${limpiar(resumenKm.laboral)} km</span></p>
        <p><b>Km personales</b><span>${limpiar(resumenKm.personal)} km</span></p>
        ${resumenKm.sin_clasificar?`<p><b>Pendientes de clasificar</b><span>${limpiar(resumenKm.sin_clasificar)} km</span></p>`:""}
        <p><b>Responsable habitual</b><span>${limpiar(asignadoNombre(v) || "Sin asignar")}</span></p>
        ${v.usuario_actual_nombre ? `<p><b>Usuario actual</b><span>${limpiar(v.usuario_actual_nombre)}</span></p><p><b>Inicio del uso</b><span>${limpiar(fechaHoraES(v.uso_iniciado_at))}</span></p><p><b>Tiempo de uso</b><span>${limpiar(duracionDesde(v.uso_iniciado_at))}</span></p>` : ""}
        <p><b>ITV</b><span>${limpiar(fechaES(v.itv_fecha) || "-")}</span></p>
        <p><b>Seguro</b><span>${limpiar(fechaES(v.seguro_fecha) || "-")}</span></p>
        <p><b>Revisión</b><span>${limpiar(fechaES(v.proxima_revision_fecha) || "-")}</span></p>
        <p><b>Km revisión</b><span>${limpiar(v.proxima_revision_km || "-")}</span></p>
        ${v.notas ? `<p><b>Notas</b><span>${limpiar(v.notas)}</span></p>` : ""}
      </div>
    </div>

    <div class="zx_veh_tab ${tabInicial==="historial" ? "on" : ""}" data-veh-panel="historial">
      <section class="zx_usos_resumen_wrap">
        <h3>Resumen de kilómetros</h3>
        <div class="zx_veh_uso_resumen">
          <div class="laboral"><strong>${limpiar(resumenKm.laboral)} km</strong><small>${resumenTipos.laboral} uso${resumenTipos.laboral===1?"":"s"} · Laborales</small></div>
          <div class="personal"><strong>${limpiar(resumenKm.personal)} km</strong><small>${resumenTipos.personal} uso${resumenTipos.personal===1?"":"s"} · Personales</small></div>
          <div class="sin"><strong>${limpiar(resumenKm.sin_clasificar)} km</strong><small>${resumenTipos.sin_clasificar} uso${resumenTipos.sin_clasificar===1?"":"s"} · Sin clasificar</small></div>
        </div>
      </section>
      <div class="zx_veh_uso_filtros">
        <button class="on" data-uso-filtro-btn="todos">Todos (${resumenTipos.todos})</button>
        <button data-uso-filtro-btn="laboral">Laborales (${resumenTipos.laboral})</button>
        <button data-uso-filtro-btn="personal">Personales (${resumenTipos.personal})</button>
        <button data-uso-filtro-btn="sin_clasificar">Sin clasificar (${resumenTipos.sin_clasificar})</button>
        <button data-uso-filtro-btn="en_curso">En curso (${resumenTipos.en_curso})</button>
      </div>
      <div class="zx_veh_hist zx_veh_hist_usos">${usoHtml}</div>
    </div>
    <div class="zx_veh_tab ${tabInicial==="movimientos" ? "on" : ""}" data-veh-panel="movimientos"><div class="zx_veh_hist">${movimientosHtml}</div></div>
    <div class="zx_veh_tab ${tabInicial==="transferencias" ? "on" : ""}" data-veh-panel="transferencias"><div class="zx_veh_hist">${transHtml}</div></div>
    <div class="zx_veh_tab ${tabInicial==="ruta" ? "on" : ""}" data-veh-panel="ruta">
      <div class="zx_veh_route_box">
        <div class="zx_veh_route_head">
          <div><b>Recorrido GPS exacto</b><span id="zx_ruta_cab_estado">${puntos.length ? "Línea trazada con los puntos registrados por Zentryx." : "Todavía no hay posiciones para este uso."}</span></div>
          ${rutaEnDirecto&&esAdmin()?`<em>● EN DIRECTO</em>`:""}
        </div>
        ${rutasDisponibles.length>1?`<label class="zx_veh_route_select"><span>Recorrido</span><select id="zx_ruta_selector">${rutasDisponibles.map(function(r,i){const nombre=r.uso?(r.uso.nombre_usuario||r.uso.usuario||"Usuario"):"Sesión";const fechaBase=fechaHoraES(r.ultima);return `<option value="${limpiar(r.id)}" data-uso-nombre="${limpiar(nombre)}" data-fecha-base="${limpiar(fechaBase)}" ${r.id===usoRutaId?"selected":""}>${limpiar(fechaBase)} · ${limpiar(nombre)} · ${r.puntos.length} puntos</option>`}).join("")}</select></label>`:""}
        <div class="zx_veh_route_stats">
          <div><strong id="zx_ruta_num_puntos">${puntos.length}</strong><small>Puntos</small></div>
          <div><strong id="zx_ruta_distancia">${textoDistancia(distanciaRuta(puntos))}</strong><small>Recorrido</small></div>
          <div><strong id="zx_ruta_ultima_hora">${puntos.length?limpiar(fechaHoraES(puntos[puntos.length-1].registrado_at)):"-"}</strong><small>Última posición</small></div>
        </div>
        <small id="zx_ruta_estado" class="zx_veh_route_note"></small>
        <div id="zx_veh_mapa_ruta" class="zx_veh_mapa_ruta"></div>
        ${!puntos.length?`<small class="zx_veh_route_note">Activa el seguimiento GPS, utiliza el vehículo y mantén Zentryx abierto durante el desplazamiento.</small>`:""}
      </div>
    </div>

    <div class="zx_veh_actions ficha_actions">
      <button class="orange" id="veh_ficha_grua">🚨 Aviso grúa</button>
      ${puedeGestionar() ? `<button class="blue" id="veh_ficha_editar">Editar</button>` : ""}
      ${v.documento_url ? `<button class="purple" id="veh_ficha_doc">Documento</button>` : ""}
      <button class="gray" id="veh_ficha_cerrar">Cerrar</button>
    </div>
  `);

  let mapaIniciado=false;
  async function asegurarMapa(){
    if(mapaIniciado) return;
    mapaIniciado=true;
    await crearMapaRutaExacta("zx_veh_mapa_ruta",puntos,id,usoRutaId,rutaEnDirecto);
  }
  document.querySelectorAll("[data-veh-tab]").forEach(function(btn){
    btn.onclick=function(){
      const tab=btn.dataset.vehTab;
      document.querySelectorAll("[data-veh-tab]").forEach(x=>x.classList.toggle("on",x===btn));
      document.querySelectorAll("[data-veh-panel]").forEach(x=>x.classList.toggle("on",x.dataset.vehPanel===tab));
      if(tab==="ruta") setTimeout(asegurarMapa,30);
    };
  });
  if(tabInicial==="ruta") setTimeout(asegurarMapa,40);
  const selectorRuta=document.getElementById("zx_ruta_selector");
  if(selectorRuta){
    selectorRuta.onchange=function(){
      const elegida=rutasDisponibles.find(r=>r.id===selectorRuta.value);
      if(!elegida) return;
      usoRutaId=elegida.id;
      puntos=elegida.puntos;
      ZX_RUTA_USO_ID=usoRutaId;
      ZX_RUTA_PUNTOS=ordenarPuntos(puntos);
      actualizarResumenRuta();
      dibujarRutaExacta(true);
    };
  }
  const grua=document.getElementById("veh_ficha_grua");
  if(grua) grua.onclick=function(){abrirAvisoGrua(id)};
  const editar=document.getElementById("veh_ficha_editar");
  if(editar) editar.onclick=function(){editarVehiculo(id)};
  const editarArriba=document.getElementById("veh_ficha_editar_arriba");
  if(editarArriba) editarArriba.onclick=function(){editarVehiculo(id)};
  document.querySelectorAll("[data-uso-clasificar]").forEach(function(btn){
    btn.onclick=function(){clasificarUsoVehiculo(btn.dataset.usoId,v.id,btn.dataset.usoClasificar)};
  });
  document.querySelectorAll("[data-uso-detalle-boton]").forEach(function(btn){
    btn.onclick=function(ev){
      ev.stopPropagation();
      abrirDetalleUso(v.id,btn.dataset.usoDetalleBoton);
    };
  });
  document.querySelectorAll("[data-uso-detalle]").forEach(function(card){
    card.onclick=function(ev){
      if(ev.target&&ev.target.closest&&ev.target.closest("button")) return;
      abrirDetalleUso(v.id,card.dataset.usoDetalle);
    };
  });
  document.querySelectorAll("[data-uso-filtro-btn]").forEach(function(btn){
    btn.onclick=function(){
      const filtro=btn.dataset.usoFiltroBtn;
      document.querySelectorAll("[data-uso-filtro-btn]").forEach(function(x){x.classList.toggle("on",x===btn)});
      document.querySelectorAll("[data-uso-filtro]").forEach(function(card){
        card.style.display=(filtro==="todos"||card.dataset.usoFiltro===filtro)?"":"none";
      });
    };
  });

  const doc=document.getElementById("veh_ficha_doc");
  if(doc) doc.onclick=function(){window.open(v.documento_url,"_blank")};
  document.getElementById("veh_ficha_cerrar").onclick=cerrarModal;
  }catch(e){
    console.error("Error abriendo ficha de vehículo",e);
    modal(`
      <h2>${limpiar(nombreVehiculo(v))}</h2>
      <div class="zx_veh_empty">No se pudo mostrar el historial.</div>
      <p class="zx_veh_error">${limpiar(e&&e.message||String(e)||"Error desconocido")}</p>
      <button class="zx_btn_big zx_gris" id="veh_ficha_cerrar_render">Cerrar</button>
    `);
    const b=document.getElementById("veh_ficha_cerrar_render");
    if(b) b.onclick=cerrarModal;
  }
}

function instalarCSS(){
  const old=document.getElementById("zx_vehiculos_css_v3139");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_vehiculos_css_v3139";
  s.innerHTML=`
    .zx_veh_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_veh_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_veh_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_veh_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_veh_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_veh_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_veh_header_actions{display:grid;gap:8px;justify-items:stretch}
    .zx_veh_live_btn{border:0;border-radius:18px;background:#7c3aed;color:white;padding:13px 14px;font-size:14px;font-weight:950;white-space:nowrap}
    .zx_flota_head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .zx_flota_head h2{margin:0}.zx_flota_head p{margin:6px 0 0;color:#64748b;font-weight:800;line-height:1.35}
    .zx_flota_live{background:#fee2e2;color:#b91c1c;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:950;white-space:nowrap;animation:zxRutaPulso 1.5s infinite}
    .zx_flota_stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
    .zx_flota_stats>div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:15px;padding:10px;text-align:center;min-width:0}
    .zx_flota_stats strong{display:block;color:#071330;font-size:15px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_flota_stats small{display:block;color:#64748b;font-size:10px;font-weight:900;margin-top:3px}
    .zx_flota_mapa{height:430px;border-radius:18px;border:1px solid #cbd5e1;overflow:hidden;background:#e2e8f0}
    .zx_flota_lista{display:grid;gap:8px;margin-top:12px;max-height:230px;overflow:auto}
    .zx_flota_item{width:100%;display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:7px;align-items:center;border:1px solid #dbe3ef;background:#f8fafc;border-radius:14px;padding:10px 12px;text-align:left}
    .zx_flota_item strong{color:#071330;font-size:14px;font-weight:950}.zx_flota_item small{grid-column:2;color:#64748b;font-size:12px;font-weight:850}
    .zx_flota_item em{grid-column:3;grid-row:1/3;font-style:normal;color:#64748b;font-size:11px;font-weight:900;white-space:nowrap}
    .zx_flota_dot{width:10px;height:10px;border-radius:50%;grid-row:1/3}
    .zx_flota_marker_wrap{background:transparent!important;border:0!important}
    .zx_flota_marker{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(15,23,42,.4);font-size:17px}
    .zx_flota_marker_label{position:absolute;left:50%;top:36px;transform:translateX(-50%);background:#071330;color:white;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:950;white-space:nowrap;box-shadow:0 2px 7px rgba(15,23,42,.25)}
    .zx_flota_popup{display:grid;gap:4px;min-width:170px}.zx_flota_popup b{font-size:15px;color:#071330}.zx_flota_popup span{font-size:12px;color:#475569;font-weight:800}
    .zx_veh_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_veh_kpi_alert{border:1px solid #dbe3ef;background:#f8fafc;border-radius:20px;padding:14px;text-align:center;grid-column:1/-1}
    .zx_veh_kpi_alert b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_veh_kpi_alert span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_veh_kpi_alert small{display:block;color:#64748b;font-size:10px;font-weight:900;margin-top:3px}
    .zx_veh_kpi_alert.has-warning{background:#fff7ed;border-color:#fdba74}
    .zx_veh_kpi_alert.has-critical{background:#fef2f2;border-color:#fca5a5}
    .zx_veh_kpi_alert.has-critical b,.zx_veh_kpi_alert.has-critical span{color:#b91c1c}
    .zx_veh_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_veh_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_veh_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_veh_toolbar{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_search{position:relative}
    .zx_veh_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_veh_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_veh_filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}
    .zx_veh_filters button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_filters button.on{background:#2563eb;color:white}
    .zx_veh_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_veh_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .zx_veh_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_veh_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_list{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:22px;padding:14px;overflow:hidden}
    .zx_veh_card_head{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:11px;align-items:center}
    .zx_veh_media{width:58px;height:58px;border-radius:18px;background:#dbeafe;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .zx_veh_media span{font-size:26px}.zx_veh_media img{width:100%;height:100%;object-fit:cover;display:block}
    .zx_veh_identity{min-width:0}.zx_veh_identity h3{margin:2px 0 0;color:#071330;font-size:21px;line-height:1.05;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_veh_status_inline{align-self:start}.zx_veh_status_inline>span{display:inline-block;border-radius:999px;padding:7px 9px;font-size:11px;font-weight:950;white-space:nowrap}.zx_veh_status_inline .libre{background:#dcfce7;color:#166534}.zx_veh_status_inline .uso{background:#dbeafe;color:#1d4ed8}.zx_veh_status_inline .off{background:#fee2e2;color:#991b1b}.zx_veh_status_inline .orange{background:#ffedd5;color:#9a3412}
    .zx_veh_top{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center}
    .zx_veh_icon{width:52px;height:52px;border-radius:18px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950}
    .zx_veh_top h3{margin:2px 0 0;color:#071330;font-size:21px;line-height:1.15;font-weight:950}
    .zx_veh_modelo{color:#64748b;font-size:13px;font-weight:950;line-height:1.2}
    .zx_veh_meta{margin-top:4px;color:#64748b;font-size:13px;font-weight:950}
    .zx_veh_badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
    .zx_veh_badges span{border-radius:999px;padding:8px 10px;font-size:12px;font-weight:950}
    .zx_veh_badges .libre{background:#dcfce7;color:#166534}
    .zx_veh_badges .uso{background:#dbeafe;color:#1d4ed8}
    .zx_veh_badges .off{background:#fee2e2;color:#991b1b}.zx_veh_badges .orange{background:#ffedd5;color:#9a3412}
    .zx_veh_alertas{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .zx_veh_alertas span{display:grid;gap:1px;border-radius:12px;padding:7px 10px;font-size:12px;font-weight:950}
    .zx_veh_alertas span.warning{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .zx_veh_alertas span.critical{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
    .zx_veh_alertas small{font-size:9px;font-weight:850;opacity:.8}
    .zx_veh_fastline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}.zx_veh_fastline>div{min-width:0;display:grid;grid-template-columns:23px minmax(0,1fr);align-items:center;background:white;border:1px solid #e6edf5;border-radius:14px;padding:9px 10px}.zx_veh_fastline span{font-size:16px}.zx_veh_fastline strong{color:#071330;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_veh_fastline small{grid-column:2;color:#64748b;font-size:10px;font-weight:850;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_veh_fastline>div:last-child:nth-child(3){grid-column:1/-1}
    .zx_veh_info{margin-top:13px;display:grid;grid-template-columns:1fr;gap:8px}
    .zx_veh_info p{margin:0;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_veh_info b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_veh_info span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_veh_quick{display:grid;gap:8px;margin-top:13px}
    .zx_veh_quick>div{display:grid;grid-template-columns:28px 1fr;align-items:center;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px 12px}
    .zx_veh_quick span{font-size:18px}.zx_veh_quick b{color:#071330;font-size:15px;font-weight:900}.zx_veh_quick small{grid-column:2;color:#64748b;font-size:12px;font-weight:850;margin-top:2px}
    .zx_veh_main_action{width:100%;border:0;border-radius:18px;padding:15px 12px;color:white;font-size:16px;font-weight:950;min-height:52px;margin-top:13px}
    .zx_veh_main_action.green{background:#16a34a}.zx_veh_main_action.blue{background:#2563eb;box-shadow:0 10px 22px rgba(37,99,235,.22)}.zx_veh_main_action.purple{background:#7c3aed}.zx_veh_main_action.orange{background:#f97316}
    .zx_veh_more{width:100%;border:0;background:transparent;color:#334155;padding:12px 8px 4px;font-size:14px;font-weight:950}
    .zx_veh_titleline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.zx_veh_version{font-size:11px;font-weight:950;color:#64748b;background:#eef2f7;border:1px solid #dbe3ed;border-radius:999px;padding:4px 8px}
    .zx_veh_route_quick{width:100%;border:2px solid #c4b5fd;background:#f5f3ff;color:#5b21b6;border-radius:18px;padding:13px 12px;font-size:15px;font-weight:950;margin-top:10px;min-height:48px}
    .zx_veh_more_panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .zx_veh_more_panel[hidden]{display:none!important}
    .zx_veh_admin_actions{grid-column:1/-1;border:1px solid #dce4ef;border-radius:16px;padding:8px;background:#f7f9fc}
    .zx_veh_admin_actions summary{cursor:pointer;font-weight:950;color:#52627a;text-align:center;padding:9px;list-style:none}
    .zx_veh_admin_actions summary::-webkit-details-marker{display:none}
    .zx_veh_admin_actions button{width:100%;margin-top:8px}
    .zx_veh_more_panel button,.zx_veh_actions button{border:0;border-radius:16px;padding:13px 8px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_veh_more_panel .green,.zx_veh_actions .green{background:#16a34a}.zx_veh_more_panel .blue,.zx_veh_actions .blue{background:#2563eb}.zx_veh_more_panel .purple,.zx_veh_actions .purple{background:#7c3aed}.zx_veh_more_panel .orange,.zx_veh_actions .orange{background:#f97316}.zx_veh_more_panel .gray,.zx_veh_actions .gray{background:#64748b}.zx_veh_more_panel .red,.zx_veh_actions .red{background:#dc2626}
    .zx_veh_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_veh_aviso{margin:12px 0;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:16px;padding:13px;font-weight:850;line-height:1.35}.zx_veh_file_wrap{width:100%;overflow:hidden}.zx_veh_file_wrap input[type="file"]{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;font-size:14px}
    .zx_veh_uso_filtros{display:flex;gap:7px;overflow-x:auto;padding:2px 0 12px}.zx_veh_uso_filtros button{border:1px solid var(--zx-line);border-radius:999px;padding:9px 12px;background:var(--zx-soft);color:var(--zx-text);font-weight:900;white-space:nowrap}.zx_veh_uso_filtros button.on{background:var(--zx-primary);color:var(--zx-primary-contrast);border-color:var(--zx-primary)}.zx_veh_uso_click{cursor:pointer;position:relative}.zx_veh_uso_click>em{display:block;margin-top:7px;color:#2563eb;font-style:normal;font-size:13px;font-weight:950}.zx_veh_uso_click:active{transform:scale(.995)}
    .zx_veh_nota_form{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:14px;padding:11px;font-size:13px;font-weight:800}.zx_veh_readonly{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:900;color:#071330;background:#eef2f7}.zx_veh_uso_resumen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 14px}.zx_veh_uso_resumen>div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:14px;padding:10px;text-align:center}.zx_veh_uso_resumen strong{display:block;font-size:20px;color:#071330}.zx_veh_uso_resumen small{display:block;margin-top:3px;color:#64748b;font-weight:850;font-size:11px}.zx_veh_clasificar{display:flex;gap:7px;margin-top:9px}.zx_veh_clasificar button{flex:1;border:2px solid transparent;border-radius:11px;padding:9px 7px;font-weight:900;background:#eef2f7;color:#64748b}.zx_veh_clasificar button:first-child.seleccionado{background:#2563eb;color:#fff;border-color:#1d4ed8;box-shadow:0 0 0 2px rgba(37,99,235,.12)}.zx_veh_clasificar button:last-child.seleccionado{background:#f59e0b;color:#fff;border-color:#d97706;box-shadow:0 0 0 2px rgba(245,158,11,.12)}.zx_usos_resumen_wrap{margin:2px 0 14px}.zx_usos_resumen_wrap h3{margin:0 0 9px;font-size:15px;color:var(--zx-text)}.zx_veh_uso_resumen{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}.zx_veh_uso_resumen>div{background:var(--zx-soft);border:2px solid var(--zx-line);border-radius:14px;padding:10px 7px;text-align:center}.zx_veh_uso_resumen>div.laboral{border-color:var(--zx-primary-border);background:var(--zx-primary-soft)}.zx_veh_uso_resumen>div.personal{border-color:#d97706;background:color-mix(in srgb,#f59e0b 16%,var(--zx-card))}.zx_veh_uso_resumen>div.sin{border-color:var(--zx-line);background:var(--zx-soft)}.zx_veh_uso_resumen strong{display:block;font-size:18px;color:var(--zx-text);white-space:nowrap}.zx_veh_uso_resumen small{display:block;margin-top:3px;color:var(--zx-muted);font-weight:850;font-size:10px}.zx_veh_hist_usos{display:grid;gap:12px}.zx_uso_card{border:2px solid #dbe3ef;border-left-width:7px;border-radius:18px;padding:14px;background:#fff}.zx_uso_card.laboral{border-left-color:#2563eb}.zx_uso_card.personal{border-left-color:#f59e0b}.zx_uso_card.sin_clasificar{border-left-color:#94a3b8}.zx_uso_card_top{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.zx_uso_card_top>div{min-width:0}.zx_uso_card_top strong{display:block;color:#071330;font-size:16px;line-height:1.15}.zx_uso_card_top time{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:4px}.zx_uso_tipo{flex:0 0 auto;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950}.zx_uso_tipo.laboral{background:#dbeafe;color:#1d4ed8}.zx_uso_tipo.personal{background:#fef3c7;color:#92400e}.zx_uso_tipo.sin_clasificar{background:#e2e8f0;color:#475569}.zx_uso_meta{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;color:#64748b;font-size:12px;font-weight:850}.zx_uso_meta span{background:#f1f5f9;border-radius:999px;padding:5px 8px;white-space:nowrap}.zx_uso_meta b{color:#334155;text-align:right}.zx_uso_detalle{display:block;border:0;background:transparent;color:#2563eb;font-weight:950;font-size:14px;padding:10px 0 3px;text-align:left}.zx_uso_selector{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.zx_uso_selector button{border:2px solid #e2e8f0;border-radius:12px;padding:10px 7px;font-weight:950;background:#f8fafc;color:#64748b}.zx_uso_selector button.activo.laboral{background:#2563eb;color:#fff;border-color:#1d4ed8}.zx_uso_selector button.activo.personal{background:#f59e0b;color:#fff;border-color:#d97706}@media(max-width:430px){.zx_veh_uso_resumen strong{font-size:16px}.zx_veh_uso_resumen small{font-size:9px}.zx_uso_card_top{align-items:center}.zx_uso_tipo{max-width:110px;text-align:center}}.zx_veh_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_veh_form h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_veh_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_veh_form input,.zx_veh_form select,.zx_veh_form textarea,#zx_modal_vehiculo input,#zx_modal_vehiculo select,#zx_modal_vehiculo textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_veh_grid2{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_veh_loading{padding:20px 0;color:#64748b;font-weight:900;text-align:center}
    .zx_veh_tabs{display:flex;gap:8px;overflow-x:auto;margin:14px 0 12px;padding-bottom:4px}
    .zx_veh_tabs button{border:1px solid var(--zx-line);border-radius:999px;background:var(--zx-soft);color:var(--zx-text);padding:10px 12px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_tabs button.on{background:var(--zx-primary);color:var(--zx-primary-contrast);border-color:var(--zx-primary)}
    .zx_veh_tab{display:none}.zx_veh_tab.on{display:block}
    .zx_veh_hist{display:grid;gap:10px}.zx_veh_hist_item{background:#f8fafc;border:1px solid #dbe3ef;border-radius:16px;padding:12px}
    .zx_veh_hist_item b,.zx_veh_hist_item span,.zx_veh_hist_item small{display:block}.zx_veh_hist_item b{color:#071330;font-size:15px}.zx_veh_hist_item span{color:#475569;font-size:13px;font-weight:850;margin-top:4px}.zx_veh_hist_item small{color:#64748b;font-size:12px;font-weight:850;margin-top:4px}
    .zx_veh_mov{background:#f8fafc;border:1px solid #dbe3ef;border-left:6px solid #94a3b8;border-radius:18px;padding:14px;box-shadow:0 5px 14px rgba(15,23,42,.04)}
    .zx_mov_dia{margin:0 0 18px}.zx_mov_dia_titulo{margin:16px 0 10px;padding:8px 0;border-top:2px solid #dbe3ef;border-bottom:2px solid #dbe3ef;background:#fff;color:#071330;font-weight:950}.zx_mov_dia_titulo span{display:inline-block;background:#eef2f7;border-radius:10px;padding:7px 11px;letter-spacing:.02em}
    .zx_veh_mov header{display:flex;align-items:flex-start;gap:10px}.zx_veh_mov header i{font-style:normal;font-size:21px;line-height:1}.zx_veh_mov header strong,.zx_veh_mov header time{display:block}.zx_veh_mov header strong{color:#071330;font-size:16px;line-height:1.15}.zx_veh_mov header time{color:#64748b;font-size:12px;font-weight:900;margin-top:5px}
    .zx_mov_grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.zx_mov_grid>div{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 10px;min-width:0}.zx_mov_grid span,.zx_mov_grid b{display:block}.zx_mov_grid span{color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}.zx_mov_grid b{color:#16233d;font-size:12px;line-height:1.25;margin-top:3px;overflow-wrap:anywhere}.zx_mov_grid .zx_mov_wide{grid-column:1/-1}
    .zx_mov_inicio{border-left-color:#22c55e}.zx_mov_fin{border-left-color:#ef4444}.zx_mov_transferencia{border-left-color:#7c3aed}.zx_mov_laboral{border-left-color:#2563eb}.zx_mov_personal{border-left-color:#f59e0b}.zx_mov_otro{border-left-color:#64748b}
    .zx_veh_tabs{scrollbar-width:none;-webkit-overflow-scrolling:touch}.zx_veh_tabs::-webkit-scrollbar{display:none}.zx_veh_tabs button{flex:0 0 auto}
    .zx_veh_route_box{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:16px}.zx_veh_route_box b,.zx_veh_route_box span{display:block}.zx_veh_route_box span{margin-top:6px;color:#64748b;font-weight:850}.zx_veh_route_box a,.zx_veh_route_box button{display:inline-block;margin-top:12px;background:#2563eb;color:white;text-decoration:none;border:0;border-radius:14px;padding:11px 13px;font-weight:950;font:inherit;cursor:pointer}
    .zx_veh_route_head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.zx_veh_route_head em{font-style:normal;background:#fee2e2;color:#b91c1c;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:950;white-space:nowrap;animation:zxRutaPulso 1.5s infinite}.zx_veh_route_stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:13px 0}.zx_veh_route_stats>div{background:white;border:1px solid #dbe3ef;border-radius:14px;padding:9px;text-align:center;min-width:0}.zx_veh_route_stats strong{display:block;color:#071330;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_veh_route_stats small{display:block;color:#64748b;font-size:10px;font-weight:900;margin-top:3px}.zx_veh_mapa_ruta{width:100%;height:390px;border-radius:18px;border:1px solid #cbd5e1;overflow:hidden;background:#e2e8f0;margin-top:10px}.zx_veh_map_error{height:100%;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;color:#64748b;font-weight:900}.zx_ruta_marker_wrap{background:transparent!important;border:0!important}.zx_ruta_marker{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;border:3px solid white;box-shadow:0 3px 9px rgba(15,23,42,.35);font-size:11px;font-weight:950}@keyframes zxRutaPulso{0%,100%{opacity:1}50%{opacity:.55}}
.zx_veh_map_choices{display:grid;gap:10px;margin-top:14px}
.zx_veh_map_choices a{display:block;text-align:center;text-decoration:none;border-radius:18px;padding:14px 16px;font-weight:900;background:#2563eb;color:#fff}
.zx_veh_map_choices a:nth-child(2){background:#111827}
.zx_veh_map_choices a:nth-child(3){background:#22c55e}
.zx_veh_route_note{display:block;margin-top:12px;line-height:1.35;color:#64748b;font-weight:700}.zx_veh_route_select{display:block;margin:12px 0}.zx_veh_route_select span{display:block;margin-bottom:6px;color:#475569;font-weight:900}.zx_veh_route_select select{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:14px;background:white;color:#071330;font-weight:850;font-size:14px}

    .zx_grua_vehicle{display:grid;gap:3px;background:#fff7ed;border:1px solid #fdba74;border-radius:18px;padding:14px;margin-top:12px}.zx_grua_vehicle strong{font-size:25px;color:#7c2d12}.zx_grua_vehicle span{color:#9a3412;font-weight:850}
    .zx_grua_notice{margin-top:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:16px;padding:12px;font-weight:850;line-height:1.35}
    .zx_grua_grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.zx_grua_grid>div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:14px;padding:10px;min-width:0}.zx_grua_grid .wide{grid-column:1/-1}.zx_grua_grid span,.zx_grua_grid b{display:block}.zx_grua_grid span{color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase}.zx_grua_grid b{color:#071330;font-size:13px;margin-top:4px;overflow-wrap:anywhere}
    .zx_grua_location{display:grid;gap:5px;margin-top:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:13px}.zx_grua_location b{color:#1e3a8a;line-height:1.3}.zx_grua_location span{color:#475569;font-size:12px;font-weight:800;line-height:1.35}.zx_grua_location em{color:#b91c1c;font-size:11px;font-weight:850;font-style:normal}
    .zx_grua_manual small{display:block;color:#64748b;font-size:11px;font-weight:750;line-height:1.35;margin-top:7px}
    .zx_grua_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.zx_grua_actions a,.zx_grua_actions button{display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;border:0;border-radius:16px;padding:13px 9px;min-height:48px;color:#fff;font-size:13px;font-weight:950}.zx_grua_actions .call{grid-column:1/-1;background:#16a34a;font-size:16px;box-shadow:0 9px 18px rgba(22,163,74,.2)}
    .zx_emergency_quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.zx_emergency_quick a,.zx_emergency_quick button{border:0;border-radius:16px;min-height:52px;padding:11px;text-align:center;text-decoration:none;color:#fff;font-weight:950;font-size:13px;display:flex;align-items:center;justify-content:center}.zx_emergency_112{grid-column:1/-1;background:#dc2626;font-size:16px!important}.zx_emergency_company{background:#0f766e}.zx_emergency_incident{background:#ea580c}.zx_emergency_assistance{grid-column:1/-1;background:#16a34a;font-size:15px!important}.zx_emergency_assistance.disabled{background:#94a3b8}.zx_emergency_accident{grid-column:1/-1;background:#7c3aed}.zx_emergency_whatsapp{grid-column:1/-1;background:#16a34a}.zx_vehicle_emergency_grid .wide{grid-column:1/-1}.zx_grua_insurance .expired{background:#fef2f2;border-color:#fecaca}.zx_grua_insurance .expired b{color:#b91c1c}.zx_vehicle_emergency_grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.zx_vehicle_emergency_grid>div{background:rgba(255,255,255,.6);border:1px solid #fed7aa;border-radius:12px;padding:8px}.zx_vehicle_emergency_grid small,.zx_vehicle_emergency_grid b{display:block}.zx_vehicle_emergency_grid small{font-size:9px;text-transform:uppercase;color:#9a3412;font-weight:950}.zx_vehicle_emergency_grid b{font-size:12px;color:#7c2d12;margin-top:3px;overflow-wrap:anywhere}.zx_accident_alerts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.zx_accident_alerts a{background:#dc2626;color:#fff;text-decoration:none;border-radius:14px;min-height:48px;padding:10px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:950}.zx_accident_alerts a+ a{background:#16a34a}.zx_voice_row{display:flex;gap:8px;align-items:center}.zx_voice_row button{border:0;border-radius:12px;background:#7c3aed;color:#fff;font-weight:900;padding:10px 14px}.zx_voice_row span{font-size:12px;color:#64748b;font-weight:800}
    .zx_grua_section{margin-top:12px}.zx_grua_section h3{margin:0 0 8px;color:#071330;font-size:16px}.zx_grua_insurance{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_grua_insurance>div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:14px;padding:10px;min-width:0}.zx_grua_insurance .wide{grid-column:1/-1}.zx_grua_insurance span,.zx_grua_insurance b{display:block}.zx_grua_insurance span{color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase}.zx_grua_insurance b{color:#071330;font-size:13px;margin-top:4px;overflow-wrap:anywhere}
    .zx_grua_location{grid-template-columns:1fr 1fr}.zx_grua_location .wide{grid-column:1/-1}.zx_location_row{background:rgba(255,255,255,.65);border:1px solid #dbeafe;border-radius:12px;padding:9px}.zx_location_row span,.zx_location_row b{display:block}.zx_location_row span{font-size:10px;color:#64748b;font-weight:950;text-transform:uppercase}.zx_location_row b{margin-top:3px;color:#1e3a8a;font-size:12px;overflow-wrap:anywhere}
    .zx_grua_actions .apple{background:#334155}.zx_grua_actions .softblue{background:#0f766e}
.zx_grua_actions .disabled{grid-column:1/-1;background:#94a3b8}.zx_grua_actions .blue{background:#2563eb}.zx_grua_actions .purple{background:#7c3aed}.zx_grua_actions .maps{background:#111827}.zx_grua_actions .orange{background:#f97316}.zx_grua_actions .gray{background:#64748b}

    .zx_veh_incident_card{width:100%;display:block;text-align:left;border:1px solid #d9e2ec;border-left:7px solid #94a3b8;border-radius:18px;padding:16px;margin:12px 0;background:#fff;color:#0f172a;box-sizing:border-box;cursor:pointer}
    .zx_veh_incident_card.alta{border-left-color:#ef4444}.zx_veh_incident_card.abierta{border-left-color:#f59e0b}.zx_veh_incident_card.resuelta{border-left-color:#22c55e}
    .zx_veh_incident_head{display:flex;justify-content:space-between;gap:12px;align-items:center}.zx_veh_incident_head strong{font-size:1.08rem}.zx_veh_incident_head span{font-size:.82rem;font-weight:800;background:#eef2f7;padding:6px 10px;border-radius:999px}
    .zx_veh_incident_card time{display:block;color:#64748b;font-weight:700;margin-top:5px}.zx_veh_incident_card p{font-weight:700;margin:12px 0;line-height:1.35}
    .zx_veh_incident_grid,.zx_inc_detail_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.zx_veh_incident_grid>div,.zx_inc_detail_grid>div{border:1px solid #e2e8f0;border-radius:13px;padding:11px;min-width:0;background:#fff}
    .zx_veh_incident_grid .wide,.zx_inc_detail_grid .wide{grid-column:1/-1}.zx_veh_incident_grid small,.zx_inc_detail_grid small,.zx_inc_description small{display:block;color:#64748b;font-weight:800;font-size:.72rem;line-height:1.2;margin-bottom:5px}
    .zx_veh_incident_grid b,.zx_inc_detail_grid b{display:block;font-size:.96rem;line-height:1.3;overflow-wrap:anywhere}.zx_inc_open_hint{margin-top:12px;color:#2563eb;font-weight:900}
    .zx_inc_detail_head{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 14px}.zx_inc_status,.zx_inc_severity{background:#eef2f7;border-radius:999px;padding:7px 11px;font-weight:800}
    .zx_inc_description{border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin:12px 0}.zx_inc_description p{margin:0;font-weight:700;line-height:1.4}
    .zx_inc_manage{border:1px solid #dbeafe;background:#f8fbff;border-radius:16px;padding:14px;margin:15px 0}.zx_inc_manage h3{margin-top:0}.zx_inc_manage_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .zx_inc_manage label{display:block;font-weight:800;margin:8px 0}.zx_inc_manage select,.zx_inc_manage textarea{width:100%;box-sizing:border-box;margin-top:6px}
    .zx_inc_audit_list{display:grid;gap:10px}.zx_inc_audit_item{border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#fff}.zx_inc_audit_top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .zx_inc_audit_top time{color:#64748b;font-weight:700;font-size:.85rem}.zx_inc_audit_user{color:#64748b;font-weight:700;margin-top:3px}.zx_inc_audit_change{margin-top:8px;font-weight:900}.zx_inc_audit_item p{margin:8px 0 0;line-height:1.35}


    .zx_modal_top_actions{position:sticky;top:0;z-index:80;display:flex;justify-content:flex-end;padding:6px 0 9px;margin:-4px 0 6px;background:linear-gradient(var(--zx-card) 78%,color-mix(in srgb,var(--zx-card) 94%,transparent))}
    .zx_modal_top_close{appearance:none;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;border-radius:12px;padding:9px 13px;font-weight:900;cursor:pointer}
    .zx_veh_view_head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}
    .zx_veh_view_head h2{margin:0;min-width:0}
    .zx_view_action{appearance:none;border:0;border-radius:12px;padding:9px 12px;font-weight:900;cursor:pointer;white-space:nowrap;flex-shrink:0}
    .zx_view_action.blue{background:#2563eb;color:#fff}

    @media(max-width:560px){.zx_veh_tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible;gap:8px}.zx_veh_tabs button{width:100%;min-width:0;white-space:normal;line-height:1.15;min-height:46px}.zx_veh_uso_filtros{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible;gap:7px;padding-bottom:12px}.zx_veh_uso_filtros button{width:100%;min-width:0;white-space:normal;line-height:1.15;min-height:42px}.zx_veh_incident_grid,.zx_inc_detail_grid,.zx_inc_manage_grid{grid-template-columns:1fr}.zx_veh_incident_grid .wide,.zx_inc_detail_grid .wide{grid-column:auto}.zx_inc_audit_top{display:block}}
    @media(max-width:390px){.zx_veh_header{grid-template-columns:1fr}.zx_veh_header_actions{grid-template-columns:1fr 1fr}.zx_flota_head{display:grid}.zx_flota_stats{grid-template-columns:repeat(3,minmax(0,1fr))}.zx_veh_panel{padding:15px;border-radius:22px}.zx_veh_header h2{font-size:27px}.zx_veh_actions,.zx_veh_more_panel{grid-template-columns:1fr}.zx_veh_kpis{grid-template-columns:1fr 1fr}.zx_veh_card_head{grid-template-columns:52px minmax(0,1fr)}.zx_veh_media{width:52px;height:52px}.zx_veh_status_inline{grid-column:1/-1}.zx_veh_fastline{grid-template-columns:1fr 1fr}}
    @media(min-width:700px){.zx_veh_shell{padding-bottom:32px}.zx_veh_kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.zx_veh_kpi_alert{grid-column:auto}.zx_veh_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_info.ficha{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_veh_panel{padding:22px}.zx_veh_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

async function recargarVehiculosActual(){
  return abrirVehiculosBase(ZX_VEH_MODO_OPERATIVO);
}

async function abrirVehiculosBase(modoOperativo){
  ZX_VEH_MODO_OPERATIVO=!!modoOperativo;
  if(ZX_VEH_MODO_OPERATIVO && ["inactivos","avisos","todos"].includes(ZX_VEH_FILTRO)) ZX_VEH_FILTRO="activos";
  instalarCSS();

  if(!puedeEntrar()){
    app().innerHTML=`
      <div class="zx_veh_panel">
        <h2>Vehículos</h2>
        <div class="zx_text">No tienes permiso para acceder a Vehículos.</div>
      </div>
    `;
    return;
  }

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("vehiculos");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="vehiculos") b.classList.add("zx_activo");
    });
  }

  ZX_VEH_CACHE=leerCache().map(prepararVehiculo);
  pintarShell(filtrarVehiculos());
  iniciarRelojDuraciones();
  iniciarSeguimientoGPSActual();

  setTimeout(async function(){
    const lista=await cargarVehiculos();
    pintarShell(lista);
    iniciarRelojDuraciones();
    iniciarSeguimientoGPSActual();
  },20);

}

window.ZX_vehiculos=async function(){
  return abrirVehiculosBase(false);
};

window.ZX_vehiculos_operativo=async function(){
  return abrirVehiculosBase(true);
};

window.ZENTRYX_UI_abrirVehiculos=window.ZX_vehiculos;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("vehiculos",{
    nombre:"Vehículos",
    activo:true,
    version:ZX_VERSION
  });
}

instalarSeguimientoGPSGlobal();

console.log("ZENTRYX vehiculos.js V"+ZX_VERSION+" cargado");

})();
