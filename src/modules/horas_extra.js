// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3072
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

function esAdmin(){
  const s=sesion();
  return String(s.rol||"").toLowerCase()==="administrador" ||
         String(s.usuario||"").toLowerCase()==="admin";
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatoMin(min){
  const h=Math.floor((min||0)/60);
  const m=(min||0)%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

// ===============================
// CARGAR HORAS EXTRA
// ===============================
async function cargarHoras(){
  const s=sesion();

  let query=sb()
    .from("horas_extra_pro")
    .select("*")
    .order("created_at",{ascending:false});

  if(!esAdmin()){
    query=query.eq("usuario_id",String(s.id));
  }

  const r=await query;

  if(r.error){
    alert("Error cargando horas extra");
    return [];
  }

  return r.data || [];
}

// ===============================
// CAMBIOS DE ESTADO
// ===============================
async function actualizarEstado(id,estado){

  const s=sesion();

  const update={
    estado,
    updated_at:new Date().toISOString()
  };

  if(estado==="validada_usuario"){
    update.validada_usuario_at=new Date().toISOString();
    update.validada_usuario_por=s.usuario;
  }

  if(estado==="validada_admin"){
    update.validada_admin_at=new Date().toISOString();
    update.validada_admin_por=s.usuario;
  }

  if(estado==="pagada"){
    update.pagada_at=new Date().toISOString();
    update.pagada_por=s.usuario;
  }

  if(estado==="cobrada"){
    update.cobrada_at=new Date().toISOString();
    update.cobrada_por=s.usuario;
  }

  const r=await sb()
    .from("horas_extra_pro")
    .update(update)
    .eq("id",id);

  if(r.error){
    alert("Error actualizando estado");
    return;
  }

  ZX_horas_extra();
}

// ===============================
// RENDER
// ===============================
function renderFila(h){

  const botonesUsuario = !esAdmin() && h.estado==="validada_admin"
    ? `<button class="zx_btn zx_verde" onclick="ZX_cobrar('${h.id}')">Cobrar</button>`
    : "";

  const botonesAdmin = esAdmin()
    ? `
      ${
        h.estado==="pendiente"
        ? `<button class="zx_btn zx_azul" onclick="ZX_validarAdmin('${h.id}')">Validar</button>`
        : ""
      }

      ${
        h.estado==="validada_admin"
        ? `<button class="zx_btn zx_naranja" onclick="ZX_pagar('${h.id}')">Pagar</button>`
        : ""
      }
    `
    : "";

  const botonUsuarioValidar = !esAdmin() && h.estado==="pendiente"
    ? `<button class="zx_btn zx_azul" onclick="ZX_validarUsuario('${h.id}')">Validar</button>`
    : "";

  return `
    <div class="zx_item">
      <div class="zx_item_titulo">
        ${limpiar(h.nombre || h.usuario || "")}
      </div>

      <div class="zx_item_texto">
        Fecha: ${limpiar(h.fecha)}<br>
        Horas: ${formatoMin(h.minutos)}<br>
        Importe: ${Number(h.importe||0).toFixed(2)} €<br>
        Estado: <b>${limpiar(h.estado)}</b>
      </div>

      ${botonUsuarioValidar}
      ${botonesAdmin}
      ${botonesUsuario}
    </div>
  `;
}

// ===============================
// PANTALLA
// ===============================
window.ZX_horas_extra=async function(){

  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
  });

  const datos=await cargarHoras();

  app().innerHTML=`
    <div class="zx_card">
      <h2>Horas extra</h2>
    </div>

    ${
      datos.length
      ? datos.map(renderFila).join("")
      : `<div class="zx_card"><div class="zx_text">Sin registros</div></div>`
    }
  `;
};

// ===============================
// ACCIONES
// ===============================
window.ZX_validarUsuario=function(id){
  actualizarEstado(id,"validada_usuario");
};

window.ZX_validarAdmin=function(id){
  actualizarEstado(id,"validada_admin");
};

window.ZX_pagar=function(id){
  actualizarEstado(id,"pagada");
};

window.ZX_cobrar=function(id){
  actualizarEstado(id,"cobrada");
};

})();