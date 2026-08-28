// ===============================
// ZENTRYX PRO - HORAS EXTRA
// V3085 - FLUJO SEGURO + FORMATO LEGIBLE + VISTA DE IMPRESIÓN
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
  min=Math.max(0,Math.round(Number(min||0)));
  const h=Math.floor(min/60);
  const m=min%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}

function formatoDuracion(min){
  min=Math.max(0,Math.round(Number(min||0)));
  const h=Math.floor(min/60);
  const m=min%60;
  return h+" h "+String(m).padStart(2,"0")+" min";
}

function formatoDinero(v){
  const n=Number(v||0);
  return n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
}

function formatoPrecio(v){
  const n=Number(v||0);
  return n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €/h";
}

function textoTipo(tipo){
  const t=String(tipo||"normal").toLowerCase();
  const m={normal:"Normal",nocturna:"Nocturna",festivo:"Festivo",festiva:"Festivo"};
  return m[t] || (t ? t.charAt(0).toUpperCase()+t.slice(1) : "Normal");
}

function registroPorId(id){
  return (ZX_HX_CACHE||[]).find(h=>String(h.id)===String(id)) || null;
}

function esPropietario(h){
  const s=sesion();
  return !!h && String(h.usuario_id||"")===String(s.id||"");
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
  const h=registroPorId(id);

  if(!h){
    alert("No se ha encontrado el registro de horas extra.");
    return;
  }

  const actual=String(h.estado||"");

  if(estado==="validada_usuario"){
    if(actual!=="pendiente" || !esPropietario(h)){
      alert("Solo el trabajador puede validar sus horas pendientes.");
      return;
    }
  }

  if(estado==="validada_admin"){
    if(!esAdmin() || !["pendiente","validada_usuario"].includes(actual)){
      alert("Esta validación requiere un administrador y un registro pendiente.");
      return;
    }
  }

  if(estado==="pagada"){
    if(!esAdmin() || actual!=="validada_admin"){
      alert("Solo un administrador puede marcar como pagadas unas horas ya validadas.");
      return;
    }
  }

  if(estado==="cobrada"){
    if(actual!=="pagada" || !esPropietario(h)){
      alert("Solo el trabajador puede confirmar el cobro de sus propias horas extra.");
      return;
    }
  }

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

function confirmarCambioHoras(id,estado,mensaje){
  if(!confirm(mensaje)) return;
  actualizarEstado(id,estado);
}

window.ZX_validarUsuario=function(id){
  confirmarCambioHoras(id,"validada_usuario","¿Validar estas horas extra?");
};

window.ZX_validarAdmin=function(id){
  confirmarCambioHoras(id,"validada_admin","¿Validar estas horas extra como administrador?");
};

window.ZX_pagar=function(id){
  confirmarCambioHoras(id,"pagada","¿Marcar estas horas extra como pagadas?");
};

window.ZX_cobrar=function(id){
  confirmarCambioHoras(id,"cobrada","¿Confirmas que has cobrado estas horas extra?");
};

function renderBotones(h){
  let html="";

  if(!esAdmin() && esPropietario(h) && h.estado==="pendiente"){
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

  if(h.estado==="pagada" && esPropietario(h)){
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
        Tipo: <b>${limpiar(textoTipo(h.tipo))}</b><br>
        Horas: <b>${formatoDuracion(h.minutos)}</b><br>
        Precio hora: <b>${formatoPrecio(h.precio_hora)}</b><br>
        Importe: <b>${formatoDinero(h.importe)}</b><br>
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
        Total horas: <b>${formatoDuracion(min)}</b><br>
        Total importe: <b>${formatoDinero(imp)}</b>
      </div>

      <button class="zx_btn_big zx_gris" onclick="ZX_imprimirHorasExtra()">
        Ver / imprimir horas extra
      </button>

      <button class="zx_btn_big zx_azul" onclick="ZX_enviarHorasExtra()">
        Enviar horas extra
      </button>
    </div>
  `;
}

function filasDocumento(datos){
  return datos.map(h=>`
    <tr>
      <td>${limpiar(formatoFecha(h.fecha))}</td>
      <td>${limpiar(h.nombre||h.usuario||"")}</td>
      <td>${limpiar(textoTipo(h.tipo))}</td>
      <td>${formatoDuracion(h.minutos)}</td>
      <td>${formatoPrecio(h.precio_hora)}</td>
      <td>${formatoDinero(h.importe)}</td>
      <td>${limpiar(textoEstado(h.estado))}</td>
    </tr>
  `).join("");
}

function cuerpoDocumento(datos){
  let totalMin=0;
  let totalImporte=0;

  datos.forEach(h=>{
    totalMin+=Number(h.minutos||0);
    totalImporte+=Number(h.importe||0);
  });

  return `
    <div class="zx_hx_doc_title">Documento de horas extra</div>
    <div class="zx_hx_doc_sub">Generado: ${limpiar(fechaHora())}</div>

    <div class="zx_hx_table_wrap">
      <table class="zx_hx_doc_table">
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
        <tbody>${filasDocumento(datos)}</tbody>
      </table>
    </div>

    <div class="zx_hx_totales">
      Total horas: ${formatoDuracion(totalMin)}<br>
      Total importe: ${formatoDinero(totalImporte)}
    </div>

    <div class="zx_hx_firmas">
      <div class="zx_hx_firma">Firma trabajador</div>
      <div class="zx_hx_firma">Firma administrador</div>
    </div>
  `;
}

function textoCompartirHoras(datos){
  let texto="HORAS EXTRA\n\n";
  let totalMin=0;
  let totalImporte=0;

  datos.forEach(h=>{
    totalMin+=Number(h.minutos||0);
    totalImporte+=Number(h.importe||0);

    texto+=
      "Fecha: "+formatoFecha(h.fecha)+"\n"+
      "Trabajador: "+(h.nombre||h.usuario||"")+"\n"+
      "Tipo: "+textoTipo(h.tipo)+"\n"+
      "Horas: "+formatoDuracion(h.minutos)+"\n"+
      "Precio hora: "+formatoPrecio(h.precio_hora)+"\n"+
      "Importe: "+formatoDinero(h.importe)+"\n"+
      "Estado: "+textoEstado(h.estado)+"\n\n";
  });

  texto+=
    "TOTAL HORAS: "+formatoDuracion(totalMin)+"\n"+
    "TOTAL IMPORTE: "+formatoDinero(totalImporte);

  return texto;
}

async function compartirHoras(datos){
  if(!datos.length){
    alert("No hay horas extra para enviar.");
    return;
  }

  const texto=textoCompartirHoras(datos);

  if(navigator.share){
    try{
      await navigator.share({title:"Horas extra",text:texto});
    }catch(e){
      if(e && e.name==="AbortError") return;
      alert("No se pudo abrir el menú para compartir.");
    }
    return;
  }

  window.location.href="mailto:?subject=Horas extra&body="+encodeURIComponent(texto);
}

function asegurarEstiloVistaHoras(){
  if(document.getElementById("zx_hx_preview_style")) return;

  const style=document.createElement("style");
  style.id="zx_hx_preview_style";
  style.textContent=`
    #zx_hx_preview{
      position:fixed;inset:0;z-index:100000;background:var(--zx-bg,#f8fafc);
      color:#0f172a;display:flex;flex-direction:column;
      padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);
    }
    #zx_hx_preview_actions{
      position:sticky;top:0;z-index:3;background:var(--zx-card,#fff);
      border-bottom:1px solid var(--zx-line,#dbe3ee);padding:12px;
      display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;
    }
    #zx_hx_preview_actions button{
      border:0;border-radius:16px;padding:14px 8px;font-size:16px;font-weight:900;
    }
    #zx_hx_preview_back{background:#dbeafe;color:#0757c7}
    #zx_hx_preview_print{background:#0b6cff;color:white}
    #zx_hx_preview_share{background:#16a34a;color:white}
    #zx_hx_preview_scroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:14px}
    #zx_hx_print_doc{
      width:100%;max-width:1080px;margin:0 auto;background:white;color:#111827;
      border-radius:20px;padding:20px;box-shadow:0 8px 28px rgba(15,23,42,.10);
      font-family:Arial,sans-serif;
    }
    .zx_hx_doc_title{font-size:28px;font-weight:900;margin-bottom:4px}
    .zx_hx_doc_sub{color:#6b7280;margin-bottom:18px}
    .zx_hx_table_wrap{overflow:auto;width:100%}
    .zx_hx_doc_table{width:100%;min-width:760px;border-collapse:collapse;margin-top:12px}
    .zx_hx_doc_table th,.zx_hx_doc_table td{border:1px solid #d1d5db;padding:8px;font-size:13px;text-align:left;vertical-align:top}
    .zx_hx_doc_table th{background:#f3f4f6}
    .zx_hx_totales{margin-top:20px;font-size:16px;font-weight:bold}
    .zx_hx_firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px}
    .zx_hx_firma{border-top:1px solid #111827;padding-top:8px;text-align:center;font-size:14px}
    @media(max-width:600px){
      #zx_hx_preview_actions{grid-template-columns:1fr 1fr 1fr;padding:10px 8px;gap:6px}
      #zx_hx_preview_actions button{font-size:14px;padding:13px 4px}
      #zx_hx_preview_scroll{padding:10px}
      #zx_hx_print_doc{padding:14px;border-radius:16px}
      .zx_hx_doc_title{font-size:23px}
    }
    @media print{
      body{background:#fff!important}
      body>*{visibility:hidden!important}
      #zx_hx_preview,#zx_hx_preview *{visibility:visible!important}
      #zx_hx_preview{
        position:absolute!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;
        width:100%!important;height:auto!important;overflow:visible!important;background:#fff!important;padding:0!important;
      }
      #zx_hx_preview_actions{display:none!important}
      #zx_hx_preview_scroll{display:block!important;overflow:visible!important;height:auto!important;padding:0!important}
      #zx_hx_print_doc{max-width:none!important;width:100%!important;margin:0!important;padding:8mm!important;box-shadow:none!important;border-radius:0!important}
      .zx_hx_table_wrap{overflow:visible!important}
      .zx_hx_doc_table{min-width:0!important;width:100%!important}
      .zx_hx_doc_table th,.zx_hx_doc_table td{font-size:9px!important;padding:4px!important}
      .zx_hx_doc_title{font-size:20px!important}
      .zx_hx_firmas{margin-top:30px!important}
    }
  `;
  document.head.appendChild(style);
}

window.ZX_cerrarVistaHorasExtra=function(){
  const el=document.getElementById("zx_hx_preview");
  if(el) el.remove();
  document.body.style.overflow="";
};

window.ZX_imprimirVistaHorasExtra=function(){
  window.print();
};

window.ZX_compartirVistaHorasExtra=function(){
  compartirHoras(ZX_HX_CACHE||[]);
};

window.ZX_imprimirHorasExtra=function(){
  const datos=ZX_HX_CACHE || [];

  if(!datos.length){
    alert("No hay horas extra para imprimir.");
    return;
  }

  asegurarEstiloVistaHoras();
  window.ZX_cerrarVistaHorasExtra();

  const vista=document.createElement("div");
  vista.id="zx_hx_preview";
  vista.innerHTML=`
    <div id="zx_hx_preview_actions">
      <button id="zx_hx_preview_back" type="button" onclick="ZX_cerrarVistaHorasExtra()">← Volver</button>
      <button id="zx_hx_preview_print" type="button" onclick="ZX_imprimirVistaHorasExtra()">🖨️ Imprimir</button>
      <button id="zx_hx_preview_share" type="button" onclick="ZX_compartirVistaHorasExtra()">Compartir</button>
    </div>
    <div id="zx_hx_preview_scroll">
      <div id="zx_hx_print_doc">${cuerpoDocumento(datos)}</div>
    </div>
  `;

  document.body.appendChild(vista);
  document.body.style.overflow="hidden";
};

window.ZX_enviarHorasExtra=function(){
  compartirHoras(ZX_HX_CACHE || []);
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