// ===============================
// ZENTRYX PRO - CONFIGURACIÓN
// V3113 - APARIENCIA Y SISTEMA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3113";
const THEME_KEY="zentryx_theme";
const CONFIG_KEY="zentryx_config";

function app(){return document.getElementById("app")}
function zx(){return window.ZENTRYX || window.ZX || null}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizar(v){
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function leerJSON(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    return fallback;
  }
}

function guardarJSON(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    return false;
  }
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function esAdmin(){
  const s=sesion();
  return normalizar(s.rol)==="administrador" || normalizar(s.usuario)==="admin";
}

function temaActual(){
  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.getTheme==="function"){
    return window.ZENTRYX_STORE.getTheme();
  }

  return Object.assign({
    modo:"light",
    nombre:"Modern Light",
    color:"#2563eb",
    radio:"26px",
    compacto:false,
    alto_contraste:false
  },leerJSON(THEME_KEY,{}));
}

function configActual(){
  const base={
    producto:"Zentryx PRO",
    empresa_id:"demo",
    offline:true,
    sincronizacion_automatica:true,
    modulos:{
      inicio:true,
      fichaje:true,
      agenda:true,
      clientes:true,
      trabajos:true,
      usuarios:true,
      vehiculos:true,
      horas_extra:true,
      control_fichajes:true,
      configuracion:true
    }
  };

  const cfg=leerJSON(CONFIG_KEY,{});
  cfg.modulos=Object.assign({},base.modulos,cfg.modulos || {});
  return Object.assign({},base,cfg);
}

function aplicarTema(t){
  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.saveTheme==="function"){
    window.ZENTRYX_STORE.saveTheme(t);
  }else{
    guardarJSON(THEME_KEY,t);
  }

  document.documentElement.style.setProperty("--zx-primary",t.color || "#2563eb");
  document.documentElement.style.setProperty("--zx-radius",t.radio || "26px");
  document.body.classList.toggle("zx_compacto",!!t.compacto);
  document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);

  if(zx() && typeof zx().aplicarTemaGuardado==="function"){
    zx().aplicarTemaGuardado();
  }
}

function estadoSistema(){
  if(zx() && typeof zx().estadoSistema==="function") return zx().estadoSistema();

  return {
    version:ZX_VERSION,
    conectado:navigator.onLine,
    cola_pendiente:0,
    usuario:sesion()
  };
}

function kpi(label,value,icon){
  return `
    <div class="zx_cfg_kpi">
      <span>${icon}</span>
      <b>${limpiar(value)}</b>
      <small>${limpiar(label)}</small>
    </div>
  `;
}

function moduloRow(id,nombre,activo){
  return `
    <label class="zx_cfg_module">
      <div>
        <b>${limpiar(nombre)}</b>
        <small>${limpiar(id)}</small>
      </div>
      <input type="checkbox" data-cfg-modulo="${limpiar(id)}" ${activo ? "checked" : ""} ${!esAdmin() ? "disabled" : ""}>
    </label>
  `;
}

function render(){
  const t=temaActual();
  const cfg=configActual();
  const st=estadoSistema();

  app().innerHTML=`
    <div class="zx_cfg_shell">
      <section class="zx_cfg_panel zx_cfg_header">
        <div>
          <h2>Ajustes</h2>
          <p>Apariencia, módulos, estado del sistema y preferencias de uso.</p>
        </div>
        <button class="zx_cfg_save" id="zx_cfg_guardar">Guardar</button>
      </section>

      <section class="zx_cfg_panel">
        <h3>Estado</h3>
        <div class="zx_cfg_kpis">
          ${kpi("Conexión",navigator.onLine ? "Online" : "Sin red",navigator.onLine ? "🟢" : "🟡")}
          ${kpi("Pendiente",st.cola_pendiente || 0,"🔄")}
          ${kpi("Versión",ZX_VERSION,"⚙️")}
          ${kpi("Usuario",(st.usuario && (st.usuario.usuario || st.usuario.nombre)) || "-","👤")}
        </div>
      </section>

      <section class="zx_cfg_panel">
        <h3>Apariencia</h3>

        <label class="zx_cfg_label">Tema</label>
        <select id="zx_cfg_modo">
          <option value="light" ${t.modo==="light" ? "selected" : ""}>Claro</option>
          <option value="dark" ${t.modo==="dark" ? "selected" : ""}>Oscuro</option>
          <option value="auto" ${t.modo==="auto" ? "selected" : ""}>Automático</option>
        </select>

        <label class="zx_cfg_label">Color principal</label>
        <div class="zx_cfg_colors">
          ${["#2563eb","#16a34a","#7c3aed","#f97316","#0891b2","#334155"].map(c=>`
            <button type="button" data-cfg-color="${c}" class="${String(t.color).toLowerCase()===c ? "on" : ""}" style="background:${c}"></button>
          `).join("")}
        </div>

        <label class="zx_cfg_check">
          <span>Interfaz compacta</span>
          <input id="zx_cfg_compacto" type="checkbox" ${t.compacto ? "checked" : ""}>
        </label>

        <label class="zx_cfg_check">
          <span>Alto contraste</span>
          <input id="zx_cfg_contraste" type="checkbox" ${t.alto_contraste ? "checked" : ""}>
        </label>
      </section>

      <section class="zx_cfg_panel">
        <h3>Uso en obra</h3>
        <div class="zx_cfg_cards">
          <div><span>📱</span><b>Móvil</b><small>Botones grandes y lectura rápida.</small></div>
          <div><span>🧤</span><b>Guantes</b><small>Preparado para modo táctil ampliado.</small></div>
          <div><span>🎙️</span><b>Voz</b><small>Base preparada para comandos por voz.</small></div>
        </div>
      </section>

      <section class="zx_cfg_panel">
        <h3>Módulos</h3>
        <div class="zx_cfg_modules">
          ${moduloRow("inicio","Inicio",cfg.modulos.inicio!==false)}
          ${moduloRow("fichaje","Fichaje",cfg.modulos.fichaje!==false)}
          ${moduloRow("agenda","Agenda",cfg.modulos.agenda!==false)}
          ${moduloRow("clientes","Clientes",cfg.modulos.clientes!==false)}
          ${moduloRow("trabajos","Trabajos",cfg.modulos.trabajos!==false)}
          ${moduloRow("usuarios","Usuarios",cfg.modulos.usuarios!==false)}
          ${moduloRow("vehiculos","Vehículos",cfg.modulos.vehiculos!==false)}
          ${moduloRow("horas_extra","Horas",cfg.modulos.horas_extra!==false)}
          ${moduloRow("control_fichajes","Control",cfg.modulos.control_fichajes!==false)}
        </div>
        ${!esAdmin() ? `<div class="zx_cfg_note">Solo el administrador puede activar o desactivar módulos.</div>` : ""}
      </section>
    </div>
  `;

  conectarEventos();
}

function guardar(){
  const t=temaActual();

  t.modo=document.getElementById("zx_cfg_modo").value || "light";
  t.compacto=document.getElementById("zx_cfg_compacto").checked;
  t.alto_contraste=document.getElementById("zx_cfg_contraste").checked;
  t.radio=t.compacto ? "20px" : "26px";
  t.nombre=t.modo==="dark" ? "Modern Dark" : t.modo==="auto" ? "Auto" : "Modern Light";

  aplicarTema(t);

  const cfg=configActual();
  cfg.modulos=cfg.modulos || {};

  document.querySelectorAll("[data-cfg-modulo]").forEach(function(input){
    cfg.modulos[input.dataset.cfgModulo]=!!input.checked;
  });

  if(zx() && typeof zx().guardarConfig==="function"){
    zx().guardarConfig(cfg);
  }else{
    guardarJSON(CONFIG_KEY,cfg);
  }

  if(window.ZENTRYX_STORE && typeof window.ZENTRYX_STORE.setModulo==="function" && esAdmin()){
    Object.keys(cfg.modulos).forEach(function(k){
      window.ZENTRYX_STORE.setModulo(k,cfg.modulos[k]);
    });
  }

  alert("Ajustes guardados.");
  render();
}

function conectarEventos(){
  document.getElementById("zx_cfg_guardar").onclick=guardar;

  document.querySelectorAll("[data-cfg-color]").forEach(function(btn){
    btn.onclick=function(){
      const t=temaActual();
      t.color=btn.dataset.cfgColor;
      aplicarTema(t);
      document.querySelectorAll("[data-cfg-color]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
    };
  });

  ["zx_cfg_modo","zx_cfg_compacto","zx_cfg_contraste"].forEach(function(id){
    const el=document.getElementById(id);
    if(el) el.onchange=function(){
      const t=temaActual();
      t.modo=document.getElementById("zx_cfg_modo").value || "light";
      t.compacto=document.getElementById("zx_cfg_compacto").checked;
      t.alto_contraste=document.getElementById("zx_cfg_contraste").checked;
      t.radio=t.compacto ? "20px" : "26px";
      aplicarTema(t);
    };
  });
}

function instalarCSS(){
  const old=document.getElementById("zx_configuracion_css_v3113");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_configuracion_css_v3113";
  s.innerHTML=`
    .zx_cfg_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_cfg_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_cfg_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_cfg_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_cfg_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_cfg_save{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_cfg_panel h3{margin:0 0 14px;color:#071330;font-size:24px;font-weight:950;letter-spacing:-.35px}
    .zx_cfg_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .zx_cfg_kpi{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_cfg_kpi span{display:block;font-size:25px;margin-bottom:8px}
    .zx_cfg_kpi b{display:block;color:#071330;font-size:21px;font-weight:950;line-height:1}
    .zx_cfg_kpi small{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:7px}
    .zx_cfg_label{display:block;margin:13px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_cfg_panel select{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:850;color:#071330;background:#f8fafc}
    .zx_cfg_colors{display:flex;gap:10px;flex-wrap:wrap}
    .zx_cfg_colors button{width:46px;height:46px;border:4px solid white;border-radius:16px;box-shadow:0 8px 18px rgba(15,23,42,.12)}
    .zx_cfg_colors button.on{outline:4px solid #dbeafe}
    .zx_cfg_check{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:14px;margin-top:12px;color:#071330;font-size:16px;font-weight:950}
    .zx_cfg_check input{width:26px;height:26px}
    .zx_cfg_cards{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_cfg_cards div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px}
    .zx_cfg_cards span{display:block;font-size:26px;margin-bottom:8px}
    .zx_cfg_cards b{display:block;color:#071330;font-size:17px;font-weight:950}
    .zx_cfg_cards small{display:block;color:#64748b;font-size:13px;font-weight:850;margin-top:4px;line-height:1.35}
    .zx_cfg_modules{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_cfg_module{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:14px}
    .zx_cfg_module b{display:block;color:#071330;font-size:16px;font-weight:950}
    .zx_cfg_module small{display:block;color:#64748b;font-size:12px;font-weight:850;margin-top:3px}
    .zx_cfg_module input{width:26px;height:26px}
    .zx_cfg_note{margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:18px;padding:14px;font-size:15px;font-weight:900}
    @media(max-width:390px){.zx_cfg_panel{padding:15px;border-radius:22px}.zx_cfg_header h2{font-size:27px}.zx_cfg_kpis{grid-template-columns:1fr 1fr}}
    @media(min-width:700px){.zx_cfg_shell{padding-bottom:32px;grid-template-columns:1fr 1fr}.zx_cfg_header{grid-column:1/-1}.zx_cfg_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_cfg_cards{grid-template-columns:repeat(3,minmax(0,1fr))}.zx_cfg_modules{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_cfg_panel{padding:22px}.zx_cfg_modules{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

window.ZX_configuracion=function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("configuracion");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="configuracion") b.classList.add("zx_activo");
    });
  }

  render();
};

window.ZX_configuracion_general=window.ZX_configuracion;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("configuracion",{
    nombre:"Ajustes",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX configuracion.js V"+ZX_VERSION+" cargado");

})();
