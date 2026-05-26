// ===============================
// ZENTRYX PRO - CLIENTES
// V3092
// ===============================
(function(){
"use strict";

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session")||"{}");
  }catch(e){
    return {};
  }
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fechaHoy(){
  return new Date().toISOString().slice(0,10);
}

// ===============================
// CARGAR CLIENTES
// ===============================
async function cargarClientes(){

  const r=await sb()
    .from("clientes")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error){
    alert("Error cargando clientes: "+r.error.message);
    return [];
  }

  return r.data || [];
}

// ===============================
// RENDER CLIENTE
// ===============================
function renderCliente(c){

  const direccion=[
    c.direccion,
    c.numero,
    c.portal,
    c.piso,
    c.puerta,
    c.codigo_postal,
    c.poblacion
  ].filter(Boolean).join(" ");

  return `
    <div class="zx_card">

      <h3>${limpiar(c.nombre || "Cliente")}</h3>

      <div class="zx_text">

        ${
          c.telefono
          ? `📞 ${limpiar(c.telefono)}<br>`
          : ""
        }

        ${
          c.email
          ? `✉️ ${limpiar(c.email)}<br>`
          : ""
        }

        ${
          direccion
          ? `📍 ${limpiar(direccion)}<br>`
          : ""
        }

        ${
          c.notas
          ? `<br>${limpiar(c.notas)}`
          : ""
        }

      </div>

      ${
        c.telefono
        ? `
          <button class="zx_btn_big zx_verde"
            onclick="window.open('tel:${c.telefono}')">
            Llamar
          </button>

          <button class="zx_btn_big zx_verde"
            onclick="window.open('https://wa.me/${String(c.telefono).replace(/\D/g,'')}')">
            WhatsApp
          </button>
        `
        : ""
      }

      ${
        direccion
        ? `
          <button class="zx_btn_big zx_azul"
            onclick="ZX_abrirMapa('${encodeURIComponent(direccion)}')">
            Abrir mapa
          </button>
        `
        : ""
      }

      <button class="zx_btn_big zx_naranja"
        onclick="ZX_editarCliente('${c.id}')">
        Editar
      </button>

      <button class="zx_btn_big zx_rojo"
        onclick="ZX_borrarCliente('${c.id}')">
        Borrar
      </button>

    </div>
  `;
}

// ===============================
// MAPA
// ===============================
window.ZX_abrirMapa=function(dir){

  const d=decodeURIComponent(dir);

  const menu=confirm(
    "Aceptar = Google Maps\nCancelar = Apple Maps"
  );

  if(menu){
    window.open(
      "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(d)
    );
  }else{
    window.open(
      "https://maps.apple.com/?q="+encodeURIComponent(d)
    );
  }
};

// ===============================
// FORMULARIO
// ===============================
function formCliente(c={}){

  return `
    <div class="zx_card">

      <h2>
        ${c.id ? "Editar cliente" : "Nuevo cliente"}
      </h2>

      <input id="zx_cli_nombre"
        placeholder="Nombre"
        value="${limpiar(c.nombre || "")}">

      <input id="zx_cli_telefono"
        placeholder="Teléfono"
        value="${limpiar(c.telefono || "")}">

      <input id="zx_cli_email"
        placeholder="Email"
        value="${limpiar(c.email || "")}">

      <input id="zx_cli_direccion"
        placeholder="Dirección"
        value="${limpiar(c.direccion || "")}">

      <input id="zx_cli_numero"
        placeholder="Número"
        value="${limpiar(c.numero || "")}">

      <input id="zx_cli_cp"
        placeholder="Código postal"
        value="${limpiar(c.codigo_postal || "")}">

      <input id="zx_cli_poblacion"
        placeholder="Población"
        value="${limpiar(c.poblacion || "")}">

      <textarea id="zx_cli_notas"
        rows="4"
        placeholder="Notas">${limpiar(c.notas || "")}</textarea>

      <button class="zx_btn_big zx_verde"
        onclick="ZX_guardarCliente('${c.id || ""}')">
        Guardar cliente
      </button>

      <button class="zx_btn_big zx_gris"
        onclick="ZX_clientes()">
        Volver
      </button>

    </div>
  `;
}

// ===============================
// NUEVO CLIENTE
// ===============================
window.ZX_nuevoCliente=function(){

  app().innerHTML=formCliente();
};

// ===============================
// GUARDAR
// ===============================
window.ZX_guardarCliente=async function(id){

  const s=sesion();

  const data={

    nombre:document.getElementById("zx_cli_nombre").value.trim(),

    telefono:document.getElementById("zx_cli_telefono").value.trim(),

    email:document.getElementById("zx_cli_email").value.trim(),

    direccion:document.getElementById("zx_cli_direccion").value.trim(),

    numero:document.getElementById("zx_cli_numero").value.trim(),

    codigo_postal:document.getElementById("zx_cli_cp").value.trim(),

    poblacion:document.getElementById("zx_cli_poblacion").value.trim(),

    notas:document.getElementById("zx_cli_notas").value.trim(),

    creado_por:s.usuario || "",
    usuario_id:String(s.id || "")
  };

  if(!data.nombre){
    alert("Introduce nombre.");
    return;
  }

  let r;

  if(id){

    r=await sb()
      .from("clientes")
      .update(data)
      .eq("id",id);

  }else{

    r=await sb()
      .from("clientes")
      .insert([data]);

  }

  if(r.error){
    alert("Error guardando cliente: "+r.error.message);
    return;
  }

  ZX_clientes();
};

// ===============================
// EDITAR
// ===============================
window.ZX_editarCliente=async function(id){

  const r=await sb()
    .from("clientes")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r.error || !r.data){
    alert("Cliente no encontrado.");
    return;
  }

  app().innerHTML=formCliente(r.data);
};

// ===============================
// BORRAR
// ===============================
window.ZX_borrarCliente=async function(id){

  if(!confirm("¿Borrar cliente?")){
    return;
  }

  const r=await sb()
    .from("clientes")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando cliente.");
    return;
  }

  ZX_clientes();
};

// ===============================
// LISTADO
// ===============================
window.ZX_clientes=async function(){

  if(window.activo){
    window.activo("clientes");
  }

  const datos=await cargarClientes();

  app().innerHTML=`

    <div class="zx_card">

      <h2>Clientes</h2>

      <div class="zx_text">
        Gestión de clientes y direcciones.
      </div>

      <button class="zx_btn_big zx_verde"
        onclick="ZX_nuevoCliente()">
        Nuevo cliente
      </button>

    </div>

    ${
      datos.length
      ? datos.map(renderCliente).join("")
      : `
        <div class="zx_card">
          <div class="zx_text">
            No hay clientes.
          </div>
        </div>
      `
    }

  `;
};

})();