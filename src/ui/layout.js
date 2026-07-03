// ===============================
// ZENTRYX PRO - LAYOUT
// V3101
// ===============================
(function(){
"use strict";

const ZX_VERSION="3101";

let ZX_RELOJ_TIMER=null;
let ZX_AGENDA_TIMER=null;

function $(id){return document.getElementById(id)}
function app(){return $("app")}
function sb(){return window.sb || window.supabaseClient || null}

function zx(){
  return window.ZENTRYX || window.ZX || null;
}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function"){
    return zx().usuarioActual();
  }

  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function usuarioActual(){
  const u=sesion() || {};
  return {
    id:u.id || "",
    usuario:u.usuario || u.nombre || "",
    nombre:u.nombre || u.usuario || "",
    rol:u.rol || "",
    empresa_id:u.empresa_id || "demo"
  };
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
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function hoyISO(){
  return new Date().toISOString().slice(0,10);
}

function esAdmin(){
  const u=usuarioActual();
  return normalizar(u.rol)==="administrador" || normalizar(u.usuario)==="admin";
}

function moduloActivo(nombre){
  if(zx() && typeof zx().moduloActivo==="function"){
    return zx().moduloActivo(nombre);
  }
  return true;
}

function formatoFechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function limpiarLayout(){
  ["zx_topbar","zx_reloj","zx_nav","zx_postit","zx_css"].forEach(function(id){
    const el=$(id);
    if(el) el.remove();
  });

  if(ZX_RELOJ_TIMER){
    clearInterval(ZX_RELOJ_TIMER);
    ZX_RELOJ_TIMER=null;
  }

  if(ZX_AGENDA_TIMER){
    clearInterval(ZX_AGENDA_TIMER);
    ZX_AGENDA_TIMER=null;
  }
}

function estilos(){
  const css=document.createElement("style");
  css.id="zx_css";
  css.innerHTML=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{
      margin:0;
      padding:0;
      width:100%;
      max-width:100%;
      min-height:100%;
      background:#eef2f7;
      color:#0f172a;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      overflow-x:hidden;
    }
    body{
      min-height:100vh;
      padding-bottom:calc(env(safe-area-inset-bottom) + 132px);
    }
    body.zx_modal_abierto #zx_postit{display:none!important}
    button,input,select,textarea{font-family:inherit}
    button{cursor:pointer}
    button:disabled{opacity:.55;cursor:not-allowed}

    #zx_topbar{
      width:100%;
      background:#071330;
      color:white;
      padding:16px;
    }
    #zx_topbar_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }
    #zx_brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
      flex:1;
    }
    #zx_logo{
      width:54px;
      height:54px;
      min-width:54px;
      border-radius:16px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:30px;
      font-weight:900;
      color:white;
      box-shadow:0 12px 28px rgba(0,0,0,.22);
    }
    #zx_brand_txt{min-width:0}
    #zx_brand_txt h1{
      margin:0;
      font-size:24px;
      line-height:1.05;
      font-weight:900;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    #zx_brand_txt div{
      margin-top:4px;
      color:#cbd5e1;
      font-size:14px;
      font-weight:800;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    #zx_salir{
      border:0;
      border-radius:16px;
      background:#dc2626;
      color:white;
      padding:14px 18px;
      font-size:17px;
      font-weight:900;
      flex:none;
    }

    #zx_reloj{
      width:100%;
      background:#0f172a;
      color:white;
      border-top:1px solid rgba(255,255,255,.08);
      border-bottom:1px solid rgba(255,255,255,.08);
      padding:10px 16px;
    }
    #zx_reloj_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }
    #zx_fecha{
      color:#cbd5e1;
      font-size:14px;
      font-weight:900;
      white-space:nowrap;
    }
    #zx_hora{
      color:white;
      font-size:28px;
      font-weight:900;
      letter-spacing:.5px;
      white-space:nowrap;
      line-height:1.05;
    }
    #zx_agenda_btn{
      border:0;
      border-radius:20px;
      background:#facc15;
      color:#422006;
      padding:12px 18px;
      min-width:92px;
      font-size:21px;
      font-weight:900;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      box-shadow:0 8px 18px rgba(0,0,0,.18);
      flex:none;
    }

    #zx_nav{
      width:100%;
      background:#071330;
      padding:12px 12px 14px;
      border-bottom:1px solid rgba(255,255,255,.08);
    }
    #zx_nav_inner{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:8px;
    }
    .zx_nav_btn{
      width:100%;
      border:0;
      border-radius:16px;
      background:#334155;
      color:white;
      padding:14px 8px;
      font-size:15px;
      font-weight:900;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      text-align:center;
    }
    .zx_nav_btn.zx_activo{background:#2563eb}

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:18px 16px;
      overflow-x:hidden;
    }

    .zx_card{
      width:100%;
      background:white;
      border:1px solid #d1d5db;
      border-radius:24px;
      padding:22px;
      margin-bottom:18px;
      box-shadow:0 8px 22px rgba(15,23,42,.06);
      overflow:hidden;
    }
    .zx_card h2{
      margin:0 0 14px;
      color:#0f172a;
      font-size:32px;
      line-height:1.1;
      font-weight:900;
    }
    .zx_card h3{
      margin:0 0 12px;
      color:#0f172a;
      font-size:24px;
      line-height:1.15;
      font-weight:900;
    }
    .zx_text{
      color:#64748b;
      font-size:17px;
      line-height:1.45;
      font-weight:750;
    }

    .zx_btn_big,.zx_btn{
      width:100%;
      border:0;
      border-radius:20px;
      padding:18px;
      margin-top:12px;
      font-size:19px;
      font-weight:900;
      color:white;
      text-align:center;
      display:block;
      text-decoration:none;
    }

    .zx_rojo{background:#dc2626}
    .zx_azul{background:#2563eb}
    .zx_verde{background:#16a34a}
    .zx_naranja{background:#ea580c}
    .zx_morado{background:#7c3aed}
    .zx_gris{background:#64748b}

    input,select,textarea{
      width:100%;
      border:1px solid #cbd5e1;
      border-radius:16px;
      padding:15px;
      margin-top:10px;
      font-size:17px;
      color:#0f172a;
      background:white;
    }

    #zx_postit{
      position:fixed;
      right:18px;
      bottom:calc(env(safe-area-inset-bottom) + 34px);
      width:66px;
      height:66px;
      border-radius:50%;
      border:4px solid white;
      background:#facc15;
      color:#422006;
      font-size:30px;
      font-weight:900;
      z-index:9000;
      box-shadow:0 12px 32px rgba(0,0,0,.35);
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .zx_modal_fondo{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.55);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:16px;
      z-index:99999;
    }
    .zx_modal_caja{
      width:100%;
      max-width:620px;
      max-height:90vh;
      overflow-y:auto;
      background:white;
      border-radius:28px;
      padding:22px;
      box-shadow:0 24px 70px rgba(0,0,0,.38);
    }
    .zx_modal_caja h2{
      margin:0 0 14px;
      color:#0f172a;
      font-size:30px;
      font-weight:900;
    }

    .zx_list_item{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:12px;
    }
    .zx_list_title{
      color:#0f172a;
      font-size:17px;
      font-weight:900;
      line-height:1.35;
      white-space:pre-wrap;
    }
    .zx_list_meta{
      margin-top:8px;
      color:#64748b;
      font-size:14px;
      font-weight:800;
      line-height:1.4;
    }
    .zx_list_desc{
      margin-top:8px;
      color:#475569;
      font-size:15px;
      font-weight:750;
      line-height:1.4;
      white-space:pre-wrap;
    }

    @media(max-width:430px){
      #zx_topbar{padding:14px 14px 12px}
      #zx_logo{width:50px;height:50px;min-width:50px;font-size:28px}
      #zx_brand_txt h1{font-size:22px}
      #zx_brand_txt div{font-size:13px}
      #zx_salir{padding:12px 15px;font-size:15px}
      #zx_reloj_inner{gap:10px}
      #zx_hora{font-size:27px}
      #zx_fecha{font-size:13px}
      #zx_agenda_btn{min-width:86px;padding:10px 14px;font-size:20px}
      .zx_nav_btn{font-size:15px;padding:13px 8px}
      #app{padding:16px 12px}
      .zx_card{padding:20px;border-radius:22px}
      .zx_card h2{font-size:31px}
      .zx_card h3{font-size:23px}
    }

    @media(min-width:700px){
      #zx_nav_inner{grid-template-columns:repeat(4,1fr)}
      #app{padding:24px}
    }

    @media(min-width:1024px){
      #zx_nav_inner{grid-template-columns:repeat(6,1fr)}
      .zx_card{padding:28px}
    }
  `;
  document.head.appendChild(css);
}

function topbar(){
  const u=usuarioActual();

  const t=document.createElement("div");
  t.id="zx_topbar";
  t.innerHTML=`
    <div id="zx_topbar_inner">
      <div id="zx_brand">
        <div id="zx_logo">Z</div>
        <div id="zx_brand_txt">
          <h1>Zentryx PRO</h1>
          <div>${limpiar(u.usuario || u.nombre || "usuario")} · ${limpiar(u.rol || "Sin rol")}</div>
        </div>
      </div>
      <button id="zx_salir" type="button">Salir</button>
    </div>
  `;

  document.body.insertBefore(t,app());

  $("zx_salir").onclick=function(){
    localStorage.removeItem("zentryx_session");
    localStorage.removeItem("usuario");
    location.href="index.html?v="+ZX_VERSION;
  };
}

function reloj(){
  const r=document.createElement("div");
  r.id="zx_reloj";
  r.innerHTML=`
    <div id="zx_reloj_inner">
      <div>
        <div id="zx_fecha">--/--/----</div>
        <div id="zx_hora">--:--</div>
      </div>
      <button id="zx_agenda_btn" type="button">📅</button>
    </div>
  `;

  document.body.insertBefore(r,app());

  $("zx_agenda_btn").onclick=function(){
    if(window.ZX_abrirAgendaHoy) window.ZX_abrirAgendaHoy();
  };

  actualizarReloj();
  ZX_RELOJ_TIMER=setInterval(actualizarReloj,1000);

  actualizarContadorAgenda();
  ZX_AGENDA_TIMER=setInterval(actualizarContadorAgenda,60000);
}

function actualizarReloj(){
  const d=new Date();

  const fecha=d.toLocaleDateString("es-ES",{
    weekday:"long",
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  });

  const hora=d.toLocaleTimeString("es-ES",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });

  if($("zx_fecha")) $("zx_fecha").textContent=fecha;
  if($("zx_hora")) $("zx_hora").textContent=hora;
}

async function eventosHoy(){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return [];

  const f=hoyISO();
  const u=usuarioActual();

  const r=await cliente
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",f)
    .gte("fecha_fin",f)
    .neq("estado","completado")
    .neq("estado","cancelado")
    .order("hora_inicio",{ascending:true})
    .limit(30);

  if(r.error) return [];

  let datos=r.data || [];

  if(!esAdmin()){
    datos=datos.filter(function(e){
      return String(e.visible_para || "todos")==="todos" ||
             String(e.usuario_id || "")===String(u.id || "");
    });
  }

  return datos;
}

async function actualizarContadorAgenda(){
  const btn=$("zx_agenda_btn");
  if(!btn) return;

  try{
    const datos=await eventosHoy();
    btn.textContent=datos.length ? "📅 "+datos.length : "📅";
    btn.title="Agenda de hoy";
  }catch(e){
    btn.textContent="📅";
  }
}

function textoTipo(t){
  const m={
    recordatorio:"Nota",
    trabajo:"Trabajo",
    cita:"Cita",
    vacaciones:"Vacaciones",
    permiso:"Permiso",
    revision:"Revisión",
    libranza:"Libranza",
    baja_medica:"Baja médica",
    asuntos_propios:"Asuntos propios",
    festivo:"Festivo"
  };

  return m[t] || t || "Evento";
}

function renderEventoHoy(e){
  const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "Sin hora";
  const icono=e.tipo==="recordatorio" ? "📝" : e.tipo==="trabajo" ? "🔧" : "📅";

  return `
    <div class="zx_list_item">
      <div class="zx_list_title">${icono} ${limpiar(e.titulo || "Evento")}</div>
      <div class="zx_list_meta">
        ${limpiar(hora)} · ${limpiar(textoTipo(e.tipo))}
        ${e.usuario ? "<br>Usuario: "+limpiar(e.usuario) : ""}
        ${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}
        ${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}
      </div>
      ${e.descripcion ? `<div class="zx_list_desc">${limpiar(e.descripcion)}</div>` : ""}
      ${
        e.tipo==="trabajo" && e.origen==="trabajos" && e.origen_id
        ? `<button class="zx_btn_big zx_azul" data-zx-open-trabajo="${limpiar(e.origen_id)}">Abrir trabajo</button>`
        : ""
      }
    </div>
  `;
}

window.ZX_abrirTrabajoDesdeLayout=function(id){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();

  document.body.classList.remove("zx_modal_abierto");

  window.ZX_TRABAJO_ABRIR_ID=String(id || "");

  if(window.ZX_trabajos){
    window.ZX_trabajos();
    marcarActivo("trabajos");
    return;
  }

  alert("No se ha cargado Trabajos.");
};

window.ZX_abrirAgendaHoy=async function(){
  const anterior=$("zx_modal_agenda_hoy");
  if(anterior) anterior.remove();

  document.body.classList.add("zx_modal_abierto");

  const modal=document.createElement("div");
  modal.id="zx_modal_agenda_hoy";
  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Agenda de hoy</h2>
        <div id="zx_agenda_hoy_lista" class="zx_text">Cargando...</div>
        <button class="zx_btn_big zx_verde" id="zx_agenda_hoy_abrir">Abrir Agenda</button>
        <button class="zx_btn_big zx_gris" id="zx_agenda_hoy_cerrar">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("zx_agenda_hoy_cerrar").onclick=window.ZX_cerrarModalAgendaHoy;
  $("zx_agenda_hoy_abrir").onclick=window.ZX_abrirAgendaDesdePanel;

  const lista=$("zx_agenda_hoy_lista");

  try{
    const datos=await eventosHoy();
    lista.innerHTML=datos.length
      ? datos.map(renderEventoHoy).join("")
      : `<div class="zx_text">Sin citas ni notas para hoy.</div>`;

    document.querySelectorAll("[data-zx-open-trabajo]").forEach(function(b){
      b.onclick=function(){
        window.ZX_abrirTrabajoDesdeLayout(b.dataset.zxOpenTrabajo);
      };
    });

  }catch(e){
    lista.innerHTML=`<div class="zx_text">No se pudo cargar la agenda de hoy.</div>`;
  }
};

window.ZX_cerrarModalAgendaHoy=function(){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_abrirAgendaDesdePanel=function(){
  window.ZX_cerrarModalAgendaHoy();
  if(window.ZX_abrirAgenda){
    window.ZX_abrirAgenda();
    return;
  }
  if(window.ZX_agenda) window.ZX_agenda();
};

const MODULOS=[
  {id:"inicio",texto:"Inicio",admin:false,fn:"ZX_inicio"},
  {id:"fichaje",texto:"Fichaje",admin:false,fn:"ZX_abrirFichaje"},
  {id:"agenda",texto:"Agenda",admin:false,fn:"ZX_abrirAgenda"},
  {id:"clientes",texto:"Clientes",admin:false,fn:"ZX_abrirClientes"},
  {id:"trabajos",texto:"Trabajos",admin:false,fn:"ZX_abrirTrabajos"},
  {id:"usuarios",texto:"Usuarios",admin:true,fn:"ZX_usuarios"},
  {id:"horas_extra",texto:"Horas",admin:true,fn:"ZX_abrirHorasExtra"},
  {id:"control_fichajes",texto:"Control",admin:true,fn:"ZX_abrirControlFichajes"},
  {id:"vehiculos",texto:"Vehículos",admin:true,fn:"ZX_vehiculos"},
  {id:"configuracion",texto:"Config.",admin:true,fn:"ZX_configuracion"}
];

function puedeVerModulo(id){
  if(!moduloActivo(id)) return false;
  const m=MODULOS.find(x=>x.id===id);
  if(!m) return false;
  if(!m.admin) return true;
  return esAdmin();
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    <div id="zx_nav_inner">
      ${MODULOS.filter(m=>puedeVerModulo(m.id)).map(function(m){
        return `<button class="zx_nav_btn" data-modulo="${limpiar(m.id)}" type="button">${limpiar(m.texto)}</button>`;
      }).join("")}
    </div>
  `;

  document.body.insertBefore(n,app());

  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.onclick=function(){
      const id=btn.dataset.modulo;
      abrirPorId(id);
    };
  });
}

function marcarActivo(nombre){
  const objetivo=String(nombre || "")==="horas" ? "horas_extra" : String(nombre || "");

  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(String(b.dataset.modulo || "")===objetivo){
      b.classList.add("zx_activo");
    }
  });

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo(objetivo);
  }
}

function pintarSinPermiso(){
  marcarActivo("");
  app().innerHTML=`
    <div class="zx_card">
      <h2>Sin permiso</h2>
      <div class="zx_text">Tu usuario no tiene acceso a esta pantalla.</div>
    </div>
  `;
}

function abrirSeguro(id,callback){
  if(!puedeVerModulo(id)){
    pintarSinPermiso();
    return;
  }

  marcarActivo(id);

  try{
    callback();
  }catch(e){
    console.error(e);
    app().innerHTML=`
      <div class="zx_card">
        <h2>Error</h2>
        <div class="zx_text">No se pudo abrir esta pantalla.</div>
      </div>
    `;
  }
}

function abrirPorId(id){
  const mapa={
    inicio:window.ZX_inicio,
    fichaje:window.ZX_abrirFichaje,
    agenda:window.ZX_abrirAgenda,
    clientes:window.ZX_abrirClientes,
    trabajos:window.ZX_abrirTrabajos,
    usuarios:window.ZX_usuarios,
    horas_extra:window.ZX_abrirHorasExtra,
    control_fichajes:window.ZX_abrirControlFichajes,
    vehiculos:window.ZX_vehiculos,
    configuracion:window.ZX_configuracion
  };

  if(typeof mapa[id]==="function"){
    mapa[id]();
    return;
  }

  app().innerHTML=`
    <div class="zx_card">
      <h2>${limpiar(id || "Pantalla")}</h2>
      <div class="zx_text">Esta pantalla no está disponible.</div>
    </div>
  `;
}

async function cargarNotas(){
  const cliente=sb();
  if(!cliente || !navigator.onLine) return [];

  const u=usuarioActual();

  const r=await cliente
    .from("agenda_eventos")
    .select("*")
    .eq("tipo","recordatorio")
    .or("usuario_id.eq."+u.id+",visible_para.eq.todos")
    .order("created_at",{ascending:false})
    .limit(20);

  if(r.error) return [];
  return r.data || [];
}

function renderNota(n){
  return `
    <div class="zx_list_item">
      <div class="zx_list_title">📝 ${limpiar(n.descripcion || n.titulo || "")}</div>
      <div class="zx_list_meta">
        ${limpiar(formatoFechaES(n.fecha_inicio || ""))}
        ${n.hora_inicio ? " · "+limpiar(String(n.hora_inicio).slice(0,5)) : ""}
      </div>
      <button class="zx_btn_big zx_rojo" data-zx-borrar-nota="${limpiar(n.id)}">Borrar</button>
    </div>
  `;
}

window.ZX_abrirNotasRapidas=async function(){
  const anterior=$("zx_modal_notas");
  if(anterior) anterior.remove();

  document.body.classList.add("zx_modal_abierto");

  const modal=document.createElement("div");
  modal.id="zx_modal_notas";
  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Notas rápidas</h2>
        <textarea id="zx_nota_rapida_texto" rows="5" placeholder="Escribe una nota o recordatorio..."></textarea>

        <label class="zx_text" style="display:block;margin-top:12px;">Fecha del aviso</label>
        <input id="zx_nota_rapida_fecha" type="date" value="${hoyISO()}">

        <label class="zx_text" style="display:block;margin-top:12px;">Hora del aviso</label>
        <input id="zx_nota_rapida_hora" type="time">

        <button class="zx_btn_big zx_verde" id="zx_guardar_nota_rapida">Guardar nota</button>

        <div id="zx_notas_rapidas_lista" style="margin-top:18px;"></div>

        <button class="zx_btn_big zx_gris" id="zx_cerrar_notas_rapidas">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("zx_guardar_nota_rapida").onclick=window.ZX_guardarNotaRapida;
  $("zx_cerrar_notas_rapidas").onclick=window.ZX_cerrarNotasRapidas;

  const notas=await cargarNotas();
  const lista=$("zx_notas_rapidas_lista");

  if(lista){
    lista.innerHTML=notas.length
      ? notas.map(renderNota).join("")
      : `<div class="zx_text">Sin notas.</div>`;
  }

  document.querySelectorAll("[data-zx-borrar-nota]").forEach(function(b){
    b.onclick=function(){
      window.ZX_borrarNotaRapida(b.dataset.zxBorrarNota);
    };
  });
};

window.ZX_cerrarNotasRapidas=function(){
  const m=$("zx_modal_notas");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
};

window.ZX_guardarNotaRapida=async function(){
  const cliente=sb();
  if(!cliente){
    alert("No hay conexión con la base de datos.");
    return;
  }

  const u=usuarioActual();
  const texto=String($("zx_nota_rapida_texto")?.value || "").trim();
  const fecha=$("zx_nota_rapida_fecha")?.value || hoyISO();
  const hora=$("zx_nota_rapida_hora")?.value || null;

  if(!texto){
    alert("Escribe una nota.");
    return;
  }

  const data={
    tipo:"recordatorio",
    titulo:texto.slice(0,60),
    descripcion:texto,
    fecha_inicio:fecha,
    fecha_fin:fecha,
    hora_inicio:hora,
    usuario_id:String(u.id || ""),
    usuario:u.usuario || "",
    estado:"activo",
    prioridad:"normal",
    creado_por:u.usuario || "",
    visible_para:"todos",
    recordatorio:true,
    origen:"postit"
  };

  if(!navigator.onLine && zx() && typeof zx().guardarOffline==="function"){
    zx().guardarOffline("agenda_eventos","insert",[data]);
    alert("Nota guardada sin conexión. Se sincronizará al volver Internet.");
    window.ZX_cerrarNotasRapidas();
    return;
  }

  const r=await cliente.from("agenda_eventos").insert([data]);

  if(r.error){
    alert("Error guardando nota: "+r.error.message);
    return;
  }

  window.ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

window.ZX_borrarNotaRapida=async function(id){
  if(!confirm("¿Borrar esta nota?")) return;

  const cliente=sb();
  if(!cliente){
    alert("No hay conexión con la base de datos.");
    return;
  }

  const r=await cliente.from("agenda_eventos").delete().eq("id",id);

  if(r.error){
    alert("Error borrando nota: "+r.error.message);
    return;
  }

  window.ZX_abrirNotasRapidas();
  actualizarContadorAgenda();
};

function botonPostit(){
  const b=document.createElement("button");
  b.id="zx_postit";
  b.type="button";
  b.textContent="📝";
  b.onclick=function(){
    if(window.ZX_abrirNotasRapidas) window.ZX_abrirNotasRapidas();
  };
  document.body.appendChild(b);
}

function instalarRutas(){
  const modInicio=window.ZENTRYX_UI_inicio;
  const modFichaje=window.ZX_fichaje_real || window.ZX_fichaje;
  const modAgenda=window.ZX_agenda;
  const modClientes=window.ZX_clientes;
  const modTrabajos=window.ZX_trabajos;
  const modUsuarios=window.ZENTRYX_UI_usuarios || window.ZX_usuarios;
  const modHoras=window.ZX_horas_extra;
  const modControl=window.ZX_control_fichajes || window.ZX_controlFichajes;
  const modVehiculos=window.ZX_vehiculos || window.ZENTRYX_UI_abrirVehiculos;
  const modConfig=window.ZX_configLaboral || window.ZX_config_laboral || window.ZX_configuracion;

  window.ZX_inicio=function(){
    abrirSeguro("inicio",function(){
      if(typeof modInicio==="function"){modInicio();return}
      app().innerHTML=`<div class="zx_card"><h2>Inicio</h2><div class="zx_text">No se ha cargado inicio.js.</div></div>`;
    });
  };

  window.ZX_abrirFichaje=function(){
    abrirSeguro("fichaje",function(){
      if(typeof modFichaje==="function"){modFichaje();return}
      app().innerHTML=`<div class="zx_card"><h2>Fichaje</h2><div class="zx_text">No se ha cargado fichaje.js.</div></div>`;
    });
  };

  window.ZX_abrirAgenda=function(){
    abrirSeguro("agenda",function(){
      if(typeof modAgenda==="function"){modAgenda();return}
      app().innerHTML=`<div class="zx_card"><h2>Agenda</h2><div class="zx_text">No se ha cargado agenda.js.</div></div>`;
    });
  };

  window.ZX_abrirClientes=function(){
    abrirSeguro("clientes",function(){
      if(typeof modClientes==="function"){modClientes();return}
      app().innerHTML=`<div class="zx_card"><h2>Clientes</h2><div class="zx_text">No se ha cargado clientes.js.</div></div>`;
    });
  };

  window.ZX_abrirTrabajos=function(){
    abrirSeguro("trabajos",function(){
      if(typeof modTrabajos==="function"){modTrabajos();return}
      app().innerHTML=`<div class="zx_card"><h2>Trabajos</h2><div class="zx_text">No se ha cargado trabajos.js.</div></div>`;
    });
  };

  window.ZX_usuarios=function(){
    abrirSeguro("usuarios",function(){
      if(typeof modUsuarios==="function"){modUsuarios();return}
      app().innerHTML=`<div class="zx_card"><h2>Usuarios</h2><div class="zx_text">No se ha cargado usuarios.js.</div></div>`;
    });
  };

  window.ZX_abrirHorasExtra=function(){
    abrirSeguro("horas_extra",function(){
      if(typeof modHoras==="function"){modHoras();return}
      app().innerHTML=`<div class="zx_card"><h2>Horas</h2><div class="zx_text">No se ha cargado horas_extra.js.</div></div>`;
    });
  };

  window.ZX_abrirControlFichajes=function(){
    abrirSeguro("control_fichajes",function(){
      if(typeof modControl==="function"){modControl();return}
      app().innerHTML=`<div class="zx_card"><h2>Control</h2><div class="zx_text">No se ha cargado control_fichajes.js.</div></div>`;
    });
  };

  window.ZX_vehiculos=function(){
    abrirSeguro("vehiculos",function(){
      if(typeof modVehiculos==="function"){modVehiculos();return}
      app().innerHTML=`<div class="zx_card"><h2>Vehículos</h2><div class="zx_text">No se ha cargado vehiculos.js.</div></div>`;
    });
  };

  window.ZX_configuracion=function(){
    abrirSeguro("configuracion",function(){
      if(typeof modConfig==="function" && modConfig!==window.ZX_configuracion){modConfig();return}
      app().innerHTML=`<div class="zx_card"><h2>Configuración</h2><div class="zx_text">No se ha cargado config_laboral.js.</div></div>`;
    });
  };
}

window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    limpiarLayout();
    estilos();
    instalarRutas();
    topbar();
    reloj();
    nav();
    botonPostit();

    if(zx() && typeof zx().actualizarEstadoConexion==="function"){
      zx().actualizarEstadoConexion();
    }
  }
};

console.log("ZENTRYX layout.js V"+ZX_VERSION+" cargado");

})();