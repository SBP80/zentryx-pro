// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3076 - VALIDACIÓN, PAGO, COBRO E IMPRESIÓN
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
  min=Number(min||0);
  const h=Math.floor(min/60);
  const m=min%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

function fechaHora(){
  const d=new Date();
  return d.toLocaleString("es-ES");
}

// ===============================
// CONFIG USUARIO
// ===============================
async function cargarConfigUsuario(usuarioId){
  const r=await sb()
    .from("horarios_usuario")
    .select("*")
    .eq("usuario_id",String(usuarioId))
    .limit(1);

  if(r.error || !r.data || !r.data.length){
    return null;
  }

  return r.data[0];
}

async function precioHoraExtra(usuarioId,tipo){
  const c=await cargarConfigUsuario(usuarioId);

  if(!c){
    return 10;
  }

  if(tipo==="festivo"){
    return Number(c.precio_extra_festiva || c.precio_extra || 10);
  }

  return Number(c.precio_extra || 10);
}

// ===============================
// SINCRONIZAR DESDE JORNADAS
// ===============================
async function sincronizarDesdeJornadas(){
  const s=sesion();

  let q=sb()
    .from("jornadas")
    .select("*")
    .gt("minutos_extra",0)
    .order("created_at",{ascending:false});

  if(!esAdmin()){
    q=q.eq("usuario_id",String(s.id));
  }

  const r=await q;

  if(r.error){
    alert("Error leyendo jornadas: "+r.error.message);
    return;
  }

  const jornadas=r.data || [];

  for(const j of jornadas){

    const minutos=Number(j.minutos_extra || j.horas_extra || 0);

    if(minutos<=0) continue;

    const existente=await sb()
      .from("horas_extra_pro")
      .select("*")
      .eq("jornada_id",j.id)
      .limit(1);

    if(existente.error){
      console.error(existente.error);
      continue;
    }

    const reg=existente.data && existente.data.length ? existente.data[0] : null;

    const tipo=j.es_festivo ? "festivo" : "normal";
    const precio=await precioHoraExtra(j.usuario_id,tipo);
    const horasDecimal=Number((minutos/60).toFixed(2));
    const importe=Number((horasDecimal*precio).toFixed(2));

    if(reg){

      if(["pagada","cobrada"].includes(reg.estado)){
        continue;
      }

      await sb()
        .from("horas_extra_pro")
        .update({
          minutos,
          horas_decimal:horasDecimal,
          precio_hora:precio,
          importe,
          tipo,
          observacion:j.observacion_laboral || "",
          updated_at:new Date().toISOString()
        })
        .eq("id",reg.id);

    }else{

      await sb()
        .from("horas_extra_pro")
        .insert([{
          usuario_id:String(j.usuario_id || ""),
          usuario:j.usuario || "",
          nombre:j.nombre || "",
          jornada_id:j.id,
          fecha:j.fecha,
          tipo,
          minutos,
          horas_decimal:horasDecimal,
          precio_hora:precio,
          importe,
          estado:"pendiente",
          observacion:j.observacion_laboral || ""
        }]);

    }
  }
}

// ===============================
// CARGAR HORAS EXTRA
// ===============================
async function cargarHoras(){
  await sincronizarDesdeJornadas();

  const s=sesion();

  let q=sb()
    .from("horas_extra_pro")
    .select("*")
    .order("fecha",{ascending:false})
    .order("created_at",{ascending:false});

  if(!esAdmin()){
    q=q.eq("usuario_id",String(s.id));
  }

  const r=await q;

  if(r.error){
    alert("Error cargando horas extra: "+r.error.message);
    return [];
  }

  return r.data || [];
}

// ===============================
// CAMBIAR ESTADO
// ===============================
async function actualizarEstado(id,estado){
  const s=sesion();

  const data={
    estado,
    updated_at:new Date().toISOString()
  };

  if(estado==="validada_usuario"){
    data.validada_usuario_at=new Date().toISOString();
    data.validada_usuario_por=s.usuario || "";
  }

  if(estado==="validada_admin"){
    data.validada_admin_at=new Date().toISOString();
    data.validada_admin_por=s.usuario || "";
  }

  if(estado==="pagada"){
    data.pagada_at=new Date().toISOString();
    data.pagada_por=s.usuario || "";
  }

  if(estado==="cobrada"){
    data.cobrada_at=new Date().toISOString();
    data.cobrada_por=s.usuario || "";
  }

  const r=await sb()
    .from("horas_extra_pro")
    .update(data)
    .eq("id",id);

  if(r.error){
    alert("Error actualizando horas extra: "+r.error.message);
    return;
  }

  ZX_horas_extra();
}

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

// ===============================
// RENDER
// ===============================
function textoEstado(e){
  const m={
    pendiente:"Pendiente usuario",
    validada_usuario:"Validada por usuario",
    validada_admin:"Validada por admin",
    pagada:"Pagada por admin",
    cobrada:"Cobrada por usuario",
    rechazada:"Rechazada"
  };

  return m[e] || e || "-";
}

function renderBotones(h){
  let html="";

  if(!esAdmin() && h.estado==="pendiente"){
    html+=`
      <button class="zx_btn_big zx_azul" onclick="ZX_validarUsuario('${h.id}')">
        Validar horas
      </button>
    `;
  }

  if(esAdmin() && h.estado==="validada_usuario"){
    html+=`
      <button class="zx_btn_big zx_azul" onclick="ZX_validarAdmin('${h.id}')">
        Validar admin
      </button>
    `;
  }

  if(esAdmin() && h.estado==="validada_admin"){
    html+=`
      <button class="zx_btn_big zx_naranja" onclick="ZX_pagar('${h.id}')">
        Marcar pagadas
      </button>
    `;
  }

  if(!esAdmin() && h.estado==="pagada"){
    html+=`
      <button class="zx_btn_big zx_verde" onclick="ZX_cobrar('${h.id}')">
        Marcar cobradas
      </button>
    `;
  }

  return html;
}

function renderFila(h){
  return `
    <div class="zx_item zx_hx_item">
      <div class="zx_item_titulo">
        ${limpiar(h.nombre || h.usuario || "Usuario")}
      </div>

      <div class="zx_item_texto">
        Fecha: <b>${limpiar(h.fecha || "")}</b><br>
        Tipo: <b>${limpiar(h.tipo || "normal")}</b><br>
        Horas: <b>${formatoMin(h.minutos)}</b><br>
        Precio hora: <b>${Number(h.precio_hora||0).toFixed(2)} €</b><br>
        Importe: <b>${Number(h.importe||0).toFixed(2)} €</b><br>
        Estado: <b>${limpiar(textoEstado(h.estado))}</b>
        ${h.observacion ? `<br>Obs.: ${limpiar(h.observacion)}` : ""}
      </div>

      ${renderBotones(h)}
    </div>
  `;
}

function resumen(datos){
  let min=0;
  let imp=0;

  datos.forEach(h=>{
    min+=Number(h.minutos||0);
    imp+=Number(h.importe||0);
  });

  return `
    <div class="zx_card">
      <h2>Resumen</h2>
      <div class="zx_text">
        Registros: <b>${datos.length}</b><br>
        Total horas: <b>${formatoMin(min)}</b><br>
        Total importe: <b>${imp.toFixed(2)} €</b>
      </div>

      <button class="zx_btn_big zx_gris" onclick="ZX_imprimirHorasExtra()">
        Imprimir horas extra
      </button>
    </div>
  `;
}

// ===============================
// IMPRIMIR
// ===============================
window.ZX_imprimirHorasExtra=async function(){
  const datos=await cargarHoras();

  let totalMin=0;
  let totalImporte=0;

  datos.forEach(h=>{
    totalMin+=Number(h.minutos||0);
    totalImporte+=Number(h.importe||0);
  });

  const filas=datos.map(h=>`
    <tr>
      <td>${limpiar(h.fecha||"")}</td>
      <td>${limpiar(h.nombre||h.usuario||"")}</td>
      <td>${limpiar(h.tipo||"normal")}</td>
      <td>${formatoMin(h.minutos)}</td>
      <td>${Number(h.precio_hora||0).toFixed(2)} €</td>
      <td>${Number(h.importe||0).toFixed(2)} €</td>
      <td>${limpiar(textoEstado(h.estado))}</td>
    </tr>
  `).join("");

  const w=window.open("","","width=900,height=1200");

  w.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Horas extra</title>
      <style>
        body{
          font-family:Arial,sans-serif;
          color:#111827;
          padding:30px;
        }

        h1{
          font-size:28px;
          margin-bottom:4px;
        }

        .sub{
          color:#6b7280;
          margin-bottom:24px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #d1d5db;
          padding:8px;
          font-size:13px;
          text-align:left;
        }

        th{
          background:#f3f4f6;
        }

        .totales{
          margin-top:20px;
          font-size:16px;
          font-weight:bold;
        }

        .firmas{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:40px;
          margin-top:60px;
        }

        .firma{
          border-top:1px solid #111827;
          padding-top:8px;
          text-align:center;
          font-size:14px;
        }

        @media print{
          button{display:none}
        }
      </style>
    </head>
    <body>
      <h1>Documento de horas extra</h1>
      <div class="sub">Generado: ${fechaHora()}</div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Trabajador</th>
            <th>Tipo</th>
            <th>Horas</th>
            <th>Precio</th>
            <th>Importe</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>

      <div class="totales">
        Total horas: ${formatoMin(totalMin)}<br>
        Total importe: ${totalImporte.toFixed(2)} €
      </div>

      <div class="firmas">
        <div class="firma">Firma trabajador</div>
        <div class="firma">Firma administrador</div>
      </div>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();
  w.print();
};

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
      <div class="zx_text">
        Validación, pago, cobro e impresión.
      </div>
    </div>

    ${datos.length ? resumen(datos) : ""}

    ${
      datos.length
      ? datos.map(renderFila).join("")
      : `<div class="zx_card"><div class="zx_text">Sin registros</div></div>`
    }
  `;
};

})();