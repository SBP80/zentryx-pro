// ===============================
// ZENTRYX PRO - TRABAJOS
// V3109 - MATERIALES PRO: SUMA REAL + AUTOCOMPLETADO + EDITAR/BORRAR
// ===============================
(function(){
"use strict";

let ZX_TR_FILTRO="activos";
let ZX_TR_BUSQUEDA="";
let ZX_TR_CACHE=[];

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}

function sesion(){
  try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}
  catch(e){return {}}
}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizarTexto(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function normalizarMaterialClave(v){
  let s=normalizarTexto(v);

  s=s
    .replace(/ø/g," diametro ")
    .replace(/⌀/g," diametro ")
    .replace(/Ø/g," diametro ")
    .replace(/mm/g," ")
    .replace(/[.,;:()_\-/\\]+/g," ")
    .replace(/\s+/g," ")
    .trim();

  s=s.replace(/\bde\s+diametro\s+(\d+)/g,"$1");
  s=s.replace(/\bdiametro\s+(\d+)/g,"$1");
  s=s.replace(/\b(\d+)\s+diametro\b/g,"$1");
  s=s.replace(/\s+/g," ").trim();

  const plurales=[
    ["codos","codo"],
    ["tubos","tubo"],
    ["manguitos","manguito"],
    ["racores","racor"],
    ["llaves","llave"],
    ["valvulas","valvula"],
    ["válvulas","valvula"],
    ["tes","te"],
    ["reducciones","reduccion"]
  ];

  plurales.forEach(p=>{
    s=s.replace(new RegExp("\\b"+p[0]+"\\b","g"),p[1]);
  });

  return s;
}

function materialCoincide(a,b){
  return normalizarMaterialClave(a)===normalizarMaterialClave(b);
}

function rolLocal(){return normalizarTexto(sesion().rol || "")}
function usuarioLocal(){return normalizarTexto(sesion().usuario || "")}

function esAdmin(){return rolLocal()==="administrador" || usuarioLocal()==="admin"}
function esGerente(){return rolLocal()==="gerente"}
function esSupervisor(){return rolLocal()==="supervisor"}
function esEncargado(){return rolLocal()==="encargado"}
function esAdministrativo(){return rolLocal()==="administrativo" || rolLocal()==="oficina"}
function esInvitado(){return rolLocal()==="invitado" || rolLocal()===""}

function puedeEntrarTrabajos(){return !esInvitado()}
function puedeGestionarTrabajos(){return esAdmin() || esGerente() || esSupervisor() || esEncargado() || esAdministrativo()}
function puedeCrearTrabajo(){return puedeGestionarTrabajos()}
function puedeEditarTrabajo(){return puedeGestionarTrabajos()}
function puedeCambiarEstadoTrabajo(){return puedeGestionarTrabajos()}
function puedeArchivarTrabajo(){return esAdmin() || esGerente() || esSupervisor()}
function puedeBorrarTrabajo(){return esAdmin()}
function puedeSubirArchivoTrabajo(){return puedeGestionarTrabajos()}
function puedeModificarMateriales(){return puedeGestionarTrabajos()}
function puedeModificarHistorial(){return puedeGestionarTrabajos()}
function puedeVerPrecios(){return esAdmin() || esGerente()}

function puedeVerArchivoTrabajo(a){
  if(!a) return false;
  const tipo=normalizarTexto(a.tipo || "");
  if(["factura","albaran","albarán","presupuesto","economico","económico","coste"].includes(tipo)){
    return puedeVerPrecios();
  }
  return true;
}

function hoy(){
  return new Date().toISOString().slice(0,10);
}

function normalizarFecha(f){
  if(!f) return "";
  const s=String(f).trim();

  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);

  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){
    const p=s.split("/");
    return p[2]+"-"+p[1]+"-"+p[0];
  }

  return s.slice(0,10);
}

function formatoFechaES(f){
  const x=normalizarFecha(f);
  if(!x) return "";
  const p=x.split("-");
  if(p.length!==3) return x;
  return p[2]+"/"+p[1]+"/"+p[0];
}

function minHora(h){
  if(!h) return null;
  const p=String(h).slice(0,5).split(":");
  if(p.length!==2) return null;

  const hh=Number(p[0]);
  const mm=Number(p[1]);

  if(Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh*60+mm;
}

function rangosSolapan(aInicio,aFin,bInicio,bFin){
  const ai=minHora(aInicio);
  const af=minHora(aFin);
  const bi=minHora(bInicio);
  const bf=minHora(bFin);

  if(ai===null || af===null || bi===null || bf===null) return false;
  return ai<bf && bi<af;
}

function mismoDiaEvento(e,fecha){
  const f=normalizarFecha(fecha);
  const ini=normalizarFecha(e.fecha_inicio);
  const fin=normalizarFecha(e.fecha_fin || e.fecha_inicio);

  if(!f || !ini) return false;
  return f>=ini && f<=fin;
}

function mismoOperario(e,p){
  const idEvento=String(e.usuario_id || "").trim();
  const idPlan=String(p.usuario_id || "").trim();

  if(idEvento && idPlan) return idEvento===idPlan;

  const nomEvento=String(e.usuario || "").trim().toLowerCase();
  const nomPlan=String(p.nombre || p.usuario || "").trim().toLowerCase();

  if(nomEvento && nomPlan) return nomEvento===nomPlan;
  return false;
}

async function comprobarSolapesPlanificacion(planificacion,trabajoIdActual=null){
  const filas=planificacion.map(p=>({
    ...p,
    fecha:normalizarFecha(p.fecha),
    hora_inicio:p.hora_inicio ? String(p.hora_inicio).slice(0,5) : null,
    hora_fin:p.hora_fin ? String(p.hora_fin).slice(0,5) : null
  }));

  for(let i=0;i<filas.length;i++){
    const p=filas[i];

    if(!p.fecha || !p.hora_inicio || !p.hora_fin || !p.usuario_id) continue;

    if(minHora(p.hora_fin)<=minHora(p.hora_inicio)){
      alert("La hora fin debe ser posterior a la hora inicio.");
      return false;
    }

    const interno=filas.find((x,idx)=>{
      if(idx===i) return false;
      if(!x.fecha || !x.hora_inicio || !x.hora_fin || !x.usuario_id) return false;
      if(normalizarFecha(x.fecha)!==p.fecha) return false;
      if(String(x.usuario_id)!==String(p.usuario_id)) return false;
      return rangosSolapan(p.hora_inicio,p.hora_fin,x.hora_inicio,x.hora_fin);
    });

    if(interno){
      alert(
        "El operario está repetido en la planificación del mismo trabajo:\n\n"+
        (p.nombre || p.usuario || "Operario")+"\n"+
        formatoFechaES(p.fecha)+" · "+p.hora_inicio+" - "+p.hora_fin
      );
      return false;
    }

    const r=await sb()
      .from("agenda_eventos")
      .select("*")
      .lte("fecha_inicio",p.fecha)
      .gte("fecha_fin",p.fecha)
      .neq("estado","cancelado");

    if(r.error){
      alert("Error comprobando solapes: "+r.error.message);
      return false;
    }

    const eventos=(r.data || []).filter(e=>{
      if(!mismoDiaEvento(e,p.fecha)) return false;

      if(String(e.origen)==="trabajos" && String(e.origen_id)===String(trabajoIdActual || "")){
        return false;
      }

      return true;
    });

    const solape=eventos.find(e=>{
      if(!mismoOperario(e,p)) return false;
      return rangosSolapan(p.hora_inicio,p.hora_fin,e.hora_inicio,e.hora_fin);
    });

    if(solape){
      alert(
        "El operario ya tiene otro evento en ese horario:\n\n"+
        (p.nombre || p.usuario || "Operario")+"\n"+
        formatoFechaES(p.fecha)+" · "+p.hora_inicio+" - "+p.hora_fin+"\n\n"+
        "Evento existente: "+(solape.titulo || "Evento")+" "+
        formatoFechaES(solape.fecha_inicio)+" · "+
        String(solape.hora_inicio || "").slice(0,5)+" - "+
        String(solape.hora_fin || "").slice(0,5)
      );
      return false;
    }
  }

  return true;
}

function cerrarModalTrabajo(){
  const m=document.getElementById("zx_modal_trabajo");
  if(m) m.remove();
}

function telefonoLimpio(tel){
  let n=String(tel||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
}

function direccionCliente(c){
  return [
    c.via_tipo,
    c.direccion,
    c.numero ? "Nº "+c.numero : "",
    c.portal ? "Portal "+c.portal : "",
    c.escalera ? "Esc. "+c.escalera : "",
    c.piso ? "Piso "+c.piso : "",
    c.puerta ? "Puerta "+c.puerta : "",
    c.poblacion,
    c.provincia,
    c.codigo_postal,
    c.pais
  ].filter(Boolean).join(", ");
}

function direccionTrabajo(t){
  return [
    t.direccion_obra || t.direccion,
    t.poblacion,
    t.provincia,
    t.codigo_postal,
    t.pais
  ].filter(Boolean).join(", ");
}

function input(id,label,value,type){
  return `
    <label class="zx_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

async function cargarClientes(){
  const r=await sb()
    .from("clientes")
    .select("*")
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarUsuarios(){
  const r=await sb()
    .from("usuarios")
    .select("*")
    .eq("activo",true)
    .order("nombre",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarTrabajos(){
  if(!puedeEntrarTrabajos()){
    app().innerHTML=`
      <div class="zx_card">
        <h2>Trabajos</h2>
        <div class="zx_text">No tienes permiso para acceder a Trabajos.</div>
      </div>
    `;
    return [];
  }

  let q=sb()
    .from("trabajos")
    .select("*");

  if(ZX_TR_FILTRO==="activos") q=q.eq("archivado",false);
  if(ZX_TR_FILTRO==="archivados") q=q.eq("archivado",true);
  if(ZX_TR_FILTRO==="pendientes") q=q.eq("archivado",false).eq("estado","pendiente");
  if(ZX_TR_FILTRO==="curso") q=q.eq("archivado",false).eq("estado","en_curso");
  if(ZX_TR_FILTRO==="terminados") q=q.eq("archivado",false).eq("estado","terminado");
  if(ZX_TR_FILTRO==="urgentes") q=q.eq("archivado",false).eq("prioridad","urgente");

  q=q.order("fecha",{ascending:true}).order("hora_inicio",{ascending:true});

  const r=await q;

  if(r.error){
    alert("Error cargando trabajos: "+r.error.message);
    return [];
  }

  ZX_TR_CACHE=r.data || [];
  return filtrarTrabajos();
}

async function cargarTodosTrabajos(){
  const r=await sb()
    .from("trabajos")
    .select("*");

  if(r.error) return [];
  return r.data || [];
}

function textoBusquedaTrabajo(t){
  return normalizarTexto([
    t.titulo,
    t.cliente,
    t.usuario,
    t.persona_contacto,
    t.telefono_contacto,
    t.direccion_obra,
    t.direccion,
    t.poblacion,
    t.provincia,
    t.codigo_postal,
    t.pais,
    t.descripcion,
    t.notas,
    t.estado,
    t.prioridad
  ].join(" "));
}

function filtrarTrabajos(){
  let datos=ZX_TR_CACHE || [];
  const b=String(ZX_TR_BUSQUEDA || "").trim();

  if(b){
    datos=datos.filter(t=>textoBusquedaTrabajo(t).includes(normalizarTexto(b)));
  }

  return datos;
}

async function cargarPlanificacion(trabajoId){
  if(!trabajoId) return [];

  const r=await sb()
    .from("trabajos_planificacion")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});

  if(r.error) return [];
  return r.data || [];
}

async function cargarArchivos(trabajoId){
  if(!trabajoId) return [];

  const r=await sb()
    .from("trabajos_archivos")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("created_at",{ascending:false});

  if(r.error) return [];
  return (r.data || []).filter(puedeVerArchivoTrabajo);
}

async function cargarMateriales(trabajoId){
  if(!trabajoId) return [];

  const r=await sb()
    .from("trabajos_materiales")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("created_at",{ascending:false});

  if(r.error) return [];
  return r.data || [];
}

async function cargarHistorial(trabajoId){
  if(!trabajoId) return [];

  const r=await sb()
    .from("trabajos_historial")
    .select("*")
    .eq("trabajo_id",String(trabajoId))
    .order("fecha",{ascending:false})
    .order("hora_inicio",{ascending:false});

  if(r.error) return [];
  return r.data || [];
}

function textoEstado(e){
  if(e==="pendiente") return "Pendiente";
  if(e==="en_curso") return "En curso";
  if(e==="terminado") return "Terminado";
  if(e==="bloqueado") return "Bloqueado";
  return e || "-";
}

function textoPrioridad(p){
  if(p==="baja") return "Baja";
  if(p==="media") return "Media";
  if(p==="alta") return "Alta";
  if(p==="urgente") return "Urgente";
  return p || "Media";
}

function claseEstado(e){
  if(e==="pendiente") return "zx_estado_pendiente";
  if(e==="en_curso") return "zx_estado_curso";
  if(e==="terminado") return "zx_estado_terminado";
  if(e==="bloqueado") return "zx_estado_bloqueado";
  return "zx_estado_neutro";
}

function clasePrioridad(p){
  if(p==="baja") return "zx_prio_baja";
  if(p==="media") return "zx_prio_media";
  if(p==="alta") return "zx_prio_alta";
  if(p==="urgente") return "zx_prio_urgente";
  return "zx_prio_media";
}

function claseTarjeta(t){
  const p=String(t.prioridad || "media");
  const e=String(t.estado || "pendiente");

  if(t.archivado) return "zx_tr_card_archivado";
  if(e==="bloqueado") return "zx_tr_card_bloqueado";
  if(p==="urgente") return "zx_tr_card_urgente";
  if(p==="alta") return "zx_tr_card_alta";
  if(e==="terminado") return "zx_tr_card_terminado";

  return "";
}

function hashPin(pin){
  return btoa(String(pin));
}

async function registrarAuditoriaTrabajo(trabajo,accion,datosExtra={}){
  const s=sesion();

  try{
    await sb()
      .from("trabajos_auditoria")
      .insert([{
        trabajo_id:String(trabajo?.id || ""),
        titulo:String(trabajo?.titulo || ""),
        accion:String(accion || ""),
        usuario_id:String(s.id || ""),
        usuario:String(s.usuario || ""),
        datos:datosExtra
      }]);
  }catch(e){}
}

async function pedirPinAdmin(){
  return new Promise(function(resolve){
    cerrarModalTrabajo();

    document.body.insertAdjacentHTML("beforeend",`
      <div id="zx_modal_trabajo" class="zx_modal_fondo">
        <div class="zx_modal_caja">
          <h2>PIN administrador</h2>

          <div class="zx_text">Introduce el PIN para continuar.</div>
          <input id="tr_pin_admin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN">

          <button class="zx_btn_big zx_verde" id="tr_pin_ok">Confirmar</button>
          <button class="zx_btn_big zx_gris" id="tr_pin_cancelar">Cancelar</button>
        </div>
      </div>
    `);

    document.getElementById("tr_pin_cancelar").onclick=function(){
      cerrarModalTrabajo();
      resolve(false);
    };

    document.getElementById("tr_pin_ok").onclick=async function(){
      const pin=document.getElementById("tr_pin_admin").value.trim();

      if(!/^[0-9]{4}$/.test(pin)){
        alert("PIN inválido.");
        return;
      }

      const s=sesion();

      const r=await sb()
        .from("usuarios")
        .select("id,usuario,rol,pin_hash")
        .eq("id",s.id)
        .maybeSingle();

      if(r.error || !r.data){
        alert("No se pudo validar el usuario.");
        return;
      }

      const rol=normalizarTexto(r.data.rol || "");
      const usuario=normalizarTexto(r.data.usuario || "");
      const admin=rol==="administrador" || usuario==="admin";

      if(!admin){
        alert("Solo administrador.");
        return;
      }

      if(hashPin(pin)!==r.data.pin_hash){
        alert("PIN incorrecto.");
        return;
      }

      cerrarModalTrabajo();
      resolve(true);
    };
  });
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);

  if(!n){
    alert("Sin teléfono.");
    return;
  }

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Teléfono</h2>

        <button class="zx_btn_big zx_azul" id="tr_tel_llamar">Llamar</button>
        <button class="zx_btn_big zx_verde" id="tr_tel_sms">SMS</button>
        <button class="zx_btn_big zx_verde" id="tr_tel_was">WhatsApp</button>
        <button class="zx_btn_big zx_gris" id="tr_tel_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_tel_llamar").onclick=function(){location.href="tel:"+n};
  document.getElementById("tr_tel_sms").onclick=function(){location.href="sms:"+n};
  document.getElementById("tr_tel_was").onclick=function(){location.href="https://wa.me/"+n.replace("+","")};
  document.getElementById("tr_tel_cerrar").onclick=cerrarModalTrabajo;
}

function menuMapa(dir){
  if(!dir){
    alert("Sin dirección.");
    return;
  }

  const q=encodeURIComponent(dir);

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Mapa</h2>

        <button class="zx_btn_big zx_azul" id="tr_map_apple">Apple Maps</button>
        <button class="zx_btn_big zx_verde" id="tr_map_google">Google Maps</button>
        <button class="zx_btn_big zx_naranja" id="tr_map_waze">Waze</button>
        <button class="zx_btn_big zx_gris" id="tr_map_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_map_apple").onclick=function(){location.href="https://maps.apple.com/?q="+q};
  document.getElementById("tr_map_google").onclick=function(){location.href="https://www.google.com/maps/search/?api=1&query="+q};
  document.getElementById("tr_map_waze").onclick=function(){location.href="https://waze.com/ul?q="+q};
  document.getElementById("tr_map_cerrar").onclick=cerrarModalTrabajo;
}

function renderPlanificacion(lista){
  if(!lista || !lista.length){
    return `<div class="zx_text">Sin planificación asignada.</div>`;
  }

  return `
    <div class="zx_plan_compact">
      ${lista.map(p=>`
        <div class="zx_plan_row">
          <div class="zx_plan_fecha">${limpiar(formatoFechaES(p.fecha || ""))}</div>
          <div class="zx_plan_hora">
            ${limpiar(p.hora_inicio ? String(p.hora_inicio).slice(0,5) : "--:--")}
            -
            ${limpiar(p.hora_fin ? String(p.hora_fin).slice(0,5) : "--:--")}
          </div>
          <div class="zx_plan_operario">${limpiar(p.nombre || p.usuario || "Operario")}</div>
          ${p.notas ? `<div class="zx_plan_notas">${limpiar(p.notas)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderArchivos(lista){
  if(!lista || !lista.length){
    return `<div class="zx_text">Sin archivos visibles.</div>`;
  }

  return lista.map(a=>`
    <div class="zx_tr_file_item">
      <div>
        <b>${limpiar(a.nombre || "Archivo")}</b><br>
        <span>${limpiar(a.tipo || "-")}</span>
      </div>

      <button class="zx_action_btn zx_blue" data-tr-open-file="${limpiar(a.url || "")}">
        Abrir
      </button>
    </div>
  `).join("");
}

function renderMateriales(lista){
  if(!lista || !lista.length){
    return `<div class="zx_text">Sin materiales.</div>`;
  }

  return lista.map(m=>`
    <div class="zx_tr_mat_item">
      <b>${limpiar(m.material || "Material")}</b><br>
      ${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}
      ${puedeVerPrecios() && m.precio ? `<br><span>Precio: ${limpiar(m.precio)} €</span>` : ""}
      ${puedeVerPrecios() && m.proveedor ? `<br><span>Proveedor: ${limpiar(m.proveedor)}</span>` : ""}
      ${puedeVerPrecios() && m.referencia ? `<br><span>Referencia: ${limpiar(m.referencia)}</span>` : ""}
      ${m.notas ? "<br>"+limpiar(m.notas) : ""}
    </div>
  `).join("");
}

function renderHistorial(lista){
  if(!lista || !lista.length){
    return `<div class="zx_text">Sin historial.</div>`;
  }

  return lista.map(h=>`
    <div class="zx_tr_hist_item">
      <b>${limpiar(h.usuario || "Usuario")}</b><br>
      ${limpiar(formatoFechaES(h.fecha || ""))}
      ${h.hora_inicio ? " · "+limpiar(String(h.hora_inicio).slice(0,5)) : ""}
      ${h.hora_fin ? " - "+limpiar(String(h.hora_fin).slice(0,5)) : ""}
      <br>
      Tipo: ${limpiar(h.tipo || "-")}
      ${h.notas ? "<br>"+limpiar(h.notas) : ""}
    </div>
  `).join("");
}

function separarArchivosObra(lista){
  const grupos={planos:[],fotos:[],videos:[],manuales:[],otros:[]};

  (lista || []).forEach(a=>{
    const tipo=normalizarTexto(a.tipo || "");
    const nombre=normalizarTexto(a.nombre || "");
    const url=normalizarTexto(a.url || "");

    if(tipo.includes("plano") || nombre.includes("plano")){grupos.planos.push(a);return}
    if(tipo.includes("imagen") || tipo.includes("foto") || /\.(jpg|jpeg|png|webp|gif)$/i.test(url)){grupos.fotos.push(a);return}
    if(tipo.includes("video") || tipo.includes("vídeo") || /\.(mp4|mov|webm|m4v)$/i.test(url)){grupos.videos.push(a);return}
    if(tipo.includes("manual") || nombre.includes("manual")){grupos.manuales.push(a);return}
    grupos.otros.push(a);
  });

  return grupos;
}

function renderBotonesArchivoObra(titulo,lista,icono){
  if(!lista || !lista.length) return "";

  return `
    <div class="zx_obra_file_group">
      <h3>${limpiar(icono)} ${limpiar(titulo)}</h3>
      ${lista.map(a=>`
        <button class="zx_obra_file_btn" data-tr-open-file="${limpiar(a.url || "")}">
          <b>${limpiar(a.nombre || titulo)}</b>
          <span>${limpiar(a.tipo || "")}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderMaterialesObra(lista){
  if(!lista || !lista.length) return `<div class="zx_text">Sin materiales asignados.</div>`;

  return `
    <div class="zx_obra_materiales">
      ${lista.map(m=>`
        <label class="zx_obra_mat_check">
          <input type="checkbox" disabled>
          <span>
            <b>${limpiar(m.material || "Material")}</b>
            <em>${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}</em>
            ${m.notas ? `<small>${limpiar(m.notas)}</small>` : ""}
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

async function renderTrabajoObra(t){
  const dir=direccionTrabajo(t);
  const plan=await cargarPlanificacion(t.id);
  const archivos=await cargarArchivos(t.id);
  const materiales=await cargarMateriales(t.id);
  const grupos=separarArchivosObra(archivos);
  const prioridad=t.prioridad || "media";

  return `
    <div class="zx_obra_card ${claseTarjeta(t)}">
      <div class="zx_obra_top">
        <div>
          <div class="zx_obra_hora">
            ${plan.length ? limpiar(String(plan[0].hora_inicio || "").slice(0,5) || "--:--")+" - "+limpiar(String(plan[0].hora_fin || "").slice(0,5) || "--:--") : ""}
          </div>
          <div class="zx_obra_titulo">${limpiar(t.titulo || "Trabajo")}</div>
          <div class="zx_obra_cliente">${limpiar(t.cliente || "-")}</div>
        </div>
        <span class="zx_badge ${clasePrioridad(prioridad)}">${limpiar(textoPrioridad(prioridad))}</span>
      </div>

      <div class="zx_obra_direccion">${dir ? limpiar(dir) : "Sin dirección"}</div>

      <div class="zx_obra_botones">
        ${t.telefono_contacto ? `<button class="zx_obra_big_btn" data-tr-tel="${limpiar(t.telefono_contacto)}">📞 Llamar</button>` : ""}
        ${dir ? `<button class="zx_obra_big_btn" data-tr-map="${limpiar(dir)}">🗺️ Mapa</button>` : ""}
        ${grupos.planos.length ? `<button class="zx_obra_big_btn" data-obra-jump="planos">📄 Planos</button>` : ""}
        ${grupos.fotos.length ? `<button class="zx_obra_big_btn" data-obra-jump="fotos">📷 Fotos</button>` : ""}
        ${grupos.videos.length ? `<button class="zx_obra_big_btn" data-obra-jump="videos">🎥 Vídeos</button>` : ""}
        <button class="zx_obra_big_btn" data-tr-obra-materiales="${limpiar(t.id)}">📦 Materiales</button>
      </div>

      <details class="zx_obra_section" open>
        <summary>Planificación</summary>
        ${renderPlanificacion(plan)}
      </details>

      <details class="zx_obra_section" open>
        <summary>Descripción y notas</summary>
        <div class="zx_user_data">
          <b>Descripción:</b> ${limpiar(t.descripcion || "-")}<br>
          <b>Notas técnicas:</b> ${limpiar(t.notas || "-")}
        </div>
      </details>

      <details class="zx_obra_section" data-obra-section="planos" ${grupos.planos.length ? "open" : ""}>
        <summary>Planos</summary>
        ${renderBotonesArchivoObra("Planos",grupos.planos,"📄") || `<div class="zx_text">Sin planos.</div>`}
      </details>

      <details class="zx_obra_section" data-obra-section="fotos">
        <summary>Fotos</summary>
        ${renderBotonesArchivoObra("Fotos",grupos.fotos,"📷") || `<div class="zx_text">Sin fotos.</div>`}
      </details>

      <details class="zx_obra_section" data-obra-section="videos">
        <summary>Vídeos</summary>
        ${renderBotonesArchivoObra("Vídeos",grupos.videos,"🎥") || `<div class="zx_text">Sin vídeos.</div>`}
      </details>

      <details class="zx_obra_section">
        <summary>Manuales y otros documentos</summary>
        ${renderBotonesArchivoObra("Manuales",grupos.manuales,"📘")}
        ${renderBotonesArchivoObra("Otros",grupos.otros,"📎") || (!grupos.manuales.length ? `<div class="zx_text">Sin documentos.</div>` : "")}
      </details>

      <details class="zx_obra_section" data-obra-section="materiales" open>
        <summary>Materiales</summary>
        <div class="zx_obra_material_actions">
          <button class="zx_action_btn zx_blue" data-tr-print-materiales="${limpiar(t.id)}">Imprimir lista</button>
          <button class="zx_action_btn zx_blue" data-tr-share-materiales="${limpiar(t.id)}">Enviar lista</button>
        </div>
        ${renderMaterialesObra(materiales)}
      </details>
    </div>
  `;
}

async function renderTrabajo(t){
  if(!puedeGestionarTrabajos()){
    return await renderTrabajoObra(t);
  }

  const dir=direccionTrabajo(t);
  const plan=await cargarPlanificacion(t.id);
  const archivos=await cargarArchivos(t.id);
  const materiales=await cargarMateriales(t.id);
  const historial=await cargarHistorial(t.id);
  const prioridad=t.prioridad || "media";

  return `
    <div class="zx_user_card zx_tr_card ${claseTarjeta(t)}">
      <div class="zx_tr_header">
        <div>
          <div class="zx_user_name">${limpiar(t.titulo || "Trabajo")}</div>

          <div class="zx_tr_badges">
            <span class="zx_badge ${claseEstado(t.estado)}">${limpiar(textoEstado(t.estado))}</span>
            <span class="zx_badge ${clasePrioridad(prioridad)}">${limpiar(textoPrioridad(prioridad))}</span>
            ${t.archivado ? `<span class="zx_badge zx_archivado_badge">Archivado</span>` : ""}
          </div>
        </div>
      </div>

      <div class="zx_user_data">
        <b>Cliente:</b> ${limpiar(t.cliente || "-")}<br>
        <b>Contacto obra:</b> ${limpiar(t.persona_contacto || "-")}<br>
        <b>Teléfono contacto:</b> ${limpiar(t.telefono_contacto || "-")}<br>
        <b>Dirección obra:</b>
        ${
          dir
          ? `<button class="zx_link_dir" data-tr-map="${limpiar(dir)}">${limpiar(dir)}</button>`
          : "-"
        }<br>
        <b>Descripción:</b> ${limpiar(t.descripcion || "-")}<br>
        <b>Notas técnicas:</b> ${limpiar(t.notas || "-")}
      </div>

      <div class="zx_tr_panel">
        <h3>Planificación</h3>
        ${renderPlanificacion(plan)}
      </div>

      <div class="zx_tr_panel">
        <h3>Archivos de obra</h3>
        ${renderArchivos(archivos)}
        ${puedeSubirArchivoTrabajo() ? `<button class="zx_btn_big zx_azul" data-tr-add-file="${limpiar(t.id)}">Añadir archivo</button>` : ""}
      </div>

      <div class="zx_tr_panel">
        <h3>Materiales</h3>
        <div class="zx_obra_material_actions">
          <button class="zx_action_btn zx_blue" data-tr-obra-materiales="${limpiar(t.id)}">Anotar / ver lista</button>
          <button class="zx_action_btn zx_blue" data-tr-print-materiales="${limpiar(t.id)}">Imprimir</button>
        </div>
        ${renderMateriales(materiales)}
      </div>

      <div class="zx_tr_panel">
        <h3>Historial</h3>
        ${renderHistorial(historial)}
        ${puedeModificarHistorial() ? `<button class="zx_btn_big zx_azul" data-tr-add-historial="${limpiar(t.id)}">Añadir historial</button>` : ""}
      </div>

      <div class="zx_user_actions">
        ${puedeCambiarEstadoTrabajo() ? `<button class="zx_action_btn ${claseEstado(t.estado)}" data-tr-estado="${limpiar(t.id)}">Cambiar estado</button>` : ""}
        ${t.telefono_contacto ? `<button class="zx_action_btn zx_blue" data-tr-tel="${limpiar(t.telefono_contacto)}">Teléfono</button>` : ""}
        ${dir ? `<button class="zx_action_btn zx_blue" data-tr-map="${limpiar(dir)}">Mapa</button>` : ""}
        ${puedeEditarTrabajo() ? `<button class="zx_action_btn zx_blue" data-tr-edit="${limpiar(t.id)}">Editar</button>` : ""}
        ${(puedeArchivarTrabajo() || puedeBorrarTrabajo()) ? `<button class="zx_action_btn zx_red" data-tr-del="${limpiar(t.id)}">Gestionar</button>` : ""}
      </div>
    </div>
  `;
}

function filaPlanificacionHTML(i,usuarios,p={}){
  return `
    <div class="zx_tr_plan_form zx_plan_form_compact" data-plan-row="${i}">
      <div class="zx_plan_form_grid">
        <div>
          <label class="zx_label">Fecha</label>
          <input type="date" class="tr_plan_fecha" value="${limpiar(normalizarFecha(p.fecha || hoy()))}">
        </div>

        <div>
          <label class="zx_label">Inicio</label>
          <input type="time" class="tr_plan_inicio" value="${limpiar(p.hora_inicio ? String(p.hora_inicio).slice(0,5) : "")}">
        </div>

        <div>
          <label class="zx_label">Fin</label>
          <input type="time" class="tr_plan_fin" value="${limpiar(p.hora_fin ? String(p.hora_fin).slice(0,5) : "")}">
        </div>
      </div>

      <label class="zx_label">Operario</label>
      <select class="tr_plan_usuario">
        <option value="">Seleccionar operario</option>
        ${usuarios.map(u=>`
          <option value="${limpiar(u.id)}"
            data-usuario="${limpiar(u.usuario || "")}"
            data-nombre="${limpiar(u.nombre || u.usuario || "")}"
            ${String(p.usuario_id||"")===String(u.id) ? "selected" : ""}>
            ${limpiar(u.nombre || u.usuario || "")}
          </option>
        `).join("")}
      </select>

      <details class="zx_plan_details">
        <summary>Notas de esta línea</summary>
        <textarea class="tr_plan_notas" rows="2" placeholder="Notas para este día/operario">${limpiar(p.notas || "")}</textarea>
      </details>

      <div class="zx_plan_buttons">
        <button class="zx_action_btn zx_blue tr_plan_duplicar" type="button">Duplicar</button>
        <button class="zx_action_btn zx_red tr_plan_borrar" type="button">Quitar</button>
      </div>
    </div>
  `;
}

function leerPlanificacionFormulario(){
  const filas=[...document.querySelectorAll("[data-plan-row]")];

  return filas.map(row=>{
    const sel=row.querySelector(".tr_plan_usuario");
    const opt=sel.options[sel.selectedIndex];

    return {
      fecha:normalizarFecha(row.querySelector(".tr_plan_fecha").value),
      hora_inicio:row.querySelector(".tr_plan_inicio").value || null,
      hora_fin:row.querySelector(".tr_plan_fin").value || null,
      usuario_id:sel.value || null,
      usuario:opt ? opt.dataset.usuario || "" : "",
      nombre:opt ? opt.dataset.nombre || "" : "",
      notas:row.querySelector(".tr_plan_notas").value.trim()
    };
  }).filter(p=>p.fecha && p.usuario_id);
}

async function formulario(t={}){
  if(t.id && !puedeEditarTrabajo()){
    alert("No tienes permiso para editar trabajos.");
    return;
  }

  if(!t.id && !puedeCrearTrabajo()){
    alert("No tienes permiso para crear trabajos.");
    return;
  }

  const clientes=await cargarClientes();
  const usuarios=await cargarUsuarios();
  const planExistente=await cargarPlanificacion(t.id);

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${t.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>

        ${input("tr_titulo","Título",t.titulo)}

        <label class="zx_label" for="tr_prioridad">Prioridad</label>
        <select id="tr_prioridad">
          <option value="baja" ${t.prioridad==="baja" ? "selected" : ""}>Baja</option>
          <option value="media" ${!t.prioridad || t.prioridad==="media" ? "selected" : ""}>Media</option>
          <option value="alta" ${t.prioridad==="alta" ? "selected" : ""}>Alta</option>
          <option value="urgente" ${t.prioridad==="urgente" ? "selected" : ""}>Urgente</option>
        </select>

        <label class="zx_label" for="tr_cliente">Cliente</label>
        <select id="tr_cliente">
          <option value="">Sin cliente</option>
          ${clientes.map(c=>`
            <option value="${limpiar(c.id)}" ${String(t.cliente_id||"")===String(c.id) ? "selected" : ""}>
              ${limpiar(c.nombre || "")}
            </option>
          `).join("")}
        </select>

        ${input("tr_persona_contacto","Persona contacto obra",t.persona_contacto)}
        ${input("tr_telefono_contacto","Teléfono contacto obra",t.telefono_contacto,"tel")}

        <h3 class="zx_form_subtitle">Dirección cliente</h3>
        <textarea id="tr_direccion_cliente" rows="3" readonly>${limpiar(t.direccion_cliente || "")}</textarea>

        <h3 class="zx_form_subtitle">Dirección de obra</h3>
        <div class="zx_text">Puede ser distinta a la dirección del cliente.</div>

        ${input("tr_direccion_obra","Dirección obra",t.direccion_obra || t.direccion)}
        ${input("tr_poblacion","Población",t.poblacion)}
        ${input("tr_provincia","Provincia",t.provincia)}
        ${input("tr_codigo_postal","Código postal",t.codigo_postal)}
        ${input("tr_pais","País",t.pais || "España")}

        <button class="zx_btn_big zx_azul" id="tr_copiar_direccion" type="button">
          Usar dirección del cliente como obra
        </button>

        <h3 class="zx_form_subtitle">Planificación</h3>
        <div class="zx_text">Añade días, horarios y operarios.</div>

        <div id="tr_plan_lista">
          ${
            planExistente.length
            ? planExistente.map((p,i)=>filaPlanificacionHTML(i,usuarios,p)).join("")
            : filaPlanificacionHTML(0,usuarios,{})
          }
        </div>

        <button class="zx_btn_big zx_azul" id="tr_add_plan" type="button">
          Añadir día / operario
        </button>

        <label class="zx_label" for="tr_descripcion">Descripción</label>
        <textarea id="tr_descripcion" rows="4" placeholder="Descripción">${limpiar(t.descripcion || "")}</textarea>

        <label class="zx_label" for="tr_notas">Notas internas</label>
        <textarea id="tr_notas" rows="4" placeholder="Notas">${limpiar(t.notas || "")}</textarea>

        <button class="zx_btn_big zx_verde" id="tr_guardar">Guardar trabajo</button>
        <button class="zx_btn_big zx_gris" id="tr_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  const sel=document.getElementById("tr_cliente");

  function limpiarCamposCliente(){
    document.getElementById("tr_direccion_cliente").value="";
    document.getElementById("tr_persona_contacto").value="";
    document.getElementById("tr_telefono_contacto").value="";
    document.getElementById("tr_direccion_obra").value="";
    document.getElementById("tr_poblacion").value="";
    document.getElementById("tr_provincia").value="";
    document.getElementById("tr_codigo_postal").value="";
    document.getElementById("tr_pais").value="España";
  }

  function cargarDatosCliente(){
    const c=clientes.find(x=>String(x.id)===String(sel.value));

    if(!c){
      limpiarCamposCliente();
      return;
    }

    document.getElementById("tr_direccion_cliente").value=direccionCliente(c);
    document.getElementById("tr_persona_contacto").value=c.persona_contacto || "";
    document.getElementById("tr_telefono_contacto").value=c.telefono || "";

    document.getElementById("tr_direccion_obra").value=c.direccion || "";
    document.getElementById("tr_poblacion").value=c.poblacion || "";
    document.getElementById("tr_provincia").value=c.provincia || "";
    document.getElementById("tr_codigo_postal").value=c.codigo_postal || "";
    document.getElementById("tr_pais").value=c.pais || "España";
  }

  sel.onchange=cargarDatosCliente;

  document.getElementById("tr_copiar_direccion").onclick=function(){
    const c=clientes.find(x=>String(x.id)===String(sel.value));

    if(!c){
      alert("Selecciona un cliente.");
      return;
    }

    document.getElementById("tr_direccion_obra").value=c.direccion || "";
    document.getElementById("tr_poblacion").value=c.poblacion || "";
    document.getElementById("tr_provincia").value=c.provincia || "";
    document.getElementById("tr_codigo_postal").value=c.codigo_postal || "";
    document.getElementById("tr_pais").value=c.pais || "España";
  };

  if(t.cliente_id){
    const c=clientes.find(x=>String(x.id)===String(t.cliente_id));
    if(c && !t.direccion_cliente){
      document.getElementById("tr_direccion_cliente").value=direccionCliente(c);
    }
  }

  document.getElementById("tr_add_plan").onclick=function(){
    const cont=document.getElementById("tr_plan_lista");
    const i=document.querySelectorAll("[data-plan-row]").length;
    cont.insertAdjacentHTML("beforeend",filaPlanificacionHTML(i,usuarios,{}));
    activarBotonesPlan();
  };

  function activarBotonesPlan(){
    document.querySelectorAll(".tr_plan_borrar").forEach(btn=>{
      btn.onclick=function(){
        const rows=document.querySelectorAll("[data-plan-row]");
        if(rows.length<=1){
          alert("Debe quedar al menos una línea de planificación.");
          return;
        }
        btn.closest("[data-plan-row]").remove();
      };
    });

    document.querySelectorAll(".tr_plan_duplicar").forEach(btn=>{
      btn.onclick=function(){
        const row=btn.closest("[data-plan-row]");
        const cont=document.getElementById("tr_plan_lista");
        const i=document.querySelectorAll("[data-plan-row]").length;

        const p={
          fecha:normalizarFecha(row.querySelector(".tr_plan_fecha").value),
          hora_inicio:row.querySelector(".tr_plan_inicio").value,
          hora_fin:row.querySelector(".tr_plan_fin").value,
          usuario_id:row.querySelector(".tr_plan_usuario").value,
          notas:row.querySelector(".tr_plan_notas").value
        };

        cont.insertAdjacentHTML("beforeend",filaPlanificacionHTML(i,usuarios,p));
        activarBotonesPlan();
      };
    });
  }

  activarBotonesPlan();

  document.getElementById("tr_cancelar").onclick=cerrarModalTrabajo;
  document.getElementById("tr_guardar").onclick=function(){guardarTrabajo(t.id || null,clientes)};
}

async function subirArchivoObra(file,tipo,trabajoId){
  if(!puedeSubirArchivoTrabajo()){
    alert("No tienes permiso para subir archivos.");
    return null;
  }

  if(!file || !trabajoId) return null;

  const limpio=String(file.name || "archivo").replace(/[^a-zA-Z0-9._-]/g,"_");
  const path="trabajos/"+trabajoId+"/"+tipo+"/"+Date.now()+"_"+limpio;

  const r=await sb().storage
    .from("zentryx-trabajos")
    .upload(path,file,{upsert:true});

  if(r.error){
    alert("Error subiendo archivo: "+r.error.message);
    return null;
  }

  return sb().storage
    .from("zentryx-trabajos")
    .getPublicUrl(path).data.publicUrl;
}

window.ZX_tr_add_file=async function(trabajoId){
  if(!puedeSubirArchivoTrabajo()){
    alert("No tienes permiso para añadir archivos.");
    return;
  }

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Añadir archivo</h2>

        <label class="zx_label">Tipo</label>
        <select id="tr_file_tipo">
          <option value="plano">Plano</option>
          <option value="foto">Foto</option>
          <option value="video">Vídeo</option>
          <option value="documento">Documento técnico</option>
          <option value="manual">Manual</option>
          ${puedeVerPrecios() ? `<option value="factura">Factura / albarán</option>` : ""}
          <option value="otro">Otro</option>
        </select>

        <label class="zx_label">Archivo</label>
        <input id="tr_file_archivo" type="file">

        <label class="zx_label">Nombre visible</label>
        <input id="tr_file_nombre" placeholder="Nombre del archivo">

        <button class="zx_btn_big zx_verde" id="tr_file_guardar">Guardar archivo</button>
        <button class="zx_btn_big zx_gris" id="tr_file_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_file_cancelar").onclick=cerrarModalTrabajo;

  document.getElementById("tr_file_guardar").onclick=async function(){
    const tipo=document.getElementById("tr_file_tipo").value;
    const file=document.getElementById("tr_file_archivo").files[0] || null;
    const nombre=document.getElementById("tr_file_nombre").value.trim() || (file ? file.name : "");

    if(!file){
      alert("Selecciona archivo.");
      return;
    }

    const url=await subirArchivoObra(file,tipo,trabajoId);
    if(!url) return;

    const r=await sb()
      .from("trabajos_archivos")
      .insert([{
        trabajo_id:String(trabajoId),
        tipo,
        nombre,
        url
      }]);

    if(r.error){
      alert("Error guardando archivo: "+r.error.message);
      return;
    }

    cerrarModalTrabajo();
    ZX_trabajos();
  };
};

/* ===============================
   MATERIALES PRO
================================ */

async function cargarCatalogoMateriales(){
  try{
    const r=await sb()
      .from("materiales_catalogo")
      .select("*")
      .order("veces_usado",{ascending:false})
      .order("nombre",{ascending:true})
      .limit(500);

    if(!r.error && r.data) return r.data;
  }catch(e){}

  return [];
}

async function guardarMaterialEnCatalogo(nombre,unidad){
  const n=String(nombre || "").trim();
  const u=String(unidad || "").trim() || "ud";

  if(!n) return;

  try{
    const clave=normalizarMaterialClave(n);

    const buscado=await sb()
      .from("materiales_catalogo")
      .select("id,veces_usado")
      .eq("clave",clave)
      .limit(1);

    if(!buscado.error && buscado.data && buscado.data.length){
      const actual=buscado.data[0];

      await sb()
        .from("materiales_catalogo")
        .update({
          nombre:n,
          unidad:u,
          veces_usado:Number(actual.veces_usado || 0)+1,
          updated_at:new Date().toISOString()
        })
        .eq("id",actual.id);

      return;
    }

    await sb()
      .from("materiales_catalogo")
      .insert([{
        nombre:n,
        clave,
        unidad:u,
        veces_usado:1,
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }]);
  }catch(e){}
}

function sugerenciasMaterialesHTML(catalogo,valor){
  const q=normalizarMaterialClave(valor);
  if(!q || q.length<2) return "";

  const lista=(catalogo || [])
    .filter(m=>{
      const n=normalizarMaterialClave(m.nombre || "");
      return n.includes(q) || q.includes(n);
    })
    .slice(0,8);

  if(!lista.length) return "";

  return `
    <div class="zx_mat_sugerencias" id="tr_mat_sugerencias">
      ${lista.map(m=>`
        <button type="button"
          data-mat-sug="${limpiar(m.nombre || "")}"
          data-mat-unidad="${limpiar(m.unidad || "ud")}">
          <b>${limpiar(m.nombre || "")}</b>
          <span>${limpiar(m.unidad || "ud")}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function activarSugerenciasMateriales(catalogo,ids){
  const input=document.getElementById(ids.nombre);
  const unidad=document.getElementById(ids.unidad);
  const caja=document.getElementById(ids.caja);

  if(!input || !unidad || !caja) return;

  function pintar(){
    caja.innerHTML=sugerenciasMaterialesHTML(catalogo,input.value);

    caja.querySelectorAll("[data-mat-sug]").forEach(btn=>{
      btn.onclick=function(){
        input.value=btn.dataset.matSug || "";
        unidad.value=btn.dataset.matUnidad || "ud";
        caja.innerHTML="";
        input.focus();
      };
    });
  }

  input.oninput=function(){
    const valor=normalizarMaterialClave(input.value);
    const exacto=(catalogo || []).find(m=>normalizarMaterialClave(m.nombre || "")===valor);

    if(exacto && exacto.unidad && (!unidad.value || unidad.value==="ud")){
      unidad.value=exacto.unidad;
    }

    pintar();
  };

  input.onfocus=pintar;

  document.addEventListener("click",function(e){
    if(!caja.contains(e.target) && e.target!==input){
      caja.innerHTML="";
    }
  },{once:true});
}

async function guardarMaterialSumando(trabajoId,material,cantidad,unidad,notas,materialIdIgnorar=null){
  const nombre=String(material || "").trim();
  const ud=String(unidad || "").trim() || "ud";
  const nota=String(notas || "").trim();
  const cant=Number(String(cantidad || "0").replace(",","."));

  if(!nombre){
    alert("Introduce material.");
    return false;
  }

  if(!Number.isFinite(cant) || cant<=0){
    alert("Introduce cantidad correcta.");
    return false;
  }

  const existentes=await sb()
    .from("trabajos_materiales")
    .select("*")
    .eq("trabajo_id",String(trabajoId));

  if(existentes.error){
    alert("Error buscando materiales: "+existentes.error.message);
    return false;
  }

  const claveNombre=normalizarMaterialClave(nombre);
  const claveUnidad=normalizarMaterialClave(ud);

  const repetido=(existentes.data || []).find(m=>{
    if(materialIdIgnorar && String(m.id)===String(materialIdIgnorar)) return false;

    return normalizarMaterialClave(m.material || "")===claveNombre &&
           normalizarMaterialClave(m.unidad || "")===claveUnidad;
  });

  if(repetido){
    const nuevaCantidad=Number(repetido.cantidad || 0)+cant;
    const notasFinales=nota
      ? [repetido.notas || "", nota].filter(Boolean).join(" / ")
      : (repetido.notas || "");

    const r=await sb()
      .from("trabajos_materiales")
      .update({
        cantidad:nuevaCantidad,
        unidad:ud,
        notas:notasFinales
      })
      .eq("id",repetido.id);

    if(r.error){
      alert("Error actualizando material: "+r.error.message);
      return false;
    }

    if(materialIdIgnorar){
      await sb()
        .from("trabajos_materiales")
        .delete()
        .eq("id",String(materialIdIgnorar));
    }

    await guardarMaterialEnCatalogo(nombre,ud);
    return true;
  }

  const datos={
    trabajo_id:String(trabajoId),
    material:nombre,
    cantidad:cant,
    unidad:ud,
    notas:nota
  };

  let r;

  if(materialIdIgnorar){
    r=await sb()
      .from("trabajos_materiales")
      .update(datos)
      .eq("id",String(materialIdIgnorar));
  }else{
    r=await sb()
      .from("trabajos_materiales")
      .insert([datos]);
  }

  if(r.error){
    alert("Error guardando material: "+r.error.message);
    return false;
  }

  await guardarMaterialEnCatalogo(nombre,ud);
  return true;
}

async function borrarMaterialTrabajo(materialId){
  if(!confirm("¿Eliminar material de la lista?")) return false;

  const r=await sb()
    .from("trabajos_materiales")
    .delete()
    .eq("id",String(materialId));

  if(r.error){
    alert("Error eliminando material: "+r.error.message);
    return false;
  }

  return true;
}

function renderListaMaterialesModal(trabajo,materiales){
  return `
    <div class="zx_obra_material_modal_head">
      <b>${limpiar(trabajo.titulo || "Trabajo")}</b>
      <span>${limpiar(trabajo.cliente || "")}</span>
    </div>

    <div class="zx_obra_material_actions">
      <button class="zx_action_btn zx_blue" id="tr_mat_modal_imprimir">Imprimir</button>
      <button class="zx_action_btn zx_blue" id="tr_mat_modal_enviar">Enviar</button>
    </div>

    ${
      materiales.length
      ? `
        <div class="zx_obra_materiales">
          ${materiales.map(m=>`
            <div class="zx_mat_linea">
              <label class="zx_obra_mat_check">
                <input type="checkbox">
                <span>
                  <b>${limpiar(m.material || "Material")}</b>
                  <em>${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}</em>
                  ${m.notas ? `<small>${limpiar(m.notas)}</small>` : ""}
                </span>
              </label>

              <div class="zx_mat_linea_acciones">
                <button class="zx_action_btn zx_blue" data-mat-edit="${limpiar(m.id)}">Modificar</button>
                <button class="zx_action_btn zx_red" data-mat-del="${limpiar(m.id)}">Eliminar</button>
              </div>
            </div>
          `).join("")}
        </div>
      `
      : `<div class="zx_text">Sin materiales.</div>`
    }
  `;
}

async function abrirEditarMaterial(trabajoId,materialId){
  const datos=await obtenerTrabajoYMateriales(trabajoId);
  if(!datos) return;

  const m=(datos.materiales || []).find(x=>String(x.id)===String(materialId));

  if(!m){
    alert("Material no encontrado.");
    return;
  }

  const catalogo=await cargarCatalogoMateriales();

  document.getElementById("tr_mat_modal_contenido").innerHTML=`
    <div class="zx_obra_material_modal_head">
      <b>Modificar material</b>
      <span>${limpiar(datos.trabajo.titulo || "Trabajo")}</span>
    </div>

    <label class="zx_label">Material</label>
    <div class="zx_mat_input_wrap">
      <input id="tr_mat_edit_nombre" autocomplete="off" placeholder="Material" value="${limpiar(m.material || "")}">
      <div id="tr_mat_edit_sugerencias_wrap"></div>
    </div>

    <div class="zx_tr_grid2">
      <div>
        <label class="zx_label">Cantidad</label>
        <input id="tr_mat_edit_cantidad" type="number" step="0.01" inputmode="decimal" value="${limpiar(m.cantidad || 1)}">
      </div>

      <div>
        <label class="zx_label">Unidad</label>
        <input id="tr_mat_edit_unidad" value="${limpiar(m.unidad || "ud")}" placeholder="ud, m, kg...">
      </div>
    </div>

    <label class="zx_label">Notas</label>
    <textarea id="tr_mat_edit_notas" rows="3" placeholder="Opcional">${limpiar(m.notas || "")}</textarea>

    <button class="zx_btn_big zx_verde" id="tr_mat_edit_guardar">Guardar cambios</button>
    <button class="zx_btn_big zx_gris" id="tr_mat_edit_volver">Volver a lista</button>
  `;

  activarSugerenciasMateriales(catalogo,{
    nombre:"tr_mat_edit_nombre",
    unidad:"tr_mat_edit_unidad",
    caja:"tr_mat_edit_sugerencias_wrap"
  });

  document.getElementById("tr_mat_edit_guardar").onclick=async function(){
    const ok=await guardarMaterialSumando(
      trabajoId,
      document.getElementById("tr_mat_edit_nombre").value,
      document.getElementById("tr_mat_edit_cantidad").value,
      document.getElementById("tr_mat_edit_unidad").value,
      document.getElementById("tr_mat_edit_notas").value,
      materialId
    );

    if(!ok) return;
    await pintarListaMaterialesDentroModal(trabajoId);
  };

  document.getElementById("tr_mat_edit_volver").onclick=function(){
    pintarListaMaterialesDentroModal(trabajoId);
  };
}

async function pintarListaMaterialesDentroModal(trabajoId){
  const nuevos=await obtenerTrabajoYMateriales(trabajoId);
  if(!nuevos) return;

  const cont=document.getElementById("tr_mat_modal_contenido");
  if(!cont) return;

  cont.innerHTML=renderListaMaterialesModal(nuevos.trabajo,nuevos.materiales);

  document.getElementById("tr_mat_modal_imprimir").onclick=function(){
    ZX_tr_print_materiales(trabajoId);
  };

  document.getElementById("tr_mat_modal_enviar").onclick=function(){
    ZX_tr_share_materiales(trabajoId);
  };

  document.querySelectorAll("[data-mat-edit]").forEach(btn=>{
    btn.onclick=function(){
      abrirEditarMaterial(trabajoId,btn.dataset.matEdit);
    };
  });

  document.querySelectorAll("[data-mat-del]").forEach(btn=>{
    btn.onclick=async function(){
      const ok=await borrarMaterialTrabajo(btn.dataset.matDel);
      if(ok) await pintarListaMaterialesDentroModal(trabajoId);
    };
  });
}

async function abrirMaterialesObra(trabajoId,modo){
  const datos=await obtenerTrabajoYMateriales(trabajoId);
  if(!datos) return;

  let catalogo=await cargarCatalogoMateriales();

  cerrarModalTrabajo();

  const modoLista=modo==="lista";

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Materiales</h2>

        <div class="zx_obra_material_tabs">
          <button class="${!modoLista ? "zx_mat_tab_on" : ""}" id="tr_mat_tab_anotar">Anotar material</button>
          <button class="${modoLista ? "zx_mat_tab_on" : ""}" id="tr_mat_tab_lista">Ver lista</button>
        </div>

        <div id="tr_mat_modal_contenido"></div>

        <button class="zx_btn_big zx_gris" id="tr_mat_modal_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  async function pintarAnotar(){
    document.getElementById("tr_mat_tab_anotar").classList.add("zx_mat_tab_on");
    document.getElementById("tr_mat_tab_lista").classList.remove("zx_mat_tab_on");

    document.getElementById("tr_mat_modal_contenido").innerHTML=`
      <div class="zx_obra_material_modal_head">
        <b>${limpiar(datos.trabajo.titulo || "Trabajo")}</b>
        <span>${limpiar(datos.trabajo.cliente || "")}</span>
      </div>

      <label class="zx_label">Material</label>
      <div class="zx_mat_input_wrap">
        <input id="tr_mat_obra_nombre" autocomplete="off" placeholder="Ej: codo de grimpar de 32 ⌀">
        <div id="tr_mat_sugerencias_wrap"></div>
      </div>

      <div class="zx_tr_grid2">
        <div>
          <label class="zx_label">Cantidad</label>
          <input id="tr_mat_obra_cantidad" type="number" step="0.01" inputmode="decimal" value="1">
        </div>

        <div>
          <label class="zx_label">Unidad</label>
          <input id="tr_mat_obra_unidad" value="ud" placeholder="ud, m, kg...">
        </div>
      </div>

      <label class="zx_label">Notas</label>
      <textarea id="tr_mat_obra_notas" rows="3" placeholder="Opcional"></textarea>

      <button class="zx_btn_big zx_verde" id="tr_mat_obra_guardar">Añadir a la lista</button>

      <div class="zx_permiso_info">
        Si el material ya existe con la misma unidad, se suma automáticamente.
      </div>
    `;

    activarSugerenciasMateriales(catalogo,{
      nombre:"tr_mat_obra_nombre",
      unidad:"tr_mat_obra_unidad",
      caja:"tr_mat_sugerencias_wrap"
    });

    document.getElementById("tr_mat_obra_guardar").onclick=async function(){
      const ok=await guardarMaterialSumando(
        trabajoId,
        document.getElementById("tr_mat_obra_nombre").value,
        document.getElementById("tr_mat_obra_cantidad").value,
        document.getElementById("tr_mat_obra_unidad").value,
        document.getElementById("tr_mat_obra_notas").value
      );

      if(!ok) return;

      document.getElementById("tr_mat_obra_nombre").value="";
      document.getElementById("tr_mat_obra_cantidad").value="1";
      document.getElementById("tr_mat_obra_unidad").value="ud";
      document.getElementById("tr_mat_obra_notas").value="";

      catalogo=await cargarCatalogoMateriales();

      alert("Material anotado.");
      document.getElementById("tr_mat_obra_nombre").focus();
    };
  }

  async function pintarLista(){
    document.getElementById("tr_mat_tab_lista").classList.add("zx_mat_tab_on");
    document.getElementById("tr_mat_tab_anotar").classList.remove("zx_mat_tab_on");

    await pintarListaMaterialesDentroModal(trabajoId);
  }

  document.getElementById("tr_mat_tab_anotar").onclick=pintarAnotar;
  document.getElementById("tr_mat_tab_lista").onclick=pintarLista;
  document.getElementById("tr_mat_modal_cerrar").onclick=function(){
    cerrarModalTrabajo();
    ZX_trabajos();
  };

  if(modoLista) await pintarLista();
  else await pintarAnotar();
}

window.ZX_tr_obra_materiales=async function(trabajoId){
  await abrirMaterialesObra(trabajoId,"anotar");
};

window.ZX_tr_add_material=async function(trabajoId){
  await abrirMaterialesObra(trabajoId,"anotar");
};

window.ZX_tr_add_historial=async function(trabajoId){
  if(!puedeModificarHistorial()){
    alert("No tienes permiso para añadir historial.");
    return;
  }

  const usuarios=await cargarUsuarios();

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Añadir historial</h2>

        <label class="zx_label">Usuario / operario</label>
        <select id="tr_hist_usuario">
          <option value="">Seleccionar usuario</option>
          ${usuarios.map(u=>`
            <option value="${limpiar(u.id)}"
              data-usuario="${limpiar(u.usuario || "")}"
              data-nombre="${limpiar(u.nombre || u.usuario || "")}">
              ${limpiar(u.nombre || u.usuario || "")}
            </option>
          `).join("")}
        </select>

        <label class="zx_label">Fecha</label>
        <input id="tr_hist_fecha" type="date" value="${hoy()}">

        <div class="zx_tr_grid2">
          <div>
            <label class="zx_label">Hora inicio</label>
            <input id="tr_hist_inicio" type="time">
          </div>

          <div>
            <label class="zx_label">Hora fin</label>
            <input id="tr_hist_fin" type="time">
          </div>
        </div>

        <label class="zx_label">Tipo</label>
        <select id="tr_hist_tipo">
          <option value="trabajo">Trabajo</option>
          <option value="pausa">Pausa</option>
          <option value="incidencia">Incidencia</option>
          <option value="desplazamiento">Desplazamiento</option>
          <option value="otro">Otro</option>
        </select>

        <label class="zx_label">Notas</label>
        <textarea id="tr_hist_notas" rows="3" placeholder="Notas"></textarea>

        <button class="zx_btn_big zx_verde" id="tr_hist_guardar">Guardar historial</button>
        <button class="zx_btn_big zx_gris" id="tr_hist_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_hist_cancelar").onclick=cerrarModalTrabajo;

  document.getElementById("tr_hist_guardar").onclick=async function(){
    const sel=document.getElementById("tr_hist_usuario");
    const opt=sel.options[sel.selectedIndex];

    if(!sel.value){
      alert("Selecciona usuario.");
      return;
    }

    const r=await sb()
      .from("trabajos_historial")
      .insert([{
        trabajo_id:String(trabajoId),
        usuario_id:String(sel.value),
        usuario:opt ? opt.dataset.nombre || opt.dataset.usuario || "" : "",
        fecha:normalizarFecha(document.getElementById("tr_hist_fecha").value || hoy()),
        hora_inicio:document.getElementById("tr_hist_inicio").value || null,
        hora_fin:document.getElementById("tr_hist_fin").value || null,
        tipo:document.getElementById("tr_hist_tipo").value,
        notas:document.getElementById("tr_hist_notas").value.trim()
      }]);

    if(r.error){
      alert("Error guardando historial: "+r.error.message);
      return;
    }

    cerrarModalTrabajo();
    ZX_trabajos();
  };
};

async function sincronizarAgenda(trabajoId,data,planificacion){
  if(!trabajoId) return;

  await sb()
    .from("agenda_eventos")
    .delete()
    .eq("origen","trabajos")
    .eq("origen_id",String(trabajoId));

  if(data.archivado) return;

  for(const p of planificacion){
    await sb()
      .from("agenda_eventos")
      .insert([{
        tipo:"trabajo",
        titulo:"Trabajo - "+data.titulo,
        descripcion:data.descripcion || "",
        fecha_inicio:normalizarFecha(p.fecha),
        fecha_fin:normalizarFecha(p.fecha),
        hora_inicio:p.hora_inicio,
        hora_fin:p.hora_fin,
        cliente_id:String(data.cliente_id || ""),
        cliente:data.cliente || "",
        usuario_id:String(p.usuario_id || ""),
        usuario:p.nombre || p.usuario || "",
        estado:data.estado==="terminado" ? "completado" : "activo",
        prioridad:data.prioridad || "media",
        visible_para:"todos",
        origen:"trabajos",
        origen_id:String(trabajoId),
        creado_por:data.creado_por || ""
      }]);
  }
}

async function guardarPlanificacion(trabajoId,lista){
  await sb()
    .from("trabajos_planificacion")
    .delete()
    .eq("trabajo_id",String(trabajoId));

  if(!lista.length) return;

  const insert=lista.map(p=>({
    trabajo_id:String(trabajoId),
    fecha:normalizarFecha(p.fecha),
    hora_inicio:p.hora_inicio,
    hora_fin:p.hora_fin,
    usuario_id:String(p.usuario_id || ""),
    usuario:p.usuario || "",
    nombre:p.nombre || "",
    notas:p.notas || ""
  }));

  const r=await sb()
    .from("trabajos_planificacion")
    .insert(insert);

  if(r.error){
    alert("Error guardando planificación: "+r.error.message);
  }
}

async function guardarTrabajo(id,clientes){
  if(id && !puedeEditarTrabajo()){
    alert("No tienes permiso para editar trabajos.");
    return;
  }

  if(!id && !puedeCrearTrabajo()){
    alert("No tienes permiso para crear trabajos.");
    return;
  }

  const s=sesion();

  const clienteId=document.getElementById("tr_cliente").value || null;
  const cliente=clientes.find(x=>String(x.id)===String(clienteId));
  const planificacion=leerPlanificacionFormulario();

  if(!planificacion.length){
    alert("Añade al menos un día, horario y operario.");
    return;
  }

  const solapesOk=await comprobarSolapesPlanificacion(planificacion,id);
  if(!solapesOk) return;

  const primera=planificacion[0];

  const data={
    titulo:document.getElementById("tr_titulo").value.trim(),
    prioridad:document.getElementById("tr_prioridad").value || "media",
    cliente_id:clienteId,
    cliente:cliente ? cliente.nombre || "" : "",
    usuario:planificacion.map(p=>p.nombre || p.usuario).filter(Boolean).join(", "),

    fecha:normalizarFecha(primera.fecha),
    hora_inicio:primera.hora_inicio,
    hora_fin:primera.hora_fin,

    direccion_cliente:document.getElementById("tr_direccion_cliente").value.trim(),
    direccion_obra:document.getElementById("tr_direccion_obra").value.trim(),
    direccion:document.getElementById("tr_direccion_obra").value.trim(),
    poblacion:document.getElementById("tr_poblacion").value.trim(),
    provincia:document.getElementById("tr_provincia").value.trim(),
    codigo_postal:document.getElementById("tr_codigo_postal").value.trim(),
    pais:document.getElementById("tr_pais").value.trim(),

    persona_contacto:document.getElementById("tr_persona_contacto").value.trim(),
    telefono_contacto:document.getElementById("tr_telefono_contacto").value.trim(),

    descripcion:document.getElementById("tr_descripcion").value.trim(),
    notas:document.getElementById("tr_notas").value.trim(),

    creado_por:s.usuario || "",
    archivado:false,
    estado:"pendiente"
  };

  if(!data.titulo){
    alert("Introduce título.");
    return;
  }

  let r;

  if(id){
    delete data.estado;
    delete data.archivado;

    r=await sb()
      .from("trabajos")
      .update(data)
      .eq("id",id)
      .select()
      .maybeSingle();
  }else{
    r=await sb()
      .from("trabajos")
      .insert([data])
      .select()
      .maybeSingle();
  }

  if(r.error){
    alert("Error guardando trabajo: "+r.error.message);
    return;
  }

  const trabajoId=id || r.data?.id;

  await guardarPlanificacion(trabajoId,planificacion);
  await sincronizarAgenda(trabajoId,{
    ...data,
    estado:id ? (r.data?.estado || "pendiente") : data.estado
  },planificacion);

  await registrarAuditoriaTrabajo(r.data || {id:trabajoId,titulo:data.titulo},id ? "EDITAR_TRABAJO" : "CREAR_TRABAJO",{
    cliente:data.cliente || "",
    prioridad:data.prioridad || "media"
  });

  cerrarModalTrabajo();
  ZX_trabajos();
}

window.ZX_nuevoTrabajo=function(){
  if(!puedeCrearTrabajo()){
    alert("No tienes permiso para crear trabajos.");
    return;
  }

  formulario({});
};

window.ZX_editarTrabajo=async function(id){
  if(!puedeEditarTrabajo()){
    alert("No tienes permiso para editar trabajos.");
    return;
  }

  const r=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r.error || !r.data){
    alert("Trabajo no encontrado.");
    return;
  }

  formulario(r.data);
};

window.ZX_borrarTrabajo=async function(id){
  if(!puedeArchivarTrabajo() && !puedeBorrarTrabajo()){
    alert("No tienes permiso para gestionar trabajos.");
    return;
  }

  const r0=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r0.error || !r0.data){
    alert("Trabajo no encontrado.");
    return;
  }

  const trabajo=r0.data;

  cerrarModalTrabajo();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Gestión de trabajo</h2>

        <div class="zx_text">
          <b>${limpiar(trabajo.titulo || "Trabajo")}</b><br>
          Cliente: ${limpiar(trabajo.cliente || "-")}
        </div>

        ${
          puedeArchivarTrabajo()
          ? (
              trabajo.archivado
              ? `<button class="zx_btn_big zx_verde" id="tr_restaurar">Restaurar trabajo</button>`
              : `<button class="zx_btn_big zx_naranja" id="tr_archivar">Archivar trabajo</button>`
            )
          : ``
        }

        ${puedeBorrarTrabajo() ? `<button class="zx_btn_big zx_rojo" id="tr_borrar_def">Borrar definitivamente</button>` : ``}

        <button class="zx_btn_big zx_gris" id="tr_borrar_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_borrar_cancelar").onclick=cerrarModalTrabajo;

  const archivar=document.getElementById("tr_archivar");
  if(archivar){
    archivar.onclick=async function(){
      const ok=await pedirPinAdmin();
      if(!ok) return;

      const r=await sb()
        .from("trabajos")
        .update({archivado:true})
        .eq("id",id);

      if(r.error){
        alert("Error archivando trabajo: "+r.error.message);
        return;
      }

      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));

      await registrarAuditoriaTrabajo(trabajo,"ARCHIVAR_TRABAJO",{
        estado:trabajo.estado || "",
        prioridad:trabajo.prioridad || ""
      });

      cerrarModalTrabajo();
      ZX_trabajos();
    };
  }

  const restaurar=document.getElementById("tr_restaurar");
  if(restaurar){
    restaurar.onclick=async function(){
      const ok=await pedirPinAdmin();
      if(!ok) return;

      const r=await sb()
        .from("trabajos")
        .update({archivado:false})
        .eq("id",id);

      if(r.error){
        alert("Error restaurando trabajo: "+r.error.message);
        return;
      }

      const plan=await cargarPlanificacion(id);
      await sincronizarAgenda(id,{...trabajo,archivado:false},plan);

      await registrarAuditoriaTrabajo(trabajo,"RESTAURAR_TRABAJO",{
        estado:trabajo.estado || "",
        prioridad:trabajo.prioridad || ""
      });

      cerrarModalTrabajo();
      ZX_trabajos();
    };
  }

  const borrar=document.getElementById("tr_borrar_def");
  if(borrar){
    borrar.onclick=async function(){
      const ok=await pedirPinAdmin();
      if(!ok) return;

      if(!confirm("Borrado definitivo. ¿Continuar?")) return;

      await registrarAuditoriaTrabajo(trabajo,"BORRAR_TRABAJO",{
        estado:trabajo.estado || "",
        prioridad:trabajo.prioridad || "",
        cliente:trabajo.cliente || ""
      });

      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));
      await sb().from("trabajos_planificacion").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_archivos").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_materiales").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_historial").delete().eq("trabajo_id",String(id));

      const r=await sb()
        .from("trabajos")
        .delete()
        .eq("id",id);

      if(r.error){
        alert("Error borrando trabajo: "+r.error.message);
        return;
      }

      cerrarModalTrabajo();
      ZX_trabajos();
    };
  }
};

window.ZX_cambiarEstadoTrabajo=async function(id){
  if(!puedeCambiarEstadoTrabajo()){
    alert("No tienes permiso para cambiar estados.");
    return;
  }

  const r0=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(r0.error || !r0.data){
    alert("Trabajo no encontrado.");
    return;
  }

  const actual=r0.data.estado || "pendiente";

  let nuevo="en_curso";
  if(actual==="en_curso") nuevo="terminado";
  if(actual==="terminado") nuevo="pendiente";

  const r=await sb()
    .from("trabajos")
    .update({estado:nuevo})
    .eq("id",id);

  if(r.error){
    alert("Error cambiando estado: "+r.error.message);
    return;
  }

  await sb()
    .from("agenda_eventos")
    .update({estado:nuevo==="terminado" ? "completado" : "activo"})
    .eq("origen","trabajos")
    .eq("origen_id",String(id));

  await registrarAuditoriaTrabajo(r0.data,"CAMBIAR_ESTADO",{
    anterior:actual,
    nuevo:nuevo
  });

  ZX_trabajos();
};

function resumen(datos){
  const activos=datos.filter(t=>!t.archivado).length;
  const pendientes=datos.filter(t=>t.estado==="pendiente" && !t.archivado).length;
  const curso=datos.filter(t=>t.estado==="en_curso" && !t.archivado).length;
  const terminados=datos.filter(t=>t.estado==="terminado" && !t.archivado).length;
  const urgentes=datos.filter(t=>t.prioridad==="urgente" && !t.archivado).length;
  const archivados=datos.filter(t=>t.archivado===true).length;

  return `
    <div class="zx_card">
      <div class="zx_tr_head">
        <div>
          <h2>Trabajos</h2>
          <div class="zx_text">
            Activos: <b>${activos}</b> · Pendientes: <b>${pendientes}</b> · En curso: <b>${curso}</b><br>
            Terminados: <b>${terminados}</b> · Urgentes: <b>${urgentes}</b> · Archivados: <b>${archivados}</b>
          </div>
        </div>

        ${puedeCrearTrabajo() ? `<button class="zx_btn_mini zx_verde" id="btn_nuevo_trabajo">Crear</button>` : ""}
      </div>

      ${!puedeGestionarTrabajos() ? `<div class="zx_permiso_info">Modo consulta técnica: sin edición ni datos económicos.</div>` : ""}

      <input
        id="tr_buscar"
        class="zx_tr_buscar"
        placeholder="Buscar trabajo, cliente, dirección, teléfono..."
        value="${limpiar(ZX_TR_BUSQUEDA)}">

      <div class="zx_tr_filtros">
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="activos"?"zx_tr_filtro_on":""}" data-tr-filtro="activos">Activos</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="todos"?"zx_tr_filtro_on":""}" data-tr-filtro="todos">Todos</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="pendientes"?"zx_tr_filtro_on":""}" data-tr-filtro="pendientes">Pendientes</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="curso"?"zx_tr_filtro_on":""}" data-tr-filtro="curso">En curso</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="terminados"?"zx_tr_filtro_on":""}" data-tr-filtro="terminados">Terminados</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="urgentes"?"zx_tr_filtro_on":""}" data-tr-filtro="urgentes">Urgentes</button>
        <button class="zx_tr_filtro ${ZX_TR_FILTRO==="archivados"?"zx_tr_filtro_on":""}" data-tr-filtro="archivados">Archivados</button>
      </div>
    </div>
  `;
}

async function obtenerTrabajoYMateriales(trabajoId){
  const r=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",String(trabajoId))
    .maybeSingle();

  if(r.error || !r.data){
    alert("Trabajo no encontrado.");
    return null;
  }

  const materiales=await cargarMateriales(trabajoId);

  return {
    trabajo:r.data,
    materiales:materiales || []
  };
}

function textoListaMateriales(trabajo,materiales){
  const lineas=[
    "LISTA DE MATERIALES",
    "",
    "Trabajo: "+String(trabajo.titulo || "-"),
    "Cliente: "+String(trabajo.cliente || "-"),
    "Dirección: "+String(direccionTrabajo(trabajo) || "-"),
    "",
    "MATERIALES:"
  ];

  if(!materiales.length){
    lineas.push("- Sin materiales.");
  }else{
    materiales.forEach((m,i)=>{
      const cantidad=[m.cantidad || "0",m.unidad || ""].filter(Boolean).join(" ");
      const notas=m.notas ? " · "+m.notas : "";
      lineas.push((i+1)+". "+String(m.material || "Material")+" ("+cantidad+")"+notas);
    });
  }

  return lineas.join("\n");
}

function htmlListaMateriales(trabajo,materiales){
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Lista de materiales</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
        h1{font-size:26px;margin:0 0 8px}
        h2{font-size:18px;margin:22px 0 10px}
        .meta{font-size:14px;line-height:1.45;color:#334155;margin-bottom:16px}
        .item{border:1px solid #d1d5db;border-radius:12px;padding:12px;margin:8px 0;display:grid;grid-template-columns:28px 1fr;gap:8px}
        .box{width:20px;height:20px;border:2px solid #0f172a;border-radius:4px;margin-top:1px}
        b{font-size:16px}
        span{display:block;color:#334155;font-size:14px;margin-top:3px}
        small{display:block;color:#64748b;font-size:13px;margin-top:4px}
        @media print{body{margin:12mm}.item{break-inside:avoid}}
      </style>
    </head>
    <body>
      <h1>Lista de materiales</h1>
      <div class="meta">
        <b>Trabajo:</b> ${limpiar(trabajo.titulo || "-")}<br>
        <b>Cliente:</b> ${limpiar(trabajo.cliente || "-")}<br>
        <b>Dirección:</b> ${limpiar(direccionTrabajo(trabajo) || "-")}
      </div>

      <h2>Materiales</h2>
      ${
        materiales.length
        ? materiales.map(m=>`
          <div class="item">
            <div class="box"></div>
            <div>
              <b>${limpiar(m.material || "Material")}</b>
              <span>${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}</span>
              ${m.notas ? `<small>${limpiar(m.notas)}</small>` : ""}
            </div>
          </div>
        `).join("")
        : `<div>Sin materiales.</div>`
      }

      <script>
        window.onload=function(){
          setTimeout(function(){window.print()},250);
        };
      <\/script>
    </body>
    </html>
  `;
}

window.ZX_tr_print_materiales=async function(trabajoId){
  const datos=await obtenerTrabajoYMateriales(trabajoId);
  if(!datos) return;

  const w=window.open("","_blank");
  if(!w){
    alert("El navegador ha bloqueado la ventana de impresión.");
    return;
  }

  w.document.open();
  w.document.write(htmlListaMateriales(datos.trabajo,datos.materiales));
  w.document.close();
};

window.ZX_tr_share_materiales=async function(trabajoId){
  const datos=await obtenerTrabajoYMateriales(trabajoId);
  if(!datos) return;

  const texto=textoListaMateriales(datos.trabajo,datos.materiales);

  if(navigator.share){
    try{
      await navigator.share({
        title:"Lista de materiales - "+String(datos.trabajo.titulo || "Trabajo"),
        text:texto
      });
      return;
    }catch(e){}
  }

  try{
    await navigator.clipboard.writeText(texto);
    alert("Lista copiada al portapapeles.");
  }catch(e){
    location.href="mailto:?subject="+encodeURIComponent("Lista de materiales - "+String(datos.trabajo.titulo || "Trabajo"))+"&body="+encodeURIComponent(texto);
  }
};

window.ZX_trabajos=async function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="trabajos") b.classList.add("zx_activo");
  });

  const datos=await cargarTrabajos();
  const todos=await cargarTodosTrabajos();
  const tarjetas=[];

  for(const t of datos){
    tarjetas.push(await renderTrabajo(t));
  }

  app().innerHTML=`
    ${resumen(todos)}

    <div class="zx_card">
      <h2>Listado</h2>
      ${
        tarjetas.length
        ? tarjetas.join("")
        : `<div class="zx_text">Sin trabajos.</div>`
      }
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_trabajo");
  if(nuevo){
    nuevo.onclick=function(){formulario({})};
  }

  document.querySelectorAll("[data-tr-filtro]").forEach(btn=>{
    btn.onclick=function(){
      ZX_TR_FILTRO=btn.dataset.trFiltro || "activos";
      ZX_trabajos();
    };
  });

  const buscador=document.getElementById("tr_buscar");
  if(buscador){
    buscador.oninput=function(){
      ZX_TR_BUSQUEDA=buscador.value || "";
      clearTimeout(window.ZX_TR_TIMER);
      window.ZX_TR_TIMER=setTimeout(function(){
        ZX_trabajos();
      },250);
    };
  }

  document.querySelectorAll("[data-tr-estado]").forEach(btn=>{btn.onclick=function(){ZX_cambiarEstadoTrabajo(btn.dataset.trEstado)}});
  document.querySelectorAll("[data-tr-tel]").forEach(btn=>{btn.onclick=function(){menuTelefono(btn.dataset.trTel)}});
  document.querySelectorAll("[data-tr-map]").forEach(btn=>{btn.onclick=function(){menuMapa(btn.dataset.trMap)}});
  document.querySelectorAll("[data-tr-edit]").forEach(btn=>{btn.onclick=function(){ZX_editarTrabajo(btn.dataset.trEdit)}});
  document.querySelectorAll("[data-tr-del]").forEach(btn=>{btn.onclick=function(){ZX_borrarTrabajo(btn.dataset.trDel)}});
  document.querySelectorAll("[data-tr-open-file]").forEach(btn=>{btn.onclick=function(){if(btn.dataset.trOpenFile) window.open(btn.dataset.trOpenFile,"_blank")}});
  document.querySelectorAll("[data-tr-add-file]").forEach(btn=>{btn.onclick=function(){ZX_tr_add_file(btn.dataset.trAddFile)}});
  document.querySelectorAll("[data-tr-add-material]").forEach(btn=>{btn.onclick=function(){ZX_tr_add_material(btn.dataset.trAddMaterial)}});
  document.querySelectorAll("[data-tr-add-historial]").forEach(btn=>{btn.onclick=function(){ZX_tr_add_historial(btn.dataset.trAddHistorial)}});
  document.querySelectorAll("[data-tr-print-materiales]").forEach(btn=>{btn.onclick=function(){ZX_tr_print_materiales(btn.dataset.trPrintMateriales)}});
  document.querySelectorAll("[data-tr-share-materiales]").forEach(btn=>{btn.onclick=function(){ZX_tr_share_materiales(btn.dataset.trShareMateriales)}});
  document.querySelectorAll("[data-tr-obra-materiales]").forEach(btn=>{btn.onclick=function(){ZX_tr_obra_materiales(btn.dataset.trObraMateriales)}});
  document.querySelectorAll("[data-obra-jump]").forEach(btn=>{
    btn.onclick=function(){
      const card=btn.closest(".zx_obra_card");
      if(!card) return;

      const target=card.querySelector('[data-obra-section="'+btn.dataset.obraJump+'"]');
      if(!target) return;

      target.open=true;
      target.scrollIntoView({behavior:"smooth",block:"start"});
    };
  });
};

(function estilosTrabajos(){
  if(document.getElementById("zx_trabajos_v3109")) return;

  const s=document.createElement("style");
  s.id="zx_trabajos_v3109";

  s.innerHTML=`
    .zx_tr_head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .zx_btn_mini{border:0;border-radius:14px;padding:12px 18px;font-size:15px;font-weight:900}
    .zx_permiso_info{background:#f8fafc;border:1px solid #e5e7eb;border-left:8px solid #64748b;border-radius:16px;padding:12px;margin:14px 0;color:#334155;font-size:15px;font-weight:900;line-height:1.4}
    .zx_tr_buscar{width:100%;margin:14px 0;padding:16px;border-radius:18px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;font-size:17px;font-weight:850}
    .zx_tr_filtros{display:flex;gap:8px;overflow-x:auto;padding:8px 0 14px;margin-bottom:8px}
    .zx_tr_filtro{flex:0 0 auto;border:0;border-radius:999px;padding:11px 14px;background:#e5e7eb;color:#0f172a;font-size:15px;font-weight:900}
    .zx_tr_filtro_on{background:#2563eb;color:white}
    .zx_link_dir{border:0;background:transparent;color:#2563eb;font-size:18px;font-weight:900;text-align:left;padding:0;text-decoration:underline}
    .zx_tr_grid2,.zx_plan_form_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .zx_plan_form_grid{grid-template-columns:1.2fr .9fr .9fr}
    .zx_tr_plan_form,.zx_tr_panel{background:#f8fafc;border:1px solid #d1d5db;border-radius:20px;padding:14px;margin-top:14px}
    .zx_plan_details{margin-top:10px}
    .zx_plan_details summary{font-weight:900;color:#2563eb;cursor:pointer}
    .zx_plan_buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .zx_plan_compact{display:grid;gap:8px}
    .zx_plan_row{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:10px;font-weight:850;color:#0f172a}
    .zx_plan_fecha{color:#334155}
    .zx_plan_hora{color:#2563eb}
    .zx_plan_operario{color:#0f172a}
    .zx_plan_notas{grid-column:1/-1;color:#64748b;font-size:14px;font-weight:750}
    .zx_tr_file_item,.zx_tr_mat_item,.zx_tr_hist_item{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin-top:10px}
    .zx_tr_file_item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
    .zx_tr_mat_item span{color:#64748b;font-weight:800}
    .zx_tr_card{border-width:3px}
    .zx_tr_card_urgente{border-color:#dc2626;box-shadow:0 8px 28px rgba(220,38,38,.18)}
    .zx_tr_card_alta{border-color:#ea580c;box-shadow:0 8px 28px rgba(234,88,12,.14)}
    .zx_tr_card_bloqueado{border-color:#991b1b;box-shadow:0 8px 28px rgba(153,27,27,.22)}
    .zx_tr_card_terminado{border-color:#16a34a}
    .zx_tr_card_archivado{border-color:#64748b;opacity:.82}
    .zx_tr_badges{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
    .zx_badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:8px 12px;color:white;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.3px}
    .zx_estado_pendiente{background:#ea580c!important;color:white!important}
    .zx_estado_curso{background:#2563eb!important;color:white!important}
    .zx_estado_terminado{background:#16a34a!important;color:white!important}
    .zx_estado_bloqueado{background:#991b1b!important;color:white!important}
    .zx_estado_neutro{background:#64748b!important;color:white!important}
    .zx_prio_baja{background:#64748b}
    .zx_prio_media{background:#2563eb}
    .zx_prio_alta{background:#ea580c}
    .zx_prio_urgente{background:#dc2626}
    .zx_archivado_badge{background:#334155}
    .zx_user_card{background:white;border:1px solid #d1d5db;border-radius:24px;padding:22px;margin:18px 0;box-shadow:0 8px 24px rgba(0,0,0,.04)}
    .zx_user_name{font-size:30px;font-weight:900;color:#0f172a;margin-bottom:10px}
    .zx_user_data{color:#334155;font-size:18px;line-height:1.55;font-weight:700}
    .zx_user_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .zx_action_btn{border:0;border-radius:16px;background:#e5e7eb;padding:14px;font-size:17px;font-weight:900;color:#111827}
    .zx_blue{background:#2563eb!important;color:white!important}
    .zx_red{background:#dc2626!important;color:white!important}
    .zx_verde{background:#16a34a!important;color:white!important}
    .zx_label{display:block;margin:12px 0 6px;color:#334155;font-size:15px;font-weight:900}
    .zx_form_subtitle{margin:22px 0 8px;color:#0f172a;font-size:24px;font-weight:900}

    .zx_obra_card{background:white;border:3px solid #d1d5db;border-radius:24px;padding:16px;margin:16px 0;box-shadow:0 8px 24px rgba(0,0,0,.05)}
    .zx_obra_top{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;margin-bottom:12px}
    .zx_obra_hora{color:#2563eb;font-size:18px;font-weight:900;margin-bottom:4px}
    .zx_obra_titulo{color:#0f172a;font-size:26px;font-weight:950;line-height:1.12}
    .zx_obra_cliente{color:#64748b;font-size:16px;font-weight:900;margin-top:4px}
    .zx_obra_direccion{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;color:#334155;font-size:15px;font-weight:850;line-height:1.35;margin-bottom:12px}
    .zx_obra_botones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
    .zx_obra_big_btn{border:0;border-radius:18px;background:#2563eb;color:white;padding:17px 12px;font-size:17px;font-weight:950;text-align:center}
    .zx_obra_section{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:12px;margin-top:12px}
    .zx_obra_section summary{cursor:pointer;color:#0f172a;font-size:18px;font-weight:950}
    .zx_obra_file_group{margin-top:10px}
    .zx_obra_file_group h3{margin:10px 0 8px;color:#0f172a;font-size:17px;font-weight:950}
    .zx_obra_file_btn{width:100%;border:1px solid #e5e7eb;background:white;border-radius:16px;padding:13px;margin-top:8px;text-align:left;color:#0f172a}
    .zx_obra_file_btn b{display:block;font-size:15px;font-weight:950}
    .zx_obra_file_btn span{display:block;color:#64748b;font-size:13px;font-weight:850;margin-top:3px}
    .zx_obra_material_actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
    .zx_obra_material_tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 16px}
    .zx_obra_material_tabs button{border:0;border-radius:16px;background:#e5e7eb;color:#0f172a;padding:14px 10px;font-size:15px;font-weight:950}
    .zx_obra_material_tabs .zx_mat_tab_on{background:#2563eb!important;color:white!important}
    .zx_obra_material_modal_head{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin:10px 0 14px}
    .zx_obra_material_modal_head b{display:block;color:#0f172a;font-size:17px;font-weight:950}
    .zx_obra_material_modal_head span{display:block;color:#64748b;font-size:14px;font-weight:850;margin-top:3px}
    .zx_obra_materiales{display:grid;gap:8px;margin-top:10px}
    .zx_obra_mat_check{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:12px}
    .zx_obra_mat_check input{width:22px!important;height:22px!important;margin-top:2px!important}
    .zx_obra_mat_check b{display:block;color:#0f172a;font-size:16px;font-weight:950}
    .zx_obra_mat_check em{display:block;color:#2563eb;font-style:normal;font-size:14px;font-weight:900;margin-top:2px}
    .zx_obra_mat_check small{display:block;color:#64748b;font-size:13px;font-weight:800;margin-top:4px}
    .zx_mat_input_wrap{position:relative}
    .zx_mat_sugerencias{background:white;border:1px solid #cbd5e1;border-radius:16px;box-shadow:0 12px 28px rgba(15,23,42,.16);margin-top:6px;overflow:hidden;max-height:260px;overflow-y:auto}
    .zx_mat_sugerencias button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;border:0;border-bottom:1px solid #e5e7eb;background:white;color:#0f172a;padding:13px 14px;text-align:left}
    .zx_mat_sugerencias button:last-child{border-bottom:0}
    .zx_mat_sugerencias b{font-size:15px;font-weight:950}
    .zx_mat_sugerencias span{font-size:13px;color:#2563eb;font-weight:900}
    .zx_mat_linea{background:white;border:1px solid #e5e7eb;border-radius:18px;padding:10px}
    .zx_mat_linea .zx_obra_mat_check{border:0;padding:0}
    .zx_mat_linea_acciones{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}

    @media(max-width:430px){
      .zx_tr_head,
      .zx_tr_grid2,
      .zx_plan_form_grid,
      .zx_user_actions,
      .zx_tr_file_item,
      .zx_plan_row{
        grid-template-columns:1fr;
        display:grid;
      }
      .zx_user_card{padding:16px;border-radius:20px}
      .zx_user_name{font-size:24px}
      .zx_user_data{font-size:16px}
    }
  `;

  document.head.appendChild(s);
})();

})();
