// ===============================
// ZENTRYX PRO - USUARIOS FINAL PRO
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function cliente(){
  return window.sb || window.supabaseClient || null;
}

// ===============================
// MODAL REAL (NO PROMPT)
// ===============================
function abrirModal(titulo,contenido){
  let modal=document.getElementById("zx_modal");

  if(!modal){
    modal=document.createElement("div");
    modal.id="zx_modal";
    modal.style.position="fixed";
    modal.style.top=0;
    modal.style.left=0;
    modal.style.width="100%";
    modal.style.height="100%";
    modal.style.background="rgba(0,0,0,0.6)";
    modal.style.display="flex";
    modal.style.alignItems="center";
    modal.style.justifyContent="center";
    modal.style.zIndex=9999;
    document.body.appendChild(modal);
  }

  modal.innerHTML=`
    <div style="background:white;padding:20px;border-radius:12px;width:90%;max-width:400px">
      <h3>${titulo}</h3>
      ${contenido}
      <br><br>
      <button onclick="cerrarModal()">Cerrar</button>
    </div>
  `;
}

window.cerrarModal=function(){
  const modal=document.getElementById("zx_modal");
  if(modal) modal.remove();
}

// ===============================
// CARGAR USUARIOS
// ===============================
async function cargar(){
  const sb=cliente();
  if(!sb) return [];

  const {data}=await sb.from("usuarios").select("*");
  return data || [];
}

// ===============================
// PINTAR UI
// ===============================
window.ZENTRYX_UI_usuarios=async function(){

  if(!app()) return;

  const lista=await cargar();

  let html=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <button class="zx_btn_big zx_verde" onclick="crear()">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
  `;

  lista.forEach(u=>{

    const direccion=[
      u.via,u.calle,u.numero,u.portal,u.piso,u.puerta,u.cp,u.ciudad
    ].filter(Boolean).join(" ");

    html+=`
      <div class="zx_user_card">
        <b>${u.nombre || "-"}</b><br>
        Usuario: ${u.usuario || "-"}<br>
        Teléfono: ${u.telefono || "-"}<br>
        Email: ${u.email || "-"}<br>
        Dirección: ${direccion || "-"}<br>
        Rol: ${u.rol || "-"}<br><br>

        <button onclick="editar(${u.id})">Editar</button>
        <button onclick="eliminar(${u.id})">Eliminar</button>
        <button onclick="resetPin(${u.id})">Reset PIN</button>
        <button onclick="menuTelefono('${u.telefono || ""}')">Teléfono</button>
        <button onclick="menuMapa('${direccion}')">Mapa</button>
        <button onclick="enviarMail('${u.email || ""}')">Mail</button>
      </div>
      <br>
    `;
  });

  html+=`</div>`;
  app().innerHTML=html;
};

// ===============================
// CREAR / EDITAR
// ===============================
window.crear=function(){
  formulario();
};

window.editar=function(id){
  formulario(id);
};

async function formulario(id){

  let u={};
  const sb=cliente();

  if(id){
    const {data}=await sb.from("usuarios").select("*").eq("id",id).single();
    u=data || {};
  }

  abrirModal("Usuario",`
    <input id="nombre" placeholder="Nombre" value="${u.nombre||""}">
    <input id="usuario" placeholder="Usuario" value="${u.usuario||""}">
    <input id="telefono" placeholder="Teléfono" value="${u.telefono||""}">
    <input id="email" placeholder="Email" value="${u.email||""}">

    <input id="via" placeholder="Vía" value="${u.via||""}">
    <input id="calle" placeholder="Calle" value="${u.calle||""}">
    <input id="numero" placeholder="Número" value="${u.numero||""}">
    <input id="portal" placeholder="Portal" value="${u.portal||""}">
    <input id="piso" placeholder="Piso" value="${u.piso||""}">
    <input id="puerta" placeholder="Puerta" value="${u.puerta||""}">
    <input id="cp" placeholder="CP" value="${u.cp||""}">
    <input id="ciudad" placeholder="Ciudad" value="${u.ciudad||""}">

    <select id="rol">
      <option ${u.rol==="Operario"?"selected":""}>Operario</option>
      <option ${u.rol==="Encargado"?"selected":""}>Encargado</option>
      <option ${u.rol==="Administrador"?"selected":""}>Administrador</option>
    </select>

    <br><br>
    <button onclick="guardar(${id||0})">Guardar</button>
  `);
}

window.guardar=async function(id){

  const sb=cliente();

  const datos={
    nombre:val("nombre"),
    usuario:val("usuario"),
    telefono:val("telefono"),
    email:val("email"),
    via:val("via"),
    calle:val("calle"),
    numero:val("numero"),
    portal:val("portal"),
    piso:val("piso"),
    puerta:val("puerta"),
    cp:val("cp"),
    ciudad:val("ciudad"),
    rol:val("rol")
  };

  if(id){
    await sb.from("usuarios").update(datos).eq("id",id);
  }else{
    datos.debe_crear_pin=true;
    await sb.from("usuarios").insert([datos]);
  }

  cerrarModal();
  ZENTRYX_UI_usuarios();
};

function val(id){
  return document.getElementById(id)?.value || "";
}

// ===============================
// ELIMINAR
// ===============================
window.eliminar=async function(id){
  const sb=cliente();
  if(!confirm("Eliminar usuario?")) return;
  await sb.from("usuarios").delete().eq("id",id);
  ZENTRYX_UI_usuarios();
};

// ===============================
// RESET PIN
// ===============================
window.resetPin=async function(id){
  const sb=cliente();
  await sb.from("usuarios").update({
    pin_hash:null,
    debe_crear_pin:true
  }).eq("id",id);

  alert("PIN reseteado");
};

// ===============================
// TELÉFONO
// ===============================
window.menuTelefono=function(tel){
  if(!tel){
    alert("Sin teléfono");
    return;
  }

  abrirModal("Teléfono",`
    <button onclick="window.location.href='tel:${tel}'">Llamar</button><br><br>
    <button onclick="window.location.href='sms:${tel}'">SMS</button><br><br>
    <button onclick="window.location.href='https://wa.me/${tel}'">WhatsApp</button>
  `);
};

// ===============================
// MAPAS
// ===============================
window.menuMapa=function(dir){
  if(!dir){
    alert("Sin dirección");
    return;
  }

  const q=encodeURIComponent(dir);

  abrirModal("Mapa",`
    <button onclick="window.location.href='http://maps.apple.com/?q=${q}'">Apple Maps</button><br><br>
    <button onclick="window.location.href='https://www.google.com/maps?q=${q}'">Google Maps</button><br><br>
    <button onclick="window.location.href='https://waze.com/ul?q=${q}'">Waze</button>
  `);
};

// ===============================
// EMAIL
// ===============================
window.enviarMail=function(mail){
  if(!mail){
    alert("Sin email");
    return;
  }

  window.location.href="mailto:"+mail;
};

})();