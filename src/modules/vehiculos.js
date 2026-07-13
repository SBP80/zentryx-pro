// ===============================
// ZENTRYX PRO - VEHÍCULOS
// V3128 - USOS INDEPENDIENTES, CAMBIO DE RESPONSABLE Y DEVOLUCIÓN
// ===============================
(function(){
"use strict";

const ZX_VERSION="3128";
const TABLA="vehiculos";
const CACHE_KEY="zentryx_cache_vehiculos_v3128";

let ZX_VEH_CACHE=[];
let ZX_VEH_BUSQUEDA="";
let ZX_VEH_FILTRO="activos";
let ZX_VEH_CARGANDO=false;

function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function zx(){return window.ZENTRYX || window.ZX || null}

function sesion(){
  if(zx() && typeof zx().usuarioActual==="function") return zx().usuarioActual();
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
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

function normalizar(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function hoy(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function fechaES(f){
  if(!f) return "";
  const s=String(f).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return limpiar(s);
  const p=s.split("-");
  return p[2]+"/"+p[1]+"/"+p[0];
}

function rol(){return normalizar(sesion().rol || "")}
function usuario(){return normalizar(sesion().usuario || "")}
function esAdmin(){return rol()==="administrador" || usuario()==="admin"}
function puedeEntrar(){return rol()!=="invitado" && rol()!==""}
function puedeGestionar(){return esAdmin() || ["gerente","supervisor","encargado","administrativo","oficina"].includes(rol())}

function leerCache(){
  try{return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")}
  catch(e){return []}
}

function guardarCache(lista){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []))}
  catch(e){}
}

function numero(v){
  const n=Number(String(v ?? "0").replace(",","."));
  return Number.isFinite(n) ? n : 0;
}

function valor(id){
  const el=document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function cerrarModal(){
  const m=document.getElementById("zx_modal_vehiculo");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function modal(html){
  cerrarModal();
  document.body.classList.add("zx_modal_abierto");
  const d=document.createElement("div");
  d.id="zx_modal_vehiculo";
  d.className="zx_modal_fondo";
  d.innerHTML=`<div class="zx_modal_caja">${html}</div>`;
  document.body.appendChild(d);
}

function estadoVehiculo(v){
  if(v.activo===false || v.activo==="false") return "inactivo";
  const ef=normalizar(v.estado_flota || "");
  if(["en_uso","pendiente_devolucion"].includes(ef)) return "uso";
  if(["averia","taller","fuera_servicio","reservado"].includes(ef)) return ef;
  if(v.en_uso===true || v.en_uso==="true") return "uso";
  return "libre";
}

function estadoTexto(v){
  const e=estadoVehiculo(v);
  if(e==="uso") return normalizar(v.estado_flota)==="pendiente_devolucion" ? "Pendiente de devolución" : "En uso";
  if(e==="reservado") return "Reservado";
  if(e==="averia") return "Avería";
  if(e==="taller") return "Taller";
  if(e==="fuera_servicio") return "Fuera de servicio";
  if(e==="inactivo") return "Inactivo";
  return "Libre";
}

function identidadActual(){
  const s=sesion() || {};
  return {
    id:String(s.id || s.user_id || s.usuario_id || ""),
    usuario:String(s.usuario || s.username || ""),
    nombre:String(s.nombre_completo || s.nombre || s.usuario || "Usuario"),
    empresa_id:String(s.empresa_id || "")
  };
}

function responsableId(v){return String(v.usuario_actual_id || "")}
function responsableNombre(v){return String(v.usuario_actual_nombre || v.usuario_asignado || "")}
function esResponsableActual(v){
  const u=identidadActual();
  return !!u.id && responsableId(v)===u.id;
}

function uuid(){
  try{if(window.crypto && crypto.randomUUID) return crypto.randomUUID()}catch(e){}
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

function ahoraISO(){return new Date().toISOString()}

function obtenerPosicion(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){resolve({lat:null,lng:null});return}
    navigator.geolocation.getCurrentPosition(function(p){
      resolve({lat:p.coords.latitude,lng:p.coords.longitude});
    },function(){resolve({lat:null,lng:null})},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});
  });
}

async function zxInsert(tabla,data){
  if(zx() && typeof zx().insert==="function") return zx().insert(tabla,[data]);
  return sb().from(tabla).insert([data]);
}

async function zxUpdate(tabla,data,campo,valor){
  if(zx() && typeof zx().update==="function") return zx().update(tabla,data,campo,valor);
  return sb().from(tabla).update(data).eq(campo,String(valor));
}

function nombreVehiculo(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ") || "Vehículo";
}

function textoBusqueda(v){
  return normalizar([
    v.matricula,v.marca,v.modelo,v.usuario_actual_nombre,v.usuario_asignado,v.km_actual,
    v.estado,v.notas,v.itv_fecha,v.seguro_fecha,v.proxima_revision_fecha
  ].join(" "));
}

function prepararVehiculo(v){
  v.__zx_busqueda=textoBusqueda(v);
  return v;
}

function filtrarVehiculos(){
  let lista=ZX_VEH_CACHE || [];

  if(ZX_VEH_FILTRO==="activos") lista=lista.filter(v=>estadoVehiculo(v)!=="inactivo");
  if(ZX_VEH_FILTRO==="libres") lista=lista.filter(v=>estadoVehiculo(v)==="libre");
  if(ZX_VEH_FILTRO==="uso") lista=lista.filter(v=>estadoVehiculo(v)==="uso");
  if(ZX_VEH_FILTRO==="inactivos") lista=lista.filter(v=>estadoVehiculo(v)==="inactivo");

  const q=normalizar(ZX_VEH_BUSQUEDA);
  if(q){
    const partes=q.split(/\s+/).filter(Boolean);
    lista=lista.filter(function(v){
      const txt=v.__zx_busqueda || textoBusqueda(v);
      return txt.includes(q) || partes.every(p=>txt.includes(p));
    });
  }

  return lista;
}

async function cargarVehiculos(){
  if(!puedeEntrar()) return [];

  if(!navigator.onLine || !sb()){
    ZX_VEH_CACHE=leerCache().map(prepararVehiculo);
    return filtrarVehiculos();
  }

  if(ZX_VEH_CARGANDO) return filtrarVehiculos();
  ZX_VEH_CARGANDO=true;

  try{
    let r;

    if(zx() && typeof zx().selectCache==="function"){
      r=await zx().selectCache(TABLA,function(q){
        return q.select("*").order("matricula",{ascending:true});
      });
    }else{
      r=await sb().from(TABLA).select("*").order("matricula",{ascending:true});
    }

    if(r.error) throw r.error;

    ZX_VEH_CACHE=(r.data || []).map(prepararVehiculo);
    guardarCache(ZX_VEH_CACHE);
  }catch(e){
    ZX_VEH_CACHE=leerCache().map(prepararVehiculo);
  }

  ZX_VEH_CARGANDO=false;
  return filtrarVehiculos();
}

function resumen(){
  const total=ZX_VEH_CACHE.length;
  const activos=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)!=="inactivo").length;
  const libres=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)==="libre").length;
  const uso=ZX_VEH_CACHE.filter(v=>estadoVehiculo(v)==="uso").length;

  return `
    <div class="zx_veh_kpis">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${activos}</b><span>Activos</span></div>
      <div><b>${libres}</b><span>Libres</span></div>
      <div><b>${uso}</b><span>En uso</span></div>
    </div>
  `;
}

function toolbar(total){
  const filtros=[
    ["activos","Activos"],
    ["libres","Libres"],
    ["uso","En uso"],
    ["inactivos","Inactivos"],
    ["todos","Todos"]
  ];

  return `
    <div class="zx_veh_toolbar">
      <div class="zx_veh_search">
        <input id="zx_buscar_vehiculos" type="search" value="${limpiar(ZX_VEH_BUSQUEDA)}" placeholder="Buscar matrícula, marca, modelo, usuario o revisión">
        ${ZX_VEH_BUSQUEDA ? `<button id="zx_limpiar_vehiculos" type="button">✕</button>` : ""}
      </div>

      <div class="zx_veh_filters">
        ${filtros.map(function(f){
          return `<button class="${ZX_VEH_FILTRO===f[0] ? "on" : ""}" data-veh-filter="${limpiar(f[0])}">${limpiar(f[1])}</button>`;
        }).join("")}
      </div>

      <div class="zx_veh_resume">${total} resultado(s)</div>
    </div>
  `;
}

function badge(v){
  const e=estadoVehiculo(v);
  if(e==="inactivo") return `<span class="off">Inactivo</span>`;
  if(e==="uso") return `<span class="uso">${limpiar(estadoTexto(v))}</span>`;
  if(["averia","taller","fuera_servicio"].includes(e)) return `<span class="off">${limpiar(estadoTexto(v))}</span>`;
  if(e==="reservado") return `<span class="orange">Reservado</span>`;
  return `<span class="libre">Libre</span>`;
}

function alertaFecha(fecha,diasAviso){
  if(!fecha) return "";
  const f=new Date(String(fecha).slice(0,10)+"T12:00:00");
  if(isNaN(f.getTime())) return "";
  const ahora=new Date(hoy()+"T12:00:00");
  const diff=Math.ceil((f.getTime()-ahora.getTime())/86400000);
  if(diff<0) return "caducado";
  if(diff<=diasAviso) return "pronto";
  return "ok";
}

function renderAvisos(v){
  const avisos=[];
  const itv=alertaFecha(v.itv_fecha,45);
  const seguro=alertaFecha(v.seguro_fecha,45);
  const revision=alertaFecha(v.proxima_revision_fecha,30);

  if(itv==="caducado") avisos.push("ITV caducada");
  if(itv==="pronto") avisos.push("ITV próxima");
  if(seguro==="caducado") avisos.push("Seguro caducado");
  if(seguro==="pronto") avisos.push("Seguro próximo");
  if(revision==="caducado") avisos.push("Revisión vencida");
  if(revision==="pronto") avisos.push("Revisión próxima");

  if(!avisos.length) return "";

  return `<div class="zx_veh_alertas">${avisos.map(a=>`<span>${limpiar(a)}</span>`).join("")}</div>`;
}

function renderVehiculo(v){
  return `
    <article class="zx_veh_card" data-id="${limpiar(v.id)}">
      <div class="zx_veh_top">
        <div class="zx_veh_icon">🚗</div>
        <div>
          <h3>${limpiar(v.matricula || "Sin matrícula")}</h3>
          <div class="zx_veh_meta">${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "Sin modelo")}</div>
        </div>
      </div>

      <div class="zx_veh_badges">${badge(v)}</div>
      ${renderAvisos(v)}

      <div class="zx_veh_info">
        <p><b>Kilómetros</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
        <p><b>Responsable actual</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
        ${v.itv_fecha ? `<p><b>ITV</b><span>${fechaES(v.itv_fecha)}</span></p>` : ""}
        ${v.seguro_fecha ? `<p><b>Seguro</b><span>${fechaES(v.seguro_fecha)}</span></p>` : ""}
        ${v.proxima_revision_fecha ? `<p><b>Próxima revisión</b><span>${fechaES(v.proxima_revision_fecha)}</span></p>` : ""}
        ${v.notas ? `<p><b>Notas</b><span>${limpiar(v.notas)}</span></p>` : ""}
      </div>

      <div class="zx_veh_actions">
        <button class="blue" data-veh-open="${limpiar(v.id)}">Ficha</button>
        ${estadoVehiculo(v)!=="inactivo" && !esResponsableActual(v) && !["averia","taller","fuera_servicio"].includes(estadoVehiculo(v)) ? `<button class="green" data-veh-tomar="${limpiar(v.id)}">Utilizar</button>` : ""}
        ${esResponsableActual(v) ? `<button class="orange" data-veh-devolver="${limpiar(v.id)}">Devolver</button>` : ""}
        ${puedeGestionar() ? `<button class="gray" data-veh-edit="${limpiar(v.id)}">Editar</button>` : ""}
        ${estadoVehiculo(v)!=="inactivo" && puedeGestionar() ? `<button class="red" data-veh-desactivar="${limpiar(v.id)}">Desactivar</button>` : ""}
        ${estadoVehiculo(v)==="inactivo" && puedeGestionar() ? `<button class="green" data-veh-activar="${limpiar(v.id)}">Activar</button>` : ""}
      </div>
    </article>
  `;
}

function renderListado(lista){
  if(!lista.length) return `<div class="zx_veh_empty">No hay vehículos con este filtro.</div>`;
  return lista.map(renderVehiculo).join("");
}

function pintarShell(lista){
  app().innerHTML=`
    <div class="zx_veh_shell">
      <section class="zx_veh_panel zx_veh_header">
        <div>
          <h2>Vehículos</h2>
          <p>Uso real, responsables, kilómetros, documentación, ITV, seguro y revisiones.</p>
        </div>
        ${puedeGestionar() ? `<button class="zx_veh_new" id="btn_nuevo_vehiculo">＋ Crear</button>` : ""}
      </section>

      <section class="zx_veh_panel">
        ${resumen()}
        ${toolbar(lista.length)}
      </section>

      <section class="zx_veh_panel">
        <div class="zx_veh_list_head">
          <h3>Listado</h3>
          <span>${lista.length} vehículo(s)</span>
        </div>
        <div id="zx_vehiculos_lista" class="zx_veh_list">${renderListado(lista)}</div>
      </section>
    </div>
  `;

  const nuevo=document.getElementById("btn_nuevo_vehiculo");
  if(nuevo) nuevo.onclick=function(){abrirFormulario({})};

  conectarEventos();
}

function repintarLista(){
  const lista=filtrarVehiculos();
  const box=document.getElementById("zx_vehiculos_lista");
  if(box){
    box.innerHTML=renderListado(lista);
    conectarEventos();
  }
}

function conectarEventos(){
  const buscar=document.getElementById("zx_buscar_vehiculos");
  if(buscar){
    buscar.oninput=function(){
      ZX_VEH_BUSQUEDA=buscar.value || "";
      repintarLista();
    };
  }

  const limpiarBtn=document.getElementById("zx_limpiar_vehiculos");
  if(limpiarBtn){
    limpiarBtn.onclick=function(){
      ZX_VEH_BUSQUEDA="";
      if(buscar) buscar.value="";
      repintarLista();
    };
  }

  document.querySelectorAll("[data-veh-filter]").forEach(function(btn){
    btn.onclick=function(){
      ZX_VEH_FILTRO=btn.dataset.vehFilter || "activos";
      document.querySelectorAll("[data-veh-filter]").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      repintarLista();
    };
  });

  document.querySelectorAll("[data-veh-open]").forEach(btn=>{btn.onclick=function(){abrirFicha(btn.dataset.vehOpen)}});
  document.querySelectorAll("[data-veh-edit]").forEach(btn=>{btn.onclick=function(){editarVehiculo(btn.dataset.vehEdit)}});
  document.querySelectorAll("[data-veh-tomar]").forEach(btn=>{btn.onclick=function(){tomarVehiculo(btn.dataset.vehTomar)}});
  document.querySelectorAll("[data-veh-devolver]").forEach(btn=>{btn.onclick=function(){devolverVehiculo(btn.dataset.vehDevolver)}});
  document.querySelectorAll("[data-veh-activar]").forEach(btn=>{btn.onclick=function(){actualizarVehiculo(btn.dataset.vehActivar,{activo:true,estado_flota:"libre"})}});
  document.querySelectorAll("[data-veh-desactivar]").forEach(btn=>{btn.onclick=function(){desactivarVehiculo(btn.dataset.vehDesactivar)}});
}

function input(id,label,value,type){
  return `
    <label class="zx_veh_label" for="${id}">${limpiar(label)}</label>
    <input id="${id}" type="${type || "text"}" value="${limpiar(value || "")}" placeholder="${limpiar(label)}">
  `;
}

function abrirFormulario(v){
  v=v || {};
  if(!puedeGestionar()){alert("No tienes permiso.");return}

  modal(`
    <h2>${v.id ? "Editar vehículo" : "Nuevo vehículo"}</h2>

    <div class="zx_veh_form">
      <h3>Datos principales</h3>
      ${input("veh_matricula","Matrícula",v.matricula)}
      <div class="zx_veh_grid2">
        <div>${input("veh_marca","Marca",v.marca)}</div>
        <div>${input("veh_modelo","Modelo",v.modelo)}</div>
      </div>
      ${input("veh_km","Km actuales",v.km_actual || 0,"number")}

      <div class="zx_veh_grid2">
        <div>
          <label class="zx_veh_label" for="veh_activo">Estado</label>
          <select id="veh_activo">
            <option value="true" ${v.activo!==false && v.activo!=="false" ? "selected" : ""}>Activo</option>
            <option value="false" ${v.activo===false || v.activo==="false" ? "selected" : ""}>Inactivo</option>
          </select>
        </div>
        <div>
          <label class="zx_veh_label" for="veh_gps">Seguimiento GPS</label>
          <select id="veh_gps">
            <option value="false" ${v.seguimiento_gps_habilitado!==true && v.seguimiento_gps_habilitado!=="true" ? "selected" : ""}>Desactivado</option>
            <option value="true" ${v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true" ? "selected" : ""}>Activado</option>
          </select>
        </div>
      </div>
      <div class="zx_veh_nota_form">La asignación se gestiona con los botones Utilizar y Devolver. No se cambia manualmente.</div>

      <h3>Revisiones y documentación</h3>
      <div class="zx_veh_grid2">
        <div>${input("veh_itv","Fecha ITV",v.itv_fecha,"date")}</div>
        <div>${input("veh_seguro","Vencimiento seguro",v.seguro_fecha,"date")}</div>
      </div>
      <div class="zx_veh_grid2">
        <div>${input("veh_revision","Próxima revisión",v.proxima_revision_fecha,"date")}</div>
        <div>${input("veh_revision_km","Km próxima revisión",v.proxima_revision_km,"number")}</div>
      </div>

      <label class="zx_veh_label" for="veh_doc">Documento</label>
      <input id="veh_doc" type="file" accept="image/*,.pdf,.doc,.docx">
      ${v.documento_url ? `<a class="zx_btn_big zx_azul" href="${limpiar(v.documento_url)}" target="_blank">Ver documento actual</a>` : ""}

      <label class="zx_veh_label" for="veh_notas">Notas</label>
      <textarea id="veh_notas" rows="4">${limpiar(v.notas || "")}</textarea>
    </div>

    <button class="zx_btn_big zx_verde" id="veh_guardar">Guardar</button>
    <button class="zx_btn_big zx_gris" id="veh_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_cancelar").onclick=cerrarModal;
  document.getElementById("veh_guardar").onclick=function(){guardarVehiculo(v.id || null,v.documento_url || null,v.documento_nombre || null)};
}

function vehiculoPorId(id){
  return ZX_VEH_CACHE.find(v=>String(v.id)===String(id)) || null;
}

async function editarVehiculo(id){
  const local=vehiculoPorId(id);
  if(!navigator.onLine || !sb()){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado sin conexión.");
    return;
  }

  try{
    const r=await sb().from(TABLA).select("*").eq("id",String(id)).maybeSingle();
    if(r.error || !r.data){
      if(local){abrirFormulario(local);return}
      alert("Vehículo no encontrado.");
      return;
    }
    abrirFormulario(r.data);
  }catch(e){
    if(local){abrirFormulario(local);return}
    alert("Vehículo no encontrado.");
  }
}

async function subirDocumento(file,matricula){
  if(!file) return null;
  if(!navigator.onLine || !sb()){
    alert("Para subir documentos necesitas conexión.");
    return null;
  }

  const ext=(file.name.split(".").pop() || "dat").toLowerCase();
  const clean=String(matricula || "vehiculo").replace(/[^a-zA-Z0-9_-]/g,"_");
  const path="vehiculos/"+clean+"_"+Date.now()+"."+ext;

  const buckets=["zentryx-vehiculos","zentryx-trabajos","zentryx-clientes"];

  for(const bucket of buckets){
    try{
      const r=await sb().storage.from(bucket).upload(path,file,{upsert:true});
      if(!r.error){
        return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }
    }catch(e){}
  }

  alert("No se pudo subir el documento.");
  return null;
}

async function guardarVehiculo(id,docActual,nombreDocActual){
  const matricula=valor("veh_matricula").toUpperCase();
  if(!matricula){alert("La matrícula es obligatoria.");return}

  const km=numero(valor("veh_km"));
  if(km<0){alert("Los km no pueden ser negativos.");return}

  const file=(document.getElementById("veh_doc")?.files || [])[0] || null;
  const docUrl=await subirDocumento(file,matricula);

  const data={
    matricula:matricula,
    marca:valor("veh_marca"),
    modelo:valor("veh_modelo"),
    km_actual:km,
    activo:valor("veh_activo")==="true",
    seguimiento_gps_habilitado:valor("veh_gps")==="true",
    itv_fecha:valor("veh_itv") || null,
    seguro_fecha:valor("veh_seguro") || null,
    proxima_revision_fecha:valor("veh_revision") || null,
    proxima_revision_km:valor("veh_revision_km") ? numero(valor("veh_revision_km")) : null,
    documento_url:docUrl || docActual || null,
    documento_nombre:file ? file.name : nombreDocActual || null,
    notas:valor("veh_notas")
  };

  try{
    let r;
    if(zx() && typeof zx().update==="function" && typeof zx().insert==="function"){
      r=id ? await zx().update(TABLA,data,"id",id) : await zx().insert(TABLA,[data]);
    }else if(id){
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }else{
      r=await sb().from(TABLA).insert([data]);
    }

    if(r && r.error) throw r.error;

    cerrarModal();
    await window.ZX_vehiculos();
  }catch(e){
    alert("Error guardando vehículo: "+(e.message || "Error"));
  }
}

async function actualizarVehiculo(id,data){
  try{
    let r;
    if(zx() && typeof zx().update==="function"){
      r=await zx().update(TABLA,data,"id",id);
    }else{
      r=await sb().from(TABLA).update(data).eq("id",String(id));
    }
    if(r && r.error) throw r.error;
    await window.ZX_vehiculos();
  }catch(e){
    alert("No se pudo actualizar el vehículo.");
  }
}

async function tomarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(estadoVehiculo(v)==="inactivo"){alert("Este vehículo está inactivo.");return}

  const actual=responsableNombre(v);
  const ocupado=estadoVehiculo(v)==="uso" && !esResponsableActual(v);

  modal(`
    <h2>${ocupado ? "Cambiar responsable" : "Utilizar vehículo"}</h2>
    ${ocupado ? `<div class="zx_veh_aviso">Este vehículo está asignado ahora mismo a <b>${limpiar(actual || "otro usuario")}</b>. ¿Quieres utilizarlo?</div>` : ""}
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Km registrados</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_inicio_uso">Kilómetros al recogerlo</label>
    <input id="veh_km_inicio_uso" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_motivo_uso">Observación opcional</label>
    <textarea id="veh_motivo_uso" rows="3" placeholder="Solo si necesitas indicar algo"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_tomar_ok">${ocupado ? "Sí, utilizarlo" : "Confirmar uso"}</button>
    <button class="zx_btn_big zx_gris" id="veh_tomar_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_tomar_cancelar").onclick=cerrarModal;
  document.getElementById("veh_tomar_ok").onclick=async function(){
    const km=numero(valor("veh_km_inicio_uso"));
    if(km<numero(v.km_actual)){alert("Los kilómetros no pueden ser inferiores a los registrados.");return}

    const btn=document.getElementById("veh_tomar_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      if(!u.id) throw new Error("No se ha podido identificar al usuario.");
      const pos=await obtenerPosicion();
      const nuevoUsoId=uuid();
      const now=ahoraISO();
      const usoAnteriorId=v.uso_actual_id || null;

      if(ocupado && usoAnteriorId){
        const rCerrar=await zxUpdate("usos_vehiculos",{
          estado:"transferido",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:"Transferido a "+u.nombre,
          actualizado_por:u.id
        },"id",usoAnteriorId);
        if(rCerrar && rCerrar.error) throw rCerrar.error;
      }

      const nuevoUso={
        id:nuevoUsoId,
        empresa_id:u.empresa_id || null,
        vehiculo_id:String(v.id),
        vehiculo_matricula:v.matricula || null,
        usuario_id:u.id,
        usuario:u.usuario || null,
        nombre_usuario:u.nombre,
        estado:"en_uso",
        inicio_at:now,
        km_inicio:km,
        lat_inicio:pos.lat,
        lng_inicio:pos.lng,
        motivo_inicio:valor("veh_motivo_uso") || (ocupado ? "Cambio de responsable" : "Uso directo"),
        dispositivo_inicio:navigator.userAgent || "",
        uso_anterior_id:usoAnteriorId,
        usuario_anterior_id:ocupado ? responsableId(v) || null : null,
        usuario_anterior_nombre:ocupado ? actual || null : null,
        tomado_sin_liberacion:ocupado,
        seguimiento_gps_activo:v.seguimiento_gps_habilitado===true || v.seguimiento_gps_habilitado==="true",
        creado_por:u.id
      };

      const rUso=await zxInsert("usos_vehiculos",nuevoUso);
      if(rUso && rUso.error) throw rUso.error;

      if(ocupado){
        const rTransfer=await zxInsert("transferencias_vehiculos",{
          id:uuid(),
          empresa_id:u.empresa_id || null,
          vehiculo_id:String(v.id),
          vehiculo_matricula:v.matricula || null,
          uso_anterior_id:usoAnteriorId,
          uso_nuevo_id:nuevoUsoId,
          usuario_anterior_id:responsableId(v) || null,
          nombre_anterior:actual || null,
          usuario_nuevo_id:u.id,
          usuario_nuevo:u.usuario || null,
          nombre_nuevo:u.nombre,
          estado:"confirmada",
          km_transferencia:km,
          lat:pos.lat,
          lng:pos.lng,
          mensaje_usuario_anterior:u.nombre+" está utilizando el vehículo "+(v.matricula || ""),
          avisar_al_liberar:true,
          respuesta_usuario_anterior:"pendiente",
          motivo:"Cambio de responsable confirmado",
          dispositivo:navigator.userAgent || "",
          confirmado_por:u.id,
          confirmado_at:now
        });
        if(rTransfer && rTransfer.error) throw rTransfer.error;
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:nuevoUsoId,
        usuario_actual_id:u.id,
        usuario_actual_nombre:u.nombre,
        uso_iniciado_at:now,
        estado_flota:"en_uso",
        km_actual:km,
        en_uso:true,
        usuario_asignado:u.nombre
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      cerrarModal();
      await window.ZX_vehiculos();
    }catch(e){
      btn.disabled=false;
      btn.textContent=ocupado ? "Sí, utilizarlo" : "Confirmar uso";
      alert("No se pudo asignar el vehículo: "+(e.message || "Error"));
    }
  };
}

async function devolverVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}
  if(!esResponsableActual(v) && !puedeGestionar()){
    alert("Solo el responsable actual o un administrador puede devolverlo.");
    return;
  }

  modal(`
    <h2>Devolver vehículo</h2>
    <div class="zx_veh_info ficha">
      <p><b>Vehículo</b><span>${limpiar(nombreVehiculo(v))}</span></p>
      <p><b>Responsable</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
    </div>
    <label class="zx_veh_label" for="veh_km_salida">Kilómetros finales</label>
    <input id="veh_km_salida" type="number" inputmode="decimal" value="${limpiar(v.km_actual ?? 0)}">
    <label class="zx_veh_label" for="veh_observacion_salida">Incidencia u observación</label>
    <textarea id="veh_observacion_salida" rows="3" placeholder="Déjalo vacío si todo está correcto"></textarea>
    <button class="zx_btn_big zx_verde" id="veh_devolver_ok">Confirmar devolución</button>
    <button class="zx_btn_big zx_gris" id="veh_devolver_cancelar">Cancelar</button>
  `);

  document.getElementById("veh_devolver_cancelar").onclick=cerrarModal;
  document.getElementById("veh_devolver_ok").onclick=async function(){
    const km=numero(valor("veh_km_salida"));
    if(km<numero(v.km_actual)){alert("Los kilómetros finales no pueden ser inferiores a los actuales.");return}
    const btn=document.getElementById("veh_devolver_ok");
    btn.disabled=true;
    btn.textContent="Guardando...";

    try{
      const u=identidadActual();
      const pos=await obtenerPosicion();
      const now=ahoraISO();

      if(v.uso_actual_id){
        const rUso=await zxUpdate("usos_vehiculos",{
          estado:"devuelto",
          fin_at:now,
          km_fin:km,
          lat_fin:pos.lat,
          lng_fin:pos.lng,
          motivo_fin:valor("veh_observacion_salida") || "Devolución normal",
          dispositivo_fin:navigator.userAgent || "",
          actualizado_por:u.id || null
        },"id",v.uso_actual_id);
        if(rUso && rUso.error) throw rUso.error;
      }

      const rVeh=await zxUpdate(TABLA,{
        uso_actual_id:null,
        usuario_actual_id:null,
        usuario_actual_nombre:null,
        uso_iniciado_at:null,
        estado_flota:"libre",
        km_actual:km,
        en_uso:false,
        usuario_asignado:""
      },"id",id);
      if(rVeh && rVeh.error) throw rVeh.error;

      cerrarModal();
      await window.ZX_vehiculos();
    }catch(e){
      btn.disabled=false;
      btn.textContent="Confirmar devolución";
      alert("No se pudo devolver el vehículo: "+(e.message || "Error"));
    }
  };
}

async function desactivarVehiculo(id){
  if(!confirm("¿Desactivar este vehículo?")) return;
  const v=vehiculoPorId(id);
  if(v && estadoVehiculo(v)==="uso"){
    alert("Primero debe devolverse el vehículo.");
    return;
  }
  await actualizarVehiculo(id,{activo:false,estado_flota:"libre",en_uso:false,usuario_asignado:""});
}

function abrirFicha(id){
  const v=vehiculoPorId(id);
  if(!v){alert("Vehículo no encontrado.");return}

  modal(`
    <h2>${limpiar(nombreVehiculo(v))}</h2>
    <div class="zx_veh_badges">${badge(v)}</div>
    ${renderAvisos(v)}

    <div class="zx_veh_info ficha">
      <p><b>Matrícula</b><span>${limpiar(v.matricula || "-")}</span></p>
      <p><b>Marca / modelo</b><span>${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "-")}</span></p>
      <p><b>Km actuales</b><span>${limpiar(v.km_actual ?? 0)}</span></p>
      <p><b>Responsable actual</b><span>${limpiar(responsableNombre(v) || "-")}</span></p>
      <p><b>ITV</b><span>${limpiar(fechaES(v.itv_fecha) || "-")}</span></p>
      <p><b>Seguro</b><span>${limpiar(fechaES(v.seguro_fecha) || "-")}</span></p>
      <p><b>Revisión</b><span>${limpiar(fechaES(v.proxima_revision_fecha) || "-")}</span></p>
      <p><b>Km revisión</b><span>${limpiar(v.proxima_revision_km || "-")}</span></p>
      ${v.notas ? `<p><b>Notas</b><span>${limpiar(v.notas)}</span></p>` : ""}
    </div>

    <div class="zx_veh_actions ficha_actions">
      ${puedeGestionar() ? `<button class="blue" id="veh_ficha_editar">Editar</button>` : ""}
      ${v.documento_url ? `<button class="purple" id="veh_ficha_doc">Documento</button>` : ""}
      <button class="gray" id="veh_ficha_cerrar">Cerrar</button>
    </div>
  `);

  const editar=document.getElementById("veh_ficha_editar");
  if(editar) editar.onclick=function(){editarVehiculo(id)};
  const doc=document.getElementById("veh_ficha_doc");
  if(doc) doc.onclick=function(){window.open(v.documento_url,"_blank")};
  document.getElementById("veh_ficha_cerrar").onclick=cerrarModal;
}

function instalarCSS(){
  const old=document.getElementById("zx_vehiculos_css_v3128");
  if(old) old.remove();

  const s=document.createElement("style");
  s.id="zx_vehiculos_css_v3128";
  s.innerHTML=`
    .zx_veh_shell{display:grid;grid-template-columns:1fr;gap:14px;padding-bottom:calc(env(safe-area-inset-bottom) + 118px)}
    .zx_veh_panel{background:white;border:1px solid #dbe3ef;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(15,23,42,.06);overflow:hidden}
    .zx_veh_header{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start}
    .zx_veh_header h2{margin:0;color:#071330;font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.5px}
    .zx_veh_header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850;line-height:1.35}
    .zx_veh_new{border:0;border-radius:18px;background:#16a34a;color:white;padding:14px 16px;font-size:16px;font-weight:950;white-space:nowrap}
    .zx_veh_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_veh_kpis div{background:#f8fafc;border:1px solid #dbe3ef;border-radius:20px;padding:14px;text-align:center}
    .zx_veh_kpis b{display:block;color:#071330;font-size:27px;font-weight:950;line-height:1}
    .zx_veh_kpis span{display:block;color:#64748b;font-size:13px;font-weight:900;margin-top:6px}
    .zx_veh_toolbar{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_search{position:relative}
    .zx_veh_search input{width:100%;margin:0!important;padding-right:48px!important;border:1px solid #dbe3ef;border-radius:18px;padding:15px;font-size:16px;font-weight:850;background:#f8fafc;color:#071330}
    .zx_veh_search button{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#e2e8f0;width:34px;height:34px;border-radius:12px;font-weight:950;color:#334155}
    .zx_veh_filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}
    .zx_veh_filters button{border:0;border-radius:999px;background:#f1f5f9;color:#334155;padding:10px 13px;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_filters button.on{background:#2563eb;color:white}
    .zx_veh_resume{color:#64748b;font-size:13px;font-weight:900}
    .zx_veh_list_head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .zx_veh_list_head h3{margin:0;color:#071330;font-size:25px;font-weight:950;letter-spacing:-.3px}
    .zx_veh_list_head span{color:#64748b;font-size:13px;font-weight:950;white-space:nowrap}
    .zx_veh_list{display:grid;grid-template-columns:1fr;gap:12px}
    .zx_veh_card{background:#f8fafc;border:1px solid #dbe3ef;border-radius:24px;padding:16px;overflow:hidden}
    .zx_veh_top{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center}
    .zx_veh_icon{width:52px;height:52px;border-radius:18px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:950}
    .zx_veh_top h3{margin:0;color:#071330;font-size:21px;line-height:1.15;font-weight:950}
    .zx_veh_meta{margin-top:4px;color:#64748b;font-size:13px;font-weight:950}
    .zx_veh_badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
    .zx_veh_badges span{border-radius:999px;padding:8px 10px;font-size:12px;font-weight:950}
    .zx_veh_badges .libre{background:#dcfce7;color:#166534}
    .zx_veh_badges .uso{background:#dbeafe;color:#1d4ed8}
    .zx_veh_badges .off{background:#fee2e2;color:#991b1b}.zx_veh_badges .orange{background:#ffedd5;color:#9a3412}
    .zx_veh_alertas{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .zx_veh_alertas span{background:#fef3c7;color:#92400e;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950}
    .zx_veh_info{margin-top:13px;display:grid;grid-template-columns:1fr;gap:8px}
    .zx_veh_info p{margin:0;background:white;border:1px solid #e6edf5;border-radius:16px;padding:11px}
    .zx_veh_info b{display:block;color:#64748b;font-size:12px;font-weight:950;margin-bottom:4px}
    .zx_veh_info span{display:block;color:#071330;font-size:15px;font-weight:850;line-height:1.3;word-break:break-word}
    .zx_veh_actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
    .zx_veh_actions button{border:0;border-radius:16px;padding:13px 8px;color:white;font-size:14px;font-weight:950;min-height:46px}
    .zx_veh_actions .green{background:#16a34a}.zx_veh_actions .blue{background:#2563eb}.zx_veh_actions .purple{background:#7c3aed}.zx_veh_actions .orange{background:#f97316}.zx_veh_actions .gray{background:#64748b}.zx_veh_actions .red{background:#dc2626}
    .zx_veh_aviso{margin:12px 0;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:16px;padding:13px;font-weight:850;line-height:1.35}.zx_veh_nota_form{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:14px;padding:11px;font-size:13px;font-weight:800}.zx_veh_empty{color:#64748b;font-size:16px;font-weight:850;padding:12px 0}
    .zx_veh_form h3{margin:20px 0 8px;color:#071330;font-size:22px;font-weight:950}
    .zx_veh_label{display:block;margin:12px 0 6px;color:#475569;font-size:14px;font-weight:950}
    .zx_veh_form input,.zx_veh_form select,.zx_veh_form textarea,#zx_modal_vehiculo input,#zx_modal_vehiculo select,#zx_modal_vehiculo textarea{width:100%;border:1px solid #dbe3ef;border-radius:16px;padding:13px;font-size:16px;font-weight:800;color:#071330;background:#f8fafc}
    .zx_veh_grid2{display:grid;grid-template-columns:1fr;gap:10px}
    @media(max-width:390px){.zx_veh_panel{padding:15px;border-radius:22px}.zx_veh_header h2{font-size:27px}.zx_veh_actions{grid-template-columns:1fr}.zx_veh_kpis{grid-template-columns:1fr 1fr}.zx_veh_top h3{font-size:19px}}
    @media(min-width:700px){.zx_veh_shell{padding-bottom:32px}.zx_veh_kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.zx_veh_list{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_veh_info.ficha{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1100px){.zx_veh_panel{padding:22px}.zx_veh_list{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(s);
}

window.ZX_vehiculos=async function(){
  instalarCSS();

  if(zx() && typeof zx().marcarModuloActivo==="function"){
    zx().marcarModuloActivo("vehiculos");
  }else{
    document.querySelectorAll(".zx_nav_btn").forEach(function(b){
      b.classList.remove("zx_activo");
      if(b.dataset.modulo==="vehiculos") b.classList.add("zx_activo");
    });
  }

  if(!puedeEntrar()){
    app().innerHTML=`
      <div class="zx_veh_panel">
        <h2>Vehículos</h2>
        <div class="zx_text">No tienes permiso para acceder a Vehículos.</div>
      </div>
    `;
    return;
  }

  ZX_VEH_CACHE=leerCache().map(prepararVehiculo);
  pintarShell(filtrarVehiculos());

  setTimeout(async function(){
    const lista=await cargarVehiculos();
    pintarShell(lista);
  },20);
};

window.ZENTRYX_UI_abrirVehiculos=window.ZX_vehiculos;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("vehiculos",{
    nombre:"Vehículos",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX vehiculos.js V"+ZX_VERSION+" cargado");

})();
