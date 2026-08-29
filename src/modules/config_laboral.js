// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3063 - CABECERA MOVIL COMPLETA + AJUSTES VISUALES
// V3064 - UNIDADES VISIBLES EN CANTIDADES LABORALES
// V3065 - CATALOGO DE CONVENIOS + SELECCION PRINCIPAL
// V3067 - PUBLICACION OFICIAL + SUBIDA PDF + ACCIONES DE DOCUMENTO
// V3070 - SELECTORES REGCON/DOCUMENTO PROPIOS PARA IPHONE
// V3071 - GUARDADO REAL INMEDIATO DEL CATALOGO DE CONVENIOS
// V3072 - ESTADO REGCON GUARDADO DESDE EL SELECTOR VISUAL
// V3073 - DESCARGA PDF CON CONTENT-DISPOSITION EN SUPABASE
// V3074 - DESCARGA IPHONE COMO ARCHIVO + GUARDAR EN ARCHIVOS
// V3075 - IMPRESION IPHONE DESDE HOJA NATIVA CON PDF
// ===============================
(function(){
"use strict";

const ZX_VERSION="3075";
function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function laboral(){return window.ZENTRYX_LABORAL || null}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}
function empresaId(){const x=sesion();return String(x.empresa_id||"demo").trim()||"demo"}
function limpiar(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalizar(v){return String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function formatoFechaES(f){if(!f)return"";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:String(f)}
function anioActual(){return new Date().getFullYear()}
function num(v,def=0){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:def}

const CONVENIOS_SUGERIDOS=["Metal","Construcción","Oficinas","Fontanería","Climatización","Electricidad","Comercio","Hostelería","Transporte","Otro / personalizado"];
const REGCON_URL="https://expinterweb.mites.gob.es/regcon/pub/consultaPublicaEstat?language=es";
const CONVENIO_DOC_BUCKET="zentryx-usuarios-docs";
const PAISES_SUGERIDOS=["España","Portugal","Francia","Italia","Alemania","Andorra","Reino Unido","Irlanda","Bélgica","Países Bajos","Suiza"];

let conveniosEdicion=[];
function idConvenioLocal(nombre){return normalizar(nombre).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || ("conv-"+Date.now())}
function convenioLimpio(c,idx=0){
  const x=c&&typeof c==="object"?c:{};const nombre=String(x.nombre||x.convenio||"").trim();if(!nombre)return null;
  return {id:String(x.id||idConvenioLocal(nombre)+"-"+(idx+1)),nombre,referencia:String(x.referencia||x.convenio_referencia||"").trim(),vigencia_desde:String(x.vigencia_desde||x.convenio_vigencia_desde||"").slice(0,10),vigencia_hasta:String(x.vigencia_hasta||x.convenio_vigencia_hasta||"").slice(0,10),verificado:x.verificado===true||x.convenio_verificado===true,fuente_url:String(x.fuente_url||x.regcon_url||x.convenio_fuente_url||"").trim(),documento_url:String(x.documento_url||x.pdf_url||x.convenio_documento_url||"").trim(),documento_nombre:String(x.documento_nombre||x.convenio_documento_nombre||"").trim(),documento_path:String(x.documento_path||x.convenio_documento_path||"").trim(),documento_origen:String(x.documento_origen||x.convenio_documento_origen||"").trim(),publicacion_url:String(x.publicacion_url||x.convenio_publicacion_url||"").trim(),ambito:String(x.ambito||x.convenio_ambito||"").trim(),autoridad_laboral:String(x.autoridad_laboral||x.convenio_autoridad_laboral||"").trim(),vacaciones:num(x.vacaciones,30),vacaciones_tipo:String(x.vacaciones_tipo||"naturales")==="laborables"?"laborables":"naturales",asuntos_horas:num(x.asuntos_horas,0)};
}
function catalogoDesdeConfig(c){
  let lista=[];try{if(laboral()?.normalizarConvenios)lista=laboral().normalizarConvenios(c)}catch(e){}
  if(!lista.length && Array.isArray(c?.convenios))lista=c.convenios.map(convenioLimpio).filter(Boolean);
  if(!lista.length && String(c?.convenio||"").trim())lista=[convenioLimpio({id:"principal",nombre:c.convenio,referencia:c.convenio_referencia,vigencia_desde:c.convenio_vigencia_desde,vigencia_hasta:c.convenio_vigencia_hasta,verificado:c.convenio_verificado,fuente_url:c.convenio_fuente_url,documento_url:c.convenio_documento_url,documento_nombre:c.convenio_documento_nombre,documento_path:c.convenio_documento_path,documento_origen:c.convenio_documento_origen,publicacion_url:c.convenio_publicacion_url,ambito:c.convenio_ambito,autoridad_laboral:c.convenio_autoridad_laboral,vacaciones:c.vacaciones,vacaciones_tipo:c.vacaciones_tipo,asuntos_horas:c.asuntos_horas},0)].filter(Boolean);
  return lista;
}
function convenioPorId(id){return conveniosEdicion.find(x=>String(x.id)===String(id))||null}
function sincronizarConvenioPrincipal(){
  const sel=document.getElementById("convenio");if(!sel)return;const c=convenioPorId(sel.value);if(!c)return;
  const poner=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??""};
  poner("convenio_referencia",c.referencia);poner("convenio_desde",c.vigencia_desde);poner("convenio_hasta",c.vigencia_hasta);poner("vacaciones",c.vacaciones);poner("vacaciones_tipo",c.vacaciones_tipo);poner("asuntos_horas",c.asuntos_horas);
  const estado=document.getElementById("zx_convenio_estado");if(estado)estado.textContent=c.verificado?"✓ Comprobado en REGCON":"Sin comprobar en REGCON";
  const info=document.getElementById("zx_convenio_info");if(info)info.textContent=[c.ambito,c.autoridad_laboral].filter(Boolean).join(" · ")||"Sin ámbito o autoridad laboral guardados";
  actualizarAccionesDocumentoConvenio(c);
}
function urlSegura(v){const x=String(v||"").trim();return /^https?:\/\//i.test(x)?x:""}
function abrirRegcon(url=""){window.open(urlSegura(url)||REGCON_URL,"_blank","noopener")}
function limpiarNombreArchivo(v){return String(v||"convenio.pdf").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-140)}
async function subirPdfConvenio(file,convenioId){
  if(!file)return null;
  if(file.type && file.type!=="application/pdf"){throw new Error("Selecciona un archivo PDF.");}
  if(Number(file.size||0)>20*1024*1024){throw new Error("El PDF supera 20 MB.");}
  const cliente=sb();if(!cliente?.storage)throw new Error("Storage no disponible.");
  const limpio=limpiarNombreArchivo(file.name);
  const path="convenios/"+empresaId()+"/"+String(convenioId||"convenio")+"/"+Date.now()+"_"+limpio;
  const r=await cliente.storage.from(CONVENIO_DOC_BUCKET).upload(path,file,{upsert:false,contentType:"application/pdf"});
  if(r.error)throw new Error(r.error.message||"No se pudo subir el PDF.");
  const pub=cliente.storage.from(CONVENIO_DOC_BUCKET).getPublicUrl(path);
  const url=String(pub?.data?.publicUrl||"").trim();if(!url)throw new Error("No se obtuvo la URL del PDF.");
  return {url,path,nombre:file.name||limpio,origen:"subido"};
}
async function borrarPdfConvenio(path){
  const x=String(path||"").trim();if(!x)return;
  try{await sb()?.storage?.from(CONVENIO_DOC_BUCKET)?.remove([x])}catch(e){}
}
async function blobConvenio(c){
  const url=urlSegura(c?.documento_url);if(!url)throw new Error("Este convenio no tiene documento asociado.");
  const r=await fetch(url,{credentials:"omit"});if(!r.ok)throw new Error("No se pudo abrir el documento.");
  return await r.blob();
}
function nombreDocumentoConvenio(c){return String(c?.documento_nombre||((c?.nombre||"convenio")+".pdf")).replace(/[\\/:*?"<>|]+/g,"-")}
function urlDescargaDocumentoConvenio(c,url){
  try{
    const u=new URL(url,location.href);
    if(/\.supabase\.co$/i.test(u.hostname)&&u.pathname.includes("/storage/v1/object/public/")){u.searchParams.set("download",nombreDocumentoConvenio(c));return u.toString()}
  }catch(e){}
  return "";
}
async function descargarDocumentoConvenio(c){
  const url=urlSegura(c?.documento_url);if(!url){alert("Este convenio no tiene documento asociado.");return}
  try{
    const b=await blobConvenio(c),nombre=nombreDocumentoConvenio(c),file=new File([b],nombre,{type:b.type||"application/pdf"});
    // En iPhone/PWA, la hoja nativa permite elegir «Guardar en Archivos».
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:nombre});return}
    const u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=nombre;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
  }catch(e){if(e?.name!=="AbortError")alert("No se pudo preparar el PDF para guardarlo.")}
}
async function compartirDocumentoConvenio(c){
  const url=urlSegura(c?.documento_url);if(!url){alert("Este convenio no tiene documento asociado.");return}
  try{
    const b=await blobConvenio(c),file=new File([b],nombreDocumentoConvenio(c),{type:b.type||"application/pdf"});
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:c.nombre||"Convenio",files:[file]});return}
  }catch(e){}
  if(navigator.share){try{await navigator.share({title:c.nombre||"Convenio",url});return}catch(e){}}
  window.open(url,"_blank","noopener");
}
async function imprimirDocumentoConvenio(c){
  const url=urlSegura(c?.documento_url);if(!url){alert("Este convenio no tiene documento asociado.");return}
  try{
    const b=await blobConvenio(c),nombre=nombreDocumentoConvenio(c),file=new File([b],nombre,{type:b.type||"application/pdf"});
    // iPhone/iPad PWA: la hoja nativa muestra la accion Imprimir para el PDF.
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:nombre});return}
    const u=URL.createObjectURL(b),w=window.open(u,"_blank");if(w){setTimeout(()=>{try{w.print()}catch(e){}},800);setTimeout(()=>URL.revokeObjectURL(u),60000);return}
  }catch(e){if(e?.name==="AbortError")return}
  window.open(url,"_blank","noopener");
}
function actualizarAccionesDocumentoConvenio(c){
  const tiene=!!urlSegura(c?.documento_url);
  document.querySelectorAll("[data-conv-doc-principal]").forEach(b=>{b.disabled=!tiene;b.style.opacity=tiene?"1":".5"});
  const fuente=document.getElementById("zx_conv_regcon_principal");if(fuente){fuente.disabled=false;fuente.dataset.url=c?.fuente_url||REGCON_URL}const pub=document.getElementById("zx_conv_publicacion_principal");if(pub){const u=urlSegura(c?.publicacion_url);pub.disabled=!u;pub.style.opacity=u?"1":".65";pub.dataset.url=u}
}
function cerrarModalConvenio(){document.getElementById("zx_modal_convenio")?.remove()}
function abrirModalConvenio(id=""){
  cerrarModalConvenio();const actual=convenioPorId(id)||{id:"",nombre:"",referencia:"",vigencia_desde:"",vigencia_hasta:"",verificado:false,fuente_url:"",documento_url:"",documento_nombre:"",documento_path:"",documento_origen:"",publicacion_url:"",ambito:"",autoridad_laboral:"",vacaciones:30,vacaciones_tipo:"naturales",asuntos_horas:0};
  document.body.insertAdjacentHTML("beforeend",`<div id="zx_modal_convenio" class="zx_modal_fondo"><div class="zx_modal_caja"><div class="zx_modal_top"><h2>${actual.id?"Editar convenio":"Nuevo convenio"}</h2><button id="zx_conv_cerrar">Cerrar</button></div>
    <div class="zx_lab_hint">Busca primero el registro oficial en REGCON. Después guarda aquí el convenio que realmente utiliza la empresa y, si existe, el enlace al documento publicado.</div>
    <button type="button" class="zx_btn_big zx_azul" id="zx_conv_buscar_regcon">Buscar convenio oficial en REGCON</button>
    <label class="zx_label">Nombre oficial</label><input id="zx_conv_nombre" class="zx_input" value="${limpiar(actual.nombre)}" placeholder="Denominación del convenio">
    <label class="zx_label">Código / referencia oficial</label><input id="zx_conv_ref" class="zx_input" value="${limpiar(actual.referencia)}" placeholder="Código REGCON o referencia de publicación">
    <div class="zx_lab_grid2"><div><label class="zx_label">Ámbito</label><input id="zx_conv_ambito" class="zx_input" value="${limpiar(actual.ambito)}" placeholder="Estatal, autonómico, provincial, empresa…"></div><div><label class="zx_label">Autoridad laboral</label><input id="zx_conv_autoridad" class="zx_input" value="${limpiar(actual.autoridad_laboral)}"></div></div>
    <input id="zx_conv_verificado" type="checkbox" ${actual.verificado?"checked":""} class="zx_conv_hidden_check">
    <button type="button" class="zx_conv_toggle ${actual.verificado?"is-on":""}" id="zx_conv_verificado_btn" aria-pressed="${actual.verificado?"true":"false"}"><span class="zx_conv_toggle_box">${actual.verificado?"✓":""}</span><span>He comprobado este convenio en REGCON</span></button>
    <label class="zx_label">Enlace del registro oficial REGCON</label><input id="zx_conv_fuente" type="url" class="zx_input" value="${limpiar(actual.fuente_url)}" placeholder="https://expinterweb.mites.gob.es/…">
    <div class="zx_lab_grid2"><div><label class="zx_label">Vigente desde</label><input id="zx_conv_desde" type="date" class="zx_input" value="${limpiar(actual.vigencia_desde)}"></div><div><label class="zx_label">Vigente hasta</label><input id="zx_conv_hasta" type="date" class="zx_input" value="${limpiar(actual.vigencia_hasta)}"></div></div>
    <div class="zx_lab_grid2"><div><label class="zx_label">Vacaciones</label><div class="zx_num_unit_wrap"><input id="zx_conv_vac" type="number" step="0.5" class="zx_input" value="${limpiar(actual.vacaciones)}"><span class="zx_num_unit">días</span></div></div><div><label class="zx_label">Cómputo</label><select id="zx_conv_vac_tipo" class="zx_input"><option value="naturales" ${actual.vacaciones_tipo!=="laborables"?"selected":""}>Días naturales</option><option value="laborables" ${actual.vacaciones_tipo==="laborables"?"selected":""}>Días laborables</option></select></div></div>
    <label class="zx_label">Asuntos propios</label><div class="zx_num_unit_wrap"><input id="zx_conv_asuntos" type="number" step="0.25" class="zx_input" value="${limpiar(actual.asuntos_horas)}"><span class="zx_num_unit">h/año</span></div>
    <h3>Publicación y documento</h3><div class="zx_lab_hint">Puedes guardar la página oficial del boletín y, además, el PDF que se consultará desde Zentryx.</div>
    <label class="zx_label">Publicación oficial (BOE / BOP / boletín)</label><input id="zx_conv_publicacion_url" type="url" class="zx_input" value="${limpiar(actual.publicacion_url)}" placeholder="https://…">
    <label class="zx_label">URL directa del PDF</label><input id="zx_conv_doc_url" type="url" class="zx_input" value="${limpiar(actual.documento_url)}" placeholder="https://…/convenio.pdf">
    <label class="zx_label">O subir una copia PDF a Zentryx</label><input id="zx_conv_doc_file" type="file" accept="application/pdf,.pdf" class="zx_input">
    <div id="zx_conv_doc_estado" class="zx_lab_hint">${actual.documento_url?`Documento actual: ${limpiar(actual.documento_nombre||"PDF asociado")}`:"Sin PDF asociado"}</div>
    <label class="zx_label">Nombre del archivo</label><input id="zx_conv_doc_nombre" class="zx_input" value="${limpiar(actual.documento_nombre)}" placeholder="Convenio Metal Madrid.pdf">
    <input id="zx_conv_quitar_doc" type="checkbox" class="zx_conv_hidden_check">
    <button type="button" class="zx_conv_toggle" id="zx_conv_quitar_doc_btn" aria-pressed="false"><span class="zx_conv_toggle_box"></span><span>Quitar el documento actual al guardar</span></button>
    <div class="zx_modal_botones"><button class="zx_btn_big zx_verde" id="zx_conv_guardar">Guardar convenio</button><button class="zx_btn_big zx_gris" id="zx_conv_cancelar">Cancelar</button></div></div></div>`);
  let archivoPendiente=null;
  const fileInput=document.getElementById("zx_conv_doc_file");
  if(fileInput)fileInput.onchange=function(){archivoPendiente=this.files?.[0]||null;const e=document.getElementById("zx_conv_doc_estado");if(e)e.textContent=archivoPendiente?("PDF seleccionado: "+archivoPendiente.name):(actual.documento_url?("Documento actual: "+(actual.documento_nombre||"PDF asociado")):"Sin PDF asociado")};
  function activarToggle(btnId,checkId){const btn=document.getElementById(btnId),ck=document.getElementById(checkId);if(!btn||!ck)return;const pintar=()=>{btn.classList.toggle("is-on",ck.checked);btn.setAttribute("aria-pressed",ck.checked?"true":"false");const box=btn.querySelector(".zx_conv_toggle_box");if(box)box.textContent=ck.checked?"✓":""};btn.onclick=()=>{ck.checked=!ck.checked;pintar()};pintar()}
  activarToggle("zx_conv_verificado_btn","zx_conv_verificado");activarToggle("zx_conv_quitar_doc_btn","zx_conv_quitar_doc");
  document.getElementById("zx_conv_cerrar").onclick=cerrarModalConvenio;document.getElementById("zx_conv_cancelar").onclick=cerrarModalConvenio;document.getElementById("zx_conv_buscar_regcon").onclick=()=>abrirRegcon(actual.fuente_url);
  document.getElementById("zx_conv_guardar").onclick=async function(){
    const nombre=document.getElementById("zx_conv_nombre").value.trim();if(!nombre){alert("Indica el nombre del convenio.");return}
    const fuente=urlSegura(document.getElementById("zx_conv_fuente").value),publicacion=urlSegura(document.getElementById("zx_conv_publicacion_url").value),docEscrito=urlSegura(document.getElementById("zx_conv_doc_url").value);
    if(document.getElementById("zx_conv_fuente").value.trim()&&!fuente){alert("El enlace REGCON debe empezar por http:// o https://");return}
    if(document.getElementById("zx_conv_publicacion_url").value.trim()&&!publicacion){alert("La publicación oficial debe empezar por http:// o https://");return}
    if(document.getElementById("zx_conv_doc_url").value.trim()&&!docEscrito){alert("La URL del PDF debe empezar por http:// o https://");return}
    const idNuevo=actual.id||idConvenioLocal(nombre)+"-"+Date.now();
    let documento_url=docEscrito||actual.documento_url||"",documento_nombre=document.getElementById("zx_conv_doc_nombre").value.trim()||actual.documento_nombre||"",documento_path=actual.documento_path||"",documento_origen=docEscrito?"url":(actual.documento_origen||"");
    const quitar=document.getElementById("zx_conv_quitar_doc").checked===true;
    const btn=this;btn.disabled=true;const txt=btn.textContent;btn.textContent="Guardando…";
    try{
      if(quitar){if(documento_path)await borrarPdfConvenio(documento_path);documento_url="";documento_nombre="";documento_path="";documento_origen="";}
      if(archivoPendiente){
        if(documento_path)await borrarPdfConvenio(documento_path);
        const up=await subirPdfConvenio(archivoPendiente,idNuevo);
        documento_url=up.url;documento_path=up.path;documento_nombre=up.nombre;documento_origen=up.origen;
      }else if(docEscrito && documento_path){
        await borrarPdfConvenio(documento_path);documento_path="";
      }
      const nuevo={id:idNuevo,nombre,referencia:document.getElementById("zx_conv_ref").value.trim(),vigencia_desde:document.getElementById("zx_conv_desde").value||"",vigencia_hasta:document.getElementById("zx_conv_hasta").value||"",verificado:document.getElementById("zx_conv_verificado_btn")?.getAttribute("aria-pressed")==="true",fuente_url:fuente,publicacion_url:publicacion,documento_url,documento_nombre,documento_path,documento_origen,ambito:document.getElementById("zx_conv_ambito").value.trim(),autoridad_laboral:document.getElementById("zx_conv_autoridad").value.trim(),vacaciones:num(document.getElementById("zx_conv_vac").value,0),vacaciones_tipo:document.getElementById("zx_conv_vac_tipo").value||"naturales",asuntos_horas:num(document.getElementById("zx_conv_asuntos").value,0)};
      const principalAntes=document.getElementById("convenio")?.value||"";
      const idx=conveniosEdicion.findIndex(x=>String(x.id)===String(actual.id));
      if(idx>=0)conveniosEdicion[idx]=nuevo;else conveniosEdicion.push(nuevo);
      // Editar un convenio no debe convertirlo en principal por accidente.
      // Si es el primero del catálogo, sí queda como principal.
      const principalDespues=convenioPorId(principalAntes)?principalAntes:(conveniosEdicion[0]?.id||nuevo.id);
      repintarConvenios(principalDespues);
      // "Guardar convenio" debe persistir realmente el catálogo en la configuración de empresa.
      // Antes solo modificaba la copia en memoria de esta pantalla y Usuarios seguía leyendo el valor anterior.
      const ok=await guardarConfigSilencioso();
      if(!ok){btn.disabled=false;btn.textContent=txt;return}
      cerrarModalConvenio();
    }catch(e){alert("No se pudo guardar el documento: "+(e?.message||e));btn.disabled=false;btn.textContent=txt;return}
  };
}
function repintarConvenios(seleccionarId){
  const sel=document.getElementById("convenio"),lista=document.getElementById("zx_convenios_lista");if(!sel||!lista)return;
  const anterior=seleccionarId||sel.value;sel.innerHTML=conveniosEdicion.map(x=>`<option value="${limpiar(x.id)}">${limpiar(x.nombre)}</option>`).join("");if(convenioPorId(anterior))sel.value=anterior;else if(conveniosEdicion[0])sel.value=conveniosEdicion[0].id;
  lista.innerHTML=conveniosEdicion.map(x=>`<div class="zx_conv_row"><div><b>${limpiar(x.nombre)}</b><small>${x.verificado?"✓ REGCON":"Sin comprobar"} · ${limpiar(x.referencia||"Sin código")} · ${limpiar(x.vacaciones)} días ${limpiar(x.vacaciones_tipo)} · ${limpiar(x.asuntos_horas)} h/año</small>${x.ambito||x.autoridad_laboral?`<small>${limpiar([x.ambito,x.autoridad_laboral].filter(Boolean).join(" · "))}</small>`:""}</div><div><button type="button" data-conv-regcon="${limpiar(x.id)}">REGCON</button>${x.publicacion_url?`<button type="button" data-conv-pub="${limpiar(x.id)}">Publicación</button>`:""}${x.documento_url?`<button type="button" data-conv-ver="${limpiar(x.id)}">Ver</button><button type="button" data-conv-desc="${limpiar(x.id)}">Descargar</button><button type="button" data-conv-share="${limpiar(x.id)}">Compartir</button><button type="button" data-conv-print="${limpiar(x.id)}">Imprimir</button>`:""}<button type="button" data-conv-edit="${limpiar(x.id)}">Editar</button><button type="button" data-conv-del="${limpiar(x.id)}">Borrar</button></div></div>`).join("") || `<div class="zx_lab_hint">No hay convenios guardados.</div>`;
  lista.querySelectorAll("[data-conv-regcon]").forEach(b=>b.onclick=()=>{const c=convenioPorId(b.dataset.convRegcon);abrirRegcon(c?.fuente_url)});lista.querySelectorAll("[data-conv-pub]").forEach(b=>b.onclick=()=>{const c=convenioPorId(b.dataset.convPub),u=urlSegura(c?.publicacion_url);if(u)window.open(u,"_blank","noopener")});
  lista.querySelectorAll("[data-conv-ver]").forEach(b=>b.onclick=()=>{const c=convenioPorId(b.dataset.convVer);if(c?.documento_url)window.open(c.documento_url,"_blank","noopener")});
  lista.querySelectorAll("[data-conv-desc]").forEach(b=>b.onclick=()=>descargarDocumentoConvenio(convenioPorId(b.dataset.convDesc)));
  lista.querySelectorAll("[data-conv-share]").forEach(b=>b.onclick=()=>compartirDocumentoConvenio(convenioPorId(b.dataset.convShare)));
  lista.querySelectorAll("[data-conv-print]").forEach(b=>b.onclick=()=>imprimirDocumentoConvenio(convenioPorId(b.dataset.convPrint)));
  lista.querySelectorAll("[data-conv-edit]").forEach(b=>b.onclick=()=>abrirModalConvenio(b.dataset.convEdit));lista.querySelectorAll("[data-conv-del]").forEach(b=>b.onclick=function(){if(conveniosEdicion.length<=1){alert("Debe quedar al menos un convenio para la base de empresa.");return}if(!confirm("¿Borrar este convenio del catálogo?"))return;conveniosEdicion=conveniosEdicion.filter(x=>String(x.id)!==String(b.dataset.convDel));repintarConvenios();});sincronizarConvenioPrincipal();
}

function selectorTiempo(id,val=480){
  const h=Math.floor((Number(val)||0)/60),m=(Number(val)||0)%60;
  return `<div class="zx_hm_row"><select id="${id}_h">${[...Array(13).keys()].map(i=>`<option value="${i}" ${i===h?"selected":""}>${i} h</option>`).join("")}</select><select id="${id}_m">${[0,15,30,45].map(i=>`<option value="${i}" ${i===m?"selected":""}>${i} min</option>`).join("")}</select></div>`;
}
function leerTiempo(id){return num(document.getElementById(id+"_h")?.value)*60+num(document.getElementById(id+"_m")?.value)}
function tipoFestivoTexto(t){const x=normalizar(t);if(x==="nacional")return"Nacional";if(x==="autonomico")return"Autonómico";if(x==="provincial")return"Provincial";if(x==="local")return"Local";if(x==="empresa")return"Empresa";return t||"Festivo"}
function claseFestivo(t){const x=normalizar(t);return ["nacional","autonomico","provincial","local","empresa"].includes(x)?"zx_festivo_"+x:"zx_festivo_local"}
function ambito(f){return laboral()?.ambitoFestivo ? laboral().ambitoFestivo(f) : normalizar(f.ambito||f.tipo||"nacional")}
function volverAjustes(){if(typeof window.ZX_configuracion==="function")window.ZX_configuracion();else history.back()}

async function cargarConfig(){
  if(laboral()?.cargarBaseEmpresa) return await laboral().cargarBaseEmpresa();
  return {lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,convenio:"Metal",vacaciones:30,asuntos_horas:16,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,pais:"España",pais_codigo:"ES",comunidad:"Madrid",provincia:"Madrid",localidad:"",anio:anioActual()};
}

function leerConfigPantalla(){
  const pais=document.getElementById("pais")?.value.trim()||"España";
  return {
    version:1,
    lunes:leerTiempo("lunes"),martes:leerTiempo("martes"),miercoles:leerTiempo("miercoles"),jueves:leerTiempo("jueves"),viernes:leerTiempo("viernes"),sabado:leerTiempo("sabado"),domingo:leerTiempo("domingo"),
    convenio_id:document.getElementById("convenio")?.value||"",
    convenio:(convenioPorId(document.getElementById("convenio")?.value)?.nombre||"").trim(),
    convenios:conveniosEdicion.map(x=>Object.assign({},x)),
    convenio_referencia:document.getElementById("convenio_referencia")?.value.trim()||"",
    convenio_vigencia_desde:document.getElementById("convenio_desde")?.value||"",
    convenio_vigencia_hasta:document.getElementById("convenio_hasta")?.value||"",
    convenio_verificado:convenioPorId(document.getElementById("convenio")?.value)?.verificado===true,
    convenio_fuente_url:convenioPorId(document.getElementById("convenio")?.value)?.fuente_url||"",
    convenio_documento_url:convenioPorId(document.getElementById("convenio")?.value)?.documento_url||"",
    convenio_documento_nombre:convenioPorId(document.getElementById("convenio")?.value)?.documento_nombre||"",
    convenio_ambito:convenioPorId(document.getElementById("convenio")?.value)?.ambito||"",
    convenio_autoridad_laboral:convenioPorId(document.getElementById("convenio")?.value)?.autoridad_laboral||"",
    vacaciones:num(document.getElementById("vacaciones")?.value,0),
    vacaciones_tipo:document.getElementById("vacaciones_tipo")?.value||"naturales",
    asuntos_horas:num(document.getElementById("asuntos_horas")?.value,0),
    precio_hora:num(document.getElementById("precio_hora")?.value,0),
    precio_extra:num(document.getElementById("precio_extra")?.value,0),
    precio_extra_nocturna:num(document.getElementById("precio_extra_nocturna")?.value,0),
    precio_extra_festiva:num(document.getElementById("precio_extra_festiva")?.value,0),
    nocturna_desde:document.getElementById("nocturna_desde")?.value||"22:00",
    nocturna_hasta:document.getElementById("nocturna_hasta")?.value||"06:00",
    regla_festivo_nocturno:document.getElementById("regla_festivo_nocturno")?.value||"festivo",
    pais,
    pais_codigo:laboral()?.codigoPais?.(pais) || (normalizar(pais)==="espana"?"ES":""),
    comunidad:document.getElementById("comunidad")?.value.trim()||"",
    provincia:document.getElementById("provincia")?.value.trim()||"",
    localidad:document.getElementById("localidad")?.value.trim()||"",
    anio:num(document.getElementById("anio")?.value,anioActual()),
    fuente_festivos:"oficial_verificada"
  };
}

async function guardarConfigSilencioso(){
  const l=laboral();
  if(!l?.guardarBaseEmpresa){alert("El sistema laboral base no está cargado.");return false}
  const data=leerConfigPantalla();
  const r=await l.guardarBaseEmpresa(data);
  if(r?.error){alert("Error guardando configuración laboral de empresa: "+(r.error.message||r.error));return false}
  return true;
}
async function guardarConfig(){
  const ok=await guardarConfigSilencioso(); if(!ok)return;
  alert("Configuración laboral de empresa guardada.");
  await window.ZX_configLaboralReal();
}

async function cargarFestivosLista(c){
  if(laboral()?.festivosAplicables) return await laboral().festivosAplicables(Number(c.anio||anioActual()),c);
  return [];
}

function resumenFestivos(lista){
  const r={nacional:0,autonomico:0,provincial:0,local:0,empresa:0,verificados:0};
  (lista||[]).forEach(f=>{const a=ambito(f);if(r[a]!==undefined)r[a]++;if(f.verificado)r.verificados++});
  return r;
}

function renderFestivo(f){
  const a=ambito(f),oficial=String(f.origen||"")==="oficial" || f.verificado===true;
  return `<div class="zx_admin_row ${claseFestivo(a)}">
    <div class="zx_admin_row_top"><div><span class="zx_festivo_dot"></span><b>${limpiar(f.nombre||"Festivo")}</b></div><span>${formatoFechaES(f.fecha)}</span></div>
    <div class="zx_admin_data">
      <span class="zx_festivo_badge">${limpiar(tipoFestivoTexto(a))}</span>
      ${oficial?`<span class="zx_festivo_verified">✓ Oficial verificado</span>`:`<span class="zx_festivo_manual">Manual</span>`}
      ${f.comunidad?`<br>Región: ${limpiar(f.comunidad)}`:""}${f.provincia?` · Provincia: ${limpiar(f.provincia)}`:""}${f.localidad?` · Localidad: ${limpiar(f.localidad)}`:""}
      ${f.fuente?`<br>Fuente: ${limpiar(f.fuente)}${f.fuente_url?` · <a href="${limpiar(f.fuente_url)}" target="_blank" rel="noopener">Consultar fuente</a>`:""}`:""}
      <br>Horas trabajadas: <b>${f.computa_extra===false?"no computan automáticamente como extra festiva":"computan como extra festiva"}</b>
    </div>
    ${oficial?`<div class="zx_oficial_lock">Los festivos oficiales se actualizan desde el botón de calendario oficial.</div>`:`<div class="zx_edit_grid"><button class="zx_admin_btn zx_admin_editar" data-edit-festivo="${limpiar(f.id)}">Editar</button><button class="zx_admin_btn zx_admin_borrar" data-del-festivo="${limpiar(f.id)}">Borrar</button></div>`}
  </div>`;
}

function cerrarModalFestivo(){document.getElementById("zx_modal_festivo")?.remove()}
function abrirModalFestivo(f=null){
  cerrarModalFestivo();
  const a=f?ambito(f):"empresa";
  const cfg=leerConfigPantalla();
  document.body.insertAdjacentHTML("beforeend",`<div id="zx_modal_festivo" class="zx_modal_fondo"><div class="zx_modal_caja">
    <div class="zx_modal_top"><h2>${f?"Editar día especial":"Añadir día especial"}</h2><button id="fx_cancelar_top">Cerrar</button></div>
    <label class="zx_label">Fecha</label><input id="fx_fecha" type="date" value="${limpiar(f?String(f.fecha||"").slice(0,10):"")}">
    <label class="zx_label">Nombre</label><input id="fx_nombre" value="${limpiar(f?.nombre||"")}" placeholder="Fiesta local, cierre de empresa, puente…">
    <label class="zx_label">Ámbito</label><select id="fx_ambito">
      <option value="empresa" ${a==="empresa"?"selected":""}>Empresa / cierre propio</option><option value="local" ${a==="local"?"selected":""}>Local</option><option value="provincial" ${a==="provincial"?"selected":""}>Provincial</option><option value="autonomico" ${a==="autonomico"?"selected":""}>Autonómico / regional</option><option value="nacional" ${a==="nacional"?"selected":""}>Nacional manual</option>
    </select>
    <label class="zx_label">Comunidad / región</label><input id="fx_comunidad" value="${limpiar(f?.comunidad||cfg.comunidad||"")}">
    <label class="zx_label">Provincia</label><input id="fx_provincia" value="${limpiar(f?.provincia||cfg.provincia||"")}">
    <label class="zx_label">Localidad</label><input id="fx_localidad" value="${limpiar(f?.localidad||cfg.localidad||"")}">
    <label class="zx_check_line"><input id="fx_computa_extra" type="checkbox" ${f?.computa_extra===false?"":"checked"}><span><b>Computa como festivo para horas trabajadas</b><small>Si se trabaja ese día, Fichaje podrá generar horas extra festivas automáticamente.</small></span></label>
    <div class="zx_modal_botones"><button class="zx_btn_big zx_verde" id="fx_guardar">Guardar</button><button class="zx_btn_big zx_gris" id="fx_cancelar">Cancelar</button></div>
  </div></div>`);
  document.getElementById("fx_cancelar").onclick=cerrarModalFestivo;document.getElementById("fx_cancelar_top").onclick=cerrarModalFestivo;
  document.getElementById("fx_guardar").onclick=async function(){
    const fecha=document.getElementById("fx_fecha").value,nombre=document.getElementById("fx_nombre").value.trim(),amb=document.getElementById("fx_ambito").value;
    if(!fecha||!nombre){alert("Fecha y nombre obligatorios.");return}
    const esEmpresa=amb==="empresa";
    const data={fecha,nombre,anio:Number(fecha.slice(0,4)),pais:cfg.pais||"España",tipo:esEmpresa?"local":amb,ambito:amb,comunidad:esEmpresa?"":document.getElementById("fx_comunidad").value.trim(),provincia:esEmpresa?"":document.getElementById("fx_provincia").value.trim(),localidad:esEmpresa?"":document.getElementById("fx_localidad").value.trim(),empresa_id:laboral()?.empresaId?.()||"demo",origen:esEmpresa?"empresa":"manual",fuente:"Introducido por la empresa",fuente_url:null,verificado:false,computa_extra:document.getElementById("fx_computa_extra").checked,updated_at:new Date().toISOString(),created_by:sesion().usuario||sesion().id||""};
    const r=f?await sb().from("festivos").update(data).eq("id",f.id):await sb().from("festivos").insert([data]);
    if(r.error){alert("Error guardando el día especial: "+r.error.message);return}
    cerrarModalFestivo();await window.ZX_configLaboralReal();
  };
}

async function borrarFestivo(id){
  if(!confirm("¿Eliminar este día especial?"))return;
  const r=await sb().from("festivos").delete().eq("id",id);if(r.error){alert("Error borrando: "+r.error.message);return}await window.ZX_configLaboralReal();
}

async function descargarFestivos(){
  const ok=await guardarConfigSilencioso();if(!ok)return;
  const cfg=leerConfigPantalla(),l=laboral();
  if(!l?.guardarFestivosOficiales){alert("Proveedor de calendario oficial no disponible.");return}
  const r=await l.guardarFestivosOficiales(cfg);
  if(!r.ok){alert(r.mensaje||"No se pudieron cargar festivos verificados.");return}
  alert("Calendario oficial verificado actualizado: "+r.cantidad+" día(s)."+(r.localesDisponibles?"":"\n\nLos festivos locales de esta localidad todavía no están incluidos en el paquete verificado."));
  await window.ZX_configLaboralReal();
}

function totalSemana(c){return ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,k)=>n+Number(c[k]||0),0)}
function textoMinutos(m){return Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")+" min"}

let geoTimer=null,geoResultados=[];
function pintarSugerenciasGeo(lista){
  geoResultados=lista||[];const box=document.getElementById("zx_geo_sugerencias");if(!box)return;
  box.innerHTML=geoResultados.length?geoResultados.map((x,i)=>`<button type="button" data-geo-idx="${i}"><b>${limpiar(x.nombre)}</b><span>${limpiar([x.provincia,x.comunidad,x.pais].filter(Boolean).join(" · "))}</span></button>`).join(""):"";
  box.hidden=!geoResultados.length;
  box.querySelectorAll("[data-geo-idx]").forEach(b=>b.onclick=function(){const x=geoResultados[Number(b.dataset.geoIdx)];if(!x)return;document.getElementById("localidad").value=x.nombre||"";if(x.provincia)document.getElementById("provincia").value=x.provincia;if(x.comunidad)document.getElementById("comunidad").value=x.comunidad;if(x.pais)document.getElementById("pais").value=x.pais;box.hidden=true;});
}
function activarGeo(){
  const l=laboral(),com=document.getElementById("comunidad"),prov=document.getElementById("provincia"),loc=document.getElementById("localidad");
  if(prov){prov.onchange=function(){const c=l?.comunidadDeProvincia?.(prov.value);if(c&&com)com.value=c;};}
  if(loc){loc.oninput=function(){clearTimeout(geoTimer);const q=loc.value.trim();if(q.length<2){pintarSugerenciasGeo([]);return}const pais=document.getElementById("pais")?.value||"España";const code=l?.codigoPais?.(pais)||"";geoTimer=setTimeout(async()=>pintarSugerenciasGeo(await (l?.buscarLocalidades?.(q,code)||[])),280);};loc.onblur=function(){setTimeout(()=>{const b=document.getElementById("zx_geo_sugerencias");if(b)b.hidden=true},250)};loc.onfocus=function(){if(geoResultados.length)pintarSugerenciasGeo(geoResultados)};}
}

function instalarCSS(){
  const old=document.getElementById("zx_config_laboral_css");if(old)old.remove();const s=document.createElement("style");s.id="zx_config_laboral_css";s.innerHTML=`
  .zx_lab_shell{padding-bottom:calc(env(safe-area-inset-bottom) + 100px)}
  .zx_lab_top{position:sticky;top:0;z-index:5000;background:rgba(248,250,252,.96);backdrop-filter:blur(12px);display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:8px 0 12px;margin-bottom:8px}
  .zx_lab_top button{border:0;border-radius:14px;padding:11px 13px;font-weight:950;font-size:14px}.zx_lab_back{background:#e2e8f0;color:#0f172a}.zx_lab_save{background:#16a34a;color:white}.zx_lab_top strong{font-size:17px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .zx_lab_intro{background:linear-gradient(135deg,#eff6ff,#fff);border:1px solid #bfdbfe;border-radius:22px;padding:16px;margin-bottom:14px;color:#1e3a8a;font-weight:800;line-height:1.45}
  .zx_input,.zx_modal_caja input,.zx_modal_caja select{width:100%;padding:14px;border-radius:14px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:16px;font-weight:800;color:#0f172a;background:white}.zx_label{font-weight:900;margin:12px 0 6px;color:#334155;font-size:16px}.zx_hm_row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.zx_hm_row select{width:100%;padding:14px;border-radius:14px;border:1px solid #cbd5e1;background:white;font-size:16px;font-weight:900;color:#0f172a}
  .zx_lab_grid2{display:grid;grid-template-columns:1fr;gap:10px}.zx_num_unit_wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;margin-bottom:12px}.zx_num_unit_wrap .zx_input{margin-bottom:0}.zx_num_unit{display:flex;align-items:center;justify-content:center;min-width:62px;padding:0 12px;border:1px solid #cbd5e1;border-radius:14px;background:#f1f5f9;color:#334155;font-size:14px;font-weight:950;white-space:nowrap}.zx_lab_hint{font-size:13px;color:#64748b;font-weight:800;line-height:1.4;margin:2px 0 10px}.zx_lab_total{display:inline-flex;background:#e0f2fe;color:#075985;border-radius:999px;padding:8px 11px;font-weight:950;margin-bottom:8px}
  .zx_festivo_legend{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.zx_festivo_legend span,.zx_festivo_badge,.zx_festivo_verified,.zx_festivo_manual{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;margin:2px 4px 2px 0}.zx_festivo_legend .nacional,.zx_festivo_nacional .zx_festivo_badge{background:#fee2e2;color:#991b1b}.zx_festivo_legend .autonomico,.zx_festivo_autonomico .zx_festivo_badge{background:#ffedd5;color:#9a3412}.zx_festivo_legend .provincial,.zx_festivo_provincial .zx_festivo_badge{background:#fef3c7;color:#92400e}.zx_festivo_legend .local,.zx_festivo_local .zx_festivo_badge{background:#f3e8ff;color:#6b21a8}.zx_festivo_legend .empresa,.zx_festivo_empresa .zx_festivo_badge{background:#dbeafe;color:#1d4ed8}.zx_festivo_verified{background:#dcfce7;color:#166534}.zx_festivo_manual{background:#e2e8f0;color:#334155}
  .zx_admin_row{background:#fff;border:1px solid #d1d5db;border-left:6px solid #94a3b8;border-radius:18px;padding:14px;margin-top:10px}.zx_admin_row.zx_festivo_nacional{border-left-color:#dc2626}.zx_admin_row.zx_festivo_autonomico{border-left-color:#f97316}.zx_admin_row.zx_festivo_provincial{border-left-color:#d97706}.zx_admin_row.zx_festivo_local{border-left-color:#9333ea}.zx_admin_row.zx_festivo_empresa{border-left-color:#2563eb}.zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:15px;color:#0f172a;font-weight:900}.zx_admin_row_top>div{min-width:0}.zx_admin_row_top span{color:#64748b;font-size:13px;white-space:nowrap}.zx_admin_data{color:#64748b;font-size:14px;line-height:1.5;font-weight:800;word-break:break-word;margin-top:8px}.zx_edit_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.zx_admin_btn{width:100%;border:0;border-radius:12px;padding:11px;color:white;font-size:14px;font-weight:900}.zx_admin_editar{background:#2563eb}.zx_admin_borrar{background:#dc2626}.zx_oficial_lock{margin-top:10px;padding:9px 10px;border-radius:12px;background:#f0fdf4;color:#166534;font-size:12px;font-weight:850}
  .zx_festivo_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zx_festivo_kpis div{border:1px solid #e2e8f0;border-radius:14px;padding:10px;text-align:center;background:#f8fafc}.zx_festivo_kpis b{display:block;font-size:20px;color:#0f172a}.zx_festivo_kpis span{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}
  .zx_geo_wrap{position:relative}.zx_geo_sugerencias{position:absolute;left:0;right:0;top:100%;z-index:6000;background:white;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:6px;max-height:270px;overflow:auto}.zx_geo_sugerencias button{display:block;width:100%;text-align:left;border:0;background:white;border-radius:10px;padding:10px}.zx_geo_sugerencias button:active{background:#eff6ff}.zx_geo_sugerencias b{display:block;color:#0f172a}.zx_geo_sugerencias span{display:block;color:#64748b;font-size:12px;margin-top:2px}
  .zx_conv_row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border:1px solid #dbe3ef;border-radius:14px;padding:11px;margin:8px 0;background:#f8fafc}.zx_conv_row b,.zx_conv_row small{display:block}.zx_conv_row small{margin-top:4px;color:#64748b;font-weight:800}.zx_conv_row>div:last-child{display:flex;gap:6px}.zx_conv_row button{border:0;border-radius:10px;padding:9px 10px;font-weight:900;background:#e2e8f0;color:#0f172a}.zx_conv_row button:last-child{background:#fee2e2;color:#991b1b}
  .zx_modal_caja .zx_conv_hidden_check{display:none!important}
  .zx_modal_caja .zx_conv_toggle{display:grid!important;grid-template-columns:38px minmax(0,1fr)!important;align-items:center!important;gap:12px!important;width:100%!important;margin:16px 0 20px!important;padding:12px 14px!important;border:1px solid #dbe3ef!important;border-radius:14px!important;background:#f8fafc!important;color:#0f172a!important;text-align:left!important;font-size:16px!important;line-height:1.3!important;font-weight:850!important;box-sizing:border-box!important;min-height:62px!important}
  .zx_modal_caja .zx_conv_toggle_box{display:flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;border:2px solid #64748b!important;border-radius:9px!important;background:white!important;color:white!important;font-size:24px!important;font-weight:950!important;line-height:1!important;box-sizing:border-box!important}
  .zx_modal_caja .zx_conv_toggle.is-on{border-color:#93c5fd!important;background:#eff6ff!important}
  .zx_modal_caja .zx_conv_toggle.is-on .zx_conv_toggle_box{background:#2563eb!important;border-color:#2563eb!important}
  .zx_modal_caja .zx_conv_toggle + .zx_label{display:block!important;margin-top:2px!important}

  .zx_check_line{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;border:1px solid #dbe3ef;background:#f8fafc;border-radius:14px;padding:12px;margin:10px 0}.zx_check_line input{width:24px;height:24px;margin:0}.zx_check_line b,.zx_check_line small{display:block}.zx_check_line small{color:#64748b;margin-top:4px;line-height:1.35}
  .zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;padding:12px;z-index:9999}.zx_modal_caja{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;background:white;border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.zx_modal_top{display:flex;justify-content:space-between;gap:10px;align-items:center;position:sticky;top:-18px;background:white;padding:15px 0 10px;z-index:2}.zx_modal_top h2{margin:0}.zx_modal_top button{border:0;background:#e2e8f0;border-radius:12px;padding:10px;font-weight:900}.zx_modal_botones{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.zx_modal_botones>button{min-height:46px;border:1px solid #cbd5e1;border-radius:13px;padding:10px 12px;font-weight:900;background:#f8fafc;color:#0f172a}.zx_modal_botones>button:disabled{opacity:.65;background:#f1f5f9;color:#64748b}
  @media(max-width:699px){.zx_lab_top{grid-template-columns:1fr 1fr;grid-template-areas:"titulo titulo" "volver guardar";gap:7px;padding-top:7px}.zx_lab_top strong{grid-area:titulo;text-align:left;font-size:18px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.2;padding:1px 2px 3px}.zx_lab_back{grid-area:volver;justify-self:stretch}.zx_lab_save{grid-area:guardar;justify-self:stretch}.zx_lab_top button{width:100%;padding:10px 9px}.zx_lab_shell{padding-right:0}}
  @media(min-width:700px){.zx_lab_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_festivo_kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.zx_modal_botones{grid-template-columns:1fr 1fr}}
  html[data-zx-theme="dark"] .zx_lab_top{background:rgba(15,23,42,.96)}html[data-zx-theme="dark"] .zx_lab_top strong{color:#f8fafc}html[data-zx-theme="dark"] .zx_admin_row,html[data-zx-theme="dark"] .zx_modal_caja{background:#111827;color:#f8fafc}html[data-zx-theme="dark"] .zx_admin_row_top,html[data-zx-theme="dark"] .zx_modal_top h2{color:#f8fafc}html[data-zx-theme="dark"] .zx_num_unit{background:#1f2937;color:#f8fafc;border-color:#475569}html[data-zx-theme="dark"] .zx_modal_caja .zx_conv_toggle{background:#1f2937!important;color:#f8fafc!important;border-color:#475569!important}html[data-zx-theme="dark"] .zx_modal_caja .zx_conv_toggle_box{background:#111827!important;border-color:#94a3b8!important}html[data-zx-theme="dark"] .zx_modal_caja .zx_conv_toggle.is-on{background:#172554!important;border-color:#3b82f6!important}html[data-zx-theme="dark"] .zx_modal_caja .zx_conv_toggle.is-on .zx_conv_toggle_box{background:#2563eb!important;border-color:#60a5fa!important}
  `;document.head.appendChild(s);
}

window.ZX_configLaboralReal=async function(){
  instalarCSS();
  const c=await cargarConfig(),festivos=await cargarFestivosLista(c),r=resumenFestivos(festivos),l=laboral();
  conveniosEdicion=catalogoDesdeConfig(c);
  const comunidades=l?.geo?.comunidades||["Madrid"],provincias=l?.geo?.provincias||["Madrid"];
  app().innerHTML=`<div class="zx_lab_shell">
    <div class="zx_lab_top"><button class="zx_lab_back" id="zx_lab_volver">← Ajustes</button><strong>Configuración laboral</strong><button class="zx_lab_save" id="zx_guardar_top">Guardar</button></div>
    <div class="zx_lab_intro"><b>Base laboral de empresa.</b><br>Estos valores sirven como referencia general. Cada trabajador puede conservar condiciones y precios propios desde Usuarios → Laboral. Los cambios nuevos no reinterpretan jornadas históricas ya guardadas.</div>

    <div class="zx_card"><h3>Jornada semanal base</h3><div class="zx_lab_total">Total semanal: <span id="zx_total_semana">${textoMinutos(totalSemana(c))}</span></div>
      ${["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].map((k,i)=>`<div class="zx_label">${["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][i]}</div>${selectorTiempo(k,c[k])}`).join("")}
    </div>

    <div class="zx_card"><h3>Convenios</h3><div class="zx_lab_hint">Guarda aquí los convenios que puede usar la empresa. En Usuarios → Laboral se seleccionan desde esta lista; sus datos no se vuelven a escribir allí.</div>
      <label class="zx_label">Convenio principal de empresa</label><select id="convenio" class="zx_input">${conveniosEdicion.map(x=>`<option value="${limpiar(x.id)}" ${(String(c.convenio_id||"")===String(x.id)||(!c.convenio_id&&normalizar(c.convenio)===normalizar(x.nombre)))?"selected":""}>${limpiar(x.nombre)}</option>`).join("")}</select>
      <label class="zx_label">Referencia / código / publicación</label><input id="convenio_referencia" class="zx_input" value="${limpiar(c.convenio_referencia||"")}" readonly>
      <div class="zx_lab_grid2"><div><label class="zx_label">Vigente desde</label><input id="convenio_desde" type="date" class="zx_input" value="${limpiar(c.convenio_vigencia_desde||"")}" readonly></div><div><label class="zx_label">Vigente hasta</label><input id="convenio_hasta" type="date" class="zx_input" value="${limpiar(c.convenio_vigencia_hasta||"")}" readonly></div></div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Vacaciones anuales</label><div class="zx_num_unit_wrap"><input id="vacaciones" type="number" class="zx_input" value="${limpiar(c.vacaciones)}" readonly><span class="zx_num_unit">días</span></div></div><div><label class="zx_label">Cómputo vacaciones</label><select id="vacaciones_tipo" class="zx_input" disabled><option value="naturales" ${c.vacaciones_tipo!=="laborables"?"selected":""}>Días naturales</option><option value="laborables" ${c.vacaciones_tipo==="laborables"?"selected":""}>Días laborables</option></select></div></div>
      <label class="zx_label">Asuntos propios</label><div class="zx_num_unit_wrap"><input id="asuntos_horas" type="number" class="zx_input" value="${limpiar(c.asuntos_horas)}" readonly><span class="zx_num_unit">h/año</span></div>
      <div id="zx_convenio_estado" class="zx_lab_hint"></div><div id="zx_convenio_info" class="zx_lab_hint"></div>
      <div class="zx_modal_botones"><button type="button" class="zx_btn_big zx_azul" id="zx_conv_regcon_principal">Buscar / comprobar en REGCON</button><button type="button" id="zx_conv_publicacion_principal">Abrir publicación oficial</button><button type="button" data-conv-doc-principal="ver">Ver documento</button><button type="button" data-conv-doc-principal="descargar">Descargar</button><button type="button" data-conv-doc-principal="compartir">Compartir</button><button type="button" data-conv-doc-principal="imprimir">Imprimir</button></div>
      <button type="button" class="zx_btn_big zx_azul" id="zx_nuevo_convenio">Añadir convenio</button><div id="zx_convenios_lista"></div>
    </div>

    <div class="zx_card"><h3>Precios de horas · base empresa</h3><div class="zx_lab_hint">Son importes base. Un trabajador puede tener precios distintos en Usuarios → Laboral; Fichaje conserva el precio que correspondía cuando se creó cada jornada.</div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Hora normal</label><div class="zx_num_unit_wrap"><input id="precio_hora" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_hora)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra normal</label><div class="zx_num_unit_wrap"><input id="precio_extra" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra nocturna</label><div class="zx_num_unit_wrap"><input id="precio_extra_nocturna" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_nocturna)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra festiva</label><div class="zx_num_unit_wrap"><input id="precio_extra_festiva" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_festiva)}"><span class="zx_num_unit">€/h</span></div></div></div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Nocturnidad desde</label><input id="nocturna_desde" type="time" class="zx_input" value="${limpiar(c.nocturna_desde||"22:00")}"></div><div><label class="zx_label">Nocturnidad hasta</label><input id="nocturna_hasta" type="time" class="zx_input" value="${limpiar(c.nocturna_hasta||"06:00")}"></div></div>
      <label class="zx_label">Si coinciden festivo y nocturnidad</label><select id="regla_festivo_nocturno" class="zx_input"><option value="festivo" ${c.regla_festivo_nocturno!=="mayor"?"selected":""}>Aplicar tarifa festiva</option><option value="mayor" ${c.regla_festivo_nocturno==="mayor"?"selected":""}>Aplicar la tarifa mayor</option></select>
    </div>

    <div class="zx_card"><h3>Calendario laboral</h3><div class="zx_lab_hint">Preparado para ampliar países y niveles administrativos. En España, Provincia y Localidad ofrecen ayuda de búsqueda y la localidad puede completar datos superiores.</div>
      <label class="zx_label">País</label><input id="pais" class="zx_input" list="zx_paises" value="${limpiar(c.pais||"España")}"><datalist id="zx_paises">${PAISES_SUGERIDOS.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Año vigente</label><input id="anio" type="number" class="zx_input" value="${limpiar(c.anio||anioActual())}">
      <label class="zx_label">Comunidad / región</label><input id="comunidad" class="zx_input" list="zx_comunidades" value="${limpiar(c.comunidad||"")}"><datalist id="zx_comunidades">${comunidades.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Provincia / estado / departamento</label><input id="provincia" class="zx_input" list="zx_provincias" value="${limpiar(c.provincia||"")}"><datalist id="zx_provincias">${provincias.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Localidad / municipio / ciudad</label><div class="zx_geo_wrap"><input id="localidad" class="zx_input" autocomplete="off" value="${limpiar(c.localidad||"")}" placeholder="Escribe para buscar…"><div id="zx_geo_sugerencias" class="zx_geo_sugerencias" hidden></div></div>
      <button class="zx_btn_big zx_azul" id="zx_descargar_festivos">Actualizar festivos oficiales verificados</button><button class="zx_btn_big zx_verde" id="zx_nuevo_festivo">Añadir festivo / cierre de empresa</button>
    </div>

    <div class="zx_card"><h3>Festivos aplicables ${limpiar(c.anio||anioActual())}</h3>
      <div class="zx_festivo_kpis"><div><b>${r.nacional}</b><span>Nacionales</span></div><div><b>${r.autonomico}</b><span>Autonómicos</span></div><div><b>${r.provincial}</b><span>Provinciales</span></div><div><b>${r.local}</b><span>Locales</span></div><div><b>${r.empresa}</b><span>Empresa</span></div></div>
      <div class="zx_festivo_legend"><span class="nacional">Nacional</span><span class="autonomico">Autonómico</span><span class="provincial">Provincial</span><span class="local">Local</span><span class="empresa">Empresa</span></div>
      <div class="zx_lab_hint">${r.verificados} de ${festivos.length} registro(s) están marcados como oficiales verificados. Los días manuales se mantienen al actualizar el calendario oficial.</div>
      ${festivos.length?festivos.map(renderFestivo).join(""):`<div class="zx_text">Sin festivos aplicables guardados.</div>`}
    </div>
    <div class="zx_card"><button class="zx_btn_big zx_verde" id="zx_guardar_config">Guardar configuración laboral</button><button class="zx_btn_big zx_gris" id="zx_volver_bottom">Volver a Ajustes</button></div>
  </div>`;

  document.getElementById("zx_lab_volver").onclick=volverAjustes;document.getElementById("zx_volver_bottom").onclick=volverAjustes;document.getElementById("zx_guardar_top").onclick=guardarConfig;document.getElementById("zx_guardar_config").onclick=guardarConfig;document.getElementById("zx_descargar_festivos").onclick=descargarFestivos;document.getElementById("zx_nuevo_festivo").onclick=()=>abrirModalFestivo(null);
  document.getElementById("convenio").onchange=sincronizarConvenioPrincipal;document.getElementById("zx_nuevo_convenio").onclick=()=>abrirModalConvenio("");
  document.getElementById("zx_conv_regcon_principal").onclick=function(){const c=convenioPorId(document.getElementById("convenio")?.value);abrirRegcon(c?.fuente_url)};document.getElementById("zx_conv_publicacion_principal").onclick=function(){const u=urlSegura(this.dataset.url);if(u)window.open(u,"_blank","noopener")};
  document.querySelectorAll("[data-conv-doc-principal]").forEach(b=>b.onclick=function(){const c=convenioPorId(document.getElementById("convenio")?.value);const a=b.dataset.convDocPrincipal;if(a==="ver"&&c?.documento_url)window.open(c.documento_url,"_blank","noopener");if(a==="descargar")descargarDocumentoConvenio(c);if(a==="compartir")compartirDocumentoConvenio(c);if(a==="imprimir")imprimirDocumentoConvenio(c)});
  repintarConvenios(document.getElementById("convenio").value);
  document.querySelectorAll("[data-del-festivo]").forEach(b=>b.onclick=()=>borrarFestivo(b.dataset.delFestivo));document.querySelectorAll("[data-edit-festivo]").forEach(b=>{const f=festivos.find(x=>String(x.id)===String(b.dataset.editFestivo));b.onclick=()=>abrirModalFestivo(f)});
  ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>["_h","_m"].forEach(suf=>{const el=document.getElementById(k+suf);if(el)el.onchange=function(){document.getElementById("zx_total_semana").textContent=textoMinutos(["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,x)=>n+leerTiempo(x),0))}}));
  activarGeo();
};

window.ZX_configLaboral=window.ZX_configLaboralReal;
window.ZX_config_laboral=window.ZX_configLaboralReal;
console.log("ZENTRYX config_laboral.js V"+ZX_VERSION+" cargado");
})();
