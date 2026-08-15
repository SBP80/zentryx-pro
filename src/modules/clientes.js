// ===============================
// ZENTRYX PRO - CLIENTES
// V3113 - LISTADO COMPACTO + BUSCADOR ÚNICO + GESTIÓN DESDE FICHA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3113";
const TABLA="clientes";
const CACHE_KEY="zentryx_cache_clientes";

let ZX_CLIENTES_CACHE=[];
let ZX_CLIENTES_BUSQUEDA="";
let ZX_CLIENTES_CARGANDO=false;

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
  return [
    c.via_tipo,
    c.direccion,
    c.numero ? "Nº "+c.numero : "",
    c.portal ? "Portal "+c.portal : "",
    c.escalera ? "Esc. "+c.escalera : "",
    c.piso ? "Piso "+c.piso : "",
    c.puerta ? "Puerta "+c.puerta : "",
    c.poblacion,
    c.provincia,
    c.codigo_postal,
    c.pais
  ].filter(Boolean).join(", ");
}

function textoBusqueda(c){
  return normalizar([
    c.nombre,c.razon_social,c.cliente,c.empresa,c.nombre_comercial,c.tipo,
    c.nif,c.persona_contacto,c.telefono,c.telefono_2,c.email,c.via_tipo,
    c.direccion,c.numero,c.portal,c.escalera,c.piso,c.puerta,c.codigo_postal,
    c.poblacion,c.provincia,c.pais,c.notas,c.mensaje_predefinido,
    c.documento_nombre,direccionCompleta(c),nombreCliente(c)
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
    const nums=soloNumeros([c.telefono,c.telefono_2,c.nif,c.codigo_postal,c.numero].join(" "));
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

    ZX_CLIENTES_CACHE=(r.data || []).map(prepararCliente);
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
        <input id="zx_buscar_clientes" type="search" value="${limpiar(ZX_CLIENTES_BUSQUEDA)}" placeholder="Buscar por cualquier dato del cliente…" autocomplete="off">
        ${ZX_CLIENTES_BUSQUEDA ? `<button id="zx_limpiar_clientes" type="button" aria-label="Limpiar búsqueda">✕</button>` : ""}
      </div>
    </div>
  `;
}

function contactoPrincipal(c){
  return String(c.persona_contacto || c.telefono || c.telefono_2 || c.email || "").trim();
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

  const nombre=nombreCliente(c);
  const dir=c.__zx_dir || direccionCompleta(c);
  const tel1=String(c.telefono || "").trim();
  const tel2=String(c.telefono_2 || "").trim();
  const email=String(c.email || "").trim();

  modalFicha(`
    <div class="zx_cli_top_actions">
      <button type="button" class="zx_cli_top_back" id="cli_ficha_volver">← Volver</button>
      ${puedeEditar() ? `<button type="button" class="zx_cli_top_edit" id="cli_ficha_editar">✏️ Editar</button>` : ""}
    </div>

    <div class="zx_cli_ficha_head">
      <div class="zx_cli_ficha_avatar">${limpiar((nombre || "C").slice(0,1).toUpperCase())}</div>
      <div>
        <div class="zx_cli_ficha_kicker">FICHA DE CLIENTE</div>
        <h2>${limpiar(nombre)}</h2>
        <div class="zx_cli_ficha_tipo">${limpiar(c.tipo || "Sin tipo")}</div>
      </div>
    </div>

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
      <div class="zx_cli_ficha_grid">
        ${fichaCampo("Teléfono",tel1)}
        ${fichaCampo("Teléfono 2",tel2)}
        ${fichaCampo("Email",email)}
      </div>

      ${(tel1 || tel2 || email) ? `
        <div class="zx_cli_ficha_actions">
          ${tel1 ? `<button class="green" type="button" data-ficha-tel="${limpiar(tel1)}" data-ficha-msg="${limpiar(c.mensaje_predefinido || "")}">☎ Teléfono</button>` : ""}
          ${tel2 ? `<button class="green" type="button" data-ficha-tel="${limpiar(tel2)}" data-ficha-msg="${limpiar(c.mensaje_predefinido || "")}">☎ Teléfono 2</button>` : ""}
          ${email ? `<button class="blue" type="button" data-ficha-mail="${limpiar(email)}">✉ Email</button>` : ""}
        </div>
      ` : `<div class="zx_cli_ficha_vacio">Sin datos de contacto.</div>`}
    </section>

    <section class="zx_cli_ficha_section">
      <h3>Dirección</h3>
      ${dir ? `
        <div class="zx_cli_ficha_address">${limpiar(dir)}</div>
        <div class="zx_cli_ficha_actions">
          <button class="purple" type="button" data-ficha-map="${limpiar(dir)}">📍 Mapa</button>
        </div>
      ` : `<div class="zx_cli_ficha_vacio">Sin dirección registrada.</div>`}
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
  const editar=document.getElementById("cli_ficha_editar");
  const opciones=document.getElementById("cli_ficha_opciones");

  if(volver) volver.onclick=cerrarModal;
  if(cerrar) cerrar.onclick=cerrarModal;
  if(editar){
    editar.onclick=function(){
      cerrarModal();
      editarCliente(c.id);
    };
  }
  if(opciones){
    opciones.onclick=function(){
      opcionesCliente(c);
    };
  }

  document.querySelectorAll("[data-ficha-tel]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      menuTelefono(btn.dataset.fichaTel,btn.dataset.fichaMsg);
    };
  });

  document.querySelectorAll("[data-ficha-mail]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      enviarMail(btn.dataset.fichaMail);
    };
  });

  document.querySelectorAll("[data-ficha-map]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      menuMapa(btn.dataset.fichaMap);
    };
  });

  document.querySelectorAll("[data-ficha-doc]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      window.open(btn.dataset.fichaDoc,"_blank");
    };
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
        const c=prepararCliente(r.data);
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
        ${puedeCrear() ? `<button class="zx_cli_new" id="btn_nuevo_cliente">＋ Crear</button>` : ""}
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
  if(nuevo) nuevo.onclick=function(){formulario({})};

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

function selectVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];
  return `
    <label class="zx_cli_label" for="c_via_tipo">Tipo de vía</label>
    <select id="c_via_tipo">
      ${opciones.map(o=>`<option value="${limpiar(o)}" ${String(valor || "")===o ? "selected" : ""}>${limpiar(o || "Seleccionar")}</option>`).join("")}
    </select>
  `;
}

function formulario(c){
  c=c || {};

  if(c.id && !puedeEditar()){alert("No tienes permiso para editar clientes.");return}
  if(!c.id && !puedeCrear()){alert("No tienes permiso para crear clientes.");return}

  modal(`
    <div class="zx_cli_top_actions zx_cli_form_top">
      <button type="button" class="zx_cli_top_back" id="btn_cancelar_cliente_top">← Volver</button>
      <button type="button" class="zx_cli_top_save" id="btn_guardar_cliente_top">💾 Guardar</button>
    </div>

    <h2>${c.id ? "Editar cliente" : "Nuevo cliente"}</h2>

    <div class="zx_cli_form">
      <h3>Datos principales</h3>
      ${selectTipo(c.tipo || "particular")}
      ${input("c_nombre","Nombre / razón social",nombreCliente(c)==="Cliente" ? "" : nombreCliente(c))}
      ${input("c_nif","DNI / NIF / CIF",c.nif)}
      ${input("c_persona_contacto","Persona de contacto",c.persona_contacto)}

      <h3>Contacto</h3>
      ${input("c_telefono","Teléfono principal",c.telefono,"tel")}
      ${input("c_telefono_2","Teléfono secundario",c.telefono_2,"tel")}
      ${input("c_email","Email",c.email,"email")}

      <h3>Dirección</h3>
      ${selectVia(c.via_tipo || "")}
      ${input("c_direccion","Dirección",c.direccion)}
      <div class="zx_cli_grid2">
        <div>${input("c_numero","Número",c.numero)}</div>
        <div>${input("c_portal","Portal",c.portal)}</div>
      </div>
      <div class="zx_cli_grid3">
        <div>${input("c_escalera","Escalera",c.escalera)}</div>
        <div>${input("c_piso","Piso",c.piso)}</div>
        <div>${input("c_puerta","Puerta",c.puerta)}</div>
      </div>
      <div class="zx_cli_grid2">
        <div>${input("c_codigo_postal","Código postal",c.codigo_postal)}</div>
        <div>${input("c_poblacion","Población",c.poblacion)}</div>
      </div>
      <div class="zx_cli_grid2">
        <div>${input("c_provincia","Provincia",c.provincia)}</div>
        <div>${input("c_pais","País",c.pais || "España")}</div>
      </div>

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

  const guardar=function(){
    guardarCliente(c.id || null,c.documento_url || null,c.documento_nombre || null);
  };

  if(guardarTop) guardarTop.onclick=guardar;
  if(guardarBottom) guardarBottom.onclick=guardar;
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

async function guardarCliente(id,documentoActual,nombreDocActual){
  if(id && !puedeEditar()){alert("No tienes permiso para editar clientes.");return}
  if(!id && !puedeCrear()){alert("No tienes permiso para crear clientes.");return}

  const nombre=valor("c_nombre");
  if(!nombre){alert("Nombre obligatorio.");return}

  const file=(document.getElementById("c_documento")?.files || [])[0] || null;
  const docUrl=await subirArchivo(file,nombre);
  const s=sesion();

  const datos={
    nombre:nombre,
    tipo:valor("c_tipo_valor") || "particular",
    nif:valor("c_nif"),
    persona_contacto:valor("c_persona_contacto"),
    telefono:valor("c_telefono"),
    telefono_2:valor("c_telefono_2"),
    email:valor("c_email").toLowerCase(),
    via_tipo:valor("c_via_tipo"),
    direccion:valor("c_direccion"),
    numero:valor("c_numero"),
    portal:valor("c_portal"),
    escalera:valor("c_escalera"),
    piso:valor("c_piso"),
    puerta:valor("c_puerta"),
    codigo_postal:valor("c_codigo_postal"),
    poblacion:valor("c_poblacion"),
    provincia:valor("c_provincia"),
    pais:valor("c_pais"),
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
      r=id ? await zx().update(TABLA,datos,"id",id) : await zx().insert(TABLA,[datos]);
    }else if(id){
      r=await sb().from(TABLA).update(datos).eq("id",id);
    }else{
      r=await sb().from(TABLA).insert([datos]);
    }

    if(r && r.error) throw r.error;

    cerrarModal();

    // Al editar un cliente existente, volver a su ficha de consulta.
    // Al crear uno nuevo mantenemos el listado, ya que el backend puede
    // resolver el alta en cola sin devolver todavía el UUID definitivo.
    if(id){
      const actualizado=prepararCliente(Object.assign({},ZX_CLIENTES_CACHE.find(c=>String(c.id)===String(id)) || {},datos,{id:id}));
      const pos=ZX_CLIENTES_CACHE.findIndex(c=>String(c.id)===String(id));
      if(pos>=0) ZX_CLIENTES_CACHE[pos]=actualizado;
      guardarCache(ZX_CLIENTES_CACHE);
      mostrarFichaCliente(actualizado);
    }else{
      await window.ZX_clientes();
    }

  }catch(e){
    alert("Error guardando cliente: "+(e.message || "Error"));
  }
}

async function editarCliente(id){
  if(!puedeEditar()){alert("No tienes permiso para editar clientes.");return}

  const local=ZX_CLIENTES_CACHE.find(c=>String(c.id)===String(id));

  if(!navigator.onLine || !sb()){
    if(local){formulario(local);return}
    alert("Cliente no encontrado sin conexión.");
    return;
  }

  const r=await sb().from(TABLA).select("*").eq("id",id).maybeSingle();

  if(r.error || !r.data){
    if(local){formulario(local);return}
    alert("Cliente no encontrado.");
    return;
  }

  formulario(r.data);
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
  ["zx_clientes_css_v3109","zx_clientes_css_v3111","zx_clientes_css_v3112","zx_clientes_css_v3113"].forEach(function(id){
    const old=document.getElementById(id);
    if(old) old.remove();
  });

  const s=document.createElement("style");
  s.id="zx_clientes_css_v3113";
  s.innerHTML=`
    .zx_cli_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_cli_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_cli_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_cli_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_cli_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_cli_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
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
    @media(max-width:390px){.zx_cli_panel{padding:15px;border-radius:22px}.zx_cli_header h2{font-size:27px}.zx_cli_kpis{gap:5px}.zx_cli_kpis span{font-size:9px}.zx_cli_top h3{font-size:18px}.zx_cli_ficha_actions{grid-template-columns:1fr}.zx_cli_top_actions{grid-template-columns:1fr 1fr}.zx_cli_top_actions button{font-size:14px;padding:11px 8px}}
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