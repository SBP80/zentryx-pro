// ===============================
// ZENTRYX PRO - CLIENTES
// V3119 - PRINCIPAL DE DIRECCIONES INDEPENDIENTE DEL PLEGADO EN IPHONE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3119";
const TABLA="clientes";
const TABLA_CONTACTOS="clientes_contactos";
const TABLA_DIRECCIONES="clientes_direcciones";
const CACHE_KEY="zentryx_cache_clientes";

let ZX_CLIENTES_CACHE=[];
let ZX_CLIENTES_BUSQUEDA="";
let ZX_CLIENTES_CARGANDO=false;


function uuid(){
  if(zx() && typeof zx().uuid==="function") return zx().uuid();
  if(window.crypto && typeof window.crypto.randomUUID==="function") return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){
    const r=Math.random()*16|0;
    const v=c==="x" ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function contactosLegacy(c){
  const out=[];
  const t1=String(c && c.telefono || "").trim();
  const t2=String(c && c.telefono_2 || "").trim();
  const em=String(c && c.email || "").trim();
  if(t1) out.push({id:"legacy_tel_1",tipo:"telefono",etiqueta:"Principal",valor:t1,principal:true,orden:0,activo:true});
  if(t2) out.push({id:"legacy_tel_2",tipo:"telefono",etiqueta:"Secundario",valor:t2,principal:false,orden:1,activo:true});
  if(em) out.push({id:"legacy_email_1",tipo:"email",etiqueta:"Principal",valor:em,principal:true,orden:0,activo:true});
  return out;
}

function direccionDesdeLegacy(c){
  if(!c) return null;
  const tiene=[c.via_tipo,c.direccion,c.numero,c.portal,c.escalera,c.piso,c.puerta,c.codigo_postal,c.poblacion,c.provincia,c.pais].some(function(v){return String(v || "").trim()});
  if(!tiene && c.lat==null && c.lng==null) return null;
  return {
    id:"legacy_dir_1",etiqueta:"Principal",via_tipo:c.via_tipo || "",direccion:c.direccion || "",numero:c.numero || "",
    portal:c.portal || "",escalera:c.escalera || "",piso:c.piso || "",puerta:c.puerta || "",
    codigo_postal:c.codigo_postal || "",poblacion:c.poblacion || "",provincia:c.provincia || "",pais:c.pais || "España",
    lat:c.lat ?? null,lng:c.lng ?? null,notas:"",principal:true,orden:0,activa:true
  };
}

function contactosCliente(c){
  const rel=Array.isArray(c && c.__zx_contactos) ? c.__zx_contactos.filter(function(x){return x && x.activo!==false && String(x.valor || "").trim()}) : [];
  return rel.length ? rel.slice().sort(function(a,b){
    return Number(!!b.principal)-Number(!!a.principal) || Number(a.orden || 0)-Number(b.orden || 0);
  }) : contactosLegacy(c);
}

function direccionesCliente(c){
  const rel=Array.isArray(c && c.__zx_direcciones) ? c.__zx_direcciones.filter(function(x){return x && x.activa!==false}) : [];
  if(rel.length) return rel.slice().sort(function(a,b){
    return Number(!!b.principal)-Number(!!a.principal) || Number(a.orden || 0)-Number(b.orden || 0);
  });
  const legacy=direccionDesdeLegacy(c);
  return legacy ? [legacy] : [];
}

function direccionCompletaRegistro(d){
  if(!d) return "";
  return [
    d.via_tipo,
    d.direccion,
    d.numero ? "Nº "+d.numero : "",
    d.portal ? "Portal "+d.portal : "",
    d.escalera ? "Esc. "+d.escalera : "",
    d.piso ? "Piso "+d.piso : "",
    d.puerta ? "Puerta "+d.puerta : "",
    d.poblacion,
    d.provincia,
    d.codigo_postal,
    d.pais
  ].filter(Boolean).join(", ");
}

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

function soloNumeros(v){return String(v ?? "").replace(/\D/g,"")}

function rol(){return normalizar(sesion().rol || "")}
function usuario(){return normalizar(sesion().usuario || "")}
function esAdmin(){return rol()==="administrador" || usuario()==="admin"}
function esInvitado(){return rol()==="invitado" || rol()===""}
function puedeEntrar(){return !esInvitado()}
function puedeGestionar(){return esAdmin() || ["gerente","supervisor","encargado","administrativo","oficina"].includes(rol())}
function puedeCrear(){return puedeGestionar()}
function puedeEditar(){return puedeGestionar()}
function puedeBorrar(){return esAdmin()}
function puedeDocs(){return puedeGestionar()}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_cliente");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modal(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_cliente";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja">${html}</div>`;
  document.body.appendChild(d);
}

async function pedirPinAdmin(){
  return new Promise(function(resolve){
    modal(`
      <h2>PIN administrador</h2>
      <div class="zx_text">Introduce el PIN para continuar.</div>
      <input id="cli_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
      <div id="cli_pin_error" class="zx_cli_error"></div>
      <button class="zx_btn_big zx_verde" id="cli_pin_ok">Confirmar</button>
      <button class="zx_btn_big zx_gris" id="cli_pin_cancelar">Cancelar</button>
    `);

    const input=document.getElementById("cli_pin_admin");
    const error=document.getElementById("cli_pin_error");

    document.getElementById("cli_pin_cancelar").onclick=function(){cerrarModal();resolve(false)};

    document.getElementById("cli_pin_ok").onclick=async function(){
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
        input.value="";
        input.focus();
        return;
      }

      const admin=normalizar(r.data.rol)==="administrador" || normalizar(r.data.usuario)==="admin";

      if(!admin){
        error.textContent="Solo un administrador puede borrar clientes.";
        input.value="";
        input.focus();
        return;
      }

      const security=window.ZENTRYX_SECURITY;
      let pinCorrecto=false;

      if(security && typeof security.verifyPin==="function"){
        const verificacion=await security.verifyPin(pin,String(r.data.pin_hash || ""));
        pinCorrecto=!!(verificacion && verificacion.ok);
      }else{
        try{pinCorrecto=btoa(String(pin))===String(r.data.pin_hash || "")}
        catch(e){pinCorrecto=false}
      }

      if(!pinCorrecto){
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

function direccionCompleta(c){
  const dirs=direccionesCliente(c);
  if(dirs.length) return direccionCompletaRegistro(dirs[0]);
  return "";
}

function textoBusqueda(c){
  const contactos=contactosCliente(c).map(function(x){return [x.tipo,x.etiqueta,x.valor].join(" ")}).join(" ");
  const direcciones=direccionesCliente(c).map(function(x){
    return [x.etiqueta,x.via_tipo,x.direccion,x.numero,x.portal,x.escalera,x.piso,x.puerta,x.codigo_postal,x.poblacion,x.provincia,x.pais,x.notas,direccionCompletaRegistro(x)].join(" ");
  }).join(" ");
  return normalizar([
    c.nombre,c.razon_social,c.cliente,c.empresa,c.nombre_comercial,c.tipo,
    c.nif,c.persona_contacto,c.telefono,c.telefono_2,c.email,
    c.notas,c.mensaje_predefinido,c.documento_nombre,
    contactos,direcciones,nombreCliente(c)
  ].join(" "));
}

function coincide(c,busqueda){
  const q=normalizar(busqueda);
  if(!q) return true;

  const txt=c.__zx_busqueda || textoBusqueda(c);
  if(txt.includes(q)) return true;

  const palabras=q.split(/\s+/).filter(Boolean);
  if(palabras.length && palabras.every(p=>txt.includes(p))) return true;

  const qNum=soloNumeros(q);
  if(qNum){
    const nums=soloNumeros([c.nif].concat(contactosCliente(c).map(function(x){return x.valor})).concat(direccionesCliente(c).map(function(x){return [x.codigo_postal,x.numero].join(" ")})).join(" "));
    if(nums.includes(qNum)) return true;
  }

  return false;
}

function prepararCliente(c){
  c.__zx_dir=direccionCompleta(c);
  c.__zx_busqueda=textoBusqueda(c);
  return c;
}

function nombreCliente(c){return c.nombre || c.razon_social || c.cliente || c.empresa || c.nombre_comercial || "Cliente"}

function telefonoLimpio(tel){
  let n=String(tel || "").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function menuTelefono(tel,mensaje){
  const n=telefonoLimpio(tel);
  if(!n){alert("Sin teléfono.");return}

  const msg=encodeURIComponent(mensaje || "");

  modal(`
    <h2>Teléfono</h2>
    <button class="zx_btn_big zx_azul" id="cli_tel_llamar">Llamar</button>
    <button class="zx_btn_big zx_verde" id="cli_tel_sms">SMS</button>
    <button class="zx_btn_big zx_verde" id="cli_tel_was">WhatsApp</button>
    <button class="zx_btn_big zx_gris" id="cli_tel_cerrar">Cerrar</button>
  `);

  document.getElementById("cli_tel_llamar").onclick=function(){location.href="tel:"+n};
  document.getElementById("cli_tel_sms").onclick=function(){location.href="sms:"+n+(mensaje ? "&body="+msg : "")};
  document.getElementById("cli_tel_was").onclick=function(){location.href="https://wa.me/"+n.replace("+","")+(mensaje ? "?text="+msg : "")};
  document.getElementById("cli_tel_cerrar").onclick=cerrarModal;
}

function enviarMail(email){
  if(!email){alert("Sin email.");return}
  location.href="mailto:"+email;
}

function menuMapa(dir){
  if(!dir){alert("Sin dirección.");return}
  const q=encodeURIComponent(dir);

  modal(`
    <h2>Mapa</h2>
    <button class="zx_btn_big zx_azul" id="cli_map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="cli_map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="cli_map_waze">Waze</button>
    <button class="zx_btn_big zx_gris" id="cli_map_cerrar">Cerrar</button>
  `);

  document.getElementById("cli_map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("cli_map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("cli_map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("cli_map_cerrar").onclick=cerrarModal;
}


function etiquetaContacto(c){
  const e=String(c && c.etiqueta || "").trim();
  if(e) return e;
  return c && c.tipo==="email" ? "Email" : "Teléfono";
}

function principalDe(lista){
  return (lista || []).find(function(x){return x && x.principal}) || (lista || [])[0] || null;
}

function adjuntarRelaciones(clientes,contactos,direcciones){
  const mapC={};
  const mapD={};
  (contactos || []).forEach(function(x){
    const k=String(x.cliente_id || "");
    if(!k) return;
    (mapC[k]||(mapC[k]=[])).push(x);
  });
  (direcciones || []).forEach(function(x){
    const k=String(x.cliente_id || "");
    if(!k) return;
    (mapD[k]||(mapD[k]=[])).push(x);
  });
  return (clientes || []).map(function(c){
    const copia=Object.assign({},c);
    copia.__zx_contactos=mapC[String(c.id)] || [];
    copia.__zx_direcciones=mapD[String(c.id)] || [];
    return prepararCliente(copia);
  });
}

async function cargarTablaRelacion(tabla){
  try{
    if(zx() && typeof zx().selectCache==="function"){
      const r=await zx().selectCache(tabla,function(q){return q.select("*")});
      return r && !r.error && Array.isArray(r.data) ? r.data : [];
    }
    if(sb()){
      const r=await sb().from(tabla).select("*");
      return r && !r.error && Array.isArray(r.data) ? r.data : [];
    }
  }catch(e){}
  return [];
}

async function cargarRelacionesCliente(id){
  const local=ZX_CLIENTES_CACHE.find(function(x){return String(x.id)===String(id)}) || null;
  if(!navigator.onLine || !sb()){
    return {
      contactos:local ? contactosCliente(local) : [],
      direcciones:local ? direccionesCliente(local) : []
    };
  }
  try{
    const resultados=await Promise.all([
      sb().from(TABLA_CONTACTOS).select("*").eq("cliente_id",id).order("principal",{ascending:false}).order("orden",{ascending:true}),
      sb().from(TABLA_DIRECCIONES).select("*").eq("cliente_id",id).order("principal",{ascending:false}).order("orden",{ascending:true})
    ]);
    return {
      contactos:resultados[0] && !resultados[0].error ? (resultados[0].data || []) : (local ? contactosCliente(local) : []),
      direcciones:resultados[1] && !resultados[1].error ? (resultados[1].data || []) : (local ? direccionesCliente(local) : [])
    };
  }catch(e){
    return {
      contactos:local ? contactosCliente(local) : [],
      direcciones:local ? direccionesCliente(local) : []
    };
  }
}

function vcardDesescapar(v){
  return String(v || "")
    .replace(/\\n/gi,"\n")
    .replace(/\\,/g,",")
    .replace(/\\;/g,";")
    .replace(/\\\\/g,"\\");
}

function vcardEscapar(v){
  return String(v || "")
    .replace(/\\/g,"\\\\")
    .replace(/\r?\n/g,"\\n")
    .replace(/,/g,"\\,")
    .replace(/;/g,"\\;");
}

function dividirVcard(v,separador){
  const out=[];
  let actual="";
  let escape=false;
  for(const ch of String(v || "")){
    if(escape){actual+=ch;escape=false;continue}
    if(ch==="\\"){actual+=ch;escape=true;continue}
    if(ch===separador){out.push(actual);actual="";continue}
    actual+=ch;
  }
  out.push(actual);
  return out;
}

function parametrosVcard(cabecera){
  const partes=String(cabecera || "").split(";");
  let propiedad=(partes.shift() || "").toUpperCase();
  if(propiedad.includes(".")) propiedad=propiedad.split(".").pop();
  const params={};
  partes.forEach(function(p){
    const pos=p.indexOf("=");
    if(pos>0) params[p.slice(0,pos).toUpperCase()]=p.slice(pos+1);
    else if(p) params.TYPE=(params.TYPE ? params.TYPE+"," : "")+p;
  });
  return {propiedad:propiedad,params:params};
}

function etiquetaDesdeParams(params,tipo){
  const propia=vcardDesescapar(params["X-ZENTRYX-LABEL"] || "").trim();
  if(propia) return propia;
  const tipos=String(params.TYPE || "").toUpperCase().split(",");
  if(tipos.includes("CELL")) return "Móvil";
  if(tipos.includes("WORK")) return "Trabajo";
  if(tipos.includes("HOME")) return "Casa";
  if(tipos.includes("FAX")) return "Fax";
  return tipo==="email" ? "Email" : "Teléfono";
}

function parsearVcardBloque(texto){
  const lineas=String(texto || "").replace(/\r?\n[ \t]/g,"").split(/\r?\n/);
  const c={tipo:"particular",nombre:"",nif:"",persona_contacto:"",notas:"",__zx_contactos:[],__zx_direcciones:[]};
  let nombreN="";
  lineas.forEach(function(linea){
    const pos=linea.indexOf(":");
    if(pos<0) return;
    const cab=linea.slice(0,pos);
    const valorBruto=linea.slice(pos+1);
    const info=parametrosVcard(cab);
    const prop=info.propiedad;
    const valor=vcardDesescapar(valorBruto).trim();
    if(prop==="FN") c.nombre=valor;
    else if(prop==="N"){
      const p=dividirVcard(valorBruto,";").map(vcardDesescapar);
      nombreN=[p[1],p[2],p[0]].filter(Boolean).join(" ").trim();
    }else if(prop==="ORG" && !c.nombre) c.nombre=vcardDesescapar(dividirVcard(valorBruto,";")[0] || "");
    else if(prop==="TEL" && valor){
      c.__zx_contactos.push({id:uuid(),tipo:"telefono",etiqueta:etiquetaDesdeParams(info.params,"telefono"),valor:valor,principal:c.__zx_contactos.filter(function(x){return x.tipo==="telefono"}).length===0,activo:true});
    }else if(prop==="EMAIL" && valor){
      c.__zx_contactos.push({id:uuid(),tipo:"email",etiqueta:etiquetaDesdeParams(info.params,"email"),valor:valor.toLowerCase(),principal:c.__zx_contactos.filter(function(x){return x.tipo==="email"}).length===0,activo:true});
    }else if(prop==="ADR"){
      const p=dividirVcard(valorBruto,";").map(vcardDesescapar);
      const calle=String(p[2] || "").trim();
      const dir={id:uuid(),etiqueta:etiquetaDesdeParams(info.params,"direccion"),via_tipo:"",direccion:calle,numero:"",portal:"",escalera:"",piso:"",puerta:"",poblacion:p[3] || "",provincia:p[4] || "",codigo_postal:p[5] || "",pais:p[6] || "España",notas:"",principal:c.__zx_direcciones.length===0,activa:true};
      const m=calle.match(/^(Calle|Avenida|Plaza|Camino|Carretera|Paseo|Ronda|Travesía|Urbanización|Polígono)\s+(.+?)(?:,?\s+(\d+[A-Za-z]?))?$/i);
      if(m){dir.via_tipo=m[1];dir.direccion=m[2] || calle;dir.numero=m[3] || ""}
      c.__zx_direcciones.push(dir);
    }else if(prop==="NOTE") c.notas=valor;
    else if(prop==="X-ZENTRYX-TIPO") c.tipo=normalizar(valor) || "particular";
    else if(prop==="X-ZENTRYX-NIF") c.nif=valor;
    else if(prop==="X-ZENTRYX-CONTACTO") c.persona_contacto=valor;
  });
  if(!c.nombre) c.nombre=nombreN || "";
  c.__zx_contactos.forEach(function(x,i){x.orden=i});
  c.__zx_direcciones.forEach(function(x,i){x.orden=i});
  return c;
}

function parsearVcards(texto){
  const bloques=String(texto || "").match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
  return bloques.map(parsearVcardBloque).filter(function(c){return c.nombre || c.__zx_contactos.length || c.__zx_direcciones.length});
}

function contactoClave(x){
  if(!x) return "";
  if(x.tipo==="email") return normalizar(x.valor);
  const n=soloNumeros(x.valor);
  return n.length>9 ? n.slice(-9) : n;
}

function buscarDuplicadosImportado(imp){
  const nif=normalizar(imp.nif || "");
  const nombre=normalizar(imp.nombre || "");
  const claves=new Set(contactosCliente(imp).map(contactoClave).filter(Boolean));
  const out=[];
  ZX_CLIENTES_CACHE.forEach(function(c){
    const motivos=[];
    if(nif && normalizar(c.nif || "")===nif) motivos.push("NIF/CIF");
    const clavesC=contactosCliente(c).map(contactoClave).filter(Boolean);
    if(claves.size && clavesC.some(function(k){return claves.has(k)})) motivos.push("teléfono/email");
    if(nombre && normalizar(nombreCliente(c))===nombre) motivos.push("nombre");
    if(motivos.length) out.push({cliente:c,motivos:Array.from(new Set(motivos))});
  });
  return out;
}

function combinarImportado(existente,imp){
  const base=Object.assign({},existente);
  ["nombre","tipo","nif","persona_contacto"].forEach(function(k){if(!String(base[k] || "").trim() && String(imp[k] || "").trim()) base[k]=imp[k]});
  const contactos=contactosCliente(existente).map(function(x){return Object.assign({},x)});
  contactosCliente(imp).forEach(function(x){
    const clave=contactoClave(x);
    if(!contactos.some(function(y){return y.tipo===x.tipo && contactoClave(y)===clave})) contactos.push(Object.assign({},x,{id:uuid(),principal:false}));
  });
  const direcciones=direccionesCliente(existente).map(function(x){return Object.assign({},x)});
  direccionesCliente(imp).forEach(function(x){
    const clave=normalizar(direccionCompletaRegistro(x));
    if(clave && !direcciones.some(function(y){return normalizar(direccionCompletaRegistro(y))===clave})) direcciones.push(Object.assign({},x,{id:uuid(),principal:false}));
  });
  base.__zx_contactos=contactos;
  base.__zx_direcciones=direcciones;
  base.__zx_importando=true;
  return prepararCliente(base);
}

function resumenImportado(imp){
  const contactos=contactosCliente(imp);
  const dirs=direccionesCliente(imp);
  return `
    <div class="zx_cli_import_preview">
      <b>${limpiar(imp.nombre || "Sin nombre")}</b>
      ${imp.nif ? `<span>NIF/CIF: ${limpiar(imp.nif)}</span>` : ""}
      ${imp.persona_contacto ? `<span>Contacto: ${limpiar(imp.persona_contacto)}</span>` : ""}
      ${contactos.map(function(x){return `<span>${limpiar(etiquetaContacto(x))}: ${limpiar(x.valor)}</span>`}).join("")}
      ${dirs.map(function(x){return `<span>${limpiar(x.etiqueta || "Dirección")}: ${limpiar(direccionCompletaRegistro(x))}</span>`}).join("")}
    </div>
  `;
}

function revisarImportado(imp){
  const duplicados=buscarDuplicadosImportado(imp);
  modal(`
    <h2>Importar cliente</h2>
    <div class="zx_text">Revisa los datos antes de guardarlos.</div>
    ${resumenImportado(imp)}
    ${duplicados.length ? `<div class="zx_cli_notice danger">Posible cliente existente: ${duplicados.map(function(d){return limpiar(nombreCliente(d.cliente))+" ("+limpiar(d.motivos.join(", "))+")"}).join(" · ")}</div>` : `<div class="zx_cli_notice">No se han encontrado coincidencias claras.</div>`}
    ${duplicados.slice(0,3).map(function(d,i){return `<button class="zx_btn_big zx_azul" type="button" data-import-update="${limpiar(d.cliente.id)}">Revisar actualización de ${limpiar(nombreCliente(d.cliente))}</button>`}).join("")}
    <button class="zx_btn_big zx_verde" type="button" id="cli_import_nuevo">${duplicados.length ? "Crear como cliente nuevo" : "Revisar y crear cliente"}</button>
    <button class="zx_btn_big zx_gris" type="button" id="cli_import_cancelar">Cancelar</button>
  `);
  document.getElementById("cli_import_cancelar").onclick=cerrarModal;
  document.getElementById("cli_import_nuevo").onclick=function(){cerrarModal();imp.__zx_importando=true;formulario(imp)};
  document.querySelectorAll("[data-import-update]").forEach(function(btn){
    btn.onclick=function(){
      const existente=ZX_CLIENTES_CACHE.find(function(c){return String(c.id)===String(btn.dataset.importUpdate)});
      if(!existente) return;
      cerrarModal();
      formulario(combinarImportado(existente,imp));
    };
  });
}

function seleccionarVcard(cards){
  if(cards.length===1){revisarImportado(cards[0]);return}
  modal(`
    <h2>Seleccionar contacto</h2>
    <div class="zx_text">El archivo contiene ${cards.length} contactos.</div>
    ${cards.slice(0,50).map(function(c,i){return `<button class="zx_btn_big zx_azul" type="button" data-vcard-index="${i}">${limpiar(c.nombre || "Contacto "+(i+1))}</button>`}).join("")}
    <button class="zx_btn_big zx_gris" type="button" id="cli_vcard_cancelar">Cancelar</button>
  `);
  document.getElementById("cli_vcard_cancelar").onclick=cerrarModal;
  document.querySelectorAll("[data-vcard-index]").forEach(function(btn){btn.onclick=function(){cerrarModal();revisarImportado(cards[Number(btn.dataset.vcardIndex)])}});
}

async function importarVcard(file){
  if(!file) return;
  try{
    const texto=await file.text();
    const cards=parsearVcards(texto);
    if(!cards.length){alert("El archivo no contiene una ficha de contacto vCard válida.");return}
    seleccionarVcard(cards);
  }catch(e){alert("No se pudo leer el archivo de contacto.")}
}

function tipoVcardDesdeEtiqueta(etiqueta,tipo){
  const e=normalizar(etiqueta || "");
  if(e.includes("movil") || e.includes("móvil")) return "CELL";
  if(e.includes("trabajo") || e.includes("empresa") || e.includes("oficina")) return "WORK";
  if(e.includes("casa") || e.includes("particular")) return "HOME";
  if(e.includes("fax")) return "FAX";
  return tipo==="email" ? "INTERNET" : "VOICE";
}

function parametroEtiqueta(etiqueta){
  return String(etiqueta || "").replace(/[;:,\r\n]/g," ").trim();
}

function generarVcard(c){
  const nombre=nombreCliente(c);
  const lineas=["BEGIN:VCARD","VERSION:3.0","FN:"+vcardEscapar(nombre)];
  if(normalizar(c.tipo)==="empresa") lineas.push("ORG:"+vcardEscapar(nombre));
  lineas.push("X-ZENTRYX-TIPO:"+vcardEscapar(c.tipo || "particular"));
  if(c.nif) lineas.push("X-ZENTRYX-NIF:"+vcardEscapar(c.nif));
  if(c.persona_contacto) lineas.push("X-ZENTRYX-CONTACTO:"+vcardEscapar(c.persona_contacto));
  contactosCliente(c).forEach(function(x){
    const tipo=tipoVcardDesdeEtiqueta(x.etiqueta,x.tipo);
    const etiqueta=parametroEtiqueta(x.etiqueta);
    if(x.tipo==="email") lineas.push(`EMAIL;TYPE=${tipo};X-ZENTRYX-LABEL=${etiqueta}:${vcardEscapar(x.valor)}`);
    else lineas.push(`TEL;TYPE=${tipo};X-ZENTRYX-LABEL=${etiqueta}:${vcardEscapar(x.valor)}`);
  });
  direccionesCliente(c).forEach(function(d){
    const calle=[d.via_tipo,d.direccion,d.numero].filter(Boolean).join(" ");
    const etiqueta=parametroEtiqueta(d.etiqueta || "Dirección");
    lineas.push(`ADR;TYPE=WORK;X-ZENTRYX-LABEL=${etiqueta}:;;${vcardEscapar(calle)};${vcardEscapar(d.poblacion)};${vcardEscapar(d.provincia)};${vcardEscapar(d.codigo_postal)};${vcardEscapar(d.pais)}`);
  });
  lineas.push("END:VCARD");
  return lineas.join("\r\n")+"\r\n";
}

function nombreArchivoCliente(c){
  const base=nombreCliente(c).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"") || "cliente";
  return base+".vcf";
}

async function compartirCliente(c){
  const contenido=generarVcard(c);
  const nombre=nombreArchivoCliente(c);
  const blob=new Blob([contenido],{type:"text/vcard;charset=utf-8"});
  let file=null;
  try{file=new File([blob],nombre,{type:"text/vcard"})}catch(e){}
  try{
    if(navigator.share && file){
      const datos={title:nombreCliente(c),text:"Ficha de contacto de "+nombreCliente(c),files:[file]};
      if(!navigator.canShare || navigator.canShare({files:[file]})){
        await navigator.share(datos);
        return;
      }
    }
    if(navigator.share && !file){
      await navigator.share({title:nombreCliente(c),text:contenido});
      return;
    }
  }catch(e){
    if(e && e.name==="AbortError") return;
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},1500);
  alert("Se ha preparado el archivo .vcf del cliente.");
}

async function subirArchivo(file,nombre){
  if(!puedeDocs()){
    alert("No tienes permiso para subir documentos de clientes.");
    return null;
  }

  if(!file) return null;

  if(!navigator.onLine || !sb()){
    alert("Para subir documentos necesitas conexión.");
    return null;
  }

  const ext=(file.name.split(".").pop() || "dat").toLowerCase();
  const limpio=String(nombre || "cliente").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="clientes/"+limpio+"_"+Date.now()+"."+ext;

  const r=await sb().storage
    .from("zentryx-clientes")
    .upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo documento: "+r.error.message);
    return null;
  }

  return sb().storage
    .from("zentryx-clientes")
    .getPublicUrl(path).data.publicUrl;
}

function filtrarClientes(){
  let lista=ZX_CLIENTES_CACHE || [];

  if(ZX_CLIENTES_BUSQUEDA.trim()){
    lista=lista.filter(c=>coincide(c,ZX_CLIENTES_BUSQUEDA));
  }

  return lista;
}

async function cargarClientes(){
  if(!puedeEntrar()) return [];

  if(!navigator.onLine || !sb()){
    ZX_CLIENTES_CACHE=leerCache().map(prepararCliente);
    return filtrarClientes();
  }

  if(ZX_CLIENTES_CARGANDO) return filtrarClientes();
  ZX_CLIENTES_CARGANDO=true;

  try{
    let r;

    if(zx() && typeof zx().selectCache==="function"){
      r=await zx().selectCache(TABLA,function(q){
        return q.select("*").order("nombre",{ascending:true});
      });
    }else{
      r=await sb().from(TABLA).select("*").order("nombre",{ascending:true});
    }

    if(r.error) throw r.error;

    const relaciones=await Promise.all([
      cargarTablaRelacion(TABLA_CONTACTOS),
      cargarTablaRelacion(TABLA_DIRECCIONES)
    ]);

    ZX_CLIENTES_CACHE=adjuntarRelaciones(r.data || [],relaciones[0],relaciones[1]);
    guardarCache(ZX_CLIENTES_CACHE);

  }catch(e){
    ZX_CLIENTES_CACHE=leerCache().map(prepararCliente);
  }

  ZX_CLIENTES_CARGANDO=false;
  return filtrarClientes();
}

function resumen(){
  const total=ZX_CLIENTES_CACHE.length;
  const empresas=ZX_CLIENTES_CACHE.filter(c=>normalizar(c.tipo)==="empresa").length;
  const particulares=ZX_CLIENTES_CACHE.filter(c=>normalizar(c.tipo)==="particular").length;
  const comunidades=ZX_CLIENTES_CACHE.filter(c=>normalizar(c.tipo)==="comunidad").length;

  return `
    <div class="zx_cli_kpis" aria-label="Resumen de clientes">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${particulares}</b><span>Particulares</span></div>
      <div><b>${empresas}</b><span>Empresas</span></div>
      <div><b>${comunidades}</b><span>Comunidades</span></div>
    </div>
  `;
}

function toolbar(){
  return `
    <div class="zx_cli_toolbar">
      <div class="zx_cli_search">
        <input id="zx_buscar_clientes" type="search" value="${limpiar(ZX_CLIENTES_BUSQUEDA)}" placeholder="Buscar clientes…" autocomplete="off">
        ${ZX_CLIENTES_BUSQUEDA ? `<button id="zx_limpiar_clientes" type="button" aria-label="Limpiar búsqueda">✕</button>` : ""}
      </div>
    </div>
  `;
}

function contactoPrincipal(c){
  const contactos=contactosCliente(c);
  const primero=contactos.find(function(x){return x.principal}) || contactos[0] || null;
  return String(c.persona_contacto || (primero && primero.valor) || "").trim();
}

function renderCliente(c){
  const dir=c.__zx_dir || direccionCompleta(c);
  const nombre=nombreCliente(c);
  const contacto=contactoPrincipal(c);

  return `
    <article class="zx_cli_card" data-id="${limpiar(c.id)}" data-cli-open="${limpiar(c.id)}" role="button" tabindex="0" aria-label="Abrir ficha de ${limpiar(nombre)}">
      <div class="zx_cli_top">
        <div class="zx_cli_avatar">${limpiar((nombre || "C").slice(0,1).toUpperCase())}</div>
        <div class="zx_cli_titlebox">
          <h3>${limpiar(nombre)}</h3>
          <div class="zx_cli_type">${limpiar(c.tipo || "Sin tipo")}</div>
        </div>
        <div class="zx_cli_open_mark" aria-hidden="true">›</div>
      </div>

      ${(contacto || dir) ? `
        <div class="zx_cli_meta">
          ${contacto ? `<div><b>Contacto</b><span>${limpiar(contacto)}</span></div>` : ""}
          ${dir ? `<div><b>Dirección</b><span>${limpiar(dir)}</span></div>` : ""}
        </div>
      ` : ""}
    </article>
  `;
}


function fichaCampo(label,valor){
  if(valor===null || valor===undefined || String(valor).trim()==="") return "";
  return `
    <div class="zx_cli_ficha_campo">
      <b>${limpiar(label)}</b>
      <span>${limpiar(valor)}</span>
    </div>
  `;
}

function modalFicha(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_cliente";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja zx_cli_ficha_modal">${html}</div>`;
  document.body.appendChild(d);
}

function mostrarFichaCliente(c){
  if(!c) return;

  c=prepararCliente(c);
  const nombre=nombreCliente(c);
  const contactos=contactosCliente(c);
  const dirs=direccionesCliente(c);

  const htmlContactos=contactos.map(function(x){
    const esTel=x.tipo==="telefono";
    return `
      <div class="zx_cli_contact_view">
        <div class="zx_cli_contact_text">
          <b>${limpiar(etiquetaContacto(x))}${x.principal ? ` <span class="zx_cli_badge">Principal</span>` : ""}</b>
          <span>${limpiar(x.valor)}</span>
        </div>
        ${esTel ? `<button class="green" type="button" data-ficha-tel="${limpiar(x.valor)}" data-ficha-msg="${limpiar(c.mensaje_predefinido || "")}">☎</button>` : `<button class="blue" type="button" data-ficha-mail="${limpiar(x.valor)}">✉</button>`}
      </div>
    `;
  }).join("");

  const htmlDirs=dirs.map(function(d){
    const dir=direccionCompletaRegistro(d);
    if(!dir) return "";
    return `
      <div class="zx_cli_address_view">
        <div>
          <b>${limpiar(d.etiqueta || "Dirección")}${mostrarBadgePrincipalDireccion(d) ? ` <span class="zx_cli_badge">Principal</span>` : ""}</b>
          <span>${limpiar(dir)}</span>
          ${d.notas ? `<small>${limpiar(d.notas)}</small>` : ""}
        </div>
        <button class="purple" type="button" data-ficha-map="${limpiar(dir)}">📍 Mapa</button>
      </div>
    `;
  }).join("");

  modalFicha(`
    <div class="zx_cli_top_actions">
      <button type="button" class="zx_cli_top_back" id="cli_ficha_volver">← Volver</button>
      ${puedeEditar() ? `<button type="button" class="zx_cli_top_edit" id="cli_ficha_editar">✏️ Editar</button>` : `<button type="button" class="zx_cli_top_back" id="cli_ficha_cerrar_top">Cerrar</button>`}
    </div>

    <div class="zx_cli_ficha_head">
      <div class="zx_cli_ficha_avatar">${limpiar((nombre || "C").slice(0,1).toUpperCase())}</div>
      <div>
        <div class="zx_cli_ficha_kicker">FICHA DE CLIENTE</div>
        <h2>${limpiar(nombre)}</h2>
        <div class="zx_cli_ficha_tipo">${limpiar(c.tipo || "Sin tipo")}</div>
      </div>
    </div>

    <button class="zx_btn_big zx_cli_share_btn" type="button" id="cli_ficha_compartir">↗ Compartir / Enviar contacto</button>

    <section class="zx_cli_ficha_section">
      <h3>Datos principales</h3>
      <div class="zx_cli_ficha_grid">
        ${fichaCampo("Tipo",c.tipo || "Sin tipo")}
        ${puedeGestionar() ? fichaCampo("DNI / NIF / CIF",c.nif) : ""}
        ${fichaCampo("Persona de contacto",c.persona_contacto)}
      </div>
    </section>

    <section class="zx_cli_ficha_section">
      <h3>Contacto</h3>
      ${htmlContactos || `<div class="zx_cli_ficha_vacio">Sin datos de contacto.</div>`}
    </section>

    <section class="zx_cli_ficha_section">
      <h3>Direcciones</h3>
      ${htmlDirs || `<div class="zx_cli_ficha_vacio">Sin direcciones registradas.</div>`}
    </section>

    ${puedeDocs() ? `
      <section class="zx_cli_ficha_section">
        <h3>Documentación</h3>
        ${c.documento_url ? `
          <div class="zx_cli_ficha_doc">
            <span>${limpiar(c.documento_nombre || "Documento del cliente")}</span>
            <button class="gray" type="button" data-ficha-doc="${limpiar(c.documento_url)}">📄 Ver documento</button>
          </div>
        ` : `<div class="zx_cli_ficha_vacio">Sin documento asociado.</div>`}
      </section>
    ` : ""}

    <section class="zx_cli_ficha_section">
      <h3>Notas</h3>
      ${c.notas ? `<div class="zx_cli_ficha_text">${limpiar(c.notas)}</div>` : `<div class="zx_cli_ficha_vacio">Sin notas.</div>`}
    </section>

    ${c.mensaje_predefinido ? `
      <section class="zx_cli_ficha_section">
        <h3>Mensaje predefinido</h3>
        <div class="zx_cli_ficha_text">${limpiar(c.mensaje_predefinido)}</div>
      </section>
    ` : ""}

    ${puedeBorrar() ? `<button class="zx_btn_big zx_cli_options_btn" type="button" id="cli_ficha_opciones">••• Opciones</button>` : ""}
    <button class="zx_btn_big zx_gris" type="button" id="cli_ficha_cerrar">Cerrar</button>
  `);

  const volver=document.getElementById("cli_ficha_volver");
  const cerrar=document.getElementById("cli_ficha_cerrar");
  const cerrarTop=document.getElementById("cli_ficha_cerrar_top");
  const editar=document.getElementById("cli_ficha_editar");
  const opciones=document.getElementById("cli_ficha_opciones");
  const compartir=document.getElementById("cli_ficha_compartir");

  if(volver) volver.onclick=cerrarModal;
  if(cerrar) cerrar.onclick=cerrarModal;
  if(cerrarTop) cerrarTop.onclick=cerrarModal;
  if(compartir) compartir.onclick=function(){compartirCliente(c)};
  if(editar){
    editar.onclick=function(){
      cerrarModal();
      editarCliente(c.id);
    };
  }
  if(opciones){
    opciones.onclick=function(){opcionesCliente(c)};
  }

  document.querySelectorAll("[data-ficha-tel]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();menuTelefono(btn.dataset.fichaTel,btn.dataset.fichaMsg)};
  });
  document.querySelectorAll("[data-ficha-mail]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();enviarMail(btn.dataset.fichaMail)};
  });
  document.querySelectorAll("[data-ficha-map]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();menuMapa(btn.dataset.fichaMap)};
  });
  document.querySelectorAll("[data-ficha-doc]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();window.open(btn.dataset.fichaDoc,"_blank")};
  });
}

function opcionesCliente(c){
  if(!c || !puedeBorrar()) return;

  modal(`
    <div class="zx_cli_top_actions zx_cli_one_action">
      <button type="button" class="zx_cli_top_back" id="cli_opciones_volver">← Volver</button>
    </div>
    <h2>Opciones del cliente</h2>
    <div class="zx_text">${limpiar(nombreCliente(c))}</div>
    <button class="zx_btn_big zx_rojo" type="button" id="cli_opciones_borrar">🗑️ Borrar cliente</button>
    <button class="zx_btn_big zx_gris" type="button" id="cli_opciones_cerrar">Cerrar</button>
  `);

  const volver=document.getElementById("cli_opciones_volver");
  const cerrar=document.getElementById("cli_opciones_cerrar");
  const borrar=document.getElementById("cli_opciones_borrar");

  const regresar=function(){
    cerrarModal();
    mostrarFichaCliente(c);
  };

  if(volver) volver.onclick=regresar;
  if(cerrar) cerrar.onclick=regresar;
  if(borrar){
    borrar.onclick=function(){
      cerrarModal();
      borrarCliente(c.id);
    };
  }
}

async function abrirFichaCliente(id){
  const local=ZX_CLIENTES_CACHE.find(function(x){return String(x.id)===String(id)}) || null;

  if(local){
    mostrarFichaCliente(local);
    return;
  }

  if(navigator.onLine && sb()){
    try{
      const r=await sb().from(TABLA).select("*").eq("id",id).maybeSingle();
      if(!r.error && r.data){
        const rel=await cargarRelacionesCliente(id);
        const c=prepararCliente(Object.assign({},r.data,{__zx_contactos:rel.contactos,__zx_direcciones:rel.direcciones}));
        mostrarFichaCliente(c);
        return;
      }
    }catch(e){}
  }

  alert("Cliente no encontrado.");
}

function renderListado(lista){
  if(!lista.length){
    return `<div class="zx_cli_empty">${ZX_CLIENTES_BUSQUEDA.trim() ? "No hay clientes que coincidan con la búsqueda." : "No hay clientes."}</div>`;
  }

  return lista.map(renderCliente).join("");
}

function pintarShell(lista){
  app().innerHTML=`
    <div class="zx_cli_shell">
      <section class="zx_cli_panel zx_cli_header">
        <div>
          <h2>Clientes</h2>
          <p>Clientes, datos de contacto, direcciones y documentación.</p>
        </div>
        ${puedeCrear() ? `
          <div class="zx_cli_header_actions">
            <button class="zx_cli_import" id="btn_importar_cliente" type="button">⇩ Importar</button>
            <button class="zx_cli_new" id="btn_nuevo_cliente" type="button">＋ Crear</button>
            <input id="cli_import_file" type="file" accept=".vcf,text/vcard,text/x-vcard" style="display:none">
          </div>
        ` : ""}
        ${!puedeCrear() ? `<div class="zx_cli_notice">Modo consulta: no puedes crear ni editar clientes.</div>` : ""}
      </section>

      <section class="zx_cli_panel">
        ${resumen()}
        ${toolbar()}
      </section>

      <section class="zx_cli_panel">
        <div class="zx_cli_list_head">
          <h3>Listado</h3>
          <span id="zx_clientes_contador">${lista.length} cliente(s)</span>
        </div>
        <div id="zx_clientes_lista" class="zx_cli_list">${renderListado(lista)}</div>
      </section>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_cliente");
  const importar=document.getElementById("btn_importar_cliente");
  const archivo=document.getElementById("cli_import_file");
  if(nuevo) nuevo.onclick=function(){formulario({})};
  if(importar && archivo) importar.onclick=function(){archivo.value="";archivo.click()};
  if(archivo) archivo.onchange=function(){const f=(archivo.files || [])[0];if(f) importarVcard(f)};

  conectarBuscador();
  conectarAcciones();
}

function repintarLista(){
  const lista=filtrarClientes();
  const cont=document.getElementById("zx_clientes_contador");
  const box=document.getElementById("zx_clientes_lista");

  if(cont) cont.textContent=lista.length+" cliente(s)";
  if(box){
    box.innerHTML=renderListado(lista);
    conectarAcciones();
  }
}

function refrescarListadoTrasCambio(){
  const kpis=document.querySelector(".zx_cli_kpis");
  if(kpis) kpis.outerHTML=resumen();
  repintarLista();
}

function conectarBuscador(){
  const buscar=document.getElementById("zx_buscar_clientes");

  if(buscar){
    buscar.oninput=function(){
      ZX_CLIENTES_BUSQUEDA=buscar.value || "";
      repintarLista();

      const caja=buscar.closest(".zx_cli_search");
      let b=document.getElementById("zx_limpiar_clientes");

      if(ZX_CLIENTES_BUSQUEDA && !b && caja){
        caja.insertAdjacentHTML("beforeend",`<button id="zx_limpiar_clientes" type="button">✕</button>`);
        conectarLimpiar();
      }

      if(!ZX_CLIENTES_BUSQUEDA && b) b.remove();
    };
  }

  conectarLimpiar();
}

function conectarLimpiar(){
  const b=document.getElementById("zx_limpiar_clientes");
  const buscar=document.getElementById("zx_buscar_clientes");

  if(b){
    b.onclick=function(){
      ZX_CLIENTES_BUSQUEDA="";
      if(buscar) buscar.value="";
      b.remove();
      repintarLista();
      if(buscar) buscar.focus();
    };
  }
}

function conectarAcciones(){
  document.querySelectorAll("[data-cli-tel]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      menuTelefono(btn.dataset.cliTel,btn.dataset.cliMsg);
    };
  });

  document.querySelectorAll("[data-cli-mail]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      enviarMail(btn.dataset.cliMail);
    };
  });

  document.querySelectorAll("[data-cli-map]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      menuMapa(btn.dataset.cliMap);
    };
  });

  document.querySelectorAll("[data-cli-doc]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      window.open(btn.dataset.cliDoc,"_blank");
    };
  });

  document.querySelectorAll("[data-cli-edit]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      editarCliente(btn.dataset.cliEdit);
    };
  });

  document.querySelectorAll("[data-cli-del]").forEach(btn=>{
    btn.onclick=function(e){
      if(e) e.stopPropagation();
      borrarCliente(btn.dataset.cliDel);
    };
  });

  document.querySelectorAll("[data-cli-open]").forEach(card=>{
    card.onclick=function(e){
      if(e && e.target && e.target.closest("button,a,input,select,textarea,label")) return;
      abrirFichaCliente(card.dataset.cliOpen);
    };

    card.onkeydown=function(e){
      if(e.target && e.target.closest("button,a,input,select,textarea,label")) return;
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        abrirFichaCliente(card.dataset.cliOpen);
      }
    };
  });
}

function input(id,label,value,type){
  return `
    <label class="zx_cli_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function selectTipo(valor){
  const opciones=["particular","empresa","comunidad","administración","otro"];
  return `
    <label class="zx_cli_label" for="c_tipo_valor">Tipo</label>
    <select id="c_tipo_valor">
      ${opciones.map(o=>`<option value="${limpiar(o)}" ${String(valor || "particular")===o ? "selected" : ""}>${limpiar(o)}</option>`).join("")}
    </select>
  `;
}

function opcionesVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];
  return opciones.map(function(o){return `<option value="${limpiar(o)}" ${String(valor || "")===o ? "selected" : ""}>${limpiar(o || "Seleccionar")}</option>`}).join("");
}

function uuidValido(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ""));
}

function etiquetasContacto(tipo){
  if(tipo==="telefono") return ["Móvil","Personal","Trabajo","Casa","Oficina","WhatsApp"];
  return ["Personal","Trabajo","Facturación","Administración","Pedidos"];
}

function etiquetasDireccion(){
  return ["Principal","Casa","Trabajo","Facturación","Obra","Almacén","Entrega","Otra"];
}

function resumenDireccionEtiqueta(d){
  const e=String(d && d.etiqueta || "").trim();
  return e && e!=="Nueva dirección" ? e : "Nueva dirección";
}

function mostrarBadgePrincipalDireccion(d){
  const e=String(d && d.etiqueta || "").trim().toLowerCase();
  return !!(d && d.principal && e!=="principal");
}

function renderContactoEditor(tipo,x){
  x=x || {};
  const id=uuidValido(x.id) ? x.id : uuid();
  const esTel=tipo==="telefono";
  const opciones=etiquetasContacto(tipo);
  const etiquetaActual=String(x.etiqueta || (esTel ? "Móvil" : "Personal")).trim() || (esTel ? "Móvil" : "Personal");
  const personalizada=!opciones.includes(etiquetaActual);
  return `
    <div class="zx_cli_subcard zx_cli_contacto_row" data-contacto-tipo="${tipo}" data-id="${limpiar(id)}">
      <div class="zx_cli_subcard_head">
        <b>${esTel ? "Teléfono" : "Email"}</b>
        <button type="button" class="zx_cli_remove_small" data-remove-contacto>🗑️</button>
      </div>
      <div class="zx_cli_grid2 zx_cli_compact_grid">
        <div>
          <label class="zx_cli_label">Etiqueta</label>
          <div class="zx_cli_select_shell">
            <select class="zx_cli_contact_label_select" data-contacto-etiqueta-select aria-label="Etiqueta">
              ${opciones.map(function(o){return `<option value="${limpiar(o)}" ${!personalizada && etiquetaActual===o ? "selected" : ""}>${limpiar(o)}</option>`}).join("")}
              <option value="__personalizar__" ${personalizada ? "selected" : ""}>Personalizar…</option>
            </select>
          </div>
          <input class="zx_cli_custom_label" data-contacto-campo="etiqueta" data-contacto-etiqueta-custom value="${limpiar(etiquetaActual)}" placeholder="Escribe la etiqueta" ${personalizada ? "" : "hidden"}>
        </div>
        <div>
          <label class="zx_cli_label">${esTel ? "Número" : "Dirección de email"}</label>
          <input data-contacto-campo="valor" type="${esTel ? "tel" : "email"}" value="${limpiar(x.valor || "")}" placeholder="${esTel ? "Teléfono" : "Email"}">
        </div>
      </div>
      <label class="zx_cli_checkline"><input type="radio" name="principal_${tipo}" data-contacto-principal ${x.principal ? "checked" : ""}> Principal</label>
    </div>
  `;
}

function renderDireccionEditor(d,abierta){
  d=d || {};
  const esNueva=!d.id;
  const id=uuidValido(d.id) ? d.id : uuid();
  const opcionesEtiqueta=etiquetasDireccion();
  const etiquetaOriginal=String(d.etiqueta || "").trim();
  const etiquetaActual=etiquetaOriginal==="Nueva dirección" ? "" : etiquetaOriginal;
  const personalizada=!!etiquetaActual && !opcionesEtiqueta.includes(etiquetaActual);
  const viaActual=String(d.via_tipo || (esNueva ? "Calle" : "")).trim();
  const resumen=resumenDireccionEtiqueta(d);
  return `
    <details class="zx_cli_address_editor" data-id="${limpiar(id)}" data-lat="${limpiar(d.lat ?? "")}" data-lng="${limpiar(d.lng ?? "")}" data-principal="${d.principal ? "1" : "0"}" ${abierta ? "open" : ""}>
      <summary>
        <span data-dir-resumen>${limpiar(resumen)}</span>
        <span class="zx_cli_badge" data-dir-principal-badge ${mostrarBadgePrincipalDireccion(d) ? "" : "hidden"}>Principal</span>
      </summary>
      <div class="zx_cli_address_body">
        <div class="zx_cli_subcard_head">
          <b>Dirección</b>
          <button type="button" class="zx_cli_remove_small" data-remove-direccion>🗑️</button>
        </div>

        <label class="zx_cli_label">Tipo de dirección</label>
        <div class="zx_cli_select_shell">
          <select class="zx_cli_dir_label_select" data-dir-etiqueta-select aria-label="Tipo de dirección">
            <option value="" ${!etiquetaActual ? "selected" : ""} disabled>Seleccionar…</option>
            ${opcionesEtiqueta.map(function(o){return `<option value="${limpiar(o)}" ${!personalizada && etiquetaActual===o ? "selected" : ""}>${limpiar(o)}</option>`}).join("")}
            <option value="__personalizar__" ${personalizada ? "selected" : ""}>Personalizar…</option>
          </select>
        </div>
        <input class="zx_cli_custom_label" data-dir-campo="etiqueta" data-dir-etiqueta-custom value="${limpiar(etiquetaActual)}" placeholder="Escribe el nombre de la dirección" ${personalizada ? "" : "hidden"}>

        <label class="zx_cli_checkline"><input type="radio" name="principal_direccion" data-dir-principal ${d.principal ? "checked" : ""}> Dirección principal</label>

        <div class="zx_cli_address_quick2">
          <div>
            <label class="zx_cli_label">Tipo de vía</label>
            <select data-dir-campo="via_tipo">${opcionesVia(viaActual)}</select>
          </div>
          <div>
            <label class="zx_cli_label">Número</label>
            <input data-dir-campo="numero" value="${limpiar(d.numero || "")}" inputmode="text" autocomplete="off">
          </div>
        </div>

        <label class="zx_cli_label">Nombre de la vía</label>
        <input data-dir-campo="direccion" value="${limpiar(d.direccion || "")}" placeholder="Calle, avenida, plaza…" autocomplete="address-line1">

        <div class="zx_cli_address_quick2">
          <div>
            <label class="zx_cli_label">Código postal</label>
            <input data-dir-campo="codigo_postal" inputmode="numeric" value="${limpiar(d.codigo_postal || "")}" autocomplete="postal-code">
          </div>
          <div>
            <label class="zx_cli_label">Población</label>
            <input data-dir-campo="poblacion" value="${limpiar(d.poblacion || "")}" autocomplete="address-level2">
          </div>
        </div>

        <label class="zx_cli_label">Provincia</label>
        <input data-dir-campo="provincia" value="${limpiar(d.provincia || "")}" autocomplete="address-level1">

        <details class="zx_cli_address_more">
          <summary>Más datos <span>Portal, piso, puerta, país y notas</span></summary>
          <div class="zx_cli_address_more_body">
            <div class="zx_cli_address_quick2">
              <div><label class="zx_cli_label">Portal</label><input data-dir-campo="portal" value="${limpiar(d.portal || "")}"></div>
              <div><label class="zx_cli_label">Escalera</label><input data-dir-campo="escalera" value="${limpiar(d.escalera || "")}"></div>
            </div>
            <div class="zx_cli_address_quick2">
              <div><label class="zx_cli_label">Piso</label><input data-dir-campo="piso" value="${limpiar(d.piso || "")}"></div>
              <div><label class="zx_cli_label">Puerta</label><input data-dir-campo="puerta" value="${limpiar(d.puerta || "")}"></div>
            </div>
            <label class="zx_cli_label">País</label>
            <input data-dir-campo="pais" value="${limpiar(d.pais || "España")}" autocomplete="country-name">
            <label class="zx_cli_label">Notas de esta dirección</label>
            <textarea data-dir-campo="notas" rows="2" placeholder="Acceso, horario, referencia…">${limpiar(d.notas || "")}</textarea>
          </div>
        </details>
      </div>
    </details>
  `;
}

function asegurarPrincipal(tipo){
  const rows=Array.from(document.querySelectorAll(`[data-contacto-tipo="${tipo}"]`));
  if(rows.length && !rows.some(function(r){return r.querySelector("[data-contacto-principal]")?.checked})){
    const radio=rows[0].querySelector("[data-contacto-principal]");
    if(radio) radio.checked=true;
  }
}

function actualizarPrincipalDireccionesUI(principalRow){
  const rows=Array.from(document.querySelectorAll(".zx_cli_address_editor"));
  rows.forEach(function(row){
    const radio=row.querySelector("[data-dir-principal]");
    const esPrincipal=!!principalRow && row===principalRow;
    if(radio) radio.checked=esPrincipal;
    row.dataset.principal=esPrincipal ? "1" : "0";

    const badge=row.querySelector("[data-dir-principal-badge]");
    if(badge){
      const etiqueta=String(row.querySelector("[data-dir-campo=\"etiqueta\"]")?.value || row.querySelector("[data-dir-resumen]")?.textContent || "").trim().toLowerCase();
      badge.hidden=!(esPrincipal && etiqueta!=="principal");
    }
  });
}

function asegurarPrincipalDireccion(){
  const rows=Array.from(document.querySelectorAll(".zx_cli_address_editor"));
  if(!rows.length) return;
  let principal=rows.find(function(r){return r.dataset.principal==="1"}) ||
                rows.find(function(r){return !!r.querySelector("[data-dir-principal]")?.checked}) || null;
  if(!principal) principal=rows[0];
  actualizarPrincipalDireccionesUI(principal);
}

function conectarFormularioDinamico(){
  const telBox=document.getElementById("cli_telefonos_box");
  const emailBox=document.getElementById("cli_emails_box");
  const dirBox=document.getElementById("cli_direcciones_box");
  const addTel=document.getElementById("cli_add_telefono");
  const addEmail=document.getElementById("cli_add_email");
  const addDir=document.getElementById("cli_add_direccion");

  if(addTel) addTel.onclick=function(){telBox.insertAdjacentHTML("beforeend",renderContactoEditor("telefono",{etiqueta:"Móvil",principal:!telBox.children.length}));conectarFormularioDinamico()};
  if(addEmail) addEmail.onclick=function(){emailBox.insertAdjacentHTML("beforeend",renderContactoEditor("email",{etiqueta:"Personal",principal:!emailBox.children.length}));conectarFormularioDinamico()};
  if(addDir) addDir.onclick=function(){dirBox.insertAdjacentHTML("beforeend",renderDireccionEditor({etiqueta:"",principal:!dirBox.children.length},true));conectarFormularioDinamico()};

  document.querySelectorAll("[data-contacto-etiqueta-select]").forEach(function(sel){
    if(sel.dataset.zxReady) return;sel.dataset.zxReady="1";
    const aplicar=function(enfocar){
      const row=sel.closest(".zx_cli_contacto_row");
      const inp=row?.querySelector("[data-contacto-etiqueta-custom]");
      if(!inp) return;
      if(sel.value==="__personalizar__"){
        inp.hidden=false;
        const opciones=etiquetasContacto(row?.dataset.contactoTipo || "telefono");
        if(opciones.includes(String(inp.value || "").trim())) inp.value="";
        if(enfocar) setTimeout(function(){inp.focus()},0);
      }else{
        inp.value=sel.value;
        inp.hidden=true;
      }
    };
    sel.onchange=function(){aplicar(true)};
    aplicar(false);
  });

  document.querySelectorAll("[data-dir-etiqueta-select]").forEach(function(sel){
    if(sel.dataset.zxReady) return;sel.dataset.zxReady="1";
    const aplicar=function(enfocar){
      const row=sel.closest(".zx_cli_address_editor");
      const inp=row?.querySelector("[data-dir-etiqueta-custom]");
      const span=row?.querySelector("[data-dir-resumen]");
      if(!inp) return;
      if(sel.value==="__personalizar__"){
        inp.hidden=false;
        const opciones=etiquetasDireccion();
        if(opciones.includes(String(inp.value || "").trim())) inp.value="";
        if(span) span.textContent=inp.value.trim() || "Nueva dirección";
        if(row && row.dataset.principal==="1") actualizarPrincipalDireccionesUI(row);
        if(enfocar) setTimeout(function(){inp.focus()},0);
      }else if(sel.value){
        inp.value=sel.value;
        inp.hidden=true;
        if(span) span.textContent=sel.value;
        if(row && row.dataset.principal==="1") actualizarPrincipalDireccionesUI(row);
      }
    };
    sel.onchange=function(){aplicar(true)};
    aplicar(false);
  });

  // iOS/Safari puede mantener marcado el radio de una dirección dentro de un <details> cerrado.
  // No dependemos del comportamiento nativo: la dirección seleccionada se guarda también en data-principal
  // y se desmarca de forma explícita en todas las demás, estén abiertas o plegadas.
  document.querySelectorAll("[data-dir-principal]").forEach(function(radio){
    if(radio.dataset.zxPrincipalReady) return;radio.dataset.zxPrincipalReady="1";
    const activar=function(){
      if(!radio.checked) return;
      const row=radio.closest(".zx_cli_address_editor");
      if(row) actualizarPrincipalDireccionesUI(row);
    };
    radio.onclick=activar;
    radio.onchange=activar;
  });

  document.querySelectorAll("[data-remove-contacto]").forEach(function(btn){
    if(btn.dataset.zxReady) return;btn.dataset.zxReady="1";
    btn.onclick=function(){const row=btn.closest(".zx_cli_contacto_row");const tipo=row?.dataset.contactoTipo;row?.remove();if(tipo) asegurarPrincipal(tipo)};
  });
  document.querySelectorAll("[data-remove-direccion]").forEach(function(btn){
    if(btn.dataset.zxReady) return;btn.dataset.zxReady="1";
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();btn.closest(".zx_cli_address_editor")?.remove();asegurarPrincipalDireccion()};
  });
  document.querySelectorAll("[data-dir-campo=\"etiqueta\"]").forEach(function(inp){
    if(inp.dataset.zxReady) return;inp.dataset.zxReady="1";
    inp.oninput=function(){const row=inp.closest(".zx_cli_address_editor");const span=row?.querySelector("[data-dir-resumen]");if(span) span.textContent=inp.value.trim() || "Nueva dirección";if(row && row.dataset.principal==="1") actualizarPrincipalDireccionesUI(row)};
  });
}

function formulario(c){
  c=c || {};

  if(c.id && !puedeEditar()){alert("No tienes permiso para editar clientes.");return}
  if(!c.id && !puedeCrear()){alert("No tienes permiso para crear clientes.");return}

  const contactos=contactosCliente(c);
  const telefonos=contactos.filter(function(x){return x.tipo==="telefono"});
  const emails=contactos.filter(function(x){return x.tipo==="email"});
  const dirs=direccionesCliente(c);

  modal(`
    <div class="zx_cli_top_actions zx_cli_form_top">
      <button type="button" class="zx_cli_top_back" id="btn_cancelar_cliente_top">← Volver</button>
      <button type="button" class="zx_cli_top_save" id="btn_guardar_cliente_top">💾 Guardar</button>
    </div>

    <h2>${c.id ? "Editar cliente" : "Nuevo cliente"}</h2>
    ${c.__zx_importando ? `<div class="zx_cli_notice">Datos cargados desde una ficha de contacto. Revisa todo antes de guardar.</div>` : ""}

    <div class="zx_cli_form">
      <h3>Datos principales</h3>
      ${selectTipo(c.tipo || "particular")}
      ${input("c_nombre","Nombre / razón social",nombreCliente(c)==="Cliente" ? "" : nombreCliente(c))}
      ${input("c_nif","DNI / NIF / CIF",c.nif)}
      ${input("c_persona_contacto","Persona de contacto",c.persona_contacto)}

      <div class="zx_cli_section_title"><h3>Teléfonos</h3><button type="button" class="zx_cli_add_small" id="cli_add_telefono">＋ Teléfono</button></div>
      <div id="cli_telefonos_box" class="zx_cli_dynamic_box">${telefonos.map(function(x){return renderContactoEditor("telefono",x)}).join("")}</div>
      ${telefonos.length ? "" : `<div class="zx_cli_hint">Añade solo los teléfonos que necesites.</div>`}

      <div class="zx_cli_section_title"><h3>Emails</h3><button type="button" class="zx_cli_add_small" id="cli_add_email">＋ Email</button></div>
      <div id="cli_emails_box" class="zx_cli_dynamic_box">${emails.map(function(x){return renderContactoEditor("email",x)}).join("")}</div>
      ${emails.length ? "" : `<div class="zx_cli_hint">Puedes guardar varios emails.</div>`}

      <div class="zx_cli_section_title"><h3>Direcciones</h3><button type="button" class="zx_cli_add_small" id="cli_add_direccion">＋ Dirección</button></div>
      <div id="cli_direcciones_box" class="zx_cli_dynamic_box">${dirs.map(function(d){return renderDireccionEditor(d,false)}).join("")}</div>
      ${dirs.length ? "" : `<div class="zx_cli_hint">Añade domicilio, dirección fiscal, obras, almacenes u otras ubicaciones.</div>`}

      ${puedeDocs() ? `
        <h3>Documentación</h3>
        <label class="zx_cli_label" for="c_documento">Documento</label>
        <input id="c_documento" type="file" accept="image/*,.pdf,.doc,.docx">
        ${c.documento_url ? `<a class="zx_btn_big zx_azul" href="${limpiar(c.documento_url)}" target="_blank">Ver documento actual</a>` : ""}
      ` : `<input id="c_documento" type="file" style="display:none">`}

      <h3>Notas</h3>
      <label class="zx_cli_label" for="c_notas">Notas técnicas</label>
      <textarea id="c_notas" rows="4">${limpiar(c.notas || "")}</textarea>

      <label class="zx_cli_label" for="c_mensaje">Mensaje WhatsApp/SMS</label>
      <textarea id="c_mensaje" rows="4">${limpiar(c.mensaje_predefinido || "")}</textarea>
    </div>

    <button class="zx_btn_big zx_verde" id="btn_guardar_cliente">Guardar cliente</button>
    <button class="zx_btn_big zx_gris" id="btn_cancelar_cliente">Cancelar</button>
  `);

  const cancelarTop=document.getElementById("btn_cancelar_cliente_top");
  const guardarTop=document.getElementById("btn_guardar_cliente_top");
  const cancelarBottom=document.getElementById("btn_cancelar_cliente");
  const guardarBottom=document.getElementById("btn_guardar_cliente");

  if(cancelarTop) cancelarTop.onclick=cerrarModal;
  if(cancelarBottom) cancelarBottom.onclick=cerrarModal;

  const guardar=function(){guardarCliente(c.id || null,c.documento_url || null,c.documento_nombre || null)};
  if(guardarTop) guardarTop.onclick=guardar;
  if(guardarBottom) guardarBottom.onclick=guardar;
  conectarFormularioDinamico();
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function valorDentro(row,selector){
  const el=row.querySelector(selector);
  return el ? String(el.value || "").trim() : "";
}

function leerContactosFormulario(){
  const out=[];
  document.querySelectorAll(".zx_cli_contacto_row").forEach(function(row){
    const tipo=row.dataset.contactoTipo;
    let v=valorDentro(row,"[data-contacto-campo=\"valor\"]");
    if(!v) return;
    if(tipo==="email") v=v.toLowerCase();
    out.push({
      id:uuidValido(row.dataset.id) ? row.dataset.id : uuid(),
      tipo:tipo,
      etiqueta:valorDentro(row,"[data-contacto-campo=\"etiqueta\"]") || (tipo==="email" ? "Email" : "Teléfono"),
      valor:v,
      principal:!!row.querySelector("[data-contacto-principal]")?.checked,
      activo:true
    });
  });
  ["telefono","email"].forEach(function(tipo){
    const lista=out.filter(function(x){return x.tipo===tipo});
    if(lista.length && !lista.some(function(x){return x.principal})) lista[0].principal=true;
    lista.forEach(function(x,i){x.orden=i});
  });
  return out;
}

function leerDireccionesFormulario(){
  const out=[];
  document.querySelectorAll(".zx_cli_address_editor").forEach(function(row){
    const get=function(campo){return valorDentro(row,`[data-dir-campo="${campo}"]`)};
    const d={
      id:uuidValido(row.dataset.id) ? row.dataset.id : uuid(),
      etiqueta:get("etiqueta") || "Dirección",
      via_tipo:get("via_tipo"),direccion:get("direccion"),numero:get("numero"),portal:get("portal"),
      escalera:get("escalera"),piso:get("piso"),puerta:get("puerta"),codigo_postal:get("codigo_postal"),
      poblacion:get("poblacion"),provincia:get("provincia"),pais:get("pais") || "España",notas:get("notas"),
      lat:row.dataset.lat ? Number(row.dataset.lat) : null,
      lng:row.dataset.lng ? Number(row.dataset.lng) : null,
      principal:row.dataset.principal==="1",
      activa:true
    };
    const tiene=[d.direccion,d.numero,d.codigo_postal,d.poblacion,d.provincia,d.notas].some(function(v){return String(v || "").trim()}) || d.lat!=null || d.lng!=null;
    if(tiene) out.push(d);
  });
  if(out.length && !out.some(function(x){return x.principal})) out[0].principal=true;
  out.forEach(function(x,i){x.orden=i});
  return out;
}

async function guardarRelaciones(clienteId,contactos,direcciones){
  const contactosPayload=(contactos || []).map(function(x){return Object.assign({},x,{cliente_id:clienteId})});
  const direccionesPayload=(direcciones || []).map(function(x){return Object.assign({},x,{cliente_id:clienteId})});

  if(zx() && typeof zx().remove==="function" && typeof zx().insert==="function"){
    let r=await zx().remove(TABLA_CONTACTOS,"cliente_id",clienteId);
    if(r && r.error) throw r.error;
    if(contactosPayload.length){r=await zx().insert(TABLA_CONTACTOS,contactosPayload);if(r && r.error) throw r.error}
    r=await zx().remove(TABLA_DIRECCIONES,"cliente_id",clienteId);
    if(r && r.error) throw r.error;
    if(direccionesPayload.length){r=await zx().insert(TABLA_DIRECCIONES,direccionesPayload);if(r && r.error) throw r.error}
    return;
  }

  if(!sb()) throw new Error("Backend no disponible");
  let r=await sb().from(TABLA_CONTACTOS).delete().eq("cliente_id",clienteId);
  if(r.error) throw r.error;
  if(contactosPayload.length){r=await sb().from(TABLA_CONTACTOS).insert(contactosPayload);if(r.error) throw r.error}
  r=await sb().from(TABLA_DIRECCIONES).delete().eq("cliente_id",clienteId);
  if(r.error) throw r.error;
  if(direccionesPayload.length){r=await sb().from(TABLA_DIRECCIONES).insert(direccionesPayload);if(r.error) throw r.error}
}

async function guardarCliente(id,documentoActual,nombreDocActual){
  if(id && !puedeEditar()){alert("No tienes permiso para editar clientes.");return}
  if(!id && !puedeCrear()){alert("No tienes permiso para crear clientes.");return}

  const nombre=valor("c_nombre");
  if(!nombre){alert("Nombre obligatorio.");return}

  const contactos=leerContactosFormulario();
  const direcciones=leerDireccionesFormulario();
  const telefonos=contactos.filter(function(x){return x.tipo==="telefono"});
  const emails=contactos.filter(function(x){return x.tipo==="email"});
  const telPrincipal=principalDe(telefonos);
  const tel2=telefonos.find(function(x){return !telPrincipal || x.id!==telPrincipal.id}) || null;
  const emailPrincipal=principalDe(emails);
  const dirPrincipal=principalDe(direcciones);

  const file=(document.getElementById("c_documento")?.files || [])[0] || null;
  const docUrl=await subirArchivo(file,nombre);
  const s=sesion();
  const clienteId=id || uuid();

  const datos={
    nombre:nombre,
    tipo:valor("c_tipo_valor") || "particular",
    nif:valor("c_nif"),
    persona_contacto:valor("c_persona_contacto"),
    telefono:telPrincipal ? telPrincipal.valor : "",
    telefono_2:tel2 ? tel2.valor : "",
    email:emailPrincipal ? emailPrincipal.valor.toLowerCase() : "",
    via_tipo:dirPrincipal ? dirPrincipal.via_tipo : "",
    direccion:dirPrincipal ? dirPrincipal.direccion : "",
    numero:dirPrincipal ? dirPrincipal.numero : "",
    portal:dirPrincipal ? dirPrincipal.portal : "",
    escalera:dirPrincipal ? dirPrincipal.escalera : "",
    piso:dirPrincipal ? dirPrincipal.piso : "",
    puerta:dirPrincipal ? dirPrincipal.puerta : "",
    codigo_postal:dirPrincipal ? dirPrincipal.codigo_postal : "",
    poblacion:dirPrincipal ? dirPrincipal.poblacion : "",
    provincia:dirPrincipal ? dirPrincipal.provincia : "",
    pais:dirPrincipal ? dirPrincipal.pais : "",
    lat:dirPrincipal ? dirPrincipal.lat : null,
    lng:dirPrincipal ? dirPrincipal.lng : null,
    notas:valor("c_notas"),
    mensaje_predefinido:valor("c_mensaje"),
    documento_url:docUrl || documentoActual || null,
    documento_nombre:file ? file.name : nombreDocActual || null,
    creado_por:s.usuario || "",
    usuario_id:String(s.id || "")
  };

  try{
    let r;
    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id ? await zx().update(TABLA,datos,"id",clienteId) : await zx().insert(TABLA,[Object.assign({id:clienteId},datos)]);
    }else if(id){
      r=await sb().from(TABLA).update(datos).eq("id",clienteId);
    }else{
      r=await sb().from(TABLA).insert([Object.assign({id:clienteId},datos)]);
    }
    if(r && r.error) throw r.error;

    await guardarRelaciones(clienteId,contactos,direcciones);

    const actualizado=prepararCliente(Object.assign({},ZX_CLIENTES_CACHE.find(function(c){return String(c.id)===String(clienteId)}) || {},datos,{
      id:clienteId,
      __zx_contactos:contactos.map(function(x){return Object.assign({},x,{cliente_id:clienteId})}),
      __zx_direcciones:direcciones.map(function(x){return Object.assign({},x,{cliente_id:clienteId})})
    }));
    const pos=ZX_CLIENTES_CACHE.findIndex(function(c){return String(c.id)===String(clienteId)});
    if(pos>=0) ZX_CLIENTES_CACHE[pos]=actualizado; else ZX_CLIENTES_CACHE.push(actualizado);
    ZX_CLIENTES_CACHE.sort(function(a,b){return nombreCliente(a).localeCompare(nombreCliente(b),"es",{sensitivity:"base"})});
    guardarCache(ZX_CLIENTES_CACHE);

    // La ficha se abre sobre el listado. Sin este repintado, al cerrar la ficha
    // se veía la tarjeta anterior aunque la caché y la base ya estuvieran actualizadas.
    refrescarListadoTrasCambio();
    cerrarModal();
    mostrarFichaCliente(actualizado);

  }catch(e){
    alert("Error guardando cliente: "+(e.message || "Error"));
  }
}

async function editarCliente(id){
  if(!puedeEditar()){alert("No tienes permiso para editar clientes.");return}

  const local=ZX_CLIENTES_CACHE.find(function(c){return String(c.id)===String(id)}) || null;

  if(!navigator.onLine || !sb()){
    if(local){formulario(local);return}
    alert("Cliente no encontrado sin conexión.");
    return;
  }

  try{
    const r=await sb().from(TABLA).select("*").eq("id",id).maybeSingle();
    if(r.error || !r.data) throw r.error || new Error("Cliente no encontrado");
    const rel=await cargarRelacionesCliente(id);
    formulario(prepararCliente(Object.assign({},r.data,{__zx_contactos:rel.contactos,__zx_direcciones:rel.direcciones})));
  }catch(e){
    if(local){formulario(local);return}
    alert("Cliente no encontrado.");
  }
}

async function borrarCliente(id){
  if(!puedeBorrar()){alert("No tienes permiso para borrar clientes.");return}

  const c=ZX_CLIENTES_CACHE.find(x=>String(x.id)===String(id));
  const nombre=c ? nombreCliente(c) : "cliente";

  modal(`
    <h2>Borrar cliente</h2>
    <div class="zx_cli_notice danger">
      Vas a borrar:<br><b>${limpiar(nombre)}</b><br><br>
      Esta acción requiere PIN de administrador.
    </div>
    <button class="zx_btn_big zx_rojo" id="cli_borrar_confirmar">Continuar</button>
    <button class="zx_btn_big zx_gris" id="cli_borrar_cancelar">Cancelar</button>
  `);

  document.getElementById("cli_borrar_cancelar").onclick=cerrarModal;

  document.getElementById("cli_borrar_confirmar").onclick=async function(){
    const ok=await pedirPinAdmin();
    if(!ok) return;

    try{
      let r;

      if(zx() && typeof zx().remove==="function"){
        r=await zx().remove(TABLA,"id",id);
      }else{
        r=await sb().from(TABLA).delete().eq("id",id);
      }

      if(r && r.error) throw r.error;

      cerrarModal();
      await window.ZX_clientes();

    }catch(e){
      alert("Error borrando cliente: "+(e.message || "Error"));
    }
  };
}

function instalarCSS(){
  ["zx_clientes_css_v3109","zx_clientes_css_v3111","zx_clientes_css_v3112","zx_clientes_css_v3113","zx_clientes_css_v3114"].forEach(function(id){
    const old=document.getElementById(id);
    if(old) old.remove();
  });

  const s=document.createElement("style");
  s.id="zx_clientes_css_v3114";
  s.innerHTML=`
    .zx_cli_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_cli_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_cli_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_cli_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_cli_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_cli_header_actions{display:grid;grid-template-columns:auto auto;gap:8px;align-items:start}
    .zx_cli_new,.zx_cli_import{border:0;border-radius:18px;color:white;padding:14px 14px;font-size:15px;font-weight:950;white-space:nowrap;min-height:48px}
    .zx_cli_new{background:#16a34a}.zx_cli_import{background:#2563eb}
    .zx_cli_notice{grid-column:1/-1;background:#f8fafc;border:1px solid #dbe3ef;border-left:7px solid #64748b;border-radius:18px;padding:14px;color:#334155;font-size:15px;font-weight:900;line-height:1.35}
    .zx_cli_notice.danger{border-left-color:#dc2626;background:#fef2f2;color:#991b1b}
    .zx_cli_kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:10px}
    .zx_cli_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:15px;padding:9px 4px;text-align:center;min-width:0}
    .zx_cli_kpis b{display:block;color:#071330;font-size:20px;font-weight:950;line-height:1}
    .zx_cli_kpis span{display:block;color:#64748b;font-size:10px;font-weight:900;margin-top:4px;line-height:1.05;overflow-wrap:anywhere}
    .zx_cli_toolbar{display:grid;grid-template-columns:1fr;gap:0}
    .zx_cli_search{position:relative}
    .zx_cli_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:14px 15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_cli_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_cli_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .zx_cli_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_cli_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_cli_list{display:grid;grid-template-columns:1fr;gap:9px}
    .zx_cli_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:13px;overflow:hidden}
    .zx_cli_top{display:grid;grid-template-columns:44px minmax(0,1fr) 20px;gap:10px;align-items:center}
    .zx_cli_avatar{width:44px;height:44px;border-radius:15px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:950}
    .zx_cli_titlebox{min-width:0}
    .zx_cli_top h3{margin:0;color:#071330;font-size:19px;line-height:1.12;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .zx_cli_type{margin-top:3px;color:#64748b;font-size:12px;font-weight:950;text-transform:capitalize}
    .zx_cli_open_mark{color:#94a3b8;font-size:30px;font-weight:700;line-height:1;text-align:right}
    .zx_cli_meta{margin-top:10px;padding-top:9px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr;gap:7px}
    .zx_cli_meta div{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:start}
    .zx_cli_meta b{color:#64748b;font-size:11px;font-weight:950;line-height:1.3}
    .zx_cli_meta span{color:#071330;font-size:13px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_cli_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_cli_error{color:#dc2626;font-weight:950;margin-top:10px}
    .zx_cli_form h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_cli_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_cli_form input,.zx_cli_form select,.zx_cli_form textarea,#zx_modal_cliente input,#zx_modal_cliente select,#zx_modal_cliente textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_cli_grid2,.zx_cli_grid3{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_cli_card[data-cli-open]{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
    .zx_cli_card[data-cli-open]:active{transform:scale(.992);border-color:#93c5fd}
    .zx_cli_card[data-cli-open]:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}
    .zx_cli_top_actions{position:sticky;top:0;z-index:8;display:grid;grid-template-columns:1fr 1fr;gap:10px;background:rgba(255,255,255,.97);padding:4px 0 14px;margin:0 0 16px;border-bottom:1px solid #e2e8f0;backdrop-filter:blur(10px)}
    .zx_cli_top_actions button{border:1px solid #bfdbfe;border-radius:16px;padding:12px 14px;min-height:48px;font-size:15px;font-weight:950}
    .zx_cli_one_action{grid-template-columns:1fr}
    .zx_cli_options_btn{background:#f8fafc!important;color:#334155!important;border:1px solid #cbd5e1!important}
    .zx_cli_top_back{background:#eff6ff;color:#1d4ed8}
    .zx_cli_top_edit,.zx_cli_top_save{background:#2563eb!important;color:white!important;border-color:#2563eb!important}
    .zx_cli_ficha_modal{padding-top:12px}
    .zx_cli_ficha_head{display:grid;grid-template-columns:62px 1fr;gap:14px;align-items:center;margin-bottom:16px}
    .zx_cli_ficha_avatar{width:62px;height:62px;border-radius:20px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:950}
    .zx_cli_ficha_kicker{color:#64748b;font-size:12px;font-weight:950;letter-spacing:.08em}
    .zx_cli_ficha_head h2{margin:3px 0 0;color:#071330;font-size:28px;line-height:1.05;font-weight:950;letter-spacing:-.4px}
    .zx_cli_ficha_tipo{margin-top:6px;color:#4338ca;background:#eef2ff;border-radius:999px;display:inline-block;padding:6px 10px;font-size:13px;font-weight:950;text-transform:capitalize}
    .zx_cli_ficha_section{background:#f8fafc;border:1px solid #dbe3ef;border-radius:22px;padding:15px;margin:12px 0}
    .zx_cli_ficha_section h3{margin:0 0 12px;color:#071330;font-size:20px;font-weight:950}
    .zx_cli_ficha_grid{display:grid;grid-template-columns:1fr;gap:9px}
    .zx_cli_ficha_campo{background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_cli_ficha_campo b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_cli_ficha_campo span{display:block;color:#071330;font-size:16px;font-weight:850;line-height:1.35;word-break:break-word}
    .zx_cli_ficha_address,.zx_cli_ficha_text{background:white;border:1px solid #e6edf5;border-radius:16px;padding:12px;color:#071330;font-size:16px;font-weight:850;line-height:1.4;white-space:pre-wrap;word-break:break-word}
    .zx_cli_ficha_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
    .zx_cli_ficha_actions button,.zx_cli_ficha_doc button{border:0;border-radius:15px;padding:12px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_cli_ficha_actions .green{background:#16a34a}.zx_cli_ficha_actions .blue{background:#2563eb}.zx_cli_ficha_actions .purple{background:#7c3aed}.zx_cli_ficha_actions .gray,.zx_cli_ficha_doc .gray{background:#64748b}
    .zx_cli_ficha_doc{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_cli_ficha_doc span{color:#334155;font-size:15px;font-weight:850;word-break:break-word}
    .zx_cli_ficha_vacio{color:#64748b;font-size:15px;font-weight:850;padding:4px 0}
    .zx_cli_share_btn{background:#0f766e!important;color:white!important;border:0!important;margin:0 0 12px!important}
    .zx_cli_contact_view,.zx_cli_address_view{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px;margin-top:8px}
    .zx_cli_contact_view:first-of-type,.zx_cli_address_view:first-of-type{margin-top:0}
    .zx_cli_contact_text,.zx_cli_address_view>div{min-width:0}
    .zx_cli_contact_text b,.zx_cli_address_view b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_cli_contact_text span,.zx_cli_address_view span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.35;word-break:break-word}
    .zx_cli_address_view small{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:6px}
    .zx_cli_contact_view button,.zx_cli_address_view button{border:0;border-radius:14px;color:white;font-weight:950;min-width:48px;min-height:44px;padding:9px 11px}
    .zx_cli_contact_view .green{background:#16a34a}.zx_cli_contact_view .blue{background:#2563eb}.zx_cli_address_view .purple{background:#7c3aed}
    .zx_cli_badge{display:inline-block!important;width:auto!important;background:#dcfce7;color:#166534!important;border-radius:999px;padding:3px 7px;font-size:10px!important;font-weight:950!important;vertical-align:middle}
    .zx_cli_section_title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px}
    .zx_cli_section_title h3{margin:0!important}
    .zx_cli_add_small{border:0;border-radius:14px;background:#2563eb;color:white;padding:10px 12px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_cli_dynamic_box{display:grid;grid-template-columns:1fr;gap:9px;margin-top:9px}
    .zx_cli_subcard,.zx_cli_address_editor{background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:12px}
    .zx_cli_subcard_head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .zx_cli_subcard_head b{color:#071330;font-size:15px;font-weight:950}
    .zx_cli_remove_small{border:0;border-radius:11px;background:#fee2e2;color:#b91c1c;width:38px;height:38px;font-size:16px;font-weight:950}
    .zx_cli_compact_grid{margin-top:2px}
    .zx_cli_select_shell{position:relative;width:100%}
    .zx_cli_select_shell:after{content:"▾";position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:20px;font-weight:950;color:#071330;pointer-events:none;line-height:1}
    .zx_cli_contact_label_select,.zx_cli_dir_label_select{-webkit-appearance:none!important;appearance:none!important;padding-right:50px!important;cursor:pointer}
    .zx_cli_custom_label[hidden]{display:none!important}
    .zx_cli_checkline{display:flex;align-items:center;gap:9px;margin-top:10px;color:#334155;font-size:13px;font-weight:950}
    .zx_cli_checkline input{width:20px!important;height:20px!important;margin:0!important;padding:0!important}
    .zx_cli_hint{color:#64748b;font-size:13px;font-weight:800;margin:7px 0 3px}
    .zx_cli_address_editor{padding:0;overflow:hidden}
    .zx_cli_address_editor>summary{cursor:pointer;list-style:none;padding:13px 14px;color:#071330;font-size:15px;font-weight:950;background:#f8fafc}
    .zx_cli_address_editor>summary::-webkit-details-marker{display:none}
    .zx_cli_address_editor>summary:after{content:'›';float:right;color:#94a3b8;font-size:23px;line-height:.8;transform:rotate(90deg)}
    .zx_cli_address_editor[open]>summary:after{transform:rotate(-90deg)}
    .zx_cli_address_body{padding:0 12px 13px;border-top:1px solid #e2e8f0}
.zx_cli_address_quick2{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);gap:9px;align-items:end}
    .zx_cli_address_more{margin-top:13px;border:1px solid #dbe3ef;border-radius:15px;background:white;overflow:hidden}
    .zx_cli_address_more>summary{position:relative;padding:12px 42px 12px 13px!important;background:#eff6ff!important;color:#1d4ed8!important;font-size:14px!important;display:flex;flex-direction:column;gap:2px}
    .zx_cli_address_more>summary span{color:#64748b;font-size:11px;font-weight:850}
    .zx_cli_address_more>summary:after{content:'›';position:absolute;right:16px;top:50%;transform:translateY(-50%) rotate(90deg);color:#64748b;font-size:21px;line-height:1}
    .zx_cli_address_more[open]>summary:after{transform:translateY(-50%) rotate(-90deg)}
    .zx_cli_address_more_body{padding:2px 12px 12px}
    .zx_cli_import_preview{display:grid;gap:5px;background:#f8fafc;border:1px solid #dbe3ef;border-radius:16px;padding:12px;margin:12px 0}
    .zx_cli_import_preview b{color:#071330;font-size:18px}.zx_cli_import_preview span{color:#475569;font-size:13px;font-weight:850;line-height:1.35}
    @media(max-width:390px){.zx_cli_panel{padding:15px;border-radius:22px}.zx_cli_header{grid-template-columns:1fr}.zx_cli_header_actions{grid-template-columns:1fr 1fr}.zx_cli_header_actions button{padding:11px 10px;font-size:14px}.zx_cli_header h2{font-size:27px}.zx_cli_kpis{gap:5px}.zx_cli_kpis span{font-size:9px}.zx_cli_top h3{font-size:18px}.zx_cli_ficha_actions{grid-template-columns:1fr}.zx_cli_top_actions{grid-template-columns:1fr 1fr}.zx_cli_top_actions button{font-size:14px;padding:11px 8px}}
    @media(min-width:700px){.zx_cli_shell{padding-bottom:32px}.zx_cli_kpis b{font-size:22px}.zx_cli_kpis span{font-size:11px}.zx_cli_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_cli_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_cli_grid3{grid-template-columns:repeat(3,minmax(0,1fr))}.zx_cli_ficha_grid{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_cli_ficha_doc{grid-template-columns:1fr auto;align-items:center}}
    @media(min-width:1100px){.zx_cli_panel{padding:22px}.zx_cli_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

window.ZX_clientes=async function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("clientes");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="clientes") b.classList.add("zx_activo");
    });
  }

  if(!puedeEntrar()){
    app().innerHTML=`
      <div class="zx_cli_panel">
        <h2>Clientes</h2>
        <div class="zx_text">No tienes permiso para acceder a Clientes.</div>
      </div>
    `;
    return;
  }

  ZX_CLIENTES_CACHE=leerCache().map(prepararCliente);
  pintarShell(filtrarClientes());

  setTimeout(async function(){
    const lista=await cargarClientes();
    pintarShell(lista);
  },20);
};

window.ZX_abrirClientes=window.ZX_clientes;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("clientes",{
    nombre:"Clientes",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX clientes.js V"+ZX_VERSION+" cargado");

})();