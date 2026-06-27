// ===============================
// ZENTRYX PRO - CLIENTES PRO
// V3099 - PIN ADMINISTRADOR AL BORRAR CLIENTE
// ===============================
(function(){
"use strict";

let ZX_CLIENTES_CACHE=[];
let ZX_CLIENTES_BUSQUEDA="";
let ZX_CLIENTES_FILTRO="todos";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizarTexto(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function soloNumeros(v){return String(v ?? "").replace(/\D/g,"")}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function rolLocal(){return normalizarTexto(sesion().rol || "")}
function usuarioLocal(){return normalizarTexto(sesion().usuario || "")}
function esAdmin(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esGerente(){return rolLocal()==="gerente"}
function esSupervisor(){return rolLocal()==="supervisor"}
function esEncargado(){return rolLocal()==="encargado"}
function esAdministrativo(){return rolLocal()==="administrativo" || rolLocal()==="oficina"}
function esInvitado(){return rolLocal()==="invitado" || rolLocal()===""}

function puedeEntrarClientes(){return !esInvitado()}
function puedeGestionarClientes(){return esAdmin() || esGerente() || esSupervisor() || esEncargado() || esAdministrativo()}
function puedeCrearCliente(){return puedeGestionarClientes()}
function puedeEditarCliente(){return puedeGestionarClientes()}
function puedeBorrarCliente(){return esAdmin()}
function puedeVerDocumentoCliente(){return puedeGestionarClientes()}
function puedeSubirDocumentoCliente(){return puedeGestionarClientes()}

function cerrarModal(){
  const m=document.getElementById("zx_modal_cliente");
  if(m) m.remove();
}

function hashPin(pin){return btoa(String(pin))}

async function pedirPinAdminClientes(){
  return new Promise(function(resolve){
    cerrarModal();
    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_cliente" class="zx_modal_fondo">
        <div class="zx_modal_caja">
          <h2>PIN administrador</h2>
          <div class="zx_text">Introduce el PIN de administrador para continuar.</div>
          <input id="cli_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
          <div id="cli_pin_error" class="zx_text" style="color:#dc2626;font-weight:900;margin-top:10px;"></div>
          <button class="zx_btn_big zx_verde" id="cli_pin_ok">Confirmar</button>
          <button class="zx_btn_big zx_gris" id="cli_pin_cancelar">Cancelar</button>
        </div>
      </div>
    `);

    const input=document.getElementById("cli_pin_admin");
    const error=document.getElementById("cli_pin_error");

    document.getElementById("cli_pin_cancelar").onclick=function(){
      cerrarModal();
      resolve(false);
    };

    document.getElementById("cli_pin_ok").onclick=async function(){
      const pin=input.value.trim();

      if(!/^[0-9]{4}$/.test(pin)){
        error.textContent="PIN inválido.";
        input.value="";
        input.focus();
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

      const admin=normalizarTexto(r.data.rol)==="administrador" || normalizarTexto(r.data.usuario)==="admin";

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

function textoBusquedaCliente(c){
  return normalizarTexto([
    c.nombre,c.tipo,c.nif,c.persona_contacto,c.telefono,c.telefono_2,c.email,
    c.direccion,c.numero,c.portal,c.escalera,c.piso,c.puerta,c.codigo_postal,
    c.poblacion,c.provincia,c.pais,c.notas,direccionCompleta(c)
  ].join(" "));
}

function coincideBusquedaCliente(c,busqueda){
  const q=normalizarTexto(busqueda);
  if(!q) return true;

  const texto=textoBusquedaCliente(c);
  if(texto.includes(q)) return true;

  const palabras=q.split(/\s+/).map(x=>x.trim()).filter(Boolean);
  if(palabras.length && palabras.every(p=>texto.includes(p))) return true;

  const qNum=soloNumeros(q);
  if(qNum){
    const nums=soloNumeros([c.telefono,c.telefono_2,c.nif,c.codigo_postal,c.numero].join(" "));
    if(nums.includes(qNum)) return true;
  }

  return false;
}

function telefonoLimpio(tel){
  let n=String(tel||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function menuTelefono(tel,mensaje){
  const n=telefonoLimpio(tel);

  if(!n){
    alert("Sin teléfono.");
    return;
  }

  const msg=encodeURIComponent(mensaje || "");

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_cliente" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Teléfono</h2>
        <button class="zx_btn_big zx_azul" id="cli_tel_llamar">Llamar</button>
        <button class="zx_btn_big zx_verde" id="cli_tel_sms">SMS</button>
        <button class="zx_btn_big zx_verde" id="cli_tel_was">WhatsApp</button>
        <button class="zx_btn_big zx_gris" id="cli_tel_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("cli_tel_llamar").onclick=function(){location.href="tel:"+n};
  document.getElementById("cli_tel_sms").onclick=function(){location.href="sms:"+n+(mensaje ? "&body="+msg : "")};
  document.getElementById("cli_tel_was").onclick=function(){location.href="https://wa.me/"+n.replace("+","")+(mensaje ? "?text="+msg : "")};
  document.getElementById("cli_tel_cerrar").onclick=cerrarModal;
}

function enviarMail(email){
  if(!email){
    alert("Sin email.");
    return;
  }

  location.href="mailto:"+email;
}

function menuMapa(dir){
  if(!dir){
    alert("Sin dirección.");
    return;
  }

  const q=encodeURIComponent(dir);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_cliente" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Mapa</h2>
        <button class="zx_btn_big zx_azul" id="cli_map_apple">Apple Maps</button>
        <button class="zx_btn_big zx_verde" id="cli_map_google">Google Maps</button>
        <button class="zx_btn_big zx_naranja" id="cli_map_waze">Waze</button>
        <button class="zx_btn_big zx_gris" id="cli_map_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("cli_map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("cli_map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("cli_map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("cli_map_cerrar").onclick=cerrarModal;
}

async function subirArchivo(file,nombre){
  if(!puedeSubirDocumentoCliente()){
    alert("No tienes permiso para subir documentos de clientes.");
    return null;
  }

  if(!file) return null;

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

async function cargarClientes(){
  if(!puedeEntrarClientes()){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Clientes</h2>
        <div class="zx_text">No tienes permiso para acceder a Clientes.</div>
      </div>
    `;
    return [];
  }

  const r=await sb()
    .from("clientes")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">${limpiar(r.error.message)}</div>
      </div>
    `;
    return [];
  }

  ZX_CLIENTES_CACHE=r.data || [];
  return filtrarClientes();
}

function filtrarClientes(){
  let base=ZX_CLIENTES_CACHE || [];

  if(ZX_CLIENTES_FILTRO!=="todos"){
    base=base.filter(c=>normalizarTexto(c.tipo)===normalizarTexto(ZX_CLIENTES_FILTRO));
  }

  if(ZX_CLIENTES_BUSQUEDA.trim()){
    base=base.filter(c=>coincideBusquedaCliente(c,ZX_CLIENTES_BUSQUEDA));
  }

  return base;
}

function renderBuscadorClientes(total){
  return `
    <div class="zx_cliente_toolbar">
      <div class="zx_cliente_search">
        <input id="zx_buscar_clientes" type="search" value="${limpiar(ZX_CLIENTES_BUSQUEDA)}" placeholder="Buscar cliente, teléfono, email, dirección, NIF..." autocomplete="off">
        ${ZX_CLIENTES_BUSQUEDA ? `<button id="zx_limpiar_clientes" type="button">✕</button>` : ""}
      </div>

      <div class="zx_cliente_filter">
        ${["todos","particular","empresa","comunidad","administración","otro"].map(t=>`
          <button class="${ZX_CLIENTES_FILTRO===t ? "zx_filter_on" : ""}" data-cli-filter="${limpiar(t)}">${limpiar(t==="todos" ? "Todos" : t)}</button>
        `).join("")}
      </div>

      <div class="zx_cliente_resume" id="zx_cliente_resume">${limpiar(total)} resultado(s)</div>
    </div>
  `;
}

function renderListadoClientes(datos){
  return datos.length ? datos.map(renderCliente).join("") : `<div class="zx_text">No hay clientes con este filtro o búsqueda.</div>`;
}

function conectarBuscadorClientes(){
  const buscar=document.getElementById("zx_buscar_clientes");
  const lista=document.getElementById("zx_clientes_lista");
  const contador=document.getElementById("zx_clientes_contador");
  const resumen=document.getElementById("zx_cliente_resume");

  function repintar(){
    const datos=filtrarClientes();
    if(contador) contador.textContent=datos.length+" cliente(s)";
    if(resumen) resumen.textContent=datos.length+" resultado(s)";
    if(lista){
      lista.innerHTML=renderListadoClientes(datos);
      conectarAccionesClientes();
    }
  }

  if(buscar){
    buscar.oninput=function(){
      ZX_CLIENTES_BUSQUEDA=buscar.value || "";
      repintar();

      const b=document.getElementById("zx_limpiar_clientes");

      if(!b && ZX_CLIENTES_BUSQUEDA){
        const caja=buscar.closest(".zx_cliente_search");
        if(caja){
          caja.insertAdjacentHTML("beforeend",`<button id="zx_limpiar_clientes" type="button">✕</button>`);
          conectarBotonLimpiarClientes(repintar);
        }
      }

      if(b && !ZX_CLIENTES_BUSQUEDA){
        b.remove();
      }
    };
  }

  conectarBotonLimpiarClientes(repintar);

  document.querySelectorAll("[data-cli-filter]").forEach(btn=>{
    btn.onclick=function(){
      ZX_CLIENTES_FILTRO=btn.dataset.cliFilter || "todos";
      repintar();

      document.querySelectorAll("[data-cli-filter]").forEach(b=>b.classList.remove("zx_filter_on"));
      btn.classList.add("zx_filter_on");
    };
  });
}

function conectarBotonLimpiarClientes(repintar){
  const b=document.getElementById("zx_limpiar_clientes");
  const buscar=document.getElementById("zx_buscar_clientes");

  if(b){
    b.onclick=function(){
      ZX_CLIENTES_BUSQUEDA="";
      if(buscar) buscar.value="";
      b.remove();
      repintar();
      if(buscar) buscar.focus();
    };
  }
}

function renderCliente(c){
  const dir=direccionCompleta(c);
  const gestion=puedeGestionarClientes();

  return `
    <div class="zx_cliente_card">
      <div class="zx_cliente_name">${limpiar(c.nombre || "Cliente")}</div>

      <div class="zx_cliente_data">
        <b>Tipo:</b> ${limpiar(c.tipo || "-")}<br>
        ${gestion ? `<b>NIF/CIF:</b> ${limpiar(c.nif || "-")}<br>` : ""}
        <b>Teléfono:</b> ${limpiar(c.telefono || "-")}<br>
        ${gestion && c.telefono_2 ? `<b>Teléfono 2:</b> ${limpiar(c.telefono_2 || "-")}<br>` : ""}
        <b>Email:</b> ${limpiar(c.email || "-")}<br>
        <b>Contacto:</b> ${limpiar(c.persona_contacto || "-")}<br>
        <b>Dirección:</b> ${limpiar(dir || "-")}<br>
        <b>Notas técnicas:</b> ${limpiar(c.notas || "-")}
      </div>

      <div class="zx_cliente_actions">
        ${c.telefono ? `<button class="zx_action_btn" data-cli-tel="${limpiar(c.telefono)}" data-cli-msg="${limpiar(c.mensaje_predefinido || "")}">Teléfono</button>` : ""}
        ${c.email ? `<button class="zx_action_btn" data-cli-mail="${limpiar(c.email)}">Mail</button>` : ""}
        ${dir ? `<button class="zx_action_btn" data-cli-map="${limpiar(dir)}">Mapa</button>` : ""}
        ${puedeVerDocumentoCliente() && c.documento_url ? `<button class="zx_action_btn zx_blue" data-cli-doc="${limpiar(c.documento_url)}">Documento</button>` : ""}
      </div>

      ${
        puedeEditarCliente() || puedeBorrarCliente()
        ? `
          <div class="zx_cliente_actions">
            ${puedeEditarCliente() ? `<button class="zx_action_btn zx_blue" data-cli-edit="${limpiar(c.id)}">Editar</button>` : ""}
            ${puedeBorrarCliente() ? `<button class="zx_action_btn zx_red" data-cli-del="${limpiar(c.id)}">Borrar</button>` : ""}
          </div>
        `
        : `<div class="zx_permiso_info">Modo consulta: no puedes crear, editar ni borrar clientes.</div>`
      }
    </div>
  `;
}

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function selectTipo(valor){
  const opciones=["particular","empresa","comunidad","administración","otro"];

  return `
    <label class="zx_label" for="c_tipo">Tipo</label>
    <select id="c_tipo">
      ${opciones.map(o=>`
        <option value="${limpiar(o)}" ${String(valor||"particular")===o ? "selected" : ""}>
          ${limpiar(o)}
        </option>
      `).join("")}
    </select>
  `;
}

function selectVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];

  return `
    <label class="zx_label" for="c_via_tipo">Tipo de vía</label>
    <select id="c_via_tipo">
      ${opciones.map(o=>`
        <option value="${limpiar(o)}" ${String(valor||"")===o ? "selected" : ""}>
          ${limpiar(o || "Seleccionar")}
        </option>
      `).join("")}
    </select>
  `;
}

function formulario(c={}){
  if(c.id && !puedeEditarCliente()){
    alert("No tienes permiso para editar clientes.");
    return;
  }

  if(!c.id && !puedeCrearCliente()){
    alert("No tienes permiso para crear clientes.");
    return;
  }

  cerrarModal();
  const tipoInicial=String(c.tipo || "particular");

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_cliente" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${c.id ? "Editar cliente" : "Nuevo cliente"}</h2>

        ${!c.id ? `
          <h3 class="zx_form_subtitle">Tipo de cliente</h3>
          <div class="zx_tipo_cliente_grid">
            <button class="zx_tipo_cliente_btn ${tipoInicial==="particular" ? "zx_tipo_on" : ""}" data-tipo-cliente="particular">Particular</button>
            <button class="zx_tipo_cliente_btn ${tipoInicial==="empresa" ? "zx_tipo_on" : ""}" data-tipo-cliente="empresa">Empresa</button>
            <button class="zx_tipo_cliente_btn ${tipoInicial==="comunidad" ? "zx_tipo_on" : ""}" data-tipo-cliente="comunidad">Comunidad</button>
            <button class="zx_tipo_cliente_btn ${tipoInicial==="administración" ? "zx_tipo_on" : ""}" data-tipo-cliente="administración">Administración</button>
          </div>
        ` : ``}

        <input id="c_tipo_valor" type="hidden" value="${limpiar(c.tipo || "particular")}">
        <div id="zx_cliente_form_campos"></div>

        <button class="zx_btn_big zx_verde" id="btn_guardar_cliente">Guardar cliente</button>
        <button class="zx_btn_big zx_gris" id="btn_cancelar_cliente">Cancelar</button>
      </div>
    </div>
  `);

  renderCamposCliente(c,tipoInicial);

  document.querySelectorAll("[data-tipo-cliente]").forEach(btn=>{
    btn.onclick=function(){
      const tipo=btn.dataset.tipoCliente || "particular";
      document.getElementById("c_tipo_valor").value=tipo;
      document.querySelectorAll("[data-tipo-cliente]").forEach(b=>b.classList.remove("zx_tipo_on"));
      btn.classList.add("zx_tipo_on");
      renderCamposCliente(c,tipo);
    };
  });

  document.getElementById("btn_cancelar_cliente").onclick=cerrarModal;
  document.getElementById("btn_guardar_cliente").onclick=function(){
    guardarCliente(c.id || null,c.documento_url || null,c.documento_nombre || null);
  };
}

function renderCamposCliente(c,tipo){
  const caja=document.getElementById("zx_cliente_form_campos");
  if(!caja) return;

  const esEmpresa=tipo==="empresa" || tipo==="comunidad" || tipo==="administración";

  caja.innerHTML=`
    <h3 class="zx_form_subtitle">Datos principales</h3>
    ${input("c_nombre",esEmpresa ? "Nombre fiscal / razón social" : "Nombre completo",c.nombre)}
    ${input("c_nif",esEmpresa ? "CIF / NIF" : "DNI / NIE",c.nif)}
    ${esEmpresa ? input("c_persona_contacto","Persona de contacto",c.persona_contacto) : `<input id="c_persona_contacto" type="hidden" value="${limpiar(c.persona_contacto || "")}">`}

    <h3 class="zx_form_subtitle">Contacto</h3>
    ${input("c_telefono","Teléfono principal",c.telefono,"tel")}
    ${input("c_telefono_2","Teléfono secundario",c.telefono_2,"tel")}
    ${input("c_email","Email",c.email,"email")}

    <h3 class="zx_form_subtitle">Dirección</h3>
    ${selectVia(c.via_tipo || "")}
    ${input("c_direccion","Dirección",c.direccion)}
    ${input("c_numero","Número",c.numero)}
    ${input("c_portal","Portal",c.portal)}
    ${input("c_escalera","Escalera",c.escalera)}
    ${input("c_piso","Piso",c.piso)}
    ${input("c_puerta","Puerta",c.puerta)}
    ${input("c_codigo_postal","Código postal",c.codigo_postal)}
    ${input("c_poblacion","Población",c.poblacion)}
    ${input("c_provincia","Provincia",c.provincia)}
    ${input("c_pais","País",c.pais || "España")}

    ${
      puedeSubirDocumentoCliente()
      ? `
        <h3 class="zx_form_subtitle">Documentación</h3>
        <label class="zx_label" for="c_documento">Documento</label>
        <input id="c_documento" type="file" accept="image/*,.pdf,.doc,.docx">
        ${c.documento_url ? `<a class="zx_btn_big zx_azul" href="${limpiar(c.documento_url)}" target="_blank">Ver documento actual</a>` : ""}
      `
      : `<input id="c_documento" type="file" style="display:none">`
    }

    <h3 class="zx_form_subtitle">Notas y mensaje</h3>
    <label class="zx_label" for="c_notas">Notas técnicas</label>
    <textarea id="c_notas" rows="4" placeholder="Notas técnicas">${limpiar(c.notas || "")}</textarea>

    <label class="zx_label" for="c_mensaje">Mensaje predefinido WhatsApp/SMS</label>
    <textarea id="c_mensaje" rows="4" placeholder="Mensaje">${limpiar(c.mensaje_predefinido || "")}</textarea>
  `;
}

async function guardarCliente(id,documentoActual,nombreDocActual){
  if(id && !puedeEditarCliente()){
    alert("No tienes permiso para editar clientes.");
    return;
  }

  if(!id && !puedeCrearCliente()){
    alert("No tienes permiso para crear clientes.");
    return;
  }

  const s=sesion();
  const nombre=document.getElementById("c_nombre").value.trim();

  if(!nombre){
    alert("Nombre obligatorio.");
    return;
  }

  const file=document.getElementById("c_documento").files[0] || null;
  const docUrl=await subirArchivo(file,nombre);

  const datos={
    nombre,
    tipo:document.getElementById("c_tipo_valor").value,
    nif:document.getElementById("c_nif").value.trim(),
    persona_contacto:document.getElementById("c_persona_contacto").value.trim(),
    telefono:document.getElementById("c_telefono").value.trim(),
    telefono_2:document.getElementById("c_telefono_2").value.trim(),
    email:document.getElementById("c_email").value.trim().toLowerCase(),

    via_tipo:document.getElementById("c_via_tipo").value,
    direccion:document.getElementById("c_direccion").value.trim(),
    numero:document.getElementById("c_numero").value.trim(),
    portal:document.getElementById("c_portal").value.trim(),
    escalera:document.getElementById("c_escalera").value.trim(),
    piso:document.getElementById("c_piso").value.trim(),
    puerta:document.getElementById("c_puerta").value.trim(),
    codigo_postal:document.getElementById("c_codigo_postal").value.trim(),
    poblacion:document.getElementById("c_poblacion").value.trim(),
    provincia:document.getElementById("c_provincia").value.trim(),
    pais:document.getElementById("c_pais").value.trim(),

    notas:document.getElementById("c_notas").value.trim(),
    mensaje_predefinido:document.getElementById("c_mensaje").value.trim(),

    documento_url:docUrl || documentoActual || null,
    documento_nombre:file ? file.name : nombreDocActual || null,

    creado_por:s.usuario || "",
    usuario_id:String(s.id || "")
  };

  let r;

  if(id){
    r=await sb()
      .from("clientes")
      .update(datos)
      .eq("id",id);
  }else{
    r=await sb()
      .from("clientes")
      .insert([datos]);
  }

  if(r.error){
    alert("Error guardando cliente: "+r.error.message);
    return;
  }

  cerrarModal();
  ZX_clientes();
}

async function editarCliente(id){
  if(!puedeEditarCliente()){
    alert("No tienes permiso para editar clientes.");
    return;
  }

  const r=await sb()
    .from("clientes")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r.error || !r.data){
    alert("Cliente no encontrado.");
    return;
  }

  formulario(r.data);
}

async function borrarCliente(id){
  if(!puedeBorrarCliente()){
    alert("No tienes permiso para borrar clientes.");
    return;
  }

  const cliente=ZX_CLIENTES_CACHE.find(function(c){
    return String(c.id)===String(id);
  });

  const nombre=cliente ? (cliente.nombre || "cliente") : "cliente";

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_cliente" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Borrar cliente</h2>

        <div class="zx_permiso_info" style="border-left-color:#dc2626;">
          Vas a borrar el cliente:<br><br>
          <b>${limpiar(nombre)}</b><br><br>
          Esta acción requiere PIN de administrador.
        </div>

        <button class="zx_btn_big zx_rojo" id="cli_borrar_confirmar">Continuar</button>
        <button class="zx_btn_big zx_gris" id="cli_borrar_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("cli_borrar_cancelar").onclick=cerrarModal;

  document.getElementById("cli_borrar_confirmar").onclick=async function(){
    const ok=await pedirPinAdminClientes();

    if(!ok) return;

    const r=await sb()
      .from("clientes")
      .delete()
      .eq("id",id);

    if(r.error){
      alert("Error borrando cliente: "+r.error.message);
      return;
    }

    cerrarModal();
    ZX_clientes();
  };
}

window.ZX_clientes=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="clientes"){
      b.classList.add("zx_activo");
    }
  });

  const datos=await cargarClientes();
  if(!puedeEntrarClientes()) return;

  app().innerHTML=`
    <div class="zx_card zx_clientes_head">
      <div class="zx_clientes_head_top">
        <div>
          <h2>Clientes</h2>
          <div class="zx_text" id="zx_clientes_contador">${datos.length} cliente(s)</div>
        </div>
        ${puedeCrearCliente() ? `<button class="zx_btn_mini zx_verde" id="btn_nuevo_cliente">Crear</button>` : ``}
      </div>

      <div class="zx_text">Consulta de clientes, contacto y dirección según permisos.</div>
      ${!puedeCrearCliente() ? `<div class="zx_permiso_info">Modo consulta: no puedes crear ni editar clientes.</div>` : ``}
      ${renderBuscadorClientes(datos.length)}
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      <div id="zx_clientes_lista">${renderListadoClientes(datos)}</div>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_cliente");
  if(nuevo){
    nuevo.onclick=function(){
      formulario({});
    };
  }

  conectarBuscadorClientes();
  conectarAccionesClientes();
};

function conectarAccionesClientes(){
  document.querySelectorAll("[data-cli-tel]").forEach(btn=>{
    btn.onclick=function(){menuTelefono(btn.dataset.cliTel,btn.dataset.cliMsg)}
  });

  document.querySelectorAll("[data-cli-mail]").forEach(btn=>{
    btn.onclick=function(){enviarMail(btn.dataset.cliMail)}
  });

  document.querySelectorAll("[data-cli-map]").forEach(btn=>{
    btn.onclick=function(){menuMapa(btn.dataset.cliMap)}
  });

  document.querySelectorAll("[data-cli-doc]").forEach(btn=>{
    btn.onclick=function(){
      if(!puedeVerDocumentoCliente()){
        alert("No tienes permiso para ver documentos de clientes.");
        return;
      }
      window.open(btn.dataset.cliDoc,"_blank");
    }
  });

  document.querySelectorAll("[data-cli-edit]").forEach(btn=>{
    btn.onclick=function(){editarCliente(btn.dataset.cliEdit)}
  });

  document.querySelectorAll("[data-cli-del]").forEach(btn=>{
    btn.onclick=function(){borrarCliente(btn.dataset.cliDel)}
  });
}

(function estilosClientes(){
  const old=document.getElementById("zx_clientes_v3098");
  if(old) old.remove();

  if(document.getElementById("zx_clientes_v3099")) return;

  const s=document.createElement("style");
  s.id="zx_clientes_v3099";

  s.innerHTML=`
    .zx_cliente_card{
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:22px;
      margin:18px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.04);
    }

    .zx_cliente_name{
      font-size:30px;
      font-weight:900;
      color:#0f172a;
      margin-bottom:10px;
    }

    .zx_cliente_data{
      color:#334155;
      font-size:18px;
      line-height:1.55;
      font-weight:700;
    }

    .zx_cliente_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:14px;
    }

    .zx_action_btn{
      border:0;
      border-radius:16px;
      background:#e5e7eb;
      padding:14px;
      font-size:17px;
      font-weight:900;
      color:#111827;
    }

    .zx_blue{background:#2563eb!important;color:white!important}
    .zx_red{background:#dc2626!important;color:white!important}

    .zx_permiso_info{
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-left:8px solid #64748b;
      border-radius:16px;
      padding:12px;
      margin:14px 0 0;
      color:#334155;
      font-size:15px;
      font-weight:900;
      line-height:1.4;
    }

    .zx_label{
      display:block;
      margin:12px 0 6px;
      color:#334155;
      font-size:15px;
      font-weight:900;
    }

    .zx_form_subtitle{
      margin:22px 0 8px;
      color:#0f172a;
      font-size:24px;
      font-weight:900;
    }

    .zx_clientes_head_top{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .zx_btn_mini{border:0;border-radius:14px;padding:12px 18px;font-size:15px;font-weight:900}
    .zx_cliente_toolbar{display:flex;flex-direction:column;gap:12px;margin-top:14px}
    .zx_cliente_search{position:relative}
    .zx_cliente_search input{width:100%;margin:0!important;padding-right:48px!important}
    .zx_cliente_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e5e7eb;width:32px;height:32px;border-radius:10px;font-weight:900}
    .zx_cliente_filter{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .zx_cliente_filter button{border:0;border-radius:14px;background:#e5e7eb;color:#111827;padding:11px 8px;font-size:13px;font-weight:900;text-transform:capitalize}
    .zx_filter_on{background:#2563eb!important;color:white!important}
    .zx_cliente_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_tipo_cliente_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 18px}
    .zx_tipo_cliente_btn{border:1px solid #d1d5db;background:#f8fafc;border-radius:18px;padding:18px 12px;color:#0f172a;font-size:17px;font-weight:900}
    .zx_tipo_on{background:#2563eb!important;color:white!important;border-color:#2563eb!important}

    @media(max-width:430px){
      .zx_cliente_actions{grid-template-columns:1fr}
      .zx_cliente_card{padding:16px;border-radius:20px}
      .zx_cliente_name{font-size:24px}
      .zx_cliente_data{font-size:16px}
    }
  `;

  document.head.appendChild(s);
})();

console.log("ZENTRYX clientes.js V3099 cargado");

})();
