// ===============================
// ZENTRYX PRO - AGENDA PRO
// V3090 - SELECTORES + SOLAPES + AGENDA ↔ TRABAJOS PROTEGIDO
// ===============================
(function(){
"use strict";

let ZX_AGENDA_FECHA=new Date();
let ZX_AGENDA_CACHE=[];
let ZX_AGENDA_FILTRO="todos";

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

function sumarDias(fecha,dias){
  const d=new Date(fecha+"T12:00:00");
  d.setDate(d.getDate()+dias);
  return isoFecha(d);
}

function formatoFecha(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
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

function minHora(h){
  if(!h) return null;
  const p=String(h).slice(0,5).split(":");
  if(p.length!==2) return null;
  return Number(p[0])*60+Number(p[1]);
}

function rangosSolapan(aInicio,aFin,bInicio,bFin){
  const ai=minHora(aInicio);
  const af=minHora(aFin);
  const bi=minHora(bInicio);
  const bf=minHora(bFin);

  if(ai===null || af===null || bi===null || bf===null) return false;
  return ai<bf && bi<af;
}

async function pedirPinAdminAgenda(){
  return new Promise(function(resolve){
    cerrarModalAgenda();

    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_agenda" class="zx_modal_fondo">
        <div class="zx_modal_caja">
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

function colorTipo(tipo){
  const t=String(tipo||"").toLowerCase();
  if(t==="trabajo") return "zx_ag_tipo_trabajo";
  if(t==="cita") return "zx_ag_tipo_cita";
  if(t==="vacaciones") return "zx_ag_tipo_vacaciones";
  if(t==="permiso") return "zx_ag_tipo_permiso";
  if(t==="baja_medica") return "zx_ag_tipo_baja";
  if(t==="recordatorio") return "zx_ag_tipo_recordatorio";
  if(t==="revision") return "zx_ag_tipo_revision";
  return "zx_ag_tipo_default";
}

function textoTipo(tipo){
  const m={
    trabajo:"Trabajo",
    cita:"Cita",
    vacaciones:"Vacaciones",
    permiso:"Permiso",
    baja_medica:"Baja médica",
    recordatorio:"Recordatorio",
    revision:"Revisión",
    solicitud:"Solicitud",
    libranza:"Libranza"
  };
  return m[tipo] || tipo || "Evento";
}

function textoEstado(e){
  const m={
    activo:"Activo",
    pendiente:"Pendiente",
    completado:"Terminado",
    cancelado:"Cancelado"
  };
  return m[e] || e || "Activo";
}

function eventosDia(fecha){
  return ZX_AGENDA_CACHE.filter(e=>{
    const ini=String(e.fecha_inicio||"").slice(0,10);
    const fin=String(e.fecha_fin||e.fecha_inicio||"").slice(0,10);
    return fecha>=ini && fecha<=fin;
  });
}

function filtrarEventos(lista){
  if(ZX_AGENDA_FILTRO==="todos") return lista;
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
  return [
    v.matricula,
    v.marca,
    v.modelo
  ].filter(Boolean).join(" ");
}

function opcionesUsuarios(lista,valor){
  return `
    <option value="">Sin asignar</option>
    ${lista.map(u=>{
      const nombre=u.nombre || u.usuario || "";
      return `<option value="${limpiar(nombre)}" data-id="${limpiar(u.id)}" ${String(valor||"")===String(nombre)?"selected":""}>${limpiar(nombre)}</option>`;
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

async function sincronizarSolicitudes(){
  try{
    const r=await sb()
      .from("solicitudes_laborales")
      .select("*")
      .eq("estado","aprobada");

    if(r.error || !r.data) return;

    for(const s of r.data){
      if(!s.id || !s.fecha_inicio) continue;

      const existe=await sb()
        .from("agenda_eventos")
        .select("id")
        .eq("origen","solicitudes")
        .eq("origen_id",String(s.id))
        .limit(1);

      if(existe.error) continue;
      if(existe.data && existe.data.length) continue;

      const tipo=s.tipo || "permiso";
      const titulo=textoTipo(tipo)+" - "+(s.nombre || s.usuario || "Usuario");

      await sb()
        .from("agenda_eventos")
        .insert([{
          tipo,
          titulo,
          descripcion:s.motivo || s.observaciones || "",
          fecha_inicio:s.fecha_inicio,
          fecha_fin:s.fecha_fin || s.fecha_inicio,
          hora_inicio:s.hora_inicio || null,
          hora_fin:s.hora_fin || null,
          usuario_id:String(s.usuario_id || ""),
          usuario:s.usuario || s.nombre || "",
          estado:"activo",
          prioridad:"normal",
          creado_por:"sistema",
          visible_para:"todos",
          origen:"solicitudes",
          origen_id:String(s.id)
        }]);
    }
  }catch(e){}
}

async function cargarEventos(){
  await sincronizarSolicitudes();

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
  if(!data.fecha_inicio || !data.hora_inicio || !data.hora_fin){
    return true;
  }

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",data.fecha_fin || data.fecha_inicio)
    .gte("fecha_fin",data.fecha_inicio)
    .neq("estado","cancelado");

  if(r.error){
    alert("No se pudieron comprobar solapes: "+r.error.message);
    return false;
  }

  const eventos=(r.data || []).filter(e=>String(e.id)!==String(idActual||""));

  const solapeOperario=eventos.find(e=>{
    if(!data.usuario || !e.usuario) return false;
    if(String(e.usuario)!==String(data.usuario)) return false;
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
    if(!data.vehiculo || !e.vehiculo) return false;
    if(String(e.vehiculo)!==String(data.vehiculo)) return false;
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
    fecha_inicio:document.getElementById("ag_fecha_inicio").value,
    fecha_fin:document.getElementById("ag_fecha_fin").value || document.getElementById("ag_fecha_inicio").value,
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
    estado:"activo",
    creado_por:s.usuario || "",
    origen:id ? "manual_editado" : "manual"
  };

  if(!data.titulo || !data.fecha_inicio){
    alert("Título y fecha son obligatorios.");
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
  ZX_agenda();
}

async function abrirModalEvento(e=null,fecha=null){
  cerrarModalAgenda();

  const isEdit=!!e;
  const trabajoVinculado=esEventoTrabajo(e);

  const usuarios=await cargarUsuariosAgenda();
  const clientes=await cargarClientesAgenda();
  const vehiculos=await cargarVehiculosAgenda();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_agenda" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${isEdit ? "Editar evento" : "Nuevo evento"}</h2>

        ${
          trabajoVinculado
          ? `<div class="zx_ag_aviso_trabajo">
              Este evento viene de un trabajo. Para modificar fecha, operario u horarios, edita el trabajo original.
            </div>`
          : ""
        }

        <label class="zx_ag_label">Tipo</label>
        <select id="ag_tipo" ${trabajoVinculado ? "disabled" : ""}>
          <option value="trabajo" ${e?.tipo==="trabajo"?"selected":""}>Trabajo</option>
          <option value="cita" ${e?.tipo==="cita"?"selected":""}>Cita</option>
          <option value="recordatorio" ${e?.tipo==="recordatorio"?"selected":""}>Recordatorio</option>
          <option value="revision" ${e?.tipo==="revision"?"selected":""}>Revisión</option>
          <option value="vacaciones" ${e?.tipo==="vacaciones"?"selected":""}>Vacaciones</option>
          <option value="permiso" ${e?.tipo==="permiso"?"selected":""}>Permiso</option>
          <option value="libranza" ${e?.tipo==="libranza"?"selected":""}>Libranza</option>
        </select>

        <label class="zx_ag_label">Título</label>
        <input id="ag_titulo" value="${limpiar(e?.titulo || "")}" placeholder="Título" ${trabajoVinculado ? "readonly" : ""}>

        <label class="zx_ag_label">Descripción</label>
        <textarea id="ag_desc" rows="4" placeholder="Notas, dirección, material, detalles..." ${trabajoVinculado ? "readonly" : ""}>${limpiar(e?.descripcion || "")}</textarea>

        <label class="zx_ag_label">Fecha inicio</label>
        <input id="ag_fecha_inicio" type="date" value="${limpiar(e?.fecha_inicio || fecha || hoy())}" ${trabajoVinculado ? "readonly" : ""}>

        <label class="zx_ag_label">Fecha fin</label>
        <input id="ag_fecha_fin" type="date" value="${limpiar(e?.fecha_fin || e?.fecha_inicio || fecha || hoy())}" ${trabajoVinculado ? "readonly" : ""}>

        <div class="zx_ag_grid2">
          <div>
            <label class="zx_ag_label">Hora inicio</label>
            <input id="ag_hora_inicio" type="time" value="${limpiar(e?.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}" ${trabajoVinculado ? "readonly" : ""}>
          </div>

          <div>
            <label class="zx_ag_label">Hora fin</label>
            <input id="ag_hora_fin" type="time" value="${limpiar(e?.hora_fin ? String(e.hora_fin).slice(0,5) : "")}" ${trabajoVinculado ? "readonly" : ""}>
          </div>
        </div>

        <label class="zx_ag_label">Operario</label>
        <select id="ag_usuario" ${trabajoVinculado ? "disabled" : ""}>
          ${opcionesUsuarios(usuarios,e?.usuario || "")}
        </select>

        <label class="zx_ag_label">Cliente</label>
        <select id="ag_cliente" ${trabajoVinculado ? "disabled" : ""}>
          ${opcionesClientes(clientes,e?.cliente || "")}
        </select>

        <label class="zx_ag_label">Vehículo</label>
        <select id="ag_vehiculo" ${trabajoVinculado ? "disabled" : ""}>
          ${opcionesVehiculos(vehiculos,e?.vehiculo || "")}
        </select>

        <label class="zx_ag_label">Prioridad</label>
        <select id="ag_prioridad" ${trabajoVinculado ? "disabled" : ""}>
          <option value="normal" ${e?.prioridad==="normal"?"selected":""}>Normal</option>
          <option value="alta" ${e?.prioridad==="alta"?"selected":""}>Alta</option>
          <option value="baja" ${e?.prioridad==="baja"?"selected":""}>Baja</option>
        </select>

        <label class="zx_ag_label">Visible para</label>
        <select id="ag_visible" ${trabajoVinculado ? "disabled" : ""}>
          <option value="todos" ${e?.visible_para==="todos"?"selected":""}>Todos</option>
          <option value="admin" ${e?.visible_para==="admin"?"selected":""}>Solo admin</option>
          <option value="usuario" ${e?.visible_para==="usuario"?"selected":""}>Usuario</option>
        </select>

        ${
          trabajoVinculado
          ? `<button class="zx_btn_big zx_azul" id="ag_abrir_trabajo">Abrir trabajo</button>`
          : `<button class="zx_btn_big zx_verde" id="ag_guardar">Guardar</button>`
        }

        <button class="zx_btn_big zx_gris" id="ag_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("ag_cancelar").onclick=cerrarModalAgenda;

  if(trabajoVinculado){
    document.getElementById("ag_abrir_trabajo").onclick=function(){
      ZX_ag_abrirTrabajo(e.origen_id);
    };
  }else{
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

  const nuevoEstadoTrabajo = estado==="completado" ? "terminado" :
                             estado==="cancelado" ? "bloqueado" :
                             "pendiente";

  if(esEventoTrabajo(e)){
    const rTrabajo=await sb()
      .from("trabajos")
      .update({estado:nuevoEstadoTrabajo})
      .eq("id",String(e.origen_id));

    if(rTrabajo.error){
      alert("Error actualizando trabajo: "+rTrabajo.error.message);
      return;
    }

    const rAgenda=await sb()
      .from("agenda_eventos")
      .update({
        estado:estado,
        updated_at:new Date().toISOString()
      })
      .eq("origen","trabajos")
      .eq("origen_id",String(e.origen_id));

    if(rAgenda.error){
      alert("Error actualizando agenda: "+rAgenda.error.message);
      return;
    }

    cerrarModalAgenda();
    ZX_agenda();
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
  ZX_agenda();
}

async function borrarEvento(id){
  const e=ZX_AGENDA_CACHE.find(x=>String(x.id)===String(id));

  if(!e){
    alert("Evento no encontrado.");
    return;
  }

  if(esEventoTrabajo(e)){
    cerrarModalAgenda();

    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_agenda" class="zx_modal_fondo">
        <div class="zx_modal_caja">
          <h2>Evento de trabajo</h2>

          <div class="zx_text">
            Este evento pertenece a un trabajo.<br><br>
            No se puede borrar desde Agenda para no romper la sincronización.<br><br>
            Para modificarlo, archivarlo o borrarlo, abre el trabajo original.
          </div>

          <button class="zx_btn_big zx_azul" id="ag_borrar_abrir_trabajo">Abrir trabajo</button>
          <button class="zx_btn_big zx_gris" id="ag_borrar_cancelar">Cancelar</button>
        </div>
      </div>
    `);

    document.getElementById("ag_borrar_abrir_trabajo").onclick=function(){
      ZX_ag_abrirTrabajo(e.origen_id);
    };

    document.getElementById("ag_borrar_cancelar").onclick=cerrarModalAgenda;
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
  ZX_agenda();
}

window.ZX_ag_nuevo=function(fecha){
  abrirModalEvento(null,fecha || hoy());
};

window.ZX_ag_verDia=function(fecha){
  const eventos=filtrarEventos(eventosDia(fecha));

  cerrarModalAgenda();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_agenda" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${formatoFecha(fecha)}</h2>

        ${
          eventos.length
          ? eventos.map(e=>renderEvento(e)).join("")
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
  cambiarEstado(id,"completado");
};

window.ZX_ag_cancelar=function(id){
  cambiarEstado(id,"cancelado");
};

window.ZX_ag_borrar=function(id){
  borrarEvento(id);
};

window.ZX_ag_abrirTrabajo=function(id){
  cerrarModalAgenda();

  if(window.ZX_trabajos){
    window.ZX_trabajos();

    setTimeout(function(){
      if(window.ZX_editarTrabajo){
        window.ZX_editarTrabajo(id);
      }
    },500);

    return;
  }

  alert("No se ha cargado el módulo Trabajos.");
};

window.ZX_ag_mesAnterior=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()-1);
  ZX_agenda();
};

window.ZX_ag_mesSiguiente=function(){
  ZX_AGENDA_FECHA.setMonth(ZX_AGENDA_FECHA.getMonth()+1);
  ZX_agenda();
};

window.ZX_ag_hoy=function(){
  ZX_AGENDA_FECHA=new Date();
  ZX_agenda();
};

window.ZX_ag_filtro=function(tipo){
  ZX_AGENDA_FILTRO=tipo;
  ZX_agenda();
};

function renderEvento(e){
  const trabajoVinculado=esEventoTrabajo(e);

  return `
    <div class="zx_ag_evento ${colorTipo(e.tipo)}">
      <div class="zx_ag_evento_top">
        <b>${limpiar(e.titulo || "Evento")}</b>
        <span>${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "")}</span>
      </div>

      <div class="zx_ag_evento_txt">
        ${limpiar(textoTipo(e.tipo))} · ${limpiar(textoEstado(e.estado))}
        ${trabajoVinculado ? "<br><b>Vinculado a trabajo</b>" : ""}
        ${e.usuario ? "<br>Operario: "+limpiar(e.usuario) : ""}
        ${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}
        ${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}
        ${e.descripcion ? "<br>"+limpiar(e.descripcion) : ""}
      </div>

      <div class="zx_ag_actions">
        ${
          trabajoVinculado
          ? `<button class="zx_ag_btn zx_ag_btn_blue" onclick="ZX_ag_abrirTrabajo('${e.origen_id}')">Abrir trabajo</button>`
          : `<button class="zx_ag_btn zx_ag_btn_blue" onclick="ZX_ag_editar('${e.id}')">Editar</button>`
        }

        <button class="zx_ag_btn zx_ag_btn_green" onclick="ZX_ag_completar('${e.id}')">Hecho</button>
        <button class="zx_ag_btn zx_ag_btn_orange" onclick="ZX_ag_cancelar('${e.id}')">Cancelar</button>
        <button class="zx_ag_btn zx_ag_btn_red" onclick="ZX_ag_borrar('${e.id}')">Borrar</button>
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
    <div class="zx_card">
      <div class="zx_ag_head">
        <button onclick="ZX_ag_mesAnterior()">‹</button>
        <div>
          <h2>${limpiar(nombreMes(ZX_AGENDA_FECHA))}</h2>
          <button class="zx_ag_hoy_btn" onclick="ZX_ag_hoy()">Hoy</button>
        </div>
        <button onclick="ZX_ag_mesSiguiente()">›</button>
      </div>

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
          evs.slice(0,3).map(e=>`
            <div class="zx_ag_dot ${colorTipo(e.tipo)}">
              ${limpiar(e.hora_inicio ? String(e.hora_inicio).slice(0,5)+" " : "")}${limpiar(e.titulo||"")}
            </div>
          `).join("")
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
    const f=String(e.fecha_inicio||"").slice(0,10);
    return f>manana && f<=siete && e.estado!=="completado" && e.estado!=="cancelado";
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
    ["vacaciones","Vacaciones"],
    ["permiso","Permisos"],
    ["revision","Revisiones"]
  ];

  return `
    <div class="zx_card">
      <h2>Agenda</h2>
      <div class="zx_text">Calendario general de empresa, operarios, clientes, vacaciones, revisiones y notas.</div>

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

window.ZX_agenda=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="agenda") b.classList.add("zx_activo");
  });

  await cargarEventos();

  app().innerHTML=`
    ${renderFiltros()}
    ${renderCalendario()}
    ${renderListas()}
  `;
};

(function(){
  if(document.getElementById("zx_agenda_css_v3090")) return;

  const s=document.createElement("style");
  s.id="zx_agenda_css_v3090";

  s.innerHTML=`
    .zx_ag_head{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .zx_ag_head button{border:0;border-radius:16px;background:#2563eb;color:white;font-size:30px;font-weight:900;width:58px;height:58px}
    .zx_ag_hoy_btn{width:auto!important;height:auto!important;padding:8px 16px!important;font-size:15px!important;background:#64748b!important}
    .zx_ag_weekdays,.zx_ag_calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px}
    .zx_ag_weekdays div{text-align:center;color:#64748b;font-weight:900;font-size:13px}
    .zx_ag_day{min-height:92px;background:#f8fafc;border:1px solid #d1d5db;border-radius:14px;padding:7px;overflow:hidden}
    .zx_ag_empty{background:transparent;border:0}
    .zx_ag_today{border:3px solid #2563eb;background:#eff6ff}
    .zx_ag_day_num{font-size:15px;font-weight:900;margin-bottom:5px;color:#0f172a}
    .zx_ag_dot{color:white;border-radius:8px;padding:3px 5px;font-size:11px;font-weight:900;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_ag_more{font-size:11px;font-weight:900;color:#64748b;margin-top:3px}
    .zx_ag_filters{display:flex;gap:8px;overflow-x:auto;margin-top:16px;padding-bottom:4px}
    .zx_ag_filters button{border:0;border-radius:999px;padding:10px 14px;background:#e2e8f0;color:#0f172a;font-weight:900;white-space:nowrap}
    .zx_ag_filters button.activo{background:#2563eb;color:white}
    .zx_ag_evento{border-radius:18px;padding:14px;margin-top:12px;color:white}
    .zx_ag_evento_top{display:flex;justify-content:space-between;gap:8px;font-size:18px;font-weight:900}
    .zx_ag_evento_txt{margin-top:8px;line-height:1.4;font-size:15px;font-weight:750}
    .zx_ag_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .zx_ag_btn{border:0;border-radius:14px;padding:11px;color:white;font-size:15px;font-weight:900}
    .zx_ag_btn_blue{background:#2563eb}
    .zx_ag_btn_green{background:#16a34a}
    .zx_ag_btn_orange{background:#ea580c}
    .zx_ag_btn_red{background:#dc2626}
    .zx_ag_tipo_trabajo{background:#2563eb}
    .zx_ag_tipo_cita{background:#7c3aed}
    .zx_ag_tipo_vacaciones{background:#16a34a}
    .zx_ag_tipo_permiso{background:#f59e0b}
    .zx_ag_tipo_baja{background:#dc2626}
    .zx_ag_tipo_recordatorio{background:#64748b}
    .zx_ag_tipo_revision{background:#0f766e}
    .zx_ag_tipo_default{background:#334155}
    .zx_ag_label{display:block;margin-top:14px;margin-bottom:6px;font-size:15px;font-weight:900;color:#475569}
    .zx_ag_grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .zx_ag_aviso_trabajo{
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
    @media(max-width:430px){
      .zx_ag_day{min-height:78px;padding:5px}
      .zx_ag_dot{font-size:9px;padding:2px 4px}
      .zx_ag_day_num{font-size:13px}
      .zx_ag_actions{grid-template-columns:1fr}
    }
  `;

  document.head.appendChild(s);
})();

})();