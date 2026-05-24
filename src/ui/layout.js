// ===============================
// ZENTRYX PRO - LAYOUT
// V3082 - RELOJ + POST-IT + AGENDA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3082";

// ===============================
// BASE
// ===============================
function $(id){
  return document.getElementById(id);
}

function app(){
  return $("app");
}

function sesion(){
  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function usuarioActual(){
  const s=sesion();

  return {
    id:s.id || "",
    usuario:s.usuario || "admin",
    nombre:s.nombre || "",
    rol:s.rol || "Administrador"
  };
}

function rolActual(){
  return String(usuarioActual().rol || "").toLowerCase();
}

function usuarioNombre(){
  return String(usuarioActual().usuario || "").toLowerCase();
}

function esAdmin(){
  return rolActual()==="administrador" || usuarioNombre()==="admin";
}

function puedeVerModulo(modulo){

  if(esAdmin()){
    return true;
  }

  return [
    "inicio",
    "fichaje",
    "agenda",
    "horas_extra"
  ].includes(modulo);
}

function limpiarTexto(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function limpiarLayoutAnterior(){

  [
    "zx_header",
    "zx_footer",
    "zx_top",
    "zx_nav",
    "zx_topbar",
    "zx_reloj_global",
    "zx_btn_postit",
    "zx_layout_styles",
    "zx_css"
  ].forEach(function(id){

    const el=$(id);

    if(el){
      el.remove();
    }

  });

}

// ===============================
// ESTILOS
// ===============================
function estilos(){

  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`
    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
    }

    html,body{
      margin:0;
      padding:0;
      background:#eef2f7;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      color:#0f172a;
      overflow-x:hidden;
    }

    body{
      min-height:100vh;
      padding-bottom:calc(env(safe-area-inset-bottom) + 120px);
    }

    #zx_topbar{
      background:#071330;
      color:white;
      padding:18px 16px 12px;
      position:relative;
      z-index:20;
    }

    #zx_topbar_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }

    #zx_logo{
      width:54px;
      height:54px;
      border-radius:16px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:30px;
      font-weight:900;
      flex:none;
    }

    #zx_brand h1{
      margin:0;
      font-size:24px;
      line-height:1.1;
      font-weight:900;
      white-space:nowrap;
    }

    #zx_brand p{
      margin:4px 0 0;
      color:#cbd5e1;
      font-size:14px;
      font-weight:700;
      white-space:nowrap;
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

    #zx_reloj_global{
      max-width:1180px;
      margin:12px auto 0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.12);
      border-radius:18px;
      padding:10px 12px;
    }

    #zx_reloj_hora{
      font-size:22px;
      font-weight:900;
      color:white;
      line-height:1;
    }

    #zx_reloj_fecha{
      font-size:13px;
      font-weight:800;
      color:#cbd5e1;
      margin-top:4px;
    }

    #zx_reloj_aviso{
      font-size:13px;
      font-weight:900;
      color:#fde68a;
      text-align:right;
      line-height:1.25;
    }

    #zx_nav{
      background:#071330;
      padding:0 16px 16px;
      border-bottom:1px solid rgba(255,255,255,.08);
      position:relative;
      z-index:20;
    }

    #zx_nav_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      gap:10px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    #zx_nav_inner::-webkit-scrollbar{
      display:none;
    }

    .zx_nav_btn{
      flex:0 0 auto;
      min-width:118px;
      border:0;
      border-radius:18px;
      background:#334155;
      color:white;
      padding:16px 18px;
      font-size:17px;
      font-weight:900;
      white-space:nowrap;
    }

    .zx_nav_btn.zx_activo{
      background:#2563eb;
    }
    // ===============================
// ZENTRYX PRO - LAYOUT
// V3082 - AGENDA + RELOJ + NOTAS
// ===============================
(function(){
"use strict";

const ZX_VERSION="3082";

function $(id){return document.getElementById(id)}
function app(){return $("app")}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function usuarioActual(){
  const s=sesion();
  return {
    id:s.id || "",
    usuario:s.usuario || "admin",
    rol:s.rol || "Administrador",
    nombre:s.nombre || s.usuario || "admin"
  };
}

function rolActual(){
  return String(usuarioActual().rol || "").toLowerCase();
}

function usuarioNombre(){
  return String(usuarioActual().usuario || "").toLowerCase();
}

function esAdmin(){
  return rolActual()==="administrador" || usuarioNombre()==="admin";
}

function puedeVerModulo(modulo){
  if(esAdmin()) return true;

  return [
    "inicio",
    "fichaje",
    "agenda"
  ].includes(modulo);
}

function limpiarTexto(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function limpiarLayoutAnterior(){
  [
    "zx_header",
    "zx_footer",
    "zx_top",
    "zx_nav",
    "zx_topbar",
    "zx_reloj_global",
    "zx_btn_postit_global",
    "zx_layout_styles",
    "zx_css"
  ].forEach(function(id){
    const el=$(id);
    if(el) el.remove();
  });
}

function estilos(){
  const css=document.createElement("style");
  css.id="zx_layout_styles";

  css.innerHTML=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

    html,body{
      margin:0;
      padding:0;
      background:#eef2f7;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      color:#0f172a;
      overflow-x:hidden;
    }

    body{
      min-height:100vh;
      padding-bottom:calc(env(safe-area-inset-bottom) + 120px);
    }

    #zx_topbar{
      background:#071330;
      color:white;
      padding:16px;
    }

    #zx_topbar_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
    }

    #zx_brand{
      display:flex;
      align-items:center;
      gap:12px;
      min-width:0;
    }

    #zx_logo{
      width:54px;
      height:54px;
      border-radius:16px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:30px;
      font-weight:900;
      flex:none;
    }

    #zx_brand h1{
      margin:0;
      font-size:24px;
      line-height:1.1;
      font-weight:900;
      white-space:nowrap;
    }

    #zx_brand p{
      margin:4px 0 0;
      color:#cbd5e1;
      font-size:14px;
      font-weight:700;
      white-space:nowrap;
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

    #zx_reloj_global{
      background:#0f172a;
      color:white;
      border-top:1px solid rgba(255,255,255,.08);
      border-bottom:1px solid rgba(255,255,255,.08);
      padding:10px 16px;
    }

    #zx_reloj_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }

    #zx_reloj_fecha{
      color:#cbd5e1;
      font-size:14px;
      font-weight:800;
      white-space:nowrap;
    }

    #zx_reloj_hora{
      font-size:22px;
      font-weight:900;
      letter-spacing:.5px;
      white-space:nowrap;
    }

    #zx_reloj_agenda{
      color:#93c5fd;
      font-size:14px;
      font-weight:900;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
      text-align:right;
      min-width:0;
    }

    #zx_nav{
      background:#071330;
      padding:0 16px 16px;
      border-bottom:1px solid rgba(255,255,255,.08);
    }

    #zx_nav_inner{
      max-width:1180px;
      margin:0 auto;
      display:flex;
      gap:10px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    #zx_nav_inner::-webkit-scrollbar{display:none}

    .zx_nav_btn{
      flex:0 0 auto;
      min-width:118px;
      border:0;
      border-radius:18px;
      background:#334155;
      color:white;
      padding:16px 18px;
      font-size:17px;
      font-weight:900;
      white-space:nowrap;
    }

    .zx_nav_btn.zx_activo{background:#2563eb}

    #app{
      width:100%;
      max-width:1180px;
      margin:0 auto;
      padding:18px 16px;
    }

    .zx_card{
      background:white;
      border-radius:24px;
      padding:24px;
      margin-bottom:18px;
      border:1px solid #d1d5db;
      box-shadow:0 8px 22px rgba(15,23,42,.06);
    }

    .zx_card h2{
      margin:0 0 14px;
      font-size:32px;
      line-height:1.1;
      font-weight:900;
      color:#0f172a;
    }

    .zx_card h3{
      margin:0 0 12px;
      font-size:24px;
      line-height:1.15;
      font-weight:900;
      color:#0f172a;
    }

    .zx_text{
      color:#6b7280;
      font-size:17px;
      line-height:1.5;
      font-weight:650;
    }

    .zx_btn_big,
    .zx_btn{
      width:100%;
      border:0;
      border-radius:20px;
      padding:19px;
      margin-top:14px;
      font-size:20px;
      font-weight:900;
      color:white;
      display:block;
      text-align:center;
    }

    .zx_rojo{background:#dc2626}
    .zx_azul{background:#2563eb}
    .zx_verde{background:#16a34a}
    .zx_naranja{background:#ea580c}
    .zx_morado{background:#7c3aed}
    .zx_gris{background:#64748b}

    input,select,textarea{
      width:100%;
      border:1px solid #d1d5db;
      border-radius:16px;
      padding:15px;
      margin-top:10px;
      font-size:17px;
      background:white;
      color:#0f172a;
    }

    #zx_btn_postit_global{
      position:fixed;
      right:18px;
      bottom:calc(env(safe-area-inset-bottom) + 24px);
      width:72px;
      height:72px;
      border-radius:50%;
      border:0;
      background:#facc15;
      color:#422006;
      font-size:34px;
      font-weight:900;
      z-index:9999;
      box-shadow:0 12px 35px rgba(0,0,0,.35);
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
      font-size:30px;
      font-weight:900;
    }

    .zx_nota_item{
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:14px;
      background:#f8fafc;
    }

    .zx_nota_texto{
      font-size:17px;
      font-weight:800;
      color:#0f172a;
      line-height:1.45;
      white-space:pre-wrap;
    }

    .zx_nota_fecha{
      margin-top:8px;
      color:#64748b;
      font-size:14px;
      font-weight:800;
    }

    @media(max-width:430px){
      #zx_logo{width:48px;height:48px;font-size:27px}
      #zx_brand h1{font-size:21px}
      #zx_brand p{font-size:13px}
      #zx_salir{padding:12px 15px;font-size:15px}
      .zx_nav_btn{min-width:104px;padding:14px 15px;font-size:16px}
      .zx_card h2{font-size:30px}
      #zx_reloj_inner{align-items:flex-start}
      #zx_reloj_fecha{font-size:13px}
      #zx_reloj_hora{font-size:20px}
      #zx_reloj_agenda{font-size:13px;max-width:145px}
    }

    @media(min-width:768px){
      #zx_topbar{padding:20px 24px}
      #zx_nav{padding:0 24px 18px}
      #app{padding:24px}
      .zx_card{padding:30px}
      .zx_card h2{font-size:36px}
    }

    @media(min-width:1024px){
      #zx_nav_inner{flex-wrap:wrap}
      .zx_nav_btn{min-width:auto;padding:15px 24px}
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
        <div>
          <h1>Zentryx PRO</h1>
          <p>${limpiarTexto(u.usuario)} · ${limpiarTexto(u.rol)}</p>
        </div>
      </div>

      <button id="zx_salir" type="button">Salir</button>
    </div>
  `;

  document.body.insertBefore(t,app());

  $("zx_salir").onclick=function(){
    localStorage.removeItem("zentryx_session");
    localStorage.removeItem("usuario");
    localStorage.removeItem("zx_estado");
    localStorage.removeItem("zx_pausa");
    localStorage.removeItem("zx_comida");
    localStorage.removeItem("zx_vehiculo_activo");
    localStorage.removeItem("zx_vehiculo_matricula");
    localStorage.removeItem("zx_vehiculo_km");
    location.href="index.html?v="+ZX_VERSION;
  };
}

function relojGlobal(){
  const r=document.createElement("div");
  r.id="zx_reloj_global";

  r.innerHTML=`
    <div id="zx_reloj_inner">
      <div>
        <div id="zx_reloj_fecha">--/--/----</div>
        <div id="zx_reloj_hora">--:--</div>
      </div>
      <div id="zx_reloj_agenda">Agenda cargando...</div>
    </div>
  `;

  document.body.insertBefore(r,$("zx_nav") || app());

  actualizarReloj();
  setInterval(actualizarReloj,1000);
  actualizarMiniAgenda();
  setInterval(actualizarMiniAgenda,60000);
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

  const f=$("zx_reloj_fecha");
  const h=$("zx_reloj_hora");

  if(f) f.textContent=fecha;
  if(h) h.textContent=hora;
}

async function actualizarMiniAgenda(){
  const el=$("zx_reloj_agenda");
  if(!el) return;

  if(!window.sb && !window.supabaseClient){
    el.textContent="Agenda no disponible";
    return;
  }

  try{
    const hoy=new Date().toISOString().slice(0,10);

    const r=await (window.sb || window.supabaseClient)
      .from("agenda_eventos")
      .select("*")
      .eq("fecha_inicio",hoy)
      .neq("estado","completado")
      .order("hora_inicio",{ascending:true})
      .limit(1);

    if(r.error || !r.data || !r.data.length){
      el.textContent="Sin citas hoy";
      return;
    }

    const e=r.data[0];
    el.textContent=(e.hora_inicio ? e.hora_inicio.slice(0,5)+" · " : "")+(e.titulo || "Evento");

  }catch(e){
    el.textContent="Agenda sin cargar";
  }
}

function botonNav(modulo,texto,accion){
  if(!puedeVerModulo(modulo)) return "";

  return `
    <button class="zx_nav_btn" data-modulo="${modulo}" type="button" onclick="${accion}">
      ${texto}
    </button>
  `;
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    <div id="zx_nav_inner">
      ${botonNav("inicio","Inicio","ZX_inicio()")}
      ${botonNav("fichaje","Fichaje","ZX_abrirFichaje()")}
      ${botonNav("usuarios","Usuarios","ZX_usuarios()")}
      ${botonNav("agenda","Agenda","ZX_abrirAgenda()")}
      ${botonNav("vehiculos","Vehículos","ZX_vehiculos()")}
      ${botonNav("incidencias","Incidencias","ZX_incidencias()")}
      ${botonNav("informes","Informes","ZX_informes()")}
      ${botonNav("configuracion","Configuración","ZX_configuracion()")}
    </div>
  `;

  document.body.insertBefore(n,app());
}

function activo(nombre){
  document.querySelectorAll(".zx_nav_btn").forEach(function(b){
    b.classList.remove("zx_activo");
    if(b.dataset.modulo===nombre){
      b.classList.add("zx_activo");
    }
  });
}

function sinPermiso(){
  if(app()){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Sin permiso</h2>
        <div class="zx_text">Tu usuario no tiene acceso a este módulo.</div>
      </div>
    `;
  }
}

function abrirModulo(nombre,callback){
  if(!puedeVerModulo(nombre)){
    activo("");
    sinPermiso();
    return;
  }

  activo(nombre);

  if(callback){
    callback();
  }
}

async function cargarNotas(){
  const u=usuarioActual();

  const r=await sb()
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
    <div class="zx_nota_item">
      <div class="zx_nota_texto">${limpiarTexto(n.descripcion || n.titulo || "")}</div>
      <div class="zx_nota_fecha">
        ${limpiarTexto(String(n.fecha_inicio || "").slice(0,10))}
        ${n.hora_inicio ? " · "+limpiarTexto(String(n.hora_inicio).slice(0,5)) : ""}
      </div>
      <button class="zx_btn_big zx_rojo" onclick="ZX_borrarNotaRapida('${n.id}')">
        Borrar
      </button>
    </div>
  `;
}

window.ZX_abrirNotasRapidas=async function(){
  const anterior=$("zx_modal_notas");
  if(anterior) anterior.remove();

  const modal=document.createElement("div");
  modal.id="zx_modal_notas";

  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Notas rápidas</h2>

        <textarea id="zx_nota_rapida_texto" rows="5" placeholder="Escribe una nota o recordatorio..."></textarea>

        <input id="zx_nota_rapida_fecha" type="date" value="${new Date().toISOString().slice(0,10)}">
        <input id="zx_nota_rapida_hora" type="time">

        <button class="zx_btn_big zx_verde" onclick="ZX_guardarNotaRapida()">
          Guardar nota
        </button>

        <div id="zx_notas_rapidas_lista" style="margin-top:18px;"></div>

        <button class="zx_btn_big zx_gris" onclick="document.getElementById('zx_modal_notas').remove()">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const lista=$("zx_notas_rapidas_lista");
  const notas=await cargarNotas();

  if(lista){
    lista.innerHTML=notas.length
      ? notas.map(renderNota).join("")
      : `<div class="zx_text">Sin notas.</div>`;
  }
};

window.ZX_guardarNotaRapida=async function(){
  const u=usuarioActual();

  const texto=String($("zx_nota_rapida_texto")?.value || "").trim();
  const fecha=$("zx_nota_rapida_fecha")?.value || new Date().toISOString().slice(0,10);
  const hora=$("zx_nota_rapida_hora")?.value || null;

  if(!texto){
    alert("Escribe una nota.");
    return;
  }

  const r=await sb()
    .from("agenda_eventos")
    .insert([{
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
    }]);

  if(r.error){
    alert("Error guardando nota: "+r.error.message);
    return;
  }

  ZX_abrirNotasRapidas();
  actualizarMiniAgenda();
};

window.ZX_borrarNotaRapida=async function(id){
  const r=await sb()
    .from("agenda_eventos")
    .delete()
    .eq("id",id);

  if(r.error){
    alert("Error borrando nota: "+r.error.message);
    return;
  }

  ZX_abrirNotasRapidas();
  actualizarMiniAgenda();
};

function botonPostit(){
  const b=document.createElement("button");
  b.id="zx_btn_postit_global";
  b.type="button";
  b.textContent="📝";
  b.onclick=function(){
    if(window.ZX_abrirNotasRapidas){
      window.ZX_abrirNotasRapidas();
    }
  };

  document.body.appendChild(b);
}

window.ZX_inicio=function(){
  abrirModulo("inicio",function(){
    if(window.ZENTRYX_UI_inicio){
      window.ZENTRYX_UI_inicio();
    }
  });
};

window.ZX_abrirFichaje=function(){
  abrirModulo("fichaje",function(){
    if(window.ZX_fichaje_real){
      window.ZX_fichaje_real();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Fichaje</h2>
        <div class="zx_text">El archivo fichaje.js no ha cargado correctamente.</div>
      </div>
    `;
  });
};

window.ZX_abrirAgenda=function(){
  abrirModulo("agenda",function(){
    if(typeof window.ZX_agenda==="function"){
      window.ZX_agenda();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Agenda</h2>
        <div class="zx_text">No se ha cargado agenda.js.</div>
      </div>
    `;
  });
};

window.ZX_usuarios=function(){
  abrirModulo("usuarios",function(){
    if(window.ZENTRYX_UI_usuarios){
      window.ZENTRYX_UI_usuarios();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Usuarios</h2>
        <div class="zx_text">Módulo usuarios pendiente.</div>
      </div>
    `;
  });
};

window.ZX_vehiculos=function(){
  abrirModulo("vehiculos",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Vehículos</h2>
        <div class="zx_text">Módulo vehículos pendiente.</div>
      </div>
    `;
  });
};

window.ZX_incidencias=function(){
  abrirModulo("incidencias",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Incidencias</h2>
        <div class="zx_text">Módulo incidencias pendiente.</div>
      </div>
    `;
  });
};

window.ZX_informes=function(){
  abrirModulo("informes",function(){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Informes</h2>
        <div class="zx_text">Módulo informes pendiente.</div>
      </div>
    `;
  });
};

window.ZX_configuracion=function(){
  abrirModulo("configuracion",function(){
    if(typeof window.ZX_configLaboral==="function"){
      window.ZX_configLaboral();
      return;
    }

    if(typeof window.ZX_config_laboral==="function"){
      window.ZX_config_laboral();
      return;
    }

    app().innerHTML=`
      <div class="zx_card">
        <h2>Configuración</h2>
        <div class="zx_text">No se ha cargado config_laboral.js.</div>
      </div>
    `;
  });
};

window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    limpiarLayoutAnterior();
    estilos();
    topbar();
    nav();
    relojGlobal();
    botonPostit();
  }
};

})();