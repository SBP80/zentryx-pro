// ===============================
// ZENTRYX PRO - PANEL DESARROLLADOR
// V3122 - DIAGNÓSTICO, LOGS Y MANTENIMIENTO
// ===============================
(function(){
"use strict";

const ZX_DEV_VERSION="3122";
const LOG_KEY="zentryx_dev_logs";
const MAX_LOGS=250;

function app(){
  return document.getElementById("app");
}

function zx(){
  return window.ZENTRYX || window.ZX || {};
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizar(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function ahora(){
  return new Date().toISOString();
}

function leerJSON(k,fallback){
  try{
    const raw=localStorage.getItem(k);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}

function guardarJSON(k,v){
  try{
    localStorage.setItem(k,JSON.stringify(v));
    return true;
  }catch(e){
    return false;
  }
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function"){
    try{return zx().usuarioActual() || {};}catch(e){}
  }

  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}");}
  catch(e){return {};}
}

function esDesarrollador(){
  const s=sesion();
  const rol=normalizar(s.rol);
  const usuario=normalizar(s.usuario);
  return rol==="desarrollador" || rol==="developer" || rol==="dev" ||
         usuario==="desarrollador" || usuario==="developer" || usuario==="dev";
}

function logs(){
  const l=leerJSON(LOG_KEY,[]);
  return Array.isArray(l) ? l : [];
}

function guardarLog(tipo,mensaje,extra){
  const lista=logs();

  lista.unshift({
    fecha:ahora(),
    tipo:String(tipo || "info"),
    mensaje:String(mensaje || ""),
    extra:extra || null,
    url:location.href
  });

  guardarJSON(LOG_KEY,lista.slice(0,MAX_LOGS));
}

function instalarCapturaErrores(){
  if(window.__ZX_DEV_ERROR_CAPTURED__) return;
  window.__ZX_DEV_ERROR_CAPTURED__=true;

  window.addEventListener("error",function(e){
    guardarLog("error_js",e.message || "Error JS",{
      archivo:e.filename || "",
      linea:e.lineno || "",
      columna:e.colno || "",
      stack:e.error && e.error.stack ? String(e.error.stack).slice(0,1500) : ""
    });
  });

  window.addEventListener("unhandledrejection",function(e){
    guardarLog("promise",e.reason && e.reason.message ? e.reason.message : String(e.reason || "Promise rechazada"),{
      stack:e.reason && e.reason.stack ? String(e.reason.stack).slice(0,1500) : ""
    });
  });
}

function contarCache(){
  const out=[];

  try{
    Object.keys(localStorage).forEach(function(k){
      if(k.indexOf("zentryx_cache_")===0 || k.indexOf("zentryx_backend_cache_")===0){
        const val=leerJSON(k,[]);
        out.push({
          key:k,
          items:Array.isArray(val) ? val.length : 1,
          size:localStorage.getItem(k)?.length || 0
        });
      }
    });
  }catch(e){}

  return out.sort(function(a,b){
    return a.key.localeCompare(b.key);
  });
}

function estadoBackend(){
  if(window.ZENTRYX_BACKEND && typeof window.ZENTRYX_BACKEND.status==="function"){
    return window.ZENTRYX_BACKEND.status();
  }

  return {
    disponible:false,
    online:navigator.onLine,
    pending:0
  };
}

function estadoRed(){
  if(zx() && typeof zx().estadoRed==="function"){
    try{return zx().estadoRed();}catch(e){}
  }

  return {
    online:navigator.onLine,
    calidad:navigator.onLine ? "online" : "offline"
  };
}

function colaOffline(){
  if(window.ZENTRYX_BACKEND && window.ZENTRYX_BACKEND.queue){
    try{return window.ZENTRYX_BACKEND.queue.pending();}
    catch(e){}
  }

  try{
    const q=leerJSON("zentryx_offline_queue",[]);
    return Array.isArray(q) ? q.filter(x=>x && (x.estado==="pendiente" || x.status==="pending")) : [];
  }catch(e){
    return [];
  }
}

function memoria(){
  try{
    if(performance && performance.memory){
      return {
        usada:Math.round(performance.memory.usedJSHeapSize/1024/1024)+" MB",
        total:Math.round(performance.memory.totalJSHeapSize/1024/1024)+" MB",
        limite:Math.round(performance.memory.jsHeapSizeLimit/1024/1024)+" MB"
      };
    }
  }catch(e){}

  return {
    usada:"No disponible",
    total:"No disponible",
    limite:"No disponible"
  };
}

function rendimiento(){
  try{
    const nav=performance.getEntriesByType("navigation")[0];
    if(nav){
      return {
        dom:Math.round(nav.domContentLoadedEventEnd)+" ms",
        carga:Math.round(nav.loadEventEnd)+" ms",
        respuesta:Math.round(nav.responseEnd-nav.requestStart)+" ms",
        tipo:nav.type || ""
      };
    }
  }catch(e){}

  return {
    dom:"No disponible",
    carga:"No disponible",
    respuesta:"No disponible"
  };
}

function modulos(){
  const nombres=["inicio","fichaje","agenda","clientes","trabajos","usuarios","horas_extra","control_fichajes","vehiculos","configuracion","desarrollador"];
  const funciones={
    inicio:"ZENTRYX_UI_inicio",
    fichaje:"ZX_fichaje_real",
    agenda:"ZX_agenda",
    clientes:"ZX_clientes",
    trabajos:"ZX_trabajos",
    usuarios:"ZENTRYX_UI_usuarios",
    horas_extra:"ZX_horas_extra",
    control_fichajes:"ZX_control_fichajes",
    vehiculos:"ZX_vehiculos",
    configuracion:"ZX_configuracion",
    desarrollador:"ZX_desarrollador"
  };

  return nombres.map(function(n){
    const f=funciones[n];
    return {
      modulo:n,
      funcion:f,
      cargado:typeof window[f]==="function"
    };
  });
}

function dispositivo(){
  return {
    userAgent:navigator.userAgent,
    idioma:navigator.language,
    online:navigator.onLine,
    url:location.href,
    ancho:window.innerWidth,
    alto:window.innerHeight,
    plataforma:navigator.platform || "",
    cookies:navigator.cookieEnabled
  };
}

function instalarCSS(){
  if(document.getElementById("zx_dev_css_v3122")) return;

  const old=document.getElementById("zx_dev_css");
  if(old) old.remove();

  const st=document.createElement("style");
  st.id="zx_dev_css_v3122";
  st.innerHTML=`
    .zx_dev_grid{
      display:grid;
      grid-template-columns:1fr;
      gap:14px;
      padding-bottom:calc(env(safe-area-inset-bottom) + 118px);
    }

    .zx_dev_card{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:24px;
      padding:18px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
      overflow:hidden;
    }

    .zx_dev_card h2,
    .zx_dev_card h3{
      margin:0 0 10px;
      color:#071330;
      font-weight:950;
      letter-spacing:-.4px;
    }

    .zx_dev_card h2{
      font-size:30px;
    }

    .zx_dev_card h3{
      font-size:22px;
    }

    .zx_dev_text{
      color:#64748b;
      font-weight:850;
      line-height:1.45;
      word-break:break-word;
    }

    .zx_dev_kpis{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:12px;
    }

    .zx_dev_kpi{
      background:#f8fafc;
      border-radius:18px;
      padding:14px;
      text-align:center;
      min-width:0;
    }

    .zx_dev_kpi b{
      display:block;
      color:#071330;
      font-size:24px;
      font-weight:950;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .zx_dev_kpi span{
      display:block;
      margin-top:4px;
      color:#64748b;
      font-size:13px;
      font-weight:900;
    }

    .zx_dev_table{
      width:100%;
      border-collapse:collapse;
      margin-top:10px;
      font-size:13px;
      color:#334155;
      font-weight:800;
    }

    .zx_dev_table td{
      border-top:1px solid #e5e7eb;
      padding:8px 4px;
      vertical-align:top;
      word-break:break-word;
    }

    .zx_dev_ok{color:#16a34a;font-weight:950}
    .zx_dev_bad{color:#dc2626;font-weight:950}

    .zx_dev_btns{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:12px;
    }

    .zx_dev_btn{
      border:0;
      border-radius:16px;
      padding:13px;
      font-size:15px;
      font-weight:950;
      color:white;
      background:#2563eb;
    }

    .zx_dev_btn.red{background:#dc2626}
    .zx_dev_btn.gray{background:#64748b}
    .zx_dev_btn.green{background:#16a34a}
    .zx_dev_btn.orange{background:#f97316}

    .zx_dev_log{
      background:#0f172a;
      color:#e5e7eb;
      border-radius:16px;
      padding:12px;
      margin-top:8px;
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
      font-size:12px;
      overflow:auto;
      max-height:320px;
      white-space:pre-wrap;
    }

    @media(min-width:760px){
      .zx_dev_grid{
        grid-template-columns:1fr 1fr;
      }

      .zx_dev_card.full{
        grid-column:1/-1;
      }

      .zx_dev_kpis{
        grid-template-columns:repeat(4,minmax(0,1fr));
      }
    }
  `;
  document.head.appendChild(st);
}

function tablaObjeto(obj){
  return `
    <table class="zx_dev_table">
      ${Object.keys(obj || {}).map(function(k){
        return `
          <tr>
            <td><b>${limpiar(k)}</b></td>
            <td>${limpiar(typeof obj[k]==="object" ? JSON.stringify(obj[k]) : obj[k])}</td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

function renderCache(){
  const lista=contarCache();

  if(!lista.length){
    return `<div class="zx_dev_text">Sin caché registrada.</div>`;
  }

  return `
    <table class="zx_dev_table">
      ${lista.map(function(c){
        return `
          <tr>
            <td>${limpiar(c.key)}</td>
            <td>${limpiar(c.items)} reg.</td>
            <td>${limpiar(c.size)} car.</td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

function renderCola(){
  const q=colaOffline();

  if(!q.length){
    return `<div class="zx_dev_text">No hay operaciones pendientes.</div>`;
  }

  return `
    <table class="zx_dev_table">
      ${q.slice(0,30).map(function(item){
        return `
          <tr>
            <td>${limpiar(item.table || item.tabla || "-")}</td>
            <td>${limpiar(item.action || item.operacion || "-")}</td>
            <td>${limpiar(item.created_at || item.creado_en || "-")}</td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

function renderModulos(){
  return `
    <table class="zx_dev_table">
      ${modulos().map(function(m){
        return `
          <tr>
            <td>${limpiar(m.modulo)}</td>
            <td>${limpiar(m.funcion)}</td>
            <td>${m.cargado ? `<span class="zx_dev_ok">Cargado</span>` : `<span class="zx_dev_bad">No cargado</span>`}</td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

function renderLogs(){
  const l=logs();

  if(!l.length){
    return `<div class="zx_dev_text">No hay logs técnicos guardados.</div>`;
  }

  return `
    <div class="zx_dev_log">${limpiar(l.slice(0,40).map(function(x){
      return "["+x.fecha+"] "+x.tipo+" - "+x.mensaje+(x.extra ? "\\n"+JSON.stringify(x.extra,null,2) : "");
    }).join("\\n\\n"))}</div>
  `;
}

window.ZX_dev_limpiar_cache=function(){
  if(!esDesarrollador()){
    alert("Solo desarrollador.");
    return;
  }

  const ok=confirm("¿Limpiar caché local de Zentryx en este dispositivo?");
  if(!ok) return;

  try{
    Object.keys(localStorage).forEach(function(k){
      if(k.indexOf("zentryx_cache_")===0 || k.indexOf("zentryx_backend_cache_")===0){
        localStorage.removeItem(k);
      }
    });
    guardarLog("mantenimiento","Caché local limpiada");
  }catch(e){
    guardarLog("error","Error limpiando caché",String(e));
  }

  window.ZX_desarrollador();
};

window.ZX_dev_limpiar_logs=function(){
  if(!esDesarrollador()){
    alert("Solo desarrollador.");
    return;
  }

  localStorage.removeItem(LOG_KEY);
  window.ZX_desarrollador();
};

window.ZX_dev_forzar_sync=function(){
  if(!esDesarrollador()){
    alert("Solo desarrollador.");
    return;
  }

  guardarLog("sync","Sincronización forzada manualmente");

  if(window.ZENTRYX_BACKEND && typeof window.ZENTRYX_BACKEND.sync==="function"){
    window.ZENTRYX_BACKEND.sync().then(function(){
      window.ZX_desarrollador();
    });
    return;
  }

  if(zx() && typeof zx().syncOfflineQueue==="function"){
    zx().syncOfflineQueue().then(function(){
      window.ZX_desarrollador();
    });
    return;
  }

  alert("Sin sistema de sincronización disponible.");
};

window.ZX_dev_exportar_logs=function(){
  if(!esDesarrollador()){
    alert("Solo desarrollador.");
    return;
  }

  const data={
    fecha:ahora(),
    sesion:sesion(),
    backend:estadoBackend(),
    red:estadoRed(),
    cola:colaOffline(),
    cache:contarCache(),
    modulos:modulos(),
    dispositivo:dispositivo(),
    logs:logs()
  };

  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="zentryx_logs_"+Date.now()+".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
};

window.ZX_desarrollador=function(){
  instalarCSS();
  instalarCapturaErrores();

  if(!esDesarrollador()){
    app().innerHTML=`
      <div class="zx_dev_grid">
        <div class="zx_dev_card full">
          <h2>Acceso técnico</h2>
          <div class="zx_dev_text">
            Este panel solo está disponible para el perfil Desarrollador.
          </div>
        </div>
      </div>
    `;
    return;
  }

  const b=estadoBackend();
  const r=estadoRed();
  const m=memoria();
  const p=rendimiento();
  const d=dispositivo();
  const q=colaOffline();
  const cache=contarCache();

  app().innerHTML=`
    <div class="zx_dev_grid">
      <div class="zx_dev_card full">
        <h2>Panel Desarrollador</h2>
        <div class="zx_dev_text">
          Diagnóstico técnico de Zentryx PRO. Versión panel: ${ZX_DEV_VERSION}
        </div>

        <div class="zx_dev_kpis">
          <div class="zx_dev_kpi">
            <b>${navigator.onLine ? "🟢" : "🔴"}</b>
            <span>${navigator.onLine ? "Online" : "Offline"}</span>
          </div>

          <div class="zx_dev_kpi">
            <b>${limpiar(q.length)}</b>
            <span>Cola pendiente</span>
          </div>

          <div class="zx_dev_kpi">
            <b>${limpiar(cache.length)}</b>
            <span>Cachés</span>
          </div>

          <div class="zx_dev_kpi">
            <b>${limpiar(m.usada)}</b>
            <span>Memoria</span>
          </div>
        </div>

        <div class="zx_dev_btns">
          <button class="zx_dev_btn green" onclick="ZX_dev_forzar_sync()">Forzar sync</button>
          <button class="zx_dev_btn red" onclick="ZX_dev_limpiar_cache()">Limpiar caché</button>
          <button class="zx_dev_btn orange" onclick="ZX_dev_exportar_logs()">Exportar logs</button>
          <button class="zx_dev_btn gray" onclick="ZX_dev_limpiar_logs()">Limpiar logs</button>
        </div>
      </div>

      <div class="zx_dev_card">
        <h3>Backend</h3>
        ${tablaObjeto(b)}
      </div>

      <div class="zx_dev_card">
        <h3>Red</h3>
        ${tablaObjeto(r)}
      </div>

      <div class="zx_dev_card">
        <h3>Rendimiento</h3>
        ${tablaObjeto(p)}
      </div>

      <div class="zx_dev_card">
        <h3>Memoria</h3>
        ${tablaObjeto(m)}
      </div>

      <div class="zx_dev_card">
        <h3>Cola offline</h3>
        ${renderCola()}
      </div>

      <div class="zx_dev_card">
        <h3>Caché local</h3>
        ${renderCache()}
      </div>

      <div class="zx_dev_card full">
        <h3>Módulos cargados</h3>
        ${renderModulos()}
      </div>

      <div class="zx_dev_card full">
        <h3>Logs técnicos</h3>
        ${renderLogs()}
      </div>

      <div class="zx_dev_card full">
        <h3>Dispositivo</h3>
        ${tablaObjeto(d)}
      </div>
    </div>
  `;
};

window.ZENTRYX=window.ZENTRYX || {};
window.ZENTRYX.desarrollador=window.ZX_desarrollador;

instalarCapturaErrores();

console.log("Zentryx Panel Desarrollador V"+ZX_DEV_VERSION+" cargado");

})();
