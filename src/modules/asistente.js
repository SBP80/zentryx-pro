// ===============================
// ZENTRYX PRO - ASISTENTE CONTEXTUAL
// V1001 - RECOMENDACIONES POR ROL Y USO
// ===============================
(function(){
"use strict";

const ZX_VERSION="1001";
const BASE_KEY="zentryx_asistente_v1001";
const SESSION_SHOWN_KEY="zentryx_asistente_mostrado_sesion";
const SNOOZE_HOURS=6;

function normalizar(v){
  return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}
function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")||{}}catch(e){return {}}
}
function usuario(){
  const s=sesion();
  return {
    id:String(s.id||s.usuario||s.nombre||"anonimo"),
    nombre:String(s.nombre||s.usuario||"Usuario"),
    usuario:String(s.usuario||""),
    rol:String(s.rol||"usuario")
  };
}
function clave(){
  const u=usuario();
  return BASE_KEY+"_"+u.id;
}
function leer(){
  try{
    const d=JSON.parse(localStorage.getItem(clave())||"{}")||{};
    return Object.assign({
      sesiones:0,
      modulos:{},
      completadas:{},
      descartadas:{},
      pospuestas:{},
      ultima_sesion:""
    },d);
  }catch(e){
    return {sesiones:0,modulos:{},completadas:{},descartadas:{},pospuestas:{},ultima_sesion:""};
  }
}
function guardar(d){
  try{localStorage.setItem(clave(),JSON.stringify(d))}catch(e){}
}
function hoySesion(){
  return String(Date.now())+"_"+Math.random().toString(36).slice(2,8);
}
function esAdmin(){
  const u=usuario();
  const r=normalizar(u.rol);
  return r==="administrador" || normalizar(u.usuario)==="admin";
}
function esDev(){
  const r=normalizar(usuario().rol);
  return ["desarrollador","developer","dev"].includes(r);
}
function esEncargado(){
  const r=normalizar(usuario().rol);
  return r.includes("encargado") || r.includes("responsable");
}
function visitado(id){
  return Number(leer().modulos?.[id]||0);
}
function routerAbrir(modulo,callback){
  try{
    if(window.ZX_ROUTER && typeof window.ZX_ROUTER.open==="function"){
      window.ZX_ROUTER.open(modulo,{source:"asistente"});
    }else{
      const btn=document.querySelector('.zx_nav_btn[data-modulo="'+modulo+'"]');
      if(btn) btn.click();
    }
  }catch(e){}
  if(typeof callback==="function"){
    let intentos=0;
    const timer=setInterval(function(){
      intentos++;
      try{
        if(callback()){clearInterval(timer);return}
      }catch(e){}
      if(intentos>20) clearInterval(timer);
    },120);
  }
}
function clickId(id){
  const el=document.getElementById(id);
  if(!el) return false;
  el.click();
  return true;
}
function abrirManual(busqueda){
  routerAbrir("manual",function(){
    const input=document.getElementById("zx_manual_buscar");
    if(!input) return false;
    input.value=busqueda||"";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.focus();
    return true;
  });
}
function recomendaciones(){
  const u=usuario();
  const d=leer();
  const r=normalizar(u.rol);
  const lista=[];

  function add(x){
    if(d.completadas[x.id] || d.descartadas[x.id]) return;
    const pospuesta=Number(d.pospuestas[x.id]||0);
    if(pospuesta>Date.now()) return;
    lista.push(x);
  }

  if(esAdmin() || esDev()){
    if(d.sesiones<=8 && visitado("usuarios")<2){
      add({
        id:"admin_crear_usuario",
        icono:"👤",
        titulo:"¿Quieres crear un nuevo usuario?",
        texto:"Puedo llevarte directamente al alta de usuarios.",
        accion:"Crear usuario",
        run:function(){routerAbrir("usuarios",function(){return clickId("btn_crear_usuario")})}
      });
    }
    if(d.sesiones<=10 && visitado("vehiculos")<2){
      add({
        id:"admin_crear_vehiculo",
        icono:"🚗",
        titulo:"¿Quieres añadir un vehículo?",
        texto:"Abro Vehículos y el formulario de alta.",
        accion:"Añadir vehículo",
        run:function(){routerAbrir("vehiculos",function(){return clickId("btn_nuevo_vehiculo")})}
      });
    }
    if(d.sesiones<=12 && visitado("clientes")<2){
      add({
        id:"admin_crear_cliente",
        icono:"👥",
        titulo:"¿Quieres crear un cliente?",
        texto:"Te llevo directamente al formulario de Clientes.",
        accion:"Crear cliente",
        run:function(){routerAbrir("clientes",function(){return clickId("btn_nuevo_cliente")})}
      });
    }
    if(d.sesiones<=15 && visitado("trabajos")<3){
      add({
        id:"admin_crear_trabajo",
        icono:"🛠️",
        titulo:"¿Quieres crear un trabajo?",
        texto:"Abro Trabajos y el formulario de creación.",
        accion:"Crear trabajo",
        run:function(){routerAbrir("trabajos",function(){return clickId("btn_nuevo_trabajo")})}
      });
    }
    if(d.sesiones<=14 && visitado("configuracion")<2){
      add({
        id:"admin_configurar",
        icono:"⚙️",
        titulo:"¿Quieres revisar la configuración?",
        texto:"Puedes configurar empresa, módulos y ajustes antes de introducir datos reales.",
        accion:"Abrir ajustes",
        run:function(){routerAbrir("configuracion")}
      });
    }
  }

  if(esEncargado() && d.sesiones<=12 && visitado("agenda")<3){
    add({
      id:"encargado_agenda",
      icono:"📅",
      titulo:"¿Quieres revisar la Agenda?",
      texto:"Te llevo a la planificación para consultar trabajos y eventos.",
      accion:"Abrir Agenda",
      run:function(){routerAbrir("agenda")}
    });
  }

  if(!esAdmin() && !esDev() && d.sesiones<=8 && visitado("fichaje")<2){
    add({
      id:"usuario_fichaje",
      icono:"⏱️",
      titulo:"¿Quieres ver cómo funciona Fichaje?",
      texto:"Puedo abrir Fichaje o enseñarte su apartado del manual.",
      accion:"Abrir Fichaje",
      run:function(){routerAbrir("fichaje")}
    });
  }

  if(d.sesiones<=6 && visitado("manual")<1){
    add({
      id:"manual_inicio",
      icono:"📖",
      titulo:"¿Quieres conocer Zentryx?",
      texto:"El Manual está adaptado a tu rol y tiene buscador.",
      accion:"Abrir Manual",
      run:function(){routerAbrir("manual")}
    });
  }

  if(d.sesiones>6 && d.sesiones<=20){
    const usados=Object.keys(d.modulos||{}).filter(function(k){return Number(d.modulos[k]||0)>0});
    if(usados.length<4){
      add({
        id:"manual_descubrir",
        icono:"💡",
        titulo:"¿Quieres descubrir funciones que todavía no usas?",
        texto:"El Manual puede ayudarte a encontrar funciones disponibles para tu usuario.",
        accion:"Ver Manual",
        run:function(){abrirManual("")}
      });
    }
  }

  return lista;
}
function marcar(id,tipo){
  const d=leer();
  if(tipo==="completada") d.completadas[id]=Date.now();
  if(tipo==="descartada") d.descartadas[id]=Date.now();
  if(tipo==="pospuesta") d.pospuestas[id]=Date.now()+SNOOZE_HOURS*3600000;
  guardar(d);
}
function quitarPanel(){
  const p=document.getElementById("zx_assistant_panel");
  if(p) p.remove();
}
function instalarCSS(){
  if(document.getElementById("zx_assistant_css")) return;
  const s=document.createElement("style");
  s.id="zx_assistant_css";
  s.textContent=`
    #zx_assistant_button{
      position:fixed;right:18px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:99965;
      width:54px;height:54px;border:0;border-radius:50%;background:#2563eb;color:white;
      box-shadow:0 12px 34px rgba(37,99,235,.34);font-size:24px;display:grid;place-items:center;
      cursor:pointer
    }
    #zx_assistant_button.has-tip::after{
      content:"";position:absolute;right:2px;top:2px;width:12px;height:12px;background:#f59e0b;
      border:3px solid white;border-radius:50%
    }
    #zx_assistant_panel{
      position:fixed;right:14px;bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:99966;
      width:min(360px,calc(100vw - 28px));background:white;border:1px solid #dbe4ef;border-radius:22px;
      box-shadow:0 24px 70px rgba(15,23,42,.24);padding:16px;color:#0f172a
    }
    .zx_as_head{display:flex;gap:12px;align-items:flex-start}
    .zx_as_icon{width:44px;height:44px;border-radius:14px;background:#dbeafe;display:grid;place-items:center;font-size:23px;flex:0 0 auto}
    .zx_as_copy{min-width:0;flex:1}
    .zx_as_title{font-size:1.05rem;font-weight:950;line-height:1.25}
    .zx_as_text{margin-top:5px;color:#64748b;font-weight:650;line-height:1.4}
    .zx_as_close{border:0;background:#f1f5f9;width:32px;height:32px;border-radius:10px;font-weight:900;cursor:pointer}
    .zx_as_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .zx_as_primary{grid-column:1/-1;border:0;border-radius:13px;background:#2563eb;color:#fff;padding:11px 13px;font-weight:900;cursor:pointer}
    .zx_as_secondary{border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#334155;padding:10px;font-weight:800;cursor:pointer}
    @media(max-width:560px){
      #zx_assistant_button{right:14px;bottom:calc(82px + env(safe-area-inset-bottom,0px))}
      #zx_assistant_panel{bottom:calc(143px + env(safe-area-inset-bottom,0px))}
    }
  `;
  document.head.appendChild(s);
}
function asegurarBoton(){
  instalarCSS();
  let b=document.getElementById("zx_assistant_button");
  if(b) return b;
  b=document.createElement("button");
  b.id="zx_assistant_button";
  b.type="button";
  b.setAttribute("aria-label","Asistente Zentryx");
  b.textContent="💡";
  b.onclick=function(){
    if(document.getElementById("zx_assistant_panel")) quitarPanel();
    else mostrar(false);
  };
  document.body.appendChild(b);
  return b;
}
function mostrar(automatico){
  const lista=recomendaciones();
  const b=asegurarBoton();
  b.classList.toggle("has-tip",lista.length>0);
  if(!lista.length) return;
  if(automatico && sessionStorage.getItem(SESSION_SHOWN_KEY)==="1") return;

  quitarPanel();
  const x=lista[0];
  const p=document.createElement("div");
  p.id="zx_assistant_panel";
  p.innerHTML=`
    <div class="zx_as_head">
      <div class="zx_as_icon">${x.icono||"💡"}</div>
      <div class="zx_as_copy">
        <div class="zx_as_title">${x.titulo}</div>
        <div class="zx_as_text">${x.texto}</div>
      </div>
      <button class="zx_as_close" type="button" aria-label="Cerrar">✕</button>
    </div>
    <div class="zx_as_actions">
      <button class="zx_as_primary" type="button">${x.accion||"Ir ahora"}</button>
      <button class="zx_as_secondary" type="button" data-act="later">Más tarde</button>
      <button class="zx_as_secondary" type="button" data-act="never">No mostrar</button>
    </div>
  `;
  document.body.appendChild(p);
  p.querySelector(".zx_as_close").onclick=quitarPanel;
  p.querySelector(".zx_as_primary").onclick=function(){
    marcar(x.id,"completada");
    quitarPanel();
    try{x.run()}catch(e){}
    setTimeout(actualizar,500);
  };
  p.querySelector('[data-act="later"]').onclick=function(){
    marcar(x.id,"pospuesta");quitarPanel();actualizar();
  };
  p.querySelector('[data-act="never"]').onclick=function(){
    marcar(x.id,"descartada");quitarPanel();actualizar();
  };
  if(automatico) sessionStorage.setItem(SESSION_SHOWN_KEY,"1");
}
function actualizar(){
  const b=asegurarBoton();
  b.classList.toggle("has-tip",recomendaciones().length>0);
}
function registrarVisita(modulo){
  if(!modulo) return;
  const d=leer();
  d.modulos[modulo]=Number(d.modulos[modulo]||0)+1;
  guardar(d);
  actualizar();
}
function iniciar(){
  const d=leer();
  const sid=sessionStorage.getItem("zx_asistente_session_id") || hoySesion();
  if(!sessionStorage.getItem("zx_asistente_session_id")){
    sessionStorage.setItem("zx_asistente_session_id",sid);
    d.sesiones=Number(d.sesiones||0)+1;
    d.ultima_sesion=new Date().toISOString();
    guardar(d);
  }

  asegurarBoton();

  document.addEventListener("zentryx:navigation",function(ev){
    registrarVisita(ev?.detail?.modulo||"");
  });

  setTimeout(function(){mostrar(true)},1800);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true});
else iniciar();

window.ZX_ASISTENTE={
  version:ZX_VERSION,
  mostrar:function(){mostrar(false)},
  actualizar:actualizar,
  estado:leer,
  reset:function(){try{localStorage.removeItem(clave())}catch(e){} actualizar()}
};
})();
