// ===============================
// ZENTRYX PRO - ASISTENTE CONTEXTUAL
// V1001 - RECOMENDACIONES POR ROL Y USO
// ===============================
(function(){
"use strict";

const ZX_VERSION="1003";
const BASE_KEY="zentryx_asistente_v1003";
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
function nombrePila(){
  const n=String(usuario().nombre||usuario().usuario||"").trim();
  if(!n) return "";
  return n.split(/\s+/)[0];
}
function saludo(){
  const n=nombrePila();
  return n ? "Hola, "+n+". ¿Qué necesitas?" : "¿Qué necesitas?";
}


function clavePosicion(){
  return "zentryx_asistente_pos_"+usuario().id;
}
function leerPosicion(){
  try{return JSON.parse(localStorage.getItem(clavePosicion())||"null")}catch(e){return null}
}
function guardarPosicion(pos){
  try{localStorage.setItem(clavePosicion(),JSON.stringify(pos))}catch(e){}
}
function esPantallaGrande(){
  return window.matchMedia("(min-width: 760px)").matches;
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

function abrirAccion(modulo, ids){
  const candidatos=Array.isArray(ids)?ids:[ids];
  routerAbrir(modulo,function(){
    for(const id of candidatos){
      if(id && clickId(id)) return true;
    }
    return false;
  });
}
function interpretarPeticion(texto){
  const q=normalizar(texto);
  if(!q) return null;

  const contiene=(...xs)=>xs.some(x=>q.includes(normalizar(x)));

  if(contiene("crear usuario","nuevo usuario","alta usuario","añadir usuario","anadir usuario")){
    if(!(esAdmin()||esDev())) return {tipo:"manual",busqueda:texto};
    return {tipo:"accion",modulo:"usuarios",ids:["btn_crear_usuario","btn_nuevo_usuario"],mensaje:"Voy a abrir el alta de usuario."};
  }
  if(contiene("crear vehículo","crear vehiculo","nuevo vehículo","nuevo vehiculo","añadir vehículo","anadir vehiculo")){
    if(!(esAdmin()||esDev())) return {tipo:"manual",busqueda:texto};
    return {tipo:"accion",modulo:"vehiculos",ids:["btn_nuevo_vehiculo"],mensaje:"Voy a abrir el alta de vehículo."};
  }
  if(contiene("crear cliente","nuevo cliente","alta cliente","añadir cliente","anadir cliente")){
    if(!(esAdmin()||esDev()||esEncargado())) return {tipo:"manual",busqueda:texto};
    return {tipo:"accion",modulo:"clientes",ids:["btn_nuevo_cliente"],mensaje:"Voy a abrir el alta de cliente."};
  }
  if(contiene("crear trabajo","nuevo trabajo","alta trabajo","añadir trabajo","anadir trabajo")){
    if(!(esAdmin()||esDev()||esEncargado())) return {tipo:"manual",busqueda:texto};
    return {tipo:"accion",modulo:"trabajos",ids:["btn_nuevo_trabajo"],mensaje:"Voy a abrir un nuevo trabajo."};
  }
  if(contiene("agenda","calendario","planificación","planificacion")){
    return {tipo:"modulo",modulo:"agenda",mensaje:"Voy a abrir Agenda."};
  }
  if(contiene("fichar","fichaje","jornada","entrada","salida")){
    return {tipo:"modulo",modulo:"fichaje",mensaje:"Voy a abrir Fichaje."};
  }
  if(contiene("vehículo","vehiculo","flota","itv","seguro","kilómetros","kilometros")){
    return {tipo:"modulo",modulo:"vehiculos",mensaje:"Voy a abrir Vehículos."};
  }
  if(contiene("cliente","clientes")){
    return {tipo:"modulo",modulo:"clientes",mensaje:"Voy a abrir Clientes."};
  }
  if(contiene("usuario","usuarios","trabajador","empleado")){
    if(!(esAdmin()||esDev()||esEncargado())) return {tipo:"manual",busqueda:texto};
    return {tipo:"modulo",modulo:"usuarios",mensaje:"Voy a abrir Usuarios."};
  }
  if(contiene("trabajo","trabajos","obra","servicio")){
    return {tipo:"modulo",modulo:"trabajos",mensaje:"Voy a abrir Trabajos."};
  }
  if(contiene("configuración","configuracion","ajustes","empresa","módulos","modulos")){
    if(!(esAdmin()||esDev())) return {tipo:"manual",busqueda:texto};
    return {tipo:"modulo",modulo:"configuracion",mensaje:"Voy a abrir Ajustes."};
  }
  if(contiene("manual","ayuda","cómo","como","explica","qué es","que es")){
    return {tipo:"manual",busqueda:texto};
  }
  return {tipo:"manual",busqueda:texto};
}
function ejecutarPeticion(texto){
  const r=interpretarPeticion(texto);
  if(!r) return;
  quitarPanel();
  if(r.tipo==="accion"){
    abrirAccion(r.modulo,r.ids);
    return;
  }
  if(r.tipo==="modulo"){
    routerAbrir(r.modulo);
    return;
  }
  abrirManual(r.busqueda||texto);
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
  const b=document.getElementById("zx_assistant_backdrop");
  if(b) b.remove();
}
function instalarCSS(){
  if(document.getElementById("zx_assistant_css")) return;
  const s=document.createElement("style");
  s.id="zx_assistant_css";
  s.textContent=`
    #zx_assistant_button{
      position:fixed;right:18px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:99965;
      width:56px;height:56px;border:0;border-radius:50%;background:#2563eb;color:white;
      box-shadow:0 14px 38px rgba(37,99,235,.38);font-size:25px;display:grid;place-items:center;
      cursor:pointer
    }
    #zx_assistant_button.has-tip::after{
      content:"";position:absolute;right:1px;top:1px;width:13px;height:13px;background:#f59e0b;
      border:3px solid white;border-radius:50%
    }
    #zx_assistant_backdrop{
      position:fixed;inset:0;z-index:99964;background:rgba(15,23,42,.46);
      backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)
    }
    #zx_assistant_panel{
      position:fixed;z-index:99966;background:#fff;border:1px solid #dbe4ef;
      box-shadow:0 26px 80px rgba(15,23,42,.34);color:#0f172a;overflow:auto;
      -webkit-overflow-scrolling:touch
    }
    .zx_as_drag{
      display:none;align-items:center;justify-content:center;gap:7px;
      color:#64748b;font-size:.78rem;font-weight:850;padding:3px 0 10px;
      cursor:move;user-select:none;-webkit-user-select:none
    }
    .zx_as_drag::before{content:"⋮⋮";font-size:1.05rem;letter-spacing:-2px}
    .zx_as_head{display:flex;gap:12px;align-items:flex-start}
    .zx_as_icon{width:44px;height:44px;border-radius:14px;background:#dbeafe;display:grid;place-items:center;font-size:23px;flex:0 0 auto}
    .zx_as_copy{min-width:0;flex:1}
    .zx_as_title{font-size:1.05rem;font-weight:950;line-height:1.25}
    .zx_as_text{margin-top:5px;color:#64748b;font-weight:650;line-height:1.4}
    .zx_as_head{padding-bottom:12px;border-bottom:1px solid #e2e8f0}
    .zx_as_close{border:0;background:#f1f5f9;width:32px;height:32px;border-radius:10px;font-weight:900;cursor:pointer}
    .zx_as_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .zx_as_primary{grid-column:1/-1;border:0;border-radius:13px;background:#2563eb;color:#fff;padding:11px 13px;font-weight:900;cursor:pointer}
    .zx_as_secondary{border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#334155;padding:10px;font-weight:800;cursor:pointer}
    .zx_as_ask_box{margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0}
    .zx_as_ask_title{font-weight:950;font-size:1rem;margin-bottom:8px}
    .zx_as_ask_input{width:100%;min-height:82px;resize:vertical;border:1px solid #cbd5e1;border-radius:14px;padding:12px 13px;font:inherit;font-weight:700;color:#0f172a;background:#fff;box-sizing:border-box}
    .zx_as_ask_input:focus{outline:3px solid rgba(37,99,235,.16);border-color:#2563eb}
    .zx_as_ask_actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px}
    .zx_as_ask_go{border:0;border-radius:12px;background:#0f172a;color:#fff;padding:10px 13px;font-weight:900;cursor:pointer}
    .zx_as_mic{border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:10px 12px;font-weight:900;cursor:pointer}
    .zx_as_hint{margin-top:7px;color:#64748b;font-size:.82rem;font-weight:650;line-height:1.35}
    @media(max-width:759px){
      #zx_assistant_button{right:14px;bottom:calc(82px + env(safe-area-inset-bottom,0px))}
      #zx_assistant_panel{
        left:12px;right:12px;bottom:calc(18px + env(safe-area-inset-bottom,0px));
        width:auto;max-height:min(78vh,720px);border-radius:24px;padding:16px 16px 18px
      }
      .zx_as_ask_box{margin-top:12px}
    }
    @media(min-width:760px){
      #zx_assistant_panel{
        right:22px;bottom:120px;width:min(390px,calc(100vw - 44px));max-height:min(72vh,760px);
        border-radius:22px;padding:12px 17px 17px
      }
      .zx_as_drag{display:flex}
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
  if(automatico && sessionStorage.getItem(SESSION_SHOWN_KEY)==="1") return;
  if(automatico && !lista.length) return;

  quitarPanel();
  const x=lista[0] || {
    id:"consulta_libre",
    icono:"💡",
    titulo:"¿Qué quieres hacer?",
    texto:"Escribe lo que necesitas y buscaré la mejor ruta dentro de Zentryx.",
    accion:"Abrir Manual",
    run:function(){routerAbrir("manual")}
  };
  const p=document.createElement("div");
  p.id="zx_assistant_panel";
  p.innerHTML=`
    <div class="zx_as_drag">Mover asistente</div>
    <div class="zx_as_head">
      <div class="zx_as_icon">${x.icono||"💡"}</div>
      <div class="zx_as_copy">
        <div class="zx_as_title">${nombrePila()?nombrePila()+", ":""}${x.titulo}</div>
        <div class="zx_as_text">${x.texto}</div>
      </div>
      <button class="zx_as_close" type="button" aria-label="Cerrar">✕</button>
    </div>
    <div class="zx_as_ask_box">
      <div class="zx_as_ask_title">${saludo()}</div>
      <textarea class="zx_as_ask_input" id="zx_asistente_pregunta" placeholder="Escribe lo que quieres hacer..."></textarea>
      <div class="zx_as_ask_actions">
        <button class="zx_as_ask_go" type="button">Ir</button>
        <button class="zx_as_mic" type="button" title="Dictar" style="display:none">🎤 Dictar</button>
      </div>
      <div class="zx_as_hint">Si existe una acción directa, te llevaré a ella. Si no, buscaré esa petición en el Manual.</div>
    </div>
    <div class="zx_as_actions">
      <button class="zx_as_primary" type="button">${x.accion||"Ir ahora"}</button>
      <button class="zx_as_secondary" type="button" data-act="later">Más tarde</button>
      <button class="zx_as_secondary" type="button" data-act="never">No mostrar</button>
    </div>
  `;
  if(!esPantallaGrande()){
    const bd=document.createElement("div");
    bd.id="zx_assistant_backdrop";
    bd.onclick=quitarPanel;
    document.body.appendChild(bd);
  }
  document.body.appendChild(p);

  if(esPantallaGrande()){
    const pos=leerPosicion();
    if(pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)){
      p.style.left=Math.max(8,Math.min(pos.left,window.innerWidth-p.offsetWidth-8))+"px";
      p.style.top=Math.max(8,Math.min(pos.top,window.innerHeight-p.offsetHeight-8))+"px";
      p.style.right="auto";
      p.style.bottom="auto";
    }
    const drag=p.querySelector(".zx_as_drag");
    if(drag){
      let moviendo=false,dx=0,dy=0;
      const iniciar=function(cx,cy){
        const r=p.getBoundingClientRect();
        moviendo=true;dx=cx-r.left;dy=cy-r.top;
        p.style.left=r.left+"px";p.style.top=r.top+"px";p.style.right="auto";p.style.bottom="auto";
      };
      const mover=function(cx,cy){
        if(!moviendo) return;
        const left=Math.max(8,Math.min(cx-dx,window.innerWidth-p.offsetWidth-8));
        const top=Math.max(8,Math.min(cy-dy,window.innerHeight-p.offsetHeight-8));
        p.style.left=left+"px";p.style.top=top+"px";
      };
      const terminar=function(){
        if(!moviendo) return; moviendo=false;
        const r=p.getBoundingClientRect();
        guardarPosicion({left:r.left,top:r.top});
      };
      drag.addEventListener("pointerdown",function(ev){
        ev.preventDefault(); drag.setPointerCapture?.(ev.pointerId); iniciar(ev.clientX,ev.clientY);
      });
      drag.addEventListener("pointermove",function(ev){mover(ev.clientX,ev.clientY)});
      drag.addEventListener("pointerup",terminar);
      drag.addEventListener("pointercancel",terminar);
    }
  }

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

  const pregunta=p.querySelector("#zx_asistente_pregunta");
  const ir=p.querySelector(".zx_as_ask_go");
  const mic=p.querySelector(".zx_as_mic");
  function enviarPregunta(){
    const texto=String(pregunta?.value||"").trim();
    if(!texto) return;
    ejecutarPeticion(texto);
  }
  if(ir) ir.onclick=enviarPregunta;
  if(pregunta){
    pregunta.addEventListener("keydown",function(ev){
      if(ev.key==="Enter" && !ev.shiftKey){
        ev.preventDefault();
        enviarPregunta();
      }
    });
  }

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR && mic && pregunta){
    mic.style.display="";
    mic.onclick=function(){
      try{
        const rec=new SR();
        rec.lang="es-ES";
        rec.interimResults=false;
        rec.maxAlternatives=1;
        mic.textContent="🎙️ Escuchando";
        rec.onresult=function(ev){
          const t=ev.results?.[0]?.[0]?.transcript||"";
          pregunta.value=t;
          mic.textContent="🎤 Dictar";
          pregunta.focus();
        };
        rec.onerror=function(){mic.textContent="🎤 Dictar"};
        rec.onend=function(){mic.textContent="🎤 Dictar"};
        rec.start();
      }catch(e){mic.textContent="🎤 Dictar"}
    };
  }

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
