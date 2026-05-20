// ===============================
// TIPOS Y ESTADOS
// ===============================
function textoEstado(estado){
  if(estado==="dentro") return "Trabajando";
  if(estado==="descanso") return "Descanso";
  if(estado==="comida") return "Comida";
  return "Fuera";
}

function colorEstado(estado){
  if(estado==="dentro") return "#16a34a";
  if(estado==="descanso") return "#f59e0b";
  if(estado==="comida") return "#ea580c";
  return "#64748b";
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

function textoTipo(tipo){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso",
    inicio_comida:"Inicio comida",
    fin_comida:"Fin comida"
  };

  return m[tipo] || tipo;
}

// ===============================
// RESUMEN SOLICITUDES
// ===============================
function textoTipoSolicitud(tipo){
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

function analizarSolicitudes(solicitudes){
  const res={
    texto:"",
    minutosJustificados:0,
    bloqueaTodo:false,
    tipo:null,
    solicitudId:null
  };

  if(!solicitudes || !solicitudes.length){
    return res;
  }

  const prioridad=[
    "baja_medica",
    "vacaciones",
    "permiso_retribuido",
    "permiso_sin_sueldo",
    "otros",
    "asuntos_propios"
  ];

  solicitudes.sort((a,b)=>{
    return prioridad.indexOf(a.tipo)-prioridad.indexOf(b.tipo);
  });

  const s=solicitudes[0];

  res.tipo=s.tipo;
  res.solicitudId=s.id;
  res.texto=textoTipoSolicitud(s.tipo);

  if(s.tipo==="baja_medica"){
    res.bloqueaTodo=true;
    res.minutosJustificados=24*60;
    return res;
  }

  if(s.tipo==="vacaciones"){
    res.minutosJustificados=24*60;
    return res;
  }

  if(Number(s.total_horas||0)>0){
    res.minutosJustificados=Math.round(Number(s.total_horas||0)*60);
    return res;
  }

  if(Number(s.total_dias||0)>0){
    res.minutosJustificados=24*60;
    return res;
  }

  return res;
}

// ===============================
// OBJETIVO DEL DÍA
// ===============================
async function objetivoDia(){
  const solicitudes=await solicitudesHoy();
  const analisis=analizarSolicitudes(solicitudes);

  let objetivoSeg=480*60;

  if(analisis.tipo==="vacaciones" || analisis.tipo==="baja_medica"){
    objetivoSeg=0;
  }else if(analisis.minutosJustificados>0){
    objetivoSeg=Math.max(0,objetivoSeg-(analisis.minutosJustificados*60));
  }

  return {
    objetivoSeg,
    solicitudes,
    analisis,
    bloqueo:bloqueoHorarioActual(solicitudes)
  };
}
// ===============================
// TIPOS Y ESTADOS
// ===============================
function textoEstado(estado){
  if(estado==="dentro") return "Trabajando";
  if(estado==="descanso") return "Descanso";
  if(estado==="comida") return "Comida";
  return "Fuera";
}

function colorEstado(estado){
  if(estado==="dentro") return "#16a34a";
  if(estado==="descanso") return "#f59e0b";
  if(estado==="comida") return "#ea580c";
  return "#64748b";
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

function textoTipo(tipo){
  const m={
    entrada:"Entrada",
    salida:"Salida",
    inicio_descanso:"Inicio descanso",
    fin_descanso:"Fin descanso",
    inicio_comida:"Inicio comida",
    fin_comida:"Fin comida"
  };

  return m[tipo] || tipo;
}

// ===============================
// RESUMEN SOLICITUDES
// ===============================
function textoTipoSolicitud(tipo){
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

function analizarSolicitudes(solicitudes){
  const res={
    texto:"",
    minutosJustificados:0,
    bloqueaTodo:false,
    tipo:null,
    solicitudId:null
  };

  if(!solicitudes || !solicitudes.length){
    return res;
  }

  const prioridad=[
    "baja_medica",
    "vacaciones",
    "permiso_retribuido",
    "permiso_sin_sueldo",
    "otros",
    "asuntos_propios"
  ];

  solicitudes.sort((a,b)=>{
    return prioridad.indexOf(a.tipo)-prioridad.indexOf(b.tipo);
  });

  const s=solicitudes[0];

  res.tipo=s.tipo;
  res.solicitudId=s.id;
  res.texto=textoTipoSolicitud(s.tipo);

  if(s.tipo==="baja_medica"){
    res.bloqueaTodo=true;
    res.minutosJustificados=24*60;
    return res;
  }

  if(s.tipo==="vacaciones"){
    res.minutosJustificados=24*60;
    return res;
  }

  if(Number(s.total_horas||0)>0){
    res.minutosJustificados=Math.round(Number(s.total_horas||0)*60);
    return res;
  }

  if(Number(s.total_dias||0)>0){
    res.minutosJustificados=24*60;
    return res;
  }

  return res;
}

// ===============================
// OBJETIVO DEL DÍA
// ===============================
async function objetivoDia(){
  const solicitudes=await solicitudesHoy();
  const analisis=analizarSolicitudes(solicitudes);

  let objetivoSeg=480*60;

  if(analisis.tipo==="vacaciones" || analisis.tipo==="baja_medica"){
    objetivoSeg=0;
  }else if(analisis.minutosJustificados>0){
    objetivoSeg=Math.max(0,objetivoSeg-(analisis.minutosJustificados*60));
  }

  return {
    objetivoSeg,
    solicitudes,
    analisis,
    bloqueo:bloqueoHorarioActual(solicitudes)
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

      resolve({
        lat,
        lng,
        direccion:null
      });

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
// JORNADA ABIERTA
// ===============================
async function jornadaAbierta(){
  const s=sesion();

  const r=await sb()
    .from("jornadas")
    .select("*")
    .eq("usuario_id",String(s.id))
    .eq("estado","abierta")
    .order("created_at",{ascending:false})
    .limit(1);

  if(r.error || !r.data || !r.data.length){
    return null;
  }

  return r.data[0];
}

// ===============================
// FICHAJES DE JORNADA
// ===============================
async function fichajesDeJornada(jornadaId){
  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("jornada_id",jornadaId)
    .order("created_at",{ascending:true});

  if(r.error){
    return [];
  }

  return r.data || [];
}

// ===============================
// ESTADO ACTUAL
// ===============================
async function estadoActual(){
  const j=await jornadaAbierta();

  if(!j){
    return {
      estado:"fuera",
      jornada:null,
      eventos:[]
    };
  }

  const eventos=await fichajesDeJornada(j.id);
  const ultimo=eventos.length ? eventos[eventos.length-1] : null;

  return {
    estado:estadoDesdeTipo(ultimo ? ultimo.tipo : "entrada"),
    jornada:j,
    eventos
  };
}
// ===============================
// CÁLCULO EN VIVO
// ===============================
function segundosEntre(a,b){
  return Math.max(0,Math.floor((new Date(b)-new Date(a))/1000));
}

function calcularEnVivo(eventos,estado){
  let entrada=null;
  let salida=null;
  let inicioDescanso=null;
  let inicioComida=null;

  let descansoSeg=0;
  let comidaSeg=0;
  let trabajadoSeg=0;

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

  return {
    entrada,
    salida,
    trabajadoSeg,
    descansoSeg,
    comidaSeg
  };
}

// ===============================
// CREAR JORNADA
// ===============================
async function crearJornada(){
  const s=sesion();
  const obj=await objetivoDia();

  const r=await sb()
    .from("jornadas")
    .insert([{
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",
      fecha:new Date().toISOString().slice(0,10),
      entrada:ahora(),
      estado:"abierta",
      solicitud_id:obj.analisis.solicitudId,
      tipo_ausencia:obj.analisis.tipo,
      minutos_justificados:obj.analisis.minutosJustificados,
      observacion_laboral:obj.analisis.texto
    }])
    .select()
    .single();

  if(r.error){
    alert("Error creando jornada: "+r.error.message);
    return null;
  }

  return r.data;
}

// ===============================
// INSERTAR FICHAJE
// ===============================
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
// ===============================
// RECALCULAR JORNADA
// ===============================
async function recalcularJornada(jornadaId){
  if(!jornadaId) return;

  const eventos=await fichajesDeJornada(jornadaId);

  if(!eventos.length){
    await sb()
      .from("jornadas")
      .delete()
      .eq("id",jornadaId);
    return;
  }

  const ultimo=eventos[eventos.length-1];
  const estado=estadoDesdeTipo(ultimo ? ultimo.tipo : null);

  const c=calcularEnVivo(eventos,estado);
  const obj=await objetivoDia();

  const extraSeg=Math.max(0,c.trabajadoSeg-obj.objetivoSeg);
  const faltaSeg=Math.max(0,obj.objetivoSeg-c.trabajadoSeg);

  const nuevoEstado=ultimo && ultimo.tipo==="salida" ? "cerrada" : "abierta";

  const r=await sb()
    .from("jornadas")
    .update({
      salida:c.salida,
      minutos_trabajados:Math.floor(c.trabajadoSeg/60),
      minutos_descanso:Math.floor(c.descansoSeg/60),
      minutos_comida:Math.floor(c.comidaSeg/60),
      minutos_objetivo:Math.floor(obj.objetivoSeg/60),
      minutos_extra:Math.floor(extraSeg/60),
      minutos_faltantes:Math.floor(faltaSeg/60),
      horas_extra:Math.floor(extraSeg/60),
      solicitud_id:obj.analisis.solicitudId,
      tipo_ausencia:obj.analisis.tipo,
      minutos_justificados:obj.analisis.minutosJustificados,
      observacion_laboral:obj.analisis.texto,
      estado:nuevoEstado
    })
    .eq("id",jornadaId);

  if(r.error){
    alert("Error recalculando jornada: "+r.error.message);
  }
}

// ===============================
// REGISTRAR FICHAJE
// ===============================
async function registrar(tipo){
  const s=sesion();

  if(!s.id){
    alert("Sesión no válida.");
    return;
  }

  const obj=await objetivoDia();

  if(obj.analisis.bloqueaTodo && tipo==="entrada"){
    alert("No se puede fichar: existe una ausencia aprobada para hoy.");
    return;
  }

  if(obj.bloqueo.bloqueado && tipo==="entrada"){
    alert(
      "No puedes fichar.\n" +
      "Permiso activo: " +
      obj.bloqueo.inicio + " - " +
      obj.bloqueo.fin
    );
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

  await recalcularJornada(jornada.id);
  ZX_fichaje();
}
// ===============================
// OPCIONES DE FICHAJE
// ===============================
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

// ===============================
// MODAL FICHAR
// ===============================
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

        <button class="zx_btn_big zx_gris" id="zx_cancelar_fichaje">
          Cancelar
        </button>
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

// ===============================
// CONSULTAS LISTADOS
// ===============================
async function ultimosFichajes(){
  const s=sesion();

  const r=await sb()
    .from("fichajes")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(8);

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
    .limit(5);

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
// ===============================
// BORRAR JORNADA
// ===============================
async function borrarJornada(id){
  if(!esAdmin()){
    alert("Solo administrador.");
    return;
  }

  const ok=confirm("¿Eliminar jornada completa y todos sus fichajes?");
  if(!ok) return;

  const f=await sb()
    .from("fichajes")
    .delete()
    .eq("jornada_id",id);

  if(f.error){
    alert("Error eliminando fichajes: "+f.error.message);
    return;
  }

  const j=await sb()
    .from("jornadas")
    .delete()
    .eq("id",id);

  if(j.error){
    alert("Error eliminando jornada: "+j.error.message);
    return;
  }

  cerrarModal();
  ZX_fichaje();
}

// ===============================
// BORRAR FICHAJE
// ===============================
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
    alert("Error eliminando fichaje: "+r.error.message);
    return;
  }

  const restantes=await fichajesDeJornada(r0.data.jornada_id);

  if(!restantes.length){
    await sb()
      .from("jornadas")
      .delete()
      .eq("id",r0.data.jornada_id);
  }else{
    await recalcularJornada(r0.data.jornada_id);
  }

  cerrarModal();
  ZX_fichaje();
}
// ===============================
// EDITAR FICHAJE
// ===============================
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

        <button class="zx_btn_big zx_azul" id="zx_guardar_edit_fichaje">
          Guardar cambios
        </button>

        <button class="zx_btn_big zx_gris" id="zx_cancelar_edit_fichaje">
          Cancelar
        </button>
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
// ===============================
// VER FICHAJES DE JORNADA
// ===============================
async function verFichajesJornada(jornadaId){
  const eventos=await fichajesDeJornada(jornadaId);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_fichaje" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Fichajes jornada</h2>

        ${
          eventos.length
          ? eventos.map(f=>renderFichajeMini(f)).join("")
          : `<div class="zx_text">Sin fichajes.</div>`
        }

        <button class="zx_btn_big zx_gris" id="zx_cerrar_fichajes_jornada">
          Cerrar
        </button>
      </div>
    </div>
  `);

  document.getElementById("zx_cerrar_fichajes_jornada").onclick=cerrarModal;

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
}

// ===============================
// RENDER FICHAJE MINI
// ===============================
function renderFichajeMini(f){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(textoTipo(f.tipo))}</b>
        <span>${limpiar(fechaCorta(f.created_at))}</span>
      </div>

      <div class="zx_admin_data">
        ${limpiar(f.direccion || "")}
      </div>

      ${
        esAdmin()
        ? `
          <div class="zx_edit_grid">
            <button class="zx_admin_btn zx_admin_editar" data-editar-fichaje="${f.id}">
              Modificar
            </button>

            <button class="zx_admin_btn zx_admin_borrar" data-borrar-fichaje="${f.id}">
              Borrar
            </button>
          </div>
        `
        : ""
      }
    </div>
  `;
}

// ===============================
// RENDER JORNADA MINI
// ===============================
function renderJornadaMini(j,admin){
  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(j.nombre || j.usuario || "-")}</b>
        <span>${limpiar(j.fecha || "")}</span>
      </div>

      <div class="zx_admin_estado ${limpiar(j.estado || "")}">
        ${limpiar(j.estado || "-")}
      </div>

      <div class="zx_admin_data">
        Trab: ${formatoMin(j.minutos_trabajados || 0)} · Obj: ${formatoMin(j.minutos_objetivo || 0)}<br>
        Desc: ${formatoMin(j.minutos_descanso || 0)} · Comida: ${formatoMin(j.minutos_comida || 0)}<br>
        Just: ${formatoMin(j.minutos_justificados || 0)} · Extra: ${formatoMin(j.minutos_extra || j.horas_extra || 0)}<br>
        Falta: ${formatoMin(j.minutos_faltantes || 0)}

        ${
          j.observacion_laboral
          ? `<br><b style="color:#2563eb;">${limpiar(j.observacion_laboral)}</b>`
          : ""
        }
      </div>

      ${
        admin
        ? `
          <div class="zx_edit_grid">
            <button class="zx_admin_btn zx_admin_editar" data-ver-fichajes-jornada="${j.id}">
              Fichajes
            </button>

            <button class="zx_admin_btn zx_admin_borrar" data-borrar-jornada="${j.id}">
              Borrar jornada
            </button>
          </div>
        `
        : ""
      }
    </div>
  `;
}
// ===============================
// RESUMEN HTML
// ===============================
function resumenHTML(resumen,obj){
  const extraSeg=Math.max(0,resumen.trabajadoSeg-obj.objetivoSeg);
  const faltaSeg=Math.max(0,obj.objetivoSeg-resumen.trabajadoSeg);

  return `
    <div class="zx_text">

      ${
        obj.analisis && obj.analisis.texto
        ? `<div style="color:#2563eb;font-weight:900;margin-bottom:8px;">
            ${limpiar(obj.analisis.texto)}
          </div>`
        : ""
      }

      ${
        obj.bloqueo && obj.bloqueo.bloqueado
        ? `<div style="color:#dc2626;font-weight:900;margin-bottom:8px;">
            Permiso activo: ${limpiar(obj.bloqueo.inicio)} - ${limpiar(obj.bloqueo.fin)}
          </div>`
        : ""
      }

      Trabajado: <b>${formatoSeg(resumen.trabajadoSeg)}</b><br>
      Descanso: <b>${formatoSeg(resumen.descansoSeg)}</b><br>
      Comida: <b>${formatoSeg(resumen.comidaSeg)}</b><br>
      Justificado: <b>${formatoMin(obj.analisis.minutosJustificados || 0)}</b><br>
      Objetivo: <b>${formatoSeg(obj.objetivoSeg)}</b><br>
      Extra: <b>${formatoSeg(extraSeg)}</b><br>
      Falta: <b>${formatoSeg(faltaSeg)}</b>
    </div>
  `;
}

// ===============================
// RESUMEN ADMIN
// ===============================
function renderAdminResumen(jornadasHoy){
  let totalTrab=0;
  let totalExtra=0;
  let totalFalta=0;
  let abiertas=0;
  let cerradas=0;
  let justificadas=0;

  jornadasHoy.forEach(j=>{
    totalTrab+=Number(j.minutos_trabajados||0);
    totalExtra+=Number(j.minutos_extra||j.horas_extra||0);
    totalFalta+=Number(j.minutos_faltantes||0);

    if(j.estado==="abierta") abiertas++;
    if(j.estado==="cerrada") cerradas++;
    if(Number(j.minutos_justificados||0)>0) justificadas++;
  });

  return `
    <div class="zx_admin_summary">
      <div><b>${jornadasHoy.length}</b><span>Jornadas</span></div>
      <div><b>${abiertas}</b><span>Abiertas</span></div>
      <div><b>${cerradas}</b><span>Cerradas</span></div>
      <div><b>${formatoMin(totalTrab)}</b><span>Trabajado</span></div>
      <div><b>${formatoMin(totalExtra)}</b><span>Extra</span></div>
      <div><b>${formatoMin(totalFalta)}</b><span>Falta</span></div>
      <div><b>${justificadas}</b><span>Justificadas</span></div>
    </div>
  `;
}
// ===============================
// ESTILOS
// ===============================
function estilosFichaje(){
  if(document.getElementById("zx_fichaje_css")) return;

  const s=document.createElement("style");
  s.id="zx_fichaje_css";
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
      font-size:23px;
      color:#0f172a;
      font-weight:900;
    }

    .zx_admin_summary span{
      font-size:13px;
      color:#64748b;
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
      word-break:break-word;
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

    .zx_admin_editar{background:#2563eb}
    .zx_admin_borrar{background:#dc2626}

    .zx_edit_grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:10px;
    }

    .zx_label{
      display:block;
      margin-top:14px;
      margin-bottom:6px;
      color:#64748b;
      font-weight:900;
      font-size:15px;
    }

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.55);
      display:flex;
      justify-content:center;
      align-items:center;
      padding:14px;
      z-index:9999;
    }

    .zx_modal_caja{
      width:100%;
      max-width:520px;
      max-height:90vh;
      overflow-y:auto;
      background:white;
      border-radius:22px;
      padding:20px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);
    }

    .zx_modal_caja select,
    .zx_modal_caja input,
    .zx_modal_caja textarea{
      width:100%;
      border:1px solid #cbd5e1;
      border-radius:14px;
      padding:12px;
      font-size:16px;
      font-weight:800;
      color:#0f172a;
      background:#f8fafc;
    }
  `;
  document.head.appendChild(s);
}

// ===============================
// TOGGLES
// ===============================
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
// ===============================
// PANTALLA PRINCIPAL
// ===============================
window.ZX_fichaje=async function(){
  estilosFichaje();

  const est=await estadoActual();
  const hist=await ultimosFichajes();
  const jornadas=await jornadasUsuario();
  const adminHoy=esAdmin() ? await jornadasAdminHoy() : [];
  const obj=await objetivoDia();

  let resumen={
    trabajadoSeg:0,
    descansoSeg:0,
    comidaSeg:0
  };

  if(est.jornada){
    resumen=calcularEnVivo(est.eventos,est.estado);
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>Fichaje</h2>

      <div class="zx_text">Estado actual:</div>

      <div style="font-size:34px;font-weight:900;color:${colorEstado(est.estado)};margin-top:8px">
        ${textoEstado(est.estado)}
      </div>

      ${
        obj.analisis.bloqueaTodo
        ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">
            Fichaje bloqueado por ausencia aprobada.
          </div>`
        : ""
      }

      ${
        obj.bloqueo.bloqueado
        ? `<div class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;">
            Permiso activo: ${limpiar(obj.bloqueo.inicio)} - ${limpiar(obj.bloqueo.fin)}
          </div>`
        : ""
      }

      <button class="zx_btn_big zx_azul" id="zx_btn_fichar">
        FICHAR
      </button>
    </div>

    <div class="zx_card">
      <h2>Resumen en vivo</h2>

      <div id="zx_resumen_tiempo">
        ${resumenHTML(resumen,obj)}
      </div>
    </div>

    <div class="zx_card">
      <button class="zx_btn_big zx_gris" onclick="ZX_toggleMisJornadas()">
        ${ZX_VER_MIS_JORNADAS ? "Ocultar mis jornadas" : "Ver mis jornadas"}
      </button>

      ${
        ZX_VER_MIS_JORNADAS
        ? (
            jornadas.length
            ? jornadas.map(j=>renderJornadaMini(j,esAdmin())).join("")
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
              ${renderAdminResumen(adminHoy)}

              <h3 style="font-size:24px;margin:18px 0 8px;">
                Hoy
              </h3>

              ${
                adminHoy.length
                ? adminHoy.slice(0,10).map(j=>renderJornadaMini(j,true)).join("")
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

  document.querySelectorAll("[data-borrar-jornada]").forEach(btn=>{
    btn.onclick=function(){
      borrarJornada(btn.dataset.borrarJornada);
    };
  });

  document.querySelectorAll("[data-ver-fichajes-jornada]").forEach(btn=>{
    btn.onclick=function(){
      verFichajesJornada(btn.dataset.verFichajesJornada);
    };
  });
};

// ===============================
// FIN MÓDULO
// ===============================
})();
