// ===============================
// ZENTRYX PRO - AJUSTES
// V3120 - AÑADE PROYECTOS A MÓDULOS DE EMPRESA
// V3119 - AJUSTES OPERATIVOS Y ESTADOS NO EDITABLES
// ===============================
(function(){
"use strict";

const ZX_VERSION="3120";
const SETTINGS_KEY="zentryx_settings";
const THEME_KEY="zentryx_theme";
const CONFIG_KEY="zentryx_config";

const ZX_CONFIG_LABORAL_ANTERIOR=window.ZX_configLaboral || window.ZX_config_laboral || null;

function app(){return document.getElementById("app")}
function zx(){return window.ZENTRYX || window.ZX || null}
function store(){return window.ZENTRYX_STORE || window.ZX_STORE || null}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function leer(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    return fallback;
  }
}

function guardar(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    alert("No se pudo guardar.");
    return false;
  }
}

function configBase(){
  return {
    empresa:{
      nombre:"Zentryx PRO",
      sector:"",
      logo:"",
      color:"#2563eb"
    },
    modulos:{
      inicio:true,
      fichaje:true,
      agenda:true,
      clientes:true,
      trabajos:true,
      proyectos:true,
      almacen:true,
      usuarios:true,
      vehiculos:true,
      manual:true,
      horas_extra:true,
      configuracion:true
    },
    app:{
      idioma:"es",
      formato_fecha:"DD/MM/AAAA",
      offline:true,
      sincronizacion_automatica:true,
      barra_inferior:true,
      boton_notas:true
    }
  };
}

function themeBase(){
  return {
    modo:"light",
    nombre:"Modern Light",
    color:"#2563eb",
    radio:"26px",
    compacto:false,
    alto_contraste:false
  };
}

function settingsBase(){
  return {
    notificaciones:{
      avisos:true,
      horas_extra:true,
      agenda:true,
      vehiculos:true
    },
    seguridad:{
      pin_admin:true,
      confirmar_borrados:true
    },
    funciones:{
      clima:false,
      trafico:false,
      voz:false
    }
  };
}

function unir(base,data){
  const out=JSON.parse(JSON.stringify(base));
  data=data || {};

  Object.keys(data).forEach(function(k){
    if(data[k] && typeof data[k]==="object" && !Array.isArray(data[k]) && out[k] && typeof out[k]==="object" && !Array.isArray(out[k])){
      out[k]=unir(out[k],data[k]);
    }else{
      out[k]=data[k];
    }
  });

  return out;
}

function getConfig(){
  let cfg=unir(configBase(),leer(CONFIG_KEY,{}));

  if(store() && typeof store().getEmpresa==="function"){
    const emp=store().getEmpresa() || {};
    cfg.empresa.nombre=emp.nombre || cfg.empresa.nombre;
    cfg.empresa.logo=emp.logo || cfg.empresa.logo;
    cfg.empresa.color=emp.color || cfg.empresa.color;
  }

  // Inicio y Ajustes no pueden quedar desactivados.
  cfg.modulos.inicio=true;
  cfg.modulos.configuracion=true;
  delete cfg.modulos.control_fichajes;
  delete cfg.modulos.solicitudes;

  return cfg;
}

function getTheme(){
  if(store() && typeof store().getTheme==="function") return store().getTheme();
  return unir(themeBase(),leer(THEME_KEY,{}));
}

function getSettings(){
  return unir(settingsBase(),leer(SETTINGS_KEY,{}));
}

function setTema(t){
  guardar(THEME_KEY,t);

  if(store() && typeof store().saveTheme==="function"){
    store().saveTheme(t);
    return;
  }

  document.documentElement.style.setProperty("--zx-primary",t.color || "#2563eb");
  document.documentElement.style.setProperty("--zx-radius",t.radio || "26px");
  document.body.classList.toggle("zx_compacto",!!t.compacto);
  document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);
  document.documentElement.dataset.zxTheme=String(t.modo||"light")==="dark" ? "dark" : "light";
}

async function guardarTodo(cfg,t,st){
  cfg.modulos=Object.assign({},cfg.modulos || {},{
    inicio:true,
    configuracion:true
  });
  delete cfg.modulos.control_fichajes;
  delete cfg.modulos.solicitudes;

  guardar(CONFIG_KEY,cfg);
  guardar(SETTINGS_KEY,st);
  setTema(t);

  if(store() && typeof store().saveEmpresa==="function"){
    store().saveEmpresa({
      nombre:cfg.empresa.nombre,
      logo:cfg.empresa.logo,
      color:t.color
    });
  }

  if(store() && typeof store().setModulo==="function"){
    Object.keys(cfg.modulos || {}).forEach(function(k){
      store().setModulo(k,!!cfg.modulos[k]);
    });
  }

  let remoto={error:null};
  if(zx() && typeof zx().guardarModulosEmpresa==="function"){
    remoto=await zx().guardarModulosEmpresa(cfg.modulos);
  }else if(zx() && typeof zx().guardarConfig==="function"){
    zx().guardarConfig(cfg);
  }

  if(remoto && remoto.error){
    alert("Los ajustes se han guardado en este dispositivo, pero no se pudieron guardar todavía para la empresa: "+(remoto.error.message || remoto.error));
    return false;
  }

  alert(remoto && (remoto.offline || remoto.degradada)
    ? "Ajustes guardados. La copia de empresa queda pendiente de sincronizar."
    : "Ajustes guardados.");
  return true;
}

function campoTexto(id,label,value,placeholder){
  return `
    <label class="zx_set_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" value="${limpiar(value || "")}" placeholder="${limpiar(placeholder || label)}">
  `;
}

function campoColor(id,label,value){
  return `
    <label class="zx_set_label" for="${id}">${limpiar(label)}</label>
    <div class="zx_set_colorrow">
      <input id="${id}" type="color" value="${limpiar(value || "#2563eb")}">
      <input id="${id}_txt" value="${limpiar(value || "#2563eb")}" placeholder="#2563eb">
    </div>
  `;
}

function toggle(id,label,checked,desc){
  return `
    <label class="zx_set_toggle" for="${id}">
      <div>
        <b>${limpiar(label)}</b>
        ${desc ? `<span>${limpiar(desc)}</span>` : ""}
      </div>
      <input id="${id}" type="checkbox" ${checked ? "checked" : ""}>
    </label>
  `;
}

function select(id,label,value,items){
  return `
    <label class="zx_set_label" for="${id}">${limpiar(label)}</label>
    <select id="${id}">
      ${items.map(function(it){
        return `<option value="${limpiar(it[0])}" ${String(value)===String(it[0]) ? "selected" : ""}>${limpiar(it[1])}</option>`;
      }).join("")}
    </select>
  `;
}

function estadoInfo(titulo,estado,detalle){
  return `
    <div class="zx_set_info">
      <div><b>${limpiar(titulo)}</b>${detalle ? `<span>${limpiar(detalle)}</span>` : ""}</div>
      <strong>${limpiar(estado)}</strong>
    </div>
  `;
}

function seccionEmpresa(cfg){
  return `
    <section class="zx_set_card" id="zx_set_empresa">
      <div class="zx_set_card_head">
        <div class="zx_set_icon blue">🏢</div>
        <div><h3>Empresa</h3><p>Nombre, sector, logo y datos generales.</p></div>
      </div>
      <div class="zx_set_grid2">
        <div>${campoTexto("set_empresa_nombre","Nombre empresa",cfg.empresa.nombre)}</div>
        <div>${campoTexto("set_empresa_sector","Sector",cfg.empresa.sector,"Climatización, talleres, SAT...")}</div>
      </div>
      ${campoTexto("set_empresa_logo","URL logo",cfg.empresa.logo,"https://...")}
    </section>
  `;
}

function seccionApariencia(t){
  return `
    <section class="zx_set_card" id="zx_set_apariencia">
      <div class="zx_set_card_head">
        <div class="zx_set_icon purple">🎨</div>
        <div><h3>Apariencia</h3><p>Aspecto visual por usuario o empresa.</p></div>
      </div>
      <div class="zx_set_grid2">
        <div>
          ${select("set_theme_modo","Modo",t.modo,[["light","Claro"],["dark","Oscuro"],["auto","Automático"]])}
        </div>
        <div>
          ${select("set_theme_radio","Esquinas",t.radio,[["18px","Compactas"],["22px","Medias"],["26px","Redondeadas"],["32px","Muy redondeadas"]])}
        </div>
      </div>
      ${campoColor("set_theme_color","Color principal",t.color)}
      ${toggle("set_theme_compacto","Modo compacto",!!t.compacto,"Muestra más información por pantalla.")}
      ${toggle("set_theme_contraste","Alto contraste",!!t.alto_contraste,"Mejora lectura en exterior.")}
    </section>
  `;
}

function seccionModulos(cfg){
  const nombres={
    fichaje:"Fichaje",
    agenda:"Agenda",
    clientes:"Clientes",
    trabajos:"Trabajos",
    proyectos:"Proyectos",
    almacen:"Almacén",
    usuarios:"Usuarios",
    vehiculos:"Vehículos",
    horas_extra:"Horas",
    manual:"Manual"
  };

  return `
    <section class="zx_set_card" id="zx_set_modulos">
      <div class="zx_set_card_head">
        <div class="zx_set_icon green">🧩</div>
        <div><h3>Módulos de empresa</h3><p>Decide qué zonas utiliza la empresa. Inicio y Ajustes permanecen disponibles.</p></div>
      </div>
      <div class="zx_set_modgrid">
        ${Object.keys(nombres).map(function(k){
          return toggle("set_mod_"+k,nombres[k],cfg.modulos[k]!==false,"");
        }).join("")}
      </div>
    </section>
  `;
}

function seccionLaboral(){
  return `
    <section class="zx_set_card" id="zx_set_laboral">
      <div class="zx_set_card_head">
        <div class="zx_set_icon orange">🕒</div>
        <div><h3>Laboral</h3><p>Jornada, festivos, vacaciones y horas extra.</p></div>
      </div>
      <div class="zx_set_actions">
        <button class="blue" id="set_abrir_laboral">Abrir configuración laboral</button>
        <button class="purple" id="set_abrir_horas">Horas extra</button>
      </div>
    </section>
  `;
}

function seccionApp(){
  return `
    <section class="zx_set_card" id="zx_set_app">
      <div class="zx_set_card_head">
        <div class="zx_set_icon cyan">📱</div>
        <div><h3>Aplicación</h3><p>Estado de funciones que no tienen un ajuste general operativo.</p></div>
      </div>
      ${estadoInfo("Idioma","Español","No existe todavía un selector general de idioma operativo.")}
      ${estadoInfo("Formato de fecha","DD/MM/AAAA","La interfaz actual usa el formato español; no hay un selector general operativo.")}
      ${estadoInfo("Trabajo sin conexión","Activo","La cola local y la caché se utilizan automáticamente cuando falta conexión.")}
      ${estadoInfo("Sincronización","Automática","Los cambios pendientes se reintentan al recuperar conexión y de forma periódica.")}
      ${estadoInfo("Barra inferior","Gestionada por la interfaz","No existe un interruptor general conectado a su comportamiento.")}
      ${estadoInfo("Avisos configurables","No disponible","Agenda y Vehículos no tienen todavía preferencias de aviso configurables aquí.")}
    </section>
  `;
}

function seccionFuturo(){
  return `
    <section class="zx_set_card" id="zx_set_servicios">
      <div class="zx_set_card_head">
        <div class="zx_set_icon amber">✨</div>
        <div><h3>Servicios</h3><p>Funciones que todavía no están disponibles como ajustes operativos.</p></div>
      </div>
      ${estadoInfo("Clima por obra","No disponible","No se muestra como interruptor hasta que exista una función real conectada.")}
      ${estadoInfo("Tráfico y rutas","No disponible","No se muestra como interruptor hasta que exista una función real conectada.")}
      ${estadoInfo("Modo voz","No disponible","No se muestra como interruptor hasta que exista una función real conectada.")}
    </section>
  `;
}

function seccionSeguridad(){
  return `
    <section class="zx_set_card" id="zx_set_seguridad">
      <div class="zx_set_card_head">
        <div class="zx_set_icon red">🔒</div>
        <div><h3>Seguridad</h3><p>Protecciones aplicadas por las operaciones sensibles.</p></div>
      </div>
      ${estadoInfo("PIN administrador","Obligatorio donde corresponde","No se ofrece un interruptor porque las acciones protegidas exigen validación.")}
      ${estadoInfo("Confirmación de borrados","Obligatoria donde corresponde","No se ofrece un interruptor si el flujo de borrado no admite desactivarla.")}
    </section>
  `;
}
function leerPantalla(){
  const cfg=getConfig();
  const t=getTheme();
  const st=getSettings();

  cfg.empresa.nombre=document.getElementById("set_empresa_nombre").value.trim() || "Zentryx PRO";
  cfg.empresa.sector=document.getElementById("set_empresa_sector").value.trim();
  cfg.empresa.logo=document.getElementById("set_empresa_logo").value.trim();

  t.modo=document.getElementById("set_theme_modo").value;
  t.radio=document.getElementById("set_theme_radio").value;
  t.color=document.getElementById("set_theme_color_txt").value.trim() || document.getElementById("set_theme_color").value || "#2563eb";
  t.compacto=document.getElementById("set_theme_compacto").checked;
  t.alto_contraste=document.getElementById("set_theme_contraste").checked;

  Object.keys(cfg.modulos).forEach(function(k){
    const el=document.getElementById("set_mod_"+k);
    if(el) cfg.modulos[k]=el.checked;
  });

  return {cfg:cfg,t:t,st:st};
}

function pintar(){
  const cfg=getConfig();
  const t=getTheme();
  const st=getSettings();

  app().innerHTML=`
    <div class="zx_set_shell">
      <section class="zx_set_hero">
        <div>
          <h2>Ajustes</h2>
          <p>Empresa, módulos, apariencia, seguridad y estado de servicios.</p>
        </div>
        <div class="zx_set_hero_actions">
          <button class="zx_set_back" id="set_volver_top">← Volver</button>
          <button id="set_guardar_top">Guardar</button>
        </div>
      </section>

      <section class="zx_set_nav">
        <button data-go="zx_set_empresa">🏢 Empresa</button>
        <button data-go="zx_set_apariencia">🎨 Apariencia</button>
        <button data-go="zx_set_modulos">🧩 Módulos</button>
        <button data-go="zx_set_laboral">🕒 Laboral</button>
        <button data-go="zx_set_app">📱 App</button>
        <button data-go="zx_set_servicios">✨ Servicios</button>
        <button data-go="zx_set_seguridad">🔒 Seguridad</button>
      </section>

      ${seccionEmpresa(cfg)}
      ${seccionApariencia(t)}
      ${seccionModulos(cfg)}
      ${seccionLaboral()}
      ${seccionApp()}
      ${seccionFuturo()}
      ${seccionSeguridad()}

      <section class="zx_set_card">
        <button class="zx_set_save" id="set_guardar_bottom">Guardar ajustes</button>
      </section>
    </div>
  `;

  conectar();
}

function conectar(){
  document.querySelectorAll("[data-go]").forEach(function(b){
    b.onclick=function(){
      const el=document.getElementById(b.dataset.go);
      if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
    };
  });

  const color=document.getElementById("set_theme_color");
  const colorTxt=document.getElementById("set_theme_color_txt");

  if(color && colorTxt){
    color.oninput=function(){colorTxt.value=color.value;setTema(Object.assign(getTheme(),{color:color.value}))};
    colorTxt.onchange=function(){color.value=colorTxt.value || "#2563eb";setTema(Object.assign(getTheme(),{color:color.value}))};
  }

  ["set_theme_modo","set_theme_compacto","set_theme_contraste","set_theme_radio"].forEach(function(id){
    const el=document.getElementById(id);
    if(el){
      el.onchange=function(){
        const vals=leerPantalla();
        setTema(vals.t);
      };
    }
  });

  async function guardarClick(){
    const vals=leerPantalla();
    const ok=await guardarTodo(vals.cfg,vals.t,vals.st);
    if(ok!==false) pintar();
  }

  document.getElementById("set_guardar_top").onclick=guardarClick;
  document.getElementById("set_guardar_bottom").onclick=guardarClick;
  const volver=document.getElementById("set_volver_top");
  if(volver) volver.onclick=function(){if(typeof window.ZX_inicio==="function") window.ZX_inicio()};

  const laboral=document.getElementById("set_abrir_laboral");
  if(laboral){
    laboral.onclick=function(){
      if(typeof ZX_CONFIG_LABORAL_ANTERIOR==="function"){
        ZX_CONFIG_LABORAL_ANTERIOR();
      }else{
        alert("Configuración laboral no está cargada.");
      }
    };
  }

  const horas=document.getElementById("set_abrir_horas");
  if(horas){
    horas.onclick=function(){
      if(window.ZX_abrirHorasExtra) window.ZX_abrirHorasExtra();
      else alert("Horas extra no está cargado.");
    };
  }
}

function instalarCSS(){
  const old=document.getElementById("zx_configuracion_css_v3119");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_configuracion_css_v3119";
  s.innerHTML=`
    .zx_set_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_set_hero,.zx_set_card,.zx_set_nav{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_set_hero{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;background:linear-gradient(135deg,#ffffff,#f8fbff)}
    .zx_set_hero h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_set_hero p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_set_hero_actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .zx_set_hero button,.zx_set_save{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_set_hero button.zx_set_back{background:#e2e8f0;color:#0f172a}
    .zx_set_save{width:100%;min-height:58px}
    .zx_set_nav{display:flex;gap:8px;overflow-x:auto;padding:12px}
    .zx_set_nav button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_set_card_head{display:grid;grid-template-columns:52px minmax(0,1fr);gap:12px;align-items:center;margin-bottom:14px}
    .zx_set_icon{width:52px;height:52px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:25px;box-shadow:0 8px 18px rgba(15,23,42,.06)}
    .zx_set_icon.blue{background:#dbeafe}.zx_set_icon.purple{background:#f3e8ff}.zx_set_icon.green{background:#dcfce7}.zx_set_icon.orange{background:#ffedd5}.zx_set_icon.cyan{background:#cffafe}.zx_set_icon.amber{background:#fef3c7}.zx_set_icon.red{background:#fee2e2}
    .zx_set_card h3{margin:0;color:#071330;font-size:23px;line-height:1.12;font-weight:950;letter-spacing:-.25px}
    .zx_set_card p{margin:5px 0 0;color:#64748b;font-size:14px;line-height:1.35;font-weight:850}
    .zx_set_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_set_card input,.zx_set_card select{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_set_grid2{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_set_colorrow{display:grid;grid-template-columns:74px 1fr;gap:10px;align-items:center}
    .zx_set_colorrow input[type=color]{height:50px;padding:5px}
    .zx_set_toggle{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:14px;margin-top:10px}
    .zx_set_toggle b{display:block;color:#071330;font-size:15px;line-height:1.2;font-weight:950}
    .zx_set_toggle span{display:block;color:#64748b;font-size:13px;line-height:1.3;font-weight:800;margin-top:4px}
    .zx_set_toggle input{width:28px;height:28px;margin:0;accent-color:var(--zx-primary)}
    .zx_set_info{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#f8fafc;border:1px solid #dbe3ef;border-radius:18px;padding:14px;margin-top:10px}
    .zx_set_info b{display:block;color:#071330;font-size:15px;line-height:1.2;font-weight:950}
    .zx_set_info span{display:block;color:#64748b;font-size:13px;line-height:1.3;font-weight:800;margin-top:4px}
    .zx_set_info strong{color:#334155;font-size:13px;font-weight:950;text-align:right;max-width:150px}
    .zx_set_modgrid{display:grid;grid-template-columns:1fr;gap:0}
    .zx_set_actions{display:grid;grid-template-columns:1fr;gap:10px}
    .zx_set_actions button{border:0;border-radius:18px;padding:15px;color:white;font-size:16px;font-weight:950}
    .zx_set_actions .blue{background:var(--zx-primary);color:var(--zx-primary-contrast)}.zx_set_actions .purple{background:#7c3aed}
    body.zx_compacto .zx_set_hero,body.zx_compacto .zx_set_card{padding:14px;border-radius:20px}
    body.zx_alto_contraste .zx_set_card,body.zx_alto_contraste .zx_set_hero{border-color:#0f172a}
    @media(max-width:390px){.zx_set_hero{grid-template-columns:1fr}.zx_set_hero_actions{justify-content:stretch}.zx_set_hero_actions button{flex:1}.zx_set_hero h2{font-size:27px}.zx_set_card_head{grid-template-columns:46px 1fr}.zx_set_icon{width:46px;height:46px;border-radius:16px}.zx_set_info{grid-template-columns:1fr}.zx_set_info strong{text-align:left;max-width:none}}
    @media(min-width:700px){.zx_set_shell{padding-bottom:32px;grid-template-columns:1fr 1fr}.zx_set_hero,.zx_set_nav{grid-column:1/-1}.zx_set_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_set_modgrid{grid-template-columns:1fr 1fr;gap:10px}.zx_set_actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_set_shell{grid-template-columns:repeat(3,minmax(0,1fr))}.zx_set_hero,.zx_set_nav{grid-column:1/-1}.zx_set_card{padding:22px}.zx_set_hero{padding:22px}.zx_set_modgrid{grid-template-columns:1fr}}
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

  pintar();
};

window.ZENTRYX_UI_configuracion=window.ZX_configuracion;

window.ZX_configLaboral=function(){
  window.ZX_configuracion();
};

window.ZX_config_laboral=function(){
  window.ZX_configuracion();
};

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("configuracion",{
    nombre:"Ajustes",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX configuracion.js V"+ZX_VERSION+" cargado");

})();
