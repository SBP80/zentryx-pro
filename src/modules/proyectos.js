// ===============================
// ZENTRYX PRO - PROYECTOS V1043
// V1043 - EXTRACCIÓN V1: ZONAS, CAUDALES, CONDUCTOS, PÉRDIDAS Y SELECCIÓN DE EXTRACTOR
// V1042 - PROYECTOS MULTIDISCIPLINARES + CÁLCULO TÉCNICO ORIENTATIVO POR ESTANCIAS
// V1041 - IPHONE/PWA: EVITAR AUTO-ZOOM Y DESCUADRE HORIZONTAL EN FORMULARIOS
// V1040 - REGLAS: CONTROL DE SIGNO +/- PARA TEMPERATURAS EN IPHONE/PWA
// V1039 - GENERADORES NUEVOS: PAPEL PREVISTO SIEMPRE VISIBLE Y EDITABLE
// V1038 - ESTRATEGIA: EXCLUIR ARTÍCULOS NO GENERADORES DE LAS REGLAS HÍBRIDAS + ETIQUETAS MÁS CLARAS
// V1037 - ESTRATEGIA: MOSTRAR EN LA PROPIA PANTALLA EL CÁLCULO DE REFERENCIA Y SUS RESULTADOS PRINCIPALES
// V1036 - OPCIONES TÉCNICAS: PERMITIR CAMBIAR NOMBRE, CÁLCULO DE REFERENCIA Y DESCRIPCIÓN MIENTRAS ESTÉN EN BORRADOR/EDITABLES
// V1035 - CÁLCULO 'OTRO': MOSTRAR EL MÉTODO GUARDADO EN LA TARJETA DE LA VERSIÓN
// V1034 - FECHAS: TIMESTAMPS MOSTRADOS EN FECHA LOCAL DEL DISPOSITIVO SIN DESPLAZAR FECHAS PURAS
// V1033 - CÁLCULO TÉRMICO: ESTIMACIÓN RÁPIDA AUTOMÁTICA + MODOS SIMPLES Y DIFERENCIADOS
// V1032 - DATOS TÉCNICOS AUTOMÁTICOS: LIMPIA DATOS INCOMPATIBLES + MEDIDA SUGERIDA + VALOR DIRECTO O GUIADO
// V1031 - DATOS TÉCNICOS GUIADOS: DESPLEGABLES POR CLASE + PERSONALIZAR + VALORES/MEDIDAS CONTEXTUALES
// V1030 - CATÁLOGO TÉCNICO GENERAL: CUALQUIER MATERIAL + DATOS LIBRES + GENERADOR CONDICIONAL
// V1029 - EDICIÓN DE GENERADOR: CONSERVA DECISIÓN SI NO SE MODIFICA
// V1028 - CATÁLOGO TÉCNICO: CONTROL TODOS EN SERVICIOS
// V1027 - CATÁLOGO TÉCNICO SOBRE materiales.tecnico_meta + SELECCIÓN CON SNAPSHOT EN GENERADORES
// V1026 - ABRIR TRABAJO VINCULADO CONSERVANDO ORIGEN Y VOLVER AL PROYECTO
// V1025 - CREAR TRABAJO DESDE LA PROPUESTA ACEPTADA, SIN DUPLICAR OPCIONES
// V1024 - DOSIER COMERCIAL EN PDF REAL Y COMPARTIBLE EN IPHONE / PWA
// ===============================
(function(){
"use strict";

const ZX_VERSION="1043";
const TABLA="proyectos";
const CACHE_KEY="zentryx_cache_proyectos_v1";
let CACHE=[];
let BUSQUEDA="";
let FILTRO="todos";
let CLIENTES=[];
let DIRECCIONES=[];
let USUARIOS=[];
let GENERADORES=[];
let CALCULOS=[];
let PROPUESTAS=[];
let MATERIALES=[];
let DOSIER_EMPRESA=null;
const DOSIER_EMPRESA_CACHE_PREFIX="zentryx_presupuestos_empresa_cache_v1:";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}
function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}catch(e){return {}}
}
function empresaId(){const s=sesion();return String(s.empresa_id||"demo").trim()||"demo"}
function leerConfigLocal(){try{return JSON.parse(localStorage.getItem("zentryx_config")||"{}")||{}}catch(e){return {}}}
function guardarConfigLocal(cfg){try{localStorage.setItem("zentryx_config",JSON.stringify(cfg||{}));if(zx())zx().config=cfg||{};return true}catch(e){return false}}
function dosierEmpresaCacheKey(){return DOSIER_EMPRESA_CACHE_PREFIX+empresaId()}
function leerDosierEmpresaCache(){try{const x=JSON.parse(localStorage.getItem(dosierEmpresaCacheKey())||"null");return x&&typeof x==="object"&&!Array.isArray(x)?x:null}catch(e){return null}}
function guardarDosierEmpresaCache(x){try{localStorage.setItem(dosierEmpresaCacheKey(),JSON.stringify(x||{}))}catch(e){}}
async function cargarDosierEmpresa(){
  DOSIER_EMPRESA=leerDosierEmpresaCache();
  if(!sb()||!navigator.onLine)return DOSIER_EMPRESA;
  try{
    const r=await sb().from("config_empresa").select("empresa_id,presupuestos_meta").eq("empresa_id",empresaId()).maybeSingle();
    if(r.error)throw r.error;
    const pm=r.data&&r.data.presupuestos_meta&&typeof r.data.presupuestos_meta==="object"&&!Array.isArray(r.data.presupuestos_meta)?r.data.presupuestos_meta:{};
    const d=pm.dosier&&typeof pm.dosier==="object"&&!Array.isArray(pm.dosier)?pm.dosier:{};
    DOSIER_EMPRESA=d;
    guardarDosierEmpresaCache(d);
    const cfg=leerConfigLocal();cfg.presupuestos=cfg.presupuestos&&typeof cfg.presupuestos==="object"?cfg.presupuestos:{};cfg.presupuestos.dosier=d;guardarConfigLocal(cfg);
  }catch(e){console.warn("Zentryx Proyectos: no se pudo cargar la configuración comercial de empresa",e)}
  return DOSIER_EMPRESA;
}
function limpiar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalizar(v){return String(v??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function puedeEntrar(){return zx() && typeof zx().puede==="function" ? zx().puede("ver","proyectos")===true : normalizar(sesion().rol)!=="invitado"}
function puedeEditar(){return puedeEntrar()}
function leerCache(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function guardarCache(x){try{localStorage.setItem(CACHE_KEY,JSON.stringify(x||[]))}catch(e){}}
function fechaES(v){
  if(!v)return "";
  const raw=String(v).trim();

  // Las fechas puras YYYY-MM-DD no deben desplazarse por zona horaria.
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
    const p=raw.split("-");
    return p[2]+"/"+p[1]+"/"+p[0];
  }

  // Los timestamps se muestran con la fecha local del dispositivo.
  const d=new Date(raw);
  if(!Number.isNaN(d.getTime())){
    try{
      return d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"});
    }catch(e){}
  }

  const s=raw.slice(0,10),p=s.split("-");
  return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:s;
}
function textoTipo(v){return ({nueva:"Nueva instalación",sustitucion:"Sustitución",reforma:"Reforma",ampliacion:"Ampliación",hibridacion:"Hibridación",estudio:"Solo estudio",otro:"Otro"})[v]||v||"Estudio"}
function textoEstado(v){return ({borrador:"Borrador",estudio:"Estudio",visita:"Pendiente visita",calculado:"Calculado",presupuestado:"Presupuestado",enviado:"Enviado",aceptado:"Aceptado",ejecucion:"En ejecución",terminado:"Terminado",rechazado:"Rechazado",archivado:"Archivado"})[v]||v||"Borrador"}
function nombreCliente(id){const c=CLIENTES.find(x=>String(x.id)===String(id));return c?c.nombre:"Cliente"}
function nombreUsuario(id){const u=USUARIOS.find(x=>String(x.id)===String(id));return u?(u.nombre||u.usuario||"Usuario"):""}
function dirTexto(d){if(!d)return "";return [d.via_tipo,d.direccion,d.numero,d.portal,d.escalera,d.piso,d.puerta,d.codigo_postal,d.poblacion,d.provincia,d.pais].filter(Boolean).join(" ").replace(/\s+/g," ")}
function proyectoDir(p){const d=DIRECCIONES.find(x=>String(x.id)===String(p.direccion_id));return d?dirTexto(d):""}
function textoGenerador(v){return ({aerotermia:"Aerotermia",bomba_calor:"Bomba de calor",geotermia:"Geotermia",gas_natural:"Gas natural",glp:"GLP / propano",gasoleo:"Gasóleo",lena:"Leña",pellet:"Pellet",biomasa:"Biomasa",resistencia:"Resistencia eléctrica",solar_termica:"Solar térmica",fotovoltaica:"Fotovoltaica",chimenea:"Chimenea",estufa:"Estufa",otro:"Otro"})[v]||v||"Generador"}
function textoRol(v){return ({principal:"Principal",apoyo:"Apoyo",emergencia:"Emergencia / reserva",alternativo:"Alternativo",simultaneo:"Simultáneo",solo_acs:"Solo ACS",solo_calefaccion:"Solo calefacción",manual:"Manual / normalmente desactivado"})[v]||v||"Sin definir"}
function listaFunciones(x){return Array.isArray(x)?x:[]}
function listaEmisores(p){const x=p&&p.emisores_meta;return Array.isArray(x)?x:[]}
function textoEmisor(v){return ({suelo_radiante:"Suelo radiante",radiadores:"Radiadores",fancoils:"Fancoils",conductos:"Conductos",aerotermos:"Aerotermos",radiadores_baja:"Radiadores baja temperatura",piscina:"Piscina",otro:"Otro"})[v]||v||"Emisor"}
function textoSituacionEmisor(v){return v==="previsto"?"Previsto":"Existente"}
function uidLocal(){return "em_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function textoTipoCalculo(v){return ({estimacion:"Estimación rápida",tecnico:"Cálculo técnico",manual:"Cálculo manual",otro:"Otro"})[v]||v||"Estimación rápida"}
function numeroVisible(v,unidad){return v!=null&&v!==""?limpiar(v)+(unidad?" "+unidad:""):"Sin indicar"}
async function cargarCalculos(proyectoId){
  CALCULOS=[];
  if(!sb()||!navigator.onLine)return CALCULOS;
  try{const r=await sb().from("proyectos_calculos").select("*").eq("proyecto_id",proyectoId).order("version",{ascending:false});if(r.error)throw r.error;CALCULOS=r.data||[]}catch(e){}
  return CALCULOS;
}
async function cargarPropuestas(proyectoId){
  PROPUESTAS=[];
  if(!sb()||!navigator.onLine)return PROPUESTAS;
  try{const r=await sb().from("proyectos_propuestas").select("*").eq("proyecto_id",proyectoId).neq("estado","archivada").order("created_at",{ascending:true});if(r.error)throw r.error;PROPUESTAS=r.data||[]}catch(e){}
  return PROPUESTAS;
}
function reglasPropuesta(x){return Array.isArray(x&&x.estrategia_meta)?x.estrategia_meta:[]}
function textoServicioRegla(v){return ({calefaccion:"Calefacción",acs:"ACS",refrigeracion:"Refrigeración",piscina:"Piscina",todos:"Todos los servicios"})[v]||v||"Servicio"}
function textoCondicionRegla(v){return ({siempre:"Siempre",manual:"Orden manual",fallo_generador:"Fallo de otro generador",temp_ext_menor:"Temperatura exterior menor que",temp_ext_mayor:"Temperatura exterior mayor que",demanda_mayor:"Demanda mayor que",deposito_menor:"Temperatura de depósito menor que",excedente_fv_mayor:"Excedente fotovoltaico mayor que",coste_energia:"Coste de energía",horario:"Horario"})[v]||v||"Condición"}
function textoAccionRegla(v){return ({usar:"Usar",priorizar:"Priorizar",apoyo:"Entrar como apoyo",simultaneo:"Trabajar simultáneamente",reserva:"Entrar como reserva",bloquear:"Bloquear",activar:"Activar"})[v]||v||"Acción"}
function nombreGeneradorId(id){
  const g=GENERADORES.find(x=>String(x.id)===String(id));if(!g)return "Generador";
  const potencia=(g.potencia_kw!=null&&g.potencia_kw!=="")?limpiar(g.potencia_kw)+" kW":"";
  const subtipo=g.subtipo&&normalizar(g.subtipo)!==normalizar(textoGenerador(g.tipo))?g.subtipo:"";
  return [textoGenerador(g.tipo),subtipo,potencia,g.marca,g.modelo].filter(Boolean).join(" · ");
}
function estadoPropuesta(op){return normalizar(op&&op.estado||"borrador")}
function propuestaAceptada(op){return estadoPropuesta(op)==="aceptada"}
function propuestaSustituida(op){return estadoPropuesta(op)==="sustituida"}
function propuestaBloqueada(op){const e=estadoPropuesta(op);return e==="aceptada"||e==="sustituida"}
function textoEstadoPropuesta(v){return ({borrador:"Borrador",calculada:"Calculada",presupuestada:"Presupuestada",enviada:"Enviada",aceptada:"Aceptada",rechazada:"Rechazada",sustituida:"Sustituida",archivada:"Archivada"})[normalizar(v)]||v||"Borrador"}
function nombreGeneradorRegla(r){return r&&r.generador_nombre_snapshot?r.generador_nombre_snapshot:nombreGeneradorId(r&&r.generador_id)}
function nombreGeneradorRelacionadoRegla(r){return r&&r.generador_referencia_nombre_snapshot?r.generador_referencia_nombre_snapshot:nombreGeneradorId(r&&r.generador_referencia_id)}
function uidRegla(){return "rg_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}

function clienteObj(id){return CLIENTES.find(x=>String(x.id)===String(id))||null}
function direccionObjProyecto(p){return DIRECCIONES.find(x=>String(x.id)===String(p&&p.direccion_id))||null}
function trabajoIdPropuesta(op){
  const cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};
  return String(cm.trabajo_id||"").trim();
}
function calleDireccionTrabajo(d){
  if(!d)return "";
  return [d.via_tipo,d.direccion,d.numero,d.portal,d.escalera,d.piso,d.puerta].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
}
function resumenTrabajoAceptado(p,op){
  const lineas=[];
  if(op&&op.descripcion)lineas.push("Solución aceptada: "+op.descripcion);
  const rs=reglasPropuesta(op);
  if(rs.length){
    lineas.push("");
    lineas.push("Funcionamiento previsto:");
    rs.forEach((r,i)=>{
      let txt=(i+1)+". "+fraseReglaCliente(r);
      if(r.notas)txt+=" "+r.notas;
      lineas.push(txt);
    });
  }
  return lineas.join("\n").trim();
}
function notasTrabajoAceptado(p,op){
  const cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};
  const ps=cm.presupuesto_snapshot&&typeof cm.presupuesto_snapshot==="object"?cm.presupuesto_snapshot:{};
  const lineas=[
    "Creado desde Proyecto: "+String(p&&p.nombre||""),
    "Propuesta aceptada: "+String(op&&op.nombre||"")
  ];
  const fecha=op&&op.aceptada_at||ps.aceptado_at;
  const por=op&&op.aceptada_por||ps.aceptado_por;
  if(fecha)lineas.push("Aceptada: "+fechaES(fecha)+(por?" · "+por:""));
  return lineas.filter(Boolean).join("\n");
}
function materialesTrabajoDesdePartidas(xs){
  return (xs||[]).filter(x=>normalizar(x&&x.tipo)==="material").map(x=>{
    const coste=numValor(x.coste_unitario)*(1-numValor(x.descuento)/100);
    return {
      nombre:String(x.descripcion||"Material").trim()||"Material",
      cantidad:Math.max(0,numValor(x.cantidad)),
      unidad:String(x.unidad||"ud"),
      referencia:String(x.referencia||""),
      proveedor:"",
      fabricante:"",
      alias:"",
      iva:numValor(x.iva),
      precio_compra:coste,
      precio_venta:numValor(x.precio_unitario),
      notas:x.grupo?"Proyecto · "+String(x.grupo):"Proyecto"
    };
  }).filter(x=>x.cantidad>0);
}
async function abrirTrabajoVinculado(id,p){
  const trabajoId=String(id||"").trim();
  if(!trabajoId)return;
  if(typeof window.ZX_TRABAJOS_ABRIR_TRABAJO!=="function"){
    alert("No se pudo abrir el trabajo desde Proyectos.");
    return;
  }
  const proyectoId=String(p&&p.id||"").trim();
  cerrarModal();
  await window.ZX_TRABAJOS_ABRIR_TRABAJO(trabajoId,{
    origen:"proyectos",
    volver:proyectoId?function(){return abrirFicha(proyectoId)}:null
  });
}
async function crearTrabajoDesdePropuesta(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para preparar el trabajo.");return}
  if(!propuestaAceptada(op)){alert("Solo puede crearse el trabajo desde la opción aceptada actual.");return}

  try{
    const fresca=await sb().from("proyectos_propuestas").select("*").eq("id",op.id).maybeSingle();
    if(fresca.error)throw fresca.error;
    const opActual=fresca.data||op;
    const yaCreado=trabajoIdPropuesta(opActual);
    if(yaCreado){
      await cargarPropuestas(p.id);
      return abrirTrabajoVinculado(yaCreado,p);
    }

    if(typeof window.ZX_TRABAJOS_CREAR_DESDE_PROYECTO!=="function"){
      alert("El módulo Trabajos no está preparado para recibir este proyecto.");
      return;
    }

    const xs=await cargarPartidas(opActual.id);
    const cli=clienteObj(p.cliente_id)||{};
    const d=direccionObjProyecto(p)||{};
    const titulo=(opActual.descripcion||p.nombre||"Trabajo").trim();
    const prefill={
      titulo:titulo,
      estado:"pendiente",
      prioridad:"media",
      cliente_id:p.cliente_id||null,
      usuario_id:p.tecnico_id||"",
      telefono_contacto:cli.telefono||cli.telefono_2||"",
      direccion_obra:calleDireccionTrabajo(d),
      direccion:calleDireccionTrabajo(d),
      poblacion:d.poblacion||"",
      provincia:d.provincia||"",
      codigo_postal:d.codigo_postal||"",
      pais:d.pais||"España",
      descripcion:resumenTrabajoAceptado(p,opActual),
      notas:notasTrabajoAceptado(p,opActual)
    };
    const ctx={
      proyecto_id:String(p.id),
      propuesta_id:String(opActual.id),
      proyecto_nombre:String(p.nombre||""),
      propuesta_nombre:String(opActual.nombre||""),
      cliente_id:p.cliente_id||null,
      direccion_id:p.direccion_id||null,
      aceptada_at:opActual.aceptada_at||null,
      aceptada_por:opActual.aceptada_por||"",
      materiales:materialesTrabajoDesdePartidas(xs)
    };

    cerrarModal();
    await window.ZX_TRABAJOS_CREAR_DESDE_PROYECTO(prefill,ctx);
  }catch(e){
    alert("No se pudo preparar el trabajo.\n"+(e&&e.message?e.message:""));
  }
}


function textoTipoPartida(v){return ({material:"Material",mano_obra:"Mano de obra",servicio:"Servicio",transporte:"Transporte",subcontrata:"Subcontrata",ingenieria:"Ingeniería",legalizacion:"Legalización",rite:"RITE",cae:"CAE",otro:"Otro"})[v]||v||"Partida"}
function eur(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €":"0,00 €"}
function numValor(v){const s=String(v??"").trim().replace(",",".");if(s==="")return 0;const n=Number(s);return Number.isFinite(n)?n:0}
function materialTexto(m){return [m&&m.nombre,m&&m.marca,m&&m.modelo].filter(Boolean).join(" · ")}
function opcionesMateriales(sel){return `<option value="">Sin artículo del catálogo</option>`+MATERIALES.map(m=>`<option value="${limpiar(m.id)}" ${String(sel)===String(m.id)?"selected":""}>${limpiar(materialTexto(m))}${m.referencia?" · "+limpiar(m.referencia):""}</option>`).join("")}
function tecnicoMaterial(m){const x=m&&m.tecnico_meta;return x&&typeof x==="object"&&!Array.isArray(x)?x:{}}
const CATEGORIAS_TECNICAS=[
  ["general","Material / consumible"],
  ["fijacion","Fijación y tornillería"],
  ["tuberia","Tubería y accesorios"],
  ["hidraulica","Hidráulica y valvulería"],
  ["aislamiento","Aislamiento"],
  ["electrico","Electricidad y cableado"],
  ["control","Control y automatización"],
  ["bomba","Bomba / circulador"],
  ["deposito","Depósito / acumulación"],
  ["emisor","Emisor"],
  ["generador","Generador / climatización"],
  ["ventilacion","Ventilación"],
  ["extraccion","Extracción"],
  ["solar","Solar térmica / fotovoltaica"],
  ["herramienta","Herramienta / equipo auxiliar"],
  ["otro","Otro"]
];
function categoriaTecnicaMaterial(t){
  const v=String(t&&t.categoria_tecnica||"").trim();
  if(CATEGORIAS_TECNICAS.some(x=>x[0]===v))return v;
  if(t&&t.equipo_termico===true&&t.tipo_generador&&String(t.tipo_generador)!=="otro")return "generador";
  return "general";
}
function textoCategoriaTecnica(v){const x=CATEGORIAS_TECNICAS.find(z=>z[0]===String(v||""));return x?x[1]:"Material / consumible"}
function opcionesCategoriaTecnica(sel){return CATEGORIAS_TECNICAS.map(([v,n])=>`<option value="${v}" ${String(sel)===v?"selected":""}>${limpiar(n)}</option>`).join("")}
function materialTecnicoActivo(m){const t=tecnicoMaterial(m);return t.catalogo_proyectos===true||t.equipo_termico===true}
function materialGeneradorActivo(m){const t=tecnicoMaterial(m);return materialTecnicoActivo(m)&&categoriaTecnicaMaterial(t)==="generador"}
function medidaTecnicaCanonica(v){const raw=String(v||"").trim(),k=raw.toLowerCase().replace(/\s+/g,"");return ({"mm2":"mm²","cm2":"cm²","m2":"m²","mm3":"mm³","cm3":"cm³","m3":"m³","m3/h":"m³/h","w/m2k":"W/m²K","l":"L","lt":"L","u":"ud","uds":"ud"})[k]||raw}
function especificacionesTecnicas(t){return Array.isArray(t&&t.especificaciones)?t.especificaciones.filter(x=>x&&typeof x==="object").map(x=>({nombre:String(x.nombre||"").trim(),valor:String(x.valor??"").trim(),medida:medidaTecnicaCanonica(x.medida||x.unidad||"")})).filter(x=>x.nombre||x.valor||x.medida):[]}
function nombreMaterialTecnico(m){const t=tecnicoMaterial(m),cat=categoriaTecnicaMaterial(t);if(cat==="generador")return [materialTexto(m)||m&&m.nombre,textoGenerador(t.tipo_generador),t.potencia_calefaccion_kw!=null?t.potencia_calefaccion_kw+" kW":null].filter(Boolean).join(" · ");return [materialTexto(m)||m&&m.nombre,textoCategoriaTecnica(cat),t.subtipo||null].filter(Boolean).join(" · ")}
function opcionesCatalogoTecnico(sel){const xs=MATERIALES.filter(materialGeneradorActivo),actual=sel?MATERIALES.find(m=>String(m.id)===String(sel)):null;let html=`<option value="">Sin generador del catálogo técnico</option>`;if(actual&&!xs.some(m=>String(m.id)===String(actual.id)))html+=`<option value="${limpiar(actual.id)}" selected disabled>${limpiar(materialTexto(actual)||actual.nombre||"Artículo")} · vínculo histórico</option>`;return html+xs.map(m=>`<option value="${limpiar(m.id)}" ${String(sel)===String(m.id)?"selected":""}>${limpiar(nombreMaterialTecnico(m))}</option>`).join("")}
function snapshotMaterialTecnico(m){if(!m)return null;return {id:m.id||null,nombre:m.nombre||null,marca:m.marca||null,modelo:m.modelo||null,referencia:m.referencia||null,unidad:m.unidad||null,tecnico_meta:JSON.parse(JSON.stringify(tecnicoMaterial(m)))}}
function serviciosTecnicosMeta(t){return Array.isArray(t&&t.funciones)?t.funciones:[]}
function fichaTecnicaResumenHTML(m){
  const t=tecnicoMaterial(m);if(!materialTecnicoActivo(m))return `<span class="zx_pr_cat_badge is-off">Sin ficha técnica</span>`;
  const cat=categoriaTecnicaMaterial(t),sv=serviciosTecnicosMeta(t),esp=especificacionesTecnicas(t);
  if(cat==="generador")return `<span class="zx_pr_cat_badge">${limpiar(textoCategoriaTecnica(cat))} · ${limpiar(textoGenerador(t.tipo_generador||"otro"))}</span><div class="zx_pr_cat_meta">${t.potencia_calefaccion_kw!=null?`<span>Calefacción <b>${limpiar(t.potencia_calefaccion_kw)} kW</b></span>`:""}${t.potencia_refrigeracion_kw!=null?`<span>Refrigeración <b>${limpiar(t.potencia_refrigeracion_kw)} kW</b></span>`:""}${t.rendimiento_pct!=null?`<span>Rendimiento <b>${limpiar(t.rendimiento_pct)} %</b></span>`:""}${t.scop!=null?`<span>SCOP <b>${limpiar(t.scop)}</b></span>`:""}</div>${sv.length?`<div class="zx_pr_gen_tags">${sv.map(x=>`<span>${limpiar(textoServicioRegla(x))}</span>`).join("")}</div>`:""}${esp.length?`<div class="zx_pr_cat_meta">${esp.slice(0,3).map(x=>`<span>${limpiar(x.nombre)}${x.valor?` <b>${limpiar(x.valor)}${x.medida?" "+limpiar(x.medida):""}</b>`:""}</span>`).join("")}</div>`:""}`;
  return `<span class="zx_pr_cat_badge">${limpiar(textoCategoriaTecnica(cat))}</span>${t.subtipo?`<div class="zx_pr_cat_meta"><span>Tipo <b>${limpiar(t.subtipo)}</b></span></div>`:""}${esp.length?`<div class="zx_pr_cat_meta">${esp.slice(0,4).map(x=>`<span>${limpiar(x.nombre)}${x.valor?` <b>${limpiar(x.valor)}${x.medida?" "+limpiar(x.medida):""}</b>`:""}</span>`).join("")}</div>`:""}`;
}
function listaCatalogoTecnicoHTML(xs){if(!xs.length)return `<div class="zx_pr_empty">No hay artículos que coincidan.</div>`;return xs.map(m=>`<button type="button" class="zx_pr_cat_card" data-pr-cat-edit="${limpiar(m.id)}"><div><b>${limpiar(materialTexto(m)||m.nombre||"Material")}</b><span>${limpiar(m.referencia||"Sin referencia")}</span></div>${fichaTecnicaResumenHTML(m)}</button>`).join("")}
function abrirCatalogoTecnico(){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para editar el catálogo técnico.");return}
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_cat_back" type="button">← Volver</button><button type="button" disabled>Catálogo técnico</button></div><div class="zx_pr_form_head"><span>ARTÍCULOS Y DATOS TÉCNICOS</span><h2>Catálogo técnico</h2></div><div class="zx_pr_info"><b>Admite cualquier artículo existente en Materiales.</b><span>Puedes preparar desde tornillería, cableado, tuberías o válvulas hasta depósitos, bombas y generadores. Si un dato no tiene un campo específico, añádelo en Datos técnicos libres con su medida correspondiente.</span></div><div class="zx_pr_tools zx_pr_cat_tools"><input id="pr_cat_search" type="search" placeholder="Buscar artículo, categoría, dato técnico o referencia"><select id="pr_cat_filter"><option value="todos">Todos</option><option value="tecnicos">Con ficha técnica</option><option value="pendientes">Sin ficha técnica</option></select></div><div class="zx_pr_cat_stats"><b>${MATERIALES.filter(materialTecnicoActivo).length}</b><span>artículos con ficha técnica de ${MATERIALES.length} artículos activos</span></div><div id="pr_cat_list" class="zx_pr_cat_list">${listaCatalogoTecnicoHTML(MATERIALES)}</div>`);
  const pintar=()=>{const q=normalizar(m.querySelector("#pr_cat_search").value),f=m.querySelector("#pr_cat_filter").value;let xs=MATERIALES.slice();if(f==="tecnicos")xs=xs.filter(materialTecnicoActivo);if(f==="pendientes")xs=xs.filter(x=>!materialTecnicoActivo(x));if(q)xs=xs.filter(x=>{const t=tecnicoMaterial(x),esp=especificacionesTecnicas(t).map(e=>[e.nombre,e.valor,e.medida].join(" ")).join(" ");return normalizar([x.nombre,x.marca,x.modelo,x.referencia,x.familia,textoCategoriaTecnica(categoriaTecnicaMaterial(t)),textoGenerador(t.tipo_generador),t.subtipo,esp].join(" ")).includes(q)});m.querySelector("#pr_cat_list").innerHTML=listaCatalogoTecnicoHTML(xs);m.querySelectorAll("[data-pr-cat-edit]").forEach(b=>b.onclick=()=>{const x=MATERIALES.find(z=>String(z.id)===String(b.dataset.prCatEdit));if(x)formularioMaterialTecnico(x)})};
  m.querySelector("#pr_cat_back").onclick=()=>{cerrarModal();shell()};m.querySelector("#pr_cat_search").oninput=pintar;m.querySelector("#pr_cat_filter").onchange=pintar;pintar();
}
const DATOS_TECNICOS_SUGERIDOS={
  general:["Material","Acabado","Color","Marca","Modelo","Referencia","Norma","Compatibilidad","Peso","Dimensiones"],
  fijacion:["Tipo de fijación","Diámetro","Longitud","Rosca","Material","Acabado","Tipo de cabeza","Huella","Clase de resistencia","Norma"],
  tuberia:["Diámetro exterior","Diámetro nominal","Espesor","Material","Presión nominal","Temperatura máxima","Longitud","Tipo de unión","Color","Norma"],
  hidraulica:["Diámetro de conexión","Rosca","Presión máxima","Temperatura máxima","Kvs","Caudal","Material del cuerpo","Material de junta","Accionamiento","Tipo de conexión"],
  aislamiento:["Espesor","Diámetro interior","Conductividad térmica","Densidad","Temperatura mínima","Temperatura máxima","Reacción al fuego","Material","Longitud","Ancho"],
  electrico:["Sección","Número de conductores","Tensión nominal","Intensidad máxima","Material del conductor","Aislamiento","Clasificación CPR","Longitud","Diámetro exterior","Temperatura máxima","Color","Tipo de cable"],
  control:["Tensión de alimentación","Entradas","Salidas","Protocolo","Grado IP","Rango de temperatura","Precisión","Tipo de sensor","Montaje","Tipo de contacto"],
  bomba:["Caudal","Altura manométrica","Potencia eléctrica","Tensión nominal","Intensidad","Conexión","Presión máxima","Temperatura máxima","EEI","Velocidades","Grado IP"],
  deposito:["Capacidad","Presión máxima","Temperatura máxima","Material","Aislamiento","Superficie de serpentín","Número de serpentines","Diámetro","Altura","Conexión"],
  emisor:["Potencia nominal","Temperatura de diseño","Tipo de emisor","Longitud","Altura","Profundidad","Material","Caudal","Pérdida de carga","Conexión"],
  generador:["Refrigerante","Potencia eléctrica absorbida","Nivel sonoro","Caudal de agua","Caudal de aire","Presión disponible","Peso","Longitud","Ancho","Altura","Tensión nominal","Intensidad máxima","Grado IP"],
  ventilacion:["Caudal de aire","Presión disponible","Nivel sonoro","Potencia eléctrica","Rendimiento","Diámetro de conexión","Tipo de filtro","Grado IP","Longitud","Ancho","Altura"],
  extraccion:["Caudal de aire","Presión disponible","Nivel sonoro","Potencia eléctrica","Diámetro de conexión","Velocidad de aire","Tipo de extracción","Tipo de boca","Grado IP","Longitud","Ancho","Altura"],
  solar:["Potencia pico","Superficie","Rendimiento","Tensión nominal","Intensidad nominal","Longitud","Ancho","Espesor","Peso","Tipo de conexión","Coeficiente de temperatura"],
  herramienta:["Potencia","Tensión nominal","Capacidad de batería","Velocidad","Par máximo","Rango","Precisión","Longitud","Ancho","Altura","Peso"],
  otro:["Tipo","Material","Capacidad","Potencia","Tensión nominal","Presión máxima","Temperatura máxima","Peso","Dimensiones","Norma","Compatibilidad"]
};
const VALORES_TECNICOS_SUGERIDOS={
  "seccion":["1,5","2,5","4","6","10","16","25","35","50","70","95","120","150","185","240"],
  "numero de conductores":["1","2","3","4","5"],
  "tension nominal":["12","24","48","110","230","400","450/750","600/1000"],
  "tension de alimentacion":["12","24","48","110","230","400"],
  "material del conductor":["Cobre","Aluminio"],
  "aislamiento":["PVC","XLPE","LSZH","Caucho","Espuma elastomérica","Lana mineral","Polietileno"],
  "clasificacion cpr":["Aca","B1ca","B2ca","Cca","Dca","Eca","Fca"],
  "material":["Acero","Acero inoxidable","Cobre","Latón","Aluminio","PVC","PP-R","PE-X","Polietileno","Polipropileno","Hierro fundido","EPDM","NBR"],
  "material del cuerpo":["Latón","Acero inoxidable","Acero","Hierro fundido","Bronce","PVC","Polipropileno"],
  "material de junta":["EPDM","NBR","FKM / Viton","PTFE","Silicona"],
  "tipo de union":["Roscada","Prensar","Soldar","Encolar","Brida","Compresión","Push-fit"],
  "tipo de conexion":["Roscada","Brida","Prensar","Soldar","Encolar","Compresión"],
  "protocolo":["Modbus","BACnet","KNX","Zigbee","Wi-Fi","Bluetooth","0-10 V","PWM","Contacto seco"],
  "grado ip":["IP20","IP21","IP44","IP54","IP55","IP65","IP66","IP67","IP68"],
  "tipo de contacto":["NA","NC","Conmutado","Libre de potencial"],
  "tipo de filtro":["G4","M5","F7","F9","HEPA"],
  "refrigerante":["R32","R290","R410A","R134a","R454B","R513A","CO₂ / R744"],
  "tipo de emisor":["Radiador","Suelo radiante","Fancoil","Convectores","Aerotermo","Techo radiante"],
  "accionamiento":["Manual","Eléctrico","Termostático","Neumático","Hidráulico"],
  "tipo de fijacion":["Tornillo","Taco","Anclaje","Varilla roscada","Abrazadera","Remache","Tuerca","Arandela"],
  "tipo de cabeza":["Hexagonal","Avellanada","Cilíndrica","Plana","Allen","Torx"],
  "huella":["Phillips","Pozidriv","Torx","Allen","Ranurada","Hexagonal"]
};
const MEDIDAS_TECNICAS_GENERALES=["mm","cm","m","mm²","cm²","m²","mm³","cm³","m³","L","ml","L/min","L/h","m³/h","W","kW","V","kV","A","mA","Ω","Hz","bar","mbar","Pa","kPa","MPa","m.c.a.","°C","K","%","kg","g","Nm","rpm","dB(A)","W/mK","W/m²K","W/K","ud","h","min","s"];
const MEDIDAS_TECNICAS_POR_DATO={
  "seccion":["mm²"],"diametro":["mm","cm"],"diametro exterior":["mm"],"diametro interior":["mm"],"diametro nominal":["mm"],"diametro de conexion":["mm"],"espesor":["mm","cm"],
  "longitud":["mm","cm","m"],"ancho":["mm","cm","m"],"altura":["mm","cm","m"],"profundidad":["mm","cm","m"],"dimensiones":["mm","cm","m"],
  "capacidad":["L","ml","m³"],"caudal":["L/min","L/h","m³/h"],"caudal de agua":["L/min","L/h","m³/h"],"caudal de aire":["m³/h"],
  "potencia":["W","kW"],"potencia nominal":["W","kW"],"potencia pico":["W","kW"],"potencia electrica":["W","kW"],"potencia electrica absorbida":["W","kW"],
  "tension nominal":["V"],"tension de alimentacion":["V"],"intensidad":["A"],"intensidad maxima":["A"],"intensidad nominal":["A"],
  "presion nominal":["bar","kPa","MPa"],"presion maxima":["bar","kPa","MPa"],"presion disponible":["Pa","kPa","m.c.a."],"altura manometrica":["m.c.a.","kPa"],"perdida de carga":["Pa","kPa","m.c.a."],
  "temperatura minima":["°C"],"temperatura maxima":["°C"],"rango de temperatura":["°C"],"temperatura de diseno":["°C"],
  "rendimiento":["%"],"superficie":["m²"],"superficie de serpentin":["m²"],"conductividad termica":["W/mK"],"peso":["g","kg"],"par maximo":["Nm"],"velocidad":["rpm"],"nivel sonoro":["dB(A)"],"frecuencia":["Hz"]
};
function claveDatoTecnico(v){return normalizar(String(v||"")).replace(/[^a-z0-9]+/g," ").trim()}
function sugerenciasDatoTecnico(categoria){const base=DATOS_TECNICOS_SUGERIDOS[categoria]||DATOS_TECNICOS_SUGERIDOS.otro;return [...new Set(base.concat(DATOS_TECNICOS_SUGERIDOS.general))]}
function sugerenciasValorTecnico(nombre){return VALORES_TECNICOS_SUGERIDOS[claveDatoTecnico(nombre)]||[]}
function medidasPrincipalesDato(nombre){return MEDIDAS_TECNICAS_POR_DATO[claveDatoTecnico(nombre)]||[]}
function sugerenciasMedidaTecnica(nombre){const xs=medidasPrincipalesDato(nombre);return [...new Set(xs.concat(MEDIDAS_TECNICAS_GENERALES))]}
function opcionCoincidente(actual,opciones){const a=normalizar(actual);return opciones.find(x=>normalizar(x)===a)||""}
function opcionesConPersonalizar(actual,opciones,placeholder){const hit=opcionCoincidente(actual,opciones),custom=String(actual||"").trim()&&!hit;return `<option value="">${limpiar(placeholder)}</option>`+opciones.map(v=>`<option value="${limpiar(v)}" ${hit===v?"selected":""}>${limpiar(v)}</option>`).join("")+`<option value="__personalizar__" ${custom?"selected":""}>Personalizar…</option>`}
function filaEspecificacionHTML(x,categoria){x=x||{};const nombre=String(x.nombre||"").trim(),valor=String(x.valor??"").trim(),medida=String(x.medida||x.unidad||"").trim();const datos=sugerenciasDatoTecnico(categoria||"general"),valores=sugerenciasValorTecnico(nombre),medidas=sugerenciasMedidaTecnica(nombre);const nombreHit=opcionCoincidente(nombre,datos),valorHit=opcionCoincidente(valor,valores),medidaHit=opcionCoincidente(medida,medidas),valorGuiado=valores.length>0;return `<div class="zx_pr_cat_spec_row"><div class="zx_pr_cat_spec_field"><select data-pr-cat-spec-nombre-choice>${opcionesConPersonalizar(nombre,datos,"Seleccionar dato")}</select><input data-pr-cat-spec-nombre value="${limpiar(nombre)}" placeholder="Escribe el dato" ${nombre&&!nombreHit?"":"hidden"}></div><div class="zx_pr_cat_spec_field"><select data-pr-cat-spec-valor-choice ${valorGuiado?"":"hidden"}>${opcionesConPersonalizar(valor,valores,"Seleccionar valor")}</select><input data-pr-cat-spec-valor value="${limpiar(valor)}" placeholder="Valor" ${valorGuiado&&(!valor||valorHit)?"hidden":""}></div><div class="zx_pr_cat_spec_field"><select data-pr-cat-spec-medida-choice>${opcionesConPersonalizar(medida,medidas,"Seleccionar medida")}</select><input data-pr-cat-spec-medida value="${limpiar(medida)}" placeholder="Escribe la medida" ${medida&&!medidaHit?"":"hidden"}></div><button type="button" data-pr-cat-spec-del aria-label="Quitar dato">×</button></div>`}
function sincronizarCampoEspec(row,tipo){const sel=row.querySelector(`[data-pr-cat-spec-${tipo}-choice]`),inp=row.querySelector(`[data-pr-cat-spec-${tipo}]`);if(!sel||!inp)return;if(tipo==="valor"&&sel.hidden){inp.hidden=false;return}const custom=sel.value==="__personalizar__";if(custom){inp.hidden=false;if(!inp.value)inp.focus()}else{inp.hidden=true;inp.value=sel.value||""}}
function reconstruirValorMedidaEspec(row,reiniciar){const nombre=row.querySelector("[data-pr-cat-spec-nombre]")?.value||"",vi=row.querySelector("[data-pr-cat-spec-valor]"),mi=row.querySelector("[data-pr-cat-spec-medida]");let valor=vi?.value||"",medida=mi?.value||"";if(reiniciar){valor="";medida=medidasPrincipalesDato(nombre)[0]||"";if(vi)vi.value=valor;if(mi)mi.value=medida}const valores=sugerenciasValorTecnico(nombre),sv=row.querySelector("[data-pr-cat-spec-valor-choice]"),sm=row.querySelector("[data-pr-cat-spec-medida-choice]");if(sv){sv.hidden=valores.length===0;sv.innerHTML=opcionesConPersonalizar(valor,valores,"Seleccionar valor")}if(sm)sm.innerHTML=opcionesConPersonalizar(medida,sugerenciasMedidaTecnica(nombre),"Seleccionar medida");sincronizarCampoEspec(row,"valor");sincronizarCampoEspec(row,"medida")}
function configurarFilaEspecificacion(row,categoria){if(!row)return;const nombre=row.querySelector("[data-pr-cat-spec-nombre]")?.value||"",sel=row.querySelector("[data-pr-cat-spec-nombre-choice]");if(sel)sel.innerHTML=opcionesConPersonalizar(nombre,sugerenciasDatoTecnico(categoria||"general"),"Seleccionar dato");sincronizarCampoEspec(row,"nombre");reconstruirValorMedidaEspec(row,false);const sn=row.querySelector("[data-pr-cat-spec-nombre-choice]"),sv=row.querySelector("[data-pr-cat-spec-valor-choice]"),sm=row.querySelector("[data-pr-cat-spec-medida-choice]"),ni=row.querySelector("[data-pr-cat-spec-nombre]");if(sn)sn.onchange=()=>{const previo=ni?.value||"";if(sn.value==="__personalizar__"){if(ni){ni.value="";ni.hidden=false;ni.focus()}reconstruirValorMedidaEspec(row,true);return}sincronizarCampoEspec(row,"nombre");const nuevo=ni?.value||"";reconstruirValorMedidaEspec(row,normalizar(previo)!==normalizar(nuevo))};if(sv)sv.onchange=()=>sincronizarCampoEspec(row,"valor");if(sm)sm.onchange=()=>sincronizarCampoEspec(row,"medida");if(ni)ni.onchange=()=>reconstruirValorMedidaEspec(row,true)}
function enlazarEspecificaciones(m,categoria){m.querySelectorAll(".zx_pr_cat_spec_row").forEach(r=>configurarFilaEspecificacion(r,categoria));m.querySelectorAll("[data-pr-cat-spec-del]").forEach(b=>b.onclick=()=>{const r=b.closest(".zx_pr_cat_spec_row");if(r)r.remove()})}
function formularioMaterialTecnico(mat){
  const t=Object.assign({},tecnicoMaterial(mat)),fs=serviciosTecnicosMeta(t),categoria=categoriaTecnicaMaterial(t),esp=especificacionesTecnicas(t);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_cat_form_back" type="button">← Volver</button><button id="pr_cat_form_save" class="primary" type="button">Guardar</button></div><div class="zx_pr_form_head"><span>FICHA TÉCNICA</span><h2>${limpiar(materialTexto(mat)||mat.nombre||"Material")}</h2></div><div class="zx_pr_info"><b>${limpiar(mat.referencia?"Referencia · "+mat.referencia:"Sin referencia")}</b><span>La ficha queda asociada al artículo actual de Materiales. No crea otro artículo.</span></div><label class="zx_pr_dossier_check"><input id="pr_cat_activo" type="checkbox" ${materialTecnicoActivo(mat)?"checked":""}><span>Usar este artículo en el Catálogo técnico de Proyectos</span></label><div class="zx_pr_section"><h3>Clasificación técnica</h3><div class="zx_pr_grid2"><label>Clase de artículo<select id="pr_cat_categoria">${opcionesCategoriaTecnica(categoria)}</select></label><label>Subtipo / descripción técnica<input id="pr_cat_subtipo" value="${limpiar(t.subtipo||"")}" placeholder="Cable, tornillo, válvula, depósito…"></label></div><div class="zx_pr_info zx_pr_cat_hint"><b>La clase decide qué campos específicos se muestran.</b><span>Para cualquier dato adicional usa Datos técnicos libres.</span></div></div><div id="pr_cat_generador" class="zx_pr_cat_generator"><div class="zx_pr_grid2"><label>Tipo de generador<select id="pr_cat_tipo">${opcionesTipoGenerador(t.tipo_generador||"aerotermia")}</select></label><span></span></div><div class="zx_pr_section"><h3>Servicios</h3><div class="zx_pr_checks"><label><input id="pr_cat_func_todos" type="checkbox"><span>Todos</span></label>${[["calefaccion","Calefacción"],["acs","ACS"],["refrigeracion","Refrigeración"],["piscina","Piscina"]].map(([v,n])=>`<label><input type="checkbox" data-pr-cat-func="${v}" ${fs.includes(v)?"checked":""}><span>${n}</span></label>`).join("")}</div></div><div class="zx_pr_section"><h3>Prestaciones del generador</h3><div class="zx_pr_grid2"><label>Potencia calefacción <span class="zx_pr_unit">kW</span><input id="pr_cat_kw_cal" type="number" min="0" step="0.01" inputmode="decimal" value="${t.potencia_calefaccion_kw!=null?limpiar(t.potencia_calefaccion_kw):""}"></label><label>Potencia refrigeración <span class="zx_pr_unit">kW</span><input id="pr_cat_kw_ref" type="number" min="0" step="0.01" inputmode="decimal" value="${t.potencia_refrigeracion_kw!=null?limpiar(t.potencia_refrigeracion_kw):""}"></label><label>Rendimiento <span class="zx_pr_unit">%</span><input id="pr_cat_rend" type="number" min="0" step="0.01" inputmode="decimal" value="${t.rendimiento_pct!=null?limpiar(t.rendimiento_pct):""}"></label><label>Temperatura máxima de impulsión <span class="zx_pr_unit">°C</span><input id="pr_cat_tmax" type="number" step="0.1" inputmode="decimal" value="${t.temperatura_impulsion_max_c!=null?limpiar(t.temperatura_impulsion_max_c):""}"></label></div><div class="zx_pr_grid2"><label>COP<input id="pr_cat_cop" type="number" min="0" step="0.01" inputmode="decimal" value="${t.cop!=null?limpiar(t.cop):""}"></label><label>SCOP<input id="pr_cat_scop" type="number" min="0" step="0.01" inputmode="decimal" value="${t.scop!=null?limpiar(t.scop):""}"></label><label>EER<input id="pr_cat_eer" type="number" min="0" step="0.01" inputmode="decimal" value="${t.eer!=null?limpiar(t.eer):""}"></label><label>SEER<input id="pr_cat_seer" type="number" min="0" step="0.01" inputmode="decimal" value="${t.seer!=null?limpiar(t.seer):""}"></label></div></div></div><div class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Datos técnicos libres</h3><span>Elige opciones habituales o usa Personalizar para cualquier dato, valor o medida no previsto.</span></div><button id="pr_cat_spec_add" class="zx_pr_small_primary" type="button">＋ Añadir dato</button></div><div id="pr_cat_specs" class="zx_pr_cat_specs">${(esp.length?esp:[{}]).map(x=>filaEspecificacionHTML(x,categoria)).join("")}</div></div><label>Foto para dosier · URL opcional<input id="pr_cat_foto" value="${limpiar(t.foto_comercial_url||t.foto_url||"")}" placeholder="https://..."></label><label>Texto para cliente<textarea id="pr_cat_desc" rows="4" placeholder="Descripción breve del artículo o equipo">${limpiar(t.descripcion_cliente||"")}</textarea></label><label>Notas técnicas<textarea id="pr_cat_notas" rows="4" placeholder="Observaciones, montaje, compatibilidades, certificaciones…">${limpiar(t.notas||"")}</textarea></label>`);
  const checks=[...m.querySelectorAll("[data-pr-cat-func]")],todos=m.querySelector("#pr_cat_func_todos"),cat=m.querySelector("#pr_cat_categoria"),bloqueGen=m.querySelector("#pr_cat_generador");
  const sincronizarTodos=()=>{const marcados=checks.filter(x=>x.checked).length;todos.checked=checks.length>0&&marcados===checks.length;todos.indeterminate=marcados>0&&marcados<checks.length};
  const ajustarClase=()=>{bloqueGen.style.display=cat.value==="generador"?"grid":"none";enlazarEspecificaciones(m,cat.value)};
  todos.onchange=()=>{checks.forEach(x=>x.checked=todos.checked);todos.indeterminate=false};checks.forEach(x=>x.onchange=sincronizarTodos);sincronizarTodos();cat.onchange=ajustarClase;ajustarClase();
  m.querySelector("#pr_cat_spec_add").onclick=()=>{m.querySelector("#pr_cat_specs").insertAdjacentHTML("beforeend",filaEspecificacionHTML({},cat.value));enlazarEspecificaciones(m,cat.value)};enlazarEspecificaciones(m,cat.value);
  m.querySelector("#pr_cat_form_back").onclick=abrirCatalogoTecnico;m.querySelector("#pr_cat_form_save").onclick=()=>guardarMaterialTecnico(mat);
}
function numModal(id){const el=document.getElementById(id),v=el?String(el.value||"").trim().replace(",","."):"";if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
async function guardarMaterialTecnico(mat){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar la ficha técnica.");return}
  const anterior=tecnicoMaterial(mat),activo=document.getElementById("pr_cat_activo").checked,categoria=document.getElementById("pr_cat_categoria").value||"general",esGenerador=categoria==="generador";
  const especificaciones=[...document.querySelectorAll(".zx_pr_cat_spec_row")].map(r=>({nombre:String(r.querySelector("[data-pr-cat-spec-nombre]")?.value||"").trim(),valor:String(r.querySelector("[data-pr-cat-spec-valor]")?.value||"").trim(),medida:String(r.querySelector("[data-pr-cat-spec-medida]")?.value||"").trim()})).filter(x=>x.nombre||x.valor||x.medida);
  const nuevo=Object.assign({},anterior,{catalogo_proyectos:activo,equipo_termico:activo&&esGenerador,categoria_tecnica:categoria,subtipo:document.getElementById("pr_cat_subtipo").value.trim()||null,especificaciones,tipo_generador:esGenerador?document.getElementById("pr_cat_tipo").value:null,funciones:esGenerador?[...document.querySelectorAll("[data-pr-cat-func]:checked")].map(x=>x.dataset.prCatFunc):[],potencia_calefaccion_kw:esGenerador?numModal("pr_cat_kw_cal"):null,potencia_refrigeracion_kw:esGenerador?numModal("pr_cat_kw_ref"):null,rendimiento_pct:esGenerador?numModal("pr_cat_rend"):null,temperatura_impulsion_max_c:esGenerador?numModal("pr_cat_tmax"):null,cop:esGenerador?numModal("pr_cat_cop"):null,scop:esGenerador?numModal("pr_cat_scop"):null,eer:esGenerador?numModal("pr_cat_eer"):null,seer:esGenerador?numModal("pr_cat_seer"):null,foto_comercial_url:document.getElementById("pr_cat_foto").value.trim()||null,descripcion_cliente:document.getElementById("pr_cat_desc").value.trim()||null,notas:document.getElementById("pr_cat_notas").value.trim()||null,actualizado_at:new Date().toISOString(),actualizado_por:sesion().nombre||sesion().usuario||""});
  const btn=document.getElementById("pr_cat_form_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const r=await sb().from("materiales").update({tecnico_meta:nuevo}).eq("id",mat.id).select("id,nombre,marca,modelo,referencia,unidad,familia,activo,tecnico_meta").single();if(r.error)throw r.error;const i=MATERIALES.findIndex(x=>String(x.id)===String(mat.id));if(i>=0)MATERIALES[i]=r.data;abrirCatalogoTecnico()}catch(e){alert("No se pudo guardar la ficha técnica.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar"}
}
async function cargarPartidas(propuestaId){
  if(!sb()||!navigator.onLine)return [];
  try{const r=await sb().from("proyectos_partidas").select("*").eq("propuesta_id",propuestaId).order("orden",{ascending:true}).order("created_at",{ascending:true});if(r.error)throw r.error;return r.data||[]}catch(e){return []}
}
function totalesPartidas(xs){
  let coste=0,venta=0,total=0;
  (xs||[]).forEach(x=>{const q=numValor(x.cantidad),cu=numValor(x.coste_unitario),d=numValor(x.descuento),pu=numValor(x.precio_unitario),iva=numValor(x.iva);const cn=x.coste_neto!=null?numValor(x.coste_neto):q*cu*(1-d/100);const vb=q*pu;coste+=cn;venta+=vb;total+=vb*(1+iva/100)});
  return {coste,venta,total,margen:venta-coste};
}
async function sincronizarTotalesPropuesta(op,xs){
  const t=totalesPartidas(xs);
  const r=await sb().from("proyectos_propuestas").update({coste_total:t.coste,precio_venta:t.venta,total_cliente:t.total}).eq("id",op.id).select("*").single();
  if(r.error)throw r.error;
  const i=PROPUESTAS.findIndex(x=>String(x.id)===String(op.id));if(i>=0)PROPUESTAS[i]=r.data;
  return r.data;
}

async function cargarGeneradores(proyectoId){
  GENERADORES=[];
  if(!sb()||!navigator.onLine)return GENERADORES;
  try{const r=await sb().from("proyectos_generadores").select("*").eq("proyecto_id",proyectoId).order("orden",{ascending:true}).order("created_at",{ascending:true});if(r.error)throw r.error;GENERADORES=r.data||[]}catch(e){}
  return GENERADORES;
}

async function cargarAuxiliares(){
  if(!sb()||!navigator.onLine)return;
  try{
    const [c,d,u,ma]=await Promise.all([
      sb().from("clientes").select("id,nombre,estado,telefono,telefono_2").order("nombre",{ascending:true}),
      sb().from("clientes_direcciones").select("*").eq("activa",true).order("principal",{ascending:false}).order("orden",{ascending:true}),
      sb().from("usuarios").select("id,usuario,nombre,activo,estado").order("nombre",{ascending:true}),
      sb().from("materiales").select("id,nombre,marca,modelo,referencia,unidad,familia,activo,tecnico_meta").order("nombre",{ascending:true})
    ]);
    if(!c.error)CLIENTES=(c.data||[]).filter(x=>normalizar(x.estado)!=="archivado");
    if(!d.error)DIRECCIONES=d.data||[];
    if(!u.error)USUARIOS=(u.data||[]).filter(x=>x.activo!==false && normalizar(x.estado)!=="inactivo");
    if(!ma.error)MATERIALES=(ma.data||[]).filter(x=>x.activo!==false);
  }catch(e){}
}
async function cargar(){
  CACHE=leerCache();
  if(!sb()||!navigator.onLine)return CACHE;
  try{
    let q=sb().from(TABLA).select("*").order("updated_at",{ascending:false});
    const emp=sesion().empresa_id;
    if(emp)q=q.eq("empresa_id",emp);
    const r=await q;
    if(r.error)throw r.error;
    CACHE=r.data||[];guardarCache(CACHE);
  }catch(e){}
  return CACHE;
}
function listaFiltrada(){
  let x=CACHE.filter(p=>p.archivado!==true);
  if(FILTRO!=="todos")x=x.filter(p=>p.estado===FILTRO);
  const q=normalizar(BUSQUEDA);
  if(q)x=x.filter(p=>normalizar([p.nombre,nombreCliente(p.cliente_id),textoTipo(p.tipo),textoEstado(p.estado),proyectoDir(p)].join(" ")).includes(q));
  return x;
}
function estadoClass(v){return "zx_pr_estado zx_pr_e_"+limpiar(v||"borrador")}

const ESPECIALIDADES_PROYECTO=[
  ["climatizacion","Climatización / aerotermia"],
  ["fontaneria","Fontanería"],
  ["electricidad","Electricidad"],
  ["ventilacion","Ventilación"],
  ["extraccion","Extracción"],
  ["aire_acondicionado","Aire acondicionado"],
  ["humedad","Control de humedad"]
];
function especialidadesProyecto(p){
  const m=p&&p.inmueble_meta&&typeof p.inmueble_meta==="object"&&!Array.isArray(p.inmueble_meta)?p.inmueble_meta:{};
  const xs=Array.isArray(m.especialidades)?m.especialidades.map(String).filter(v=>ESPECIALIDADES_PROYECTO.some(x=>x[0]===v)):[];
  return xs.length?xs:["climatizacion"];
}
function textoEspecialidad(v){const x=ESPECIALIDADES_PROYECTO.find(z=>z[0]===String(v||""));return x?x[1]:String(v||"")}
function especialidadesBadgesHTML(p){return especialidadesProyecto(p).map(v=>`<span class="zx_pr_spec_badge">${limpiar(textoEspecialidad(v))}</span>`).join("")}
function checksEspecialidadesHTML(p){
  const xs=especialidadesProyecto(p);
  return ESPECIALIDADES_PROYECTO.map(([v,n])=>`<label class="zx_pr_dossier_check"><input type="checkbox" data-pr-especialidad="${v}" ${xs.includes(v)?"checked":""}><span>${limpiar(n)}</span></label>`).join("");
}
function renderTarjetas(lista){
  if(!lista.length)return `<div class="zx_pr_empty">${BUSQUEDA?"No hay proyectos que coincidan con la búsqueda.":"No hay proyectos creados."}</div>`;
  return lista.map(p=>`<button class="zx_pr_card" type="button" data-pr-open="${limpiar(p.id)}">
    <div class="zx_pr_card_top"><b>${limpiar(p.nombre)}</b><span class="${estadoClass(p.estado)}">${limpiar(textoEstado(p.estado))}</span></div>
    <div class="zx_pr_client">${limpiar(nombreCliente(p.cliente_id))}</div>
    <div class="zx_pr_meta"><span>${limpiar(textoTipo(p.tipo))}</span>${proyectoDir(p)?`<span>📍 ${limpiar(proyectoDir(p))}</span>`:""}</div><div class="zx_pr_spec_badges">${especialidadesBadgesHTML(p)}</div>
  </button>`).join("");
}
function shell(){
  const lista=listaFiltrada();
  app().innerHTML=`<div class="zx_pr_shell">
    <section class="zx_pr_panel zx_pr_head"><div><h2>Proyectos</h2><p>Estudios técnicos, propuestas y presupuestos.</p></div><div class="zx_pr_head_actions"><button id="pr_catalogo" class="zx_pr_secondary" type="button">⚙️ Catálogo técnico</button><button id="pr_nuevo" class="zx_pr_primary" type="button">＋ Crear proyecto</button></div></section>
    <section class="zx_pr_panel"><div class="zx_pr_kpis"><div><b>${CACHE.filter(x=>x.archivado!==true).length}</b><span>Activos</span></div><div><b>${CACHE.filter(x=>x.estado==="borrador"&&x.archivado!==true).length}</b><span>Borrador</span></div><div><b>${CACHE.filter(x=>x.estado==="aceptado"&&x.archivado!==true).length}</b><span>Aceptados</span></div></div>
      <div class="zx_pr_tools"><input id="zx_buscar_proyectos" type="search" placeholder="Buscar proyecto, cliente o dirección" value="${limpiar(BUSQUEDA)}"><select id="pr_filtro"><option value="todos">Todos los estados</option>${["borrador","estudio","visita","calculado","presupuestado","enviado","aceptado","ejecucion","terminado","rechazado"].map(x=>`<option value="${x}" ${FILTRO===x?"selected":""}>${limpiar(textoEstado(x))}</option>`).join("")}</select></div>
    </section>
    <section class="zx_pr_panel"><div class="zx_pr_list_head"><h3>Listado</h3><span>${lista.length} proyecto(s)</span></div><div class="zx_pr_list">${renderTarjetas(lista)}</div></section>
  </div>`;
  document.getElementById("pr_catalogo").onclick=abrirCatalogoTecnico;
  document.getElementById("pr_nuevo").onclick=()=>formulario(null);
  document.getElementById("zx_buscar_proyectos").oninput=e=>{BUSQUEDA=e.target.value||"";repintarLista()};
  document.getElementById("pr_filtro").onchange=e=>{FILTRO=e.target.value;shell()};
  conectarTarjetas();
}
function repintarLista(){const l=listaFiltrada(),box=document.querySelector(".zx_pr_list"),h=document.querySelector(".zx_pr_list_head span");if(box)box.innerHTML=renderTarjetas(l);if(h)h.textContent=l.length+" proyecto(s)";conectarTarjetas()}
function conectarTarjetas(){document.querySelectorAll("[data-pr-open]").forEach(b=>b.onclick=()=>abrirFicha(b.dataset.prOpen))}
function opcionesClientes(sel){return `<option value="">Selecciona cliente</option>`+CLIENTES.map(c=>`<option value="${limpiar(c.id)}" ${String(sel)===String(c.id)?"selected":""}>${limpiar(c.nombre)}</option>`).join("")}
function opcionesUsuarios(sel){return `<option value="">Sin asignar</option>`+USUARIOS.map(u=>`<option value="${limpiar(u.id)}" ${String(sel)===String(u.id)?"selected":""}>${limpiar(u.nombre||u.usuario)}</option>`).join("")}
function opcionesDirecciones(clienteId,sel){const ds=DIRECCIONES.filter(d=>String(d.cliente_id)===String(clienteId));return `<option value="">${ds.length?"Selecciona dirección":"Cliente sin direcciones guardadas"}</option>`+ds.map(d=>`<option value="${limpiar(d.id)}" ${String(sel)===String(d.id)?"selected":""}>${limpiar((d.etiqueta?d.etiqueta+" · ":"")+dirTexto(d))}</option>`).join("")}
function modal(html){let m=document.getElementById("zx_pr_modal");if(m)m.remove();m=document.createElement("div");m.id="zx_pr_modal";m.className="zx_pr_modal";m.innerHTML=`<div class="zx_pr_modal_box">${html}</div>`;document.body.appendChild(m);return m}
function cerrarModal(){const m=document.getElementById("zx_pr_modal");if(m)m.remove()}
function autoNombre(clienteId,tipo){const c=CLIENTES.find(x=>String(x.id)===String(clienteId));return c?textoTipo(tipo)+" · "+c.nombre:""}
function formulario(p){
  const nuevo=!p,meta=Object.assign({},p&&p.inmueble_meta||{});
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_form_cancel" type="button">← Volver</button><button id="pr_form_save" class="primary" type="button">Guardar</button></div>
    <div class="zx_pr_form_head"><span>${nuevo?"NUEVO PROYECTO":"EDITAR PROYECTO"}</span><h2>${nuevo?"Crear proyecto":limpiar(p.nombre)}</h2></div>
    <div class="zx_pr_grid2"><label>Cliente<select id="pr_cliente">${opcionesClientes(p&&p.cliente_id)}</select></label><label>Dirección<select id="pr_direccion">${opcionesDirecciones(p&&p.cliente_id,p&&p.direccion_id)}</select></label></div>
    <div class="zx_pr_grid2"><label>Tipo<select id="pr_tipo">${["nueva","sustitucion","reforma","ampliacion","hibridacion","estudio","otro"].map(x=>`<option value="${x}" ${(p&&p.tipo||"estudio")===x?"selected":""}>${limpiar(textoTipo(x))}</option>`).join("")}</select></label><label>Estado<select id="pr_estado">${["borrador","estudio","visita","calculado","presupuestado","enviado","aceptado","ejecucion","terminado","rechazado"].map(x=>`<option value="${x}" ${(p&&p.estado||"borrador")===x?"selected":""}>${limpiar(textoEstado(x))}</option>`).join("")}</select></label></div>
    <label>Nombre del proyecto<input id="pr_nombre" value="${limpiar(p&&p.nombre||"")}" placeholder="Se propone automáticamente"></label>
    <div class="zx_pr_grid2"><label>Comercial<select id="pr_comercial">${opcionesUsuarios(p&&p.comercial_id)}</select></label><label>Técnico responsable<select id="pr_tecnico">${opcionesUsuarios(p&&p.tecnico_id)}</select></label></div>
    <div class="zx_pr_section"><h3>Datos iniciales del inmueble</h3><div class="zx_pr_grid2"><label>Tipo de inmueble<input id="pr_inm_tipo" value="${limpiar(meta.tipo_inmueble||"")}" placeholder="Chalet, piso, local…"></label><label>Superficie calefactada <span class="zx_pr_unit">m²</span><input id="pr_m2" type="number" min="0" step="0.1" inputmode="decimal" value="${limpiar(meta.superficie_calefactada_m2??"")}"></label><label>Nº de plantas <span class="zx_pr_unit">ud</span><input id="pr_plantas" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(meta.plantas??"")}"></label><label>Año de construcción<input id="pr_ano" type="number" min="1800" max="2200" step="1" inputmode="numeric" value="${limpiar(meta.ano_construccion??"")}"></label><label>Ocupantes <span class="zx_pr_unit">personas</span><input id="pr_ocupantes" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(meta.ocupantes??"")}"></label><label>Nº de baños <span class="zx_pr_unit">ud</span><input id="pr_banos" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(meta.banos??"")}"></label></div></div>
    <div class="zx_pr_section"><h3>Especialidades del proyecto</h3><div class="zx_pr_calc_help">Puedes activar varias especialidades dentro del mismo proyecto. Climatización conserva los bloques térmicos actuales; las demás quedan preparadas para sus cálculos y equipos específicos.</div><div class="zx_pr_checks zx_pr_spec_checks">${checksEspecialidadesHTML(p)}</div></div>
    <label>Notas internas<textarea id="pr_notas" rows="4">${limpiar(p&&p.notas_internas||"")}</textarea></label>`);
  const cli=m.querySelector("#pr_cliente"),dir=m.querySelector("#pr_direccion"),tipo=m.querySelector("#pr_tipo"),nom=m.querySelector("#pr_nombre");
  cli.onchange=()=>{dir.innerHTML=opcionesDirecciones(cli.value,"");if(!nom.value.trim())nom.value=autoNombre(cli.value,tipo.value)};
  tipo.onchange=()=>{if(nuevo && (!nom.value.trim() || nom.dataset.auto==="1")){nom.value=autoNombre(cli.value,tipo.value);nom.dataset.auto="1"}};
  if(nuevo)nom.dataset.auto="1";nom.oninput=()=>{nom.dataset.auto="0"};
  m.querySelector("#pr_form_cancel").onclick=cerrarModal;
  m.querySelector("#pr_form_save").onclick=()=>guardarFormulario(p);
}
function numero(id){const v=document.getElementById(id).value.trim();return v===""?null:Number(v)}
async function guardarFormulario(p){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar este proyecto.");return}
  const cliente_id=document.getElementById("pr_cliente").value;
  const nombre=document.getElementById("pr_nombre").value.trim();
  if(!cliente_id){alert("Selecciona un cliente.");return}
  if(!nombre){alert("Escribe el nombre del proyecto.");return}
  const u=sesion();
  const metaAnterior=p&&p.inmueble_meta&&typeof p.inmueble_meta==="object"&&!Array.isArray(p.inmueble_meta)?p.inmueble_meta:{};
  const especialidades=[...document.querySelectorAll("[data-pr-especialidad]:checked")].map(x=>x.dataset.prEspecialidad).filter(Boolean);
  if(!especialidades.length){alert("Selecciona al menos una especialidad para el proyecto.");return}
  const inmueble_meta=Object.assign({},metaAnterior,{tipo_inmueble:document.getElementById("pr_inm_tipo").value.trim(),superficie_calefactada_m2:numero("pr_m2"),plantas:numero("pr_plantas"),ano_construccion:numero("pr_ano"),ocupantes:numero("pr_ocupantes"),banos:numero("pr_banos"),especialidades});
  const payload={empresa_id:u.empresa_id||"demo",cliente_id,direccion_id:document.getElementById("pr_direccion").value||null,nombre,tipo:document.getElementById("pr_tipo").value,estado:document.getElementById("pr_estado").value,comercial_id:document.getElementById("pr_comercial").value||null,tecnico_id:document.getElementById("pr_tecnico").value||null,notas_internas:document.getElementById("pr_notas").value.trim()||null,inmueble_meta};
  if(!p)payload.creado_por=u.nombre||u.usuario||"";
  const btn=document.getElementById("pr_form_save");btn.disabled=true;btn.textContent="Guardando…";
  try{
    const r=p?await sb().from(TABLA).update(payload).eq("id",p.id).select("*").single():await sb().from(TABLA).insert([payload]).select("*").single();
    if(r.error)throw r.error;
    try{await sb().from("proyectos_historial").insert([{proyecto_id:r.data.id,tipo:"proyecto",accion:p?"editado":"creado",resumen:p?"Datos principales modificados":"Proyecto creado",usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{estado:r.data.estado,tipo:r.data.tipo}}])}catch(e){}
    await cargar();cerrarModal();shell();abrirFicha(r.data.id);
  }catch(e){alert("No se pudo guardar el proyecto.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar"}
}
function generadoresHTML(){
  if(!GENERADORES.length)return `<div class="zx_pr_empty zx_pr_gen_empty">Todavía no hay generadores registrados.</div>`;
  return GENERADORES.map(g=>{
    const meta=g.tecnico_meta||{},fs=listaFunciones(g.funciones),situacion=g.existente!==false?"Existente":"Propuesto";
    return `<div class="zx_pr_gen_card">
      <div class="zx_pr_gen_top"><div><b>${limpiar(textoGenerador(g.tipo))}</b><span>${limpiar(situacion)}${g.subtipo?" · "+limpiar(g.subtipo):""}</span></div>${puedeEditar()?`<button type="button" data-pr-gen-edit="${limpiar(g.id)}">Editar</button>`:""}</div>
      <div class="zx_pr_gen_grid">
        <div><span>Marca / modelo</span><b>${limpiar([g.marca,g.modelo].filter(Boolean).join(" ")||"Sin indicar")}</b></div>
        <div><span>Potencia</span><b>${g.potencia_kw!=null?limpiar(g.potencia_kw)+" kW":"Sin indicar"}</b></div>
        <div><span>Estado</span><b>${limpiar(g.estado||"Sin indicar")}</b></div>
        <div><span>Papel previsto</span><b>${limpiar(textoRol(meta.rol_futuro))}</b></div>
      </div>
      ${fs.length?`<div class="zx_pr_gen_tags">${fs.map(x=>`<span>${limpiar(({calefaccion:"Calefacción",acs:"ACS",refrigeracion:"Refrigeración",piscina:"Piscina"})[x]||x)}</span>`).join("")}</div>`:""}
      <div class="zx_pr_gen_decision">${g.existente===false?"Equipo previsto":(g.se_retira?"Se retirará":g.se_mantiene?"Se conserva":"Pendiente de decidir")}${meta.material_catalogo_id?" · Catálogo técnico":""}</div>
      ${g.notas?`<p>${limpiar(g.notas)}</p>`:""}
    </div>`;
  }).join("");
}
function conectarGeneradores(p){
  document.querySelectorAll("[data-pr-gen-edit]").forEach(b=>b.onclick=()=>{const g=GENERADORES.find(x=>String(x.id)===String(b.dataset.prGenEdit));if(g)formularioGenerador(p,g)});
  const n=document.getElementById("pr_gen_nuevo");if(n)n.onclick=()=>formularioGenerador(p,null);
}
function opcionesTipoGenerador(sel){return ["aerotermia","bomba_calor","geotermia","gas_natural","glp","gasoleo","lena","pellet","biomasa","resistencia","solar_termica","fotovoltaica","chimenea","estufa","otro"].map(x=>`<option value="${x}" ${sel===x?"selected":""}>${limpiar(textoGenerador(x))}</option>`).join("")}
function formularioGenerador(p,g){
  const meta=Object.assign({},g&&g.tecnico_meta||{}),fs=listaFunciones(g&&g.funciones),nuevo=!g,catalogoId=meta.material_catalogo_id||"";
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_gen_back" type="button">← Volver</button><button id="pr_gen_save" class="primary" type="button">Guardar</button></div>
    <div class="zx_pr_form_head"><span>${nuevo?"NUEVO GENERADOR":"EDITAR GENERADOR"}</span><h2>${nuevo?"Añadir generador":limpiar(textoGenerador(g.tipo))}</h2></div>
    <label>Generador del catálogo técnico<select id="pr_gen_catalogo">${opcionesCatalogoTecnico(catalogoId)}</select></label>
    <div id="pr_gen_catalogo_info" class="zx_pr_rule_gen_info ${catalogoId?"":"is-empty"}">${catalogoId?"Datos copiados desde el catálogo técnico.":"Opcional · selecciona un generador para rellenar sus datos."}</div>
    <div class="zx_pr_grid2"><label>Situación<select id="pr_gen_existente"><option value="1" ${(g?g.existente!==false:true)?"selected":""}>Instalación existente</option><option value="0" ${g&&g.existente===false?"selected":""}>Equipo nuevo / previsto</option></select></label><label>Tipo<select id="pr_gen_tipo">${opcionesTipoGenerador(g&&g.tipo||"aerotermia")}</select></label></div>
    <div class="zx_pr_grid2"><label>Subtipo<input id="pr_gen_subtipo" value="${limpiar(g&&g.subtipo||"")}" placeholder="Caldera, bomba de calor, estufa…"></label><label>Estado<input id="pr_gen_estado" value="${limpiar(g&&g.estado||"")}" placeholder="Bueno, regular, averiado…"></label></div>
    <div class="zx_pr_grid2"><label>Marca<input id="pr_gen_marca" value="${limpiar(g&&g.marca||"")}"></label><label>Modelo<input id="pr_gen_modelo" value="${limpiar(g&&g.modelo||"")}"></label></div>
    <div class="zx_pr_grid2"><label>Referencia<input id="pr_gen_ref" value="${limpiar(g&&g.referencia||"")}"></label><label>Potencia <span class="zx_pr_unit">kW</span><input id="pr_gen_kw" type="number" min="0" step="0.01" inputmode="decimal" value="${g&&g.potencia_kw!=null?limpiar(g.potencia_kw):""}"></label></div>
    <label>Foto para dosier · URL opcional<input id="pr_gen_foto_dosier" value="${limpiar(meta.foto_comercial_url||meta.foto_url||"")}" placeholder="https://..."></label>
    <label>Texto para cliente<textarea id="pr_gen_desc_cliente" rows="3" placeholder="Descripción breve del equipo y por qué se propone">${limpiar(meta.descripcion_cliente||"")}</textarea></label>
    <div class="zx_pr_section"><h3>Servicios que cubre</h3><div class="zx_pr_checks">
      ${[["calefaccion","Calefacción"],["acs","ACS"],["refrigeracion","Refrigeración"],["piscina","Piscina"]].map(([v,t])=>`<label><input type="checkbox" data-pr-func="${v}" ${fs.includes(v)?"checked":""}><span>${t}</span></label>`).join("")}
    </div></div>
    <div class="zx_pr_section" id="pr_gen_decision_section"><h3>Decisión sobre este equipo</h3><div class="zx_pr_checks zx_pr_checks_decision">
      <label><input id="pr_gen_mantiene" type="checkbox" ${g?g.se_mantiene!==false:"checked"}><span>Se conserva</span></label>
      <label><input id="pr_gen_retira" type="checkbox" ${g&&g.se_retira?"checked":""}><span>Se retira</span></label>
    </div></div>
    <label class="zx_pr_role"><span id="pr_gen_role_label">Papel previsto${g&&g.existente!==false?" si se conserva":""}</span><select id="pr_gen_rol"><option value="">Sin definir</option>${["principal","apoyo","emergencia","alternativo","simultaneo","solo_acs","solo_calefaccion","manual"].map(x=>`<option value="${x}" ${meta.rol_futuro===x?"selected":""}>${limpiar(textoRol(x))}</option>`).join("")}</select></label>
    <label>Notas<textarea id="pr_gen_notas" rows="4" placeholder="Estado, conexión actual, observaciones de visita…">${limpiar(g&&g.notas||"")}</textarea></label>
    ${!nuevo?`<button id="pr_gen_delete" class="zx_pr_danger" type="button">Eliminar generador</button>`:""}`);
  m.querySelector("#pr_gen_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const man=m.querySelector("#pr_gen_mantiene"),ret=m.querySelector("#pr_gen_retira"),sit=m.querySelector("#pr_gen_existente"),dec=m.querySelector("#pr_gen_decision_section"),roleLabel=m.querySelector("#pr_gen_role_label"),cat=m.querySelector("#pr_gen_catalogo"),catInfo=m.querySelector("#pr_gen_catalogo_info");
  const ajustarDecision=()=>{const existente=sit.value==="1";dec.style.display=existente?"":"none";if(roleLabel)roleLabel.textContent=existente?"Papel previsto si se conserva":"Papel previsto";if(!existente){man.checked=false;ret.checked=false}};
  const aplicarCatalogo=()=>{const mat=MATERIALES.find(x=>String(x.id)===String(cat.value));if(!mat){catInfo.textContent="Opcional · selecciona un generador para rellenar sus datos.";catInfo.classList.add("is-empty");return}const t=tecnicoMaterial(mat);m.querySelector("#pr_gen_tipo").value=t.tipo_generador||"otro";m.querySelector("#pr_gen_subtipo").value=t.subtipo||"";m.querySelector("#pr_gen_marca").value=mat.marca||"";m.querySelector("#pr_gen_modelo").value=mat.modelo||"";m.querySelector("#pr_gen_ref").value=mat.referencia||"";const kw=t.potencia_calefaccion_kw!=null?t.potencia_calefaccion_kw:(t.potencia_refrigeracion_kw!=null?t.potencia_refrigeracion_kw:"");m.querySelector("#pr_gen_kw").value=kw;document.querySelectorAll("[data-pr-func]").forEach(x=>x.checked=serviciosTecnicosMeta(t).includes(x.dataset.prFunc));m.querySelector("#pr_gen_foto_dosier").value=t.foto_comercial_url||t.foto_url||"";m.querySelector("#pr_gen_desc_cliente").value=t.descripcion_cliente||"";catInfo.textContent="Datos copiados de "+(materialTexto(mat)||mat.nombre||"generador")+". Se guardará una foto fija en el proyecto.";catInfo.classList.remove("is-empty")};
  man.dataset.prDecisionTouched="0";ret.dataset.prDecisionTouched="0";sit.dataset.prDecisionTouched="0";
  cat.onchange=aplicarCatalogo;
  man.onchange=()=>{man.dataset.prDecisionTouched="1";ret.dataset.prDecisionTouched="1";if(man.checked)ret.checked=false};
  ret.onchange=()=>{man.dataset.prDecisionTouched="1";ret.dataset.prDecisionTouched="1";if(ret.checked)man.checked=false};
  sit.onchange=()=>{sit.dataset.prDecisionTouched="1";ajustarDecision()};ajustarDecision();
  m.querySelector("#pr_gen_save").onclick=()=>guardarGenerador(p,g);
  const del=m.querySelector("#pr_gen_delete");if(del)del.onclick=()=>eliminarGenerador(p,g);
}
async function guardarGenerador(p,g){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el generador.");return}
  const tipo=document.getElementById("pr_gen_tipo").value;
  const funciones=[...document.querySelectorAll("[data-pr-func]:checked")].map(x=>x.dataset.prFunc);
  const potencia=document.getElementById("pr_gen_kw").value.trim();
  const existente=document.getElementById("pr_gen_existente").value==="1";
  const materialCatalogoId=document.getElementById("pr_gen_catalogo").value||null;
  const materialCatalogo=MATERIALES.find(x=>String(x.id)===String(materialCatalogoId))||null;
  const metaAnterior=g&&g.tecnico_meta&&typeof g.tecnico_meta==="object"&&!Array.isArray(g.tecnico_meta)?g.tecnico_meta:{};
  const mismoCatalogo=String(metaAnterior.material_catalogo_id||"")===String(materialCatalogoId||"");
  const catalogoSnapshot=materialCatalogoId?(mismoCatalogo&&metaAnterior.catalogo_snapshot?metaAnterior.catalogo_snapshot:snapshotMaterialTecnico(materialCatalogo)):null;
  const tecnicoMeta=Object.assign({},metaAnterior,{rol_futuro:document.getElementById("pr_gen_rol").value||null,foto_comercial_url:document.getElementById("pr_gen_foto_dosier").value.trim()||null,descripcion_cliente:document.getElementById("pr_gen_desc_cliente").value.trim()||null,material_catalogo_id:materialCatalogoId,catalogo_snapshot:catalogoSnapshot});
  const mantieneEl=document.getElementById("pr_gen_mantiene"),retiraEl=document.getElementById("pr_gen_retira"),situacionEl=document.getElementById("pr_gen_existente");
  const decisionTocada=mantieneEl.dataset.prDecisionTouched==="1"||retiraEl.dataset.prDecisionTouched==="1"||situacionEl.dataset.prDecisionTouched==="1";
  const mantieneGuardado=g&&typeof g.se_mantiene==="boolean"?g.se_mantiene:mantieneEl.checked;
  const retiraGuardado=g&&typeof g.se_retira==="boolean"?g.se_retira:retiraEl.checked;
  const seMantiene=existente&&(g&&!decisionTocada?mantieneGuardado:mantieneEl.checked);
  const seRetira=existente&&(g&&!decisionTocada?retiraGuardado:retiraEl.checked);
  const payload={proyecto_id:p.id,propuesta_id:null,tipo,subtipo:document.getElementById("pr_gen_subtipo").value.trim()||null,existente,marca:document.getElementById("pr_gen_marca").value.trim()||null,modelo:document.getElementById("pr_gen_modelo").value.trim()||null,referencia:document.getElementById("pr_gen_ref").value.trim()||null,potencia_kw:potencia===""?null:Number(potencia),estado:document.getElementById("pr_gen_estado").value.trim()||null,se_mantiene:seMantiene,se_retira:seRetira,funciones,tecnico_meta:tecnicoMeta,notas:document.getElementById("pr_gen_notas").value.trim()||null,orden:g&&Number.isFinite(Number(g.orden))?Number(g.orden):GENERADORES.length};
  if(payload.se_mantiene&&payload.se_retira){alert("No puede marcarse a la vez conservar y retirar.");return}
  const btn=document.getElementById("pr_gen_save");btn.disabled=true;btn.textContent="Guardando…";
  try{
    const r=g?await sb().from("proyectos_generadores").update(payload).eq("id",g.id).select("*").single():await sb().from("proyectos_generadores").insert([payload]).select("*").single();
    if(r.error)throw r.error;
    const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"generador",accion:g?"editado":"creado",resumen:(g?"Generador modificado: ":"Generador añadido: ")+textoGenerador(tipo),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{generador_id:r.data.id,tipo:r.data.tipo,existente:r.data.existente,se_mantiene:r.data.se_mantiene,se_retira:r.data.se_retira}}])}catch(e){}
    cerrarModal();await abrirFicha(p.id);
  }catch(e){alert("No se pudo guardar el generador.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar"}
}
async function eliminarGenerador(p,g){
  if(!confirm("¿Eliminar este generador del proyecto?"))return;
  try{const r=await sb().from("proyectos_generadores").delete().eq("id",g.id);if(r.error)throw r.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"generador",accion:"eliminado",resumen:"Generador eliminado: "+textoGenerador(g.tipo),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{generador_id:g.id,tipo:g.tipo}}])}catch(e){}cerrarModal();await abrirFicha(p.id)}catch(e){alert("No se pudo eliminar el generador.\n"+(e&&e.message?e.message:""))}
}
function emisoresHTML(p){
  const xs=listaEmisores(p);
  if(!xs.length)return `<div class="zx_pr_empty zx_pr_em_empty">Todavía no hay emisores registrados.</div>`;
  return xs.map(e=>{
    const servicios=Array.isArray(e.servicios)?e.servicios:[];
    const temp=[e.impulsion_c!=null?e.impulsion_c:null,e.retorno_c!=null?e.retorno_c:null].filter(x=>x!=null).join(" / ");
    return `<div class="zx_pr_em_card">
      <div class="zx_pr_gen_top"><div><b>${limpiar(textoEmisor(e.tipo))}</b><span>${limpiar(textoSituacionEmisor(e.situacion))}${e.zona?" · "+limpiar(e.zona):""}</span></div>${puedeEditar()?`<button type="button" data-pr-em-edit="${limpiar(e.id)}">Editar</button>`:""}</div>
      <div class="zx_pr_gen_grid">
        <div><span>Zona</span><b>${limpiar(e.zona||"Sin indicar")}</b></div>
        <div><span>Temperatura</span><b>${temp?limpiar(temp)+" °C":"Sin indicar"}</b></div>
        <div><span>Potencia</span><b>${e.potencia_kw!=null?limpiar(e.potencia_kw)+" kW":"Sin indicar"}</b></div>
        <div><span>Cantidad</span><b>${e.cantidad!=null?limpiar(e.cantidad)+" "+limpiar(e.unidad||"ud"):"Sin indicar"}</b></div>
      </div>
      ${servicios.length?`<div class="zx_pr_gen_tags">${servicios.map(x=>`<span>${limpiar(({calefaccion:"Calefacción",refrigeracion:"Refrigeración"})[x]||x)}</span>`).join("")}</div>`:""}
      ${e.notas?`<p>${limpiar(e.notas)}</p>`:""}
    </div>`;
  }).join("");
}
function conectarEmisores(p){
  document.querySelectorAll("[data-pr-em-edit]").forEach(b=>b.onclick=()=>{const e=listaEmisores(p).find(x=>String(x.id)===String(b.dataset.prEmEdit));if(e)formularioEmisor(p,e)});
  const n=document.getElementById("pr_em_nuevo");if(n)n.onclick=()=>formularioEmisor(p,null);
}
function opcionesTipoEmisor(sel){return ["suelo_radiante","radiadores","radiadores_baja","fancoils","conductos","aerotermos","piscina","otro"].map(x=>`<option value="${x}" ${sel===x?"selected":""}>${limpiar(textoEmisor(x))}</option>`).join("")}
function formularioEmisor(p,e){
  const nuevo=!e,servicios=Array.isArray(e&&e.servicios)?e.servicios:[];
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_em_back" type="button">← Volver</button><button id="pr_em_save" class="primary" type="button">Guardar</button></div>
    <div class="zx_pr_form_head"><span>${nuevo?"NUEVO EMISOR":"EDITAR EMISOR"}</span><h2>${nuevo?"Añadir emisor":limpiar(textoEmisor(e.tipo))}</h2></div>
    <div class="zx_pr_grid2"><label>Situación<select id="pr_em_situacion"><option value="existente" ${!e||e.situacion!=="previsto"?"selected":""}>Instalación existente</option><option value="previsto" ${e&&e.situacion==="previsto"?"selected":""}>Emisor nuevo / previsto</option></select></label><label>Tipo<select id="pr_em_tipo">${opcionesTipoEmisor(e&&e.tipo||"radiadores")}</select></label></div>
    <label>Zona<input id="pr_em_zona" value="${limpiar(e&&e.zona||"")}" placeholder="Planta baja, salón, circuito 1…"></label>
    <div class="zx_pr_grid2"><label>Temperatura impulsión <span class="zx_pr_unit">°C</span><input id="pr_em_imp" type="number" step="0.1" inputmode="decimal" value="${e&&e.impulsion_c!=null?limpiar(e.impulsion_c):""}"></label><label>Temperatura retorno <span class="zx_pr_unit">°C</span><input id="pr_em_ret" type="number" step="0.1" inputmode="decimal" value="${e&&e.retorno_c!=null?limpiar(e.retorno_c):""}"></label></div>
    <div class="zx_pr_grid2"><label>Potencia aproximada <span class="zx_pr_unit">kW</span><input id="pr_em_kw" type="number" min="0" step="0.01" inputmode="decimal" value="${e&&e.potencia_kw!=null?limpiar(e.potencia_kw):""}"></label><label>Cantidad <span class="zx_pr_unit" id="pr_em_unit_label">${limpiar(e&&e.unidad||"ud")}</span><input id="pr_em_cantidad" type="number" min="0" step="0.01" inputmode="decimal" value="${e&&e.cantidad!=null?limpiar(e.cantidad):""}"></label></div>
    <label>Unidad<select id="pr_em_unidad"><option value="ud" ${(e&&e.unidad||"ud")==="ud"?"selected":""}>ud</option><option value="m²" ${e&&e.unidad==="m²"?"selected":""}>m²</option><option value="m" ${e&&e.unidad==="m"?"selected":""}>m</option><option value="circuitos" ${e&&e.unidad==="circuitos"?"selected":""}>circuitos</option><option value="elementos" ${e&&e.unidad==="elementos"?"selected":""}>elementos</option></select></label>
    <div class="zx_pr_section"><h3>Servicios</h3><div class="zx_pr_checks">${[["calefaccion","Calefacción"],["refrigeracion","Refrigeración"]].map(([v,t])=>`<label><input type="checkbox" data-pr-em-serv="${v}" ${servicios.includes(v)?"checked":""}><span>${t}</span></label>`).join("")}</div></div>
    <label>Notas<textarea id="pr_em_notas" rows="4" placeholder="Estado, regulación, circuitos, observaciones…">${limpiar(e&&e.notas||"")}</textarea></label>
    ${!nuevo?`<button id="pr_em_delete" class="zx_pr_danger" type="button">Eliminar emisor</button>`:""}`);
  m.querySelector("#pr_em_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const un=m.querySelector("#pr_em_unidad"),lab=m.querySelector("#pr_em_unit_label");un.onchange=()=>lab.textContent=un.value;
  m.querySelector("#pr_em_save").onclick=()=>guardarEmisor(p,e);
  const del=m.querySelector("#pr_em_delete");if(del)del.onclick=()=>eliminarEmisor(p,e);
}
function numOrNull(id){const v=document.getElementById(id).value.trim();return v===""?null:Number(v)}
async function guardarEmisor(p,e){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el emisor.");return}
  const xs=listaEmisores(p).map(x=>Object.assign({},x));
  const item={id:e&&e.id||uidLocal(),situacion:document.getElementById("pr_em_situacion").value,tipo:document.getElementById("pr_em_tipo").value,zona:document.getElementById("pr_em_zona").value.trim()||null,impulsion_c:numOrNull("pr_em_imp"),retorno_c:numOrNull("pr_em_ret"),potencia_kw:numOrNull("pr_em_kw"),cantidad:numOrNull("pr_em_cantidad"),unidad:document.getElementById("pr_em_unidad").value||"ud",servicios:[...document.querySelectorAll("[data-pr-em-serv]:checked")].map(x=>x.dataset.prEmServ),notas:document.getElementById("pr_em_notas").value.trim()||null};
  const ix=xs.findIndex(x=>String(x.id)===String(item.id));if(ix>=0)xs[ix]=item;else xs.push(item);
  const btn=document.getElementById("pr_em_save");btn.disabled=true;btn.textContent="Guardando…";
  try{
    const r=await sb().from(TABLA).update({emisores_meta:xs}).eq("id",p.id).select("*").single();if(r.error)throw r.error;
    const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"emisor",accion:e?"editado":"creado",resumen:(e?"Emisor modificado: ":"Emisor añadido: ")+textoEmisor(item.tipo),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{emisor_id:item.id,tipo:item.tipo,situacion:item.situacion}}])}catch(err){}
    const ci=CACHE.findIndex(x=>String(x.id)===String(p.id));if(ci>=0){CACHE[ci]=r.data;guardarCache(CACHE)}
    cerrarModal();await abrirFicha(p.id);
  }catch(err){alert("No se pudo guardar el emisor.\n"+(err&&err.message?err.message:""));btn.disabled=false;btn.textContent="Guardar"}
}
async function eliminarEmisor(p,e){
  if(!confirm("¿Eliminar este emisor del proyecto?"))return;
  const xs=listaEmisores(p).filter(x=>String(x.id)!==String(e.id));
  try{const r=await sb().from(TABLA).update({emisores_meta:xs}).eq("id",p.id).select("*").single();if(r.error)throw r.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"emisor",accion:"eliminado",resumen:"Emisor eliminado: "+textoEmisor(e.tipo),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{emisor_id:e.id,tipo:e.tipo}}])}catch(err){}const ci=CACHE.findIndex(x=>String(x.id)===String(p.id));if(ci>=0){CACHE[ci]=r.data;guardarCache(CACHE)}cerrarModal();await abrirFicha(p.id)}catch(err){alert("No se pudo eliminar el emisor.\n"+(err&&err.message?err.message:""))}
}
function calculosHTML(){
  if(!CALCULOS.length)return `<div class="zx_pr_empty">Todavía no hay cálculos guardados.</div>`;
  return CALCULOS.map(c=>{
    const en=c.entrada_meta&&typeof c.entrada_meta==="object"?c.entrada_meta:{};
    const rn=c.resultado_meta&&typeof c.resultado_meta==="object"?c.resultado_meta:{};
    const detalleRapido=c.tipo_calculo==="estimacion"&&(en.coef_calefaccion_w_m2!=null||en.coef_refrigeracion_w_m2!=null)
      ?`<div class="zx_pr_calc_by">Estimación: ${en.coef_calefaccion_w_m2!=null?limpiar(en.coef_calefaccion_w_m2)+" W/m² calefacción":"sin coeficiente de calefacción"} · ${en.coef_refrigeracion_w_m2!=null?limpiar(en.coef_refrigeracion_w_m2)+" W/m² refrigeración":"sin coeficiente de refrigeración"}${en.ocupantes!=null?" · "+limpiar(en.ocupantes)+" personas":""}</div>`:"";
    const estancias=Array.isArray(en.estancias)?en.estancias:[];
    const detalleEstancias=c.tipo_calculo==="tecnico"&&estancias.length
      ?`<div class="zx_pr_calc_by">Por estancias: ${estancias.length} · ${en.superficie_m2!=null?limpiar(en.superficie_m2)+" m²":"superficie calculada"}${rn.formula_version_estancias?" · cálculo Zentryx v"+limpiar(rn.formula_version_estancias):""}</div>`:"";
    const detalleMetodo=c.tipo_calculo==="otro"&&en.metodo_nombre
      ?`<div class="zx_pr_calc_by">Método: ${limpiar(en.metodo_nombre)}</div>`:"";
    return `<div class="zx_pr_calc_card">
      <div class="zx_pr_calc_top"><div><b>Versión ${limpiar(c.version)}</b><span>${limpiar(textoTipoCalculo(c.tipo_calculo))} · ${limpiar(fechaES(c.created_at))}</span></div><span class="zx_pr_calc_badge">Guardado</span></div>
      <div class="zx_pr_gen_grid">
        <div><span>Superficie usada</span><b>${numeroVisible(en.superficie_m2,"m²")}</b></div>
        <div><span>Calefacción</span><b>${numeroVisible(c.calefaccion_kw,"kW")}</b></div>
        <div><span>Refrigeración</span><b>${numeroVisible(c.refrigeracion_kw,"kW")}</b></div>
        <div><span>ACS recomendado</span><b>${numeroVisible(c.acs_litros,"L")}</b></div>
        <div><span>Impulsión recomendada</span><b>${numeroVisible(c.temperatura_impulsion_c,"°C")}</b></div>
        <div><span>Condiciones calefacción</span><b>${en.temp_ext_invierno_c!=null||en.temp_int_calefaccion_c!=null?numeroVisible(en.temp_ext_invierno_c,"°C")+" / "+numeroVisible(en.temp_int_calefaccion_c,"°C"):"Sin indicar"}</b></div>
      </div>
      ${detalleRapido}
      ${detalleEstancias}
      ${detalleMetodo}
      ${rn.creado_por_nombre?`<div class="zx_pr_calc_by">Registrado por ${limpiar(rn.creado_por_nombre)}</div>`:""}
      ${c.observaciones?`<p>${limpiar(c.observaciones)}</p>`:""}
    </div>`;
  }).join("");
}
function impulsionRapidaSugerida(p){
  const xs=listaEmisores(p).filter(e=>e&&e.tipo!=="piscina");
  const e=xs.find(x=>Array.isArray(x.servicios)&&x.servicios.includes("calefaccion"))||xs[0];
  if(!e)return null;
  if(e.impulsion_c!=null&&e.impulsion_c!==""){const n=Number(e.impulsion_c);if(Number.isFinite(n))return n}
  const mapa={suelo_radiante:35,radiadores_baja:45,fancoils:45,conductos:45,aerotermos:50,radiadores:55};
  return Object.prototype.hasOwnProperty.call(mapa,e.tipo)?mapa[e.tipo]:null;
}
function redondearCalc(v,dec=2){const f=Math.pow(10,dec);return Math.round((Number(v)+Number.EPSILON)*f)/f}
function ponerResultadoCalc(id,v,auto){
  const el=document.getElementById(id);if(!el)return;
  el.value=v==null||!Number.isFinite(Number(v))?"":String(v);
  if(auto)el.dataset.prAuto="1";else delete el.dataset.prAuto;
}
function limpiarResultadosAuto(){
  ["pr_calc_cal","pr_calc_ref","pr_calc_acs","pr_calc_imp"].forEach(id=>{const el=document.getElementById(id);if(el&&el.dataset.prAuto==="1"){el.value="";delete el.dataset.prAuto}});
}
function aplicarNivelEstimacionRapida(){
  const nivel=document.getElementById("pr_calc_nivel"),cal=document.getElementById("pr_calc_w_cal"),ref=document.getElementById("pr_calc_w_ref");if(!nivel||!cal||!ref)return;
  const valores={bueno:[50,45],medio:[80,70],bajo:[110,90]};const v=valores[nivel.value];if(v){cal.value=v[0];ref.value=v[1]}
  actualizarEstimacionRapida();
}
function actualizarEstimacionRapida(){
  const sup=numCalc("pr_calc_sup"),wCal=numCalc("pr_calc_w_cal"),wRef=numCalc("pr_calc_w_ref"),ocup=numCalc("pr_calc_ocup"),acsPersona=numCalc("pr_calc_acs_persona"),imp=numCalc("pr_calc_imp_quick");
  const cal=sup!=null&&wCal!=null?redondearCalc(sup*wCal/1000,2):null;
  const ref=sup!=null&&wRef!=null?redondearCalc(sup*wRef/1000,2):null;
  const acs=ocup!=null&&acsPersona!=null?redondearCalc(ocup*acsPersona,0):null;
  ponerResultadoCalc("pr_calc_cal",cal,true);ponerResultadoCalc("pr_calc_ref",ref,true);ponerResultadoCalc("pr_calc_acs",acs,true);ponerResultadoCalc("pr_calc_imp",imp,true);
  const r=document.getElementById("pr_calc_quick_resume");
  if(r)r.innerHTML=sup!=null?`<b>Resultado orientativo</b><span>${cal!=null?limpiar(cal)+" kW calefacción":"—"} · ${ref!=null?limpiar(ref)+" kW refrigeración":"—"}${acs!=null?" · "+limpiar(acs)+" L ACS":""}${imp!=null?" · "+limpiar(imp)+" °C impulsión":""}</span>`:`<b>Indica la superficie</b><span>Los resultados se calculan al momento.</span>`;
}

function orientacionEstanciaValor(v){return String(v||"interior")}
function coefOrientacionRefrigeracion(v){return ({interior:0,norte:0,noreste:4,este:7,sureste:10,sur:8,suroeste:13,oeste:16,noroeste:7})[orientacionEstanciaValor(v)]||0}
function coefVentilacionEstancia(v){return ({baja:.92,media:1,alta:1.14})[String(v||"media")]||1}
function baseCalefaccionEstancia(v){return ({bueno:45,medio:65,bajo:90})[String(v||"medio")]||65}
function baseRefrigeracionEstancia(v){return ({bueno:35,medio:50,bajo:70})[String(v||"medio")]||50}
function solarHuecoEstancia(v){return ({interior:20,norte:35,noreste:55,este:85,sureste:105,sur:90,suroeste:120,oeste:135,noroeste:70})[orientacionEstanciaValor(v)]||20}
function estanciaTecnicaHTML(e){
  e=e||{};
  return `<article class="zx_pr_room" data-pr-room>
    <div class="zx_pr_room_head"><b>Estancia</b><button type="button" data-pr-room-del>Eliminar</button></div>
    <div class="zx_pr_grid2">
      <label>Nombre / uso<input data-pr-room-name value="${limpiar(e.nombre||"")}" placeholder="Salón, dormitorio, despacho…"></label>
      <label>Superficie <span class="zx_pr_unit">m²</span><input data-pr-room-area type="number" min="0" step="0.01" inputmode="decimal" value="${limpiar(e.superficie_m2??"")}"></label>
      <label>Altura <span class="zx_pr_unit">m</span><input data-pr-room-height type="number" min="1.8" step="0.01" inputmode="decimal" value="${limpiar(e.altura_m??2.5)}"></label>
      <label>Orientación principal<select data-pr-room-orientation>${[["interior","Interior / sin fachada"],["norte","Norte"],["noreste","Noreste"],["este","Este"],["sureste","Sureste"],["sur","Sur"],["suroeste","Suroeste"],["oeste","Oeste"],["noroeste","Noroeste"]].map(([v,n])=>`<option value="${v}" ${String(e.orientacion||"interior")===v?"selected":""}>${n}</option>`).join("")}</select></label>
      <label>Paredes al exterior <span class="zx_pr_unit">ud</span><input data-pr-room-walls type="number" min="0" max="4" step="1" inputmode="numeric" value="${limpiar(e.paredes_exteriores??1)}"></label>
      <label>Ventanas / huecos <span class="zx_pr_unit">m²</span><input data-pr-room-windows type="number" min="0" step="0.01" inputmode="decimal" value="${limpiar(e.huecos_m2??0)}"></label>
      <label>Aislamiento<select data-pr-room-insulation><option value="bueno" ${e.aislamiento==="bueno"?"selected":""}>Bueno</option><option value="medio" ${!e.aislamiento||e.aislamiento==="medio"?"selected":""}>Medio</option><option value="bajo" ${e.aislamiento==="bajo"?"selected":""}>Bajo</option></select></label>
      <label>Ventilación / infiltraciones<select data-pr-room-vent><option value="baja" ${e.ventilacion==="baja"?"selected":""}>Baja</option><option value="media" ${!e.ventilacion||e.ventilacion==="media"?"selected":""}>Media</option><option value="alta" ${e.ventilacion==="alta"?"selected":""}>Alta</option></select></label>
      <label>Ocupantes <span class="zx_pr_unit">personas</span><input data-pr-room-occupants type="number" min="0" step="1" inputmode="numeric" value="${limpiar(e.ocupantes??"")}"></label>
    </div>
    <div class="zx_pr_room_results"><span>Calefacción <b data-pr-room-heat>—</b></span><span>Refrigeración <b data-pr-room-cool>—</b></span><span>Densidad calefacción <b data-pr-room-wm2>—</b></span></div>
  </article>`;
}
function valorCampoRoom(card,sel){const el=card.querySelector(sel),s=el?String(el.value||"").trim().replace(",","."):"";if(s==="")return null;const n=Number(s);return Number.isFinite(n)?n:null}
function datosEstanciaCard(card){
  return {
    nombre:(card.querySelector("[data-pr-room-name]")?.value||"").trim(),
    superficie_m2:valorCampoRoom(card,"[data-pr-room-area]"),
    altura_m:valorCampoRoom(card,"[data-pr-room-height]"),
    orientacion:card.querySelector("[data-pr-room-orientation]")?.value||"interior",
    paredes_exteriores:valorCampoRoom(card,"[data-pr-room-walls]"),
    huecos_m2:valorCampoRoom(card,"[data-pr-room-windows]"),
    aislamiento:card.querySelector("[data-pr-room-insulation]")?.value||"medio",
    ventilacion:card.querySelector("[data-pr-room-vent]")?.value||"media",
    ocupantes:valorCampoRoom(card,"[data-pr-room-occupants]")
  };
}
function calcularEstanciaTecnica(e,teInv,tiCal,teVer,tiRef){
  const a=Number(e.superficie_m2),h=Number(e.altura_m||2.5);if(!Number.isFinite(a)||a<=0||!Number.isFinite(h)||h<=0)return {cal_kw:null,ref_kw:null,wm2:null};
  const dtCal=Number.isFinite(tiCal)&&Number.isFinite(teInv)?Math.max(1,tiCal-teInv):23;
  const dtRef=Number.isFinite(teVer)&&Number.isFinite(tiRef)?Math.max(1,teVer-tiRef):10;
  const alt=Math.max(.8,Math.min(1.6,h/2.5)),paredes=Math.max(0,Math.min(4,Number(e.paredes_exteriores)||0)),huecos=Math.max(0,Number(e.huecos_m2)||0),vent=coefVentilacionEstancia(e.ventilacion);
  const exposicion=1+paredes*.06;
  const calW=a*baseCalefaccionEstancia(e.aislamiento)*alt*(dtCal/23)*exposicion*vent+huecos*18;
  const refW=a*(baseRefrigeracionEstancia(e.aislamiento)+coefOrientacionRefrigeracion(e.orientacion))*alt*(dtRef/10)*vent+huecos*solarHuecoEstancia(e.orientacion)+(Math.max(0,Number(e.ocupantes)||0)*75);
  return {cal_kw:redondearCalc(calW/1000,2),ref_kw:redondearCalc(refW/1000,2),wm2:redondearCalc(calW/a,0)};
}
function actualizarCalculoEstancias(){
  const box=document.getElementById("pr_calc_rooms");if(!box)return;
  const teInv=numCalcSigned("pr_calc_te_inv","pr_calc_te_inv_sign"),tiCal=numCalc("pr_calc_ti_cal"),teVer=numCalcSigned("pr_calc_te_ver","pr_calc_te_ver_sign"),tiRef=numCalc("pr_calc_ti_ref");
  let cal=0,ref=0,sup=0,validas=0;
  box.querySelectorAll("[data-pr-room]").forEach(card=>{
    const e=datosEstanciaCard(card),r=calcularEstanciaTecnica(e,teInv,tiCal,teVer,tiRef);
    card.querySelector("[data-pr-room-heat]").textContent=r.cal_kw==null?"—":r.cal_kw+" kW";
    card.querySelector("[data-pr-room-cool]").textContent=r.ref_kw==null?"—":r.ref_kw+" kW";
    card.querySelector("[data-pr-room-wm2]").textContent=r.wm2==null?"—":r.wm2+" W/m²";
    if(r.cal_kw!=null){cal+=r.cal_kw;ref+=r.ref_kw||0;sup+=Number(e.superficie_m2)||0;validas++}
  });
  ponerResultadoCalc("pr_calc_cal",validas?redondearCalc(cal,2):null,true);ponerResultadoCalc("pr_calc_ref",validas?redondearCalc(ref,2):null,true);
  const supEl=document.getElementById("pr_calc_sup");if(supEl&&validas){supEl.value=redondearCalc(sup,2);supEl.dataset.prAutoRoom="1"}
  const resume=document.getElementById("pr_calc_rooms_resume");if(resume)resume.innerHTML=validas?`<b>Total por estancias</b><span>${validas} estancia(s) · ${redondearCalc(sup,2)} m² · ${redondearCalc(cal,2)} kW calefacción · ${redondearCalc(ref,2)} kW refrigeración</span>`:`<b>Añade una estancia</b><span>Los totales se calculan automáticamente con los datos de cada zona.</span>`;
}
function conectarEstanciaTecnica(card){
  if(!card)return;
  card.querySelector("[data-pr-room-del]").onclick=()=>{card.remove();actualizarCalculoEstancias()};
  card.querySelectorAll("input,select").forEach(el=>{el.oninput=actualizarCalculoEstancias;el.onchange=actualizarCalculoEstancias});
}
function agregarEstanciaTecnica(datos){
  const box=document.getElementById("pr_calc_rooms");if(!box)return;
  const wrap=document.createElement("div");wrap.innerHTML=estanciaTecnicaHTML(datos||{});const card=wrap.firstElementChild;box.appendChild(card);conectarEstanciaTecnica(card);actualizarCalculoEstancias();
}
function estanciasTecnicasFormulario(){
  const box=document.getElementById("pr_calc_rooms");if(!box)return[];
  const teInv=numCalcSigned("pr_calc_te_inv","pr_calc_te_inv_sign"),tiCal=numCalc("pr_calc_ti_cal"),teVer=numCalcSigned("pr_calc_te_ver","pr_calc_te_ver_sign"),tiRef=numCalc("pr_calc_ti_ref");
  return [...box.querySelectorAll("[data-pr-room]")].map(card=>{const e=datosEstanciaCard(card),r=calcularEstanciaTecnica(e,teInv,tiCal,teVer,tiRef);return Object.assign(e,{calefaccion_kw:r.cal_kw,refrigeracion_kw:r.ref_kw,densidad_calefaccion_w_m2:r.wm2})});
}
function aplicarModoCalculo(){
  const tipo=document.getElementById("pr_calc_tipo")?.value||"estimacion";
  const rapido=document.getElementById("pr_calc_quick"),tecnico=document.getElementById("pr_calc_technical"),otro=document.getElementById("pr_calc_other"),info=document.getElementById("pr_calc_mode_info"),tit=document.getElementById("pr_calc_results_title"),help=document.getElementById("pr_calc_results_help");
  if(rapido)rapido.hidden=tipo!=="estimacion";if(tecnico)tecnico.hidden=tipo!=="tecnico";if(otro)otro.hidden=tipo!=="otro";
  const textos={
    estimacion:["Estimación rápida automática","Indica superficie y revisa los coeficientes visibles. Los resultados se calculan al momento y son orientativos."],
    tecnico:["Cálculo técnico por estancias","Añade las estancias y sus condiciones. Zentryx calcula una estimación técnica orientativa por zona y el total del inmueble."],
    manual:["Resultados manuales","Escribe directamente los resultados que ya conoces. La superficie es opcional y sirve como referencia."],
    otro:["Otro método","Indica el método utilizado y escribe sus resultados. La superficie es opcional."]
  };
  const tx=textos[tipo]||textos.manual;if(info){info.querySelector("b").textContent=tx[0];info.querySelector("span").textContent=tx[1]}
  if(tit)tit.textContent=tipo==="estimacion"?"Resultados automáticos":"Resultados";
  const autoRapido=tipo==="estimacion",autoEstancias=tipo==="tecnico";
  ["pr_calc_cal","pr_calc_ref"].forEach(id=>{const el=document.getElementById(id);if(el){el.readOnly=autoRapido||autoEstancias;el.classList.toggle("zx_pr_calc_readonly",autoRapido||autoEstancias)}});
  ["pr_calc_acs","pr_calc_imp"].forEach(id=>{const el=document.getElementById(id);if(el){el.readOnly=autoRapido;el.classList.toggle("zx_pr_calc_readonly",autoRapido)}});
  if(help)help.textContent=autoRapido?"Se actualizan al cambiar superficie, coeficientes, ocupantes o impulsión.":autoEstancias?"Calefacción y refrigeración se calculan por estancias. ACS e impulsión pueden indicarse manualmente.":"Introduce los valores que quieras guardar en esta versión.";
  if(autoRapido)actualizarEstimacionRapida();else if(autoEstancias){limpiarResultadosAuto();actualizarCalculoEstancias()}else limpiarResultadosAuto();
}
function formularioCalculo(p){
  const meta=p.inmueble_meta||{};
  const siguiente=CALCULOS.reduce((m,x)=>Math.max(m,Number(x.version)||0),0)+1;
  const impSugerida=impulsionRapidaSugerida(p);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_calc_back" type="button">← Volver</button><button id="pr_calc_save" class="primary" type="button">Guardar cálculo</button></div>
    <div class="zx_pr_form_head"><span>NUEVO CÁLCULO · VERSIÓN ${siguiente}</span><h2>Registrar cálculo térmico</h2></div>
    <div class="zx_pr_info"><b>Se guardará como una versión nueva.</b><span>Los cálculos anteriores no se modifican.</span></div>
    <label>Tipo de cálculo<select id="pr_calc_tipo"><option value="estimacion">Estimación rápida</option><option value="tecnico">Cálculo técnico</option><option value="manual">Cálculo manual</option><option value="otro">Otro</option></select></label>
    <div id="pr_calc_mode_info" class="zx_pr_info zx_pr_calc_mode_info"><b>Estimación rápida automática</b><span>Indica superficie y revisa los coeficientes visibles. Los resultados se calculan al momento y son orientativos.</span></div>
    <div class="zx_pr_section"><h3>Datos utilizados</h3>
      <label>Superficie utilizada <span class="zx_pr_unit">m²</span><input id="pr_calc_sup" type="number" min="0" step="0.01" inputmode="decimal" value="${meta.superficie_calefactada_m2!=null?limpiar(meta.superficie_calefactada_m2):""}"></label>
      <div id="pr_calc_quick" class="zx_pr_calc_mode">
        <label>Aislamiento aproximado<select id="pr_calc_nivel"><option value="bueno">Bueno · 50 / 45 W/m²</option><option value="medio" selected>Medio · 80 / 70 W/m²</option><option value="bajo">Bajo · 110 / 90 W/m²</option><option value="personalizado">Personalizado</option></select></label>
        <div class="zx_pr_grid2"><label>Coeficiente calefacción <span class="zx_pr_unit">W/m²</span><input id="pr_calc_w_cal" type="number" min="0" step="1" inputmode="decimal" value="80"></label><label>Coeficiente refrigeración <span class="zx_pr_unit">W/m²</span><input id="pr_calc_w_ref" type="number" min="0" step="1" inputmode="decimal" value="70"></label></div>
        <div class="zx_pr_grid2"><label>Ocupantes <span class="zx_pr_unit">personas</span><input id="pr_calc_ocup" type="number" min="0" step="1" inputmode="numeric" value="${meta.ocupantes!=null?limpiar(meta.ocupantes):""}"></label><label>Volumen ACS por persona <span class="zx_pr_unit">L/persona</span><input id="pr_calc_acs_persona" type="number" min="0" step="1" inputmode="numeric" value="50"></label></div>
        <label>Impulsión orientativa <span class="zx_pr_unit">°C</span><input id="pr_calc_imp_quick" type="number" step="0.1" inputmode="decimal" value="${impSugerida!=null?limpiar(impSugerida):""}" placeholder="Opcional"></label>
        <div id="pr_calc_quick_resume" class="zx_pr_calc_quick_resume"><b>Indica la superficie</b><span>Los resultados se calculan al momento.</span></div>
      </div>
      <div id="pr_calc_technical" class="zx_pr_calc_mode" hidden>
        <div class="zx_pr_grid2"><label>Exterior invierno <span class="zx_pr_unit">°C</span><div class="zx_pr_signed"><button id="pr_calc_te_inv_sign" type="button" class="zx_pr_sign" data-sign="-1" aria-label="Cambiar signo de temperatura">−</button><input id="pr_calc_te_inv" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Ej. 2"></div></label><label>Interior calefacción <span class="zx_pr_unit">°C</span><input id="pr_calc_ti_cal" type="number" step="0.1" inputmode="decimal" value="21"></label></div>
        <div class="zx_pr_grid2"><label>Exterior verano <span class="zx_pr_unit">°C</span><div class="zx_pr_signed"><button id="pr_calc_te_ver_sign" type="button" class="zx_pr_sign" data-sign="1" aria-label="Cambiar signo de temperatura">+</button><input id="pr_calc_te_ver" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Ej. 35"></div></label><label>Interior refrigeración <span class="zx_pr_unit">°C</span><input id="pr_calc_ti_ref" type="number" step="0.1" inputmode="decimal" value="25"></label></div>
        <div class="zx_pr_calc_room_intro"><b>Cálculo por estancias</b><span>Estimación técnica interna para comparar zonas y dimensionamiento preliminar. No sustituye un cálculo reglamentario o una herramienta de ingeniería cuando sea exigible.</span></div>
        <button id="pr_calc_room_add" class="zx_pr_secondary_full" type="button">＋ Añadir estancia</button>
        <div id="pr_calc_rooms" class="zx_pr_rooms"></div>
        <div id="pr_calc_rooms_resume" class="zx_pr_calc_quick_resume"><b>Añade una estancia</b><span>Los totales se calculan automáticamente con los datos de cada zona.</span></div>
      </div>
      <div id="pr_calc_other" class="zx_pr_calc_mode" hidden><label>Método utilizado<input id="pr_calc_metodo" value="" placeholder="Nombre del método o programa"></label></div>
    </div>
    <div class="zx_pr_section zx_pr_calc_results"><h3 id="pr_calc_results_title">Resultados automáticos</h3><div id="pr_calc_results_help" class="zx_pr_calc_help">Se actualizan al cambiar superficie, coeficientes, ocupantes o impulsión.</div>
      <div class="zx_pr_grid2"><label>Carga de calefacción <span class="zx_pr_unit">kW</span><input id="pr_calc_cal" type="number" min="0" step="0.01" inputmode="decimal"></label><label>Carga de refrigeración <span class="zx_pr_unit">kW</span><input id="pr_calc_ref" type="number" min="0" step="0.01" inputmode="decimal"></label></div>
      <div class="zx_pr_grid2"><label>ACS recomendado <span class="zx_pr_unit">L</span><input id="pr_calc_acs" type="number" min="0" step="1" inputmode="numeric"></label><label>Impulsión recomendada <span class="zx_pr_unit">°C</span><input id="pr_calc_imp" type="number" step="0.1" inputmode="decimal"></label></div>
    </div>
    <label>Observaciones<textarea id="pr_calc_obs" rows="5" placeholder="Método utilizado, hipótesis, limitaciones, datos pendientes…"></textarea></label>`);
  m.querySelector("#pr_calc_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  m.querySelector("#pr_calc_save").onclick=()=>guardarCalculo(p,siguiente);
  ["pr_calc_te_inv_sign","pr_calc_te_ver_sign"].forEach(id=>{const b=m.querySelector("#"+id);if(b)b.onclick=()=>{const neg=b.dataset.sign!=="-1";b.dataset.sign=neg?"-1":"1";b.textContent=neg?"−":"+";if(m.querySelector("#pr_calc_tipo").value==="tecnico")actualizarCalculoEstancias()}});
  ["pr_calc_te_inv","pr_calc_ti_cal","pr_calc_te_ver","pr_calc_ti_ref"].forEach(id=>{const el=m.querySelector("#"+id);if(el)el.oninput=()=>{if(m.querySelector("#pr_calc_tipo").value==="tecnico")actualizarCalculoEstancias()}});
  const addRoom=m.querySelector("#pr_calc_room_add");if(addRoom)addRoom.onclick=()=>agregarEstanciaTecnica({});
  const tipo=m.querySelector("#pr_calc_tipo");tipo.onchange=aplicarModoCalculo;
  const nivel=m.querySelector("#pr_calc_nivel");if(nivel)nivel.onchange=aplicarNivelEstimacionRapida;
  ["pr_calc_sup","pr_calc_ocup","pr_calc_acs_persona","pr_calc_imp_quick"].forEach(id=>{const el=m.querySelector("#"+id);if(el)el.oninput=()=>{if(tipo.value==="estimacion")actualizarEstimacionRapida()}});
  ["pr_calc_w_cal","pr_calc_w_ref"].forEach(id=>{const el=m.querySelector("#"+id);if(el)el.oninput=()=>{if(nivel)nivel.value="personalizado";if(tipo.value==="estimacion")actualizarEstimacionRapida()}});
  ["pr_calc_cal","pr_calc_ref","pr_calc_acs","pr_calc_imp"].forEach(id=>{const el=m.querySelector("#"+id);if(el)el.oninput=()=>{if(tipo.value!=="estimacion")delete el.dataset.prAuto}});
  aplicarModoCalculo();
}
function numCalc(id){const el=document.getElementById(id),v=el?String(el.value||"").trim().replace(",","."):"";if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
function numCalcSigned(id,signId){const n=numCalc(id);if(n==null)return null;const b=document.getElementById(signId);return b&&b.dataset.sign==="-1"?-Math.abs(n):Math.abs(n)}
async function guardarCalculo(p,version){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el cálculo.");return}
  const u=sesion(),tipo=document.getElementById("pr_calc_tipo").value;
  if(tipo==="estimacion"){
    actualizarEstimacionRapida();
    const sup=numCalc("pr_calc_sup");if(sup==null||sup<=0){alert("Indica una superficie mayor que 0 m² para crear la estimación rápida.");return}
  }
  const entrada={superficie_m2:numCalc("pr_calc_sup")};
  if(tipo==="estimacion"){
    entrada.nivel_aislamiento=document.getElementById("pr_calc_nivel").value||"personalizado";entrada.coef_calefaccion_w_m2=numCalc("pr_calc_w_cal");entrada.coef_refrigeracion_w_m2=numCalc("pr_calc_w_ref");entrada.ocupantes=numCalc("pr_calc_ocup");entrada.acs_l_persona=numCalc("pr_calc_acs_persona");entrada.impulsion_orientativa_c=numCalc("pr_calc_imp_quick");entrada.formula="superficie_m2 × coeficiente_W_m2 / 1000";
  }else if(tipo==="tecnico"){
    const estancias=estanciasTecnicasFormulario().filter(e=>e.superficie_m2!=null&&e.superficie_m2>0);
    if(!estancias.length){alert("Añade al menos una estancia con superficie mayor que 0 m².");return}
    if(estancias.some(e=>!e.nombre)){alert("Escribe el nombre o uso de todas las estancias.");return}
    entrada.temp_ext_invierno_c=numCalcSigned("pr_calc_te_inv","pr_calc_te_inv_sign");entrada.temp_int_calefaccion_c=numCalc("pr_calc_ti_cal");entrada.temp_ext_verano_c=numCalcSigned("pr_calc_te_ver","pr_calc_te_ver_sign");entrada.temp_int_refrigeracion_c=numCalc("pr_calc_ti_ref");entrada.estancias=estancias;entrada.superficie_m2=redondearCalc(estancias.reduce((s,e)=>s+(Number(e.superficie_m2)||0),0),2);entrada.metodo="Zentryx · cálculo orientativo por estancias";
  }else if(tipo==="otro")entrada.metodo_nombre=document.getElementById("pr_calc_metodo").value.trim()||null;
  const resultado={creado_por_nombre:u.nombre||u.usuario||""};if(tipo==="estimacion"){resultado.automatico=true;resultado.formula_version=1}if(tipo==="tecnico"){resultado.automatico=true;resultado.por_estancias=true;resultado.formula_version_estancias=1}
  const payload={proyecto_id:p.id,version,tipo_calculo:tipo,calefaccion_kw:numCalc("pr_calc_cal"),refrigeracion_kw:numCalc("pr_calc_ref"),acs_litros:numCalc("pr_calc_acs"),temperatura_impulsion_c:numCalc("pr_calc_imp"),entrada_meta:entrada,resultado_meta:resultado,observaciones:document.getElementById("pr_calc_obs").value.trim()||null,creado_por:u.id||u.usuario||null};
  const btn=document.getElementById("pr_calc_save");btn.disabled=true;btn.textContent="Guardando…";
  try{
    const r=await sb().from("proyectos_calculos").insert([payload]).select("*").single();if(r.error)throw r.error;
    try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"calculo",accion:"creado",resumen:"Cálculo térmico guardado · versión "+version+" · "+textoTipoCalculo(payload.tipo_calculo),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{calculo_id:r.data.id,version,tipo_calculo:payload.tipo_calculo}}])}catch(e){}
    cerrarModal();await abrirFicha(p.id);
  }catch(e){alert("No se pudo guardar el cálculo.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar cálculo"}
}
function conectarCalculos(p){const n=document.getElementById("pr_calc_nuevo");if(n)n.onclick=()=>formularioCalculo(p)}

function propuestasEstrategiaHTML(){
  if(!PROPUESTAS.length)return `<div class="zx_pr_empty">Todavía no hay opciones técnicas creadas.</div>`;
  return PROPUESTAS.map((op,i)=>{
    const rs=reglasPropuesta(op),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id)),est=estadoPropuesta(op);
    return `<div class="zx_pr_strategy_card">
      <div class="zx_pr_gen_top"><div><b>${limpiar(op.nombre)}</b><span>${calc?"Cálculo de referencia · Versión "+limpiar(calc.version):"Sin cálculo de referencia"}</span></div><div class="zx_pr_strategy_actions">${puedeEditar()?`${!propuestaBloqueada(op)?`<button type="button" data-pr-option-edit="${limpiar(op.id)}">Editar opción</button>`:""}<button type="button" data-pr-strategy-open="${limpiar(op.id)}">Estrategia</button><button type="button" data-pr-budget-open="${limpiar(op.id)}">Partidas</button><button type="button" data-pr-quote-open="${limpiar(op.id)}">Presupuesto</button>`:""}</div></div>
      ${op.descripcion?`<p>${limpiar(op.descripcion)}</p>`:""}
      <div class="zx_pr_strategy_count">${limpiar(textoEstadoPropuesta(est))} · ${rs.length} regla(s) de funcionamiento · Total cliente ${eur(op.total_cliente||0)}</div>
      ${rs.slice(0,3).map((r,n)=>`<div class="zx_pr_rule_resume"><b>${n+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))} · ${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}${r.condicion_tipo==="fallo_generador"&&r.generador_referencia_id?" · si falla "+limpiar(nombreGeneradorRelacionadoRegla(r)):""}</span></div>`).join("")}
      ${rs.length>3?`<div class="zx_pr_calc_by">+ ${rs.length-3} regla(s) más</div>`:""}
    </div>`;
  }).join("");
}
function opcionesCalculo(sel){return `<option value="">Sin cálculo asociado</option>`+CALCULOS.map(c=>`<option value="${limpiar(c.id)}" ${String(sel)===String(c.id)?"selected":""}>Versión ${limpiar(c.version)} · ${limpiar(textoTipoCalculo(c.tipo_calculo))}</option>`).join("")}
function formularioEditarOpcionTecnica(p,op){
  if(!op||propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_op_edit_back" type="button">← Volver</button><button id="pr_op_edit_save" class="primary" type="button">Guardar cambios</button></div>
    <div class="zx_pr_form_head"><span>EDITAR OPCIÓN TÉCNICA</span><h2>${limpiar(op.nombre)}</h2></div>
    <div class="zx_pr_info"><b>Puedes actualizar la referencia del estudio mientras la opción siga editable.</b><span>Las partidas, reglas y presupuesto de esta opción no se borran al cambiar el cálculo de referencia.</span></div>
    <label>Nombre de la opción<input id="pr_op_edit_nombre" value="${limpiar(op.nombre||"")}"></label>
    <label>Cálculo de referencia<select id="pr_op_edit_calc">${opcionesCalculo(op.calculo_id)}</select></label>
    <label>Descripción<textarea id="pr_op_edit_desc" rows="4" placeholder="Descripción de la solución propuesta">${limpiar(op.descripcion||"")}</textarea></label>`);
  m.querySelector("#pr_op_edit_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  m.querySelector("#pr_op_edit_save").onclick=()=>guardarEdicionOpcionTecnica(p,op);
}
async function guardarEdicionOpcionTecnica(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar los cambios.");return}
  if(!op||propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  const nombre=(document.getElementById("pr_op_edit_nombre")?.value||"").trim();
  if(!nombre){alert("Escribe un nombre para la opción.");return}
  const calculo_id=document.getElementById("pr_op_edit_calc")?.value||null;
  const descripcion=(document.getElementById("pr_op_edit_desc")?.value||"").trim()||null;
  const btn=document.getElementById("pr_op_edit_save");
  btn.disabled=true;btn.textContent="Guardando…";
  try{
    const q=await sb().from("proyectos_propuestas").update({nombre,calculo_id,descripcion}).eq("id",op.id).select("*").single();
    if(q.error)throw q.error;
    const u=sesion();
    try{
      await sb().from("proyectos_historial").insert([{
        proyecto_id:p.id,
        tipo:"propuesta",
        accion:"editada",
        resumen:"Opción técnica editada: "+nombre,
        usuario_id:u.id||null,
        usuario:u.nombre||u.usuario||"",
        datos:{
          propuesta_id:op.id,
          nombre_anterior:op.nombre||"",
          nombre_nuevo:nombre,
          calculo_id_anterior:op.calculo_id||null,
          calculo_id_nuevo:calculo_id||null
        }
      }])
    }catch(e){}
    cerrarModal();
    await abrirFicha(p.id);
  }catch(e){
    alert("No se pudieron guardar los cambios.\n"+(e&&e.message?e.message:""));
    btn.disabled=false;btn.textContent="Guardar cambios";
  }
}
function formularioOpcionTecnica(p){
  const letra=String.fromCharCode(65+Math.min(PROPUESTAS.length,25));
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_op_back" type="button">← Volver</button><button id="pr_op_save" class="primary" type="button">Guardar opción</button></div>
    <div class="zx_pr_form_head"><span>NUEVA OPCIÓN TÉCNICA</span><h2>Preparar estrategia</h2></div>
    <div class="zx_pr_info"><b>Cada opción tiene su propia estrategia.</b><span>Así puedes comparar soluciones distintas sin cambiar el estudio ni las demás opciones.</span></div>
    <label>Nombre de la opción<input id="pr_op_nombre" value="Opción ${letra}"></label>
    <label>Cálculo de referencia<select id="pr_op_calc">${opcionesCalculo(CALCULOS[0]&&CALCULOS[0].id)}</select></label>
    <label>Descripción<textarea id="pr_op_desc" rows="4" placeholder="Ej. Aerotermia principal + gasóleo de reserva"></textarea></label>`);
  m.querySelector("#pr_op_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  m.querySelector("#pr_op_save").onclick=()=>guardarOpcionTecnica(p);
}
async function guardarOpcionTecnica(p){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar la opción técnica.");return}
  const nombre=document.getElementById("pr_op_nombre").value.trim();if(!nombre){alert("Escribe un nombre para la opción.");return}
  const versiones=PROPUESTAS.filter(x=>normalizar(x.nombre)===normalizar(nombre)).map(x=>Number(x.version)||0),version=(versiones.length?Math.max(...versiones):0)+1;
  const payload={proyecto_id:p.id,calculo_id:document.getElementById("pr_op_calc").value||null,nombre,version,estado:"borrador",descripcion:document.getElementById("pr_op_desc").value.trim()||null,estrategia_meta:[],control_meta:{},hidraulica_meta:{}};
  const btn=document.getElementById("pr_op_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const r=await sb().from("proyectos_propuestas").insert([payload]).select("*").single();if(r.error)throw r.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"propuesta",accion:"creada",resumen:"Opción técnica creada: "+nombre,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:r.data.id,nombre,version}}])}catch(e){}cerrarModal();await abrirFicha(p.id);setTimeout(()=>abrirEstrategia(p,r.data.id),0)}catch(e){alert("No se pudo guardar la opción técnica.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar opción"}
}
function detalleReglaHTML(r){
  const partes=[];
  if(r.condicion_tipo==="fallo_generador"&&r.generador_referencia_id)partes.push("Si falla: "+nombreGeneradorRelacionadoRegla(r));
  if(r.notas)partes.push(r.notas);
  return partes.length?`<div class="zx_pr_rule_detail">${partes.map(x=>`<span>${limpiar(x)}</span>`).join("")}</div>`:"";
}
function reglasHTML(op){const rs=reglasPropuesta(op),bloqueada=propuestaBloqueada(op);if(!rs.length)return `<div class="zx_pr_empty">Todavía no hay reglas definidas.</div>`;return rs.map((r,i)=>`<div class="zx_pr_rule_card"><div><b>${i+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))}</span></div><p>${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}</p>${detalleReglaHTML(r)}${!bloqueada?`<div class="zx_pr_rule_actions"><button type="button" data-pr-rule-edit="${limpiar(r.id)}">Editar</button><button type="button" data-pr-rule-del="${limpiar(r.id)}">Eliminar</button></div>`:`<div class="zx_pr_calc_by">${propuestaSustituida(op)?"Opción sustituida":"Opción aceptada"} · regla bloqueada</div>`}</div>`).join("")}
function resumenCalculoReferenciaHTML(op){
  const c=CALCULOS.find(x=>String(x.id)===String(op&&op.calculo_id));
  if(!c)return `<div class="zx_pr_info"><b>Sin cálculo de referencia</b><span>Puedes asociarlo desde Editar opción.</span></div>`;
  const partes=[];
  if(c.superficie_m2!=null)partes.push(limpiar(c.superficie_m2)+" m²");
  if(c.calefaccion_kw!=null)partes.push(limpiar(c.calefaccion_kw)+" kW calefacción");
  if(c.refrigeracion_kw!=null)partes.push(limpiar(c.refrigeracion_kw)+" kW refrigeración");
  if(c.acs_litros!=null)partes.push(limpiar(c.acs_litros)+" L ACS");
  if(c.temperatura_impulsion_c!=null)partes.push(limpiar(c.temperatura_impulsion_c)+" °C impulsión");
  return `<div class="zx_pr_info"><b>Cálculo de referencia · Versión ${limpiar(c.version)} · ${limpiar(textoTipoCalculo(c.tipo_calculo))}</b><span>${partes.length?partes.join(" · "):"Cálculo asociado sin resultados principales registrados."}</span></div>`;
}
function abrirEstrategia(p,opId){
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const bloqueada=propuestaBloqueada(op),sustituida=propuestaSustituida(op);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_st_back" type="button">← Volver</button>${bloqueada?`<button type="button" disabled>${sustituida?"Opción sustituida":"Opción aceptada"}</button>`:`<button id="pr_st_add" class="primary" type="button">＋ Añadir regla</button>`}</div><div class="zx_pr_form_head"><span>ESTRATEGIA HÍBRIDA</span><h2>${limpiar(op.nombre)}</h2></div>${resumenCalculoReferenciaHTML(op)}<div class="zx_pr_info"><b>Ordena cómo debe trabajar cada generador.</b><span>${bloqueada?(sustituida?"Esta versión fue aceptada anteriormente y ha sido sustituida. Sus reglas quedan bloqueadas.":"Esta opción está aceptada y sus reglas quedan bloqueadas."):"Las reglas describen la lógica prevista. El técnico debe comprobar que la hidráulica, el control y los equipos permiten ese funcionamiento."}</span></div><div class="zx_pr_rules">${reglasHTML(op)}</div>`);
  m.querySelector("#pr_st_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};const add=m.querySelector("#pr_st_add");if(add)add.onclick=()=>formularioRegla(p,op,null);
  m.querySelectorAll("[data-pr-rule-edit]").forEach(b=>b.onclick=()=>formularioRegla(p,op,reglasPropuesta(op).find(r=>String(r.id)===String(b.dataset.prRuleEdit))));
  m.querySelectorAll("[data-pr-rule-del]").forEach(b=>b.onclick=()=>eliminarRegla(p,op,b.dataset.prRuleDel));
}
function generadorValidoParaEstrategia(g){
  if(!g)return false;
  if(!(g.existente===false||g.se_mantiene!==false))return false;
  const meta=g.tecnico_meta&&typeof g.tecnico_meta==="object"&&!Array.isArray(g.tecnico_meta)?g.tecnico_meta:{};
  if(meta.material_catalogo_id){
    const snap=meta.catalogo_snapshot&&meta.catalogo_snapshot.tecnico_meta&&typeof meta.catalogo_snapshot.tecnico_meta==="object"
      ?meta.catalogo_snapshot.tecnico_meta:null;
    if(snap)return categoriaTecnicaMaterial(snap)==="generador";
    const mat=MATERIALES.find(m=>String(m.id)===String(meta.material_catalogo_id));
    if(mat)return materialGeneradorActivo(mat);
  }
  return true;
}
function generadoresValidosEstrategia(){return GENERADORES.filter(generadorValidoParaEstrategia)}
function opcionesGeneradores(sel){
  const xs=generadoresValidosEstrategia();
  const actual=sel?GENERADORES.find(g=>String(g.id)===String(sel)):null;
  let html=`<option value="">${xs.length?"Selecciona generador":"No hay generadores térmicos disponibles"}</option>`;
  if(actual&&!xs.some(g=>String(g.id)===String(actual.id))){
    html+=`<option value="${limpiar(actual.id)}" selected disabled>${limpiar(nombreGeneradorId(actual.id))} · no válido para nuevas reglas</option>`;
  }
  return html+xs.map(g=>`<option value="${limpiar(g.id)}" ${String(sel)===String(g.id)?"selected":""}>${limpiar(nombreGeneradorId(g.id))}</option>`).join("");
}
function unidadCondicion(tipo){return ({temp_ext_menor:"°C",temp_ext_mayor:"°C",demanda_mayor:"kW",deposito_menor:"°C",excedente_fv_mayor:"kW",coste_energia:"€/kWh",horario:"h"})[tipo]||""}
function condicionTemperatura(tipo){return ["temp_ext_menor","temp_ext_mayor","deposito_menor"].includes(tipo)}
function magnitudValorRegla(r){
  if(!r||r.valor==null||r.valor==="")return "";
  const s=String(r.valor).trim();
  return condicionTemperatura(r.condicion_tipo)?s.replace(/^[-+]/,""):s;
}
function signoValorRegla(r){
  if(!r||r.valor==null||r.valor==="")return r&&r.condicion_tipo==="temp_ext_menor"?"-1":"1";
  const n=Number(String(r.valor).trim().replace(",","."));
  return Number.isFinite(n)&&n<0?"-1":"1";
}
function formularioRegla(p,op,r){
  if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  r=r||{};const nueva=!r.id;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_rule_back" type="button">← Volver</button><button id="pr_rule_save" class="primary" type="button">Guardar regla</button></div><div class="zx_pr_form_head"><span>${nueva?"NUEVA REGLA":"EDITAR REGLA"}</span><h2>Funcionamiento híbrido</h2></div>
    <label>Generador<select id="pr_rule_gen">${opcionesGeneradores(r.generador_id)}</select></label>
    <div id="pr_rule_gen_info" class="zx_pr_rule_gen_info"></div>
    <div class="zx_pr_grid2"><label>Servicio<select id="pr_rule_serv">${[["calefaccion","Calefacción"],["acs","ACS"],["refrigeracion","Refrigeración"],["piscina","Piscina"],["todos","Todos los servicios"]].map(([v,t])=>`<option value="${v}" ${r.servicio===v?"selected":""}>${t}</option>`).join("")}</select></label><label>Prioridad <span class="zx_pr_unit">orden</span><input id="pr_rule_prio" type="number" min="1" step="1" inputmode="numeric" value="${r.prioridad||reglasPropuesta(op).length+1}"></label></div>
    <label>Acción<select id="pr_rule_acc">${[["usar","Usar"],["priorizar","Priorizar"],["apoyo","Entrar como apoyo"],["simultaneo","Trabajar simultáneamente"],["reserva","Entrar como reserva"],["activar","Activar"],["bloquear","Bloquear"]].map(([v,t])=>`<option value="${v}" ${r.accion===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <label>Condición<select id="pr_rule_cond">${[["siempre","Siempre"],["manual","Orden manual"],["fallo_generador","Fallo de otro generador"],["temp_ext_menor","Temperatura exterior menor que"],["temp_ext_mayor","Temperatura exterior mayor que"],["demanda_mayor","Demanda mayor que"],["deposito_menor","Temperatura de depósito menor que"],["excedente_fv_mayor","Excedente fotovoltaico mayor que"],["coste_energia","Coste de energía"],["horario","Horario"]].map(([v,t])=>`<option value="${v}" ${r.condicion_tipo===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <div id="pr_rule_value_wrap" class="zx_pr_grid2"><label>Valor <span id="pr_rule_unit" class="zx_pr_unit"></span><div id="pr_rule_signed" class="zx_pr_signed"><button id="pr_rule_sign" type="button" class="zx_pr_sign" data-sign="${signoValorRegla(r)}" aria-label="Cambiar signo">${signoValorRegla(r)==="-1"?"−":"+"}</button><input id="pr_rule_val" type="text" inputmode="decimal" value="${limpiar(magnitudValorRegla(r))}"></div></label><label id="pr_rule_ref_wrap">Generador relacionado<select id="pr_rule_ref">${opcionesGeneradores(r.generador_referencia_id)}</select></label></div>
    <label>Notas<textarea id="pr_rule_notes" rows="4" placeholder="Explicación o condición adicional…">${limpiar(r.notas||"")}</textarea></label>`);
  const cond=m.querySelector("#pr_rule_cond"),wrap=m.querySelector("#pr_rule_value_wrap"),unit=m.querySelector("#pr_rule_unit"),ref=m.querySelector("#pr_rule_ref_wrap"),genSel=m.querySelector("#pr_rule_gen"),genInfo=m.querySelector("#pr_rule_gen_info"),signed=m.querySelector("#pr_rule_signed"),signBtn=m.querySelector("#pr_rule_sign"),valInput=m.querySelector("#pr_rule_val");
  const syncGen=()=>{const id=genSel.value,hay=generadoresValidosEstrategia().length>0;genInfo.textContent=id?"Seleccionado · "+nombreGeneradorId(id):(hay?"Selecciona un generador":"No hay generadores térmicos válidos en este proyecto.");genInfo.classList.toggle("is-empty",!id)};genSel.onchange=syncGen;syncGen();
  const sync=()=>{const t=cond.value,u=unidadCondicion(t),needsVal=!!u,needsRef=t==="fallo_generador",isTemp=condicionTemperatura(t);unit.textContent=u;wrap.style.display=(needsVal||needsRef)?"grid":"none";valInput.closest("label").style.display=needsVal?"grid":"none";ref.style.display=needsRef?"grid":"none";signed.style.gridTemplateColumns=isTemp?"54px minmax(0,1fr)":"1fr";signBtn.style.display=isTemp?"":"none";if(isTemp&&valInput.value===""&&t==="temp_ext_menor"){signBtn.dataset.sign="-1";signBtn.textContent="−"}};
  signBtn.onclick=()=>{const neg=signBtn.dataset.sign!=="-1";signBtn.dataset.sign=neg?"-1":"1";signBtn.textContent=neg?"−":"+"};
  cond.onchange=sync;sync();
  m.querySelector("#pr_rule_back").onclick=()=>abrirEstrategia(p,op.id);m.querySelector("#pr_rule_save").onclick=()=>guardarRegla(p,op,r);
}
async function guardarRegla(p,op,r){
  if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  const gen=document.getElementById("pr_rule_gen").value;if(!gen){alert("Selecciona un generador.");return}
  const cond=document.getElementById("pr_rule_cond").value,unidad=unidadCondicion(cond),valorBase=document.getElementById("pr_rule_val").value.trim();
  let valor=valorBase;
  if(unidad&&valorBase!==""&&condicionTemperatura(cond)){
    const limpio=valorBase.replace(/^[-+]/,"");
    const neg=document.getElementById("pr_rule_sign").dataset.sign==="-1";
    valor=(neg?"-":"")+limpio;
  }
  const regla={id:r.id||uidRegla(),generador_id:gen,servicio:document.getElementById("pr_rule_serv").value,prioridad:Number(document.getElementById("pr_rule_prio").value)||1,accion:document.getElementById("pr_rule_acc").value,condicion_tipo:cond,valor:unidad&&valor!==""?valor:null,unidad:unidad||null,generador_referencia_id:cond==="fallo_generador"?(document.getElementById("pr_rule_ref").value||null):null,notas:document.getElementById("pr_rule_notes").value.trim()||null};
  const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(regla.id));rs.push(regla);rs.sort((a,b)=>(Number(a.prioridad)||99)-(Number(b.prioridad)||99));
  const btn=document.getElementById("pr_rule_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:r.id?"editada":"creada",resumen:(r.id?"Regla híbrida modificada: ":"Regla híbrida añadida: ")+nombreGeneradorId(gen),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:regla.id,generador_id:gen,condicion:cond,accion:regla.accion}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo guardar la regla.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar regla"}
}
async function eliminarRegla(p,op,id){if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}if(!confirm("¿Eliminar esta regla de funcionamiento?"))return;const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(id));try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:"eliminada",resumen:"Regla híbrida eliminada",usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:id}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo eliminar la regla.\n"+(e&&e.message?e.message:""))}}

function partidasHTML(op,xs){
  if(!xs.length)return `<div class="zx_pr_empty">Todavía no hay partidas añadidas.</div>`;
  return xs.map((x,i)=>{const q=numValor(x.cantidad),cu=numValor(x.coste_unitario),pu=numValor(x.precio_unitario),iva=numValor(x.iva),coste=x.coste_neto!=null?numValor(x.coste_neto):q*cu*(1-numValor(x.descuento)/100),venta=q*pu,total=venta*(1+iva/100),margen=venta-coste;
    return `<div class="zx_pr_part_card">
      <div class="zx_pr_gen_top"><div><b>${i+1}. ${limpiar(x.descripcion)}</b><span>${limpiar(textoTipoPartida(x.tipo))}${x.grupo?" · "+limpiar(x.grupo):""}</span></div>${puedeEditar()&&!propuestaBloqueada(op)?`<button type="button" data-pr-part-edit="${limpiar(x.id)}">Editar</button>`:""}</div>
      <div class="zx_pr_gen_grid"><div><span>Cantidad</span><b>${limpiar(x.cantidad)} ${limpiar(x.unidad||"ud")}</b></div><div><span>Coste unitario</span><b>${eur(cu)}/${limpiar(x.unidad||"ud")}</b></div><div><span>Venta unitaria</span><b>${eur(pu)}/${limpiar(x.unidad||"ud")}</b></div><div><span>Descuento proveedor</span><b>${limpiar(numValor(x.descuento))} %</b></div><div><span>IVA</span><b>${limpiar(iva)} %</b></div><div><span>Coste</span><b>${eur(coste)}</b></div><div><span>Venta</span><b>${eur(venta)}</b></div><div><span>Margen</span><b>${eur(margen)}</b></div><div><span>Total cliente</span><b>${eur(total)}</b></div></div>
      ${x.referencia?`<p>Referencia: ${limpiar(x.referencia)}</p>`:""}
      ${puedeEditar()&&!propuestaBloqueada(op)?`<div class="zx_pr_rule_actions"><button type="button" data-pr-part-del="${limpiar(x.id)}">Eliminar</button></div>`:""}
    </div>`;
  }).join("");
}
async function abrirPartidas(p,opId){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para consultar las partidas.");return}
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),bloqueada=propuestaBloqueada(op),sustituida=propuestaSustituida(op);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_budget_back" type="button">← Volver</button>${puedeEditar()&&!bloqueada?`<button id="pr_budget_add" class="primary" type="button">＋ Añadir partida</button>`:`<button type="button" disabled>${sustituida?"Opción sustituida":"Opción aceptada"}</button>`}</div>
    <div class="zx_pr_form_head"><span>PARTIDAS Y PRECIOS</span><h2>${limpiar(op.nombre)}</h2></div>
    <div class="zx_pr_info"><b>Los precios quedan guardados en esta opción.</b><span>Los cambios posteriores del catálogo no modifican las partidas ya registradas.</span></div>
    <div class="zx_pr_budget_totals"><div><span>Coste</span><b>${eur(t.coste)}</b></div><div><span>Venta sin IVA</span><b>${eur(t.venta)}</b></div><div><span>Margen</span><b>${eur(t.margen)}</b></div><div><span>Total cliente</span><b>${eur(t.total)}</b></div></div>
    <div class="zx_pr_parts">${partidasHTML(op,xs)}</div>`);
  m.querySelector("#pr_budget_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const add=m.querySelector("#pr_budget_add");if(add)add.onclick=()=>formularioPartida(p,op,null,xs);
  m.querySelectorAll("[data-pr-part-edit]").forEach(b=>b.onclick=()=>formularioPartida(p,op,xs.find(x=>String(x.id)===String(b.dataset.prPartEdit)),xs));
  m.querySelectorAll("[data-pr-part-del]").forEach(b=>b.onclick=()=>eliminarPartida(p,op,b.dataset.prPartDel));
}
function formularioPartida(p,op,x,xs){
  if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  x=x||{};const nueva=!x.id,unidad=x.unidad||"ud";
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_part_back" type="button">← Volver</button><button id="pr_part_save" class="primary" type="button">Guardar partida</button></div>
    <div class="zx_pr_form_head"><span>${nueva?"NUEVA PARTIDA":"EDITAR PARTIDA"}</span><h2>Costes y precio de venta</h2></div>
    <label>Tipo<select id="pr_part_tipo">${[["material","Material"],["mano_obra","Mano de obra"],["servicio","Servicio"],["transporte","Transporte"],["subcontrata","Subcontrata"],["ingenieria","Ingeniería"],["legalizacion","Legalización"],["rite","RITE"],["cae","CAE"],["otro","Otro"]].map(([v,t])=>`<option value="${v}" ${x.tipo===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <label id="pr_part_mat_wrap">Artículo del catálogo<select id="pr_part_mat">${opcionesMateriales(x.material_id)}</select></label>
    <label>Grupo<input id="pr_part_grupo" value="${limpiar(x.grupo||"")}" placeholder="Generación, hidráulica, electricidad…"></label>
    <label>Descripción<input id="pr_part_desc" value="${limpiar(x.descripcion||"")}" placeholder="Descripción de la partida"></label>
    <div class="zx_pr_grid2"><label>Referencia<input id="pr_part_ref" value="${limpiar(x.referencia||"")}"></label><label>Unidad<select id="pr_part_unidad">${["ud","h","m","m²","m³","kg","L","km","día","servicio"].map(v=>`<option value="${v}" ${unidad===v?"selected":""}>${v}</option>`).join("")}</select></label></div>
    <div class="zx_pr_grid2"><label>Cantidad <span class="zx_pr_unit" id="pr_part_qty_unit">${limpiar(unidad)}</span><input id="pr_part_qty" type="number" min="0" step="0.01" inputmode="decimal" value="${x.cantidad!=null?limpiar(x.cantidad):"1"}"></label><label>Coste unitario <span class="zx_pr_unit">€/<span id="pr_part_cost_unit">${limpiar(unidad)}</span></span><input id="pr_part_cost" type="number" min="0" step="0.01" inputmode="decimal" value="${x.coste_unitario!=null?limpiar(x.coste_unitario):"0"}"></label></div>
    <div class="zx_pr_grid2"><label>Descuento proveedor <span class="zx_pr_unit">%</span><input id="pr_part_descuento" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${x.descuento!=null?limpiar(x.descuento):"0"}"></label><label>Precio de venta <span class="zx_pr_unit">€/<span id="pr_part_sale_unit">${limpiar(unidad)}</span></span><input id="pr_part_sale" type="number" min="0" step="0.01" inputmode="decimal" value="${x.precio_unitario!=null?limpiar(x.precio_unitario):"0"}"></label></div>
    <label>IVA <span class="zx_pr_unit">%</span><input id="pr_part_iva" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${x.iva!=null?limpiar(x.iva):"21"}"></label>
    <div id="pr_part_preview" class="zx_pr_part_preview"></div>`);
  const tipo=m.querySelector("#pr_part_tipo"),mw=m.querySelector("#pr_part_mat_wrap"),ms=m.querySelector("#pr_part_mat"),desc=m.querySelector("#pr_part_desc"),ref=m.querySelector("#pr_part_ref"),un=m.querySelector("#pr_part_unidad");
  const syncTipo=()=>{mw.style.display=tipo.value==="material"?"grid":"none"};tipo.onchange=syncTipo;syncTipo();
  ms.onchange=()=>{const mat=MATERIALES.find(z=>String(z.id)===String(ms.value));if(!mat)return;if(!desc.value.trim())desc.value=materialTexto(mat);if(!ref.value.trim()&&mat.referencia)ref.value=mat.referencia;if(mat.unidad){un.value=mat.unidad;syncUnidad()}};
  const syncUnidad=()=>{const v=un.value;m.querySelector("#pr_part_qty_unit").textContent=v;m.querySelector("#pr_part_cost_unit").textContent=v;m.querySelector("#pr_part_sale_unit").textContent=v;preview()};
  const preview=()=>{const q=numValor(m.querySelector("#pr_part_qty").value),cu=numValor(m.querySelector("#pr_part_cost").value),d=numValor(m.querySelector("#pr_part_descuento").value),pu=numValor(m.querySelector("#pr_part_sale").value),iva=numValor(m.querySelector("#pr_part_iva").value),coste=q*cu*(1-d/100),venta=q*pu,total=venta*(1+iva/100);m.querySelector("#pr_part_preview").innerHTML=`<span>Coste ${eur(coste)}</span><span>Venta ${eur(venta)}</span><span>Margen ${eur(venta-coste)}</span><b>Total cliente ${eur(total)}</b>`};
  un.onchange=syncUnidad;["pr_part_qty","pr_part_cost","pr_part_descuento","pr_part_sale","pr_part_iva"].forEach(id=>m.querySelector("#"+id).oninput=preview);preview();
  m.querySelector("#pr_part_back").onclick=()=>abrirPartidas(p,op.id);
  m.querySelector("#pr_part_save").onclick=()=>guardarPartida(p,op,x);
}
async function guardarPartida(p,op,x){
  if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar la partida.");return}
  const descripcion=document.getElementById("pr_part_desc").value.trim();if(!descripcion){alert("Escribe la descripción de la partida.");return}
  const cantidad=numValor(document.getElementById("pr_part_qty").value);if(cantidad<=0){alert("La cantidad debe ser mayor que 0.");return}
  const costeUnit=numValor(document.getElementById("pr_part_cost").value),descuento=numValor(document.getElementById("pr_part_descuento").value),ventaUnit=numValor(document.getElementById("pr_part_sale").value),iva=numValor(document.getElementById("pr_part_iva").value);
  if(descuento<0||descuento>100||iva<0||iva>100){alert("Revisa descuento e IVA.");return}
  const materialId=document.getElementById("pr_part_tipo").value==="material"?(document.getElementById("pr_part_mat").value||null):null;
  const costeNeto=cantidad*costeUnit*(1-descuento/100);
  const payload={propuesta_id:op.id,material_id:materialId,tipo:document.getElementById("pr_part_tipo").value,grupo:document.getElementById("pr_part_grupo").value.trim()||null,descripcion,referencia:document.getElementById("pr_part_ref").value.trim()||null,cantidad,unidad:document.getElementById("pr_part_unidad").value,coste_unitario:costeUnit,descuento,coste_neto:costeNeto,precio_unitario:ventaUnit,iva,orden:x.orden!=null?x.orden:0,meta:x.meta&&typeof x.meta==="object"?x.meta:{}};
  const btn=document.getElementById("pr_part_save");btn.disabled=true;btn.textContent="Guardando…";
  try{
    let r;if(x.id)r=await sb().from("proyectos_partidas").update(payload).eq("id",x.id).select("*").single();else r=await sb().from("proyectos_partidas").insert([payload]).select("*").single();if(r.error)throw r.error;
    const xs=await cargarPartidas(op.id);await sincronizarTotalesPropuesta(op,xs);
    const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"partida",accion:x.id?"editada":"creada",resumen:(x.id?"Partida modificada: ":"Partida añadida: ")+descripcion,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,partida_id:r.data.id,tipo:payload.tipo,cantidad,unidad:payload.unidad}}])}catch(e){}
    await cargarPropuestas(p.id);abrirPartidas(p,op.id);
  }catch(e){alert("No se pudo guardar la partida.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar partida"}
}
async function eliminarPartida(p,op,id){
  if(propuestaBloqueada(op)){alert("Esta opción está bloqueada.");return}
  if(!confirm("¿Eliminar esta partida?"))return;
  try{
    const actual=(await cargarPartidas(op.id)).find(x=>String(x.id)===String(id));
    const r=await sb().from("proyectos_partidas").delete().eq("id",id);if(r.error)throw r.error;
    const xs=await cargarPartidas(op.id);await sincronizarTotalesPropuesta(op,xs);
    const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"partida",accion:"eliminada",resumen:"Partida eliminada: "+(actual&&actual.descripcion?actual.descripcion:"Partida"),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,partida_id:id}}])}catch(e){}
    await cargarPropuestas(p.id);abrirPartidas(p,op.id);
  }catch(e){alert("No se pudo eliminar la partida.\n"+(e&&e.message?e.message:""))}
}
function presupuestoPartidasHTML(xs){
  if(!xs.length)return `<div class="zx_pr_empty">Todavía no hay partidas en esta opción.</div>`;
  return xs.map((x,i)=>{const q=numValor(x.cantidad),pu=numValor(x.precio_unitario),iva=numValor(x.iva),venta=q*pu,total=venta*(1+iva/100);return `<div class="zx_pr_quote_line"><div><b>${i+1}. ${limpiar(x.descripcion)}</b><span>${limpiar(textoTipoPartida(x.tipo))}${x.grupo?" · "+limpiar(x.grupo):""}</span></div><div class="zx_pr_quote_nums"><span>${limpiar(x.cantidad)} ${limpiar(x.unidad||"ud")} × ${eur(pu)}/${limpiar(x.unidad||"ud")}</span><b>${eur(venta)}</b><small>IVA ${limpiar(iva)} % · ${eur(total)}</small></div></div>`}).join("");
}

function dosierEmpresaGuardado(){
  if(DOSIER_EMPRESA&&typeof DOSIER_EMPRESA==="object"&&!Array.isArray(DOSIER_EMPRESA))return DOSIER_EMPRESA;
  const cfg=leerConfigLocal(),p=cfg.presupuestos&&typeof cfg.presupuestos==="object"?cfg.presupuestos:{};
  return p.dosier&&typeof p.dosier==="object"&&!Array.isArray(p.dosier)?p.dosier:{};
}
function empresaDosier(){
  const cfg=leerConfigLocal(),e=cfg.empresa||{},d=dosierEmpresaGuardado(),n=String(d.marca_nombre||e.nombre||"").trim();
  return {
    nombre:n&&n.toLowerCase()!=="zentryx pro"?n:"",
    logo:d.logo_url||e.logo||"",
    color:d.color_primario||e.color||"#0f766e",
    sector:e.sector||"",
    telefono:d.telefono||e.telefono||"",
    email:d.email||e.email||"",
    web:d.web||e.web||"",
    texto_empresa:d.texto_empresa||""
  };
}
function hexValido(v,def){const s=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(s)?s:def}
function lineasTexto(v){return String(v||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function dossierBase(p,op){
  const emp=empresaDosier(),d=dosierEmpresaGuardado();
  return {
    estilo:d.estilo||"comercial",
    titulo:d.titulo||"Propuesta de climatización y ACS",
    subtitulo:op&&op.descripcion?op.descripcion:"Solución preparada para "+nombreCliente(p.cliente_id),
    etiqueta:d.etiqueta||"Propuesta recomendada",
    recomendada:d.recomendada!==false,
    foto_portada_url:d.foto_portada_url||"",
    color_primario:hexValido(d.color_primario||emp.color,"#0f766e"),
    color_acento:hexValido(d.color_acento,"#14b8a6"),
    introduccion:d.introduccion||"Una propuesta preparada a partir de los datos del inmueble, la instalación existente y las necesidades registradas en el proyecto.",
    beneficios:d.beneficios||"Confort estable durante todo el año\nSolución adaptada a la instalación existente\nFuncionamiento claro y preparado para mantenimiento",
    texto_empresa:d.texto_empresa||"",
    mostrar_inmueble:d.mostrar_inmueble!==false,
    mostrar_calculo:d.mostrar_calculo===true,
    mostrar_equipos:d.mostrar_equipos!==false,
    mostrar_funcionamiento:d.mostrar_funcionamiento!==false,
    mostrar_partidas:true,
    modo_precios:["total","capitulos","detallado"].includes(d.modo_precios)?d.modo_precios:"capitulos",
    incluye:d.incluye||"Suministro de los elementos incluidos en la oferta\nInstalación y puesta en marcha según las partidas indicadas",
    no_incluye:d.no_incluye||"Trabajos no descritos expresamente en esta oferta",
    garantia:d.garantia||"Garantías según fabricante y normativa aplicable. Las condiciones concretas se indicarán en la documentación final.",
    forma_pago:d.forma_pago||"A definir con el cliente",
    plazo:d.plazo||"A concretar según disponibilidad de equipos y planificación de obra",
    validez_dias:Math.max(1,Math.round(Number(d.validez_dias)||30)),
    cierre:d.cierre||"Si esta propuesta encaja con lo que necesitas, el siguiente paso es confirmar la opción elegida y programar la instalación.",
    mostrar_incluye:d.mostrar_incluye!==false,
    mostrar_no_incluye:d.mostrar_no_incluye!==false,
    mostrar_garantia:d.mostrar_garantia!==false,
    mostrar_pago:d.mostrar_pago!==false,
    mostrar_plazo:d.mostrar_plazo!==false,
    mostrar_firma:d.mostrar_firma!==false,
    mostrar_contacto:d.mostrar_contacto!==false
  };
}
function dossierMeta(p,op){
  const base=dossierBase(p,op),cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};
  const saved=cm.dossier_meta&&typeof cm.dossier_meta==="object"&&!Array.isArray(cm.dossier_meta)?cm.dossier_meta:{};
  return {...base,...saved,color_primario:hexValido(saved.color_primario,base.color_primario),color_acento:hexValido(saved.color_acento,base.color_acento)};
}
function dossierBaseHistorico(p,op){
  return {
    estilo:"comercial",
    titulo:"Propuesta de climatización y ACS",
    subtitulo:op&&op.descripcion?op.descripcion:"Solución preparada para "+nombreCliente(p.cliente_id),
    etiqueta:"Propuesta recomendada",
    recomendada:true,
    foto_portada_url:"",
    color_primario:"#0f766e",
    color_acento:"#14b8a6",
    introduccion:"Una propuesta preparada a partir de los datos del inmueble, la instalación existente y las necesidades registradas en el proyecto.",
    beneficios:"Confort estable durante todo el año\nSolución adaptada a la instalación existente\nFuncionamiento claro y preparado para mantenimiento",
    texto_empresa:"",
    mostrar_inmueble:true,
    mostrar_calculo:false,
    mostrar_equipos:true,
    mostrar_funcionamiento:true,
    mostrar_partidas:true,
    modo_precios:"capitulos",
    incluye:"Suministro de los elementos incluidos en la oferta\nInstalación y puesta en marcha según las partidas indicadas",
    no_incluye:"Trabajos no descritos expresamente en esta oferta",
    garantia:"Garantías según fabricante y normativa aplicable. Las condiciones concretas se indicarán en la documentación final.",
    forma_pago:"A definir con el cliente",
    plazo:"A concretar según disponibilidad de equipos y planificación de obra",
    validez_dias:30,
    cierre:"Si esta propuesta encaja con lo que necesitas, el siguiente paso es confirmar la opción elegida y programar la instalación.",
    mostrar_incluye:true,
    mostrar_no_incluye:true,
    mostrar_garantia:true,
    mostrar_pago:true,
    mostrar_plazo:true,
    mostrar_firma:true,
    mostrar_contacto:false
  };
}
function empresaHistoricaVacia(){return {nombre:"",logo:"",color:"#0f766e",sector:"",telefono:"",email:"",web:"",texto_empresa:""}}
function empresaDosierAnterior(){
  const cfg=leerConfigLocal(),e=cfg.empresa||{},n=String(e.nombre||"").trim();
  return {nombre:n&&n.toLowerCase()!=="zentryx pro"?n:"",logo:e.logo||"",color:hexValido(e.color,"#0f766e"),sector:e.sector||"",telefono:e.telefono||"",email:e.email||"",web:e.web||"",texto_empresa:""};
}
function dossierSnapshot(op){const cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};return cm.dossier_snapshot&&typeof cm.dossier_snapshot==="object"&&!Array.isArray(cm.dossier_snapshot)?cm.dossier_snapshot:null}
function valorCheck(id){const e=document.getElementById(id);return !!(e&&e.checked)}
function campoCheck(id,txt,checked){return `<label class="zx_pr_dossier_check"><input id="${id}" type="checkbox" ${checked?"checked":""}><span>${limpiar(txt)}</span></label>`}
function nombreSeguroArchivo(v){
  const s=String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"");
  return s||"propuesta";
}
function nombrePDFDosier(p,op,d){
  const cliente=d&&d.cliente?d.cliente:nombreCliente(p&&p.cliente_id);
  return "Propuesta_"+nombreSeguroArchivo(cliente)+"_"+nombreSeguroArchivo(op&&op.nombre||"opcion")+".pdf";
}
function pdfHexColor(v,def){
  const s=hexValido(v,def||"#0f766e").slice(1);
  return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255];
}
function pdfNum(n){return Number(n||0).toFixed(3).replace(/0+$/,"").replace(/\.$/,"")||"0"}
function pdfEsc(v){return String(v??"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[\r\n]+/g," ")}
function pdfWinAnsiBytes(s){
  const map={"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
  const out=[];
  for(const ch of String(s||"")){
    const cp=ch.codePointAt(0);
    if(cp<=255)out.push(cp);
    else if(map[ch]!=null)out.push(map[ch]);
    else out.push(63);
  }
  return new Uint8Array(out);
}
function pdfAsciiBytes(s){const out=new Uint8Array(String(s||"").length);for(let i=0;i<out.length;i++)out[i]=String(s).charCodeAt(i)&255;return out}
function pdfConcat(parts){let n=0;parts.forEach(p=>n+=p.length);const out=new Uint8Array(n);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return out}
function pdfTextWidthApprox(s,size){return String(s||"").length*Number(size||10)*0.50}
function pdfWrap(v,size,maxWidth){
  const words=String(v||"").replace(/\s+/g," ").trim().split(" ").filter(Boolean),lines=[];let line="";
  for(const w of words){const c=line?line+" "+w:w;if(!line||pdfTextWidthApprox(c,size)<=maxWidth)line=c;else{lines.push(line);line=w}}
  if(line)lines.push(line);return lines.length?lines:[""];
}
function crearPDFDosier(p,op,d){
  const cfg=d&&d.cfg||{},emp=d&&d.emp||{},primary=pdfHexColor(cfg.color_primario,"#0f766e"),accent=pdfHexColor(cfg.color_acento,"#14b8a6");
  const W=595,H=842,M=46,contentW=W-M*2,pages=[];let page=null,y=0;
  const rgb=a=>a.map(pdfNum).join(" ");
  const newPage=(cover=false)=>{page=[];pages.push(page);y=H-M;if(!cover){page.push(`q ${rgb([.965,.973,.984])} rg 0 0 ${W} ${H} re f Q`);page.push(`q 1 1 1 rg ${M-12} 28 ${contentW+24} ${H-56} re f Q`)}};
  const ensure=h=>{if(y-h<M+24)newPage(false)};
  const text=(s,x,yy,size=10,bold=false,color=[.055,.09,.18])=>page.push(`BT /${bold?'F2':'F1'} ${pdfNum(size)} Tf ${rgb(color)} rg 1 0 0 1 ${pdfNum(x)} ${pdfNum(yy)} Tm (${pdfEsc(s)}) Tj ET`);
  const line=(x1,yy1,x2,yy2,color=[.8,.84,.89],w=.8)=>page.push(`q ${rgb(color)} RG ${pdfNum(w)} w ${pdfNum(x1)} ${pdfNum(yy1)} m ${pdfNum(x2)} ${pdfNum(yy2)} l S Q`);
  const rect=(x,yy,w,h,color,r=0)=>{page.push(`q ${rgb(color)} rg ${pdfNum(x)} ${pdfNum(yy)} ${pdfNum(w)} ${pdfNum(h)} re f Q`)};
  const paragraph=(v,size=10,color=[.28,.35,.45],gap=3,bold=false)=>{for(const raw of String(v||"").split(/\r?\n/)){const ls=pdfWrap(raw,size,contentW);for(const l of ls){ensure(size+6);text(l,M,y,size,bold,color);y-=size+gap}y-=2}};
  const section=(title,kicker)=>{ensure(52);if(kicker){text(kicker.toUpperCase(),M,y,8,true,primary);y-=14}text(title,M,y,20,true,[.03,.08,.18]);y-=28};
  const kv=(label,value)=>{ensure(42);rect(M,y-29,contentW,36,[.97,.98,.99]);text(String(label||"").toUpperCase(),M+12,y-11,7,true,[.40,.47,.57]);text(String(value||""),M+12,y-25,11,true,[.04,.09,.18]);y-=44};
  const tagLine=(name,detail)=>{const lines=pdfWrap(detail,9,contentW-28),h=34+Math.max(0,lines.length-1)*12;ensure(h+8);rect(M,y-h+4,contentW,h,[.97,.98,.99]);text(name,M+12,y-13,11,true,[.04,.09,.18]);let yy=y-27;for(const l of lines){text(l,M+12,yy,9,false,[.38,.45,.55]);yy-=12}y-=h+8};

  newPage(true);
  rect(0,0,W,H,[.025,.075,.16]);
  rect(0,H-240,W,240,primary);
  text(emp.nombre||"PROPUESTA PERSONALIZADA",M,H-72,11,true,[1,1,1]);
  if(cfg.recomendada!==false){rect(M,H-130,170,28,accent);text(cfg.etiqueta||"Propuesta recomendada",M+12,H-121,9,true,[.02,.16,.16])}
  text("PROPUESTA COMERCIAL · "+String(op&&op.nombre||""),M,H-176,9,true,[.88,.92,.96]);
  const titleLines=pdfWrap(cfg.titulo||"Propuesta comercial",30,contentW);let ty=H-218;for(const l of titleLines.slice(0,3)){text(l,M,ty,30,true,[1,1,1]);ty-=34}
  ty-=8;for(const l of pdfWrap(cfg.subtitulo||d.descripcion||d.proyecto,15,contentW).slice(0,4)){text(l,M,ty,15,false,[1,1,1]);ty-=20}
  const cmFecha=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{},dsFecha=dossierSnapshot(op)||{},psFecha=cmFecha.presupuesto_snapshot&&typeof cmFecha.presupuesto_snapshot==="object"?cmFecha.presupuesto_snapshot:{};
  const fechaPdf=dsFecha.enviado_at||dsFecha.aceptado_at||psFecha.aceptado_at||dsFecha.creado_at||new Date().toISOString();
  text((d.cliente||"")+" · "+fechaES(fechaPdf),M,62,10,true,[.88,.92,.96]);

  newPage(false);
  section("Una propuesta pensada para tu instalación");paragraph(cfg.introduccion||"");
  for(const b of lineasTexto(cfg.beneficios||"")){ensure(28);rect(M,y-20,contentW,26,[.94,.99,.98]);text("• "+b,M+12,y-15,10,true,[.04,.37,.34]);y-=32}

  if(cfg.mostrar_inmueble!==false){
    y-=8;section(d.cliente||"Proyecto","EL PROYECTO");if(d.direccion)paragraph(d.direccion,11,[.38,.45,.55],4,true);
    const im=d.inmueble||{};if(im.tipo_inmueble)kv("Inmueble",im.tipo_inmueble);if(im.superficie_calefactada_m2!=null)kv("Superficie",im.superficie_calefactada_m2+" m²");if(im.ocupantes!=null)kv("Ocupantes",im.ocupantes+" personas");if(im.banos!=null)kv("Baños",im.banos+" ud");
  }
  if(d.descripcion){y-=5;section("Solución propuesta","SOLUCIÓN PROPUESTA");paragraph(d.descripcion,16,[.03,.08,.18],5,true);paragraph("Solución preparada con los equipos previstos y los apoyos definidos en el proyecto.")}
  if(cfg.mostrar_calculo===true&&d.calc){
    y-=5;section("Datos de referencia","ESTUDIO");const c=d.calc;if(c.calefaccion_kw!=null)kv("Calefacción",c.calefaccion_kw+" kW");if(c.refrigeracion_kw!=null)kv("Refrigeración",c.refrigeracion_kw+" kW");if(c.acs_litros!=null)kv("ACS recomendado",c.acs_litros+" L");if(c.temperatura_impulsion_c!=null)kv("Impulsión recomendada",c.temperatura_impulsion_c+" °C");
  }
  if(cfg.mostrar_equipos!==false&&Array.isArray(d.generadores)&&d.generadores.length){
    y-=5;section("Equipos de la propuesta","EQUIPOS");d.generadores.filter(g=>g.existente===false||g.se_mantiene!==false).forEach(g=>{const sv=serviciosEquipo(g).join(" · "),nom=textoGenerador(g.tipo)+" · "+([g.marca,g.modelo].filter(Boolean).join(" ")||"Modelo por definir"),pot=g.potencia_kw!=null?g.potencia_kw+" kW":"Potencia por definir";tagLine(nom,[papelEquipo(g),pot,sv].filter(Boolean).join(" · "))});
  }
  if(cfg.mostrar_funcionamiento!==false&&Array.isArray(d.reglas)&&d.reglas.length){
    y-=5;section("Funcionamiento previsto","CÓMO FUNCIONARÁ");d.reglas.forEach((r,i)=>tagLine((i+1)+". "+nombreGeneradorRegla(r),fraseReglaCliente(r)+(r.notas?" "+r.notas:"")));
  }
  y-=5;section(cfg.modo_precios==="total"?"Inversión total":cfg.modo_precios==="detallado"?"Partidas de la propuesta":"Presupuesto por capítulos","INVERSIÓN");
  if(cfg.modo_precios==="detallado"){
    (d.partidas||[]).forEach((x,i)=>{const q=numValor(x.cantidad),pu=numValor(x.precio_unitario),iva=numValor(x.iva),total=q*pu*(1+iva/100);tagLine((i+1)+". "+x.descripcion,`${x.cantidad} ${x.unidad||"ud"} × ${eur(pu)}/${x.unidad||"ud"} · IVA ${iva} % · ${eur(total)}`)});
  }else if(cfg.modo_precios==="capitulos"){
    capitulosPartidas(d.partidas||[]).forEach(c=>tagLine(c.nombre,eur(c.total)));
  }
  ensure(74);rect(M,y-60,contentW,66,primary);text("Total presupuesto",M+14,y-18,13,false,[1,1,1]);text(eur((d.totales||{}).total||0),M+14,y-46,24,true,[1,1,1]);text("Impuestos incluidos",M+250,y-45,9,false,[.88,.95,.94]);y-=82;

  const info=[];if(cfg.mostrar_incluye!==false&&cfg.incluye)info.push(["Qué incluye",cfg.incluye]);if(cfg.mostrar_no_incluye!==false&&cfg.no_incluye)info.push(["Qué no incluye",cfg.no_incluye]);if(cfg.mostrar_garantia!==false&&cfg.garantia)info.push(["Garantías",cfg.garantia]);if(cfg.mostrar_pago!==false&&cfg.forma_pago)info.push(["Forma de pago",cfg.forma_pago]);if(cfg.mostrar_plazo!==false&&cfg.plazo)info.push(["Plazo estimado",cfg.plazo]);
  if(info.length){y-=5;section("Condiciones","CONDICIONES");for(const [a,b] of info){ensure(34);text(a,M,y,13,true,[.03,.08,.18]);y-=18;paragraph(b,9,[.38,.45,.55],3);y-=5}paragraph(`Oferta válida durante ${cfg.validez_dias||30} días desde su emisión.`,9,[.38,.45,.55],3,true)}
  if(cfg.texto_empresa){y-=5;section(emp.nombre||"Quién realizará el trabajo","NUESTRA EMPRESA");paragraph(cfg.texto_empresa,10,[.38,.45,.55],4)}
  const contactos=[emp.telefono?"Tel. "+emp.telefono:"",emp.email||"",emp.web||""].filter(Boolean);if(cfg.mostrar_contacto!==false&&contactos.length){y-=6;tagLine(emp.nombre||"Contacto",contactos.join(" · "))}
  const est=estadoPropuesta(op),ps=op&&op.control_meta&&op.control_meta.presupuesto_snapshot||{};
  if(est==="aceptada"||est==="sustituida"){
    ensure(95);y-=8;rect(M,y-76,contentW,82,est==="aceptada"?[.93,.99,.96]:[.97,.97,.98]);text(est==="aceptada"?"PROPUESTA ACEPTADA":"PROPUESTA SUSTITUIDA",M+14,y-18,9,true,est==="aceptada"?[.02,.37,.27]:[.35,.39,.46]);text(est==="aceptada"?"Esta opción ha sido confirmada.":"Esta versión ya no es la opción aceptada actual.",M+14,y-40,15,true,[.03,.18,.14]);if(est==="aceptada"&&ps.aceptado_at)text("Aceptada el "+fechaES(ps.aceptado_at)+(ps.aceptado_por?" por "+ps.aceptado_por:""),M+14,y-60,9,false,[.30,.40,.37]);y-=94;
  }else if(cfg.mostrar_firma!==false){
    ensure(120);y-=6;rect(M,y-100,contentW,108,[.025,.075,.16]);text("SIGUIENTE PASO",M+14,y-18,9,true,[.60,.96,.90]);let yy=y-42;for(const l of pdfWrap(cfg.cierre||"Confirmar la opción elegida",14,contentW-28).slice(0,3)){text(l,M+14,yy,14,true,[1,1,1]);yy-=18}line(M+14,y-87,M+220,y-87,[.8,.9,.9]);line(M+280,y-87,W-M-14,y-87,[.8,.9,.9]);text("Cliente / firma",M+14,y-99,8,false,[.9,.94,.96]);text("Fecha",M+280,y-99,8,false,[.9,.94,.96]);y-=116;
  }

  pages.forEach((pg,i)=>{if(i===0)return;pg.push(`BT /F1 7 Tf 0.45 0.50 0.58 rg 1 0 0 1 ${M} 18 Tm (${pdfEsc((emp.nombre||"Propuesta comercial")+" · "+(d.proyecto||op.nombre||""))}) Tj ET`);pg.push(`BT /F1 7 Tf 0.45 0.50 0.58 rg 1 0 0 1 ${W-M-55} 18 Tm (${i+1}/${pages.length}) Tj ET`)});
  const bodies={1:pdfAsciiBytes("<< /Type /Catalog /Pages 2 0 R >>"),3:pdfAsciiBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),4:pdfAsciiBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")};
  const pageRefs=[];let obj=5;
  pages.forEach(pg=>{const pObj=obj++,cObj=obj++;pageRefs.push(`${pObj} 0 R`);const stream=pdfWinAnsiBytes(pg.join("\n"));bodies[pObj]=pdfAsciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cObj} 0 R >>`);bodies[cObj]=pdfConcat([pdfAsciiBytes(`<< /Length ${stream.length} >>\nstream\n`),stream,pdfAsciiBytes("\nendstream")])});
  bodies[2]=pdfAsciiBytes(`<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`);
  const maxObj=obj-1,header=pdfAsciiBytes("%PDF-1.4\n%ZENTRYX\n"),parts=[header],offsets=new Array(maxObj+1).fill(0);let pos=header.length;
  for(let i=1;i<=maxObj;i++){offsets[i]=pos;const body=bodies[i]||pdfAsciiBytes("<<>>");const chunk=pdfConcat([pdfAsciiBytes(`${i} 0 obj\n`),body,pdfAsciiBytes("\nendobj\n")]);parts.push(chunk);pos+=chunk.length}
  const xrefPos=pos;let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;for(let i=1;i<=maxObj;i++)xref+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(pdfAsciiBytes(xref));
  return new Blob(parts,{type:"application/pdf"});
}
async function compartirPDFDosier(p,op,d){
  let blob,archivo;try{blob=crearPDFDosier(p,op,d)}catch(e){console.error("Zentryx Proyectos: error preparando PDF",e);alert("No se pudo preparar el PDF del dosier.");return false}
  const nombre=nombrePDFDosier(p,op,d);
  try{archivo=new File([blob],nombre,{type:"application/pdf",lastModified:Date.now()})}catch(e){archivo=blob;try{archivo.name=nombre}catch(err){}}
  let puede=!!navigator.share;
  if(puede&&navigator.canShare){try{puede=!!navigator.canShare({files:[archivo]})}catch(e){puede=false}}
  if(puede){
    try{await navigator.share({title:"Propuesta comercial · "+(op.nombre||""),text:"Propuesta para "+(d.cliente||nombreCliente(p.cliente_id)),files:[archivo]});return true}catch(e){if(e&&e.name==="AbortError")return false;console.warn("Zentryx Proyectos: no se pudo abrir la hoja de compartir",e)}
  }
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=nombre;a.target="_blank";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>{try{URL.revokeObjectURL(url)}catch(e){}},60000);return true;
}

function capitulosPartidas(xs){
  const m=new Map();
  (xs||[]).forEach(x=>{const k=(x.grupo||textoTipoPartida(x.tipo)||"Otros").trim()||"Otros",q=numValor(x.cantidad),pu=numValor(x.precio_unitario),iva=numValor(x.iva),base=q*pu,total=base*(1+iva/100);const a=m.get(k)||{nombre:k,base:0,total:0};a.base+=base;a.total+=total;m.set(k,a)});
  return Array.from(m.values());
}
function dossierPrecioHTML(xs,cfg,t){
  if(cfg.modo_precios==="total")return `<section class="zx_pr_dos_section zx_pr_dos_price"><span>Inversión total</span><b>${eur(t.total)}</b><small>Impuestos incluidos</small></section>`;
  if(cfg.modo_precios==="capitulos"){
    const cs=capitulosPartidas(xs);
    return `<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">INVERSIÓN</div><h3>Presupuesto por capítulos</h3><p class="zx_pr_dos_lead">Importes finales por capítulo, con impuestos incluidos.</p><div class="zx_pr_dos_chapters">${cs.map(c=>`<div><span>${limpiar(c.nombre)}</span><b>${eur(c.total)}</b></div>`).join("")}</div><div class="zx_pr_dos_total"><span>Total presupuesto</span><b>${eur(t.total)}</b><small>Impuestos incluidos</small></div></section>`;
  }
  return `<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">INVERSIÓN</div><h3>Partidas de la propuesta</h3><div class="zx_pr_dos_lines">${(xs||[]).map((x,i)=>{const q=numValor(x.cantidad),pu=numValor(x.precio_unitario),iva=numValor(x.iva),base=q*pu,total=base*(1+iva/100);return `<div><div><b>${i+1}. ${limpiar(x.descripcion)}</b><span>${limpiar(x.cantidad)} ${limpiar(x.unidad||"ud")} × ${eur(pu)}/${limpiar(x.unidad||"ud")}</span></div><strong>${eur(total)}</strong></div>`}).join("")}</div><div class="zx_pr_dos_total"><span>Total presupuesto</span><b>${eur(t.total)}</b><small>Impuestos incluidos</small></div></section>`;
}
function fraseReglaCliente(r){
  const gen=nombreGeneradorRegla(r),rel=r&&r.generador_referencia_id?nombreGeneradorRelacionadoRegla(r):"",serv=textoServicioRegla(r.servicio);
  if(r.condicion_tipo==="fallo_generador"&&rel)return `${gen} queda disponible para ${serv.toLowerCase()} y entrará si ${rel} no está disponible.`;
  if(r.condicion_tipo==="siempre")return `${gen} trabajará como equipo habitual para ${serv.toLowerCase()}.`;
  if(r.condicion_tipo==="manual")return `${gen} se utilizará para ${serv.toLowerCase()} cuando se seleccione manualmente.`;
  if(r.condicion_tipo==="temp_ext_menor")return `${gen} podrá entrar para ${serv.toLowerCase()} cuando la temperatura exterior sea inferior a ${r.valor!=null?r.valor:"—"} ${r.unidad||"°C"}.`;
  if(r.condicion_tipo==="temp_ext_mayor")return `${gen} podrá entrar para ${serv.toLowerCase()} cuando la temperatura exterior supere ${r.valor!=null?r.valor:"—"} ${r.unidad||"°C"}.`;
  if(r.condicion_tipo==="demanda_mayor")return `${gen} podrá apoyar ${serv.toLowerCase()} cuando la demanda supere ${r.valor!=null?r.valor:"—"} ${r.unidad||"kW"}.`;
  return `${gen} queda previsto para ${serv.toLowerCase()} según la condición definida en el proyecto.`;
}
function dossierReglasHTML(rs){
  if(!rs.length)return "";
  return `<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">CÓMO FUNCIONARÁ</div><h3>Funcionamiento previsto</h3><p class="zx_pr_dos_lead">Una explicación sencilla de cuándo trabajará cada equipo.</p><div class="zx_pr_dos_flow">${rs.map((r,i)=>`<div><span>${i+1}</span><div><b>${limpiar(nombreGeneradorRegla(r))}</b><p>${limpiar(fraseReglaCliente(r))}</p>${r.notas?`<small>${limpiar(r.notas)}</small>`:""}</div></div>`).join("")}</div></section>`;
}
function serviciosEquipo(g){return listaFunciones(g&&g.funciones).map(x=>({calefaccion:"Calefacción",acs:"ACS",refrigeracion:"Refrigeración",piscina:"Piscina"})[x]||x)}
function papelEquipo(g){const meta=g&&g.tecnico_meta||{};return meta.rol_futuro?textoRol(meta.rol_futuro):(g&&g.existente===false?"Equipo previsto":"Equipo existente")}
function generadoresDossierPropuesta(op,gs){
  const rs=reglasPropuesta(op),ids=new Set();
  rs.forEach(r=>{
    if(r&&r.generador_id!=null&&r.generador_id!=="")ids.add(String(r.generador_id));
    if(r&&r.generador_referencia_id!=null&&r.generador_referencia_id!=="")ids.add(String(r.generador_referencia_id));
  });
  if(!ids.size)return [];
  return (gs||[]).filter(g=>g&&ids.has(String(g.id)));
}
function dossierEquiposHTML(gs){
  const visibles=(gs||[]).filter(g=>g.existente===false||g.se_mantiene!==false);
  if(!visibles.length)return "";
  return `<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">EQUIPOS</div><h3>Equipos de la propuesta</h3><div class="zx_pr_dos_equips">${visibles.map(g=>{const sv=serviciosEquipo(g),meta=g.tecnico_meta||{},foto=meta.foto_comercial_url||meta.foto_url||"";return `<article>${foto?`<img class="zx_pr_dos_equipment_img" src="${limpiar(foto)}" alt="${limpiar(textoGenerador(g.tipo))}" onerror="this.style.display='none'">`:`<div class="zx_pr_dos_equipment_placeholder"><span>${limpiar(textoGenerador(g.tipo).slice(0,1))}</span></div>`}<div class="zx_pr_dos_equipment_body"><span>${limpiar(papelEquipo(g))}</span><h4>${limpiar(textoGenerador(g.tipo))}</h4><b>${limpiar([g.marca,g.modelo].filter(Boolean).join(" · ")||"Marca y modelo por definir")}</b><p>${g.potencia_kw!=null&&g.potencia_kw!==""?limpiar(g.potencia_kw)+" kW":"Potencia por definir"}</p>${sv.length?`<div class="zx_pr_dos_equipment_tags">${sv.map(x=>`<em>${limpiar(x)}</em>`).join("")}</div>`:""}${meta.descripcion_cliente?`<small>${limpiar(meta.descripcion_cliente)}</small>`:""}</div></article>`}).join("")}</div></section>`;
}
function dossierCalculoHTML(calc){
  if(!calc)return "";const en=calc.entrada_meta||{};
  const vals=[["Calefacción",calc.calefaccion_kw,"kW"],["Refrigeración",calc.refrigeracion_kw,"kW"],["ACS recomendado",calc.acs_litros,"L"],["Impulsión recomendada",calc.temperatura_impulsion_c,"°C"]].filter(x=>x[1]!=null&&x[1]!=="");
  if(!vals.length)return "";
  return `<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">ESTUDIO</div><h3>Datos de referencia</h3><div class="zx_pr_dos_metrics">${vals.map(x=>`<div><span>${limpiar(x[0])}</span><b>${limpiar(x[1])} ${x[2]}</b></div>`).join("")}${en.superficie_m2!=null?`<div><span>Superficie</span><b>${limpiar(en.superficie_m2)} m²</b></div>`:""}</div></section>`;
}
function snapshotDossier(p,op,xs,calc,cfg){
  const t=totalesPartidas(xs),emp=empresaDosier();
  return {version:1,creado_at:new Date().toISOString(),config:{...cfg},empresa:{...emp},proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",inmueble_meta:p.inmueble_meta||{},descripcion:op.descripcion||"",calculo:calc?JSON.parse(JSON.stringify(calc)):null,generadores:generadoresDossierPropuesta(op,GENERADORES).map(g=>JSON.parse(JSON.stringify(g))),reglas:reglasPropuesta(op).map(r=>({...r,generador_nombre_snapshot:r.generador_nombre_snapshot||nombreGeneradorId(r.generador_id),generador_referencia_nombre_snapshot:r.generador_referencia_id?(r.generador_referencia_nombre_snapshot||nombreGeneradorId(r.generador_referencia_id)):null})),partidas:(xs||[]).map(x=>JSON.parse(JSON.stringify(x))),totales:{...t}};
}
function datosDossierVista(p,op,xs,calc){
  const snap=dossierSnapshot(op),est=estadoPropuesta(op),bloqueada=est==="enviada"||est==="aceptada";
  if(bloqueada&&snap){
    const cfgSnap=snap.config&&typeof snap.config==="object"&&!Array.isArray(snap.config)?snap.config:{};
    const empSnap=snap.empresa&&typeof snap.empresa==="object"&&!Array.isArray(snap.empresa)?snap.empresa:empresaHistoricaVacia();
    return {cfg:{...dossierBaseHistorico(p,op),...cfgSnap},emp:empSnap,proyecto:snap.proyecto||p.nombre||"",cliente:snap.cliente||nombreCliente(p.cliente_id),direccion:snap.direccion||proyectoDir(p)||"",inmueble:snap.inmueble_meta||{},descripcion:snap.descripcion||op.descripcion||"",calc:snap.calculo||null,generadores:snap.generadores||[],reglas:snap.reglas||[],partidas:snap.partidas||[],totales:snap.totales||totalesPartidas(snap.partidas||[]),snapshot:true};
  }
  if(bloqueada){
    const ps=op&&op.control_meta&&op.control_meta.presupuesto_snapshot&&typeof op.control_meta.presupuesto_snapshot==="object"?op.control_meta.presupuesto_snapshot:{};
    const empAnterior=empresaDosierAnterior(),cfgAnterior={...dossierBaseHistorico(p,op),color_primario:empAnterior.color};
    return {cfg:cfgAnterior,emp:empAnterior,proyecto:ps.proyecto||p.nombre||"",cliente:ps.cliente||nombreCliente(p.cliente_id),direccion:ps.direccion||proyectoDir(p)||"",inmueble:p.inmueble_meta||{},descripcion:ps.descripcion||op.descripcion||"",calc,generadores:GENERADORES,reglas:reglasPropuesta(op),partidas:xs,totales:totalesPartidas(xs),snapshot:false,historico:true};
  }
  return {cfg:dossierMeta(p,op),emp:empresaDosier(),proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",inmueble:p.inmueble_meta||{},descripcion:op.descripcion||"",calc, generadores:generadoresDossierPropuesta(op,GENERADORES),reglas:reglasPropuesta(op),partidas:xs,totales:totalesPartidas(xs),snapshot:false};
}
function tieneDosierPropio(op){
  const cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};
  return !!(cm.dossier_meta&&typeof cm.dossier_meta==="object"&&!Array.isArray(cm.dossier_meta));
}
async function usarDosierEmpresa(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para usar los valores de empresa.");return}
  if(estadoPropuesta(op)!=="borrador"){alert("El diseño ya está bloqueado.");return}
  if(!confirm("¿Usar los valores de empresa para este presupuesto? Se quitarán los ajustes propios de esta opción."))return;
  const cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?{...op.control_meta}:{};
  delete cm.dossier_meta;
  try{
    const q=await sb().from("proyectos_propuestas").update({control_meta:cm}).eq("id",op.id).select("*").single();if(q.error)throw q.error;
    const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"dosier",accion:"base_empresa",resumen:"Dosier restablecido a los valores de empresa: "+op.nombre,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id}}])}catch(e){}
    await cargarPropuestas(p.id);cerrarModal();formularioDosier(p,op.id);
  }catch(e){alert("No se pudieron aplicar los valores de empresa.\n"+(e&&e.message?e.message:""))}
}
async function formularioDosier(p,opId){
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  if(estadoPropuesta(op)!=="borrador"){alert("El diseño queda bloqueado al marcar el presupuesto como enviado. Puedes consultar la vista guardada.");return abrirVistaDosier(p,opId)}
  const c=dossierMeta(p,op);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_dcfg_back" type="button">← Volver</button><button id="pr_dcfg_save" class="primary" type="button">Guardar diseño</button></div>
    <div class="zx_pr_form_head"><span>DOSIER COMERCIAL</span><h2>Configurar presentación</h2></div>
    <div class="zx_pr_info"><b>${tieneDosierPropio(op)?"Esta opción tiene ajustes propios.":"Esta opción usa los valores de empresa."}</b><span>Los valores de Ajustes → Presupuestos sirven como base. Puedes cambiar solo esta oferta sin modificar las demás.</span></div>
    ${tieneDosierPropio(op)?`<button id="pr_dcfg_company" class="zx_pr_secondary_full" type="button">Usar valores de empresa</button>`:""}
    <label>Estilo<select id="pr_dcfg_style"><option value="comercial" ${c.estilo==="comercial"?"selected":""}>Comercial visual</option><option value="profesional" ${c.estilo==="profesional"?"selected":""}>Profesional</option><option value="tecnico" ${c.estilo==="tecnico"?"selected":""}>Técnico</option></select></label>
    <div class="zx_pr_grid2"><label>Color principal<input id="pr_dcfg_primary" type="color" value="${limpiar(c.color_primario)}"></label><label>Color de apoyo<input id="pr_dcfg_accent" type="color" value="${limpiar(c.color_acento)}"></label></div>
    <label>Título de portada<input id="pr_dcfg_title" value="${limpiar(c.titulo)}"></label>
    <div class="zx_pr_grid2"><label>Etiqueta destacada<input id="pr_dcfg_label" value="${limpiar(c.etiqueta||"Propuesta recomendada")}"></label><label>Subtítulo<input id="pr_dcfg_subtitle" value="${limpiar(c.subtitulo)}"></label></div>
    <label>Foto de portada · URL opcional<input id="pr_dcfg_photo" value="${limpiar(c.foto_portada_url)}" placeholder="https://..."></label>
    <div class="zx_pr_checks">${campoCheck("pr_dcfg_recommended","Destacar como propuesta recomendada",c.recomendada)}${campoCheck("pr_dcfg_property","Mostrar inmueble",c.mostrar_inmueble)}${campoCheck("pr_dcfg_calc","Mostrar datos del cálculo",c.mostrar_calculo)}${campoCheck("pr_dcfg_equips","Mostrar equipos",c.mostrar_equipos)}${campoCheck("pr_dcfg_rules","Mostrar funcionamiento",c.mostrar_funcionamiento)}${campoCheck("pr_dcfg_include","Mostrar qué incluye",c.mostrar_incluye)}${campoCheck("pr_dcfg_exclude","Mostrar qué no incluye",c.mostrar_no_incluye)}${campoCheck("pr_dcfg_warranty","Mostrar garantías",c.mostrar_garantia)}${campoCheck("pr_dcfg_payment","Mostrar forma de pago",c.mostrar_pago)}${campoCheck("pr_dcfg_term","Mostrar plazo",c.mostrar_plazo)}${campoCheck("pr_dcfg_sign","Mostrar zona de aceptación",c.mostrar_firma)}</div>
    <label>Presentación de precios<select id="pr_dcfg_prices"><option value="total" ${c.modo_precios==="total"?"selected":""}>Solo precio total</option><option value="capitulos" ${c.modo_precios==="capitulos"?"selected":""}>Precio por capítulos</option><option value="detallado" ${c.modo_precios==="detallado"?"selected":""}>Partidas detalladas</option></select></label>
    <label>Texto inicial<textarea id="pr_dcfg_intro" rows="4">${limpiar(c.introduccion)}</textarea></label>
    <label>Beneficios · uno por línea<textarea id="pr_dcfg_benefits" rows="5">${limpiar(c.beneficios)}</textarea></label>
    <label>Texto sobre la empresa · opcional<textarea id="pr_dcfg_company_txt" rows="3">${limpiar(c.texto_empresa||"")}</textarea></label>
    ${campoCheck("pr_dcfg_contact","Mostrar contacto de empresa al final",c.mostrar_contacto!==false)}
    <label>Qué incluye<textarea id="pr_dcfg_includes" rows="4">${limpiar(c.incluye)}</textarea></label>
    <label>Qué no incluye<textarea id="pr_dcfg_excludes" rows="3">${limpiar(c.no_incluye)}</textarea></label>
    <label>Garantías<textarea id="pr_dcfg_warranty_txt" rows="3">${limpiar(c.garantia)}</textarea></label>
    <div class="zx_pr_grid2"><label>Forma de pago<textarea id="pr_dcfg_payment_txt" rows="3">${limpiar(c.forma_pago)}</textarea></label><label>Plazo estimado<textarea id="pr_dcfg_term_txt" rows="3">${limpiar(c.plazo)}</textarea></label></div>
    <label>Validez de la oferta <span class="zx_pr_unit">días</span><input id="pr_dcfg_valid" type="number" min="1" step="1" inputmode="numeric" value="${limpiar(c.validez_dias)}"></label>
    <label>Cierre comercial<textarea id="pr_dcfg_close" rows="4">${limpiar(c.cierre)}</textarea></label>`);
  m.querySelector("#pr_dcfg_back").onclick=()=>{cerrarModal();abrirPresupuesto(p,op.id)};
  m.querySelector("#pr_dcfg_save").onclick=()=>guardarDosier(p,op);
  const ce=m.querySelector("#pr_dcfg_company");if(ce)ce.onclick=()=>usarDosierEmpresa(p,op);
}
async function guardarDosier(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el diseño del dosier.");return}
  if(estadoPropuesta(op)!=="borrador"){alert("El diseño ya está bloqueado.");return}
  const c={estilo:document.getElementById("pr_dcfg_style").value,color_primario:document.getElementById("pr_dcfg_primary").value,color_acento:document.getElementById("pr_dcfg_accent").value,titulo:document.getElementById("pr_dcfg_title").value.trim(),etiqueta:document.getElementById("pr_dcfg_label").value.trim()||"Propuesta recomendada",subtitulo:document.getElementById("pr_dcfg_subtitle").value.trim(),foto_portada_url:document.getElementById("pr_dcfg_photo").value.trim(),recomendada:valorCheck("pr_dcfg_recommended"),mostrar_inmueble:valorCheck("pr_dcfg_property"),mostrar_calculo:valorCheck("pr_dcfg_calc"),mostrar_equipos:valorCheck("pr_dcfg_equips"),mostrar_funcionamiento:valorCheck("pr_dcfg_rules"),mostrar_partidas:true,mostrar_incluye:valorCheck("pr_dcfg_include"),mostrar_no_incluye:valorCheck("pr_dcfg_exclude"),mostrar_garantia:valorCheck("pr_dcfg_warranty"),mostrar_pago:valorCheck("pr_dcfg_payment"),mostrar_plazo:valorCheck("pr_dcfg_term"),mostrar_firma:valorCheck("pr_dcfg_sign"),mostrar_contacto:valorCheck("pr_dcfg_contact"),modo_precios:document.getElementById("pr_dcfg_prices").value,introduccion:document.getElementById("pr_dcfg_intro").value.trim(),beneficios:document.getElementById("pr_dcfg_benefits").value.trim(),texto_empresa:document.getElementById("pr_dcfg_company_txt").value.trim(),incluye:document.getElementById("pr_dcfg_includes").value.trim(),no_incluye:document.getElementById("pr_dcfg_excludes").value.trim(),garantia:document.getElementById("pr_dcfg_warranty_txt").value.trim(),forma_pago:document.getElementById("pr_dcfg_payment_txt").value.trim(),plazo:document.getElementById("pr_dcfg_term_txt").value.trim(),validez_dias:Math.max(1,Math.round(numValor(document.getElementById("pr_dcfg_valid").value)||30)),cierre:document.getElementById("pr_dcfg_close").value.trim()};
  const cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?{...op.control_meta}:{};cm.dossier_meta=c;
  const btn=document.getElementById("pr_dcfg_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const q=await sb().from("proyectos_propuestas").update({control_meta:cm}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"dosier",accion:"configurado",resumen:"Dosier comercial configurado: "+op.nombre,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,estilo:c.estilo,modo_precios:c.modo_precios}}])}catch(e){}await cargarPropuestas(p.id);cerrarModal();abrirVistaDosier(p,op.id)}catch(e){alert("No se pudo guardar el diseño del dosier.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar diseño"}
}
async function abrirVistaDosier(p,opId){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para preparar la vista comercial.");return}
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const xs=await cargarPartidas(op.id),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id)),d=datosDossierVista(p,op,xs,calc),c=d.cfg,t=d.totales,meta=d.inmueble||{},benef=lineasTexto(c.beneficios),pri=hexValido(c.color_primario,"#0f766e"),acc=hexValido(c.color_acento,"#14b8a6");
  const portadaFoto=c.foto_portada_url?`<img class="zx_pr_dos_cover_img" src="${limpiar(c.foto_portada_url)}" alt="Portada" onerror="this.style.display='none'">`:"";
  const inmueble=c.mostrar_inmueble?`<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">EL PROYECTO</div><h3>${limpiar(d.cliente)}</h3><p>${limpiar(d.direccion||"Dirección pendiente")}</p><div class="zx_pr_dos_metrics">${meta.tipo_inmueble?`<div><span>Inmueble</span><b>${limpiar(meta.tipo_inmueble)}</b></div>`:""}${meta.superficie_calefactada_m2!=null?`<div><span>Superficie</span><b>${limpiar(meta.superficie_calefactada_m2)} m²</b></div>`:""}${meta.ocupantes!=null?`<div><span>Ocupantes</span><b>${limpiar(meta.ocupantes)} personas</b></div>`:""}${meta.banos!=null?`<div><span>Baños</span><b>${limpiar(meta.banos)} ud</b></div>`:""}</div></section>`:"";
  const info=[];if(c.mostrar_incluye&&c.incluye)info.push(["Qué incluye",c.incluye]);if(c.mostrar_no_incluye&&c.no_incluye)info.push(["Qué no incluye",c.no_incluye]);if(c.mostrar_garantia&&c.garantia)info.push(["Garantías",c.garantia]);if(c.mostrar_pago&&c.forma_pago)info.push(["Forma de pago",c.forma_pago]);if(c.mostrar_plazo&&c.plazo)info.push(["Plazo estimado",c.plazo]);
  const infoHTML=info.length?`<section class="zx_pr_dos_section"><div class="zx_pr_dos_kicker">CONDICIONES</div><div class="zx_pr_dos_info_grid">${info.map(([a,b])=>`<div><b>${limpiar(a)}</b><p>${lineasTexto(b).map(x=>limpiar(x)).join("<br>")}</p></div>`).join("")}</div><div class="zx_pr_dos_valid">Oferta válida durante <b>${limpiar(c.validez_dias)} días</b> desde su emisión.</div></section>`:"";
  const empresaHTML=c.texto_empresa?`<section class="zx_pr_dos_section zx_pr_dos_company"><div class="zx_pr_dos_kicker">NUESTRA EMPRESA</div><h3>${limpiar(d.emp.nombre||"Quién realizará el trabajo")}</h3><p>${lineasTexto(c.texto_empresa).map(x=>limpiar(x)).join("<br>")}</p></section>`:"";
  const contactos=[d.emp.telefono?`Tel. ${limpiar(d.emp.telefono)}`:"",d.emp.email?limpiar(d.emp.email):"",d.emp.web?limpiar(d.emp.web):""].filter(Boolean);
  const contactoHTML=c.mostrar_contacto!==false&&contactos.length?`<section class="zx_pr_dos_contact"><b>${limpiar(d.emp.nombre||"Contacto")}</b><span>${contactos.join(" · ")}</span></section>`:"";
  const est=estadoPropuesta(op),cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{},ps=cm.presupuesto_snapshot||{},ds=dossierSnapshot(op)||{};
  const fechaDoc=ds.enviado_at||ds.aceptado_at||ps.aceptado_at||ds.creado_at||new Date().toISOString();
  const aceptada=est==="aceptada",sustituida=est==="sustituida",cerrada=aceptada||sustituida;
  const firma=c.mostrar_firma&&!cerrada?`<section class="zx_pr_dos_accept"><span>SIGUIENTE PASO</span><h3>${limpiar(c.cierre||"Confirmar la opción elegida")}</h3><div><p>Cliente / firma</p><p>Fecha</p></div></section>`:"";
  const cierreAceptado=aceptada?`<section class="zx_pr_dos_accepted"><span>PROPUESTA ACEPTADA</span><h3>Esta opción ha sido confirmada.</h3><p>${ps.aceptado_at?`Aceptada el <b>${limpiar(fechaES(ps.aceptado_at))}</b>${ps.aceptado_por?` por <b>${limpiar(ps.aceptado_por)}</b>`:""}.`:"La opción figura como aceptada y queda guardada sin cambios."}</p></section>`:sustituida?`<section class="zx_pr_dos_accepted"><span>PROPUESTA SUSTITUIDA</span><h3>Esta versión ya no es la opción aceptada actual.</h3><p>Se conserva como versión histórica cerrada para consulta.</p></section>`:"";
  const brandName=d.emp.nombre||"";
  const brandHTML=d.emp.logo||brandName?`<div class="zx_pr_dos_brand">${d.emp.logo?`<img src="${limpiar(d.emp.logo)}" alt="Logo" onerror="this.style.display='none'">`:""}${brandName?`<b>${limpiar(brandName)}</b>`:""}</div>`:`<div class="zx_pr_dos_brand zx_pr_dos_brand_generic"><b>PROPUESTA PERSONALIZADA</b></div>`;
  const footerBrand=brandName||"Propuesta comercial";
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_dview_back" type="button">← Volver</button>${est==="borrador"?`<button id="pr_dview_config" class="primary" type="button">⚙️ Configurar</button>`:`<button type="button" disabled>${aceptada?"Aceptada":sustituida?"Sustituida":"Enviada"}</button>`}</div>
    <div class="zx_pr_dos_export_tools"><button id="pr_dview_pdf" type="button">📄 Compartir PDF</button><span>En iPhone abre la hoja para enviar, guardar en Archivos o imprimir.</span></div>
    <div class="zx_pr_dos_wrap zx_pr_dos_${limpiar(c.estilo)}" style="--dos-primary:${pri};--dos-accent:${acc}">
      <section class="zx_pr_dos_cover">${portadaFoto}<div class="zx_pr_dos_cover_overlay"></div>${brandHTML}<div class="zx_pr_dos_cover_text">${c.recomendada?`<span class="zx_pr_dos_badge">${limpiar(c.etiqueta||"Propuesta recomendada")}</span>`:""}<small>PROPUESTA COMERCIAL · ${limpiar(op.nombre||"")}</small><h1>${limpiar(c.titulo)}</h1><p>${limpiar(c.subtitulo||d.descripcion||d.proyecto)}</p><div>${limpiar(d.cliente)} · ${limpiar(fechaES(fechaDoc))}</div></div></section>
      <section class="zx_pr_dos_intro"><h2>Una propuesta pensada para tu instalación</h2><p>${limpiar(c.introduccion)}</p>${benef.length?`<div>${benef.map(x=>`<span>✓ ${limpiar(x)}</span>`).join("")}</div>`:""}</section>
      ${inmueble}
      ${d.descripcion?`<section class="zx_pr_dos_section zx_pr_dos_solution"><div class="zx_pr_dos_kicker">SOLUCIÓN PROPUESTA</div><h3>${limpiar(d.descripcion)}</h3><p>Una solución preparada con los equipos previstos y los apoyos definidos en el proyecto.</p></section>`:""}
      ${c.mostrar_calculo?dossierCalculoHTML(d.calc):""}
      ${c.mostrar_equipos?dossierEquiposHTML(d.generadores):""}
      ${c.mostrar_funcionamiento?dossierReglasHTML(d.reglas):""}
      ${dossierPrecioHTML(d.partidas,c,t)}
      ${infoHTML}
      ${empresaHTML}${contactoHTML}
      ${cierreAceptado}${firma}
      <footer class="zx_pr_dos_footer"><b>${limpiar(footerBrand)}</b><span>${limpiar(d.proyecto||op.nombre)}</span>${aceptada?`<small>Propuesta aceptada</small>`:sustituida?`<small>Propuesta sustituida</small>`:d.snapshot?`<small>Versión comercial guardada</small>`:"<small>Vista previa</small>"}</footer>
    </div>`);
  m.querySelector("#pr_dview_back").onclick=()=>{cerrarModal();abrirPresupuesto(p,op.id)};const b=m.querySelector("#pr_dview_config");if(b)b.onclick=()=>formularioDosier(p,op.id);const pdfBtn=m.querySelector("#pr_dview_pdf");if(pdfBtn)pdfBtn.onclick=async()=>{const original=pdfBtn.textContent;pdfBtn.disabled=true;pdfBtn.textContent="Preparando PDF…";try{await compartirPDFDosier(p,op,d)}finally{pdfBtn.disabled=false;pdfBtn.textContent=original}};
}

async function marcarPropuestaEnviada(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para cambiar el estado del presupuesto.");return}
  if(propuestaBloqueada(op))return;
  if(!confirm("¿Marcar esta opción como enviada al cliente? Se guardará una copia cerrada del dosier y del presupuesto. Esta acción registra el estado, pero todavía no envía un archivo por sí sola."))return;
  const u=sesion(),ahora=new Date().toISOString(),xs=await cargarPartidas(op.id),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id)),cfg=dossierMeta(p,op),cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?{...op.control_meta}:{};
  cm.dossier_meta=cfg;cm.dossier_snapshot=snapshotDossier(p,op,xs,calc,cfg);cm.dossier_snapshot.enviado_at=ahora;cm.dossier_snapshot.enviado_por=u.nombre||u.usuario||"";
  try{
    const q=await sb().from("proyectos_propuestas").update({estado:"enviada",control_meta:cm}).eq("id",op.id).select("*").single();if(q.error)throw q.error;
    const qp=await sb().from("proyectos").update({estado:"enviado",updated_at:ahora}).eq("id",p.id);if(qp.error)throw qp.error;
    try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"presupuesto",accion:"enviado",resumen:"Presupuesto marcado como enviado y dosier guardado: "+op.nombre,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,estado:"enviada",fecha:ahora,total:totalesPartidas(xs).total}}])}catch(e){}
    await cargar();await cargarPropuestas(p.id);abrirPresupuesto(CACHE.find(x=>String(x.id)===String(p.id))||p,op.id);
  }catch(e){alert("No se pudo cambiar el estado del presupuesto.\n"+(e&&e.message?e.message:""))}
}
async function aceptarPropuesta(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para aceptar la opción.");return}
  if(estadoPropuesta(op)!=="enviada"){alert("Primero marca el presupuesto como enviado.");return}
  if(!confirm("¿Confirmar la aceptación de esta opción? Al aceptar se bloquean sus reglas y partidas para conservar la versión aprobada."))return;
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),u=sesion(),ahora=new Date().toISOString(),aceptadoPor=u.nombre||u.usuario||"",calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id));
  const anteriorAceptada=PROPUESTAS.find(x=>String(x.id)!==String(op.id)&&propuestaAceptada(x))||null;
  const rs=reglasPropuesta(op).map(r=>({...r,generador_nombre_snapshot:r.generador_nombre_snapshot||nombreGeneradorId(r.generador_id),generador_referencia_nombre_snapshot:r.generador_referencia_id?(r.generador_referencia_nombre_snapshot||nombreGeneradorId(r.generador_referencia_id)):null}));
  const cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?{...op.control_meta}:{};
  if(!cm.dossier_snapshot){const cfg=dossierMeta(p,op);cm.dossier_meta=cfg;cm.dossier_snapshot=snapshotDossier(p,op,xs,calc,cfg)}
  cm.dossier_snapshot.aceptado_at=ahora;cm.dossier_snapshot.aceptado_por=aceptadoPor;
  cm.presupuesto_snapshot={aceptado_at:ahora,aceptado_por:aceptadoPor,proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",calculo:calc?"Versión "+calc.version:"Sin cálculo asociado",descripcion:op.descripcion||"",base_imponible:t.venta,iva:t.total-t.venta,total:t.total};
  try{
    const q=await sb().from("proyectos_propuestas").update({estado:"aceptada",aceptada_at:ahora,aceptada_por:aceptadoPor,estrategia_meta:rs,control_meta:cm,coste_total:t.coste,precio_venta:t.venta,total_cliente:t.total}).eq("id",op.id).select("*").single();if(q.error)throw q.error;
    const qp=await sb().from("proyectos").update({estado:"aceptado",updated_at:ahora}).eq("id",p.id);if(qp.error)throw qp.error;
    try{const hist=[{proyecto_id:p.id,tipo:"presupuesto",accion:"aceptado",resumen:"Opción aceptada y bloqueada: "+op.nombre,usuario_id:u.id||null,usuario:aceptadoPor,datos:{propuesta_id:op.id,estado:"aceptada",fecha:ahora,total:t.total,sustituye_propuesta_id:anteriorAceptada&&anteriorAceptada.id||null}}];if(anteriorAceptada)hist.unshift({proyecto_id:p.id,tipo:"presupuesto",accion:"sustituido",resumen:"Opción sustituida por una aceptación posterior: "+anteriorAceptada.nombre,usuario_id:u.id||null,usuario:aceptadoPor,datos:{propuesta_id:anteriorAceptada.id,nueva_propuesta_id:op.id,estado:"sustituida",fecha:ahora}});await sb().from("proyectos_historial").insert(hist)}catch(e){}
    await cargar();await cargarPropuestas(p.id);abrirPresupuesto(CACHE.find(x=>String(x.id)===String(p.id))||p,op.id);
  }catch(e){alert("No se pudo aceptar la opción.\n"+(e&&e.message?e.message:""))}
}
async function abrirPresupuesto(p,opId){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para consultar el presupuesto.");return}
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id)),ivaTotal=t.total-t.venta,rs=reglasPropuesta(op),est=estadoPropuesta(op),snap=op.control_meta&&op.control_meta.presupuesto_snapshot,dosSnap=dossierSnapshot(op);
  const cerrada=est==="aceptada"||est==="sustituida";
  const proyectoVista=cerrada&&snap&&snap.proyecto?snap.proyecto:p.nombre;
  const clienteVista=cerrada&&snap&&snap.cliente?snap.cliente:nombreCliente(p.cliente_id);
  const direccionVista=cerrada&&snap&&snap.direccion?snap.direccion:(proyectoDir(p)||"Sin dirección seleccionada");
  const calculoVista=cerrada&&snap&&snap.calculo?snap.calculo:(calc?"Versión "+calc.version:"Sin cálculo asociado");
  const accionTop=est==="aceptada"?`<button type="button" disabled>Aceptada</button>`:est==="sustituida"?`<button type="button" disabled>Sustituida</button>`:est==="enviada"?`<button id="pr_quote_accept" class="primary" type="button">✓ Aceptar opción</button>`:`<button id="pr_quote_send" class="primary" type="button">Marcar enviada</button>`;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_quote_back" type="button">← Volver</button>${accionTop}</div>
    <div class="zx_pr_form_head"><span>PRESUPUESTO COMERCIAL · ${limpiar(textoEstadoPropuesta(est).toUpperCase())}</span><h2>${limpiar(op.nombre)}</h2></div>
    ${est==="aceptada"?`<div class="zx_pr_info"><b>Opción aceptada y bloqueada</b><span>${snap&&snap.aceptado_at?"Aceptada el "+limpiar(fechaES(snap.aceptado_at))+(snap.aceptado_por?" por "+limpiar(snap.aceptado_por):""):"Las reglas y partidas no se pueden modificar."}</span></div>`:est==="sustituida"?`<div class="zx_pr_info"><b>Opción sustituida y bloqueada</b><span>Esta versión fue aceptada anteriormente y ha sido sustituida por otra opción posterior. Se conserva sin cambios.</span></div>`:""}
    <div class="zx_pr_dossier_tools"><button id="pr_quote_dossier" type="button">✨ Vista dosier</button>${est==="borrador"?`<button id="pr_quote_dossier_cfg" type="button">⚙️ Configurar dosier</button>`:dosSnap?`<span>Dosier comercial guardado con esta versión</span>`:`<span>Esta opción es anterior al dosier; la vista se genera con sus datos bloqueados</span>`}</div>
    ${est==="aceptada"?`<div class="zx_pr_work_tools"><button id="pr_quote_work" type="button">${trabajoIdPropuesta(op)?"🔧 Abrir trabajo":"🛠 Crear trabajo"}</button><span>${trabajoIdPropuesta(op)?"Esta propuesta ya tiene un trabajo vinculado.":"Se abrirá el formulario normal de Trabajos con los datos de la propuesta ya preparados. Revisa responsable, fecha, horario y equipo antes de guardar."}</span></div>`:""}
    <div class="zx_pr_quote_head"><div><span>Proyecto</span><b>${limpiar(proyectoVista)}</b></div><div><span>Cliente</span><b>${limpiar(clienteVista)}</b></div><div><span>Dirección</span><b>${limpiar(direccionVista)}</b></div><div><span>Cálculo</span><b>${limpiar(calculoVista)}</b></div></div>
    ${op.descripcion?`<div class="zx_pr_info"><b>Solución propuesta</b><span>${limpiar(op.descripcion)}</span></div>`:""}
    ${rs.length?`<div class="zx_pr_section"><h3>Funcionamiento previsto</h3>${rs.map((r,i)=>`<div class="zx_pr_rule_resume"><b>${i+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))} · ${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.condicion_tipo==="fallo_generador"&&r.generador_referencia_id?" · si falla "+limpiar(nombreGeneradorRelacionadoRegla(r)):""}</span></div>`).join("")}</div>`:""}
    <div class="zx_pr_section"><h3>Partidas</h3><div class="zx_pr_quote_lines">${presupuestoPartidasHTML(xs)}</div></div>
    <div class="zx_pr_quote_totals"><div><span>Base imponible</span><b>${eur(t.venta)}</b></div><div><span>IVA</span><b>${eur(ivaTotal)}</b></div><div class="total"><span>Total presupuesto</span><b>${eur(t.total)}</b></div></div>
    <div class="zx_pr_info"><b>Vista para cliente</b><span>${est==="aceptada"?"Esta opción queda bloqueada como versión aceptada. La vista del dosier conserva la copia comercial guardada al enviar.":est==="sustituida"?"Esta versión queda bloqueada como propuesta histórica sustituida. Su dosier se conserva para consulta.":est==="enviada"?"El presupuesto figura como enviado y el dosier comercial ya tiene una copia cerrada. Si el cliente lo aprueba, usa Aceptar opción.":"Configura y revisa el dosier antes de marcar la oferta como enviada. Al hacerlo se guardará una copia cerrada de esta presentación."}</span></div>`);
  m.querySelector("#pr_quote_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const dv=m.querySelector("#pr_quote_dossier");if(dv)dv.onclick=()=>abrirVistaDosier(p,op.id);
  const dc=m.querySelector("#pr_quote_dossier_cfg");if(dc)dc.onclick=()=>formularioDosier(p,op.id);
  const send=m.querySelector("#pr_quote_send");if(send)send.onclick=()=>marcarPropuestaEnviada(p,op);
  const accept=m.querySelector("#pr_quote_accept");if(accept)accept.onclick=()=>aceptarPropuesta(p,op);
  const work=m.querySelector("#pr_quote_work");if(work)work.onclick=()=>{const id=trabajoIdPropuesta(op);return id?abrirTrabajoVinculado(id,p):crearTrabajoDesdePropuesta(p,op)};
}
function conectarEstrategia(p){const n=document.getElementById("pr_op_nueva");if(n)n.onclick=()=>formularioOpcionTecnica(p);document.querySelectorAll("[data-pr-option-edit]").forEach(b=>b.onclick=()=>formularioEditarOpcionTecnica(p,PROPUESTAS.find(x=>String(x.id)===String(b.dataset.prOptionEdit))));document.querySelectorAll("[data-pr-strategy-open]").forEach(b=>b.onclick=()=>abrirEstrategia(p,b.dataset.prStrategyOpen));document.querySelectorAll("[data-pr-budget-open]").forEach(b=>b.onclick=()=>abrirPartidas(p,b.dataset.prBudgetOpen));document.querySelectorAll("[data-pr-quote-open]").forEach(b=>b.onclick=()=>abrirPresupuesto(p,b.dataset.prQuoteOpen))}


window.ZX_PROYECTOS_VINCULAR_TRABAJO=async function(ctx,trabajoId){
  const c=ctx&&typeof ctx==="object"?ctx:{};
  const proyectoId=String(c.proyecto_id||"").trim();
  const propuestaId=String(c.propuesta_id||"").trim();
  const idTrabajo=String(trabajoId||"").trim();
  if(!proyectoId||!propuestaId||!idTrabajo||!sb()||!navigator.onLine)return false;

  try{
    const actual=await sb().from("proyectos_propuestas").select("*").eq("id",propuestaId).maybeSingle();
    if(actual.error)throw actual.error;
    if(!actual.data||estadoPropuesta(actual.data)!=="aceptada")throw new Error("La propuesta ya no figura como aceptada.");

    const cm=actual.data.control_meta&&typeof actual.data.control_meta==="object"&&!Array.isArray(actual.data.control_meta)?{...actual.data.control_meta}:{};
    const previo=String(cm.trabajo_id||"").trim();
    if(previo&&previo!==idTrabajo)throw new Error("Esta propuesta ya está vinculada a otro trabajo.");

    const ahora=new Date().toISOString(),u=sesion();
    cm.trabajo_id=idTrabajo;
    cm.trabajo_creado_at=cm.trabajo_creado_at||ahora;
    cm.trabajo_creado_por=cm.trabajo_creado_por||u.nombre||u.usuario||"";
    const q=await sb().from("proyectos_propuestas").update({control_meta:cm}).eq("id",propuestaId).select("*").single();
    if(q.error)throw q.error;

    const qp=await sb().from("proyectos").update({estado:"ejecucion",updated_at:ahora}).eq("id",proyectoId).select("*").single();
    if(qp.error)throw qp.error;

    try{
      await sb().from("proyectos_historial").insert([{
        proyecto_id:proyectoId,
        tipo:"trabajo",
        accion:"creado",
        resumen:"Trabajo creado desde la propuesta aceptada: "+String(c.propuesta_nombre||actual.data.nombre||""),
        usuario_id:u.id||null,
        usuario:u.nombre||u.usuario||"",
        datos:{propuesta_id:propuestaId,trabajo_id:idTrabajo,fecha:ahora}
      }]);
    }catch(e){}

    const pi=PROPUESTAS.findIndex(x=>String(x.id)===propuestaId);
    if(pi>=0)PROPUESTAS[pi]=q.data;
    const ci=CACHE.findIndex(x=>String(x.id)===proyectoId);
    if(ci>=0){CACHE[ci]=qp.data;guardarCache(CACHE)}
    return true;
  }catch(e){
    console.warn("Zentryx Proyectos: no se pudo vincular el trabajo",e);
    return false;
  }
};


function metaExtraccionProyecto(p){
  const m=p&&p.inmueble_meta&&typeof p.inmueble_meta==="object"&&!Array.isArray(p.inmueble_meta)?p.inmueble_meta:{};
  const x=m.extraccion&&typeof m.extraccion==="object"&&!Array.isArray(m.extraccion)?m.extraccion:{};
  return Object.assign({version:1,simultaneidad_pct:100,margen_pct:10,zonas:[]},x,{zonas:Array.isArray(x.zonas)?x.zonas:[]});
}
function materialesExtractorActivos(){return MATERIALES.filter(m=>materialTecnicoActivo(m)&&categoriaTecnicaMaterial(tecnicoMaterial(m))==="extraccion")}
function opcionesExtractorCatalogo(sel){
  const xs=materialesExtractorActivos(),actual=sel?MATERIALES.find(m=>String(m.id)===String(sel)):null;
  let html='<option value="">Sin extractor del catálogo técnico</option>';
  if(actual&&!xs.some(m=>String(m.id)===String(actual.id)))html+=`<option value="${limpiar(actual.id)}" selected disabled>${limpiar(materialTexto(actual)||actual.nombre||"Extractor")} · vínculo histórico</option>`;
  return html+xs.map(m=>`<option value="${limpiar(m.id)}" ${String(sel)===String(m.id)?"selected":""}>${limpiar(materialTexto(m)||m.nombre||"Extractor")}${m.referencia?" · "+limpiar(m.referencia):""}</option>`).join("");
}
function numeroEspecificacionTecnica(origen,nombres){
  const t=origen&&origen.tecnico_meta?origen.tecnico_meta:tecnicoMaterial(origen),aliases=(nombres||[]).map(normalizar),xs=especificacionesTecnicas(t);
  const e=xs.find(x=>aliases.some(a=>normalizar(x.nombre).includes(a)));if(!e)return null;
  const raw=String(e.valor??"").trim().replace(",","."),n=Number(raw);if(!Number.isFinite(n))return null;
  return {valor:n,medida:medidaTecnicaCanonica(e.medida||"")};
}
function datosExtractorTecnico(origen){
  if(!origen)return {caudal_m3h:null,presion_pa:null,potencia_w:null,sonido_dba:null};
  const ca=numeroEspecificacionTecnica(origen,["caudal de aire","caudal"]),pr=numeroEspecificacionTecnica(origen,["presion disponible","presion estatica","presion"]),po=numeroEspecificacionTecnica(origen,["potencia electrica","potencia"]),so=numeroEspecificacionTecnica(origen,["nivel sonoro","sonoridad","ruido"]);
  let q=ca&&ca.valor!=null?ca.valor:null;if(q!=null&&["L/s","l/s"].includes(ca.medida))q*=3.6;if(q!=null&&ca.medida==="m³/s")q*=3600;
  let p=pr&&pr.valor!=null?pr.valor:null;if(p!=null&&pr.medida==="kPa")p*=1000;if(p!=null&&pr.medida==="mbar")p*=100;
  let w=po&&po.valor!=null?po.valor:null;if(w!=null&&po.medida==="kW")w*=1000;
  return {caudal_m3h:q,presion_pa:p,potencia_w:w,sonido_dba:so&&so.valor!=null?so.valor:null};
}
function nExt(v,def=0){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:def}
function calcZonaExtraccion(z){
  const superficie=Math.max(0,nExt(z.superficie_m2)),altura=Math.max(0,nExt(z.altura_m,2.5)),volumen=superficie*altura,modo=z.modo_calculo==="caudal"?"caudal":"renovaciones",ren=Math.max(0,nExt(z.renovaciones_h)),manual=Math.max(0,nExt(z.caudal_manual_m3h));
  const caudal=modo==="caudal"?manual:volumen*ren,forma=z.forma_conducto||"sin_dimensionar";let area=0,dh=0;
  if(forma==="circular"){const d=Math.max(0,nExt(z.diametro_mm))/1000;if(d>0){area=Math.PI*d*d/4;dh=d}}
  if(forma==="rectangular"){const a=Math.max(0,nExt(z.ancho_mm))/1000,b=Math.max(0,nExt(z.alto_mm))/1000;if(a>0&&b>0){area=a*b;dh=2*a*b/(a+b)}}
  const velocidad=area>0?caudal/3600/area:null,longitud=Math.max(0,nExt(z.longitud_m)),codos=Math.max(0,nExt(z.codos)),bocas=Math.max(0,nExt(z.bocas)),compuertas=Math.max(0,nExt(z.compuertas)),extra=Math.max(0,nExt(z.presion_adicional_pa));
  const qdyn=velocidad!=null?0.6*velocidad*velocidad:0,friccion=(velocidad!=null&&dh>0)?0.02*(longitud/dh)*qdyn:0,locales=qdyn*(0.9*codos+1.5*bocas+1.2*compuertas),perdida=(velocidad!=null?friccion+locales:0)+extra;
  return {superficie_m2:redondearCalc(superficie,2),altura_m:redondearCalc(altura,2),volumen_m3:redondearCalc(volumen,2),caudal_m3h:redondearCalc(caudal,1),velocidad_ms:velocidad==null?null:redondearCalc(velocidad,2),perdida_pa:redondearCalc(perdida,1)};
}
function resumenExtraccion(p){
  const x=metaExtraccionProyecto(p),zs=x.zonas.map(z=>Object.assign({},z,calcZonaExtraccion(z))).filter(z=>z.caudal_m3h>0),sim=Math.min(100,Math.max(0,nExt(x.simultaneidad_pct,100))),margen=Math.max(0,nExt(x.margen_pct,10)),base=zs.reduce((s,z)=>s+z.caudal_m3h,0),q=base*(sim/100)*(1+margen/100),pres=zs.reduce((m,z)=>Math.max(m,nExt(z.perdida_pa)),0)*(1+margen/100),snap=x.extractor_snapshot||null,datos=datosExtractorTecnico(snap),cumpleQ=datos.caudal_m3h==null?null:datos.caudal_m3h>=q,cumpleP=datos.presion_pa==null?null:datos.presion_pa>=pres;
  return {config:x,zonas:zs,caudal_base_m3h:redondearCalc(base,1),caudal_diseno_m3h:redondearCalc(q,1),presion_diseno_pa:redondearCalc(pres,1),extractor:datos,cumpleQ,cumpleP};
}
function estadoExtractorHTML(r){
  if(!r.config.extractor_snapshot)return '<span class="zx_pr_extract_status is-pending">Extractor sin seleccionar</span>';
  if(r.cumpleQ===false||r.cumpleP===false)return '<span class="zx_pr_extract_status is-bad">Revisar selección</span>';
  if(r.cumpleQ===true&&r.cumpleP===true)return '<span class="zx_pr_extract_status is-ok">Cumple preliminarmente</span>';
  return '<span class="zx_pr_extract_status is-pending">Faltan datos de catálogo para comprobar</span>';
}
function bloqueExtraccionFichaHTML(p){
  if(!especialidadesProyecto(p).includes("extraccion"))return "";
  const r=resumenExtraccion(p),x=r.config,snap=x.extractor_snapshot,nombre=snap?(materialTexto(snap)||snap.nombre||"Extractor seleccionado"):"Sin seleccionar";
  return `<section class="zx_pr_section zx_pr_extract_section"><div class="zx_pr_section_head"><div><h3>Extracción</h3><span>${r.zonas.length} zona(s) calculada(s)</span></div>${puedeEditar()?`<button id="pr_extract_edit" class="zx_pr_small_primary" type="button">${r.zonas.length?"Editar extracción":"Configurar extracción"}</button>`:""}</div><div class="zx_pr_extract_summary"><div><span>Caudal de diseño</span><b>${r.caudal_diseno_m3h>0?limpiar(r.caudal_diseno_m3h)+" m³/h":"Sin calcular"}</b></div><div><span>Presión de diseño</span><b>${r.presion_diseno_pa>0?limpiar(r.presion_diseno_pa)+" Pa":"Sin calcular"}</b></div><div><span>Simultaneidad</span><b>${limpiar(x.simultaneidad_pct??100)} %</b></div><div><span>Margen</span><b>${limpiar(x.margen_pct??10)} %</b></div></div>${r.zonas.length?`<div class="zx_pr_extract_list">${r.zonas.map(z=>`<div><b>${limpiar(z.nombre||z.uso||"Zona")}</b><span>${limpiar(z.caudal_m3h)} m³/h${z.velocidad_ms!=null?" · "+limpiar(z.velocidad_ms)+" m/s":""}${z.perdida_pa>0?" · "+limpiar(z.perdida_pa)+" Pa":""}</span></div>`).join("")}</div>`:`<div class="zx_pr_empty">Extracción está activa, pero todavía no tiene zonas calculadas.</div>`}<div class="zx_pr_extract_equipment"><span>Extractor seleccionado</span><b>${limpiar(nombre)}</b>${snap?estadoExtractorHTML(r):""}</div>${x.descarga?`<div class="zx_pr_calc_help zx_pr_spec_help">Descarga prevista: ${limpiar(x.descarga)}</div>`:""}</section>`;
}
function zonaExtraccionHTML(z={}){
  const c=calcZonaExtraccion(z),modo=z.modo_calculo==="caudal"?"caudal":"renovaciones",forma=z.forma_conducto||"sin_dimensionar";
  return `<div class="zx_pr_extract_zone"><div class="zx_pr_room_head"><b>Zona de extracción</b><button type="button" data-pr-extract-del>Eliminar</button></div><div class="zx_pr_grid2"><label>Nombre / uso<input data-pr-extract="nombre" value="${limpiar(z.nombre||"")}" placeholder="Baño, cocina, taller, sala técnica…"></label><label>Tipo de captación<select data-pr-extract="captacion">${[["general","General"],["bano","Baño"],["cocina","Cocina"],["campana","Campana / captación localizada"],["local","Local"],["garaje","Garaje"],["sala_tecnica","Sala técnica"],["taller","Taller"],["otro","Otro"]].map(([v,n])=>`<option value="${v}" ${(z.captacion||"general")===v?"selected":""}>${n}</option>`).join("")}</select></label><label>Superficie <span class="zx_pr_unit">m²</span><input data-pr-extract="superficie_m2" type="number" min="0" step="0.1" inputmode="decimal" value="${limpiar(z.superficie_m2??"")}"></label><label>Altura <span class="zx_pr_unit">m</span><input data-pr-extract="altura_m" type="number" min="0" step="0.1" inputmode="decimal" value="${limpiar(z.altura_m??2.5)}"></label><label>Método de caudal<select data-pr-extract="modo_calculo"><option value="renovaciones" ${modo==="renovaciones"?"selected":""}>Renovaciones por hora</option><option value="caudal" ${modo==="caudal"?"selected":""}>Caudal directo</option></select></label><label>Renovaciones <span class="zx_pr_unit">1/h</span><input data-pr-extract="renovaciones_h" type="number" min="0" step="0.1" inputmode="decimal" value="${limpiar(z.renovaciones_h??"")}"></label><label>Caudal directo <span class="zx_pr_unit">m³/h</span><input data-pr-extract="caudal_manual_m3h" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(z.caudal_manual_m3h??"")}"></label><label>Forma del conducto<select data-pr-extract="forma_conducto"><option value="sin_dimensionar" ${forma==="sin_dimensionar"?"selected":""}>Sin dimensionar</option><option value="circular" ${forma==="circular"?"selected":""}>Circular</option><option value="rectangular" ${forma==="rectangular"?"selected":""}>Rectangular</option></select></label><label>Diámetro <span class="zx_pr_unit">mm</span><input data-pr-extract="diametro_mm" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(z.diametro_mm??"")}"></label><label>Ancho <span class="zx_pr_unit">mm</span><input data-pr-extract="ancho_mm" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(z.ancho_mm??"")}"></label><label>Alto <span class="zx_pr_unit">mm</span><input data-pr-extract="alto_mm" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(z.alto_mm??"")}"></label><label>Longitud de conducto <span class="zx_pr_unit">m</span><input data-pr-extract="longitud_m" type="number" min="0" step="0.1" inputmode="decimal" value="${limpiar(z.longitud_m??"")}"></label><label>Codos <span class="zx_pr_unit">ud</span><input data-pr-extract="codos" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(z.codos??0)}"></label><label>Bocas / rejillas <span class="zx_pr_unit">ud</span><input data-pr-extract="bocas" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(z.bocas??0)}"></label><label>Compuertas <span class="zx_pr_unit">ud</span><input data-pr-extract="compuertas" type="number" min="0" step="1" inputmode="numeric" value="${limpiar(z.compuertas??0)}"></label><label>Presión adicional <span class="zx_pr_unit">Pa</span><input data-pr-extract="presion_adicional_pa" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(z.presion_adicional_pa??0)}"></label></div><div class="zx_pr_room_results zx_pr_extract_results"><span>Volumen<b data-pr-extract-result="volumen">${c.volumen_m3>0?limpiar(c.volumen_m3)+" m³":"—"}</b></span><span>Caudal<b data-pr-extract-result="caudal">${c.caudal_m3h>0?limpiar(c.caudal_m3h)+" m³/h":"—"}</b></span><span>Velocidad<b data-pr-extract-result="velocidad">${c.velocidad_ms!=null?limpiar(c.velocidad_ms)+" m/s":"—"}</b></span><span>Pérdida estimada<b data-pr-extract-result="perdida">${c.perdida_pa>0?limpiar(c.perdida_pa)+" Pa":"—"}</b></span></div></div>`;
}
function leerZonaExtraccion(card){const g=k=>card.querySelector(`[data-pr-extract="${k}"]`),v=k=>g(k)?g(k).value:"";return {nombre:v("nombre").trim(),captacion:v("captacion")||"general",superficie_m2:nExt(v("superficie_m2"),0),altura_m:nExt(v("altura_m"),2.5),modo_calculo:v("modo_calculo")||"renovaciones",renovaciones_h:nExt(v("renovaciones_h"),0),caudal_manual_m3h:nExt(v("caudal_manual_m3h"),0),forma_conducto:v("forma_conducto")||"sin_dimensionar",diametro_mm:nExt(v("diametro_mm"),0),ancho_mm:nExt(v("ancho_mm"),0),alto_mm:nExt(v("alto_mm"),0),longitud_m:nExt(v("longitud_m"),0),codos:nExt(v("codos"),0),bocas:nExt(v("bocas"),0),compuertas:nExt(v("compuertas"),0),presion_adicional_pa:nExt(v("presion_adicional_pa"),0)}}
function zonasExtraccionFormulario(){return [...document.querySelectorAll(".zx_pr_extract_zone")].map(leerZonaExtraccion)}
function pintarZonaExtraccion(card){const c=calcZonaExtraccion(leerZonaExtraccion(card)),set=(k,t)=>{const e=card.querySelector(`[data-pr-extract-result="${k}"]`);if(e)e.textContent=t};set("volumen",c.volumen_m3>0?c.volumen_m3+" m³":"—");set("caudal",c.caudal_m3h>0?c.caudal_m3h+" m³/h":"—");set("velocidad",c.velocidad_ms!=null?c.velocidad_ms+" m/s":"—");set("perdida",c.perdida_pa>0?c.perdida_pa+" Pa":"—")}
function resumenExtraccionFormulario(){
  const zs=zonasExtraccionFormulario().map(z=>Object.assign({},z,calcZonaExtraccion(z))).filter(z=>z.caudal_m3h>0),sim=Math.min(100,Math.max(0,nExt(document.getElementById("pr_extract_sim")?.value,100))),margen=Math.max(0,nExt(document.getElementById("pr_extract_margin")?.value,10)),base=zs.reduce((s,z)=>s+z.caudal_m3h,0),q=base*(sim/100)*(1+margen/100),p=zs.reduce((m,z)=>Math.max(m,nExt(z.perdida_pa)),0)*(1+margen/100),sel=document.getElementById("pr_extract_catalogo")?.value||"",mat=MATERIALES.find(m=>String(m.id)===String(sel)),datos=datosExtractorTecnico(mat),box=document.getElementById("pr_extract_resume");
  if(box)box.innerHTML=`<div><span>Caudal base</span><b>${redondearCalc(base,1)} m³/h</b></div><div><span>Caudal de diseño</span><b>${redondearCalc(q,1)} m³/h</b></div><div><span>Presión de diseño</span><b>${redondearCalc(p,1)} Pa</b></div><div><span>Extractor</span><b>${mat?limpiar(materialTexto(mat)||mat.nombre||"Seleccionado"):"Sin seleccionar"}</b></div>`;
  const info=document.getElementById("pr_extract_catalogo_info");if(info){if(!mat)info.innerHTML="Selecciona un artículo clasificado como Extracción en el Catálogo técnico para comparar caudal y presión.";else{const cq=datos.caudal_m3h==null?null:datos.caudal_m3h>=q,cp=datos.presion_pa==null?null:datos.presion_pa>=p;info.innerHTML=`<b>${limpiar(materialTexto(mat)||mat.nombre||"Extractor")}</b><span>${datos.caudal_m3h!=null?limpiar(redondearCalc(datos.caudal_m3h,1))+" m³/h":"Caudal sin indicar"} · ${datos.presion_pa!=null?limpiar(redondearCalc(datos.presion_pa,1))+" Pa":"Presión sin indicar"}</span>${cq===false||cp===false?'<em class="is-bad">Revisar selección</em>':cq===true&&cp===true?'<em class="is-ok">Cumple preliminarmente</em>':'<em>Faltan datos para comprobar</em>'}`}}
  return {zonas:zs,caudal_base_m3h:redondearCalc(base,1),caudal_diseno_m3h:redondearCalc(q,1),presion_diseno_pa:redondearCalc(p,1),simultaneidad_pct:sim,margen_pct:margen};
}
function conectarZonaExtraccion(card){card.querySelectorAll("input,select").forEach(e=>{e.oninput=()=>{pintarZonaExtraccion(card);resumenExtraccionFormulario()};e.onchange=()=>{pintarZonaExtraccion(card);resumenExtraccionFormulario()}});const d=card.querySelector("[data-pr-extract-del]");if(d)d.onclick=()=>{card.remove();resumenExtraccionFormulario()};pintarZonaExtraccion(card)}
function agregarZonaExtraccion(datos={}){const box=document.getElementById("pr_extract_zones");if(!box)return;const w=document.createElement("div");w.innerHTML=zonaExtraccionHTML(datos);const card=w.firstElementChild;box.appendChild(card);conectarZonaExtraccion(card);resumenExtraccionFormulario()}
function formularioExtraccion(p){
  const x=metaExtraccionProyecto(p),m=modal(`<div class="zx_pr_top_actions"><button id="pr_extract_back" type="button">← Volver</button><button id="pr_extract_save" class="primary" type="button">Guardar extracción</button></div><div class="zx_pr_form_head"><span>EXTRACCIÓN · CÁLCULO PRELIMINAR</span><h2>${limpiar(p.nombre)}</h2></div><div class="zx_pr_info"><b>Dimensionamiento orientativo de extracción</b><span>Calcula caudales por zona, velocidad en conductos y una pérdida de presión aproximada. Debe contrastarse con la normativa aplicable y con las curvas reales del fabricante antes de ejecutar la instalación.</span></div><div class="zx_pr_section"><h3>Criterios generales</h3><div class="zx_pr_grid2"><label>Simultaneidad <span class="zx_pr_unit">%</span><input id="pr_extract_sim" type="number" min="0" max="100" step="1" inputmode="decimal" value="${limpiar(x.simultaneidad_pct??100)}"></label><label>Margen de selección <span class="zx_pr_unit">%</span><input id="pr_extract_margin" type="number" min="0" step="1" inputmode="decimal" value="${limpiar(x.margen_pct??10)}"></label></div><label>Punto de descarga / salida<input id="pr_extract_descarga" value="${limpiar(x.descarga||"")}" placeholder="Cubierta, fachada, conducto común…"></label></div><div class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Zonas de extracción</h3><span>Calcula cada recorrido por separado</span></div><button id="pr_extract_add" class="zx_pr_small_primary" type="button">＋ Añadir zona</button></div><div id="pr_extract_zones" class="zx_pr_extract_zones">${x.zonas.map(z=>zonaExtraccionHTML(z)).join("")}</div></div><div class="zx_pr_section"><h3>Extractor</h3><label>Extractor del catálogo técnico<select id="pr_extract_catalogo">${opcionesExtractorCatalogo(x.extractor_material_id||"")}</select></label><div id="pr_extract_catalogo_info" class="zx_pr_extract_catalog_info"></div></div><div class="zx_pr_section"><h3>Resultados de diseño</h3><div id="pr_extract_resume" class="zx_pr_extract_summary"></div></div><label>Notas técnicas<textarea id="pr_extract_notas" rows="4" placeholder="Criterio empleado, condicionantes, normativa, observaciones…">${limpiar(x.notas||"")}</textarea></label>`);
  m.querySelector("#pr_extract_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};m.querySelector("#pr_extract_add").onclick=()=>agregarZonaExtraccion({altura_m:2.5,modo_calculo:"renovaciones",forma_conducto:"sin_dimensionar",codos:0,bocas:0,compuertas:0,presion_adicional_pa:0});m.querySelector("#pr_extract_save").onclick=()=>guardarExtraccion(p);[...m.querySelectorAll(".zx_pr_extract_zone")].forEach(conectarZonaExtraccion);["pr_extract_sim","pr_extract_margin"].forEach(id=>{const e=m.querySelector("#"+id);e.oninput=resumenExtraccionFormulario;e.onchange=resumenExtraccionFormulario});m.querySelector("#pr_extract_catalogo").onchange=resumenExtraccionFormulario;resumenExtraccionFormulario();
}
async function guardarExtraccion(p){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar la extracción.");return}
  const r=resumenExtraccionFormulario(),zonas=zonasExtraccionFormulario().filter(z=>calcZonaExtraccion(z).caudal_m3h>0);if(!zonas.length){alert("Añade al menos una zona con caudal mayor que 0 m³/h.");return}if(zonas.some(z=>!z.nombre)){alert("Escribe el nombre o uso de todas las zonas de extracción.");return}
  const sel=document.getElementById("pr_extract_catalogo").value||"",mat=MATERIALES.find(m=>String(m.id)===String(sel)),u=sesion(),meta=p.inmueble_meta&&typeof p.inmueble_meta==="object"&&!Array.isArray(p.inmueble_meta)?{...p.inmueble_meta}:{},prev=metaExtraccionProyecto(p),mismoExtractor=String(sel||"")===String(prev.extractor_material_id||""),extractorSnapshot=sel?(mismoExtractor&&prev.extractor_snapshot?prev.extractor_snapshot:(mat?snapshotMaterialTecnico(mat):null)):null,ahora=new Date().toISOString();
  meta.extraccion={version:1,simultaneidad_pct:r.simultaneidad_pct,margen_pct:r.margen_pct,descarga:document.getElementById("pr_extract_descarga").value.trim()||null,zonas,caudal_base_m3h:r.caudal_base_m3h,caudal_diseno_m3h:r.caudal_diseno_m3h,presion_diseno_pa:r.presion_diseno_pa,extractor_material_id:sel||null,extractor_snapshot:extractorSnapshot,notas:document.getElementById("pr_extract_notas").value.trim()||null,actualizado_at:ahora,actualizado_por:u.nombre||u.usuario||""};
  const btn=document.getElementById("pr_extract_save");btn.disabled=true;btn.textContent="Guardando…";try{const q=await sb().from(TABLA).update({inmueble_meta:meta,updated_at:ahora}).eq("id",p.id).select("*").single();if(q.error)throw q.error;try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"extraccion",accion:"editado",resumen:`Extracción actualizada · ${zonas.length} zona(s) · ${r.caudal_diseno_m3h} m³/h`,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{zonas:zonas.length,caudal_diseno_m3h:r.caudal_diseno_m3h,presion_diseno_pa:r.presion_diseno_pa,extractor_material_id:mat?mat.id:null}}])}catch(e){}const i=CACHE.findIndex(x=>String(x.id)===String(p.id));if(i>=0){CACHE[i]=q.data;guardarCache(CACHE)}cerrarModal();abrirFicha(p.id)}catch(e){alert("No se pudo guardar la extracción.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar extracción"}
}

async function abrirFicha(id){
  let p=CACHE.find(x=>String(x.id)===String(id));
  if(!p&&sb()&&navigator.onLine){const r=await sb().from(TABLA).select("*").eq("id",id).maybeSingle();if(!r.error)p=r.data}
  if(!p){alert("Proyecto no encontrado.");return}
  await Promise.all([cargarGeneradores(p.id),cargarCalculos(p.id),cargarPropuestas(p.id)]);
  const meta=p.inmueble_meta||{},d=proyectoDir(p);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_ficha_back" type="button">← Volver</button>${puedeEditar()?`<button id="pr_ficha_edit" class="primary" type="button">✏️ Editar</button>`:"<button id=\"pr_ficha_close\" type=\"button\">Cerrar</button>"}</div>
    <div class="zx_pr_ficha_head"><span>FICHA DE PROYECTO</span><h2>${limpiar(p.nombre)}</h2><div><span class="${estadoClass(p.estado)}">${limpiar(textoEstado(p.estado))}</span></div></div>
    <section class="zx_pr_section"><h3>Datos principales</h3><div class="zx_pr_viewgrid"><div><span>Cliente</span><b>${limpiar(nombreCliente(p.cliente_id))}</b></div><div><span>Tipo</span><b>${limpiar(textoTipo(p.tipo))}</b></div><div><span>Dirección</span><b>${limpiar(d||"Sin dirección seleccionada")}</b></div><div><span>Comercial</span><b>${limpiar(nombreUsuario(p.comercial_id)||"Sin asignar")}</b></div><div><span>Técnico</span><b>${limpiar(nombreUsuario(p.tecnico_id)||"Sin asignar")}</b></div><div><span>Creado</span><b>${limpiar(fechaES(p.created_at))}</b></div></div></section>
    <section class="zx_pr_section"><h3>Inmueble</h3><div class="zx_pr_viewgrid"><div><span>Tipo</span><b>${limpiar(meta.tipo_inmueble||"Sin indicar")}</b></div><div><span>Superficie calefactada</span><b>${meta.superficie_calefactada_m2!=null?limpiar(meta.superficie_calefactada_m2)+" m²":"Sin indicar"}</b></div><div><span>Plantas</span><b>${meta.plantas!=null?limpiar(meta.plantas)+" ud":"Sin indicar"}</b></div><div><span>Año construcción</span><b>${limpiar(meta.ano_construccion||"Sin indicar")}</b></div><div><span>Ocupantes</span><b>${meta.ocupantes!=null?limpiar(meta.ocupantes)+" personas":"Sin indicar"}</b></div><div><span>Baños</span><b>${meta.banos!=null?limpiar(meta.banos)+" ud":"Sin indicar"}</b></div></div></section>
    <section class="zx_pr_section"><h3>Especialidades</h3><div class="zx_pr_spec_badges">${especialidadesBadgesHTML(p)}</div><div class="zx_pr_calc_help zx_pr_spec_help">Un mismo proyecto puede combinar climatización, fontanería, electricidad, ventilación, extracción, aire acondicionado y control de humedad.</div></section>
    ${p.notas_internas?`<section class="zx_pr_section"><h3>Notas internas</h3><p class="zx_pr_notes">${limpiar(p.notas_internas)}</p></section>`:""}
    ${bloqueExtraccionFichaHTML(p)}
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Instalación y generadores</h3><span>${GENERADORES.length} registrado(s)</span></div>${puedeEditar()?`<button id="pr_gen_nuevo" class="zx_pr_small_primary" type="button">＋ Añadir generador</button>`:""}</div><div class="zx_pr_generadores">${generadoresHTML()}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Emisores y circuitos</h3><span>${listaEmisores(p).length} registrado(s)</span></div>${puedeEditar()?`<button id="pr_em_nuevo" class="zx_pr_small_primary" type="button">＋ Añadir emisor</button>`:""}</div><div class="zx_pr_emisores">${emisoresHTML(p)}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Cálculo térmico</h3><span>${CALCULOS.length} versión(es) guardada(s)</span></div>${puedeEditar()?`<button id="pr_calc_nuevo" class="zx_pr_small_primary" type="button">＋ Nuevo cálculo</button>`:""}</div><div class="zx_pr_calculos">${calculosHTML()}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Estrategia híbrida</h3><span>${PROPUESTAS.length} opción(es) técnica(s)</span></div>${puedeEditar()?`<button id="pr_op_nueva" class="zx_pr_small_primary" type="button">＋ Nueva opción</button>`:""}</div><div class="zx_pr_strategies">${propuestasEstrategiaHTML()}</div></section>
    <section class="zx_pr_next"><b>Proyectos multidisciplinares</b><span>Climatización dispone de cálculo técnico orientativo por estancias y Extracción ya permite calcular zonas, caudales, conductos, pérdidas y comparar un extractor del catálogo técnico. Fontanería, electricidad, ventilación, aire acondicionado y control de humedad quedan preparadas para sus siguientes bloques técnicos.</span></section>`);
  m.querySelector("#pr_ficha_back").onclick=cerrarModal;
  const e=m.querySelector("#pr_ficha_edit");if(e)e.onclick=()=>{cerrarModal();formulario(p)};
  const c=m.querySelector("#pr_ficha_close");if(c)c.onclick=cerrarModal;
  const ex=m.querySelector("#pr_extract_edit");if(ex)ex.onclick=()=>formularioExtraccion(p);
  conectarGeneradores(p);
  conectarEmisores(p);
  conectarCalculos(p);
  conectarEstrategia(p);
}
function instalarCSS(){if(document.getElementById("zx_proyectos_css"))return;const s=document.createElement("style");s.id="zx_proyectos_css";s.textContent=`
.zx_pr_shell{max-width:1180px;margin:0 auto;padding:14px 14px 90px;display:grid;gap:14px}.zx_pr_panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:17px;box-shadow:0 8px 26px rgba(15,23,42,.05)}.zx_pr_head{display:flex;align-items:center;justify-content:space-between;gap:14px}.zx_pr_head h2{margin:0;color:#071330;font-size:28px}.zx_pr_head p{margin:5px 0 0;color:#64748b;font-weight:750}.zx_pr_primary,.zx_pr_top_actions .primary{border:0;border-radius:15px;background:#0f766e;color:#fff;min-height:46px;padding:11px 16px;font-weight:950;font-size:14px}.zx_pr_head_actions{display:flex;gap:9px;align-items:center}.zx_pr_secondary{border:1px solid #99f6e4;border-radius:15px;background:#f0fdfa;color:#115e59;min-height:46px;padding:11px 16px;font-weight:950;font-size:14px}.zx_pr_kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}.zx_pr_kpis div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:10px;text-align:center}.zx_pr_kpis b{display:block;color:#071330;font-size:21px}.zx_pr_kpis span{color:#64748b;font-size:11px;font-weight:900}.zx_pr_tools{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:9px}.zx_pr_tools input,.zx_pr_tools select,.zx_pr_modal_box input,.zx_pr_modal_box select,.zx_pr_modal_box textarea{box-sizing:border-box;width:100%;max-width:100%;min-width:0;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;color:#0f172a;padding:12px;font-size:16px;font-weight:750}.zx_pr_modal_box>*{min-width:0}.zx_pr_modal_box label{min-width:0}.zx_pr_list_head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.zx_pr_list_head h3{margin:0;color:#071330}.zx_pr_list_head span{color:#64748b;font-size:12px;font-weight:900}.zx_pr_list{display:grid;gap:9px}.zx_pr_card{width:100%;text-align:left;border:1px solid #dbe3ef;border-radius:18px;background:#fff;padding:14px;color:#0f172a}.zx_pr_card_top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.zx_pr_card_top>b{font-size:16px}.zx_pr_client{font-weight:900;color:#334155;margin-top:7px}.zx_pr_meta{display:flex;flex-wrap:wrap;gap:7px 14px;color:#64748b;font-size:12px;font-weight:800;margin-top:7px}.zx_pr_estado{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;background:#e2e8f0;color:#334155;font-size:10px;font-weight:950;white-space:nowrap}.zx_pr_e_aceptado,.zx_pr_e_terminado{background:#dcfce7;color:#166534}.zx_pr_e_rechazado{background:#fee2e2;color:#991b1b}.zx_pr_e_enviado,.zx_pr_e_presupuestado{background:#dbeafe;color:#1d4ed8}.zx_pr_empty{padding:24px;text-align:center;color:#64748b;font-weight:850}.zx_pr_modal{position:fixed;inset:0;z-index:100250;background:rgba(15,23,42,.68);padding:12px;display:flex;align-items:flex-start;justify-content:center;overflow:hidden}.zx_pr_modal_box{width:min(760px,100%);max-height:calc(100dvh - 24px);margin:auto;background:#fff;border-radius:26px;padding:18px;box-shadow:0 28px 80px rgba(15,23,42,.4);display:grid;gap:13px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.zx_pr_top_actions{position:sticky;top:0;z-index:40;display:grid;grid-template-columns:1fr 1fr;gap:9px;background:rgba(255,255,255,.985);padding:calc(8px + env(safe-area-inset-top,0px)) 18px 10px;margin:-18px -18px 8px;border-bottom:1px solid #e2e8f0;backdrop-filter:blur(12px);box-shadow:0 8px 18px rgba(15,23,42,.06)}.zx_pr_top_actions button{border:1px solid #cbd5e1;border-radius:15px;background:#fff;color:#334155;min-height:46px;padding:10px;font-weight:950}.zx_pr_top_actions .primary{background:#0f766e;color:#fff;border-color:#0f766e}.zx_pr_form_head span,.zx_pr_ficha_head>span{color:#0f766e;font-size:11px;font-weight:950;letter-spacing:.08em}.zx_pr_form_head h2,.zx_pr_ficha_head h2{margin:3px 0 0;color:#071330;font-size:26px}.zx_pr_modal_box label{display:grid;gap:6px;color:#475569;font-size:13px;font-weight:950}.zx_pr_grid2,.zx_pr_viewgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.zx_pr_section{border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;padding:14px}.zx_pr_section h3{margin:0 0 12px;color:#071330;font-size:17px}.zx_pr_unit{color:#0f766e;font-size:11px}.zx_pr_viewgrid>div{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px;min-width:0}.zx_pr_viewgrid span{display:block;color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase}.zx_pr_viewgrid b{display:block;color:#0f172a;font-size:14px;margin-top:4px;word-break:break-word}.zx_pr_notes{margin:0;color:#334155;white-space:pre-wrap}.zx_pr_next{border:1px dashed #99f6e4;border-radius:17px;background:#f0fdfa;padding:13px}.zx_pr_next b,.zx_pr_next span{display:block}.zx_pr_next b{color:#115e59}.zx_pr_next span{color:#475569;font-size:12px;font-weight:800;margin-top:4px;line-height:1.4}.zx_pr_section_head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.zx_pr_section_head h3{margin:0}.zx_pr_section_head span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:3px}.zx_pr_small_primary{border:0;border-radius:12px;background:#0f766e;color:#fff;padding:9px 11px;font-weight:950}.zx_pr_generadores,.zx_pr_emisores{display:grid;gap:9px}.zx_pr_gen_card,.zx_pr_em_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_gen_top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.zx_pr_gen_top b{display:block;color:#071330;font-size:16px}.zx_pr_gen_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_gen_top button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}.zx_pr_gen_grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.zx_pr_gen_grid>div{border-radius:11px;background:#f8fafc;padding:8px}.zx_pr_gen_grid span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_gen_grid b{display:block;color:#0f172a;font-size:12px;margin-top:3px}.zx_pr_gen_tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.zx_pr_gen_tags span{background:#ecfeff;color:#155e75;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}.zx_pr_gen_decision{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_gen_card p,.zx_pr_em_card p{margin:7px 0 0;color:#475569;font-size:11px;font-weight:700;white-space:pre-wrap}.zx_pr_checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_checks label{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:10px;color:#334155}.zx_pr_checks input{width:20px!important;height:20px;margin:0;padding:0}.zx_pr_checks span{font-size:12px;font-weight:900}.zx_pr_role{margin-top:12px}.zx_pr_danger{width:100%;border:1px solid #fecaca;border-radius:13px;background:#fff1f2;color:#991b1b;padding:11px;font-weight:950}.zx_pr_calculos{display:grid;gap:9px}.zx_pr_calc_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_calc_top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.zx_pr_calc_top b{display:block;color:#071330;font-size:16px}.zx_pr_calc_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_calc_badge{background:#dcfce7!important;color:#166534!important;border-radius:999px;padding:5px 8px;font-size:9px!important;font-weight:950!important}.zx_pr_calc_by{margin-top:9px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_info{border:1px solid #bae6fd;border-radius:15px;background:#f0f9ff;padding:12px}.zx_pr_info b,.zx_pr_info span{display:block}.zx_pr_info b{color:#0c4a6e}.zx_pr_info span{margin-top:4px;color:#475569;font-size:11px;font-weight:750;line-height:1.45}.zx_pr_signed{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px}.zx_pr_signed .zx_pr_sign{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#071330;font-size:24px;font-weight:950;min-height:46px;padding:0}.zx_pr_signed input{min-width:0}.zx_pr_strategies,.zx_pr_rules{display:grid;gap:9px}.zx_pr_strategy_card,.zx_pr_rule_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_strategy_card p,.zx_pr_rule_card p{margin:8px 0;color:#475569;font-size:11px;font-weight:750;line-height:1.4}.zx_pr_strategy_count{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_rule_resume{margin-top:8px;background:#f8fafc;border-radius:11px;padding:8px}.zx_pr_rule_resume b,.zx_pr_rule_resume span{display:block}.zx_pr_rule_resume b{color:#0f172a;font-size:11px}.zx_pr_rule_resume span{color:#64748b;font-size:10px;font-weight:800;margin-top:2px}.zx_pr_rule_card>div:first-child b,.zx_pr_rule_card>div:first-child span{display:block}.zx_pr_rule_card>div:first-child b{color:#071330;font-size:13px}.zx_pr_rule_card>div:first-child span{color:#64748b;font-size:10px;font-weight:850;margin-top:2px}.zx_pr_rule_detail{display:grid;gap:5px;margin:8px 0 10px;padding:9px 10px;border-radius:11px;background:#f8fafc;color:#475569;font-size:10px;font-weight:850;line-height:1.4}.zx_pr_rule_detail span{display:block}.zx_pr_rule_actions{display:flex;gap:7px}.zx_pr_rule_actions button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}.zx_pr_rule_gen_info{margin-top:-5px;border-radius:12px;background:#f0fdfa;color:#0f766e;padding:9px 11px;font-size:11px;font-weight:950;line-height:1.35}.zx_pr_rule_gen_info.is-empty{background:#f8fafc;color:#64748b}.zx_pr_strategy_actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.zx_pr_budget_totals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.zx_pr_budget_totals>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:10px}.zx_pr_budget_totals span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_budget_totals b{display:block;color:#071330;font-size:14px;margin-top:3px}.zx_pr_parts{display:grid;gap:9px}.zx_pr_part_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_part_card p{margin:7px 0;color:#64748b;font-size:10px;font-weight:800}.zx_pr_part_preview{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:11px;color:#115e59;font-size:11px;font-weight:850}.zx_pr_part_preview b{font-size:13px}.zx_pr_part_preview span,.zx_pr_part_preview b{display:block}.zx_pr_quote_head{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_quote_head>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:10px}.zx_pr_quote_head span,.zx_pr_quote_head b{display:block}.zx_pr_quote_head span{color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_quote_head b{color:#071330;font-size:13px;margin-top:3px}.zx_pr_quote_lines{display:grid;gap:8px}.zx_pr_quote_line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start;background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:11px}.zx_pr_quote_line>div:first-child b,.zx_pr_quote_line>div:first-child span{display:block}.zx_pr_quote_line>div:first-child b{color:#071330;font-size:13px}.zx_pr_quote_line>div:first-child span{color:#64748b;font-size:10px;font-weight:850;margin-top:3px}.zx_pr_quote_nums{text-align:right}.zx_pr_quote_nums span,.zx_pr_quote_nums b,.zx_pr_quote_nums small{display:block}.zx_pr_quote_nums span{color:#64748b;font-size:10px;font-weight:800}.zx_pr_quote_nums b{color:#071330;font-size:13px;margin-top:3px}.zx_pr_quote_nums small{color:#64748b;font-size:9px;font-weight:800;margin-top:2px}.zx_pr_quote_totals{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_quote_totals>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:11px}.zx_pr_quote_totals span,.zx_pr_quote_totals b{display:block}.zx_pr_quote_totals span{color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_quote_totals b{color:#071330;font-size:15px;margin-top:4px}.zx_pr_quote_totals .total{grid-column:1/-1;background:#f0fdfa;border-color:#99f6e4}.zx_pr_quote_totals .total b{font-size:20px;color:#115e59}.zx_pr_work_tools{display:grid;gap:7px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:15px;padding:11px}.zx_pr_work_tools button{border:0;border-radius:13px;background:#0f766e;color:#fff;padding:12px;font-weight:950;font-size:14px}.zx_pr_work_tools span{color:#47635d;font-size:10px;font-weight:850;line-height:1.45}.zx_pr_dossier_tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_dossier_tools button{border:1px solid #99f6e4;background:#f0fdfa;color:#115e59;border-radius:13px;padding:11px;font-weight:950}.zx_pr_dossier_tools span{grid-column:1/-1;background:#f8fafc;border-radius:12px;padding:9px 11px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_dos_export_tools{display:grid;gap:6px}.zx_pr_dos_export_tools button{width:100%;border:0;border-radius:14px;background:#0f766e;color:#fff;min-height:48px;padding:12px 14px;font-weight:950;font-size:14px}.zx_pr_dos_export_tools button:disabled{opacity:.65}.zx_pr_dos_export_tools span{display:block;text-align:center;color:#64748b;font-size:10px;font-weight:800}.zx_pr_dossier_check{display:flex!important;align-items:center;gap:8px;background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:10px!important}.zx_pr_dossier_check input{width:20px!important;height:20px!important;margin:0!important}.zx_pr_dossier_check span{font-size:11px;font-weight:900;color:#334155}.zx_pr_dos_wrap{display:grid;gap:0;background:#eef2f7;border-radius:20px;overflow:hidden;border:1px solid #dbe3ef}.zx_pr_dos_cover{position:relative;min-height:420px;background:linear-gradient(145deg,var(--dos-primary),#071330);color:#fff;overflow:hidden;padding:28px;display:flex;flex-direction:column;justify-content:space-between}.zx_pr_dos_cover_img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.zx_pr_dos_cover_overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,19,48,.18),rgba(7,19,48,.88))}.zx_pr_dos_brand,.zx_pr_dos_cover_text{position:relative;z-index:1}.zx_pr_dos_brand{display:flex;align-items:center;gap:10px}.zx_pr_dos_brand img{width:48px;height:48px;object-fit:contain;border-radius:12px;background:#fff;padding:4px}.zx_pr_dos_brand b{font-size:16px}.zx_pr_dos_cover_text small{display:block;font-size:10px;letter-spacing:.14em;font-weight:950;opacity:.85}.zx_pr_dos_cover_text h1{font-size:38px;line-height:1.02;margin:10px 0 12px;max-width:620px}.zx_pr_dos_cover_text p{font-size:17px;line-height:1.35;margin:0 0 18px;max-width:620px}.zx_pr_dos_cover_text>div{font-size:11px;font-weight:850;opacity:.9}.zx_pr_dos_badge{display:inline-block;background:var(--dos-accent);color:#042f2e;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:950;margin-bottom:16px}.zx_pr_dos_intro,.zx_pr_dos_section,.zx_pr_dos_accept{background:#fff;padding:26px}.zx_pr_dos_intro h2{margin:0;color:#071330;font-size:26px}.zx_pr_dos_intro p{color:#475569;font-size:13px;line-height:1.6}.zx_pr_dos_intro>div{display:grid;gap:7px;margin-top:15px}.zx_pr_dos_intro>div span{background:#f0fdfa;border-left:4px solid var(--dos-accent);border-radius:9px;padding:9px 11px;color:#115e59;font-size:12px;font-weight:850}.zx_pr_dos_section{border-top:1px solid #e2e8f0}.zx_pr_dos_kicker{color:var(--dos-primary);font-size:10px;font-weight:950;letter-spacing:.12em}.zx_pr_dos_section h3{font-size:23px;color:#071330;margin:7px 0 12px}.zx_pr_dos_section>p{color:#475569;line-height:1.55}.zx_pr_dos_metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.zx_pr_dos_metrics>div{background:#f8fafc;border-radius:13px;padding:12px}.zx_pr_dos_metrics span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_dos_metrics b{display:block;color:#071330;font-size:15px;margin-top:4px}.zx_pr_dos_equips{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.zx_pr_dos_equips article{background:linear-gradient(145deg,#f8fafc,#fff);border:1px solid #dbe3ef;border-radius:16px;padding:15px}.zx_pr_dos_equips article>span{font-size:9px;font-weight:950;color:var(--dos-primary);text-transform:uppercase}.zx_pr_dos_equips h4{font-size:20px;margin:7px 0;color:#071330}.zx_pr_dos_equips b{display:block;color:#0f172a}.zx_pr_dos_equips p{color:#64748b;font-size:11px;font-weight:800}.zx_pr_dos_solution{background:linear-gradient(145deg,#f0fdfa,#ecfeff)}.zx_pr_dos_flow{display:grid;gap:10px}.zx_pr_dos_flow>div{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px}.zx_pr_dos_flow>div>span{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--dos-primary);color:#fff;font-weight:950}.zx_pr_dos_flow b{display:block;color:#071330}.zx_pr_dos_flow p{margin:3px 0;color:#475569;font-size:11px;font-weight:800}.zx_pr_dos_flow small{color:#64748b}.zx_pr_dos_chapters{display:grid;gap:8px}.zx_pr_dos_chapters>div{display:flex;justify-content:space-between;gap:15px;background:#f8fafc;border-radius:12px;padding:11px}.zx_pr_dos_chapters span{color:#334155;font-weight:850}.zx_pr_dos_chapters b{color:#071330}.zx_pr_dos_total{margin-top:12px;background:var(--dos-primary);color:#fff;border-radius:16px;padding:15px}.zx_pr_dos_total span,.zx_pr_dos_total b,.zx_pr_dos_total small{display:block}.zx_pr_dos_total b{font-size:27px;margin-top:3px}.zx_pr_dos_total small{opacity:.85;margin-top:3px}.zx_pr_dos_price{text-align:center;background:linear-gradient(145deg,var(--dos-primary),#071330);color:#fff}.zx_pr_dos_price span,.zx_pr_dos_price b,.zx_pr_dos_price small{display:block}.zx_pr_dos_price b{font-size:38px;margin:5px 0}.zx_pr_dos_lines{display:grid;gap:7px}.zx_pr_dos_lines>div{display:flex;justify-content:space-between;gap:12px;background:#f8fafc;border-radius:12px;padding:11px}.zx_pr_dos_lines b,.zx_pr_dos_lines span{display:block}.zx_pr_dos_lines span{color:#64748b;font-size:10px;margin-top:3px}.zx_pr_dos_info_grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.zx_pr_dos_info_grid>div{background:#f8fafc;border-radius:13px;padding:12px}.zx_pr_dos_info_grid b{color:#071330}.zx_pr_dos_info_grid p{color:#475569;font-size:11px;line-height:1.5;margin:5px 0 0}.zx_pr_dos_valid{margin-top:10px;color:#475569;font-size:11px}.zx_pr_dos_accept{background:linear-gradient(145deg,#071330,var(--dos-primary));color:#fff}.zx_pr_dos_accept>span{font-size:10px;font-weight:950;letter-spacing:.12em;color:#99f6e4}.zx_pr_dos_accept h3{font-size:22px;margin:8px 0 22px}.zx_pr_dos_accept>div{display:grid;grid-template-columns:1fr 1fr;gap:20px}.zx_pr_dos_accept p{border-top:1px solid rgba(255,255,255,.6);padding-top:8px;font-size:10px}.zx_pr_dos_footer{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 20px;background:#071330;color:#fff;font-size:10px}.zx_pr_dos_footer span{opacity:.8}.zx_pr_dos_footer small{opacity:.65}.zx_pr_dos_profesional .zx_pr_dos_cover{min-height:320px;background:var(--dos-primary)}.zx_pr_dos_profesional .zx_pr_dos_intro>div span{background:#f8fafc;border-left-color:var(--dos-primary)}.zx_pr_dos_tecnico .zx_pr_dos_cover{min-height:280px;background:#071330}.zx_pr_dos_tecnico .zx_pr_dos_intro h2{font-size:22px}.zx_pr_dos_tecnico .zx_pr_dos_section h3{font-size:19px}.zx_pr_dos_lead{margin:-4px 0 14px!important;color:#64748b!important;font-size:11px!important}.zx_pr_dos_equips article{padding:0;overflow:hidden}.zx_pr_dos_equipment_img,.zx_pr_dos_equipment_placeholder{width:100%;height:150px;display:block;object-fit:cover;background:linear-gradient(145deg,var(--dos-primary),#071330)}.zx_pr_dos_equipment_placeholder{display:grid;place-items:center}.zx_pr_dos_equipment_placeholder span{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:34px;font-weight:950}.zx_pr_dos_equipment_body{padding:15px}.zx_pr_dos_equipment_body>span{font-size:9px;font-weight:950;color:var(--dos-primary);text-transform:uppercase}.zx_pr_dos_equipment_tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.zx_pr_dos_equipment_tags em{font-style:normal;background:#ecfeff;color:#0f766e;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900}.zx_pr_dos_equipment_body small{display:block;margin-top:9px;color:#64748b;line-height:1.45}.zx_pr_dos_brand_generic b{font-size:10px;letter-spacing:.12em;opacity:.85}.zx_pr_dos_accepted{background:linear-gradient(145deg,#ecfdf5,#f0fdfa);padding:26px;border-top:1px solid #a7f3d0;color:#065f46}.zx_pr_dos_accepted>span{font-size:10px;font-weight:950;letter-spacing:.12em}.zx_pr_dos_accepted h3{margin:8px 0 6px;color:#064e3b;font-size:23px}.zx_pr_dos_accepted p{margin:0;color:#47635d;line-height:1.5}.zx_pr_dos_solution p{margin:0!important}.zx_pr_dos_chapters>div b{white-space:nowrap}.zx_pr_secondary_full{width:100%;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;border-radius:14px;padding:12px;font-weight:950}.zx_pr_dos_company{background:#f8fafc}.zx_pr_dos_contact{display:grid;gap:4px;background:linear-gradient(145deg,#ecfeff,#f0fdfa);padding:18px 26px;border-top:1px solid #ccfbf1}.zx_pr_dos_contact b{color:#071330;font-size:14px}.zx_pr_dos_contact span{color:#475569;font-size:11px;font-weight:800;line-height:1.5}.zx_pr_cat_tools{margin-top:0}.zx_pr_cat_stats{display:flex;align-items:baseline;gap:7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px}.zx_pr_cat_stats b{color:#071330;font-size:20px}.zx_pr_cat_stats span{color:#64748b;font-size:11px;font-weight:850}.zx_pr_cat_list{display:grid;gap:8px}.zx_pr_cat_card{width:100%;text-align:left;border:1px solid #dbe3ef;border-radius:15px;background:#fff;padding:12px;color:#0f172a}.zx_pr_cat_card>div:first-child b,.zx_pr_cat_card>div:first-child span{display:block}.zx_pr_cat_card>div:first-child b{font-size:14px}.zx_pr_cat_card>div:first-child span{margin-top:3px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_cat_badge{display:inline-flex;margin-top:9px;border-radius:999px;padding:5px 8px;background:#ccfbf1;color:#115e59;font-size:9px;font-weight:950}.zx_pr_cat_badge.is-off{background:#f1f5f9;color:#64748b}.zx_pr_cat_meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.zx_pr_cat_meta span{background:#f8fafc;border-radius:9px;padding:6px 8px;color:#64748b;font-size:9px;font-weight:850}.zx_pr_cat_meta b{color:#0f172a}.zx_pr_cat_card .zx_pr_gen_tags{margin-top:8px}.zx_pr_cat_generator{display:grid;gap:13px}.zx_pr_cat_hint{margin-top:10px}.zx_pr_cat_specs{display:grid;gap:8px}.zx_pr_cat_spec_row{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(120px,.7fr) 42px;gap:7px;align-items:start}.zx_pr_cat_spec_field{display:grid;gap:6px}.zx_pr_cat_spec_field select,.zx_pr_cat_spec_field input{min-width:0}.zx_pr_cat_spec_field input[hidden]{display:none!important}.zx_pr_cat_spec_row button{height:42px;border:1px solid #fecaca;border-radius:11px;background:#fff1f2;color:#991b1b;font-size:20px;font-weight:950}.zx_pr_calc_mode{display:grid;gap:10px;margin-top:10px}.zx_pr_calc_mode[hidden]{display:none!important}.zx_pr_calc_mode_info{margin-top:-2px}.zx_pr_calc_quick_resume{border:1px solid #99f6e4;border-radius:13px;background:#f0fdfa;padding:11px}.zx_pr_calc_quick_resume b,.zx_pr_calc_quick_resume span{display:block}.zx_pr_calc_quick_resume b{color:#115e59}.zx_pr_calc_quick_resume span{margin-top:3px;color:#475569;font-size:11px;font-weight:850;line-height:1.4}.zx_pr_calc_help{margin:-6px 0 11px;color:#64748b;font-size:10px;font-weight:850;line-height:1.4}.zx_pr_modal_box input.zx_pr_calc_readonly{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}.zx_pr_calc_results{display:grid;gap:10px}.zx_pr_spec_badges{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.zx_pr_spec_badge{display:inline-flex;border-radius:999px;background:#ecfeff;color:#0f766e;padding:6px 9px;font-size:10px;font-weight:950}.zx_pr_spec_checks{grid-template-columns:1fr 1fr}.zx_pr_spec_help{margin-top:10px}.zx_pr_calc_room_intro{border:1px solid #bae6fd;border-radius:14px;background:#f0f9ff;padding:12px}.zx_pr_calc_room_intro b,.zx_pr_calc_room_intro span{display:block}.zx_pr_calc_room_intro b{color:#075985}.zx_pr_calc_room_intro span{margin-top:4px;color:#475569;font-size:11px;font-weight:800;line-height:1.45}.zx_pr_rooms{display:grid;gap:10px}.zx_pr_room{border:1px solid #dbe3ef;border-radius:16px;background:#fff;padding:12px;display:grid;gap:10px}.zx_pr_room_head{display:flex;align-items:center;justify-content:space-between;gap:10px}.zx_pr_room_head b{color:#071330;font-size:15px}.zx_pr_room_head button{border:1px solid #fecaca;border-radius:11px;background:#fff1f2;color:#991b1b;padding:7px 9px;font-weight:950}.zx_pr_room_results{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.zx_pr_room_results span{background:#f8fafc;border-radius:11px;padding:9px;color:#64748b;font-size:9px;font-weight:900}.zx_pr_room_results b{display:block;color:#0f172a;font-size:12px;margin-top:3px}.zx_pr_extract_summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zx_pr_extract_summary>div{background:#f8fafc;border-radius:12px;padding:10px}.zx_pr_extract_summary span,.zx_pr_extract_summary b{display:block}.zx_pr_extract_summary span{color:#64748b;font-size:9px;font-weight:900}.zx_pr_extract_summary b{margin-top:4px;color:#0f172a;font-size:13px}.zx_pr_extract_list{display:grid;gap:7px;margin-top:10px}.zx_pr_extract_list>div{background:#f8fafc;border-radius:12px;padding:10px}.zx_pr_extract_list b,.zx_pr_extract_list span{display:block}.zx_pr_extract_list span{margin-top:3px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_extract_equipment{margin-top:10px;border:1px solid #dbe3ef;border-radius:13px;padding:11px}.zx_pr_extract_equipment>span,.zx_pr_extract_equipment>b{display:block}.zx_pr_extract_equipment>span{color:#64748b;font-size:9px;font-weight:900}.zx_pr_extract_equipment>b{margin-top:3px;color:#0f172a}.zx_pr_extract_status{display:inline-flex;margin-top:8px;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:950;background:#f1f5f9;color:#64748b}.zx_pr_extract_status.is-ok{background:#dcfce7;color:#166534}.zx_pr_extract_status.is-bad{background:#fee2e2;color:#991b1b}.zx_pr_extract_zones{display:grid;gap:10px;margin-top:10px}.zx_pr_extract_zone{border:1px solid #dbe3ef;border-radius:16px;background:#fff;padding:12px;display:grid;gap:10px}.zx_pr_extract_results{grid-template-columns:repeat(4,1fr)}.zx_pr_extract_catalog_info{margin-top:8px;border:1px solid #dbe3ef;background:#f8fafc;border-radius:12px;padding:10px;color:#64748b;font-size:10px;font-weight:850;line-height:1.45}.zx_pr_extract_catalog_info b,.zx_pr_extract_catalog_info span,.zx_pr_extract_catalog_info em{display:block}.zx_pr_extract_catalog_info b{color:#0f172a}.zx_pr_extract_catalog_info em{font-style:normal;margin-top:5px}.zx_pr_extract_catalog_info em.is-ok{color:#166534}.zx_pr_extract_catalog_info em.is-bad{color:#991b1b}@media(max-width:620px){.zx_pr_modal{padding:0}.zx_pr_modal_box{width:100%;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;border-radius:0;padding:15px;overflow-x:hidden}.zx_pr_modal_box input,.zx_pr_modal_box select,.zx_pr_modal_box textarea{font-size:16px}.zx_pr_signed{width:100%;max-width:100%;min-width:0}.zx_pr_top_actions{margin:-15px -15px 8px;padding:calc(8px + env(safe-area-inset-top,0px)) 15px 10px}.zx_pr_dossier_tools{grid-template-columns:1fr}.zx_pr_dos_cover{min-height:390px;padding:22px}.zx_pr_dos_cover_text h1{font-size:31px}.zx_pr_dos_intro,.zx_pr_dos_section,.zx_pr_dos_accept{padding:20px}.zx_pr_dos_metrics,.zx_pr_dos_equips,.zx_pr_dos_info_grid{grid-template-columns:1fr}.zx_pr_dos_footer{display:grid}.zx_pr_head{align-items:stretch;flex-direction:column}.zx_pr_head_actions{display:grid;grid-template-columns:1fr}.zx_pr_primary,.zx_pr_secondary{width:100%}.zx_pr_tools,.zx_pr_grid2,.zx_pr_viewgrid,.zx_pr_gen_grid{grid-template-columns:1fr}.zx_pr_modal_box{padding:15px;border-radius:0}.zx_pr_card_top{display:grid}.zx_pr_section_head{align-items:stretch;flex-direction:column}.zx_pr_small_primary{width:100%}.zx_pr_checks{grid-template-columns:1fr}.zx_pr_spec_checks{grid-template-columns:1fr}.zx_pr_room_results{grid-template-columns:1fr}.zx_pr_extract_results{grid-template-columns:1fr}.zx_pr_extract_summary{grid-template-columns:1fr 1fr}.zx_pr_kpis{gap:5px}.zx_pr_kpis span{font-size:9px}.zx_pr_budget_totals{grid-template-columns:1fr 1fr}.zx_pr_strategy_actions{justify-content:flex-start}.zx_pr_quote_head{grid-template-columns:1fr}.zx_pr_quote_line{grid-template-columns:1fr}.zx_pr_quote_nums{text-align:left}.zx_pr_cat_spec_row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px}.zx_pr_cat_spec_row .zx_pr_cat_spec_field:first-child{grid-column:1/-1}.zx_pr_cat_spec_row button{height:44px}}`;
document.head.appendChild(s)}

window.ZX_proyectos=async function(){
  instalarCSS();
  if(zx()&&typeof zx().marcarModuloActivo==="function")zx().marcarModuloActivo("proyectos");
  if(!puedeEntrar()){app().innerHTML=`<div class="zx_pr_panel"><h2>Proyectos</h2><div>No tienes permiso para acceder a Proyectos.</div></div>`;return}
  CACHE=leerCache();shell();
  await Promise.all([cargarDosierEmpresa(),cargarAuxiliares()]);await cargar();shell();
  const abrir=window.ZX_PROYECTO_ABRIR_ID;window.ZX_PROYECTO_ABRIR_ID="";if(abrir)abrirFicha(abrir);
};
window.ZX_abrirProyectos=window.ZX_proyectos;
if(zx()&&typeof zx().registrarModulo==="function")zx().registrarModulo("proyectos",{nombre:"Proyectos",activo:true,version:ZX_VERSION});
console.log("ZENTRYX proyectos.js V"+ZX_VERSION+" cargado");
})();
