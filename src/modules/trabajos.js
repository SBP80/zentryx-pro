// ===============================
// ZENTRYX PRO - TRABAJOS
// V3195 - PARTE A PANTALLA COMPLETA Y FIRMA DENTRO DEL PARTE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3195";
const TABLA="trabajos";
const CACHE_KEY="zentryx_cache_trabajos";
const MATERIAL_LIBRARY_KEY="zentryx_material_library_v1";
const SUGGESTION_MIN_SCORE=2;

let ZX_TR_CACHE=[];
let ZX_TR_BUSQUEDA="";
let ZX_TR_FILTRO="todos";
let ZX_TR_FECHA_DESDE="";
let ZX_TR_FECHA_HASTA="";
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

function claveMaterial(v){
  return normalizar(v)
    .replace(/½/g,"1/2")
    .replace(/¼/g,"1/4")
    .replace(/¾/g,"3/4")
    .replace(/[^a-z0-9]+/g,"")
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
function idEventoAgendaSeleccionado(){return String(window.ZX_AGENDA_EVENTO_ID || "").trim()}
function fechaAgendaSeleccionada(){return String(window.ZX_AGENDA_EVENTO_FECHA || "").slice(0,10)}
function limpiarContextoAgendaTrabajo(){
  window.ZX_AGENDA_EVENTO_ID="";
  window.ZX_AGENDA_EVENTO_FECHA="";
}
function salirTrabajoUnico(){
  window.ZX_TRABAJO_ABRIR_ID="";
  window.ZX_TRABAJO_ACCION_DIRECTA="";
  limpiarContextoAgendaTrabajo();
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

function telefonoLimpio(tel){
  let n=String(tel || "").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

let ZX_TR_EXEC_TIMER=null;
let ZX_TR_LIVE_CHANNEL=null;
let ZX_TR_LIVE_POLL=null;
let ZX_TR_LIVE_REFRESH=null;
let ZX_TR_LIVE_SIGNATURE="";
let ZX_TR_LIVE_ID="";

function detenerMonitorTrabajo(){
  if(ZX_TR_LIVE_POLL){
    clearInterval(ZX_TR_LIVE_POLL);
    ZX_TR_LIVE_POLL=null;
  }
  if(ZX_TR_LIVE_REFRESH){
    clearTimeout(ZX_TR_LIVE_REFRESH);
    ZX_TR_LIVE_REFRESH=null;
  }
  if(ZX_TR_LIVE_CHANNEL && sb()){
    try{sb().removeChannel(ZX_TR_LIVE_CHANNEL)}catch(e){}
  }
  ZX_TR_LIVE_CHANNEL=null;
  ZX_TR_LIVE_SIGNATURE="";
  ZX_TR_LIVE_ID="";
}

function detenerTemporizadorEjecucion(){
  if(ZX_TR_EXEC_TIMER){
    clearInterval(ZX_TR_EXEC_TIMER);
    ZX_TR_EXEC_TIMER=null;
  }
}

function cerrarModal(){
  detenerTemporizadorEjecucion();
  detenerMonitorTrabajo();
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
    item={nombre:nombre,unidad:material.unidad || "ud",referencia:material.referencia || "",proveedor:material.proveedor || "",fabricante:material.fabricante || "",alias:material.alias || "",iva:material.iva ?? "",precio_compra:material.precio_compra ?? "",precio_venta:material.precio_venta ?? "",usos:0,favorito:false,ultimo_uso:new Date().toISOString(),actualizado:new Date().toISOString()};
    lista.push(item);
  }
  item.nombre=nombre;
  item.unidad=material.unidad || item.unidad || "ud";
  for(const campo of ["referencia","proveedor","fabricante","alias","iva","precio_compra","precio_venta"]){
    if(material[campo]!==undefined && material[campo]!==null && String(material[campo]).trim()!=="") item[campo]=material[campo];
  }
  item.usos=Number(item.usos || 0)+1;
  item.ultimo_uso=new Date().toISOString();
  item.actualizado=new Date().toISOString();
  lista.sort((a,b)=>Number(Boolean(b.favorito))-Number(Boolean(a.favorito)) || Number(b.usos||0)-Number(a.usos||0) || String(b.ultimo_uso||"").localeCompare(String(a.ultimo_uso||"")) || String(a.nombre).localeCompare(String(b.nombre),"es"));
  guardarBibliotecaMaterialesLocal(lista);
}

async function cargarBibliotecaMateriales(){
  const mapa=new Map();
  const agregar=function(x){
    const nombre=String((x && (x.nombre || x.material)) || "").trim();
    if(!nombre) return;
    const k=normalizar(nombre);
    const previo=mapa.get(k) || {nombre:nombre,unidad:x.unidad || "ud",referencia:x.referencia || "",proveedor:x.proveedor || "",fabricante:x.fabricante || "",alias:x.alias || "",iva:x.iva ?? "",precio_compra:x.precio_compra ?? "",precio_venta:x.precio_venta ?? "",usos:0,favorito:Boolean(x.favorito),ultimo_uso:x.ultimo_uso || x.actualizado || x.created_at || ""};
    previo.usos=Number(previo.usos||0)+Number(x.usos||1);
    for(const c of ["unidad","referencia","proveedor","fabricante","alias","iva","precio_compra","precio_venta"]){if(x[c]!==undefined && x[c]!==null && String(x[c]).trim()!=="") previo[c]=x[c]}
    previo.favorito=Boolean(previo.favorito || x.favorito);
    if(String(x.ultimo_uso || x.actualizado || x.created_at || "")>String(previo.ultimo_uso || "")) previo.ultimo_uso=x.ultimo_uso || x.actualizado || x.created_at || "";
    mapa.set(k,previo);
  };
  leerBibliotecaMaterialesLocal().forEach(agregar);
  if(navigator.onLine && sb()){
    try{
      const r=await sb().from("trabajos_materiales").select("*").order("created_at",{ascending:false}).limit(800);
      if(!r.error) (r.data || []).forEach(agregar);
    }catch(e){}
  }
  return Array.from(mapa.values()).sort((a,b)=>Number(Boolean(b.favorito))-Number(Boolean(a.favorito)) || Number(b.usos||0)-Number(a.usos||0) || String(b.ultimo_uso||"").localeCompare(String(a.ultimo_uso||"")) || String(a.nombre).localeCompare(String(b.nombre),"es"));
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


function categoriaDocumento(a){
  const texto=normalizar([
    a.nombre,a.filename,a.tipo,a.mime_type,a._origen_titulo,a._origen_descripcion
  ].filter(Boolean).join(" "));
  if(texto.includes("manual")) return {clave:"manual",nombre:"Manual",icono:"📘"};
  if(texto.includes("esquema") || texto.includes("electrico") || texto.includes("hidraulico")) return {clave:"esquema",nombre:"Esquema",icono:"🧩"};
  if(texto.includes("despiece") || texto.includes("repuesto")) return {clave:"despiece",nombre:"Despiece",icono:"⚙️"};
  if(texto.includes("ficha") || texto.includes("tecnica")) return {clave:"ficha",nombre:"Ficha técnica",icono:"📋"};
  if(texto.includes("certificado") || texto.includes("declaracion") || texto.includes(" ce ")) return {clave:"certificado",nombre:"Certificado",icono:"✅"};
  if(texto.includes("procedimiento") || texto.includes("checklist") || texto.includes("puesta en marcha")) return {clave:"procedimiento",nombre:"Procedimiento",icono:"🛠️"};
  if(String(a.tipo || a.mime_type || "").toLowerCase().startsWith("image/")) return {clave:"imagen",nombre:"Imagen",icono:"🖼️"};
  if(String(a.tipo || a.mime_type || "").toLowerCase().startsWith("video/")) return {clave:"video",nombre:"Vídeo",icono:"🎬"};
  return {clave:"otro",nombre:"Documento",icono:iconoArchivo(a)};
}

async function cargarBibliotecaDocumental(){
  if(!navigator.onLine || !sb()) return [];
  try{
    const [ra,rt]=await Promise.all([
      sb().from("trabajos_archivos").select("*").order("created_at",{ascending:false}).limit(1200),
      sb().from("trabajos").select("id,titulo,descripcion,notas,cliente").limit(1000)
    ]);
    if(ra.error) throw ra.error;
    const trabajos=new Map((rt.error ? [] : (rt.data || [])).map(t=>[String(t.id),t]));
    const vistos=new Set();
    const lista=[];
    for(const a of (ra.data || [])){
      const url=String(a.url || a.archivo_url || "");
      if(!url) continue;
      const nombre=String(a.nombre || a.filename || "Documento").trim();
      const clave=normalizar(nombre)+"|"+url;
      if(vistos.has(clave)) continue;
      vistos.add(clave);
      const origen=trabajos.get(String(a.trabajo_id)) || {};
      const categoria=categoriaDocumento({
        ...a,
        _origen_titulo:origen.titulo,
        _origen_descripcion:origen.descripcion
      });
      lista.push({
        ...a,
        nombre:nombre,
        url:url,
        _origen_titulo:origen.titulo || "Trabajo anterior",
        _origen_cliente:origen.cliente || "",
        _origen_descripcion:origen.descripcion || "",
        _origen_notas:origen.notas || "",
        _categoria:categoria,
        _buscar:normalizar([
          nombre,categoria.nombre,origen.titulo,origen.cliente,
          origen.descripcion,origen.notas,a.tipo,a.mime_type
        ].filter(Boolean).join(" "))
      });
    }
    return lista;
  }catch(e){
    alert("No se pudo cargar la biblioteca documental.\n\n"+mensajeError(e));
    return [];
  }
}

function tarjetaBibliotecaDocumento(a,trabajoId,yaAdjunto){
  const cat=a._categoria || categoriaDocumento(a);
  const fecha=fechaArchivoVisible(a);
  return `<article class="zx_doc_card" data-doc-search="${limpiar(a._buscar || "")}">
    <div class="zx_doc_preview">${miniaturaArchivo(a)}</div>
    <div class="zx_doc_content">
      <div class="zx_doc_top">
        <span class="zx_doc_category zx_doc_${limpiar(cat.clave)}">${cat.icono} ${limpiar(cat.nombre)}</span>
        ${fecha ? `<small>${limpiar(fecha)}</small>` : ""}
      </div>
      <strong>${limpiar(a.nombre || "Documento")}</strong>
      <span>${limpiar(a._origen_titulo || "Biblioteca")}</span>
      ${a._origen_cliente ? `<small>${limpiar(a._origen_cliente)}</small>` : ""}
      <div class="zx_doc_actions">
        <button type="button" class="zx_doc_open" data-doc-open="${limpiar(a.url)}">Ver</button>
        ${trabajoId ? `<button type="button" class="zx_doc_attach" data-doc-attach="${limpiar(a.id)}" ${yaAdjunto ? "disabled" : ""}>${yaAdjunto ? "Añadido" : "Añadir al trabajo"}</button>` : ""}
      </div>
    </div>
  </article>`;
}

async function abrirBibliotecaDocumental(trabajoId){
  modal(`
    <h2>Biblioteca documental</h2>
    <div class="zx_doc_search_wrap">
      <input id="zx_doc_search" type="search" placeholder="Buscar manual, marca, modelo, equipo, potencia...">
      <select id="zx_doc_category">
        <option value="">Todas las categorías</option>
        <option value="manual">Manuales</option>
        <option value="esquema">Esquemas</option>
        <option value="despiece">Despieces</option>
        <option value="ficha">Fichas técnicas</option>
        <option value="certificado">Certificados</option>
        <option value="procedimiento">Procedimientos</option>
        <option value="imagen">Imágenes</option>
        <option value="video">Vídeos</option>
        <option value="otro">Otros</option>
      </select>
    </div>
    <div id="zx_doc_results" class="zx_doc_results"><div class="zx_tr_loading">Cargando documentos...</div></div>
    <button type="button" class="zx_btn_big zx_gris" id="zx_doc_close">Cerrar</button>
  `);

  document.getElementById("zx_doc_close").onclick=function(){
    if(trabajoId) abrirFicha(trabajoId);
    else cerrarModal();
  };

  const [biblioteca,actuales]=await Promise.all([
    cargarBibliotecaDocumental(),
    trabajoId ? cargarArchivos(trabajoId) : Promise.resolve([])
  ]);
  const actualesSet=new Set((actuales || []).map(a=>normalizar(a.nombre || a.filename || "")+"|"+String(a.url || a.archivo_url || "")));
  const box=document.getElementById("zx_doc_results");
  const input=document.getElementById("zx_doc_search");
  const select=document.getElementById("zx_doc_category");

  function pintar(){
    const q=normalizar(input.value || "");
    const categoria=select.value || "";
    const filtrados=biblioteca.filter(a=>{
      if(categoria && (!a._categoria || a._categoria.clave!==categoria)) return false;
      if(q && !String(a._buscar || "").includes(q)) return false;
      return true;
    });
    box.innerHTML=filtrados.length
      ? filtrados.map(a=>tarjetaBibliotecaDocumento(
          a,trabajoId,
          actualesSet.has(normalizar(a.nombre || "")+"|"+String(a.url || ""))
        )).join("")
      : `<div class="zx_tr_empty">No se encontraron documentos.</div>`;

    box.querySelectorAll("[data-doc-open]").forEach(btn=>{
      btn.onclick=function(){window.open(btn.dataset.docOpen,"_blank","noopener")};
    });
    box.querySelectorAll("[data-doc-attach]").forEach(btn=>{
      btn.onclick=async function(){
        const a=biblioteca.find(x=>String(x.id)===String(btn.dataset.docAttach));
        if(!a || !trabajoId) return;
        btn.disabled=true;
        btn.textContent="Añadiendo...";
        const r=await insertarArchivoCompatible({
          trabajo_id:String(trabajoId),
          nombre:a.nombre || "Documento",
          url:a.url || "",
          tipo:a.tipo || a.mime_type || "",
          tamano:a.tamano || a.size || 0
        });
        if(r && r.error){
          btn.disabled=false;
          btn.textContent="Añadir al trabajo";
          alert("No se pudo añadir el documento.\n\n"+mensajeError(r.error));
          return;
        }
        actualesSet.add(normalizar(a.nombre || "")+"|"+String(a.url || ""));
        await registrarHistorial(
          trabajoId,"archivo",
          "Documento añadido desde la biblioteca: "+(a.nombre || "Documento"),
          {origen_archivo_id:a.id,origen_trabajo_id:a.trabajo_id}
        );
        btn.textContent="Añadido";
      };
    });
  }

  input.oninput=pintar;
  select.onchange=pintar;
  pintar();
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

async function cargarSugerenciasMaterialesTrabajo(t,materialesActuales){
  if(!navigator.onLine || !sb()) return [];
  const palabras=palabrasClaveTrabajo(t);
  if(!palabras.length) return [];
  try{
    const [rm,rt]=await Promise.all([
      sb().from("trabajos_materiales").select("*").order("created_at",{ascending:false}).limit(1000),
      sb().from("trabajos").select("id,titulo,descripcion,notas").limit(600)
    ]);
    if(rm.error) return [];
    const trabajos=new Map((rt.error ? [] : (rt.data || [])).map(x=>[String(x.id),x]));
    const actuales=new Set((materialesActuales || []).map(m=>normalizar(m.nombre || m.material || "")));
    const agrupados=new Map();
    for(const m of (rm.data || [])){
      if(String(m.trabajo_id)===String(t.id)) continue;
      const nombre=String(m.nombre || m.material || "").trim();
      if(!nombre || actuales.has(normalizar(nombre))) continue;
      const origen=trabajos.get(String(m.trabajo_id)) || {};
      const score=scoreCoincidencia([origen.titulo,origen.descripcion,origen.notas,nombre,m.referencia,m.proveedor].filter(Boolean).join(" "),palabras);
      if(score<SUGGESTION_MIN_SCORE) continue;
      const k=normalizar(nombre);
      const previo=agrupados.get(k) || {
        nombre,
        unidad:m.unidad || "ud",
        referencia:m.referencia || "",
        proveedor:m.proveedor || "",
        precio_compra:m.precio_compra ?? null,
        precio_venta:m.precio_venta ?? null,
        cantidad:m.cantidad || 1,
        _score:0,
        _usos:0,
        _origen:origen.titulo || "Trabajo similar"
      };
      previo._score=Math.max(previo._score,score);
      previo._usos+=1;
      if(!previo.referencia && m.referencia) previo.referencia=m.referencia;
      if(!previo.proveedor && m.proveedor) previo.proveedor=m.proveedor;
      agrupados.set(k,previo);
    }
    return Array.from(agrupados.values())
      .sort((a,b)=>b._score-a._score || b._usos-a._usos || a.nombre.localeCompare(b.nombre,"es"))
      .slice(0,12);
  }catch(e){return []}
}

function renderSugerenciasMateriales(lista){
  if(!lista || !lista.length) return "";
  return `<section class="zx_tr_block zx_tr_smart_materials">
    <div class="zx_tr_block_title"><h3>📦 Materiales sugeridos</h3><span>${lista.length}</span></div>
    <p class="zx_tr_smart_help">Basados en trabajos similares. Selecciona únicamente los que vayas a utilizar.</p>
    <div class="zx_tr_smart_list">${lista.map((m,i)=>`<label class="zx_tr_smart_item"><input type="checkbox" data-smart-material="${i}"><span><strong>${limpiar(m.nombre)}</strong><small>${limpiar([m.unidad,m.referencia,m.proveedor].filter(Boolean).join(" · "))}${m._usos ? ` · usado en ${m._usos} trabajo(s)` : ""}</small></span></label>`).join("")}</div>
    <button type="button" class="zx_btn_big zx_verde" id="tr_smart_material_attach">Añadir materiales seleccionados</button>
  </section>`;
}

async function adjuntarSugerenciasMateriales(trabajoId,sugerencias){
  const checks=Array.from(document.querySelectorAll("[data-smart-material]:checked"));
  if(!checks.length){alert("Selecciona al menos un material.");return}
  const boton=document.getElementById("tr_smart_material_attach");
  if(boton){boton.disabled=true;boton.textContent="Añadiendo..."}
  let añadidos=0;
  try{
    const existentes=await cargarMateriales(trabajoId);
    const nombres=new Set((existentes || []).map(m=>normalizar(m.nombre || m.material || "")));
    for(const c of checks){
      const m=sugerencias[Number(c.dataset.smartMaterial)];
      if(!m || nombres.has(normalizar(m.nombre))) continue;
      const data={
        id:idLocal(),trabajo_id:String(trabajoId),nombre:m.nombre,material:m.nombre,
        cantidad:Number(m.cantidad || 1),unidad:m.unidad || "ud",notas:"",
        referencia:m.referencia || "",proveedor:m.proveedor || "",
        precio_compra:m.precio_compra ?? null,precio_venta:m.precio_venta ?? null,
        preparado:false,created_at:new Date().toISOString()
      };
      const r=await insertarMaterialCompatible(data);
      if(!r || !r.error){
        añadidos++;nombres.add(normalizar(m.nombre));aprenderMaterial(data);
        await registrarHistorial(trabajoId,"material","Material sugerido añadido: "+m.nombre,{origen:"sugerencia_inteligente"});
      }
    }
    alert(añadidos ? `${añadidos} material(es) añadido(s) al trabajo.` : "No se añadió ningún material nuevo.");
    await abrirFicha(trabajoId);
  }catch(e){alert("No se pudieron añadir los materiales.\n\n"+mensajeError(e))}
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


function estadoCanonico(v){
  const n=normalizar(v).replace(/\s+/g,"_");
  if(["terminado","terminada","finalizado","finalizada","completado","completada"].includes(n)) return "terminado";
  if(["en_curso","curso","iniciado","iniciada","trabajando"].includes(n)) return "en_curso";
  if(["cancelado","cancelada","anulado","anulada"].includes(n)) return "cancelado";
  if(["bloqueado","bloqueada"].includes(n)) return "bloqueado";
  return "pendiente";
}

function estaArchivado(t){
  return t && (t.archivado===true || String(t.archivado).toLowerCase()==="true");
}

function fechaTrabajoISO(t){
  const f=String((t && (t.fecha || t.fecha_inicio || t.created_at)) || "").slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : "";
}

function coincideFiltro(t,filtro){
  const est=estadoCanonico(t.estado);
  const arch=estaArchivado(t);
  if(filtro==="todos") return true;
  if(filtro==="activos") return !arch && est!=="terminado" && est!=="cancelado";
  if(filtro==="archivados") return arch;
  if(filtro==="pendientes") return !arch && est==="pendiente";
  if(filtro==="curso") return !arch && est==="en_curso";
  if(filtro==="terminados") return !arch && est==="terminado";
  if(filtro==="urgentes") return !arch && normalizar(t.prioridad)==="urgente";
  return true;
}

function contarFiltros(){
  const base=ZX_TR_CACHE || [];
  return {
    todos:base.length,
    activos:base.filter(t=>coincideFiltro(t,"activos")).length,
    pendientes:base.filter(t=>coincideFiltro(t,"pendientes")).length,
    curso:base.filter(t=>coincideFiltro(t,"curso")).length,
    terminados:base.filter(t=>coincideFiltro(t,"terminados")).length,
    urgentes:base.filter(t=>coincideFiltro(t,"urgentes")).length,
    archivados:base.filter(t=>coincideFiltro(t,"archivados")).length
  };
}

function filtrarTrabajos(){
  let lista=[...(ZX_TR_CACHE || [])];

  const unico=idTrabajoUnico();
  if(unico){
    return lista.filter(t=>String(t.id)===String(unico));
  }

  lista=lista.filter(t=>coincideFiltro(t,ZX_TR_FILTRO));

  if(ZX_TR_FECHA_DESDE){
    lista=lista.filter(t=>{
      const f=fechaTrabajoISO(t);
      return f && f>=ZX_TR_FECHA_DESDE;
    });
  }

  if(ZX_TR_FECHA_HASTA){
    lista=lista.filter(t=>{
      const f=fechaTrabajoISO(t);
      return f && f<=ZX_TR_FECHA_HASTA;
    });
  }

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


async function cargarJornadasParaListado(trabajos){
  const lista=Array.isArray(trabajos) ? trabajos : [];
  lista.forEach(t=>{t.__zx_jornadas=[]});
  if(!lista.length || !navigator.onLine || !sb()) return lista;

  try{
    const ids=new Set(lista.map(t=>String(t.id)));
    const r=await sb().from("agenda_eventos")
      .select("id,origen_id,fecha_inicio,fecha_fin,hora_inicio,hora_fin,estado")
      .eq("origen","trabajos")
      .order("fecha_inicio",{ascending:true})
      .order("hora_inicio",{ascending:true})
      .limit(3000);

    if(r.error) throw r.error;

    const grupos=new Map();
    (r.data || []).forEach(function(e){
      const id=String(e.origen_id || "");
      if(!ids.has(id)) return;
      if(!grupos.has(id)) grupos.set(id,[]);
      grupos.get(id).push(e);
    });

    lista.forEach(function(t){
      t.__zx_jornadas=grupos.get(String(t.id)) || [];
    });
  }catch(e){
    console.warn("No se pudieron cargar las jornadas del listado:",e);
  }
  return lista;
}

function renderJornadasTarjeta(t){
  const jornadas=Array.isArray(t.__zx_jornadas) ? t.__zx_jornadas : [];
  if(!jornadas.length){
    return t.fecha ? `<p><b>Primera jornada</b><span>${limpiar(fechaES(t.fecha))}${t.hora_inicio ? " · "+limpiar(String(t.hora_inicio).slice(0,5)) : ""}</span></p>` : "";
  }

  const lineas=jornadas.map(function(j,index){
    const inicio=String(j.hora_inicio || "").slice(0,5);
    const fin=String(j.hora_fin || "").slice(0,5);
    const horario=[inicio,fin].filter(Boolean).join("–");
    return `<div class="zx_tr_card_jornada ${index>=3 ? "zx_tr_card_jornada_extra" : ""}">
      <span>${limpiar(fechaES(j.fecha_inicio))}${horario ? " · "+limpiar(horario) : ""}</span>
      <b class="zx_tr_jornada_estado zx_tr_jornada_${limpiar(String(j.estado || "activo"))}">${limpiar(estadoJornadaTexto(j.estado))}</b>
    </div>`;
  }).join("");

  return `<div class="zx_tr_card_plan">
    <div class="zx_tr_card_plan_title">
      <b>Planificación</b>
      <span>${jornadas.length} jornada${jornadas.length===1 ? "" : "s"}</span>
    </div>
    ${lineas}
    ${jornadas.length>3 ? `<small class="zx_tr_card_more">En móvil se muestran 3; abre el trabajo para ver todas.</small>` : ""}
  </div>`;
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
    await cargarJornadasParaListado(ZX_TR_CACHE);
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
  const counts=contarFiltros();
  const filtros=[
    ["todos","Todos"],
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
        <input id="zx_buscar_trabajos" type="search" value="${limpiar(ZX_TR_BUSQUEDA)}" placeholder="Buscar título, cliente, dirección, teléfono, técnico, estado o notas">
        ${ZX_TR_BUSQUEDA ? `<button id="zx_limpiar_trabajos" type="button">✕</button>` : ""}
      </div>

      <div class="zx_tr_date_filters">
        <div class="zx_tr_date_range">
          <label>Desde<input id="zx_tr_fecha_desde" type="date" value="${limpiar(ZX_TR_FECHA_DESDE)}"></label>
          <label>Hasta<input id="zx_tr_fecha_hasta" type="date" value="${limpiar(ZX_TR_FECHA_HASTA)}"></label>
        </div>
        <div class="zx_tr_date_quick">
          <button type="button" id="zx_tr_hoy">Hoy</button>
          <button type="button" id="zx_tr_semana">Semana</button>
          <button type="button" id="zx_tr_limpiar_fechas">Limpiar</button>
        </div>
      </div>

      <div class="zx_tr_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_TR_FILTRO===f[0] ? "on" : ""}" data-tr-filter="${limpiar(f[0])}">${limpiar(f[1])} <b>${counts[f[0]]}</b></button>`;
        }).join("")}
      </div>

      <div class="zx_tr_toolbar_bottom">
        <div id="zx_tr_resume" class="zx_tr_resume">${total} resultado(s)</div>
      </div>
      ${!modoTrabajoUnico() ? `<div class="zx_tr_toolbar_tools">
        <button type="button" class="zx_tr_library_btn" id="zx_tr_library">📚 Biblioteca documental</button>
        <button type="button" class="zx_tr_monitor_btn" id="zx_tr_monitor">🖥️ Monitor de oficina</button>
      </div>` : ""}
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
        ${renderJornadasTarjeta(t)}
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
  const resume=document.getElementById("zx_tr_resume");
  const head=document.querySelector(".zx_tr_list_head span");

  if(box) box.innerHTML=renderListado(lista);
  if(resume) resume.textContent=lista.length+" resultado(s)";
  if(head) head.textContent=lista.length+" trabajo(s)";

  const counts=contarFiltros();
  document.querySelectorAll("[data-tr-filter]").forEach(function(btn){
    const key=btn.dataset.trFilter || "todos";
    const b=btn.querySelector("b");
    if(b) b.textContent=counts[key] ?? 0;
    btn.classList.toggle("on",ZX_TR_FILTRO===key);
  });

  conectarEventos();
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

  const desde=document.getElementById("zx_tr_fecha_desde");
  const hasta=document.getElementById("zx_tr_fecha_hasta");
  if(desde) desde.onchange=function(){ZX_TR_FECHA_DESDE=desde.value || "";repintarLista()};
  if(hasta) hasta.onchange=function(){ZX_TR_FECHA_HASTA=hasta.value || "";repintarLista()};

  const hoyBtn=document.getElementById("zx_tr_hoy");
  if(hoyBtn) hoyBtn.onclick=function(){
    ZX_TR_FECHA_DESDE=hoy();
    ZX_TR_FECHA_HASTA=hoy();
    pintarShell(filtrarTrabajos());
  };

  const semanaBtn=document.getElementById("zx_tr_semana");
  if(semanaBtn) semanaBtn.onclick=function(){
    const d=new Date();
    const dia=(d.getDay()+6)%7;
    const ini=new Date(d); ini.setDate(d.getDate()-dia);
    const fin=new Date(ini); fin.setDate(ini.getDate()+6);
    const iso=x=>x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
    ZX_TR_FECHA_DESDE=iso(ini);
    ZX_TR_FECHA_HASTA=iso(fin);
    pintarShell(filtrarTrabajos());
  };

  const limpiarFechas=document.getElementById("zx_tr_limpiar_fechas");
  if(limpiarFechas) limpiarFechas.onclick=function(){
    ZX_TR_FECHA_DESDE="";
    ZX_TR_FECHA_HASTA="";
    pintarShell(filtrarTrabajos());
  };

  const monitorBtn=document.getElementById("zx_tr_monitor");
  if(monitorBtn) monitorBtn.onclick=function(){
    if(typeof window.ZX_monitor_oficina==="function") window.ZX_monitor_oficina();
    else alert("El modo Monitor no está disponible.");
  };

  const libraryBtn=document.getElementById("zx_tr_library");
  if(libraryBtn) libraryBtn.onclick=function(){
    abrirBibliotecaDocumental("");
  };

  document.querySelectorAll("[data-tr-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_TR_FILTRO=btn.dataset.trFilter || "todos";
      document.querySelectorAll("[data-tr-filter]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      repintarLista();
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


function normalizarJornadasPlanificacion(jornadas){
  const vistas=new Set();
  return (jornadas || []).map(function(j){
    return {
      fecha:String(j.fecha || "").slice(0,10),
      hora_inicio:j.hora_inicio ? String(j.hora_inicio).slice(0,5) : "",
      hora_fin:j.hora_fin ? String(j.hora_fin).slice(0,5) : "",
      observaciones:String(j.observaciones || "").trim()
    };
  }).filter(function(j){
    if(!j.fecha) return false;
    const clave=[j.fecha,j.hora_inicio,j.hora_fin].join("|");
    if(vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  }).sort(function(a,b){
    return (a.fecha+" "+a.hora_inicio).localeCompare(b.fecha+" "+b.hora_inicio);
  });
}

function jornadasDesdePlanificacion(planificacion,t){
  const jornadas=[];
  const vistas=new Set();

  (planificacion || []).forEach(function(p){
    const fecha=String(p.fecha || "").slice(0,10);
    if(!fecha) return;
    const inicio=p.hora_inicio ? String(p.hora_inicio).slice(0,5) : "";
    const fin=p.hora_fin ? String(p.hora_fin).slice(0,5) : "";
    const clave=[fecha,inicio,fin].join("|");
    if(vistas.has(clave)) return;
    vistas.add(clave);
    jornadas.push({fecha:fecha,hora_inicio:inicio,hora_fin:fin,observaciones:""});
  });

  if(!jornadas.length){
    jornadas.push({
      fecha:String((t && t.fecha) || hoy()).slice(0,10),
      hora_inicio:t && t.hora_inicio ? String(t.hora_inicio).slice(0,5) : "",
      hora_fin:t && t.hora_fin ? String(t.hora_fin).slice(0,5) : "",
      observaciones:""
    });
  }
  return normalizarJornadasPlanificacion(jornadas);
}

function renderJornadaPlanificacion(j,index){
  return `<article class="zx_tr_plan_day" data-plan-day="${index}">
    <div class="zx_tr_plan_day_head">
      <strong>Día ${index+1}</strong>
      ${index>0 ? `<button type="button" class="zx_tr_plan_remove" data-plan-remove="${index}">Eliminar día</button>` : ""}
    </div>
    <div class="zx_tr_grid2">
      <label class="zx_tr_label">Fecha
        <input class="tr_plan_fecha" type="date" value="${limpiar(j.fecha || hoy())}">
      </label>
      <label class="zx_tr_label">Hora inicio
        <input class="tr_plan_inicio" type="time" value="${limpiar(j.hora_inicio || "")}">
      </label>
    </div>
    <div class="zx_tr_grid2">
      <label class="zx_tr_label">Hora fin
        <input class="tr_plan_fin" type="time" value="${limpiar(j.hora_fin || "")}">
      </label>
      <label class="zx_tr_label">Observación del día
        <input class="tr_plan_obs" type="text" value="${limpiar(j.observaciones || "")}" placeholder="Opcional">
      </label>
    </div>
  </article>`;
}

function leerJornadasFormulario(){
  return normalizarJornadasPlanificacion(
    Array.from(document.querySelectorAll("[data-plan-day]")).map(function(card){
      return {
        fecha:card.querySelector(".tr_plan_fecha")?.value || "",
        hora_inicio:card.querySelector(".tr_plan_inicio")?.value || "",
        hora_fin:card.querySelector(".tr_plan_fin")?.value || "",
        observaciones:card.querySelector(".tr_plan_obs")?.value || ""
      };
    })
  );
}

function activarEditorJornadas(jornadasIniciales){
  const box=document.getElementById("tr_plan_days");
  const add=document.getElementById("tr_plan_add");
  if(!box || !add) return;

  let jornadas=normalizarJornadasPlanificacion(jornadasIniciales);
  if(!jornadas.length) jornadas=[{fecha:hoy(),hora_inicio:"",hora_fin:"",observaciones:""}];

  function pintar(){
    box.innerHTML=jornadas.map(renderJornadaPlanificacion).join("");
    box.querySelectorAll("[data-plan-remove]").forEach(function(btn){
      btn.onclick=function(){
        const idx=Number(btn.dataset.planRemove);
        jornadas.splice(idx,1);
        pintar();
      };
    });
  }

  add.onclick=function(){
    const actuales=leerJornadasFormulario();
    jornadas=actuales.length ? actuales : jornadas;
    const ultima=jornadas[jornadas.length-1] || {fecha:hoy(),hora_inicio:"",hora_fin:""};
    let siguiente=ultima.fecha || hoy();
    try{
      const d=new Date(siguiente+"T12:00:00");
      d.setDate(d.getDate()+1);
      siguiente=d.toISOString().slice(0,10);
    }catch(e){}
    jornadas.push({
      fecha:siguiente,
      hora_inicio:ultima.hora_inicio || "",
      hora_fin:ultima.hora_fin || "",
      observaciones:""
    });
    pintar();
    setTimeout(function(){
      const cards=box.querySelectorAll("[data-plan-day]");
      const ultimo=cards[cards.length-1];
      if(ultimo) ultimo.scrollIntoView({behavior:"smooth",block:"center"});
    },20);
  };

  pintar();
}


async function guardarEquipoTrabajo(trabajoId,equipo,datos,jornadas){
  if(!trabajoId) return;

  const dias=normalizarJornadasPlanificacion(jornadas && jornadas.length ? jornadas : [{
    fecha:datos.fecha || hoy(),
    hora_inicio:datos.hora_inicio || "",
    hora_fin:datos.hora_fin || "",
    observaciones:""
  }]);

  const filas=[];
  dias.forEach(function(dia){
    (equipo || []).forEach(function(u){
      filas.push({
        id:idLocal(),
        trabajo_id:String(trabajoId),
        usuario_id:String(u.id),
        usuario:String(u.nombre || ""),
        fecha:dia.fecha || datos.fecha || hoy(),
        hora_inicio:dia.hora_inicio || null,
        hora_fin:dia.hora_fin || null
      });
    });
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
  const jornadasActuales=jornadasDesdePlanificacion(planificacion,t);

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

      <h3>Planificación</h3>
      <p class="zx_tr_help">El trabajo será único, pero puede aparecer en Agenda durante varios días.</p>
      <div id="tr_plan_days" class="zx_tr_plan_days"></div>
      <button type="button" class="zx_tr_plan_add" id="tr_plan_add">＋ Añadir otro día</button>

      <div>${input("tr_tel","Teléfono contacto",t.telefono_contacto,"tel")}</div>

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

  activarEditorJornadas(jornadasActuales);

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
  const jornadas=leerJornadasFormulario();

  if(!jornadas.length){
    alert("Añade al menos un día de planificación.");
    return;
  }

  for(const j of jornadas){
    if(j.hora_inicio && j.hora_fin && j.hora_fin<=j.hora_inicio){
      alert("La hora de fin debe ser posterior a la hora de inicio en "+fechaES(j.fecha)+".");
      return;
    }
  }

  const principal=jornadas[0];

  const data={
    titulo:titulo,
    estado:valor("tr_estado") || "pendiente",
    prioridad:valor("tr_prioridad") || "media",
    cliente_id:clienteId || null,
    cliente:cliente ? nombreCliente(cliente) : "",
    usuario_id:usuarioId || "",
    usuario:user ? (user.nombre || user.usuario || "") : "",
    fecha:principal.fecha || hoy(),
    hora_inicio:principal.hora_inicio || null,
    hora_fin:principal.hora_fin || null,
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

    await guardarEquipoTrabajo(trabajoId,equipo,data,jornadas);

    if(id){
      await registrarHistorial(
        trabajoId,
        "edicion",
        "Trabajo editado y equipo actualizado.",
        Object.assign({},data,{equipo:equipo,jornadas:jornadas})
      );
    }else{
      await registrarHistorial(
        trabajoId,
        "creacion",
        "Trabajo creado con equipo asignado.",
        Object.assign({},data,{equipo:equipo,jornadas:jornadas})
      );
    }

    // Tanto los trabajos nuevos como los editados deben aparecer inmediatamente en Agenda.
    await sincronizarAgenda(trabajoId,Object.assign({},data,{id:trabajoId,equipo:equipo,jornadas:jornadas}));

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


async function cargarJornadasAgendaTrabajo(trabajoId){
  if(!trabajoId || !navigator.onLine || !sb()) return [];
  try{
    const r=await sb().from("agenda_eventos")
      .select("*")
      .eq("origen","trabajos")
      .eq("origen_id",String(trabajoId))
      .order("fecha_inicio",{ascending:true})
      .order("hora_inicio",{ascending:true});
    if(r.error) throw r.error;
    return r.data || [];
  }catch(e){
    console.warn("No se pudieron cargar las jornadas de Agenda:",e);
    return [];
  }
}

function jornadaSeleccionadaAgenda(jornadas){
  const lista=Array.isArray(jornadas) ? jornadas : [];
  const id=idEventoAgendaSeleccionado();
  if(id){
    const porId=lista.find(x=>String(x.id)===id);
    if(porId) return porId;
  }
  const fecha=fechaAgendaSeleccionada();
  if(fecha){
    const porFecha=lista.find(x=>String(x.fecha_inicio || "").slice(0,10)===fecha);
    if(porFecha) return porFecha;
  }
  const hoyIso=hoy();
  return lista.find(x=>String(x.fecha_inicio || "").slice(0,10)===hoyIso && !["completado","cancelado"].includes(String(x.estado || "")))
    || lista.find(x=>!["completado","cancelado"].includes(String(x.estado || "")))
    || lista[0]
    || null;
}

function estadoJornadaTexto(estado){
  const e=String(estado || "activo");
  if(e==="en_curso") return "En curso";
  if(e==="completado") return "Realizada";
  if(e==="cancelado") return "Cancelada";
  return "Pendiente";
}

function accionPrincipalJornada(t,jornada,totalJornadas){
  if(!jornada) return accionPrincipalTrabajo(t);
  const estado=String(jornada.estado || "activo");
  const multi=Number(totalJornadas || 0)>1;

  if(estado==="en_curso"){
    return {
      clase:"zx_tr_finish",
      icono:"✅",
      texto:multi ? "Finalizar jornada" : "Finalizar trabajo",
      accion:"terminar_jornada"
    };
  }
  if(estado==="completado"){
    return {
      clase:"zx_tr_done",
      icono:"✓",
      texto:multi ? "Jornada realizada" : "Trabajo finalizado",
      accion:"ninguna"
    };
  }
  if(estado==="cancelado"){
    return {clase:"zx_tr_cancelled",icono:"⛔",texto:"Jornada cancelada",accion:"ninguna"};
  }
  return {
    clase:"zx_tr_start",
    icono:"▶",
    texto:multi ? "Iniciar jornada" : "Iniciar trabajo",
    accion:"iniciar_jornada"
  };
}

async function actualizarEstadoJornadaAgenda(eventoId,estado){
  if(!eventoId || !sb()) return {error:new Error("Jornada no localizada")};
  return await sb().from("agenda_eventos").update({estado:estado}).eq("id",String(eventoId));
}

async function recalcularEstadoGeneralTrabajo(id,t){
  const jornadas=await cargarJornadasAgendaTrabajo(id);
  const validas=jornadas.filter(j=>String(j.estado || "")!=="cancelado");
  const todasRealizadas=validas.length>0 && validas.every(j=>String(j.estado || "")==="completado");
  const algunaIniciada=validas.some(j=>["en_curso","completado"].includes(String(j.estado || "")));
  const nuevo=todasRealizadas ? "terminado" : (algunaIniciada ? "en_curso" : "pendiente");

  const r=await actualizarTrabajo(id,{estado:nuevo});
  if(r && r.error) throw r.error;
  return {estado:nuevo,jornadas:jornadas};
}


async function sincronizarAgenda(id,t){
  if(!id || !navigator.onLine || !sb()) return;

  try{
    const anteriores=await cargarJornadasAgendaTrabajo(id);
    const estadosAnteriores=new Map(
      anteriores.map(function(e){
        return [
          [
            String(e.fecha_inicio || "").slice(0,10),
            String(e.hora_inicio || "").slice(0,5),
            String(e.hora_fin || "").slice(0,5)
          ].join("|"),
          String(e.estado || "activo")
        ];
      })
    );

    await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));

    if(t.archivado===true || t.estado==="cancelado") return;

    const jornadas=normalizarJornadasPlanificacion(t.jornadas && t.jornadas.length ? t.jornadas : [{
      fecha:t.fecha || hoy(),
      hora_inicio:t.hora_inicio || "",
      hora_fin:t.hora_fin || "",
      observaciones:""
    }]);

    const eventos=jornadas.map(function(j){
      return {
        tipo:"trabajo",
        titulo:"Trabajo - "+(t.titulo || ""),
        descripcion:[t.descripcion || "",j.observaciones || ""].filter(Boolean).join("\n"),
        fecha_inicio:j.fecha || t.fecha || hoy(),
        fecha_fin:j.fecha || t.fecha || hoy(),
        hora_inicio:j.hora_inicio || null,
        hora_fin:j.hora_fin || null,
        cliente_id:String(t.cliente_id || ""),
        cliente:t.cliente || "",
        usuario_id:String(t.usuario_id || ""),
        usuario:t.usuario || "",
        direccion:t.direccion_obra || t.direccion || "",
        codigo_postal:t.codigo_postal || "",
        poblacion:t.poblacion || "",
        provincia:t.provincia || "",
        pais:t.pais || "España",
        estado:estadosAnteriores.get([
          String(j.fecha || t.fecha || hoy()).slice(0,10),
          String(j.hora_inicio || "").slice(0,5),
          String(j.hora_fin || "").slice(0,5)
        ].join("|")) || (t.estado==="terminado" ? "completado" : "activo"),
        prioridad:t.prioridad || "media",
        visible_para:"todos",
        origen:"trabajos",
        origen_id:String(id),
        creado_por:t.creado_por || ""
      };
    });

    if(eventos.length){
      const insertados=await sb().from("agenda_eventos").insert(eventos);
      if(insertados.error) throw insertados.error;
    }

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


function obtenerUbicacionTrabajo(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){
      resolve(null);
      return;
    }
    let terminado=false;
    const cerrar=function(valor){
      if(terminado) return;
      terminado=true;
      resolve(valor);
    };
    const timeout=setTimeout(function(){cerrar(null)},8000);
    navigator.geolocation.getCurrentPosition(
      function(pos){
        clearTimeout(timeout);
        cerrar({
          latitud:Number(pos.coords.latitude),
          longitud:Number(pos.coords.longitude),
          precision:Number(pos.coords.accuracy || 0)
        });
      },
      function(){
        clearTimeout(timeout);
        cerrar(null);
      },
      {enableHighAccuracy:true,timeout:7000,maximumAge:30000}
    );
  });
}


function claveInicioJornada(trabajoId,jornadaId){
  return "zx_tr_inicio_jornada_"+String(trabajoId || "")+"_"+String(jornadaId || "");
}

function guardarInicioJornadaLocal(trabajoId,jornadaId,fechaISO){
  try{
    localStorage.setItem(claveInicioJornada(trabajoId,jornadaId),String(fechaISO || new Date().toISOString()));
  }catch(e){}
}

function leerInicioJornadaLocal(trabajoId,jornadaId){
  try{
    const raw=localStorage.getItem(claveInicioJornada(trabajoId,jornadaId));
    if(!raw) return null;
    const d=new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }catch(e){
    return null;
  }
}

function borrarInicioJornadaLocal(trabajoId,jornadaId){
  try{localStorage.removeItem(claveInicioJornada(trabajoId,jornadaId))}catch(e){}
}

function datosHistorial(h){
  const d=h && h.datos;
  if(!d) return {};
  if(typeof d==="object") return d;
  try{return JSON.parse(d)}catch(e){return {}}
}

function inicioRealTrabajo(hist,jornadaId,trabajoId){
  const jid=String(jornadaId || "");

  const local=leerInicioJornadaLocal(trabajoId,jid);
  if(local) return local;

  const lista=Array.isArray(hist) ? hist : [];
  const esInicio=function(h){
    const tipo=normalizar(h.tipo || "");
    const nota=normalizar(h.notas || "");
    return tipo.includes("inicio") || nota.includes("trabajo iniciado") || nota.includes("jornada iniciada");
  };

  let registro=lista.find(function(h){
    if(!esInicio(h)) return false;
    const datos=datosHistorial(h);
    return jid && String(datos.jornada_id || "")===jid;
  });

  // Algunas instalaciones no tienen la columna "datos". En ese caso,
  // registrarHistorial guarda la entrada sin jornada_id. Usamos el inicio
  // más reciente porque la jornada seleccionada ya está marcada En curso.
  if(!registro) registro=lista.find(esInicio);
  if(!registro) return null;

  const datos=datosHistorial(registro);
  const raw=datos.iniciado_at || registro.created_at || registro.fecha;
  if(!raw) return null;
  const d=new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatoDuracion(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;
  return [h,m,s].map(function(n){return String(n).padStart(2,"0")}).join(":");
}

function minutosPlanificadosTrabajo(t,plan){
  const primera=(plan || [])[0] || {};
  const inicio=String(primera.hora_inicio || t.hora_inicio || "").slice(0,5);
  const fin=String(primera.hora_fin || t.hora_fin || "").slice(0,5);
  if(!inicio || !fin) return 0;
  const [hi,mi]=inicio.split(":").map(Number);
  const [hf,mf]=fin.split(":").map(Number);
  const n=(hf*60+mf)-(hi*60+mi);
  return n>0 ? n : 0;
}

function renderPanelEjecucion(t,plan,hist,jornada){
  if(String(t.estado || "")!=="en_curso") return "";
  const inicio=inicioRealTrabajo(hist,jornada && jornada.id,t && t.id);
  const minutos=minutosPlanificadosTrabajo(t,plan);
  return `<section class="zx_tr_execution_panel">
    <div class="zx_tr_execution_head">
      <div>
        <span>Trabajo en curso</span>
        <strong id="tr_execution_timer">${inicio ? formatoDuracion(Date.now()-inicio.getTime()) : "00:00:00"}</strong>
      </div>
      <div class="zx_tr_execution_sync">● Sincronizado</div>
    </div>
    <div class="zx_tr_execution_grid">
      <div><small>Inicio real</small><b>${inicio ? inicio.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : "Ahora"}</b></div>
      <div><small>Tiempo previsto</small><b>${minutos ? Math.floor(minutos/60)+" h "+(minutos%60)+" min" : "Sin definir"}</b></div>
      <div><small>Jornadas</small><b>${Math.max(1,new Set((plan||[]).map(p=>String(p.fecha||""))).size)}</b></div>
    </div>
  </section>`;
}

function iniciarTemporizadorEjecucion(hist,jornada,trabajoId){
  detenerTemporizadorEjecucion();
  const inicio=inicioRealTrabajo(hist,jornada && jornada.id,trabajoId);
  const el=document.getElementById("tr_execution_timer");
  if(!inicio || !el) return;
  const pintar=function(){
    const actual=document.getElementById("tr_execution_timer");
    if(!actual){
      detenerTemporizadorEjecucion();
      return;
    }
    actual.textContent=formatoDuracion(Date.now()-inicio.getTime());
  };
  pintar();
  ZX_TR_EXEC_TIMER=setInterval(pintar,1000);
}

function resumenPlanificacion(plan){
  const lista=Array.isArray(plan) ? plan : [];
  if(!lista.length) return {jornadas:0,desde:"",hasta:"",equipo:0};
  const fechas=[...new Set(lista.map(p=>String(p.fecha || "").slice(0,10)).filter(Boolean))].sort();
  const equipo=new Set(lista.map(p=>String(p.usuario_id || p.tecnico_id || p.usuario || p.tecnico || "")).filter(Boolean));
  return {
    jornadas:fechas.length,
    desde:fechas[0] || "",
    hasta:fechas[fechas.length-1] || "",
    equipo:equipo.size
  };
}

function renderPlanificacionPlegable(plan){
  const r=resumenPlanificacion(plan);
  const contenido=(plan || []).length
    ? plan.map(function(p){
        return `<div class="zx_tr_line">${limpiar(
          `${fechaES(p.fecha)} ${p.hora_inicio ? String(p.hora_inicio).slice(0,5) : ""} ${p.hora_fin ? "–"+String(p.hora_fin).slice(0,5) : ""} ${p.nombre || p.usuario || p.tecnico || ""}`
        )}</div>`;
      }).join("")
    : `<div class="zx_tr_empty mini">Sin planificación.</div>`;

  const rango=r.jornadas
    ? `${fechaES(r.desde)}${r.hasta && r.hasta!==r.desde ? " → "+fechaES(r.hasta) : ""}`
    : "Sin fechas";

  return `<section class="zx_tr_block zx_tr_plan_block">
    <button type="button" class="zx_tr_plan_toggle" id="tr_plan_toggle" aria-expanded="false">
      <span>Planificación</span>
      <b>${r.jornadas} jornada${r.jornadas===1 ? "" : "s"}</b>
      <em>${limpiar(rango)}${r.equipo ? " · "+r.equipo+" técnico"+(r.equipo===1?"":"s") : ""}</em>
    </button>
    <div class="zx_tr_plan_panel" id="tr_plan_panel" hidden>${contenido}</div>
  </section>`;
}

function iniciarDictadoMientrasPulsa(boton,textarea){
  const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!boton || !textarea) return;

  let reconocimiento=null;
  let activo=false;
  let textoBase="";
  let textoFinalSesion="";

  const restaurarBoton=function(){
    boton.classList.remove("escuchando");
    boton.textContent="🎙️ Mantén pulsado para dictar";
  };

  const iniciar=function(ev){
    if(ev) ev.preventDefault();
    if(activo) return;

    if(!SpeechRecognition){
      textarea.focus();
      return;
    }

    activo=true;
    textoBase=String(textarea.value || "").trim();
    textoFinalSesion="";
    boton.classList.add("escuchando");
    boton.textContent="🔴 Escuchando... suelta para parar";

    reconocimiento=new SpeechRecognition();
    reconocimiento.lang="es-ES";
    reconocimiento.interimResults=true;
    reconocimiento.continuous=true;
    reconocimiento.maxAlternatives=1;

    reconocimiento.onresult=function(event){
      let provisional="";

      for(let i=event.resultIndex;i<event.results.length;i++){
        const frase=String(event.results[i][0].transcript || "").trim();
        if(!frase) continue;

        if(event.results[i].isFinal){
          const fraseNormal=normalizar(frase);
          const finalNormal=normalizar(textoFinalSesion);

          if(!finalNormal.includes(fraseNormal)){
            textoFinalSesion=(textoFinalSesion+" "+frase).trim();
          }
        }else{
          provisional=(provisional+" "+frase).trim();
        }
      }

      textarea.value=[textoBase,textoFinalSesion,provisional]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g," ")
        .trim();
    };

    reconocimiento.onerror=function(event){
      if(event && ["aborted","no-speech"].includes(event.error)) return;
      console.warn("Dictado:",event && event.error);
    };

    reconocimiento.onend=function(){
      textarea.value=[textoBase,textoFinalSesion]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g," ")
        .trim();

      activo=false;
      reconocimiento=null;
      restaurarBoton();
    };

    try{
      reconocimiento.start();
    }catch(e){
      activo=false;
      reconocimiento=null;
      restaurarBoton();
    }
  };

  const parar=function(ev){
    if(ev) ev.preventDefault();
    if(!activo) return;

    activo=false;
    restaurarBoton();

    if(reconocimiento){
      try{reconocimiento.stop()}catch(e){}
    }
  };

  boton.addEventListener("touchstart",iniciar,{passive:false});
  boton.addEventListener("touchend",parar,{passive:false});
  boton.addEventListener("touchcancel",parar,{passive:false});
  boton.addEventListener("mousedown",iniciar);
  boton.addEventListener("mouseup",parar);
  boton.addEventListener("mouseleave",parar);
}

function canvasFirmaPreparar(canvas){
  if(!canvas) return null;
  const ratio=Math.max(1,window.devicePixelRatio || 1);
  const rect=canvas.getBoundingClientRect();
  const ancho=Math.max(280,Math.round(rect.width || 600));
  const alto=Math.max(150,Math.round(rect.height || 220));
  canvas.width=ancho*ratio;
  canvas.height=alto*ratio;
  const ctx=canvas.getContext("2d");
  ctx.scale(ratio,ratio);
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,ancho,alto);
  ctx.strokeStyle="#0f172a";
  ctx.lineWidth=2.2;
  ctx.lineCap="round";
  ctx.lineJoin="round";
  return {ctx:ctx,ancho:ancho,alto:alto};
}

function activarFirmaCanvas(canvas,limpiarBtn){
  const preparado=canvasFirmaPreparar(canvas);
  if(!canvas || !preparado) return function(){return false};

  const ctx=preparado.ctx;
  let dibujando=false;
  let firmado=false;

  const punto=function(ev){
    const r=canvas.getBoundingClientRect();
    const t=ev.touches && ev.touches[0] ? ev.touches[0] : ev;
    return {x:t.clientX-r.left,y:t.clientY-r.top};
  };

  const iniciar=function(ev){
    ev.preventDefault();
    dibujando=true;
    firmado=true;
    const p=punto(ev);
    ctx.beginPath();
    ctx.moveTo(p.x,p.y);
  };

  const mover=function(ev){
    if(!dibujando) return;
    ev.preventDefault();
    const p=punto(ev);
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  };

  const parar=function(ev){
    if(ev) ev.preventDefault();
    dibujando=false;
  };

  canvas.addEventListener("pointerdown",iniciar);
  canvas.addEventListener("pointermove",mover);
  canvas.addEventListener("pointerup",parar);
  canvas.addEventListener("pointercancel",parar);
  canvas.addEventListener("pointerleave",parar);

  if(limpiarBtn){
    limpiarBtn.onclick=function(){
      ctx.clearRect(0,0,preparado.ancho,preparado.alto);
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,preparado.ancho,preparado.alto);
      firmado=false;
    };
  }

  return function(){return firmado};
}

function canvasABlob(canvas){
  return new Promise(function(resolve,reject){
    if(!canvas){
      reject(new Error("No se encontró la firma."));
      return;
    }
    canvas.toBlob(function(blob){
      if(blob) resolve(blob);
      else reject(new Error("No se pudo generar la firma."));
    },"image/png",0.92);
  });
}

async function subirBlobTrabajo(id,blob,nombreArchivo,tipo){
  if(!navigator.onLine || !sb()) throw new Error("Necesitas conexión para subir archivos.");
  const ext=(nombreArchivo.split(".").pop() || "dat").toLowerCase();
  const path="trabajos/"+String(id)+"/"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext;
  const up=await sb().storage.from("zentryx-trabajos").upload(path,blob,{
    upsert:false,
    contentType:tipo || blob.type || undefined
  });
  if(up.error) throw up.error;
  const publicData=sb().storage.from("zentryx-trabajos").getPublicUrl(path);
  const url=publicData && publicData.data ? publicData.data.publicUrl : "";
  if(!url) throw new Error("No se pudo obtener la dirección del archivo.");
  return {url:url,path:path};
}

async function guardarArchivoParte(id,file,nombreVisible){
  const subido=await subirBlobTrabajo(
    id,
    file,
    file.name || "archivo.dat",
    file.type || ""
  );

  const guardado=await insertarArchivoCompatible({
    trabajo_id:String(id),
    nombre:nombreVisible,
    url:subido.url,
    tipo:file.type || "",
    tamano:file.size || 0
  });

  if(guardado.error){
    try{await sb().storage.from("zentryx-trabajos").remove([subido.path])}catch(e){}
    throw guardado.error;
  }
  return {url:subido.url,path:subido.path};
}

function categoriaFotoTexto(valor){
  if(valor==="antes") return "Antes";
  if(valor==="despues") return "Después";
  return "Durante";
}

async function abrirParteJornada(id){
  const t=await cargarTrabajo(id);
  if(!t) return;

  const jornadas=await cargarJornadasAgendaTrabajo(id);
  const jornada=jornadaSeleccionadaAgenda(jornadas);
  const fecha=jornada?.fecha_inicio || t.fecha || hoy();

  modal(`
    <div class="zx_tr_part_full_header">
      <button type="button" class="zx_tr_part_back" id="tr_parte_volver">‹ Trabajo</button>
      <div>
        <h2>Parte de jornada</h2>
        <p>${limpiar(t.titulo || "Trabajo")} · ${limpiar(fechaES(fecha))}</p>
      </div>
    </div>

    <label class="zx_tr_label">Trabajo realizado</label>
    <textarea id="tr_parte_texto" rows="6" placeholder="Describe brevemente lo realizado..."></textarea>
    <div class="zx_tr_dictation_actions">
      <button type="button" class="zx_tr_hold_mic" id="tr_parte_micro">🎙️ Mantén pulsado para dictar</button>
      <button type="button" class="zx_tr_clear_text" id="tr_parte_borrar">🗑️ Borrar texto</button>
    </div>

    <label class="zx_tr_label">Fotografías (opcional)</label>
    <div class="zx_tr_part_photo_row">
      <select id="tr_parte_categoria">
        <option value="antes">Antes</option>
        <option value="durante" selected>Durante</option>
        <option value="despues">Después</option>
      </select>
      <input id="tr_parte_fotos" type="file" accept="image/*" capture="environment" multiple>
    </div>
    <small class="zx_tr_help">Puedes añadir varias fotos. Quedarán clasificadas en Archivos.</small>

    <label class="zx_tr_label">Nombre de quien firma (opcional)</label>
    <input id="tr_parte_firmante" placeholder="Nombre del cliente o responsable">

    <div class="zx_tr_signature_title">
      <label class="zx_tr_label">Firma (opcional)</label>
      <button type="button" id="tr_parte_limpiar_firma">Limpiar</button>
    </div>
    <canvas id="tr_parte_firma" class="zx_tr_signature_canvas"></canvas>

    <button class="zx_btn_big zx_verde" id="tr_parte_guardar">Guardar parte</button>
    <button class="zx_btn_big zx_gris" id="tr_parte_cancelar">Cancelar</button>
  `);

  const modalParte=document.getElementById("zx_modal_trabajo");
  if(modalParte) modalParte.classList.add("zx_tr_part_fullscreen");

  const volverAlTrabajo=function(){
    cerrarModal();
    abrirFicha(id);
  };

  const volverParte=document.getElementById("tr_parte_volver");
  if(volverParte) volverParte.onclick=volverAlTrabajo;

  const texto=document.getElementById("tr_parte_texto");
  const canvas=document.getElementById("tr_parte_firma");
  const tieneFirma=activarFirmaCanvas(
    canvas,
    document.getElementById("tr_parte_limpiar_firma")
  );

  iniciarDictadoMientrasPulsa(
    document.getElementById("tr_parte_micro"),
    texto
  );

  document.getElementById("tr_parte_borrar").onclick=function(){
    if(!texto.value.trim()) return;
    if(confirm("¿Borrar todo el texto del parte?")){
      texto.value="";
      texto.focus();
    }
  };

  document.getElementById("tr_parte_cancelar").onclick=volverAlTrabajo;

  document.getElementById("tr_parte_guardar").onclick=async function(){
    const boton=this;
    const trabajoRealizado=valor("tr_parte_texto");
    const firmante=valor("tr_parte_firmante");
    const categoria=valor("tr_parte_categoria") || "durante";
    const fotos=Array.from(document.getElementById("tr_parte_fotos").files || []);

    if(!trabajoRealizado && !fotos.length && !tieneFirma()){
      alert("Añade el trabajo realizado, una fotografía o una firma.");
      return;
    }

    boton.disabled=true;
    boton.textContent="Guardando parte...";

    const archivosGuardados=[];
    let firmaUrl="";

    try{
      for(let i=0;i<fotos.length;i++){
        const file=fotos[i];
        const nombre=`Foto ${categoriaFotoTexto(categoria)} · ${fechaES(fecha)} · ${i+1}`;
        const guardada=await guardarArchivoParte(id,file,nombre);
        archivosGuardados.push({
          tipo:"foto",
          categoria:categoria,
          nombre:nombre,
          url:guardada.url
        });
      }

      if(tieneFirma()){
        const blob=await canvasABlob(canvas);
        const nombreArchivo="firma_"+String(id)+"_"+Date.now()+".png";
        const subido=await subirBlobTrabajo(id,blob,nombreArchivo,"image/png");
        firmaUrl=subido.url;

        archivosGuardados.push({
          tipo:"firma",
          nombre:`Firma · ${firmante || "Cliente"}`,
          url:firmaUrl
        });
      }

      await registrarHistorial(
        id,
        "parte_jornada",
        trabajoRealizado || "Parte de jornada guardado.",
        {
          jornada_id:jornada?.id || "",
          fecha_jornada:fecha,
          trabajo_realizado:trabajoRealizado,
          firmante:firmante,
          firma_url:firmaUrl,
          archivos:archivosGuardados,
          guardado_at:new Date().toISOString()
        }
      );

      try{
        window.dispatchEvent(new CustomEvent("zentryx:trabajos:actualizar",{
          detail:{trabajo_id:String(id),jornada_id:String(jornada?.id || "")}
        }));
      }catch(e){}

      cerrarModal();
      await abrirFicha(id);
    }catch(e){
      boton.disabled=false;
      boton.textContent="Guardar parte";
      alert("No se pudo guardar el parte.\n\n"+mensajeError(e));
    }
  };
}


async function registrarNotaRapida(id){
  modal(`
    <h2>Nota rápida</h2>
    <div class="zx_text">Añade una observación breve al historial del trabajo.</div>
    <textarea id="tr_nota_rapida" rows="5" placeholder="Escribe o dicta la nota..."></textarea>
    <div class="zx_tr_dictation_actions">
      <button type="button" class="zx_tr_hold_mic" id="tr_nota_micro">🎙️ Mantén pulsado para dictar</button>
      <button type="button" class="zx_tr_clear_text" id="tr_nota_borrar">🗑️ Borrar texto</button>
    </div>
    <button class="zx_btn_big zx_verde" id="tr_nota_guardar">Guardar nota</button>
    <button class="zx_btn_big zx_gris" id="tr_nota_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_nota_cancelar").onclick=cerrarModal;
  const notaRapida=document.getElementById("tr_nota_rapida");
  iniciarDictadoMientrasPulsa(
    document.getElementById("tr_nota_micro"),
    notaRapida
  );
  document.getElementById("tr_nota_borrar").onclick=function(){
    if(!notaRapida.value.trim()) return;
    if(confirm("¿Borrar todo el texto de la nota?")){
      notaRapida.value="";
      notaRapida.focus();
    }
  };
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

  const jornadas=await cargarJornadasAgendaTrabajo(id);
  const jornada=jornadaSeleccionadaAgenda(jornadas);
  if(!jornada){
    alert("No se ha podido localizar la jornada.");
    return;
  }

  const multi=jornadas.length>1;
  modal(`
    <h2>${multi ? "Finalizar jornada" : "Finalizar trabajo"}</h2>
    <div class="zx_text">
      <b>${limpiar(t.titulo || "Trabajo")}</b><br>
      ${multi ? `Jornada: ${limpiar(fechaES(jornada.fecha_inicio))} · ${limpiar(String(jornada.hora_inicio || "").slice(0,5))}<br>` : ""}
      Puedes añadir un registro breve de lo realizado. Es opcional.
    </div>
    <textarea id="tr_fin_resumen" rows="5" placeholder="Trabajo realizado, observaciones o material pendiente..."></textarea>
    <button class="zx_btn_big zx_verde" id="tr_fin_confirmar">✅ ${multi ? "Finalizar jornada" : "Finalizar"}</button>
    ${multi ? `<button class="zx_btn_big zx_rojo" id="tr_fin_todo">Finalizar todo el trabajo</button>` : ""}
    <button class="zx_btn_big zx_gris" id="tr_fin_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_fin_cancelar").onclick=function(){abrirFicha(id)};

  const terminarSoloJornada=async function(finalizarTodo){
    const resumen=valor("tr_fin_resumen");
    const btnConfirmar=document.getElementById("tr_fin_confirmar");
    const btnTodo=document.getElementById("tr_fin_todo");
    if(btnConfirmar){
      btnConfirmar.disabled=true;
      btnConfirmar.textContent="Guardando...";
    }
    if(btnTodo) btnTodo.disabled=true;
    try{
      if(finalizarTodo){
        const pendientes=jornadas.filter(j=>!["completado","cancelado"].includes(String(j.estado || "")));
        if(pendientes.length>1){
          const ok=confirm("Quedan "+pendientes.length+" jornadas sin realizar. ¿Finalizar todo el trabajo igualmente?");
          if(!ok) return;
        }
        const rTodos=await sb().from("agenda_eventos")
          .update({estado:"completado"})
          .eq("origen","trabajos")
          .eq("origen_id",String(id))
          .neq("estado","cancelado");
        if(rTodos.error) throw rTodos.error;
      }else{
        const rJ=await actualizarEstadoJornadaAgenda(jornada.id,"completado");
        if(rJ && rJ.error) throw rJ.error;
      }

      if(finalizarTodo){
        jornadas.forEach(function(j){borrarInicioJornadaLocal(id,j.id)});
      }else{
        borrarInicioJornadaLocal(id,jornada.id);
      }

      const recalculo=await recalcularEstadoGeneralTrabajo(id,t);
      const pendientesRestantes=recalculo.jornadas.filter(j=>!["completado","cancelado"].includes(String(j.estado || ""))).length;

      await registrarHistorial(
        id,
        finalizarTodo ? "finalizacion" : "jornada",
        resumen || (finalizarTodo ? "Trabajo completo finalizado." : "Jornada finalizada."),
        {
          estado:recalculo.estado,
          jornada_id:jornada.id,
          fecha_jornada:jornada.fecha_inicio,
          resumen:resumen,
          jornadas_pendientes:pendientesRestantes,
          finalizado_at:new Date().toISOString()
        }
      );

      try{
        window.dispatchEvent(new CustomEvent("zentryx:agenda:actualizar",{
          detail:{origen:"trabajos",trabajo_id:String(id)}
        }));
      }catch(e){}

      cerrarModal();

      // Forzar recarga desde Supabase antes de repintar la ficha local.
      ZX_TR_CACHE=ZX_TR_CACHE.filter(function(x){return String(x.id)!==String(id)});
      guardarCache(ZX_TR_CACHE);

      try{
        window.dispatchEvent(new CustomEvent("zentryx:trabajos:actualizar",{
          detail:{trabajo_id:String(id),jornada_id:String(jornada.id || "")}
        }));
      }catch(e){}

      if(modoTrabajoUnico()){
        await new Promise(function(resolve){setTimeout(resolve,80)});
        await abrirFicha(id);
      }else{
        await new Promise(function(resolve){setTimeout(resolve,80)});
        await window.ZX_trabajos();
      }
    }catch(e){
      if(btnConfirmar){
        btnConfirmar.disabled=false;
        btnConfirmar.textContent=multi ? "✅ Finalizar jornada" : "✅ Finalizar";
      }
      if(btnTodo) btnTodo.disabled=false;
      alert("No se pudo finalizar la jornada.");
    }
  };

  document.getElementById("tr_fin_confirmar").onclick=function(){terminarSoloJornada(false)};
  const todo=document.getElementById("tr_fin_todo");
  if(todo) todo.onclick=function(){terminarSoloJornada(true)};
}

async function ejecutarAccionPrincipal(id,accion){
  if(accion==="iniciar_jornada" || accion==="iniciar"){
    const t=await cargarTrabajo(id);
    if(!t) return;

    const jornadas=await cargarJornadasAgendaTrabajo(id);
    const jornada=jornadaSeleccionadaAgenda(jornadas);
    if(!jornada){
      alert("No se ha podido localizar la jornada.");
      return;
    }

    try{
      const ubicacion=await obtenerUbicacionTrabajo();
      let rJ=await actualizarEstadoJornadaAgenda(jornada.id,"en_curso");
      if(rJ && rJ.error) throw rJ.error;

      // Actualizar solo el estado general del trabajo. Las demás jornadas
      // conservan su estado propio en agenda_eventos.
      const r=await actualizarTrabajo(id,{estado:"en_curso"});
      if(r && r.error) throw r.error;

      const iniciadoAt=new Date().toISOString();
      guardarInicioJornadaLocal(id,jornada.id,iniciadoAt);

      await registrarHistorial(
        id,
        "jornada",
        jornadas.length>1 ? "Jornada iniciada." : "Trabajo iniciado.",
        {
          estado:"en_curso",
          jornada_id:jornada.id,
          fecha_jornada:jornada.fecha_inicio,
          iniciado_at:iniciadoAt,
          ubicacion:ubicacion
        }
      );

      try{
        window.dispatchEvent(new CustomEvent("zentryx:agenda:actualizar",{
          detail:{origen:"trabajos",trabajo_id:String(id)}
        }));
      }catch(e){}

      cerrarModal();
      ZX_TR_CACHE=ZX_TR_CACHE.filter(function(x){return String(x.id)!==String(id)});
      guardarCache(ZX_TR_CACHE);
      if(modoTrabajoUnico()){
        await new Promise(function(resolve){setTimeout(resolve,80)});
        await abrirFicha(id);
      }else{
        await new Promise(function(resolve){setTimeout(resolve,80)});
        await window.ZX_trabajos();
      }
    }catch(e){
      alert("No se pudo iniciar la jornada.");
    }
    return;
  }

  if(accion==="terminar_jornada" || accion==="terminar"){
    finalizarTrabajoRapido(id);
  }
}


function firmaEstadoTrabajo(t,jornadas){
  const js=(jornadas || []).map(function(j){
    return [
      String(j.id || ""),
      String(j.fecha_inicio || ""),
      String(j.hora_inicio || ""),
      String(j.hora_fin || ""),
      String(j.estado || "")
    ].join(":");
  }).join("|");
  return [
    String(t && t.estado || ""),
    String(t && t.updated_at || ""),
    js
  ].join("##");
}

async function leerFirmaEstadoTrabajo(id){
  if(!navigator.onLine || !sb()) return "";
  try{
    const [rt,rj]=await Promise.all([
      sb().from(TABLA).select("id,estado,updated_at").eq("id",String(id)).maybeSingle(),
      sb().from("agenda_eventos")
        .select("id,fecha_inicio,hora_inicio,hora_fin,estado")
        .eq("origen","trabajos")
        .eq("origen_id",String(id))
        .order("fecha_inicio",{ascending:true})
        .order("hora_inicio",{ascending:true})
    ]);
    if(rt.error || rj.error) return "";
    return firmaEstadoTrabajo(rt.data || {},rj.data || []);
  }catch(e){
    return "";
  }
}

function programarRefrescoTrabajo(id){
  if(String(id || "")!==String(ZX_TR_LIVE_ID || "")) return;
  if(ZX_TR_LIVE_REFRESH) clearTimeout(ZX_TR_LIVE_REFRESH);

  ZX_TR_LIVE_REFRESH=setTimeout(async function(){
    ZX_TR_LIVE_REFRESH=null;
    if(String(id || "")!==String(ZX_TR_LIVE_ID || "")) return;
    if(!document.getElementById("zx_modal_trabajo")) return;

    const caja=document.querySelector("#zx_modal_trabajo .zx_modal_caja");
    const scrollTop=caja ? caja.scrollTop : 0;

    ZX_TR_CACHE=ZX_TR_CACHE.filter(function(x){
      return String(x.id)!==String(id);
    });
    guardarCache(ZX_TR_CACHE);

    try{
      await abrirFicha(id);
      const nuevaCaja=document.querySelector("#zx_modal_trabajo .zx_modal_caja");
      if(nuevaCaja) nuevaCaja.scrollTop=scrollTop;
    }catch(e){}
  },180);
}

async function iniciarMonitorTrabajo(id,t,jornadas){
  detenerMonitorTrabajo();

  ZX_TR_LIVE_ID=String(id || "");
  ZX_TR_LIVE_SIGNATURE=firmaEstadoTrabajo(t,jornadas);

  const comprobar=async function(){
    if(String(id || "")!==String(ZX_TR_LIVE_ID || "")) return;
    if(document.hidden || !navigator.onLine) return;

    const firma=await leerFirmaEstadoTrabajo(id);
    if(!firma) return;

    if(ZX_TR_LIVE_SIGNATURE && firma!==ZX_TR_LIVE_SIGNATURE){
      ZX_TR_LIVE_SIGNATURE=firma;
      programarRefrescoTrabajo(id);
    }else{
      ZX_TR_LIVE_SIGNATURE=firma;
    }
  };

  // Supabase Realtime: actualización inmediata cuando está disponible.
  if(sb() && typeof sb().channel==="function"){
    try{
      ZX_TR_LIVE_CHANNEL=sb()
        .channel("zx-trabajo-"+String(id)+"-"+Math.random().toString(36).slice(2))
        .on(
          "postgres_changes",
          {event:"*",schema:"public",table:"agenda_eventos",filter:"origen_id=eq."+String(id)},
          function(){programarRefrescoTrabajo(id)}
        )
        .on(
          "postgres_changes",
          {event:"*",schema:"public",table:TABLA,filter:"id=eq."+String(id)},
          function(){programarRefrescoTrabajo(id)}
        )
        .subscribe();
    }catch(e){
      ZX_TR_LIVE_CHANNEL=null;
    }
  }

  // Respaldo: consulta ligera cada 3 segundos.
  ZX_TR_LIVE_POLL=setInterval(comprobar,3000);

  const alVolver=async function(){
    if(!document.hidden && String(id || "")===String(ZX_TR_LIVE_ID || "")){
      await comprobar();
    }
  };
  document.addEventListener("visibilitychange",alVolver,{once:true});
  window.addEventListener("focus",alVolver,{once:true});
}


async function abrirFicha(id){
  const t=await cargarTrabajo(id);
  if(!t){alert("Trabajo no encontrado.");return}

  modal(`
    <div class="zx_tr_full_header">
      ${modoTrabajoUnico() ? `<button type="button" class="zx_tr_back_agenda" id="tr_back_agenda">‹ Agenda</button>` : ""}
      <h2>${limpiar(t.titulo || "Trabajo")}</h2>
      <span class="zx_tr_full_state ${claseEstado(t.estado)}" id="tr_full_header_state">${limpiar(estadoTexto(t.estado))}</span>
    </div>
    <div id="tr_ficha_contenido">
      <div class="zx_tr_loading">Cargando ficha...</div>
    </div>
    <button class="zx_btn_big zx_gris" id="tr_ficha_cerrar">Cerrar</button>
  `);

  const modalTrabajo=document.getElementById("zx_modal_trabajo");
  if(modoTrabajoUnico() && modalTrabajo){
    modalTrabajo.classList.add("zx_tr_fullscreen");
  }

  const volverAgendaDesdeTrabajo=function(){
    cerrarModal();
    if(modoTrabajoUnico()) salirTrabajoUnico();
  };

  document.getElementById("tr_ficha_cerrar").onclick=volverAgendaDesdeTrabajo;
  const backAgenda=document.getElementById("tr_back_agenda");
  if(backAgenda) backAgenda.onclick=volverAgendaDesdeTrabajo;

  const box=document.getElementById("tr_ficha_contenido");

  const [plan,mat,arch,hist,jornadasAgenda]=await Promise.all([
    cargarPlanificacion(id),
    cargarMateriales(id),
    cargarArchivos(id),
    cargarHistorial(id),
    cargarJornadasAgendaTrabajo(id)
  ]);
  const [sugerencias,sugerenciasMateriales]=await Promise.all([
    cargarSugerenciasDocumentales(t,arch),
    cargarSugerenciasMaterialesTrabajo(t,mat)
  ]);

  const equipo=equipoPlanificacion(plan,t);
  const dir=direccionTrabajo(t);
  const tel=t.telefono_contacto || t.telefono || "";
  const jornadaActual=jornadaSeleccionadaAgenda(jornadasAgenda);
  const principal=accionPrincipalJornada(t,jornadaActual,jornadasAgenda.length);
  const horario=tiempoPlanificado(t);
  const estadoVisible=jornadaActual ? estadoJornadaTexto(jornadaActual.estado) : estadoTexto(t.estado);
  const headerState=document.getElementById("tr_full_header_state");
  if(headerState){
    headerState.className="zx_tr_full_state "+claseEstado(jornadaActual ? jornadaActual.estado : t.estado);
    headerState.textContent=estadoVisible;
  }

  box.innerHTML=`
    <div class="zx_tr_operativo">
      <section class="zx_tr_status_card zx_tr_estado_${claseEstado(jornadaActual ? jornadaActual.estado : t.estado)}">
        <div class="zx_tr_status_top">
          <div>
            <span class="zx_tr_status_label">Estado actual</span>
            <strong>${limpiar(estadoVisible)}</strong>
          </div>
          <div class="zx_tr_badges">
            <span class="estado ${claseEstado(jornadaActual ? jornadaActual.estado : t.estado)}">${limpiar(estadoVisible)}</span>
            <span class="prio ${clasePrioridad(t.prioridad)}">${limpiar(prioridadTexto(t.prioridad))}</span>
          </div>
        </div>

        <div class="zx_tr_status_grid">
          ${(jornadaActual?.fecha_inicio || t.fecha) ? `<div><span class="zx_tr_calendar_day" aria-label="Calendario">${limpiar(String((jornadaActual?.fecha_inicio || t.fecha)).slice(8,10))}</span><small>Fecha</small><b>${limpiar(fechaES(jornadaActual?.fecha_inicio || t.fecha))}</b></div>` : ""}
          ${(jornadaActual?.hora_inicio || horario) ? `<div><span>🕒</span><small>Horario</small><b>${limpiar(jornadaActual ? [String(jornadaActual.hora_inicio||"").slice(0,5),String(jornadaActual.hora_fin||"").slice(0,5)].filter(Boolean).join("–") : horario)}</b></div>` : ""}
          <div><span>👥</span><small>Equipo</small><b>${equipo.length || 1}</b></div>
          <button type="button" class="zx_tr_status_materials" id="tr_open_materials"><span>📦</span><small>Materiales</small><b>${mat.length}</b></button>
        </div>
      </section>

      ${String(jornadaActual?.estado || t.estado)==="en_curso" ? renderPanelEjecucion(Object.assign({},t,{estado:"en_curso"}),plan,hist,jornadaActual) : ""}

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
        <button type="button" class="zx_tr_quick_btn zx_tr_quick_part" id="tr_quick_part"><span class="zx_tr_quick_icon">✍️</span><span>Parte y firma</span></button>
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

${renderPlanificacionPlegable(plan)}
      ${renderMaterialesResumen(id,mat)}
      ${renderSugerenciasMateriales(sugerenciasMateriales)}
      ${renderArchivos(arch,id)}
      ${renderPartesJornada(hist)}
      ${renderNotasVisibles(hist)}
      ${renderSugerenciasInteligentes(sugerencias)}
      ${renderHistorialProfesional(hist)}
    </div>
  `;

  const materials=document.getElementById("tr_open_materials");
  if(materials) materials.onclick=function(){abrirListaMateriales(id)};

  const docLibrary=document.getElementById("tr_open_doc_library");
  if(docLibrary) docLibrary.onclick=function(){abrirBibliotecaDocumental(id)};

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

  const parte=document.getElementById("tr_quick_part");
  if(parte) parte.onclick=function(){abrirParteJornada(id)};

  const planToggle=document.getElementById("tr_plan_toggle");
  const planPanel=document.getElementById("tr_plan_panel");
  if(planToggle && planPanel){
    planPanel.hidden=true;
    planToggle.setAttribute("aria-expanded","false");
    planToggle.onclick=function(){
      const abrir=planPanel.hidden;
      planPanel.hidden=!abrir;
      planToggle.setAttribute("aria-expanded",abrir ? "true" : "false");
    };
  }

  iniciarTemporizadorEjecucion(hist,jornadaActual,id);
  iniciarMonitorTrabajo(id,t,jornadasAgenda);

  const smartMaterials=document.getElementById("tr_smart_material_attach");
  if(smartMaterials) smartMaterials.onclick=function(){adjuntarSugerenciasMateriales(id,sugerenciasMateriales)};

  const smart=document.getElementById("tr_smart_attach");
  if(smart) smart.onclick=function(){adjuntarSugerencias(id,sugerencias)};

  const partsToggle=document.getElementById("tr_parts_toggle");
  const partsPanel=document.getElementById("tr_parts_panel");
  if(partsToggle && partsPanel){
    partsPanel.hidden=true;
    partsToggle.onclick=function(){
      const abrir=partsPanel.hidden;
      partsPanel.hidden=!abrir;
      partsToggle.setAttribute("aria-expanded",abrir ? "true" : "false");
      const em=partsToggle.querySelector("em");
      if(em) em.textContent=abrir ? "Ocultar partes" : "Ver partes guardados";
    };
  }

  const historyToggle=document.getElementById("tr_history_toggle");
  const historyPanel=document.getElementById("tr_history_panel");
  if(historyToggle && historyPanel){
    historyPanel.hidden=true;
    historyToggle.setAttribute("aria-expanded","false");
    historyToggle.onclick=function(){
      const abrir=historyPanel.hidden;
      historyPanel.hidden=!abrir;
      historyToggle.setAttribute("aria-expanded",abrir ? "true" : "false");
      const em=historyToggle.querySelector("em");
      if(em) em.textContent=abrir ? "Ocultar historial" : "Ver historial";
    };
  }
}

function renderNotasVisibles(hist){
  const notas=(hist || []).filter(h=>normalizar(h.tipo).includes("nota") || normalizar(h.notas).startsWith("nota"));
  if(!notas.length) return "";
  return `<section class="zx_tr_block zx_tr_notes_block"><div class="zx_tr_block_title"><h3>Notas</h3><span>${notas.length}</span></div>${notas.slice(0,5).map(h=>`<article class="zx_tr_note_visible"><p>${limpiar(h.notas || "")}</p><small>${limpiar(h.usuario || "Sistema")} · ${limpiar(fechaHoraHistorial(h))}</small></article>`).join("")}</section>`;
}

function renderPartesJornada(hist){
  const partes=(hist || []).filter(h=>normalizar(h.tipo).includes("parte jornada") || normalizar(h.tipo).includes("parte_jornada"));
  if(!partes.length) return "";

  return `<section class="zx_tr_block zx_tr_parts_block">
    <button type="button" class="zx_tr_parts_toggle" id="tr_parts_toggle" aria-expanded="false">
      <span>Partes de jornada</span>
      <b>${partes.length}</b>
      <em>Ver partes guardados</em>
    </button>
    <div id="tr_parts_panel" class="zx_tr_parts_panel" hidden>
      ${partes.map(function(h){
        const datos=datosHistorial(h);
        const firmante=datos.firmante || "";
        const firma=datos.firma_url || "";
        const archivos=Array.isArray(datos.archivos) ? datos.archivos : [];
        const fotos=archivos.filter(a=>String(a.tipo || "")==="foto" && a.url);
        return `<article class="zx_tr_part_item">
          <p>${limpiar(datos.trabajo_realizado || h.notas || "Parte de jornada")}</p>
          ${fotos.length ? `<div class="zx_tr_part_photos">${fotos.map(a=>`<figure><img src="${limpiar(a.url)}" alt="${limpiar(a.nombre || "Foto del parte")}"><figcaption>${limpiar(a.nombre || "")}</figcaption></figure>`).join("")}</div>` : ""}
          ${firmante ? `<small class="zx_tr_part_signer">Firmado por: ${limpiar(firmante)}</small>` : ""}
          ${firma ? `<div class="zx_tr_part_signature"><span>Firma</span><img src="${limpiar(firma)}" alt="Firma de ${limpiar(firmante || "cliente")}"></div>` : ""}
          <small>${limpiar(h.usuario || "Sistema")} · ${limpiar(fechaHoraHistorial(h))}</small>
        </article>`;
      }).join("")}
    </div>
  </section>`;
}


const ZX_MATERIAL_PREPARADO_RE=/\[\[ZX_PREPARADO:([0-9]+(?:[.,][0-9]+)?)\]\]/i;

const ZX_MATERIAL_IMAGEN_RE=/\[\[ZX_MAT_IMG:([^\]]+)\]\]/i;

function imagenMaterial(material){
  const notas=String((material && material.notas) || "");
  const match=notas.match(ZX_MATERIAL_IMAGEN_RE);
  return match ? String(match[1] || "").trim() : "";
}

function notasSinMetadatosMaterial(material){
  return String((material && material.notas) || "")
    .replace(ZX_MATERIAL_PREPARADO_RE,"")
    .replace(ZX_MATERIAL_IMAGEN_RE,"")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function construirNotasMaterial(notas,cantidadPreparada,urlImagen){
  const limpia=String(notas || "")
    .replace(ZX_MATERIAL_PREPARADO_RE,"")
    .replace(ZX_MATERIAL_IMAGEN_RE,"")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
  const partes=[];
  if(limpia) partes.push(limpia);
  const preparada=Number(cantidadPreparada || 0);
  if(preparada>0) partes.push("[[ZX_PREPARADO:"+preparada+"]]");
  if(urlImagen) partes.push("[[ZX_MAT_IMG:"+String(urlImagen).trim()+"]]");
  return partes.join("\n");
}

function reconocimientoVozDisponible(){
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function iniciarDictadoMaterial(inputId){
  const input=document.getElementById(inputId);
  if(!input) return;
  const SpeechRecognition=reconocimientoVozDisponible();
  if(!SpeechRecognition){
    input.focus();
    alert("En este dispositivo usa el micrófono del teclado para dictar.");
    return;
  }
  const rec=new SpeechRecognition();
  rec.lang="es-ES";
  rec.interimResults=false;
  rec.maxAlternatives=1;
  rec.onresult=function(ev){
    const texto=ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
    if(texto){
      input.value=(input.value ? input.value+" " : "")+texto;
      input.dispatchEvent(new Event("input",{bubbles:true}));
    }
  };
  rec.onerror=function(){input.focus()};
  rec.start();
}

async function subirImagenMaterial(file,trabajoId){
  if(!file) return "";
  if(!navigator.onLine || !sb()) throw new Error("Necesitas conexión para subir la imagen.");
  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const path="materiales/"+String(trabajoId)+"/"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext;
  const up=await sb().storage.from("zentryx-trabajos").upload(path,file,{
    upsert:false,
    contentType:file.type || "image/jpeg"
  });
  if(up.error) throw up.error;
  const publicData=sb().storage.from("zentryx-trabajos").getPublicUrl(path);
  const url=publicData && publicData.data ? publicData.data.publicUrl : "";
  if(!url) throw new Error("No se pudo obtener la dirección de la imagen.");
  return url;
}


function cantidadPreparadaMaterial(material){
  const notas=String((material && material.notas) || "");
  const match=notas.match(ZX_MATERIAL_PREPARADO_RE);
  if(match){
    const n=Number(String(match[1]).replace(",","."));
    return Number.isFinite(n) && n>0 ? n : 0;
  }
  if(material && material.preparado===true) return Number(material.cantidad || 0);
  return 0;
}

function notasVisiblesMaterial(material){
  return notasSinMetadatosMaterial(material);
}

function notasConPreparado(notas,cantidadPreparada,urlImagen){
  return construirNotasMaterial(notas,cantidadPreparada,urlImagen || "");
}

function estadoPreparacionMaterial(material){
  const total=Math.max(0,Number(material && material.cantidad || 0));
  const preparada=Math.min(total,Math.max(0,cantidadPreparadaMaterial(material)));
  if(total<=0 || preparada<=0){
    return {clave:"pendiente",preparada:0,total:total,falta:total,texto:"Pendiente"};
  }
  if(preparada>=total){
    return {clave:"listo",preparada:total,total:total,falta:0,texto:"Listo"};
  }
  return {clave:"parcial",preparada:preparada,total:total,falta:total-preparada,texto:"Parcial"};
}

async function establecerPreparacionMaterial(trabajoId,material,modo){
  const total=Math.max(0,Number(material.cantidad || 0));
  const actual=Math.min(total,Math.max(0,cantidadPreparadaMaterial(material)));
  let nueva=actual;

  if(modo==="pendiente"){
    nueva=0;
  }else if(modo==="listo"){
    nueva=total;
  }else{
    const entrada=prompt(
      "Cantidad disponible o preparada de "+(material.nombre||material.material||"Material")+
      " (necesarias: "+total+" "+(material.unidad||"ud")+"):", String(actual)
    );
    if(entrada===null) return;
    nueva=Number(String(entrada).trim().replace(",","."));
    if(!Number.isFinite(nueva) || nueva<0 || nueva>total){
      alert("Introduce una cantidad entre 0 y "+total+".");
      return;
    }
  }

  const notas=notasConPreparado(notasVisiblesMaterial(material),nueva,imagenMaterial(material));
  const r=await actualizarMaterialCompatible(material.id,{
    notas:notas,
    preparado:nueva>=total && total>0
  });
  if(r && r.error){
    alert("No se pudo actualizar la preparación del material.\n\n"+mensajeError(r.error));
    return;
  }

  const falta=Math.max(0,total-nueva);
  const descripcion=nueva<=0
    ? "Material marcado como pendiente: "
    : nueva>=total
      ? "Material marcado como listo: "
      : "Material preparado parcialmente: ";
  await registrarHistorial(
    trabajoId,"material",
    descripcion+(material.nombre||material.material||"Material")+
    " ("+nueva+" de "+total+" "+(material.unidad||"ud")+
    (falta>0 ? "; faltan "+falta : "")+")",
    {material_id:material.id,cantidad_total:total,cantidad_preparada:nueva,cantidad_pendiente:falta}
  );
  await abrirListaMateriales(trabajoId);
}

function abrirEstadoPreparacionMaterial(trabajoId,material){
  const estado=estadoPreparacionMaterial(material);
  modal(`
    <h2>Preparación de material</h2>
    <div class="zx_tr_material_prepare_summary">
      <strong>${limpiar(material.nombre||material.material||"Material")}</strong>
      <span>Necesario: ${limpiar(estado.total)} ${limpiar(material.unidad||"ud")}</span>
      <span>Disponible: ${limpiar(estado.preparada)} ${limpiar(material.unidad||"ud")}</span>
      <span>Falta: ${limpiar(estado.falta)} ${limpiar(material.unidad||"ud")}</span>
    </div>
    <button class="zx_btn_big zx_gris" id="tr_mat_prepare_pending">○ Pendiente</button>
    <button class="zx_btn_big zx_naranja" id="tr_mat_prepare_partial">◐ Indicar cantidad disponible</button>
    <button class="zx_btn_big zx_verde" id="tr_mat_prepare_ready">✓ Todo listo</button>
    <button class="zx_btn_big zx_gris" id="tr_mat_prepare_cancel">Cancelar</button>
  `);
  document.getElementById("tr_mat_prepare_pending").onclick=function(){establecerPreparacionMaterial(trabajoId,material,"pendiente")};
  document.getElementById("tr_mat_prepare_partial").onclick=function(){establecerPreparacionMaterial(trabajoId,material,"parcial")};
  document.getElementById("tr_mat_prepare_ready").onclick=function(){establecerPreparacionMaterial(trabajoId,material,"listo")};
  document.getElementById("tr_mat_prepare_cancel").onclick=function(){abrirListaMateriales(trabajoId)};
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

async function consolidarMaterialesDuplicados(trabajoId,lista){
  const origen=Array.isArray(lista) ? lista : [];
  if(origen.length<2) return origen;

  const grupos=new Map();
  origen.forEach(function(m){
    const clave=claveMaterial(m.nombre || m.material || "");
    if(!clave) return;
    if(!grupos.has(clave)) grupos.set(clave,[]);
    grupos.get(clave).push(m);
  });

  const salida=[];
  for(const items of grupos.values()){
    const ordenados=items.slice().sort(function(a,b){
      return String(a.created_at||"").localeCompare(String(b.created_at||""));
    });
    const principal=ordenados[0];
    if(items.length===1){salida.push(principal);continue;}

    const cantidadTotal=items.reduce(function(total,m){return total+Number(m.cantidad||0)},0);
    const nombre=principal.nombre || principal.material || "Material";
    const fusionado={
      ...principal,
      nombre:nombre,
      material:nombre,
      cantidad:cantidadTotal,
      unidad:items.map(m=>String(m.unidad||"").trim()).find(Boolean) || "ud",
      notas:items.map(m=>String(m.notas||"").trim()).find(Boolean) || "",
      referencia:items.map(m=>String(m.referencia||"").trim()).find(Boolean) || "",
      proveedor:items.map(m=>String(m.proveedor||"").trim()).find(Boolean) || "",
      fabricante:items.map(m=>String(m.fabricante||"").trim()).find(Boolean) || "",
      alias:items.map(m=>String(m.alias||"").trim()).find(Boolean) || "",
      precio_compra:items.map(m=>m.precio_compra).find(v=>v!==null&&v!==undefined&&v!=="") ?? null,
      precio_venta:items.map(m=>m.precio_venta).find(v=>v!==null&&v!==undefined&&v!=="") ?? null
    };
    salida.push(fusionado);

    // La interfaz queda consolidada inmediatamente. Después se persiste la limpieza.
    if(navigator.onLine && sb() && principal.id){
      try{
        const actualizado=await actualizarMaterialCompatible(principal.id,{
          nombre:fusionado.nombre,material:fusionado.material,cantidad:fusionado.cantidad,
          unidad:fusionado.unidad,notas:fusionado.notas,referencia:fusionado.referencia,
          proveedor:fusionado.proveedor,fabricante:fusionado.fabricante,alias:fusionado.alias,
          precio_compra:fusionado.precio_compra,precio_venta:fusionado.precio_venta
        });
        if(actualizado && actualizado.error) throw actualizado.error;

        for(const duplicado of ordenados.slice(1)){
          if(!duplicado.id) continue;
          const borrado=await sb().from("trabajos_materiales").delete().eq("id",String(duplicado.id));
          if(borrado && borrado.error) throw borrado.error;
        }
        await registrarHistorial(trabajoId,"material","Materiales duplicados reunidos: "+nombre+" ("+cantidadTotal+" "+fusionado.unidad+")",{material:nombre,cantidad:cantidadTotal,unidad:fusionado.unidad,consolidado:true});
      }catch(e){
        console.warn("No se pudo persistir la consolidación de materiales",e);
      }
    }
  }

  // Conserva también registros sin nombre, si existieran.
  origen.filter(m=>!claveMaterial(m.nombre || m.material || "")).forEach(m=>salida.push(m));
  return salida;
}

async function cambiarCantidadMaterial(trabajoId,material,cambio){
  const actual=Number(material.cantidad||0);
  const nueva=actual+Number(cambio||0);
  if(nueva<=0){
    if(!confirm("La cantidad quedará a cero. ¿Eliminar este material?")) return;
    return eliminarMaterial(trabajoId,material.id);
  }
  const preparada=Math.min(nueva,cantidadPreparadaMaterial(material));
  const r=await actualizarMaterialCompatible(material.id,{cantidad:nueva,notas:notasConPreparado(notasVisiblesMaterial(material),preparada,imagenMaterial(material)),preparado:preparada>=nueva&&nueva>0});
  if(r && r.error){alert("No se pudo cambiar la cantidad.\n\n"+mensajeError(r.error));return}
  await registrarHistorial(trabajoId,"material","Cantidad modificada: "+(material.nombre||material.material||"Material")+" ("+actual+" → "+nueva+" "+(material.unidad||"ud")+")",{material_id:material.id,cantidad_anterior:actual,cantidad:nueva,unidad:material.unidad||"ud"});
  await abrirListaMateriales(trabajoId);
}

async function establecerCantidadMaterial(trabajoId,material){
  const actual=Number(material.cantidad||0);
  const nombre=material.nombre||material.material||"Material";
  const entrada=prompt("Indica la cantidad de "+nombre+" ("+(material.unidad||"ud")+"):",String(actual));
  if(entrada===null) return;
  const normalizada=String(entrada).trim().replace(",",".");
  const nueva=Number(normalizada);
  if(!Number.isFinite(nueva) || nueva<0){
    alert("Introduce una cantidad válida igual o mayor que cero.");
    return;
  }
  if(nueva===actual) return;
  if(nueva===0){
    if(!confirm("La cantidad quedará a cero. ¿Eliminar este material?")) return;
    return eliminarMaterial(trabajoId,material.id);
  }
  const preparada=Math.min(nueva,cantidadPreparadaMaterial(material));
  const r=await actualizarMaterialCompatible(material.id,{cantidad:nueva,notas:notasConPreparado(notasVisiblesMaterial(material),preparada,imagenMaterial(material)),preparado:preparada>=nueva&&nueva>0});
  if(r && r.error){alert("No se pudo cambiar la cantidad.\n\n"+mensajeError(r.error));return}
  await registrarHistorial(trabajoId,"material","Cantidad fijada: "+nombre+" ("+actual+" → "+nueva+" "+(material.unidad||"ud")+")",{material_id:material.id,cantidad_anterior:actual,cantidad:nueva,unidad:material.unidad||"ud",edicion_directa:true});
  await abrirListaMateriales(trabajoId);
}

async function abrirListaMateriales(trabajoId){
  modal(`
    <div class="zx_tr_materials_header">
      <div>
        <h2>Materiales</h2>
        <p>Gestiona cantidades y preparación. Pulsa Pendiente, Parcial o Listo para cambiarlo.</p>
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

  let lista=await cargarMateriales(trabajoId);
  lista=await consolidarMaterialesDuplicados(trabajoId,lista);
  const box=document.getElementById("tr_material_list");
  if(!box) return;

  if(!lista.length){
    box.innerHTML=`<div class="zx_tr_empty_card">No hay materiales añadidos.</div>`;
    return;
  }

  box.innerHTML=lista.map(function(m){
    const nombre=m.nombre || m.material || "Material";
    const cantidad=[m.cantidad,m.unidad].filter(Boolean).join(" ");
    const prep=estadoPreparacionMaterial(m);
    const notasVisibles=notasVisiblesMaterial(m);
    return `
      <article class="zx_tr_material_item zx_tr_material_${prep.clave}">
        <div class="zx_tr_material_head">
          ${imagenMaterial(m) ? `<img class="zx_tr_material_thumb" src="${limpiar(imagenMaterial(m))}" alt="">` : `<div class="zx_tr_material_thumb zx_tr_material_thumb_empty">📦</div>`}
          <div class="zx_tr_material_info">
            <strong>${limpiar(nombre)}</strong>
            ${cantidad ? `<span>${limpiar(cantidad)}</span>` : ""}
            ${notasVisibles ? `<small>${limpiar(notasVisibles)}</small>` : ""}
          </div>
        </div>
        <button type="button" class="zx_tr_material_prepare zx_tr_prepare_${prep.clave}" data-material-prepare="${limpiar(m.id)}">
          <b>${prep.clave==="listo" ? "✓ Listo" : prep.clave==="parcial" ? "◐ Parcial" : "○ Pendiente"}</b>
          <span>${limpiar(prep.preparada)} de ${limpiar(prep.total)} ${limpiar(m.unidad||"ud")}${prep.falta>0 ? ` · faltan ${limpiar(prep.falta)}` : ""}</span>
        </button>
        ${puedeGestionar() ? `
          <div class="zx_tr_material_quick">
            <button type="button" class="zx_tr_qty_btn" data-material-minus="${limpiar(m.id)}" aria-label="Restar cantidad">−</button>
            <button type="button" class="zx_tr_qty_value" data-material-quantity="${limpiar(m.id)}" aria-label="Cambiar cantidad">${limpiar(m.cantidad ?? 0)} ${limpiar(m.unidad || "ud")}</button>
            <button type="button" class="zx_tr_qty_btn" data-material-plus="${limpiar(m.id)}" aria-label="Sumar cantidad">＋</button>
          </div>
          <div class="zx_tr_material_actions">
            <button type="button" class="blue" data-edit-material="${limpiar(m.id)}">✏️ Editar</button>
            <button type="button" class="red" data-delete-material="${limpiar(m.id)}">🗑️ Eliminar</button>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  box.querySelectorAll("[data-material-prepare]").forEach(function(btn){
    btn.onclick=function(){
      const m=lista.find(x=>String(x.id)===String(btn.dataset.materialPrepare));
      if(m) abrirEstadoPreparacionMaterial(trabajoId,m);
    };
  });
  box.querySelectorAll("[data-material-minus]").forEach(function(btn){
    btn.onclick=function(){const m=lista.find(x=>String(x.id)===String(btn.dataset.materialMinus));if(m)cambiarCantidadMaterial(trabajoId,m,-1)};
  });
  box.querySelectorAll("[data-material-plus]").forEach(function(btn){
    btn.onclick=function(){const m=lista.find(x=>String(x.id)===String(btn.dataset.materialPlus));if(m)cambiarCantidadMaterial(trabajoId,m,1)};
  });
  box.querySelectorAll("[data-material-quantity]").forEach(function(btn){
    btn.onclick=function(){const m=lista.find(x=>String(x.id)===String(btn.dataset.materialQuantity));if(m)establecerCantidadMaterial(trabajoId,m)};
  });
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
  const contenido=hist.length ? `
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
    </div>` : `<div class="zx_tr_empty mini">Todavía no hay actividad registrada.</div>`;

  return `
    <section class="zx_tr_block zx_tr_history_block">
      <button type="button" class="zx_tr_history_toggle" id="tr_history_toggle" aria-expanded="false">
        <span>Historial</span><b>${hist.length}</b><em>Ver historial</em>
      </button>
      <div class="zx_tr_history_panel" id="tr_history_panel" hidden>${contenido}</div>
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

function renderArchivos(lista,trabajoId){
  return `
    <div class="zx_tr_block">
      <div class="zx_tr_block_title">
        <h3>Archivos</h3>
        ${trabajoId ? `<button type="button" class="zx_doc_library_open" id="tr_open_doc_library">📚 Buscar en biblioteca</button>` : ""}
      </div>
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
      let imagenUrl=material ? imagenMaterial(material) : "";
      const imagenFile=imagenInput && imagenInput.files ? imagenInput.files[0] : null;
      if(imagenFile){
        if(boton) boton.textContent="Subiendo imagen...";
        imagenUrl=await subirImagenMaterial(imagenFile,id);
      }
      data.notas=notasConPreparado(
        data.notas,
        material ? cantidadPreparadaMaterial(material) : 0,
        imagenUrl
      );
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


function similitudMaterial(a,b){
  const x=normalizar(a).replace(/\s+/g," ").trim();
  const y=normalizar(b).replace(/\s+/g," ").trim();
  if(!x || !y) return 0;
  if(x===y) return 1;
  if(x.includes(y) || y.includes(x)) return Math.min(x.length,y.length)/Math.max(x.length,y.length)+0.2;
  const ax=new Set(x.split(" ").filter(Boolean));
  const ay=new Set(y.split(" ").filter(Boolean));
  const inter=[...ax].filter(v=>ay.has(v)).length;
  const union=new Set([...ax,...ay]).size || 1;
  return inter/union;
}

function textoBusquedaMaterial(x){
  return normalizar([x.nombre,x.alias,x.referencia,x.fabricante,x.proveedor].filter(Boolean).join(" "));
}

function marcarFavoritoMaterial(nombre,valor){
  const lista=leerBibliotecaMaterialesLocal();
  const clave=normalizar(nombre);
  let item=lista.find(x=>normalizar(x.nombre)===clave);
  if(!item){item={nombre:nombre,unidad:"ud",usos:0};lista.push(item)}
  item.favorito=Boolean(valor);
  item.actualizado=new Date().toISOString();
  guardarBibliotecaMaterialesLocal(lista);
}

async function abrirMaterial(id,material){
  material=material || null;
  modal(`
    <h2>${material ? "Editar material" : "Nuevo material"}</h2>
    <label class="zx_tr_label">Material</label>
    <div class="zx_tr_material_voice_row">
      <div class="zx_tr_autocomplete_wrap">
        <input id="tr_mat_nombre" autocomplete="off" placeholder="Empieza a escribir para buscar..." value="${limpiar(material ? (material.nombre || material.material || "") : "")}">
        <div id="tr_mat_sugerencias" class="zx_tr_autocomplete_list" hidden></div>
      </div>
      <button type="button" class="zx_tr_voice_btn" id="tr_mat_voz" aria-label="Dictar material">🎙️</button>
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
      <label class="zx_tr_label">Fabricante</label><input id="tr_mat_fabricante" value="${limpiar(material ? (material.fabricante || "") : "")}">
      <label class="zx_tr_label">Alias o palabras de búsqueda</label><input id="tr_mat_alias" placeholder="Ej.: llave media, válvula corte" value="${limpiar(material ? (material.alias || "") : "")}">
      <div class="zx_tr_grid2"><div><label class="zx_tr_label">Precio compra</label><input id="tr_mat_precio_compra" type="number" step="0.01" value="${limpiar(material && material.precio_compra!=null ? material.precio_compra : "")}"></div><div><label class="zx_tr_label">Precio venta</label><input id="tr_mat_precio_venta" type="number" step="0.01" value="${limpiar(material && material.precio_venta!=null ? material.precio_venta : "")}"></div></div>
      <label class="zx_tr_label">IVA (%)</label><input id="tr_mat_iva" type="number" step="0.01" value="${limpiar(material && material.iva!=null ? material.iva : "")}">
    </details>
    <label class="zx_tr_label">Imagen del producto (opcional)</label>
    <div class="zx_tr_material_image_form">
      <div id="tr_mat_image_preview" class="zx_tr_material_image_preview">
        ${material && imagenMaterial(material) ? `<img src="${limpiar(imagenMaterial(material))}" alt="">` : `<span>📷 Sin imagen</span>`}
      </div>
      <input id="tr_mat_imagen" type="file" accept="image/*" capture="environment">
    </div>
    <label class="zx_tr_label">Notas</label>
    <textarea id="tr_mat_notas" rows="3">${limpiar(material ? notasVisiblesMaterial(material) : "")}</textarea>
    <button class="zx_btn_big zx_verde" id="tr_mat_guardar">${material ? "Guardar cambios" : "Guardar material"}</button>
    <button class="zx_btn_big zx_gris" id="tr_mat_cancelar">Cancelar</button>
  `);

  document.getElementById("tr_mat_cancelar").onclick=function(){abrirListaMateriales(id)};
  const vozBtn=document.getElementById("tr_mat_voz");
  if(vozBtn) vozBtn.onclick=function(){iniciarDictadoMaterial("tr_mat_nombre")};
  const imagenInput=document.getElementById("tr_mat_imagen");
  if(imagenInput) imagenInput.onchange=function(){
    const file=imagenInput.files && imagenInput.files[0];
    if(!file) return;
    const preview=document.getElementById("tr_mat_image_preview");
    const reader=new FileReader();
    reader.onload=function(){if(preview) preview.innerHTML=`<img src="${reader.result}" alt="">`};
    reader.readAsDataURL(file);
  };

  const nombreInput=document.getElementById("tr_mat_nombre");
  const sugerenciasBox=document.getElementById("tr_mat_sugerencias");
  let biblioteca=await cargarBibliotecaMateriales();
  let materialSeleccionado=null;
  function pintarSugerencias(){
    const q=normalizar(nombreInput.value).trim();
    if(q.length<2){sugerenciasBox.hidden=true;sugerenciasBox.innerHTML="";return}
    const items=biblioteca
      .map(x=>{
        const n=normalizar(x.nombre);
        const t=textoBusquedaMaterial(x);
        let score=0;
        if(n===q) score=1000;
        else if(n.startsWith(q)) score=700;
        else if(n.split(/\s+/).some(p=>p.startsWith(q))) score=520;
        else if(t.includes(q)) score=350;
        score += x.favorito ? 150 : 0;
        score += Math.min(Number(x.usos||0),50)*3;
        return {...x,_match:score};
      })
      .filter(x=>x._match>0)
      .sort((a,b)=>b._match-a._match || String(b.ultimo_uso||"").localeCompare(String(a.ultimo_uso||"")) || String(a.nombre).localeCompare(String(b.nombre),"es"))
      .slice(0,10);
    const exacta=items.some(x=>normalizar(x.nombre)===q);
    const crear=!exacta ? `<button type="button" class="zx_tr_create_material" data-create-material="1"><strong>＋ Crear “${limpiar(nombreInput.value.trim())}”</strong><small>Se guardará en la biblioteca al añadirlo.</small></button>` : "";
    if(!items.length && !crear){sugerenciasBox.hidden=true;return}
    sugerenciasBox.innerHTML=items.map((x,i)=>`<div class="zx_tr_suggestion_row"><button type="button" class="zx_tr_suggestion_pick" data-mat-sug="${i}"><strong>${x.favorito?"⭐ ":""}${limpiar(x.nombre)}</strong><small>${limpiar([x.unidad,x.referencia,x.fabricante,x.proveedor].filter(Boolean).join(" · "))}${x.usos ? ` · usado ${x.usos} veces` : ""}</small></button><button type="button" class="zx_tr_suggestion_star" data-mat-star="${i}" aria-label="Favorito">${x.favorito?"★":"☆"}</button></div>`).join("")+crear;
    sugerenciasBox.hidden=false;
    sugerenciasBox.querySelectorAll("[data-mat-sug]").forEach(btn=>btn.onclick=function(){
      const x=items[Number(btn.dataset.matSug)]; if(!x)return;
      materialSeleccionado=x;
      nombreInput.value=x.nombre || "";
      document.getElementById("tr_mat_unidad").value=x.unidad || "ud";
      document.getElementById("tr_mat_referencia").value=x.referencia || "";
      document.getElementById("tr_mat_proveedor").value=x.proveedor || "";
      document.getElementById("tr_mat_fabricante").value=x.fabricante || "";
      document.getElementById("tr_mat_alias").value=x.alias || "";
      document.getElementById("tr_mat_iva").value=x.iva ?? "";
      document.getElementById("tr_mat_precio_compra").value=x.precio_compra ?? "";
      document.getElementById("tr_mat_precio_venta").value=x.precio_venta ?? "";
      sugerenciasBox.hidden=true;
    });
    sugerenciasBox.querySelectorAll("[data-mat-star]").forEach(btn=>btn.onclick=async function(ev){
      ev.stopPropagation();
      const x=items[Number(btn.dataset.matStar)]; if(!x)return;
      marcarFavoritoMaterial(x.nombre,!x.favorito);
      biblioteca=await cargarBibliotecaMateriales();
      pintarSugerencias();
    });
    const crearBtn=sugerenciasBox.querySelector("[data-create-material]");
    if(crearBtn) crearBtn.onclick=function(){materialSeleccionado=null;sugerenciasBox.hidden=true;document.getElementById("tr_mat_cantidad").focus()};
  }
  nombreInput.addEventListener("input",pintarSugerencias);
  setTimeout(()=>document.addEventListener("click",function cerrarSug(ev){if(!ev.target.closest(".zx_tr_autocomplete_wrap")){sugerenciasBox.hidden=true;document.removeEventListener("click",cerrarSug)}},true),0);

  document.getElementById("tr_mat_guardar").onclick=async function(){
    const nombre=valor("tr_mat_nombre");
    if(!nombre){alert("Introduce material.");return}

    const similares=biblioteca.filter(x=>normalizar(x.nombre)!==normalizar(nombre) && similitudMaterial(x.nombre,nombre)>=0.72).slice(0,3);
    if(!material && similares.length){
      const aviso="Puede que este material ya exista:\n\n"+similares.map(x=>"• "+x.nombre).join("\n")+"\n\n¿Quieres guardar uno nuevo de todas formas?";
      if(!confirm(aviso)) return;
    }

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
      fabricante:valor("tr_mat_fabricante"),
      alias:valor("tr_mat_alias"),
      iva:valor("tr_mat_iva")!=="" ? Number(valor("tr_mat_iva")) : null,
      precio_compra:valor("tr_mat_precio_compra")!=="" ? Number(valor("tr_mat_precio_compra")) : null,
      precio_venta:valor("tr_mat_precio_venta")!=="" ? Number(valor("tr_mat_precio_venta")) : null,
      preparado:false,
      created_at:new Date().toISOString()
    };

    const boton=document.getElementById("tr_mat_guardar");
    if(boton){boton.disabled=true;boton.textContent="Guardando...";}

    try{
      let r;
      let materialAcumulado=false;
      let cantidadAnterior=0;
      let cantidadFinal=data.cantidad;

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
        let materialesTrabajo=await cargarMateriales(id);
        materialesTrabajo=await consolidarMaterialesDuplicados(id,materialesTrabajo);
        const claveNueva=claveMaterial(nombre);
        const iguales=materialesTrabajo.filter(function(m){
          return claveMaterial(m.nombre || m.material || "")===claveNueva;
        });

        if(iguales.length){
          const principal=iguales[0];
          cantidadAnterior=iguales.reduce(function(total,m){
            return total + Number(m.cantidad || 0);
          },0);
          cantidadFinal=cantidadAnterior + Number(data.cantidad || 0);

          const cambios={
            nombre:nombre,
            material:nombre,
            cantidad:cantidadFinal,
            unidad:data.unidad || principal.unidad || "ud",
            notas:data.notas || principal.notas || "",
            referencia:data.referencia || principal.referencia || "",
            proveedor:data.proveedor || principal.proveedor || "",
            precio_compra:data.precio_compra ?? principal.precio_compra ?? null,
            precio_venta:data.precio_venta ?? principal.precio_venta ?? null
          };
          r=await actualizarMaterialCompatible(principal.id,cambios);
          if(r && r.error) throw r.error;

          const duplicados=iguales.slice(1).map(function(m){return String(m.id)}).filter(Boolean);
          if(duplicados.length && sb()){
            const borrado=await sb().from("trabajos_materiales").delete().in("id",duplicados);
            if(borrado && borrado.error) throw borrado.error;
          }
          materialAcumulado=true;
        }else{
          r=await insertarMaterialCompatible(data);
        }
      }
      if(r && r.error) throw r.error;

      aprenderMaterial({...data,cantidad:cantidadFinal});
      const textoHistorial=material
        ? "Material actualizado: "+nombre
        : materialAcumulado
          ? "Cantidad aumentada: "+nombre+" ("+cantidadAnterior+" → "+cantidadFinal+" "+data.unidad+")"
          : "Material añadido: "+nombre;
      await registrarHistorial(id,"material",textoHistorial,{
        material:nombre,cantidad:cantidadFinal,cantidad_anterior:cantidadAnterior,unidad:data.unidad,notas:data.notas,referencia:data.referencia,proveedor:data.proveedor,fabricante:data.fabricante,alias:data.alias,iva:data.iva,acumulado:materialAcumulado
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

(function(){
  const st=document.createElement("style");
  st.textContent=`.zx_tr_material_quick{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0}.zx_tr_qty_btn{width:54px;height:46px;border:1px solid #b7d5ff;border-radius:14px;background:#eef6ff;color:#0b2454;font-size:28px;font-weight:900;line-height:1}.zx_tr_qty_value{min-width:110px;border:0;background:transparent;text-align:center;color:#155bd7;font-size:18px;font-weight:950;padding:8px 6px;border-radius:12px;cursor:pointer}.zx_tr_qty_value:active{background:#e6f0ff}`;
  document.head.appendChild(st);
})();
window.ZX_tr_material=function(id){abrirListaMateriales(id)};
window.ZX_tr_archivo=function(id){abrirArchivo(id)};
window.ZX_tr_file_menu=function(archivoId,trabajoId){abrirMenuArchivo(archivoId,trabajoId)};
window.ZX_tr_gestionar=function(id){gestionarTrabajo(id)};
window.ZX_tr_nota=function(id){registrarNotaRapida(id)};
window.ZX_tr_parte=function(id){abrirParteJornada(id)};

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
    .zx_tr_execution_panel{border:2px solid #60a5fa;border-radius:20px;padding:15px;background:linear-gradient(135deg,#eff6ff,#dbeafe)}
    .zx_tr_execution_head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .zx_tr_execution_head span{display:block;font-size:12px;font-weight:900;color:#1d4ed8;text-transform:uppercase}
    .zx_tr_execution_head strong{display:block;font-size:34px;line-height:1.1;color:#0f172a;font-variant-numeric:tabular-nums}
    .zx_tr_execution_sync{font-size:12px;font-weight:950;color:#047857;background:#d1fae5;border-radius:999px;padding:7px 10px;white-space:nowrap}
    .zx_tr_execution_grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}
    .zx_tr_execution_grid>div{padding:10px;border-radius:14px;background:rgba(255,255,255,.78);min-width:0}
    .zx_tr_execution_grid small{display:block;color:#64748b;font-weight:800;font-size:11px}
    .zx_tr_execution_grid b{display:block;color:#0f172a;font-size:14px;overflow-wrap:anywhere}
    .zx_tr_plan_toggle{width:100%;border:0;border-radius:17px;padding:14px;background:#f8fafc;display:grid;grid-template-columns:1fr auto;gap:3px 10px;text-align:left;color:#0f172a}
    .zx_tr_plan_toggle span{font-size:18px;font-weight:950}
    .zx_tr_plan_toggle b{font-size:13px;color:#2563eb}
    .zx_tr_plan_toggle em{grid-column:1/-1;font-style:normal;font-size:12px;font-weight:800;color:#64748b}
    .zx_tr_plan_toggle[aria-expanded="true"]{background:#eff6ff}
    .zx_tr_plan_panel{padding-top:10px}
    .zx_tr_plan_panel[hidden]{display:none!important}
    .zx_tr_full_header{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:#fff;padding:8px 0 12px;border-bottom:1px solid #e2e8f0}
    .zx_tr_full_header h2{margin:0!important;min-width:0;overflow-wrap:anywhere}
    .zx_tr_back_agenda{border:1px solid #bfdbfe;border-radius:12px;padding:9px 11px;background:#eff6ff;color:#1d4ed8;font-weight:950;white-space:nowrap}
    .zx_tr_full_state{border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap}
    #zx_modal_trabajo.zx_tr_fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;padding:0!important;margin:0!important;align-items:stretch!important;justify-content:stretch!important;background:#fff!important;z-index:999999!important}
    #zx_modal_trabajo.zx_tr_fullscreen .zx_modal_caja{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border-radius:0!important;padding:calc(10px + env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))!important;box-shadow:none!important;overflow-y:auto!important;overflow-x:hidden!important}
    @media(min-width:900px){
      #zx_modal_trabajo.zx_tr_fullscreen .zx_modal_caja{padding-left:max(28px,env(safe-area-inset-left))!important;padding-right:max(28px,env(safe-area-inset-right))!important}
      #zx_modal_trabajo.zx_tr_fullscreen .zx_tr_operativo{max-width:1180px;margin:0 auto}
    }
    @media(max-width:520px){
      .zx_tr_full_header{grid-template-columns:auto minmax(0,1fr)}
      .zx_tr_full_state{grid-column:1/-1;width:max-content}
      .zx_tr_back_agenda{padding:8px 9px}
    }
    .zx_tr_hold_mic{width:100%;border:2px solid #bfdbfe;border-radius:16px;padding:13px;background:#eff6ff;color:#1d4ed8;font-weight:950;margin-bottom:10px}
    .zx_tr_hold_mic.escuchando{background:#fee2e2;border-color:#f87171;color:#b91c1c;transform:scale(.99)}

    .zx_tr_dictation_actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:stretch;margin-bottom:10px}
    .zx_tr_dictation_actions .zx_tr_hold_mic{margin:0}
    .zx_tr_clear_text{border:1px solid #fecaca;border-radius:16px;padding:12px 14px;background:#fff1f2;color:#b91c1c;font-weight:950;white-space:nowrap}
    @media(max-width:520px){
      .zx_tr_dictation_actions{grid-template-columns:1fr}
      .zx_tr_clear_text{width:100%}
    }


    .zx_tr_quick_part{grid-column:1/-1;background:#f5f3ff!important;border-color:#c4b5fd!important;color:#6d28d9!important}
    .zx_tr_part_photo_row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px;align-items:center}
    .zx_tr_part_photo_row select,.zx_tr_part_photo_row input{width:100%;box-sizing:border-box}
    .zx_tr_signature_title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px}
    .zx_tr_signature_title button{border:1px solid #fecaca;border-radius:10px;padding:7px 10px;background:#fff1f2;color:#b91c1c;font-weight:900}
    .zx_tr_signature_canvas{display:block;width:100%;height:190px;border:2px dashed #93c5fd;border-radius:16px;background:#fff;touch-action:none;margin-bottom:12px}
    .zx_tr_parts_toggle{width:100%;border:0;border-radius:17px;padding:14px;background:#f8fafc;display:grid;grid-template-columns:1fr auto;gap:3px 10px;text-align:left;color:#0f172a}
    .zx_tr_parts_toggle span{font-size:18px;font-weight:950}
    .zx_tr_parts_toggle b{font-size:13px;color:#2563eb}
    .zx_tr_parts_toggle em{grid-column:1/-1;font-style:normal;font-size:12px;font-weight:800;color:#64748b}
    .zx_tr_parts_panel[hidden]{display:none!important}
    .zx_tr_parts_panel{display:grid;gap:10px;padding-top:10px}
    .zx_tr_part_item{display:grid;gap:6px;padding:13px;border:1px solid #dbe4ef;border-radius:15px;background:#fff}
    .zx_tr_part_item p{margin:0;font-weight:800;color:#0f172a;white-space:pre-wrap}
    .zx_tr_part_item small{color:#64748b;font-weight:750}
    .zx_tr_part_item img{width:100%;max-height:120px;object-fit:contain;border:1px solid #e2e8f0;border-radius:12px;background:#fff}

    #zx_modal_trabajo.zx_tr_part_fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;margin:0!important;padding:0!important;align-items:stretch!important;justify-content:stretch!important;background:#fff!important;z-index:1000000!important}
    #zx_modal_trabajo.zx_tr_part_fullscreen .zx_modal_caja{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border-radius:0!important;box-shadow:none!important;overflow-y:auto!important;overflow-x:hidden!important;padding:calc(12px + env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))!important}
    .zx_tr_part_full_header{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;padding:8px 0 14px;margin-bottom:16px;background:#fff;border-bottom:1px solid #e2e8f0}
    .zx_tr_part_full_header h2{margin:0!important}
    .zx_tr_part_full_header p{margin:3px 0 0;color:#64748b;font-weight:800}
    .zx_tr_part_back{border:1px solid #bfdbfe;border-radius:13px;padding:10px 12px;background:#eff6ff;color:#1d4ed8;font-weight:950;white-space:nowrap}
    .zx_tr_part_photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
    .zx_tr_part_photos figure{margin:0;display:grid;gap:5px}
    .zx_tr_part_photos img{width:100%;height:150px;max-height:none;object-fit:cover}
    .zx_tr_part_photos figcaption{font-size:11px;color:#64748b;font-weight:750}
    .zx_tr_part_signer{font-size:13px;color:#334155!important}
    .zx_tr_part_signature{display:grid;gap:6px;padding:10px;border:1px solid #dbe4ef;border-radius:13px;background:#f8fafc}
    .zx_tr_part_signature span{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}
    .zx_tr_part_signature img{width:100%;height:110px;max-height:none;object-fit:contain;background:#fff}
    @media(min-width:900px){
      #zx_modal_trabajo.zx_tr_part_fullscreen .zx_modal_caja{padding-left:max(32px,env(safe-area-inset-left))!important;padding-right:max(32px,env(safe-area-inset-right))!important}
    }

    @media(max-width:520px){.zx_tr_part_photo_row{grid-template-columns:1fr}}

    @media(max-width:480px){
      .zx_tr_execution_grid{grid-template-columns:1fr}
      .zx_tr_execution_head strong{font-size:29px}
    }


    .zx_tr_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_tr_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_tr_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_tr_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_tr_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_tr_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_tr_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_tr_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center;min-width:0}
    .zx_tr_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_tr_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px;white-space:nowrap}
    .zx_tr_toolbar{display:grid;grid-template-columns:1fr;gap:10px;min-width:0}
    .zx_tr_back{border:0;border-radius:18px;background:#dbeafe;color:#1d4ed8;padding:13px;font-size:15px;font-weight:950;text-align:left}
    .zx_tr_search{position:relative}
    .zx_tr_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_tr_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_tr_filters{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 5px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;min-width:0}
    .zx_tr_filters::-webkit-scrollbar{display:none}
    .zx_tr_filters button{flex:0 0 auto;scroll-snap-align:start;border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:9px 11px;font-size:12px;font-weight:950;white-space:nowrap}
    .zx_tr_filters button.on{background:#2563eb;color:white}
    .zx_tr_filters button b{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:rgba(15,23,42,.08);font-size:11px}
    .zx_tr_filters button.on b{background:rgba(255,255,255,.22);color:white}
    .zx_tr_date_filters{display:grid;gap:8px;min-width:0}
    .zx_tr_date_range{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
    .zx_tr_date_quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .zx_tr_date_filters label{display:grid;gap:5px;font-size:12px;font-weight:900;color:#64748b;min-width:0}
    .zx_tr_date_filters input{box-sizing:border-box;min-width:0;width:100%;border:1px solid #dbe3ef;border-radius:14px;padding:10px 7px;background:#fff;color:#0f172a;font-weight:800;font-size:13px}
    .zx_tr_date_filters button,.zx_tr_monitor_btn{border:1px solid #bfdbfe;border-radius:14px;padding:10px 8px;background:#eff6ff;color:#1d4ed8;font-weight:950;min-width:0}
    .zx_tr_monitor_btn{width:100%;display:flex;align-items:center;justify-content:center;gap:7px}
    .zx_tr_toolbar_tools{display:grid;grid-template-columns:1fr;gap:8px}
    .zx_tr_library_btn{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid #c4b5fd;border-radius:14px;padding:10px 8px;background:#f5f3ff;color:#6d28d9;font-weight:950}
    .zx_doc_search_wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-bottom:12px}
    .zx_doc_search_wrap input,.zx_doc_search_wrap select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:14px;padding:13px;background:#fff;font-size:15px}
    .zx_doc_results{display:grid;gap:10px;max-height:60vh;overflow:auto;padding-right:2px}
    .zx_doc_card{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;padding:12px;border:1px solid #dbe4ef;border-radius:18px;background:#fff}
    .zx_doc_preview{width:76px;height:76px;border-radius:14px;overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center}
    .zx_doc_preview .zx_tr_file_thumb{width:100%;height:100%;object-fit:cover}
    .zx_doc_preview .zx_tr_file_icon{font-size:32px}
    .zx_doc_content{min-width:0;display:grid;gap:5px}
    .zx_doc_content>strong{font-size:15px;color:#0f172a;overflow-wrap:anywhere}
    .zx_doc_content>span,.zx_doc_content>small{font-size:12px;color:#64748b;overflow-wrap:anywhere}
    .zx_doc_top{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .zx_doc_top small{font-size:10px;color:#94a3b8}
    .zx_doc_category{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:950;background:#eef2ff;color:#3730a3}
    .zx_doc_actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px}
    .zx_doc_actions button,.zx_doc_library_open{border:1px solid #bfdbfe;border-radius:11px;padding:8px;background:#eff6ff;color:#1d4ed8;font-weight:900}
    .zx_doc_actions button:disabled{background:#f1f5f9;color:#94a3b8;border-color:#e2e8f0}
    .zx_doc_attach{background:#ecfdf5!important;color:#047857!important;border-color:#a7f3d0!important}
    .zx_doc_library_open{padding:7px 9px;font-size:11px}
    @media(min-width:760px){
      .zx_tr_toolbar_tools{grid-template-columns:auto auto;justify-content:end}
      .zx_tr_library_btn,.zx_tr_monitor_btn{width:auto}
      .zx_doc_search_wrap{grid-template-columns:minmax(0,1fr) 230px}
      .zx_doc_results{grid-template-columns:repeat(2,minmax(0,1fr))}
    }

    .zx_tr_toolbar_bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    @media(min-width:760px){.zx_tr_date_filters{grid-template-columns:minmax(360px,1fr) auto;align-items:end}.zx_tr_date_quick{grid-template-columns:repeat(3,auto)}.zx_tr_monitor_btn{width:auto;justify-self:end}}
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
    .zx_tr_card_plan{display:grid;gap:7px;padding:11px;border:1px solid #dbe4ef;border-radius:15px;background:#fff}
    .zx_tr_card_plan_title{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .zx_tr_card_plan_title>b{font-size:12px;color:#64748b}
    .zx_tr_card_plan_title>span{font-size:11px;font-weight:900;color:#2563eb}
    .zx_tr_card_jornada{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 8px;border-radius:10px;background:#f8fafc}
    .zx_tr_card_jornada>span{font-size:12px;font-weight:900;color:#0f172a}
    .zx_tr_jornada_estado{font-size:9px;padding:4px 6px;border-radius:999px;white-space:nowrap}
    .zx_tr_jornada_activo{background:#fff7ed;color:#9a3412}
    .zx_tr_jornada_en_curso{background:#dbeafe;color:#1d4ed8}
    .zx_tr_jornada_completado{background:#dcfce7;color:#166534}
    .zx_tr_jornada_cancelado{background:#fee2e2;color:#b91c1c}
    .zx_tr_card_more{font-size:10px;color:#64748b;font-weight:750}
    @media(max-width:600px){.zx_tr_card_jornada_extra{display:none}}

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
    .zx_tr_plan_days{display:grid;gap:12px}
    .zx_tr_plan_day{border:1px solid #dbe4ef;border-radius:18px;padding:14px;background:#f8fbff}
    .zx_tr_plan_day_head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
    .zx_tr_plan_day_head strong{font-size:17px;color:#061631}
    .zx_tr_plan_remove{border:1px solid #fecaca;border-radius:10px;padding:7px 9px;background:#fff1f2;color:#b91c1c;font-weight:900}
    .zx_tr_plan_add{width:100%;border:2px dashed #93c5fd;border-radius:16px;padding:13px;background:#eff6ff;color:#1d4ed8;font-weight:950}
    .zx_tr_help{margin:0;color:#64748b;font-weight:750;font-size:13px;line-height:1.4}

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
    .zx_tr_add_material{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;min-width:128px;min-height:48px;border:0;border-radius:16px;background:#16a34a;color:#fff;padding:11px 16px;font-size:15px;font-weight:950;line-height:1.1;white-space:nowrap;box-shadow:0 5px 14px rgba(22,163,74,.18)}
    #tr_material_list{display:grid;gap:10px;margin:16px 0}.zx_tr_material_item{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:13px}.zx_tr_material_info{display:grid;gap:4px}.zx_tr_material_info strong{color:#071330;font-size:17px;font-weight:950}.zx_tr_material_info span{color:#2563eb;font-size:14px;font-weight:900}.zx_tr_material_info small{color:#64748b;font-size:13px;font-weight:800;line-height:1.35}
    .zx_tr_material_prepare{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-radius:16px;border:2px solid transparent;margin-top:10px;text-align:left}
    .zx_tr_material_prepare b{font-size:15px}
    .zx_tr_material_prepare span{font-size:12px;font-weight:800;text-align:right}
    .zx_tr_prepare_pendiente{background:#fff7ed;border-color:#fdba74;color:#9a3412}
    .zx_tr_prepare_parcial{background:#fef9c3;border-color:#facc15;color:#854d0e}
    .zx_tr_prepare_listo{background:#dcfce7;border-color:#4ade80;color:#166534}
    .zx_tr_material_pendiente{border-left:7px solid #f97316}
    .zx_tr_material_parcial{border-left:7px solid #eab308}
    .zx_tr_material_listo{border-left:7px solid #22c55e;background:#f0fdf4}
    .zx_tr_material_prepare_summary{display:grid;gap:8px;padding:15px;border:1px solid #dbe4ef;border-radius:18px;background:#f8fafc;margin-bottom:12px}
    .zx_tr_material_prepare_summary strong{font-size:21px;color:#061631}
    .zx_tr_material_prepare_summary span{font-weight:800;color:#64748b}

    .zx_tr_material_head{display:flex;align-items:flex-start;gap:12px}
    .zx_tr_material_thumb{width:70px;height:70px;border-radius:16px;object-fit:cover;flex:0 0 70px;border:1px solid #d8e3ef;background:#fff}
    .zx_tr_material_thumb_empty{display:flex;align-items:center;justify-content:center;font-size:31px;background:#eef6ff}
    .zx_tr_material_voice_row{display:grid;grid-template-columns:minmax(0,1fr) 64px;gap:10px;align-items:start}
    .zx_tr_voice_btn{height:64px;border:2px solid #bfdbfe;border-radius:18px;background:#eff6ff;font-size:28px}
    .zx_tr_material_image_form{display:grid;gap:10px;margin-bottom:18px}
    .zx_tr_material_image_preview{height:150px;border:2px dashed #bfdbfe;border-radius:18px;background:#f8fbff;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#64748b;font-weight:800}
    .zx_tr_material_image_preview img{width:100%;height:100%;object-fit:contain}
    .zx_tr_material_prepare{display:flex!important;visibility:visible!important;opacity:1!important}
    .zx_tr_material_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.zx_tr_material_actions button{border:0;border-radius:13px;padding:10px;font-size:13px;font-weight:950}.zx_tr_material_actions .blue{background:#dbeafe;color:#1d4ed8}.zx_tr_material_actions .red{background:#fee2e2;color:#b91c1c}.zx_tr_empty_card{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:18px;padding:22px;text-align:center;color:#64748b;font-weight:900}
    .zx_tr_history_block{padding:0;overflow:hidden}
    .zx_tr_history_toggle{display:grid;width:100%;grid-template-columns:1fr auto;gap:4px 14px;align-items:center;padding:20px 22px;border:0;background:transparent;text-align:left;cursor:pointer;font:inherit}
    .zx_tr_history_toggle span{color:#071330;font-size:22px;font-weight:950}
    .zx_tr_history_toggle b{color:#2563eb;font-size:16px;font-weight:950}
    .zx_tr_history_toggle em{grid-column:1/-1;color:#2563eb;font-size:13px;font-style:normal;font-weight:950}
    .zx_tr_history_panel[hidden]{display:none!important}
    .zx_tr_history_list{display:grid;gap:10px;margin-top:0;padding:0 14px 16px}
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

    .zx_tr_autocomplete_wrap{position:relative}.zx_tr_autocomplete_list{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:30;max-height:280px;overflow:auto;background:#fff;border:1px solid #b9d2f3;border-radius:16px;padding:6px;box-shadow:0 14px 30px rgba(15,35,72,.18)}.zx_tr_autocomplete_list button{display:grid;width:100%;gap:3px;text-align:left;border:0;background:#fff;padding:11px;border-radius:11px}.zx_tr_suggestion_row{display:grid;grid-template-columns:minmax(0,1fr) 48px;align-items:stretch;border-bottom:1px solid #eef2f7}.zx_tr_suggestion_pick{min-width:0}.zx_tr_suggestion_star{display:flex!important;align-items:center;justify-content:center!important;font-size:24px!important;color:#f59e0b!important;padding:6px!important}.zx_tr_create_material{border-top:1px solid #dbeafe!important;background:#eff6ff!important;color:#1d4ed8!important}.zx_tr_autocomplete_list button:active{background:#eff6ff}.zx_tr_autocomplete_list strong{color:#071330;font-size:15px}.zx_tr_autocomplete_list small{color:#64748b;font-size:12px;font-weight:800}.zx_tr_material_extra{margin-top:12px;border:1px solid #dbe3ef;border-radius:16px;padding:10px 12px;background:#fff}.zx_tr_material_extra summary{color:#334155;font-weight:950;cursor:pointer}.zx_tr_smart_block{border-color:#c4b5fd;background:#faf5ff}.zx_tr_smart_materials{border-color:#86efac;background:#f0fdf4}.zx_tr_smart_help{color:#64748b;font-size:13px;font-weight:800;line-height:1.4}.zx_tr_smart_list{display:grid;gap:8px;margin:12px 0}.zx_tr_smart_item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;background:#fff;border:1px solid #ddd6fe;border-radius:14px;padding:11px}.zx_tr_smart_item input{width:22px!important;height:22px;accent-color:#7c3aed}.zx_tr_smart_item span{display:grid;gap:3px;min-width:0}.zx_tr_smart_item strong{color:#071330;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zx_tr_smart_item small{color:#64748b;font-size:11px;font-weight:800}.zx_tr_notes_block{background:#fffbeb;border-color:#fde68a}.zx_tr_note_visible{background:#fff;border:1px solid #fde68a;border-radius:14px;padding:11px;margin-top:9px}.zx_tr_note_visible p{margin:0;color:#334155;font-size:14px;font-weight:800;line-height:1.4;white-space:pre-wrap}.zx_tr_note_visible small{display:block;margin-top:7px;color:#92400e;font-size:11px;font-weight:850}
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

    @media(max-width:699px){
      .zx_tr_shell{gap:10px}
      .zx_tr_panel{padding:13px;border-radius:22px}
      .zx_tr_kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:0 0 9px}
      .zx_tr_kpis div{padding:8px 2px;border-radius:13px}
      .zx_tr_kpis b{font-size:19px}
      .zx_tr_kpis span{font-size:9px;margin-top:4px;overflow:hidden;text-overflow:ellipsis}
      .zx_tr_search input{padding:12px 43px 12px 13px!important;font-size:14px}
      .zx_tr_date_filters{gap:6px}
      .zx_tr_date_range,.zx_tr_date_quick{gap:6px}
      .zx_tr_date_filters label{font-size:10px;gap:3px}
      .zx_tr_date_filters input{padding:8px 5px;border-radius:12px;font-size:12px}
      .zx_tr_date_filters button,.zx_tr_monitor_btn{padding:9px 6px;border-radius:12px;font-size:12px}
      .zx_tr_filters{margin-inline:-2px}
      .zx_tr_resume{font-size:12px}
      .zx_tr_list_head{margin-bottom:9px}
      .zx_tr_list_head h3{font-size:23px}
    }
    @media(max-width:390px){.zx_tr_panel{padding:15px;border-radius:22px}.zx_tr_header h2{font-size:27px}.zx_tr_actions,.zx_tr_ficha_actions{grid-template-columns:1fr}.zx_tr_kpis{grid-template-columns:1fr 1fr}.zx_tr_top h3{font-size:19px}}
    @media(min-width:700px){.zx_tr_shell{padding-bottom:32px}.zx_tr_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_tr_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_tr_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_tr_info.ficha{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_tr_panel{padding:22px}.zx_tr_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}


if(!window.__ZX_TRABAJOS_REALTIME_LISTENER){
  window.__ZX_TRABAJOS_REALTIME_LISTENER=true;
  window.addEventListener("zentryx:trabajos:actualizar",async function(ev){
    const id=String(ev?.detail?.trabajo_id || "");
    if(!id) return;
    ZX_TR_CACHE=ZX_TR_CACHE.filter(function(x){return String(x.id)!==id});
    guardarCache(ZX_TR_CACHE);
    if(modoTrabajoUnico() && String(window.ZX_TRABAJO_ABRIR_ID || "")===id){
      try{await abrirFicha(id)}catch(e){}
    }
  });
}

window.ZX_trabajos=async function(){
  instalarCSS();

  const entradaDesdeAgenda=window.ZX_TRABAJO_DESDE_AGENDA===true;
  window.ZX_TRABAJO_DESDE_AGENDA=false;
  if(!entradaDesdeAgenda && modoTrabajoUnico()){
    salirTrabajoUnico();
  }

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
