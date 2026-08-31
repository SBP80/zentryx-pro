// ===============================
// ZENTRYX PRO - PROYECTOS V1009
// V1009 - IDENTIFICACIÓN COMPLETA DE GENERADORES EN ESTRATEGIA
// ===============================
(function(){
"use strict";

const ZX_VERSION="1009";
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
function nombreGeneradorId(id){const g=GENERADORES.find(x=>String(x.id)===String(id));if(!g)return "Generador";const potencia=(g.potencia_kw!=null&&g.potencia_kw!=="")?limpiar(g.potencia_kw)+" kW":"";return [textoGenerador(g.tipo),g.marca,g.modelo,potencia].filter(Boolean).join(" · ")}
function uidRegla(){return "rg_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}

async function cargarGeneradores(proyectoId){
  GENERADORES=[];
  if(!sb()||!navigator.onLine)return GENERADORES;
  try{const r=await sb().from("proyectos_generadores").select("*").eq("proyecto_id",proyectoId).order("orden",{ascending:true}).order("created_at",{ascending:true});if(r.error)throw r.error;GENERADORES=r.data||[]}catch(e){}
  return GENERADORES;
}

async function cargarAuxiliares(){
  if(!sb()||!navigator.onLine)return;
  try{
    const [c,d,u]=await Promise.all([
      sb().from("clientes").select("id,nombre,estado").order("nombre",{ascending:true}),
      sb().from("clientes_direcciones").select("*").eq("activa",true).order("principal",{ascending:false}).order("orden",{ascending:true}),
      sb().from("usuarios").select("id,usuario,nombre,activo,estado").order("nombre",{ascending:true})
    ]);
    if(!c.error)CLIENTES=(c.data||[]).filter(x=>normalizar(x.estado)!=="archivado");
    if(!d.error)DIRECCIONES=d.data||[];
    if(!u.error)USUARIOS=(u.data||[]).filter(x=>x.activo!==false && normalizar(x.estado)!=="inactivo");
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
  const payload={proyecto_id:p.id,propuesta_id:null,tipo,subtipo:document.getElementById("pr_gen_subtipo").value.trim()||null,existente,marca:document.getElementById("pr_gen_marca").value.trim()||null,modelo:document.getElementById("pr_gen_modelo").value.trim()||null,referencia:document.getElementById("pr_gen_ref").value.trim()||null,potencia_kw:potencia===""?null:Number(potencia),estado:document.getElementById("pr_gen_estado").value.trim()||null,se_mantiene:existente&&document.getElementById("pr_gen_mantiene").checked,se_retira:existente&&document.getElementById("pr_gen_retira").checked,funciones,tecnico_meta:Object.assign({},g&&g.tecnico_meta||{},{rol_futuro:document.getElementById("pr_gen_rol").value||null}),notas:document.getElementById("pr_gen_notas").value.trim()||null,orden:g&&Number.isFinite(Number(g.orden))?Number(g.orden):GENERADORES.length};
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
    const rs=reglasPropuesta(op),calc=CALCULOS.find(c=>String(c.id)===String(op.calculo_id));
    return `<div class="zx_pr_strategy_card">
      <div class="zx_pr_gen_top"><div><b>${limpiar(op.nombre)}</b><span>Versión ${limpiar(op.version)}${calc?" · cálculo "+limpiar(calc.version):""}</span></div>${puedeEditar()?`<button type="button" data-pr-strategy-open="${limpiar(op.id)}">Estrategia</button>`:""}</div>
      ${op.descripcion?`<p>${limpiar(op.descripcion)}</p>`:""}
      <div class="zx_pr_strategy_count">${rs.length} regla(s) de funcionamiento</div>
      ${rs.slice(0,3).map((r,n)=>`<div class="zx_pr_rule_resume"><b>${n+1}. ${limpiar(nombreGeneradorId(r.generador_id))}</b><span>${limpiar(textoServicioRegla(r.servicio))} · ${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}</span></div>`).join("")}
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
function reglasHTML(op){const rs=reglasPropuesta(op);if(!rs.length)return `<div class="zx_pr_empty">Todavía no hay reglas definidas.</div>`;return rs.map((r,i)=>`<div class="zx_pr_rule_card"><div><b>${i+1}. ${limpiar(nombreGeneradorId(r.generador_id))}</b><span>${limpiar(textoServicioRegla(r.servicio))}</span></div><p>${limpiar(textoAccionRegla(r.accion))} · ${limpiar(textoCondicionRegla(r.condicion_tipo))}${r.valor!=null&&r.valor!==""?" "+limpiar(r.valor)+(r.unidad?" "+limpiar(r.unidad):""):""}</p><div class="zx_pr_rule_actions"><button type="button" data-pr-rule-edit="${limpiar(r.id)}">Editar</button><button type="button" data-pr-rule-del="${limpiar(r.id)}">Eliminar</button></div></div>`).join("")}
function abrirEstrategia(p,opId){
  const op=PROPUESTAS.find(x=>String(x.id)===String(opId));if(!op)return;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_st_back" type="button">← Volver</button><button id="pr_st_add" class="primary" type="button">＋ Añadir regla</button></div><div class="zx_pr_form_head"><span>ESTRATEGIA HÍBRIDA</span><h2>${limpiar(op.nombre)}</h2></div><div class="zx_pr_info"><b>Ordena cómo debe trabajar cada generador.</b><span>Las reglas describen la lógica prevista. El técnico debe comprobar que la hidráulica, el control y los equipos permiten ese funcionamiento.</span></div><div class="zx_pr_rules">${reglasHTML(op)}</div>`);
  m.querySelector("#pr_st_back").onclick=()=>{cerrarModal();abrirFicha(p.id)};m.querySelector("#pr_st_add").onclick=()=>formularioRegla(p,op,null);
  m.querySelectorAll("[data-pr-rule-edit]").forEach(b=>b.onclick=()=>formularioRegla(p,op,reglasPropuesta(op).find(r=>String(r.id)===String(b.dataset.prRuleEdit))));
  m.querySelectorAll("[data-pr-rule-del]").forEach(b=>b.onclick=()=>eliminarRegla(p,op,b.dataset.prRuleDel));
}
function opcionesGeneradores(sel){return `<option value="">Selecciona generador</option>`+GENERADORES.filter(g=>g.existente===false||g.se_mantiene!==false).map(g=>`<option value="${limpiar(g.id)}" ${String(sel)===String(g.id)?"selected":""}>${limpiar(nombreGeneradorId(g.id))}</option>`).join("")}
function unidadCondicion(tipo){return ({temp_ext_menor:"°C",temp_ext_mayor:"°C",demanda_mayor:"kW",deposito_menor:"°C",excedente_fv_mayor:"kW",coste_energia:"€/kWh",horario:"h"})[tipo]||""}
function formularioRegla(p,op,r){
  r=r||{};const nueva=!r.id;
  const m=modal(`<div class="zx_pr_top_actions"><button id="pr_rule_back" type="button">← Volver</button><button id="pr_rule_save" class="primary" type="button">Guardar regla</button></div><div class="zx_pr_form_head"><span>${nueva?"NUEVA REGLA":"EDITAR REGLA"}</span><h2>Funcionamiento híbrido</h2></div>
    <label>Generador<select id="pr_rule_gen">${opcionesGeneradores(r.generador_id)}</select></label>
    <div class="zx_pr_grid2"><label>Servicio<select id="pr_rule_serv">${[["calefaccion","Calefacción"],["acs","ACS"],["refrigeracion","Refrigeración"],["piscina","Piscina"],["todos","Todos los servicios"]].map(([v,t])=>`<option value="${v}" ${r.servicio===v?"selected":""}>${t}</option>`).join("")}</select></label><label>Prioridad <span class="zx_pr_unit">orden</span><input id="pr_rule_prio" type="number" min="1" step="1" inputmode="numeric" value="${r.prioridad||reglasPropuesta(op).length+1}"></label></div>
    <label>Acción<select id="pr_rule_acc">${[["usar","Usar"],["priorizar","Priorizar"],["apoyo","Entrar como apoyo"],["simultaneo","Trabajar simultáneamente"],["reserva","Entrar como reserva"],["activar","Activar"],["bloquear","Bloquear"]].map(([v,t])=>`<option value="${v}" ${r.accion===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <label>Condición<select id="pr_rule_cond">${[["siempre","Siempre"],["manual","Orden manual"],["fallo_generador","Fallo de otro generador"],["temp_ext_menor","Temperatura exterior menor que"],["temp_ext_mayor","Temperatura exterior mayor que"],["demanda_mayor","Demanda mayor que"],["deposito_menor","Temperatura de depósito menor que"],["excedente_fv_mayor","Excedente fotovoltaico mayor que"],["coste_energia","Coste de energía"],["horario","Horario"]].map(([v,t])=>`<option value="${v}" ${r.condicion_tipo===v?"selected":""}>${t}</option>`).join("")}</select></label>
    <div id="pr_rule_value_wrap" class="zx_pr_grid2"><label>Valor <span id="pr_rule_unit" class="zx_pr_unit"></span><input id="pr_rule_val" type="text" inputmode="decimal" value="${r.valor!=null?limpiar(r.valor):""}"></label><label id="pr_rule_ref_wrap">Generador relacionado<select id="pr_rule_ref">${opcionesGeneradores(r.generador_referencia_id)}</select></label></div>
    <label>Notas<textarea id="pr_rule_notes" rows="4" placeholder="Explicación o condición adicional…">${limpiar(r.notas||"")}</textarea></label>`);
  const cond=m.querySelector("#pr_rule_cond"),wrap=m.querySelector("#pr_rule_value_wrap"),unit=m.querySelector("#pr_rule_unit"),ref=m.querySelector("#pr_rule_ref_wrap");
  const sync=()=>{const t=cond.value,u=unidadCondicion(t),needsVal=!!u,needsRef=t==="fallo_generador";unit.textContent=u;wrap.style.display=(needsVal||needsRef)?"grid":"none";m.querySelector("#pr_rule_val").closest("label").style.display=needsVal?"grid":"none";ref.style.display=needsRef?"grid":"none"};cond.onchange=sync;sync();
  m.querySelector("#pr_rule_back").onclick=()=>abrirEstrategia(p,op.id);m.querySelector("#pr_rule_save").onclick=()=>guardarRegla(p,op,r);
}
async function guardarRegla(p,op,r){
  const gen=document.getElementById("pr_rule_gen").value;if(!gen){alert("Selecciona un generador.");return}
  const cond=document.getElementById("pr_rule_cond").value,valor=document.getElementById("pr_rule_val").value.trim(),unidad=unidadCondicion(cond);
  const regla={id:r.id||uidRegla(),generador_id:gen,servicio:document.getElementById("pr_rule_serv").value,prioridad:Number(document.getElementById("pr_rule_prio").value)||1,accion:document.getElementById("pr_rule_acc").value,condicion_tipo:cond,valor:unidad&&valor!==""?valor:null,unidad:unidad||null,generador_referencia_id:cond==="fallo_generador"?(document.getElementById("pr_rule_ref").value||null):null,notas:document.getElementById("pr_rule_notes").value.trim()||null};
  const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(regla.id));rs.push(regla);rs.sort((a,b)=>(Number(a.prioridad)||99)-(Number(b.prioridad)||99));
  const btn=document.getElementById("pr_rule_save");btn.disabled=true;btn.textContent="Guardando…";
  try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:r.id?"editada":"creada",resumen:(r.id?"Regla híbrida modificada: ":"Regla híbrida añadida: ")+nombreGeneradorId(gen),usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:regla.id,generador_id:gen,condicion:cond,accion:regla.accion}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo guardar la regla.\n"+(e&&e.message?e.message:""));btn.disabled=false;btn.textContent="Guardar regla"}
}
async function eliminarRegla(p,op,id){if(!confirm("¿Eliminar esta regla de funcionamiento?"))return;const rs=reglasPropuesta(op).filter(x=>String(x.id)!==String(id));try{const q=await sb().from("proyectos_propuestas").update({estrategia_meta:rs}).eq("id",op.id).select("*").single();if(q.error)throw q.error;const u=sesion();try{await sb().from("proyectos_historial").insert([{proyecto_id:p.id,tipo:"estrategia",accion:"eliminada",resumen:"Regla híbrida eliminada",usuario_id:u.id||null,usuario:u.nombre||u.usuario||"",datos:{propuesta_id:op.id,regla_id:id}}])}catch(e){}await cargarPropuestas(p.id);abrirEstrategia(p,op.id)}catch(e){alert("No se pudo eliminar la regla.\n"+(e&&e.message?e.message:""))}}
function conectarEstrategia(p){const n=document.getElementById("pr_op_nueva");if(n)n.onclick=()=>formularioOpcionTecnica(p);document.querySelectorAll("[data-pr-strategy-open]").forEach(b=>b.onclick=()=>abrirEstrategia(p,b.dataset.prStrategyOpen))}

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
    <section class="zx_pr_next"><b>Próximas partes</b><span>Después añadiremos partidas, precios, presupuesto y aceptación.</span></section>`);
  m.querySelector("#pr_ficha_back").onclick=cerrarModal;
  const e=m.querySelector("#pr_ficha_edit");if(e)e.onclick=()=>{cerrarModal();formulario(p)};
  const c=m.querySelector("#pr_ficha_close");if(c)c.onclick=cerrarModal;
  conectarGeneradores(p);
  conectarEmisores(p);
  conectarCalculos(p);
  conectarEstrategia(p);
}
function instalarCSS(){if(document.getElementById("zx_proyectos_css"))return;const s=document.createElement("style");s.id="zx_proyectos_css";s.textContent=`
.zx_pr_shell{max-width:1180px;margin:0 auto;padding:14px 14px 90px;display:grid;gap:14px}.zx_pr_panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:17px;box-shadow:0 8px 26px rgba(15,23,42,.05)}.zx_pr_head{display:flex;align-items:center;justify-content:space-between;gap:14px}.zx_pr_head h2{margin:0;color:#071330;font-size:28px}.zx_pr_head p{margin:5px 0 0;color:#64748b;font-weight:750}.zx_pr_primary,.zx_pr_top_actions .primary{border:0;border-radius:15px;background:#0f766e;color:#fff;min-height:46px;padding:11px 16px;font-weight:950;font-size:14px}.zx_pr_kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}.zx_pr_kpis div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:10px;text-align:center}.zx_pr_kpis b{display:block;color:#071330;font-size:21px}.zx_pr_kpis span{color:#64748b;font-size:11px;font-weight:900}.zx_pr_tools{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:9px}.zx_pr_tools input,.zx_pr_tools select,.zx_pr_modal_box input,.zx_pr_modal_box select,.zx_pr_modal_box textarea{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;color:#0f172a;padding:12px;font-size:15px;font-weight:750}.zx_pr_list_head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.zx_pr_list_head h3{margin:0;color:#071330}.zx_pr_list_head span{color:#64748b;font-size:12px;font-weight:900}.zx_pr_list{display:grid;gap:9px}.zx_pr_card{width:100%;text-align:left;border:1px solid #dbe3ef;border-radius:18px;background:#fff;padding:14px;color:#0f172a}.zx_pr_card_top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.zx_pr_card_top>b{font-size:16px}.zx_pr_client{font-weight:900;color:#334155;margin-top:7px}.zx_pr_meta{display:flex;flex-wrap:wrap;gap:7px 14px;color:#64748b;font-size:12px;font-weight:800;margin-top:7px}.zx_pr_estado{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;background:#e2e8f0;color:#334155;font-size:10px;font-weight:950;white-space:nowrap}.zx_pr_e_aceptado,.zx_pr_e_terminado{background:#dcfce7;color:#166534}.zx_pr_e_rechazado{background:#fee2e2;color:#991b1b}.zx_pr_e_enviado,.zx_pr_e_presupuestado{background:#dbeafe;color:#1d4ed8}.zx_pr_empty{padding:24px;text-align:center;color:#64748b;font-weight:850}.zx_pr_modal{position:fixed;inset:0;z-index:100250;background:rgba(15,23,42,.68);padding:12px;display:flex;align-items:flex-start;justify-content:center;overflow:auto}.zx_pr_modal_box{width:min(760px,100%);margin:auto;background:#fff;border-radius:26px;padding:18px;box-shadow:0 28px 80px rgba(15,23,42,.4);display:grid;gap:13px}.zx_pr_top_actions{position:sticky;top:-18px;z-index:4;display:grid;grid-template-columns:1fr 1fr;gap:9px;background:rgba(255,255,255,.98);padding:3px 0 12px;border-bottom:1px solid #e2e8f0}.zx_pr_top_actions button{border:1px solid #cbd5e1;border-radius:15px;background:#fff;color:#334155;min-height:46px;padding:10px;font-weight:950}.zx_pr_top_actions .primary{background:#0f766e;color:#fff;border-color:#0f766e}.zx_pr_form_head span,.zx_pr_ficha_head>span{color:#0f766e;font-size:11px;font-weight:950;letter-spacing:.08em}.zx_pr_form_head h2,.zx_pr_ficha_head h2{margin:3px 0 0;color:#071330;font-size:26px}.zx_pr_modal_box label{display:grid;gap:6px;color:#475569;font-size:13px;font-weight:950}.zx_pr_grid2,.zx_pr_viewgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.zx_pr_section{border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;padding:14px}.zx_pr_section h3{margin:0 0 12px;color:#071330;font-size:17px}.zx_pr_unit{color:#0f766e;font-size:11px}.zx_pr_viewgrid>div{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px;min-width:0}.zx_pr_viewgrid span{display:block;color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase}.zx_pr_viewgrid b{display:block;color:#0f172a;font-size:14px;margin-top:4px;word-break:break-word}.zx_pr_notes{margin:0;color:#334155;white-space:pre-wrap}.zx_pr_next{border:1px dashed #99f6e4;border-radius:17px;background:#f0fdfa;padding:13px}.zx_pr_next b,.zx_pr_next span{display:block}.zx_pr_next b{color:#115e59}.zx_pr_next span{color:#475569;font-size:12px;font-weight:800;margin-top:4px;line-height:1.4}.zx_pr_section_head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.zx_pr_section_head h3{margin:0}.zx_pr_section_head span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:3px}.zx_pr_small_primary{border:0;border-radius:12px;background:#0f766e;color:#fff;padding:9px 11px;font-weight:950}.zx_pr_generadores,.zx_pr_emisores{display:grid;gap:9px}.zx_pr_gen_card,.zx_pr_em_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_gen_top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.zx_pr_gen_top b{display:block;color:#071330;font-size:16px}.zx_pr_gen_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_gen_top button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}.zx_pr_gen_grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.zx_pr_gen_grid>div{border-radius:11px;background:#f8fafc;padding:8px}.zx_pr_gen_grid span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.zx_pr_gen_grid b{display:block;color:#0f172a;font-size:12px;margin-top:3px}.zx_pr_gen_tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.zx_pr_gen_tags span{background:#ecfeff;color:#155e75;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}.zx_pr_gen_decision{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_gen_card p,.zx_pr_em_card p{margin:7px 0 0;color:#475569;font-size:11px;font-weight:700;white-space:pre-wrap}.zx_pr_checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zx_pr_checks label{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #dbe3ef;border-radius:12px;padding:10px;color:#334155}.zx_pr_checks input{width:20px!important;height:20px;margin:0;padding:0}.zx_pr_checks span{font-size:12px;font-weight:900}.zx_pr_role{margin-top:12px}.zx_pr_danger{width:100%;border:1px solid #fecaca;border-radius:13px;background:#fff1f2;color:#991b1b;padding:11px;font-weight:950}.zx_pr_calculos{display:grid;gap:9px}.zx_pr_calc_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_calc_top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.zx_pr_calc_top b{display:block;color:#071330;font-size:16px}.zx_pr_calc_top span{display:block;color:#64748b;font-size:11px;font-weight:850;margin-top:2px}.zx_pr_calc_badge{background:#dcfce7!important;color:#166534!important;border-radius:999px;padding:5px 8px;font-size:9px!important;font-weight:950!important}.zx_pr_calc_by{margin-top:9px;color:#64748b;font-size:10px;font-weight:850}.zx_pr_info{border:1px solid #bae6fd;border-radius:15px;background:#f0f9ff;padding:12px}.zx_pr_info b,.zx_pr_info span{display:block}.zx_pr_info b{color:#0c4a6e}.zx_pr_info span{margin-top:4px;color:#475569;font-size:11px;font-weight:750;line-height:1.45}.zx_pr_signed{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px}.zx_pr_signed .zx_pr_sign{border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#071330;font-size:24px;font-weight:950;min-height:46px;padding:0}.zx_pr_signed input{min-width:0}.zx_pr_strategies,.zx_pr_rules{display:grid;gap:9px}.zx_pr_strategy_card,.zx_pr_rule_card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:12px}.zx_pr_strategy_card p,.zx_pr_rule_card p{margin:8px 0;color:#475569;font-size:11px;font-weight:750;line-height:1.4}.zx_pr_strategy_count{margin-top:9px;color:#0f766e;font-size:11px;font-weight:950}.zx_pr_rule_resume{margin-top:8px;background:#f8fafc;border-radius:11px;padding:8px}.zx_pr_rule_resume b,.zx_pr_rule_resume span{display:block}.zx_pr_rule_resume b{color:#0f172a;font-size:11px}.zx_pr_rule_resume span{color:#64748b;font-size:10px;font-weight:800;margin-top:2px}.zx_pr_rule_card>div:first-child b,.zx_pr_rule_card>div:first-child span{display:block}.zx_pr_rule_card>div:first-child b{color:#071330;font-size:13px}.zx_pr_rule_card>div:first-child span{color:#64748b;font-size:10px;font-weight:850;margin-top:2px}.zx_pr_rule_actions{display:flex;gap:7px}.zx_pr_rule_actions button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:7px 9px;color:#334155;font-weight:900}@media(max-width:620px){.zx_pr_head{align-items:stretch;flex-direction:column}.zx_pr_primary{width:100%}.zx_pr_tools,.zx_pr_grid2,.zx_pr_viewgrid,.zx_pr_gen_grid{grid-template-columns:1fr}.zx_pr_modal_box{padding:15px;border-radius:22px}.zx_pr_card_top{display:grid}.zx_pr_section_head{align-items:stretch;flex-direction:column}.zx_pr_small_primary{width:100%}.zx_pr_checks{grid-template-columns:1fr}.zx_pr_kpis{gap:5px}.zx_pr_kpis span{font-size:9px}}`;
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
