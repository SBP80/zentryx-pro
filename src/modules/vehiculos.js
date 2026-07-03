// ===============================
// ZENTRYX PRO - VEHÍCULOS
// V3102
// ===============================
(function(){
"use strict";

const ZX_VERSION="3102";
const TABLA="vehiculos";
const CACHE_KEY="zentryx_cache_vehiculos";

let ZX_VEHICULOS=[];
let ZX_FILTRO="todos";
let ZX_BUSQUEDA="";

function $(id){return document.getElementById(id)}
function app(){return $("app")}

function zx(){
  return window.ZENTRYX || window.ZX || null;
}

function sb(){
  return window.sb || window.supabaseClient || null;
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

function num(v){
  const n=Number(String(v ?? "0").replace(",","."));
  return Number.isFinite(n) ? n : 0;
}

function usuarioActual(){
  if(zx() && typeof zx().usuarioActual==="function"){
    return zx().usuarioActual();
  }

  try{
    return JSON.parse(localStorage.getItem("zentryx_session") || "{}");
  }catch(e){
    return {};
  }
}

function esAdmin(){
  const u=usuarioActual();
  return normalizar(u.rol)==="administrador" || normalizar(u.usuario)==="admin";
}

function guardarCache(lista){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify(lista || []));
  }catch(e){}
}

function leerCache(){
  try{
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  }catch(e){
    return [];
  }
}

function setEstado(tipo){
  if(zx() && typeof zx().setSyncStatus==="function"){
    zx().setSyncStatus(tipo);
  }
}

function vehiculoNombre(v){
  return [v.matricula,v.marca,v.modelo].filter(Boolean).join(" ");
}

function pintarCarga(){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Vehículos</h2>
      <div class="zx_text">Cargando vehículos...</div>
    </div>
  `;
}

function pintarError(txt){
  app().innerHTML=`
    <div class="zx_card">
      <h2>Vehículos</h2>
      <div class="zx_text">${limpiar(txt)}</div>
      <button class="zx_btn_big zx_azul" id="zx_veh_reload">Reintentar</button>
    </div>
  `;

  $("zx_veh_reload").onclick=window.ZX_vehiculos;
}

async function cargarVehiculos(){
  const root=app();
  if(!root) return;

  pintarCarga();

  const cliente=sb();

  if(!navigator.onLine || !cliente){
    ZX_VEHICULOS=leerCache();
    pintarVehiculos();
    return;
  }

  try{
    const r=await cliente
      .from(TABLA)
      .select("*")
      .order("matricula",{ascending:true});

    if(r.error) throw r.error;

    ZX_VEHICULOS=r.data || [];
    guardarCache(ZX_VEHICULOS);
    pintarVehiculos();

  }catch(e){
    console.error(e);
    ZX_VEHICULOS=leerCache();

    if(ZX_VEHICULOS.length){
      pintarVehiculos();
    }else{
      pintarError("No se pudieron cargar los vehículos.");
    }
  }
}

function filtrarVehiculos(){
  let lista=[...ZX_VEHICULOS];

  if(ZX_FILTRO==="libres"){
    lista=lista.filter(v=>!v.en_uso && v.activo!==false);
  }

  if(ZX_FILTRO==="uso"){
    lista=lista.filter(v=>v.en_uso && v.activo!==false);
  }

  if(ZX_FILTRO==="inactivos"){
    lista=lista.filter(v=>v.activo===false);
  }

  if(ZX_FILTRO==="activos"){
    lista=lista.filter(v=>v.activo!==false);
  }

  const q=normalizar(ZX_BUSQUEDA);

  if(q){
    lista=lista.filter(v=>{
      return normalizar([
        v.matricula,
        v.marca,
        v.modelo,
        v.usuario_asignado,
        v.km_actual
      ].join(" ")).includes(q);
    });
  }

  return lista;
}

function resumen(){
  const total=ZX_VEHICULOS.length;
  const activos=ZX_VEHICULOS.filter(v=>v.activo!==false).length;
  const libres=ZX_VEHICULOS.filter(v=>v.activo!==false && !v.en_uso).length;
  const uso=ZX_VEHICULOS.filter(v=>v.activo!==false && v.en_uso).length;

  return `
    <div class="zx_veh_resumen">
      <div><b>${total}</b><span>Total</span></div>
      <div><b>${activos}</b><span>Activos</span></div>
      <div><b>${libres}</b><span>Libres</span></div>
      <div><b>${uso}</b><span>En uso</span></div>
    </div>
  `;
}

function estadoBadge(v){
  if(v.activo===false){
    return `<span class="zx_veh_badge zx_veh_badge_off">Inactivo</span>`;
  }

  if(v.en_uso){
    return `<span class="zx_veh_badge zx_veh_badge_uso">En uso</span>`;
  }

  return `<span class="zx_veh_badge zx_veh_badge_libre">Libre</span>`;
}

function tarjetaVehiculo(v){
  return `
    <div class="zx_veh_card" data-id="${limpiar(v.id)}">
      <div class="zx_veh_top">
        <div>
          <div class="zx_veh_matricula">${limpiar(v.matricula || "Sin matrícula")}</div>
          <div class="zx_veh_modelo">${limpiar([v.marca,v.modelo].filter(Boolean).join(" ") || "Sin marca/modelo")}</div>
        </div>
        ${estadoBadge(v)}
      </div>

      <div class="zx_veh_grid">
        <div>
          <b>${limpiar(v.km_actual ?? 0)}</b>
          <span>Km actuales</span>
        </div>
        <div>
          <b>${limpiar(v.usuario_asignado || "-")}</b>
          <span>Usuario</span>
        </div>
      </div>

      <div class="zx_veh_actions">
        <button class="zx_btn zx_azul" data-action="edit" data-id="${limpiar(v.id)}">Editar</button>
        ${
          v.activo===false
          ? `<button class="zx_btn zx_verde" data-action="activar" data-id="${limpiar(v.id)}">Activar</button>`
          : `<button class="zx_btn zx_gris" data-action="desactivar" data-id="${limpiar(v.id)}">Desactivar</button>`
        }
        ${
          v.en_uso
          ? `<button class="zx_btn zx_naranja" data-action="liberar" data-id="${limpiar(v.id)}">Liberar</button>`
          : ""
        }
      </div>
    </div>
  `;
}

function pintarVehiculos(){
  const lista=filtrarVehiculos();

  app().innerHTML=`
    <div class="zx_card">
      <div class="zx_veh_header">
        <div>
          <h2>Vehículos</h2>
          <div class="zx_text">Gestión de flota, disponibilidad y kilómetros.</div>
        </div>
        <button class="zx_btn zx_verde zx_veh_crear" id="zx_veh_crear">Crear</button>
      </div>

      ${resumen()}

      <input id="zx_veh_buscar" type="search" placeholder="Buscar matrícula, marca, modelo, usuario o km" value="${limpiar(ZX_BUSQUEDA)}">

      <div class="zx_veh_filtros">
        <button data-filter="todos" class="${ZX_FILTRO==="todos"?"on":""}">Todos</button>
        <button data-filter="activos" class="${ZX_FILTRO==="activos"?"on":""}">Activos</button>
        <button data-filter="libres" class="${ZX_FILTRO==="libres"?"on":""}">Libres</button>
        <button data-filter="uso" class="${ZX_FILTRO==="uso"?"on":""}">En uso</button>
        <button data-filter="inactivos" class="${ZX_FILTRO==="inactivos"?"on":""}">Inactivos</button>
      </div>

      <div class="zx_veh_lista">
        ${
          lista.length
          ? lista.map(tarjetaVehiculo).join("")
          : `<div class="zx_text zx_veh_empty">No hay vehículos con este filtro.</div>`
        }
      </div>
    </div>
  `;

  instalarEventos();
}

function instalarEventos(){
  $("zx_veh_crear").onclick=function(){
    abrirFormulario();
  };

  $("zx_veh_buscar").oninput=function(){
    ZX_BUSQUEDA=this.value || "";
    pintarVehiculos();
  };

  document.querySelectorAll(".zx_veh_filtros button").forEach(btn=>{
    btn.onclick=function(){
      ZX_FILTRO=btn.dataset.filter;
      pintarVehiculos();
    };
  });

  document.querySelectorAll("[data-action]").forEach(btn=>{
    btn.onclick=function(){
      const id=btn.dataset.id;
      const action=btn.dataset.action;

      if(action==="edit") abrirFormulario(id);
      if(action==="desactivar") cambiarActivo(id,false);
      if(action==="activar") cambiarActivo(id,true);
      if(action==="liberar") liberarVehiculo(id);
    };
  });
}

function vehiculoPorId(id){
  return ZX_VEHICULOS.find(v=>String(v.id)===String(id)) || null;
}

function cerrarModal(){
  const m=$("zx_veh_modal");
  if(m) m.remove();
  document.body.classList.remove("zx_modal_abierto");
}

function abrirFormulario(id){
  const edit=vehiculoPorId(id);
  const titulo=edit ? "Editar vehículo" : "Nuevo vehículo";

  document.body.classList.add("zx_modal_abierto");

  const modal=document.createElement("div");
  modal.id="zx_veh_modal";
  modal.innerHTML=`
    <div class="zx_modal_fondo">
      <div class="zx_modal_caja">
        <h2>${titulo}</h2>

        <label class="zx_text">Matrícula</label>
        <input id="zx_veh_matricula" value="${limpiar(edit?.matricula || "")}" placeholder="0000 ABC">

        <label class="zx_text">Marca</label>
        <input id="zx_veh_marca" value="${limpiar(edit?.marca || "")}" placeholder="Marca">

        <label class="zx_text">Modelo</label>
        <input id="zx_veh_modelo" value="${limpiar(edit?.modelo || "")}" placeholder="Modelo">

        <label class="zx_text">Km actuales</label>
        <input id="zx_veh_km" type="number" min="0" step="1" value="${limpiar(edit?.km_actual ?? 0)}">

        <label class="zx_text">Estado</label>
        <select id="zx_veh_activo">
          <option value="true" ${edit?.activo!==false ? "selected":""}>Activo</option>
          <option value="false" ${edit?.activo===false ? "selected":""}>Inactivo</option>
        </select>

        <label class="zx_text">Uso actual</label>
        <select id="zx_veh_en_uso">
          <option value="false" ${!edit?.en_uso ? "selected":""}>Libre</option>
          <option value="true" ${edit?.en_uso ? "selected":""}>En uso</option>
        </select>

        <label class="zx_text">Usuario asignado</label>
        <input id="zx_veh_usuario" value="${limpiar(edit?.usuario_asignado || "")}" placeholder="Vacío si está libre">

        <button class="zx_btn_big zx_verde" id="zx_veh_guardar">${edit ? "Guardar cambios" : "Crear vehículo"}</button>
        <button class="zx_btn_big zx_gris" id="zx_veh_cancelar">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("zx_veh_cancelar").onclick=cerrarModal;
  $("zx_veh_guardar").onclick=function(){
    guardarVehiculo(id);
  };
}

function leerFormulario(){
  const matricula=String($("zx_veh_matricula").value || "").trim().toUpperCase();
  const marca=String($("zx_veh_marca").value || "").trim();
  const modelo=String($("zx_veh_modelo").value || "").trim();
  const km_actual=num($("zx_veh_km").value);
  const activo=$("zx_veh_activo").value==="true";
  const en_uso=$("zx_veh_en_uso").value==="true";
  let usuario_asignado=String($("zx_veh_usuario").value || "").trim();

  if(!en_uso){
    usuario_asignado="";
  }

  return {
    matricula,
    marca,
    modelo,
    km_actual,
    activo,
    en_uso,
    usuario_asignado:usuario_asignado || null
  };
}

function validarVehiculo(data,id){
  if(!data.matricula){
    alert("La matrícula es obligatoria.");
    return false;
  }

  if(data.km_actual<0){
    alert("Los kilómetros no pueden ser negativos.");
    return false;
  }

  const repetido=ZX_VEHICULOS.find(v=>{
    return normalizar(v.matricula)===normalizar(data.matricula) &&
           String(v.id)!==String(id || "");
  });

  if(repetido){
    alert("Ya existe un vehículo con esa matrícula.");
    return false;
  }

  return true;
}

async function guardarVehiculo(id){
  const data=leerFormulario();

  if(!validarVehiculo(data,id)) return;

  const cliente=sb();

  if(!navigator.onLine || !cliente){
    guardarLocal(id,data);
    cerrarModal();
    pintarVehiculos();
    setEstado("offline");
    alert("Guardado sin conexión. Se sincronizará al volver Internet.");
    return;
  }

  try{
    let r;

    if(id){
      r=await cliente.from(TABLA).update(data).eq("id",id);
    }else{
      r=await cliente.from(TABLA).insert([data]).select("*").maybeSingle();
    }

    if(r.error) throw r.error;

    cerrarModal();
    await cargarVehiculos();

  }catch(e){
    console.error(e);
    alert("No se pudo guardar el vehículo.");
  }
}

function guardarLocal(id,data){
  if(id){
    ZX_VEHICULOS=ZX_VEHICULOS.map(v=>{
      if(String(v.id)===String(id)){
        return Object.assign({},v,data,{zx_pendiente:true});
      }
      return v;
    });

    if(zx() && typeof zx().guardarOffline==="function"){
      zx().guardarOffline(TABLA,"update",data,"id",id);
    }

  }else{
    const nuevo=Object.assign({
      id:"local_"+Date.now(),
      zx_pendiente:true
    },data);

    ZX_VEHICULOS.push(nuevo);

    if(zx() && typeof zx().guardarOffline==="function"){
      zx().guardarOffline(TABLA,"insert",[data]);
    }
  }

  guardarCache(ZX_VEHICULOS);
}

async function cambiarActivo(id,activo){
  const v=vehiculoPorId(id);
  if(!v) return;

  if(!activo && v.en_uso){
    alert("No puedes desactivar un vehículo que está en uso.");
    return;
  }

  const ok=confirm(activo ? "¿Activar este vehículo?" : "¿Desactivar este vehículo?");
  if(!ok) return;

  await actualizarVehiculo(id,{activo});
}

async function liberarVehiculo(id){
  const v=vehiculoPorId(id);
  if(!v) return;

  const km=prompt("Km actuales al liberar:",String(v.km_actual ?? 0));
  if(km===null) return;

  const kmNum=num(km);

  if(kmNum<num(v.km_actual)){
    alert("Los km no pueden ser menores que los actuales.");
    return;
  }

  await actualizarVehiculo(id,{
    en_uso:false,
    usuario_asignado:null,
    km_actual:kmNum
  });
}

async function actualizarVehiculo(id,data){
  const cliente=sb();

  if(!navigator.onLine || !cliente){
    guardarLocal(id,data);
    pintarVehiculos();
    setEstado("offline");
    return;
  }

  try{
    const r=await cliente.from(TABLA).update(data).eq("id",id);
    if(r.error) throw r.error;
    await cargarVehiculos();
  }catch(e){
    console.error(e);
    alert("No se pudo actualizar el vehículo.");
  }
}

async function vehiculosLibres(){
  if(!ZX_VEHICULOS.length){
    await cargarVehiculos();
  }

  return ZX_VEHICULOS.filter(v=>v.activo!==false && !v.en_uso);
}

function instalarCSS(){
  if($("zx_veh_css")) return;

  const st=document.createElement("style");
  st.id="zx_veh_css";
  st.innerHTML=`
    .zx_veh_header{
      display:flex;
      gap:14px;
      align-items:flex-start;
      justify-content:space-between;
      margin-bottom:16px;
    }
    .zx_veh_crear{
      width:auto;
      min-width:120px;
      margin-top:0;
    }
    .zx_veh_resumen{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:10px;
      margin:16px 0;
    }
    .zx_veh_resumen div{
      background:#f8fafc;
      border:1px solid #d1d5db;
      border-radius:18px;
      padding:14px 8px;
      text-align:center;
    }
    .zx_veh_resumen b{
      display:block;
      font-size:26px;
      color:#0f172a;
      font-weight:900;
    }
    .zx_veh_resumen span{
      display:block;
      margin-top:4px;
      color:#64748b;
      font-size:13px;
      font-weight:900;
    }
    .zx_veh_filtros{
      display:flex;
      gap:8px;
      overflow-x:auto;
      padding:12px 0;
      margin-bottom:8px;
    }
    .zx_veh_filtros button{
      border:0;
      border-radius:999px;
      padding:10px 14px;
      background:#e2e8f0;
      color:#334155;
      font-weight:900;
      white-space:nowrap;
    }
    .zx_veh_filtros button.on{
      background:#2563eb;
      color:white;
    }
    .zx_veh_lista{
      display:grid;
      grid-template-columns:1fr;
      gap:12px;
      margin-top:10px;
    }
    .zx_veh_card{
      border:1px solid #d1d5db;
      border-radius:22px;
      padding:16px;
      background:#f8fafc;
    }
    .zx_veh_top{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:flex-start;
    }
    .zx_veh_matricula{
      font-size:24px;
      font-weight:900;
      color:#0f172a;
    }
    .zx_veh_modelo{
      margin-top:4px;
      font-size:15px;
      font-weight:850;
      color:#64748b;
    }
    .zx_veh_badge{
      border-radius:999px;
      padding:8px 10px;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
    }
    .zx_veh_badge_libre{background:#dcfce7;color:#166534}
    .zx_veh_badge_uso{background:#fef3c7;color:#92400e}
    .zx_veh_badge_off{background:#e5e7eb;color:#374151}
    .zx_veh_grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-top:14px;
    }
    .zx_veh_grid div{
      background:white;
      border:1px solid #e2e8f0;
      border-radius:16px;
      padding:12px;
    }
    .zx_veh_grid b{
      display:block;
      color:#0f172a;
      font-size:18px;
      font-weight:900;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .zx_veh_grid span{
      display:block;
      color:#64748b;
      font-size:12px;
      font-weight:900;
      margin-top:4px;
    }
    .zx_veh_actions{
      display:grid;
      grid-template-columns:1fr;
      gap:8px;
      margin-top:14px;
    }
    .zx_veh_actions .zx_btn{
      margin-top:0;
      padding:13px;
      font-size:15px;
      border-radius:15px;
    }
    .zx_veh_empty{
      padding:18px;
      border:1px dashed #cbd5e1;
      border-radius:18px;
      text-align:center;
    }
    @media(min-width:700px){
      .zx_veh_lista{grid-template-columns:repeat(2,1fr)}
      .zx_veh_actions{grid-template-columns:repeat(3,1fr)}
    }
    @media(max-width:430px){
      .zx_veh_header{align-items:stretch}
      .zx_veh_header h2{font-size:30px}
      .zx_veh_resumen{grid-template-columns:repeat(2,1fr)}
      .zx_veh_crear{min-width:105px}
    }
  `;
  document.head.appendChild(st);
}

window.ZX_crearVehiculo=function(){
  abrirFormulario();
};

window.ZX_editarVehiculo=function(id){
  abrirFormulario(id);
};

window.ZX_vehiculosLibres=vehiculosLibres;
window.ZX_getVehiculosLibres=vehiculosLibres;

window.ZX_vehiculos=function(){
  instalarCSS();
  cargarVehiculos();
};

window.ZENTRYX_UI_abrirVehiculos=window.ZX_vehiculos;

if(zx() && typeof zx().registrarModulo==="function"){
  zx().registrarModulo("vehiculos",{
    nombre:"Vehículos",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("Vehículos cargado V"+ZX_VERSION);

})();