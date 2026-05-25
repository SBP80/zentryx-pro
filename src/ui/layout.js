// ===============================
// ZENTRYX PRO - LAYOUT
// V3088 - RELOJ CON ICONO AGENDA
// ===============================
(function(){
"use strict";

const ZX_VERSION="3088";

function $(id){return document.getElementById(id)}
function app(){return $("app")}
function sb(){return window.sb || window.supabaseClient}

// ===============================
// SESIÓN
// ===============================
function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
}

function usuarioActual(){
  const s=sesion();
  return {
    id:s.id || "",
    usuario:s.usuario || "admin",
    rol:s.rol || "Administrador"
  };
}

function esAdmin(){
  const u=usuarioActual();
  return String(u.rol||"").toLowerCase()==="administrador" ||
         String(u.usuario||"").toLowerCase()==="admin";
}

// ===============================
// LIMPIEZA
// ===============================
function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function limpiarLayoutAnterior(){
  [
    "zx_topbar",
    "zx_nav",
    "zx_reloj_global",
    "zx_btn_postit_global",
    "zx_layout_styles"
  ].forEach(id=>{
    const el=$(id);
    if(el) el.remove();
  });
}

// ===============================
// ESTILOS
// ===============================
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
    }

    #zx_topbar{
      background:#071330;
      color:white;
      padding:16px;
    }

    #zx_topbar_inner{
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    #zx_logo{
      width:48px;
      height:48px;
      border-radius:14px;
      background:linear-gradient(135deg,#2563eb,#10b981);
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:900;
      font-size:26px;
    }

    #zx_salir{
      background:#dc2626;
      border:0;
      border-radius:14px;
      color:white;
      padding:12px 14px;
      font-weight:900;
    }

    #zx_reloj_global{
      background:#0f172a;
      color:white;
      padding:10px 16px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    #zx_reloj_hora{
      font-size:22px;
      font-weight:900;
    }

    #zx_reloj_fecha{
      font-size:13px;
      color:#cbd5e1;
    }

    #zx_icono_agenda{
      background:#facc15;
      color:#422006;
      padding:10px 14px;
      border-radius:16px;
      font-weight:900;
      font-size:16px;
    }

    #zx_nav{
      background:#071330;
      padding:12px;
      display:flex;
      gap:10px;
    }

    .zx_nav_btn{
      background:#334155;
      color:white;
      border:0;
      padding:12px 14px;
      border-radius:14px;
      font-weight:900;
    }

    .zx_nav_btn.zx_activo{
      background:#2563eb;
    }

    #app{
      padding:16px;
    }
  `;

  document.head.appendChild(css);
}

// ===============================
// TOPBAR
// ===============================
function topbar(){
  const u=usuarioActual();

  const t=document.createElement("div");
  t.id="zx_topbar";

  t.innerHTML=`
    <div id="zx_topbar_inner">
      <div style="display:flex;gap:10px;align-items:center">
        <div id="zx_logo">Z</div>
        <div>
          <div style="font-weight:900">Zentryx PRO</div>
          <div style="font-size:13px;color:#cbd5e1">
            ${limpiar(u.usuario)} · ${limpiar(u.rol)}
          </div>
        </div>
      </div>
      <button id="zx_salir">Salir</button>
    </div>
  `;

  document.body.insertBefore(t,app());

  $("zx_salir").onclick=function(){
    localStorage.clear();
    location.href="index.html?v="+ZX_VERSION;
  };
}

// ===============================
// RELOJ + ICONO AGENDA
// ===============================
function relojGlobal(){
  const r=document.createElement("div");
  r.id="zx_reloj_global";

  r.innerHTML=`
    <div>
      <div id="zx_reloj_fecha"></div>
      <div id="zx_reloj_hora"></div>
    </div>

    <div id="zx_icono_agenda" onclick="ZX_abrirAgendaHoy()">
      📅
    </div>
  `;

  document.body.insertBefore(r,app());

  actualizarReloj();
  setInterval(actualizarReloj,1000);

  actualizarContadorAgenda();
  setInterval(actualizarContadorAgenda,60000);
}

function actualizarReloj(){
  const d=new Date();

  if($("zx_reloj_fecha")){
    $("zx_reloj_fecha").textContent=d.toLocaleDateString("es-ES",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
  }

  if($("zx_reloj_hora")){
    $("zx_reloj_hora").textContent=d.toLocaleTimeString("es-ES");
  }
}

// ===============================
// CONTADOR AGENDA
// ===============================
async function actualizarContadorAgenda(){
  const el=$("zx_icono_agenda");
  if(!el) return;

  try{
    const hoy=new Date().toISOString().slice(0,10);

    const r=await sb()
      .from("agenda_eventos")
      .select("id")
      .lte("fecha_inicio",hoy)
      .gte("fecha_fin",hoy)
      .neq("estado","completado");

    if(r.error){
      el.textContent="📅";
      return;
    }

    const total=(r.data || []).length;

    el.textContent= total>0 ? "📅 "+total : "📅";

  }catch(e){
    el.textContent="📅";
  }
}
// ===============================
// AGENDA HOY
// ===============================
async function eventosHoy(){
  const hoy=new Date().toISOString().slice(0,10);

  const r=await sb()
    .from("agenda_eventos")
    .select("*")
    .lte("fecha_inicio",hoy)
    .gte("fecha_fin",hoy)
    .neq("estado","completado")
    .order("hora_inicio",{ascending:true});

  if(r.error){
    alert("Error cargando agenda: "+r.error.message);
    return [];
  }

  return r.data || [];
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
    baja_medica:"Baja médica"
  };

  return m[t] || t || "Evento";
}

function renderEventoHoy(e){
  const hora=e.hora_inicio ? String(e.hora_inicio).slice(0,5) : "Sin hora";
  const icono=e.tipo==="recordatorio" ? "📝" : "📅";

  return `
    <div style="
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:12px;
    ">
      <div style="font-size:18px;font-weight:900;color:#0f172a;">
        ${icono} ${limpiar(e.titulo || "Evento")}
      </div>

      <div style="margin-top:8px;color:#64748b;font-size:15px;font-weight:800;line-height:1.45;">
        ${limpiar(hora)} · ${limpiar(textoTipo(e.tipo))}
        ${e.usuario ? "<br>Operario: "+limpiar(e.usuario) : ""}
        ${e.cliente ? "<br>Cliente: "+limpiar(e.cliente) : ""}
        ${e.vehiculo ? "<br>Vehículo: "+limpiar(e.vehiculo) : ""}
      </div>

      ${
        e.descripcion
        ? `<div style="margin-top:8px;color:#475569;font-size:15px;font-weight:700;line-height:1.45;">
            ${limpiar(e.descripcion)}
          </div>`
        : ""
      }
    </div>
  `;
}

window.ZX_abrirAgendaHoy=async function(){
  const anterior=$("zx_modal_agenda_hoy");
  if(anterior) anterior.remove();

  const modal=document.createElement("div");
  modal.id="zx_modal_agenda_hoy";

  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Agenda de hoy</h2>

        <div id="zx_agenda_hoy_lista" class="zx_text">
          Cargando...
        </div>

        <button class="zx_btn_big zx_verde" onclick="ZX_abrirAgendaDesdePanel()">
          Abrir Agenda
        </button>

        <button class="zx_btn_big zx_gris" onclick="document.getElementById('zx_modal_agenda_hoy').remove()">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const lista=$("zx_agenda_hoy_lista");
  const datos=await eventosHoy();

  if(lista){
    lista.innerHTML=datos.length
      ? datos.map(renderEventoHoy).join("")
      : `<div class="zx_text">Sin citas ni notas para hoy.</div>`;
  }
};

window.ZX_abrirAgendaDesdePanel=function(){
  const m=$("zx_modal_agenda_hoy");
  if(m) m.remove();

  if(window.ZX_abrirAgenda){
    window.ZX_abrirAgenda();
  }
};

// ===============================
// MENÚ
// ===============================
function botonNav(modulo,texto,accion){
  return `
    <button class="zx_nav_btn" data-modulo="${modulo}" onclick="${accion}">
      ${texto}
    </button>
  `;
}

function nav(){
  const n=document.createElement("div");
  n.id="zx_nav";

  n.innerHTML=`
    ${botonNav("inicio","Inicio","ZX_inicio()")}
    ${botonNav("fichaje","Fichaje","ZX_abrirFichaje()")}
    ${botonNav("usuarios","Usuarios","ZX_usuarios()")}
    ${botonNav("agenda","Agenda","ZX_abrirAgenda()")}
    ${botonNav("vehiculos","Vehículos","ZX_vehiculos()")}
    ${botonNav("incidencias","Incidencias","ZX_incidencias()")}
    ${botonNav("informes","Informes","ZX_informes()")}
    ${botonNav("configuracion","Configuración","ZX_configuracion()")}
  `;

  document.body.insertBefore(n,app());
}

function activo(nombre){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo===nombre){
      b.classList.add("zx_activo");
    }
  });
}

function abrirModulo(nombre,callback){
  activo(nombre);
  if(callback) callback();
}
// ===============================
// NOTAS RÁPIDAS
// ===============================
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
    <div style="
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px;
      margin-top:12px;
    ">
      <div style="font-size:17px;font-weight:900;color:#0f172a;white-space:pre-wrap;">
        ${limpiar(n.descripcion || n.titulo || "")}
      </div>

      <div style="margin-top:8px;color:#64748b;font-size:14px;font-weight:800;">
        ${limpiar(String(n.fecha_inicio || "").slice(0,10))}
        ${n.hora_inicio ? " · "+limpiar(String(n.hora_inicio).slice(0,5)) : ""}
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

  const notas=await cargarNotas();
  const lista=$("zx_notas_rapidas_lista");

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
  actualizarContadorAgenda();
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
  actualizarContadorAgenda();
};

function botonPostit(){
  const b=document.createElement("button");
  b.id="zx_btn_postit_global";
  b.type="button";
  b.textContent="📝";
  b.onclick=window.ZX_abrirNotasRapidas;

  document.body.appendChild(b);
}

// ===============================
// MÓDULOS
// ===============================
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
        <div class="zx_text">No se ha cargado fichaje.js.</div>
      </div>
    `;
  });
};

window.ZX_abrirAgenda=function(){
  abrirModulo("agenda",function(){
    if(window.ZX_agenda){
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
    if(window.ZX_configLaboral){
      window.ZX_configLaboral();
      return;
    }

    if(window.ZX_config_laboral){
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

// ===============================
// INICIAR LAYOUT
// ===============================
window.ZENTRYX_UI_LAYOUT={
  iniciar:function(){
    limpiarLayoutAnterior();
    estilos();
    topbar();
    relojGlobal();
    nav();
    botonPostit();
  }
};

// ===============================
// FIN
// ===============================
})();
