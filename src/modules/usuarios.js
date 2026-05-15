// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3004
// ===============================
(function(){
"use strict";

function app(){ return document.getElementById("app"); }
function sb(){ return window.sb || window.supabaseClient || null; }

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}");}
  catch(e){return {};}
}

function hashPin(pin){
  return btoa(String(pin));
}

function direccion(u){
  return [
    u.via_tipo,
    u.calle,
    u.numero ? "Nº " + u.numero : "",
    u.portal ? "Portal " + u.portal : "",
    u.escalera ? "Esc. " + u.escalera : "",
    u.piso ? "Piso " + u.piso : "",
    u.puerta ? "Puerta " + u.puerta : "",
    u.poblacion,
    u.provincia,
    u.codigo_postal,
    u.pais
  ].filter(Boolean).join(", ");
}

function avatar(u){
  if(u.foto_url){
    return `<img class="zx_user_avatar" src="${limpiar(u.foto_url)}">`;
  }
  return `<div class="zx_user_avatar zx_user_avatar_empty">${limpiar((u.nombre || "?").charAt(0))}</div>`;
}

function cerrarModal(){
  const m=document.getElementById("zx_modal");
  if(m) m.remove();
}

function modal(titulo,html){
  cerrarModal();
  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${limpiar(titulo)}</h2>
        ${html}
      </div>
    </div>
  `);
}

async function pedirPinAdmin(callback){
  const s=sesion();

  if(String(s.rol || "").toLowerCase()!=="administrador"){
    alert("Solo administrador.");
    return;
  }

  modal("PIN administrador",`
    <input id="zx_admin_pin" class="zx_pin_input" inputmode="numeric" maxlength="4" placeholder="PIN">
    <button class="zx_btn_big zx_azul" id="zx_admin_ok">Confirmar</button>
    <button class="zx_btn_big zx_gris" id="zx_admin_cancel">Cancelar</button>
  `);

  document.getElementById("zx_admin_cancel").onclick=cerrarModal;

  document.getElementById("zx_admin_ok").onclick=async function(){
    const pin=document.getElementById("zx_admin_pin").value.trim();

    if(!/^[0-9]{4}$/.test(pin)){
      alert("PIN inválido.");
      return;
    }

    const res=await sb()
      .from("usuarios")
      .select("id,pin_hash,rol")
      .eq("id",s.id)
      .maybeSingle();

    if(res.error || !res.data){
      alert("No se pudo validar el administrador.");
      return;
    }

    if(String(res.data.rol || "").toLowerCase()!=="administrador"){
      alert("No tienes permiso.");
      return;
    }

    if(hashPin(pin)!==res.data.pin_hash){
      alert("PIN incorrecto.");
      return;
    }

    cerrarModal();
    callback();
  };
}

function telefonoLimpio(tel){
  let n=String(tel || "").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);
  if(!n){alert("Sin teléfono.");return;}

  modal("Teléfono",`
    <button class="zx_btn_big zx_azul" id="tel_call">Llamar</button>
    <button class="zx_btn_big zx_verde" id="tel_sms">SMS</button>
    <button class="zx_btn_big zx_verde" id="tel_wa">WhatsApp</button>
    <button class="zx_btn_big zx_gris" id="tel_cancel">Cancelar</button>
  `);

  document.getElementById("tel_call").onclick=function(){ location.href="tel:"+n; };
  document.getElementById("tel_sms").onclick=function(){ location.href="sms:"+n; };
  document.getElementById("tel_wa").onclick=function(){ location.href="https://wa.me/"+n.replace("+",""); };
  document.getElementById("tel_cancel").onclick=cerrarModal;
}

function menuMapa(dir){
  if(!dir){alert("Sin dirección.");return;}
  const q=encodeURIComponent(dir);

  modal("Abrir mapa",`
    <button class="zx_btn_big zx_azul" id="map_apple">Apple Maps</button>
    <button class="zx_btn_big zx_verde" id="map_google">Google Maps</button>
    <button class="zx_btn_big zx_naranja" id="map_waze">Waze</button>
    <button class="zx_btn_big zx_gris" id="map_cancel">Cancelar</button>
  `);

  document.getElementById("map_apple").onclick=function(){ location.href="https://maps.apple.com/?q="+q; };
  document.getElementById("map_google").onclick=function(){ location.href="https://www.google.com/maps/search/?api=1&query="+q; };
  document.getElementById("map_waze").onclick=function(){ location.href="https://waze.com/ul?q="+q; };
  document.getElementById("map_cancel").onclick=cerrarModal;
}

function enviarMail(email){
  if(!email){alert("Sin email.");return;}
  location.href="mailto:"+email;
}

async function cargar(){
  const res=await sb()
    .from("usuarios")
    .select("*")
    .order("id",{ascending:true});

  if(res.error){
    app().innerHTML=`<div class="zx_card"><h2>Error</h2><div class="zx_text">${limpiar(res.error.message)}</div></div>`;
    return [];
  }

  return res.data || [];
}

window.ZENTRYX_UI_usuarios=async function(){
  const lista=await cargar();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <div class="zx_text">Gestión completa de usuarios.</div>
      <button class="zx_btn_big zx_verde" id="btn_crear">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        lista.map(u=>{
          const dir=direccion(u);
          return `
            <div class="zx_user_card">
              ${avatar(u)}
              <div class="zx_user_name">${limpiar(u.nombre || "-")}</div>

              <div class="zx_user_data">
                <b>Usuario:</b> ${limpiar(u.usuario || "-")}<br>
                <b>DNI:</b> ${limpiar(u.dni || "-")}<br>
                <b>Teléfono:</b> ${limpiar(u.telefono || "-")}<br>
                <b>Email:</b> ${limpiar(u.email || "-")}<br>
                <b>Dirección:</b> ${limpiar(dir || "-")}<br>
                <b>Rol:</b> ${limpiar(u.rol || "-")}<br>
                <b>Estado:</b> ${limpiar(u.estado || "-")}<br>
                <b>PIN:</b> ${u.debe_crear_pin ? "Pendiente" : "Activo"}
              </div>

              <div class="zx_user_actions">
                ${u.telefono ? `<button class="zx_action_btn" data-action="tel" data-tel="${limpiar(u.telefono)}">Teléfono</button>` : ""}
                ${u.email ? `<button class="zx_action_btn" data-action="mail" data-email="${limpiar(u.email)}">Mail</button>` : ""}
                ${dir ? `<button class="zx_action_btn" data-action="mapa" data-dir="${limpiar(dir)}">Mapa</button>` : ""}
              </div>

              <div class="zx_user_actions">
                <button class="zx_action_btn zx_blue" data-action="edit" data-id="${u.id}">Editar</button>
                <button class="zx_action_btn zx_orange" data-action="reset" data-id="${u.id}" data-nombre="${limpiar(u.nombre || u.usuario)}">Reset PIN</button>
                <button class="zx_action_btn zx_red" data-action="delete" data-id="${u.id}" data-usuario="${limpiar(u.usuario || "")}" data-nombre="${limpiar(u.nombre || u.usuario)}">Eliminar</button>
              </div>
            </div>
          `;
        }).join("")
      }
    </div>
  `;

  document.getElementById("btn_crear").onclick=function(){
    pedirPinAdmin(function(){ formulario({}); });
  };

  document.querySelectorAll("[data-action]").forEach(btn=>{
    btn.onclick=function(){
      const a=btn.dataset.action;

      if(a==="tel") menuTelefono(btn.dataset.tel);
      if(a==="mail") enviarMail(btn.dataset.email);
      if(a==="mapa") menuMapa(btn.dataset.dir);

      if(a==="edit") pedirPinAdmin(function(){ editar(btn.dataset.id); });
      if(a==="reset") pedirPinAdmin(function(){ resetPin(btn.dataset.id,btn.dataset.nombre); });
      if(a==="delete") pedirPinAdmin(function(){ eliminar(btn.dataset.id,btn.dataset.nombre,btn.dataset.usuario); });
    };
  });
};

window.ZX_usuarios=function(){ window.ZENTRYX_UI_usuarios(); };

function input(id,label,value,type){
  return `
    <label class="zx_label">${label}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${label}">
  `;
}

function formulario(u){
  modal(u.id ? "Editar usuario" : "Crear usuario",`
    ${input("u_nombre","Nombre completo",u.nombre)}
    ${input("u_usuario","Usuario",u.usuario)}
    ${input("u_dni","DNI / NIE",u.dni)}
    ${input("u_telefono","Teléfono",u.telefono,"tel")}
    ${input("u_email","Email",u.email,"email")}

    <h3>Dirección</h3>
    ${input("u_via_tipo","Tipo de vía",u.via_tipo)}
    ${input("u_calle","Calle",u.calle)}
    ${input("u_numero","Número",u.numero)}
    ${input("u_portal","Portal",u.portal)}
    ${input("u_escalera","Escalera",u.escalera)}
    ${input("u_piso","Piso",u.piso)}
    ${input("u_puerta","Puerta",u.puerta)}
    ${input("u_poblacion","Población",u.poblacion)}
    ${input("u_provincia","Provincia",u.provincia)}
    ${input("u_codigo_postal","Código postal",u.codigo_postal)}
    ${input("u_pais","País",u.pais || "España")}

    <label class="zx_label">Rol</label>
    <select id="u_rol">
      <option ${u.rol==="Administrador"?"selected":""}>Administrador</option>
      <option ${u.rol==="Encargado"?"selected":""}>Encargado</option>
      <option ${u.rol==="Operario"?"selected":""}>Operario</option>
      <option ${u.rol==="Oficina"?"selected":""}>Oficina</option>
    </select>

    <label class="zx_label">Estado</label>
    <select id="u_estado">
      <option ${u.estado==="Activo"?"selected":""}>Activo</option>
      <option ${u.estado==="Inactivo"?"selected":""}>Inactivo</option>
    </select>

    <button class="zx_btn_big zx_verde" id="btn_guardar_usuario">Guardar</button>
    <button class="zx_btn_big zx_gris" id="btn_cancelar_usuario">Cancelar</button>
  `);

  document.getElementById("btn_cancelar_usuario").onclick=cerrarModal;
  document.getElementById("btn_guardar_usuario").onclick=function(){ guardar(u.id || null); };
}

async function editar(id){
  const res=await sb().from("usuarios").select("*").eq("id",id).maybeSingle();
  if(res.error || !res.data){alert("No se pudo cargar usuario.");return;}
  formulario(res.data);
}

async function guardar(id){
  const datos={
    nombre:u_nombre.value.trim(),
    usuario:u_usuario.value.trim(),
    dni:u_dni.value.trim(),
    telefono:u_telefono.value.trim(),
    email:u_email.value.trim(),
    via_tipo:u_via_tipo.value.trim(),
    calle:u_calle.value.trim(),
    numero:u_numero.value.trim(),
    portal:u_portal.value.trim(),
    escalera:u_escalera.value.trim(),
    piso:u_piso.value.trim(),
    puerta:u_puerta.value.trim(),
    poblacion:u_poblacion.value.trim(),
    provincia:u_provincia.value.trim(),
    codigo_postal:u_codigo_postal.value.trim(),
    pais:u_pais.value.trim(),
    rol:u_rol.value,
    estado:u_estado.value,
    updated_at:new Date().toISOString()
  };

  if(!datos.nombre || !datos.usuario){
    alert("Nombre y usuario son obligatorios.");
    return;
  }

  if(!id){
    datos.pin_hash=null;
    datos.debe_crear_pin=true;
    datos.pin_intentos=0;
    datos.pin_bloqueado_hasta=null;
  }

  let res;
  if(id) res=await sb().from("usuarios").update(datos).eq("id",id);
  else res=await sb().from("usuarios").insert([datos]);

  if(res.error){alert("Error guardando: "+res.error.message);return;}

  cerrarModal();
  ZX_usuarios();
}

async function resetPin(id,nombre){
  if(!confirm("¿Resetear PIN de "+nombre+"?")) return;

  const res=await sb().from("usuarios").update({
    pin_hash:null,
    debe_crear_pin:true,
    pin_intentos:0,
    pin_bloqueado_hasta:null,
    pin_restaurado_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  }).eq("id",id);

  if(res.error){alert("Error: "+res.error.message);return;}

  alert("PIN reseteado.");
  ZX_usuarios();
}

async function eliminar(id,nombre,usuario){
  if(String(usuario).toLowerCase()==="admin"){
    alert("No se puede eliminar el administrador principal.");
    return;
  }

  if(!confirm("¿Eliminar usuario "+nombre+"?")) return;

  const res=await sb().from("usuarios").delete().eq("id",id);

  if(res.error){alert("Error eliminando: "+res.error.message);return;}

  ZX_usuarios();
}

(function estilos(){
  if(document.getElementById("zx_usuarios_v3004")) return;

  const s=document.createElement("style");
  s.id="zx_usuarios_v3004";
  s.innerHTML=`
    .zx_user_card{
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:22px;
      margin:18px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.04);
    }
    .zx_user_avatar{
      width:76px;
      height:76px;
      border-radius:20px;
      object-fit:cover;
      margin-bottom:10px;
    }
    .zx_user_avatar_empty{
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:34px;
      font-weight:900;
    }
    .zx_user_name{
      font-size:28px;
      font-weight:900;
      margin-bottom:10px;
      color:#0f172a;
    }
    .zx_user_data{
      color:#334155;
      font-size:18px;
      line-height:1.55;
      font-weight:700;
    }
    .zx_user_actions{
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
    .zx_blue{background:#2563eb;color:white}
    .zx_orange{background:#ea580c;color:white}
    .zx_red{background:#dc2626;color:white}
    .zx_modal_fondo{
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(15,23,42,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
    }
    .zx_modal_caja{
      width:100%;
      max-width:460px;
      max-height:88vh;
      overflow:auto;
      background:white;
      border-radius:28px;
      padding:24px;
      box-shadow:0 20px 70px rgba(0,0,0,.35);
    }
    .zx_modal_caja h2{
      margin:0 0 18px;
      font-size:32px;
      font-weight:900;
      color:#0f172a;
    }
    .zx_modal_caja input,
    .zx_modal_caja select{
      width:100%;
      border:1px solid #d1d5db;
      border-radius:16px;
      padding:16px;
      font-size:18px;
      margin-bottom:10px;
    }
    .zx_label{
      display:block;
      margin:12px 0 6px;
      color:#334155;
      font-size:15px;
      font-weight:900;
    }
    .zx_pin_input{
      text-align:center;
      font-size:32px!important;
      letter-spacing:10px;
    }
  `;
  document.head.appendChild(s);
})();

})();