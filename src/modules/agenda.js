// ===============================
// ZENTRYX PRO - AGENDA PRO
// V3094 - AGENDA SIMPLE + RÁPIDA + TRABAJOS DIRECTOS
// ===============================
(function(){
"use strict";

let ZX_AGENDA_FECHA=new Date();
let ZX_AGENDA_CACHE=[];
let ZX_AGENDA_FILTRO="todos";
let ZX_AGENDA_CARGANDO=false;

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
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function isoFecha(d){
  const x=new Date(d);
  return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
}

function hoy(){
  return isoFecha(new Date());
}

function normalizarFecha(f){
  if(!f) return "";
  const s=String(f).trim();

  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);

  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){
    const p=s.split("/");
    return p[2]+"-"+p[1]+"-"+p[0];
  }

  return s.slice(0,10);
}

function sumarDias(fecha,dias){
  const d=new Date(fecha+"T12:00:00");
  d.setDate(d.getDate()+dias);
  return isoFecha(d);
}

function formatoFecha(f){
  const x=normalizarFecha(f);
  if(!x) return "";
  const p=x.split("-");
  if(p.length!==3) return limpiar(f);
  return p[2]+"/"+p[1]+"/"+p[0];
}

function nombreMes(d){
  return d.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
}

function primerDiaMes(d){
  return new Date(d.getFullYear(),d.getMonth(),1);
}

function ultimoDiaMes(d){
  return new Date(d.getFullYear(),d.getMonth()+1,0);
}

function cerrarModalAgenda(){
  const m=document.getElementById("zx_modal_agenda");
  if(m) m.remove();
}

function hashPin(pin){
  return btoa(String(pin));
}

function esEventoTrabajo(e){
  return String(e?.tipo || "")==="trabajo" &&
         String(e?.origen || "")==="trabajos" &&
         String(e?.origen_id || "");
}

function esEventoSistema(e){
  const origen=String(e?.origen || "");
  const tipo=String(e?.tipo || "");
  return tipo==="festivo" ||
         origen==="festivos" ||
         origen==="calendario_festivos" ||
         origen==="empresa_festivos" ||
         origen==="solicitudes";
}

function minHora(h){
  if(!h) return null;
  const p=String(h).slice(0,5).split(":");
  if(p.length!==2) return null;

  const hh=Number(p[0]);
  const mm=Number(p[1]);

  if(Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh*60+mm;
}

function rangosSolapan(aInicio,aFin,bInicio,bFin){
  const ai=minHora(aInicio);
  const af=minHora(aFin);
  const bi=minHora(bInicio);
  const bf=minHora(bFin);

  if(ai===null || af===null || bi===null || bf===null) return false;
  return ai<bf && bi<af;
}

function textoTipo(tipo){
  const m={
    trabajo:"Trabajo",
    cita:"Cita",
    vacaciones:"Vacaciones",
    asuntos_propios:"Asuntos propios",
    permiso:"Permiso",
    baja_medica:"Baja médica",
    recordatorio:"Nota",
    revision:"Revisión",
    solicitud:"Solicitud",
    libranza:"Libranza",
    festivo:"Festivo"
  };

  return m[tipo] || tipo || "Evento";
}

function estadoNormalizado(e){
  const x=String(e || "activo").toLowerCase().trim();

  if(x==="completado" || x==="terminado" || x==="finalizado") return "terminado";
  if(x==="cancelado" || x==="bloqueado") return "cancelado";
  if(x==="pendiente") return "pendiente";
  if(x==="en_curso" || x==="en curso") return "en_curso";

  return "activo";
}

function textoEstado(e){
  const x=estadoNormalizado(e);

  const m={
    activo:"Activo",
    pendiente:"Pendiente",
    en_curso:"En curso",
    terminado:"Terminado",
    cancelado:"Cancelado"
  };

  return m[x] || "Activo";
}

function claseEstado(e){
  return "zx_ag_estado_"+estadoNormalizado(e);
}

function colorTipo(tipo){
  const t=String(tipo||"").toLowerCase();

  if(t==="trabajo") return "zx_ag_tipo_trabajo";
  if(t==="cita") return "zx_ag_tipo_cita";
  if(t==="vacaciones") return "zx_ag_tipo_vacaciones";
  if(t==="asuntos_propios") return "zx_ag_tipo_asuntos";
  if(t==="permiso") return "zx_ag_tipo_permiso";
  if(t==="baja_medica") return "zx_ag_tipo_baja";
  if(t==="recordatorio") return "zx_ag_tipo_recordatorio";
  if(t==="revision") return "zx_ag_tipo_revision";
  if(t==="festivo") return "zx_ag_tipo_festivo";
  if(t==="libranza") return "zx_ag_tipo_libranza";

  return "zx_ag_tipo_default";
}

function colorOperario(e){
  const base=String(e.usuario_id || e.usuario || "").trim();
  if(!base) return "zx_ag_usr_0";

  let n=0;
  for(let i=0;i<base.length;i++){
    n=(n+base.charCodeAt(i))%8;
  }

  return "zx_ag_usr_"+n;
}

function eventosDia(fecha){
  const f=normalizarFecha(fecha);

  return ZX_AGENDA_CACHE.filter(e=>{
    const ini=normalizarFecha(e.fecha_inicio);
    const fin=normalizarFecha(e.fecha_fin || e.fecha_inicio);
    return f>=ini && f<=fin;
  });
}

function filtrarEventos(lista){
  if(ZX_AGENDA_FILTRO==="todos") return lista;

  if(ZX_AGENDA_FILTRO==="ausencias"){
    return lista.filter(e=>{
      const t=String(e.tipo||"");
      return ["vacaciones","asuntos_propios","permiso","baja_medica","libranza"].includes(t);
    });
  }

  return lista.filter(e=>String(e.tipo||"")===ZX_AGENDA_FILTRO);
}

async function cargarUsuariosAgenda(){
  const r=await sb()
    .from("usuarios")
    .select("id,nombre,usuario,rol,estado,activo")
    .eq("activo",true)
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarClientesAgenda(){
  const r=await sb()
    .from("clientes")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarVehiculosAgenda(){
  const r=await sb()
    .from("vehiculos")
    .select("*")
    .order("matricula",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

function nombreCliente(c){
  return c.nombre || c.razon_social || c.cliente || c.empresa || c.nombre_comercial || "";
}

function nombreVehiculo(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ");
}

function opcionesUsuarios(lista,valor){
  return `
    <option value="">Sin asignar</option>
    ${lista.map(u=>{
      const nombre=u.nombre || u.usuario || "";
      const texto=nombre+(u.rol ? " · "+u.rol : "");
      return `<option value="${limpiar(nombre)}" data-id="${limpiar(u.id)}" ${String(valor||"")===String(nombre)?"selected":""}>${limpiar(texto)}</option>`;
    }).join("")}
  `;
}

function opcionesClientes(lista,valor){
  return `
    <option value="">Sin cliente</option>
    ${lista.map(c=>{
      const nombre=nombreCliente(c);
      return `<option value="${limpiar(nombre)}" data-id="${limpiar(c.id||"")}" ${String(valor||"")===String(nombre)?"selected":""}>${limpiar(nombre)}</option>`;
    }).join("")}
  `;
}

function opcionesVehiculos(lista,valor){
  return `
    <option value="">Sin vehículo</option>
    ${lista.map(v=>{
      const nombre=nombreVehiculo(v);
      return `<option value="${limpiar(nombre)}" data-id="${limpiar(v.id||"")}" ${String(valor||"")===String(nombre)?"selected":""}>${limpiar(nombre)}</option>`;
    }).join("")}
  `;
}

async function cargarEventos(){
  const inicio=isoFecha(primerDiaMes(ZX_AGENDA_FECHA));
  const fin=isoFecha(ultimoDiaMes(ZX_AGENDA_FECHA));
  const desde=sumarDias(inicio,-10);
  const hasta=sumarDias(fin,20);

  const s=sesion();

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",hasta)
    .gte("fecha_fin",desde)
    .order("fecha_inicio",{ascending:true})
    .order("hora_inicio",{ascending:true});

  if(r.error){
    alert("Error cargando agenda: "+r.error.message);
    return [];
  }

  let datos=r.data || [];

  if(!esAdmin()){
    datos=datos.filter(e=>{
      return String(e.visible_para||"todos")==="todos" ||
             String(e.usuario_id||"")===String(s.id);
    });
  }

  ZX_AGENDA_CACHE=datos;
  return datos;
}

async function comprobarSolapes(data,idActual=null){
  if(!data.fecha_inicio || !data.hora_inicio || !data.hora_fin) return true;

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",data.fecha_fin || data.fecha_inicio)
    .gte("fecha_fin",data.fecha_inicio);

  if(r.error){
    alert("No se pudieron comprobar solapes: "+r.error.message);
    return false;
  }

  const eventos=(r.data || []).filter(e=>{
    if(String(e.id)===String(idActual || "")) return false;

    if(estadoNormalizado(e.estado)==="cancelado") return false;

    const tipo=String(e.tipo || "");
    if(["festivo","vacaciones","asuntos_propios","permiso","baja_medica","libranza"].includes(tipo)){
      return false;
    }

    return true;
  });

  const solapeOperario=eventos.find(e=>{
    const mismoId=data.usuario_id && e.usuario_id && String(e.usuario_id)===String(data.usuario_id);
    const mismoNombre=!data.usuario_id && data.usuario && e.usuario && String(e.usuario)===String(data.usuario);

    if(!mismoId && !mismoNombre) return false;
    return rangosSolapan(data.hora_inicio,data.hora_fin,e.hora_inicio,e.hora_fin);
  });

  if(solapeOperario){
    alert(
      "El operario ya tiene otro evento en ese horario:\n\n"+
      (solapeOperario.titulo || "Evento")+" "+
      String(solapeOperario.hora_inicio || "").slice(0,5)+" - "+
      String(solapeOperario.hora_fin || "").slice(0,5)
    );
    return false;
  }

  const solapeVehiculo=eventos.find(e=>{
    const mismoId=data.vehiculo_id && e.vehiculo_id && String(e.vehiculo_id)===String(data.vehiculo_id);
    const mismoNombre=!data.vehiculo_id && data.vehiculo && e.vehiculo && String(e.vehiculo)===String(data.vehiculo);

    if(!mismoId && !mismoNombre) return false;
    return rangosSolapan(data.hora_inicio,data.hora_fin,e.hora_inicio,e.hora_fin);
  });

  if(solapeVehiculo){
    alert(
      "El vehículo ya está asignado en ese horario:\n\n"+
      (solapeVehiculo.titulo || "Evento")+" "+
      String(solapeVehiculo.hora_inicio || "").slice(0,5)+" - "+
      String(solapeVehiculo.hora_fin || "").slice(0,5)
    );
    return false;
  }

  return true;
}

async function pedirPinAdminAgenda(){
  return new Promise(function(resolve){
    cerrarModalAgenda();

    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_agenda" class="zx_modal_fondo">
        <div class="zx_modal_caja zx_ag_modal_simple">
          <h2>PIN administrador</h2>
          <div class="zx_text">Introduce el PIN para continuar.</div>
          <input id="ag_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
          <button class="zx_btn_big zx_verde" id="ag_pin_ok">Confirmar</button>
          <button class="zx_btn_big zx_gris" id="ag_pin_cancelar">Cancelar</button>
        </div>
      </div>
    `);

    document.getElementById("ag_pin_cancelar").onclick=function(){
      cerrarModalAgenda();
      resolve(false);
    };

    document.getElementById("ag_pin_ok").onclick=async function(){
      const pin=document.getElementById("ag_pin_admin").value.trim();

      if(!/^[0-9]{4}$/.test(pin)){
        alert("PIN inválido.");
        return;
      }

      const s=sesion();

      const r=await sb()
        .from("usuarios")
        .select("id,usuario,rol,pin_hash")
        .eq("id",s.id)
        .maybeSingle();

      if(r.error || !r.data){
        alert("No se pudo validar usuario.");
        return;
      }

      const rol=String(r.data.rol || "").toLowerCase();
      const usuario=String(r.data.usuario || "").toLowerCase();
      const admin=rol==="administrador" || usuario==="admin";

      if(!admin){
        alert("Solo administrador.");
        return;
      }

      if(hashPin(pin)!==r.data.pin_hash){
        alert("PIN incorrecto.");
        return;
      }

      cerrarModalAgenda();
      resolve(true);
    };
  });
}

async function guardarEvento(id=null){
  const s=sesion();

  const selUsuario=document.getElementById("ag_usuario");
  const selCliente=document.getElementById("ag_cliente");
  const selVehiculo=document.getElementById("ag_vehiculo");

  const usuarioOpt=selUsuario.options[selUsuario.selectedIndex];
  const clienteOpt=selCliente.options[selCliente.selectedIndex];
  const vehiculoOpt=selVehiculo.options[selVehiculo.selectedIndex];

  const data={
    tipo:document.getElementById("ag_tipo").value,
    titulo:document.getElementById("ag_titulo").value.trim(),
    descripcion:document.getElementById("ag_desc").value.trim(),
    fecha_inicio:normalizarFecha(document.getElementById("ag_fecha_inicio").value),
    fecha_fin:normalizarFecha(document.getElementById("ag_fecha_fin").value || document.getElementById("ag_fecha_inicio").value),
    hora_inicio:document.getElementById("ag_hora_inicio").value || null,
    hora_fin:document.getElementById("ag_hora_fin").value || null,
    usuario:selUsuario.value,
    usuario_id:usuarioOpt ? String(usuarioOpt.dataset.id || "") : "",
    cliente:selCliente.value,
    cliente_id:clienteOpt ? String(clienteOpt.dataset.id || "") : "",
    vehiculo:selVehiculo.value,
    vehiculo_id:vehiculoOpt ? String(vehiculoOpt.dataset.id || "") : "",
    prioridad:document.getElementById("ag_prioridad").value,
    visible_para:document.getElementById("ag_visible").value,
    estado:id ? estadoNormalizado(document.getElementById("ag_estado").value) : "activo",
    creado_por:s.usuario || "",
    origen:id ? "manual_editado" : "manual"
  };

  if(data.tipo==="trabajo"){
    alert("Los trabajos se crean desde Trabajos.");
    cerrarModalAgenda();
    if(window.ZX_trabajos) window.ZX_trabajos();
    return;
  }

  if(!data.titulo || !data.fecha_inicio){
    alert("Título y fecha son obligatorios.");
    return;
  }

  if(data.visible_para==="usuario" && !data.usuario_id){
    alert("Selecciona un operario.");
    return;
  }

  if(data.hora_inicio && data.hora_fin && minHora(data.hora_fin)<=minHora(data.hora_inicio)){
    alert("La hora fin debe ser posterior a la hora inicio.");
    return;
  }

  const okSolape=await comprobarSolapes(data,id);
  if(!okSolape) return;

  let r;

  if(id){
    r=await sb()
      .from("agenda_eventos")
      .update(data)
      .eq("id",id);
  }else{
    r=await sb()
      .from("agenda_eventos")
      .insert([data]);
  }

  if(r.error){
    alert("Error guardando evento: "+r.error.message);
    return;
  }

  cerrarModalAgenda();
  await ZX_agenda(true);
}

async function abrirModalEvento(e=null,fecha=null){
  cerrarModalAgenda();

  if(esEventoTrabajo(e)){
    ZX_ag_abrirTrabajo(e.origen_id);
    return;
  }

  const isEdit=!!e;
  const soloLecturaSistema=esEventoSistema(e) && String(e?.origen || "")!=="manual" && String(e?.origen || "")!=="manual_editado";

  const usuarios=await cargarUsuariosAgenda();
  const clientes=await cargarClientesAgenda();
  const vehiculos=await cargarVehiculosAgenda();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_agenda" class="zx_modal_fondo">
      <div class="zx_modal_caja zx_ag_modal_form">
        <h2>${isEdit ? "Editar evento" : "Nuevo evento"}</h2>

        ${
          soloLecturaSistema
          ? `<div class="zx_ag_aviso">Este evento viene del sistema. Solo se puede ver.</div>`
          : `<div class="zx_ag_aviso">Para crear una obra real, usa Trabajos. Desde Agenda crea citas, notas, ausencias y revisiones.</div>`
        }

        <label class="zx_ag_label">Tipo</label>
        <select id="ag_tipo" ${soloLecturaSistema ? "disabled" : ""}>
          <option value="cita" ${e?.tipo==="cita"?"selected":""}>Cita</option>
          <option value="recordatorio" ${e?.tipo==="recordatorio"?"selected":""}>Nota</option>
          <option value="revision" ${e?.tipo==="revision"?"selected":""}>Revisión</option>
          <option value="vacaciones" ${e?.tipo==="vacaciones"?"selected":""}>Vacaciones</option>
          <option value="asuntos_propios" ${e?.tipo==="asuntos_propios"?"selected":""}>Asuntos propios</option>
          <option value="permiso" ${e?.tipo==="permiso"?"selected":""}>Permiso</option>
          <option value="baja_medica" ${e?.tipo==="baja_medica"?"selected":""}>Baja médica</option>
          <option value="libranza" ${e?.tipo==="libranza"?"selected":""}>Libranza</option>
          <option value="festivo" ${e?.tipo==="festivo"?"selected":""}>Festivo</option>
        </select>

        <label class="zx_ag_label">Título</label>
        <input id="ag_titulo" value="${limpiar(e?.titulo || "")}" placeholder="Título" ${soloLecturaSistema ? "readonly" : ""}>

        <label class="zx_ag_label">Descripción</label>
        <textarea id="ag_desc" rows="3" placeholder="Notas, dirección o detalles..." ${soloLecturaSistema ? "readonly" : ""}>${limpiar(e?.descripcion || "")}</textarea>

        <label class="zx_ag_label">Fecha inicio</label>
        <input id="ag_fecha_inicio" type="date" value="${limpiar(normalizarFecha(e?.fecha_inicio || fecha || hoy()))}" ${soloLecturaSistema ? "readonly" : ""}>

        <label class="zx_ag_label">Fecha fin</label>
        <input id="ag_fecha_fin" type="date" value="${limpiar(normalizarFecha(e?.fecha_fin || e?.fecha_inicio || fecha || hoy()))}" ${soloLecturaSistema ? "readonly" : ""}>

        <div class="zx_ag_grid2">
          <div>
            <label class="zx_ag_label">Hora inicio</label>
            <input id="ag_hora_inicio" type="time" value="${limpiar(e?.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}" ${soloLecturaSistema ? "readonly" : ""}>
          </div>

          <div>
            <label class="zx_ag_label">Hora fin</label>
            <input id="ag_hora_fin" type="time" value="${limpiar(e?.hora_fin ? String(e.hora_fin).slice(0,5) : "")}" ${soloLecturaSistema ? "readonly" : ""}>
          </div>
        </div>

        <label class="zx_ag_label">Operario</label>
        <select id="ag_usuario" ${soloLecturaSistema ? "disabled" : ""}>
          ${opcionesUsuarios(usuarios,e?.usuario || "")}
        </select>

        <label class="zx_ag_label">Cliente</label>
        <select id="ag_cliente" ${soloLecturaSistema ? "disabled" : ""}>
          ${opcionesClientes(clientes,e?.cliente || "")}
        </select>

        <label class="zx_ag_label">Vehículo</label>
        <select id="ag_vehiculo" ${soloLecturaSistema ? "disabled" : ""}>
          ${opcionesVehiculos(vehiculos,e?.vehiculo || "")}
        </select>

        <label class="zx_ag_label">Prioridad</label>
        <select id="ag_prioridad" ${soloLecturaSistema ? "disabled" : ""}>
          <option value="normal" ${e?.prioridad==="normal"?"selected":""}>Normal</option>
          <option value="alta" ${e?.prioridad==="alta"?"selected":""}>Alta</option>
          <option value="baja" ${e?.prioridad==="baja"?"selected":""}>Baja</option>
        </select>

        <label class="zx_ag_label">Visible para</label>
        <select id="ag_visible" ${soloLecturaSistema ? "disabled" : ""}>
          <option value="todos" ${e?.visible_para==="todos"?"selected":""}>Todos</option>
          <option value="admin" ${e?.visible_para==="admin"?"selected":""}>Solo admin</option>
          <option value="usuario" ${e?.visible_para==="usuario"?"selected":""}>Usuario</option>
        </select>

        <input id="ag_estado" type="hidden" value="${limpiar(estadoNormalizado(e?.estado || "activo"))}">

        ${
          soloLecturaSistema
          ? `<button class="zx_btn_big zx_gris" id="ag_cerrar_sistema">Cerrar</button>`
          : `<button class="zx_btn_big zx_verde" id="ag_guardar">Guardar</button>
             <button class="zx_btn_big zx_gris" id="ag_cancelar">Cancelar</button>`
        }
      </div>
    </div>
  `);

  if(soloLecturaSistema){
    document.getElementById("ag_cerrar_sistema").onclick=cerrarModalAgenda;
  }else{
    document.getElementById("ag_cancelar").onclick=cerrarModalAgenda;
    document.getElementById("ag_guardar").onclick=function(){
      guardarEvento(isEdit ? e.id : null);
    };
  }
}

async function cambiarEstado(id,estado){
  const e=ZX_AGENDA_CACHE.find(x=>String(x.id)===String(id));

  if(!e){
    alert("Evento no encontrado.");
    return;
  }

  if(esEventoTrabajo(e)){
    ZX_ag_abrirTrabajo(e.origen_id);
    return;
  }

  if(esEventoSistema(e)){
    alert("Este evento se gestiona desde su módulo.");
    return;
  }

  const r=await sb()
    .from("agenda_eventos")
    .update({
      estado:estado,
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(r.error){
    alert("Error actualizando evento: "+r.error.message);
    return;
  }

  cerrarModalAgenda();
  await ZX_agenda(true);
}

async function borrarEvento(id){
  const e=ZX_AGENDA_CACHE.find(x=>String(x.id)===String(id));

  if(!e){
    alert("Evento no encontrado.");
    return;
  }

  if(esEventoTrabajo(e)){
    ZX_ag_abrirTrabajo(e.origen_id);
    return;
  }

  if(esEventoSistema(e)){
    alert("Este evento se gestiona desde su módulo.");
    return;
  }

  const ok=await pedirPinAdminAgenda();
  if(!ok) return;

  if(!confirm("¿Eliminar evento?")) return;

  const r=await sb()
    .from("agenda_eventos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando evento: "+r.error.message);
    return;
  }

  cerrarModalAgenda();
  await ZX_agenda(true);
}

window.ZX_ag_nuevo=function(fecha){
  abrirModalEvento(null,fecha || hoy());
};

window.ZX_ag_verDia=function(fecha){
  const eventos=filtrarEventos(eventosDia(fecha));

  if(eventos.length===1 && esEventoTrabajo(eventos[0])){
    ZX_ag_abrirTrabajo(eventos[0].origen_id);
    return;
  }

  cerrarModalAgenda();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_agenda" class="zx_modal_fondo">
      <div class="zx_modal_caja zx_ag_modal_dia">
        <h2>${formatoFecha(fecha)}</h2>

        ${
          eventos.length
          ? eventos.map(e=>renderEvento(e,true)).join("")
          : `<div class="zx_text">Sin eventos este día.</div>`
        }

        <button class="zx_btn_big zx_verde" onclick="ZX_ag_nuevo('${fecha}')">Añadir evento este día</button>
        <button class="zx_btn_big zx_gris" onclick="document.getElementById('zx_modal_agenda').remove()">Cerrar</button>
      </div>
    </div>
  `);
};

window.ZX_ag_editar=function(id){
  const e=ZX_AGENDA_CACHE.find(x=>String(x.id)===String(id));
  if(e) abrirModalEvento(e);
};

window.ZX_ag_completar=function(id){
  cambiarEstado(id,"terminado");
};

window.ZX_ag_cancelar=function(id){
  cambiarEstado(id,"cancelado");
};

window.ZX_ag_borrar=function(id){
  borrarEvento(id);
};

window.ZX_ag_abrirTrabajo=function(id){
  cerrarModalAgenda();

  if(!id){
    alert("No se encontró la obra vinculada.");
    return;
  }

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_agenda" class="zx_modal_fondo">
      <div class="zx_modal_caja zx_ag_modal_simple">
        <h2>Abriendo obra</h2>
        <div class="zx_text">Cargando ficha de trabajo...</div>
      </div>
    </div>
  `);

  localStorage.setItem("zentryx_trabajo_directo",String(id));

  if(!window.ZX_trabajos){
    cerrarModalAgenda();
    alert("No se ha cargado Trabajos.");
    return;
  }

  window.ZX_trabajos();

  let intentos=0;

  const abrir=setInterval(function(){
    intentos++;

    if(window.ZX_editarTrabajo){
      clearInterval(abrir);
      cerrarModalAgenda();
      window.ZX_editarTrabajo(id);
      return;
    }

    if(intentos>=20){
      clearInterval(abrir);
      cerrarModalAgenda();
      alert("No se pudo abrir la ficha directa. Hay que ajustar trabajos.js.");
    }
  },150);
};

window.ZX_ag_mesAnterior=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()-1);
  ZX_agenda(true);
};

window.ZX_ag_mesSiguiente=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()+1);
  ZX_agenda(true);
};

window.ZX_ag_hoy=function(){
  ZX_AGENDA_FECHA=new Date();
  ZX_agenda(true);
};

window.ZX_ag_filtro=function(tipo){
  ZX_AGENDA_FILTRO=tipo;
  pintarAgenda();
};

function renderEvento(e,enModal=false){
  const trabajoVinculado=esEventoTrabajo(e);
  const sistema=esEventoSistema(e);
  const estado=estadoNormalizado(e.estado);
  const terminado=estado==="terminado";
  const cancelado=estado==="cancelado";

  const clase=[
    "zx_ag_evento",
    colorTipo(e.tipo),
    colorOperario(e),
    claseEstado(e)
  ].join(" ");

  return `
    <div class="${clase}">
      <div class="zx_ag_evento_top">
        <b>${limpiar(e.titulo || "Evento")}</b>
        <span>${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}</span>
      </div>

      <div class="zx_ag_evento_txt">
        ${limpiar(textoTipo(e.tipo))} · ${limpiar(textoEstado(e.estado))}
        ${trabajoVinculado ? "<br><b>Obra vinculada</b>" : ""}
        ${e.usuario ? "<br>Operario: "+limpiar(e.usuario) : ""}
        ${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}
        ${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}
        ${e.descripcion ? "<br>"+limpiar(e.descripcion) : ""}
      </div>

      <div class="zx_ag_actions">
        ${
          trabajoVinculado
          ? `<button class="zx_ag_btn zx_ag_btn_blue zx_ag_btn_full" onclick="ZX_ag_abrirTrabajo('${limpiar(e.origen_id)}')">Abrir obra</button>`
          : sistema
            ? `<button class="zx_ag_btn zx_ag_btn_blue zx_ag_btn_full" onclick="ZX_ag_editar('${limpiar(e.id)}')">Ver</button>`
            : `
              <button class="zx_ag_btn zx_ag_btn_blue" onclick="ZX_ag_editar('${limpiar(e.id)}')">Editar</button>
              ${terminado ? "" : `<button class="zx_ag_btn zx_ag_btn_green" onclick="ZX_ag_completar('${limpiar(e.id)}')">Hecho</button>`}
              ${cancelado ? "" : `<button class="zx_ag_btn zx_ag_btn_orange" onclick="ZX_ag_cancelar('${limpiar(e.id)}')">Cancelar</button>`}
              <button class="zx_ag_btn zx_ag_btn_red" onclick="ZX_ag_borrar('${limpiar(e.id)}')">Borrar</button>
            `
        }
      </div>
    </div>
  `;
}

function renderCalendario(){
  const inicio=primerDiaMes(ZX_AGENDA_FECHA);
  const fin=ultimoDiaMes(ZX_AGENDA_FECHA);
  const primer=(inicio.getDay()+6)%7;
  const diasMes=fin.getDate();

  let html=`
    <div class="zx_card zx_ag_card_cal">
      <div class="zx_ag_head">
        <button onclick="ZX_ag_mesAnterior()">‹</button>
        <div>
          <h2>${limpiar(nombreMes(ZX_AGENDA_FECHA))}</h2>
          <button class="zx_ag_hoy_btn" onclick="ZX_ag_hoy()">Hoy</button>
        </div>
        <button onclick="ZX_ag_mesSiguiente()">›</button>
      </div>

      ${ZX_AGENDA_CARGANDO ? `<div class="zx_ag_loading">Actualizando agenda...</div>` : ""}

      <div class="zx_ag_weekdays">
        <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div>
      </div>

      <div class="zx_ag_calendar">
  `;

  for(let i=0;i<primer;i++){
    html+=`<div class="zx_ag_day zx_ag_empty"></div>`;
  }

  for(let d=1;d<=diasMes;d++){
    const fecha=isoFecha(new Date(ZX_AGENDA_FECHA.getFullYear(),ZX_AGENDA_FECHA.getMonth(),d));
    const evs=filtrarEventos(eventosDia(fecha));
    const claseHoy=fecha===hoy() ? "zx_ag_today" : "";

    html+=`
      <div class="zx_ag_day ${claseHoy}" onclick="ZX_ag_verDia('${fecha}')">
        <div class="zx_ag_day_num">${d}</div>
        ${
          evs.slice(0,3).map(e=>{
            const estado=estadoNormalizado(e.estado);
            const marca=estado==="terminado" ? "✓ " : estado==="cancelado" ? "✕ " : "";
            return `
              <div class="zx_ag_dot ${colorTipo(e.tipo)} ${colorOperario(e)} ${claseEstado(e)}">
                ${marca}${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5)+" " : "")}${limpiar(e.titulo||"")}
              </div>
            `;
          }).join("")
        }
        ${evs.length>3 ? `<div class="zx_ag_more">+${evs.length-3}</div>` : ""}
      </div>
    `;
  }

  html+=`
      </div>
    </div>
  `;

  return html;
}

function renderListas(){
  const hoyF=hoy();
  const manana=sumarDias(hoyF,1);
  const siete=sumarDias(hoyF,7);

  const hoyEventos=filtrarEventos(eventosDia(hoyF));
  const mananaEventos=filtrarEventos(eventosDia(manana));
  const proximos=filtrarEventos(ZX_AGENDA_CACHE.filter(e=>{
    const f=normalizarFecha(e.fecha_inicio);
    return f>manana && f<=siete && estadoNormalizado(e.estado)!=="cancelado";
  }));

  return `
    <div class="zx_card">
      <h2>Hoy</h2>
      ${hoyEventos.length ? hoyEventos.map(e=>renderEvento(e)).join("") : `<div class="zx_text">Sin eventos para hoy.</div>`}
    </div>

    <div class="zx_card">
      <h2>Mañana</h2>
      ${mananaEventos.length ? mananaEventos.map(e=>renderEvento(e)).join("") : `<div class="zx_text">Sin eventos para mañana.</div>`}
    </div>

    <div class="zx_card">
      <h2>Próximos 7 días</h2>
      ${proximos.length ? proximos.map(e=>renderEvento(e)).join("") : `<div class="zx_text">Sin próximos eventos.</div>`}
    </div>
  `;
}

function renderFiltros(){
  const tipos=[
    ["todos","Todos"],
    ["trabajo","Trabajos"],
    ["cita","Citas"],
    ["recordatorio","Notas"],
    ["ausencias","Ausencias"],
    ["festivo","Festivos"]
  ];

  return `
    <div class="zx_card zx_ag_top_card">
      <h2>Agenda</h2>
      <div class="zx_text">Vista rápida de trabajos, citas, notas, ausencias y festivos.</div>

      <button class="zx_btn_big zx_verde" onclick="ZX_ag_nuevo('${hoy()}')">Nuevo evento</button>

      <div class="zx_ag_filters">
        ${tipos.map(t=>`
          <button class="${ZX_AGENDA_FILTRO===t[0] ? "activo" : ""}" onclick="ZX_ag_filtro('${t[0]}')">
            ${t[1]}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLeyenda(){
  if(!esAdmin()) return "";

  const nombres={};

  ZX_AGENDA_CACHE.forEach(e=>{
    const k=String(e.usuario_id || e.usuario || "").trim();
    if(!k) return;
    nombres[k]=e.usuario || "Sin nombre";
  });

  const claves=Object.keys(nombres);

  if(!claves.length) return "";

  return `
    <div class="zx_card zx_ag_leyenda">
      <h2>Operarios</h2>
      <div class="zx_ag_leyenda_grid">
        ${claves.map(k=>{
          const fake={usuario_id:k,usuario:nombres[k]};
          return `
            <div class="zx_ag_leyenda_item">
              <span class="zx_ag_color ${colorOperario(fake)}"></span>
              <b>${limpiar(nombres[k])}</b>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function pintarAgenda(){
  if(!app()) return;

  app().innerHTML=`
    ${renderFiltros()}
    ${renderLeyenda()}
    ${renderCalendario()}
    ${renderListas()}
  `;
}

window.ZX_agenda=async function(forzar=false){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="agenda") b.classList.add("zx_activo");
  });

  ZX_AGENDA_CARGANDO=true;
  pintarAgenda();

  await cargarEventos();

  ZX_AGENDA_CARGANDO=false;
  pintarAgenda();
};

(function(){
  if(document.getElementById("zx_agenda_css_v3094")) return;

  const s=document.createElement("style");
  s.id="zx_agenda_css_v3094";

  s.innerHTML=`
    .zx_ag_head{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .zx_ag_head button{border:0;border-radius:16px;background:#2563eb;color:white;font-size:30px;font-weight:900;width:58px;height:58px}
    .zx_ag_hoy_btn{width:auto!important;height:auto!important;padding:8px 16px!important;font-size:15px!important;background:#64748b!important}

    .zx_ag_loading{
      margin-top:12px;
      padding:10px 14px;
      border-radius:14px;
      background:#e0f2fe;
      color:#075985;
      font-weight:900;
    }

    .zx_ag_weekdays,
    .zx_ag_calendar{
      display:grid;
      grid-template-columns:repeat(7,1fr);
      gap:6px;
      margin-top:12px;
    }

    .zx_ag_weekdays div{
      text-align:center;
      color:#64748b;
      font-weight:900;
      font-size:13px;
    }

    .zx_ag_day{
      min-height:92px;
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:14px;
      padding:7px;
      overflow:hidden;
      cursor:pointer;
    }

    .zx_ag_empty{background:transparent;border:0}
    .zx_ag_today{border:3px solid #2563eb;background:#eff6ff}
    .zx_ag_day_num{font-size:15px;font-weight:900;margin-bottom:5px;color:#0f172a}

    .zx_ag_dot{
      color:white;
      border-radius:8px;
      padding:3px 5px;
      font-size:11px;
      font-weight:900;
      margin-top:3px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .zx_ag_more{
      font-size:11px;
      font-weight:900;
      color:#64748b;
      margin-top:3px;
    }

    .zx_ag_filters{
      display:flex;
      gap:8px;
      overflow-x:auto;
      margin-top:16px;
      padding-bottom:4px;
    }

    .zx_ag_filters button{
      border:0;
      border-radius:999px;
      padding:10px 14px;
      background:#e2e8f0;
      color:#0f172a;
      font-weight:900;
      white-space:nowrap;
    }

    .zx_ag_filters button.activo{
      background:#2563eb;
      color:white;
    }

    .zx_ag_evento{
      border-radius:18px;
      padding:14px;
      margin-top:12px;
      color:white;
    }

    .zx_ag_evento_top{
      display:flex;
      justify-content:space-between;
      gap:8px;
      font-size:18px;
      font-weight:900;
    }

    .zx_ag_evento_txt{
      margin-top:8px;
      line-height:1.4;
      font-size:15px;
      font-weight:750;
    }

    .zx_ag_actions{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin-top:12px;
    }

    .zx_ag_btn{
      border:0;
      border-radius:14px;
      padding:11px;
      color:white;
      font-size:15px;
      font-weight:900;
    }

    .zx_ag_btn_full{grid-column:1/-1}
    .zx_ag_btn_blue{background:#2563eb}
    .zx_ag_btn_green{background:#16a34a}
    .zx_ag_btn_orange{background:#ea580c}
    .zx_ag_btn_red{background:#dc2626}

    .zx_ag_tipo_trabajo{background:#2563eb}
    .zx_ag_tipo_cita{background:#7c3aed}
    .zx_ag_tipo_vacaciones{background:#16a34a}
    .zx_ag_tipo_asuntos{background:#0ea5e9}
    .zx_ag_tipo_permiso{background:#f59e0b}
    .zx_ag_tipo_baja{background:#dc2626}
    .zx_ag_tipo_recordatorio{background:#64748b}
    .zx_ag_tipo_revision{background:#0f766e}
    .zx_ag_tipo_festivo{background:#9333ea}
    .zx_ag_tipo_libranza{background:#0891b2}
    .zx_ag_tipo_default{background:#334155}

    .zx_ag_usr_0{box-shadow:inset 0 0 0 3px rgba(255,255,255,.22)}
    .zx_ag_usr_1{filter:hue-rotate(25deg)}
    .zx_ag_usr_2{filter:hue-rotate(55deg)}
    .zx_ag_usr_3{filter:hue-rotate(85deg)}
    .zx_ag_usr_4{filter:hue-rotate(125deg)}
    .zx_ag_usr_5{filter:hue-rotate(165deg)}
    .zx_ag_usr_6{filter:hue-rotate(215deg)}
    .zx_ag_usr_7{filter:hue-rotate(280deg)}

    .zx_ag_estado_terminado{
      opacity:.58;
      text-decoration:line-through;
    }

    .zx_ag_estado_cancelado{
      opacity:.45;
      background:#991b1b!important;
      text-decoration:line-through;
    }

    .zx_ag_label{
      display:block;
      margin-top:14px;
      margin-bottom:6px;
      font-size:15px;
      font-weight:900;
      color:#475569;
    }

    .zx_ag_grid2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    .zx_ag_aviso{
      background:#fff7ed;
      border:1px solid #fed7aa;
      color:#9a3412;
      border-radius:18px;
      padding:14px;
      margin-bottom:14px;
      font-size:16px;
      font-weight:900;
      line-height:1.35;
    }

    .zx_ag_leyenda_grid{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:12px;
    }

    .zx_ag_leyenda_item{
      display:flex;
      align-items:center;
      gap:8px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:999px;
      padding:8px 12px;
    }

    .zx_ag_color{
      width:18px;
      height:18px;
      border-radius:50%;
      background:#2563eb;
      display:inline-block;
    }

    #zx_modal_agenda select,
    #zx_modal_agenda input,
    #zx_modal_agenda textarea{
      width:100%;
      border:1px solid #cbd5e1;
      border-radius:14px;
      padding:12px;
      font-size:16px;
      font-weight:800;
      color:#0f172a;
      background:#f8fafc;
    }

    .zx_ag_modal_simple{
      max-width:520px;
    }

    @media(max-width:430px){
      .zx_ag_day{min-height:78px;padding:5px}
      .zx_ag_dot{font-size:9px;padding:2px 4px}
      .zx_ag_day_num{font-size:13px}
      .zx_ag_actions{grid-template-columns:1fr}
      .zx_ag_grid2{grid-template-columns:1fr}
    }
  `;

  document.head.appendChild(s);
})();

})();