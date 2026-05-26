// ===============================
// ZENTRYX PRO - CLIENTES PRO
// V3095
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

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

function telefonoLimpio(t){
  let n=String(t||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

// ===============================
// CONTACTO
// ===============================
function menuTelefono(tel){
  const n=telefonoLimpio(tel);
  if(!n){alert("Sin teléfono");return;}

  document.body.insertAdjacentHTML("beforeend",`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Teléfono</h2>
        <button class="zx_btn_big zx_azul" onclick="location.href='tel:${n}'">Llamar</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='sms:${n}'">SMS</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='https://wa.me/${n.replace('+','')}'">WhatsApp</button>
        <button class="zx_btn_big zx_gris" onclick="this.closest('.zx_modal_fondo').remove()">Cerrar</button>
      </div>
    </div>
  `);
}

function enviarMail(email){
  if(!email){alert("Sin email");return;}
  location.href="mailto:"+email;
}

function abrirMapa(dir){
  if(!dir){alert("Sin dirección");return;}
  const q=encodeURIComponent(dir);

  document.body.insertAdjacentHTML("beforeend",`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Mapa</h2>
        <button class="zx_btn_big zx_azul" onclick="location.href='https://maps.apple.com/?q=${q}'">Apple</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='https://www.google.com/maps/search/?api=1&query=${q}'">Google</button>
        <button class="zx_btn_big zx_naranja" onclick="location.href='https://waze.com/ul?q=${q}'">Waze</button>
        <button class="zx_btn_big zx_gris" onclick="this.closest('.zx_modal_fondo').remove()">Cerrar</button>
      </div>
    </div>
  `);
}

// ===============================
// STORAGE (DOCUMENTOS)
// ===============================
async function subirDocumento(file,nombre){
  if(!file) return null;

  const ext=file.name.split(".").pop();
  const path="clientes/"+nombre+"_"+Date.now()+"."+ext;

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

// ===============================
// DATOS
// ===============================
async function cargarClientes(){
  const r=await sb()
    .from("clientes")
    .select("*")
    .order("id",{ascending:false});

  if(r.error){
    app().innerHTML=`<div class="zx_card"><h2>Error</h2>${r.error.message}</div>`;
    return [];
  }

  return r.data || [];
}

// ===============================
// UI
// ===============================
window.ZX_clientes=async function(){

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="clientes") b.classList.add("zx_activo");
  });

  const datos=await cargarClientes();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Clientes</h2>
      <div class="zx_text">Gestión de clientes y direcciones.</div>
      <button class="zx_btn_big zx_verde" id="nuevo">Nuevo cliente</button>
    </div>

    <div class="zx_card">
      ${
        datos.length
        ? datos.map(c=>renderCliente(c)).join("")
        : `<div class="zx_text">No hay clientes.</div>`
      }
    </div>
  `;

  document.getElementById("nuevo").onclick=()=>formulario({});
};

// ===============================
// RENDER
// ===============================
function direccion(c){
  return [
    c.calle,
    c.numero,
    c.poblacion,
    c.codigo_postal
  ].filter(Boolean).join(", ");
}

function renderCliente(c){
  const dir=direccion(c);

  return `
    <div class="zx_user_card">
      <div class="zx_user_name">${limpiar(c.nombre||"-")}</div>

      <div class="zx_user_data">
        Tel: ${limpiar(c.telefono||"-")}<br>
        Email: ${limpiar(c.email||"-")}<br>
        Dirección: ${limpiar(dir||"-")}
      </div>

      <div class="zx_user_actions">
        ${c.telefono ? `<button onclick="(${menuTelefono})('${c.telefono}')">Tel</button>`:""}
        ${c.email ? `<button onclick="(${enviarMail})('${c.email}')">Mail</button>`:""}
        ${dir ? `<button onclick="(${abrirMapa})('${dir}')">Mapa</button>`:""}
      </div>

      ${
        c.doc_url
        ? `<a href="${c.doc_url}" target="_blank" class="zx_btn zx_azul">Ver documento</a>`
        : ""
      }
    </div>
  `;
}

// ===============================
// FORM
// ===============================
function formulario(c){

  document.body.insertAdjacentHTML("beforeend",`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Cliente</h2>

        <input id="c_nombre" placeholder="Nombre" value="${limpiar(c.nombre||"")}">
        <input id="c_telefono" placeholder="Teléfono" value="${limpiar(c.telefono||"")}">
        <input id="c_email" placeholder="Email" value="${limpiar(c.email||"")}">
        <input id="c_calle" placeholder="Calle" value="${limpiar(c.calle||"")}">
        <input id="c_numero" placeholder="Número" value="${limpiar(c.numero||"")}">
        <input id="c_poblacion" placeholder="Población" value="${limpiar(c.poblacion||"")}">
        <input id="c_cp" placeholder="CP" value="${limpiar(c.codigo_postal||"")}">

        <label>Documento</label>
        <input type="file" id="c_doc">

        <button class="zx_btn_big zx_verde" id="guardar">Guardar</button>
        <button class="zx_btn_big zx_gris" onclick="this.closest('.zx_modal_fondo').remove()">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("guardar").onclick=async function(){

    const nombre=document.getElementById("c_nombre").value.trim();
    if(!nombre){alert("Nombre obligatorio");return;}

    const file=document.getElementById("c_doc").files[0];
    const url=await subirDocumento(file,nombre);

    const datos={
      nombre,
      telefono:document.getElementById("c_telefono").value,
      email:document.getElementById("c_email").value,
      calle:document.getElementById("c_calle").value,
      numero:document.getElementById("c_numero").value,
      poblacion:document.getElementById("c_poblacion").value,
      codigo_postal:document.getElementById("c_cp").value,
      doc_url:url
    };

    const r=await sb().from("clientes").insert([datos]);

    if(r.error){
      alert("Error: "+r.error.message);
      return;
    }

    document.querySelector(".zx_modal_fondo").remove();
    ZX_clientes();
  };
}

})();