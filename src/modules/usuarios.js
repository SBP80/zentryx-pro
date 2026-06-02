// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3103 - DIRECTORIO PRIVADO POR ROL
// ===============================
(function(){
"use strict";

const BUCKET_FOTOS="zentryx-usuarios";
const BUCKET_DOCS="zentryx-usuarios-documentos";
let ZX_USUARIOS_CACHE=[];

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

function sesion(){
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

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" ||
         String(s.usuario||"").toLowerCase()==="admin";
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_usuario");
  if(m) m.remove();
}

function modal(titulo,html){
  cerrarModal();
  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_usuario" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(titulo)}</h2>
        ${html}
      </div>
    </div>
  `);
}

function hashPin(pin){return btoa(String(pin))}

function formatoFecha(f){
  if(!f) return "";
  const p=String(f).slice(0,10).split("-");
  if(p.length===3) return p[2]+"/"+p[1]+"/"+p[0];
  return String(f);
}

function direccionCompleta(u){
  return [
    u.via_tipo,
    u.calle,
    u.numero ? "Nº "+u.numero : "",
    u.portal ? "Portal "+u.portal : "",
    u.escalera ? "Esc. "+u.escalera : "",
    u.piso ? "Piso "+u.piso : "",
    u.puerta ? "Puerta "+u.puerta : "",
    u.poblacion,
    u.provincia,
    u.codigo_postal,
    u.pais
  ].filter(Boolean).join(", ");
}

function avatar(u){
  if(u.foto_url){
    return `<img class="zx_user_avatar" src="${limpiar(u.foto_url)}" alt="Foto">`;
  }
  return `<div class="zx_user_avatar zx_user_avatar_empty">${limpiar((u.nombre || "?").charAt(0))}</div>`;
}

function telefonoLimpio(tel){
  let n=String(tel||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);
  if(!n){alert("Sin teléfono.");return}

  modal("Teléfono",`
    <button class="zx_btn_big zx_azul" id="tel_llamar">Llamar</button>
    <button class="zx_btn_big zx_verde" id="tel_sms">SMS</button>
    <button class="zx_btn_big zx_verde" id="tel_whatsapp">WhatsApp</button>
    <button class="zx_btn_big zx_gris" id="tel_cerrar">Cerrar</button>
  `);

  document.getElementById("tel_llamar").onclick=function(){location.href="tel:"+n};
  document.getElementById("tel_sms").onclick=function(){location.href="sms:"+n};
  document.getElementById("tel_whatsapp").onclick=function(){location.href="https://wa.me/"+n.replace("+","")};
  document.getElementById("tel_cerrar").onclick=cerrarModal;
}

function enviarMail(email){
  if(!email){alert("Sin email.");return}
  location.href="mailto:"+email;
}

function menuMapa(dir){
  if(!dir){alert("Sin dirección.");return}
  const q=encodeURIComponent(dir);

  modal("Mapa",`
    <button class="zx_btn_big zx_azul" id="map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="map_waze">Waze</button>
    <button class="zx_btn_big zx_gris" id="map_cerrar">Cerrar</button>
  `);

  document.getElementById("map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("map_cerrar").onclick=cerrarModal;
}

async function pedirPinAdmin(callback){
  const s=sesion();

  modal("PIN administrador",`
    <div class="zx_text">Introduce tu PIN para continuar.</div>
    <input id="zx_admin_pin" class="zx_pin_input" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">
    <button class="zx_btn_big zx_azul" id="zx_pin_ok">Confirmar</button>
    <button class="zx_btn_big zx_gris" id="zx_pin_cancelar">Cancelar</button>
  `);

  document.getElementById("zx_pin_cancelar").onclick=cerrarModal;

  document.getElementById("zx_pin_ok").onclick=async function(){
    const pin=document.getElementById("zx_admin_pin").value.trim();

    if(!/^[0-9]{4}$/.test(pin)){
      alert("PIN inválido.");
      return;
    }

    const r=await sb()
      .from("usuarios")
      .select("id,usuario,rol,pin_hash")
      .eq("id",s.id)
      .maybeSingle();

    if(r.error || !r.data){
      alert("No se pudo validar el usuario.");
      return;
    }

    const admin=String(r.data.rol||"").toLowerCase()==="administrador" ||
                String(r.data.usuario||"").toLowerCase()==="admin";

    if(!admin){
      alert("Solo administrador.");
      return;
    }

    if(hashPin(pin)!==r.data.pin_hash){
      alert("PIN incorrecto.");
      return;
    }

    cerrarModal();
    callback();
  };
}

async function cargarUsuarios(){
  const r=await sb()
    .from("usuarios")
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

  ZX_USUARIOS_CACHE=r.data || [];
  return ZX_USUARIOS_CACHE;
}

function renderUsuario(u){
  const admin=esAdmin();
  const dir=direccionCompleta(u);
  const pinEstado=u.debe_crear_pin ? "Pendiente" : "Activo";

  return `
    <div class="zx_user_card">
      <div class="zx_user_top">
        ${avatar(u)}
        <div class="zx_user_head">
          <div class="zx_user_name">${limpiar(u.nombre || u.usuario || "-")}</div>
          <div class="zx_user_role">${limpiar(u.rol || "Usuario")} · ${limpiar(u.estado || "Activo")}</div>
          <div class="zx_user_phone">${limpiar(u.telefono || "Sin teléfono")}</div>
        </div>
      </div>

      <details class="zx_user_details">
        <summary>Ver ficha</summary>

        <div class="zx_user_data">
          <b>Teléfono:</b> ${limpiar(u.telefono || "-")}<br>
          <b>Email:</b> <span class="zx_break">${limpiar(u.email || "-")}</span><br>
          <b>Dirección:</b> <span class="zx_break">${limpiar(dir || "Sin dirección")}</span><br>
          <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
          <b>Estado:</b> ${limpiar(u.estado || "-")}

          ${
            admin
            ? `
              <br><b>Usuario:</b> ${limpiar(u.usuario || "-")}
              <br><b>DNI:</b> ${limpiar(u.dni || "-")}
              <br><b>PIN:</b> ${limpiar(pinEstado)}
            `
            : ""
          }
        </div>
      </details>

      <div class="zx_user_actions">
        ${u.telefono ? `<button class="zx_action_btn" data-action="tel" data-tel="${limpiar(u.telefono)}">Teléfono</button>` : ""}
        ${u.email ? `<button class="zx_action_btn" data-action="mail" data-email="${limpiar(u.email)}">Mail</button>` : ""}
        ${dir ? `<button class="zx_action_btn" data-action="mapa" data-dir="${limpiar(dir)}">Mapa</button>` : ""}
        <button class="zx_action_btn zx_morado_btn" data-action="mensaje" data-id="${limpiar(u.id)}">Mensaje</button>
      </div>

      ${
        admin
        ? `
          <div class="zx_user_actions">
            <button class="zx_action_btn zx_blue" data-action="docs" data-id="${limpiar(u.id)}">Documentos</button>
            <button class="zx_action_btn zx_blue" data-action="editar" data-id="${limpiar(u.id)}">Editar</button>
            <button class="zx_action_btn zx_yellow" data-action="reset" data-id="${limpiar(u.id)}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Reset PIN</button>
            <button class="zx_action_btn zx_red" data-action="eliminar" data-id="${limpiar(u.id)}" data-usuario="${limpiar(u.usuario || "")}" data-nombre="${limpiar(u.nombre || u.usuario || "usuario")}">Eliminar</button>
          </div>
        `
        : ""
      }
    </div>
  `;
}

window.ZENTRYX_UI_usuarios=async function(){
  const usuarios=await cargarUsuarios();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">
        Directorio interno de empresa, contacto, documentos y permisos.
      </div>

      ${esAdmin() ? `<button class="zx_btn_big zx_verde" id="btn_crear_usuario">Crear usuario</button>` : ""}
    </div>

    <div class="zx_card">
      <h2>Directorio</h2>
      ${
        usuarios.length
        ? usuarios.map(renderUsuario).join("")
        : `<div class="zx_text">No hay usuarios.</div>`
      }
    </div>
  `;

  const crear=document.getElementById("btn_crear_usuario");
  if(crear){
    crear.onclick=function(){
      pedirPinAdmin(function(){formularioUsuario({})});
    };
  }

  document.querySelectorAll("[data-action]").forEach(btn=>{
    btn.onclick=function(){
      const a=btn.dataset.action;

      if(a==="tel") menuTelefono(btn.dataset.tel);
      if(a==="mail") enviarMail(btn.dataset.email);
      if(a==="mapa") menuMapa(btn.dataset.dir);
      if(a==="mensaje") alert("Mensajes internos pendiente de crear.");

      if(a==="docs"){
        pedirPinAdmin(function(){abrirDocumentos(btn.dataset.id)});
      }

      if(a==="editar"){
        pedirPinAdmin(function(){editarUsuario(btn.dataset.id)});
      }

      if(a==="reset"){
        pedirPinAdmin(function(){resetPin(btn.dataset.id,btn.dataset.nombre)});
      }

      if(a==="eliminar"){
        pedirPinAdmin(function(){eliminarUsuario(btn.dataset.id,btn.dataset.nombre,btn.dataset.usuario)});
      }
    };
  });
};

window.ZX_usuarios=function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="usuarios") b.classList.add("zx_activo");
  });

  window.ZENTRYX_UI_usuarios();
};

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${label}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${label}">
  `;
}

function selectVia(valor){
  const opciones=["","Calle","Avenida","Plaza","Camino","Carretera","Paseo","Ronda","Travesía","Urbanización","Polígono"];
  return `
    <label class="zx_label" for="u_via_tipo">Tipo de vía</label>
    <select id="u_via_tipo">
      ${opciones.map(o=>`
        <option value="${limpiar(o)}" ${String(valor||"")===o ? "selected" : ""}>
          ${limpiar(o || "Seleccionar")}
        </option>
      `).join("")}
    </select>
  `;
}

function formularioUsuario(u){
  const editando=!!u.id;

  modal(editando ? "Editar usuario" : "Crear usuario",`
    ${editando ? avatar(u) : ""}

    <label class="zx_label">Foto</label>
    <input id="u_foto" type="file" accept="image/*">

    ${input("u_nombre","Nombre completo",u.nombre)}
    ${input("u_usuario","Usuario",u.usuario)}
    ${input("u_dni","DNI / NIE",u.dni)}
    ${input("u_telefono","Teléfono",u.telefono,"tel")}
    ${input("u_email","Email",u.email,"email")}

    <h3 class="zx_form_subtitle">Dirección</h3>

    ${selectVia(u.via_tipo || "")}
    ${input("u_calle","Calle / vía",u.calle)}
    ${input("u_numero","Número",u.numero)}
    ${input("u_portal","Portal",u.portal)}
    ${input("u_escalera","Escalera",u.escalera)}
    ${input("u_piso","Piso",u.piso)}
    ${input("u_puerta","Puerta",u.puerta)}
    ${input("u_poblacion","Población",u.poblacion)}
    ${input("u_provincia","Provincia",u.provincia)}
    ${input("u_codigo_postal","Código postal",u.codigo_postal)}
    ${input("u_pais","País",u.pais || "España")}

    <h3 class="zx_form_subtitle">Acceso</h3>

    <label class="zx_label">Rol</label>
    <select id="u_rol">
      <option ${u.rol==="Administrador" ? "selected" : ""}>Administrador</option>
      <option ${u.rol==="Encargado" ? "selected" : ""}>Encargado</option>
      <option ${u.rol==="Operario" ? "selected" : ""}>Operario</option>
      <option ${u.rol==="Oficina" ? "selected" : ""}>Oficina</option>
      <option ${u.rol==="Técnico" ? "selected" : ""}>Técnico</option>
      <option ${u.rol==="Comercial" ? "selected" : ""}>Comercial</option>
    </select>

    <label class="zx_label">Estado</label>
    <select id="u_estado">
      <option ${u.estado==="Activo" ? "selected" : ""}>Activo</option>
      <option ${u.estado==="Inactivo" ? "selected" : ""}>Inactivo</option>
    </select>

    <button class="zx_btn_big ${editando ? "zx_azul" : "zx_verde"}" id="u_guardar">
      ${editando ? "Guardar cambios" : "Guardar usuario"}
    </button>

    <button class="zx_btn_big zx_gris" id="u_cancelar">Cancelar</button>
  `);

  document.getElementById("u_cancelar").onclick=cerrarModal;
  document.getElementById("u_guardar").onclick=function(){
    guardarUsuario(u.id || null,u.foto_url || null);
  };
}

async function editarUsuario(id){
  const r=await sb()
    .from("usuarios")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r.error || !r.data){
    alert("Usuario no encontrado.");
    return;
  }

  formularioUsuario(r.data);
}

async function subirFoto(file,usuario){
  if(!file) return null;

  const ext=(file.name.split(".").pop() || "jpg").toLowerCase();
  const safe=String(usuario||"usuario").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="usuarios/"+safe+"_"+Date.now()+"."+ext;

  const r=await sb().storage
    .from(BUCKET_FOTOS)
    .upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo foto: "+r.error.message);
    return null;
  }

  return sb().storage.from(BUCKET_FOTOS).getPublicUrl(path).data.publicUrl;
}

function validarUsuario(){
  const nombre=document.getElementById("u_nombre").value.trim();
  const usuario=document.getElementById("u_usuario").value.trim();

  if(!nombre){alert("Nombre obligatorio.");return false}
  if(!usuario){alert("Usuario obligatorio.");return false}
  if(usuario.length<3){alert("Usuario demasiado corto.");return false}
  if(!/^[a-zA-Z0-9_]+$/.test(usuario)){alert("Usuario solo puede tener letras, números y guion bajo.");return false}

  return true;
}

async function guardarUsuario(id,fotoActual){
  if(!validarUsuario()) return;

  const usuario=document.getElementById("u_usuario").value.trim();

  const dup=await sb()
    .from("usuarios")
    .select("id")
    .eq("usuario",usuario)
    .maybeSingle();

  if(dup.data && String(dup.data.id)!==String(id || "")){
    alert("Ese usuario ya existe.");
    return;
  }

  const file=document.getElementById("u_foto").files[0] || null;
  const foto=await subirFoto(file,usuario);

  const datos={
    nombre:document.getElementById("u_nombre").value.trim(),
    usuario,
    dni:document.getElementById("u_dni").value.trim().toUpperCase(),
    telefono:document.getElementById("u_telefono").value.trim(),
    email:document.getElementById("u_email").value.trim().toLowerCase(),

    via_tipo:document.getElementById("u_via_tipo").value,
    calle:document.getElementById("u_calle").value.trim(),
    numero:document.getElementById("u_numero").value.trim(),
    portal:document.getElementById("u_portal").value.trim(),
    escalera:document.getElementById("u_escalera").value.trim(),
    piso:document.getElementById("u_piso").value.trim(),
    puerta:document.getElementById("u_puerta").value.trim(),
    poblacion:document.getElementById("u_poblacion").value.trim(),
    provincia:document.getElementById("u_provincia").value.trim(),
    codigo_postal:document.getElementById("u_codigo_postal").value.trim(),
    pais:document.getElementById("u_pais").value.trim(),

    rol:document.getElementById("u_rol").value,
    estado:document.getElementById("u_estado").value,
    foto_url:foto || fotoActual || null,
    updated_at:new Date().toISOString()
  };

  if(!id){
    datos.pin_hash=null;
    datos.debe_crear_pin=true;
    datos.pin_intentos=0;
    datos.pin_bloqueado_hasta=null;
    datos.activo=true;
  }

  const r=id
    ? await sb().from("usuarios").update(datos).eq("id",id)
    : await sb().from("usuarios").insert([datos]);

  if(r.error){
    alert("Error guardando: "+r.error.message);
    return;
  }

  cerrarModal();
  ZX_usuarios();
}

async function resetPin(id,nombre){
  if(!confirm("¿Resetear PIN de "+nombre+"?")) return;

  const r=await sb()
    .from("usuarios")
    .update({
      pin_hash:null,
      debe_crear_pin:true,
      pin_intentos:0,
      pin_bloqueado_hasta:null,
      pin_restaurado_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
    .eq("id",id);

  if(r.error){
    alert("Error reseteando PIN: "+r.error.message);
    return;
  }

  alert("PIN reseteado.");
  ZX_usuarios();
}

async function eliminarUsuario(id,nombre,usuario){
  const s=sesion();

  if(String(usuario||"").toLowerCase()==="admin"){
    alert("No se puede eliminar el administrador principal.");
    return;
  }

  if(String(s.id||"")===String(id)){
    alert("No puedes eliminar tu propio usuario.");
    return;
  }

  const txt=prompt("Escribe ELIMINAR para borrar "+nombre);
  if(txt!=="ELIMINAR") return;

  const r=await sb()
    .from("usuarios")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error eliminando: "+r.error.message);
    return;
  }

  ZX_usuarios();
}

async function cargarDocumentos(usuarioId){
  const r=await sb()
    .from("usuarios_documentos")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .order("created_at",{ascending:false});

  if(r.error) return [];
  return r.data || [];
}

function textoDocTipo(t){
  const m={
    dni_frontal:"DNI frontal",
    dni_trasero:"DNI trasero",
    contrato:"Contrato",
    prl:"PRL",
    carnet:"Carnet",
    certificado:"Certificado",
    medico:"Reconocimiento médico",
    nomina:"Nómina",
    otro:"Otro"
  };
  return m[t] || t || "Documento";
}

function renderDocumento(d){
  return `
    <div class="zx_doc_item">
      <div>
        <b>${limpiar(d.nombre || textoDocTipo(d.tipo))}</b><br>
        <span>${limpiar(textoDocTipo(d.tipo))}</span>
        ${d.fecha_caducidad ? `<br><span>Caduca: ${limpiar(formatoFecha(d.fecha_caducidad))}</span>` : ""}
        ${d.notas ? `<br><span>${limpiar(d.notas)}</span>` : ""}
      </div>

      <div class="zx_doc_actions">
        <button class="zx_action_btn zx_blue" data-doc-open="${limpiar(d.url || "")}">Ver</button>
        <button class="zx_action_btn zx_red" data-doc-del="${limpiar(d.id)}">Borrar</button>
      </div>
    </div>
  `;
}

async function subirDocumento(file,usuarioId,tipo){
  if(!file) return null;

  const safe=String(file.name || "documento").replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=String(usuarioId)+"/"+tipo+"/"+Date.now()+"_"+safe;

  const r=await sb().storage
    .from(BUCKET_DOCS)
    .upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo documento: "+r.error.message);
    return null;
  }

  return sb().storage.from(BUCKET_DOCS).getPublicUrl(path).data.publicUrl;
}

async function abrirDocumentos(usuarioId){
  const u=ZX_USUARIOS_CACHE.find(x=>String(x.id)===String(usuarioId));
  const docs=await cargarDocumentos(usuarioId);

  modal("Documentos",`
    <div class="zx_text">
      Usuario: <b>${limpiar(u?.nombre || u?.usuario || "")}</b>
    </div>

    <div class="zx_doc_form">
      <label class="zx_label">Tipo</label>
      <select id="doc_tipo">
        <option value="dni_frontal">DNI frontal</option>
        <option value="dni_trasero">DNI trasero</option>
        <option value="contrato">Contrato</option>
        <option value="prl">PRL</option>
        <option value="carnet">Carnet</option>
        <option value="certificado">Certificado</option>
        <option value="medico">Reconocimiento médico</option>
        <option value="nomina">Nómina</option>
        <option value="otro">Otro</option>
      </select>

      <label class="zx_label">Archivo</label>
      <input id="doc_file" type="file" accept="image/*,.pdf,.doc,.docx">

      <label class="zx_label">Nombre visible</label>
      <input id="doc_nombre" placeholder="Nombre documento">

      <label class="zx_label">Fecha caducidad</label>
      <input id="doc_caducidad" type="date">

      <label class="zx_label">Notas</label>
      <textarea id="doc_notas" rows="3" placeholder="Notas"></textarea>

      <button class="zx_btn_big zx_verde" id="doc_guardar">Subir documento</button>
    </div>

    <div class="zx_doc_lista">
      ${docs.length ? docs.map(renderDocumento).join("") : `<div class="zx_text">Sin documentos.</div>`}
    </div>

    <button class="zx_btn_big zx_gris" id="doc_cerrar">Cerrar</button>
  `);

  document.getElementById("doc_cerrar").onclick=cerrarModal;

  document.getElementById("doc_guardar").onclick=async function(){
    const tipo=document.getElementById("doc_tipo").value;
    const file=document.getElementById("doc_file").files[0] || null;
    const nombre=document.getElementById("doc_nombre").value.trim() || (file ? file.name : "");
    const cad=document.getElementById("doc_caducidad").value || null;
    const notas=document.getElementById("doc_notas").value.trim();

    if(!file){
      alert("Selecciona archivo.");
      return;
    }

    const url=await subirDocumento(file,usuarioId,tipo);
    if(!url) return;

    const s=sesion();

    const r=await sb()
      .from("usuarios_documentos")
      .insert([{
        usuario_id:String(usuarioId),
        tipo,
        nombre,
        url,
        fecha_caducidad:cad,
        notas,
        creado_por:s.usuario || ""
      }]);

    if(r.error){
      alert("Error guardando documento: "+r.error.message);
      return;
    }

    abrirDocumentos(usuarioId);
  };

  document.querySelectorAll("[data-doc-open]").forEach(btn=>{
    btn.onclick=function(){
      if(btn.dataset.docOpen) window.open(btn.dataset.docOpen,"_blank");
    };
  });

  document.querySelectorAll("[data-doc-del]").forEach(btn=>{
    btn.onclick=function(){
      borrarDocumento(btn.dataset.docDel,usuarioId);
    };
  });
}

async function borrarDocumento(id,usuarioId){
  if(!confirm("¿Borrar documento?")) return;

  const r=await sb()
    .from("usuarios_documentos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando documento: "+r.error.message);
    return;
  }

  abrirDocumentos(usuarioId);
}

(function estilos(){
  if(document.getElementById("zx_usuarios_v3103")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3103";

  s.innerHTML=`
    .zx_user_card{
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:18px;
      margin:16px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.04);
      overflow:hidden;
    }

    .zx_user_top{display:flex;gap:14px;align-items:center}

    .zx_user_avatar{
      width:72px;
      height:72px;
      min-width:72px;
      border-radius:22px;
      object-fit:cover;
      background:#e5e7eb;
    }

    .zx_user_avatar_empty{
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:32px;
      font-weight:900;
    }

    .zx_user_head{min-width:0;flex:1}

    .zx_user_name{
      color:#0f172a;
      font-size:26px;
      font-weight:900;
      line-height:1.05;
      word-break:break-word;
    }

    .zx_user_role,.zx_user_phone{
      margin-top:5px;
      color:#64748b;
      font-size:15px;
      font-weight:900;
      overflow-wrap:anywhere;
    }

    .zx_user_details{
      margin-top:12px;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:18px;
      padding:12px;
    }

    .zx_user_details summary{
      cursor:pointer;
      color:#2563eb;
      font-size:16px;
      font-weight:900;
    }

    .zx_user_data{
      margin-top:10px;
      color:#334155;
      font-size:17px;
      line-height:1.55;
      font-weight:750;
      overflow-wrap:anywhere;
    }

    .zx_break{overflow-wrap:anywhere;word-break:break-word}

    .zx_user_actions{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:12px;
    }

    .zx_action_btn{
      border:0;
      border-radius:16px;
      background:#e5e7eb;
      padding:13px;
      font-size:16px;
      font-weight:900;
      color:#111827;
      min-height:52px;
    }

    .zx_blue{background:#2563eb!important;color:white!important}
    .zx_yellow{background:#facc15!important;color:#422006!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_morado_btn{background:#7c3aed!important;color:white!important}

    .zx_doc_form,.zx_doc_item{
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:20px;
      padding:14px;
      margin:14px 0;
    }

    .zx_doc_actions{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:12px;
    }

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(15,23,42,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:14px;
    }

    .zx_modal_caja{
      width:100%;
      max-width:540px;
      max-height:86vh;
      overflow:auto;
      background:white;
      border-radius:28px;
      padding:22px;
      box-shadow:0 20px 70px rgba(0,0,0,.35);
    }

    .zx_modal_caja h2{
      margin:0 0 16px;
      font-size:31px;
      font-weight:900;
      color:#0f172a;
      line-height:1.05;
    }

    .zx_modal_caja input,
    .zx_modal_caja select,
    .zx_modal_caja textarea{
      width:100%;
      border:1px solid #d1d5db;
      border-radius:16px;
      padding:15px;
      font-size:17px;
      font-weight:850;
      margin-bottom:10px;
      color:#0f172a;
      background:#f8fafc;
      box-sizing:border-box;
    }

    .zx_label{
      display:block;
      margin:12px 0 6px;
      color:#64748b;
      font-size:15px;
      font-weight:900;
    }

    .zx_form_subtitle{
      margin:22px 0 8px;
      color:#0f172a;
      font-size:23px;
      font-weight:900;
    }

    .zx_pin_input{
      text-align:center;
      font-size:32px!important;
      letter-spacing:10px;
    }

    @media(max-width:430px){
      .zx_user_actions,.zx_doc_actions{grid-template-columns:1fr}
      .zx_user_name{font-size:24px}
      .zx_modal_caja{max-height:82vh;border-radius:24px;padding:19px}
    }
  `;

  document.head.appendChild(s);
})();

})();