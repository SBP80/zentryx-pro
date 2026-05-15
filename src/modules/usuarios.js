// ===============================
// ZENTRYX PRO - USUARIOS COMPLETO
// ===============================
(function(){
"use strict";

function app(){
  return document.getElementById("app");
}

function sb(){
  return window.sb || window.supabaseClient || null;
}

// ===============================
// UI PRINCIPAL
// ===============================
window.ZENTRYX_UI_usuarios=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <button class="zx_btn_big zx_verde" onclick="crearUsuario()">Crear usuario</button>
    </div>

    <div class="zx_card">
      <h2>Listado</h2>
      <div id="listaUsuarios"></div>
    </div>
  `;

  cargarUsuarios();
};

// ===============================
// CARGAR
// ===============================
async function cargarUsuarios(){

  const {data}=await sb().from("usuarios").select("*").order("id",{ascending:false});

  const cont=document.getElementById("listaUsuarios");
  cont.innerHTML="";

  data.forEach(u=>{
    cont.innerHTML+=`
      <div class="zx_card">
        <b>${u.nombre || "-"}</b><br>
        Usuario: ${u.usuario}<br>
        Teléfono: <span onclick="accionTelefono('${u.telefono||""}')">${u.telefono||"-"}</span><br>
        Email: ${u.email||"-"}<br>
        Dirección: <span onclick="accionMapa('${u.direccion||""}')">${u.direccion||"-"}</span><br>
        Rol: ${u.rol||"-"}<br><br>

        <button onclick="editarUsuario(${u.id})">Editar</button>
        <button onclick="eliminarUsuario(${u.id})">Eliminar</button>
        <button onclick="resetPIN(${u.id})">Reset PIN</button>
      </div>
    `;
  });
}

// ===============================
// CREAR
// ===============================
window.crearUsuario=function(){

  app().innerHTML=`
    <div class="zx_card">
      <h2>Crear usuario</h2>

      <input id="nombre" placeholder="Nombre">
      <input id="usuario" placeholder="Usuario">
      <input id="telefono" placeholder="Teléfono">
      <input id="email" placeholder="Email">
      <input id="direccion" placeholder="Dirección">

      <select id="rol">
        <option>Administrador</option>
        <option>Encargado</option>
        <option>Operario</option>
      </select>

      <button onclick="guardarUsuario()">Guardar</button>
      <button onclick="ZENTRYX_UI_usuarios()">Cancelar</button>
    </div>
  `;
};

async function guardarUsuario(){

  await sb().from("usuarios").insert([{
    nombre:val("nombre"),
    usuario:val("usuario"),
    telefono:val("telefono"),
    email:val("email"),
    direccion:val("direccion"),
    rol:val("rol"),
    debe_crear_pin:true
  }]);

  ZENTRYX_UI_usuarios();
}

// ===============================
// EDITAR
// ===============================
window.editarUsuario=async function(id){

  const {data}=await sb().from("usuarios").select("*").eq("id",id).single();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Editar</h2>

      <input id="nombre" value="${data.nombre||""}">
      <input id="usuario" value="${data.usuario||""}">
      <input id="telefono" value="${data.telefono||""}">
      <input id="email" value="${data.email||""}">
      <input id="direccion" value="${data.direccion||""}">

      <button onclick="updateUsuario(${id})">Guardar</button>
      <button onclick="ZENTRYX_UI_usuarios()">Cancelar</button>
    </div>
  `;
};

async function updateUsuario(id){

  await sb().from("usuarios").update({
    nombre:val("nombre"),
    usuario:val("usuario"),
    telefono:val("telefono"),
    email:val("email"),
    direccion:val("direccion")
  }).eq("id",id);

  ZENTRYX_UI_usuarios();
}

// ===============================
// ELIMINAR
// ===============================
window.eliminarUsuario=async function(id){

  if(!confirm("Eliminar usuario?")) return;

  await sb().from("usuarios").delete().eq("id",id);

  ZENTRYX_UI_usuarios();
};

// ===============================
// RESET PIN 🔥
// ===============================
window.resetPIN=async function(id){

  if(!confirm("Restablecer PIN del usuario?")) return;

  await sb().from("usuarios").update({
    pin_hash:null,
    debe_crear_pin:true
  }).eq("id",id);

  alert("PIN reseteado");

  ZENTRYX_UI_usuarios();
};

// ===============================
// TELÉFONO
// ===============================
window.accionTelefono=function(tel){

  const op=prompt("1 Llamar\n2 SMS\n3 WhatsApp");

  if(op=="1") location.href="tel:"+tel;
  if(op=="2") location.href="sms:"+tel;
  if(op=="3") location.href="https://wa.me/34"+tel;
};

// ===============================
// MAPA
// ===============================
window.accionMapa=function(dir){

  const op=prompt("1 Apple Maps\n2 Google Maps\n3 Waze");

  if(op=="1") location.href="http://maps.apple.com/?q="+encodeURIComponent(dir);
  if(op=="2") location.href="https://www.google.com/maps/search/"+encodeURIComponent(dir);
  if(op=="3") location.href="https://waze.com/ul?q="+encodeURIComponent(dir);
};

// ===============================
function val(id){
  return document.getElementById(id).value;
}

})();