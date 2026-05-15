// ===============================
// ZENTRYX PRO - USUARIOS PRO COMPLETO
// V2672
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb}

// ===============================
// UTILS
// ===============================
function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function direccionCompleta(u){
  return [u.direccion,u.poblacion,u.provincia,u.codigo_postal]
    .filter(Boolean)
    .join(", ");
}

function foto(u){
  return u.foto_url
    ? `<img src="${u.foto_url}" style="width:80px;height:80px;border-radius:20px;object-fit:cover;">`
    : `<div style="width:80px;height:80px;border-radius:20px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:30px;">${(u.nombre||"?")[0]}</div>`;
}

// ===============================
// MENÚ TELÉFONO
// ===============================
function menuTelefono(tel){
  if(!tel) return "-";

  const limpio=tel.replace(/\s+/g,"");

  return `
    <button class="zx_btn_big zx_gris" onclick="
      const opcion=prompt('1 Llamar\\n2 SMS\\n3 WhatsApp');
      if(opcion==1) location.href='tel:${limpio}';
      if(opcion==2) location.href='sms:${limpio}';
      if(opcion==3) location.href='https://wa.me/${limpio}';
    ">${tel}</button>
  `;
}

// ===============================
// MENÚ MAPAS
// ===============================
function menuMapa(dir){
  if(!dir) return "-";

  const d=encodeURIComponent(dir);

  return `
    <button class="zx_btn_big zx_gris" onclick="
      const opcion=prompt('1 Apple Maps\\n2 Google Maps\\n3 Waze');
      if(opcion==1) window.open('https://maps.apple.com/?q=${d}');
      if(opcion==2) window.open('https://www.google.com/maps/search/?api=1&query=${d}');
      if(opcion==3) window.open('https://waze.com/ul?q=${d}');
    ">Abrir mapa</button>
  `;
}

// ===============================
// CARGAR
// ===============================
async function cargar(){
  const {data,error}=await sb()
    .from("usuarios")
    .select("*")
    .order("id",{ascending:true});

  if(error){
    app().innerHTML="Error";
    return [];
  }

  return data||[];
}

// ===============================
// RENDER
// ===============================
window.ZENTRYX_UI_usuarios=async function(){

  const usuarios=await cargar();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Usuarios</h2>
      <button class="zx_btn_big zx_verde" onclick="ZX_USER_CREAR()">Crear usuario</button>
    </div>

    <div class="zx_card">
      ${
        usuarios.map(u=>`
          <div class="zx_item">
            ${foto(u)}

            <div class="zx_item_titulo">${limpiar(u.nombre)}</div>

            <div class="zx_item_texto">
              <b>Usuario:</b> ${u.usuario}<br>
              <b>DNI:</b> ${u.dni||"-"}<br>
              <b>Email:</b> ${u.email ? `<a href="mailto:${u.email}">${u.email}</a>` : "-"}<br>
              <b>Rol:</b> ${u.rol}<br>
              <b>Estado:</b> ${u.estado}<br><br>

              ${menuTelefono(u.telefono)}<br><br>
              ${menuMapa(direccionCompleta(u))}
            </div>

            <button class="zx_btn_big zx_azul" onclick="ZX_USER_EDITAR(${u.id})">Editar</button>
            <button class="zx_btn_big zx_rojo" onclick="ZX_USER_ELIMINAR(${u.id},'${u.nombre}')">Eliminar</button>
          </div>
        `).join("")
      }
    </div>
  `;
};

window.ZX_usuarios=function(){
  ZENTRYX_UI_usuarios();
};

// ===============================
// CREAR / EDITAR UI
// ===============================
function form(u={}){

  app().innerHTML=`
    <div class="zx_card">
      <h2>${u.id?"Editar":"Crear"} usuario</h2>

      <input id="u_foto" type="file">
      <input id="u_nombre" value="${u.nombre||""}" placeholder="Nombre">
      <input id="u_usuario" value="${u.usuario||""}" placeholder="Usuario">
      <input id="u_dni" value="${u.dni||""}" placeholder="DNI">

      <input id="u_telefono" value="${u.telefono||""}" placeholder="Teléfono">
      <input id="u_email" value="${u.email||""}" placeholder="Email">

      <input id="u_direccion" value="${u.direccion||""}" placeholder="Dirección">
      <input id="u_poblacion" value="${u.poblacion||""}" placeholder="Población">
      <input id="u_provincia" value="${u.provincia||""}" placeholder="Provincia">
      <input id="u_cp" value="${u.codigo_postal||""}" placeholder="Código postal">

      <select id="u_rol">
        <option ${u.rol==="Administrador"?"selected":""}>Administrador</option>
        <option ${u.rol==="Encargado"?"selected":""}>Encargado</option>
        <option ${u.rol==="Operario"?"selected":""}>Operario</option>
      </select>

      <select id="u_estado">
        <option ${u.estado==="Activo"?"selected":""}>Activo</option>
        <option ${u.estado==="Inactivo"?"selected":""}>Inactivo</option>
      </select>

      <button class="zx_btn_big zx_verde" onclick="guardar(${u.id||null})">Guardar</button>
      <button class="zx_btn_big zx_gris" onclick="ZX_usuarios()">Cancelar</button>
    </div>
  `;
}

window.ZX_USER_CREAR=function(){form()}
window.ZX_USER_EDITAR=async function(id){
  const {data}=await sb().from("usuarios").select("*").eq("id",id).single();
  form(data);
}

// ===============================
// GUARDAR
// ===============================
async function subir(file,usuario){
  if(!file) return null;

  const nombre=`usuarios/${usuario}_${Date.now()}`;
  await sb().storage.from("zentryx-usuarios").upload(nombre,file,{upsert:true});
  return sb().storage.from("zentryx-usuarios").getPublicUrl(nombre).data.publicUrl;
}

window.guardar=async function(id){

  const usuario=document.getElementById("u_usuario").value;
  const file=document.getElementById("u_foto").files[0];

  const foto_url=await subir(file,usuario);

  const datos={
    nombre:u_nombre.value,
    usuario,
    dni:u_dni.value,
    telefono:u_telefono.value,
    email:u_email.value,
    direccion:u_direccion.value,
    poblacion:u_poblacion.value,
    provincia:u_provincia.value,
    codigo_postal:u_cp.value,
    rol:u_rol.value,
    estado:u_estado.value
  };

  if(foto_url) datos.foto_url=foto_url;

  if(id){
    await sb().from("usuarios").update(datos).eq("id",id);
  }else{
    await sb().from("usuarios").insert([datos]);
  }

  ZX_usuarios();
};

// ===============================
// ELIMINAR
// ===============================
window.ZX_USER_ELIMINAR=async function(id,nombre){
  if(!confirm("Eliminar "+nombre+"?")) return;
  await sb().from("usuarios").delete().eq("id",id);
  ZX_usuarios();
};

})();