// ===============================
// ZENTRYX PRO - PROYECTOS V1019
// V1019 - DOSIER: ESTADO CORRECTO EN PIE PARA OFERTAS ACEPTADAS
// ===============================
(function(){
"use strict";

const ZX_VERSION="1019";
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

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}
function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}catch(e){return {}}
}
function limpiar(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalizar(v){return String(v??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function puedeEntrar(){return zx() && typeof zx().puede==="function" ? zx().puede("ver","proyectos")===true : normalizar(sesion().rol)!=="invitado"}
function puedeEditar(){return puedeEntrar()}
function leerCache(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||"[]");return Array.isArray(x)?x:[]}catch(e){return []}}
function guardarCache(x){try{localStorage.setItem(CACHE_KEY,JSON.stringify(x||[]))}catch(e){}}
function fechaES(v){if(!v)return "";const s=String(v).slice(0,10),p=s.split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:s}
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
function nombreGeneradorId(id){const g=GENERADORES.find(x=>String(x.id)===String(id));if(!g)return "Generador";const potencia=(g.potencia_kw!=null&&g.potencia_kw!=="")?limpiar(g.potencia_kw)+" kW":"";return [textoGenerador(g.tipo),potencia,g.marca,g.modelo].filter(Boolean).join(" · ")}
function estadoPropuesta(op){return normalizar(op&&op.estado||"borrador")}
function propuestaAceptada(op){return estadoPropuesta(op)==="aceptada"}
function textoEstadoPropuesta(v){return ({borrador:"Borrador",enviada:"Enviada",aceptada:"Aceptada",rechazada:"Rechazada",archivada:"Archivada"})[normalizar(v)]||v||"Borrador"}
function nombreGeneradorRegla(r){return r&&r.generador_nombre_snapshot?r.generador_nombre_snapshot:nombreGeneradorId(r&&r.generador_id)}
function nombreGeneradorRelacionadoRegla(r){return r&&r.generador_referencia_nombre_snapshot?r.generador_referencia_nombre_snapshot:nombreGeneradorId(r&&r.generador_referencia_id)}
function uidRegla(){return "rg_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}

function textoTipoPartida(v){return ({material:"Material",mano_obra:"Mano de obra",servicio:"Servicio",transporte:"Transporte",subcontrata:"Subcontrata",ingenieria:"Ingeniería",legalizacion:"Legalización",rite:"RITE",cae:"CAE",otro:"Otro"})[v]||v||"Partida"}
function eur(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €":"0,00 €"}
function numValor(v){const s=String(v??"").trim().replace(",",".");if(s==="")return 0;const n=Number(s);return Number.isFinite(n)?n:0}
function materialTexto(m){return [m&&m.nombre,m&&m.marca,m&&m.modelo].filter(Boolean).join(" · ")}
function opcionesMateriales(sel){return `<option value="">Sin artículo del catálogo</option>`+MATERIALES.map(m=>`<option value="${limpiar(m.id)}" ${String(sel)===String(m.id)?"selected":""}>${limpiar(materialTexto(m))}${m.referencia?" · "+limpiar(m.referencia):""}</option>`).join("")}
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
      sb().from("clientes").select("id,nombre,estado").order("nombre",{ascending:true}),
      sb().from("clientes_direcciones").select("*").eq("activa",true).order("principal",{ascending:false}).order("orden",{ascending:true}),
      sb().from("usuarios").select("id,usuario,nombre,activo,estado").order("nombre",{ascending:true}),
      sb().from("materiales").select("id,nombre,marca,modelo,referencia,unidad,activo").order("nombre",{ascending:true})
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
function renderTarjetas(lista){
  if(!lista.length)return `<div class="zx_pr_empty">${BUSQUEDA?"No hay proyectos que coincidan con la búsqueda.":"No hay proyectos creados."}</div>`;
  return lista.map(p=>`<button class="zx_pr_card" type="button" data-pr-open="${limpiar(p.id)}">
    <div class="zx_pr_card_top"><b>${limpiar(p.nombre)}</b><span class="${estadoClass(p.estado)}">${limpiar(textoEstado(p.estado))}</span></div>
    <div class="zx_pr_client">${limpiar(nombreCliente(p.cliente_id))}</div>
    <div class="zx_pr_meta"><span>${limpiar(textoTipo(p.tipo))}</span>${proyectoDir(p)?`<span>📍 ${limpiar(proyectoDir(p))}</span>`:""}</div>
  </button>`).join("");
}
function shell(){
  const lista=listaFiltrada();
  app().innerHTML=`<div class="zx_pr_shell">
    <section class="zx_pr_panel zx_pr_head"><div><h2>Proyectos</h2><p>Estudios técnicos, propuestas y presupuestos.</p></div><button id="pr_nuevo" class="zx_pr_primary" type="button">＋ Crear proyecto</button></section>
    <section class="zx_pr_panel"><div class="zx_pr_kpis"><div><b>${CACHE.filter(x=>x.archivado!==true).length}</b><span>Activos</span></div><div><b>${CACHE.filter(x=>x.estado==="borrador"&&x.archivado!==true).length}</b><span>Borrador</span></div><div><b>${CACHE.filter(x=>x.estado==="aceptado"&&x.archivado!==true).length}</b><span>Aceptados</span></div></div>
      <div class="zx_pr_tools"><input id="zx_buscar_proyectos" type="search" placeholder="Buscar proyecto, cliente o dirección" value="${limpiar(BUSQUEDA)}"><select id="pr_filtro"><option value="todos">Todos los estados</option>${["borrador","estudio","visita","calculado","presupuestado","enviado","aceptado","ejecucion","terminado","rechazado"].map(x=>`<option value="${x}" ${FILTRO===x?"selected":""}>${limpiar(textoEstado(x))}</option>`).join("")}</select></div>
    </section>
    <section class="zx_pr_panel"><div class="zx_pr_list_head"><h3>Listado</h3><span>${lista.length} proyecto(s)</span></div><div class="zx_pr_list">${renderTarjetas(lista)}</div></section>
  </div>`;
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
  const payload={empresa_id:u.empresa_id||"demo",cliente_id,direccion_id:document.getElementById("pr_direccion").value||null,nombre,tipo:document.getElementById("pr_tipo").value,estado:document.getElementById("pr_estado").value,comercial_id:document.getElementById("pr_comercial").value||null,tecnico_id:document.getElementById("pr_tecnico").value||null,notas_internas:document.getElementById("pr_notas").value.trim()||null,inmueble_meta:{tipo_inmueble:document.getElementById("pr_inm_tipo").value.trim(),superficie_calefactada_m2:numero("pr_m2"),plantas:numero("pr_plantas"),ano_construccion:numero("pr_ano"),ocupantes:numero("pr_ocupantes"),banos:numero("pr_banos")}};
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
        <div><span>Futuro papel</span><b>${limpiar(textoRol(meta.rol_futuro))}</b></div>
      </div>
      ${fs.length?`<div class="zx_pr_gen_tags">${fs.map(x=>`<span>${limpiar(({calefaccion:"Calefacción",acs:"ACS",refrigeracion:"Refrigeración",piscina:"Piscina"})[x]||x)}</span>`).join("")}</div>`:""}
      <div class="zx_pr_gen_decision">${g.existente===false?"Equipo previsto":(g.se_retira?"Se retirará":g.se_mantiene?"Se conserva":"Pendiente de decidir")}</div>
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
  const meta=Object.assign({},g&&g.tecnico_meta||{}),fs=listaFunciones(g&&g.funciones),nuevo=!g;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_gen_back" type="button">← Volver</button><button id="pr_gen_save" class="primary" type="button">Guardar</button></div>
    <div class="zx_pr_form_head"><span>${nuevo?"NUEVO GENERADOR":"EDITAR GENERADOR"}</span><h2>${nuevo?"Añadir generador":limpiar(textoGenerador(g.tipo))}</h2></div>
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
    </div><label class="zx_pr_role">Papel previsto si se conserva<select id="pr_gen_rol"><option value="">Sin definir</option>${["principal","apoyo","emergencia","alternativo","simultaneo","solo_acs","solo_calefaccion","manual"].map(x=>`<option value="${x}" ${meta.rol_futuro===x?"selected":""}>${limpiar(textoRol(x))}</option>`).join("")}</select></label></div>
    <label>Notas<textarea id="pr_gen_notas" rows="4" placeholder="Estado, conexión actual, observaciones de visita…">${limpiar(g&&g.notas||"")}</textarea></label>
    ${!nuevo?`<button id="pr_gen_delete" class="zx_pr_danger" type="button">Eliminar generador</button>`:""}`);
  m.querySelector("#pr_gen_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const man=m.querySelector("#pr_gen_mantiene"),ret=m.querySelector("#pr_gen_retira"),sit=m.querySelector("#pr_gen_existente"),dec=m.querySelector("#pr_gen_decision_section");
  const ajustarDecision=()=>{const existente=sit.value==="1";dec.style.display=existente?"":"none";if(!existente){man.checked=false;ret.checked=false}};
  man.onchange=()=>{if(man.checked)ret.checked=false};ret.onchange=()=>{if(ret.checked)man.checked=false};sit.onchange=ajustarDecision;ajustarDecision();
  m.querySelector("#pr_gen_save").onclick=()=>guardarGenerador(p,g);
  const del=m.querySelector("#pr_gen_delete");if(del)del.onclick=()=>eliminarGenerador(p,g);
}
async function guardarGenerador(p,g){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el generador.");return}
  const tipo=document.getElementById("pr_gen_tipo").value;
  const funciones=[...document.querySelectorAll("[data-pr-func]:checked")].map(x=>x.dataset.prFunc);
  const potencia=document.getElementById("pr_gen_kw").value.trim();
  const existente=document.getElementById("pr_gen_existente").value==="1";
  const payload={proyecto_id:p.id,propuesta_id:null,tipo,subtipo:document.getElementById("pr_gen_subtipo").value.trim()||null,existente,marca:document.getElementById("pr_gen_marca").value.trim()||null,modelo:document.getElementById("pr_gen_modelo").value.trim()||null,referencia:document.getElementById("pr_gen_ref").value.trim()||null,potencia_kw:potencia===""?null:Number(potencia),estado:document.getElementById("pr_gen_estado").value.trim()||null,se_mantiene:existente&&document.getElementById("pr_gen_mantiene").checked,se_retira:existente&&document.getElementById("pr_gen_retira").checked,funciones,tecnico_meta:Object.assign({},g&&g.tecnico_meta||{},{rol_futuro:document.getElementById("pr_gen_rol").value||null,foto_comercial_url:document.getElementById("pr_gen_foto_dosier").value.trim()||null,descripcion_cliente:document.getElementById("pr_gen_desc_cliente").value.trim()||null}),notas:document.getElementById("pr_gen_notas").value.trim()||null,orden:g&&Number.isFinite(Number(g.orden))?Number(g.orden):GENERADORES.length};
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
      ${rn.creado_por_nombre?`<div class="zx_pr_calc_by">Registrado por ${limpiar(rn.creado_por_nombre)}</div>`:""}
      ${c.observaciones?`<p>${limpiar(c.observaciones)}</p>`:""}
    </div>`;
  }).join("");
}
function formularioCalculo(p){
  const meta=p.inmueble_meta||{};
  const siguiente=CALCULOS.reduce((m,x)=>Math.max(m,Number(x.version)||0),0)+1;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_calc_back" type="button">← Volver</button><button id="pr_calc_save" class="primary" type="button">Guardar cálculo</button></div>
    <div class="zx_pr_form_head"><span>NUEVO CÁLCULO · VERSIÓN ${siguiente}</span><h2>Registrar cálculo térmico</h2></div>
    <div class="zx_pr_info"><b>Se guardará como una versión nueva.</b><span>Los cálculos anteriores no se modifican. Esta pantalla registra los datos y resultados del estudio; no sustituye el cálculo técnico realizado por el profesional.</span></div>
    <label>Tipo de cálculo<select id="pr_calc_tipo"><option value="estimacion">Estimación rápida</option><option value="tecnico">Cálculo técnico</option><option value="manual">Cálculo manual</option><option value="otro">Otro</option></select></label>
    <div class="zx_pr_section"><h3>Datos utilizados</h3>
      <label>Superficie utilizada <span class="zx_pr_unit">m²</span><input id="pr_calc_sup" type="number" min="0" step="0.01" inputmode="decimal" value="${meta.superficie_calefactada_m2!=null?limpiar(meta.superficie_calefactada_m2):""}"></label>
      <div class="zx_pr_grid2"><label>Exterior invierno <span class="zx_pr_unit">°C</span><div class="zx_pr_signed"><button id="pr_calc_te_inv_sign" type="button" class="zx_pr_sign" data-sign="-1" aria-label="Cambiar signo de temperatura">−</button><input id="pr_calc_te_inv" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Ej. 2"></div></label><label>Interior calefacción <span class="zx_pr_unit">°C</span><input id="pr_calc_ti_cal" type="number" step="0.1" inputmode="decimal" value="21"></label></div>
      <div class="zx_pr_grid2"><label>Exterior verano <span class="zx_pr_unit">°C</span><div class="zx_pr_signed"><button id="pr_calc_te_ver_sign" type="button" class="zx_pr_sign" data-sign="1" aria-label="Cambiar signo de temperatura">+</button><input id="pr_calc_te_ver" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Ej. 35"></div></label><label>Interior refrigeración <span class="zx_pr_unit">°C</span><input id="pr_calc_ti_ref" type="number" step="0.1" inputmode="decimal" value="25"></label></div>
    </div>
    <div class="zx_pr_section"><h3>Resultados</h3>
      <div class="zx_pr_grid2"><label>Carga de calefacción <span class="zx_pr_unit">kW</span><input id="pr_calc_cal" type="number" min="0" step="0.01" inputmode="decimal"></label><label>Carga de refrigeración <span class="zx_pr_unit">kW</span><input id="pr_calc_ref" type="number" min="0" step="0.01" inputmode="decimal"></label></div>
      <div class="zx_pr_grid2"><label>ACS recomendado <span class="zx_pr_unit">L</span><input id="pr_calc_acs" type="number" min="0" step="1" inputmode="numeric"></label><label>Impulsión recomendada <span class="zx_pr_unit">°C</span><input id="pr_calc_imp" type="number" step="0.1" inputmode="decimal"></label></div>
    </div>
    <label>Observaciones<textarea id="pr_calc_obs" rows="5" placeholder="Método utilizado, hipótesis, limitaciones, datos pendientes…"></textarea></label>`);
  m.querySelector("#pr_calc_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  m.querySelector("#pr_calc_save").onclick=()=>guardarCalculo(p,siguiente);
  ["pr_calc_te_inv_sign","pr_calc_te_ver_sign"].forEach(id=>{const b=m.querySelector("#"+id);if(b)b.onclick=()=>{const neg=b.dataset.sign!=="-1";b.dataset.sign=neg?"-1":"1";b.textContent=neg?"−":"+"}});
}
function numCalc(id){const el=document.getElementById(id),v=el?String(el.value||"").trim().replace(",","."):"";if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
function numCalcSigned(id,signId){const n=numCalc(id);if(n==null)return null;const b=document.getElementById(signId);return b&&b.dataset.sign==="-1"?-Math.abs(n):Math.abs(n)}
async function guardarCalculo(p,version){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el cálculo.");return}
  const u=sesion();
  const payload={proyecto_id:p.id,version,tipo_calculo:document.getElementById("pr_calc_tipo").value,calefaccion_kw:numCalc("pr_calc_cal"),refrigeracion_kw:numCalc("pr_calc_ref"),acs_litros:numCalc("pr_calc_acs"),temperatura_impulsion_c:numCalc("pr_calc_imp"),entrada_meta:{superficie_m2:numCalc("pr_calc_sup"),temp_ext_invierno_c:numCalcSigned("pr_calc_te_inv","pr_calc_te_inv_sign"),temp_int_calefaccion_c:numCalc("pr_calc_ti_cal"),temp_ext_verano_c:numCalcSigned("pr_calc_te_ver","pr_calc_te_ver_sign"),temp_int_refrigeracion_c:numCalc("pr_calc_ti_ref")},resultado_meta:{creado_por_nombre:u.nombre||u.usuario||""},observaciones:document.getElementById("pr_calc_obs").value.trim()||null,creado_por:u.id||u.usuario||null};
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
      <div class="zx_pr_gen_top"><div><b>${limpiar(op.nombre)}</b><span>${calc?"Cálculo de referencia · Versión "+limpiar(calc.version):"Sin cálculo de referencia"}</span></div><div class="zx_pr_strategy_actions">${puedeEditar()?`<button type="button" data-pr-strategy-open="${limpiar(op.id)}">Estrategia</button><button type="button" data-pr-budget-open="${limpiar(op.id)}">Partidas</button><button type="button" data-pr-quote-open="${limpiar(op.id)}">Presupuesto</button>`:""}</div></div>
      ${op.descripcion?`<p>${limpiar(op.descripcion)}</p>`:""}
      <div class="zx_pr_strategy_count">${limpiar(textoEstadoPropuesta(est))} · ${rs.length} regla(s) de funcionamiento · Total cliente ${eur(op.total_cliente||0)}</div>
      ${rs.slice(0,3).map((r,n)=>`<div class="zx_pr_rule_resume"><b>${n+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))} · ${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}${r.condicion_tipo==="fallo_generador"&&r.generador_referencia_id?" · si falla "+limpiar(nombreGeneradorRelacionadoRegla(r)):""}</span></div>`).join("")}
      ${rs.length>3?`<div class="zx_pr_calc_by">+ ${rs.length-3} regla(s) más</div>`:""}
    </div>`;
  }).join("");
}
function opcionesCalculo(sel){return `<option value="">Sin cálculo asociado</option>`+CALCULOS.map(c=>`<option value="${limpiar(c.id)}" ${String(sel)===String(c.id)?"selected":""}>Versión ${limpiar(c.version)} · ${limpiar(textoTipoCalculo(c.tipo_calculo))}</option>`).join("")}
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
function reglasHTML(op){const rs=reglasPropuesta(op),bloqueada=propuestaAceptada(op);if(!rs.length)return `<div class="zx_pr_empty">Todavía no hay reglas definidas.</div>`;return rs.map((r,i)=>`<div class="zx_pr_rule_card"><div><b>${i+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))}</span></div><p>${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}</p>${detalleReglaHTML(r)}${!bloqueada?`<div class="zx_pr_rule_actions"><button type="button" data-pr-rule-edit="${limpiar(r.id)}">Editar</button><button type="button" data-pr-rule-del="${limpiar(r.id)}">Eliminar</button></div>`:`<div class="zx_pr_calc_by">Opción aceptada · regla bloqueada</div>`}</div>`).join("")}
function abrirEstrategia(p,opId){
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const bloqueada=propuestaAceptada(op);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_st_back" type="button">← Volver</button>${bloqueada?`<button type="button" disabled>Opción aceptada</button>`:`<button id="pr_st_add" class="primary" type="button">＋ Añadir regla</button>`}</div><div class="zx_pr_form_head"><span>ESTRATEGIA HÍBRIDA</span><h2>${limpiar(op.nombre)}</h2></div><div class="zx_pr_info"><b>Ordena cómo debe trabajar cada generador.</b><span>${bloqueada?"Esta opción está aceptada y sus reglas quedan bloqueadas.":"Las reglas describen la lógica prevista. El técnico debe comprobar que la hidráulica, el control y los equipos permiten ese funcionamiento."}</span></div><div class="zx_pr_rules">${reglasHTML(op)}</div>`);
  m.querySelector("#pr_st_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};const add=m.querySelector("#pr_st_add");if(add)add.onclick=()=>formularioRegla(p,op,null);
  m.querySelectorAll("[data-pr-rule-edit]").forEach(b=>b.onclick=()=>formularioRegla(p,op,reglasPropuesta(op).find(r=>String(r.id)===String(b.dataset.prRuleEdit))));
  m.querySelectorAll("[data-pr-rule-del]").forEach(b=>b.onclick=()=>eliminarRegla(p,op,b.dataset.prRuleDel));
}
function opcionesGeneradores(sel){return `<option value="">Selecciona generador</option>`+GENERADORES.filter(g=>g.existente===false||g.se_mantiene!==false).map(g=>`<option value="${limpiar(g.id)}" ${String(sel)===String(g.id)?"selected":""}>${limpiar(nombreGeneradorId(g.id))}</option>`).join("")}
function unidadCondicion(tipo){return ({temp_ext_menor:"°C",temp_ext_mayor:"°C",demanda_mayor:"kW",deposito_menor:"°C",excedente_fv_mayor:"kW",coste_energia:"€/kWh",horario:"h"})[tipo]||""}
function formularioRegla(p,op,r){
  if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}
  r=r||{};const nueva=!r.id;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_rule_back" type="button">← Volver</button><button id="pr_rule_save" class="primary" type="button">Guardar regla</button></div><div class="zx_pr_form_head"><span>${nueva?"NUEVA REGLA":"EDITAR REGLA"}</span><h2>Funcionamiento híbrido</h2></div>
    <label>Generador<select id="pr_rule_gen">${opcionesGeneradores(r.generador_id)}</select></label>
    <div id="pr_rule_gen_info" class="zx_pr_rule_gen_info"></div>
    <div class="zx_pr_grid2"><label>Servicio<select id="pr_rule_serv">${[["calefaccion","Calefacción"],["acs","ACS"],["refrigeracion","Refrigeración"],["piscina","Piscina"],["todos","Todos los servicios"]].map(([v,t])=>`<option value="${v}" ${r.servicio===v?"selected":""}>${t}</option>`).join("")}</select></label><label>Prioridad <span class="zx_pr_unit">orden</span><input id="pr_rule_prio" type="number" min="1" step="1" inputmode="numeric" value="${r.prioridad||reglasPropuesta(op).length+1}"></label></div>
    <label>Acción<select id="pr_rule_acc">${[["usar","Usar"],["priorizar","Priorizar"],["apoyo","Entrar como apoyo"],["simultaneo","Trabajar simultáneamente"],["reserva","Entrar como reserva"],["activar","Activar"],["bloquear","Bloquear"]].map(([v,t])=>`<option value="${v}" ${r.accion===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <label>Condición<select id="pr_rule_cond">${[["siempre","Siempre"],["manual","Orden manual"],["fallo_generador","Fallo de otro generador"],["temp_ext_menor","Temperatura exterior menor que"],["temp_ext_mayor","Temperatura exterior mayor que"],["demanda_mayor","Demanda mayor que"],["deposito_menor","Temperatura de depósito menor que"],["excedente_fv_mayor","Excedente fotovoltaico mayor que"],["coste_energia","Coste de energía"],["horario","Horario"]].map(([v,t])=>`<option value="${v}" ${r.condicion_tipo===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <div id="pr_rule_value_wrap" class="zx_pr_grid2"><label>Valor <span id="pr_rule_unit" class="zx_pr_unit"></span><input id="pr_rule_val" type="text" inputmode="decimal" value="${r.valor!=null?limpiar(r.valor):""}"></label><label id="pr_rule_ref_wrap">Generador relacionado<select id="pr_rule_ref">${opcionesGeneradores(r.generador_referencia_id)}</select></label></div>
    <label>Notas<textarea id="pr_rule_notes" rows="4" placeholder="Explicación o condición adicional…">${limpiar(r.notas||"")}</textarea></label>`);
  const cond=m.querySelector("#pr_rule_cond"),wrap=m.querySelector("#pr_rule_value_wrap"),unit=m.querySelector("#pr_rule_unit"),ref=m.querySelector("#pr_rule_ref_wrap"),genSel=m.querySelector("#pr_rule_gen"),genInfo=m.querySelector("#pr_rule_gen_info");
  const syncGen=()=>{const id=genSel.value;genInfo.textContent=id?"Seleccionado · "+nombreGeneradorId(id):"Selecciona un generador";genInfo.classList.toggle("is-empty",!id)};genSel.onchange=syncGen;syncGen();
  const sync=()=>{const t=cond.value,u=unidadCondicion(t),needsVal=!!u,needsRef=t==="fallo_generador";unit.textContent=u;wrap.style.display=(needsVal||needsRef)?"grid":"none";m.querySelector("#pr_rule_val").closest("label").style.display=needsVal?"grid":"none";ref.style.display=needsRef?"grid":"none"};cond.onchange=sync;sync();
  m.querySelector("#pr_rule_back").onclick=()=>abrirEstrategia(p,op.id);m.querySelector("#pr_rule_save").onclick=()=>guardarRegla(p,op,r);
}
async function guardarRegla(p,op,r){
  if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}
  const gen=document.getElementById("pr_rule_gen").value;if(!gen){alert("Selecciona un generador.");return}
  const cond=document.getElementById("pr_rule_cond").value,valor=document.getElementById("pr_rule_val").value.trim(),unidad=unidadCondicion(cond);
  const regla={id:r.id||uidRegla(),generador_id:gen,servicio:document.getElementById("pr_rule_serv").value,prioridad:Number(document.getElementById("pr_rule_prio").value)||1,accion:document.getElementById("pr_rule_acc").value,condicion_tipo:cond,valor:unidad&&valor!==""?valor:null,unidad:unidad||null,generador_referencia_id:cond==="fallo_generador"?(document.getElementById("pr_rule_ref").value||null):null,notas:document.getElementById("pr_rule_notes").value.trim()||null};
  const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(regla.id));rs.push(regla);rs.sort((a,b)=>(Number(a.prioridad)||99)-(Number(b.prioridad)||99));
  const btn=document.getElementById("pr_rule_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:r.id?"editada":"creada",resumen:(r.id?"Regla híbrida modificada: ":"Regla híbrida añadida: ")+nombreGeneradorId(gen),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:regla.id,generador_id:gen,condicion:cond,accion:regla.accion}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo guardar la regla.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar regla"}
}
async function eliminarRegla(p,op,id){if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}if(!confirm("¿Eliminar esta regla de funcionamiento?"))return;const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(id));try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:"eliminada",resumen:"Regla híbrida eliminada",usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:id}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo eliminar la regla.\n"+(e&&e.message?e.message:""))}}

function partidasHTML(op,xs){
  if(!xs.length)return `<div class="zx_pr_empty">Todavía no hay partidas añadidas.</div>`;
  return xs.map((x,i)=>{const q=numValor(x.cantidad),cu=numValor(x.coste_unitario),pu=numValor(x.precio_unitario),iva=numValor(x.iva),coste=x.coste_neto!=null?numValor(x.coste_neto):q*cu*(1-numValor(x.descuento)/100),venta=q*pu,total=venta*(1+iva/100),margen=venta-coste;
    return `<div class="zx_pr_part_card">
      <div class="zx_pr_gen_top"><div><b>${i+1}. ${limpiar(x.descripcion)}</b><span>${limpiar(textoTipoPartida(x.tipo))}${x.grupo?" · "+limpiar(x.grupo):""}</span></div>${puedeEditar()&&op.estado!=="aceptada"?`<button type="button" data-pr-part-edit="${limpiar(x.id)}">Editar</button>`:""}</div>
      <div class="zx_pr_gen_grid"><div><span>Cantidad</span><b>${limpiar(x.cantidad)} ${limpiar(x.unidad||"ud")}</b></div><div><span>Coste unitario</span><b>${eur(cu)}/${limpiar(x.unidad||"ud")}</b></div><div><span>Venta unitaria</span><b>${eur(pu)}/${limpiar(x.unidad||"ud")}</b></div><div><span>Descuento proveedor</span><b>${limpiar(numValor(x.descuento))} %</b></div><div><span>IVA</span><b>${limpiar(iva)} %</b></div><div><span>Coste</span><b>${eur(coste)}</b></div><div><span>Venta</span><b>${eur(venta)}</b></div><div><span>Margen</span><b>${eur(margen)}</b></div><div><span>Total cliente</span><b>${eur(total)}</b></div></div>
      ${x.referencia?`<p>Referencia: ${limpiar(x.referencia)}</p>`:""}
      ${puedeEditar()&&op.estado!=="aceptada"?`<div class="zx_pr_rule_actions"><button type="button" data-pr-part-del="${limpiar(x.id)}">Eliminar</button></div>`:""}
    </div>`;
  }).join("");
}
async function abrirPartidas(p,opId){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para consultar las partidas.");return}
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),bloqueada=op.estado==="aceptada";
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_budget_back" type="button">← Volver</button>${puedeEditar()&&!bloqueada?`<button id="pr_budget_add" class="primary" type="button">＋ Añadir partida</button>`:`<button type="button" disabled>Opción aceptada</button>`}</div>
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
  if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}
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
  if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}
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
  if(propuestaAceptada(op)){alert("La opción aceptada está bloqueada.");return}
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

function empresaDosier(){
  let cfg={};
  try{cfg=(zx()&&zx().config)||JSON.parse(localStorage.getItem("zentryx_config")||"{}")||{}}catch(e){}
  const e=cfg.empresa||{},n=String(e.nombre||"").trim();
  return {nombre:n&&n.toLowerCase()!=="zentryx pro"?n:"",logo:e.logo||"",color:e.color||"#0f766e",sector:e.sector||"",telefono:e.telefono||"",email:e.email||"",web:e.web||""};
}
function hexValido(v,def){const s=String(v||"").trim();return /^#[0-9a-fA-F]{6}$/.test(s)?s:def}
function lineasTexto(v){return String(v||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function dossierBase(p,op){
  const emp=empresaDosier();
  return {
    estilo:"comercial",
    titulo:"Propuesta de climatización y ACS",
    subtitulo:op&&op.descripcion?op.descripcion:"Solución preparada para "+nombreCliente(p.cliente_id),
    etiqueta:"Propuesta recomendada",
    recomendada:true,
    foto_portada_url:"",
    color_primario:hexValido(emp.color,"#0f766e"),
    color_acento:"#14b8a6",
    introduccion:"Una propuesta preparada a partir de los datos del inmueble, la instalación existente y las necesidades registradas en el proyecto.",
    beneficios:"Confort estable durante todo el año\nSolución adaptada a la instalación existente\nFuncionamiento claro y preparado para mantenimiento",
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
    mostrar_firma:true
  };
}
function dossierMeta(p,op){
  const base=dossierBase(p,op),cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};
  const saved=cm.dossier_meta&&typeof cm.dossier_meta==="object"&&!Array.isArray(cm.dossier_meta)?cm.dossier_meta:{};
  return {...base,...saved,color_primario:hexValido(saved.color_primario,base.color_primario),color_acento:hexValido(saved.color_acento,base.color_acento)};
}
function dossierSnapshot(op){const cm=op&&op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{};return cm.dossier_snapshot&&typeof cm.dossier_snapshot==="object"&&!Array.isArray(cm.dossier_snapshot)?cm.dossier_snapshot:null}
function valorCheck(id){const e=document.getElementById(id);return !!(e&&e.checked)}
function campoCheck(id,txt,checked){return `<label class="zx_pr_dossier_check"><input id="${id}" type="checkbox" ${checked?"checked":""}><span>${limpiar(txt)}</span></label>`}
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
  return {version:1,creado_at:new Date().toISOString(),config:{...cfg},empresa:{...emp},proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",inmueble_meta:p.inmueble_meta||{},descripcion:op.descripcion||"",calculo:calc?JSON.parse(JSON.stringify(calc)):null,generadores:GENERADORES.map(g=>JSON.parse(JSON.stringify(g))),reglas:reglasPropuesta(op).map(r=>({...r,generador_nombre_snapshot:r.generador_nombre_snapshot||nombreGeneradorId(r.generador_id),generador_referencia_nombre_snapshot:r.generador_referencia_id?(r.generador_referencia_nombre_snapshot||nombreGeneradorId(r.generador_referencia_id)):null})),partidas:(xs||[]).map(x=>JSON.parse(JSON.stringify(x))),totales:{...t}};
}
function datosDossierVista(p,op,xs,calc){
  const snap=dossierSnapshot(op),est=estadoPropuesta(op);
  if((est==="enviada"||est==="aceptada")&&snap){return {cfg:{...dossierBase(p,op),...(snap.config||{})},emp:snap.empresa||empresaDosier(),proyecto:snap.proyecto||p.nombre||"",cliente:snap.cliente||nombreCliente(p.cliente_id),direccion:snap.direccion||proyectoDir(p)||"",inmueble:snap.inmueble_meta||{},descripcion:snap.descripcion||op.descripcion||"",calc:snap.calculo||null,generadores:snap.generadores||[],reglas:snap.reglas||[],partidas:snap.partidas||[],totales:snap.totales||totalesPartidas(snap.partidas||[]),snapshot:true};}
  return {cfg:dossierMeta(p,op),emp:empresaDosier(),proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",inmueble:p.inmueble_meta||{},descripcion:op.descripcion||"",calc, generadores:GENERADORES,reglas:reglasPropuesta(op),partidas:xs,totales:totalesPartidas(xs),snapshot:false};
}
async function formularioDosier(p,opId){
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  if(estadoPropuesta(op)!=="borrador"){alert("El diseño queda bloqueado al marcar el presupuesto como enviado. Puedes consultar la vista guardada.");return abrirVistaDosier(p,opId)}
  const c=dossierMeta(p,op);
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_dcfg_back" type="button">← Volver</button><button id="pr_dcfg_save" class="primary" type="button">Guardar diseño</button></div>
    <div class="zx_pr_form_head"><span>DOSIER COMERCIAL</span><h2>Configurar presentación</h2></div>
    <div class="zx_pr_info"><b>El presupuesto puede adaptarse al tipo de cliente.</b><span>Elige el estilo, el contenido visible y cómo presentar los precios. Al marcarlo como enviado se guardará una copia cerrada.</span></div>
    <label>Estilo<select id="pr_dcfg_style"><option value="comercial" ${c.estilo==="comercial"?"selected":""}>Comercial visual</option><option value="profesional" ${c.estilo==="profesional"?"selected":""}>Profesional</option><option value="tecnico" ${c.estilo==="tecnico"?"selected":""}>Técnico</option></select></label>
    <div class="zx_pr_grid2"><label>Color principal<input id="pr_dcfg_primary" type="color" value="${limpiar(c.color_primario)}"></label><label>Color de apoyo<input id="pr_dcfg_accent" type="color" value="${limpiar(c.color_acento)}"></label></div>
    <label>Título de portada<input id="pr_dcfg_title" value="${limpiar(c.titulo)}"></label>
    <label>Subtítulo<input id="pr_dcfg_subtitle" value="${limpiar(c.subtitulo)}"></label>
    <label>Foto de portada · URL opcional<input id="pr_dcfg_photo" value="${limpiar(c.foto_portada_url)}" placeholder="https://..."></label>
    <div class="zx_pr_checks">${campoCheck("pr_dcfg_recommended","Destacar como propuesta recomendada",c.recomendada)}${campoCheck("pr_dcfg_property","Mostrar inmueble",c.mostrar_inmueble)}${campoCheck("pr_dcfg_calc","Mostrar datos del cálculo",c.mostrar_calculo)}${campoCheck("pr_dcfg_equips","Mostrar equipos",c.mostrar_equipos)}${campoCheck("pr_dcfg_rules","Mostrar funcionamiento",c.mostrar_funcionamiento)}${campoCheck("pr_dcfg_include","Mostrar qué incluye",c.mostrar_incluye)}${campoCheck("pr_dcfg_exclude","Mostrar qué no incluye",c.mostrar_no_incluye)}${campoCheck("pr_dcfg_warranty","Mostrar garantías",c.mostrar_garantia)}${campoCheck("pr_dcfg_payment","Mostrar forma de pago",c.mostrar_pago)}${campoCheck("pr_dcfg_term","Mostrar plazo",c.mostrar_plazo)}${campoCheck("pr_dcfg_sign","Mostrar zona de aceptación",c.mostrar_firma)}</div>
    <label>Presentación de precios<select id="pr_dcfg_prices"><option value="total" ${c.modo_precios==="total"?"selected":""}>Solo precio total</option><option value="capitulos" ${c.modo_precios==="capitulos"?"selected":""}>Precio por capítulos</option><option value="detallado" ${c.modo_precios==="detallado"?"selected":""}>Partidas detalladas</option></select></label>
    <label>Texto inicial<textarea id="pr_dcfg_intro" rows="4">${limpiar(c.introduccion)}</textarea></label>
    <label>Beneficios · uno por línea<textarea id="pr_dcfg_benefits" rows="5">${limpiar(c.beneficios)}</textarea></label>
    <label>Qué incluye<textarea id="pr_dcfg_includes" rows="4">${limpiar(c.incluye)}</textarea></label>
    <label>Qué no incluye<textarea id="pr_dcfg_excludes" rows="3">${limpiar(c.no_incluye)}</textarea></label>
    <label>Garantías<textarea id="pr_dcfg_warranty_txt" rows="3">${limpiar(c.garantia)}</textarea></label>
    <div class="zx_pr_grid2"><label>Forma de pago<textarea id="pr_dcfg_payment_txt" rows="3">${limpiar(c.forma_pago)}</textarea></label><label>Plazo estimado<textarea id="pr_dcfg_term_txt" rows="3">${limpiar(c.plazo)}</textarea></label></div>
    <label>Validez de la oferta <span class="zx_pr_unit">días</span><input id="pr_dcfg_valid" type="number" min="1" step="1" inputmode="numeric" value="${limpiar(c.validez_dias)}"></label>
    <label>Cierre comercial<textarea id="pr_dcfg_close" rows="4">${limpiar(c.cierre)}</textarea></label>`);
  m.querySelector("#pr_dcfg_back").onclick=()=>{cerrarModal();abrirPresupuesto(p,op.id)};
  m.querySelector("#pr_dcfg_save").onclick=()=>guardarDosier(p,op);
}
async function guardarDosier(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para guardar el diseño del dosier.");return}
  if(estadoPropuesta(op)!=="borrador"){alert("El diseño ya está bloqueado.");return}
  const c={estilo:document.getElementById("pr_dcfg_style").value,color_primario:document.getElementById("pr_dcfg_primary").value,color_acento:document.getElementById("pr_dcfg_accent").value,titulo:document.getElementById("pr_dcfg_title").value.trim(),subtitulo:document.getElementById("pr_dcfg_subtitle").value.trim(),foto_portada_url:document.getElementById("pr_dcfg_photo").value.trim(),recomendada:valorCheck("pr_dcfg_recommended"),mostrar_inmueble:valorCheck("pr_dcfg_property"),mostrar_calculo:valorCheck("pr_dcfg_calc"),mostrar_equipos:valorCheck("pr_dcfg_equips"),mostrar_funcionamiento:valorCheck("pr_dcfg_rules"),mostrar_partidas:true,mostrar_incluye:valorCheck("pr_dcfg_include"),mostrar_no_incluye:valorCheck("pr_dcfg_exclude"),mostrar_garantia:valorCheck("pr_dcfg_warranty"),mostrar_pago:valorCheck("pr_dcfg_payment"),mostrar_plazo:valorCheck("pr_dcfg_term"),mostrar_firma:valorCheck("pr_dcfg_sign"),modo_precios:document.getElementById("pr_dcfg_prices").value,introduccion:document.getElementById("pr_dcfg_intro").value.trim(),beneficios:document.getElementById("pr_dcfg_benefits").value.trim(),incluye:document.getElementById("pr_dcfg_includes").value.trim(),no_incluye:document.getElementById("pr_dcfg_excludes").value.trim(),garantia:document.getElementById("pr_dcfg_warranty_txt").value.trim(),forma_pago:document.getElementById("pr_dcfg_payment_txt").value.trim(),plazo:document.getElementById("pr_dcfg_term_txt").value.trim(),validez_dias:Math.max(1,Math.round(numValor(document.getElementById("pr_dcfg_valid").value)||30)),cierre:document.getElementById("pr_dcfg_close").value.trim()};
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
  const est=estadoPropuesta(op),cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?op.control_meta:{},ps=cm.presupuesto_snapshot||{},ds=dossierSnapshot(op)||{};
  const fechaDoc=ds.enviado_at||ds.aceptado_at||ps.aceptado_at||ds.creado_at||new Date().toISOString();
  const aceptada=est==="aceptada";
  const firma=c.mostrar_firma&&!aceptada?`<section class="zx_pr_dos_accept"><span>SIGUIENTE PASO</span><h3>${limpiar(c.cierre||"Confirmar la opción elegida")}</h3><div><p>Cliente / firma</p><p>Fecha</p></div></section>`:"";
  const cierreAceptado=aceptada?`<section class="zx_pr_dos_accepted"><span>PROPUESTA ACEPTADA</span><h3>Esta opción ha sido confirmada.</h3><p>${ps.aceptado_at?`Aceptada el <b>${limpiar(fechaES(ps.aceptado_at))}</b>${ps.aceptado_por?` por <b>${limpiar(ps.aceptado_por)}</b>`:""}.`:"La opción figura como aceptada y queda guardada sin cambios."}</p></section>`:"";
  const brandName=d.emp.nombre||"";
  const brandHTML=d.emp.logo||brandName?`<div class="zx_pr_dos_brand">${d.emp.logo?`<img src="${limpiar(d.emp.logo)}" alt="Logo" onerror="this.style.display='none'">`:""}${brandName?`<b>${limpiar(brandName)}</b>`:""}</div>`:`<div class="zx_pr_dos_brand zx_pr_dos_brand_generic"><b>PROPUESTA PERSONALIZADA</b></div>`;
  const footerBrand=brandName||"Propuesta comercial";
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_dview_back" type="button">← Volver</button>${est==="borrador"?`<button id="pr_dview_config" class="primary" type="button">⚙️ Configurar</button>`:`<button type="button" disabled>${aceptada?"Aceptada":"Enviada"}</button>`}</div>
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
      ${cierreAceptado}${firma}
      <footer class="zx_pr_dos_footer"><b>${limpiar(footerBrand)}</b><span>${limpiar(d.proyecto||op.nombre)}</span>${aceptada?`<small>Propuesta aceptada</small>`:d.snapshot?`<small>Versión comercial guardada</small>`:"<small>Vista previa</small>"}</footer>
    </div>`);
  m.querySelector("#pr_dview_back").onclick=()=>{cerrarModal();abrirPresupuesto(p,op.id)};const b=m.querySelector("#pr_dview_config");if(b)b.onclick=()=>formularioDosier(p,op.id);
}

async function marcarPropuestaEnviada(p,op){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para cambiar el estado del presupuesto.");return}
  if(propuestaAceptada(op))return;
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
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),u=sesion(),ahora=new Date().toISOString(),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id));
  const rs=reglasPropuesta(op).map(r=>({...r,generador_nombre_snapshot:r.generador_nombre_snapshot||nombreGeneradorId(r.generador_id),generador_referencia_nombre_snapshot:r.generador_referencia_id?(r.generador_referencia_nombre_snapshot||nombreGeneradorId(r.generador_referencia_id)):null}));
  const cm=op.control_meta&&typeof op.control_meta==="object"&&!Array.isArray(op.control_meta)?{...op.control_meta}:{};
  if(!cm.dossier_snapshot){const cfg=dossierMeta(p,op);cm.dossier_meta=cfg;cm.dossier_snapshot=snapshotDossier(p,op,xs,calc,cfg)}
  cm.dossier_snapshot.aceptado_at=ahora;cm.dossier_snapshot.aceptado_por=u.nombre||u.usuario||"";
  cm.presupuesto_snapshot={aceptado_at:ahora,aceptado_por:u.nombre||u.usuario||"",proyecto:p.nombre||"",cliente:nombreCliente(p.cliente_id),direccion:proyectoDir(p)||"",calculo:calc?"Versión "+calc.version:"Sin cálculo asociado",descripcion:op.descripcion||"",base_imponible:t.venta,iva:t.total-t.venta,total:t.total};
  try{
    const q=await sb().from("proyectos_propuestas").update({estado:"aceptada",estrategia_meta:rs,control_meta:cm,coste_total:t.coste,precio_venta:t.venta,total_cliente:t.total}).eq("id",op.id).select("*").single();if(q.error)throw q.error;
    const qp=await sb().from("proyectos").update({estado:"aceptado",updated_at:ahora}).eq("id",p.id);if(qp.error)throw qp.error;
    try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"presupuesto",accion:"aceptado",resumen:"Opción aceptada y bloqueada: "+op.nombre,usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,estado:"aceptada",fecha:ahora,total:t.total}}])}catch(e){}
    await cargar();await cargarPropuestas(p.id);abrirPresupuesto(CACHE.find(x=>String(x.id)===String(p.id))||p,op.id);
  }catch(e){alert("No se pudo aceptar la opción.\n"+(e&&e.message?e.message:""))}
}
async function abrirPresupuesto(p,opId){
  if(!sb()||!navigator.onLine){alert("Necesitas conexión para consultar el presupuesto.");return}
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const xs=await cargarPartidas(op.id),t=totalesPartidas(xs),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id)),ivaTotal=t.total-t.venta,rs=reglasPropuesta(op),est=estadoPropuesta(op),snap=op.control_meta&&op.control_meta.presupuesto_snapshot,dosSnap=dossierSnapshot(op);
  const proyectoVista=est==="aceptada"&&snap&&snap.proyecto?snap.proyecto:p.nombre;
  const clienteVista=est==="aceptada"&&snap&&snap.cliente?snap.cliente:nombreCliente(p.cliente_id);
  const direccionVista=est==="aceptada"&&snap&&snap.direccion?snap.direccion:(proyectoDir(p)||"Sin dirección seleccionada");
  const calculoVista=est==="aceptada"&&snap&&snap.calculo?snap.calculo:(calc?"Versión "+calc.version:"Sin cálculo asociado");
  const accionTop=est==="aceptada"?`<button type="button" disabled>Aceptada</button>`:est==="enviada"?`<button id="pr_quote_accept" class="primary" type="button">✓ Aceptar opción</button>`:`<button id="pr_quote_send" class="primary" type="button">Marcar enviada</button>`;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_quote_back" type="button">← Volver</button>${accionTop}</div>
    <div class="zx_pr_form_head"><span>PRESUPUESTO COMERCIAL · ${limpiar(textoEstadoPropuesta(est).toUpperCase())}</span><h2>${limpiar(op.nombre)}</h2></div>
    ${est==="aceptada"?`<div class="zx_pr_info"><b>Opción aceptada y bloqueada</b><span>${snap&&snap.aceptado_at?"Aceptada el "+limpiar(fechaES(snap.aceptado_at))+(snap.aceptado_por?" por "+limpiar(snap.aceptado_por):""):"Las reglas y partidas no se pueden modificar."}</span></div>`:""}
    <div class="zx_pr_dossier_tools"><button id="pr_quote_dossier" type="button">✨ Vista dosier</button>${est==="borrador"?`<button id="pr_quote_dossier_cfg" type="button">⚙️ Configurar dosier</button>`:dosSnap?`<span>Dosier comercial guardado con esta versión</span>`:`<span>Esta opción es anterior al dosier; la vista se genera con sus datos bloqueados</span>`}</div>
    <div class="zx_pr_quote_head"><div><span>Proyecto</span><b>${limpiar(proyectoVista)}</b></div><div><span>Cliente</span><b>${limpiar(clienteVista)}</b></div><div><span>Dirección</span><b>${limpiar(direccionVista)}</b></div><div><span>Cálculo</span><b>${limpiar(calculoVista)}</b></div></div>
    ${op.descripcion?`<div class="zx_pr_info"><b>Solución propuesta</b><span>${limpiar(op.descripcion)}</span></div>`:""}
    ${rs.length?`<div class="zx_pr_section"><h3>Funcionamiento previsto</h3>${rs.map((r,i)=>`<div class="zx_pr_rule_resume"><b>${i+1}. ${limpiar(nombreGeneradorRegla(r))}</b><span>${limpiar(textoServicioRegla(r.servicio))} · ${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.condicion_tipo==="fallo_generador"&&r.generador_referencia_id?" · si falla "+limpiar(nombreGeneradorRelacionadoRegla(r)):""}</span></div>`).join("")}</div>`:""}
    <div class="zx_pr_section"><h3>Partidas</h3><div class="zx_pr_quote_lines">${presupuestoPartidasHTML(xs)}</div></div>
    <div class="zx_pr_quote_totals"><div><span>Base imponible</span><b>${eur(t.venta)}</b></div><div><span>IVA</span><b>${eur(ivaTotal)}</b></div><div class="total"><span>Total presupuesto</span><b>${eur(t.total)}</b></div></div>
    <div class="zx_pr_info"><b>Vista para cliente</b><span>${est==="aceptada"?"Esta opción queda bloqueada como versión aceptada. La vista del dosier conserva la copia comercial guardada al enviar.":est==="enviada"?"El presupuesto figura como enviado y el dosier comercial ya tiene una copia cerrada. Si el cliente lo aprueba, usa Aceptar opción.":"Configura y revisa el dosier antes de marcar la oferta como enviada. Al hacerlo se guardará una copia cerrada de esta presentación."}</span></div>`);
  m.querySelector("#pr_quote_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};
  const dv=m.querySelector("#pr_quote_dossier");if(dv)dv.onclick=()=>abrirVistaDosier(p,op.id);
  const dc=m.querySelector("#pr_quote_dossier_cfg");if(dc)dc.onclick=()=>formularioDosier(p,op.id);
  const send=m.querySelector("#pr_quote_send");if(send)send.onclick=()=>marcarPropuestaEnviada(p,op);
  const accept=m.querySelector("#pr_quote_accept");if(accept)accept.onclick=()=>aceptarPropuesta(p,op);
}
function conectarEstrategia(p){const n=document.getElementById("pr_op_nueva");if(n)n.onclick=()=>formularioOpcionTecnica(p);document.querySelectorAll("[data-pr-strategy-open]").forEach(b=>b.onclick=()=>abrirEstrategia(p,b.dataset.prStrategyOpen));document.querySelectorAll("[data-pr-budget-open]").forEach(b=>b.onclick=()=>abrirPartidas(p,b.dataset.prBudgetOpen));document.querySelectorAll("[data-pr-quote-open]").forEach(b=>b.onclick=()=>abrirPresupuesto(p,b.dataset.prQuoteOpen))}

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
    ${p.notas_internas?`<section class="zx_pr_section"><h3>Notas internas</h3><p class="zx_pr_notes">${limpiar(p.notas_internas)}</p></section>`:""}
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Instalación y generadores</h3><span>${GENERADORES.length} registrado(s)</span></div>${puedeEditar()?`<button id="pr_gen_nuevo" class="zx_pr_small_primary" type="button">＋ Añadir generador</button>`:""}</div><div class="zx_pr_generadores">${generadoresHTML()}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Emisores y circuitos</h3><span>${listaEmisores(p).length} registrado(s)</span></div>${puedeEditar()?`<button id="pr_em_nuevo" class="zx_pr_small_primary" type="button">＋ Añadir emisor</button>`:""}</div><div class="zx_pr_emisores">${emisoresHTML(p)}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Cálculo térmico</h3><span>${CALCULOS.length} versión(es) guardada(s)</span></div>${puedeEditar()?`<button id="pr_calc_nuevo" class="zx_pr_small_primary" type="button">＋ Nuevo cálculo</button>`:""}</div><div class="zx_pr_calculos">${calculosHTML()}</div></section>
    <section class="zx_pr_section"><div class="zx_pr_section_head"><div><h3>Estrategia híbrida</h3><span>${PROPUESTAS.length} opción(es) técnica(s)</span></div>${puedeEditar()?`<button id="pr_op_nueva" class="zx_pr_small_primary" type="button">＋ Nueva opción</button>`:""}</div><div class="zx_pr_strategies">${propuestasEstrategiaHTML()}</div></section>
    <section class="zx_pr_next"><b>Próximas partes</b><span>El dosier comercial ya puede configurarse y revisarse. Después añadiremos compartir/PDF y creación de Trabajo.</span></section>`);
  m.querySelector("#pr_ficha_back").onclick=cerrarModal;
  const e=m.querySelector("#pr_ficha_edit");if(e)e.onclick=()=>{cerrarModal();formulario(p)};
  const c=m.querySelector("#pr_ficha_close");if(c)c.onclick=cerrarModal;
  conectarGeneradores(p);
  conectarEmisores(p);
  conectarCalculos(p);
  conectarEstrategia(p);
}
function instalarCSS(){if(document.getElementById("zx_proyectos_css"))return;const s=document.createElement("style");s.id="zx_proyectos_css";s.textContent=`
.zx_pr_shell{max-width:1180px;margin:0 auto;padding:14px 14px 90px;display:grid;gap:14px}.zx_pr_panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:17px;box-shadow:0 8px 26px rgba(15,23,42,.05)}.zx_pr_head{display:flex;align-items:center;justify-content:space-between;gap:14px}.zx_pr_head h2{margin:0;color:#071330;font-size:28px}.zx_pr_head p{margin:5px 0 0;color:#64748b;font-weight:750}.zx_pr_primary,.zx_pr_top_actions .primary{border:0;border-radius:15px;background:#0f766e;color:#fff;min-height:46px;padding:11px 16px;font-weight:950;font-size:14px}.zx_pr_kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}.zx_pr_kpis div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:10px;text-align:center}.zx_pr_kpis b{display:block;color:#071330;font-size:21px}.zx_pr_kpis span{color:#64748b;font-size:11px;font-weight:900}.zx_pr_tools{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:9px}.zx_pr_tools input,.zx_pr_tools select,.zx_pr_modal_box input,.zx_pr_modal_box select,.zx_pr_modal_box textarea{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;color:#0f172a;padding:12px;font-size:15px;font-weight:750}.zx_pr_list_head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.zx_pr_list_head h3{margin:0;color:#071330}.zx_pr_list_head span{color:#64748b;font-size:12px;font-weight:900}.zx_pr_list{display:grid;gap:9px}.zx_pr_card{width:100%;text-align:left;border:1px solid #dbe3ef;border-radius:18px;background:#fff;padding:14px;color:#0f172a}.zx_pr_card_top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.zx_pr_card_top>b{font-size:16px}.zx_pr_client{font-weight:900;color:#334155;margin-top:7px}.zx_pr_meta{display:flex;flex-wrap:wrap;gap:7px 14px;color:#64748b;font-size:12px;font-weight:800;margin-top:7px}.zx_pr_estado{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;background:#e2e8f0;color:#334155;font-size:10px;font-weight:950;white-space:nowrap}.zx_pr_e_aceptado,.zx_pr_e_terminado{background:#dcfce7;color:#166534}.zx_pr_e_rechazado{background:#fee2e2;color:#991b1b}.zx_pr_e_enviado,.zx_pr_e_presupuestado{background:#dbeafe;color:#1d4ed8}.zx_pr_empty{padding:24px;text-align:center;color:#64748b;font-weight:850}.zx_pr_modal{position:fixed;inset:0;z-index:100250;background:rgba(15,23,42,.68);padding:12px;display:flex;align-items:flex-start;justify-content:center;overflow:auto}.zx_pr_modal_box{width:min(760px,100%);margin:auto;background:#fff;border-radius:26px;padding:18px;box-shadow:0 28px 80px rgba(15,23,42,.4);display:grid;gap:13px}.zx_pr_top_actions{position:sticky;top:-18px;z-index:4;display:grid;grid-template-columns:1fr 1fr;gap:9px;background:rgba(255,255,255,.98);padding:3px 0 12px;border-bottom:1px solid #e2e8f0}.zx_pr_top_actions button{border:1px solid #cbd5e1;border-radius:15px;background:#fff;color:#334155;min-height:46px;padding:10px;font-weight:950}.zx_pr_top_actions .primary{background:#0f766e;color:#fff;border-color:#0f766e}.zx_pr_form_head span,.zx_pr_ficha_head>span{color:#0f766e;font-size:11px;font-weight:950;letter-spacing:.08em}.zx_pr_form_head h2,.zx_pr_ficha_head h2{margin:3px 0 0;color:#071330;font-size:26px}.zx_pr_modal_box label{display:grid;gap:6px;color:#475569;font-size:13px;font-weight:950}.zx_pr_grid2,.zx_pr_viewgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.zx_pr_section{border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;padding:14px}.zx_pr_section h3{margin:0 0 12px;color:#071330;font-size:17px}.zx_pr_unit{color:#0f766e;font-size:11px}.zx_pr_viewgrid>div{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px;min-width:0}.zx_pr_viewgrid span{display:block;color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase}.zx_pr_viewgrid b{display:block;color:#0f172a;font-size:14px;margin-top:4px;word-break:break-word}.zx_pr_notes{margin:0;color:#334155;white-space:pre-wrap}.zx_pr_next{border:1px dashed #99f6e4;border-radius:17px;background:#f0fdfa;padding:13px}.zx_pr_next b,.zx_pr_next span{display:block}.zx_pr_next b{color:#115e59}.zx_pr_next span{color:#475569;font-size:12px;font-weight:800;margin-top:4px;line-height:1.4}.zx_pr_section_head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.zx_pr_section_head h3{margin:0}.zx_pr_section_head span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:3px}.zx_pr_small_primary{border:0;border-radius:12px;background:#0f766e;color:#fff;padding:9px 11px;font-weight:950}.zx_pr_generadores,.zx_pr_emisores{display:grid;gap:9px}.zx_pr_gen_card,.zx_pr_em_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_gen_top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.zx_pr_gen_top b{display:block;color:#071330;font-size:16px}.zx_pr_gen_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_gen_top button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}.zx_pr_gen_grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.zx_pr_gen_grid>div{border-radius:11px;background:#f8fafc;padding:8px}.zx_pr_gen_grid span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_gen_grid b{display:block;color:#0f172a;font-size:12px;margin-top:3px}.zx_pr_gen_tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.zx_pr_gen_tags span{background:#ecfeff;color:#155e75;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}.zx_pr_gen_decision{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_gen_card p,.zx_pr_em_card p{margin:7px 0 0;color:#475569;font-size:11px;font-weight:700;white-space:pre-wrap}.zx_pr_checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_checks label{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:10px;color:#334155}.zx_pr_checks input{width:20px!important;height:20px;margin:0;padding:0}.zx_pr_checks span{font-size:12px;font-weight:900}.zx_pr_role{margin-top:12px}.zx_pr_danger{width:100%;border:1px solid #fecaca;border-radius:13px;background:#fff1f2;color:#991b1b;padding:11px;font-weight:950}.zx_pr_calculos{display:grid;gap:9px}.zx_pr_calc_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_calc_top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.zx_pr_calc_top b{display:block;color:#071330;font-size:16px}.zx_pr_calc_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_calc_badge{background:#dcfce7!important;color:#166534!important;border-radius:999px;padding:5px 8px;font-size:9px!important;font-weight:950!important}.zx_pr_calc_by{margin-top:9px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_info{border:1px solid #bae6fd;border-radius:15px;background:#f0f9ff;padding:12px}.zx_pr_info b,.zx_pr_info span{display:block}.zx_pr_info b{color:#0c4a6e}.zx_pr_info span{margin-top:4px;color:#475569;font-size:11px;font-weight:750;line-height:1.45}.zx_pr_signed{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px}.zx_pr_signed .zx_pr_sign{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#071330;font-size:24px;font-weight:950;min-height:46px;padding:0}.zx_pr_signed input{min-width:0}.zx_pr_strategies,.zx_pr_rules{display:grid;gap:9px}.zx_pr_strategy_card,.zx_pr_rule_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_strategy_card p,.zx_pr_rule_card p{margin:8px 0;color:#475569;font-size:11px;font-weight:750;line-height:1.4}.zx_pr_strategy_count{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_rule_resume{margin-top:8px;background:#f8fafc;border-radius:11px;padding:8px}.zx_pr_rule_resume b,.zx_pr_rule_resume span{display:block}.zx_pr_rule_resume b{color:#0f172a;font-size:11px}.zx_pr_rule_resume span{color:#64748b;font-size:10px;font-weight:800;margin-top:2px}.zx_pr_rule_card>div:first-child b,.zx_pr_rule_card>div:first-child span{display:block}.zx_pr_rule_card>div:first-child b{color:#071330;font-size:13px}.zx_pr_rule_card>div:first-child span{color:#64748b;font-size:10px;font-weight:850;margin-top:2px}.zx_pr_rule_detail{display:grid;gap:5px;margin:8px 0 10px;padding:9px 10px;border-radius:11px;background:#f8fafc;color:#475569;font-size:10px;font-weight:850;line-height:1.4}.zx_pr_rule_detail span{display:block}.zx_pr_rule_actions{display:flex;gap:7px}.zx_pr_rule_actions button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}.zx_pr_rule_gen_info{margin-top:-5px;border-radius:12px;background:#f0fdfa;color:#0f766e;padding:9px 11px;font-size:11px;font-weight:950;line-height:1.35}.zx_pr_rule_gen_info.is-empty{background:#f8fafc;color:#64748b}.zx_pr_strategy_actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.zx_pr_budget_totals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.zx_pr_budget_totals>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:10px}.zx_pr_budget_totals span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_budget_totals b{display:block;color:#071330;font-size:14px;margin-top:3px}.zx_pr_parts{display:grid;gap:9px}.zx_pr_part_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_part_card p{margin:7px 0;color:#64748b;font-size:10px;font-weight:800}.zx_pr_part_preview{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:14px;padding:11px;color:#115e59;font-size:11px;font-weight:850}.zx_pr_part_preview b{font-size:13px}.zx_pr_part_preview span,.zx_pr_part_preview b{display:block}.zx_pr_quote_head{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_quote_head>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:10px}.zx_pr_quote_head span,.zx_pr_quote_head b{display:block}.zx_pr_quote_head span{color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_quote_head b{color:#071330;font-size:13px;margin-top:3px}.zx_pr_quote_lines{display:grid;gap:8px}.zx_pr_quote_line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start;background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:11px}.zx_pr_quote_line>div:first-child b,.zx_pr_quote_line>div:first-child span{display:block}.zx_pr_quote_line>div:first-child b{color:#071330;font-size:13px}.zx_pr_quote_line>div:first-child span{color:#64748b;font-size:10px;font-weight:850;margin-top:3px}.zx_pr_quote_nums{text-align:right}.zx_pr_quote_nums span,.zx_pr_quote_nums b,.zx_pr_quote_nums small{display:block}.zx_pr_quote_nums span{color:#64748b;font-size:10px;font-weight:800}.zx_pr_quote_nums b{color:#071330;font-size:13px;margin-top:3px}.zx_pr_quote_nums small{color:#64748b;font-size:9px;font-weight:800;margin-top:2px}.zx_pr_quote_totals{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_quote_totals>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:11px}.zx_pr_quote_totals span,.zx_pr_quote_totals b{display:block}.zx_pr_quote_totals span{color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_quote_totals b{color:#071330;font-size:15px;margin-top:4px}.zx_pr_quote_totals .total{grid-column:1/-1;background:#f0fdfa;border-color:#99f6e4}.zx_pr_quote_totals .total b{font-size:20px;color:#115e59}.zx_pr_dossier_tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_dossier_tools button{border:1px solid #99f6e4;background:#f0fdfa;color:#115e59;border-radius:13px;padding:11px;font-weight:950}.zx_pr_dossier_tools span{grid-column:1/-1;background:#f8fafc;border-radius:12px;padding:9px 11px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_dossier_check{display:flex!important;align-items:center;gap:8px;background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:10px!important}.zx_pr_dossier_check input{width:20px!important;height:20px!important;margin:0!important}.zx_pr_dossier_check span{font-size:11px;font-weight:900;color:#334155}.zx_pr_dos_wrap{display:grid;gap:0;background:#eef2f7;border-radius:20px;overflow:hidden;border:1px solid #dbe3ef}.zx_pr_dos_cover{position:relative;min-height:420px;background:linear-gradient(145deg,var(--dos-primary),#071330);color:#fff;overflow:hidden;padding:28px;display:flex;flex-direction:column;justify-content:space-between}.zx_pr_dos_cover_img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.zx_pr_dos_cover_overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,19,48,.18),rgba(7,19,48,.88))}.zx_pr_dos_brand,.zx_pr_dos_cover_text{position:relative;z-index:1}.zx_pr_dos_brand{display:flex;align-items:center;gap:10px}.zx_pr_dos_brand img{width:48px;height:48px;object-fit:contain;border-radius:12px;background:#fff;padding:4px}.zx_pr_dos_brand b{font-size:16px}.zx_pr_dos_cover_text small{display:block;font-size:10px;letter-spacing:.14em;font-weight:950;opacity:.85}.zx_pr_dos_cover_text h1{font-size:38px;line-height:1.02;margin:10px 0 12px;max-width:620px}.zx_pr_dos_cover_text p{font-size:17px;line-height:1.35;margin:0 0 18px;max-width:620px}.zx_pr_dos_cover_text>div{font-size:11px;font-weight:850;opacity:.9}.zx_pr_dos_badge{display:inline-block;background:var(--dos-accent);color:#042f2e;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:950;margin-bottom:16px}.zx_pr_dos_intro,.zx_pr_dos_section,.zx_pr_dos_accept{background:#fff;padding:26px}.zx_pr_dos_intro h2{margin:0;color:#071330;font-size:26px}.zx_pr_dos_intro p{color:#475569;font-size:13px;line-height:1.6}.zx_pr_dos_intro>div{display:grid;gap:7px;margin-top:15px}.zx_pr_dos_intro>div span{background:#f0fdfa;border-left:4px solid var(--dos-accent);border-radius:9px;padding:9px 11px;color:#115e59;font-size:12px;font-weight:850}.zx_pr_dos_section{border-top:1px solid #e2e8f0}.zx_pr_dos_kicker{color:var(--dos-primary);font-size:10px;font-weight:950;letter-spacing:.12em}.zx_pr_dos_section h3{font-size:23px;color:#071330;margin:7px 0 12px}.zx_pr_dos_section>p{color:#475569;line-height:1.55}.zx_pr_dos_metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.zx_pr_dos_metrics>div{background:#f8fafc;border-radius:13px;padding:12px}.zx_pr_dos_metrics span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_dos_metrics b{display:block;color:#071330;font-size:15px;margin-top:4px}.zx_pr_dos_equips{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.zx_pr_dos_equips article{background:linear-gradient(145deg,#f8fafc,#fff);border:1px solid #dbe3ef;border-radius:16px;padding:15px}.zx_pr_dos_equips article>span{font-size:9px;font-weight:950;color:var(--dos-primary);text-transform:uppercase}.zx_pr_dos_equips h4{font-size:20px;margin:7px 0;color:#071330}.zx_pr_dos_equips b{display:block;color:#0f172a}.zx_pr_dos_equips p{color:#64748b;font-size:11px;font-weight:800}.zx_pr_dos_solution{background:linear-gradient(145deg,#f0fdfa,#ecfeff)}.zx_pr_dos_flow{display:grid;gap:10px}.zx_pr_dos_flow>div{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px}.zx_pr_dos_flow>div>span{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--dos-primary);color:#fff;font-weight:950}.zx_pr_dos_flow b{display:block;color:#071330}.zx_pr_dos_flow p{margin:3px 0;color:#475569;font-size:11px;font-weight:800}.zx_pr_dos_flow small{color:#64748b}.zx_pr_dos_chapters{display:grid;gap:8px}.zx_pr_dos_chapters>div{display:flex;justify-content:space-between;gap:15px;background:#f8fafc;border-radius:12px;padding:11px}.zx_pr_dos_chapters span{color:#334155;font-weight:850}.zx_pr_dos_chapters b{color:#071330}.zx_pr_dos_total{margin-top:12px;background:var(--dos-primary);color:#fff;border-radius:16px;padding:15px}.zx_pr_dos_total span,.zx_pr_dos_total b,.zx_pr_dos_total small{display:block}.zx_pr_dos_total b{font-size:27px;margin-top:3px}.zx_pr_dos_total small{opacity:.85;margin-top:3px}.zx_pr_dos_price{text-align:center;background:linear-gradient(145deg,var(--dos-primary),#071330);color:#fff}.zx_pr_dos_price span,.zx_pr_dos_price b,.zx_pr_dos_price small{display:block}.zx_pr_dos_price b{font-size:38px;margin:5px 0}.zx_pr_dos_lines{display:grid;gap:7px}.zx_pr_dos_lines>div{display:flex;justify-content:space-between;gap:12px;background:#f8fafc;border-radius:12px;padding:11px}.zx_pr_dos_lines b,.zx_pr_dos_lines span{display:block}.zx_pr_dos_lines span{color:#64748b;font-size:10px;margin-top:3px}.zx_pr_dos_info_grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.zx_pr_dos_info_grid>div{background:#f8fafc;border-radius:13px;padding:12px}.zx_pr_dos_info_grid b{color:#071330}.zx_pr_dos_info_grid p{color:#475569;font-size:11px;line-height:1.5;margin:5px 0 0}.zx_pr_dos_valid{margin-top:10px;color:#475569;font-size:11px}.zx_pr_dos_accept{background:linear-gradient(145deg,#071330,var(--dos-primary));color:#fff}.zx_pr_dos_accept>span{font-size:10px;font-weight:950;letter-spacing:.12em;color:#99f6e4}.zx_pr_dos_accept h3{font-size:22px;margin:8px 0 22px}.zx_pr_dos_accept>div{display:grid;grid-template-columns:1fr 1fr;gap:20px}.zx_pr_dos_accept p{border-top:1px solid rgba(255,255,255,.6);padding-top:8px;font-size:10px}.zx_pr_dos_footer{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 20px;background:#071330;color:#fff;font-size:10px}.zx_pr_dos_footer span{opacity:.8}.zx_pr_dos_footer small{opacity:.65}.zx_pr_dos_profesional .zx_pr_dos_cover{min-height:320px;background:var(--dos-primary)}.zx_pr_dos_profesional .zx_pr_dos_intro>div span{background:#f8fafc;border-left-color:var(--dos-primary)}.zx_pr_dos_tecnico .zx_pr_dos_cover{min-height:280px;background:#071330}.zx_pr_dos_tecnico .zx_pr_dos_intro h2{font-size:22px}.zx_pr_dos_tecnico .zx_pr_dos_section h3{font-size:19px}.zx_pr_dos_lead{margin:-4px 0 14px!important;color:#64748b!important;font-size:11px!important}.zx_pr_dos_equips article{padding:0;overflow:hidden}.zx_pr_dos_equipment_img,.zx_pr_dos_equipment_placeholder{width:100%;height:150px;display:block;object-fit:cover;background:linear-gradient(145deg,var(--dos-primary),#071330)}.zx_pr_dos_equipment_placeholder{display:grid;place-items:center}.zx_pr_dos_equipment_placeholder span{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:34px;font-weight:950}.zx_pr_dos_equipment_body{padding:15px}.zx_pr_dos_equipment_body>span{font-size:9px;font-weight:950;color:var(--dos-primary);text-transform:uppercase}.zx_pr_dos_equipment_tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.zx_pr_dos_equipment_tags em{font-style:normal;background:#ecfeff;color:#0f766e;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900}.zx_pr_dos_equipment_body small{display:block;margin-top:9px;color:#64748b;line-height:1.45}.zx_pr_dos_brand_generic b{font-size:10px;letter-spacing:.12em;opacity:.85}.zx_pr_dos_accepted{background:linear-gradient(145deg,#ecfdf5,#f0fdfa);padding:26px;border-top:1px solid #a7f3d0;color:#065f46}.zx_pr_dos_accepted>span{font-size:10px;font-weight:950;letter-spacing:.12em}.zx_pr_dos_accepted h3{margin:8px 0 6px;color:#064e3b;font-size:23px}.zx_pr_dos_accepted p{margin:0;color:#47635d;line-height:1.5}.zx_pr_dos_solution p{margin:0!important}.zx_pr_dos_chapters>div b{white-space:nowrap}@media(max-width:620px){.zx_pr_dossier_tools{grid-template-columns:1fr}.zx_pr_dos_cover{min-height:390px;padding:22px}.zx_pr_dos_cover_text h1{font-size:31px}.zx_pr_dos_intro,.zx_pr_dos_section,.zx_pr_dos_accept{padding:20px}.zx_pr_dos_metrics,.zx_pr_dos_equips,.zx_pr_dos_info_grid{grid-template-columns:1fr}.zx_pr_dos_footer{display:grid}.zx_pr_head{align-items:stretch;flex-direction:column}.zx_pr_primary{width:100%}.zx_pr_tools,.zx_pr_grid2,.zx_pr_viewgrid,.zx_pr_gen_grid{grid-template-columns:1fr}.zx_pr_modal_box{padding:15px;border-radius:22px}.zx_pr_card_top{display:grid}.zx_pr_section_head{align-items:stretch;flex-direction:column}.zx_pr_small_primary{width:100%}.zx_pr_checks{grid-template-columns:1fr}.zx_pr_kpis{gap:5px}.zx_pr_kpis span{font-size:9px}.zx_pr_budget_totals{grid-template-columns:1fr 1fr}.zx_pr_strategy_actions{justify-content:flex-start}.zx_pr_quote_head{grid-template-columns:1fr}.zx_pr_quote_line{grid-template-columns:1fr}.zx_pr_quote_nums{text-align:left}}`;
document.head.appendChild(s)}

window.ZX_proyectos=async function(){
  instalarCSS();
  if(zx()&&typeof zx().marcarModuloActivo==="function")zx().marcarModuloActivo("proyectos");
  if(!puedeEntrar()){app().innerHTML=`<div class="zx_pr_panel"><h2>Proyectos</h2><div>No tienes permiso para acceder a Proyectos.</div></div>`;return}
  CACHE=leerCache();shell();
  await cargarAuxiliares();await cargar();shell();
  const abrir=window.ZX_PROYECTO_ABRIR_ID;window.ZX_PROYECTO_ABRIR_ID="";if(abrir)abrirFicha(abrir);
};
window.ZX_abrirProyectos=window.ZX_proyectos;
if(zx()&&typeof zx().registrarModulo==="function")zx().registrarModulo("proyectos",{nombre:"Proyectos",activo:true,version:ZX_VERSION});
console.log("ZENTRYX proyectos.js V"+ZX_VERSION+" cargado");
})();
