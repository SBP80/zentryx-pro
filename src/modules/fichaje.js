// ===============================
// ZENTRYX PRO - FICHAJE PRO
// V3037 - BORRAR Y MODIFICAR FICHAJES
// ===============================
(function(){
"use strict";

let ZX_VER_ULTIMOS=false;
let ZX_VER_ADMIN=false;
let ZX_VER_MIS_JORNADAS=false;
let ZX_TIMER=null;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" || String(s.usuario||"").toLowerCase()==="admin";
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

function formatoSeg(seg){
  seg=Math.max(0,Math.floor(seg||0));
  const h=Math.floor(seg/3600);
  const m=Math.floor((seg%3600)/60);
  const s=seg%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function formatoMin(min){
  return formatoSeg((min||0)*60);
}

function fechaCorta(f){
  if(!f) return "-";
  return new Date(f).toLocaleString();
}

function direccionCorta(d){
  if(!d) return "";
  return String(d).split(",").slice(0,3).join(",");
}

function segundosEntre(a,b){
  return Math.max(0,Math.floor((new Date(b)-new Date(a))/1000));
}

function toInputFecha(f){
  if(!f) return "";
  const d=new Date(f);
  const local=new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}

function fromInputFecha(v){
  if(!v) return null;
  return new Date(v).toISOString();
}

function diaSemana(fechaISO){
  const d=new Date(fechaISO);
  return ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][d.getDay()];
}

async function objetivoDia(fechaISO){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("activo",true)
    .limit(1);

  if(r.error || !r.data || !r.data.length) return 480*60;

  const h=r.data[0];
  const dia=diaSemana(fechaISO);
  return (h[dia] || 0) * 60;
}

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
        resolve({lat,lng,direccion:data.display_name || null});
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

async function jornadaAbierta(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("estado","abierta")
    .order("created_at",{ascending:false})
    .limit(1);

  if(r.error || !r.data || !r.data.length) return null;
  return r.data[0];
}

async function fichajesDeJornada(jornadaId){
  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("jornada_id",jornadaId)
    .order("created_at",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function estadoActual(){
  const j=await jornadaAbierta();

  if(!j){
    return {estado:"fuera",jornada:null,eventos:[]};
  }

  const f=await fichajesDeJornada(j.id);
  const ultimo=f.length ? f[f.length-1] : null;

  return {
    estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),
    jornada:j,
    eventos:f
  };
}

function calcularEnVivo(eventos,estado){
  let entrada=null;
  let salida=null;
  let inicioDescanso=null;
  let inicioComida=null;

  let descansoSeg=0;
  let comidaSeg=0;

  const now=new Date().toISOString();

  eventos.forEach(e=>{
    if(e.tipo==="entrada") entrada=e.created_at;
    if(e.tipo==="salida") salida=e.created_at;

    if(e.tipo==="inicio_descanso") inicioDescanso=e.created_at;
    if(e.tipo==="fin_descanso" && inicioDescanso){
      descansoSeg+=segundosEntre(inicioDescanso,e.created_at);
      inicioDescanso=null;
    }

    if(e.tipo==="inicio_comida") inicioComida=e.created_at;
    if(e.tipo==="fin_comida" && inicioComida){
      comidaSeg+=segundosEntre(inicioComida,e.created_at);
      inicioComida=null;
    }
  });

  if(estado==="descanso" && inicioDescanso){
    descansoSeg+=segundosEntre(inicioDescanso,now);
  }

  if(estado==="comida" && inicioComida){
    comidaSeg+=segundosEntre(inicioComida,now);
  }

  let trabajadoSeg=0;

  if(entrada){
    let inicioTrabajo=entrada;

    eventos.forEach(e=>{
      if(e.tipo==="entrada"){
        inicioTrabajo=e.created_at;
      }

      if(e.tipo==="inicio_descanso" || e.tipo==="inicio_comida"){
        if(inicioTrabajo){
          trabajadoSeg+=segundosEntre(inicioTrabajo,e.created_at);
          inicioTrabajo=null;
        }
      }

      if(e.tipo==="fin_descanso" || e.tipo==="fin_comida"){
        inicioTrabajo=e.created_at;
      }

      if(e.tipo==="salida"){
        if(inicioTrabajo){
          trabajadoSeg+=segundosEntre(inicioTrabajo,e.created_at);
          inicioTrabajo=null;
        }
      }
    });

    if(inicioTrabajo && estado==="dentro"){
      trabajadoSeg+=segundosEntre(inicioTrabajo,now);
    }
  }

  return {entrada,salida,trabajadoSeg,descansoSeg,comidaSeg};
}

function opcionesPermitidas(estado){
  if(estado==="fuera"){
    return [{tipo:"entrada",texto:"Entrada",clase:"zx_verde"}];
  }

  if(estado==="dentro"){
    return [
      {tipo:"salida",texto:"Salida",clase:"zx_rojo"},
      {tipo:"inicio_descanso",texto:"Inicio descanso",clase:"zx_naranja"},
      {tipo:"inicio_comida",texto:"Inicio comida",clase:"zx_morado"}
    ];
  }

  if(estado==="descanso"){
    return [{tipo:"fin_descanso",texto:"Fin descanso",clase:"zx_azul"}];
  }

  if(estado==="comida"){
    return [{tipo:"fin_comida",texto:"Fin comida",clase:"zx_azul"}];
  }

  return [];
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_fichaje");
  if(m) m.remove();
}

function abrirMenu(estado){
  cerrarModal();

  const ops=opcionesPermitidas(estado);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichar</h2>

        ${ops.map(o=>`
          <button class="zx_btn_big ${o.clase}" data-fichaje="${o.tipo}">
            ${o.texto}
          </button>
        `).join("")}

        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">Cancelar</button>
      </div>
    </div>
  `);

  document.querySelectorAll("[data-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=this.dataset.fichaje;
      cerrarModal();
      registrar(tipo);
    };
  });

  document.getElementById("zx_cancelar_fichaje").onclick=cerrarModal;
}

async function crearJornada(){
  const s=sesion();
  const entrada=ahora();

  const r=await sb()
    .from("jornadas")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      fecha:new Date().toISOString().slice(0,10),
      entrada,
      estado:"abierta"
    }])
    .select()
    .single();

  if(r.error){
    alert("Error creando jornada: "+r.error.message);
    return null;
  }

  return r.data;
}

async function insertarFichaje(tipo,jornadaId,geo){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      jornada_id:jornadaId,
      tipo,
      lat:geo.lat,
      lng:geo.lng,
      direccion:geo.direccion,
      dispositivo:navigator.userAgent,
      created_at:ahora()
    }]);

  if(r.error){
    alert("Error al guardar fichaje: "+r.error.message);
    return false;
  }

  return true;
}

async function cerrarJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);
  const c=calcularEnVivo(eventos,"fuera");

  const objetivoSeg=await objetivoDia(c.entrada || new Date().toISOString());
  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);

  const r=await sb()
    .from("jornadas")
    .update({
      salida:c.salida,
      minutos_trabajados:Math.floor(c.trabajadoSeg/60),
      minutos_descanso:Math.floor(c.descansoSeg/60),
      minutos_comida:Math.floor(c.comidaSeg/60),
      minutos_objetivo:Math.floor(objetivoSeg/60),
      minutos_extra:Math.floor(extraSeg/60),
      minutos_faltantes:Math.floor(faltanteSeg/60),
      horas_extra:Math.floor(extraSeg/60),
      estado:"cerrada"
    })
    .eq("id",jornadaId);

  if(r.error){
    alert("Error cerrando jornada: "+r.error.message);
    return false;
  }

  return true;
}

async function recalcularJornada(jornadaId){
  if(!jornadaId) return;

  const eventos=await fichajesDeJornada(jornadaId);
  const ultimo=eventos.length ? eventos[eventos.length-1] : null;
  const estado=estadoDesdeTipo(ultimo ? ultimo.tipo : null);

  const c=calcularEnVivo(eventos,estado);
  const objetivoSeg=await objetivoDia(c.entrada || new Date().toISOString());
  const extraSeg=Math.max(0,c.trabajadoSeg-objetivoSeg);
  const faltanteSeg=Math.max(0,objetivoSeg-c.trabajadoSeg);

  const nuevoEstado=ultimo && ultimo.tipo==="salida" ? "cerrada" : "abierta";

  await sb()
    .from("jornadas")
    .update({
      salida:c.salida,
      minutos_trabajados:Math.floor(c.trabajadoSeg/60),
      minutos_descanso:Math.floor(c.descansoSeg/60),
      minutos_comida:Math.floor(c.comidaSeg/60),
      minutos_objetivo:Math.floor(objetivoSeg/60),
      minutos_extra:Math.floor(extraSeg/60),
      minutos_faltantes:Math.floor(faltanteSeg/60),
      horas_extra:Math.floor(extraSeg/60),
      estado:nuevoEstado
    })
    .eq("id",jornadaId);
}

async function registrar(tipo){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const est=await estadoActual();
  let jornada=est.jornada;

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
    jornada=await crearJornada();
    if(!jornada) return;
  }

  const geo=await obtenerUbicacion();
  const ok=await insertarFichaje(tipo,jornada.id,geo);

  if(!ok) return;

  if(tipo==="salida"){
    await cerrarJornada(jornada.id);
  }else{
    await recalcularJornada(jornada.id);
  }

  ZX_fichaje();
}

async function ultimosFichajes(){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(5);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasUsuario(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(3);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasAdminHoy(){
  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("fecha",hoy)
    .order("created_at",{ascending:false})
    .limit(80);

  if(r.error) return [];
  return r.data || [];
}

async function jornadasAdminPendientes(){
  const r=await sb()
    .from("jornadas")
    .select("*")
    .in("estado",["cerrada","validada"])
    .order("created_at",{ascending:false})
    .limit(30);

  if(r.error) return [];
  return r.data || [];
}

async function validarJornada(id){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .update({
      estado:"validada",
      validada_at:new Date().toISOString(),
      validada_por:s.usuario || ""
    })
    .eq("id",id);

  if(r.error){
    alert("Error validando: "+r.error.message);
    return;
  }

  ZX_fichaje();
}

async function pagarJornada(id){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .update({
      estado:"pagada",
      pagada_at:new Date().toISOString(),
      pagada_por:s.usuario || ""
    })
    .eq("id",id);

  if(r.error){
    alert("Error marcando pagada: "+r.error.message);
    return;
  }

  ZX_fichaje();
}

async function borrarFichaje(id){
  if(!esAdmin()){
    alert("Solo administrador.");
    return;
  }

  const r0=await sb()
    .from("fichajes")
    .select("*")
    .eq("id",id)
    .single();

  if(r0.error || !r0.data){
    alert("No se pudo cargar el fichaje.");
    return;
  }

  const ok=confirm("¿Eliminar este fichaje?");
  if(!ok) return;

  const r=await sb()
    .from("fichajes")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error eliminando: "+r.error.message);
    return;
  }

  await recalcularJornada(r0.data.jornada_id);
  ZX_fichaje();
}

async function editarFichaje(id){
  if(!esAdmin()){
    alert("Solo administrador.");
    return;
  }

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("id",id)
    .single();

  if(r.error || !r.data){
    alert("No se pudo cargar el fichaje.");
    return;
  }

  const f=r.data;

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
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
        <textarea id="zx_edit_direccion" rows="3">${limpiar(f.direccion || "")}</textarea>

        <label class="zx_label">Latitud</label>
        <input id="zx_edit_lat" type="number" step="any" value="${limpiar(f.lat || "")}">

        <label class="zx_label">Longitud</label>
        <input id="zx_edit_lng" type="number" step="any" value="${limpiar(f.lng || "")}">

        <button class="zx_btn_big zx_azul" id="zx_guardar_edit_fichaje">Guardar cambios</button>
        <button class="zx_btn_big zx_gris" id="zx_cancelar_edit_fichaje">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("zx_cancelar_edit_fichaje").onclick=cerrarModal;

  document.getElementById("zx_guardar_edit_fichaje").onclick=async function(){
    const tipo=document.getElementById("zx_edit_tipo").value;
    const fecha=fromInputFecha(document.getElementById("zx_edit_fecha").value);
    const direccion=document.getElementById("zx_edit_direccion").value.trim();
    const lat=document.getElementById("zx_edit_lat").value;
    const lng=document.getElementById("zx_edit_lng").value;

    if(!fecha){
      alert("Fecha inválida.");
      return;
    }

    const rr=await sb()
      .from("fichajes")
      .update({
        tipo,
        created_at:fecha,
        direccion,
        lat:lat==="" ? null : Number(lat),
        lng:lng==="" ? null : Number(lng)
      })
      .eq("id",id);

    if(rr.error){
      alert("Error guardando: "+rr.error.message);
      return;
    }

    cerrarModal();
    await recalcularJornada(f.jornada_id);
    ZX_fichaje();
  };
}

function resumenHTML(resumen,objetivoSeg){
  const extraSeg=Math.max(0,resumen.trabajadoSeg-objetivoSeg);
  const faltaSeg=Math.max(0,objetivoSeg-resumen.trabajadoSeg);

  return `
    <div class="zx_text">
      Trabajado: <b>${formatoSeg(resumen.trabajadoSeg)}</b><br>
      Descanso: <b>${formatoSeg(resumen.descansoSeg)}</b><br>
      Comida: <b>${formatoSeg(resumen.comidaSeg)}</b><br>
      Objetivo: <b>${formatoSeg(objetivoSeg)}</b><br>
      Extra: <b>${formatoSeg(extraSeg)}</b><br>
      Falta: <b>${formatoSeg(faltaSeg)}</b>
    </div>
  `;
}

function renderJornadaMini(j,admin){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(j.nombre || j.usuario || "-")}</b>
        <span>${limpiar(j.fecha || "-")}</span>
      </div>

      <div class="zx_admin_estado ${limpiar(j.estado || "")}">
        ${limpiar(j.estado || "-")}
      </div>

      <div class="zx_admin_data">
        Trab: ${formatoMin(j.minutos_trabajados || 0)} · Obj: ${formatoMin(j.minutos_objetivo || 0)}<br>
        Desc: ${formatoMin(j.minutos_descanso || 0)} · Comida: ${formatoMin(j.minutos_comida || 0)}<br>
        Extra: ${formatoMin(j.minutos_extra || j.horas_extra || 0)} · Falta: ${formatoMin(j.minutos_faltantes || 0)}
      </div>

      ${
        admin && j.estado==="cerrada"
        ? `<button class="zx_admin_btn zx_admin_validar" data-validar="${j.id}">Validar</button>`
        : ""
      }

      ${
        admin && j.estado==="validada"
        ? `<button class="zx_admin_btn zx_admin_pagar" data-pagar="${j.id}">Marcar pagada</button>`
        : ""
      }
    </div>
  `;
}

function renderFichajeMini(f){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(textoTipo(f.tipo))}</b>
        <span>${limpiar(fechaCorta(f.created_at))}</span>
      </div>

      <div class="zx_admin_data">${limpiar(direccionCorta(f.direccion))}</div>

      ${
        esAdmin()
        ? `
          <div class="zx_edit_grid">
            <button class="zx_admin_btn zx_admin_editar" data-editar-fichaje="${f.id}">Modificar</button>
            <button class="zx_admin_btn zx_admin_borrar" data-borrar-fichaje="${f.id}">Borrar</button>
          </div>
        `
        : ""
      }
    </div>
  `;
}

function renderAdminResumen(jornadasHoy,pendientes){
  let totalTrab=0;
  let totalExtra=0;
  let totalFalta=0;
  let abiertas=0;
  let cerradas=0;

  jornadasHoy.forEach(j=>{
    totalTrab += j.minutos_trabajados || 0;
    totalExtra += j.minutos_extra || j.horas_extra || 0;
    totalFalta += j.minutos_faltantes || 0;
    if(j.estado==="abierta") abiertas++;
    if(j.estado==="cerrada") cerradas++;
  });

  return `
    <div class="zx_admin_summary">
      <div><b>${jornadasHoy.length}</b><span>Jornadas</span></div>
      <div><b>${abiertas}</b><span>Abiertas</span></div>
      <div><b>${cerradas}</b><span>Cerradas</span></div>
      <div><b>${pendientes.length}</b><span>Pendientes</span></div>
    </div>

    <div class="zx_admin_totals">
      Trabajado: <b>${formatoMin(totalTrab)}</b><br>
      Extra: <b>${formatoMin(totalExtra)}</b> · Falta: <b>${formatoMin(totalFalta)}</b>
    </div>
  `;
}

function estilosAdminCompacto(){
  if(document.getElementById("zx_admin_compacto_css")) return;

  const s=document.createElement("style");
  s.id="zx_admin_compacto_css";
  s.innerHTML=`
    .zx_admin_summary{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
      margin:12px 0;
    }

    .zx_admin_summary div{
      background:#f1f5f9;
      border-radius:16px;
      padding:14px;
      text-align:center;
    }

    .zx_admin_summary b{
      display:block;
      font-size:26px;
      color:#0f172a;
    }

    .zx_admin_summary span{
      font-size:14px;
      color:#64748b;
      font-weight:800;
    }

    .zx_admin_totals{
      background:#eef2ff;
      border-radius:16px;
      padding:14px;
      margin-bottom:14px;
      color:#334155;
      font-size:17px;
      line-height:1.5;
      font-weight:800;
    }

    .zx_admin_row{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:10px;
    }

    .zx_admin_row_top{
      display:flex;
      justify-content:space-between;
      gap:8px;
      font-size:16px;
      color:#0f172a;
      font-weight:900;
    }

    .zx_admin_row_top span{
      color:#64748b;
      font-size:14px;
      white-space:nowrap;
    }

    .zx_admin_estado{
      display:inline-block;
      margin:8px 0;
      padding:5px 10px;
      border-radius:999px;
      background:#64748b;
      color:white;
      font-size:13px;
      font-weight:900;
    }

    .zx_admin_estado.abierta{background:#f59e0b}
    .zx_admin_estado.cerrada{background:#2563eb}
    .zx_admin_estado.validada{background:#7c3aed}
    .zx_admin_estado.pagada{background:#16a34a}

    .zx_admin_data{
      color:#64748b;
      font-size:15px;
      line-height:1.45;
      font-weight:800;
    }

    .zx_admin_btn{
      width:100%;
      border:0;
      border-radius:14px;
      margin-top:10px;
      padding:12px;
      color:white;
      font-size:16px;
      font-weight:900;
    }

    .zx_admin_validar{background:#16a34a}
    .zx_admin_pagar{background:#ea580c}
    .zx_admin_editar{background:#2563eb}
    .zx_admin_borrar{background:#dc2626}

    .zx_edit_grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:10px;
    }
  `;
  document.head.appendChild(s);
}

window.ZX_toggleUltimos=function(){
  ZX_VER_ULTIMOS=!ZX_VER_ULTIMOS;
  ZX_fichaje();
};

window.ZX_toggleAdmin=function(){
  ZX_VER_ADMIN=!ZX_VER_ADMIN;
  ZX_fichaje();
};

window.ZX_toggleMisJornadas=function(){
  ZX_VER_MIS_JORNADAS=!ZX_VER_MIS_JORNADAS;
  ZX_fichaje();
};

window.ZX_fichaje=async function(){
  estilosAdminCompacto();

  if(ZX_TIMER){
    clearInterval(ZX_TIMER);
    ZX_TIMER=null;
  }

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="fichaje"){
      b.classList.add("zx_activo");
    }
  });

  const est=await estadoActual();
  const hist=await ultimosFichajes();
  const jornadas=await jornadasUsuario();

  const adminHoy=esAdmin() ? await jornadasAdminHoy() : [];
  const adminPend=esAdmin() ? await jornadasAdminPendientes() : [];

  let resumen={trabajadoSeg:0,descansoSeg:0,comidaSeg:0};
  let objetivoSeg=480*60;

  if(est.jornada){
    resumen=calcularEnVivo(est.eventos,est.estado);
    objetivoSeg=await objetivoDia(resumen.entrada || new Date().toISOString());
  }else if(jornadas[0]){
    resumen={
      trabajadoSeg:(jornadas[0].minutos_trabajados || 0)*60,
      descansoSeg:(jornadas[0].minutos_descanso || 0)*60,
      comidaSeg:(jornadas[0].minutos_comida || 0)*60
    };
    objetivoSeg=(jornadas[0].minutos_objetivo || 480)*60;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>
      <div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">
        ${textoEstado(est.estado)}
      </div>

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">FICHAR</button>
    </div>

    <div class="zx_card">
      <h2>Resumen en vivo</h2>
      <div id="zx_resumen_tiempo">${resumenHTML(resumen,objetivoSeg)}</div>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">
        ${ZX_VER_MIS_JORNADAS ? "Ocultar mis jornadas" : "Ver mis jornadas"}
      </button>

      ${
        ZX_VER_MIS_JORNADAS
        ? (
            jornadas.length
            ? jornadas.map(j=>renderJornadaMini(j,false)).join("")
            : `<div class="zx_text">Sin jornadas.</div>`
          )
        : ""
      }
    </div>

    ${
      esAdmin()
      ? `
        <div class="zx_card">
          <button class="zx_btn_big zx_gris" onclick="ZX_toggleAdmin()">
            ${ZX_VER_ADMIN ? "Ocultar panel admin" : "Ver panel admin"}
          </button>

          ${
            ZX_VER_ADMIN
            ? `
              ${renderAdminResumen(adminHoy,adminPend)}

              <h3 style="font-size:24px;margin:18px 0 8px;">Pendientes</h3>
              ${
                adminPend.length
                ? adminPend.map(j=>renderJornadaMini(j,true)).join("")
                : `<div class="zx_text">No hay jornadas pendientes.</div>`
              }

              <h3 style="font-size:24px;margin:18px 0 8px;">Hoy</h3>
              ${
                adminHoy.length
                ? adminHoy.slice(0,10).map(j=>renderJornadaMini(j,false)).join("")
                : `<div class="zx_text">Sin jornadas hoy.</div>`
              }
            `
            : ""
          }
        </div>
      `
      : ""
    }

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleUltimos()">
        ${ZX_VER_ULTIMOS ? "Ocultar últimos fichajes" : "Ver últimos fichajes"}
      </button>

      ${
        ZX_VER_ULTIMOS
        ? (
            hist.length
            ? hist.map(h=>renderFichajeMini(h)).join("")
            : `<div class="zx_text">Sin registros.</div>`
          )
        : ""
      }
    </div>
  `;

  document.getElementById("zx_btn_fichar").onclick=function(){
    abrirMenu(est.estado);
  };

  document.querySelectorAll("[data-validar]").forEach(btn=>{
    btn.onclick=function(){
      validarJornada(btn.dataset.validar);
    };
  });

  document.querySelectorAll("[data-pagar]").forEach(btn=>{
    btn.onclick=function(){
      pagarJornada(btn.dataset.pagar);
    };
  });

  document.querySelectorAll("[data-editar-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      editarFichaje(btn.dataset.editarFichaje);
    };
  });

  document.querySelectorAll("[data-borrar-fichaje]").forEach(btn=>{
    btn.onclick=function(){
      borrarFichaje(btn.dataset.borrarFichaje);
    };
  });

  if(est.jornada){
    ZX_TIMER=setInterval(function(){
      const r=calcularEnVivo(est.eventos,est.estado);
      const cont=document.getElementById("zx_resumen_tiempo");
      if(cont) cont.innerHTML=resumenHTML(r,objetivoSeg);
    },1000);
  }
};

})();