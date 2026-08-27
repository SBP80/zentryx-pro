// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3084 - PRECIO HISTÓRICO + IMPORTE EXACTO POR MINUTOS
// ===============================
(function(){
"use strict";

let ZX_HX_CACHE=[];

const ZX_HX_CACHE_KEY="zentryx_cache_horas_extra_pro";

function leerCacheHoras(){
  try{
    const raw=localStorage.getItem(ZX_HX_CACHE_KEY);
    const data=raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  }catch(e){
    return [];
  }
}

function guardarCacheHoras(datos){
  try{
    localStorage.setItem(ZX_HX_CACHE_KEY,JSON.stringify(Array.isArray(datos) ? datos : []));
  }catch(e){}
}

function esOffline(){
  return typeof navigator!=="undefined" && navigator.onLine===false;
}

function esErrorRed(e){
  const msg=String((e && (e.message || e.name)) || e || "");
  return esOffline() ||
    (e && (e.name==="ZentryxOffline" || e.name==="ZentryxTimeout")) ||
    /offline|sin conexión|timeout|network|fetch|failed/i.test(msg);
}

function datosOfflineHoras(){
  ZX_HX_CACHE=leerCacheHoras();
  return ZX_HX_CACHE;
}

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
  return new Date().toLocaleString("es-ES");
}

function formatoFecha(v){
  const raw=String(v ?? "").trim();
  if(!raw) return "";

  let formato="DD/MM/AAAA";
  try{
    const cfg=JSON.parse(localStorage.getItem("zentryx_config") || "{}");
    formato=String(cfg?.app?.formato_fecha || formato);
  }catch(e){}

  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m){
    if(formato==="AAAA-MM-DD") return m[1]+"-"+m[2]+"-"+m[3];
    return m[3]+"/"+m[2]+"/"+m[1];
  }

  const d=new Date(raw);
  if(!Number.isNaN(d.getTime())){
    if(formato==="AAAA-MM-DD"){
      const y=d.getFullYear();
      const mo=String(d.getMonth()+1).padStart(2,"0");
      const da=String(d.getDate()).padStart(2,"0");
      return y+"-"+mo+"-"+da;
    }
    return d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"});
  }

  return raw;
}

function valorNumericoDefinido(v){
  return v!==null && v!==undefined && v!=="" && Number.isFinite(Number(v));
}

function precioSnapshotJornada(j,tipo){
  if(!j) return null;
  if(tipo==="festivo" && valorNumericoDefinido(j.config_precio_extra_festiva)) return Math.max(0,Number(j.config_precio_extra_festiva));
  if(tipo==="nocturna" && valorNumericoDefinido(j.config_precio_extra_nocturna)) return Math.max(0,Number(j.config_precio_extra_nocturna));
  if(valorNumericoDefinido(j.config_precio_extra)) return Math.max(0,Number(j.config_precio_extra));
  return null;
}

async function precioHoraExtra(usuarioId,tipo){
  if(esOffline()) return 0;

  try{
    if(window.ZENTRYX_LABORAL && typeof window.ZENTRYX_LABORAL.resolverUsuario==="function"){
      const c=await window.ZENTRYX_LABORAL.resolverUsuario(String(usuarioId));
      if(c){
        if(tipo==="festivo") return Math.max(0,Number(c.precio_extra_festiva ?? c.precio_extra ?? 0));
        if(tipo==="nocturna") return Math.max(0,Number(c.precio_extra_nocturna ?? c.precio_extra ?? 0));
        return Math.max(0,Number(c.precio_extra ?? 0));
      }
    }

    const r=await sb()
      .from("horarios_usuario")
      .select("precio_extra,precio_extra_festiva,precio_extra_nocturna,actualizado_en")
      .eq("usuario_id",String(usuarioId))
      .eq("activo",true)
      .order("actualizado_en",{ascending:false})
      .limit(1);

    if(r.error || !r.data || !r.data.length) return 0;
    const c=r.data[0];
    if(tipo==="festivo") return Math.max(0,Number(c.precio_extra_festiva ?? c.precio_extra ?? 0));
    if(tipo==="nocturna") return Math.max(0,Number(c.precio_extra_nocturna ?? c.precio_extra ?? 0));
    return Math.max(0,Number(c.precio_extra ?? 0));
  }catch(e){
    return 0;
  }
}

function detectarTipoHoraExtra(j){
  if(j.es_festivo) return "festivo";

  try{
    const f=new Date(j.fecha+"T12:00:00");
    const d=f.getDay();
    if(d===0 || d===6) return "festivo";
  }catch(e){}

  return "normal";
}

function textoEstado(e){
  const m={
    pendiente:"Pendiente trabajador",
    validada_usuario:"Validada trabajador",
    validada_admin:"Validada administrador",
    pagada:"Pagada administrador",
    cobrada:"Cobrada trabajador",
    rechazada:"Rechazada"
  };
  return m[e] || e || "-";
}

async function sincronizarDesdeJornadas(){
  if(esOffline()){
    return;
  }

  const s=sesion();

  try{
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
      if(esErrorRed(r.error)) return;
      console.warn("Horas extra: error leyendo jornadas",r.error);
      return;
    }

    const jornadas=r.data || [];

    for(const j of jornadas){
      if(esOffline()) return;

      const minutos=Number(j.minutos_extra || j.horas_extra || 0);
      if(minutos<=0) continue;

      const jornadaId=String(j.id);

      const existe=await sb()
        .from("horas_extra_pro")
        .select("*")
        .eq("jornada_id",jornadaId)
        .limit(1);

      if(existe.error){
        if(esErrorRed(existe.error)) return;
        continue;
      }

      const tipo=detectarTipoHoraExtra(j);
      const reg=existe.data && existe.data.length ? existe.data[0] : null;

      // El precio de un registro existente es histórico. No se sustituye al abrir
      // Horas extra ni al cambiar posteriormente la tarifa del trabajador.
      let precio;
      if(reg && valorNumericoDefinido(reg.precio_hora)){
        precio=Math.max(0,Number(reg.precio_hora));
      }else{
        const snapshot=precioSnapshotJornada(j,tipo);
        precio=snapshot!==null ? snapshot : await precioHoraExtra(j.usuario_id,tipo);
      }

      const horasDecimal=Number((minutos/60).toFixed(4));
      const importe=Number(((minutos*precio)/60).toFixed(2));

      if(reg){
        if(["pagada","cobrada","cobrada_trabajador"].includes(reg.estado)){
          continue;
        }

        const upd=await sb()
          .from("horas_extra_pro")
          .update({
            usuario_id:String(j.usuario_id || ""),
            usuario:j.usuario || "",
            nombre:j.nombre || "",
            jornada_id:jornadaId,
            fecha:j.fecha,
            tipo,
            minutos,
            horas_decimal:horasDecimal,
            // precio_hora permanece con el valor histórico del registro.
            precio_hora:precio,
            importe,
            observacion:j.observacion_laboral || "",
            updated_at:new Date().toISOString()
          })
          .eq("id",reg.id);

        if(upd.error && esErrorRed(upd.error)) return;
        continue;
      }

      const ins=await sb()
        .from("horas_extra_pro")
        .insert([{
          usuario_id:String(j.usuario_id || ""),
          usuario:j.usuario || "",
          nombre:j.nombre || "",
          jornada_id:jornadaId,
          fecha:j.fecha,
          tipo,
          minutos,
          horas_decimal:horasDecimal,
          precio_hora:precio,
          importe,
          estado:"pendiente",
          observacion:j.observacion_laboral || ""
        }]);

      if(ins.error && esErrorRed(ins.error)) return;
    }
  }catch(e){
    if(esErrorRed(e)) return;
    console.warn("Horas extra: sincronización no completada",e);
  }
}

async function cargarHoras(){
  if(esOffline()){
    return datosOfflineHoras();
  }

  await sincronizarDesdeJornadas();

  const s=sesion();

  try{
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
      if(esErrorRed(r.error)){
        return datosOfflineHoras();
      }
      console.warn("Horas extra: error cargando",r.error);
      return datosOfflineHoras();
    }

    ZX_HX_CACHE=r.data || [];
    guardarCacheHoras(ZX_HX_CACHE);
    return ZX_HX_CACHE;
  }catch(e){
    if(esErrorRed(e)){
      return datosOfflineHoras();
    }
    console.warn("Horas extra: carga no completada",e);
    return datosOfflineHoras();
  }
}

async function actualizarEstado(id,estado){
  if(esOffline()){
    alert("Sin conexión. No se puede cambiar el estado de horas extra ahora.");
    return;
  }

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

  let r=null;

  try{
    r=await sb()
      .from("horas_extra_pro")
      .update(data)
      .eq("id",id);
  }catch(e){
    if(esErrorRed(e)){
      alert("Sin conexión. No se puede cambiar el estado de horas extra ahora.");
      return;
    }
    alert("No se pudo actualizar horas extra.");
    return;
  }

  if(r.error){
    if(esErrorRed(r.error)){
      alert("Sin conexión. No se puede cambiar el estado de horas extra ahora.");
      return;
    }
    alert("No se pudo actualizar horas extra.");
    return;
  }

  ZX_horas_extra();
}

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

function renderBotones(h){
  let html="";

  if(!esAdmin() && h.estado==="pendiente"){
    html+=`
      <button class="zx_btn_big zx_azul" onclick="ZX_validarUsuario('${h.id}')">
        Validar horas
      </button>
    `;
  }

  if(esAdmin() && (h.estado==="pendiente" || h.estado==="validada_usuario")){
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

  if(h.estado==="pagada"){
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
    <div class="zx_card">
      <h2>${limpiar(h.nombre || h.usuario || "Usuario")}</h2>

      <div class="zx_text">
        Fecha: <b>${limpiar(formatoFecha(h.fecha))}</b><br>
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

      <button class="zx_btn_big zx_azul" onclick="ZX_enviarHorasExtra()">
        Enviar horas extra
      </button>
    </div>
  `;
}

function htmlDocumento(datos){
  let totalMin=0;
  let totalImporte=0;

  datos.forEach(h=>{
    totalMin+=Number(h.minutos||0);
    totalImporte+=Number(h.importe||0);
  });

  const filas=datos.map(h=>`
    <tr>
      <td>${limpiar(formatoFecha(h.fecha))}</td>
      <td>${limpiar(h.nombre||h.usuario||"")}</td>
      <td>${limpiar(h.tipo||"normal")}</td>
      <td>${formatoMin(h.minutos)}</td>
      <td>${Number(h.precio_hora||0).toFixed(2)} €</td>
      <td>${Number(h.importe||0).toFixed(2)} €</td>
      <td>${limpiar(textoEstado(h.estado))}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Horas extra</title>
      <style>
        body{font-family:Arial,sans-serif;color:#111827;padding:24px}
        h1{font-size:28px;margin-bottom:4px}
        .sub{color:#6b7280;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #d1d5db;padding:8px;font-size:13px;text-align:left}
        th{background:#f3f4f6}
        .totales{margin-top:20px;font-size:16px;font-weight:bold}
        .firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px}
        .firma{border-top:1px solid #111827;padding-top:8px;text-align:center;font-size:14px}
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
        <tbody>${filas}</tbody>
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
  `;
}

window.ZX_imprimirHorasExtra=function(){
  const datos=ZX_HX_CACHE || [];

  if(!datos.length){
    alert("No hay horas extra para imprimir.");
    return;
  }

  const w=window.open("about:blank","_blank");

  if(!w){
    alert("Safari ha bloqueado la ventana. Permite ventanas emergentes para imprimir.");
    return;
  }

  w.document.open();
  w.document.write(htmlDocumento(datos));
  w.document.close();

  setTimeout(function(){
    w.focus();
    w.print();
  },500);
};

window.ZX_enviarHorasExtra=function(){
  const datos=ZX_HX_CACHE || [];

  if(!datos.length){
    alert("No hay horas extra para enviar.");
    return;
  }

  let texto="HORAS EXTRA\n\n";

  let totalMin=0;
  let totalImporte=0;

  datos.forEach(h=>{
    totalMin+=Number(h.minutos||0);
    totalImporte+=Number(h.importe||0);

    texto+=
      "Fecha: "+formatoFecha(h.fecha)+"\n"+
      "Trabajador: "+(h.nombre||h.usuario||"")+"\n"+
      "Tipo: "+(h.tipo||"normal")+"\n"+
      "Horas: "+formatoMin(h.minutos)+"\n"+
      "Importe: "+Number(h.importe||0).toFixed(2)+" €\n"+
      "Estado: "+textoEstado(h.estado)+"\n\n";
  });

  texto+=
    "TOTAL HORAS: "+formatoMin(totalMin)+"\n"+
    "TOTAL IMPORTE: "+totalImporte.toFixed(2)+" €";

  if(navigator.share){
    navigator.share({
      title:"Horas extra",
      text:texto
    });
    return;
  }

  window.location.href="mailto:?subject=Horas extra&body="+encodeURIComponent(texto);
};

function renderHoras(datos){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Horas extra</h2>
      <div class="zx_text">
        Validación, pago, cobro, impresión y envío.
      </div>
    </div>

    ${datos.length ? resumen(datos) : ""}

    ${
      datos.length
      ? datos.map(renderFila).join("")
      : `<div class="zx_card"><div class="zx_text">Sin registros</div></div>`
    }
  `;
}

window.ZX_horas_extra=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
  });

  if(esOffline()){
    renderHoras(datosOfflineHoras());
    return;
  }

  renderHoras(ZX_HX_CACHE.length ? ZX_HX_CACHE : leerCacheHoras());

  const datos=await cargarHoras();
  renderHoras(datos);
};

})();