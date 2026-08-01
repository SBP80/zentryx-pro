// ===============================
// ZENTRYX PRO - TRABAJOS
// V3170 - FILTROS DE ESTADO CORREGIDOS
// ===============================
(function(){
"use strict";

const ZX_VERSION="3170";
const TABLA="trabajos";
const CACHE_KEY="zentryx_cache_trabajos";
const MATERIAL_LIBRARY_KEY="zentryx_material_library_v1";
const SUGGESTION_MIN_SCORE=2;

let ZX_TR_CACHE=[];
let ZX_TR_BUSQUEDA="";
let ZX_TR_FILTRO="activos";
let ZX_TR_CARGANDO=false;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

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

function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function horaAhora(){
  const d=new Date();
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}

function fechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function rol(){return normalizar(sesion().rol || "")}
function usuario(){return normalizar(sesion().usuario || "")}
function esAdmin(){return rol()==="administrador" || usuario()==="admin"}
function puedeEntrar(){return rol()!=="invitado" && rol()!==""}
function puedeGestionar(){return puedeEntrar()}
function puedeBorrar(){return esAdmin()}

function idTrabajoUnico(){return String(window.ZX_TRABAJO_ABRIR_ID || "").trim()}
function accionTrabajoDirecta(){return String(window.ZX_TRABAJO_ACCION_DIRECTA || "ver").trim().toLowerCase()}
function modoTrabajoUnico(){return !!idTrabajoUnico()}
function salirTrabajoUnico(){
  window.ZX_TRABAJO_ABRIR_ID="";
  window.ZX_TRABAJO_ACCION_DIRECTA="";
}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}

function direccionTrabajo(t){
  return [
    t.direccion_obra || t.direccion,
    t.poblacion,
    t.provincia,
    t.codigo_postal,
    t.pais
  ].filter(Boolean).join(", ");
}

function estadoTexto(e){
  return {
    pendiente:"Pendiente",
    en_curso:"En curso",
    terminado:"Terminado",
    bloqueado:"Bloqueado",
    cancelado:"Cancelado"
  }[e] || e || "Pendiente";
}

function prioridadTexto(p){
  return {
    baja:"Baja",
    media:"Media",
    alta:"Alta",
    urgente:"Urgente"
  }[p] || "Media";
}

function claseEstado(e){
  if(e==="terminado") return "ok";
  if(e==="en_curso") return "curso";
  if(e==="cancelado" || e==="bloqueado") return "rojo";
  return "pendiente";
}

function clasePrioridad(p){
  if(p==="urgente") return "urgente";
  if(p==="alta") return "alta";
  if(p==="baja") return "baja";
  return "media";
}

function estadoCanonico(valor){
  const e=normalizar(valor || "pendiente").replace(/[\s-]+/g,"_");

  if(["en_curso","curso","iniciado","trabajando"].includes(e)) return "en_curso";
  if(["terminado","finalizado","completado","hecho"].includes(e)) return "terminado";
  if(["cancelado","anulado"].includes(e)) return "cancelado";
  if(["bloqueado","pausado"].includes(e)) return "bloqueado";
  return "pendiente";
}

function estaArchivado(t){
  const v=t && t.archivado;
  return v===true || v===1 || normalizar(v)==="true" || normalizar(v)==="si" || normalizar(v)==="1";
}

function telefonoLimpio(tel){
  let n=String(tel || "").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_trabajo");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modal(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_trabajo";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja">${html}</div>`;
  document.body.appendChild(d);
}

async function pedirPinAdmin(){
  return new Promise(function(resolve){
    modal(`
      <h2>PIN administrador</h2>
      <div class="zx_text">Introduce el PIN para continuar.</div>
      <input id="tr_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
      <div id="tr_pin_error" class="zx_tr_error"></div>
      <button class="zx_btn_big zx_verde" id="tr_pin_ok">Confirmar</button>
      <button class="zx_btn_big zx_gris" id="tr_pin_cancelar">Cancelar</button>
    `);

    const input=document.getElementById("tr_pin_admin");
    const error=document.getElementById("tr_pin_error");

    document.getElementById("tr_pin_cancelar").onclick=function(){cerrarModal();resolve(false)};

    document.getElementById("tr_pin_ok").onclick=async function(){
      const pin=input.value.trim();

      if(!/^[0-9]{4}$/.test(pin)){
        error.textContent="PIN inválido.";
        input.value="";
        input.focus();
        return;
      }

      if(!navigator.onLine || !sb()){
        error.textContent="Necesitas conexión para validar el PIN.";
        return;
      }

      const s=sesion();
      const r=await sb()
        .from("usuarios")
        .select("id,usuario,rol,pin_hash")
        .eq("id",s.id)
        .maybeSingle();

      if(r.error || !r.data){
        error.textContent="No se pudo validar el usuario.";
        return;
      }

      const admin=normalizar(r.data.rol)==="administrador" || normalizar(r.data.usuario)==="admin";

      if(!admin){
        error.textContent="Solo un administrador puede continuar.";
        return;
      }

      const security=window.ZENTRYX_SECURITY;
      let correcto=false;
      if(security && typeof security.verifyPin==="function"){
        const verificacion=await security.verifyPin(String(pin),String(r.data.pin_hash || ""));
        correcto=!!(verificacion && verificacion.ok);
      }else{
        try{correcto=btoa(String(pin))===String(r.data.pin_hash || "")}
        catch(e){correcto=false}
      }

      if(!correcto){
        error.textContent="PIN incorrecto.";
        input.value="";
        input.focus();
        return;
      }

      cerrarModal();
      resolve(true);
    };

    setTimeout(function(){input.focus()},100);
  });
}

async function cargarClientes(){
  if(!navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("clientes")
      .select("*")
      .order("nombre",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarUsuarios(){
  if(!navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("usuarios")
      .select("*")
      .eq("activo",true)
      .order("nombre",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarPlanificacion(id){
  if(!id || !navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("trabajos_planificacion")
      .select("*")
      .eq("trabajo_id",String(id))
      .order("fecha",{ascending:true})
      .order("hora_inicio",{ascending:true});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}


function leerBibliotecaMaterialesLocal(){
  try{
    const x=JSON.parse(localStorage.getItem(MATERIAL_LIBRARY_KEY) || "[]");
    return Array.isArray(x) ? x : [];
  }catch(e){return []}
}

function guardarBibliotecaMaterialesLocal(lista){
  try{localStorage.setItem(MATERIAL_LIBRARY_KEY,JSON.stringify((lista || []).slice(0,500)))}catch(e){}
}

function aprenderMaterial(material){
  const nombre=String((material && (material.nombre || material.material)) || "").trim();
  if(!nombre) return;
  const clave=normalizar(nombre);
  const lista=leerBibliotecaMaterialesLocal();
  let item=lista.find(x=>normalizar(x.nombre)===clave);
  if(!item){
    item={nombre:nombre,unidad:material.unidad || "ud",referencia:material.referencia || "",proveedor:material.proveedor || "",precio_compra:material.precio_compra ?? "",precio_venta:material.precio_venta ?? "",usos:0,actualizado:new Date().toISOString()};
    lista.push(item);
  }
  item.nombre=nombre;
  item.unidad=material.unidad || item.unidad || "ud";
  for(const campo of ["referencia","proveedor","precio_compra","precio_venta"]){
    if(material[campo]!==undefined && material[campo]!==null && String(material[campo]).trim()!=="") item[campo]=material[campo];
  }
  item.usos=Number(item.usos || 0)+1;
  item.actualizado=new Date().toISOString();
  lista.sort((a,b)=>Number(b.usos||0)-Number(a.usos||0) || String(a.nombre).localeCompare(String(b.nombre),"es"));
  guardarBibliotecaMaterialesLocal(lista);
}

async function cargarBibliotecaMateriales(){
  const mapa=new Map();
  const agregar=function(x){
    const nombre=String((x && (x.nombre || x.material)) || "").trim();
    if(!nombre) return;
    const k=normalizar(nombre);
    const previo=mapa.get(k) || {nombre:nombre,unidad:x.unidad || "ud",referencia:x.referencia || "",proveedor:x.proveedor || "",precio_compra:x.precio_compra ?? "",precio_venta:x.precio_venta ?? "",usos:0};
    previo.usos=Number(previo.usos||0)+Number(x.usos||1);
    for(const c of ["unidad","referencia","proveedor","precio_compra","precio_venta"]){if(x[c]!==undefined && x[c]!==null && String(x[c]).trim()!=="") previo[c]=x[c]}
    mapa.set(k,previo);
  };
  leerBibliotecaMaterialesLocal().forEach(agregar);
  if(navigator.onLine && sb()){
    try{
      const r=await sb().from("trabajos_materiales").select("*").order("created_at",{ascending:false}).limit(800);
      if(!r.error) (r.data || []).forEach(agregar);
    }catch(e){}
  }
  return Array.from(mapa.values()).sort((a,b)=>Number(b.usos||0)-Number(a.usos||0) || String(a.nombre).localeCompare(String(b.nombre),"es"));
}

function palabrasClaveTrabajo(t){
  const stop=new Set(["para","desde","hasta","como","con","sin","del","las","los","una","uno","unos","unas","trabajo","instalacion","instalar","revision","reparacion","mantenimiento","equipo","cliente","kw","kW"]);
  const texto=normalizar([t.titulo,t.descripcion,t.notas,t.marca,t.modelo,t.referencia].filter(Boolean).join(" "));
  return Array.from(new Set(texto.split(/[^a-z0-9]+/).filter(x=>x.length>=2 && !stop.has(x))));
}

function scoreCoincidencia(texto,palabras){
  const n=normalizar(texto);
  let score=0;
  for(const p of palabras){
    if(!p) continue;
    if(n.includes(p)) score += /^\d+$/.test(p) ? 2 : (p.length>=5 ? 2 : 1);
  }
  return score;
}

async function cargarSugerenciasDocumentales(t,archivosActuales){
  if(!navigator.onLine || !sb()) return [];
  const palabras=palabrasClaveTrabajo(t);
  if(!palabras.length) return [];
  try{
    const [ra,rt]=await Promise.all([
      sb().from("trabajos_archivos").select("*").order("created_at",{ascending:false}).limit(500),
      sb().from("trabajos").select("id,titulo,descripcion,notas").limit(500)
    ]);
    if(ra.error) return [];
    const trabajos=new Map((rt.error ? [] : (rt.data || [])).map(x=>[String(x.id),x]));
    const actuales=new Set((archivosActuales || []).map(a=>normalizar(a.nombre || a.filename || "")+"|"+String(a.url || a.archivo_url || "")));
    const sugerencias=[];
    for(const a of (ra.data || [])){
      if(String(a.trabajo_id)===String(t.id)) continue;
      const origen=trabajos.get(String(a.trabajo_id)) || {};
      const nombre=a.nombre || a.filename || "Archivo";
      const url=a.url || a.archivo_url || "";
      if(!url || actuales.has(normalizar(nombre)+"|"+url)) continue;
      const score=scoreCoincidencia([nombre,origen.titulo,origen.descripcion,origen.notas].filter(Boolean).join(" "),palabras);
      if(score>=SUGGESTION_MIN_SCORE) sugerencias.push({...a,_score:score,_origen:origen.titulo || "Biblioteca documental"});
    }
    sugerencias.sort((a,b)=>b._score-a._score);
    const vistos=new Set();
    return sugerencias.filter(x=>{const k=String(x.url || x.archivo_url || "")+"|"+normalizar(x.nombre || x.filename || "");if(vistos.has(k))return false;vistos.add(k);return true}).slice(0,12);
  }catch(e){return []}
}

function renderSugerenciasInteligentes(lista){
  if(!lista || !lista.length) return "";
  return `<section class="zx_tr_block zx_tr_smart_block">
    <div class="zx_tr_block_title"><h3>✨ Sugerencias inteligentes</h3><span>${lista.length} documento(s)</span></div>
    <p class="zx_tr_smart_help">Encontrados por coincidencia con la descripción, marca, modelo o potencia del trabajo. Revísalos antes de añadir.</p>
    <div class="zx_tr_smart_list">${lista.map(a=>`<label class="zx_tr_smart_item"><input type="checkbox" data-smart-file="${limpiar(a.id)}"><span><strong>${limpiar(a.nombre || a.filename || "Archivo")}</strong><small>${limpiar(tipoArchivoVisible(a))} · ${limpiar(a._origen || "Biblioteca")}</small></span></label>`).join("")}</div>
    <button type="button" class="zx_btn_big zx_azul" id="tr_smart_attach">Añadir seleccionados al trabajo</button>
  </section>`;
}

async function adjuntarSugerencias(trabajoId,sugerencias){
  const checks=Array.from(document.querySelectorAll("[data-smart-file]:checked"));
  if(!checks.length){alert("Selecciona al menos un documento.");return}
  const boton=document.getElementById("tr_smart_attach");
  if(boton){boton.disabled=true;boton.textContent="Añadiendo..."}
  let añadidos=0;
  try{
    for(const c of checks){
      const a=sugerencias.find(x=>String(x.id)===String(c.dataset.smartFile));
      if(!a) continue;
      const r=await insertarArchivoCompatible({trabajo_id:String(trabajoId),nombre:a.nombre || a.filename || "Documento",url:a.url || a.archivo_url || "",tipo:a.tipo || a.mime_type || "",tamano:a.tamano || a.size || 0});
      if(!r.error){añadidos++;await registrarHistorial(trabajoId,"archivo","Documento sugerido añadido: "+(a.nombre || a.filename || "Documento"),{origen_archivo_id:a.id,origen_trabajo_id:a.trabajo_id})}
    }
    alert(añadidos ? `${añadidos} documento(s) añadido(s) al trabajo.` : "No se pudo añadir ningún documento.");
    await abrirFicha(trabajoId);
  }catch(e){alert("No se pudieron añadir los documentos.\n\n"+mensajeError(e))}
}

async function cargarMateriales(id){
  if(!id || !navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("trabajos_materiales")
      .select("*")
      .eq("trabajo_id",String(id))
      .order("created_at",{ascending:false});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarArchivos(id){
  if(!id || !navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("trabajos_archivos")
      .select("*")
      .eq("trabajo_id",String(id))
      .order("created_at",{ascending:false});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function cargarHistorial(id){
  if(!id || !navigator.onLine || !sb()) return [];

  try{
    const r=await sb()
      .from("trabajos_historial")
      .select("*")
      .eq("trabajo_id",String(id))
      .order("created_at",{ascending:false});

    return r.error ? [] : (r.data || []);
  }catch(e){
    return [];
  }
}

async function registrarHistorial(trabajoId,tipo,notas,datos){
  if(!trabajoId || !navigator.onLine || !sb()) return false;

  const s=sesion();

  try{
    const data={
      trabajo_id:String(trabajoId),
      usuario_id:String(s.id || ""),
      usuario:String(s.usuario || s.nombre || "sistema"),
      fecha:hoy(),
      hora_inicio:horaAhora(),
      hora_fin:null,
      tipo:String(tipo || "sistema"),
      notas:String(notas || ""),
      datos:datos || {},
      created_at:new Date().toISOString()
    };

    let r=await sb().from("trabajos_historial").insert([data]);

    if(r.error){
      delete data.datos;
      r=await sb().from("trabajos_historial").insert([data]);
    }

    return !r.error;

  }catch(e){
    return false;
  }
}

async function cargarTrabajo(id){
  if(!id) return null;

  const local=ZX_TR_CACHE.find(t=>String(t.id)===String(id));

  if(!navigator.onLine || !sb()){
    return local || null;
  }

  try{
    const r=await sb().from(TABLA).select("*").eq("id",String(id)).maybeSingle();
    if(r.error || !r.data) return local || null;
    return r.data;
  }catch(e){
    return local || null;
  }
}

function textoBusqueda(t){
  return normalizar([
    t.titulo,
    t.cliente,
    t.usuario,
    t.estado,
    t.prioridad,
    t.descripcion,
    t.notas,
    t.persona_contacto,
    t.telefono_contacto,
    direccionTrabajo(t)
  ].join(" "));
}

function prepararTrabajo(t){
  t.__zx_dir=direccionTrabajo(t);
  t.__zx_busqueda=textoBusqueda(t);
  return t;
}

function filtrarTrabajos(){
  let lista=[...(ZX_TR_CACHE || [])];

  const unico=idTrabajoUnico();

  if(unico){
    return lista.filter(t=>String(t.id)===String(unico));
  }

  lista=lista.filter(function(t){
    const archivado=estaArchivado(t);
    const estado=estadoCanonico(t.estado);

    switch(ZX_TR_FILTRO){
      case "pendientes":
        return !archivado && estado==="pendiente";
      case "curso":
        return !archivado && estado==="en_curso";
      case "terminados":
        return !archivado && estado==="terminado";
      case "urgentes":
        return !archivado && normalizar(t.prioridad)==="urgente";
      case "archivados":
        return archivado;
      case "activos":
      default:
        return !archivado && !["terminado","cancelado"].includes(estado);
    }
  });

  const q=normalizar(ZX_TR_BUSQUEDA);

  if(q){
    const palabras=q.split(/\s+/).filter(Boolean);

    lista=lista.filter(function(t){
      const txt=t.__zx_busqueda || textoBusqueda(t);
      if(txt.includes(q)) return true;
      return palabras.length && palabras.every(p=>txt.includes(p));
    });
  }

  return lista;
}

async function cargarTrabajos(){
  if(!puedeEntrar()) return [];

  if(!navigator.onLine || !sb()){
    ZX_TR_CACHE=leerCache().map(prepararTrabajo);
    return filtrarTrabajos();
  }

  if(ZX_TR_CARGANDO) return filtrarTrabajos();
  ZX_TR_CARGANDO=true;

  try{
    const unico=idTrabajoUnico();

    let r;

    if(zx() && typeof zx().selectCache==="function"){
      r=await zx().selectCache(TABLA,function(q){
        if(unico) return q.select("*").eq("id",String(unico)).limit(1);
        return q.select("*").order("fecha",{ascending:false}).limit(300);
      });
    }else{
      let q=sb().from(TABLA).select("*");

      if(unico){
        q=q.eq("id",String(unico)).limit(1);
      }else{
        q=q.order("fecha",{ascending:false}).limit(300);
      }

      r=await q;
    }

    if(r.error) throw r.error;

    ZX_TR_CACHE=(r.data || []).map(prepararTrabajo);
    guardarCache(ZX_TR_CACHE);

  }catch(e){
    ZX_TR_CACHE=leerCache().map(prepararTrabajo);
  }

  ZX_TR_CARGANDO=false;
  return filtrarTrabajos();
}

function resumen(){
  const total=ZX_TR_CACHE.length;
  const activos=ZX_TR_CACHE.filter(t=>t.archivado!==true && t.archivado!=="true").length;
  const curso=ZX_TR_CACHE.filter(t=>String(t.estado || "")==="en_curso").length;
  const urgentes=ZX_TR_CACHE.filter(t=>String(t.prioridad || "")==="urgente").length;

  return `
    <div class="zx_tr_kpis">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${activos}</b><span>Activos</span></div>
      <div><b>${curso}</b><span>En curso</span></div>
      <div><b>${urgentes}</b><span>Urgentes</span></div>
    </div>
  `;
}

function toolbar(total){
  const filtros=[
    ["activos","Activos"],
    ["pendientes","Pendientes"],
    ["curso","En curso"],
    ["terminados","Terminados"],
    ["urgentes","Urgentes"],
    ["archivados","Archivados"]
  ];

  return `
    <div class="zx_tr_toolbar">
      ${modoTrabajoUnico() ? `
        <button class="zx_tr_back" id="zx_tr_volver_listado">← Ver todos los trabajos</button>
      ` : ""}

      <div class="zx_tr_search">
        <input id="zx_buscar_trabajos" type="search" value="${limpiar(ZX_TR_BUSQUEDA)}" placeholder="Buscar trabajo, cliente, dirección, técnico o estado">
        ${ZX_TR_BUSQUEDA ? `<button id="zx_limpiar_trabajos" type="button">✕</button>` : ""}
      </div>

      <div class="zx_tr_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_TR_FILTRO===f[0] ? "on" : ""}" data-tr-filter="${limpiar(f[0])}">${limpiar(f[1])}</button>`;
        }).join("")}
      </div>

      <div class="zx_tr_resume">${total} resultado(s)</div>
    </div>
  `;
}

function renderTrabajo(t){
  const dir=t.__zx_dir || direccionTrabajo(t);
  const tel=t.telefono_contacto || t.telefono || "";
  const estado=t.estado || "pendiente";
  const prio=t.prioridad || "media";

  return `
    <article class="zx_tr_card zx_tr_estado_${claseEstado(estado)}" data-id="${limpiar(t.id)}">
      <div class="zx_tr_top">
        <div class="zx_tr_icon">🛠️</div>
        <div>
          <h3>${limpiar(t.titulo || "Trabajo")}</h3>
          <div class="zx_tr_meta">${limpiar(t.cliente || "Sin cliente")}</div>
        </div>
      </div>

      <div class="zx_tr_badges">
        <span class="estado ${claseEstado(estado)}">${limpiar(estadoTexto(estado))}</span>
        <span class="prio ${clasePrioridad(prio)}">${limpiar(prioridadTexto(prio))}</span>
      </div>

      <div class="zx_tr_info">
        ${t.fecha ? `<p><b>Fecha</b><span>${limpiar(fechaES(t.fecha))}${t.hora_inicio ? " · "+limpiar(String(t.hora_inicio).slice(0,5)) : ""}</span></p>` : ""}
        ${t.usuario ? `<p><b>Técnico</b><span>${limpiar(t.usuario)}</span></p>` : ""}
        ${tel ? `<p><b>Teléfono</b><span>${limpiar(tel)}</span></p>` : ""}
        ${dir ? `<p><b>Dirección</b><span>${limpiar(dir)}</span></p>` : ""}
        ${t.descripcion ? `<p><b>Descripción</b><span>${limpiar(t.descripcion)}</span></p>` : ""}
      </div>

      <div class="zx_tr_actions">
        <button class="blue" data-tr-open="${limpiar(t.id)}">Abrir</button>
        ${tel ? `<button class="green" data-tr-tel="${limpiar(tel)}">Llamar</button>` : ""}
        ${dir ? `<button class="purple" data-tr-map="${limpiar(dir)}">Mapa</button>` : ""}
        ${puedeGestionar() ? `<button class="orange" data-tr-state="${limpiar(t.id)}">Estado</button>` : ""}
      </div>
    </article>
  `;
}

function renderListado(lista){
  if(!lista.length){
    return `<div class="zx_tr_empty">No hay trabajos con este filtro.</div>`;
  }

  return lista.map(renderTrabajo).join("");
}

function pintarShell(lista){
  app().innerHTML=`
    <div class="zx_tr_shell">
      <section class="zx_tr_panel zx_tr_header">
        <div>
          <h2>${modoTrabajoUnico() ? "Trabajo" : "Trabajos"}</h2>
          <p>Planificación, materiales, fotos, historial y estado del servicio.</p>
        </div>
        ${puedeGestionar() && !modoTrabajoUnico() ? `<button class="zx_tr_new" id="btn_nuevo_trabajo">＋ Crear</button>` : ""}
      </section>

      ${!modoTrabajoUnico() ? `<section class="zx_tr_panel">${resumen()}${toolbar(lista.length)}</section>` : `<section class="zx_tr_panel">${toolbar(lista.length)}</section>`}

      <section class="zx_tr_panel">
        <div class="zx_tr_list_head">
          <h3>${modoTrabajoUnico() ? "Ficha" : "Listado"}</h3>
          <span>${lista.length} trabajo(s)</span>
        </div>
        <div id="zx_trabajos_lista" class="zx_tr_list">${renderListado(lista)}</div>
      </section>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_trabajo");
  if(nuevo) nuevo.onclick=function(){abrirFormulario({})};

  const volver=document.getElementById("zx_tr_volver_listado");
  if(volver){
    volver.onclick=function(){
      salirTrabajoUnico();
      window.ZX_trabajos();
    };
  }

  conectarEventos();
}

function repintarLista(){
  const lista=filtrarTrabajos();
  const box=document.getElementById("zx_trabajos_lista");

  if(box){
    box.innerHTML=renderListado(lista);
    conectarEventos();
  }
}

function conectarEventos(){
  const buscar=document.getElementById("zx_buscar_trabajos");

  if(buscar){
    buscar.oninput=function(){
      ZX_TR_BUSQUEDA=buscar.value || "";
      repintarLista();
    };
  }

  const limpiarBtn=document.getElementById("zx_limpiar_trabajos");
  if(limpiarBtn){
    limpiarBtn.onclick=function(){
      ZX_TR_BUSQUEDA="";
      if(buscar) buscar.value="";
      repintarLista();
    };
  }

  document.querySelectorAll("[data-tr-filter]").forEach(function(btn){
    btn.onclick=function(ev){
      if(ev) ev.preventDefault();
      ZX_TR_FILTRO=btn.getAttribute("data-tr-filter") || "activos";
      pintarShell(filtrarTrabajos());
    };
  });

  document.querySelectorAll("[data-tr-open]").forEach(btn=>{
    btn.onclick=function(){abrirFicha(btn.dataset.trOpen)};
  });

  document.querySelectorAll("[data-tr-state]").forEach(btn=>{
    btn.onclick=function(){abrirCambioEstado(btn.dataset.trState)};
  });

  document.querySelectorAll("[data-tr-tel]").forEach(btn=>{
    btn.onclick=function(){location.href="tel:"+telefonoLimpio(btn.dataset.trTel)};
  });

  document.querySelectorAll("[data-tr-map]").forEach(btn=>{
    btn.onclick=function(){abrirMapa(btn.dataset.trMap)};
  });
}

function abrirMapa(dir){
  if(!dir){alert("Sin dirección.");return}

  const q=encodeURIComponent(dir);

  modal(`
    <h2>Ruta</h2>
    <button class="zx_btn_big zx_azul" id="tr_map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="tr_map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="tr_map_waze">Waze</button>
    <button class="zx_btn_big zx_gris" id="tr_map_cerrar">Cerrar</button>
  `);

  document.getElementById("tr_map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("tr_map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("tr_map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("tr_map_cerrar").onclick=cerrarModal;
}

function input(id,label,value,type){
  return `
    <label class="zx_tr_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function selectEstado(valor){
  const opts=[
    ["pendiente","Pendiente"],
    ["en_curso","En curso"],
    ["terminado","Terminado"],
    ["bloqueado","Bloqueado"],
    ["cancelado","Cancelado"]
  ];

  return `
    <label class="zx_tr_label" for="tr_estado">Estado</label>
    <select id="tr_estado">
      ${opts.map(o=>`<option value="${o[0]}" ${String(valor || "pendiente")===o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}
    </select>
  `;
}

function selectPrioridad(valor){
  const opts=[
    ["baja","Baja"],
    ["media","Media"],
    ["alta","Alta"],
    ["urgente","Urgente"]
  ];

  return `
    <label class="zx_tr_label" for="tr_prioridad">Prioridad</label>
    <select id="tr_prioridad">
      ${opts.map(o=>`<option value="${o[0]}" ${String(valor || "media")===o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}
    </select>
  `;
}

function nombreCliente(c){
  return c.nombre || c.razon_social || c.cliente || c.empresa || c.nombre_comercial || "";
}

function renderClientesOptions(clientes,valor){
  return `<option value="">Sin cliente</option>`+clientes.map(c=>{
    const n=nombreCliente(c);
    return `<option value="${limpiar(c.id)}" data-nombre="${limpiar(n)}" ${String(valor || "")===String(c.id) ? "selected" : ""}>${limpiar(n)}</option>`;
  }).join("");
}

function renderUsuariosOptions(usuarios,valor){
  return `<option value="">Sin técnico</option>`+usuarios.map(u=>{
    const n=u.nombre || u.usuario || "";
    return `<option value="${limpiar(u.id)}" data-nombre="${limpiar(n)}" ${String(valor || "")===String(u.id) ? "selected" : ""}>${limpiar(n)}</option>`;
  }).join("");
}

function nombreUsuario(u){
  return String(u && (u.nombre || u.usuario) || "").trim();
}

function renderEquipoUsuarios(usuarios,seleccionados,principalId){
  const elegidos=new Set((seleccionados || []).map(String));

  if(!usuarios.length){
    return `<div class="zx_tr_team_empty">No hay usuarios activos disponibles.</div>`;
  }

  return `
    <div class="zx_tr_team_help">
      Selecciona a todas las personas que acudirán al trabajo. El técnico principal se añade automáticamente.
    </div>
    <div class="zx_tr_team_list" id="tr_equipo_lista">
      ${usuarios.map(function(u){
        const id=String(u.id || "");
        const nombre=nombreUsuario(u) || "Usuario";
        const principal=id===String(principalId || "");
        return `
          <label class="zx_tr_team_item ${principal ? "is-main" : ""}" data-team-user="${limpiar(id)}">
            <input
              type="checkbox"
              class="tr_equipo_usuario"
              value="${limpiar(id)}"
              data-nombre="${limpiar(nombre)}"
              ${elegidos.has(id) ? "checked" : ""}
              ${principal ? "checked disabled" : ""}
            >
            <span class="zx_tr_team_avatar">👤</span>
            <span class="zx_tr_team_name">${limpiar(nombre)}</span>
            <small>${principal ? "Responsable principal" : "Miembro del equipo"}</small>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function actualizarEquipoPrincipal(){
  const principal=document.getElementById("tr_usuario_id");
  const lista=document.getElementById("tr_equipo_lista");
  if(!principal || !lista) return;

  const principalId=String(principal.value || "");

  lista.querySelectorAll(".tr_equipo_usuario").forEach(function(cb){
    const item=cb.closest(".zx_tr_team_item");
    const esPrincipal=String(cb.value || "")===principalId;

    cb.disabled=esPrincipal;
    if(esPrincipal) cb.checked=true;

    if(item){
      item.classList.toggle("is-main",esPrincipal);
      const small=item.querySelector("small");
      if(small) small.textContent=esPrincipal ? "Responsable principal" : "Miembro del equipo";
    }
  });
}

function equipoSeleccionado(){
  return Array.from(document.querySelectorAll(".tr_equipo_usuario:checked")).map(function(cb){
    return {
      id:String(cb.value || ""),
      nombre:String(cb.dataset.nombre || "")
    };
  }).filter(function(x){return x.id});
}

function idLocal(){
  if(window.crypto && typeof window.crypto.randomUUID==="function"){
    return window.crypto.randomUUID();
  }
  return "zx-"+Date.now()+"-"+Math.random().toString(16).slice(2);
}

async function guardarEquipoTrabajo(trabajoId,equipo,datos){
  if(!trabajoId) return;

  const filas=(equipo || []).map(function(u){
    return {
      id:idLocal(),
      trabajo_id:String(trabajoId),
      usuario_id:String(u.id),
      usuario:String(u.nombre || ""),
      fecha:datos.fecha || hoy(),
      hora_inicio:datos.hora_inicio || null,
      hora_fin:datos.hora_fin || null
    };
  });

  const backend=window.ZENTRYX_BACKEND || (zx() && (zx().Backend || zx().backend)) || null;

  if(backend && typeof backend.remove==="function" && typeof backend.insert==="function"){
    const borrado=await backend.remove("trabajos_planificacion",{
      field:"trabajo_id",
      value:String(trabajoId)
    });
    if(borrado && borrado.error) throw borrado.error;

    if(filas.length){
      const insertado=await backend.insert("trabajos_planificacion",filas);
      if(insertado && insertado.error) throw insertado.error;
    }
    return;
  }

  const core=zx();

  if(core && typeof core.remove==="function" && typeof core.insert==="function"){
    const borrado=await core.remove(
      "trabajos_planificacion",
      "trabajo_id",
      String(trabajoId)
    );
    if(borrado && borrado.error) throw borrado.error;

    if(filas.length){
      const insertado=await core.insert("trabajos_planificacion",filas);
      if(insertado && insertado.error) throw insertado.error;
    }
    return;
  }

  if(!sb()) throw new Error("No hay conexión con la base de datos.");

  const borrado=await sb()
    .from("trabajos_planificacion")
    .delete()
    .eq("trabajo_id",String(trabajoId));

  if(borrado.error) throw borrado.error;

  if(filas.length){
    const insertado=await sb()
      .from("trabajos_planificacion")
      .insert(filas);

    if(insertado.error) throw insertado.error;
  }
}

async function abrirFormulario(t){
  if(!puedeGestionar()){alert("No tienes permiso.");return}

  t=t || {};

  const [clientes,usuarios,planificacion]=await Promise.all([
    cargarClientes(),
    cargarUsuarios(),
    t.id ? cargarPlanificacion(t.id) : Promise.resolve([])
  ]);

  const participantesActuales=planificacion
    .map(function(p){return String(p.usuario_id || "")})
    .filter(Boolean);

  modal(`
    <h2>${t.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>

    <div class="zx_tr_form">
      <h3>Datos principales</h3>
      ${input("tr_titulo","Título",t.titulo)}
      ${selectEstado(t.estado || "pendiente")}
      ${selectPrioridad(t.prioridad || "media")}

      <label class="zx_tr_label" for="tr_cliente">Cliente</label>
      <select id="tr_cliente">${renderClientesOptions(clientes,t.cliente_id)}</select>

      <label class="zx_tr_label" for="tr_usuario_id">Responsable principal</label>
      <select id="tr_usuario_id">${renderUsuariosOptions(usuarios,t.usuario_id)}</select>

      <label class="zx_tr_label">Usuarios que acudirán al trabajo</label>
      ${renderEquipoUsuarios(
        usuarios,
        participantesActuales.length ? participantesActuales : (t.usuario_id ? [String(t.usuario_id)] : []),
        t.usuario_id
      )}

      <div class="zx_tr_grid2">
        <div>${input("tr_fecha","Fecha",t.fecha || hoy(),"date")}</div>
        <div>${input("tr_hora_inicio","Hora inicio",t.hora_inicio ? String(t.hora_inicio).slice(0,5) : "","time")}</div>
      </div>

      <div class="zx_tr_grid2">
        <div>${input("tr_hora_fin","Hora fin",t.hora_fin ? String(t.hora_fin).slice(0,5) : "","time")}</div>
        <div>${input("tr_tel","Teléfono contacto",t.telefono_contacto,"tel")}</div>
      </div>

      <h3>Ubicación</h3>
      ${input("tr_dir","Dirección",t.direccion_obra || t.direccion)}
      <div class="zx_tr_grid2">
        <div>${input("tr_poblacion","Población",t.poblacion)}</div>
        <div>${input("tr_provincia","Provincia",t.provincia)}</div>
      </div>
      <div class="zx_tr_grid2">
        <div>${input("tr_cp","Código postal",t.codigo_postal)}</div>
        <div>${input("tr_pais","País",t.pais || "España")}</div>
      </div>

      <h3>Descripción</h3>
      <label class="zx_tr_label" for="tr_desc">Descripción</label>
      <textarea id="tr_desc" rows="4">${limpiar(t.descripcion || "")}</textarea>

      <label class="zx_tr_label" for="tr_notas">Notas internas</label>
      <textarea id="tr_notas" rows="4">${limpiar(t.notas || "")}</textarea>
    </div>

    <button class="zx_btn_big zx_verde" id="tr_guardar">Guardar</button>
    <button class="zx_btn_big zx_gris" id="tr_cancelar">Cancelar</button>
  `);

  const selCliente=document.getElementById("tr_cliente");
  const selPrincipal=document.getElementById("tr_usuario_id");

  if(selPrincipal){
    selPrincipal.onchange=actualizarEquipoPrincipal;
    actualizarEquipoPrincipal();
  }

  selCliente.onchange=function(){
    const c=clientes.find(x=>String(x.id)===String(selCliente.value));
    if(!c) return;

    document.getElementById("tr_tel").value=c.telefono || c.telefono_2 || "";
    document.getElementById("tr_dir").value=c.direccion || "";
    document.getElementById("tr_poblacion").value=c.poblacion || "";
    document.getElementById("tr_provincia").value=c.provincia || "";
    document.getElementById("tr_cp").value=c.codigo_postal || "";
    document.getElementById("tr_pais").value=c.pais || "España";
  };

  document.getElementById("tr_cancelar").onclick=cerrarModal;
  document.getElementById("tr_guardar").onclick=function(){guardarTrabajo(t.id || null,clientes,usuarios)};
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

async function guardarTrabajo(id,clientes,usuarios){
  const titulo=valor("tr_titulo");

  if(!titulo){
    alert("Introduce título.");
    return;
  }

  const clienteId=valor("tr_cliente");
  const usuarioId=valor("tr_usuario_id");

  if(!usuarioId){
    alert("Selecciona un responsable principal.");
    return;
  }

  actualizarEquipoPrincipal();
  const equipo=equipoSeleccionado();

  const cliente=clientes.find(c=>String(c.id)===String(clienteId));
  const user=usuarios.find(u=>String(u.id)===String(usuarioId));

  const s=sesion();

  const trabajoId=id || idLocal();

  const data={
    titulo:titulo,
    estado:valor("tr_estado") || "pendiente",
    prioridad:valor("tr_prioridad") || "media",
    cliente_id:clienteId || null,
    cliente:cliente ? nombreCliente(cliente) : "",
    usuario_id:usuarioId || "",
    usuario:user ? (user.nombre || user.usuario || "") : "",
    fecha:valor("tr_fecha") || hoy(),
    hora_inicio:valor("tr_hora_inicio") || null,
    hora_fin:valor("tr_hora_fin") || null,
    telefono_contacto:valor("tr_tel"),
    direccion_obra:valor("tr_dir"),
    direccion:valor("tr_dir"),
    poblacion:valor("tr_poblacion"),
    provincia:valor("tr_provincia"),
    codigo_postal:valor("tr_cp"),
    pais:valor("tr_pais"),
    descripcion:valor("tr_desc"),
    notas:valor("tr_notas"),
    creado_por:s.usuario || ""
  };

  if(!id){
    data.id=trabajoId;
    data.archivado=false;
  }

  try{
    let r;

    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id ? await zx().update(TABLA,data,"id",id) : await zx().insert(TABLA,[data]);
    }else if(id){
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }else{
      r=await sb().from(TABLA).insert([data]);
    }

    if(r && r.error) throw r.error;

    await guardarEquipoTrabajo(trabajoId,equipo,data);

    if(id){
      await registrarHistorial(
        trabajoId,
        "edicion",
        "Trabajo editado y equipo actualizado.",
        Object.assign({},data,{equipo:equipo})
      );
    }else{
      await registrarHistorial(
        trabajoId,
        "creacion",
        "Trabajo creado con equipo asignado.",
        Object.assign({},data,{equipo:equipo})
      );
    }

    // Tanto los trabajos nuevos como los editados deben aparecer inmediatamente en Agenda.
    await sincronizarAgenda(trabajoId,Object.assign({},data,{id:trabajoId,equipo:equipo}));

    try{
      window.dispatchEvent(new CustomEvent("zentryx:trabajo:equipo_actualizado",{
        detail:{trabajo_id:String(trabajoId),usuarios:equipo.map(function(x){return x.id})}
      }));
    }catch(e){}

    const volverAgenda=modoTrabajoUnico() && accionTrabajoDirecta()==="editar";

    cerrarModal();

    if(volverAgenda){
      salirTrabajoUnico();
      if(typeof window.ZX_agenda==="function"){
        await window.ZX_agenda();
      }else if(typeof window.ZX_abrirAgenda==="function"){
        await window.ZX_abrirAgenda();
      }else{
        await window.ZX_trabajos();
      }
      setTimeout(function(){
        if(typeof window.ZX_TOAST==="function"){
          window.ZX_TOAST("Trabajo actualizado correctamente");
        }
      },80);
      return;
    }

    await window.ZX_trabajos();

  }catch(e){
    alert("Error guardando trabajo: "+(e.message || "Error"));
  }
}

async function sincronizarAgenda(id,t){
  if(!id || !navigator.onLine || !sb()) return;

  try{
    await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));

    if(t.archivado===true || t.estado==="cancelado") return;

    await sb().from("agenda_eventos").insert([{
      tipo:"trabajo",
      titulo:"Trabajo - "+(t.titulo || ""),
      descripcion:t.descripcion || "",
      fecha_inicio:t.fecha || hoy(),
      fecha_fin:t.fecha || hoy(),
      hora_inicio:t.hora_inicio || null,
      hora_fin:t.hora_fin || null,
      cliente_id:String(t.cliente_id || ""),
      cliente:t.cliente || "",
      usuario_id:String(t.usuario_id || ""),
      usuario:t.usuario || "",
      direccion:t.direccion_obra || t.direccion || "",
      codigo_postal:t.codigo_postal || "",
      poblacion:t.poblacion || "",
      provincia:t.provincia || "",
      pais:t.pais || "España",
      estado:t.estado==="terminado" ? "completado" : "activo",
      prioridad:t.prioridad || "media",
      visible_para:"todos",
      origen:"trabajos",
      origen_id:String(id),
      creado_por:t.creado_por || ""
    }]);

    try{
      window.dispatchEvent(new CustomEvent("zentryx:agenda:actualizar",{
        detail:{origen:"trabajos",trabajo_id:String(id)}
      }));
    }catch(e){}
  }catch(e){
    console.warn("No se pudo sincronizar el trabajo con Agenda:",e);
  }
}

async function abrirCambioEstado(id){
  const t=await cargarTrabajo(id);
  if(!t){alert("Trabajo no encontrado.");return}

  modal(`
    <h2>Cambiar estado</h2>
    <div class="zx_text"><b>${limpiar(t.titulo || "Trabajo")}</b><br>Estado actual: ${limpiar(estadoTexto(t.estado))}</div>
    <button class="zx_btn_big zx_naranja" id="tr_est_pendiente">Pendiente</button>
    <button class="zx_btn_big zx_azul" id="tr_est_curso">En curso</button>
    <button class="zx_btn_big zx_verde" id="tr_est_terminado">Terminado</button>
    <button class="zx_btn_big zx_rojo" id="tr_est_cancelado">Cancelado</button>
    <button class="zx_btn_big zx_gris" id="tr_est_cerrar">Cerrar</button>
  `);

  document.getElementById("tr_est_cerrar").onclick=cerrarModal;
  document.getElementById("tr_est_pendiente").onclick=function(){aplicarEstado(id,"pendiente")};
  document.getElementById("tr_est_curso").onclick=function(){aplicarEstado(id,"en_curso")};
  document.getElementById("tr_est_terminado").onclick=function(){aplicarEstado(id,"terminado")};
  document.getElementById("tr_est_cancelado").onclick=function(){aplicarEstado(id,"cancelado")};
}

async function aplicarEstado(id,estado){
  const t=await cargarTrabajo(id);
  if(!t) return;

  try{
    let r;

    if(zx() && typeof zx().update==="function"){
      r=await zx().update(TABLA,{estado:estado},"id",id);
    }else{
      r=await sb().from(TABLA).update({estado:estado}).eq("id",String(id));
    }

    if(r && r.error) throw r.error;

    await registrarHistorial(id,"estado","Estado cambiado a "+estadoTexto(estado)+".",{estado:estado});
    await sincronizarAgenda(id,Object.assign({},t,{estado:estado}));

    cerrarModal();
    await window.ZX_trabajos();

  }catch(e){
    alert("No se pudo cambiar el estado.");
  }
}

function equipoPlanificacion(plan,t){
  const nombres=[];
  const ids=new Set();

  (plan || []).forEach(function(p){
    const id=String(p.usuario_id || p.tecnico_id || "");
    const nombre=String(
      p.usuario ||
      p.tecnico ||
      p.usuario_nombre ||
      p.tecnico_nombre ||
      ""
    ).trim();

    if(id && ids.has(id)) return;
    if(id) ids.add(id);

    if(nombre && !nombres.some(function(n){
      return normalizar(n)===normalizar(nombre);
    })){
      nombres.push(nombre);
    }
  });

  if(t && t.usuario){
    const principal=String(t.usuario).trim();
    if(principal && !nombres.some(function(n){
      return normalizar(n)===normalizar(principal);
    })){
      nombres.unshift(principal);
    }
  }

  return nombres;
}

function accionPrincipalTrabajo(t){
  const estado=String(t.estado || "pendiente");

  if(estado==="en_curso"){
    return {clase:"zx_tr_finish",icono:"✅",texto:"Finalizar trabajo",accion:"terminar"};
  }
  if(estado==="terminado"){
    return {clase:"zx_tr_done",icono:"✓",texto:"Trabajo finalizado",accion:"ninguna"};
  }
  if(estado==="cancelado"){
    return {clase:"zx_tr_cancelled",icono:"⛔",texto:"Trabajo cancelado",accion:"ninguna"};
  }
  return {clase:"zx_tr_start",icono:"▶",texto:"Iniciar trabajo",accion:"iniciar"};
}

function tiempoPlanificado(t){
  const inicio=t.hora_inicio ? String(t.hora_inicio).slice(0,5) : "";
  const fin=t.hora_fin ? String(t.hora_fin).slice(0,5) : "";
  if(inicio && fin) return inicio+"–"+fin;
  return inicio || fin || "";
}

function whatsappTrabajo(tel){
  const numero=telefonoLimpio(tel).replace("+","");
  if(!numero) return;
  window.open("https://wa.me/"+numero,"_blank","noopener");
}

async function registrarNotaRapida(id){
  modal(`
    <h2>Nota rápida</h2>
    <div class="zx_text">Añade una observación breve al historial del trabajo.</div>
    <textarea id="tr_nota_rapida" rows="5" placeholder="Escribe o dicta la nota..."></textarea>
    <button class="zx_btn_big zx_verde" id="tr_nota_guardar">Guardar nota</button>
    <button class="zx_btn_big zx_gris" id="tr_nota_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_nota_cancelar").onclick=cerrarModal;
  document.getElementById("tr_nota_guardar").onclick=async function(){
    const nota=valor("tr_nota_rapida");

    if(!nota){
      alert("Escribe una nota.");
      return;
    }

    const ok=await registrarHistorial(id,"nota",nota,{nota:nota});

    if(!ok){
      alert("No se pudo guardar la nota.");
      return;
    }

    cerrarModal();
    abrirFicha(id);
  };
}

async function finalizarTrabajoRapido(id){
  const t=await cargarTrabajo(id);
  if(!t) return;

  modal(`
    <h2>Finalizar trabajo</h2>
    <div class="zx_text">
      <b>${limpiar(t.titulo || "Trabajo")}</b><br>
      Puedes añadir un registro breve de lo realizado. Es opcional.
    </div>
    <textarea id="tr_fin_resumen" rows="5" placeholder="Trabajo realizado, observaciones o material pendiente..."></textarea>
    <button class="zx_btn_big zx_verde" id="tr_fin_confirmar">✅ Finalizar</button>
    <button class="zx_btn_big zx_gris" id="tr_fin_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_fin_cancelar").onclick=cerrarModal;

  document.getElementById("tr_fin_confirmar").onclick=async function(){
    const resumen=valor("tr_fin_resumen");

    try{
      const r=await actualizarTrabajo(id,{estado:"terminado"});
      if(r && r.error) throw r.error;

      await registrarHistorial(
        id,
        "finalizacion",
        resumen || "Trabajo finalizado.",
        {
          estado:"terminado",
          resumen:resumen,
          finalizado_at:new Date().toISOString()
        }
      );

      await sincronizarAgenda(id,Object.assign({},t,{estado:"terminado"}));

      cerrarModal();
      await window.ZX_trabajos();
    }catch(e){
      alert("No se pudo finalizar el trabajo.");
    }
  };
}

async function ejecutarAccionPrincipal(id,accion){
  if(accion==="iniciar"){
    const t=await cargarTrabajo(id);
    if(!t) return;

    try{
      const r=await actualizarTrabajo(id,{estado:"en_curso"});
      if(r && r.error) throw r.error;

      await registrarHistorial(
        id,
        "inicio",
        "Trabajo iniciado.",
        {
          estado:"en_curso",
          iniciado_at:new Date().toISOString()
        }
      );

      await sincronizarAgenda(id,Object.assign({},t,{estado:"en_curso"}));

      cerrarModal();
      await window.ZX_trabajos();
    }catch(e){
      alert("No se pudo iniciar el trabajo.");
    }
    return;
  }

  if(accion==="terminar"){
    finalizarTrabajoRapido(id);
  }
}

async function abrirFicha(id){
  const t=await cargarTrabajo(id);
  if(!t){alert("Trabajo no encontrado.");return}

  modal(`
    <h2>${limpiar(t.titulo || "Trabajo")}</h2>
    <div id="tr_ficha_contenido">
      <div class="zx_tr_loading">Cargando ficha...</div>
    </div>
    <button class="zx_btn_big zx_gris" id="tr_ficha_cerrar">Cerrar</button>
  `);

  document.getElementById("tr_ficha_cerrar").onclick=cerrarModal;

  const box=document.getElementById("tr_ficha_contenido");

  const [plan,mat,arch,hist]=await Promise.all([
    cargarPlanificacion(id),
    cargarMateriales(id),
    cargarArchivos(id),
    cargarHistorial(id)
  ]);
  const sugerencias=await cargarSugerenciasDocumentales(t,arch);

  const equipo=equipoPlanificacion(plan,t);
  const dir=direccionTrabajo(t);
  const tel=t.telefono_contacto || t.telefono || "";
  const principal=accionPrincipalTrabajo(t);
  const horario=tiempoPlanificado(t);

  box.innerHTML=`
    <div class="zx_tr_operativo">
      <section class="zx_tr_status_card zx_tr_estado_${claseEstado(t.estado)}">
        <div class="zx_tr_status_top">
          <div>
            <span class="zx_tr_status_label">Estado actual</span>
            <strong>${limpiar(estadoTexto(t.estado))}</strong>
          </div>
          <div class="zx_tr_badges">
            <span class="estado ${claseEstado(t.estado)}">${limpiar(estadoTexto(t.estado))}</span>
            <span class="prio ${clasePrioridad(t.prioridad)}">${limpiar(prioridadTexto(t.prioridad))}</span>
          </div>
        </div>

        <div class="zx_tr_status_grid">
          ${t.fecha ? `<div><span class="zx_tr_calendar_day" aria-label="Calendario">${new Date().getDate()}</span><small>Fecha</small><b>${limpiar(fechaES(t.fecha))}</b></div>` : ""}
          ${horario ? `<div><span>🕒</span><small>Horario</small><b>${limpiar(horario)}</b></div>` : ""}
          <div><span>👥</span><small>Equipo</small><b>${equipo.length || 1}</b></div>
          <button type="button" class="zx_tr_status_materials" id="tr_open_materials"><span>📦</span><small>Materiales</small><b>${mat.length}</b></button>
        </div>
      </section>

      ${principal.accion!=="ninguna" ? `
        <button
          type="button"
          class="zx_tr_main_action ${principal.clase}"
          id="tr_accion_principal"
          data-action="${limpiar(principal.accion)}"
        >
          <span>${principal.icono}</span>
          ${limpiar(principal.texto)}
        </button>
      ` : `
        <div class="zx_tr_main_action ${principal.clase}">
          <span>${principal.icono}</span>
          ${limpiar(principal.texto)}
        </div>
      `}

      <section class="zx_tr_contact_card">
        ${t.cliente ? `<div class="zx_tr_contact_title">👤 ${limpiar(t.cliente)}</div>` : ""}
        ${equipo.length ? `<div class="zx_tr_contact_line"><b>Equipo</b><span>${limpiar(equipo.join(", "))}</span></div>` : ""}
        ${dir ? `<div class="zx_tr_contact_line"><b>Dirección</b><span>${limpiar(dir)}</span></div>` : ""}
        ${t.descripcion ? `<div class="zx_tr_description">${limpiar(t.descripcion)}</div>` : ""}
      </section>

      <div class="zx_tr_quick_actions">
        ${dir ? `<button type="button" class="zx_tr_quick_btn" id="tr_quick_route"><span class="zx_tr_quick_icon">🧭</span><span>Abrir ruta</span></button>` : ""}
        ${tel ? `<button type="button" class="zx_tr_quick_btn" id="tr_quick_call"><span class="zx_tr_quick_icon">📞</span><span>Llamar</span></button>` : ""}
        ${tel ? `<button type="button" class="zx_tr_quick_btn" id="tr_quick_whatsapp"><span class="zx_tr_quick_icon">💬</span><span>WhatsApp</span></button>` : ""}
        <button type="button" class="zx_tr_quick_btn" id="tr_quick_note"><span class="zx_tr_quick_icon">📝</span><span>Añadir nota</span></button>
      </div>

      <details class="zx_tr_more">
        <summary>Más opciones</summary>
        <div class="zx_tr_more_grid">
          ${puedeGestionar() ? `<button class="blue" onclick="ZX_tr_editar('${limpiar(id)}')"><span class="zx_tr_action_icon">✏️</span><span>Editar trabajo</span></button>` : ""}
          ${puedeGestionar() ? `<button class="orange" onclick="ZX_tr_estado('${limpiar(id)}')"><span class="zx_tr_action_icon">🔄</span><span>Cambiar estado</span></button>` : ""}
          ${puedeGestionar() ? `<button class="gray" onclick="ZX_tr_material('${limpiar(id)}')"><span class="zx_tr_action_icon">📦</span><span>Materiales</span></button>` : ""}
          ${puedeGestionar() ? `<button class="gray" onclick="ZX_tr_archivo('${limpiar(id)}')"><span class="zx_tr_action_icon">📎</span><span>Archivos</span></button>` : ""}
          ${puedeBorrar() ? `<button class="red" onclick="ZX_tr_gestionar('${limpiar(id)}')"><span class="zx_tr_action_icon">⚙️</span><span>Gestionar</span></button>` : ""}
        </div>
      </details>

      ${renderBloque("Planificación",plan.map(function(p){
        return `${fechaES(p.fecha)} ${p.hora_inicio ? String(p.hora_inicio).slice(0,5) : ""} ${p.nombre || p.usuario || p.tecnico || ""}`;
      }))}
      ${renderMaterialesResumen(id,mat)}
      ${renderArchivos(arch)}
      ${renderNotasVisibles(hist)}
      ${renderSugerenciasInteligentes(sugerencias)}
      ${renderHistorialProfesional(hist)}
    </div>
  `;

  const materials=document.getElementById("tr_open_materials");
  if(materials) materials.onclick=function(){abrirListaMateriales(id)};

  const materialsBlock=document.getElementById("tr_materials_block");
  if(materialsBlock) materialsBlock.onclick=function(){abrirListaMateriales(id)};

  const accion=document.getElementById("tr_accion_principal");
  if(accion){
    accion.onclick=function(){
      ejecutarAccionPrincipal(id,String(accion.dataset.action || ""));
    };
  }

  const route=document.getElementById("tr_quick_route");
  if(route) route.onclick=function(){abrirMapa(dir)};

  const call=document.getElementById("tr_quick_call");
  if(call) call.onclick=function(){location.href="tel:"+telefonoLimpio(tel)};

  const whatsapp=document.getElementById("tr_quick_whatsapp");
  if(whatsapp) whatsapp.onclick=function(){whatsappTrabajo(tel)};

  const note=document.getElementById("tr_quick_note");
  if(note) note.onclick=function(){registrarNotaRapida(id)};

  const smart=document.getElementById("tr_smart_attach");
  if(smart) smart.onclick=function(){adjuntarSugerencias(id,sugerencias)};
}

function renderNotasVisibles(hist){
  const notas=(hist || []).filter(h=>normalizar(h.tipo).includes("nota") || normalizar(h.notas).startsWith("nota"));
  if(!notas.length) return "";
  return `<section class="zx_tr_block zx_tr_notes_block"><div class="zx_tr_block_title"><h3>Notas</h3><span>${notas.length}</span></div>${notas.slice(0,5).map(h=>`<article class="zx_tr_note_visible"><p>${limpiar(h.notas || "")}</p><small>${limpiar(h.usuario || "Sistema")} · ${limpiar(fechaHoraHistorial(h))}</small></article>`).join("")}</section>`;
}

function renderMaterialesResumen(trabajoId,lista){
  return `
    <button type="button" class="zx_tr_block zx_tr_materials_block" id="tr_materials_block">
      <div class="zx_tr_block_title">
        <h3>Materiales</h3>
        <span>Ver y gestionar ›</span>
      </div>
      ${lista.length
        ? lista.slice(0,3).map(function(m){
            return `<div class="zx_tr_line">${limpiar(`${m.cantidad || ""} ${m.unidad || ""} ${m.nombre || m.material || ""}`.trim())}</div>`;
          }).join("")
        : `<div class="zx_tr_empty mini">Sin materiales.</div>`
      }
      ${lista.length>3 ? `<div class="zx_tr_materials_more">+ ${lista.length-3} más</div>` : ""}
    </button>
  `;
}

async function abrirListaMateriales(trabajoId){
  modal(`
    <div class="zx_tr_materials_header">
      <div>
        <h2>Materiales</h2>
        <p>Gestiona los materiales de este trabajo.</p>
      </div>
      ${puedeGestionar() ? `<button type="button" class="zx_tr_add_material" id="tr_material_add">＋ Añadir</button>` : ""}
    </div>
    <div id="tr_material_list"><div class="zx_tr_loading">Cargando materiales...</div></div>
    <button class="zx_btn_big zx_gris" id="tr_material_back">Volver al trabajo</button>
  `);

  const back=document.getElementById("tr_material_back");
  if(back) back.onclick=function(){abrirFicha(trabajoId)};
  const add=document.getElementById("tr_material_add");
  if(add) add.onclick=function(){abrirMaterial(trabajoId,null)};

  const lista=await cargarMateriales(trabajoId);
  const box=document.getElementById("tr_material_list");
  if(!box) return;

  if(!lista.length){
    box.innerHTML=`<div class="zx_tr_empty_card">No hay materiales añadidos.</div>`;
    return;
  }

  box.innerHTML=lista.map(function(m){
    const nombre=m.nombre || m.material || "Material";
    const cantidad=[m.cantidad,m.unidad].filter(Boolean).join(" ");
    return `
      <article class="zx_tr_material_item">
        <div class="zx_tr_material_info">
          <strong>${limpiar(nombre)}</strong>
          ${cantidad ? `<span>${limpiar(cantidad)}</span>` : ""}
          ${m.notas ? `<small>${limpiar(m.notas)}</small>` : ""}
        </div>
        ${puedeGestionar() ? `
          <div class="zx_tr_material_actions">
            <button type="button" class="blue" data-edit-material="${limpiar(m.id)}">✏️ Editar</button>
            <button type="button" class="red" data-delete-material="${limpiar(m.id)}">🗑️ Eliminar</button>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  box.querySelectorAll("[data-edit-material]").forEach(function(btn){
    btn.onclick=function(){
      const material=lista.find(function(m){return String(m.id)===String(btn.dataset.editMaterial)});
      if(material) abrirMaterial(trabajoId,material);
    };
  });

  box.querySelectorAll("[data-delete-material]").forEach(function(btn){
    btn.onclick=function(){eliminarMaterial(trabajoId,btn.dataset.deleteMaterial)};
  });
}

async function actualizarMaterialCompatible(materialId,data){
  if(!navigator.onLine || !sb()) return {data:null,error:new Error("Necesitas conexión para editar materiales.")};
  let payload={...data};
  let ultimoError=null;
  for(let intento=0;intento<8;intento++){
    const r=await sb().from("trabajos_materiales").update(payload).eq("id",String(materialId));
    if(!r.error) return r;
    ultimoError=r.error;
    const columna=errorColumnaNoExiste(r.error);
    if(columna && Object.prototype.hasOwnProperty.call(payload,columna)){
      delete payload[columna];
      continue;
    }
    break;
  }
  return {data:null,error:ultimoError || new Error("No se pudo actualizar el material.")};
}

async function eliminarMaterial(trabajoId,materialId){
  if(!confirm("¿Eliminar este material?")) return;
  if(!navigator.onLine || !sb()){alert("Necesitas conexión para eliminar materiales.");return}
  try{
    const actual=await sb().from("trabajos_materiales").select("*").eq("id",String(materialId)).maybeSingle();
    const r=await sb().from("trabajos_materiales").delete().eq("id",String(materialId));
    if(r.error) throw r.error;
    const nombre=actual && actual.data ? (actual.data.nombre || actual.data.material || "Material") : "Material";
    await registrarHistorial(trabajoId,"material","Material eliminado: "+nombre,{material_id:materialId});
    await abrirListaMateriales(trabajoId);
  }catch(e){
    alert("No se pudo eliminar el material."+(mensajeError(e) ? "\n\n"+mensajeError(e) : ""));
  }
}

function configHistorial(tipo,notas){
  const t=normalizar(tipo || "");
  const n=normalizar(notas || "");

  if(t.includes("archivo") || n.includes("archivo")) return {icono:"📎",titulo:"Archivos",clase:"archivo"};
  if(t.includes("material") || n.includes("material")) return {icono:"📦",titulo:"Materiales",clase:"material"};
  if(t.includes("estado") || n.includes("estado")) return {icono:"🔄",titulo:"Estado",clase:"estado"};
  if(t.includes("plan") || n.includes("planific") || n.includes("fecha") || n.includes("hora")) return {icono:"📅",titulo:"Planificación",clase:"planificacion"};
  if(t.includes("nota") || n.includes("nota")) return {icono:"📝",titulo:"Nota",clase:"nota"};
  if(t.includes("inicio") || n.includes("iniciado")) return {icono:"▶️",titulo:"Inicio del trabajo",clase:"inicio"};
  if(t.includes("fin") || t.includes("termin") || n.includes("terminado") || n.includes("finalizado")) return {icono:"✅",titulo:"Finalización",clase:"fin"};
  if(t.includes("equipo") || t.includes("usuario") || n.includes("responsable") || n.includes("participante")) return {icono:"👥",titulo:"Equipo",clase:"equipo"};
  if(t.includes("elimin") || n.includes("eliminado") || n.includes("borrado")) return {icono:"🗑️",titulo:"Eliminación",clase:"eliminar"};
  if(t.includes("edicion") || t.includes("editar") || n.includes("actualizado") || n.includes("modificado")) return {icono:"✏️",titulo:"Edición",clase:"edicion"};
  return {icono:"🕘",titulo:"Actividad",clase:"sistema"};
}

function fechaHoraHistorial(h){
  let fecha=fechaES(h.fecha || h.created_at);
  let hora="";

  if(h.created_at){
    const d=new Date(h.created_at);
    if(!isNaN(d.getTime())){
      fecha=d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"});
      hora=d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
    }
  }

  if(!hora && h.hora_inicio) hora=String(h.hora_inicio).slice(0,5);
  return fecha+(hora ? " · "+hora : "");
}

function renderHistorialProfesional(lista){
  const hist=Array.isArray(lista) ? lista : [];

  return `
    <section class="zx_tr_block zx_tr_history_block">
      <div class="zx_tr_block_title">
        <h3>Historial</h3>
        <span>${hist.length}</span>
      </div>
      ${hist.length ? `
        <div class="zx_tr_history_list">
          ${hist.map(function(h){
            const cfg=configHistorial(h.tipo,h.notas);
            const usuario=h.usuario || h.usuario_nombre || h.nombre_usuario || "Sistema";
            return `
              <article class="zx_tr_history_item ${cfg.clase}">
                <div class="zx_tr_history_icon">${cfg.icono}</div>
                <div class="zx_tr_history_content">
                  <div class="zx_tr_history_head">
                    <strong>${limpiar(cfg.titulo)}</strong>
                    <time>${limpiar(fechaHoraHistorial(h))}</time>
                  </div>
                  <p>${limpiar(h.notas || "Actividad registrada")}</p>
                  <div class="zx_tr_history_user"><span>👤</span>${limpiar(usuario)}</div>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `<div class="zx_tr_empty mini">Todavía no hay actividad registrada.</div>`}
    </section>
  `;
}

function renderBloque(titulo,lineas){
  return `
    <div class="zx_tr_block">
      <h3>${limpiar(titulo)}</h3>
      ${lineas.length ? lineas.map(x=>`<div class="zx_tr_line">${limpiar(x)}</div>`).join("") : `<div class="zx_tr_empty mini">Sin datos.</div>`}
    </div>
  `;
}

function tipoArchivoVisible(a){
  const tipo=String(a.tipo || a.mime_type || "").trim();
  if(tipo) return tipo.split("/").pop().toUpperCase();
  const url=String(a.url || a.archivo_url || "").split("?")[0];
  const ext=(url.split(".").pop() || "").toUpperCase();
  return ext && ext.length<=6 ? ext : "ARCHIVO";
}

function fechaArchivoVisible(a){
  const raw=a.created_at || a.fecha || a.fecha_subida || "";
  if(!raw) return "";
  const d=new Date(raw);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"});
}

function horaArchivoVisible(a){
  const raw=a.created_at || a.fecha || a.fecha_subida || "";
  if(!raw) return "";
  const d=new Date(raw);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",hour12:false});
}

function tamanoArchivoVisible(a){
  const n=Number(a.tamano || a.tamaño || a.size || a.file_size || 0);
  if(!Number.isFinite(n) || n<=0) return "";
  if(n<1024) return n+" B";
  if(n<1024*1024) return (n/1024).toFixed(n<10240?1:0).replace(".",",")+" KB";
  if(n<1024*1024*1024) return (n/(1024*1024)).toFixed(1).replace(".",",")+" MB";
  return (n/(1024*1024*1024)).toFixed(1).replace(".",",")+" GB";
}

function esImagenArchivo(a){
  const tipo=String(a.tipo || a.mime_type || "").toLowerCase();
  const url=String(a.url || a.archivo_url || "").toLowerCase();
  return tipo.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/.test(url);
}

function miniaturaArchivo(a){
  const url=String(a.url || a.archivo_url || "");
  if(esImagenArchivo(a) && url){
    return `<img class="zx_tr_file_thumb" src="${limpiar(url)}" alt="" loading="lazy">`;
  }
  return `<span class="zx_tr_file_icon">${iconoArchivo(a)}</span>`;
}

function iconoArchivo(a){
  const tipo=String(a.tipo || a.mime_type || "").toLowerCase();
  const url=String(a.url || a.archivo_url || "").toLowerCase();
  if(tipo.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/.test(url)) return "🖼️";
  if(tipo.includes("pdf") || /\.pdf(\?|$)/.test(url)) return "📕";
  if(tipo.includes("word") || /\.(doc|docx)(\?|$)/.test(url)) return "📘";
  return "📎";
}

function renderArchivos(lista){
  return `
    <div class="zx_tr_block">
      <h3>Archivos</h3>
      ${
        lista.length
        ? `<div class="zx_tr_files_list">${lista.map(a=>{
            const nombre=a.nombre || a.filename || "Archivo";
            const fecha=fechaArchivoVisible(a);
            const hora=horaArchivoVisible(a);
            const tamano=tamanoArchivoVisible(a);
            const meta1=[tipoArchivoVisible(a),tamano].filter(Boolean).join(" · ");
            const meta2=[fecha,hora].filter(Boolean).join(" · ");
            return `<button type="button" class="zx_tr_file zx_tr_file_manage" onclick="ZX_tr_file_menu('${limpiar(a.id)}','${limpiar(a.trabajo_id || "")}')">
              ${miniaturaArchivo(a)}
              <span class="zx_tr_file_text">
                <strong>${limpiar(nombre)}</strong>
                <small>${limpiar(meta1)}</small>
                ${meta2 ? `<small class="zx_tr_file_date">${limpiar(meta2)}</small>` : ""}
              </span>
              <span class="zx_tr_file_more">⋯</span>
            </button>`;
          }).join("")}</div>`
        : `<div class="zx_tr_empty mini">Sin archivos.</div>`
      }
    </div>
  `;
}

async function gestionarTrabajo(id){
  const t=await cargarTrabajo(id);
  if(!t) return;

  modal(`
    <h2>Gestionar trabajo</h2>
    <div class="zx_tr_notice danger">Archivar, restaurar o borrar definitivamente requiere PIN administrador.</div>
    <button class="zx_btn_big ${t.archivado ? "zx_verde" : "zx_naranja"}" id="tr_archivar">${t.archivado ? "Restaurar" : "Archivar"}</button>
    <button class="zx_btn_big zx_rojo" id="tr_borrar">Borrar definitivamente</button>
    <button class="zx_btn_big zx_gris" id="tr_gestion_cerrar">Cancelar</button>
  `);

  document.getElementById("tr_gestion_cerrar").onclick=cerrarModal;

  document.getElementById("tr_archivar").onclick=async function(){
    const ok=await pedirPinAdmin();
    if(!ok) return;

    const nuevo=!(t.archivado===true || t.archivado==="true");
    await actualizarTrabajo(id,{archivado:nuevo});
    await registrarHistorial(id,"archivo",nuevo ? "Trabajo archivado." : "Trabajo restaurado.",{archivado:nuevo});

    cerrarModal();
    await window.ZX_trabajos();
  };

  document.getElementById("tr_borrar").onclick=async function(){
    const ok=await pedirPinAdmin();
    if(!ok) return;

    if(!confirm("¿Borrar definitivamente este trabajo?")) return;

    try{
      let r;

      if(zx() && typeof zx().remove==="function"){
        r=await zx().remove(TABLA,"id",id);
      }else{
        r=await sb().from(TABLA).delete().eq("id",String(id));
      }

      if(r && r.error) throw r.error;

      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));

      cerrarModal();
      salirTrabajoUnico();
      await window.ZX_trabajos();

    }catch(e){
      alert("No se pudo borrar.");
    }
  };
}

async function actualizarTrabajo(id,data){
  if(zx() && typeof zx().update==="function"){
    return zx().update(TABLA,data,"id",id);
  }
  return sb().from(TABLA).update(data).eq("id",String(id));
}

function mensajeError(error){
  if(!error) return "";
  return String(error.message || error.details || error.hint || error.code || error);
}

function errorColumnaNoExiste(error){
  const m=mensajeError(error);
  const patrones=[
    /Could not find the ['\"]([^'\"]+)['\"] column/i,
    /column ['\"]?([^'\"\\s]+)['\"]? does not exist/i,
    /schema cache.*['\"]([^'\"]+)['\"]/i
  ];
  for(const patron of patrones){
    const r=m.match(patron);
    if(r && r[1]) return String(r[1]);
  }
  return "";
}

async function insertarMaterialCompatible(data){
  const backend=window.ZENTRYX_BACKEND || (zx() && (zx().Backend || zx().backend)) || null;
  const core=zx();

  const insertar=async function(payload){
    if(backend && typeof backend.insert==="function") return backend.insert("trabajos_materiales",[payload]);
    if(core && typeof core.insert==="function") return core.insert("trabajos_materiales",[payload]);
    if(!sb()) return {data:null,error:new Error("No hay conexión con la base de datos.")};
    return sb().from("trabajos_materiales").insert([payload]);
  };

  let payload={...data};
  let ultimoError=null;
  for(let intento=0;intento<8;intento++){
    const r=await insertar(payload);
    if(!r || !r.error) return r || {data:[payload],error:null};
    ultimoError=r.error;
    const columna=errorColumnaNoExiste(r.error);
    if(columna && Object.prototype.hasOwnProperty.call(payload,columna)){
      delete payload[columna];
      continue;
    }
    break;
  }

  const variantes=[
    {id:data.id,trabajo_id:data.trabajo_id,material:data.material||data.nombre,cantidad:data.cantidad,unidad:data.unidad,notas:data.notas,created_at:data.created_at},
    {id:data.id,trabajo_id:data.trabajo_id,nombre:data.nombre||data.material,cantidad:data.cantidad,unidad:data.unidad,notas:data.notas,created_at:data.created_at},
    {id:data.id,trabajo_id:data.trabajo_id,material:data.material||data.nombre,cantidad:data.cantidad,unidad:data.unidad,notas:data.notas},
    {id:data.id,trabajo_id:data.trabajo_id,nombre:data.nombre||data.material,cantidad:data.cantidad,unidad:data.unidad,notas:data.notas}
  ];

  for(const variante of variantes){
    const limpia=Object.fromEntries(Object.entries(variante).filter(function(entry){
      return entry[1]!==undefined && entry[1]!==null;
    }));
    const r=await insertar(limpia);
    if(!r || !r.error) return r || {data:[limpia],error:null};
    ultimoError=r.error;
  }
  return {data:null,error:ultimoError || new Error("No se pudo guardar el material.")};
}

async function abrirMaterial(id,material){
  material=material || null;
  modal(`
    <h2>${material ? "Editar material" : "Nuevo material"}</h2>
    <label class="zx_tr_label">Material</label>
    <div class="zx_tr_autocomplete_wrap">
      <input id="tr_mat_nombre" autocomplete="off" placeholder="Empieza a escribir para buscar..." value="${limpiar(material ? (material.nombre || material.material || "") : "")}">
      <div id="tr_mat_sugerencias" class="zx_tr_autocomplete_list" hidden></div>
    </div>
    <div class="zx_tr_grid2">
      <div>
        <label class="zx_tr_label">Cantidad</label>
        <input id="tr_mat_cantidad" type="number" step="0.01" value="${limpiar(material && material.cantidad!=null ? material.cantidad : 1)}">
      </div>
      <div>
        <label class="zx_tr_label">Unidad</label>
        <input id="tr_mat_unidad" value="${limpiar(material ? (material.unidad || "ud") : "ud")}">
      </div>
    </div>
    <details class="zx_tr_material_extra">
      <summary>Datos de biblioteca (opcional)</summary>
      <label class="zx_tr_label">Referencia</label><input id="tr_mat_referencia" value="${limpiar(material ? (material.referencia || "") : "")}">
      <label class="zx_tr_label">Proveedor</label><input id="tr_mat_proveedor" value="${limpiar(material ? (material.proveedor || "") : "")}">
      <div class="zx_tr_grid2"><div><label class="zx_tr_label">Precio compra</label><input id="tr_mat_precio_compra" type="number" step="0.01" value="${limpiar(material && material.precio_compra!=null ? material.precio_compra : "")}"></div><div><label class="zx_tr_label">Precio venta</label><input id="tr_mat_precio_venta" type="number" step="0.01" value="${limpiar(material && material.precio_venta!=null ? material.precio_venta : "")}"></div></div>
    </details>
    <label class="zx_tr_label">Notas</label>
    <textarea id="tr_mat_notas" rows="3">${limpiar(material ? (material.notas || "") : "")}</textarea>
    <button class="zx_btn_big zx_verde" id="tr_mat_guardar">${material ? "Guardar cambios" : "Guardar material"}</button>
    <button class="zx_btn_big zx_gris" id="tr_mat_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_mat_cancelar").onclick=function(){abrirListaMateriales(id)};

  const nombreInput=document.getElementById("tr_mat_nombre");
  const sugerenciasBox=document.getElementById("tr_mat_sugerencias");
  const biblioteca=await cargarBibliotecaMateriales();
  function pintarSugerencias(){
    const q=normalizar(nombreInput.value);
    const items=biblioteca.filter(x=>!q || normalizar(x.nombre).includes(q)).slice(0,10);
    if(!items.length || (!q && document.activeElement!==nombreInput)){sugerenciasBox.hidden=true;return}
    sugerenciasBox.innerHTML=items.map((x,i)=>`<button type="button" data-mat-sug="${i}"><strong>${limpiar(x.nombre)}</strong><small>${limpiar([x.unidad,x.referencia,x.proveedor].filter(Boolean).join(" · "))}${x.usos ? ` · usado ${x.usos} veces` : ""}</small></button>`).join("");
    sugerenciasBox.hidden=false;
    sugerenciasBox.querySelectorAll("[data-mat-sug]").forEach(btn=>btn.onclick=function(){
      const x=items[Number(btn.dataset.matSug)]; if(!x)return;
      nombreInput.value=x.nombre || "";
      document.getElementById("tr_mat_unidad").value=x.unidad || "ud";
      document.getElementById("tr_mat_referencia").value=x.referencia || "";
      document.getElementById("tr_mat_proveedor").value=x.proveedor || "";
      document.getElementById("tr_mat_precio_compra").value=x.precio_compra ?? "";
      document.getElementById("tr_mat_precio_venta").value=x.precio_venta ?? "";
      sugerenciasBox.hidden=true;
    });
  }
  nombreInput.addEventListener("input",pintarSugerencias);
  nombreInput.addEventListener("focus",pintarSugerencias);
  setTimeout(()=>document.addEventListener("click",function cerrarSug(ev){if(!ev.target.closest(".zx_tr_autocomplete_wrap")){sugerenciasBox.hidden=true;document.removeEventListener("click",cerrarSug)}},true),0);

  document.getElementById("tr_mat_guardar").onclick=async function(){
    const nombre=valor("tr_mat_nombre");
    if(!nombre){alert("Introduce material.");return}

    const data={
      id:idLocal(),
      trabajo_id:String(id),
      nombre:nombre,
      material:nombre,
      cantidad:Number(valor("tr_mat_cantidad") || 1),
      unidad:valor("tr_mat_unidad") || "ud",
      notas:valor("tr_mat_notas"),
      referencia:valor("tr_mat_referencia"),
      proveedor:valor("tr_mat_proveedor"),
      precio_compra:valor("tr_mat_precio_compra")!=="" ? Number(valor("tr_mat_precio_compra")) : null,
      precio_venta:valor("tr_mat_precio_venta")!=="" ? Number(valor("tr_mat_precio_venta")) : null,
      preparado:false,
      created_at:new Date().toISOString()
    };

    const boton=document.getElementById("tr_mat_guardar");
    if(boton){boton.disabled=true;boton.textContent="Guardando...";}

    try{
      let r;
      if(material){
        const cambios={
          nombre:nombre,
          material:nombre,
          cantidad:data.cantidad,
          unidad:data.unidad,
          notas:data.notas,
          referencia:data.referencia,proveedor:data.proveedor,precio_compra:data.precio_compra,precio_venta:data.precio_venta
        };
        r=await actualizarMaterialCompatible(material.id,cambios);
      }else{
        r=await insertarMaterialCompatible(data);
      }
      if(r && r.error) throw r.error;

      aprenderMaterial(data);
      await registrarHistorial(id,"material",(material ? "Material actualizado: " : "Material añadido: ")+nombre,{
        material:nombre,cantidad:data.cantidad,unidad:data.unidad,notas:data.notas,referencia:data.referencia,proveedor:data.proveedor
      });
      await abrirListaMateriales(id);

    }catch(e){
      const detalle=mensajeError(e);
      alert("No se pudo guardar el material."+(detalle ? "\n\n"+detalle : ""));
      if(boton){boton.disabled=false;boton.textContent=material ? "Guardar cambios" : "Guardar material";}
    }
  };
}

function rutaStorageDesdeUrl(url){
  const texto=String(url || "");
  const marcas=[
    "/storage/v1/object/public/zentryx-trabajos/",
    "/storage/v1/object/sign/zentryx-trabajos/",
    "/storage/v1/object/authenticated/zentryx-trabajos/"
  ];
  for(const marca of marcas){
    const pos=texto.indexOf(marca);
    if(pos>=0){
      const ruta=texto.slice(pos+marca.length).split("?")[0];
      try{return decodeURIComponent(ruta)}catch(e){return ruta}
    }
  }
  return "";
}

async function cargarArchivoPorId(archivoId){
  if(!archivoId || !sb()) return null;
  try{
    const r=await sb().from("trabajos_archivos").select("*").eq("id",String(archivoId)).maybeSingle();
    return r && !r.error ? r.data : null;
  }catch(e){return null}
}

async function renombrarArchivo(archivo){
  const nombreActual=archivo.nombre || archivo.filename || "Archivo";
  modal(`
    <h2>Renombrar archivo</h2>
    <label class="zx_tr_label">Nombre visible</label>
    <input id="tr_file_rename" value="${limpiar(nombreActual)}" maxlength="120">
    <button class="zx_btn_big zx_verde" id="tr_file_rename_save">Guardar nombre</button>
    <button class="zx_btn_big zx_gris" id="tr_file_rename_cancel">Cancelar</button>
  `);
  document.getElementById("tr_file_rename_cancel").onclick=()=>abrirMenuArchivo(archivo.id,archivo.trabajo_id);
  const input=document.getElementById("tr_file_rename");
  input.focus();
  input.select();
  document.getElementById("tr_file_rename_save").onclick=async function(){
    const nuevo=String(input.value || "").trim();
    if(!nuevo){alert("Escribe un nombre para el archivo.");return}
    if(nuevo===nombreActual){abrirMenuArchivo(archivo.id,archivo.trabajo_id);return}
    this.disabled=true;
    this.textContent="Guardando...";
    try{
      const r=await sb().from("trabajos_archivos").update({nombre:nuevo}).eq("id",String(archivo.id));
      if(r.error) throw r.error;
      await registrarHistorial(archivo.trabajo_id,"archivo",`Archivo renombrado: ${nombreActual} → ${nuevo}`,{archivo_id:archivo.id,nombre_anterior:nombreActual,nombre_nuevo:nuevo});
      cerrarModal();
      await abrirFicha(archivo.trabajo_id);
    }catch(e){
      alert("No se pudo renombrar el archivo."+(mensajeError(e) ? "\n\n"+mensajeError(e) : ""));
      this.disabled=false;
      this.textContent="Guardar nombre";
    }
  };
}

async function eliminarArchivoGestion(archivo){
  const nombre=archivo.nombre || archivo.filename || "Archivo";
  if(!confirm(`¿Eliminar definitivamente “${nombre}”?`)) return;
  if(!navigator.onLine || !sb()){alert("Necesitas conexión para eliminar archivos.");return}
  try{
    const r=await sb().from("trabajos_archivos").delete().eq("id",String(archivo.id));
    if(r.error) throw r.error;
    const ruta=rutaStorageDesdeUrl(archivo.url || archivo.archivo_url || "");
    if(ruta){
      try{await sb().storage.from("zentryx-trabajos").remove([ruta])}catch(e){}
    }
    await registrarHistorial(archivo.trabajo_id,"archivo","Archivo eliminado: "+nombre,{archivo_id:archivo.id,ruta:ruta});
    cerrarModal();
    await abrirFicha(archivo.trabajo_id);
  }catch(e){
    alert("No se pudo eliminar el archivo."+(mensajeError(e) ? "\n\n"+mensajeError(e) : ""));
  }
}

async function compartirArchivo(archivo){
  const url=archivo.url || archivo.archivo_url || "";
  const nombre=archivo.nombre || archivo.filename || "Archivo";
  if(!url){alert("Este archivo no tiene una dirección válida.");return}
  try{
    if(navigator.share){
      await navigator.share({title:nombre,text:nombre,url:url});
      return;
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado.");
      return;
    }
    window.open(url,"_blank","noopener");
  }catch(e){
    if(e && e.name==="AbortError") return;
    window.open(url,"_blank","noopener");
  }
}

async function abrirMenuArchivo(archivoId,trabajoId){
  const archivo=await cargarArchivoPorId(archivoId);
  if(!archivo){alert("No se pudo cargar el archivo.");return}
  archivo.trabajo_id=archivo.trabajo_id || trabajoId;
  const nombre=archivo.nombre || archivo.filename || "Archivo";
  const url=archivo.url || archivo.archivo_url || "";
  const fecha=fechaArchivoVisible(archivo);
  const hora=horaArchivoVisible(archivo);
  const tamano=tamanoArchivoVisible(archivo);
  const metaPrincipal=[tipoArchivoVisible(archivo),tamano].filter(Boolean).join(" · ");
  const metaFecha=[fecha,hora].filter(Boolean).join(" · ");
  modal(`
    <h2>${limpiar(nombre)}</h2>
    ${esImagenArchivo(archivo) && url ? `<img class="zx_tr_file_preview" src="${limpiar(url)}" alt="Vista previa de ${limpiar(nombre)}">` : ""}
    <div class="zx_tr_file_info"><strong>${limpiar(metaPrincipal)}</strong>${metaFecha ? `<span>${limpiar(metaFecha)}</span>` : ""}</div>
    <button class="zx_btn_big zx_azul" id="tr_file_view">👁 Ver archivo</button>
    <button class="zx_btn_big" id="tr_file_rename_btn" style="background:#ffffff!important;color:#0f2348!important;-webkit-text-fill-color:#0f2348!important;border:2px solid #b9d2f3!important;box-shadow:0 2px 8px rgba(15,35,72,.08)!important;opacity:1!important;">✏️ Renombrar</button>
    <button class="zx_btn_big" id="tr_file_share" style="background:#ffffff!important;color:#0f2348!important;-webkit-text-fill-color:#0f2348!important;border:2px solid #b9d2f3!important;box-shadow:0 2px 8px rgba(15,35,72,.08)!important;opacity:1!important;">📤 Compartir</button>
    <button class="zx_btn_big zx_rojo" id="tr_file_delete">🗑️ Eliminar</button>
    <button class="zx_btn_big zx_gris" id="tr_file_close">Cerrar</button>
  `);
  document.getElementById("tr_file_close").onclick=cerrarModal;
  document.getElementById("tr_file_view").onclick=()=>{
    if(url) window.open(url,"_blank","noopener");
    else alert("Este archivo no tiene una dirección válida.");
  };
  document.getElementById("tr_file_rename_btn").onclick=()=>renombrarArchivo(archivo);
  document.getElementById("tr_file_share").onclick=()=>compartirArchivo(archivo);
  document.getElementById("tr_file_delete").onclick=()=>eliminarArchivoGestion(archivo);
}

async function insertarArchivoCompatible(datos){
  const variantes=[
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,archivo_url:datos.url,tipo:datos.tipo,tamano:datos.tamano},
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,url:datos.url,tipo:datos.tipo,tamano:datos.tamano},
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,archivo_url:datos.url,tipo:datos.tipo},
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,url:datos.url,tipo:datos.tipo},
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,archivo_url:datos.url},
    {trabajo_id:datos.trabajo_id,nombre:datos.nombre,url:datos.url}
  ];

  let ultimoError=null;
  for(const payload of variantes){
    try{
      const r=await sb().from("trabajos_archivos").insert([payload]).select("*").single();
      if(!r.error) return r;
      ultimoError=r.error;
    }catch(e){
      ultimoError=e;
    }
  }
  return {data:null,error:ultimoError || new Error("No se pudo registrar el archivo.")};
}

async function abrirArchivo(id){
  modal(`
    <h2>Subir archivo</h2>
    <label class="zx_tr_label">Foto, PDF o documento</label>
    <input id="tr_file" type="file" accept="image/*,.pdf,.doc,.docx">
    <label class="zx_tr_label">Nombre visible</label>
    <input id="tr_file_nombre" placeholder="Ej.: Foto de la instalación">
    <button class="zx_btn_big zx_verde" id="tr_file_guardar">Subir archivo</button>
    <button class="zx_btn_big zx_gris" id="tr_file_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_file_cancelar").onclick=cerrarModal;
  const input=document.getElementById("tr_file");
  input.onchange=function(){
    const file=(input.files || [])[0];
    const nombre=document.getElementById("tr_file_nombre");
    if(file && nombre && !nombre.value.trim()) nombre.value=file.name.replace(/\.[^.]+$/,'');
  };

  document.getElementById("tr_file_guardar").onclick=async function(){
    const boton=this;
    const file=(document.getElementById("tr_file").files || [])[0];
    if(!file){alert("Selecciona una foto o un archivo.");return}

    if(!navigator.onLine || !sb()){
      alert("Para subir archivos necesitas conexión.");
      return;
    }

    const nombre=(valor("tr_file_nombre") || file.name.replace(/\.[^.]+$/,'')).trim();
    const ext=(file.name.split(".").pop() || "dat").toLowerCase();
    const path="trabajos/"+String(id)+"/"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext;

    boton.disabled=true;
    boton.textContent="Subiendo...";

    try{
      const up=await sb().storage.from("zentryx-trabajos").upload(path,file,{upsert:false,contentType:file.type || undefined});
      if(up.error) throw up.error;

      const publicData=sb().storage.from("zentryx-trabajos").getPublicUrl(path);
      const url=publicData && publicData.data ? publicData.data.publicUrl : "";
      if(!url) throw new Error("No se pudo obtener la dirección del archivo.");

      const guardado=await insertarArchivoCompatible({
        trabajo_id:String(id),
        nombre:nombre,
        url:url,
        tipo:file.type || "",
        tamano:file.size || 0
      });

      if(guardado.error){
        try{await sb().storage.from("zentryx-trabajos").remove([path])}catch(e){}
        throw guardado.error;
      }

      await registrarHistorial(id,"archivo","Archivo añadido: "+nombre,{url:url,path:path});
      cerrarModal();
      await abrirFicha(id);
    }catch(e){
      const detalle=e && e.message ? e.message : String(e || "Error desconocido");
      alert("No se pudo subir el archivo.\n\n"+detalle);
      boton.disabled=false;
      boton.textContent="Subir archivo";
    }
  };
}

window.ZX_tr_editar=function(id){cargarTrabajo(id).then(t=>{if(t) abrirFormulario(t)})};
window.ZX_tr_estado=function(id){abrirCambioEstado(id)};
window.ZX_tr_mapa=function(dir){abrirMapa(dir)};
window.ZX_tr_material=function(id){abrirListaMateriales(id)};
window.ZX_tr_archivo=function(id){abrirArchivo(id)};
window.ZX_tr_file_menu=function(archivoId,trabajoId){abrirMenuArchivo(archivoId,trabajoId)};
window.ZX_tr_gestionar=function(id){gestionarTrabajo(id)};
window.ZX_tr_nota=function(id){registrarNotaRapida(id)};

function instalarCSS(){
  const old=document.getElementById("zx_trabajos_css_v3114");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_trabajos_css_v3114";
  s.innerHTML=`

    .zx_tr_files_list{display:grid;gap:10px}
    .zx_tr_file_manage{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #dbe5f0;background:#fff;border-radius:16px;padding:13px 14px;color:#0b1b3a;box-shadow:0 2px 7px rgba(15,23,42,.04);font:inherit}
    .zx_tr_file_manage:active{transform:scale(.99);background:#f3f8ff}
    .zx_tr_file_icon{font-size:28px;line-height:1;flex:0 0 58px;text-align:center}
    .zx_tr_file_thumb{width:58px;height:58px;flex:0 0 58px;object-fit:cover;border-radius:12px;background:#eef3f8;border:1px solid #d9e3ee}
    .zx_tr_file_text{display:flex;flex-direction:column;min-width:0;flex:1;gap:3px}
    .zx_tr_file_text strong{font-size:17px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zx_tr_file_text small{font-size:12px;color:#64748b;font-weight:800;letter-spacing:.02em}
    .zx_tr_file_text .zx_tr_file_date{color:#8290a5;font-weight:750}
    .zx_tr_file_more{font-size:24px;color:#64748b;line-height:1}
    .zx_tr_file_preview{display:block;width:100%;max-height:210px;object-fit:cover;border-radius:16px;margin:-2px 0 12px;background:#eef3f8;border:1px solid #d9e3ee}
    .zx_tr_file_info{display:flex;flex-direction:column;gap:4px;padding:12px 14px;margin:-4px 0 14px;border-radius:14px;background:#f3f7fb;color:#64748b;font-weight:800;text-align:center}
    .zx_tr_file_info strong{color:#52637a}
    .zx_tr_file_info span{font-size:13px}
    .zx_btn_big.zx_archivo_secundario{background:#fff!important;color:#0f2348!important;border:2px solid #b9d2f3!important;box-shadow:0 2px 8px rgba(15,35,72,.08)!important;opacity:1!important;-webkit-text-fill-color:#0f2348!important}
    .zx_btn_big.zx_archivo_secundario:active{background:#eef6ff!important;transform:scale(.99)}
    #tr_file_rename_btn,#tr_file_share{background:#fff!important;color:#0f2348!important;-webkit-text-fill-color:#0f2348!important;border:2px solid #b9d2f3!important;opacity:1!important}
    #tr_file_rename_btn:active,#tr_file_share:active{background:#eef6ff!important}

    .zx_tr_card{position:relative;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease}
    .zx_tr_card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;border-radius:24px 0 0 24px;background:#f59e0b}
    .zx_tr_card.zx_tr_estado_pendiente{background:#fffbeb;border-color:#f6c453;box-shadow:0 10px 24px rgba(245,158,11,.12)}
    .zx_tr_card.zx_tr_estado_pendiente::before{background:#f59e0b}
    .zx_tr_card.zx_tr_estado_curso{background:#eff6ff;border-color:#60a5fa;box-shadow:0 10px 24px rgba(37,99,235,.14)}
    .zx_tr_card.zx_tr_estado_curso::before{background:#2563eb}
    .zx_tr_card.zx_tr_estado_ok{background:#ecfdf5;border-color:#4ade80;box-shadow:0 10px 24px rgba(22,163,74,.14)}
    .zx_tr_card.zx_tr_estado_ok::before{background:#16a34a}
    .zx_tr_card.zx_tr_estado_rojo{background:#fef2f2;border-color:#f87171;box-shadow:0 10px 24px rgba(220,38,38,.13)}
    .zx_tr_card.zx_tr_estado_rojo::before{background:#dc2626}
    .zx_tr_status_card{position:relative;overflow:hidden;border-width:2px!important}
    .zx_tr_status_card::before{content:"";position:absolute;left:0;right:0;top:0;height:9px;background:#f59e0b}
    .zx_tr_status_card.zx_tr_estado_pendiente{background:#fffbeb;border-color:#f6c453}
    .zx_tr_status_card.zx_tr_estado_pendiente::before{background:#f59e0b}
    .zx_tr_status_card.zx_tr_estado_curso{background:#eff6ff;border-color:#60a5fa}
    .zx_tr_status_card.zx_tr_estado_curso::before{background:#2563eb}
    .zx_tr_status_card.zx_tr_estado_ok{background:#ecfdf5;border-color:#4ade80}
    .zx_tr_status_card.zx_tr_estado_ok::before{background:#16a34a}
    .zx_tr_status_card.zx_tr_estado_rojo{background:#fef2f2;border-color:#f87171}
    .zx_tr_status_card.zx_tr_estado_rojo::before{background:#dc2626}
    .zx_tr_status_card .zx_tr_status_top{padding-top:8px}
    .zx_tr_status_card.zx_tr_estado_pendiente .zx_tr_status_top strong{color:#92400e}
    .zx_tr_status_card.zx_tr_estado_curso .zx_tr_status_top strong{color:#1d4ed8}
    .zx_tr_status_card.zx_tr_estado_ok .zx_tr_status_top strong{color:#166534}
    .zx_tr_status_card.zx_tr_estado_rojo .zx_tr_status_top strong{color:#991b1b}
    .zx_tr_status_card .zx_tr_badges .estado{font-size:14px;padding:9px 14px;border:2px solid currentColor}

    .zx_tr_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_tr_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_tr_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_tr_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_tr_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_tr_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_tr_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_tr_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_tr_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_tr_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_tr_toolbar{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_tr_back{border:0;border-radius:18px;background:#dbeafe;color:#1d4ed8;padding:13px;font-size:15px;font-weight:950;text-align:left}
    .zx_tr_search{position:relative}
    .zx_tr_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_tr_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_tr_filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}
    .zx_tr_filters button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_tr_filters button.on{background:#2563eb;color:white}
    .zx_tr_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_tr_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .zx_tr_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_tr_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_tr_list{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_tr_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:24px;padding:16px;overflow:hidden}
    .zx_tr_top{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center}
    .zx_tr_icon{width:52px;height:52px;border-radius:18px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950}
    .zx_tr_top h3{margin:0;color:#071330;font-size:21px;line-height:1.15;font-weight:950}
    .zx_tr_meta{margin-top:4px;color:#64748b;font-size:13px;font-weight:950}
    .zx_tr_badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
    .zx_tr_badges span{border-radius:999px;padding:8px 10px;font-size:12px;font-weight:950}
    .zx_tr_badges .estado.ok{background:#dcfce7;color:#166534}
    .zx_tr_badges .estado.curso{background:#dbeafe;color:#1d4ed8}
    .zx_tr_badges .estado.rojo{background:#fee2e2;color:#991b1b}
    .zx_tr_badges .estado.pendiente{background:#fef3c7;color:#92400e}
    .zx_tr_badges .prio.urgente{background:#fee2e2;color:#991b1b}
    .zx_tr_badges .prio.alta{background:#ffedd5;color:#c2410c}
    .zx_tr_badges .prio.media{background:#e0e7ff;color:#3730a3}
    .zx_tr_badges .prio.baja{background:#dcfce7;color:#166534}
    .zx_tr_info{margin-top:13px;display:grid;grid-template-columns:1fr;gap:8px}
    .zx_tr_info p{margin:0;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_tr_info b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_tr_info span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_tr_actions,.zx_tr_ficha_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_tr_operativo{display:grid;gap:12px}
    .zx_tr_status_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px}
    .zx_tr_status_top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .zx_tr_status_label{display:block;color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px}
    .zx_tr_status_top strong{display:block;color:#071330;font-size:23px;font-weight:950;margin-top:3px}
    .zx_tr_status_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_tr_status_grid>div,.zx_tr_status_grid>button{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px}
    .zx_tr_status_grid>div>span,.zx_tr_status_grid>button>span{grid-row:1/3;font-size:20px}
    .zx_tr_status_grid .zx_tr_calendar_day{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;background:#fff;color:#7c3aed;border:1px solid #e2e8f0;font-size:13px;font-weight:950;line-height:1}
    .zx_tr_status_grid small{color:#64748b;font-size:10px;font-weight:850}
    .zx_tr_status_grid button{font:inherit;text-align:left;cursor:pointer}.zx_tr_status_materials{border-color:#93c5fd!important;background:#eff6ff!important}.zx_tr_status_materials:active{transform:scale(.98)}
    .zx_tr_status_grid b{color:#071330;font-size:14px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .zx_tr_main_action{width:100%;border:0;border-radius:20px;padding:18px 16px;color:white;font-size:19px;font-weight:950;display:flex;align-items:center;justify-content:center;gap:10px;text-align:center}
    .zx_tr_main_action span{font-size:22px}
    .zx_tr_start{background:#16a34a}.zx_tr_finish{background:#ea580c}.zx_tr_done{background:#166534}.zx_tr_cancelled{background:#991b1b}
    .zx_tr_contact_card{background:#fff;border:1px solid #dbe3ef;border-radius:20px;padding:14px;display:grid;gap:9px}
    .zx_tr_contact_title{color:#071330;font-size:19px;font-weight:950}
    .zx_tr_contact_line{display:grid;gap:3px}
    .zx_tr_contact_line b{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
    .zx_tr_contact_line span{color:#071330;font-size:14px;font-weight:850;line-height:1.35}
    .zx_tr_description{background:#f8fafc;border-radius:14px;padding:12px;color:#475569;font-size:14px;font-weight:800;line-height:1.4}
    .zx_tr_quick_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .zx_tr_quick_actions .zx_tr_quick_btn{min-height:58px;border:1px solid #d8e4f2;border-radius:16px;padding:10px 12px;background:#fff!important;color:#10213f!important;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:flex-start;gap:9px;text-align:left;line-height:1.15;box-shadow:0 2px 7px rgba(16,33,63,.05)}
    .zx_tr_quick_actions .zx_tr_quick_btn:active{transform:scale(.98);background:#edf5ff!important}
    .zx_tr_quick_icon{font-size:24px;line-height:1;flex:0 0 auto}
    .zx_tr_more_grid button{min-height:58px;border:1px solid #d8e4f2;border-radius:16px;padding:10px 12px;background:#fff!important;color:#10213f!important;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:flex-start;gap:9px;text-align:left;line-height:1.15;box-shadow:0 2px 7px rgba(16,33,63,.05)}
    .zx_tr_more_grid button:active{transform:scale(.98);background:#edf5ff!important}
    .zx_tr_action_icon{font-size:21px;line-height:1;flex:0 0 auto}
    .zx_tr_whatsapp{background:#22c55e}
    .zx_tr_more{border:1px solid #dbe3ef;border-radius:18px;background:#f8fafc;overflow:hidden}
    .zx_tr_more summary{padding:14px;color:#334155;font-size:14px;font-weight:950;text-align:center;cursor:pointer}
    .zx_tr_more_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 12px 12px}
    .zx_tr_actions button,.zx_tr_ficha_actions button{border:0;border-radius:16px;padding:13px 8px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_tr_actions .green,.zx_tr_ficha_actions .green{background:#16a34a}
    .zx_tr_actions .blue,.zx_tr_ficha_actions .blue{background:#2563eb}
    .zx_tr_actions .purple,.zx_tr_ficha_actions .purple{background:#7c3aed}
    .zx_tr_actions .orange,.zx_tr_ficha_actions .orange{background:#f97316}
    .zx_tr_actions .gray,.zx_tr_ficha_actions .gray{background:#64748b}
    .zx_tr_actions .red,.zx_tr_ficha_actions .red{background:#dc2626}
    .zx_tr_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_tr_empty.mini{font-size:14px;padding:8px 0}
    .zx_tr_loading{color:#64748b;font-size:16px;font-weight:850;padding:14px 0}
    .zx_tr_error{color:#dc2626;font-weight:950;margin-top:10px}
    .zx_tr_form h3,.zx_tr_block h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_tr_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_tr_form input,.zx_tr_form select,.zx_tr_form textarea,#zx_modal_trabajo input,#zx_modal_trabajo select,#zx_modal_trabajo textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_tr_team_help{margin:0 0 10px;color:#64748b;font-size:13px;font-weight:800;line-height:1.4}
    .zx_tr_team_list{display:grid;gap:9px;max-height:290px;overflow:auto;padding:2px}
    .zx_tr_team_item{display:grid;grid-template-columns:auto auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;align-items:center;border:1px solid #dbe3ef;border-radius:16px;background:#f8fafc;padding:11px 12px;cursor:pointer}
    .zx_tr_team_item input{grid-row:1/3;width:22px!important;height:22px;margin:0;accent-color:#2563eb}
    .zx_tr_team_avatar{grid-row:1/3;font-size:24px}
    .zx_tr_team_name{color:#071330;font-size:15px;font-weight:950;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .zx_tr_team_item small{color:#64748b;font-size:11px;font-weight:850}
    .zx_tr_team_item.is-main{background:#eff6ff;border-color:#93c5fd}
    .zx_tr_team_item.is-main small{color:#1d4ed8}
    .zx_tr_team_empty{border:1px dashed #cbd5e1;border-radius:16px;padding:16px;color:#64748b;font-weight:850;text-align:center}
    .zx_tr_grid2{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_tr_block{margin-top:16px;background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px}
    .zx_tr_materials_block{display:block;width:100%;text-align:left;font:inherit;cursor:pointer}.zx_tr_materials_block:active{transform:scale(.99)}
    .zx_tr_block_title{display:flex;align-items:center;justify-content:space-between;gap:12px}.zx_tr_block_title h3{margin:0}.zx_tr_block_title span{color:#2563eb;font-size:13px;font-weight:950}
    .zx_tr_materials_more{margin-top:9px;color:#64748b;font-size:13px;font-weight:900;text-align:right}
    .zx_tr_materials_header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.zx_tr_materials_header h2{margin:0}.zx_tr_materials_header p{margin:5px 0 0;color:#64748b;font-weight:800}
    .zx_tr_add_material{border:0;border-radius:14px;background:#16a34a;color:white;padding:11px 13px;font-size:14px;font-weight:950;white-space:nowrap}
    #tr_material_list{display:grid;gap:10px;margin:16px 0}.zx_tr_material_item{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:13px}.zx_tr_material_info{display:grid;gap:4px}.zx_tr_material_info strong{color:#071330;font-size:17px;font-weight:950}.zx_tr_material_info span{color:#2563eb;font-size:14px;font-weight:900}.zx_tr_material_info small{color:#64748b;font-size:13px;font-weight:800;line-height:1.35}
    .zx_tr_material_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.zx_tr_material_actions button{border:0;border-radius:13px;padding:10px;font-size:13px;font-weight:950}.zx_tr_material_actions .blue{background:#dbeafe;color:#1d4ed8}.zx_tr_material_actions .red{background:#fee2e2;color:#b91c1c}.zx_tr_empty_card{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:18px;padding:22px;text-align:center;color:#64748b;font-weight:900}
    .zx_tr_history_block{padding:16px}
    .zx_tr_history_list{display:grid;gap:10px;margin-top:12px}
    .zx_tr_history_item{display:grid;grid-template-columns:46px minmax(0,1fr);gap:11px;align-items:start;background:#fff;border:1px solid #e2e8f0;border-left:5px solid #64748b;border-radius:17px;padding:12px;box-shadow:0 2px 8px rgba(15,23,42,.035)}
    .zx_tr_history_icon{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:20px}
    .zx_tr_history_content{min-width:0}
    .zx_tr_history_head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    .zx_tr_history_head strong{color:#071330;font-size:15px;font-weight:950;line-height:1.2}
    .zx_tr_history_head time{color:#64748b;font-size:11px;font-weight:850;white-space:nowrap}
    .zx_tr_history_content p{margin:7px 0 8px;color:#334155;font-size:14px;font-weight:800;line-height:1.4;word-break:break-word}
    .zx_tr_history_user{display:flex;align-items:center;gap:5px;color:#64748b;font-size:12px;font-weight:900}
    .zx_tr_history_item.archivo{border-left-color:#2563eb}.zx_tr_history_item.archivo .zx_tr_history_icon{background:#dbeafe}
    .zx_tr_history_item.material{border-left-color:#7c3aed}.zx_tr_history_item.material .zx_tr_history_icon{background:#ede9fe}
    .zx_tr_history_item.estado{border-left-color:#f97316}.zx_tr_history_item.estado .zx_tr_history_icon{background:#ffedd5}
    .zx_tr_history_item.planificacion{border-left-color:#0891b2}.zx_tr_history_item.planificacion .zx_tr_history_icon{background:#cffafe}
    .zx_tr_history_item.nota{border-left-color:#ca8a04}.zx_tr_history_item.nota .zx_tr_history_icon{background:#fef9c3}
    .zx_tr_history_item.inicio{border-left-color:#16a34a}.zx_tr_history_item.inicio .zx_tr_history_icon{background:#dcfce7}
    .zx_tr_history_item.fin{border-left-color:#15803d}.zx_tr_history_item.fin .zx_tr_history_icon{background:#dcfce7}
    .zx_tr_history_item.equipo{border-left-color:#4f46e5}.zx_tr_history_item.equipo .zx_tr_history_icon{background:#e0e7ff}
    .zx_tr_history_item.eliminar{border-left-color:#dc2626}.zx_tr_history_item.eliminar .zx_tr_history_icon{background:#fee2e2}
    .zx_tr_history_item.edicion{border-left-color:#0f766e}.zx_tr_history_item.edicion .zx_tr_history_icon{background:#ccfbf1}
    .zx_tr_line{background:white;border:1px solid #e6edf5;border-radius:14px;padding:10px;margin-top:8px;color:#071330;font-size:14px;font-weight:850}
    .zx_tr_file{display:block;background:white;border:1px solid #e6edf5;border-radius:14px;padding:11px;margin-top:8px;color:#2563eb;font-size:14px;font-weight:950;text-decoration:none}
    .zx_tr_notice{background:#f8fafc;border:1px solid #dbe3ef;border-left:7px solid #64748b;border-radius:18px;padding:14px;color:#334155;font-size:15px;font-weight:900;line-height:1.35}
    .zx_tr_notice.danger{border-left-color:#dc2626;background:#fef2f2;color:#991b1b}

    .zx_tr_autocomplete_wrap{position:relative}.zx_tr_autocomplete_list{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:30;max-height:280px;overflow:auto;background:#fff;border:1px solid #b9d2f3;border-radius:16px;padding:6px;box-shadow:0 14px 30px rgba(15,35,72,.18)}.zx_tr_autocomplete_list button{display:grid;width:100%;gap:3px;text-align:left;border:0;border-bottom:1px solid #eef2f7;background:#fff;padding:11px;border-radius:11px}.zx_tr_autocomplete_list button:active{background:#eff6ff}.zx_tr_autocomplete_list strong{color:#071330;font-size:15px}.zx_tr_autocomplete_list small{color:#64748b;font-size:12px;font-weight:800}.zx_tr_material_extra{margin-top:12px;border:1px solid #dbe3ef;border-radius:16px;padding:10px 12px;background:#fff}.zx_tr_material_extra summary{color:#334155;font-weight:950;cursor:pointer}.zx_tr_smart_block{border-color:#c4b5fd;background:#faf5ff}.zx_tr_smart_help{color:#64748b;font-size:13px;font-weight:800;line-height:1.4}.zx_tr_smart_list{display:grid;gap:8px;margin:12px 0}.zx_tr_smart_item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;background:#fff;border:1px solid #ddd6fe;border-radius:14px;padding:11px}.zx_tr_smart_item input{width:22px!important;height:22px;accent-color:#7c3aed}.zx_tr_smart_item span{display:grid;gap:3px;min-width:0}.zx_tr_smart_item strong{color:#071330;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_tr_smart_item small{color:#64748b;font-size:11px;font-weight:800}.zx_tr_notes_block{background:#fffbeb;border-color:#fde68a}.zx_tr_note_visible{background:#fff;border:1px solid #fde68a;border-radius:14px;padding:11px;margin-top:9px}.zx_tr_note_visible p{margin:0;color:#334155;font-size:14px;font-weight:800;line-height:1.4;white-space:pre-wrap}.zx_tr_note_visible small{display:block;margin-top:7px;color:#92400e;font-size:11px;font-weight:850}
    /* Ficha responsive: evita cualquier desbordamiento horizontal en móvil */
    #zx_modal_trabajo,
    #zx_modal_trabajo *{box-sizing:border-box;min-width:0}
    #zx_modal_trabajo{overflow-x:hidden;padding:max(8px,env(safe-area-inset-left)) max(8px,env(safe-area-inset-right))}
    #zx_modal_trabajo .zx_modal_caja{width:min(100%,620px);max-width:620px;overflow-x:hidden;overscroll-behavior-x:none}
    #zx_modal_trabajo .zx_tr_operativo,
    #zx_modal_trabajo .zx_tr_status_card,
    #zx_modal_trabajo .zx_tr_contact_card,
    #zx_modal_trabajo .zx_tr_block,
    #zx_modal_trabajo .zx_tr_more,
    #zx_modal_trabajo .zx_tr_main_action{width:100%;max-width:100%}
    #zx_modal_trabajo .zx_tr_contact_title,
    #zx_modal_trabajo .zx_tr_contact_line span,
    #zx_modal_trabajo .zx_tr_description,
    #zx_modal_trabajo .zx_tr_line,
    #zx_modal_trabajo .zx_tr_note_visible p{overflow-wrap:anywhere;word-break:break-word;white-space:normal}
    #zx_modal_trabajo .zx_tr_status_grid>div,
    #zx_modal_trabajo .zx_tr_status_grid>button{min-width:0}
    #zx_modal_trabajo .zx_tr_status_grid b{min-width:0;max-width:100%}
    #zx_modal_trabajo button{max-width:100%}

    @media(max-width:520px){
      #zx_modal_trabajo{align-items:stretch;padding:0}
      #zx_modal_trabajo .zx_modal_caja{width:100%;max-width:none;max-height:100dvh;height:100dvh;border-radius:0;padding:calc(16px + env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom));}
      #zx_modal_trabajo .zx_modal_caja>h2{font-size:25px;line-height:1.12;overflow-wrap:anywhere}
      #zx_modal_trabajo .zx_tr_status_top{flex-direction:column;align-items:stretch}
      #zx_modal_trabajo .zx_tr_badges{margin-top:2px}
      #zx_modal_trabajo .zx_tr_status_grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #zx_modal_trabajo .zx_tr_status_grid>div,
      #zx_modal_trabajo .zx_tr_status_grid>button{padding:9px 8px;column-gap:7px}
      #zx_modal_trabajo .zx_tr_status_grid b{font-size:13px;white-space:normal;overflow-wrap:anywhere;line-height:1.15}
      #zx_modal_trabajo .zx_tr_main_action{padding:16px 12px;font-size:18px;line-height:1.15;white-space:normal}
      #zx_modal_trabajo .zx_tr_quick_actions,
      #zx_modal_trabajo .zx_tr_more_grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #zx_modal_trabajo .zx_tr_quick_actions .zx_tr_quick_btn,
      #zx_modal_trabajo .zx_tr_more_grid button{padding:10px 9px;gap:7px;font-size:12.5px;white-space:normal;overflow-wrap:anywhere}
      #zx_modal_trabajo .zx_tr_quick_icon{font-size:21px}
      #zx_modal_trabajo .zx_tr_block_title{align-items:flex-start;flex-wrap:wrap}
      #zx_modal_trabajo .zx_tr_history_head{flex-direction:column;gap:3px}
      #zx_modal_trabajo .zx_tr_history_head time{white-space:normal}
      #zx_modal_trabajo .zx_tr_smart_item strong{white-space:normal;overflow-wrap:anywhere}
    }
    @media(max-width:360px){
      #zx_modal_trabajo .zx_modal_caja{padding-left:10px;padding-right:10px}
      #zx_modal_trabajo .zx_tr_status_grid{grid-template-columns:1fr}
      #zx_modal_trabajo .zx_tr_quick_actions,
      #zx_modal_trabajo .zx_tr_more_grid{grid-template-columns:1fr}
    }

    @media(max-width:390px){.zx_tr_panel{padding:15px;border-radius:22px}.zx_tr_header h2{font-size:27px}.zx_tr_actions,.zx_tr_ficha_actions{grid-template-columns:1fr}.zx_tr_kpis{grid-template-columns:1fr 1fr}.zx_tr_top h3{font-size:19px}}
    @media(min-width:700px){.zx_tr_shell{padding-bottom:32px}.zx_tr_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_tr_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_tr_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_tr_info.ficha{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_tr_panel{padding:22px}.zx_tr_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

window.ZX_trabajos=async function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("trabajos");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="trabajos") b.classList.add("zx_activo");
    });
  }

  if(!puedeEntrar()){
    app().innerHTML=`
      <div class="zx_tr_panel">
        <h2>Trabajos</h2>
        <div class="zx_text">No tienes permiso para acceder a Trabajos.</div>
      </div>
    `;
    return;
  }

  ZX_TR_CACHE=leerCache().map(prepararTrabajo);
  pintarShell(filtrarTrabajos());

  setTimeout(async function(){
    const lista=await cargarTrabajos();
    pintarShell(lista);

    if(modoTrabajoUnico() && lista.length===1){
      const id=lista[0].id;
      const accion=accionTrabajoDirecta();
      setTimeout(function(){
        if(accion==="editar"){
          cargarTrabajo(id).then(function(t){if(t) abrirFormulario(t)});
          return;
        }
        if(accion==="eliminar"){
          gestionarTrabajo(id);
          return;
        }
        abrirFicha(id);
      },120);
    }
  },20);
};

window.ZX_abrirTrabajos=window.ZX_trabajos;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("trabajos",{
    nombre:"Trabajos",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX trabajos.js V"+ZX_VERSION+" cargado");

})();
