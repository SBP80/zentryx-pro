// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3075 (AUTO-SYNC DESDE JORNADAS)
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
// 1. CARGAR DESDE HORAS_EXTRA_PRO
// ===============================
async function cargarHorasDB(){

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
    console.error("Error horas_extra_pro:",r.error);
    return [];
  }

  return r.data || [];
}

// ===============================
// 2. GENERAR DESDE JORNADAS
// ===============================
async function generarDesdeJornadas(){

  const s=sesion();

  let query=sb()
    .from("jornadas")
    .select("*")
    .gt("minutos_extra",0)
    .order("created_at",{ascending:false});

  if(!esAdmin()){
    query=query.eq("usuario_id",String(s.id));
  }

  const r=await query;

  if(r.error){
    console.error("Error jornadas:",r.error);
    return [];
  }

  return (r.data||[]).map(j=>{

    const minutos=j.minutos_extra || j.horas_extra || 0;
    const horasDecimal=Number((minutos/60).toFixed(2));
    const precioHora=10;
    const importe=Number((horasDecimal*precioHora).toFixed(2));

    return {
      id:"JORNADA_"+j.id,
      nombre:j.nombre || j.usuario,
      usuario:j.usuario,
      fecha:j.fecha,
      minutos,
      horas_decimal:horasDecimal,
      precio_hora:precioHora,
      importe,
      estado:"pendiente",
      origen:"jornada",
      jornada_id:j.id
    };

  });
}

// ===============================
// 3. UNIFICAR DATOS
// ===============================
async function cargarHoras(){

  const db=await cargarHorasDB();

  if(db.length){
    return db;
  }

  return await generarDesdeJornadas();
}

// ===============================
// CAMBIOS DE ESTADO
// ===============================
async function actualizarEstado(id,estado){

  if(String(id).startsWith("JORNADA_")){
    alert("Este registro aún no está sincronizado en base de datos.");
    return;
  }

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
    alert("Error actualizando estado: "+r.error.message);
    return;
  }

  ZX_horas_extra();
}

// ===============================
// RENDER
// ===============================
function renderFila(h){

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
        ${h.origen==="jornada" ? "<br><i>(generado automático)</i>" : ""}
      </div>
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