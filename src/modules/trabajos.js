// ===============================
// ZENTRYX PRO - TRABAJOS FIX
// V3115 - ARCHIVADO SEGURO + ESTADOS COHERENTES
// Cargar después de src/modules/trabajos.js
// ===============================
(function(){
"use strict";

function sb(){return window.sb || window.supabaseClient}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizarTexto(v){
  return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

function rolLocal(){return normalizarTexto(sesion().rol || "")}
function usuarioLocal(){return normalizarTexto(sesion().usuario || "")}
function esAdmin(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esGerente(){return rolLocal()==="gerente"}
function esSupervisor(){return rolLocal()==="supervisor"}
function puedeArchivarTrabajo(){return esAdmin() || esGerente() || esSupervisor()}

function cerrarModalTrabajo(){const m=document.getElementById("zx_modal_trabajo"); if(m) m.remove()}
function hashPin(pin){return btoa(String(pin))}

function estadoAgendaDesdeTrabajo(estado){
  const e=String(estado || "").toLowerCase();
  if(e==="terminado") return "completado";
  if(e==="cancelado" || e==="bloqueado") return "cancelado";
  return "activo";
}

function textoEstadoTrabajo(estado){
  const e=String(estado || "").toLowerCase();
  if(e==="pendiente") return "Pendiente";
  if(e==="en_curso") return "En curso";
  if(e==="terminado") return "Terminado";
  if(e==="cancelado" || e==="bloqueado") return "Cancelado";
  return e || "Pendiente";
}

async function pedirPinAdminFix(){
  return new Promise(function(resolve){
    cerrarModalTrabajo();
    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_trabajo" class="zx_modal_fondo">
        <div class="zx_modal_caja">
          <h2>PIN administrador</h2>
          <div class="zx_text">Introduce el PIN para continuar.</div>
          <input id="tr_fix_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
          <button class="zx_btn_big zx_verde" id="tr_fix_pin_ok">Confirmar</button>
          <button class="zx_btn_big zx_gris" id="tr_fix_pin_cancelar">Cancelar</button>
        </div>
      </div>
    `);

    document.getElementById("tr_fix_pin_cancelar").onclick=function(){
      cerrarModalTrabajo();
      resolve(false);
    };

    document.getElementById("tr_fix_pin_ok").onclick=async function(){
      const pin=document.getElementById("tr_fix_pin_admin").value.trim();
      if(!/^[0-9]{4}$/.test(pin)){alert("PIN inválido.");return;}

      const s=sesion();
      const r=await sb()
        .from("usuarios")
        .select("id,usuario,rol,pin_hash")
        .eq("id",s.id)
        .maybeSingle();

      if(r.error || !r.data){alert("No se pudo validar el usuario.");return;}

      const rol=normalizarTexto(r.data.rol || "");
      const usuario=normalizarTexto(r.data.usuario || "");

      if(!(rol==="administrador" || usuario==="admin")){
        alert("Solo administrador.");
        return;
      }

      if(hashPin(pin)!==r.data.pin_hash){
        alert("PIN incorrecto.");
        return;
      }

      cerrarModalTrabajo();
      resolve(true);
    };
  });
}

async function registrarAuditoriaTrabajoFix(trabajo,accion,datosExtra){
  const s=sesion();
  try{
    await sb()
      .from("trabajos_auditoria")
      .insert([{
        trabajo_id:String(trabajo?.id || ""),
        titulo:String(trabajo?.titulo || ""),
        accion:String(accion || ""),
        usuario_id:String(s.id || ""),
        usuario:String(s.usuario || ""),
        datos:datosExtra || {}
      }]);
  }catch(e){}
}

async function cargarPlanificacionFix(trabajoId){
  const r=await sb()
    .from("trabajos_planificacion")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});
  if(r.error) return [];
  return r.data || [];
}

async function sincronizarAgendaEstadoFix(trabajoId,estado){
  const r=await sb()
    .from("agenda_eventos")
    .update({
      estado:estadoAgendaDesdeTrabajo(estado),
      updated_at:new Date().toISOString()
    })
    .eq("origen","trabajos")
    .eq("origen_id",String(trabajoId));

  if(r.error){
    alert("El estado del trabajo se cambió, pero falló la sincronización con Agenda: "+r.error.message);
  }
}

async function recrearAgendaTrabajoFix(trabajo){
  if(!trabajo || !trabajo.id) return;

  await sb()
    .from("agenda_eventos")
    .delete()
    .eq("origen","trabajos")
    .eq("origen_id",String(trabajo.id));

  if(trabajo.archivado) return;

  const planificacion=await cargarPlanificacionFix(trabajo.id);

  for(const p of planificacion){
    await sb()
      .from("agenda_eventos")
      .insert([{
        tipo:"trabajo",
        titulo:"Trabajo - "+String(trabajo.titulo || ""),
        descripcion:trabajo.descripcion || "",
        fecha_inicio:String(p.fecha || "").slice(0,10),
        fecha_fin:String(p.fecha || "").slice(0,10),
        hora_inicio:p.hora_inicio || null,
        hora_fin:p.hora_fin || null,
        cliente_id:String(trabajo.cliente_id || ""),
        cliente:trabajo.cliente || "",
        usuario_id:String(p.usuario_id || ""),
        usuario:p.nombre || p.usuario || "",
        estado:estadoAgendaDesdeTrabajo(trabajo.estado),
        prioridad:trabajo.prioridad || "media",
        visible_para:"todos",
        origen:"trabajos",
        origen_id:String(trabajo.id),
        creado_por:trabajo.creado_por || ""
      }]);
  }
}

window.ZX_borrarTrabajo=async function(id){
  if(!puedeArchivarTrabajo()){
    alert("No tienes permiso para gestionar trabajos.");
    return;
  }

  const r0=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",String(id))
    .maybeSingle();

  if(r0.error || !r0.data){
    alert("Trabajo no encontrado.");
    return;
  }

  const trabajo=r0.data;
  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Gestionar trabajo</h2>

        <div class="zx_text">
          <b>${limpiar(trabajo.titulo || "Trabajo")}</b><br>
          Cliente: ${limpiar(trabajo.cliente || "-")}<br>
          Estado: ${limpiar(textoEstadoTrabajo(trabajo.estado || "pendiente"))}
        </div>

        <div class="zx_permiso_info">
          Por seguridad, esta versión no permite borrado físico desde la app.
          Se conserva planificación, materiales, archivos, historial y auditoría.
        </div>

        ${
          trabajo.archivado
          ? `<button class="zx_btn_big zx_verde" id="tr_fix_restaurar">Restaurar trabajo</button>`
          : `<button class="zx_btn_big zx_naranja" id="tr_fix_archivar">Archivar trabajo</button>`
        }

        <button class="zx_btn_big zx_gris" id="tr_fix_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_fix_cancelar").onclick=cerrarModalTrabajo;

  const archivar=document.getElementById("tr_fix_archivar");
  if(archivar){
    archivar.onclick=async function(){
      const ok=await pedirPinAdminFix();
      if(!ok) return;

      const r=await sb()
        .from("trabajos")
        .update({archivado:true,updated_at:new Date().toISOString()})
        .eq("id",String(id));

      if(r.error){
        alert("Error archivando trabajo: "+r.error.message);
        return;
      }

      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));

      await registrarAuditoriaTrabajoFix(trabajo,"ARCHIVAR_TRABAJO",{
        estado:trabajo.estado || "",
        prioridad:trabajo.prioridad || "",
        metodo:"archivado_seguro_v3115"
      });

      cerrarModalTrabajo();
      if(window.ZX_trabajos) window.ZX_trabajos();
    };
  }

  const restaurar=document.getElementById("tr_fix_restaurar");
  if(restaurar){
    restaurar.onclick=async function(){
      const ok=await pedirPinAdminFix();
      if(!ok) return;

      const r=await sb()
        .from("trabajos")
        .update({archivado:false,updated_at:new Date().toISOString()})
        .eq("id",String(id));

      if(r.error){
        alert("Error restaurando trabajo: "+r.error.message);
        return;
      }

      await recrearAgendaTrabajoFix({...trabajo,archivado:false});

      await registrarAuditoriaTrabajoFix(trabajo,"RESTAURAR_TRABAJO",{
        estado:trabajo.estado || "",
        prioridad:trabajo.prioridad || "",
        metodo:"restauracion_segura_v3115"
      });

      cerrarModalTrabajo();
      if(window.ZX_trabajos) window.ZX_trabajos();
    };
  }
};

window.ZX_cambiarEstadoTrabajo=async function(id){
  const r0=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",String(id))
    .maybeSingle();

  if(r0.error || !r0.data){
    alert("Trabajo no encontrado.");
    return;
  }

  const trabajo=r0.data;
  const actual=String(trabajo.estado || "pendiente")==="bloqueado"
    ? "cancelado"
    : String(trabajo.estado || "pendiente");

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Cambiar estado</h2>

        <div class="zx_text">
          <b>${limpiar(trabajo.titulo || "Trabajo")}</b><br>
          Estado actual: <b>${limpiar(textoEstadoTrabajo(actual))}</b>
        </div>

        <button class="zx_btn_big zx_naranja" id="tr_fix_estado_pendiente">Pendiente</button>
        <button class="zx_btn_big zx_azul" id="tr_fix_estado_curso">En curso</button>
        <button class="zx_btn_big zx_verde" id="tr_fix_estado_terminado">Terminado</button>
        <button class="zx_btn_big zx_rojo" id="tr_fix_estado_cancelado">Cancelado</button>
        <button class="zx_btn_big zx_gris" id="tr_fix_estado_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_fix_estado_cerrar").onclick=cerrarModalTrabajo;

  async function aplicarEstado(nuevo){
    if(nuevo===actual){
      cerrarModalTrabajo();
      return;
    }

    if(nuevo==="cancelado"){
      const confirmar=confirm("¿Cancelar este trabajo? Se conservarán planificación, materiales, archivos e historial.");
      if(!confirmar) return;
    }

    const r=await sb()
      .from("trabajos")
      .update({estado:nuevo,updated_at:new Date().toISOString()})
      .eq("id",String(id));

    if(r.error){
      alert("Error cambiando estado: "+r.error.message);
      return;
    }

    await sincronizarAgendaEstadoFix(id,nuevo);

    await registrarAuditoriaTrabajoFix(trabajo,"CAMBIAR_ESTADO",{
      anterior:actual,
      nuevo:nuevo,
      metodo:"selector_estado_v3115"
    });

    cerrarModalTrabajo();
    if(window.ZX_trabajos) window.ZX_trabajos();
  }

  document.getElementById("tr_fix_estado_pendiente").onclick=function(){aplicarEstado("pendiente")};
  document.getElementById("tr_fix_estado_curso").onclick=function(){aplicarEstado("en_curso")};
  document.getElementById("tr_fix_estado_terminado").onclick=function(){aplicarEstado("terminado")};
  document.getElementById("tr_fix_estado_cancelado").onclick=function(){aplicarEstado("cancelado")};
};

(function estilosFixTrabajos(){
  if(document.getElementById("zx_trabajos_fix_v3115")) return;

  const s=document.createElement("style");
  s.id="zx_trabajos_fix_v3115";
  s.innerHTML=`
    .zx_estado_cancelado{
      background:#991b1b!important;
      color:white!important;
    }
    .zx_tr_card_cancelado{
      border-color:#991b1b!important;
      box-shadow:0 8px 28px rgba(153,27,27,.18)!important;
    }
  `;
  document.head.appendChild(s);
})();

})();
