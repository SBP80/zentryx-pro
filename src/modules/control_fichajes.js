// ===============================
// ZENTRYX PRO - CONTROL DE FICHAJES
// V1003 - CORRECCIÓN INCIDENCIAS FALSAS / CARGA RÁPIDA
// ===============================
(function(){
"use strict";

let ZX_CF_VER_INCIDENCIAS=false;
let ZX_CF_VER_CONFIG=false;
let ZX_CF_VER_DETALLE_USUARIO={};
let ZX_CF_TIMER=null;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}
function esAdmin(){const s=sesion();return String(s.rol||"").toLowerCase()==="administrador"||String(s.usuario||"").toLowerCase()==="admin"}
function limpiar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function ahora(){return new Date().toISOString()}
function uuidSeguro(){try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID()}catch(e){}return"zx_"+Date.now()+"_"+Math.random().toString(16).slice(2)}
function fechaLocalISO(v){const d=v?new Date(v):new Date();if(isNaN(d.getTime()))return fechaLocalISO(new Date());const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function fechaHoyISO(){return fechaLocalISO(new Date())}
function formatoFechaES(f){if(!f)return"";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:limpiar(f)}
function fechaHoraES(f){if(!f)return"-";const d=new Date(f);if(isNaN(d.getTime()))return"-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function minutosAhora(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function minutosDesdeHora(h){if(!h)return null;const p=String(h).split(":");return Number(p[0]||0)*60+Number(p[1]||0)}
function minutosDesdeISO(iso){if(!iso)return 0;const d=new Date(iso);if(isNaN(d.getTime()))return 0;return Math.floor((new Date()-d)/60000)}
function formatoDuracion(min){min=Math.max(0,Math.floor(Number(min||0)));return String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0")}
function textoInc(t){return{no_entrada:"No fichó entrada",no_salida:"No fichó salida",descanso_excesivo:"Descanso excesivo",comida_excesiva:"Comida excesiva",jornada_abierta_larga:"Jornada demasiado larga"}[t]||t||""}
function colorIncidencia(e){if(e==="abierta")return"#dc2626";if(e==="revisada")return"#f59e0b";if(e==="cerrada")return"#16a34a";return"#64748b"}
function estadoDesdeTipo(t){if(!t)return"fuera";return{entrada:"dentro",salida:"fuera",inicio_descanso:"descanso",fin_descanso:"dentro",inicio_comida:"comida",fin_comida:"dentro"}[t]||"fuera"}
function textoEstadoTrabajo(e){if(e==="dentro")return"Trabajando";if(e==="descanso")return"Descanso";if(e==="comida")return"Comida";return"Fuera"}
function colorEstadoTrabajo(e){if(e==="dentro")return"#16a34a";if(e==="descanso")return"#f59e0b";if(e==="comida")return"#ea580c";return"#64748b"}

async function insertarAviso(usuarioId,titulo,mensaje){try{await sb().from("notificaciones").insert([{id:uuidSeguro(),usuario_id:String(usuarioId),titulo,mensaje,tipo:"control_fichajes",leida:false,created_at:ahora()}])}catch(e){}}
async function insertarAuditoria(accion,detalle,usuarioObjetivoId){const s=sesion();try{await sb().from("auditoria").insert([{id:uuidSeguro(),usuario_id:String(s.id||""),usuario:s.usuario||"",nombre:s.nombre||"",modulo:"control_fichajes",accion,detalle,usuario_objetivo_id:usuarioObjetivoId?String(usuarioObjetivoId):null,created_at:ahora()}])}catch(e){}}

function configDefecto(usuarioId){return{id:null,usuario_id:String(usuarioId),activo:true,hora_entrada:"08:00",hora_salida:"17:00",margen_entrada_min:15,margen_salida_min:15,max_descanso_min:30,max_comida_min:60,max_jornada_horas:12,avisar_usuario:true,avisar_admin:true,crear_incidencias:true,geolocalizacion_app_abierta:false}}

async function usuariosActivos(){
  try{
    const r=await sb().from("usuarios").select("id,usuario,nombre,rol,estado,activo").order("nombre",{ascending:true});
    if(r.error||!r.data)return[];
    return (r.data||[]).filter(u=>{
      const estado=String(u.estado||"").toLowerCase();
      return u.activo!==false && estado!=="baja" && estado!=="inactivo";
    });
  }catch(e){return[]}
}

async function usuarioActualLista(){const s=sesion();return[{id:String(s.id||""),usuario:s.usuario||"",nombre:s.nombre||s.usuario||"",rol:s.rol||"",estado:"activo",activo:true}]}

async function configsTodos(){try{const r=await sb().from("control_fichajes_config").select("*");return r.error?[]:(r.data||[])}catch(e){return[]}}
function configUsuarioCache(usuarioId,configs){const def=configDefecto(usuarioId);const c=(configs||[]).find(x=>String(x.usuario_id)===String(usuarioId));return c?{...def,...c}:def}
async function configUsuario(usuarioId){const def=configDefecto(usuarioId);try{const r=await sb().from("control_fichajes_config").select("*").eq("usuario_id",String(usuarioId)).maybeSingle();if(!r.error&&r.data)return{...def,...r.data}}catch(e){}return def}

async function guardarConfigUsuario(usuarioId,d){
  const actual=await configUsuario(usuarioId);
  const reg={id:actual.id||uuidSeguro(),usuario_id:String(usuarioId),activo:!!d.activo,hora_entrada:String(d.hora_entrada||"08:00"),hora_salida:String(d.hora_salida||"17:00"),margen_entrada_min:Number(d.margen_entrada_min||15),margen_salida_min:Number(d.margen_salida_min||15),max_descanso_min:Number(d.max_descanso_min||30),max_comida_min:Number(d.max_comida_min||60),max_jornada_horas:Number(d.max_jornada_horas||12),avisar_usuario:true,avisar_admin:true,crear_incidencias:true,geolocalizacion_app_abierta:false,updated_at:ahora()};
  const r=await sb().from("control_fichajes_config").upsert([reg],{onConflict:"usuario_id"});
  if(r.error){alert("Error guardando configuración: "+r.error.message);return false}
  await insertarAuditoria("guardar_config","Configuración actualizada.",usuarioId);
  return true;
}

async function jornadasHoyTodas(fecha){try{const r=await sb().from("jornadas").select("*").eq("fecha",String(fecha).slice(0,10)).order("created_at",{ascending:false});return r.error?[]:(r.data||[])}catch(e){return[]}}
async function jornadasAbiertasTodas(){try{const r=await sb().from("jornadas").select("*").eq("estado","abierta").order("created_at",{ascending:false});return r.error?[]:(r.data||[])}catch(e){return[]}}
async function fichajesHoyTodas(fecha){try{const r=await sb().from("fichajes").select("*").gte("created_at",String(fecha).slice(0,10)+"T00:00:00").order("created_at",{ascending:true});return r.error?[]:(r.data||[])}catch(e){return[]}}
async function incidenciasControl(usuarioId=null){try{let q=sb().from("control_fichajes_incidencias").select("*").order("created_at",{ascending:false}).limit(120);if(usuarioId)q=q.eq("usuario_id",String(usuarioId));const r=await q;return r.error?[]:(r.data||[])}catch(e){return[]}}

async function incidenciaExistente(usuarioId,fecha,tipo,jornadaId){
  try{
    let q=sb().from("control_fichajes_incidencias").select("*").eq("usuario_id",String(usuarioId)).eq("fecha",String(fecha).slice(0,10)).eq("tipo",String(tipo)).neq("estado","cerrada").limit(1);
    if(jornadaId)q=q.eq("jornada_id",String(jornadaId));
    const r=await q;
    return(!r.error&&r.data&&r.data.length)?r.data[0]:null;
  }catch(e){return null}
}

async function crearIncidencia(d,cfg){
  if(!cfg.crear_incidencias)return null;
  const existe=await incidenciaExistente(d.usuario_id,d.fecha,d.tipo,d.jornada_id||null);
  if(existe)return existe;
  const reg={id:uuidSeguro(),usuario_id:String(d.usuario_id),usuario:d.usuario||"",nombre:d.nombre||"",fecha:String(d.fecha||fechaHoyISO()).slice(0,10),tipo:String(d.tipo),estado:"abierta",severidad:d.severidad||"media",titulo:d.titulo||textoInc(d.tipo),detalle:d.detalle||"",jornada_id:d.jornada_id?String(d.jornada_id):null,fichaje_id:d.fichaje_id?String(d.fichaje_id):null,minutos_exceso:d.minutos_exceso==null?null:Number(d.minutos_exceso),avisado_usuario:!!cfg.avisar_usuario,avisado_admin:false,created_at:ahora(),updated_at:ahora()};
  try{
    const r=await sb().from("control_fichajes_incidencias").insert([reg]).select().single();
    if(r.error)return null;
    await insertarAuditoria("crear_incidencia",reg.titulo+" - "+reg.detalle,d.usuario_id);
    if(cfg.avisar_usuario)await insertarAviso(d.usuario_id,reg.titulo,reg.detalle);
    return r.data;
  }catch(e){return null}
}

async function actualizarIncidencia(id,estado){
  const comentario=prompt("Comentario opcional")||"";
  const r=await sb().from("control_fichajes_incidencias").update({estado,comentario_admin:comentario,revisado_por:sesion().usuario||"",revisado_en:ahora(),updated_at:ahora()}).eq("id",String(id));
  if(r.error){alert("Error actualizando incidencia: "+r.error.message);return false}
  await insertarAuditoria("actualizar_incidencia","Incidencia "+id+" -> "+estado,null);
  ZX_control_fichajes();
  return true;
}

function estadoDesdeEventos(ev){const u=(ev||[]).length?(ev||[])[(ev||[]).length-1]:null;return estadoDesdeTipo(u?u.tipo:null)}
function ultimoEvento(ev,tipo){const l=(ev||[]).filter(e=>e.tipo===tipo);return l.length?l[l.length-1]:null}

async function evaluarUsuarioConCache(u,cfg,jornadasHoy,abiertas,fichajesHoy){
  const fecha=fechaHoyISO();
  const out={usuario:u,cfg,estado:"correcto",estadoTrabajo:"fuera",minutosAbierta:0,incidencias:[]};

  if(!cfg.activo){out.estado="sin_control";return out}

  const jornadas=(jornadasHoy||[]).filter(j=>String(j.usuario_id)===String(u.id));
  const abierta=(abiertas||[]).find(j=>String(j.usuario_id)===String(u.id))||null;

  const actual=minutosAhora();
  const entrada=minutosDesdeHora(cfg.hora_entrada);
  const salida=minutosDesdeHora(cfg.hora_salida);
  const tieneEntrada=jornadas.some(j=>!!j.entrada);

  if(!tieneEntrada && entrada!==null && actual>=entrada+Number(cfg.margen_entrada_min||0)){
    const inc=await crearIncidencia({usuario_id:u.id,usuario:u.usuario,nombre:u.nombre,fecha,tipo:"no_entrada",severidad:"alta",titulo:"No ha fichado entrada",detalle:(u.nombre||u.usuario||"Usuario")+" no ha fichado entrada. Prevista: "+cfg.hora_entrada+" + "+cfg.margen_entrada_min+" min."},cfg);
    if(inc){out.incidencias.push(inc);out.estado="incidencia"}
  }

  if(abierta){
    out.minutosAbierta=minutosDesdeISO(abierta.entrada||abierta.created_at);
    const ev=(fichajesHoy||[]).filter(f=>String(f.jornada_id)===String(abierta.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const estado=estadoDesdeEventsSeguro(ev);
    out.estadoTrabajo=estado;

    if(salida!==null && actual>=salida+Number(cfg.margen_salida_min||0)){
      const inc=await crearIncidencia({usuario_id:u.id,usuario:u.usuario,nombre:u.nombre,fecha,tipo:"no_salida",severidad:"media",titulo:"No ha fichado salida",detalle:(u.nombre||u.usuario||"Usuario")+" tiene jornada abierta pasada la salida prevista: "+cfg.hora_salida+".",jornada_id:abierta.id},cfg);
      if(inc){out.incidencias.push(inc);out.estado="incidencia"}
    }

    if(abierta.entrada){
      const minAbierta=minutosDesdeISO(abierta.entrada);
      const max=Number(cfg.max_jornada_horas||12)*60;
      if(minAbierta>max){
        const inc=await crearIncidencia({usuario_id:u.id,usuario:u.usuario,nombre:u.nombre,fecha,tipo:"jornada_abierta_larga",severidad:"alta",titulo:"Jornada abierta demasiado tiempo",detalle:"Jornada abierta desde hace "+minAbierta+" min. Máximo: "+max+" min.",jornada_id:abierta.id,minutos_exceso:minAbierta-max},cfg);
        if(inc){out.incidencias.push(inc);out.estado="incidencia"}
      }
    }

    if(estado==="descanso"){
      const ev0=ultimoEvento(ev,"inicio_descanso");
      const min=minutosDesdeISO(ev0?ev0.created_at:null);
      const max=Number(cfg.max_descanso_min||30);
      if(min>max){
        const inc=await crearIncidencia({usuario_id:u.id,usuario:u.usuario,nombre:u.nombre,fecha,tipo:"descanso_excesivo",severidad:"media",titulo:"Descanso excesivo",detalle:"Descanso activo desde hace "+min+" min. Máximo: "+max+" min.",jornada_id:abierta.id,fichaje_id:ev0?ev0.id:null,minutos_exceso:min-max},cfg);
        if(inc){out.incidencias.push(inc);out.estado="incidencia"}
      }
    }

    if(estado==="comida"){
      const ev0=ultimoEvento(ev,"inicio_comida");
      const min=minutosDesdeISO(ev0?ev0.created_at:null);
      const max=Number(cfg.max_comida_min||60);
      if(min>max){
        const inc=await crearIncidencia({usuario_id:u.id,usuario:u.usuario,nombre:u.nombre,fecha,tipo:"comida_excesiva",severidad:"media",titulo:"Comida excesiva",detalle:"Comida activa desde hace "+min+" min. Máximo: "+max+" min.",jornada_id:abierta.id,fichaje_id:ev0?ev0.id:null,minutos_exceso:min-max},cfg);
        if(inc){out.incidencias.push(inc);out.estado="incidencia"}
      }
    }
  }

  return out;
}

function estadoDesdeEventsSeguro(ev){return estadoDesdeEventos(ev)}

async function evaluarTodos(){
  const fecha=fechaHoyISO();
  const lista=esAdmin()?await usuariosActivos():await usuarioActualLista();

  const datos=await Promise.all([
    configsTodos(),
    jornadasHoyTodas(fecha),
    jornadasAbiertasTodas(),
    fichajesHoyTodas(fecha)
  ]);

  const configs=datos[0], jornadasHoy=datos[1], abiertas=datos[2], fichajesHoy=datos[3];
  const out=[];

  for(const u of lista){
    if(!u.id)continue;
    out.push(await evaluarUsuarioConCache(u,configUsuarioCache(u.id,configs),jornadasHoy,abiertas,fichajesHoy));
  }

  return out;
}

function resumenEstados(res){
  return {
    total:res.length,
    incidencias:res.filter(r=>r.estado==="incidencia").length,
    correctos:res.filter(r=>r.estado==="correcto").length,
    sinControl:res.filter(r=>r.estado==="sin_control").length,
    trabajando:res.filter(r=>r.estadoTrabajo==="dentro").length,
    descanso:res.filter(r=>r.estadoTrabajo==="descanso").length,
    comida:res.filter(r=>r.estadoTrabajo==="comida").length,
    fuera:res.filter(r=>r.estadoTrabajo==="fuera").length
  };
}

function renderGeneral(res){
  const r=resumenEstados(res);
  const color=r.incidencias?"#dc2626":"#16a34a";
  const texto=r.incidencias?r.incidencias+" incidencia(s) activa(s)":"Todo correcto";
  return `
    <div class="zx_card">
      <h2>Control de fichajes</h2>
      <div style="font-size:30px;font-weight:900;color:${color};margin-top:8px;">${texto}</div>
      <div class="zx_cf_resumen_grid">
        <div><b>${r.total}</b><span>Usuarios</span></div>
        <div><b>${r.trabajando}</b><span>Trabajando</span></div>
        <div><b>${r.descanso}</b><span>Descanso</span></div>
        <div><b>${r.comida}</b><span>Comida</span></div>
        <div><b>${r.fuera}</b><span>Fuera</span></div>
        <div><b>${r.incidencias}</b><span>Incidencias</span></div>
      </div>
      <div class="zx_text" style="margin-top:10px;">
        Fecha: <b>${formatoFechaES(fechaHoyISO())}</b><br>
        Correctos: <b>${r.correctos}</b><br>
        Sin control: <b>${r.sinControl}</b>
      </div>
      <button class="zx_btn_big zx_azul" id="zx_cf_revisar">Revisar ahora</button>
    </div>
  `;
}

function renderUsuario(r){
  const uid=String(r.usuario.id||"");
  const abierto=!!ZX_CF_VER_DETALLE_USUARIO[uid];
  let color="#16a34a", estado="Correcto";
  if(r.estado==="incidencia"){color="#dc2626";estado="Incidencia"}
  if(r.estado==="sin_control"){color="#64748b";estado="Sin control"}

  return `
    <div class="zx_cf_usuario">
      <button class="zx_cf_usuario_top" data-cf-toggle-usuario="${limpiar(uid)}" type="button">
        <span>
          <b>${limpiar(r.usuario.nombre||r.usuario.usuario||"-")}</b>
          <small>${limpiar(textoEstadoTrabajo(r.estadoTrabajo))}${r.minutosAbierta?" · "+formatoDuracion(r.minutosAbierta):""}</small>
        </span>
        <i style="background:${color};">${estado}</i>
      </button>
      ${abierto?`
        <div class="zx_admin_data">
          Estado: <b style="color:${colorEstadoTrabajo(r.estadoTrabajo)}">${limpiar(textoEstadoTrabajo(r.estadoTrabajo))}</b><br>
          Entrada: ${limpiar(r.cfg.hora_entrada)} + ${limpiar(r.cfg.margen_entrada_min)} min ·
          Salida: ${limpiar(r.cfg.hora_salida)} + ${limpiar(r.cfg.margen_salida_min)} min<br>
          Descanso máx.: ${limpiar(r.cfg.max_descanso_min)} min ·
          Comida máx.: ${limpiar(r.cfg.max_comida_min)} min ·
          Jornada máx.: ${limpiar(r.cfg.max_jornada_horas)} h
        </div>
        ${r.incidencias.length?r.incidencias.map(i=>`<div class="zx_cf_inc_line"><b>${limpiar(textoInc(i.tipo))}</b><br>${limpiar(i.detalle||"")}</div>`).join(""):`<div class="zx_admin_data">Sin incidencias nuevas.</div>`}
      `:""}
    </div>
  `;
}

function renderIncidencia(i){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top"><b>${limpiar(i.nombre||i.usuario||"-")}</b><span>${limpiar(formatoFechaES(i.fecha))}</span></div>
      <div class="zx_cf_badge" style="background:${colorIncidencia(i.estado)};">${limpiar(i.estado||"")}</div>
      <div class="zx_admin_data">
        <b>${limpiar(textoInc(i.tipo))}</b><br>
        ${limpiar(i.detalle||"")}<br>
        Creada: ${limpiar(fechaHoraES(i.created_at))}
        ${i.minutos_exceso!=null?`<br>Exceso: ${limpiar(i.minutos_exceso)} min`:""}
        ${i.comentario_admin?`<br>Comentario: ${limpiar(i.comentario_admin)}`:""}
      </div>
      ${esAdmin()?`<div class="zx_edit_grid"><button class="zx_admin_btn zx_admin_editar" data-cf-revisar="${i.id}">Revisada</button><button class="zx_admin_btn zx_admin_borrar" data-cf-cerrar="${i.id}">Cerrar</button></div>`:""}
    </div>
  `;
}

function renderConfig(u,c){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top"><b>${limpiar(u.nombre||u.usuario||"-")}</b><span>${limpiar(u.rol||"")}</span></div>
      <label class="zx_label">Activo</label>
      <select data-cfg-activo="${u.id}"><option value="true" ${c.activo?"selected":""}>Sí</option><option value="false" ${!c.activo?"selected":""}>No</option></select>
      <div class="zx_cf_grid2">
        <div><label class="zx_label">Hora entrada</label><input type="time" data-cfg-entrada="${u.id}" value="${limpiar(c.hora_entrada)}"></div>
        <div><label class="zx_label">Hora salida</label><input type="time" data-cfg-salida="${u.id}" value="${limpiar(c.hora_salida)}"></div>
      </div>
      <div class="zx_cf_grid2">
        <div><label class="zx_label">Margen entrada min</label><input type="number" data-cfg-margen-entrada="${u.id}" value="${limpiar(c.margen_entrada_min)}"></div>
        <div><label class="zx_label">Margen salida min</label><input type="number" data-cfg-margen-salida="${u.id}" value="${limpiar(c.margen_salida_min)}"></div>
      </div>
      <div class="zx_cf_grid2">
        <div><label class="zx_label">Descanso máx. min</label><input type="number" data-cfg-descanso="${u.id}" value="${limpiar(c.max_descanso_min)}"></div>
        <div><label class="zx_label">Comida máx. min</label><input type="number" data-cfg-comida="${u.id}" value="${limpiar(c.max_comida_min)}"></div>
      </div>
      <label class="zx_label">Jornada máxima horas</label>
      <input type="number" data-cfg-jornada="${u.id}" value="${limpiar(c.max_jornada_horas)}">
      <button class="zx_admin_btn zx_admin_editar" data-cfg-guardar="${u.id}">Guardar configuración</button>
    </div>
  `;
}

function estilos(){
  if(document.getElementById("zx_control_fichajes_css"))return;
  const s=document.createElement("style");
  s.id="zx_control_fichajes_css";
  s.innerHTML=`
    .zx_cf_resumen_grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
    .zx_cf_resumen_grid div{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;text-align:center}
    .zx_cf_resumen_grid b{display:block;color:#0f172a;font-size:28px;font-weight:900}
    .zx_cf_resumen_grid span{color:#64748b;font-size:14px;font-weight:900}
    .zx_admin_row,.zx_cf_usuario{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:10px}
    .zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:16px;color:#0f172a;font-weight:900}
    .zx_cf_usuario_top{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;border:0;background:transparent;padding:0;text-align:left}
    .zx_cf_usuario_top span{display:block;min-width:0}
    .zx_cf_usuario_top b{display:block;color:#0f172a;font-size:18px;font-weight:900;line-height:1.2}
    .zx_cf_usuario_top small{display:block;color:#64748b;font-size:14px;font-weight:900;margin-top:4px}
    .zx_cf_usuario_top i,.zx_cf_badge{display:inline-block;color:white;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:900;font-style:normal;white-space:nowrap}
    .zx_admin_row_top span{color:#64748b;font-size:14px;white-space:nowrap}
    .zx_admin_data{color:#64748b;font-size:15px;line-height:1.45;font-weight:800;word-break:break-word;margin-top:8px}
    .zx_admin_btn{width:100%;border:0;border-radius:14px;margin-top:10px;padding:12px;color:white;font-size:16px;font-weight:900}
    .zx_admin_editar{background:#2563eb}.zx_admin_borrar{background:#dc2626}
    .zx_edit_grid,.zx_cf_grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .zx_label{display:block;margin-top:14px;margin-bottom:6px;color:#64748b;font-weight:900;font-size:15px}
    .zx_admin_row input,.zx_admin_row select{width:100%;border:1px solid #cbd5e1;border-radius:14px;padding:12px;font-size:16px;font-weight:800;color:#0f172a;background:#f8fafc}
    .zx_cf_inc_line{background:#fee2e2;color:#7f1d1d;border-radius:14px;padding:10px;margin-top:10px;font-weight:800;line-height:1.35}
    @media(min-width:700px){.zx_cf_resumen_grid{grid-template-columns:repeat(3,1fr)}}
  `;
  document.head.appendChild(s);
}

async function guardarConfigPantalla(id){
  const d={
    activo:document.querySelector(`[data-cfg-activo="${id}"]`)?.value==="true",
    hora_entrada:document.querySelector(`[data-cfg-entrada="${id}"]`)?.value||"08:00",
    hora_salida:document.querySelector(`[data-cfg-salida="${id}"]`)?.value||"17:00",
    margen_entrada_min:document.querySelector(`[data-cfg-margen-entrada="${id}"]`)?.value||15,
    margen_salida_min:document.querySelector(`[data-cfg-margen-salida="${id}"]`)?.value||15,
    max_descanso_min:document.querySelector(`[data-cfg-descanso="${id}"]`)?.value||30,
    max_comida_min:document.querySelector(`[data-cfg-comida="${id}"]`)?.value||60,
    max_jornada_horas:document.querySelector(`[data-cfg-jornada="${id}"]`)?.value||12
  };
  if(await guardarConfigUsuario(id,d)){alert("Configuración guardada.");ZX_control_fichajes()}
}

function enlazar(){
  const b=document.getElementById("zx_cf_revisar");
  if(b)b.onclick=()=>ZX_control_fichajes();

  document.querySelectorAll("[data-cf-toggle-usuario]").forEach(b=>{
    b.onclick=function(){
      const id=String(b.dataset.cfToggleUsuario||"");
      ZX_CF_VER_DETALLE_USUARIO[id]=!ZX_CF_VER_DETALLE_USUARIO[id];
      ZX_control_fichajes();
    };
  });

  document.querySelectorAll("[data-cf-revisar]").forEach(b=>{b.onclick=()=>actualizarIncidencia(b.dataset.cfRevisar,"revisada")});
  document.querySelectorAll("[data-cf-cerrar]").forEach(b=>{b.onclick=()=>actualizarIncidencia(b.dataset.cfCerrar,"cerrada")});
  document.querySelectorAll("[data-cfg-guardar]").forEach(b=>{b.onclick=()=>guardarConfigPantalla(b.dataset.cfgGuardar)});
}

window.ZX_CF_toggleIncidencias=function(){ZX_CF_VER_INCIDENCIAS=!ZX_CF_VER_INCIDENCIAS;ZX_control_fichajes()};
window.ZX_CF_toggleConfig=function(){ZX_CF_VER_CONFIG=!ZX_CF_VER_CONFIG;ZX_control_fichajes()};

window.ZX_control_fichajes=async function(){
  estilos();

  if(ZX_CF_TIMER){clearInterval(ZX_CF_TIMER);ZX_CF_TIMER=null}

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="control_fichajes")b.classList.add("zx_activo");
  });

  app().innerHTML=`<div class="zx_card"><h2>Control de fichajes</h2><div class="zx_text">Cargando control...</div></div>`;

  const res=await evaluarTodos();
  const s=sesion();
  const incs=await incidenciasControl(esAdmin()?null:s.id);

  let configs=[];
  if(esAdmin()){
    const us=await usuariosActivos();
    const confs=await configsTodos();
    for(const u of us){configs.push({u,c:configUsuarioCache(u.id,confs)})}
  }

  app().innerHTML=`
    ${renderGeneral(res)}
    <div class="zx_card">
      <h2>Estado de hoy</h2>
      ${res.length?res.map(renderUsuario).join(""):`<div class="zx_text">Sin usuarios para revisar.</div>`}
    </div>
    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_CF_toggleIncidencias()">${ZX_CF_VER_INCIDENCIAS?"Ocultar incidencias":"Ver incidencias"}</button>
      ${ZX_CF_VER_INCIDENCIAS?(incs.length?incs.map(renderIncidencia).join(""):`<div class="zx_text">Sin incidencias.</div>`):""}
    </div>
    ${esAdmin()?`
      <div class="zx_card">
        <button class="zx_btn_big zx_gris" onclick="ZX_CF_toggleConfig()">${ZX_CF_VER_CONFIG?"Ocultar configuración":"Ver configuración"}</button>
        ${ZX_CF_VER_CONFIG?(configs.length?configs.map(x=>renderConfig(x.u,x.c)).join(""):`<div class="zx_text">Sin usuarios.</div>`):""}
      </div>
    `:""}
  `;

  enlazar();

  ZX_CF_TIMER=setInterval(async()=>{
    const mod=document.querySelector(".zx_nav_btn.zx_activo")?.dataset?.modulo;
    if(mod==="control_fichajes"){
      const r=await evaluarTodos();
      if(r.some(x=>x.estado==="incidencia"))ZX_control_fichajes();
    }
  },60000);
};

window.ZX_controlFichajes=window.ZX_control_fichajes;

// ===============================
// FIN MÓDULO
// ===============================
})();
