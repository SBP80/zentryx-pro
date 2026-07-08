// ===============================
// ZENTRYX PRO - PANEL DESARROLLADOR
// V3121 - DIAGNÓSTICO TÉCNICO
// ===============================
(function(){
"use strict";

const ZX_DEV_VERSION="3121";

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

function leerJSON(k,fallback){
  try{
    const raw=localStorage.getItem(k);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}

function contarCache(){
  const out=[];

  try{
    Object.keys(localStorage).forEach(function(k){
      if(k.indexOf("zentryx_cache_")===0 || k.indexOf("zentryx_backend_cache_")===0){
        const val=leerJSON(k,[]);
        out.push({
          key:k,
          items:Array.isArray(val) ? val.length : 1
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
    return Array.isArray(q) ? q.filter(x=>x && x.estado==="pendiente") : [];
  }catch(e){
    return [];
  }
}

function memoria(){
  try{
    if(performance && performance.memory){
      return {
        used:Math.round(performance.memory.usedJSHeapSize/1024/1024)+" MB",
        total:Math.round(performance.memory.totalJSHeapSize/1024/1024)+" MB",
        limit:Math.round(performance.memory.jsHeapSizeLimit/1024/1024)+" MB"
      };
    }
  }catch(e){}

  return {
    used:"No disponible",
    total:"No disponible",
    limit:"No disponible"
  };
}

function dispositivo(){
  return {
    userAgent:navigator.userAgent,
    idioma:navigator.language,
    online:navigator.onLine,
    url:location.href,
    ancho:window.innerWidth,
    alto:window.innerHeight
  };
}

function instalarCSS(){
  if(document.getElementById("zx_dev_css")) return;

  const st=document.createElement("style");
  st.id="zx_dev_css";
  st.innerHTML=`
    .zx_dev_grid{
      display:grid;
      grid-template-columns:1fr;
      gap:14px;
    }

    .zx_dev_card{
      background:white;
      border:1px solid #dbe3ef;
      border-radius:24px;
      padding:18px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
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
    }

    .zx_dev_kpi b{
      display:block;
      color:#071330;
      font-size:24px;
      font-weight:950;
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

    @media(min-width:760px){
      .zx_dev_grid{
        grid-template-columns:1fr 1fr;
      }

      .zx_dev_card.full{
        grid-column:1/-1;
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
            <td>${limpiar(c.items)} registro(s)</td>
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
      ${q.slice(0,20).map(function(item){
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
  }catch(e){}

  window.ZX_desarrollador();
};

window.ZX_dev_forzar_sync=function(){
  if(!esDesarrollador()){
    alert("Solo desarrollador.");
    return;
  }

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

window.ZX_desarrollador=function(){
  instalarCSS();

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
  const d=dispositivo();
  const q=colaOffline();

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
            <b>${limpiar(contarCache().length)}</b>
            <span>Cachés</span>
          </div>

          <div class="zx_dev_kpi">
            <b>${limpiar(m.used)}</b>
            <span>Memoria</span>
          </div>
        </div>
      </div>

      <div class="zx_dev_card">
        <h3>Backend</h3>
        ${tablaObjeto(b)}
        <div class="zx_dev_btns">
          <button class="zx_dev_btn green" onclick="ZX_dev_forzar_sync()">Forzar sync</button>
          <button class="zx_dev_btn red" onclick="ZX_dev_limpiar_cache()">Limpiar caché</button>
        </div>
      </div>

      <div class="zx_dev_card">
        <h3>Red</h3>
        ${tablaObjeto(r)}
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
        <h3>Dispositivo</h3>
        ${tablaObjeto(d)}
      </div>
    </div>
  `;
};

window.ZENTRYX=window.ZENTRYX || {};
window.ZENTRYX.desarrollador=window.ZX_desarrollador;

console.log("Zentryx Panel Desarrollador V"+ZX_DEV_VERSION+" cargado");

})();
