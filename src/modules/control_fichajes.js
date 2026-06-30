// ===============================
// ZENTRYX PRO - CONTROL DE FICHAJES
// V1001 - AVISOS / INCIDENCIAS / MULTIDISPOSITIVO
// ===============================
(function(){
"use strict";

let ZX_CF_VER_INCIDENCIAS=true;
let ZX_CF_VER_CONFIG=false;
let ZX_CF_TIMER=null;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" ||
         String(s.usuario||"").toLowerCase()==="admin";
}

function limpiar(v){
  return String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function ahora(){return new Date().toISOString()}

function uuidSeguro(){
  try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID()}
  catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function fechaLocalISO(v){
  const d=v?new Date(v):new Date();
  if(isNaN(d.getTime()))return fechaLocalISO(new Date());
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function fechaHoyISO(){return fechaLocalISO(new Date())}

function formatoFechaES(f){
  if(!f)return"";
  const p=String(f).slice(0,10).split("-");
  return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:limpiar(f);
}

function fechaHoraES(f){
  if(!f)return"-";
  const d=new Date(f);
  if(isNaN(d.getTime()))return"-";
  return String(d.getDate()).padStart(2,"0")+"/"+
         String(d.getMonth()+1).padStart(2,"0")+"/"+
         d.getFullYear()+" "+
         String(d.getHours()).padStart(2,"0")+":"+
         String(d.getMinutes()).padStart(2,"0");
}

function minutosAhora(){
  const d=new Date();
  return d.getHours()*60+d.getMinutes();
}

function minutosDesdeHora(h){
  if(!h)return null;
  const p=String(h).split(":");
  return Number(p[0]||0)*60+Number(p[1]||0);
}

function minutosDesdeISO(iso){
  if(!iso)return 0;
  const d=new Date(iso);
  if(isNaN(d.getTime()))return 0;
  return Math.floor((new Date()-d)/60000);
}

function textoInc(t){
  return {
    no_entrada:"No fichó entrada",
    no_salida:"No fichó salida",
    descanso_excesivo:"Descanso excesivo",
    comida_excesiva:"Comida excesiva",
    jornada_abierta_larga:"Jornada demasiado larga"
  }[t]||t||"";
}

function colorEstado(e){
  if(e==="abierta")return"#dc2626";
  if(e==="revisada")return"#f59e0b";
  if(e==="cerrada")return"#16a34a";
  return"#64748b";
}

function estadoDesdeTipo(t){
  if(!t)return"fuera";
  return {
    entrada:"dentro",
    salida:"fuera",
    inicio_descanso:"descanso",
    fin_descanso:"dentro",
    inicio_comida:"comida",
    fin_comida:"dentro"
  }[t]||"fuera";
}

async function insertarAviso(usuarioId,titulo,mensaje){
  try{
    await sb().from("notificaciones").insert([{
      id:uuidSeguro(),
      usuario_id:String(usuarioId),
      titulo,
      mensaje,
      tipo:"control_fichajes",
      leida:false,
      created_at:ahora()
    }]);
  }catch(e){}
}

async function insertarAuditoria(accion,detalle,usuarioObjetivoId){
  const s=sesion();
  try{
    await sb().from("auditoria").insert([{
      id:uuidSeguro(),
      usuario_id:String(s.id||""),
      usuario:s.usuario||"",
      nombre:s.nombre||"",
      modulo:"control_fichajes",
      accion,
      detalle,
      usuario_objetivo_id:usuarioObjetivoId?String(usuarioObjetivoId):null,
      created_at:ahora()
    }]);
  }catch(e){}
}

function configDefecto(usuarioId){
  return {
    id:null,
    usuario_id:String(usuarioId),
    activo:true,
    hora_entrada:"08:00",
    hora_salida:"17:00",
    margen_entrada_min:15,
    margen_salida_min:15,
    max_descanso_min:30,
    max_comida_min:60,
    max_jornada_horas:12,
    avisar_usuario:true,
    avisar_admin:true,
    crear_incidencias:true,
    geolocalizacion_app_abierta:false
  };
}

async function usuariosActivos(){
  try{
    const r=await sb()
      .from("usuarios")
      .select("id,usuario,nombre,rol,estado,activo")
      .order("nombre",{ascending:true});

    if(r.error||!r.data)return[];

    return (r.data||[]).filter(u=>{
      const estado=String(u.estado||"").toLowerCase();
      return u.activo!==false && estado!=="baja" && estado!=="inactivo";
    });
  }catch(e){return[]}
}

async function usuarioActualLista(){
  const s=sesion();
  return [{
    id:String(s.id||""),
    usuario:s.usuario||"",
    nombre:s.nombre||s.usuario||"",
    rol:s.rol||"",
    estado:"activo",
    activo:true
  }];
}

async function configUsuario(usuarioId){
  const def=configDefecto(usuarioId);

  try{
    const r=await sb()
      .from("control_fichajes_config")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .maybeSingle();

    if(!r.error&&r.data)return {...def,...r.data};
  }catch(e){}

  return def;
}

async function guardarConfigUsuario(usuarioId,d){
  const actual=await configUsuario(usuarioId);

  const reg={
    id:actual.id||uuidSeguro(),
    usuario_id:String(usuarioId),
    activo:!!d.activo,
    hora_entrada:String(d.hora_entrada||"08:00"),
    hora_salida:String(d.hora_salida||"17:00"),
    margen_entrada_min:Number(d.margen_entrada_min||15),
    margen_salida_min:Number(d.margen_salida_min||15),
    max_descanso_min:Number(d.max_descanso_min||30),
    max_comida_min:Number(d.max_comida_min||60),
    max_jornada_horas:Number(d.max_jornada_horas||12),
    avisar_usuario:true,
    avisar_admin:true,
    crear_incidencias:true,
    geolocalizacion_app_abierta:false,
    updated_at:ahora()
  };

  const r=await sb()
    .from("control_fichajes_config")
    .upsert([reg],{onConflict:"usuario_id"});

  if(r.error){
    alert("Error guardando configuración: "+r.error.message);
    return false;
  }

  await insertarAuditoria("guardar_config","Configuración actualizada.",usuarioId);
  return true;
}

async function jornadasUsuarioFecha(usuarioId,fecha){
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("fecha",String(fecha).slice(0,10))
      .order("created_at",{ascending:false});

    return r.error?[]:(r.data||[]);
  }catch(e){return[]}
}

async function jornadaAbiertaUsuario(usuarioId){
  try{
    const r=await sb()
      .from("jornadas")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("estado","abierta")
      .order("created_at",{ascending:false})
      .limit(1);

    return (!r.error&&r.data&&r.data.length)?r.data[0]:null;
  }catch(e){return null}
}

async function fichajesDeJornada(jid){
  try{
    const r=await sb()
      .from("fichajes")
      .select("*")
      .eq("jornada_id",String(jid))
      .order("created_at",{ascending:true});

    return r.error?[]:(r.data||[]);
  }catch(e){return[]}
}

async function incidenciasControl(usuarioId=null){
  try{
    let q=sb()
      .from("control_fichajes_incidencias")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(80);

    if(usuarioId)q=q.eq("usuario_id",String(usuarioId));

    const r=await q;
    return r.error?[]:(r.data||[]);
  }catch(e){return[]}
}

async function incidenciaExistente(usuarioId,fecha,tipo,jornadaId){
  try{
    let q=sb()
      .from("control_fichajes_incidencias")
      .select("*")
      .eq("usuario_id",String(usuarioId))
      .eq("fecha",String(fecha).slice(0,10))
      .eq("tipo",String(tipo))
      .neq("estado","cerrada")
      .limit(1);

    if(jornadaId)q=q.eq("jornada_id",String(jornadaId));

    const r=await q;
    return (!r.error&&r.data&&r.data.length)?r.data[0]:null;
  }catch(e){return null}
}

async function crearIncidencia(d,cfg){
  const existe=await incidenciaExistente(d.usuario_id,d.fecha,d.tipo,d.jornada_id||null);
  if(existe)return existe;

  const reg={
    id:uuidSeguro(),
    usuario_id:String(d.usuario_id),
    usuario:d.usuario||"",
    nombre:d.nombre||"",
    fecha:String(d.fecha||fechaHoyISO()).slice(0,10),
    tipo:String(d.tipo),
    estado:"abierta",
    severidad:d.severidad||"media",
    titulo:d.titulo||textoInc(d.tipo),
    detalle:d.detalle||"",
    jornada_id:d.jornada_id?String(d.jornada_id):null,
    fichaje_id:d.fichaje_id?String(d.fichaje_id):null,
    minutos_exceso:d.minutos_exceso==null?null:Number(d.minutos_exceso),
    avisado_usuario:!!cfg.avisar_usuario,
    avisado_admin:false,
    created_at:ahora(),
    updated_at:ahora()
  };

  try{
    const r=await sb()
      .from("control_fichajes_incidencias")
      .insert([reg])
      .select()
      .single();

    if(r.error)return null;

    await insertarAuditoria("crear_incidencia",reg.titulo+" - "+reg.detalle,d.usuario_id);

    if(cfg.avisar_usuario){
      await insertarAviso(d.usuario_id,reg.titulo,reg.detalle);
    }

    return r.data;
  }catch(e){return null}
}