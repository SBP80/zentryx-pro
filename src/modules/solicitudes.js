// ===============================
// ZENTRYX PRO - SOLICITUDES LABORALES
// V3062 - COMPLETO + CONTADOR PENDIENTES + VALIDACIONES
// ===============================
(function(){
"use strict";

// ===============================
// BASE
// ===============================
function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

const BUCKET_JUSTIFICANTES="zentryx-usuarios";
let ZX_ENVIANDO_SOLICITUD=false;

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

// ===============================
// FECHAS / HORAS
// ===============================
function formatoFechaES(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  if(p.length===3) return p[2]+"/"+p[1]+"/"+p[0];
  return limpiar(f);
}

function hoyISO(){
  return new Date().toISOString().slice(0,10);
}

function ahoraISO(){
  return new Date().toISOString();
}

function formatoHorasDecimal(horas){
  const totalMin=Math.round(Number(horas||0)*60);
  const h=Math.floor(totalMin/60);
  const m=totalMin%60;

  if(h>0 && m>0) return h+" h "+m+" min";
  if(h>0) return h+" h";
  return m+" min";
}

function calcularHoras(horaInicio,horaFin){
  if(!horaInicio || !horaFin) return 0;

  const a=horaInicio.split(":");
  const b=horaFin.split(":");

  const minA=Number(a[0]||0)*60+Number(a[1]||0);
  const minB=Number(b[0]||0)*60+Number(b[1]||0);

  const diff=Math.max(0,minB-minA);
  return Math.round((diff/60)*100)/100;
}

function calcularDias(fechaInicio,fechaFin){
  if(!fechaInicio) return 0;

  const ini=new Date(fechaInicio+"T00:00:00");
  const fin=new Date((fechaFin||fechaInicio)+"T00:00:00");

  const diff=Math.floor((fin-ini)/(1000*60*60*24))+1;
  return Math.max(1,diff);
}

// ===============================
// TIPOS SOLICITUD
// ===============================
const TIPOS_SOLICITUD=[
  {id:"asuntos_propios",texto:"Asuntos propios"},
  {id:"vacaciones",texto:"Vacaciones"},
  {id:"permiso_retribuido",texto:"Permiso retribuido"},
  {id:"permiso_sin_sueldo",texto:"Permiso sin sueldo"},
  {id:"baja_medica",texto:"Baja médica"},
  {id:"otros",texto:"Otro permiso"}
];

function textoTipoSolicitud(tipo){
  const t=TIPOS_SOLICITUD.find(x=>x.id===tipo);
  return t ? t.texto : tipo;
}

function textoEstadoSolicitud(estado){
  if(estado==="pendiente") return "Pendiente";
  if(estado==="aprobada") return "Aprobada";
  if(estado==="rechazada") return "Rechazada";
  return estado || "-";
}

function claseEstadoSolicitud(estado){
  if(estado==="aprobada") return "zx_estado_ok";
  if(estado==="rechazada") return "zx_estado_no";
  return "zx_estado_pend";
}

// ===============================
// CONTADOR PENDIENTES ADMIN
// ===============================
async function contarSolicitudesPendientes(){
  const r=await sb()
    .from("solicitudes_laborales")
    .select("id",{count:"exact",head:true})
    .eq("estado","pendiente");

  if(r.error) return 0;
  return r.count || 0;
}
// ===============================
// CONFIG LABORAL / DERECHOS
// ===============================
async function cargarConfigUsuario(){
  const s=sesion();

  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(s.id))
    .limit(1);

  if(r.error || !r.data || !r.data.length){
    return {
      asuntos_horas:0,
      vacaciones:0
    };
  }

  return r.data[0];
}

async function horasAsuntosUsadas(){
  const s=sesion();

  const r=await sb()
    .from("solicitudes_laborales")
    .select("total_horas")
    .eq("usuario_id",String(s.id))
    .eq("tipo","asuntos_propios")
    .eq("estado","aprobada");

  if(r.error || !r.data) return 0;

  return r.data.reduce((acc,x)=>{
    return acc + Number(x.total_horas || 0);
  },0);
}

async function resumenLaboralUsuario(){
  const cfg=await cargarConfigUsuario();
  const usadas=await horasAsuntosUsadas();
  const total=Number(cfg.asuntos_horas || 0);

  return {
    asuntos_horas:total,
    asuntos_usadas:usadas,
    asuntos_restantes:Math.max(0,total-usadas),
    vacaciones:Number(cfg.vacaciones || 0)
  };
}

// ===============================
// SUBIR JUSTIFICANTE
// ===============================
async function subirJustificante(file){
  const s=sesion();

  if(!file){
    return {
      url:null,
      nombre:null
    };
  }

  const safeName=file.name
    .replaceAll(" ","_")
    .replace(/[^a-zA-Z0-9._-]/g,"");

  const path=
    "justificantes/"+
    String(s.id || "sin_usuario")+"/"+
    Date.now()+"_"+safeName;

  const r=await sb()
    .storage
    .from(BUCKET_JUSTIFICANTES)
    .upload(path,file,{
      cacheControl:"3600",
      upsert:false,
      contentType:file.type || "application/octet-stream"
    });

  if(r.error){
    alert("Error subiendo justificante: "+r.error.message);
    return {
      url:null,
      nombre:null
    };
  }

  const pub=sb()
    .storage
    .from(BUCKET_JUSTIFICANTES)
    .getPublicUrl(path);

  return {
    url:pub.data.publicUrl,
    nombre:file.name
  };
}

// ===============================
// CONSULTAS SOLICITUDES
// ===============================
async function misSolicitudes(){
  const s=sesion();

  const r=await sb()
    .from("solicitudes_laborales")
    .select("*")
    .eq("usuario_id",String(s.id))
    .order("created_at",{ascending:false})
    .limit(50);

  if(r.error){
    alert("Error cargando solicitudes: "+r.error.message);
    return [];
  }

  return r.data || [];
}

async function solicitudesAdmin(){
  const r=await sb()
    .from("solicitudes_laborales")
    .select("*")
    .order("created_at",{ascending:false})
    .limit(100);

  if(r.error){
    alert("Error cargando solicitudes admin: "+r.error.message);
    return [];
  }

  return r.data || [];
}
// ===============================
// CREAR SOLICITUD
// ===============================
async function crearSolicitud(){
  if(ZX_ENVIANDO_SOLICITUD) return;

  const btn=document.getElementById("sol_crear");
  ZX_ENVIANDO_SOLICITUD=true;

  if(btn){
    btn.disabled=true;
    btn.textContent="Enviando...";
  }

  try{
    const s=sesion();

    if(!s.id){
      alert("Sesión no válida.");
      return;
    }

    const tipo=document.getElementById("sol_tipo").value;
    const fechaInicio=document.getElementById("sol_fecha_inicio").value;
    const fechaFin=document.getElementById("sol_fecha_fin").value || fechaInicio;
    const horaInicio=document.getElementById("sol_hora_inicio").value;
    const horaFin=document.getElementById("sol_hora_fin").value;
    const motivo=document.getElementById("sol_motivo").value.trim();
    const file=document.getElementById("sol_justificante").files[0];

    if(!tipo || !fechaInicio){
      alert("Tipo y fecha inicio son obligatorios.");
      return;
    }

    if(fechaFin < fechaInicio){
      alert("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    if(horaInicio && horaFin && fechaInicio===fechaFin && horaFin<=horaInicio){
      alert("La hora fin debe ser superior a la hora inicio.");
      return;
    }

    let totalHoras=0;
    let totalDias=0;

    if(tipo==="asuntos_propios"){
      if(!horaInicio || !horaFin){
        alert("Para asuntos propios debes indicar hora inicio y hora fin.");
        return;
      }

      totalHoras=calcularHoras(horaInicio,horaFin);

      if(totalHoras<=0){
        alert("Las horas no son válidas.");
        return;
      }

      const resumen=await resumenLaboralUsuario();

      if(totalHoras>resumen.asuntos_restantes){
        alert("No tienes suficientes horas de asuntos propios disponibles.");
        return;
      }

      totalDias=0;

    }else{
      totalDias=calcularDias(fechaInicio,fechaFin);

      if(horaInicio && horaFin){
        totalHoras=calcularHoras(horaInicio,horaFin);
      }
    }

    const just=await subirJustificante(file);

    const data={
      usuario_id:String(s.id),
      usuario:s.usuario || "",
      nombre:s.nombre || "",

      tipo,
      estado:"pendiente",

      fecha_inicio:fechaInicio,
      fecha_fin:fechaFin,
      hora_inicio:horaInicio || null,
      hora_fin:horaFin || null,
      total_horas:totalHoras,
      total_dias:totalDias,

      motivo,
      justificante_url:just.url,
      justificante_nombre:just.nombre,

      created_at:ahoraISO()
    };

    const r=await sb()
      .from("solicitudes_laborales")
      .insert([data]);

    if(r.error){
      alert("Error creando solicitud: "+r.error.message);
      return;
    }

    alert("Solicitud enviada correctamente");
    ZX_solicitudes();

  }finally{
    ZX_ENVIANDO_SOLICITUD=false;

    if(btn){
      btn.disabled=false;
      btn.textContent="Enviar solicitud";
    }
  }
}

// ===============================
// CAMBIAR ESTADO ADMIN
// ===============================
async function cambiarEstadoSolicitud(id,estado){
  if(!esAdmin()){
    alert("Solo administrador.");
    return;
  }

  const respuesta=prompt(
    estado==="aprobada"
      ? "Comentario de aprobación:"
      : "Motivo de rechazo:"
  );

  if(respuesta===null) return;

  const s=sesion();

  const r=await sb()
    .from("solicitudes_laborales")
    .update({
      estado,
      respuesta_admin:respuesta,
      aprobado_por:s.usuario || "",
      aprobado_at:new Date().toISOString()
    })
    .eq("id",id);

  if(r.error){
    alert("Error actualizando solicitud: "+r.error.message);
    return;
  }

  alert("Solicitud actualizada");
  ZX_solicitudes();
}

// ===============================
// BORRAR SOLICITUD
// ===============================
async function borrarSolicitud(id){
  const ok=confirm("¿Eliminar esta solicitud?");
  if(!ok) return;

  const r=await sb()
    .from("solicitudes_laborales")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error eliminando solicitud: "+r.error.message);
    return;
  }

  ZX_solicitudes();
}
// ===============================
// RENDER SOLICITUD
// ===============================
function renderSolicitud(solicitud,admin=false){
  const estado=String(solicitud.estado||"pendiente");

  return `
    <div class="zx_admin_row">
      <div class="zx_admin_row_top">
        <b>${limpiar(textoTipoSolicitud(solicitud.tipo))}</b>
        <span>${limpiar(formatoFechaES(solicitud.fecha_inicio))}</span>
      </div>

      <div class="zx_estado_solicitud ${claseEstadoSolicitud(estado)}">
        ${limpiar(textoEstadoSolicitud(estado))}
      </div>

      <div class="zx_admin_data">
        ${
          solicitud.fecha_fin && solicitud.fecha_fin!==solicitud.fecha_inicio
          ? `Hasta: <b>${limpiar(formatoFechaES(solicitud.fecha_fin))}</b><br>`
          : ""
        }

        ${
          solicitud.hora_inicio || solicitud.hora_fin
          ? `Horario: <b>${limpiar(solicitud.hora_inicio||"-")} - ${limpiar(solicitud.hora_fin||"-")}</b><br>`
          : ""
        }

        ${
          Number(solicitud.total_horas||0)>0
          ? `Horas: <b>${limpiar(formatoHorasDecimal(solicitud.total_horas))}</b><br>`
          : ""
        }

        ${
          Number(solicitud.total_dias||0)>0
          ? `Días: <b>${limpiar(solicitud.total_dias)}</b><br>`
          : ""
        }

        ${
          solicitud.motivo
          ? `Motivo: ${limpiar(solicitud.motivo)}<br>`
          : ""
        }

        ${
          solicitud.respuesta_admin
          ? `Respuesta admin: ${limpiar(solicitud.respuesta_admin)}<br>`
          : ""
        }

        ${
          solicitud.justificante_url
          ? `<a href="${limpiar(solicitud.justificante_url)}" target="_blank">Ver justificante</a>`
          : ""
        }
      </div>

      <div class="zx_edit_grid">
        ${
          admin && estado==="pendiente"
          ? `
            <button class="zx_admin_btn zx_admin_aprobar" data-aprobar-solicitud="${solicitud.id}">
              Aprobar
            </button>

            <button class="zx_admin_btn zx_admin_rechazar" data-rechazar-solicitud="${solicitud.id}">
              Rechazar
            </button>
          `
          : ""
        }

        ${
          (!admin && estado==="pendiente") || admin
          ? `
            <button class="zx_admin_btn zx_admin_borrar" data-borrar-solicitud="${solicitud.id}">
              Borrar
            </button>
          `
          : ""
        }
      </div>
    </div>
  `;
}

// ===============================
// FORMULARIO NUEVA SOLICITUD
// ===============================
function renderFormularioSolicitud(resumen){
  return `
    <div class="zx_card">
      <h2>Nueva solicitud</h2>

      <div class="zx_text">
        Asuntos propios disponibles:
        <b>${limpiar(formatoHorasDecimal(resumen.asuntos_restantes))}</b>
        de <b>${limpiar(formatoHorasDecimal(resumen.asuntos_horas))}</b>
      </div>

      <div class="zx_label">Tipo</div>
      <select id="sol_tipo" class="zx_input">
        ${TIPOS_SOLICITUD.map(t=>`
          <option value="${limpiar(t.id)}">${limpiar(t.texto)}</option>
        `).join("")}
      </select>

      <div class="zx_label">Fecha inicio</div>
      <input id="sol_fecha_inicio" class="zx_input" type="date" value="${hoyISO()}">

      <div class="zx_label">Fecha fin</div>
      <input id="sol_fecha_fin" class="zx_input" type="date" value="${hoyISO()}">

      <div class="zx_label">Hora inicio</div>
      <input id="sol_hora_inicio" class="zx_input" type="time">

      <div class="zx_label">Hora fin</div>
      <input id="sol_hora_fin" class="zx_input" type="time">

      <div class="zx_label">Motivo</div>
      <textarea id="sol_motivo" class="zx_input" rows="4"></textarea>

      <div class="zx_label">Justificante</div>
      <input id="sol_justificante" class="zx_input" type="file">

      <button class="zx_btn_big zx_verde" id="sol_crear">
        Enviar solicitud
      </button>
    </div>
  `;
}

// ===============================
// RESUMEN LABORAL
// ===============================
function renderResumenLaboral(resumen){
  return `
    <div class="zx_card">
      <h2>Resumen laboral</h2>

      <div class="zx_admin_summary">
        <div>
          <b>${limpiar(resumen.vacaciones)}</b>
          <span>Días vacaciones</span>
        </div>

        <div>
          <b>${limpiar(formatoHorasDecimal(resumen.asuntos_horas))}</b>
          <span>Asuntos propios</span>
        </div>

        <div>
          <b>${limpiar(formatoHorasDecimal(resumen.asuntos_usadas))}</b>
          <span>Horas usadas</span>
        </div>

        <div>
          <b>${limpiar(formatoHorasDecimal(resumen.asuntos_restantes))}</b>
          <span>Horas restantes</span>
        </div>
      </div>
    </div>
  `;
}
// ===============================
// PANTALLA PRINCIPAL
// ===============================
window.ZX_solicitudes=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="solicitudes"){
      b.classList.add("zx_activo");
    }
  });

  const resumen=await resumenLaboralUsuario();
  const mias=await misSolicitudes();
  const adminList=esAdmin() ? await solicitudesAdmin() : [];
  const pendientes=esAdmin() ? await contarSolicitudesPendientes() : 0;

  app().innerHTML=`
    ${renderResumenLaboral(resumen)}

    ${renderFormularioSolicitud(resumen)}

    <div class="zx_card">
      <h2>Mis solicitudes</h2>

      ${
        mias.length
        ? mias.map(s=>renderSolicitud(s,false)).join("")
        : `<div class="zx_text">No tienes solicitudes.</div>`
      }
    </div>

    ${
      esAdmin()
      ? `
        <div class="zx_card">
          <h2>Panel admin solicitudes</h2>

          <div class="zx_admin_alerta">
            Solicitudes pendientes: <b>${pendientes}</b>
          </div>

          ${
            adminList.length
            ? adminList.map(s=>renderSolicitud(s,true)).join("")
            : `<div class="zx_text">No hay solicitudes.</div>`
          }
        </div>
      `
      : ""
    }
  `;

  document.getElementById("sol_crear").onclick=crearSolicitud;

  document.querySelectorAll("[data-aprobar-solicitud]").forEach(btn=>{
    btn.onclick=function(){
      cambiarEstadoSolicitud(btn.dataset.aprobarSolicitud,"aprobada");
    };
  });

  document.querySelectorAll("[data-rechazar-solicitud]").forEach(btn=>{
    btn.onclick=function(){
      cambiarEstadoSolicitud(btn.dataset.rechazarSolicitud,"rechazada");
    };
  });

  document.querySelectorAll("[data-borrar-solicitud]").forEach(btn=>{
    btn.onclick=function(){
      borrarSolicitud(btn.dataset.borrarSolicitud);
    };
  });
};

// ===============================
// ESTILOS
// ===============================
(function(){
  if(document.getElementById("zx_solicitudes_css")) return;

  const s=document.createElement("style");
  s.id="zx_solicitudes_css";
  s.innerHTML=`
    .zx_estado_solicitud{
      display:inline-block;
      margin:8px 0;
      padding:6px 12px;
      border-radius:999px;
      color:white;
      font-size:13px;
      font-weight:900;
    }

    .zx_estado_pend{background:#f59e0b;}
    .zx_estado_ok{background:#16a34a;}
    .zx_estado_no{background:#dc2626;}

    .zx_admin_aprobar{background:#16a34a;}
    .zx_admin_rechazar{background:#dc2626;}

    .zx_admin_alerta{
      background:#fff7ed;
      border:1px solid #fed7aa;
      color:#9a3412;
      padding:14px;
      border-radius:16px;
      font-size:18px;
      font-weight:900;
      margin:12px 0;
    }

    .zx_admin_summary{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
      margin-top:10px;
    }

    .zx_admin_summary div{
      background:#f1f5f9;
      border-radius:16px;
      padding:14px;
      text-align:center;
    }

    .zx_admin_summary b{
      display:block;
      font-size:22px;
      color:#0f172a;
    }

    .zx_admin_summary span{
      font-size:13px;
      color:#64748b;
      font-weight:800;
    }

    textarea.zx_input{
      resize:none;
    }

    button:disabled{
      opacity:.55;
      pointer-events:none;
    }
  `;
  document.head.appendChild(s);
})();

// ===============================
// FIN MÓDULO
// ===============================
})();
