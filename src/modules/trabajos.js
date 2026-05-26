// ===============================
// ZENTRYX PRO - TRABAJOS
// V3093 COMPLETO
// ===============================
(function(){
"use strict";

// ===============================
// BASE
// ===============================
function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
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

function hoy(){
  return new Date().toISOString().slice(0,10);
}

// ===============================
// CARGAS
// ===============================
async function cargarClientes(){
  const r=await sb().from("clientes").select("*").order("nombre",{ascending:true});
  if(r.error) return [];
  return r.data || [];
}

async function cargarTrabajos(){
  const r=await sb()
    .from("trabajos")
    .select("*")
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});

  if(r.error){
    alert("Error cargando trabajos: "+r.error.message);
    return [];
  }
  return r.data || [];
}

// ===============================
// HELPERS
// ===============================
function textoEstado(e){
  if(e==="pendiente") return "Pendiente";
  if(e==="en_curso") return "En curso";
  if(e==="terminado") return "Terminado";
  return e || "-";
}

function claseEstado(e){
  if(e==="pendiente") return "zx_naranja";
  if(e==="en_curso") return "zx_azul";
  if(e==="terminado") return "zx_verde";
  return "zx_gris";
}

function direccionCompleta(t){
  return [t.direccion,t.poblacion].filter(Boolean).join(" ");
}

// ===============================
// RENDER
// ===============================
function renderTrabajo(t){

  const dir=direccionCompleta(t);

  return `
    <div class="zx_card">

      <h3>${limpiar(t.titulo || "Trabajo")}</h3>

      <div class="zx_text">
        Estado: <b>${limpiar(textoEstado(t.estado))}</b><br>
        Fecha: <b>${limpiar(t.fecha || "-")}</b>
        ${t.hora_inicio ? " · "+limpiar(String(t.hora_inicio).slice(0,5)) : ""}<br>

        ${t.cliente ? "Cliente: <b>"+limpiar(t.cliente)+"</b><br>" : ""}
        ${t.usuario ? "Operario: <b>"+limpiar(t.usuario)+"</b><br>" : ""}
        ${dir ? "Dirección: "+limpiar(dir)+"<br>" : ""}

        ${t.descripcion ? "<br>"+limpiar(t.descripcion) : ""}
        ${t.notas ? "<br>Notas: "+limpiar(t.notas) : ""}
      </div>

      <button class="zx_btn_big ${claseEstado(t.estado)}"
        onclick="ZX_cambiarEstadoTrabajo('${t.id}')">
        Cambiar estado
      </button>

      ${
        dir
        ? `<button class="zx_btn_big zx_azul"
              onclick="ZX_mapaTrabajo('${encodeURIComponent(dir)}')">
              Abrir mapa
            </button>`
        : ""
      }

      <button class="zx_btn_big zx_naranja"
        onclick="ZX_editarTrabajo('${t.id}')">
        Editar
      </button>

      <button class="zx_btn_big zx_rojo"
        onclick="ZX_borrarTrabajo('${t.id}')">
        Borrar
      </button>

    </div>
  `;
}

// ===============================
// MAPA
// ===============================
window.ZX_mapaTrabajo=function(dir){
  const d=decodeURIComponent(dir);
  const google=confirm("Aceptar = Google Maps\nCancelar = Apple Maps");

  if(google){
    window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(d));
  }else{
    window.open("https://maps.apple.com/?q="+encodeURIComponent(d));
  }
};

// ===============================
// FORMULARIO
// ===============================
async function formTrabajo(t={}){
  const clientes=await cargarClientes();

  app().innerHTML=`
    <div class="zx_card">

      <h2>${t.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>

      <input id="tr_titulo" placeholder="Título" value="${limpiar(t.titulo || "")}">

      <select id="tr_cliente">
        <option value="">Sin cliente</option>
        ${clientes.map(c=>`
          <option value="${c.id}" ${String(t.cliente_id)===String(c.id)?"selected":""}>
            ${limpiar(c.nombre)}
          </option>
        `).join("")}
      </select>

      <input id="tr_fecha" type="date" value="${limpiar(t.fecha || hoy())}">
      <input id="tr_hora_inicio" type="time" value="${t.hora_inicio ? String(t.hora_inicio).slice(0,5) : ""}">
      <input id="tr_hora_fin" type="time" value="${t.hora_fin ? String(t.hora_fin).slice(0,5) : ""}">

      <input id="tr_usuario" placeholder="Operario" value="${limpiar(t.usuario || "")}">
      <input id="tr_direccion" placeholder="Dirección" value="${limpiar(t.direccion || "")}">
      <input id="tr_poblacion" placeholder="Población" value="${limpiar(t.poblacion || "")}">

      <textarea id="tr_descripcion" rows="3">${limpiar(t.descripcion || "")}</textarea>
      <textarea id="tr_notas" rows="3">${limpiar(t.notas || "")}</textarea>

      <button class="zx_btn_big zx_verde" onclick="ZX_guardarTrabajo('${t.id || ""}')">
        Guardar
      </button>

      <button class="zx_btn_big zx_gris" onclick="ZX_trabajos()">
        Volver
      </button>

    </div>
  `;
}

// ===============================
// CRUD
// ===============================
window.ZX_nuevoTrabajo=function(){
  formTrabajo();
};

window.ZX_guardarTrabajo=async function(id){

  const s=sesion();

  const data={
    titulo:document.getElementById("tr_titulo").value.trim(),
    cliente_id:document.getElementById("tr_cliente").value || null,
    fecha:document.getElementById("tr_fecha").value || hoy(),
    hora_inicio:document.getElementById("tr_hora_inicio").value || null,
    hora_fin:document.getElementById("tr_hora_fin").value || null,
    usuario:document.getElementById("tr_usuario").value.trim(),
    direccion:document.getElementById("tr_direccion").value.trim(),
    poblacion:document.getElementById("tr_poblacion").value.trim(),
    descripcion:document.getElementById("tr_descripcion").value.trim(),
    notas:document.getElementById("tr_notas").value.trim(),
    creado_por:s.usuario || ""
  };

  if(!data.titulo){
    alert("Introduce título");
    return;
  }

  let r;

  if(id){
    r=await sb().from("trabajos").update(data).eq("id",id);
  }else{
    r=await sb().from("trabajos").insert([data]);
  }

  if(r.error){
    alert("Error: "+r.error.message);
    return;
  }

  ZX_trabajos();
};

window.ZX_editarTrabajo=async function(id){
  const r=await sb().from("trabajos").select("*").eq("id",id).maybeSingle();
  if(r.error || !r.data){
    alert("No encontrado");
    return;
  }
  formTrabajo(r.data);
};

window.ZX_borrarTrabajo=async function(id){
  if(!confirm("¿Borrar trabajo?")) return;

  const r=await sb().from("trabajos").delete().eq("id",id);

  if(r.error){
    alert("Error borrando");
    return;
  }

  ZX_trabajos();
};

window.ZX_cambiarEstadoTrabajo=async function(id){

  const r=await sb().from("trabajos").select("*").eq("id",id).maybeSingle();
  if(r.error || !r.data) return;

  let nuevo="en_curso";
  if(r.data.estado==="en_curso") nuevo="terminado";
  if(r.data.estado==="terminado") nuevo="pendiente";

  await sb().from("trabajos").update({estado:nuevo}).eq("id",id);

  ZX_trabajos();
};

// ===============================
// LISTADO
// ===============================
window.ZX_trabajos=async function(){

  const datos=await cargarTrabajos();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Trabajos</h2>

      <button class="zx_btn_big zx_verde" onclick="ZX_nuevoTrabajo()">
        Nuevo trabajo
      </button>
    </div>

    ${
      datos.length
      ? datos.map(renderTrabajo).join("")
      : `<div class="zx_card"><div class="zx_text">Sin trabajos</div></div>`
    }
  `;
};

})();