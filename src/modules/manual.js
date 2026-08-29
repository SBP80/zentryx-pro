// ===============================
// ZENTRYX PRO - MANUAL DE USO
// V1042 - AYUDA ACTUALIZADA A V3444
// ===============================
(function(){
"use strict";

const ZX_VERSION="1042";

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
  const alias={
    finalizo:"finalizar",finalice:"finalizar",finaliza:"finalizar",finalizar:"finalizar",finalizado:"finalizar",
    termino:"finalizar",termina:"finalizar",terminar:"finalizar",
    cierro:"finalizar",cierra:"finalizar",cerrar:"finalizar",
    completo:"finalizar",completa:"finalizar",completar:"finalizar",
    apruebo:"aprobar",aprueba:"aprobar",apruebe:"aprobar",aprobar:"aprobar",aprobado:"aprobar",aprobada:"aprobar",
    rechazo:"rechazar",rechaza:"rechazar",rechace:"rechazar",rechazar:"rechazar",rechazado:"rechazar",rechazada:"rechazar",
    deniego:"denegar",deniega:"denegar",denegar:"denegar",denegado:"denegar",denegada:"denegar",
    elimino:"eliminar",elimina:"eliminar",eliminar:"eliminar",eliminado:"eliminar",eliminada:"eliminar",
    borro:"borrar",borra:"borrar",borrar:"borrar",borrado:"borrar",borrada:"borrar",
    cancelo:"cancelar",cancela:"cancelar",cancelar:"cancelar",cancelado:"cancelar",cancelada:"cancelar",
    transfiero:"transferir",transfiere:"transferir",transferir:"transferir",transferido:"transferir",
    modifico:"modificar",modifica:"modificar",modificar:"modificar",modificado:"modificar",
    edito:"editar",edita:"editar",editar:"editar",editado:"editar",
    anado:"anadir",anade:"anadir",anadir:"anadir",anadido:"anadir",
    agrego:"anadir",agrega:"anadir",agregar:"anadir",
    incorporo:"anadir",incorpora:"anadir",incorporar:"anadir",
    quito:"quitar",quita:"quitar",quitar:"quitar",quitado:"quitar",
    veo:"ver",ve:"ver",ver:"ver",visto:"ver",
    consulto:"consultar",consulta:"consultar",consultar:"consultar",
    abro:"abrir",abre:"abrir",abrir:"abrir",
    visualizo:"ver",visualiza:"ver",visualizar:"ver",
    muestro:"ver",muestra:"ver",mostrar:"ver",
    reabro:"reabrir",reabre:"reabrir",reabrir:"reabrir",reabierto:"reabrir",reabierta:"reabrir",
    reactivo:"reabrir",reactiva:"reabrir",reactivar:"reabrir",reactivado:"reabrir",reactivada:"reabrir",
    archivo:"archivar",archiva:"archivar",archivar:"archivar",archivado:"archivado",archivada:"archivado",
    restauro:"restaurar",restaura:"restaurar",restaurar:"restaurar",restaurado:"restaurar",restaurada:"restaurar",
    recupero:"restaurar",recupera:"restaurar",recuperar:"restaurar",
    obra:"trabajo",servicio:"trabajo"
  };
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
  const modulo=String(id||"");
  try{
    if(window.ZX_ROUTER && typeof window.ZX_ROUTER.open==="function"){
      const r=window.ZX_ROUTER.open(modulo,{source:"manual"});
      if(r!==false) return r;
    }
  }catch(e){}

  const btn=document.querySelector('.zx_nav_btn[data-modulo="'+modulo+'"]');
  if(btn){btn.click();return true}

  const directos={
    monitor:"ZX_monitor_oficina",
    horas_extra:"ZX_horas_extra",
    almacen:"ZX_almacen",
    configuracion:"ZX_configuracion",
    usuarios:"ZX_usuarios",
    vehiculos:"ZX_vehiculos",
    clientes:"ZX_clientes",
    agenda:"ZX_agenda",
    trabajos:"ZX_trabajos",
    fichaje:"ZX_fichaje_real",
    inicio:"ZX_inicio"
  };
  const fn=directos[modulo];
  if(fn && typeof window[fn]==="function"){
    window[fn]();
    return true;
  }
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
    id:"consultar_trabajo",
    modulo:"trabajos",
    titulo:"Consultar un trabajo",
    consulta:"consultar trabajo ver trabajo abrir trabajo ficha trabajo revisar trabajo",
    resumen:"Abre la ficha de un trabajo para consultar sus datos sin modificarlo.",
    pasos:[
      "Entra en Trabajos.",
      "Localiza el trabajo que quieras consultar.",
      "Abre su ficha.",
      "Revisa cliente, dirección, estado, responsable, participantes y planificación.",
      "Consulta materiales, archivos, notas e historial cuando lo necesites.",
      "Usa Editar solo si realmente necesitas cambiar algún dato."
    ]
  },
  {
    id:"eliminar_trabajo",
    modulo:"trabajos",
    titulo:"Eliminar definitivamente un trabajo",
    consulta:"eliminar definitivamente trabajo borrar definitivamente trabajo eliminar trabajo borrar trabajo destruir trabajo",
    resumen:"Borra de forma definitiva un trabajo usando la protección administrativa correspondiente.",
    pasos:[
      "Abre Trabajos y localiza el trabajo que quieras eliminar definitivamente.",
      "Abre la ficha del trabajo.",
      "Pulsa Eliminar o Borrar definitivamente cuando la acción esté disponible.",
      "Confirma la acción y completa la autorización administrativa que Zentryx solicite.",
      "Indica el motivo del borrado si se solicita y confirma de nuevo.",
      "Comprueba que el trabajo ya no aparece en activos ni archivados."
    ]
  },
  {
    id:"archivar_trabajo",
    modulo:"trabajos",
    titulo:"Archivar un trabajo",
    consulta:"archivar trabajo terminado archivar trabajo finalizado guardar trabajo en archivados mover trabajo a archivados",
    resumen:"Mueve un trabajo terminado o que ya no necesitas ver entre los trabajos activos al apartado de archivados.",
    pasos:[
      "Abre Trabajos y localiza el trabajo que quieras archivar.",
      "Abre la ficha del trabajo.",
      "Pulsa Archivar cuando la acción esté disponible.",
      "Confirma la acción si Zentryx lo solicita.",
      "Comprueba que el trabajo deja de aparecer entre los activos y queda disponible en Archivados."
    ]
  },
  {
    id:"restaurar_trabajo",
    modulo:"trabajos",
    titulo:"Restaurar un trabajo archivado",
    consulta:"restaurar trabajo archivado recuperar trabajo archivado sacar trabajo de archivados volver trabajo archivado a activos",
    resumen:"Devuelve un trabajo archivado al listado normal para poder consultarlo o gestionarlo de nuevo.",
    pasos:[
      "Abre Trabajos y entra en Archivados.",
      "Localiza y abre el trabajo que quieras recuperar.",
      "Pulsa Restaurar cuando la acción esté disponible.",
      "Confirma la acción si Zentryx lo solicita.",
      "Comprueba que el trabajo vuelve a aparecer en el listado correspondiente."
    ]
  },
  {
    id:"reabrir_trabajo",
    modulo:"trabajos",
    titulo:"Reabrir un trabajo terminado",
    consulta:"reabrir trabajo terminado reactivar trabajo finalizado volver a abrir trabajo reabrir servicio terminado",
    resumen:"Devuelve un trabajo terminado a un estado activo o pendiente para poder continuar gestionándolo.",
    pasos:[
      "Abre Trabajos y localiza el trabajo terminado o finalizado.",
      "Abre la ficha del trabajo.",
      "Usa la acción disponible para reabrir, reactivar o cambiar su estado a Pendiente/En curso.",
      "Confirma el cambio si Zentryx lo solicita.",
      "Comprueba que el trabajo vuelve a figurar entre los trabajos activos y revisa su planificación antes de continuar."
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
    consulta:"crear cliente nuevo cliente dar alta cliente crear cliente empresa alta empresa cliente",
    resumen:"Registra un cliente nuevo, ya sea una persona o una empresa.",
    pasos:[
      "Entra en Clientes y pulsa Crear.",
      "Selecciona el tipo de cliente: Persona o Empresa.",
      "Si eliges Empresa, completa los datos fiscales y de identificación que correspondan, además de la persona de contacto cuando proceda.",
      "Añade teléfonos, emails y direcciones.",
      "Guarda y comprueba que el cliente aparece en el listado."
    ]
  },
  {
    id:"consultar_usuario",
    modulo:"usuarios",
    titulo:"Consultar un usuario",
    consulta:"consultar usuario ver usuario abrir usuario ficha usuario",
    resumen:"Abre la ficha de un usuario para consultar sus datos.",
    pasos:[
      "Entra en Usuarios.",
      "Localiza el usuario que quieras consultar.",
      "Abre su ficha.",
      "Revisa sus datos personales, de contacto, laborales, documentos, rol y permisos.",
      "Usa Editar solo si necesitas modificar algún dato."
    ]
  },
  {
    id:"buscar_usuario",
    modulo:"usuarios",
    titulo:"Buscar un usuario",
    consulta:"buscar usuario localizar usuario encontrar usuario buscar trabajador buscar empleado",
    resumen:"Localiza un usuario desde el buscador del módulo Usuarios.",
    pasos:[
      "Entra en Usuarios.",
      "Usa el buscador del listado.",
      "Escribe alguno de los datos disponibles del usuario.",
      "Revisa los resultados y abre el usuario que corresponda."
    ]
  },
  {
    id:"eliminar_usuario",
    modulo:"usuarios",
    titulo:"Eliminar un usuario",
    consulta:"eliminar usuario borrar usuario eliminar trabajador borrar empleado",
    resumen:"Elimina un usuario mediante la protección administrativa correspondiente.",
    pasos:[
      "Entra en Usuarios y abre el usuario.",
      "Pulsa Eliminar o la acción equivalente cuando esté disponible.",
      "Confirma la acción.",
      "Introduce la autorización administrativa que Zentryx solicite.",
      "Indica el motivo si se solicita y confirma el borrado."
    ]
  },
  {
    id:"anadir_documento_usuario",
    modulo:"usuarios",
    titulo:"Añadir un documento a un usuario",
    consulta:"añadir documento usuario anadir documento usuario subir documento usuario adjuntar archivo usuario",
    resumen:"Añade documentación a la ficha de un usuario.",
    pasos:[
      "Abre Usuarios y selecciona la persona.",
      "Entra en Documentos.",
      "Pulsa la opción para añadir o subir un archivo.",
      "Selecciona el documento y completa los datos necesarios.",
      "Guarda y comprueba que aparece asociado al usuario."
    ]
  },
  {
    id:"consultar_documento_usuario",
    modulo:"usuarios",
    titulo:"Consultar un documento de un usuario",
    consulta:"consultar documento usuario ver documento usuario abrir documento usuario revisar archivo usuario",
    resumen:"Consulta un documento guardado en la ficha de un usuario.",
    pasos:[
      "Abre Usuarios y selecciona la persona.",
      "Entra en Documentos.",
      "Localiza el documento que quieras consultar.",
      "Ábrelo o usa la vista disponible para revisarlo."
    ]
  },
  {
    id:"eliminar_documento_usuario",
    modulo:"usuarios",
    titulo:"Eliminar un documento de un usuario",
    consulta:"eliminar documento usuario borrar documento usuario quitar documento usuario eliminar archivo usuario",
    resumen:"Elimina un documento asociado al usuario sin borrar al usuario.",
    pasos:[
      "Abre Usuarios y selecciona la persona.",
      "Entra en Documentos.",
      "Localiza el documento que quieras eliminar.",
      "Pulsa Eliminar o Borrar.",
      "Confirma la acción cuando Zentryx lo solicite.",
      "Comprueba que el documento ya no aparece."
    ]
  },
  {
    id:"desactivar_usuario",
    modulo:"usuarios",
    titulo:"Desactivar un usuario",
    consulta:"desactivar usuario inactivar usuario bloquear usuario deshabilitar usuario",
    resumen:"Desactiva el acceso de un usuario sin borrar su ficha.",
    pasos:[
      "Entra en Usuarios y abre el usuario.",
      "Pulsa Editar o la acción de estado disponible.",
      "Cambia su estado a inactivo o desactivado.",
      "Confirma la autorización administrativa si Zentryx la solicita.",
      "Guarda y comprueba que el usuario ya no queda activo."
    ]
  },
  {
    id:"activar_usuario",
    modulo:"usuarios",
    titulo:"Volver a activar un usuario",
    consulta:"activar usuario reactivar usuario volver activar usuario habilitar usuario",
    resumen:"Devuelve a estado activo un usuario desactivado.",
    pasos:[
      "Entra en Usuarios y localiza el usuario desactivado.",
      "Abre su ficha.",
      "Usa la acción para activar o cambia su estado a activo.",
      "Confirma la autorización administrativa si Zentryx la solicita.",
      "Guarda y comprueba que vuelve a figurar como activo."
    ]
  },
  {
    id:"cambiar_pin_usuario",
    modulo:"usuarios",
    titulo:"Cambiar el PIN de un usuario",
    consulta:"cambiar pin usuario modificar pin usuario nuevo pin usuario restablecer pin usuario",
    resumen:"Cambia el PIN de acceso de un usuario mediante los controles administrativos.",
    pasos:[
      "Entra en Usuarios y abre el usuario.",
      "Accede a la opción de edición o seguridad correspondiente.",
      "Selecciona la opción para cambiar o restablecer el PIN.",
      "Completa la autorización administrativa que Zentryx solicite.",
      "Guarda el nuevo PIN y comprueba que el cambio queda aplicado."
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
    id:"permisos_usuario", modulo:"usuarios", titulo:"Permisos de un usuario",
    consulta:"cambiar permisos usuario modificar permisos usuario permisos trabajador acceso usuario",
    resumen:"El administrador puede decidir qué módulos puede abrir cada usuario desde su ficha.",
    pasos:[
      "Entra en Usuarios y abre la ficha del usuario.",
      "Pulsa Editar.",
      "En Acceso a módulos marca o desmarca las zonas que puede utilizar.",
      "Guarda los cambios.",
      "Los administradores tienen acceso automático a todos los módulos activos de la empresa."
    ]
  },
  {
    id:"rol_usuario", modulo:"usuarios", titulo:"Cambiar el rol de un usuario",
    consulta:"cambiar rol usuario hacer administrador quitar administrador gerente supervisor encargado administrativo comercial tecnico operario oficina invitado",
    resumen:"Cambia el perfil de acceso del usuario desde el campo Rol.",
    pasos:[
      "Entra en Usuarios y abre el usuario.",
      "Pulsa Editar.",
      "En el campo Rol elige Administrador, Gerente, Supervisor, Encargado, Administrativo, Comercial, Técnico, Operario, Oficina o Invitado.",
      "Guarda los cambios y comprueba que el usuario aparece con el nuevo rol."
    ]
  },
  {
    id:"login_usuario", modulo:"usuarios", titulo:"Cambiar el usuario de inicio de sesión",
    consulta:"cambiar nombre usuario inicio sesion trabajador login usuario acceso",
    resumen:"Modifica el identificador que el trabajador escribe para iniciar sesión.",
    pasos:[
      "Entra en Usuarios y abre el usuario.",
      "Pulsa Editar.",
      "Modifica el campo Usuario.",
      "Guarda los cambios y usa el nuevo identificador en el siguiente inicio de sesión."
    ]
  },
  {
    id:"nombre_usuario", modulo:"usuarios", titulo:"Cambiar el nombre de un usuario",
    consulta:"cambiar nombre apellidos usuario modificar nombre trabajador",
    resumen:"Modifica el nombre completo mostrado en la ficha del usuario.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Modifica el campo Nombre completo.","Guarda los cambios."]
  },
  {
    id:"dni_usuario", modulo:"usuarios", titulo:"Cambiar el DNI o NIE de un usuario",
    consulta:"cambiar dni nie usuario modificar dni trabajador",
    resumen:"Actualiza el documento identificativo guardado en la ficha.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Modifica el campo DNI / NIE.","Guarda los cambios."]
  },
  {
    id:"telefono_usuario", modulo:"usuarios", titulo:"Cambiar teléfonos de un usuario",
    consulta:"cambiar telefono movil usuario telefono personal telefono empresa trabajador",
    resumen:"La ficha dispone de teléfono personal y teléfono de empresa.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Modifica Teléfono personal o Teléfono empresa según corresponda.","Guarda los cambios."]
  },
  {
    id:"email_usuario", modulo:"usuarios", titulo:"Cambiar emails de un usuario",
    consulta:"cambiar email correo usuario email personal email empresa trabajador",
    resumen:"La ficha dispone de email personal y email de empresa.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Modifica Email personal o Email empresa según corresponda.","Guarda los cambios."]
  },
  {
    id:"direccion_usuario", modulo:"usuarios", titulo:"Cambiar la dirección de un usuario",
    consulta:"cambiar direccion domicilio usuario calle poblacion provincia codigo postal pais",
    resumen:"Actualiza los campos de dirección de la ficha del usuario.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Modifica tipo de vía, calle, número, portal, escalera, piso, puerta, población, provincia, código postal o país según corresponda.","Guarda los cambios."]
  },
  {
    id:"foto_usuario", modulo:"usuarios", titulo:"Cambiar la foto de un usuario",
    consulta:"cambiar foto usuario modificar foto perfil trabajador imagen usuario",
    resumen:"Sustituye la foto del usuario desde su formulario de edición.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","En Foto selecciona una imagen nueva desde el dispositivo.","Guarda los cambios para subir y asociar la nueva foto."]
  },
  {
    id:"eliminar_foto_usuario", modulo:"usuarios", titulo:"Quitar la foto de un usuario",
    consulta:"eliminar foto usuario borrar foto usuario quitar foto perfil trabajador",
    resumen:"Esta versión permite sustituir la foto, pero no muestra una acción específica para dejar la ficha sin foto.",
    pasos:["No uses Eliminar usuario: esa acción afecta a la ficha completa.","Si quieres cambiar la imagen, abre Usuarios, edita la ficha y selecciona otra foto.","La eliminación independiente de la foto no está disponible en esta versión."]
  },
  {
    id:"emergencia_usuario", modulo:"usuarios", titulo:"Cambiar el contacto de emergencia",
    consulta:"cambiar contacto emergencia usuario nombre relacion telefono email emergencia trabajador",
    resumen:"Modifica los datos de la persona de contacto para emergencias.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","En Contacto de emergencia modifica nombre, relación, teléfono, email u observaciones.","Guarda los cambios."]
  },
  {
    id:"telefono_emergencia_usuario", modulo:"usuarios", titulo:"Cambiar el teléfono de emergencia",
    consulta:"cambiar telefono emergencia usuario trabajador",
    resumen:"Actualiza solo el teléfono del contacto de emergencia.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Ve a Contacto de emergencia y modifica Teléfono emergencia.","Guarda los cambios."]
  },
  {
    id:"email_emergencia_usuario", modulo:"usuarios", titulo:"Cambiar el email de emergencia",
    consulta:"cambiar email emergencia correo emergencia usuario trabajador",
    resumen:"Actualiza solo el email del contacto de emergencia.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Editar.","Ve a Contacto de emergencia y modifica Email emergencia.","Guarda los cambios."]
  },
  {
    id:"datos_laborales_usuario", modulo:"usuarios", titulo:"Cambiar datos laborales de un usuario",
    consulta:"cambiar datos laborales usuario laboral trabajador convenio calendario vacaciones asuntos horas",
    resumen:"Los datos laborales se gestionan desde la ficha del usuario, en Laboral.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Revisa jornada, días de trabajo, vacaciones, asuntos propios, precios de horas extra, calendario laboral y convenio.","Si eres administrador, modifica los campos necesarios y pulsa Guardar laboral."]
  },
  {
    id:"horario_laboral_usuario", modulo:"usuarios", titulo:"Cambiar el horario laboral de un usuario",
    consulta:"cambiar horario laboral usuario jornada semanal horas dia horas semana dias trabajo trabajador",
    resumen:"Ajusta la jornada y los días de trabajo desde el apartado Laboral.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Modifica Horas por día, Horas por semana y los días de trabajo que correspondan.","Pulsa Guardar laboral y completa la autorización administrativa si se solicita."]
  },
  {
    id:"vacaciones_usuario", modulo:"usuarios", titulo:"Cambiar los días de vacaciones de un usuario",
    consulta:"cambiar dias vacaciones usuario vacaciones anuales trabajador",
    resumen:"Modifica el número anual de días de vacaciones del usuario.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Modifica Vacaciones anuales en días.","Pulsa Guardar laboral y completa la autorización administrativa si se solicita."]
  },
  {
    id:"asuntos_propios_usuario", modulo:"usuarios", titulo:"Cambiar los asuntos propios de un usuario",
    consulta:"cambiar asuntos propios usuario dias asuntos horas asuntos trabajador",
    resumen:"En esta versión los asuntos propios se configuran en horas, no en días.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Modifica Asuntos propios en horas.","Pulsa Guardar laboral y completa la autorización administrativa si se solicita."]
  },
  {
    id:"calendario_laboral_usuario", modulo:"usuarios", titulo:"Cambiar el calendario laboral de un usuario",
    consulta:"cambiar calendario laboral usuario pais comunidad autonoma provincia localidad festivos trabajador",
    resumen:"Cada usuario puede usar el calendario de empresa o tener un calendario propio.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","En Calendario laboral desactiva Usar calendario de empresa si esa persona necesita valores propios.","Selecciona País, Comunidad autónoma, Provincia y Localidad.","Pulsa Guardar laboral."]
  },
  {
    id:"horario_laboral_no_automatico", modulo:"usuarios", titulo:"Restablecer o asignar un horario laboral",
    consulta:"restablecer horario laboral usuario asignar horario nuevo usuario horario todos dias horario completo",
    resumen:"El horario se modifica manualmente desde Laboral; esta versión no incluye un botón para restablecer una plantilla automática.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Ajusta Horas por día, Horas por semana y los días de trabajo.","Pulsa Guardar laboral.","Si quieres volver a un horario anterior, debes introducir de nuevo sus valores; no hay una acción de restablecimiento automático en esta versión."]
  },
  {
    id:"copiar_horario_usuario", modulo:"usuarios", titulo:"Copiar el horario de un usuario a otro",
    consulta:"copiar horario laboral usuario otro duplicar horario trabajador",
    resumen:"Esta versión no dispone de una acción para copiar automáticamente el horario entre usuarios.",
    pasos:["Abre el usuario cuyo horario quieras consultar y entra en Laboral.","Anota Horas por día, Horas por semana y días de trabajo.","Abre el segundo usuario y entra en Laboral.","Introduce los mismos valores y guarda."]
  },
  {
    id:"limite_horas_extra_usuario", modulo:"usuarios", titulo:"Límite de horas extra de un usuario",
    consulta:"limite horas extra usuario maximo horas extra trabajador",
    resumen:"En la ficha Laboral actual se pueden configurar precios de horas extra, pero no aparece un campo para fijar un límite individual de horas extra.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral para revisar los campos disponibles.","Puedes cambiar los precios de hora extra normal, nocturna y festiva cuando tu permiso lo permita.","El límite individual de horas extra no es configurable en esta versión."]
  },
  {
    id:"tipo_jornada_usuario", modulo:"usuarios", titulo:"Tipo de jornada de un usuario",
    consulta:"tipo jornada usuario jornada completa parcial reducir jornada trabajador",
    resumen:"La ficha Laboral actual no tiene un selector denominado Tipo de jornada.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Configura Horas por día, Horas por semana y los días de trabajo según el horario real.","No existe un campo independiente para elegir jornada completa, parcial u otro tipo en esta versión."]
  },
  {
    id:"calendario_general_usuario", modulo:"usuarios", titulo:"Volver al calendario laboral de empresa",
    consulta:"calendario laboral general empresa usuario volver asignar calendario empresa trabajador",
    resumen:"El usuario puede volver a heredar el calendario definido para la empresa.",
    pasos:["Entra en Usuarios y abre el usuario.","Pulsa Laboral.","Activa Usar calendario de empresa.","Pulsa Guardar laboral y comprueba que los datos mostrados corresponden a la configuración de empresa."]
  },
  {
    id:"config_idioma", modulo:"configuracion", titulo:"Idioma de Zentryx",
    consulta:"cambiar idioma empresa aplicacion español ingles",
    resumen:"La interfaz actual está disponible en español y Ajustes no ofrece un selector de idioma operativo.",
    pasos:["Abre Ajustes.","Consulta Aplicación para ver el estado del idioma.","No cambies datos de empresa intentando modificar el idioma: esa opción todavía no está disponible."]
  },
  {
    id:"config_formato_fecha", modulo:"configuracion", titulo:"Formato de fecha",
    consulta:"cambiar formato fecha empresa dd mm aaaa aaaa mm dd",
    resumen:"La interfaz actual utiliza DD/MM/AAAA y Ajustes no ofrece un selector general de formato operativo.",
    pasos:["Abre Ajustes.","Consulta Aplicación para ver el formato utilizado.","No existe en esta versión una opción general para cambiarlo a AAAA-MM-DD."]
  },
  {
    id:"config_festivos_empresa", modulo:"configuracion", titulo:"Calendario laboral y festivos de empresa",
    consulta:"festivos empresa calendario festivos nacional autonomico provincial local municipio comunidad provincia pais laboral empresa",
    resumen:"Ajustes > Laboral define la configuración laboral de empresa y el calendario que pueden heredar los usuarios.",
    pasos:["Abre Ajustes.","Pulsa Abrir configuración laboral.","Revisa País, Comunidad autónoma, Provincia, Localidad y año.","Gestiona los festivos disponibles y guarda los cambios.","En Usuarios > Laboral, activa Usar calendario de empresa para quienes deban heredar esta configuración."]
  },
  {
    id:"config_numeracion", modulo:"configuracion", titulo:"Numeraciones y series",
    consulta:"numeracion empresa serie series prefijo sufijo numero inicial reiniciar numeracion nuevo año facturas presupuestos albaranes pedidos partes ordenes incidencias clientes proveedores vehiculos usuarios trabajos informes documentos contratos nominas fichajes jornadas gastos compras ventas cobros pagos recibos remesas domiciliaciones transferencias devoluciones abonos notas credito debito anticipos depositos reservas inventarios almacen lotes",
    resumen:"Esta versión no dispone de un panel para editar numeraciones, series, prefijos, sufijos ni el número inicial de documentos o registros.",
    pasos:["No cambies datos de Trabajos, Usuarios, Clientes, Vehículos o Almacén para intentar modificar una numeración.","La configuración de series, prefijos, sufijos, número inicial y reinicio anual no está disponible en esta versión.","Cuando se añada esta función deberá gestionarse desde Configuración y mostrar claramente qué numeración afecta a cada tipo de registro."]
  },
  {
    id:"config_opcion_no_disponible", modulo:"configuracion", titulo:"Ajuste no disponible en esta versión",
    consulta:"zona horaria formato hora moneda simbolo moneda iva por defecto empresa",
    resumen:"El ajuste solicitado no aparece entre las opciones configurables actuales.",
    pasos:["Abre Ajustes para revisar las opciones disponibles.","Aplicación muestra como información las funciones que todavía no tienen un ajuste operativo.","Zona horaria, formato de hora, moneda, símbolo de moneda e IVA por defecto no tienen un campo configurable en esta versión."]
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
  },
  {
    id:"editar_trabajo", modulo:"trabajos", titulo:"Editar un trabajo",
    consulta:"editar trabajo modificar trabajo cambiar datos trabajo",
    resumen:"Abre un trabajo existente y modifica sus datos.",
    pasos:["Pulsa Ir a Trabajos y abre el trabajo que quieras modificar.","Pulsa Editar trabajo en la parte superior.","Cambia únicamente los datos necesarios.","Guarda los cambios y comprueba que la ficha muestra la información nueva."]
  },
  {
    id:"planificar_trabajo", modulo:"trabajos", titulo:"Planificar un trabajo",
    consulta:"planificar trabajo fecha cambiar fecha horario cambiar horario responsable cambiar responsable participantes añadir participantes quitar participantes añadir trabajador quitar trabajador añadir usuario quitar usuario equipo personas jornadas",
    resumen:"Asigna fecha, horario y personas al trabajo.",
    pasos:["Abre el trabajo desde Trabajos.","Entra en Editar trabajo.","Selecciona el responsable principal y las personas que acudirán.","Añade o modifica la planificación con fecha y horario.","Guarda y comprueba que aparece correctamente en Agenda."]
  },
  {
    id:"materiales_trabajo", modulo:"trabajos", titulo:"Gestionar materiales de un trabajo",
    consulta:"materiales trabajo añadir material borrar material editar material lista compra",
    resumen:"Consulta y modifica los materiales asociados a un trabajo.",
    pasos:["Abre el trabajo correspondiente.","Ve al apartado Materiales.","Añade, edita o elimina los materiales necesarios.","Guarda los cambios y revisa que el listado quede actualizado."]
  },
  {
    id:"archivos_trabajo", modulo:"trabajos", titulo:"Añadir archivos o fotos a un trabajo",
    consulta:"añadir archivo trabajo añadir foto trabajo subir archivo subir foto adjuntar documento trabajo",
    resumen:"Guarda fotos y documentos asociados al trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado Archivos.","Selecciona el archivo o foto que quieras subir.","Añade nombre o notas si corresponde y confirma la subida.","Comprueba que aparece en la ficha del trabajo."]
  },
  {
    id:"editar_archivo_trabajo", modulo:"trabajos", titulo:"Renombrar o modificar un archivo de un trabajo",
    consulta:"renombrar archivo trabajo modificar archivo trabajo editar archivo trabajo cambiar nombre foto archivo",
    resumen:"Cambia el nombre o los datos disponibles de un archivo asociado al trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado Archivos.","Localiza el archivo o foto que quieras cambiar.","Pulsa Renombrar o Editar según la opción disponible.","Guarda y comprueba que el cambio queda reflejado."]
  },
  {
    id:"eliminar_archivo_trabajo", modulo:"trabajos", titulo:"Eliminar un archivo o foto de un trabajo",
    consulta:"eliminar archivo trabajo borrar archivo trabajo eliminar foto trabajo borrar foto trabajo quitar documento trabajo",
    resumen:"Elimina un archivo o una foto asociados al trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado Archivos.","Localiza el archivo o foto que quieras eliminar.","Pulsa Eliminar y confirma la acción cuando Zentryx lo solicite.","Comprueba que el archivo ya no aparece en la ficha del trabajo."]
  },
  {
    id:"consultar_archivo_trabajo", modulo:"trabajos", titulo:"Consultar archivos o fotos de un trabajo",
    consulta:"ver archivo trabajo consultar archivo trabajo ver foto trabajo consultar foto trabajo abrir documento trabajo vista previa",
    resumen:"Consulta los archivos, fotos y documentos asociados al trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado Archivos.","Localiza el archivo, foto o documento.","Ábrelo o usa la vista previa disponible para consultarlo."]
  },
  {
    id:"compartir_archivo_trabajo", modulo:"trabajos", titulo:"Compartir un archivo de un trabajo",
    consulta:"compartir archivo trabajo compartir foto trabajo enviar archivo trabajo enviar documento trabajo",
    resumen:"Comparte un archivo o documento asociado al trabajo usando las opciones disponibles.",
    pasos:["Abre el trabajo.","Ve al apartado Archivos.","Localiza el archivo que quieras compartir.","Pulsa Compartir.","Elige el destino o aplicación disponible y completa el envío."]
  },
  {
    id:"notas_trabajo", modulo:"trabajos", titulo:"Añadir una nota a un trabajo",
    consulta:"añadir nota trabajo nueva nota comentario trabajo registrar nota seguimiento trabajo",
    resumen:"Registra información de seguimiento dentro del trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado de notas o historial.","Escribe la información que quieras dejar registrada.","Guarda y comprueba que queda asociada al trabajo."]
  },
  {
    id:"editar_nota_trabajo", modulo:"trabajos", titulo:"Modificar una nota de un trabajo",
    consulta:"editar nota trabajo modificar nota trabajo cambiar nota corregir nota",
    resumen:"Modifica una nota existente asociada a un trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado de notas o historial.","Localiza la nota que quieras modificar.","Pulsa Editar o Modificar, realiza el cambio y guarda.","Comprueba que la información actualizada queda asociada al trabajo."]
  },
  {
    id:"eliminar_nota_trabajo", modulo:"trabajos", titulo:"Eliminar una nota de un trabajo",
    consulta:"eliminar nota trabajo borrar nota trabajo quitar nota",
    resumen:"Elimina una nota existente del trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado de notas o historial.","Localiza la nota que quieras eliminar.","Pulsa Eliminar y confirma la acción cuando Zentryx lo solicite.","Comprueba que la nota ya no aparece en el apartado correspondiente."]
  },
  {
    id:"consultar_notas_trabajo", modulo:"trabajos", titulo:"Consultar notas e historial de un trabajo",
    consulta:"ver notas trabajo consultar notas trabajo historial trabajo seguimiento trabajo",
    resumen:"Consulta la información de seguimiento registrada en el trabajo.",
    pasos:["Abre el trabajo.","Ve al apartado de notas o historial.","Revisa las notas y registros disponibles.","Usa la información mostrada para consultar el seguimiento del trabajo."]
  },
  {
    id:"abrir_trabajo_agenda", modulo:"agenda", titulo:"Abrir un trabajo desde Agenda",
    consulta:"abrir trabajo agenda ver trabajo desde agenda",
    resumen:"Accede a la ficha del trabajo desde su evento de Agenda.",
    pasos:["Pulsa Ir a Agenda.","Abre el día y el evento vinculado al trabajo.","Pulsa Abrir trabajo.","Zentryx abrirá la ficha del trabajo correspondiente."]
  },
  {
    id:"crear_evento_agenda", modulo:"agenda", titulo:"Crear un evento en Agenda",
    consulta:"crear evento agenda nuevo evento cita agenda recordatorio agenda",
    resumen:"Añade un evento nuevo al calendario.",
    pasos:["Pulsa Ir a Agenda.","Selecciona el día en el calendario.","Pulsa la opción para crear un nuevo evento.","Completa tipo, horario, participantes, dirección y demás datos necesarios.","Guarda el evento."]
  },
  {
    id:"editar_evento_agenda", modulo:"agenda", titulo:"Editar un evento de Agenda",
    consulta:"editar evento agenda modificar evento agenda cambiar cita agenda",
    resumen:"Modifica un evento existente del calendario.",
    pasos:["Abre Agenda y selecciona el evento.","Pulsa Editar evento.","Cambia los datos necesarios y guarda.","Si el evento está vinculado a un trabajo, realiza los cambios importantes desde Trabajos."]
  },
  {
    id:"eliminar_evento_agenda", modulo:"agenda", titulo:"Eliminar un evento de Agenda",
    consulta:"eliminar evento agenda borrar evento agenda",
    resumen:"Borra un evento respetando las protecciones de Zentryx.",
    pasos:["Abre el evento desde Agenda.","Pulsa Eliminar.","Confirma la acción.","Si Zentryx solicita PIN de administrador, introdúcelo para completar el borrado.","Los eventos vinculados a trabajos pueden requerir gestionarse desde Trabajos."]
  },
  {
    id:"crear_vehiculo", modulo:"vehiculos", titulo:"Crear un vehículo",
    consulta:"crear vehiculo nuevo vehiculo alta vehiculo añadir vehiculo",
    resumen:"Da de alta un vehículo nuevo en la flota.",
    pasos:["Pulsa Ir a Vehículos.","Pulsa Crear.","Completa matrícula, marca, modelo, kilómetros y el resto de datos necesarios.","Guarda y comprueba que aparece en el listado."]
  },
  {
    id:"transferir_vehiculo", modulo:"vehiculos", titulo:"Transferir un vehículo a otro trabajador",
    consulta:"transferir vehiculo otro trabajador cambiar responsable vehiculo entregar vehiculo",
    resumen:"Entrega el vehículo en uso a otro trabajador sin dejarlo libre.",
    pasos:["Abre el vehículo que tienes en uso.","Pulsa Finalizar uso.","Selecciona Transferir a otro trabajador.","Elige el nuevo responsable e indica el motivo.","Confirma la transferencia."]
  },
  {
    id:"asignar_responsable_vehiculo", modulo:"vehiculos", titulo:"Asignar responsable habitual a un vehículo",
    consulta:"asignar responsable vehiculo cambiar responsable habitual vehiculo",
    resumen:"Asocia un responsable habitual al vehículo.",
    pasos:["Abre Vehículos y despliega Más opciones en el vehículo.","Pulsa Asignar responsable o Cambiar responsable.","Selecciona el usuario correspondiente.","Confirma el cambio y comprueba que aparece como responsable."]
  },
  {
    id:"ver_ruta_vehiculo", modulo:"vehiculos", titulo:"Consultar la ruta GPS de un vehículo",
    consulta:"ruta gps vehiculo historial gps recorrido vehiculo localizar vehiculo",
    resumen:"Consulta los puntos GPS registrados durante un uso.",
    pasos:["Abre Vehículos.","En el vehículo correspondiente pulsa Ver ruta GPS o Historial GPS.","Selecciona el recorrido que quieras consultar.","Revisa los puntos y el trazado mostrados en el mapa."]
  },
  {
    id:"aviso_grua", modulo:"vehiculos", titulo:"Pedir asistencia o aviso de grúa",
    consulta:"grua asistencia carretera averia llamar asistencia seguro vehiculo",
    resumen:"Abre el centro de emergencia con los datos del vehículo y del seguro.",
    pasos:["Abre el vehículo correspondiente.","Pulsa Aviso grúa.","Mantén la pantalla abierta para tener visibles vehículo, póliza y ubicación.","Pulsa Llamar a asistencia cuando necesites contactar con el seguro.","Si procede, registra también la incidencia."]
  },
  {
    id:"gestionar_incidencia_vehiculo", modulo:"vehiculos", titulo:"Gestionar una incidencia de vehículo",
    consulta:"gestionar incidencia vehiculo cerrar incidencia cambiar gravedad incidencia",
    resumen:"Actualiza estado, gravedad, seguimiento y solución de una incidencia.",
    pasos:["Abre Vehículos y entra en Incidencias.","Pulsa Ver y gestionar en la incidencia correspondiente.","Actualiza Estado o Severidad si es necesario.","Añade seguimiento o comentario y la solución cuando corresponda.","Guarda los cambios."]
  },
  {
    id:"fichaje_descanso", modulo:"fichaje", titulo:"Registrar un descanso",
    consulta:"descanso fichaje iniciar descanso terminar descanso pausa fichaje",
    resumen:"Registra el inicio y el fin de un descanso dentro de la jornada.",
    pasos:["Entra en Fichaje con la jornada iniciada.","Pulsa Elegir acción y selecciona el inicio de descanso.","Cuando termines, vuelve a Fichaje y pulsa Finalizar descanso.","Comprueba que ambos movimientos aparecen registrados."]
  },
  {
    id:"fichaje_comida", modulo:"fichaje", titulo:"Registrar la comida",
    consulta:"comida fichaje iniciar comida terminar comida pausa comida",
    resumen:"Registra correctamente el periodo de comida.",
    pasos:["Entra en Fichaje con la jornada iniciada.","Pulsa Elegir acción y selecciona el inicio de comida.","Al volver, pulsa Finalizar comida.","Comprueba que los dos movimientos quedan registrados."]
  },
  {
    id:"mis_jornadas", modulo:"fichaje", titulo:"Consultar Mis jornadas",
    consulta:"mis jornadas ver jornadas horas trabajadas historial fichaje",
    resumen:"Consulta tus jornadas y fichajes anteriores.",
    pasos:["Pulsa Ir a Fichaje.","Abre Ver mis jornadas.","Selecciona la jornada que quieras revisar.","Consulta horas, movimientos y demás información registrada."]
  },
  {
    id:"panel_admin_fichaje", modulo:"fichaje", titulo:"Abrir el panel de administración de Fichaje",
    consulta:"panel admin fichaje jornadas trabajadores revisar fichajes administrador",
    resumen:"Consulta y administra las jornadas de los usuarios.",
    pasos:["Entra en Fichaje con un usuario autorizado.","Pulsa Ver panel admin.","Busca o selecciona el usuario y la jornada que quieras revisar.","Usa las acciones administrativas disponibles respetando PIN y motivos cuando Zentryx los solicite."]
  },
  {
    id:"buscar_cliente", modulo:"clientes", titulo:"Buscar un cliente",
    consulta:"buscar cliente localizar cliente encontrar cliente buscar clientes",
    resumen:"Localiza un cliente usando el buscador del módulo Clientes.",
    pasos:[
      "Entra en Clientes.",
      "Usa el buscador del listado.",
      "Escribe uno de los datos disponibles del cliente.",
      "Revisa los resultados y abre el cliente que corresponda."
    ]
  },
  {
    id:"editar_cliente", modulo:"clientes", titulo:"Editar un cliente",
    consulta:"editar cliente modificar cliente cambiar datos cliente",
    resumen:"Modifica los datos guardados de un cliente.",
    pasos:["Pulsa Ir a Clientes.","Abre el cliente.","Pulsa Editar.","Cambia los datos necesarios y guarda."]
  },
  {
    id:"documentos_cliente", modulo:"clientes", titulo:"Gestionar documentos de un cliente",
    consulta:"añadir documento cliente subir documento cliente adjuntar archivo cliente",
    resumen:"Añade documentación asociada al cliente.",
    pasos:["Abre el cliente correspondiente.","Entra en Documentos.","Selecciona el archivo que quieras subir si tienes permiso.","Guarda y comprueba que queda asociado al cliente."]
  },
  {
    id:"consultar_documento_cliente", modulo:"clientes", titulo:"Consultar un documento de un cliente",
    consulta:"consultar documento cliente ver documento cliente abrir documento cliente revisar archivo cliente",
    resumen:"Consulta un documento guardado dentro de la ficha del cliente.",
    pasos:["Abre el cliente correspondiente.","Entra en Documentos.","Localiza el documento que quieras consultar.","Ábrelo o usa la vista disponible para revisarlo."]
  },
  {
    id:"eliminar_documento_cliente", modulo:"clientes", titulo:"Eliminar un documento de un cliente",
    consulta:"eliminar documento cliente borrar documento cliente quitar documento cliente eliminar archivo cliente borrar archivo cliente",
    resumen:"Elimina un documento asociado al cliente sin borrar el cliente.",
    pasos:["Abre el cliente correspondiente.","Entra en Documentos.","Localiza el documento que quieras eliminar.","Pulsa Eliminar o Borrar.","Confirma la acción cuando Zentryx lo solicite.","Comprueba que el documento ya no aparece en la ficha del cliente."]
  },
  {
    id:"eliminar_cliente", modulo:"clientes", titulo:"Eliminar un cliente",
    consulta:"eliminar cliente borrar cliente",
    resumen:"Elimina un cliente usando la protección administrativa.",
    pasos:["Abre Clientes y selecciona el cliente.","Pulsa Eliminar.","Confirma la acción.","Introduce el PIN de administrador cuando Zentryx lo solicite."]
  },
  {
    id:"editar_usuario", modulo:"usuarios", titulo:"Editar un usuario",
    consulta:"editar usuario modificar usuario cambiar datos trabajador",
    resumen:"Modifica los datos de un usuario existente.",
    pasos:["Pulsa Ir a Usuarios.","Abre el usuario.","Pulsa Editar si tu rol lo permite.","Modifica los datos necesarios y guarda."]
  },
  {
    id:"laboral_usuario", modulo:"usuarios", titulo:"Consultar o editar datos laborales de un usuario",
    consulta:"laboral usuario horario vacaciones convenio horas usuario",
    resumen:"Accede a la información laboral del usuario.",
    pasos:["Abre Usuarios y selecciona la persona.","Entra en Laboral.","Consulta horarios y demás datos disponibles.","Si eres administrador, modifica únicamente los campos necesarios y guarda."]
  },
  {
    id:"documentos_usuario", modulo:"usuarios", titulo:"Consultar documentos de un usuario",
    consulta:"documentos usuario archivos trabajador dni contrato usuario",
    resumen:"Accede a la documentación personal permitida para ese usuario.",
    pasos:["Abre Usuarios y selecciona la persona.","Entra en Documentos.","Consulta o añade archivos según tus permisos.","La documentación personal puede estar limitada al administrador o al propio usuario."]
  }
,
  {
    id:"comenzar_dia", modulo:"fichaje", titulo:"Comenzar mi día",
    consulta:"comenzar mi dia empezar jornada iniciar jornada comenzar jornada",
    resumen:"Desde Inicio puedes pasar directamente a Fichaje para registrar la entrada.",
    pasos:[
      "En Inicio pulsa Comenzar mi día.",
      "Zentryx abrirá Fichaje.",
      "Revisa el vehículo si corresponde y confirma la entrada.",
      "Comprueba que la jornada queda como Trabajando."
    ]
  },
  {
    id:"abrir_trabajo_inicio", modulo:"inicio", titulo:"Abrir un trabajo desde Inicio",
    consulta:"abrir trabajo inicio trabajo de hoy mi dia",
    resumen:"Accede desde Inicio al trabajo previsto para hoy.",
    pasos:[
      "En Inicio localiza el trabajo previsto.",
      "Pulsa Abrir trabajo.",
      "Revisa dirección, equipo, planificación y estado antes de actuar."
    ]
  },
  {
    id:"entrada_almacen", modulo:"almacen", titulo:"Registrar una entrada de almacén",
    consulta:"entrada almacen añadir stock recibir material stock almacen",
    resumen:"Registra material que entra en una ubicación del almacén.",
    pasos:[
      "Abre Almacén.",
      "Pulsa Añadir stock o Entrada según el punto desde el que trabajes.",
      "Selecciona material, ubicación y cantidad.",
      "Completa los datos solicitados y guarda la entrada.",
      "Comprueba que la existencia se ha actualizado."
    ]
  },
  {
    id:"salida_almacen", modulo:"almacen", titulo:"Registrar una salida de almacén",
    consulta:"salida almacen sacar material descontar stock consumo almacen",
    resumen:"Descuenta material de una ubicación dejando trazabilidad.",
    pasos:[
      "Abre Almacén y localiza la existencia.",
      "Pulsa Salida.",
      "Indica cantidad y los datos solicitados.",
      "Guarda y comprueba el nuevo stock."
    ]
  },
  {
    id:"transferir_stock", modulo:"almacen", titulo:"Transferir material entre ubicaciones",
    consulta:"transferir stock material otra ubicacion mover almacen",
    resumen:"Mueve existencias de una ubicación del almacén a otra.",
    pasos:[
      "Abre Almacén y localiza el material.",
      "Abre Opciones.",
      "Pulsa Transferir a otra ubicación.",
      "Selecciona destino y cantidad.",
      "Confirma la transferencia y revisa ambas existencias."
    ]
  },
  {
    id:"ajustar_stock", modulo:"almacen", titulo:"Corregir el stock físico",
    consulta:"ajustar stock fisico recuento almacen corregir existencia",
    resumen:"Corrige una diferencia entre el stock registrado y el stock contado.",
    pasos:[
      "Abre Almacén y localiza la existencia.",
      "Abre Opciones.",
      "Pulsa Ajustar stock físico.",
      "Indica la cantidad real y el motivo cuando corresponda.",
      "Guarda el ajuste."
    ]
  },
  {
    id:"stock_minimo", modulo:"almacen", titulo:"Cambiar el stock mínimo",
    consulta:"stock minimo almacen aviso minimo material",
    resumen:"Define el nivel a partir del cual el material necesita reposición.",
    pasos:[
      "Abre Almacén y localiza el material.",
      "Abre Opciones.",
      "Pulsa Cambiar stock mínimo.",
      "Introduce el nuevo valor y guarda."
    ]
  },
  {
    id:"crear_reserva_almacen", modulo:"almacen", titulo:"Crear una reserva de material",
    consulta:"crear reserva almacen reservar material trabajo",
    resumen:"Reserva material para evitar que quede disponible para otros usos.",
    pasos:[
      "Abre Almacén y entra en Reservas.",
      "Pulsa Nueva reserva.",
      "Selecciona trabajo, material, ubicación y cantidad según aparezca en el formulario.",
      "Confirma la reserva."
    ]
  },
  {
    id:"gestionar_reserva_almacen", modulo:"almacen", titulo:"Gestionar una reserva de material",
    consulta:"gestionar reserva almacen preparar consumir devolver cancelar reserva",
    resumen:"Actualiza una reserva cuando preparas, consumes, devuelves o cancelas material.",
    pasos:[
      "Abre Almacén y entra en Reservas.",
      "Localiza la reserva y pulsa Gestionar reserva.",
      "Elige Registrar preparación, Registrar consumo, Registrar devolución o Cancelar reserva según corresponda.",
      "Confirma los datos solicitados."
    ]
  },
  {
    id:"modificar_fichaje_admin", modulo:"fichaje", titulo:"Modificar un fichaje",
    consulta:"modificar fichaje corregir fichaje editar fichaje administrador trabajador empleado usuario",
    resumen:"Corrige un fichaje desde las herramientas administrativas dejando registro del cambio.",
    pasos:[
      "Abre Fichaje y entra en el panel administrativo.",
      "Busca la jornada y el fichaje.",
      "Pulsa Modificar.",
      "Introduce la autorización solicitada y el motivo del cambio.",
      "Guarda y comprueba que la modificación queda identificada."
    ]
  },
  {
    id:"borrar_fichaje_admin", modulo:"fichaje", titulo:"Borrar un fichaje",
    consulta:"borrar fichaje eliminar fichaje administrador",
    resumen:"Elimina un fichaje con las confirmaciones administrativas correspondientes.",
    pasos:[
      "Abre Fichaje y entra en el panel administrativo.",
      "Busca el fichaje.",
      "Pulsa Borrar.",
      "Confirma la acción, introduce la autorización y deja el motivo cuando Zentryx lo solicite."
    ]
  },
  {
    id:"validar_horas_extra", modulo:"horas_extra", titulo:"Validar horas extra",
    consulta:"validar horas extra aprobar horas extra",
    resumen:"Valida las horas extra pendientes según el nivel de autorización.",
    pasos:[
      "Abre Horas extra.",
      "Localiza el registro pendiente.",
      "Pulsa Validar horas cuando corresponda.",
      "Si requiere validación administrativa, utiliza Validar admin con un usuario autorizado.",
      "Comprueba que el estado de validación se actualiza."
    ]
  },
  {
    id:"pagar_horas_extra", modulo:"horas_extra", titulo:"Marcar horas extra como pagadas",
    consulta:"pagar horas extra marcar pagadas horas extra",
    resumen:"Registra que unas horas extra validadas ya han sido pagadas.",
    pasos:[
      "Abre Horas extra.",
      "Localiza las horas que correspondan.",
      "Pulsa Marcar pagadas.",
      "Confirma la operación y revisa que dejan de figurar como pendientes de pago."
    ]
  },
  {
    id:"cobrar_horas_extra", modulo:"horas_extra", titulo:"Marcar horas extra como cobradas",
    consulta:"cobrar horas extra marcar cobradas trabajador",
    resumen:"Registra la confirmación de cobro de las horas extra.",
    pasos:[
      "Abre Horas extra.",
      "Localiza el registro correspondiente.",
      "Pulsa Marcar cobradas cuando la acción esté disponible.",
      "Comprueba que el estado queda actualizado."
    ]
  },
  {
    id:"config_empresa", modulo:"configuracion", titulo:"Cambiar los datos de empresa",
    consulta:"configurar empresa nombre empresa sector logo ajustes empresa",
    resumen:"Modifica los datos generales mostrados por Zentryx.",
    pasos:[
      "Abre Ajustes.",
      "Entra en Empresa.",
      "Modifica únicamente los datos necesarios.",
      "Pulsa Guardar y comprueba el resultado."
    ]
  },
  {
    id:"config_apariencia", modulo:"configuracion", titulo:"Cambiar la apariencia de Zentryx",
    consulta:"cambiar apariencia tema colores configuracion apariencia",
    resumen:"Modifica las opciones visuales disponibles de la aplicación.",
    pasos:[
      "Abre Ajustes.",
      "Entra en Apariencia.",
      "Selecciona las opciones deseadas.",
      "Pulsa Guardar."
    ]
  },
  {
    id:"config_modulos", modulo:"configuracion", titulo:"Activar o desactivar módulos",
    consulta:"activar modulo desactivar modulo configuracion modulos",
    resumen:"Gestiona qué módulos están habilitados para la empresa.",
    pasos:[
      "Abre Ajustes.",
      "Entra en Módulos.",
      "Cambia únicamente los módulos que deban estar disponibles.",
      "Guarda los ajustes.",
      "Comprueba el acceso con los perfiles afectados antes de darlo por terminado."
    ]
  },
  {
    id:"config_laboral", modulo:"configuracion", titulo:"Abrir la configuración laboral",
    consulta:"configuracion laboral convenio vacaciones asuntos propios horario laboral",
    resumen:"Accede a los parámetros laborales utilizados por jornadas, vacaciones y horas.",
    pasos:[
      "Abre Ajustes.",
      "Entra en Laboral o pulsa Abrir configuración laboral.",
      "Revisa los parámetros del usuario o empresa que corresponda.",
      "Guarda únicamente después de comprobar los valores."
    ]
  },
  {
    id:"monitor_oficina", modulo:"monitor", titulo:"Abrir el Monitor de oficina",
    consulta:"monitor oficina pantalla grande trabajos vehiculos incidencias agenda",
    resumen:"Muestra en una pantalla grande el estado operativo disponible de Zentryx.",
    pasos:[
      "Desde Trabajos pulsa Monitor de oficina.",
      "Revisa Agenda de hoy, próximos trabajos, estados e incidencias mostradas.",
      "Pulsa Pantalla completa para usarlo como panel de oficina.",
      "Pulsa Salir para volver a Zentryx."
    ]
  },
  {
    id:"dev_forzar_sync", modulo:"desarrollador", titulo:"Forzar sincronización",
    consulta:"forzar sync sincronizacion desarrollador cola pendiente",
    resumen:"Solicita un nuevo intento de sincronización desde las herramientas técnicas.",
    pasos:[
      "Abre Desarrollador con el perfil técnico.",
      "Revisa primero el estado de red y la cola pendiente.",
      "Pulsa Forzar sync.",
      "Comprueba el resultado antes de repetir la acción."
    ]
  },
  {
    id:"dev_limpiar_cache", modulo:"desarrollador", titulo:"Limpiar caché técnica",
    consulta:"limpiar cache desarrollador borrar cache",
    resumen:"Borra la caché desde el panel técnico cuando sea necesario para diagnóstico.",
    pasos:[
      "Abre Desarrollador.",
      "Comprueba antes que no haya trabajo pendiente que dependa de datos guardados localmente.",
      "Pulsa Limpiar caché.",
      "Recarga y verifica el funcionamiento."
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
  const textoNormalizado=normalizar(consulta||"").replace(/[^a-z0-9ñ]+/g," ").replace(/\s+/g," ").trim();

  const porIdRapido=(id)=>AYUDAS_DIRECTAS.find(x=>x.id===id) || null;

  // Configuración: capturar primero las consultas de numeración para que palabras
  // como trabajo, usuario, reserva, entrada o salida no desvíen la respuesta.
  if(/\b(numeracion|serie|series|prefijo|sufijo)\b/.test(textoNormalizado) ||
     (/\b(numero inicial|reinicio|reiniciar)\b/.test(textoNormalizado) && /\b(empresa|factura|presupuesto|documento|registro)\b/.test(textoNormalizado))){
    return porIdRapido("config_numeracion");
  }

  // Ajustes de empresa que todavía no existen como campos configurables.
  if(/\b(zona horaria|formato de hora|moneda|simbolo de moneda|iva por defecto)\b/.test(textoNormalizado)){
    return porIdRapido("config_opcion_no_disponible");
  }

  if(/\b(formato de fecha)\b/.test(textoNormalizado)) return porIdRapido("config_formato_fecha");
  if(/\b(idioma)\b/.test(textoNormalizado) && /\b(empresa|zentryx|aplicacion)\b/.test(textoNormalizado)) return porIdRapido("config_idioma");

  if((/\b(festivo|festivos|calendario de festivos|comunidad autonoma|municipio de festivos|provincia de festivos)\b/.test(textoNormalizado) || /\b(calendario laboral)\b/.test(textoNormalizado)) && /\b(empresa)\b/.test(textoNormalizado)){
    return porIdRapido("config_festivos_empresa");
  }

  // Usuarios: resolver antes que Fichaje, Trabajos y tarjetas generales.
  if(/\b(usuario|usuarios|trabajador|trabajadores|empleado|empleados)\b/.test(textoNormalizado)){
    // La foto es un subobjeto del usuario: quitarla nunca debe convertirse en borrar la ficha.
    if(/\b(foto|imagen)\b/.test(textoNormalizado)){
      if(/\b(elimino|eliminar|borro|borrar|quito|quitar)\b/.test(textoNormalizado)) return porIdRapido("eliminar_foto_usuario");
      if(/\b(cambio|cambiar|modifico|modificar|edito|editar|sustituyo|sustituir)\b/.test(textoNormalizado)) return porIdRapido("foto_usuario");
    }

    if(/\b(permiso|permisos)\b/.test(textoNormalizado)) return porIdRapido("permisos_usuario");
    if(/\b(rol|administrador|gerente|supervisor|encargado|administrativo|comercial|tecnico|operario|oficina|invitado)\b/.test(textoNormalizado) && /\b(cambio|cambiar|hago|hacer|quito|quitar|asigno|asignar)\b/.test(textoNormalizado)) return porIdRapido("rol_usuario");

    if(/\b(pin)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|restablezco|restablecer|nuevo|olvidado|olvido)\b/.test(textoNormalizado)) return porIdRapido("cambiar_pin_usuario");

    if(/\b(telefono de emergencia|telefono emergencia)\b/.test(textoNormalizado)) return porIdRapido("telefono_emergencia_usuario");
    if(/\b(email de emergencia|email emergencia|correo de emergencia|correo emergencia)\b/.test(textoNormalizado)) return porIdRapido("email_emergencia_usuario");
    if(/\b(contacto de emergencia|contacto emergencia)\b/.test(textoNormalizado)) return porIdRapido("emergencia_usuario");

    if(/\b(copio|copiar|duplico|duplicar)\b/.test(textoNormalizado) && /\b(horario)\b/.test(textoNormalizado)) return porIdRapido("copiar_horario_usuario");
    if(/\b(limite|maximo)\b/.test(textoNormalizado) && /\b(horas extra|hora extra)\b/.test(textoNormalizado)) return porIdRapido("limite_horas_extra_usuario");
    if(/\b(tipo de jornada|jornada completa|jornada parcial|reducida|reduccion de jornada)\b/.test(textoNormalizado)) return porIdRapido("tipo_jornada_usuario");
    if(/\b(restablezco|restablecer|asigno|asignar)\b/.test(textoNormalizado) && /\b(horario laboral|horario)\b/.test(textoNormalizado)) return porIdRapido("horario_laboral_no_automatico");
    if(/\b(horario)\b/.test(textoNormalizado) && /\b(todos los dias|completo)\b/.test(textoNormalizado)) return porIdRapido("horario_laboral_usuario");
    if(/\b(asuntos propios)\b/.test(textoNormalizado)) return porIdRapido("asuntos_propios_usuario");
    if(/\b(vacacion|vacaciones)\b/.test(textoNormalizado)) return porIdRapido("vacaciones_usuario");
    if(/\b(horario laboral|jornada semanal|horas por dia|horas por semana|dias de trabajo)\b/.test(textoNormalizado)) return porIdRapido("horario_laboral_usuario");
    if(/\b(calendario laboral general|calendario general)\b/.test(textoNormalizado)) return porIdRapido("calendario_general_usuario");
    if(/\b(calendario laboral)\b/.test(textoNormalizado)) return porIdRapido("calendario_laboral_usuario");
    if(/\b(datos laborales|laboral)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar|consulto|consultar)\b/.test(textoNormalizado)) return porIdRapido("datos_laborales_usuario");

    if(/\b(nombre de usuario|inicio de sesion|login)\b/.test(textoNormalizado)) return porIdRapido("login_usuario");
    if(/\b(dni|nie)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)) return porIdRapido("dni_usuario");
    if(/\b(telefono|telefonos|movil|moviles)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)) return porIdRapido("telefono_usuario");
    if(/\b(email|emails|correo|correos)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)) return porIdRapido("email_usuario");
    if(/\b(direccion|domicilio|calle|poblacion|provincia|codigo postal)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)) return porIdRapido("direccion_usuario");
    if(/\b(nombre|apellidos)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)) return porIdRapido("nombre_usuario");

    if(/\b(documento|documentos|archivo|archivos)\b/.test(textoNormalizado)){
      if(/\b(elimino|eliminar|borro|borrar|quito|quitar)\b/.test(textoNormalizado))
        return AYUDAS_DIRECTAS.find(x=>x.id==="eliminar_documento_usuario") || null;
      if(/\b(anado|añado|anadir|añadir|subo|subir|adjunto|adjuntar)\b/.test(textoNormalizado))
        return AYUDAS_DIRECTAS.find(x=>x.id==="anadir_documento_usuario") || null;
      if(/\b(veo|ver|consulto|consultar|abro|abrir|reviso|revisar)\b/.test(textoNormalizado))
        return AYUDAS_DIRECTAS.find(x=>x.id==="consultar_documento_usuario") || null;
    }

    if(/\b(elimino|eliminar|borro|borrar)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="eliminar_usuario") || null;

    if(/\b(busco|buscar|localizo|localizar|encuentro|encontrar)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="buscar_usuario") || null;

    if(/\b(consulto|consultar|veo|ver|abro|abrir)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="consultar_usuario") || null;

    if(/\b(desactivo|desactivar|inactivo|inactivar|bloqueo|bloquear|deshabilito|deshabilitar)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="desactivar_usuario") || null;

    if(/\b(reactivo|reactivar|activo|activar|habilito|habilitar)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="activar_usuario") || null;

    if(/\b(pin)\b/.test(textoNormalizado) && /\b(cambio|cambiar|modifico|modificar|restablezco|restablecer|nuevo)\b/.test(textoNormalizado))
      return AYUDAS_DIRECTAS.find(x=>x.id==="cambiar_pin_usuario") || null;
  }

  // Crear cliente empresa: resolver antes de cualquier regla de Trabajos o Configuración.
  if(
    /\b(creo|crear|nuevo|nueva|alta|anado|añado|anadir|añadir)\b/.test(textoNormalizado) &&
    /\b(cliente|clientes)\b/.test(textoNormalizado) &&
    /\b(empresa|sociedad|negocio)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="crear_cliente") || null;
  }

  // Buscar cliente: resolver antes de la tarjeta general de Clientes.
  if(
    /\b(busco|buscar|localizo|localizar|encuentro|encontrar)\b/.test(textoNormalizado) &&
    /\b(cliente|clientes)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="buscar_cliente") || null;
  }

  // Teléfonos y emails de cliente: resolver antes que "crear cliente".
  if(
    /\b(cliente|clientes)\b/.test(textoNormalizado) &&
    /\b(telefono|telefonos|movil|moviles|email|emails|correo|correos)\b/.test(textoNormalizado) &&
    /\b(anado|añado|anadir|añadir|agrego|agregar|cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="editar_cliente") || null;
  }

  // Direcciones de cliente: resolver antes que "crear cliente".
  if(
    /\b(cliente|clientes)\b/.test(textoNormalizado) &&
    /\b(direccion|direcciones|domicilio|domicilios)\b/.test(textoNormalizado) &&
    /\b(anado|añado|anadir|añadir|agrego|agregar|cambio|cambiar|modifico|modificar|edito|editar)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="editar_cliente") || null;
  }

  // Documentos de cliente: resolver antes que "eliminar cliente".
  if(
    /\b(elimino|eliminar|borro|borrar|quito|quitar)\b/.test(textoNormalizado) &&
    /\b(documento|documentos|archivo|archivos)\b/.test(textoNormalizado) &&
    /\b(cliente|clientes)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="eliminar_documento_cliente") || null;
  }

  // Consulta de trabajo: comprobación directa antes del sistema general.
  // Evita que "consulto/ver/abrir un trabajo" caiga en la tarjeta genérica de Trabajos.
  if(
    /\b(consulto|consultar|veo|ver|abro|abrir|reviso|revisar)\b/.test(textoNormalizado) &&
    /\b(trabajo|obra|servicio)\b/.test(textoNormalizado) &&
    !/\b(nota|notas|historial|material|materiales|archivo|archivos|foto|fotos|documento|documentos)\b/.test(textoNormalizado)
  ){
    return AYUDAS_DIRECTAS.find(x=>x.id==="consultar_trabajo") || null;
  }

  const q=tokensManual(consulta);
  const set=new Set(q);
  const tiene=(raiz)=>[...set].some(function(x){
    // Separación estricta entre "trabajo" y "trabajador":
    // - trabajador/empleado/usuario no deben activar "trabajo"
    // - "trabajo" tampoco debe contar como "trabajador"
    if(raiz==="trabaj" && (x.startsWith("trabajador") || x.startsWith("emplead") || x.startsWith("usuari"))) return false;
    if((raiz==="trabajador" || raiz.startsWith("trabajador")) && x==="trabaj") return false;
    return x===raiz || x.startsWith(raiz) || raiz.startsWith(x);
  });
  const porId=(id)=>AYUDAS_DIRECTAS.find(x=>x.id===id) || null;

  // 1) ACCIONES FUERTES: tienen prioridad sobre el tipo de objeto.
  // Trabajos
  if(tiene("trabaj")){
    if(
      (tiene("consult") || tiene("ver") || tiene("abrir") || tiene("revis")) &&
      !tiene("nota") &&
      !tiene("historial") &&
      !tiene("archiv") &&
      !tiene("foto") &&
      !tiene("document") &&
      !tiene("material")
    ) return porId("consultar_trabajo");
    if(tiene("elimin") || tiene("borr")) return porId("eliminar_trabajo");
    if(tiene("restaurar")) return porId("restaurar_trabajo");
    if(tiene("archivar")) return porId("archivar_trabajo");
    if(tiene("reabrir")) return porId("reabrir_trabajo");

    if(tiene("finaliz") || tiene("termin") || tiene("cerr")){
      if(tiene("jornad") || tiene("dia") || tiene("visita")) return porId("finalizar_jornada_trabajo");
      return porId("finalizar_trabajo");
    }

    // Fecha, horario, responsable, participantes, equipo y jornadas son
    // planificación aunque la consulta use verbos genéricos como cambiar/modificar.
    const cambiaPersonas=
      (tiene("anadir") || tiene("quitar") || tiene("cambi") || tiene("modific")) &&
      (
        tiene("trabajador") ||
        tiene("emplead") ||
        tiene("usuari") ||
        tiene("persona") ||
        tiene("participant") ||
        tiene("equipo")
      );

    if(
      cambiaPersonas ||
      tiene("planific") ||
      tiene("fecha") ||
      tiene("horari") ||
      tiene("participant") ||
      tiene("respons") ||
      tiene("equipo") ||
      tiene("jornad")
    ) return porId("planificar_trabajo");

    // Las acciones sobre notas tienen prioridad sobre la edición general del trabajo.
    if(tiene("nota") || tiene("coment") || tiene("seguim") || tiene("historial")){
      if(tiene("elimin") || tiene("borr") || tiene("quitar")) return porId("eliminar_nota_trabajo");
      if(tiene("edit") || tiene("modific") || tiene("cambi") || tiene("correg")) return porId("editar_nota_trabajo");
      if(tiene("ver") || tiene("consult") || tiene("historial")) return porId("consultar_notas_trabajo");
      return porId("notas_trabajo");
    }

    if(tiene("archiv") || tiene("foto") || tiene("document")){
      if(tiene("elimin") || tiene("borr") || tiene("quitar")) return porId("eliminar_archivo_trabajo");
      if(tiene("compart") || tiene("enviar")) return porId("compartir_archivo_trabajo");
      if(tiene("renombr") || tiene("edit") || tiene("modific") || tiene("cambi")) return porId("editar_archivo_trabajo");
      if(tiene("ver") || tiene("consult") || tiene("abrir") || tiene("vista")) return porId("consultar_archivo_trabajo");
      return porId("archivos_trabajo");
    }

    if(tiene("edit") || tiene("modific") || tiene("cambi")) return porId("editar_trabajo");
    if(tiene("material")) return porId("materiales_trabajo");
    if(tiene("crear") || tiene("nuevo") || tiene("alta") || tiene("anad")) return porId("crear_trabajo");
  }

  // Agenda
  if(tiene("agenda") || tiene("evento") || tiene("cita")){
    if(tiene("elimin") || tiene("borr")) return porId("eliminar_evento_agenda");
    if(tiene("edit") || tiene("modific") || tiene("cambi")) return porId("editar_evento_agenda");
    if(tiene("crear") || tiene("nuevo") || tiene("anad")) return porId("crear_evento_agenda");
    if(tiene("abr") && tiene("trabaj")) return porId("abrir_trabajo_agenda");
  }

  // Vehículos
  if(tiene("vehicul") || tiene("coche") || tiene("furgon")){
    if(tiene("transfer") || tiene("entreg")) return porId("transferir_vehiculo");
    if(tiene("devolv") || tiene("finaliz") || tiene("dej") && tiene("libre")) return porId("devolver_vehiculo");
    if(tiene("respons") || tiene("asign")) return porId("asignar_responsable_vehiculo");
    if(tiene("ruta") || tiene("gps") || tiene("recorr") || tiene("localiz")) return porId("ver_ruta_vehiculo");
    if(tiene("grua") || tiene("asist") || tiene("seguro")) return porId("aviso_grua");
    if(tiene("incid") && (tiene("gestion") || tiene("cerr") || tiene("solucion") || tiene("edit"))) return porId("gestionar_incidencia_vehiculo");
    if(tiene("crear") || tiene("nuevo") || tiene("alta") || tiene("anad")) return porId("crear_vehiculo");
  }

  // Fichaje y administración de jornadas
  if(tiene("fich") || tiene("jornad")){
    if(tiene("borr") || tiene("elimin")){
      return porId("borrar_fichaje_admin");
    }
    if(tiene("modific") || tiene("correg") || tiene("edit")){
      return porId("modificar_fichaje_admin");
    }
    if(tiene("descans") || tiene("paus")) return porId("fichaje_descanso");
    if(tiene("comid")) return porId("fichaje_comida");
    if(tiene("salid") || tiene("finaliz")) return porId("fichar_salida");
    if(tiene("entrad") || tiene("iniciar") || tiene("comenz")) return porId("fichar_entrada");
    if(tiene("mis") && tiene("jornad")) return porId("mis_jornadas");
  }

  // Horas extra
  if(tiene("extra") && tiene("hora")){
    if(tiene("pag") || tiene("pagar")) return porId("pagar_horas_extra");
    if(tiene("cobr") || tiene("cobrar")) return porId("cobrar_horas_extra");
    if(tiene("valid") || tiene("aprob")) return porId("validar_horas_extra");
  }

  // Almacén / reservas
  if(tiene("almacen") || tiene("stock") || tiene("reserv")){
    if(tiene("reserv")){
      if(tiene("gestion") || tiene("prepar") || tiene("consum") || tiene("devolv") || tiene("cancel")) return porId("gestionar_reserva_almacen");
      if(tiene("crear") || tiene("nuev") || tiene("reserv")) return porId("crear_reserva_almacen");
    }
    if(tiene("transfer") || tiene("mover")) return porId("transferir_stock");
    if(tiene("ajust") || tiene("recuent") || tiene("fisic") || tiene("correg")) return porId("ajustar_stock");
    if(tiene("minim")) return porId("stock_minimo");
    if(tiene("salid") || tiene("sac") || tiene("descont") || tiene("consum")) return porId("salida_almacen");
    if(tiene("entrad") || tiene("anad") || tiene("recib") || tiene("sumar")) return porId("entrada_almacen");
  }

  // Clientes
  if(tiene("client")){
    if(tiene("document") || tiene("archiv")){
      if(tiene("elimin") || tiene("borr") || tiene("quitar")) return porId("eliminar_documento_cliente");
      if(tiene("consult") || tiene("ver") || tiene("abrir") || tiene("revis")) return porId("consultar_documento_cliente");
      return porId("documentos_cliente");
    }

    if(tiene("elimin") || tiene("borr")) return porId("eliminar_cliente");
    if(tiene("edit") || tiene("modific") || tiene("cambi")) return porId("editar_cliente");
    if(tiene("crear") || tiene("nuevo") || tiene("alta") || tiene("anad")) return porId("crear_cliente");
  }

  // Usuarios
  if(tiene("usuari") || tiene("trabajador") || tiene("emplead")){
    if(tiene("edit") || tiene("modific") || tiene("cambi")) return porId("editar_usuario");
    if(tiene("labor") || tiene("horario") || tiene("vacacion") || tiene("conven")) return porId("laboral_usuario");
    if(tiene("document") || tiene("archiv")) return porId("documentos_usuario");
    if(tiene("crear") || tiene("nuevo") || tiene("alta") || tiene("anad")) return porId("crear_usuario");
  }

  // Configuración
  if(tiene("configur") || tiene("ajust")){
    if(tiene("empresa")) return porId("config_empresa");
    if(tiene("aparien") || tiene("tema") || tiene("color")) return porId("config_apariencia");
    if(tiene("modul")) return porId("config_modulos");
    if(tiene("labor") || tiene("conven") || tiene("vacacion") || tiene("horario")) return porId("config_laboral");
  }

  // Inicio / Monitor / Desarrollo
  if((tiene("comenz") || tiene("empez") || tiene("inici")) && (tiene("dia") || tiene("jornad"))) return porId("comenzar_dia");
  if(tiene("inicio") && tiene("trabaj") && (tiene("abr") || tiene("ver"))) return porId("abrir_trabajo_inicio");
  if(tiene("monitor") && (tiene("oficin") || tiene("pantall"))) return porId("monitor_oficina");
  if(tiene("sync") && (tiene("forz") || tiene("sincron"))) return porId("dev_forzar_sync");
  if(tiene("cache") && (tiene("limpi") || tiene("borr"))) return porId("dev_limpiar_cache");

  // 2) Fallback por puntuación solo cuando no hay una acción inequívoca.
  const lista=AYUDAS_DIRECTAS
    .map(x=>({ayuda:x,score:puntuacionAyudaDirecta(x,consulta)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score);

  if(!lista.length) return null;
  const primero=lista[0];
  const segundo=lista[1];
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
    resumen:"Consulta datos, contactos, direcciones, documentación e historial de clientes.",
    pasos:[
      "Busca el cliente por los datos disponibles.",
      "Pulsa el cliente para abrir su ficha en modo consulta.",
      "Usa Volver y Editar desde la parte superior.",
      "Entra en Editar solo cuando necesites modificar datos."
    ],
    palabras:"cliente contacto teléfono email dirección documentos historial buscar editar"
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
    id:"monitor",icono:"🖥️",titulo:"Monitor de oficina",roles:["admin","encargado"],
    resumen:"Panel operativo para pantalla grande con agenda, trabajos, vehículos e incidencias.",
    pasos:[
      "Ábrelo desde Trabajos cuando necesites una vista general de oficina.",
      "Utiliza Pantalla completa para mostrarlo en un monitor.",
      "Pulsa Salir para regresar a Zentryx."
    ],
    palabras:"monitor oficina pantalla grande agenda trabajos vehiculos incidencias"
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

const ZX_MANUAL_MODULOS_CON_ACCESO=new Set([
  "inicio","fichaje","agenda","clientes","trabajos","almacen","usuarios",
  "vehiculos","horas_extra","manual","configuracion"
]);

function accesoModuloManual(id){
  if(ZX_MANUAL_MODULOS_CON_ACCESO.has(String(id||""))){
    try{
      const core=window.ZENTRYX || window.ZX;
      if(core && typeof core.puede==="function") return core.puede("ver",id)===true;
    }catch(e){}
  }
  return moduloActivo(id);
}

function visiblePara(u,item){
  if(item.roles.includes("todos")) return accesoModuloManual(item.id);
  if(item.roles.includes("dev") && esDev(u)) return accesoModuloManual(item.id);
  if(item.roles.includes("admin") && (esAdmin(u)||esDev(u))) return accesoModuloManual(item.id);
  if(item.roles.includes("encargado") && (esEncargado(u)||esAdmin(u)||esDev(u))) return accesoModuloManual(item.id);
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

function marcarManualActivo(){
  try{
    window.ZX_MODULO_ACTUAL="manual";
    sessionStorage.setItem("zentryx_last_module","manual");
    localStorage.setItem("zentryx_last_module","manual");
  }catch(e){}

  try{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
    });
    const manualBtn=document.querySelector('.zx_nav_btn[data-modulo="manual"]');
    if(manualBtn) manualBtn.classList.add("zx_activo");
    const more=document.getElementById("zx_nav_more");
    if(more) more.classList.add("zx_activo");
  }catch(e){}
}

function render(){
  marcarManualActivo();
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

  // El Asistente puede dejar preparada una consulta antes de abrir el Manual.
  const pendiente=String(window.ZX_MANUAL_PENDING_QUERY||"").trim();
  if(pendiente){
    buscar.value=pendiente;
    window.ZX_MANUAL_PENDING_QUERY="";
  }

  setTimeout(function(){
    if(String(buscar.value||"").trim()){
      aplicarBusqueda();
      try{buscar.focus()}catch(e){}
    }
  },0);
}

window.ZX_manual=render;
window.ZX_abrirManual=render;
window.ZX_MANUAL_VERSION=ZX_VERSION;
})();
