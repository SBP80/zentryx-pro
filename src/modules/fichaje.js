// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3102 - BASE V3095 + VEHÍCULOS/KM + EDICIÓN/PIN
// ===============================
(function(){
"use strict";

let ZX_VER_ULTIMOS=false;
let ZX_VER_ADMIN=false;
let ZX_VER_MIS_JORNADAS=false;
let ZX_TIMER=null;
let ZX_RT_CANAL=null;
let ZX_RENDER_ID=0;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}
function esAdmin(){const s=sesion();return String(s.rol||"").toLowerCase()==="administrador"||String(s.usuario||"").toLowerCase()==="admin"}
function limpiar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function ahora(){return new Date().toISOString()}
function uuidSeguro(){try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID()}catch(e){}return"zx_"+Date.now()+"_"+Math.random().toString(16).slice(2)}
function fechaHoyISO(){return fechaLocalISO(new Date())}
function fechaLocalISO(valor){const d=valor?new Date(valor):new Date();if(isNaN(d.getTime())){const h=new Date();h.setMinutes(h.getMinutes()-h.getTimezoneOffset());return h.toISOString().slice(0,10)}const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function formatoFechaES(f){if(!f)return"";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:limpiar(f)}
function fechaCorta(f){if(!f)return"-";const d=new Date(f);if(isNaN(d.getTime()))return"-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function fechaCortaSeg(f){if(!f)return"-";const d=new Date(f);if(isNaN(d.getTime()))return"-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0")}
function toInputFecha(f){if(!f)return"";const d=new Date(f);if(isNaN(d.getTime()))return"";const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
function fromInputFecha(v){if(!v)return null;const d=new Date(v);if(isNaN(d.getTime()))return null;return d.toISOString()}
function formatoSeg(seg){seg=Math.max(0,Math.floor(seg||0));const h=Math.floor(seg/3600);const m=Math.floor((seg%3600)/60);const s=seg%60;return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function formatoMin(min){return formatoSeg(Number(min||0)*60)}
function segundosEntre(a,b){const da=new Date(a),db=new Date(b);if(isNaN(da.getTime())||isNaN(db.getTime()))return 0;return Math.max(0,Math.floor((db-da)/1000))}
function guardarScroll(){try{sessionStorage.setItem("zx_scroll_fichaje",String(window.scrollY||0))}catch(e){}}
function restaurarScroll(){try{const y=Number(sessionStorage.getItem("zx_scroll_fichaje")||0);if(y>0)requestAnimationFrame(()=>window.scrollTo(0,y))}catch(e){}}

function textoTipo(t){return{entrada:"Entrada",salida:"Salida",inicio_descanso:"Inicio descanso",fin_descanso:"Fin descanso",inicio_comida:"Inicio comida",fin_comida:"Fin comida"}[t]||t}
function estadoDesdeTipo(tipo){if(!tipo)return"fuera";if(tipo==="entrada")return"dentro";if(tipo==="salida")return"fuera";if(tipo==="inicio_descanso")return"descanso";if(tipo==="fin_descanso")return"dentro";if(tipo==="inicio_comida")return"comida";if(tipo==="fin_comida")return"dentro";return"fuera"}
function textoEstado(e){if(e==="dentro")return"Trabajando";if(e==="descanso")return"Descanso";if(e==="comida")return"Comida";return"Fuera"}
function colorEstado(e){if(e==="dentro")return"#16a34a";if(e==="descanso")return"#f59e0b";if(e==="comida")return"#ea580c";return"#64748b"}

function hashPin(pin){try{return btoa(String(pin))}catch(e){return String(pin)}}
function pedirMotivo(txt){const motivo=prompt(txt||"Indica el motivo.");if(!motivo||!String(motivo).trim()){alert("Motivo obligatorio.");return null}return String(motivo).trim()}

async function insertarAuditoria(accion,detalle,usuarioObjetivoId){
  const s=sesion();
  try{await sb().from("auditoria").insert([{id:uuidSeguro(),usuario_id:String(s.id||""),usuario:s.usuario||"",nombre:s.nombre||"",modulo:"fichaje",accion:String(accion||""),detalle:String(detalle||""),usuario_objetivo_id:usuarioObjetivoId?String(usuarioObjetivoId):null,created_at:ahora()}])}catch(e){}
}
async function insertarAviso(usuarioId,titulo,mensaje,tipo){
  try{await sb().from("notificaciones").insert([{id:uuidSeguro(),usuario_id:String(usuarioId),titulo:String(titulo||""),mensaje:String(mensaje||""),tipo:String(tipo||"fichaje"),leida:false,created_at:ahora()}])}
  catch(e){try{await sb().from("avisos").insert([{id:uuidSeguro(),usuario_id:String(usuarioId),titulo:String(titulo||""),mensaje:String(mensaje||""),tipo:String(tipo||"fichaje"),leida:false,created_at:ahora()}])}catch(e2){}}
}
function dispositivoAuditoria(){const s=sesion();return["Usuario sesión: "+String(s.usuario||""),"Rol: "+String(s.rol||""),"URL: "+String(location.href||""),"Dispositivo: "+String(navigator.userAgent||"")].join(" | ")}
function valorFichajeAuditoria(f){if(!f)return null;return{id:f.id||null,jornada_id:f.jornada_id||null,usuario_id:f.usuario_id||null,usuario:f.usuario||"",nombre:f.nombre||"",tipo:f.tipo||"",fecha_hora:f.created_at||null,fecha_hora_es:fechaCortaSeg(f.created_at),direccion:f.direccion||"",lat:f.lat==null?null:f.lat,lng:f.lng==null?null:f.lng,vehiculo_id:f.vehiculo_id||null,vehiculo_matricula:f.vehiculo_matricula||"",km_vehiculo:f.km_vehiculo==null?null:f.km_vehiculo,modificado_por:f.modificado_por||"",modificado_en:f.modificado_en||null,motivo_modificacion:f.motivo_modificacion||""}}
function detalleAuditoriaFichaje(accion,motivo,anterior,nuevo){try{return JSON.stringify({accion:String(accion||""),motivo:String(motivo||""),realizado_por:sesion().usuario||"",realizado_en:ahora(),dispositivo:dispositivoAuditoria(),anterior:valorFichajeAuditoria(anterior),nuevo:valorFichajeAuditoria(nuevo)},null,2)}catch(e){return String(accion||"")+". Motivo: "+String(motivo||"")}}
function detalleAuditoriaJornada(accion,motivo,jornada,fichajes){try{return JSON.stringify({accion:String(accion||""),motivo:String(motivo||""),realizado_por:sesion().usuario||"",realizado_en:ahora(),dispositivo:dispositivoAuditoria(),jornada:jornada||null,fichajes:(fichajes||[]).map(valorFichajeAuditoria)},null,2)}catch(e){return String(accion||"")+". Motivo: "+String(motivo||"")}}

async function validarAdminOperacion(){
  const s=sesion();
  if(!esAdmin()){alert("Solo administrador.");return false}
  const pin=prompt("Introduce PIN de administrador.");
  if(!pin||!/^[0-9]{4}$/.test(String(pin).trim())){alert("PIN inválido.");return false}
  try{
    const r=await sb().from("usuarios").select("id,usuario,rol,pin_hash,debe_crear_pin").eq("id",String(s.id||"")).maybeSingle();
    if(r.error||!r.data){alert("No se pudo validar el PIN.");return false}
    const rol=String(r.data.rol||"").toLowerCase();
    const usuario=String(r.data.usuario||"").toLowerCase();
    if(rol!=="administrador"&&usuario!=="admin"){alert("Solo administrador.");return false}
    if(r.data.debe_crear_pin||!r.data.pin_hash){alert("El administrador no tiene PIN activo. Crea o restablece el PIN desde Usuarios.");return false}
    if(hashPin(String(pin).trim())!==String(r.data.pin_hash||"")){alert("PIN incorrecto.");return false}
    return true;
  }catch(e){alert("No se pudo validar el PIN.");return false}
}

// Laboral simplificado, mantiene compatibilidad visual y evita romper si faltan tablas.
async function objetivoDiaPRO(fechaISOtxt,usuarioIdOpcional){
  const uid=usuarioIdOpcional||sesion().id;
  let objetivoSeg=480*60;
  try{
    const r=await sb().from("horarios_usuario").select("*").eq("usuario_id",String(uid)).eq("activo",true).limit(1);
    if(!r.error&&r.data&&r.data.length){
      const d=new Date(fechaISOtxt||new Date());
      const dia=["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][d.getDay()];
      objetivoSeg=Number(r.data[0][dia]||0)*60;
    }
  }catch(e){}
  return{objetivoSeg,objetivoBaseSeg:objetivoSeg,minutosJustificados:0,tipoAusencia:null,observacion:"",solicitudId:null,bloquearFichaje:false,solicitudes:[],festivo:false,tipoFestivo:null,nombreFestivo:null};
}
function bloqueoHorarioActual(){return{bloqueado:false}}

async function obtenerUbicacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({lat:null,lng:null,direccion:null});return}
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      try{const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng);const data=await r.json();resolve({lat,lng,direccion:data.display_name||null})}
      catch(e){resolve({lat,lng,direccion:null})}
    },()=>resolve({lat:null,lng:null,direccion:null}),{enableHighAccuracy:true,timeout:8000,maximumAge:0});
  });
}

// Vehículos
async function vehiculosLibres(){
  try{const r=await sb().from("vehiculos").select("id,matricula,marca,modelo,km_actual,activo,en_uso").eq("activo",true).eq("en_uso",false).order("matricula",{ascending:true});if(r.error)return[];return r.data||[]}catch(e){return[]}
}
async function vehiculoPorId(id){if(!id)return null;try{const r=await sb().from("vehiculos").select("*").eq("id",String(id)).maybeSingle();if(r.error||!r.data)return null;return r.data}catch(e){return null}}
async function marcarVehiculoEntrada(v,km){
  if(!v||!v.id)return{error:null};
  const s=sesion();
  const r=await sb().from("vehiculos").update({en_uso:true,usuario_id:String(s.id||""),usuario_asignado:s.nombre||s.usuario||"",km_actual:Number(km)}).eq("id",String(v.id));
  return r||{error:null};
}
async function marcarVehiculoSalida(id,km){
  if(!id)return{error:null};
  const r=await sb().from("vehiculos").update({en_uso:false,usuario_id:null,usuario_asignado:"",km_actual:Number(km)}).eq("id",String(id));
  return r||{error:null};
}

// Jornadas y fichajes
async function jornadaAbierta(){
  const s=sesion();
  const r=await sb().from("jornadas").select("*").eq("usuario_id",String(s.id)).eq("estado","abierta").order("created_at",{ascending:false}).limit(1);
  if(r.error||!r.data||!r.data.length)return null;
  return r.data[0];
}
async function jornadasUsuarioFecha(usuarioId,fecha){
  const r=await sb().from("jornadas").select("*").eq("usuario_id",String(usuarioId)).eq("fecha",String(fecha).slice(0,10)).order("created_at",{ascending:false});
  if(r.error||!r.data)return[];
  return r.data||[];
}
async function ultimaJornadaUsuario(){
  const s=sesion();
  const r=await sb().from("jornadas").select("*").eq("usuario_id",String(s.id)).order("created_at",{ascending:false}).limit(1);
  if(r.error||!r.data||!r.data.length)return null;
  return r.data[0];
}
async function fichajesDeJornada(jornadaId){
  const r=await sb().from("fichajes").select("*").eq("jornada_id",String(jornadaId)).order("created_at",{ascending:true});
  if(r.error)return[];
  return r.data||[];
}
async function estadoActual(){
  const j=await jornadaAbierta();
  if(!j)return{estado:"fuera",jornada:null,eventos:[]};
  const eventos=await fichajesDeJornada(j.id);
  const ultimo=eventos.length?eventos[eventos.length-1]:null;
  return{estado:estadoDesdeTipo(ultimo?ultimo.tipo:"entrada"),jornada:j,eventos};
}

function calcularEnVivo(eventos,estado){
  const lista=(eventos||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  let trabajadoSeg=0,descansoSeg=0,comidaSeg=0,entrada=null,salida=null,inicioTrabajo=null,inicioDescanso=null,inicioComida=null;
  const now=ahora();
  lista.forEach(e=>{
    const tipo=e.tipo,t=e.created_at;
    if(tipo==="entrada"){entrada=t;inicioTrabajo=t;inicioDescanso=null;inicioComida=null}
    if(tipo==="inicio_descanso"){if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}inicioDescanso=t}
    if(tipo==="fin_descanso"){if(inicioDescanso){descansoSeg+=segundosEntre(inicioDescanso,t);inicioDescanso=null}inicioTrabajo=t}
    if(tipo==="inicio_comida"){if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}inicioComida=t}
    if(tipo==="fin_comida"){if(inicioComida){comidaSeg+=segundosEntre(inicioComida,t);inicioComida=null}inicioTrabajo=t}
    if(tipo==="salida"){salida=t;if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}if(inicioDescanso){descansoSeg+=segundosEntre(inicioDescanso,t);inicioDescanso=null}if(inicioComida){comidaSeg+=segundosEntre(inicioComida,t);inicioComida=null}}
  });
  if(!salida){
    if(estado==="dentro"&&inicioTrabajo)trabajadoSeg+=segundosEntre(inicioTrabajo,now);
    if(estado==="descanso"&&inicioDescanso)descansoSeg+=segundosEntre(inicioDescanso,now);
    if(estado==="comida"&&inicioComida)comidaSeg+=segundosEntre(inicioComida,now);
  }
  return{entrada,salida,trabajadoSeg,descansoSeg,comidaSeg};
}
function resumenDesdeJornada(j){
  const tieneSegundos=j&&(j.segundos_trabajados!==undefined||j.segundos_descanso!==undefined||j.segundos_comida!==undefined);
  return{entrada:j?.entrada||null,salida:j?.salida||null,trabajadoSeg:tieneSegundos?Number(j?.segundos_trabajados||0):Math.round(Number(j?.minutos_trabajados||0)*60),descansoSeg:tieneSegundos?Number(j?.segundos_descanso||0):Math.round(Number(j?.minutos_descanso||0)*60),comidaSeg:tieneSegundos?Number(j?.segundos_comida||0):Math.round(Number(j?.minutos_comida||0)*60)};
}
function jornadaEsAdicional(j){const txt=String(j?.observacion_laboral||"");return txt.includes("Jornada extra creada por administrador")||txt.includes("Jornada adicional del mismo día")}
function objetivoJornadaSeg(j,laboral){if(jornadaEsAdicional(j))return 0;if(j&&j.estado==="cerrada"){if(j.segundos_objetivo!==undefined&&j.segundos_objetivo!==null)return Number(j.segundos_objetivo||0);return Math.round(Number(j.minutos_objetivo||0)*60)}return Number(laboral?.objetivoSeg||0)}
async function resumenVisualJornada(j){
  if(!j)return{resumen:{trabajadoSeg:0,descansoSeg:0,comidaSeg:0},objetivoSeg:0,laboral:null,eventos:[],estado:"fuera"};
  const laboral=await objetivoDiaPRO(j.fecha||fechaHoyISO(),j.usuario_id);
  const obj=objetivoJornadaSeg(j,laboral);
  const eventos=await fichajesDeJornada(j.id);
  if(eventos.length){const ultimo=eventos[eventos.length-1];const estado=j.estado==="cerrada"?"fuera":estadoDesdeTipo(ultimo?ultimo.tipo:null);return{resumen:calcularEnVivo(eventos,estado),objetivoSeg:obj,laboral,eventos,estado}}
  return{resumen:resumenDesdeJornada(j),objetivoSeg:obj,laboral,eventos:[],estado:"fuera"};
}

function opcionesPermitidas(estado){
  if(estado==="fuera")return[{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];
  if(estado==="dentro")return[{tipo:"salida",texto:"Salida",clase:"zx_rojo"},{tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},{tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}];
  if(estado==="descanso")return[{tipo:"fin_descanso",texto:"Fin descanso",clase:"zx_azul"}];
  if(estado==="comida")return[{tipo:"fin_comida",texto:"Fin comida",clase:"zx_azul"}];
  return[];
}
function cerrarModal(){const m=document.getElementById("zx_modal_fichaje");if(m)m.remove()}

async function abrirMenu(estado,jornadaActual){
  cerrarModal();
  const ops=opcionesPermitidas(estado);
  const libres=estado==="fuera"?await vehiculosLibres():[];
  const tieneVehiculo=!!(jornadaActual&&jornadaActual.vehiculo_id);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichar</h2>

        ${estado==="fuera"?`
          <label class="zx_label">Vehículo</label>
          <select id="zx_fichaje_vehiculo">
            <option value="">Sin vehículo</option>
            ${libres.map(v=>`
              <option value="${limpiar(v.id)}" data-km="${limpiar(v.km_actual??0)}">
                ${limpiar(v.matricula||"")} ${limpiar(v.marca||"")} ${limpiar(v.modelo||"")} · ${limpiar(v.km_actual??0)} km
              </option>`).join("")}
          </select>

          <label class="zx_label">Km entrada</label>
          <input id="zx_fichaje_km_entrada" type="number" placeholder="Km actuales del vehículo" inputmode="numeric">
        `:""}

        ${estado==="dentro"&&tieneVehiculo?`
          <div class="zx_text" style="margin:10px 0;font-weight:900;">
            Vehículo: <b>${limpiar(jornadaActual.vehiculo_matricula||"")}</b><br>
            Km entrada: <b>${limpiar(jornadaActual.km_entrada??"-")}</b>
          </div>
          <label class="zx_label">Km salida</label>
          <input id="zx_fichaje_km_salida" type="number" value="${limpiar(jornadaActual.km_entrada??"")}" placeholder="Km de salida" inputmode="numeric">
        `:""}

        <div class="zx_text" style="margin:12px 0;color:#dc2626;font-weight:900;">
          Revisa bien antes de guardar. Después quedará registrado con hora, ubicación y dispositivo.
        </div>

        ${ops.map(o=>`<button class="zx_btn_big ${o.clase}" data-fichaje="${o.tipo}">${o.texto}</button>`).join("")}
        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">Cancelar</button>
      </div>
    </div>
  `);

  const sel=document.getElementById("zx_fichaje_vehiculo");
  const kmEntrada=document.getElementById("zx_fichaje_km_entrada");
  if(sel&&kmEntrada){
    sel.onchange=function(){
      const opt=sel.options[sel.selectedIndex];
      kmEntrada.value=opt&&opt.value?String(opt.dataset.km||""):"";
    };
  }

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=async function(){
      const tipo=this.dataset.fichaje;
      const datosModal={
        vehiculoId:document.getElementById("zx_fichaje_vehiculo")?.value||"",
        kmEntrada:document.getElementById("zx_fichaje_km_entrada")?.value||"",
        kmSalida:document.getElementById("zx_fichaje_km_salida")?.value||""
      };
      const ok=confirm("Confirmar fichaje: "+textoTipo(tipo)+"\n\n¿Seguro que quieres guardar este registro?");
      if(!ok)return;
      cerrarModal();
      await registrar(tipo,datosModal);
    };
  });
  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

async function crearJornada(motivoAdmin,datosVehiculo){
  const s=sesion();
  const fecha=fechaHoyISO();
  const jornadasDia=await jornadasUsuarioFecha(s.id,fecha);
  const abierta=jornadasDia.find(j=>j.estado==="abierta");
  if(abierta)return abierta;

  const cerradas=jornadasDia.filter(j=>j.estado==="cerrada");
  const entrada=ahora();
  const laboral=await objetivoDiaPRO(fecha,s.id);
  let objetivoMin=Math.floor(Number(laboral.objetivoSeg||0)/60);
  if(cerradas.length)objetivoMin=0;

  let observacion=laboral.observacion;
  if(cerradas.length&&motivoAdmin)observacion="Jornada extra creada por administrador. Motivo: "+motivoAdmin;
  else if(cerradas.length)observacion="Jornada adicional del mismo día.";

  const datos={usuario_id:String(s.id),usuario:s.usuario||"",nombre:s.nombre||"",fecha,entrada,estado:"abierta",es_festivo:laboral.festivo,tipo_festivo:laboral.tipoFestivo,solicitud_id:laboral.solicitudId,tipo_ausencia:laboral.tipoAusencia,minutos_justificados:laboral.minutosJustificados,observacion_laboral:observacion,minutos_trabajados:0,minutos_descanso:0,minutos_comida:0,minutos_objetivo:objetivoMin,minutos_extra:0,minutos_faltantes:objetivoMin,horas_extra:0,vehiculo_id:datosVehiculo&&datosVehiculo.id?String(datosVehiculo.id):null,vehiculo_matricula:datosVehiculo&&datosVehiculo.matricula?String(datosVehiculo.matricula):null,km_entrada:datosVehiculo&&datosVehiculo.km!=null?Number(datosVehiculo.km):null,km_salida:null,created_at:ahora()};
  const r=await sb().from("jornadas").insert([datos]).select().single();
  if(r.error){alert("Error creando jornada: "+r.error.message);return null}

  if(cerradas.length){
    await insertarAuditoria(motivoAdmin?"crear_jornada_extra_admin":"crear_jornada_adicional",motivoAdmin?"Jornada extra creada por admin. Motivo: "+motivoAdmin:"Jornada adicional creada el mismo día.",s.id);
    await insertarAviso(s.id,motivoAdmin?"Jornada extra creada":"Jornada adicional creada",motivoAdmin?"Se ha creado una jornada extra. Motivo: "+motivoAdmin:"Se ha creado una jornada adicional en el mismo día.","fichaje");
  }
  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo,veh=null){
  const s=sesion();
  const r=await sb().from("fichajes").insert([{usuario_id:String(s.id),usuario:s.usuario||"",nombre:s.nombre||"",jornada_id:String(jornadaId),tipo,lat:geo.lat,lng:geo.lng,direccion:geo.direccion,dispositivo:navigator.userAgent,vehiculo_id:veh&&veh.id?String(veh.id):null,vehiculo_matricula:veh&&veh.matricula?String(veh.matricula):null,km_vehiculo:veh&&veh.km!=null?Number(veh.km):null,created_at:ahora()}]);
  if(r.error){alert("Error al guardar fichaje: "+r.error.message);return false}
  return true;
}

async function sincronizarHorasExtra(jornadaId,c,laboral,extraSeg,jornada){
  const minutos=Math.floor(extraSeg/60);
  const uid=String(jornada?.usuario_id||sesion().id||"");
  const existente=await sb().from("horas_extra_pro").select("*").eq("jornada_id",String(jornadaId)).limit(1);
  const reg=existente.data&&existente.data.length?existente.data[0]:null;
  if(minutos<=0){if(reg&&!["pagada","cobrada","cobrada_trabajador"].includes(reg.estado))await sb().from("horas_extra_pro").delete().eq("jornada_id",String(jornadaId));return}
  const horasDecimal=Number((minutos/60).toFixed(2));const precioHora=15;const importe=Number((horasDecimal*precioHora).toFixed(2));
  if(reg){if(["pagada","cobrada","cobrada_trabajador"].includes(reg.estado))return;await sb().from("horas_extra_pro").update({minutos,horas_decimal:horasDecimal,precio_hora:precioHora,importe,tipo:laboral.festivo?"festivo":"normal",observacion:laboral.observacion||jornada?.observacion_laboral||"",updated_at:ahora()}).eq("jornada_id",String(jornadaId));return}
  await sb().from("horas_extra_pro").insert([{usuario_id:uid,usuario:jornada?.usuario||sesion().usuario||"",nombre:jornada?.nombre||sesion().nombre||"",jornada_id:String(jornadaId),fecha:fechaLocalISO(c.entrada||new Date()),tipo:laboral.festivo?"festivo":"normal",minutos,horas_decimal:horasDecimal,precio_hora:precioHora,importe,estado:"pendiente_trabajador",observacion:laboral.observacion||jornada?.observacion_laboral||""}]);
}

async function recalcularJornada(jornadaId){
  if(!jornadaId)return;
  const rj=await sb().from("jornadas").select("*").eq("id",jornadaId).single();
  if(rj.error||!rj.data)return;
  const jornada=rj.data;
  const eventos=await fichajesDeJornada(jornadaId);
  if(!eventos.length){await sb().from("horas_extra_pro").delete().eq("jornada_id",String(jornadaId));await sb().from("jornadas").delete().eq("id",jornadaId);return}
  const ultimo=eventos[eventos.length-1];
  const nuevoEstado=ultimo&&ultimo.tipo==="salida"?"cerrada":"abierta";
  const estadoCalculo=estadoDesdeTipo(ultimo?ultimo.tipo:null);
  const c=calcularEnVivo(eventos,estadoCalculo);
  const fechaBase=fechaLocalISO(c.entrada||jornada.fecha||new Date());
  const laboral=await objetivoDiaPRO(fechaBase,jornada.usuario_id);
  let objetivoSeg=Number(laboral.objetivoSeg||0);
  if(jornadaEsAdicional(jornada))objetivoSeg=0;
  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);
  await sincronizarHorasExtra(jornadaId,c,laboral,extraSeg,jornada);
  const datos={salida:c.salida,minutos_trabajados:Math.floor(c.trabajadoSeg/60),minutos_descanso:Math.floor(c.descansoSeg/60),minutos_comida:Math.floor(c.comidaSeg/60),minutos_objetivo:Math.floor(objetivoSeg/60),minutos_extra:Math.floor(extraSeg/60),minutos_faltantes:Math.floor(faltanteSeg/60),horas_extra:Math.floor(extraSeg/60),segundos_trabajados:Math.floor(c.trabajadoSeg),segundos_descanso:Math.floor(c.descansoSeg),segundos_comida:Math.floor(c.comidaSeg),segundos_objetivo:Math.floor(objetivoSeg),segundos_extra:Math.floor(extraSeg),segundos_faltantes:Math.floor(faltanteSeg),es_festivo:laboral.festivo,tipo_festivo:laboral.tipoFestivo,solicitud_id:laboral.solicitudId,tipo_ausencia:laboral.tipoAusencia,minutos_justificados:laboral.minutosJustificados,estado:nuevoEstado};
  const r=await sb().from("jornadas").update(datos).eq("id",jornadaId);
  if(r.error)alert("Error recalculando jornada: "+r.error.message);
}

async function registrar(tipo,datosModal={}){
  guardarScroll();
  const s=sesion();
  if(!s.id){alert("Sesión no válida.");return}
  const fecha=fechaHoyISO();
  const laboral=await objetivoDiaPRO(fecha,s.id);
  if(laboral.bloquearFichaje&&tipo==="entrada"){alert("No se puede fichar: existe una baja médica aprobada para hoy.");return}
  const bloqueo=bloqueoHorarioActual(laboral.solicitudes);
  if(bloqueo.bloqueado&&tipo==="entrada"){alert("No puedes fichar.\nPermiso activo: "+bloqueo.inicio+" - "+bloqueo.fin);return}
  const est=await estadoActual();
  let jornada=est.jornada;
  let motivoAdmin=null;
  let veh=null;
  let vehMarcado=false;

  if(tipo==="entrada"){
    const jornadasDia=await jornadasUsuarioFecha(s.id,fecha);
    const cerradas=jornadasDia.filter(j=>j.estado==="cerrada");
    if(cerradas.length&&esAdmin()){if(!(await validarAdminOperacion()))return;motivoAdmin=pedirMotivo("Motivo para crear otra jornada hoy.");if(!motivoAdmin)return}
    if(est.estado!=="fuera"){alert("Ya tienes una jornada abierta.");return}

    const vehiculoId=String(datosModal.vehiculoId||"");
    if(vehiculoId){
      const v=await vehiculoPorId(vehiculoId);
      if(!v){alert("Vehículo no encontrado.");return}
      if(v.activo===false||v.activo==="false"){alert("El vehículo no está activo.");return}
      if(v.en_uso===true||v.en_uso==="true"){alert("El vehículo ya está en uso.");return}
      const km=Number(String(datosModal.kmEntrada||""));
      if(!Number.isFinite(km)||km<0){alert("Km de entrada inválidos.");return}
      if(Number(v.km_actual||0)>0&&km<Number(v.km_actual||0)){alert("Los km de entrada no pueden ser menores que los km actuales del vehículo.");return}
      veh={id:v.id,matricula:v.matricula,km};
      const mv=await marcarVehiculoEntrada(v,km);
      if(mv.error){alert("No se pudo bloquear el vehículo: "+mv.error.message);return}
      vehMarcado=true;
    }

    jornada=await crearJornada(motivoAdmin,veh);
    if(!jornada){if(vehMarcado&&veh&&veh.id)await marcarVehiculoSalida(veh.id,veh.km);return}
  }

  if(tipo!=="entrada"&&!jornada){alert("No hay jornada abierta.");return}
  if(tipo==="inicio_descanso"&&est.estado!=="dentro"){alert("Solo puedes iniciar descanso trabajando.");return}
  if(tipo==="fin_descanso"&&est.estado!=="descanso"){alert("No estás en descanso.");return}
  if(tipo==="inicio_comida"&&est.estado!=="dentro"){alert("Solo puedes iniciar comida trabajando.");return}
  if(tipo==="fin_comida"&&est.estado!=="comida"){alert("No estás en comida.");return}
  if(tipo==="salida"&&(est.estado==="descanso"||est.estado==="comida")){alert("Primero termina descanso o comida.");return}

  if(tipo==="salida"&&jornada.vehiculo_id){
    const kmTxt=String(datosModal.kmSalida||"").trim();
    if(!kmTxt){alert("Indica los km de salida del vehículo.");return}
    const km=Number(kmTxt);
    if(!Number.isFinite(km)||km<0){alert("Km de salida inválidos.");return}
    if(jornada.km_entrada!=null&&km<Number(jornada.km_entrada)){alert("Los km de salida no pueden ser menores que los km de entrada.");return}
    veh={id:jornada.vehiculo_id,matricula:jornada.vehiculo_matricula,km};
    const rj=await sb().from("jornadas").update({km_salida:km}).eq("id",String(jornada.id));
    if(rj.error){alert("No se pudieron guardar los km de salida: "+rj.error.message);return}
    const rv=await marcarVehiculoSalida(jornada.vehiculo_id,km);
    if(rv.error){alert("No se pudo liberar el vehículo: "+rv.error.message);return}
  }

  const geo=await obtenerUbicacion();
  const ok=await insertarFichaje(tipo,jornada.id,geo,veh);
  if(!ok){if(tipo==="entrada"&&vehMarcado&&veh&&veh.id)await marcarVehiculoSalida(veh.id,veh.km);return}
  await insertarAuditoria("fichaje_"+tipo,"Fichaje registrado: "+textoTipo(tipo),s.id);
  await recalcularJornada(jornada.id);
  if(tipo==="salida")await crearEventoAgendaExtra(jornada.id);
  await ZX_fichaje_real();
  restaurarScroll();
}

async function crearEventoAgendaExtra(jornadaId){
  try{
    const rj=await sb().from("jornadas").select("*").eq("id",jornadaId).single();
    if(rj.error||!rj.data)return;
    const j=rj.data;
    if(Number(j.minutos_extra||0)<=0)return;
    const existe=await sb().from("agenda_eventos").select("id").eq("origen","fichaje_extra").eq("origen_id",String(jornadaId)).limit(1);
    if(existe.data&&existe.data.length)return;
    await sb().from("agenda_eventos").insert([{id:uuidSeguro(),titulo:"Trabajo extraordinario - "+(j.nombre||j.usuario||""),tipo:"horas_extra",fecha:j.fecha,inicio:j.entrada,fin:j.salida,usuario_id:j.usuario_id,usuario:j.usuario||"",nombre:j.nombre||"",descripcion:"Jornada cerrada con "+formatoMin(j.minutos_extra)+" de horas extra.",origen:"fichaje_extra",origen_id:String(jornadaId),created_at:ahora()}]);
  }catch(e){}
}

async function ultimosFichajes(){
  const s=sesion();
  const r=await sb().from("fichajes").select("*").eq("usuario_id",String(s.id)).order("created_at",{ascending:false}).limit(8);
  if(r.error)return[];
  return r.data||[];
}
async function jornadasUsuario(){
  const s=sesion();
  const r=await sb().from("jornadas").select("*").eq("usuario_id",String(s.id)).order("created_at",{ascending:false}).limit(8);
  if(r.error)return[];
  return r.data||[];
}
async function jornadasAdminHoy(){
  const s=sesion();
  const hoy=fechaHoyISO();
  const r=await sb().from("jornadas").select("*").eq("fecha",hoy).order("created_at",{ascending:false}).limit(80);
  if(r.error)return[];
  return(r.data||[]).filter(j=>String(j.usuario_id)!==String(s.id));
}

async function borrarJornada(id){
  guardarScroll();
  if(!(await validarAdminOperacion()))return;
  const motivo=pedirMotivo("Motivo para borrar la jornada.");
  if(!motivo)return;
  const r0=await sb().from("jornadas").select("*").eq("id",id).single();
  if(r0.error||!r0.data){alert("No se pudo cargar la jornada.");return}
  const ok=confirm("Vas a eliminar la jornada completa y todos sus fichajes. Esta acción recalculará horas, incidencias y horas extra. ¿Deseas continuar?");
  if(!ok)return;
  const fichajesAntes=await fichajesDeJornada(id);
  if(r0.data.vehiculo_id)await marcarVehiculoSalida(r0.data.vehiculo_id,r0.data.km_salida||r0.data.km_entrada||0);
  const f=await sb().from("fichajes").delete().eq("jornada_id",String(id));
  if(f.error){alert("Error eliminando fichajes: "+f.error.message);return}
  await sb().from("horas_extra_pro").delete().eq("jornada_id",String(id));
  const j=await sb().from("jornadas").delete().eq("id",id);
  if(j.error){alert("Error eliminando jornada: "+j.error.message);return}
  await insertarAuditoria("borrar_jornada",detalleAuditoriaJornada("BORRAR_JORNADA",motivo,r0.data,fichajesAntes),r0.data.usuario_id);
  await insertarAviso(r0.data.usuario_id,"Jornada borrada","Se ha borrado una jornada tuya. Motivo: "+motivo,"fichaje");
  cerrarModal();await ZX_fichaje_real();restaurarScroll();
}
async function borrarFichaje(id){
  guardarScroll();
  if(!(await validarAdminOperacion()))return;
  const motivo=pedirMotivo("Motivo para borrar el fichaje.");
  if(!motivo)return;
  const r0=await sb().from("fichajes").select("*").eq("id",id).single();
  if(r0.error||!r0.data){alert("No se pudo cargar el fichaje.");return}
  const ok=confirm("Vas a eliminar este fichaje. Esta acción puede modificar el tiempo trabajado, recalcular horas extra, incidencias y el estado de la jornada. ¿Deseas continuar?");
  if(!ok)return;
  const r=await sb().from("fichajes").delete().eq("id",id);
  if(r.error){alert("Error eliminando fichaje: "+r.error.message);return}
  const restantes=await fichajesDeJornada(r0.data.jornada_id);
  if(!restantes.length){await sb().from("horas_extra_pro").delete().eq("jornada_id",String(r0.data.jornada_id));await sb().from("jornadas").delete().eq("id",r0.data.jornada_id)}
  else await recalcularJornada(r0.data.jornada_id);
  await insertarAuditoria("borrar_fichaje",detalleAuditoriaFichaje("BORRAR_FICHAJE",motivo,r0.data,null),r0.data.usuario_id);
  await insertarAviso(r0.data.usuario_id,"Fichaje borrado","Se ha borrado un fichaje tuyo. Motivo: "+motivo,"fichaje");
  cerrarModal();await ZX_fichaje_real();restaurarScroll();
}
async function editarFichaje(id){
  guardarScroll();
  if(!(await validarAdminOperacion()))return;
  const motivoInicial=pedirMotivo("Motivo para modificar este fichaje.");
  if(!motivoInicial)return;
  const r=await sb().from("fichajes").select("*").eq("id",id).single();
  if(r.error||!r.data){alert("No se pudo cargar el fichaje.");return}
  const f=r.data;
  cerrarModal();
  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo"><div class="zx_modal_caja">
      <h2>Modificar fichaje</h2>
      <label class="zx_label">Tipo</label>
      <select id="zx_edit_tipo">
        <option value="entrada" ${f.tipo==="entrada"?"selected":""}>Entrada</option>
        <option value="salida" ${f.tipo==="salida"?"selected":""}>Salida</option>
        <option value="inicio_descanso" ${f.tipo==="inicio_descanso"?"selected":""}>Inicio descanso</option>
        <option value="fin_descanso" ${f.tipo==="fin_descanso"?"selected":""}>Fin descanso</option>
        <option value="inicio_comida" ${f.tipo==="inicio_comida"?"selected":""}>Inicio comida</option>
        <option value="fin_comida" ${f.tipo==="fin_comida"?"selected":""}>Fin comida</option>
      </select>
      <label class="zx_label">Fecha y hora</label>
      <input id="zx_edit_fecha" type="datetime-local" value="${limpiar(toInputFecha(f.created_at))}">
      <label class="zx_label">Dirección</label>
      <textarea id="zx_edit_direccion" rows="3">${limpiar(f.direccion||"")}</textarea>
      <label class="zx_label">Latitud</label>
      <input id="zx_edit_lat" type="number" step="any" value="${limpiar(f.lat||"")}">
      <label class="zx_label">Longitud</label>
      <input id="zx_edit_lng" type="number" step="any" value="${limpiar(f.lng||"")}">
      <button class="zx_btn_big zx_azul" id="zx_guardar_edit_fichaje">Guardar cambios</button>
      <button class="zx_btn_big zx_gris" id="zx_cancelar_edit_fichaje">Cancelar</button>
    </div></div>`);
  document.getElementById("zx_cancelar_edit_fichaje").onclick=cerrarModal;
  document.getElementById("zx_guardar_edit_fichaje").onclick=async function(){
    const tipo=document.getElementById("zx_edit_tipo").value;
    const fecha=fromInputFecha(document.getElementById("zx_edit_fecha").value);
    const direccion=document.getElementById("zx_edit_direccion").value.trim();
    const lat=document.getElementById("zx_edit_lat").value;
    const lng=document.getElementById("zx_edit_lng").value;
    if(!fecha){alert("Fecha inválida.");return}
    const nuevoFichaje={...f,tipo,created_at:fecha,direccion,lat:lat===""?null:Number(lat),lng:lng===""?null:Number(lng),modificado_por:sesion().usuario||"",motivo_modificacion:motivoInicial,modificado_en:ahora()};
    const rr=await sb().from("fichajes").update({tipo:nuevoFichaje.tipo,created_at:nuevoFichaje.created_at,direccion:nuevoFichaje.direccion,lat:nuevoFichaje.lat,lng:nuevoFichaje.lng,modificado_por:nuevoFichaje.modificado_por,motivo_modificacion:nuevoFichaje.motivo_modificacion,modificado_en:nuevoFichaje.modificado_en}).eq("id",id);
    if(rr.error){alert("Error guardando: "+rr.error.message);return}
    cerrarModal();
    await recalcularJornada(f.jornada_id);
    await insertarAuditoria("modificar_fichaje",detalleAuditoriaFichaje("MODIFICAR_FICHAJE",motivoInicial,f,nuevoFichaje),f.usuario_id);
    await insertarAviso(f.usuario_id,"Fichaje modificado","Se ha modificado un fichaje tuyo. Motivo: "+motivoInicial,"fichaje");
    await ZX_fichaje_real();restaurarScroll();
  };
}
async function verFichajesJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);
  cerrarModal();
  document.body.insertAdjacentHTML("beforeend",`<div id="zx_modal_fichaje" class="zx_modal_fondo"><div class="zx_modal_caja"><h2>Fichajes jornada</h2>${eventos.length?eventos.map(f=>renderFichajeMini(f)).join(""):`<div class="zx_text">Sin fichajes.</div>`}<button class="zx_btn_big zx_gris" id="zx_cerrar_fichajes_jornada">Cerrar</button></div></div>`);
  document.getElementById("zx_cerrar_fichajes_jornada").onclick=cerrarModal;
  document.querySelectorAll("[data-editar-fichaje]").forEach(btn=>{btn.onclick=function(){editarFichaje(btn.dataset.editarFichaje)}});
  document.querySelectorAll("[data-borrar-fichaje]").forEach(btn=>{btn.onclick=function(){borrarFichaje(btn.dataset.borrarFichaje)}});
}

// Render
function resumenHTML(resumen,objetivoSeg,laboral=null){
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const faltaSeg=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));
  const minutosJustificados=laboral?Number(laboral.minutosJustificados||0):0;
  const bloqueo=laboral?bloqueoHorarioActual(laboral.solicitudes):{bloqueado:false};
  return`<div class="zx_text">${laboral&&laboral.festivo?`<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Día festivo${laboral.nombreFestivo?": "+limpiar(laboral.nombreFestivo):""}</div>`:""}${laboral&&laboral.tipoAusencia?`<div style="color:#2563eb;font-weight:900;margin-bottom:8px;">${limpiar(laboral.observacion)}</div>`:""}${bloqueo.bloqueado?`<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">Permiso activo: ${limpiar(bloqueo.inicio)} - ${limpiar(bloqueo.fin)}</div>`:""}Trabajado: <b data-live-campo="trabajado">${formatoSeg(resumen.trabajadoSeg)}</b><br>Descanso: <b data-live-campo="descanso">${formatoSeg(resumen.descansoSeg)}</b><br>Comida: <b data-live-campo="comida">${formatoSeg(resumen.comidaSeg)}</b><br>Justificado: <b>${formatoMin(minutosJustificados)}</b><br>Objetivo: <b data-live-campo="objetivo">${formatoSeg(objetivoSeg)}</b><br>Extra: <b data-live-campo="extra">${formatoSeg(extraSeg)}</b><br>Falta: <b data-live-campo="falta">${formatoSeg(faltaSeg)}</b></div>`;
}
function resumenLineaHTML(resumen,objetivoSeg,j=null){
  const extraSeg=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const faltaSeg=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));
  return`Trab: ${formatoSeg(resumen.trabajadoSeg)} · Obj: ${formatoSeg(objetivoSeg)}<br>Desc: ${formatoSeg(resumen.descansoSeg)} · Comida: ${formatoSeg(resumen.comidaSeg)}<br>Just: ${formatoMin(j?(j.minutos_justificados||0):0)} · Extra: ${formatoSeg(extraSeg)}<br>Falta: ${formatoSeg(faltaSeg)}${j&&j.es_festivo?`<br><b style="color:#dc2626;">Festivo</b>`:""}${j&&j.observacion_laboral?`<br><b style="color:#2563eb;">${limpiar(j.observacion_laboral)}</b>`:""}${j&&j.vehiculo_matricula?`<br>Vehículo: <b>${limpiar(j.vehiculo_matricula)}</b> · Km: ${limpiar(j.km_entrada??"-")} / ${limpiar(j.km_salida??"-")}`:""}`;
}
function renderFichajeMini(f){
  return`<div class="zx_admin_row"><div class="zx_admin_row_top"><b>${limpiar(textoTipo(f.tipo))}</b><span>${limpiar(fechaCorta(f.created_at))}</span></div><div class="zx_admin_data">${f.vehiculo_matricula?`Vehículo: <b>${limpiar(f.vehiculo_matricula)}</b>${f.km_vehiculo!=null?` · ${limpiar(f.km_vehiculo)} km`:""}<br>`:""}${limpiar(f.direccion||"")}</div>${f.motivo_modificacion?`<div class="zx_admin_data" style="color:#dc2626;">Modificado por ${limpiar(f.modificado_por||"-")} · ${limpiar(fechaCorta(f.modificado_en||""))}<br>Motivo: ${limpiar(f.motivo_modificacion)}</div>`:""}${esAdmin()?`<div class="zx_edit_grid"><button class="zx_admin_btn zx_admin_editar" data-editar-fichaje="${f.id}">Modificar</button><button class="zx_admin_btn zx_admin_borrar" data-borrar-fichaje="${f.id}">Borrar</button></div>`:""}</div>`;
}
function renderJornadaMini(j,admin){
  const resumen=j.__resumen||resumenDesdeJornada(j);
  const objetivoSeg=Number(j.__objetivoSeg??Number(j.minutos_objetivo||0)*60);
  const abierta=j.estado==="abierta";
  return`<div class="zx_admin_row" ${abierta?`data-live-jornada="${limpiar(j.id)}"`:""}><div class="zx_admin_row_top"><b>${limpiar(j.nombre||j.usuario||"-")}</b><span>${limpiar(formatoFechaES(j.fecha||""))}</span></div><div class="zx_admin_estado ${limpiar(j.estado||"")}">${limpiar(j.estado||"-")}</div><div class="zx_admin_data" ${abierta?`data-live-jornada-resumen="${limpiar(j.id)}"`:""}>${resumenLineaHTML(resumen,objetivoSeg,j)}</div>${admin?`<div class="zx_edit_grid"><button class="zx_admin_btn zx_admin_editar" data-ver-fichajes-jornada="${j.id}">Fichajes</button><button class="zx_admin_btn zx_admin_borrar" data-borrar-jornada="${j.id}">Borrar jornada</button></div>`:""}</div>`;
}
function renderAdminResumen(jornadasHoy){
  let totalTrabSeg=0,totalExtraSeg=0,totalFaltaSeg=0,abiertas=0,cerradas=0,festivas=0,justificadas=0;
  jornadasHoy.forEach(j=>{const resumen=j.__resumen||resumenDesdeJornada(j);const objetivoSeg=Number(j.__objetivoSeg??(j.segundos_objetivo!==undefined?Number(j.segundos_objetivo||0):Number(j.minutos_objetivo||0)*60));totalTrabSeg+=Math.floor(Number(resumen.trabajadoSeg||0));totalExtraSeg+=Math.floor(Math.max(0,Number(resumen.trabajadoSeg||0)-objetivoSeg));totalFaltaSeg+=Math.floor(Math.max(0,objetivoSeg-Number(resumen.trabajadoSeg||0)));if(j.estado==="abierta")abiertas++;if(j.estado==="cerrada")cerradas++;if(j.es_festivo)festivas++;if(Number(j.minutos_justificados||0)>0)justificadas++});
  return`<div class="zx_admin_summary"><div><b>${jornadasHoy.length}</b><span>Jornadas</span></div><div><b>${abiertas}</b><span>Abiertas</span></div><div><b>${cerradas}</b><span>Cerradas</span></div><div><b>${formatoSeg(totalTrabSeg)}</b><span>Trabajado</span></div><div><b>${formatoSeg(totalExtraSeg)}</b><span>Extra</span></div><div><b>${formatoSeg(totalFaltaSeg)}</b><span>Falta</span></div><div><b>${festivas}</b><span>Festivas</span></div><div><b>${justificadas}</b><span>Justificadas</span></div></div>`;
}
function seleccionarJornadaLive(id){const out=[];document.querySelectorAll("[data-live-jornada-resumen]").forEach(el=>{if(String(el.getAttribute("data-live-jornada-resumen")||"")===String(id||""))out.push(el)});return out}

function estilosAdminCompacto(){
  if(document.getElementById("zx_admin_compacto_css_v3103"))return;
  const s=document.createElement("style");s.id="zx_admin_compacto_css_v3103";
  s.innerHTML=`.zx_admin_summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}.zx_admin_summary div{background:#f1f5f9;border-radius:16px;padding:14px;text-align:center}.zx_admin_summary b{display:block;font-size:23px;color:#0f172a;font-weight:900}.zx_admin_summary span{font-size:13px;color:#64748b;font-weight:800}.zx_admin_row{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:10px}.zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:16px;color:#0f172a;font-weight:900}.zx_admin_row_top span{color:#64748b;font-size:14px;white-space:nowrap}.zx_admin_estado{display:inline-block;margin:8px 0;padding:5px 10px;border-radius:999px;background:#64748b;color:white;font-size:13px;font-weight:900}.zx_admin_estado.abierta{background:#f59e0b}.zx_admin_estado.cerrada{background:#2563eb}.zx_admin_estado.validada{background:#7c3aed}.zx_admin_estado.pagada{background:#16a34a}.zx_admin_data{color:#64748b;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word}.zx_admin_btn{width:100%;border:0;border-radius:14px;margin-top:10px;padding:12px;color:white;font-size:16px;font-weight:900}.zx_admin_editar{background:#2563eb}.zx_admin_borrar{background:#dc2626}.zx_edit_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.zx_label{display:block;margin-top:14px;margin-bottom:6px;color:#64748b;font-weight:900;font-size:15px}.zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;padding:14px;z-index:9999}.zx_modal_caja{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;background:white;border-radius:22px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.zx_modal_caja select,.zx_modal_caja input,.zx_modal_caja textarea{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-size:16px;font-weight:800;color:#0f172a;background:#f8fafc}`;
  document.head.appendChild(s);
}
function iniciarTiempoReal(){
  if(ZX_RT_CANAL||!sb()||!sb().channel)return;
  try{ZX_RT_CANAL=sb().channel("zx_fichaje_rt_v3103").on("postgres_changes",{event:"*",schema:"public",table:"jornadas"},()=>ZX_fichaje_real()).on("postgres_changes",{event:"*",schema:"public",table:"fichajes"},()=>ZX_fichaje_real()).on("postgres_changes",{event:"*",schema:"public",table:"horas_extra_pro"},()=>ZX_fichaje_real()).subscribe()}catch(e){}
}
window.ZX_toggleUltimos=function(){guardarScroll();ZX_VER_ULTIMOS=!ZX_VER_ULTIMOS;ZX_fichaje_real().then(restaurarScroll)}
window.ZX_toggleAdmin=function(){guardarScroll();ZX_VER_ADMIN=!ZX_VER_ADMIN;ZX_fichaje_real().then(restaurarScroll)}
window.ZX_toggleMisJornadas=function(){guardarScroll();ZX_VER_MIS_JORNADAS=!ZX_VER_MIS_JORNADAS;ZX_fichaje_real().then(restaurarScroll)}

async function actualizarVivo(jornadaId,objSec,lab,jornada=null){
  try{
    const eventos=await fichajesDeJornada(jornadaId);
    const ultimo=eventos.length?eventos[eventos.length-1]:null;
    const estado=estadoDesdeTipo(ultimo?ultimo.tipo:null);
    const r=calcularEnVivo(eventos,estado);
    const extra=Math.max(0,Number(r.trabajadoSeg||0)-Number(objSec||0));
    const falta=Math.max(0,Number(objSec||0)-Number(r.trabajadoSeg||0));
    const resumenCont=document.getElementById("zx_resumen_tiempo");
    if(resumenCont){resumenCont.querySelectorAll("[data-live-campo]").forEach(c=>{const k=c.dataset.liveCampo;if(k==="trabajado")c.textContent=formatoSeg(r.trabajadoSeg);if(k==="descanso")c.textContent=formatoSeg(r.descansoSeg);if(k==="comida")c.textContent=formatoSeg(r.comidaSeg);if(k==="objetivo")c.textContent=formatoSeg(objSec);if(k==="extra")c.textContent=formatoSeg(extra);if(k==="falta")c.textContent=formatoSeg(falta)})}
    seleccionarJornadaLive(jornadaId).forEach(el=>{el.innerHTML=resumenLineaHTML(r,objSec,jornada)});
  }catch(e){}
}

window.ZX_fichaje_real=async function(){
  const renderId=++ZX_RENDER_ID;
  estilosAdminCompacto();
  iniciarTiempoReal();
  if(ZX_TIMER){clearInterval(ZX_TIMER);ZX_TIMER=null}
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){b.classList.remove("zx_activo");if(b.dataset.modulo==="fichaje")b.classList.add("zx_activo")});

  const est=await estadoActual();
  const hist=await ultimosFichajes();
  let jornadas=await jornadasUsuario();
  const ultima=await ultimaJornadaUsuario();
  let adminHoy=esAdmin()?await jornadasAdminHoy():[];

  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0};
  let objetivoSeg=480*60;
  let laboral=null;

  if(est.jornada){const rv=await resumenVisualJornada(est.jornada);resumen=rv.resumen;objetivoSeg=rv.objetivoSeg;laboral=rv.laboral}
  else if(ultima&&ultima.estado==="cerrada"&&String(ultima.fecha)===fechaHoyISO()){const rv=await resumenVisualJornada(ultima);resumen=rv.resumen;objetivoSeg=rv.objetivoSeg;laboral=rv.laboral}
  else{laboral=await objetivoDiaPRO(fechaHoyISO());objetivoSeg=laboral.objetivoSeg}
  if(renderId!==ZX_RENDER_ID)return;

  if(ZX_VER_MIS_JORNADAS){for(const j of jornadas){const rv=await resumenVisualJornada(j);j.__resumen=rv.resumen;j.__objetivoSeg=rv.objetivoSeg}}
  if(ZX_VER_ADMIN){for(const j of adminHoy){const rv=await resumenVisualJornada(j);j.__resumen=rv.resumen;j.__objetivoSeg=rv.objetivoSeg}}

  const bloqueoActual=bloqueoHorarioActual(laboral?laboral.solicitudes:[]);
  const textoBoton=est.estado==="fuera"?"Entrada":est.estado==="dentro"?"Salida / pausa / comida":est.estado==="descanso"?"Fin descanso":est.estado==="comida"?"Fin comida":"Fichar";

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>
      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">${textoEstado(est.estado)}</div>
      ${est.jornada&&est.jornada.vehiculo_matricula?`<div class="zx_text" style="margin-top:12px;">Vehículo: <b>${limpiar(est.jornada.vehiculo_matricula)}</b><br>Km entrada: <b>${limpiar(est.jornada.km_entrada??"-")}</b></div>`:""}
      ${laboral&&laboral.bloquearFichaje?`<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Fichaje bloqueado por baja médica aprobada.</div>`:""}
      ${bloqueoActual.bloqueado?`<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">Permiso activo: ${limpiar(bloqueoActual.inicio)} - ${limpiar(bloqueoActual.fin)}</div>`:""}
      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">${limpiar(textoBoton)}</button>
    </div>
    <div class="zx_card"><h2>Resumen ${est.jornada?"en vivo":"última jornada"}</h2><div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg,laboral)}</div></div>
    <div class="zx_card"><button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">${ZX_VER_MIS_JORNADAS?"Ocultar mis jornadas":"Ver mis jornadas"}</button>${ZX_VER_MIS_JORNADAS?(jornadas.length?jornadas.map(j=>renderJornadaMini(j,esAdmin())).join(""):`<div class="zx_text">Sin jornadas.</div>`):""}</div>
    ${esAdmin()?`<div class="zx_card"><button class="zx_btn_big zx_gris" onclick="ZX_toggleAdmin()">${ZX_VER_ADMIN?"Ocultar panel admin":"Ver panel admin"}</button>${ZX_VER_ADMIN?`${renderAdminResumen(adminHoy)}<h3 style="font-size:24px;margin:18px 0 8px;">Hoy</h3>${adminHoy.length?adminHoy.slice(0,10).map(j=>renderJornadaMini(j,true)).join(""):`<div class="zx_text">Sin jornadas hoy.</div>`}`:""}</div>`:""}
    <div class="zx_card"><button class="zx_btn_big zx_gris" onclick="ZX_toggleUltimos()">${ZX_VER_ULTIMOS?"Ocultar últimos fichajes":"Ver últimos fichajes"}</button>${ZX_VER_ULTIMOS?(hist.length?hist.map(h=>renderFichajeMini(h)).join(""):`<div class="zx_text">Sin registros.</div>`):""}</div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){abrirMenu(est.estado,est.jornada)};
  document.querySelectorAll("[data-editar-fichaje]").forEach(btn=>{btn.onclick=function(){editarFichaje(btn.dataset.editarFichaje)}});
  document.querySelectorAll("[data-borrar-fichaje]").forEach(btn=>{btn.onclick=function(){borrarFichaje(btn.dataset.borrarFichaje)}});
  document.querySelectorAll("[data-borrar-jornada]").forEach(btn=>{btn.onclick=function(){borrarJornada(btn.dataset.borrarJornada)}});
  document.querySelectorAll("[data-ver-fichajes-jornada]").forEach(btn=>{btn.onclick=function(){verFichajesJornada(btn.dataset.verFichajesJornada)}});

  if(est.jornada){
    const liveId=est.jornada.id;
    const liveObj=objetivoSeg;
    const liveJornada=est.jornada;
    actualizarVivo(liveId,liveObj,laboral,liveJornada);
    ZX_TIMER=setInterval(function(){actualizarVivo(liveId,liveObj,laboral,liveJornada)},1000);
  }
};

window.ZX_fichaje=window.ZX_fichaje_real;
})();