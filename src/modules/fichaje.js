// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3100 - VEHÍCULO ROBUSTO EN ENTRADA Y SALIDA
// ===============================
(function(){
"use strict";

let ZX_VER_ULTIMOS=false;
let ZX_VER_MIS_JORNADAS=true;
let ZX_TIMER=null;
let ZX_RENDER_ID=0;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}
function esAdmin(){const s=sesion();return String(s.rol||"").toLowerCase()==="administrador"||String(s.usuario||"").toLowerCase()==="admin"}
function limpiar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function ahora(){return new Date().toISOString()}
function uuidSeguro(){try{if(crypto.randomUUID)return crypto.randomUUID()}catch(e){}return"zx_"+Date.now()+"_"+Math.random().toString(16).slice(2)}
function fechaHoyISO(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function formatoFechaES(f){if(!f)return"";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:limpiar(f)}
function fechaCorta(f){const d=new Date(f);if(isNaN(d.getTime()))return"-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function segundosEntre(a,b){const da=new Date(a),db=new Date(b);if(isNaN(da.getTime())||isNaN(db.getTime()))return 0;return Math.max(0,Math.floor((db-da)/1000))}
function formatoSeg(seg){seg=Math.max(0,Math.floor(seg||0));const h=Math.floor(seg/3600),m=Math.floor((seg%3600)/60),s=seg%60;return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}

function textoTipo(t){return{entrada:"Entrada",salida:"Salida",inicio_descanso:"Inicio descanso",fin_descanso:"Fin descanso",inicio_comida:"Inicio comida",fin_comida:"Fin comida"}[t]||t}
function estadoDesdeTipo(tipo){if(tipo==="entrada"||tipo==="fin_descanso"||tipo==="fin_comida")return"dentro";if(tipo==="inicio_descanso")return"descanso";if(tipo==="inicio_comida")return"comida";return"fuera"}
function textoEstado(e){return e==="dentro"?"Trabajando":e==="descanso"?"Descanso":e==="comida"?"Comida":"Fuera"}
function colorEstado(e){return e==="dentro"?"#16a34a":e==="descanso"?"#f59e0b":e==="comida"?"#ea580c":"#64748b"}

async function insertarAuditoria(accion,detalle,usuarioObjetivoId){
  const s=sesion();
  try{
    await sb().from("auditoria").insert([{
      id:uuidSeguro(),usuario_id:String(s.id||""),usuario:s.usuario||"",nombre:s.nombre||"",
      modulo:"fichaje",accion:String(accion||""),detalle:String(detalle||""),
      usuario_objetivo_id:usuarioObjetivoId?String(usuarioObjetivoId):null,created_at:ahora()
    }]);
  }catch(e){}
}

function hashPin(pin){try{return btoa(String(pin))}catch(e){return String(pin)}}
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
    if(r.data.debe_crear_pin||!r.data.pin_hash){alert("El administrador no tiene PIN activo.");return false}
    if(hashPin(String(pin).trim())!==String(r.data.pin_hash||"")){alert("PIN incorrecto.");return false}
    return true;
  }catch(e){alert("No se pudo validar el PIN.");return false}
}

async function obtenerUbicacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({lat:null,lng:null,direccion:null});return}
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      try{
        const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng);
        const data=await r.json();
        resolve({lat,lng,direccion:data.display_name||null});
      }catch(e){resolve({lat,lng,direccion:null})}
    },()=>resolve({lat:null,lng:null,direccion:null}),{enableHighAccuracy:true,timeout:8000,maximumAge:0});
  });
}

async function vehiculosLibres(){
  try{
    const r=await sb().from("vehiculos").select("id,matricula,marca,modelo,km_actual,activo,en_uso").eq("activo",true).eq("en_uso",false).order("matricula",{ascending:true});
    if(r.error)return[];
    return r.data||[];
  }catch(e){return[]}
}

async function vehiculoPorId(id){
  if(!id)return null;
  try{
    const r=await sb().from("vehiculos").select("*").eq("id",String(id)).maybeSingle();
    if(r.error||!r.data)return null;
    return r.data;
  }catch(e){return null}
}

async function marcarVehiculoEntrada(v,km){
  if(!v||!v.id)return {error:null};
  const s=sesion();
  const r=await sb().from("vehiculos").update({
    en_uso:true,
    usuario_id:String(s.id||""),
    usuario_asignado:s.nombre||s.usuario||"",
    km_actual:Number(km)
  }).eq("id",String(v.id));
  return r||{error:null};
}

async function marcarVehiculoSalida(id,km){
  if(!id)return {error:null};
  const r=await sb().from("vehiculos").update({
    en_uso:false,
    usuario_id:null,
    usuario_asignado:"",
    km_actual:Number(km)
  }).eq("id",String(id));
  return r||{error:null};
}

async function jornadaAbierta(){
  const s=sesion();
  const r=await sb().from("jornadas").select("*").eq("usuario_id",String(s.id)).eq("estado","abierta").order("created_at",{ascending:false}).limit(1);
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
  let trabajadoSeg=0,descansoSeg=0,comidaSeg=0,inicioTrabajo=null,inicioDescanso=null,inicioComida=null,entrada=null,salida=null;
  const now=ahora();

  lista.forEach(e=>{
    const t=e.created_at;
    if(e.tipo==="entrada"){entrada=t;inicioTrabajo=t;inicioDescanso=null;inicioComida=null}
    if(e.tipo==="inicio_descanso"){if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}inicioDescanso=t}
    if(e.tipo==="fin_descanso"){if(inicioDescanso){descansoSeg+=segundosEntre(inicioDescanso,t);inicioDescanso=null}inicioTrabajo=t}
    if(e.tipo==="inicio_comida"){if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}inicioComida=t}
    if(e.tipo==="fin_comida"){if(inicioComida){comidaSeg+=segundosEntre(inicioComida,t);inicioComida=null}inicioTrabajo=t}
    if(e.tipo==="salida"){
      salida=t;
      if(inicioTrabajo){trabajadoSeg+=segundosEntre(inicioTrabajo,t);inicioTrabajo=null}
      if(inicioDescanso){descansoSeg+=segundosEntre(inicioDescanso,t);inicioDescanso=null}
      if(inicioComida){comidaSeg+=segundosEntre(inicioComida,t);inicioComida=null}
    }
  });

  if(!salida){
    if(estado==="dentro"&&inicioTrabajo)trabajadoSeg+=segundosEntre(inicioTrabajo,now);
    if(estado==="descanso"&&inicioDescanso)descansoSeg+=segundosEntre(inicioDescanso,now);
    if(estado==="comida"&&inicioComida)comidaSeg+=segundosEntre(inicioComida,now);
  }
  return{entrada,salida,trabajadoSeg,descansoSeg,comidaSeg};
}

async function crearJornada(datosVehiculo){
  const s=sesion();
  const fecha=fechaHoyISO();
  const entrada=ahora();
  const datos={
    usuario_id:String(s.id),usuario:s.usuario||"",nombre:s.nombre||"",fecha,entrada,estado:"abierta",
    minutos_trabajados:0,minutos_descanso:0,minutos_comida:0,minutos_objetivo:480,minutos_extra:0,minutos_faltantes:480,horas_extra:0,
    vehiculo_id:datosVehiculo&&datosVehiculo.id?String(datosVehiculo.id):null,
    vehiculo_matricula:datosVehiculo&&datosVehiculo.matricula?String(datosVehiculo.matricula):null,
    km_entrada:datosVehiculo&&datosVehiculo.km!=null?Number(datosVehiculo.km):null,
    km_salida:null,
    created_at:ahora()
  };
  const r=await sb().from("jornadas").insert([datos]).select().single();
  if(r.error){alert("Error creando jornada: "+r.error.message);return null}
  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo,veh){
  const s=sesion();
  const r=await sb().from("fichajes").insert([{
    usuario_id:String(s.id),usuario:s.usuario||"",nombre:s.nombre||"",jornada_id:String(jornadaId),tipo,
    lat:geo.lat,lng:geo.lng,direccion:geo.direccion,dispositivo:navigator.userAgent,
    vehiculo_id:veh&&veh.id?String(veh.id):null,
    vehiculo_matricula:veh&&veh.matricula?String(veh.matricula):null,
    km_vehiculo:veh&&veh.km!=null?Number(veh.km):null,
    created_at:ahora()
  }]);
  if(r.error){alert("Error al guardar fichaje: "+r.error.message);return false}
  return true;
}

async function recalcularJornada(jornadaId){
  const rj=await sb().from("jornadas").select("*").eq("id",String(jornadaId)).single();
  if(rj.error||!rj.data)return;
  const j=rj.data;
  const eventos=await fichajesDeJornada(jornadaId);
  if(!eventos.length)return;
  const ultimo=eventos[eventos.length-1];
  const estado=estadoDesdeTipo(ultimo.tipo);
  const c=calcularEnVivo(eventos,estado);
  const cerrada=ultimo.tipo==="salida";
  const objetivoSeg=Number(j.segundos_objetivo||j.minutos_objetivo*60||480*60);
  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltaSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);
  await sb().from("jornadas").update({
    salida:c.salida,estado:cerrada?"cerrada":"abierta",
    minutos_trabajados:Math.floor(c.trabajadoSeg/60),minutos_descanso:Math.floor(c.descansoSeg/60),minutos_comida:Math.floor(c.comidaSeg/60),
    minutos_extra:Math.floor(extraSeg/60),minutos_faltantes:Math.floor(faltaSeg/60),horas_extra:Math.floor(extraSeg/60),
    segundos_trabajados:Math.floor(c.trabajadoSeg),segundos_descanso:Math.floor(c.descansoSeg),segundos_comida:Math.floor(c.comidaSeg),
    segundos_extra:Math.floor(extraSeg),segundos_faltantes:Math.floor(faltaSeg)
  }).eq("id",String(jornadaId));
}

function opcionesPermitidas(estado){
  if(estado==="fuera")return[{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];
  if(estado==="dentro")return[
    {tipo:"salida",texto:"Salida",clase:"zx_rojo"},
    {tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},
    {tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}
  ];
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
              <option value="${limpiar(v.id)}" data-km="${limpiar(v.km_actual??0)}" data-matricula="${limpiar(v.matricula||"")}">
                ${limpiar(v.matricula||"")} ${limpiar(v.marca||"")} ${limpiar(v.modelo||"")} · ${limpiar(v.km_actual??0)} km
              </option>
            `).join("")}
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
          Revisa antes de guardar. Quedará registrado con hora, ubicación y dispositivo.
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
      const ok=confirm("Confirmar fichaje: "+textoTipo(tipo));
      if(!ok)return;
      cerrarModal();
      await registrar(tipo,datosModal);
    };
  });

  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

async function registrar(tipo,datosModal){
  datosModal=datosModal||{};
  const s=sesion();
  if(!s.id){alert("Sesión no válida.");return}
  const est=await estadoActual();
  let jornada=est.jornada;
  let veh=null;
  let vehMarcado=false;

  if(tipo==="entrada"){
    if(est.estado!=="fuera"){alert("Ya tienes una jornada abierta.");return}
    const vehiculoId=String(datosModal.vehiculoId||"");
    const kmTxt=String(datosModal.kmEntrada||"");

    if(vehiculoId){
      const v=await vehiculoPorId(vehiculoId);
      if(!v){alert("Vehículo no encontrado.");return}
      if(v.activo===false||v.activo==="false"){alert("El vehículo no está activo.");return}
      if(v.en_uso===true||v.en_uso==="true"){alert("El vehículo ya está en uso.");return}
      const km=Number(kmTxt);
      if(!Number.isFinite(km)||km<0){alert("Km de entrada inválidos.");return}
      if(Number(v.km_actual||0)>0&&km<Number(v.km_actual||0)){alert("Los km de entrada no pueden ser menores que los km actuales del vehículo.");return}
      veh={id:v.id,matricula:v.matricula,km};
      const mv=await marcarVehiculoEntrada(v,km);
      if(mv.error){alert("No se pudo bloquear el vehículo: "+mv.error.message);return}
      vehMarcado=true;
    }

    jornada=await crearJornada(veh);
    if(!jornada){
      if(vehMarcado&&veh&&veh.id)await marcarVehiculoSalida(veh.id,veh.km);
      return;
    }

    if(veh&&(!jornada.vehiculo_id||!jornada.vehiculo_matricula)){
      await sb().from("jornadas").update({vehiculo_id:String(veh.id),vehiculo_matricula:String(veh.matricula||""),km_entrada:Number(veh.km)}).eq("id",String(jornada.id));
      const check=await sb().from("jornadas").select("vehiculo_id,vehiculo_matricula,km_entrada").eq("id",String(jornada.id)).maybeSingle();
      if(!check.data||!check.data.vehiculo_id){
        await marcarVehiculoSalida(veh.id,veh.km);
        await sb().from("jornadas").delete().eq("id",String(jornada.id));
        alert("No se pudo guardar el vehículo en la jornada. No se ha registrado la entrada.");
        return;
      }
      jornada={...jornada,...check.data};
    }
  }

  if(tipo!=="entrada"&&!jornada){alert("No hay jornada abierta.");return}
  if(tipo==="inicio_descanso"&&est.estado!=="dentro"){alert("Solo puedes iniciar descanso trabajando.");return}
  if(tipo==="fin_descanso"&&est.estado!=="descanso"){alert("No estás en descanso.");return}
  if(tipo==="inicio_comida"&&est.estado!=="dentro"){alert("Solo puedes iniciar comida trabajando.");return}
  if(tipo==="fin_comida"&&est.estado!=="comida"){alert("No estás en comida.");return}
  if(tipo==="salida"&&(est.estado==="descanso"||est.estado==="comida")){alert("Primero termina descanso o comida.");return}

  if(tipo==="salida"&&jornada.vehiculo_id){
    let kmTxt=String(datosModal.kmSalida||"").trim();
    if(!kmTxt){
      alert("Indica los km de salida del vehículo.");
      return;
    }
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
  if(!ok){
    if(tipo==="entrada"&&vehMarcado&&veh&&veh.id)await marcarVehiculoSalida(veh.id,veh.km);
    return;
  }

  await insertarAuditoria("fichaje_"+tipo,"Fichaje registrado: "+textoTipo(tipo),s.id);
  await recalcularJornada(jornada.id);
  await ZX_fichaje_real();
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

function resumenHTML(resumen,objetivoSeg){
  const extra=Math.max(0,Number(resumen.trabajadoSeg||0)-Number(objetivoSeg||0));
  const falta=Math.max(0,Number(objetivoSeg||0)-Number(resumen.trabajadoSeg||0));
  return`<div class="zx_text">
    Trabajado: <b data-live-campo="trabajado">${formatoSeg(resumen.trabajadoSeg)}</b><br>
    Descanso: <b data-live-campo="descanso">${formatoSeg(resumen.descansoSeg)}</b><br>
    Comida: <b data-live-campo="comida">${formatoSeg(resumen.comidaSeg)}</b><br>
    Objetivo: <b>${formatoSeg(objetivoSeg)}</b><br>
    Extra: <b data-live-campo="extra">${formatoSeg(extra)}</b><br>
    Falta: <b data-live-campo="falta">${formatoSeg(falta)}</b>
  </div>`;
}

function renderFichajeMini(f){return`<div class="zx_admin_row"><div class="zx_admin_row_top"><b>${limpiar(textoTipo(f.tipo))}</b><span>${limpiar(fechaCorta(f.created_at))}</span></div><div class="zx_admin_data">${f.vehiculo_matricula?`Vehículo: <b>${limpiar(f.vehiculo_matricula)}</b>${f.km_vehiculo!=null?` · ${limpiar(f.km_vehiculo)} km`:""}<br>`:""}${limpiar(f.direccion||"")}</div></div>`}

function renderJornadaMini(j){return`<div class="zx_admin_row"><div class="zx_admin_row_top"><b>${limpiar(j.nombre||j.usuario||"-")}</b><span>${limpiar(formatoFechaES(j.fecha||""))}</span></div><div class="zx_admin_estado ${limpiar(j.estado||"")}">${limpiar(j.estado||"-")}</div><div class="zx_admin_data">Trabajado: ${formatoSeg(Number(j.segundos_trabajados||0)||Number(j.minutos_trabajados||0)*60)}<br>Extra: ${formatoSeg(Number(j.segundos_extra||0)||Number(j.minutos_extra||0)*60)}<br>${j.vehiculo_matricula?`Vehículo: <b>${limpiar(j.vehiculo_matricula)}</b><br>Km entrada: ${limpiar(j.km_entrada??"-")} · Km salida: ${limpiar(j.km_salida??"-")}`:"Sin vehículo"}</div>${esAdmin()?`<button class="zx_admin_btn zx_admin_borrar" data-borrar-jornada="${limpiar(j.id)}">Borrar jornada</button>`:""}</div>`}

async function borrarJornada(id){
  if(!(await validarAdminOperacion()))return;
  const ok=confirm("Vas a borrar esta jornada y sus fichajes.");
  if(!ok)return;
  const j=await sb().from("jornadas").select("*").eq("id",String(id)).maybeSingle();
  if(j.data&&j.data.vehiculo_id)await marcarVehiculoSalida(j.data.vehiculo_id,j.data.km_salida||j.data.km_entrada||0);
  await sb().from("fichajes").delete().eq("jornada_id",String(id));
  await sb().from("jornadas").delete().eq("id",String(id));
  await insertarAuditoria("borrar_jornada","Jornada borrada",j.data?.usuario_id);
  await ZX_fichaje_real();
}

function instalarCSS(){
  const old=document.getElementById("zx_fichaje_css_v3100");if(old)old.remove();
  const s=document.createElement("style");s.id="zx_fichaje_css_v3100";
  s.innerHTML=`
    .zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;padding:14px;z-index:9999}
    .zx_modal_caja{width:100%;max-width:520px;max-height:90vh;overflow:auto;background:white;border-radius:22px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    .zx_modal_caja input,.zx_modal_caja select,.zx_modal_caja textarea{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-size:16px;font-weight:800;color:#0f172a;background:#f8fafc}
    .zx_label{display:block;margin-top:14px;margin-bottom:6px;color:#64748b;font-weight:900;font-size:15px}
    .zx_admin_row{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:10px}
    .zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:16px;color:#0f172a;font-weight:900}.zx_admin_row_top span{color:#64748b;font-size:14px;white-space:nowrap}
    .zx_admin_estado{display:inline-block;margin:8px 0;padding:5px 10px;border-radius:999px;background:#64748b;color:white;font-size:13px;font-weight:900}.zx_admin_estado.abierta{background:#f59e0b}.zx_admin_estado.cerrada{background:#2563eb}
    .zx_admin_data{color:#64748b;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word}.zx_admin_btn{width:100%;border:0;border-radius:14px;margin-top:10px;padding:12px;color:white;font-size:16px;font-weight:900}.zx_admin_borrar{background:#dc2626}
  `;
  document.head.appendChild(s);
}

async function actualizarVivo(jornadaId,objSec){
  try{
    const eventos=await fichajesDeJornada(jornadaId);
    const ultimo=eventos.length?eventos[eventos.length-1]:null;
    const estado=estadoDesdeTipo(ultimo?ultimo.tipo:null);
    const r=calcularEnVivo(eventos,estado);
    const extra=Math.max(0,r.trabajadoSeg-objSec),falta=Math.max(0,objSec-r.trabajadoSeg);
    document.querySelectorAll("[data-live-campo]").forEach(c=>{const k=c.dataset.liveCampo;if(k==="trabajado")c.textContent=formatoSeg(r.trabajadoSeg);if(k==="descanso")c.textContent=formatoSeg(r.descansoSeg);if(k==="comida")c.textContent=formatoSeg(r.comidaSeg);if(k==="extra")c.textContent=formatoSeg(extra);if(k==="falta")c.textContent=formatoSeg(falta)});
  }catch(e){}
}

window.ZX_toggleUltimos=function(){ZX_VER_ULTIMOS=!ZX_VER_ULTIMOS;ZX_fichaje_real()};
window.ZX_toggleMisJornadas=function(){ZX_VER_MIS_JORNADAS=!ZX_VER_MIS_JORNADAS;ZX_fichaje_real()};

window.ZX_fichaje_real=async function(){
  const renderId=++ZX_RENDER_ID;
  instalarCSS();
  if(ZX_TIMER){clearInterval(ZX_TIMER);ZX_TIMER=null}
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{b.classList.remove("zx_activo");if(b.dataset.modulo==="fichaje")b.classList.add("zx_activo")});
  const est=await estadoActual();
  const hist=await ultimosFichajes();
  const jornadas=await jornadasUsuario();
  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0};
  let objetivoSeg=480*60;
  if(est.jornada){resumen=calcularEnVivo(est.eventos,est.estado);objetivoSeg=Number(est.jornada.segundos_objetivo||est.jornada.minutos_objetivo*60||480*60)}
  if(renderId!==ZX_RENDER_ID)return;
  app().innerHTML=`
    <div class="zx_card"><h2>Fichaje</h2><div class="zx_text">Estado actual:</div><div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">${textoEstado(est.estado)}</div>${est.jornada&&est.jornada.vehiculo_matricula?`<div class="zx_text" style="margin-top:12px;">Vehículo: <b>${limpiar(est.jornada.vehiculo_matricula)}</b><br>Km entrada: <b>${limpiar(est.jornada.km_entrada??"-")}</b></div>`:""}<button class="zx_btn_big zx_azul" id="zx_btn_fichar">FICHAR</button></div>
    <div class="zx_card"><h2>Resumen en vivo</h2><div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg)}</div></div>
    <div class="zx_card"><button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">${ZX_VER_MIS_JORNADAS?"Ocultar mis jornadas":"Ver mis jornadas"}</button>${ZX_VER_MIS_JORNADAS?(jornadas.length?jornadas.map(renderJornadaMini).join(""):`<div class="zx_text">Sin jornadas.</div>`):""}</div>
    <div class="zx_card"><button class="zx_btn_big zx_gris" onclick="ZX_toggleUltimos()">${ZX_VER_ULTIMOS?"Ocultar últimos fichajes":"Ver últimos fichajes"}</button>${ZX_VER_ULTIMOS?(hist.length?hist.map(renderFichajeMini).join(""):`<div class="zx_text">Sin registros.</div>`):""}</div>
  `;
  document.getElementById("zx_btn_fichar").onclick=function(){abrirMenu(est.estado,est.jornada)};
  document.querySelectorAll("[data-borrar-jornada]").forEach(btn=>{btn.onclick=function(){borrarJornada(btn.dataset.borrarJornada)}});
  if(est.jornada)ZX_TIMER=setInterval(()=>actualizarVivo(est.jornada.id,objetivoSeg),1000);
};

window.ZX_fichaje=window.ZX_fichaje_real;
})();
