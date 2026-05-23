// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3074 FIX TOTAL
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
// 🔴 SINCRONIZAR DESDE JORNADAS
// ===============================
async function sincronizarDesdeJornadas(){

  const s=sesion();

  let q=sb()
    .from("jornadas")
    .select("*")
    .gt("minutos_extra",0);

  if(!esAdmin()){
    q=q.eq("usuario_id",String(s.id));
  }

  const r=await q;

  if(r.error || !r.data) return;

  for(const j of r.data){

    const existente=await sb()
      .from("horas_extra_pro")
      .select("*")
      .eq("jornada_id",j.id)
      .limit(1);

    const reg=existente.data && existente.data.length
      ? existente.data[0]
      : null;

    const minutos=Number(j.minutos_extra||0);

    const horasDecimal=Number((minutos/60).toFixed(2));
    const precioHora=10;
    const importe=Number((horasDecimal*precioHora).toFixed(2));

    if(reg){

      if(["pagada","cobrada"].includes(reg.estado)) continue;

      await sb()
        .from("horas_extra_pro")
        .update({
          minutos,
          horas_decimal:horasDecimal,
          importe
        })
        .eq("id",reg.id);

    }else{

      await sb()
        .from("horas_extra_pro")
        .insert([{
          usuario_id:j.usuario_id,
          usuario:j.usuario,
          nombre:j.nombre,
          jornada_id:j.id,
          fecha:j.fecha,
          minutos,
          horas_decimal:horasDecimal,
          precio_hora:precioHora,
          importe,
          estado:"pendiente"
        }]);
    }
  }
}

// ===============================
// CARGAR
// ===============================
async function cargarHoras(){

  await sincronizarDesdeJornadas();

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
// ESTADOS
// ===============================
async function actualizarEstado(id,estado){

  const s=sesion();

  const update={
    estado,
    updated_at:new Date().toISOString()
  };

  if(estado==="validada_usuario"){
    update.validada_usuario_por=s.usuario;
  }

  if(estado==="validada_admin"){
    update.validada_admin_por=s.usuario;
  }

  if(estado==="pagada"){
    update.pagada_por=s.usuario;
  }

  if(estado==="cobrada"){
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

  return `
    <div class="zx_card">
      <h2>${limpiar(h.nombre || h.usuario || "")}</h2>

      <div class="zx_text">
        Fecha: ${limpiar(h.fecha)}<br>
        Horas: ${formatoMin(h.minutos)}<br>
        Importe: ${Number(h.importe||0).toFixed(2)} €<br>
        Estado: <b>${limpiar(h.estado)}</b>
      </div>

      ${
        !esAdmin() && h.estado==="pendiente"
        ? `<button class="zx_btn_big zx_azul" onclick="ZX_validarUsuario('${h.id}')">Validar</button>`
        : ""
      }

      ${
        esAdmin() && h.estado==="pendiente"
        ? `<button class="zx_btn_big zx_azul" onclick="ZX_validarAdmin('${h.id}')">Validar</button>`
        : ""
      }

      ${
        esAdmin() && h.estado==="validada_admin"
        ? `<button class="zx_btn_big zx_naranja" onclick="ZX_pagar('${h.id}')">Pagar</button>`
        : ""
      }

      ${
        !esAdmin() && h.estado==="validada_admin"
        ? `<button class="zx_btn_big zx_verde" onclick="ZX_cobrar('${h.id}')">Cobrar</button>`
        : ""
      }
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
window.ZX_validarUsuario=id=>actualizarEstado(id,"validada_usuario");
window.ZX_validarAdmin=id=>actualizarEstado(id,"validada_admin");
window.ZX_pagar=id=>actualizarEstado(id,"pagada");
window.ZX_cobrar=id=>actualizarEstado(id,"cobrada");

})();