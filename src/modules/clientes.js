// ===============================
// ZENTRYX PRO - CLIENTES
// V3109 - CARGA RÁPIDA RESPONSIVE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3109";
const TABLA="clientes";
const CACHE_KEY="zentryx_cache_clientes";

let ZX_CLIENTES_CACHE=[];
let ZX_CLIENTES_BUSQUEDA="";
let ZX_CLIENTES_FILTRO="todos";
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

function hashPin(pin){return btoa(String(pin))}

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

      if(hashPin(pin)!==String(r.data.pin_hash || "")){
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
    c.nombre,c.tipo,c.nif,c.persona_contacto,c.telefono,c.telefono_2,c.email,
    c.direccion,c.numero,c.portal,c.escalera,c.piso,c.puerta,c.codigo_postal,
    c.poblacion,c.provincia,c.pais,c.notas,c.mensaje_predefinido,direccionCompleta(c)
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

  if(ZX_CLIENTES_FILTRO!=="todos"){
    lista=lista.filter(c=>normalizar(c.tipo)===normalizar(ZX_CLIENTES_FILTRO));
  }

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
    <div class="zx_cli_kpis">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${particulares}</b><span>Particulares</span></div>
      <div><b>${empresas}</b><span>Empresas</span></div>
      <div><b>${comunidades}</b><span>Comunidades</span></div>
    </div>
  `;
}

function toolbar(total){
  const filtros=["todos","particular","empresa","comunidad","administración","otro"];

  return `
    <div class="zx_cli_toolbar">
      <div class="zx_cli_search">
        <input id="zx_buscar_clientes" type="search" value="${limpiar(ZX_CLIENTES_BUSQUEDA)}" placeholder="Buscar nombre, teléfono, email, dirección o NIF" autocomplete="off">
        ${ZX_CLIENTES_BUSQUEDA ? `<button id="zx_limpiar_clientes" type="button">✕</button>` : ""}
      </div>

      <div class="zx_cli_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_CLIENTES_FILTRO===f ? "on" : ""}" data-cli-filter="${limpiar(f)}">${limpiar(f==="todos" ? "Todos" : f)}</button>`;
        }).join("")}
      </div>

      <div class="zx_cli_resume" id="zx_cliente_resume">${limpiar(total)} resultado(s)</div>
    </div>
  `;
}

function renderCliente(c){
  const dir=c.__zx_dir || direccionCompleta(c);
  const tel=c.telefono || c.telefono_2 || "";
  const nombre=nombreCliente(c);

  return `
    <article class="zx_cli_card" data-id="${limpiar(c.id)}">
      <div class="zx_cli_top">
        <div class="zx_cli_avatar">${limpiar((nombre || "C").slice(0,1).toUpperCase())}</div>
        <div>
          <h3>${limpiar(nombre)}</h3>
          <div class="zx_cli_type">${limpiar(c.tipo || "Sin tipo")}</div>
        </div>
      </div>

      <div class="zx_cli_info">
        ${c.nif && puedeGestionar() ? `<p><b>NIF/CIF</b><span>${limpiar(c.nif)}</span></p>` : ""}
        ${tel ? `<p><b>Teléfono</b><span>${limpiar(tel)}</span></p>` : ""}
        ${c.email ? `<p><b>Email</b><span>${limpiar(c.email)}</span></p>` : ""}
        ${c.persona_contacto ? `<p><b>Contacto</b><span>${limpiar(c.persona_contacto)}</span></p>` : ""}
        ${dir ? `<p><b>Dirección</b><span>${limpiar(dir)}</span></p>` : ""}
        ${c.notas ? `<p><b>Notas</b><span>${limpiar(c.notas)}</span></p>` : ""}
      </div>

      <div class="zx_cli_actions">
        ${tel ? `<button class="green" data-cli-tel="${limpiar(tel)}" data-cli-msg="${limpiar(c.mensaje_predefinido || "")}">☎ Llamar</button>` : ""}
        ${c.email ? `<button class="blue" data-cli-mail="${limpiar(c.email)}">✉ Email</button>` : ""}
        ${dir ? `<button class="purple" data-cli-map="${limpiar(dir)}">📍 Mapa</button>` : ""}
        ${puedeDocs() && c.documento_url ? `<button class="gray" data-cli-doc="${limpiar(c.documento_url)}">📄 Doc.</button>` : ""}
      </div>

      <div class="zx_cli_actions zx_cli_manage">
        ${puedeEditar() ? `<button class="blue" data-cli-edit="${limpiar(c.id)}">Editar</button>` : ""}
        ${puedeBorrar() ? `<button class="red" data-cli-del="${limpiar(c.id)}">Borrar</button>` : ""}
      </div>
    </article>
  `;
}

function renderListado(lista){
  if(!lista.length){
    return `<div class="zx_cli_empty">No hay clientes con este filtro.</div>`;
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
        ${toolbar(lista.length)}
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
  const res=document.getElementById("zx_cliente_resume");
  const box=document.getElementById("zx_clientes_lista");

  if(cont) cont.textContent=lista.length+" cliente(s)";
  if(res) res.textContent=lista.length+" resultado(s)";
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

  document.querySelectorAll("[data-cli-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_CLIENTES_FILTRO=btn.dataset.cliFilter || "todos";
      document.querySelectorAll("[data-cli-filter]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      repintarLista();
    };
  });
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
    btn.onclick=function(){menuTelefono(btn.dataset.cliTel,btn.dataset.cliMsg)};
  });

  document.querySelectorAll("[data-cli-mail]").forEach(btn=>{
    btn.onclick=function(){enviarMail(btn.dataset.cliMail)};
  });

  document.querySelectorAll("[data-cli-map]").forEach(btn=>{
    btn.onclick=function(){menuMapa(btn.dataset.cliMap)};
  });

  document.querySelectorAll("[data-cli-doc]").forEach(btn=>{
    btn.onclick=function(){window.open(btn.dataset.cliDoc,"_blank")};
  });

  document.querySelectorAll("[data-cli-edit]").forEach(btn=>{
    btn.onclick=function(){editarCliente(btn.dataset.cliEdit)};
  });

  document.querySelectorAll("[data-cli-del]").forEach(btn=>{
    btn.onclick=function(){borrarCliente(btn.dataset.cliDel)};
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

  document.getElementById("btn_cancelar_cliente").onclick=cerrarModal;
  document.getElementById("btn_guardar_cliente").onclick=function(){
    guardarCliente(c.id || null,c.documento_url || null,c.documento_nombre || null);
  };
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
    await window.ZX_clientes();

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
  const old=document.getElementById("zx_clientes_css_v3109");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_clientes_css_v3109";
  s.innerHTML=`
    .zx_cli_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_cli_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_cli_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_cli_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_cli_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_cli_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_cli_notice{grid-column:1/-1;background:#f8fafc;border:1px solid #dbe3ef;border-left:7px solid #64748b;border-radius:18px;padding:14px;color:#334155;font-size:15px;font-weight:900;line-height:1.35}
    .zx_cli_notice.danger{border-left-color:#dc2626;background:#fef2f2;color:#991b1b}
    .zx_cli_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_cli_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_cli_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_cli_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_cli_toolbar{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_cli_search{position:relative}
    .zx_cli_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_cli_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_cli_filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}
    .zx_cli_filters button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap;text-transform:capitalize}
    .zx_cli_filters button.on{background:#2563eb;color:white}
    .zx_cli_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_cli_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .zx_cli_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_cli_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_cli_list{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_cli_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:24px;padding:16px;overflow:hidden}
    .zx_cli_top{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center}
    .zx_cli_avatar{width:52px;height:52px;border-radius:18px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950}
    .zx_cli_top h3{margin:0;color:#071330;font-size:21px;line-height:1.15;font-weight:950}
    .zx_cli_type{margin-top:4px;color:#64748b;font-size:13px;font-weight:950;text-transform:capitalize}
    .zx_cli_info{margin-top:13px;display:grid;grid-template-columns:1fr;gap:8px}
    .zx_cli_info p{margin:0;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_cli_info b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_cli_info span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_cli_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_cli_actions button{border:0;border-radius:16px;padding:13px 8px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_cli_actions .green{background:#16a34a}.zx_cli_actions .blue{background:#2563eb}.zx_cli_actions .purple{background:#7c3aed}.zx_cli_actions .gray{background:#64748b}.zx_cli_actions .red{background:#dc2626}
    .zx_cli_manage:empty{display:none}
    .zx_cli_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_cli_error{color:#dc2626;font-weight:950;margin-top:10px}
    .zx_cli_form h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_cli_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_cli_form input,.zx_cli_form select,.zx_cli_form textarea,#zx_modal_cliente input,#zx_modal_cliente select,#zx_modal_cliente textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_cli_grid2,.zx_cli_grid3{display:grid;grid-template-columns:1fr;gap:10px}
    @media(max-width:390px){.zx_cli_panel{padding:15px;border-radius:22px}.zx_cli_header h2{font-size:27px}.zx_cli_actions{grid-template-columns:1fr}.zx_cli_kpis{grid-template-columns:1fr 1fr}.zx_cli_top h3{font-size:19px}}
    @media(min-width:700px){.zx_cli_shell{padding-bottom:32px}.zx_cli_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_cli_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_cli_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_cli_grid3{grid-template-columns:repeat(3,minmax(0,1fr))}}
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