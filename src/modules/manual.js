// ===============================
// ZENTRYX PRO - MANUAL DE USO
// V1001 - BUSCADOR + CONTENIDO SEGUN ROL/PERMISOS
// ===============================
(function(){
"use strict";

const ZX_VERSION="1001";

function app(){return document.getElementById("app")}
function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function normalizar(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}
function sesion(){
  try{
    if(window.ZENTRYX_readSession) return window.ZENTRYX_readSession() || {};
  }catch(e){}
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}catch(e){return {}}
}
function usuario(){
  const s=sesion();
  return {
    id:s.id || s.usuario_id || "",
    usuario:s.usuario || s.nombre || "",
    nombre:s.nombre || s.usuario || "",
    rol:normalizar(s.rol || ""),
    permisos:s.permisos || s.permissions || {}
  };
}
function esAdmin(u){return u.rol==="administrador" || u.rol==="admin"}
function esDev(u){return ["desarrollador","developer","dev"].includes(u.rol)}
function esEncargado(u){return ["encargado","responsable","jefe","supervisor"].includes(u.rol)}
function tienePermiso(u,nombre){
  if(esAdmin(u) || esDev(u)) return true;
  if(Object.prototype.hasOwnProperty.call(u.permisos || {},nombre)) return u.permisos[nombre]===true;
  return false;
}
function moduloActivo(id){
  try{
    const zx=window.ZENTRYX || window.ZX;
    if(zx && typeof zx.moduloActivo==="function") return zx.moduloActivo(id)!==false;
  }catch(e){}
  return true;
}

const BASE=[
  {
    id:"inicio",icono:"🏠",titulo:"Inicio",roles:["todos"],
    resumen:"Tu pantalla diaria: jornada, vehículo y trabajos previstos.",
    pasos:[
      "Comprueba el estado de tu jornada al entrar.",
      "Revisa el vehículo que tengas asignado, si aparece.",
      "Consulta los trabajos del día y abre Agenda cuando necesites ver próximas fechas."
    ],
    palabras:"inicio jornada hoy vehículo asignado agenda trabajos"
  },
  {
    id:"fichaje",icono:"⏱️",titulo:"Fichaje",roles:["todos"],
    resumen:"Registro de entrada, descansos, comida y salida.",
    pasos:[
      "Pulsa la acción correspondiente al estado de tu jornada.",
      "Confirma el fichaje cuando Zentryx lo solicite.",
      "Si utilizas vehículo, revisa los kilómetros solicitados al inicio o al cierre.",
      "Consulta Mis jornadas para revisar tus registros."
    ],
    palabras:"fichar entrada salida descanso comida jornada horas ubicación gps"
  },
  {
    id:"agenda",icono:"📅",titulo:"Agenda",roles:["todos"],
    resumen:"Calendario de eventos, trabajos, horarios y participantes.",
    pasos:[
      "Selecciona el día que quieras consultar.",
      "Abre un evento o trabajo para ver su información.",
      "Usa el botón superior Volver para regresar sin recorrer toda la pantalla.",
      "Si tienes permiso de edición, utiliza Editar desde la parte superior."
    ],
    palabras:"agenda calendario evento cita horario participante responsable dirección"
  },
  {
    id:"trabajos",icono:"🛠️",titulo:"Trabajos",roles:["todos"],
    resumen:"Consulta y ejecución de trabajos, materiales, archivos e historial.",
    pasos:[
      "Abre el trabajo que tengas que realizar.",
      "Comprueba cliente, dirección, estado, equipo y planificación.",
      "Consulta materiales, archivos, notas e historial cuando sea necesario.",
      "Si el trabajo está en curso, utiliza las acciones disponibles para registrar su avance.",
      "Usa Volver o Editar desde la parte superior."
    ],
    palabras:"trabajo obra cliente material archivo foto nota historial equipo planificación estado"
  },
  {
    id:"clientes",icono:"👥",titulo:"Clientes",roles:["todos"],
    resumen:"Datos y documentación de clientes.",
    pasos:[
      "Busca por los datos disponibles del cliente.",
      "Abre su ficha cuando esté disponible el modo consulta.",
      "La edición debe utilizarse solo cuando necesites modificar datos."
    ],
    aviso:"Pendiente: permitir abrir la ficha del cliente en modo consulta sin entrar directamente en Editar.",
    palabras:"cliente contacto teléfono email dirección documentos buscar"
  },
  {
    id:"vehiculos",icono:"🚗",titulo:"Vehículos",roles:["todos"],
    resumen:"Uso, devolución, incidencias, asistencia e historial de vehículos.",
    pasos:[
      "Pulsa Utilizar vehículo cuando esté libre y confirma los kilómetros.",
      "Si existen incidencias activas, confirma que las conoces antes de continuar.",
      "Durante el uso puedes consultar la ruta GPS, registrar incidencias o pedir asistencia.",
      "Al terminar, indica los kilómetros finales y devuelve el vehículo o transfiérelo a otro trabajador.",
      "La clasificación Laboral/Personal puede consultarse en el historial de uso cuando tengas permiso."
    ],
    palabras:"vehículo coche furgoneta usar devolver transferir kilometros km incidencia grua asistencia gps ruta laboral personal"
  },
  {
    id:"solicitudes",icono:"📝",titulo:"Solicitudes",roles:["todos"],
    resumen:"Vacaciones, permisos, ausencias y justificantes cuando estén habilitados.",
    pasos:[
      "Selecciona el tipo de solicitud.",
      "Indica las fechas y añade justificante cuando corresponda.",
      "Consulta posteriormente su estado."
    ],
    palabras:"solicitud vacaciones permiso ausencia justificante"
  },
  {
    id:"almacen",icono:"📦",titulo:"Almacén",roles:["admin","encargado"],
    resumen:"Gestión de existencias y movimientos de material.",
    pasos:[
      "Consulta existencias antes de registrar movimientos.",
      "Registra entradas o salidas con la información solicitada.",
      "Revisa el historial cuando necesites comprobar un movimiento."
    ],
    palabras:"almacen stock material existencia entrada salida"
  },
  {
    id:"usuarios",icono:"👤",titulo:"Usuarios",roles:["admin"],
    resumen:"Gestión de trabajadores, datos, documentación y configuración laboral.",
    pasos:[
      "Busca el usuario que quieras consultar o modificar.",
      "Revisa datos personales, contacto, documentos y datos laborales.",
      "Comprueba los permisos antes de conceder acceso a funciones administrativas."
    ],
    palabras:"usuario trabajador empleado permisos laboral documento horario"
  },
  {
    id:"control_fichajes",icono:"✅",titulo:"Control de fichajes",roles:["admin","encargado"],
    resumen:"Revisión administrativa de jornadas y fichajes.",
    pasos:[
      "Busca al trabajador o la fecha que necesites revisar.",
      "Comprueba los registros antes de modificarlos.",
      "Las acciones protegidas requieren autorización y deben conservar el motivo del cambio."
    ],
    palabras:"control fichaje jornada modificar borrar pin motivo administrador"
  },
  {
    id:"horas_extra",icono:"➕",titulo:"Horas extra",roles:["admin","encargado"],
    resumen:"Consulta y gestión de horas adicionales registradas.",
    pasos:[
      "Comprueba las horas pendientes del trabajador.",
      "Valida las horas cuando corresponda.",
      "Registra el pago o compensación únicamente cuando proceda."
    ],
    palabras:"hora extra validar pagar compensar trabajador"
  },
  {
    id:"configuracion",icono:"⚙️",titulo:"Configuración",roles:["admin"],
    resumen:"Ajustes generales, laborales y módulos disponibles.",
    pasos:[
      "Modifica únicamente los parámetros que correspondan a la empresa.",
      "Revisa horarios, vacaciones, convenio y reglas laborales antes de guardar.",
      "Evita cambiar módulos o permisos mientras otros usuarios estén trabajando si el cambio puede afectarles."
    ],
    palabras:"configuracion ajustes empresa laboral convenio vacaciones permisos modulo"
  },
  {
    id:"desarrollador",icono:"🛠️",titulo:"Desarrollador",roles:["dev"],
    resumen:"Diagnóstico, salud del sistema y herramientas técnicas.",
    pasos:[
      "Revisa primero el diagnóstico y el estado de salud.",
      "No ejecutes cambios técnicos sobre datos reales sin copia de seguridad.",
      "Conserva registro de cada modificación de estructura, archivo o servicio."
    ],
    palabras:"desarrollador diagnostico salud sistema auditoria tecnico"
  }
];

function visiblePara(u,item){
  if(item.roles.includes("todos")) return moduloActivo(item.id);
  if(item.roles.includes("dev") && esDev(u)) return moduloActivo(item.id);
  if(item.roles.includes("admin") && (esAdmin(u)||esDev(u))) return moduloActivo(item.id);
  if(item.roles.includes("encargado") && (esEncargado(u)||esAdmin(u)||esDev(u))) return moduloActivo(item.id);
  return false;
}
function contenidos(){
  const u=usuario();
  return BASE.filter(function(x){return visiblePara(u,x)});
}
function instalarCSS(){
  if(document.getElementById("zx_manual_css")) return;
  const s=document.createElement("style");
  s.id="zx_manual_css";
  s.textContent=`
    .zx_manual_wrap{max-width:980px;margin:0 auto;padding:4px 0 80px}
    .zx_manual_head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:18px}
    .zx_manual_head h1{margin:0;font-size:clamp(1.75rem,5vw,2.45rem);line-height:1.02;color:#0f172a}
    .zx_manual_head p{margin:8px 0 0;color:#64748b;font-weight:700}
    .zx_manual_role{background:#eef2ff;color:#3730a3;border-radius:999px;padding:8px 12px;font-weight:900;white-space:nowrap}
    .zx_manual_search{position:sticky;top:8px;z-index:20;background:rgba(255,255,255,.96);padding:8px 0 12px;backdrop-filter:blur(8px)}
    .zx_manual_search input{width:100%;box-sizing:border-box;border:2px solid #dbeafe;border-radius:18px;padding:15px 16px;font-size:1rem;font-weight:750;color:#0f172a;background:#fff;outline:none}
    .zx_manual_search input:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,.10)}
    .zx_manual_hint{margin:8px 2px 0;color:#64748b;font-size:.9rem;font-weight:700}
    .zx_manual_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}
    .zx_manual_card{border:1px solid #e2e8f0;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 7px 24px rgba(15,23,42,.05)}
    .zx_manual_card[hidden]{display:none!important}
    .zx_manual_btn{width:100%;border:0;background:#fff;text-align:left;padding:18px;display:flex;align-items:center;gap:13px;cursor:pointer;color:#0f172a}
    .zx_manual_icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#f1f5f9;font-size:1.45rem;flex:0 0 auto}
    .zx_manual_btn strong{display:block;font-size:1.08rem}
    .zx_manual_btn span{display:block;color:#64748b;font-weight:650;margin-top:3px;line-height:1.3}
    .zx_manual_arrow{margin-left:auto;font-weight:1000;color:#64748b;font-size:1.2rem}
    .zx_manual_body{padding:0 18px 18px;border-top:1px solid #f1f5f9}
    .zx_manual_body[hidden]{display:none!important}
    .zx_manual_body ol{margin:14px 0 0;padding-left:22px;color:#1e293b}
    .zx_manual_body li{margin:10px 0;line-height:1.42;font-weight:650}
    .zx_manual_notice{margin-top:14px;padding:12px 14px;border-radius:14px;background:#fff7ed;color:#9a3412;font-weight:800;border:1px solid #fed7aa}
    .zx_manual_empty{grid-column:1/-1;padding:28px;text-align:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b;font-weight:800}
    @media(max-width:700px){.zx_manual_grid{grid-template-columns:1fr}.zx_manual_head{display:block}.zx_manual_role{display:inline-block;margin-top:12px}.zx_manual_search{top:0}}
  `;
  document.head.appendChild(s);
}
function render(){
  instalarCSS();
  const u=usuario();
  const items=contenidos();
  const cont=app();
  if(!cont) return;
  cont.innerHTML=`
    <section class="zx_manual_wrap">
      <div class="zx_manual_head">
        <div>
          <h1>📖 Manual de uso</h1>
          <p>Ayuda de Zentryx PRO adaptada a las funciones disponibles para tu usuario.</p>
        </div>
        <div class="zx_manual_role">${limpiar(u.rol || "usuario")}</div>
      </div>
      <div class="zx_manual_search">
        <input id="zx_manual_buscar" type="search" placeholder="Buscar: fichaje, vehículo, trabajo, vacaciones…" autocomplete="off">
        <div class="zx_manual_hint" id="zx_manual_resultados">${items.length} apartado(s) disponibles</div>
      </div>
      <div class="zx_manual_grid" id="zx_manual_grid">
        ${items.map(function(x){return `
          <article class="zx_manual_card" data-manual-id="${limpiar(x.id)}" data-search="${limpiar(normalizar([x.titulo,x.resumen,x.palabras,(x.pasos||[]).join(" ")].join(" ")))}">
            <button type="button" class="zx_manual_btn" data-toggle="${limpiar(x.id)}">
              <span class="zx_manual_icon">${x.icono}</span>
              <span><strong>${limpiar(x.titulo)}</strong><span>${limpiar(x.resumen)}</span></span>
              <span class="zx_manual_arrow">⌄</span>
            </button>
            <div class="zx_manual_body" data-body="${limpiar(x.id)}" hidden>
              <ol>${(x.pasos||[]).map(function(p){return `<li>${limpiar(p)}</li>`}).join("")}</ol>
              ${x.aviso?`<div class="zx_manual_notice">${limpiar(x.aviso)}</div>`:""}
            </div>
          </article>`}).join("")}
        <div class="zx_manual_empty" id="zx_manual_vacio" hidden>No hay resultados para esta búsqueda.</div>
      </div>
    </section>`;

  cont.querySelectorAll("[data-toggle]").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.toggle;
      const body=cont.querySelector('[data-body="'+CSS.escape(id)+'"]');
      if(!body) return;
      const abrir=body.hidden;
      body.hidden=!abrir;
      const arrow=btn.querySelector(".zx_manual_arrow");
      if(arrow) arrow.textContent=abrir ? "⌃" : "⌄";
    };
  });

  const buscar=document.getElementById("zx_manual_buscar");
  const info=document.getElementById("zx_manual_resultados");
  const vacio=document.getElementById("zx_manual_vacio");
  buscar.oninput=function(){
    const q=normalizar(buscar.value);
    let visibles=0;
    cont.querySelectorAll(".zx_manual_card").forEach(function(card){
      const ok=!q || normalizar(card.dataset.search || "").includes(q);
      card.hidden=!ok;
      if(ok) visibles++;
    });
    info.textContent=visibles+" apartado(s) encontrado(s)";
    vacio.hidden=visibles!==0;
  };
}

window.ZX_manual=render;
window.ZX_abrirManual=render;
window.ZX_MANUAL_VERSION=ZX_VERSION;
})();
