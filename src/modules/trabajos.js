// ===============================
// ZENTRYX PRO - TRABAJOS
// V3118 - HISTORIAL AUTOMÁTICO REAL + PIN OBLIGATORIO
// ===============================
(function(){
"use strict";

let ZX_TR_FILTRO="activos";
let ZX_TR_BUSQUEDA="";
let ZX_TR_CACHE=[];
let ZX_TR_TIMER=null;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}

function limpiar(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function plano(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function esAdmin(){
  const s=sesion();
  return plano(s.rol)==="administrador" || plano(s.usuario)==="admin";
}

function puedeEntrar(){return plano(sesion().rol)!=="invitado" && plano(sesion().rol)!==""}
function puedeGestionar(){return puedeEntrar()}
function hoy(){return new Date().toISOString().slice(0,10)}
function horaAhora(){return new Date().toTimeString().slice(0,5)}

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

function fechaES(f){
  const x=normalizarFecha(f);
  if(!x) return "";
  const p=x.split("-");
  if(p.length!==3) return x;
  return p[2]+"/"+p[1]+"/"+p[0];
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_trabajo");
  if(m) m.remove();
}

function hashPin(pin){return btoa(String(pin))}

async function pedirPinAdmin(){
  return new Promise(resolve=>{
    cerrarModal();

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

    document.getElementById("tr_pin_cancelar").onclick=()=>{
      cerrarModal();
      resolve(false);
    };

    document.getElementById("tr_pin_ok").onclick=async ()=>{
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

      const admin=plano(r.data.rol)==="administrador" || plano(r.data.usuario)==="admin";

      if(!admin){
        alert("Solo administrador.");
        return;
      }

      if(hashPin(pin)!==String(r.data.pin_hash || "")){
        alert("PIN incorrecto.");
        return;
      }

      cerrarModal();
      resolve(true);
    };
  });
}

function telefonoLimpio(tel){
  let n=String(tel||"").replace(/[^\d+]/g,"");
  if(n.startsWith("+")) return n;
  if(n.length===9) return "+34"+n;
  return n;
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

function estadoTexto(e){
  return {
    pendiente:"Pendiente",
    en_curso:"En curso",
    terminado:"Terminado",
    bloqueado:"Bloqueado",
    cancelado:"Cancelado"
  }[e] || e || "Pendiente";
}

function prioridadTexto(p){
  return {
    baja:"Baja",
    media:"Media",
    alta:"Alta",
    urgente:"Urgente"
  }[p] || "Media";
}

function claseEstado(e){
  if(e==="terminado") return "zx_tr_estado_ok";
  if(e==="en_curso") return "zx_tr_estado_curso";
  if(e==="bloqueado" || e==="cancelado") return "zx_tr_estado_rojo";
  return "zx_tr_estado_pendiente";
}

function clasePrioridad(p){
  if(p==="urgente") return "zx_tr_prio_urgente";
  if(p==="alta") return "zx_tr_prio_alta";
  if(p==="baja") return "zx_tr_prio_baja";
  return "zx_tr_prio_media";
}

function estadoAgenda(e){
  if(e==="terminado") return "completado";
  if(e==="bloqueado" || e==="cancelado") return "cancelado";
  return "activo";
}

/*
  V3118:
  El fallo principal de V3117 estaba aquí.
  Supabase NO lanza excepción cuando una columna no existe; devuelve { error }.
  V3117 metía "datos" y no comprobaba r.error, por eso no se grababa historial automático.
*/
async function registrarHistorial(trabajoId,tipo,notas,datos){
  if(!trabajoId) return false;

  const s=sesion();

  const base={
    trabajo_id:String(trabajoId),
    usuario_id:String(s.id || ""),
    usuario:String(s.usuario || "sistema"),
    fecha:hoy(),
    hora_inicio:horaAhora(),
    hora_fin:null,
    tipo:String(tipo || "sistema"),
    notas:String(notas || "")
  };

  let r=await sb()
    .from("trabajos_historial")
    .insert([{...base,datos:datos || {}}])
    .select()
    .maybeSingle();

  if(r.error){
    r=await sb()
      .from("trabajos_historial")
      .insert([base])
      .select()
      .maybeSingle();
  }

  if(r.error){
    alert("No se pudo registrar historial automático: "+r.error.message);
    return false;
  }

  return true;
}

async function cargarClientes(){
  const r=await sb().from("clientes").select("*").order("nombre",{ascending:true});
  return r.error ? [] : (r.data || []);
}

async function cargarUsuarios(){
  const r=await sb().from("usuarios").select("*").eq("activo",true).order("nombre",{ascending:true});
  return r.error ? [] : (r.data || []);
}

async function cargarPlanificacion(id){
  if(!id) return [];
  const r=await sb()
    .from("trabajos_planificacion")
    .select("*")
    .eq("trabajo_id",String(id))
    .order("fecha",{ascending:true})
    .order("hora_inicio",{ascending:true});

  return r.error ? [] : (r.data || []);
}

async function cargarMateriales(id){
  if(!id) return [];
  const r=await sb()
    .from("trabajos_materiales")
    .select("*")
    .eq("trabajo_id",String(id))
    .order("created_at",{ascending:false});

  return r.error ? [] : (r.data || []);
}

async function cargarArchivos(id){
  if(!id) return [];
  const r=await sb()
    .from("trabajos_archivos")
    .select("*")
    .eq("trabajo_id",String(id))
    .order("created_at",{ascending:false});

  return r.error ? [] : (r.data || []);
}

async function cargarHistorial(id){
  if(!id) return [];
  const r=await sb()
    .from("trabajos_historial")
    .select("*")
    .eq("trabajo_id",String(id))
    .order("fecha",{ascending:false})
    .order("hora_inicio",{ascending:false});

  return r.error ? [] : (r.data || []);
}

async function cargarTrabajo(id){
  const r=await sb()
    .from("trabajos")
    .select("*")
    .eq("id",String(id))
    .maybeSingle();

  if(r.error || !r.data){
    alert("Trabajo no encontrado.");
    return null;
  }

  return r.data;
}

function materialPreparado(m){
  return m.preparado===true || m.preparado==="true" || m.preparado===1 || m.preparado==="1";
}

function resumenMateriales(lista){
  const total=(lista || []).length;
  const ok=(lista || []).filter(materialPreparado).length;
  return {total,ok,pendientes:Math.max(0,total-ok)};
}

async function cargarTrabajosBase(){
  let q=sb().from("trabajos").select("*");

  if(ZX_TR_FILTRO==="activos") q=q.eq("archivado",false);
  if(ZX_TR_FILTRO==="archivados") q=q.eq("archivado",true);
  if(ZX_TR_FILTRO==="pendientes") q=q.eq("archivado",false).eq("estado","pendiente");
  if(ZX_TR_FILTRO==="curso") q=q.eq("archivado",false).eq("estado","en_curso");
  if(ZX_TR_FILTRO==="terminados") q=q.eq("archivado",false).eq("estado","terminado");
  if(ZX_TR_FILTRO==="urgentes") q=q.eq("archivado",false).eq("prioridad","urgente");

  q=q.order("fecha",{ascending:true}).order("hora_inicio",{ascending:true});

  const r=await q;

  if(r.error) return {datos:[],error:r.error.message};

  ZX_TR_CACHE=r.data || [];
  return {datos:filtrarTrabajos(),error:""};
}

async function cargarTodosTrabajos(){
  const r=await sb().from("trabajos").select("id,estado,prioridad,archivado");
  return r.error ? [] : (r.data || []);
}

function textoBusqueda(t){
  return plano([
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
  const b=plano(ZX_TR_BUSQUEDA);
  if(!b) return ZX_TR_CACHE || [];
  return (ZX_TR_CACHE || []).filter(t=>textoBusqueda(t).includes(b));
}

function renderResumen(todos){
  const activos=todos.filter(t=>!t.archivado).length;
  const pendientes=todos.filter(t=>!t.archivado && t.estado==="pendiente").length;
  const curso=todos.filter(t=>!t.archivado && t.estado==="en_curso").length;
  const terminados=todos.filter(t=>!t.archivado && t.estado==="terminado").length;
  const urgentes=todos.filter(t=>!t.archivado && t.prioridad==="urgente").length;
  const archivados=todos.filter(t=>t.archivado===true).length;

  return `
    <div class="zx_card zx_tr_cabecera">
      <div class="zx_tr_top">
        <div>
          <h2>Trabajos</h2>
          <div class="zx_text">
            Activos: <b>${activos}</b> · Pendientes: <b>${pendientes}</b> · En curso: <b>${curso}</b><br>
            Terminados: <b>${terminados}</b> · Urgentes: <b>${urgentes}</b> · Archivados: <b>${archivados}</b>
          </div>
        </div>

        ${puedeGestionar()?`<button class="zx_tr_crear" id="tr_crear">Crear</button>`:""}
      </div>

      <input id="tr_buscar" class="zx_tr_buscar" placeholder="Buscar trabajo, cliente, dirección, teléfono..." value="${limpiar(ZX_TR_BUSQUEDA)}">

      <div class="zx_tr_filtros">
        ${[
          ["activos","Activos"],
          ["todos","Todos"],
          ["pendientes","Pendientes"],
          ["curso","En curso"],
          ["terminados","Terminados"],
          ["urgentes","Urgentes"],
          ["archivados","Archivados"]
        ].map(x=>`
          <button class="zx_tr_filtro ${ZX_TR_FILTRO===x[0]?"on":""}" data-filtro="${x[0]}">
            ${x[1]}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderPlanificacion(plan){
  if(!plan.length) return `<div class="zx_text">Sin planificación.</div>`;

  return `
    <div class="zx_tr_plan">
      ${plan.map(p=>`
        <div class="zx_tr_plan_row">
          <span>${limpiar(fechaES(p.fecha))}</span>
          <b>${limpiar(String(p.hora_inicio||"").slice(0,5) || "--:--")} - ${limpiar(String(p.hora_fin||"").slice(0,5) || "--:--")}</b>
          <span>${limpiar(p.nombre || p.usuario || "Operario")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMateriales(lista){
  if(!lista.length) return `<div class="zx_text">Sin materiales.</div>`;

  return `
    <div class="zx_tr_materiales">
      ${lista.map(m=>`
        <label class="zx_tr_mat ${materialPreparado(m)?"ok":""}">
          <input type="checkbox" ${materialPreparado(m)?"checked":""} data-mat-check="${limpiar(m.id)}">
          <span>
            <b>${limpiar(m.material || "Material")}</b>
            <em>${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}</em>
            <small>${materialPreparado(m) ? "Preparado"+(m.preparado_por ? " por "+limpiar(m.preparado_por) : "") : "Pendiente de preparar"}</small>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderArchivos(lista){
  if(!lista.length) return `<div class="zx_text">Sin archivos visibles.</div>`;

  return `
    <div class="zx_tr_archivos">
      ${lista.map(a=>`
        <div class="zx_tr_file">
          <div>
            <b>${limpiar(a.nombre || "Archivo")}</b>
            <span>${limpiar(a.tipo || "")}</span>
          </div>
          <button data-open-file="${limpiar(a.url || "")}">Abrir</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHistorial(lista){
  if(!lista.length) return `<div class="zx_text">Sin historial.</div>`;

  return `
    <div class="zx_tr_historial">
      ${lista.map(h=>`
        <div class="zx_tr_hist">
          <b>${limpiar(h.usuario || "Usuario")}</b><br>
          ${limpiar(fechaES(h.fecha || ""))}${h.hora_inicio ? " · "+limpiar(String(h.hora_inicio).slice(0,5)) : ""}<br>
          Tipo: ${limpiar(h.tipo || "-")}
          ${h.notas ? "<br>"+limpiar(h.notas) : ""}
        </div>
      `).join("")}
    </div>
  `;
}

async function renderTrabajo(t){
  const [plan,materiales,archivos,historial]=await Promise.all([
    cargarPlanificacion(t.id),
    cargarMateriales(t.id),
    cargarArchivos(t.id),
    cargarHistorial(t.id)
  ]);

  const dir=direccionTrabajo(t);
  const mat=resumenMateriales(materiales);

  return `
    <div class="zx_tr_card ${t.archivado?"archivado":""}">
      <div class="zx_tr_card_head">
        <div>
          <h3>${limpiar(t.titulo || "Trabajo")}</h3>

          <div class="zx_tr_badges">
            <span class="${claseEstado(t.estado)}">${limpiar(estadoTexto(t.estado))}</span>
            <span class="${clasePrioridad(t.prioridad)}">${limpiar(prioridadTexto(t.prioridad))}</span>
            ${t.archivado ? `<span class="zx_tr_estado_neutro">Archivado</span>` : ""}
          </div>
        </div>

        <div class="zx_tr_mat_resumen ${mat.pendientes===0 && mat.total ? "ok" : ""}">
          <b>${mat.ok}/${mat.total}</b>
          <span>Material</span>
        </div>
      </div>

      <div class="zx_tr_datos">
        <b>Cliente:</b> ${limpiar(t.cliente || "-")}<br>
        <b>Contacto:</b> ${limpiar(t.persona_contacto || "-")}<br>
        <b>Teléfono:</b> ${limpiar(t.telefono_contacto || "-")}<br>
        <b>Dirección:</b> ${dir ? `<button class="zx_link" data-map="${limpiar(dir)}">${limpiar(dir)}</button>` : "-"}<br>
        <b>Descripción:</b> ${limpiar(t.descripcion || "-")}<br>
        <b>Notas:</b> ${limpiar(t.notas || "-")}
      </div>

      <details open class="zx_tr_section">
        <summary>Planificación</summary>
        ${renderPlanificacion(plan)}
      </details>

      <details open class="zx_tr_section">
        <summary>Materiales</summary>
        ${renderMateriales(materiales)}
        ${puedeGestionar()?`<button class="zx_btn_big zx_azul" data-materiales="${limpiar(t.id)}">Añadir / gestionar</button>`:""}
      </details>

      <details class="zx_tr_section">
        <summary>Archivos</summary>
        ${renderArchivos(archivos)}
        ${puedeGestionar()?`
          <button class="zx_btn_big zx_azul" data-add-file="${limpiar(t.id)}">Añadir archivo</button>
          <button class="zx_btn_big zx_gris" data-gest-file="${limpiar(t.id)}">Gestionar archivos</button>
        `:""}
      </details>

      <details class="zx_tr_section">
        <summary>Historial</summary>
        ${renderHistorial(historial)}
        ${puedeGestionar()?`<button class="zx_btn_big zx_azul" data-add-hist="${limpiar(t.id)}">Añadir historial</button>`:""}
      </details>

      <div class="zx_tr_acciones">
        ${puedeGestionar()?`<button class="zx_btn_big zx_naranja" data-estado="${limpiar(t.id)}">Cambiar estado</button>`:""}
        ${t.telefono_contacto ? `<button class="zx_btn_big zx_azul" data-tel="${limpiar(t.telefono_contacto)}">Teléfono</button>` : ""}
        ${dir ? `<button class="zx_btn_big zx_azul" data-map="${limpiar(dir)}">Mapa</button>` : ""}
        ${puedeGestionar()?`<button class="zx_btn_big zx_azul" data-edit="${limpiar(t.id)}">Editar</button>`:""}
        ${puedeGestionar()?`<button class="zx_btn_big zx_rojo" data-gestionar="${limpiar(t.id)}">Gestionar</button>`:""}
      </div>
    </div>
  `;
}

async function pintarTrabajos(){
  const cont=app();
  if(!cont) return;

  if(!puedeEntrar()){
    cont.innerHTML=`
      <div class="zx_card">
        <h2>Trabajos</h2>
        <div class="zx_text">No tienes permiso para acceder a Trabajos.</div>
      </div>
    `;
    return;
  }

  cont.innerHTML=`
    <div class="zx_card">
      <h2>Trabajos</h2>
      <div class="zx_text">Cargando trabajos...</div>
    </div>
  `;

  const [base,todos]=await Promise.all([
    cargarTrabajosBase(),
    cargarTodosTrabajos()
  ]);

  if(base.error){
    cont.innerHTML=`
      <div class="zx_card">
        <h2>Trabajos</h2>
        <div class="zx_text">Error cargando trabajos: ${limpiar(base.error)}</div>
      </div>
    `;
    return;
  }

  const tarjetas=[];

  for(const t of base.datos){
    tarjetas.push(await renderTrabajo(t));
  }

  cont.innerHTML=`
    ${renderResumen(todos)}
    <div class="zx_card">
      <h2>Listado</h2>
      ${tarjetas.length ? tarjetas.join("") : `<div class="zx_text">Sin trabajos.</div>`}
    </div>
  `;

  activarEventos();
}

function activarEventos(){
  const crear=document.getElementById("tr_crear");
  if(crear) crear.onclick=()=>abrirFormulario({});

  const buscador=document.getElementById("tr_buscar");
  if(buscador){
    buscador.oninput=function(){
      ZX_TR_BUSQUEDA=buscador.value || "";
      clearTimeout(ZX_TR_TIMER);
      ZX_TR_TIMER=setTimeout(pintarTrabajos,250);
    };
  }

  document.querySelectorAll("[data-filtro]").forEach(b=>b.onclick=()=>{ZX_TR_FILTRO=b.dataset.filtro;pintarTrabajos()});
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editarTrabajo(b.dataset.edit));
  document.querySelectorAll("[data-estado]").forEach(b=>b.onclick=()=>cambiarEstadoTrabajo(b.dataset.estado));
  document.querySelectorAll("[data-gestionar]").forEach(b=>b.onclick=()=>gestionarTrabajo(b.dataset.gestionar));
  document.querySelectorAll("[data-materiales]").forEach(b=>b.onclick=()=>abrirMateriales(b.dataset.materiales));
  document.querySelectorAll("[data-add-file]").forEach(b=>b.onclick=()=>abrirArchivo(b.dataset.addFile));
  document.querySelectorAll("[data-gest-file]").forEach(b=>b.onclick=()=>gestionarArchivos(b.dataset.gestFile));
  document.querySelectorAll("[data-add-hist]").forEach(b=>b.onclick=()=>abrirHistorial(b.dataset.addHist));
  document.querySelectorAll("[data-tel]").forEach(b=>b.onclick=()=>menuTelefono(b.dataset.tel));
  document.querySelectorAll("[data-map]").forEach(b=>b.onclick=()=>menuMapa(b.dataset.map));
  document.querySelectorAll("[data-open-file]").forEach(b=>b.onclick=()=>{if(b.dataset.openFile) window.open(b.dataset.openFile,"_blank")});
  document.querySelectorAll("[data-mat-check]").forEach(c=>c.onchange=()=>marcarMaterial(c.dataset.matCheck,c.checked));
}

function opcionesClientes(clientes,valor){
  return `<option value="">Sin cliente</option>`+
    clientes.map(c=>`
      <option value="${limpiar(c.id)}" ${String(valor||"")===String(c.id) ? "selected" : ""}>
        ${limpiar(c.nombre || "")}
      </option>
    `).join("");
}

function opcionesUsuarios(usuarios,valor){
  return `<option value="">Seleccionar operario</option>`+
    usuarios.map(u=>`
      <option value="${limpiar(u.id)}"
        data-usuario="${limpiar(u.usuario || "")}"
        data-nombre="${limpiar(u.nombre || u.usuario || "")}"
        ${String(valor||"")===String(u.id) ? "selected" : ""}>
        ${limpiar(u.nombre || u.usuario || "")}
      </option>
    `).join("");
}

function filaPlan(i,usuarios,p){
  p=p || {};

  return `
    <div class="zx_tr_plan_form" data-plan-row="${i}">
      <div class="zx_tr_grid3">
        <div>
          <label class="zx_label">Fecha</label>
          <input class="tr_plan_fecha" type="date" value="${limpiar(normalizarFecha(p.fecha || hoy()))}">
        </div>

        <div>
          <label class="zx_label">Inicio</label>
          <input class="tr_plan_inicio" type="time" value="${limpiar(String(p.hora_inicio || "").slice(0,5))}">
        </div>

        <div>
          <label class="zx_label">Fin</label>
          <input class="tr_plan_fin" type="time" value="${limpiar(String(p.hora_fin || "").slice(0,5))}">
        </div>
      </div>

      <label class="zx_label">Operario</label>
      <select class="tr_plan_usuario">${opcionesUsuarios(usuarios,p.usuario_id)}</select>

      <label class="zx_label">Notas de esta línea</label>
      <textarea class="tr_plan_notas" rows="2">${limpiar(p.notas || "")}</textarea>

      <div class="zx_tr_grid2">
        <button class="zx_btn_big zx_azul tr_dup" type="button">Duplicar</button>
        <button class="zx_btn_big zx_rojo tr_quitar" type="button">Quitar</button>
      </div>
    </div>
  `;
}

function leerPlan(){
  return [...document.querySelectorAll("[data-plan-row]")].map(r=>{
    const sel=r.querySelector(".tr_plan_usuario");
    const opt=sel.options[sel.selectedIndex];

    return {
      fecha:normalizarFecha(r.querySelector(".tr_plan_fecha").value),
      hora_inicio:r.querySelector(".tr_plan_inicio").value || null,
      hora_fin:r.querySelector(".tr_plan_fin").value || null,
      usuario_id:sel.value || null,
      usuario:opt ? opt.dataset.usuario || "" : "",
      nombre:opt ? opt.dataset.nombre || "" : "",
      notas:r.querySelector(".tr_plan_notas").value.trim()
    };
  }).filter(p=>p.fecha && p.usuario_id);
}

async function abrirFormulario(t){
  t=t || {};

  const [clientes,usuarios,plan]=await Promise.all([
    cargarClientes(),
    cargarUsuarios(),
    cargarPlanificacion(t.id)
  ]);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${t.id ? "Editar trabajo" : "Nuevo trabajo"}</h2>

        <label class="zx_label">Título</label>
        <input id="tr_titulo" value="${limpiar(t.titulo || "")}">

        <label class="zx_label">Prioridad</label>
        <select id="tr_prioridad">
          <option value="baja" ${t.prioridad==="baja" ? "selected" : ""}>Baja</option>
          <option value="media" ${!t.prioridad || t.prioridad==="media" ? "selected" : ""}>Media</option>
          <option value="alta" ${t.prioridad==="alta" ? "selected" : ""}>Alta</option>
          <option value="urgente" ${t.prioridad==="urgente" ? "selected" : ""}>Urgente</option>
        </select>

        <label class="zx_label">Cliente</label>
        <select id="tr_cliente">${opcionesClientes(clientes,t.cliente_id)}</select>

        <label class="zx_label">Persona contacto obra</label>
        <input id="tr_persona" value="${limpiar(t.persona_contacto || "")}">

        <label class="zx_label">Teléfono contacto obra</label>
        <input id="tr_tel" type="tel" value="${limpiar(t.telefono_contacto || "")}">

        <h3>Dirección de obra</h3>

        <label class="zx_label">Dirección</label>
        <input id="tr_dir" value="${limpiar(t.direccion_obra || t.direccion || "")}">

        <label class="zx_label">Población</label>
        <input id="tr_poblacion" value="${limpiar(t.poblacion || "")}">

        <label class="zx_label">Provincia</label>
        <input id="tr_provincia" value="${limpiar(t.provincia || "")}">

        <label class="zx_label">Código postal</label>
        <input id="tr_cp" value="${limpiar(t.codigo_postal || "")}">

        <label class="zx_label">País</label>
        <input id="tr_pais" value="${limpiar(t.pais || "España")}">

        <h3>Planificación</h3>

        <div id="tr_plan_lista">
          ${plan.length ? plan.map((p,i)=>filaPlan(i,usuarios,p)).join("") : filaPlan(0,usuarios,{})}
        </div>

        <button class="zx_btn_big zx_azul" id="tr_add_plan">Añadir día / operario</button>

        <label class="zx_label">Descripción</label>
        <textarea id="tr_desc" rows="4">${limpiar(t.descripcion || "")}</textarea>

        <label class="zx_label">Notas internas</label>
        <textarea id="tr_notas" rows="4">${limpiar(t.notas || "")}</textarea>

        <button class="zx_btn_big zx_verde" id="tr_guardar">Guardar trabajo</button>
        <button class="zx_btn_big zx_gris" id="tr_cancelar">Cancelar</button>
      </div>
    </div>
  `);

  const selCliente=document.getElementById("tr_cliente");

  selCliente.onchange=function(){
    const c=clientes.find(x=>String(x.id)===String(selCliente.value));
    if(!c) return;

    document.getElementById("tr_persona").value=c.persona_contacto || "";
    document.getElementById("tr_tel").value=c.telefono || c.telefono1 || "";
    document.getElementById("tr_dir").value=c.direccion || "";
    document.getElementById("tr_poblacion").value=c.poblacion || "";
    document.getElementById("tr_provincia").value=c.provincia || "";
    document.getElementById("tr_cp").value=c.codigo_postal || "";
    document.getElementById("tr_pais").value=c.pais || "España";
  };

  function activarPlan(){
    document.querySelectorAll(".tr_quitar").forEach(b=>b.onclick=function(){
      const rows=document.querySelectorAll("[data-plan-row]");
      if(rows.length<=1){
        alert("Debe quedar al menos una línea de planificación.");
        return;
      }
      b.closest("[data-plan-row]").remove();
    });

    document.querySelectorAll(".tr_dup").forEach(b=>b.onclick=function(){
      const r=b.closest("[data-plan-row]");
      const sel=r.querySelector(".tr_plan_usuario");

      const p={
        fecha:r.querySelector(".tr_plan_fecha").value,
        hora_inicio:r.querySelector(".tr_plan_inicio").value,
        hora_fin:r.querySelector(".tr_plan_fin").value,
        usuario_id:sel.value,
        notas:r.querySelector(".tr_plan_notas").value
      };

      document.getElementById("tr_plan_lista").insertAdjacentHTML(
        "beforeend",
        filaPlan(document.querySelectorAll("[data-plan-row]").length,usuarios,p)
      );

      activarPlan();
    });
  }

  activarPlan();

  document.getElementById("tr_add_plan").onclick=function(){
    document.getElementById("tr_plan_lista").insertAdjacentHTML(
      "beforeend",
      filaPlan(document.querySelectorAll("[data-plan-row]").length,usuarios,{})
    );
    activarPlan();
  };

  document.getElementById("tr_cancelar").onclick=cerrarModal;
  document.getElementById("tr_guardar").onclick=()=>guardarTrabajo(t.id || null,clientes);
}

async function editarTrabajo(id){
  const t=await cargarTrabajo(id);
  if(t) abrirFormulario(t);
}

function firmaPlan(plan){
  return plan.map(p=>[p.fecha,p.hora_inicio,p.hora_fin,p.usuario_id,p.nombre,p.notas].join("|")).join(";");
}

async function guardarTrabajo(id,clientes){
  const plan=leerPlan();

  if(!plan.length){
    alert("Añade al menos una línea de planificación.");
    return;
  }

  const clienteId=document.getElementById("tr_cliente").value || null;
  const cliente=clientes.find(c=>String(c.id)===String(clienteId));
  const primera=plan[0];
  const s=sesion();

  const data={
    titulo:document.getElementById("tr_titulo").value.trim(),
    prioridad:document.getElementById("tr_prioridad").value || "media",
    cliente_id:clienteId,
    cliente:cliente ? cliente.nombre || "" : "",
    usuario:plan.map(p=>p.nombre || p.usuario).filter(Boolean).join(", "),
    fecha:primera.fecha,
    hora_inicio:primera.hora_inicio,
    hora_fin:primera.hora_fin,
    direccion_obra:document.getElementById("tr_dir").value.trim(),
    direccion:document.getElementById("tr_dir").value.trim(),
    poblacion:document.getElementById("tr_poblacion").value.trim(),
    provincia:document.getElementById("tr_provincia").value.trim(),
    codigo_postal:document.getElementById("tr_cp").value.trim(),
    pais:document.getElementById("tr_pais").value.trim(),
    persona_contacto:document.getElementById("tr_persona").value.trim(),
    telefono_contacto:document.getElementById("tr_tel").value.trim(),
    descripcion:document.getElementById("tr_desc").value.trim(),
    notas:document.getElementById("tr_notas").value.trim(),
    creado_por:s.usuario || ""
  };

  if(!data.titulo){
    alert("Introduce título.");
    return;
  }

  let anterior=null;
  let planAnterior=[];

  if(id){
    anterior=await cargarTrabajo(id);
    planAnterior=await cargarPlanificacion(id);
  }

  let r;

  if(id){
    r=await sb().from("trabajos").update(data).eq("id",String(id)).select().maybeSingle();
  }else{
    data.estado="pendiente";
    data.archivado=false;
    r=await sb().from("trabajos").insert([data]).select().maybeSingle();
  }

  if(r.error){
    alert("Error guardando trabajo: "+r.error.message);
    return;
  }

  const trabajoId=id || r.data.id;

  await sb().from("trabajos_planificacion").delete().eq("trabajo_id",String(trabajoId));

  const insertPlan=plan.map(p=>({
    trabajo_id:String(trabajoId),
    fecha:p.fecha,
    hora_inicio:p.hora_inicio,
    hora_fin:p.hora_fin,
    usuario_id:String(p.usuario_id || ""),
    usuario:p.usuario || "",
    nombre:p.nombre || "",
    notas:p.notas || ""
  }));

  const rp=await sb().from("trabajos_planificacion").insert(insertPlan);

  if(rp.error){
    alert("Trabajo guardado, pero falló la planificación: "+rp.error.message);
    return;
  }

  await sincronizarAgenda(trabajoId,{...data,id:trabajoId,estado:r.data?.estado || data.estado || "pendiente",archivado:r.data?.archivado || false},plan);

  if(id){
    const cambios=[];

    if(anterior && String(anterior.titulo||"")!==String(data.titulo||"")) cambios.push("título");
    if(anterior && String(anterior.prioridad||"")!==String(data.prioridad||"")) cambios.push("prioridad");
    if(anterior && String(anterior.cliente||"")!==String(data.cliente||"")) cambios.push("cliente");
    if(anterior && String(anterior.direccion_obra||anterior.direccion||"")!==String(data.direccion_obra||"")) cambios.push("dirección");
    if(firmaPlan(planAnterior)!==firmaPlan(plan)) cambios.push("planificación");

    await registrarHistorial(
      trabajoId,
      "edicion",
      "Trabajo editado"+(cambios.length ? ": "+cambios.join(", ") : "."),
      {cambios:cambios}
    );
  }else{
    await registrarHistorial(trabajoId,"creacion","Trabajo creado.");
  }

  cerrarModal();
  pintarTrabajos();
}

async function sincronizarAgenda(trabajoId,data,plan){
  await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(trabajoId));

  if(data.archivado) return;

  for(const p of plan){
    await sb().from("agenda_eventos").insert([{
      tipo:"trabajo",
      titulo:"Trabajo - "+data.titulo,
      descripcion:data.descripcion || "",
      fecha_inicio:p.fecha,
      fecha_fin:p.fecha,
      hora_inicio:p.hora_inicio,
      hora_fin:p.hora_fin,
      cliente_id:String(data.cliente_id || ""),
      cliente:data.cliente || "",
      usuario_id:String(p.usuario_id || ""),
      usuario:p.nombre || p.usuario || "",
      estado:estadoAgenda(data.estado),
      prioridad:data.prioridad || "media",
      visible_para:"todos",
      origen:"trabajos",
      origen_id:String(trabajoId),
      creado_por:data.creado_por || ""
    }]);
  }
}

async function cambiarEstadoTrabajo(id){
  const t=await cargarTrabajo(id);
  if(!t) return;

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Cambiar estado</h2>

        <div class="zx_text">
          <b>${limpiar(t.titulo || "Trabajo")}</b><br>
          Estado actual: ${limpiar(estadoTexto(t.estado))}
        </div>

        <button class="zx_btn_big zx_naranja" id="tr_est_pendiente">Pendiente</button>
        <button class="zx_btn_big zx_azul" id="tr_est_curso">En curso</button>
        <button class="zx_btn_big zx_verde" id="tr_est_terminado">Terminado</button>
        <button class="zx_btn_big zx_rojo" id="tr_est_cancelado">Cancelado</button>
        <button class="zx_btn_big zx_gris" id="tr_est_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_est_cerrar").onclick=cerrarModal;
  document.getElementById("tr_est_pendiente").onclick=()=>aplicarEstado(id,t,"pendiente");
  document.getElementById("tr_est_curso").onclick=()=>aplicarEstado(id,t,"en_curso");
  document.getElementById("tr_est_terminado").onclick=()=>aplicarEstado(id,t,"terminado");
  document.getElementById("tr_est_cancelado").onclick=()=>aplicarEstado(id,t,"cancelado");
}

async function aplicarEstado(id,t,nuevo){
  const actual=t.estado || "pendiente";

  if(actual===nuevo){
    cerrarModal();
    return;
  }

  if(nuevo==="cancelado" && !confirm("¿Cancelar este trabajo?")){
    return;
  }

  const r=await sb().from("trabajos").update({estado:nuevo}).eq("id",String(id));

  if(r.error){
    alert("Error cambiando estado: "+r.error.message);
    return;
  }

  await sb()
    .from("agenda_eventos")
    .update({estado:estadoAgenda(nuevo),updated_at:new Date().toISOString()})
    .eq("origen","trabajos")
    .eq("origen_id",String(id));

  await registrarHistorial(
    id,
    "estado",
    "Estado cambiado de "+estadoTexto(actual)+" a "+estadoTexto(nuevo)+".",
    {anterior:actual,nuevo:nuevo}
  );

  cerrarModal();
  pintarTrabajos();
}

async function gestionarTrabajo(id){
  const t=await cargarTrabajo(id);
  if(!t) return;

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Gestionar trabajo</h2>

        <div class="zx_text">
          <b>${limpiar(t.titulo || "Trabajo")}</b><br>
          Cliente: ${limpiar(t.cliente || "-")}<br>
          Estado: ${limpiar(estadoTexto(t.estado))}
        </div>

        <div class="zx_tr_aviso">
          Archivar, restaurar y borrar definitivamente requieren PIN administrador.
        </div>

        <button class="zx_btn_big ${t.archivado ? "zx_verde" : "zx_naranja"}" id="tr_archivar">
          ${t.archivado ? "Restaurar trabajo" : "Archivar trabajo"}
        </button>

        ${esAdmin() ? `<button class="zx_btn_big zx_rojo" id="tr_borrar_def">Borrar definitivamente</button>` : ""}

        <button class="zx_btn_big zx_gris" id="tr_cerrar_gestion">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_cerrar_gestion").onclick=cerrarModal;

  document.getElementById("tr_archivar").onclick=async function(){
    const ok=await pedirPinAdmin();
    if(!ok) return;

    const nuevoArchivado=!t.archivado;

    const r=await sb().from("trabajos").update({archivado:nuevoArchivado}).eq("id",String(id));

    if(r.error){
      alert("Error: "+r.error.message);
      return;
    }

    if(nuevoArchivado){
      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));
      await registrarHistorial(id,"archivo","Trabajo archivado.");
    }else{
      await sincronizarAgenda(id,{...t,archivado:false},await cargarPlanificacion(id));
      await registrarHistorial(id,"archivo","Trabajo restaurado.");
    }

    cerrarModal();
    pintarTrabajos();
  };

  const borrar=document.getElementById("tr_borrar_def");

  if(borrar){
    borrar.onclick=async function(){
      const ok=await pedirPinAdmin();
      if(!ok) return;

      const texto=prompt("Para borrar definitivamente escribe: BORRAR");

      if(String(texto || "").trim().toUpperCase()!=="BORRAR"){
        alert("Borrado cancelado.");
        return;
      }

      await registrarHistorial(id,"borrado","Trabajo borrado definitivamente.");

      await sb().from("agenda_eventos").delete().eq("origen","trabajos").eq("origen_id",String(id));
      await sb().from("trabajos_planificacion").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_archivos").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_materiales").delete().eq("trabajo_id",String(id));
      await sb().from("trabajos_historial").delete().eq("trabajo_id",String(id));

      const r=await sb().from("trabajos").delete().eq("id",String(id));

      if(r.error){
        alert("Error borrando: "+r.error.message);
        return;
      }

      cerrarModal();
      pintarTrabajos();
    };
  }
}

async function marcarMaterial(id,preparado){
  const previo=await sb().from("trabajos_materiales").select("*").eq("id",String(id)).maybeSingle();

  const r=await sb()
    .from("trabajos_materiales")
    .update({
      preparado:preparado,
      preparado_at:preparado ? new Date().toISOString() : null,
      preparado_por:preparado ? (sesion().usuario || "") : ""
    })
    .eq("id",String(id));

  if(r.error){
    alert("Error actualizando material: "+r.error.message);
    return;
  }

  if(previo.data){
    await registrarHistorial(
      previo.data.trabajo_id,
      "material",
      String(previo.data.material || "Material")+" marcado como "+(preparado ? "preparado" : "pendiente")+"."
    );
  }

  pintarTrabajos();
}

function renderMaterialesGestion(lista){
  if(!lista.length) return `<div class="zx_text">Sin materiales.</div>`;

  return `
    <div class="zx_tr_gestion_lista">
      ${lista.map(m=>`
        <div class="zx_tr_gestion_item">
          <div>
            <b>${limpiar(m.material || "Material")}</b>
            <span>${limpiar(m.cantidad || "0")} ${limpiar(m.unidad || "")}</span>
            ${m.notas ? `<small>${limpiar(m.notas)}</small>` : ""}
          </div>

          <div class="zx_tr_gestion_btns">
            <button class="zx_azul" data-edit-mat="${limpiar(m.id)}">Editar</button>
            <button class="zx_rojo" data-del-mat="${limpiar(m.id)}">Borrar</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function abrirMateriales(trabajoId){
  const [t,materiales]=await Promise.all([
    cargarTrabajo(trabajoId),
    cargarMateriales(trabajoId)
  ]);

  if(!t) return;

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Materiales</h2>

        <div class="zx_text">
          <b>${limpiar(t.titulo || "Trabajo")}</b><br>
          ${limpiar(t.cliente || "")}
        </div>

        <label class="zx_label">Material</label>
        <input id="tr_mat_nombre" placeholder="Material">

        <div class="zx_tr_grid2">
          <div>
            <label class="zx_label">Cantidad</label>
            <input id="tr_mat_cantidad" type="number" step="0.01" value="1">
          </div>

          <div>
            <label class="zx_label">Unidad</label>
            <input id="tr_mat_unidad" value="ud">
          </div>
        </div>

        <label class="zx_label">Notas</label>
        <textarea id="tr_mat_notas" rows="2"></textarea>

        <button class="zx_btn_big zx_verde" id="tr_mat_guardar">Añadir material</button>

        <h3>Lista</h3>
        ${renderMaterialesGestion(materiales)}

        <button class="zx_btn_big zx_gris" id="tr_mat_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_mat_cerrar").onclick=()=>{cerrarModal();pintarTrabajos()};

  document.getElementById("tr_mat_guardar").onclick=async function(){
    const nombre=document.getElementById("tr_mat_nombre").value.trim();
    const cantidad=Number(String(document.getElementById("tr_mat_cantidad").value || 0).replace(",","."));
    const unidad=document.getElementById("tr_mat_unidad").value.trim() || "ud";
    const notas=document.getElementById("tr_mat_notas").value.trim();

    if(!nombre){
      alert("Introduce material.");
      return;
    }

    if(!Number.isFinite(cantidad) || cantidad<=0){
      alert("Cantidad no válida.");
      return;
    }

    const r=await sb()
      .from("trabajos_materiales")
      .insert([{
        trabajo_id:String(trabajoId),
        material:nombre,
        cantidad,
        unidad,
        notas,
        created_at:new Date().toISOString()
      }]);

    if(r.error){
      alert("Error guardando material: "+r.error.message);
      return;
    }

    await registrarHistorial(trabajoId,"material","Material añadido: "+nombre+" ("+cantidad+" "+unidad+").");
    abrirMateriales(trabajoId);
  };

  document.querySelectorAll("[data-edit-mat]").forEach(b=>b.onclick=()=>editarMaterial(trabajoId,b.dataset.editMat));
  document.querySelectorAll("[data-del-mat]").forEach(b=>b.onclick=()=>borrarMaterial(trabajoId,b.dataset.delMat));
}

async function editarMaterial(trabajoId,materialId){
  const r=await sb().from("trabajos_materiales").select("*").eq("id",String(materialId)).maybeSingle();

  if(r.error || !r.data){
    alert("Material no encontrado.");
    return;
  }

  const m=r.data;

  const nombre=prompt("Material:",m.material || "");
  if(nombre===null) return;

  const cantidadTxt=prompt("Cantidad:",String(m.cantidad || 1));
  if(cantidadTxt===null) return;

  const unidad=prompt("Unidad:",m.unidad || "ud");
  if(unidad===null) return;

  const notas=prompt("Notas:",m.notas || "");
  if(notas===null) return;

  const cantidad=Number(String(cantidadTxt || 0).replace(",","."));

  if(!String(nombre).trim()){
    alert("Material obligatorio.");
    return;
  }

  if(!Number.isFinite(cantidad) || cantidad<=0){
    alert("Cantidad no válida.");
    return;
  }

  const up=await sb()
    .from("trabajos_materiales")
    .update({
      material:String(nombre).trim(),
      cantidad,
      unidad:String(unidad || "ud").trim() || "ud",
      notas:String(notas || "").trim()
    })
    .eq("id",String(materialId));

  if(up.error){
    alert("Error editando material: "+up.error.message);
    return;
  }

  await registrarHistorial(trabajoId,"material","Material editado: "+String(nombre).trim()+".");
  abrirMateriales(trabajoId);
}

async function borrarMaterial(trabajoId,materialId){
  const r0=await sb().from("trabajos_materiales").select("*").eq("id",String(materialId)).maybeSingle();

  if(r0.error || !r0.data){
    alert("Material no encontrado.");
    return;
  }

  if(!confirm("¿Borrar este material?")) return;

  const r=await sb().from("trabajos_materiales").delete().eq("id",String(materialId));

  if(r.error){
    alert("Error borrando material: "+r.error.message);
    return;
  }

  await registrarHistorial(trabajoId,"material","Material borrado: "+String(r0.data.material || "Material")+".");
  abrirMateriales(trabajoId);
}

async function abrirArchivo(trabajoId){
  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Añadir archivo</h2>

        <label class="zx_label">Tipo</label>
        <select id="tr_file_tipo">
          <option value="plano">Plano</option>
          <option value="foto">Foto</option>
          <option value="video">Vídeo</option>
          <option value="documento">Documento</option>
          <option value="manual">Manual</option>
          <option value="otro">Otro</option>
        </select>

        <label class="zx_label">Archivo</label>
        <input id="tr_file_archivo" type="file">

        <label class="zx_label">Nombre visible</label>
        <input id="tr_file_nombre">

        <button class="zx_btn_big zx_verde" id="tr_file_guardar">Guardar archivo</button>
        <button class="zx_btn_big zx_gris" id="tr_file_cerrar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_file_cerrar").onclick=cerrarModal;

  document.getElementById("tr_file_guardar").onclick=async function(){
    const file=document.getElementById("tr_file_archivo").files[0];

    if(!file){
      alert("Selecciona archivo.");
      return;
    }

    const tipo=document.getElementById("tr_file_tipo").value;
    const limpio=String(file.name || "archivo").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path="trabajos/"+trabajoId+"/"+tipo+"/"+Date.now()+"_"+limpio;

    const up=await sb().storage.from("zentryx-trabajos").upload(path,file,{upsert:true});

    if(up.error){
      alert("Error subiendo archivo: "+up.error.message);
      return;
    }

    const url=sb().storage.from("zentryx-trabajos").getPublicUrl(path).data.publicUrl;
    const nombre=document.getElementById("tr_file_nombre").value.trim() || file.name;

    const r=await sb()
      .from("trabajos_archivos")
      .insert([{
        trabajo_id:String(trabajoId),
        tipo,
        nombre,
        url,
        path
      }]);

    if(r.error){
      alert("Error guardando archivo: "+r.error.message);
      return;
    }

    await registrarHistorial(trabajoId,"archivo","Archivo añadido: "+nombre+".");
    cerrarModal();
    pintarTrabajos();
  };
}

async function gestionarArchivos(trabajoId){
  const archivos=await cargarArchivos(trabajoId);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Gestionar archivos</h2>

        ${
          archivos.length
          ? archivos.map(a=>`
            <div class="zx_tr_gestion_item">
              <div>
                <b>${limpiar(a.nombre || "Archivo")}</b>
                <span>${limpiar(a.tipo || "")}</span>
              </div>

              <div class="zx_tr_gestion_btns">
                <button class="zx_azul" data-open-file="${limpiar(a.url || "")}">Abrir</button>
                <button class="zx_azul" data-edit-file="${limpiar(a.id)}">Editar</button>
                <button class="zx_rojo" data-del-file="${limpiar(a.id)}">Borrar</button>
              </div>
            </div>
          `).join("")
          : `<div class="zx_text">Sin archivos.</div>`
        }

        <button class="zx_btn_big zx_gris" id="tr_files_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_files_cerrar").onclick=()=>{cerrarModal();pintarTrabajos()};

  document.querySelectorAll("[data-open-file]").forEach(b=>b.onclick=()=>{if(b.dataset.openFile) window.open(b.dataset.openFile,"_blank")});
  document.querySelectorAll("[data-edit-file]").forEach(b=>b.onclick=()=>editarArchivo(trabajoId,b.dataset.editFile));
  document.querySelectorAll("[data-del-file]").forEach(b=>b.onclick=()=>borrarArchivo(trabajoId,b.dataset.delFile));
}

async function editarArchivo(trabajoId,archivoId){
  const r=await sb().from("trabajos_archivos").select("*").eq("id",String(archivoId)).maybeSingle();

  if(r.error || !r.data){
    alert("Archivo no encontrado.");
    return;
  }

  const a=r.data;

  const nombre=prompt("Nombre visible:",a.nombre || "");
  if(nombre===null) return;

  const tipo=prompt("Tipo:",a.tipo || "documento");
  if(tipo===null) return;

  const up=await sb()
    .from("trabajos_archivos")
    .update({
      nombre:String(nombre || "").trim() || a.nombre || "Archivo",
      tipo:String(tipo || "").trim() || a.tipo || "documento"
    })
    .eq("id",String(archivoId));

  if(up.error){
    alert("Error editando archivo: "+up.error.message);
    return;
  }

  await registrarHistorial(trabajoId,"archivo","Archivo editado: "+String(nombre || a.nombre || "Archivo")+".");
  gestionarArchivos(trabajoId);
}

async function borrarArchivo(trabajoId,archivoId){
  const r0=await sb().from("trabajos_archivos").select("*").eq("id",String(archivoId)).maybeSingle();

  if(r0.error || !r0.data){
    alert("Archivo no encontrado.");
    return;
  }

  if(!confirm("¿Borrar este archivo?")) return;

  const a=r0.data;

  if(a.path){
    try{
      await sb().storage.from("zentryx-trabajos").remove([a.path]);
    }catch(e){}
  }

  const r=await sb().from("trabajos_archivos").delete().eq("id",String(archivoId));

  if(r.error){
    alert("Error borrando archivo: "+r.error.message);
    return;
  }

  await registrarHistorial(trabajoId,"archivo","Archivo borrado: "+String(a.nombre || "Archivo")+".");
  gestionarArchivos(trabajoId);
}

async function abrirHistorial(trabajoId){
  const usuarios=await cargarUsuarios();

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Añadir historial</h2>

        <label class="zx_label">Usuario</label>
        <select id="tr_hist_usuario">${opcionesUsuarios(usuarios,sesion().id || "")}</select>

        <label class="zx_label">Fecha</label>
        <input id="tr_hist_fecha" type="date" value="${hoy()}">

        <div class="zx_tr_grid2">
          <div>
            <label class="zx_label">Inicio</label>
            <input id="tr_hist_inicio" type="time" value="${horaAhora()}">
          </div>

          <div>
            <label class="zx_label">Fin</label>
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
        <textarea id="tr_hist_notas" rows="3"></textarea>

        <button class="zx_btn_big zx_verde" id="tr_hist_guardar">Guardar historial</button>
        <button class="zx_btn_big zx_gris" id="tr_hist_cerrar">Cancelar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_hist_cerrar").onclick=cerrarModal;

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
        fecha:document.getElementById("tr_hist_fecha").value,
        hora_inicio:document.getElementById("tr_hist_inicio").value || null,
        hora_fin:document.getElementById("tr_hist_fin").value || null,
        tipo:document.getElementById("tr_hist_tipo").value,
        notas:document.getElementById("tr_hist_notas").value.trim()
      }]);

    if(r.error){
      alert("Error guardando historial: "+r.error.message);
      return;
    }

    cerrarModal();
    pintarTrabajos();
  };
}

function menuTelefono(tel){
  const n=telefonoLimpio(tel);

  if(!n){
    alert("Sin teléfono.");
    return;
  }

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Teléfono</h2>

        <div class="zx_tr_aviso">${limpiar(n)}</div>

        <button class="zx_btn_big zx_azul" onclick="location.href='tel:${limpiar(n)}'">Llamar</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='sms:${limpiar(n)}'">SMS</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='https://wa.me/${limpiar(n.replace('+',''))}'">WhatsApp</button>
        <button class="zx_btn_big zx_gris" id="tr_tel_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_tel_cerrar").onclick=cerrarModal;
}

function menuMapa(dir){
  if(!dir){
    alert("Sin dirección.");
    return;
  }

  const q=encodeURIComponent(dir);

  cerrarModal();

  document.body.insertAdjacentHTML("beforeend",`
    <div id="zx_modal_trabajo" class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>Mapa</h2>

        <div class="zx_tr_aviso">${limpiar(dir)}</div>

        <button class="zx_btn_big zx_azul" onclick="location.href='https://maps.apple.com/?q=${q}'">Apple Maps</button>
        <button class="zx_btn_big zx_verde" onclick="location.href='https://www.google.com/maps/search/?api=1&query=${q}'">Google Maps</button>
        <button class="zx_btn_big zx_naranja" onclick="location.href='https://waze.com/ul?q=${q}'">Waze</button>
        <button class="zx_btn_big zx_gris" id="tr_map_cerrar">Cerrar</button>
      </div>
    </div>
  `);

  document.getElementById("tr_map_cerrar").onclick=cerrarModal;
}

window.ZX_trabajos=function(){
  document.querySelectorAll(".zx_nav_btn").forEach(b=>{
    b.classList.remove("zx_activo");
    if(b.dataset.modulo==="trabajos") b.classList.add("zx_activo");
  });

  pintarTrabajos();
};

window.ZX_nuevoTrabajo=function(){abrirFormulario({})};
window.ZX_editarTrabajo=function(id){editarTrabajo(id)};
window.ZX_borrarTrabajo=function(id){gestionarTrabajo(id)};
window.ZX_cambiarEstadoTrabajo=function(id){cambiarEstadoTrabajo(id)};
window.ZX_tr_add_material=function(id){abrirMateriales(id)};
window.ZX_tr_obra_materiales=function(id){abrirMateriales(id)};
window.ZX_tr_add_file=function(id){abrirArchivo(id)};
window.ZX_tr_add_historial=function(id){abrirHistorial(id)};

(function estilos(){
  if(document.getElementById("zx_trabajos_v3118")) return;

  const viejo=document.getElementById("zx_trabajos_v3117");
  if(viejo) viejo.remove();

  const s=document.createElement("style");
  s.id="zx_trabajos_v3118";

  s.innerHTML=`
    .zx_tr_top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_tr_crear{border:0;border-radius:18px;background:#16a34a;color:white;font-size:18px;font-weight:900;padding:15px 20px}
    .zx_tr_buscar{width:100%;margin:16px 0 8px;padding:16px;border-radius:18px;border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;font-size:17px;font-weight:850}
    .zx_tr_filtros{display:flex;gap:8px;overflow-x:auto;padding:8px 0 4px}
    .zx_tr_filtro{flex:0 0 auto;border:0;border-radius:999px;padding:11px 14px;background:#e5e7eb;color:#0f172a;font-size:15px;font-weight:900}
    .zx_tr_filtro.on{background:#2563eb;color:white}

    .zx_tr_card{background:white;border:2px solid #d1d5db;border-radius:24px;padding:18px;margin:16px 0;box-shadow:0 8px 24px rgba(15,23,42,.05)}
    .zx_tr_card.archivado{opacity:.72;border-color:#64748b}
    .zx_tr_card_head{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_tr_card h3{font-size:30px;margin:0 0 10px;color:#0f172a;font-weight:950;line-height:1.1}

    .zx_tr_badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
    .zx_tr_badges span{display:inline-flex;border-radius:999px;color:white;padding:8px 12px;font-size:13px;font-weight:950;text-transform:uppercase}
    .zx_tr_estado_ok{background:#16a34a!important;color:white!important}
    .zx_tr_estado_curso{background:#2563eb!important;color:white!important}
    .zx_tr_estado_rojo{background:#991b1b!important;color:white!important}
    .zx_tr_estado_pendiente{background:#ea580c!important;color:white!important}
    .zx_tr_estado_neutro{background:#64748b!important;color:white!important}
    .zx_tr_prio_urgente{background:#dc2626!important}
    .zx_tr_prio_alta{background:#ea580c!important}
    .zx_tr_prio_media{background:#2563eb!important}
    .zx_tr_prio_baja{background:#64748b!important}

    .zx_tr_mat_resumen{border:1px solid #fed7aa;background:#fff7ed;border-radius:18px;min-width:78px;padding:10px;text-align:center}
    .zx_tr_mat_resumen.ok{background:#ecfdf5;border-color:#86efac}
    .zx_tr_mat_resumen b{display:block;font-size:22px;font-weight:950;color:#0f172a}
    .zx_tr_mat_resumen span{display:block;font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;margin-top:4px}

    .zx_tr_datos{color:#334155;font-size:17px;line-height:1.55;font-weight:750}
    .zx_link{border:0;background:transparent;color:#2563eb;text-decoration:underline;font-size:17px;font-weight:900;padding:0;text-align:left}

    .zx_tr_section{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:14px;margin-top:12px}
    .zx_tr_section summary{font-size:20px;font-weight:950;cursor:pointer;color:#0f172a}

    .zx_tr_plan{display:grid;gap:8px;margin-top:10px}
    .zx_tr_plan_row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:14px;padding:10px;font-weight:900}
    .zx_tr_plan_row b{color:#2563eb}

    .zx_tr_materiales{display:grid;gap:8px;margin-top:10px}
    .zx_tr_mat{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:12px}
    .zx_tr_mat.ok{background:#ecfdf5;border-color:#86efac}
    .zx_tr_mat input{width:24px!important;height:24px!important;margin-top:2px!important}
    .zx_tr_mat b{display:block;color:#0f172a;font-size:16px;font-weight:950}
    .zx_tr_mat.ok b{text-decoration:line-through;color:#166534}
    .zx_tr_mat em{display:block;color:#2563eb;font-style:normal;font-size:14px;font-weight:900;margin-top:2px}
    .zx_tr_mat small{display:block;color:#64748b;font-size:12px;font-weight:800;margin-top:3px}

    .zx_tr_file{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin-top:8px}
    .zx_tr_file span{display:block;color:#64748b;font-weight:800;margin-top:3px}
    .zx_tr_file button{border:0;border-radius:14px;background:#2563eb;color:white;padding:12px 14px;font-weight:900}

    .zx_tr_hist{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:12px;margin-top:8px;color:#334155;font-weight:750}

    .zx_tr_acciones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
    .zx_tr_grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .zx_tr_grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    .zx_tr_plan_form{background:#f8fafc;border:1px solid #d1d5db;border-radius:20px;padding:14px;margin-top:12px}
    .zx_label{display:block;margin:12px 0 6px;color:#334155;font-size:15px;font-weight:900}

    .zx_tr_aviso{background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;color:#9a3412;padding:14px;margin:12px 0;font-size:16px;font-weight:900;line-height:1.35}

    .zx_tr_gestion_lista{display:grid;gap:10px;margin-top:14px}
    .zx_tr_gestion_item{background:#f8fafc;border:1px solid #d1d5db;border-radius:18px;padding:12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
    .zx_tr_gestion_item b{display:block;color:#0f172a;font-weight:950}
    .zx_tr_gestion_item span,.zx_tr_gestion_item small{display:block;color:#64748b;font-weight:800;margin-top:3px}
    .zx_tr_gestion_btns{display:grid;gap:7px}
    .zx_tr_gestion_btns button{border:0;border-radius:12px;padding:10px 12px;color:white;font-weight:900}

    .zx_azul{background:#2563eb!important;color:white!important}
    .zx_verde{background:#16a34a!important;color:white!important}
    .zx_rojo{background:#dc2626!important;color:white!important}
    .zx_naranja{background:#ea580c!important;color:white!important}
    .zx_gris{background:#64748b!important;color:white!important}

    @media(max-width:520px){
      .zx_tr_top,
      .zx_tr_card_head,
      .zx_tr_plan_row,
      .zx_tr_acciones,
      .zx_tr_grid2,
      .zx_tr_grid3,
      .zx_tr_gestion_item{
        grid-template-columns:1fr;
      }

      .zx_tr_card h3{font-size:25px}
      .zx_tr_datos{font-size:16px}
    }
  `;

  document.head.appendChild(s);
})();

console.log("ZENTRYX trabajos.js V3118 cargado");

})();

