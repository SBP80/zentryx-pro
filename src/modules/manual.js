// ===============================
// ZENTRYX PRO - MANUAL DE USO
// V1005 - INTENCIONES CONCRETAS PRIORIZADAS + SALIR + IR A FUNCION
// ===============================
(function(){
"use strict";

const ZX_VERSION="1005";

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
const ZX_STOPWORDS=new Set(["a","al","algo","como","con","de","del","el","en","es","esta","este","hacer","la","las","lo","los","me","mi","para","por","puedo","que","se","un","una","y"]);
function raizManual(p){
  p=normalizar(p).replace(/[^a-z0-9ñ]+/g,"");
  if(p.length<=4) return p;
  const finales=["amientos","imiento","aciones","acion","ando","iendo","ados","adas","ado","ada","idos","idas","ido","ida","mente","es","os","as","o","a"];
  for(const f of finales){if(p.length-f.length>=4 && p.endsWith(f)){p=p.slice(0,-f.length);break}}
  return p;
}
function tokensManual(v){
  const alias={finalizo:"finalizar",finalice:"finalizar",finalizar:"finalizar",termino:"finalizar",terminar:"finalizar",cierro:"finalizar",cerrar:"finalizar",completo:"finalizar",completar:"finalizar",obra:"trabajo",servicio:"trabajo"};
  return normalizar(v).replace(/[^a-z0-9ñ]+/g," ").split(/\s+/).filter(Boolean).map(x=>alias[x]||x).filter(x=>!ZX_STOPWORDS.has(x)).map(raizManual).filter(Boolean);
}
function puntuacionManual(item,consulta){
  const q=tokensManual(consulta);
  if(!q.length) return 1;

  const titulo=tokensManual(item.titulo||"");
  const palabras=tokensManual(item.palabras||"");
  const resumen=tokensManual(item.resumen||"");
  const pasos=tokensManual((item.pasos||[]).join(" "));
  const todos=new Set([...titulo,...palabras,...resumen,...pasos]);

  let score=0;
  let aciertos=0;
  for(const x of q){
    let peso=0;
    if(titulo.some(y=>y===x || y.startsWith(x) || x.startsWith(y))) peso=9;
    else if(palabras.some(y=>y===x || y.startsWith(x) || x.startsWith(y))) peso=6;
    else if(resumen.some(y=>y===x || y.startsWith(x) || x.startsWith(y))) peso=4;
    else if(pasos.some(y=>y===x || y.startsWith(x) || x.startsWith(y))) peso=2;
    if(peso){score+=peso;aciertos++}
  }

  // La consulta debe compartir al menos la mitad de sus términos útiles.
  if(aciertos<Math.max(1,Math.ceil(q.length/2))) return 0;

  const tq=new Set(q);
  if(tq.has("trabaj") && item.id==="trabajos") score+=24;
  if(tq.has("finaliz") && item.id==="trabajos") score+=24;
  if(tq.has("vehicul") && item.id==="vehiculos") score+=18;
  if(tq.has("fich") && item.id==="fichaje") score+=18;
  if(tq.has("client") && item.id==="clientes") score+=18;
  if(tq.has("agenda") && item.id==="agenda") score+=18;
  if(tq.has("usuari") && item.id==="usuarios") score+=18;
  if(tq.has("configur") && item.id==="configuracion") score+=18;

  return score;
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


function abrirModuloManual(id){
  try{
    if(window.ZX_ROUTER && typeof window.ZX_ROUTER.open==="function"){
      return window.ZX_ROUTER.open(id,{source:"manual"});
    }
  }catch(e){}
  const btn=document.querySelector('.zx_nav_btn[data-modulo="'+String(id||"")+'"]');
  if(btn){btn.click();return true}
  return false;
}
function salirManual(){
  try{
    if(window.ZX_ROUTER && typeof window.ZX_ROUTER.back==="function"){
      return window.ZX_ROUTER.back();
    }
  }catch(e){}
  return abrirModuloManual("inicio");
}

const AYUDAS_DIRECTAS=[
  {
    id:"finalizar_trabajo",
    modulo:"trabajos",
    titulo:"Finalizar un trabajo",
    consulta:"finalizar trabajo terminar trabajo cerrar trabajo completar trabajo finalizar jornada trabajo",
    resumen:"Pasos para cerrar correctamente un trabajo que está en curso.",
    pasos:[
      "Pulsa Ir a Trabajos y abre el trabajo que quieres terminar.",
      "Si hay una jornada activa, pulsa Finalizar jornada y confirma los datos solicitados. Esto cierra esa jornada, no necesariamente todo el trabajo.",
      "Comprueba que no queden jornadas pendientes y que notas, materiales, fotos y demás datos necesarios estén guardados.",
      "Cuando el servicio esté realmente terminado, cambia el estado del trabajo a Realizado/Finalizado desde la ficha del trabajo.",
      "Comprueba que el trabajo ya figure como terminado y que no quede ninguna jornada activa."
    ]
  },
  {
    id:"finalizar_jornada_trabajo",
    modulo:"trabajos",
    titulo:"Finalizar una jornada de trabajo",
    consulta:"finalizar jornada trabajo terminar jornada trabajo cerrar jornada trabajo",
    resumen:"Cierra la jornada actual sin dar por terminado necesariamente todo el trabajo.",
    pasos:[
      "Abre el trabajo en curso.",
      "Pulsa Finalizar jornada.",
      "Revisa y confirma la información que Zentryx solicite antes de guardar.",
      "El trabajo puede seguir pendiente si tiene más jornadas planificadas."
    ]
  },
  {
    id:"crear_trabajo",
    modulo:"trabajos",
    titulo:"Crear un trabajo",
    consulta:"crear trabajo nuevo trabajo dar alta trabajo",
    resumen:"Abre el alta de un nuevo trabajo y completa sus datos principales.",
    pasos:[
      "Entra en Trabajos y pulsa Crear.",
      "Indica título, estado, prioridad, cliente y responsable principal.",
      "Selecciona las personas que acudirán al trabajo y completa la planificación necesaria.",
      "Guarda el trabajo y comprueba que aparece en Trabajos y Agenda cuando corresponda."
    ]
  },
  {
    id:"crear_cliente",
    modulo:"clientes",
    titulo:"Crear un cliente",
    consulta:"crear cliente nuevo cliente dar alta cliente",
    resumen:"Registra un cliente nuevo desde el módulo Clientes.",
    pasos:[
      "Entra en Clientes y pulsa Crear.",
      "Selecciona el tipo de cliente y completa sus datos principales.",
      "Añade los datos de contacto y direcciones que correspondan.",
      "Guarda y comprueba que aparece en el listado."
    ]
  },
  {
    id:"crear_usuario",
    modulo:"usuarios",
    titulo:"Crear un usuario",
    consulta:"crear usuario nuevo usuario trabajador empleado dar alta usuario",
    resumen:"Da de alta un usuario nuevo respetando los controles administrativos.",
    pasos:[
      "Entra en Usuarios y pulsa Crear.",
      "Confirma el PIN de administrador cuando Zentryx lo solicite.",
      "Completa los datos personales, de contacto y laborales necesarios.",
      "Asigna el rol y los permisos que correspondan antes de guardar."
    ]
  },
  {
    id:"usar_vehiculo",
    modulo:"vehiculos",
    titulo:"Comenzar a utilizar un vehículo",
    consulta:"usar vehiculo utilizar vehiculo recoger vehiculo empezar vehiculo",
    resumen:"Registra correctamente el inicio de uso de un vehículo disponible.",
    pasos:[
      "Abre Vehículos y selecciona el vehículo disponible.",
      "Pulsa Utilizar vehículo.",
      "Comprueba las incidencias activas, si existen, e indica los kilómetros al recogerlo.",
      "Confirma el uso. Zentryx registrará el responsable y el inicio."
    ]
  },
  {
    id:"devolver_vehiculo",
    modulo:"vehiculos",
    titulo:"Devolver un vehículo",
    consulta:"devolver vehiculo finalizar uso vehiculo dejar libre vehiculo",
    resumen:"Cierra el uso actual y deja el vehículo disponible.",
    pasos:[
      "Abre el vehículo que tienes en uso.",
      "Pulsa Finalizar uso.",
      "Indica los kilómetros actuales y cualquier incidencia u observación necesaria.",
      "Pulsa Devolver y dejar libre."
    ]
  },
  {
    id:"incidencia_vehiculo",
    modulo:"vehiculos",
    titulo:"Registrar una incidencia de vehículo",
    consulta:"incidencia vehiculo averia vehiculo problema vehiculo registrar incidencia",
    resumen:"Registra una avería o incidencia asociada al vehículo.",
    pasos:[
      "Abre Vehículos y pulsa Incidencias en el vehículo correspondiente.",
      "Pulsa Registrar incidencia.",
      "Selecciona el tipo y la gravedad, y describe brevemente lo ocurrido.",
      "Guarda la incidencia y comprueba que figura en el historial del vehículo."
    ]
  },
  {
    id:"fichar_entrada",
    modulo:"fichaje",
    titulo:"Registrar la entrada",
    consulta:"fichar entrada comenzar jornada iniciar jornada fichaje entrada",
    resumen:"Registra el comienzo de tu jornada laboral.",
    pasos:[
      "Entra en Fichaje.",
      "Pulsa Entrada o la acción de inicio que muestre tu estado actual.",
      "Confirma el fichaje cuando Zentryx lo solicite.",
      "Si se solicita vehículo o kilometraje, revisa los datos antes de confirmar."
    ]
  },
  {
    id:"fichar_salida",
    modulo:"fichaje",
    titulo:"Registrar la salida",
    consulta:"fichar salida terminar jornada laboral finalizar jornada laboral fichaje salida",
    resumen:"Registra el final de la jornada laboral.",
    pasos:[
      "Entra en Fichaje.",
      "Pulsa Salida cuando tu jornada esté activa y el estado permita cerrarla.",
      "Completa los datos que Zentryx solicite y confirma.",
      "Consulta Mis jornadas si quieres revisar el registro."
    ]
  }
];

function puntuacionAyudaDirecta(ayuda,consulta){
  const q=tokensManual(consulta);
  if(!q.length) return 0;
  const t=tokensManual([ayuda.titulo,ayuda.consulta,ayuda.resumen,(ayuda.pasos||[]).join(" ")].join(" "));
  let score=0,aciertos=0;
  for(const x of q){
    if(t.some(y=>y===x || y.startsWith(x) || x.startsWith(y))){
      score+=6;aciertos++;
    }
  }
  if(aciertos<Math.max(1,Math.ceil(q.length*.6))) return 0;
  const qset=new Set(q);
  const at=tokensManual(ayuda.titulo+" "+ayuda.consulta);
  for(const x of qset){
    if(at.some(y=>y===x || y.startsWith(x) || x.startsWith(y))) score+=7;
  }
  return score;
}
function ayudaDirectaPara(consulta){
  const q=tokensManual(consulta);
  const set=new Set(q);
  const tiene=(raiz)=>[...set].some(x=>x===raiz || x.startsWith(raiz) || raiz.startsWith(x));
  const porId=(id)=>AYUDAS_DIRECTAS.find(x=>x.id===id) || null;

  // Prioridades explícitas para evitar que una pregunta concreta caiga en el
  // apartado general por empate entre tareas muy parecidas.
  if(tiene("finalizar") && tiene("trabaj")){
    if(tiene("jornad") || tiene("dia") || tiene("visita")){
      return porId("finalizar_jornada_trabajo");
    }
    return porId("finalizar_trabajo");
  }
  if((tiene("crear") || tiene("nuevo") || tiene("alta")) && tiene("trabaj")){
    return porId("crear_trabajo");
  }
  if((tiene("crear") || tiene("nuevo") || tiene("alta")) && tiene("client")){
    return porId("crear_cliente");
  }
  if((tiene("crear") || tiene("nuevo") || tiene("alta")) && tiene("usuari")){
    return porId("crear_usuario");
  }
  if((tiene("crear") || tiene("nuevo") || tiene("alta")) && tiene("vehicul")){
    return porId("crear_vehiculo");
  }
  if((tiene("devolv") || tiene("finalizar")) && tiene("vehicul")){
    return porId("devolver_vehiculo");
  }
  if(tiene("fich") && (tiene("salid") || tiene("finalizar"))){
    return porId("fichar_salida");
  }
  if(tiene("fich") && (tiene("entrad") || tiene("iniciar"))){
    return porId("fichar_entrada");
  }

  const lista=AYUDAS_DIRECTAS
    .map(x=>({ayuda:x,score:puntuacionAyudaDirecta(x,consulta)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score);

  if(!lista.length) return null;
  const primero=lista[0];
  const segundo=lista[1];

  // Para consultas no cubiertas por las prioridades anteriores conservamos
  // una protección frente a respuestas ambiguas.
  if(segundo && primero.score-segundo.score<3) return null;
  return primero.ayuda;
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
      "Para terminar una jornada de trabajo, abre el trabajo en curso y pulsa Finalizar jornada. Confirma los datos solicitados antes de guardar.",
      "Cuando ya no queden jornadas pendientes y el servicio esté terminado, revisa el estado del trabajo y déjalo como realizado/finalizado según las acciones disponibles.",
      "Usa Volver o Editar desde la parte superior."
    ],
    palabras:"trabajo obra servicio cliente material archivo foto nota historial equipo planificación estado finalizar finalizo finalice terminar termino cerrar cierro completar realizado finalizado finalizar jornada"
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
    .zx_manual_wrap{max-width:1040px;margin:0 auto;padding:14px 14px 90px;border-radius:28px;background:linear-gradient(180deg,#eef6ff 0,#f8fbff 48%,#f3f0ff 100%);border:2px solid #bfdbfe;box-shadow:inset 0 1px 0 #fff,0 14px 40px rgba(30,64,175,.08)}
    .zx_manual_head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:20px;border-radius:22px;background:linear-gradient(135deg,#172554,#1d4ed8);box-shadow:0 10px 28px rgba(30,64,175,.20);margin-bottom:16px}
    .zx_manual_head h1{margin:0;font-size:clamp(1.75rem,5vw,2.45rem);line-height:1.02;color:#fff}
    .zx_manual_head p{margin:8px 0 0;color:#dbeafe;font-weight:750}
    .zx_manual_role{background:#fff;color:#3730a3;border-radius:999px;padding:8px 12px;font-weight:900;white-space:nowrap;box-shadow:0 3px 12px rgba(15,23,42,.12)}
    .zx_manual_search{position:sticky;top:8px;z-index:20;background:#fff;padding:14px;border:2px solid #93c5fd;border-radius:20px;box-shadow:0 9px 24px rgba(30,64,175,.10);margin-bottom:16px}
    .zx_manual_search:before{content:"🔎 Buscar en la ayuda";display:block;color:#1e3a8a;font-weight:950;margin:0 0 9px 2px}
    .zx_manual_search input{width:100%;box-sizing:border-box;border:2px solid #dbeafe;border-radius:16px;padding:15px 16px;font-size:1rem;font-weight:800;color:#0f172a;background:#f8fbff;outline:none}
    .zx_manual_search input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.10);background:#fff}
    .zx_manual_hint{margin:9px 2px 0;color:#475569;font-size:.9rem;font-weight:800}
    .zx_manual_answer{margin:0 0 16px;padding:18px;border-radius:22px;background:#fff;border:3px solid #2563eb;box-shadow:0 12px 30px rgba(37,99,235,.14)}
    .zx_manual_answer[hidden]{display:none!important}
    .zx_manual_answer_label{font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:#2563eb;font-weight:1000;margin-bottom:5px}
    .zx_manual_answer h2{margin:0;color:#0f172a;font-size:1.35rem}
    .zx_manual_answer p{margin:5px 0 0;color:#64748b;font-weight:750}
    .zx_manual_answer ol{margin:14px 0 0;padding-left:23px;color:#172554}
    .zx_manual_answer li{margin:10px 0;line-height:1.42;font-weight:750}
    .zx_manual_actions{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 15px}
    .zx_manual_actions.bottom{margin:18px 0 0}
    .zx_manual_action{border:0;border-radius:14px;padding:12px 16px;font-weight:950;font-size:.95rem;cursor:pointer}
    .zx_manual_action.back{background:#e2e8f0;color:#0f172a}
    .zx_manual_action.go{background:#2563eb;color:#fff}
    .zx_manual_answer_query{margin:0 0 12px;padding:10px 12px;border-radius:13px;background:#eff6ff;color:#1e3a8a;font-weight:850}

    .zx_manual_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}
    .zx_manual_card{border:1px solid #dbeafe;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 7px 24px rgba(15,23,42,.05)}
    .zx_manual_card[hidden]{display:none!important}
    .zx_manual_card.is-best{border:2px solid #60a5fa}
    .zx_manual_btn{width:100%;border:0;background:#fff;text-align:left;padding:18px;display:flex;align-items:center;gap:13px;cursor:pointer;color:#0f172a}
    .zx_manual_icon{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:#eaf3ff;font-size:1.45rem;flex:0 0 auto}
    .zx_manual_btn strong{display:block;font-size:1.08rem}
    .zx_manual_btn span{display:block;color:#64748b;font-weight:650;margin-top:3px;line-height:1.3}
    .zx_manual_arrow{margin-left:auto;font-weight:1000;color:#2563eb;font-size:1.2rem}
    .zx_manual_body{padding:0 18px 18px;border-top:1px solid #dbeafe;background:#f8fbff}
    .zx_manual_body[hidden]{display:none!important}
    .zx_manual_body ol{margin:14px 0 0;padding-left:22px;color:#1e293b}
    .zx_manual_body li{margin:10px 0;line-height:1.42;font-weight:650}
    .zx_manual_notice{margin-top:14px;padding:12px 14px;border-radius:14px;background:#fff7ed;color:#9a3412;font-weight:800;border:1px solid #fed7aa}
    .zx_manual_empty{grid-column:1/-1;padding:28px;text-align:center;background:#fff;border:2px dashed #93c5fd;border-radius:18px;color:#64748b;font-weight:800}
    @media(max-width:700px){
      .zx_manual_wrap{margin:8px 8px 0;padding:10px 10px 80px;border-radius:22px}
      .zx_manual_grid{grid-template-columns:1fr}
      .zx_manual_head{display:block;padding:17px}
      .zx_manual_role{display:inline-block;margin-top:12px}
      .zx_manual_search{top:0}
    }
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
      <section class="zx_manual_answer" id="zx_manual_respuesta" hidden></section>
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
  const respuesta=document.getElementById("zx_manual_respuesta");

  function botonesRespuesta(modulo){
    return `
      <div class="zx_manual_actions">
        <button type="button" class="zx_manual_action back" data-manual-salir>← Salir del Manual</button>
        ${modulo?`<button type="button" class="zx_manual_action go" data-manual-ir="${limpiar(modulo)}">Ir a ${limpiar((items.find(x=>x.id===modulo)||{}).titulo || modulo)}</button>`:""}
      </div>
    `;
  }

  function activarBotonesRespuesta(){
    respuesta.querySelectorAll("[data-manual-salir]").forEach(btn=>btn.onclick=salirManual);
    respuesta.querySelectorAll("[data-manual-ir]").forEach(btn=>{
      btn.onclick=function(){abrirModuloManual(btn.dataset.manualIr)}
    });
  }

  function aplicarBusqueda(){
    const q=buscar.value;
    const nq=normalizar(q);
    const cards=[...cont.querySelectorAll(".zx_manual_card")];
    cards.forEach(c=>c.classList.remove("is-best"));

    if(!nq){
      cards.forEach(c=>{c.hidden=false;c.style.order=""});
      info.textContent=items.length+" apartado(s) disponibles";
      vacio.hidden=true;
      respuesta.hidden=true;
      respuesta.innerHTML="";
      return;
    }

    // Primero busca una tarea concreta. Si existe, responde solo a esa tarea.
    const directa=ayudaDirectaPara(q);
    if(directa && visiblePara(u,BASE.find(x=>x.id===directa.modulo) || {roles:["todos"],id:directa.modulo})){
      cards.forEach(c=>c.hidden=true);
      vacio.hidden=true;
      info.textContent="1 respuesta concreta";
      const acciones=botonesRespuesta(directa.modulo);
      respuesta.innerHTML=`
        ${acciones}
        <div class="zx_manual_answer_query">Tu pregunta: ${limpiar(q)}</div>
        <div class="zx_manual_answer_label">Respuesta</div>
        <h2>✅ ${limpiar(directa.titulo)}</h2>
        <p>${limpiar(directa.resumen)}</p>
        <ol>${(directa.pasos||[]).map(p=>`<li>${limpiar(p)}</li>`).join("")}</ol>
        <div class="zx_manual_actions bottom">
          <button type="button" class="zx_manual_action back" data-manual-salir>← Salir del Manual</button>
          <button type="button" class="zx_manual_action go" data-manual-ir="${limpiar(directa.modulo)}">Ir a ${limpiar((items.find(x=>x.id===directa.modulo)||{}).titulo || directa.modulo)}</button>
        </div>
      `;
      respuesta.hidden=false;
      activarBotonesRespuesta();
      return;
    }

    const resultados=items
      .map(item=>({item,score:puntuacionManual(item,q)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score);

    const mejor=resultados[0]?.score||0;
    const utiles=resultados.filter(x=>x.score>=Math.max(8,mejor*.42)).slice(0,4);
    const ids=new Set(utiles.map(x=>x.item.id));

    cards.forEach(function(card){
      const id=card.dataset.manualId;
      card.hidden=!ids.has(id);
      const pos=utiles.findIndex(x=>x.item.id===id);
      card.style.order=pos<0?"":String(pos);
    });

    info.textContent=utiles.length+" resultado(s) relevante(s)";
    vacio.hidden=utiles.length!==0;

    if(utiles.length){
      const principal=utiles[0].item;
      // La tarjeta del mismo módulo no se repite debajo de la respuesta.
      const card=cont.querySelector('[data-manual-id="'+CSS.escape(principal.id)+'"]');
      if(card) card.hidden=true;
      const acciones=botonesRespuesta(principal.id);
      respuesta.innerHTML=`
        ${acciones}
        <div class="zx_manual_answer_query">Tu pregunta: ${limpiar(q)}</div>
        <div class="zx_manual_answer_label">Respuesta relacionada</div>
        <h2>${principal.icono} ${limpiar(principal.titulo)}</h2>
        <p>${limpiar(principal.resumen)}</p>
        <ol>${(principal.pasos||[]).map(p=>`<li>${limpiar(p)}</li>`).join("")}</ol>
        ${principal.aviso?`<div class="zx_manual_notice">${limpiar(principal.aviso)}</div>`:""}
        <div class="zx_manual_actions bottom">
          <button type="button" class="zx_manual_action back" data-manual-salir>← Salir del Manual</button>
          <button type="button" class="zx_manual_action go" data-manual-ir="${limpiar(principal.id)}">Ir a ${limpiar(principal.titulo)}</button>
        </div>
      `;
      respuesta.hidden=false;
      activarBotonesRespuesta();
    }else{
      respuesta.hidden=true;
      respuesta.innerHTML="";
    }
  }

  buscar.oninput=aplicarBusqueda;

  // El Asistente puede abrir el Manual con una búsqueda ya escrita.
  setTimeout(function(){
    if(String(buscar.value||"").trim()) aplicarBusqueda();
  },0);
}

window.ZX_manual=render;
window.ZX_abrirManual=render;
window.ZX_MANUAL_VERSION=ZX_VERSION;
})();
