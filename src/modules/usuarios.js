// ===============================
// ZENTRYX PRO - USUARIOS PRO
// V3012 (PERMISOS VISUALES)
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}

// =====================
// SESIÓN
// =====================
function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function rol(){
  return (sesion().rol || "").toLowerCase();
}

function esAdmin(){
  return rol()==="administrador" || sesion().usuario==="admin";
}

function esEncargado(){
  return rol()==="encargado";
}

// =====================
// HTML SEGURO
// =====================
function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// =====================
// ACCIONES
// =====================
function tel(t){
  if(!t)return alert("Sin teléfono");
  location.href="tel:"+t;
}

function mail(m){
  if(!m)return alert("Sin email");
  location.href="mailto:"+m;
}

function mapa(d){
  if(!d)return alert("Sin dirección");
  const q=encodeURIComponent(d);

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal" style="
      position:fixed;inset:0;background:rgba(0,0,0,.6);
      display:flex;align-items:center;justify-content:center;">
      <div style="background:white;padding:20px;border-radius:20px">
        <button onclick="location.href='https://maps.apple.com/?q=${q}'">Apple</button>
        <button onclick="location.href='https://google.com/maps?q=${q}'">Google</button>
        <button onclick="location.href='https://waze.com/ul?q=${q}'">Waze</button>
      </div>
    </div>
  `);
}

// =====================
// CRUD
// =====================
async function resetPin(id){
  await sb().from("usuarios").update({
    pin_hash:null,
    debe_crear_pin:true
  }).eq("id",id);

  ZX_usuarios();
}

async function eliminar(id){
  await sb().from("usuarios").delete().eq("id",id);
  ZX_usuarios();
}

// =====================
// UI
// =====================
window.ZX_usuarios=async function(){

  const r=await sb().from("usuarios").select("*");

  app().innerHTML=`
    <h2>Usuarios</h2>

    ${
      r.data.map(u=>{

        const puedeEditar = esAdmin() || esEncargado();
        const puedeAdmin = esAdmin();

        return `
        <div style="
          border:1px solid #ccc;
          padding:15px;
          margin:10px;
          border-radius:15px">

          <b>${limpiar(u.nombre||"-")}</b><br>
          Usuario: ${limpiar(u.usuario)}<br>
          Tel: ${limpiar(u.telefono||"-")}<br>
          Email: ${limpiar(u.email||"-")}<br>
          Dirección: ${limpiar(u.calle||"-")}<br>
          Rol: ${limpiar(u.rol||"-")}

          <div style="margin-top:10px">
            ${u.telefono ? `<button onclick="tel('${u.telefono}')">Tel</button>`:""}
            ${u.email ? `<button onclick="mail('${u.email}')">Mail</button>`:""}
            ${u.calle ? `<button onclick="mapa('${u.calle}')">Mapa</button>`:""}
          </div>

          <div style="margin-top:10px">

            ${
              puedeEditar
              ? `<button onclick="alert('Editar pendiente')">Editar</button>`
              : ""
            }

            ${
              puedeAdmin
              ? `<button onclick="resetPin(${u.id})">Reset PIN</button>`
              : ""
            }

            ${
              puedeAdmin
              ? `<button onclick="eliminar(${u.id})">Eliminar</button>`
              : ""
            }

          </div>

        </div>
        `;
      }).join("")
    }
  `;
};

})();