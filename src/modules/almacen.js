// ============================================================
// ZENTRYX PRO - ALMACÉN
// V1003 - BUSCADOR DE MATERIALES Y CATALOGO
// Base: materiales + tablas definitivas de almacén
// ============================================================
(function(){
"use strict";

const ZX_VERSION="1003";

const T_MATERIALES="materiales";
const T_CATALOGO="materiales_catalogo";
const T_UBICACIONES="almacen_ubicaciones";
const T_EXISTENCIAS="almacen_existencias";
const T_RESERVAS="almacen_reservas";
const T_MOVIMIENTOS="almacen_movimientos";
const V_STOCK="almacen_stock_disponible";

let ZX_AL_TAB="stock";
let ZX_AL_MATERIALES=[];
let ZX_AL_CATALOGO=[];
let ZX_AL_SUGERENCIAS=[];
let ZX_AL_UBICACIONES=[];
let ZX_AL_STOCK=[];
let ZX_AL_RESERVAS=[];
let ZX_AL_MOVIMIENTOS=[];
let ZX_AL_TRABAJOS=[];
let ZX_AL_VEHICULOS=[];

function sb(){return window.sb || window.supabaseClient || null}
function app(){return document.getElementById("app")}
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
function numero(v){
  const n=Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatoNumero(v){
  return numero(v).toLocaleString("es-ES",{maximumFractionDigits:3});
}
function fechaHora(v){
  const d=new Date(v || 0);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES",{
    day:"2-digit",month:"2-digit",year:"numeric",
    hour:"2-digit",minute:"2-digit"
  });
}
function sesion(){
  const claves=["zentryx_session","zentryx_sesion","zentryx_usuario"];
  for(const k of claves){
    try{
      const valor=JSON.parse(localStorage.getItem(k) || "null");
      if(valor && typeof valor==="object") return valor;
    }catch(e){}
  }
  return {};
}
function usuarioActual(){
  const s=sesion();
  return {
    id:String(s.id || s.usuario_id || ""),
    nombre:String(s.nombre || s.usuario || s.username || ""),
    rol:normalizar(s.rol || s.role || ""),
    empresa_id:String(s.empresa_id || s.empresa || "demo")
  };
}
function esGestion(){
  const rol=usuarioActual().rol;
  return [
    "administrador","admin","desarrollador","compras",
    "administracion","encargado","responsable de obra"
  ].some(x=>rol.includes(x));
}
function permisosSesion(){
  const s=sesion();
  const p=s.permisos || s.permissions || {};
  if(Array.isArray(p)) return new Set(p.map(normalizar));
  if(p && typeof p==="object"){
    return new Set(
      Object.entries(p)
        .filter(([,valor])=>valor===true)
        .map(([clave])=>normalizar(clave))
    );
  }
  return new Set();
}
function tienePermiso(nombre){
  const permisos=permisosSesion();
  if(permisos.has(normalizar(nombre))) return true;
  return esGestion();
}
function puedeVerPrecios(){
  return tienePermiso("ver_precios_compra") || tienePermiso("ver_coste_trabajo");
}
function puedeGestionarStock(){
  return tienePermiso("gestionar_almacen") || tienePermiso("gestionar_compras");
}
function idLocal(){
  if(window.crypto && typeof window.crypto.randomUUID==="function"){
    return window.crypto.randomUUID();
  }
  return "zx-"+Date.now()+"-"+Math.random().toString(36).slice(2);
}
function instalarCSS(){
  if(document.getElementById("zx_almacen_css")) return;
  const style=document.createElement("style");
  style.id="zx_almacen_css";
  style.textContent=`
    .zx_al_wrap{max-width:1240px;margin:0 auto;padding:18px 14px 46px}
    .zx_al_head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px}
    .zx_al_head h1{margin:0;font-size:30px;color:#071330}.zx_al_head p{margin:5px 0 0;color:#64748b;font-weight:750}
    .zx_al_head_actions{display:flex;gap:8px;flex-wrap:wrap}
    .zx_al_btn_primary,.zx_al_btn_secondary{border-radius:13px;padding:11px 14px;font-weight:950}
    .zx_al_btn_primary{border:0;background:#0f766e;color:#fff}.zx_al_btn_secondary{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8}
    .zx_al_tabs{display:flex;gap:7px;overflow:auto;padding-bottom:4px;margin-bottom:14px}
    .zx_al_tab{border:1px solid #dbe4ef;border-radius:999px;padding:9px 13px;background:#fff;color:#475569;font-weight:900;white-space:nowrap}
    .zx_al_tab.active{background:#0f766e;border-color:#0f766e;color:#fff}
    .zx_al_summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .zx_al_stat{border:1px solid #dbe4ef;border-radius:17px;padding:14px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.045)}
    .zx_al_stat small{display:block;color:#64748b;font-weight:800}.zx_al_stat b{display:block;margin-top:4px;font-size:23px;color:#071330}
    .zx_al_tools{display:grid;grid-template-columns:minmax(230px,1.35fr) minmax(165px,.75fr) minmax(165px,.75fr) auto;gap:8px;margin-bottom:14px}
    .zx_al_tools input,.zx_al_tools select{height:45px;border:1px solid #cbd5e1;border-radius:13px;padding:0 12px;background:#fff;color:#0f172a;font-weight:800}
    .zx_al_tools button{border:1px solid #bfdbfe;border-radius:13px;background:#eff6ff;color:#1d4ed8;font-weight:900}
    .zx_al_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .zx_al_card{border:1px solid #dbe4ef;border-radius:18px;padding:14px;background:#fff;display:grid;gap:11px;box-shadow:0 3px 12px rgba(15,23,42,.035)}
    .zx_al_card.low{border-color:#fdba74;background:#fffaf3}.zx_al_card.zero{border-color:#fca5a5;background:#fff5f5}
    .zx_al_top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .zx_al_top h3{margin:0;font-size:18px;color:#071330}.zx_al_top em{font-style:normal;border-radius:999px;padding:5px 8px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:900}
    .zx_al_meta{color:#64748b;font-size:12px;font-weight:750;line-height:1.45}
    .zx_al_stock{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .zx_al_stock span{display:grid;gap:3px;padding:10px 7px;border:1px solid #e2e8f0;border-radius:12px;text-align:center;background:#f8fafc}
    .zx_al_stock small{font-size:9px;text-transform:uppercase;color:#64748b;font-weight:900}.zx_al_stock b{font-size:16px;color:#071330}
    .zx_al_actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .zx_al_actions button{border-radius:11px;padding:10px 7px;font-weight:900}
    .zx_al_in{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}.zx_al_out{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .zx_al_opt{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
    .zx_al_empty{grid-column:1/-1;padding:28px;border:1px dashed #cbd5e1;border-radius:17px;text-align:center;color:#64748b;font-weight:800;background:#fff}
    .zx_al_list{display:grid;gap:9px}.zx_al_row{border:1px solid #dbe4ef;border-radius:15px;padding:12px;background:#fff;display:grid;gap:7px}
    .zx_al_row_head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .zx_al_row_head b{color:#071330}.zx_al_badge{border-radius:999px;padding:5px 8px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:900}
    .zx_al_badge.ok{background:#dcfce7;color:#166534}.zx_al_badge.warn{background:#ffedd5;color:#9a3412}.zx_al_badge.info{background:#dbeafe;color:#1d4ed8}
    .zx_al_row_meta{color:#64748b;font-size:12px;font-weight:750;line-height:1.45}
    .zx_al_row_actions{display:flex;gap:7px;flex-wrap:wrap}.zx_al_row_actions button{border-radius:10px;padding:8px 10px;font-weight:900}
    .zx_al_modal{position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,.58);display:grid;place-items:center;padding:16px}
    .zx_al_modal_box{width:min(680px,100%);max-height:94dvh;overflow:auto;border-radius:20px;padding:20px;background:#fff;box-shadow:0 25px 70px rgba(15,23,42,.25)}
    .zx_al_modal_box h2{margin:0 0 14px;color:#071330}.zx_al_form{display:grid;gap:11px}
    .zx_al_form label{display:grid;gap:5px;color:#334155;font-weight:850;font-size:12px}
    .zx_al_form input,.zx_al_form select,.zx_al_form textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:12px;background:#fff;font:inherit}
    .zx_al_form2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .zx_al_modal_summary{display:grid;gap:5px;border:1px solid #dbe4ef;border-radius:14px;padding:12px;background:#f8fafc;color:#334155}
    .zx_al_modal_summary strong{font-size:17px;color:#071330}
    .zx_al_material_search{position:relative;display:grid;gap:7px}
    .zx_al_material_selected{display:none;border:1px solid #86efac;border-radius:12px;padding:11px;background:#f0fdf4;color:#166534;font-weight:850}
    .zx_al_material_selected.show{display:block}
    .zx_al_suggestions{display:none;position:absolute;left:0;right:0;top:100%;z-index:20;max-height:260px;overflow:auto;border:1px solid #cbd5e1;border-radius:13px;background:#fff;box-shadow:0 16px 35px rgba(15,23,42,.18)}
    .zx_al_suggestions.show{display:grid}
    .zx_al_suggestion{border:0;border-bottom:1px solid #e2e8f0;background:#fff;padding:11px 12px;text-align:left;color:#0f172a}
    .zx_al_suggestion:last-child{border-bottom:0}.zx_al_suggestion b{display:block;font-size:14px}.zx_al_suggestion small{display:block;margin-top:2px;color:#64748b;font-weight:750}
    .zx_al_suggestion.empty{color:#64748b;font-weight:800}
    .zx_al_full_btn{width:100%;border-radius:13px;padding:12px;font-weight:950;margin-top:7px}
    .zx_al_save{background:#16a34a;color:#fff;border:0}.zx_al_cancel{background:#f1f5f9;color:#334155;border:0}
    .zx_al_danger{background:#fff1f2;color:#be123c;border:1px solid #fecdd3}
    .zx_al_history{display:grid;gap:8px}.zx_al_move{border:1px solid #e2e8f0;border-radius:13px;padding:11px;background:#f8fafc}
    .zx_al_move b{display:block;color:#071330}.zx_al_move small{color:#64748b;font-weight:750}
    @media(max-width:840px){.zx_al_summary{grid-template-columns:1fr 1fr}.zx_al_grid{grid-template-columns:1fr}.zx_al_tools{grid-template-columns:1fr 1fr}}
    @media(max-width:540px){.zx_al_head{align-items:stretch;flex-direction:column}.zx_al_head_actions{display:grid;grid-template-columns:1fr 1fr}.zx_al_summary,.zx_al_tools,.zx_al_form2{grid-template-columns:1fr}.zx_al_actions{grid-template-columns:1fr}.zx_al_stock{grid-template-columns:1fr 1fr 1fr}}
  `;
  document.head.appendChild(style);
}
function cerrarModal(){
  document.getElementById("zx_al_modal")?.remove();
}
function modal(html){
  cerrarModal();
  const m=document.createElement("div");
  m.id="zx_al_modal";
  m.className="zx_al_modal";
  m.innerHTML=`<div class="zx_al_modal_box">${html}</div>`;
  m.onclick=function(e){if(e.target===m) cerrarModal()};
  document.body.appendChild(m);
}
function mensajeError(e){
  return String(e?.message || e?.error_description || e || "Error desconocido");
}
async function asegurarAlmacenPrincipal(){
  const empresa=usuarioActual().empresa_id;
  let existentes=ZX_AL_UBICACIONES.filter(u=>u.tipo==="almacen");
  if(existentes.length) return existentes[0];

  const r=await sb().from(T_UBICACIONES).insert([{
    empresa_id:empresa,
    nombre:"Almacén principal",
    tipo:"almacen",
    activa:true
  }]).select().single();

  if(r.error) throw r.error;
  ZX_AL_UBICACIONES.push(r.data);
  return r.data;
}
async function cargarTodo(){
  if(!sb()) throw new Error("No hay conexión con Supabase.");
  const empresa=usuarioActual().empresa_id;

  const resultados=await Promise.all([
    sb().from(T_MATERIALES).select("*").eq("activo",true).order("nombre",{ascending:true}),
    sb().from(T_CATALOGO).select("*").order("veces_usado",{ascending:false}).order("nombre",{ascending:true}),
    sb().from(T_UBICACIONES).select("*").eq("empresa_id",empresa).eq("activa",true).order("tipo").order("nombre"),
    sb().from(V_STOCK).select("*").eq("empresa_id",empresa).order("material"),
    sb().from(T_RESERVAS).select("*").eq("empresa_id",empresa).order("created_at",{ascending:false}).limit(300),
    sb().from(T_MOVIMIENTOS).select("*").eq("empresa_id",empresa).order("created_at",{ascending:false}).limit(500),
    sb().from("trabajos").select("id,titulo,cliente,estado,fecha").neq("archivado",true).order("fecha",{ascending:false}).limit(300),
    sb().from("vehiculos").select("id,matricula,marca,modelo,activo").eq("activo",true).order("matricula")
  ]);

  for(const r of resultados){
    if(r.error) throw r.error;
  }

  ZX_AL_MATERIALES=resultados[0].data || [];
  ZX_AL_CATALOGO=resultados[1].data || [];
  ZX_AL_UBICACIONES=resultados[2].data || [];
  ZX_AL_STOCK=resultados[3].data || [];
  ZX_AL_RESERVAS=resultados[4].data || [];
  ZX_AL_MOVIMIENTOS=resultados[5].data || [];
  ZX_AL_TRABAJOS=resultados[6].data || [];
  ZX_AL_VEHICULOS=resultados[7].data || [];
  reconstruirSugerenciasMateriales();

  if(!ZX_AL_UBICACIONES.some(u=>u.tipo==="almacen")){
    await asegurarAlmacenPrincipal();
  }
}

function claveMaterial(nombre,unidad){
  return normalizar(nombre)+"|"+normalizar(unidad||"ud");
}
function reconstruirSugerenciasMateriales(){
  const mapa=new Map();
  for(const m of ZX_AL_MATERIALES){
    const key=claveMaterial(m.nombre,m.unidad);
    mapa.set(key,{origen:"materiales",id:m.id,nombre:m.nombre,unidad:m.unidad||"ud",referencia:m.referencia||"",categoria:m.familia||m.categoria||"",veces_usado:numero(m.veces_usado)});
  }
  for(const c of ZX_AL_CATALOGO){
    const key=claveMaterial(c.nombre,c.unidad);
    if(!mapa.has(key)){
      mapa.set(key,{origen:"catalogo",id:c.id,nombre:c.nombre,unidad:c.unidad||"ud",referencia:"",categoria:c.categoria||"",veces_usado:numero(c.veces_usado)});
    }
  }
  ZX_AL_SUGERENCIAS=[...mapa.values()].sort((a,b)=>{
    const uso=numero(b.veces_usado)-numero(a.veces_usado);
    return uso || String(a.nombre).localeCompare(String(b.nombre),"es",{sensitivity:"base"});
  });
}
function buscarSugerenciasMaterial(texto){
  const q=normalizar(texto);
  if(!q) return ZX_AL_SUGERENCIAS.slice(0,20);
  return ZX_AL_SUGERENCIAS.filter(x=>normalizar([x.nombre,x.unidad,x.referencia,x.categoria].join(" ")).includes(q)).slice(0,30);
}
async function asegurarMaterialPrincipal(sugerencia){
  if(!sugerencia) throw new Error("Selecciona un material.");
  if(sugerencia.origen==="materiales") return sugerencia.id;
  const nombre=String(sugerencia.nombre||"").trim();
  const unidad=String(sugerencia.unidad||"ud").trim()||"ud";
  const existente=ZX_AL_MATERIALES.find(m=>claveMaterial(m.nombre,m.unidad)===claveMaterial(nombre,unidad));
  if(existente) return existente.id;
  const payload={nombre,unidad,activo:true,veces_usado:numero(sugerencia.veces_usado),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  if(sugerencia.categoria) payload.familia=sugerencia.categoria;
  const r=await sb().from(T_MATERIALES).insert([payload]).select().single();
  if(r.error) throw r.error;
  ZX_AL_MATERIALES.push(r.data);
  reconstruirSugerenciasMateriales();
  return r.data.id;
}
function instalarBuscadorMaterial(){
  const input=document.getElementById("al_material_search");
  const hidden=document.getElementById("al_material_value");
  const results=document.getElementById("al_material_results");
  const selected=document.getElementById("al_material_selected");
  if(!input||!hidden||!results||!selected) return;
  const pintar=function(){
    const lista=buscarSugerenciasMaterial(input.value);
    results.innerHTML=lista.length?lista.map((x,i)=>`<button type="button" class="zx_al_suggestion" data-mat-index="${i}"><b>${limpiar(x.nombre)}</b><small>${limpiar([x.unidad,x.categoria,x.referencia,x.origen==="catalogo"?"Biblioteca aprendida":"Catálogo principal"].filter(Boolean).join(" · "))}</small></button>`).join(""):`<div class="zx_al_suggestion empty">No se han encontrado materiales.</div>`;
    results.classList.add("show");
    results.querySelectorAll("[data-mat-index]").forEach(btn=>btn.onclick=function(){
      const elegido=lista[Number(btn.dataset.matIndex)];
      hidden.value=JSON.stringify(elegido);
      input.value=elegido.nombre;
      selected.textContent=`Seleccionado: ${elegido.nombre} · ${elegido.unidad||"ud"}`;
      selected.classList.add("show");
      results.classList.remove("show");
    });
  };
  input.onfocus=pintar;
  input.oninput=function(){hidden.value="";selected.classList.remove("show");pintar()};
  setTimeout(()=>document.addEventListener("click",function cerrar(e){if(!input.closest(".zx_al_material_search")?.contains(e.target)) results.classList.remove("show")},{once:false}),0);
}
function materialElegidoFormulario(){
  const raw=document.getElementById("al_material_value")?.value||"";
  if(!raw) return null;
  try{return JSON.parse(raw)}catch(e){return null}
}

function materialPorId(id){
  return ZX_AL_MATERIALES.find(x=>String(x.id)===String(id));
}
function ubicacionPorId(id){
  return ZX_AL_UBICACIONES.find(x=>String(x.id)===String(id));
}
function trabajoPorId(id){
  return ZX_AL_TRABAJOS.find(x=>String(x.id)===String(id));
}
function stockFisicoTotal(){
  return ZX_AL_STOCK.reduce((s,x)=>s+numero(x.stock_fisico),0);
}
function stockDisponibleTotal(){
  return ZX_AL_STOCK.reduce((s,x)=>s+numero(x.stock_disponible),0);
}
function reservasActivas(){
  return ZX_AL_RESERVAS.filter(r=>!["utilizado","devuelto","cancelado"].includes(String(r.estado||"")));
}
function resumenHTML(){
  const bajos=ZX_AL_STOCK.filter(x=>numero(x.stock_disponible)<=numero(x.stock_minimo)).length;
  return `
    <section class="zx_al_summary">
      <article class="zx_al_stat"><small>Materiales con stock</small><b>${new Set(ZX_AL_STOCK.map(x=>x.material_id)).size}</b></article>
      <article class="zx_al_stat"><small>Stock físico</small><b>${formatoNumero(stockFisicoTotal())}</b></article>
      <article class="zx_al_stat"><small>Stock disponible</small><b>${formatoNumero(stockDisponibleTotal())}</b></article>
      <article class="zx_al_stat"><small>Alertas / reservas</small><b>${bajos} / ${reservasActivas().length}</b></article>
    </section>`;
}
function tabsHTML(){
  const tabs=[
    ["stock","Stock"],
    ["reservas","Reservas"],
    ["movimientos","Movimientos"],
    ["ubicaciones","Ubicaciones"]
  ];
  return `<nav class="zx_al_tabs">${tabs.map(([id,texto])=>`
    <button class="zx_al_tab ${ZX_AL_TAB===id?"active":""}" data-al-tab="${id}">${texto}</button>
  `).join("")}</nav>`;
}
function render(){
  const root=app();
  if(!root) return;
  root.innerHTML=`
    <main class="zx_al_wrap">
      <header class="zx_al_head">
        <div>
          <h1>Almacén</h1>
          <p>Stock por ubicación, reservas de trabajos y trazabilidad.</p>
        </div>
        <div class="zx_al_head_actions">
          ${puedeGestionarStock()?`<button class="zx_al_btn_secondary" id="zx_al_new_location">＋ Ubicación</button>`:""}
          ${puedeGestionarStock()?`<button class="zx_al_btn_primary" id="zx_al_new_stock">＋ Añadir stock</button>`:""}
        </div>
      </header>
      ${resumenHTML()}
      ${tabsHTML()}
      <section id="zx_al_content"></section>
    </main>`;

  document.querySelectorAll("[data-al-tab]").forEach(btn=>{
    btn.onclick=function(){
      ZX_AL_TAB=btn.dataset.alTab;
      render();
    };
  });

  const nuevoStock=document.getElementById("zx_al_new_stock");
  if(nuevoStock) nuevoStock.onclick=abrirEntradaNueva;
  const nuevaUbicacion=document.getElementById("zx_al_new_location");
  if(nuevaUbicacion) nuevaUbicacion.onclick=()=>abrirUbicacion(null);

  if(ZX_AL_TAB==="reservas") renderReservas();
  else if(ZX_AL_TAB==="movimientos") renderMovimientos();
  else if(ZX_AL_TAB==="ubicaciones") renderUbicaciones();
  else renderStock();
}
function herramientasHTML(tipo){
  if(tipo==="stock"){
    const ubicaciones=ZX_AL_UBICACIONES.map(u=>`<option value="${limpiar(u.id)}">${limpiar(u.nombre)}</option>`).join("");
    return `<section class="zx_al_tools">
      <input id="zx_al_search" type="search" placeholder="Buscar material, referencia o ubicación">
      <select id="zx_al_location"><option value="">Todas las ubicaciones</option>${ubicaciones}</select>
      <select id="zx_al_filter"><option value="">Todo el stock</option><option value="low">Stock bajo</option><option value="zero">Sin stock disponible</option></select>
      <button id="zx_al_clear">Limpiar</button>
    </section>`;
  }
  return `<section class="zx_al_tools">
    <input id="zx_al_search" type="search" placeholder="Buscar">
    <select id="zx_al_filter"><option value="">Todos los estados</option></select>
    <select id="zx_al_location"><option value="">Todas las ubicaciones</option></select>
    <button id="zx_al_clear">Limpiar</button>
  </section>`;
}
function renderStock(){
  const content=document.getElementById("zx_al_content");
  content.innerHTML=`
    ${herramientasHTML("stock")}
    <section class="zx_al_grid" id="zx_al_stock_grid"></section>`;

  ["zx_al_search","zx_al_location","zx_al_filter"].forEach(id=>{
    const el=document.getElementById(id);
    el[id==="zx_al_search"?"oninput":"onchange"]=pintarStock;
  });
  document.getElementById("zx_al_clear").onclick=function(){
    document.getElementById("zx_al_search").value="";
    document.getElementById("zx_al_location").value="";
    document.getElementById("zx_al_filter").value="";
    pintarStock();
  };
  pintarStock();
}
function pintarStock(){
  const q=normalizar(document.getElementById("zx_al_search")?.value || "");
  const ubicacion=document.getElementById("zx_al_location")?.value || "";
  const filtro=document.getElementById("zx_al_filter")?.value || "";

  const lista=ZX_AL_STOCK.filter(x=>{
    const texto=normalizar([x.material,x.referencia,x.ubicacion,x.tipo_ubicacion,x.ubicacion_interna].filter(Boolean).join(" "));
    const disponible=numero(x.stock_disponible);
    const minimo=numero(x.stock_minimo);
    const okFiltro=!filtro || (filtro==="zero" ? disponible<=0 : disponible<=minimo);
    return (!q || texto.includes(q)) && (!ubicacion || String(x.ubicacion_id)===ubicacion) && okFiltro;
  });

  const grid=document.getElementById("zx_al_stock_grid");
  if(!lista.length){
    grid.innerHTML=`<div class="zx_al_empty">No hay existencias que coincidan. Pulsa “Añadir stock” para crear la primera.</div>`;
    return;
  }

  grid.innerHTML=lista.map(x=>{
    const disponible=numero(x.stock_disponible);
    const minimo=numero(x.stock_minimo);
    const clase=disponible<=0?"zero":disponible<=minimo?"low":"";
    return `<article class="zx_al_card ${clase}">
      <div class="zx_al_top">
        <div>
          <h3>${limpiar(x.material)}</h3>
          <div class="zx_al_meta">${limpiar([x.referencia,x.ubicacion,x.ubicacion_interna].filter(Boolean).join(" · "))}</div>
        </div>
        <em>${limpiar(x.tipo_ubicacion || "almacén")}</em>
      </div>
      <div class="zx_al_stock">
        <span><small>Físico</small><b>${formatoNumero(x.stock_fisico)} ${limpiar(x.unidad||"ud")}</b></span>
        <span><small>Reservado</small><b>${formatoNumero(x.stock_reservado)} ${limpiar(x.unidad||"ud")}</b></span>
        <span><small>Disponible</small><b>${formatoNumero(x.stock_disponible)} ${limpiar(x.unidad||"ud")}</b></span>
      </div>
      ${puedeGestionarStock()?`<div class="zx_al_actions">
        <button class="zx_al_in" data-entry="${limpiar(x.existencia_id)}">＋ Entrada</button>
        <button class="zx_al_out" data-exit="${limpiar(x.existencia_id)}">− Salida</button>
        <button class="zx_al_opt" data-stock-options="${limpiar(x.existencia_id)}">••• Opciones</button>
      </div>`:""}
    </article>`;
  }).join("");

  grid.querySelectorAll("[data-entry]").forEach(btn=>btn.onclick=()=>abrirMovimientoExistencia(btn.dataset.entry,"entrada"));
  grid.querySelectorAll("[data-exit]").forEach(btn=>btn.onclick=()=>abrirMovimientoExistencia(btn.dataset.exit,"salida"));
  grid.querySelectorAll("[data-stock-options]").forEach(btn=>btn.onclick=()=>abrirOpcionesExistencia(btn.dataset.stockOptions));
}
function renderReservas(){
  const content=document.getElementById("zx_al_content");
  const ubicaciones=ZX_AL_UBICACIONES.map(u=>`<option value="${limpiar(u.id)}">${limpiar(u.nombre)}</option>`).join("");
  content.innerHTML=`
    <section class="zx_al_tools">
      <input id="zx_al_search" type="search" placeholder="Buscar trabajo o material">
      <select id="zx_al_filter">
        <option value="">Todos los estados</option>
        <option value="reservado">Reservado</option>
        <option value="preparacion_parcial">Preparación parcial</option>
        <option value="preparado">Preparado</option>
        <option value="uso_parcial">Uso parcial</option>
        <option value="utilizado">Utilizado</option>
        <option value="devuelto">Devuelto</option>
      </select>
      <select id="zx_al_location"><option value="">Todas las ubicaciones</option>${ubicaciones}</select>
      <button id="zx_al_clear">Limpiar</button>
    </section>
    ${puedeGestionarStock()?`<button class="zx_al_btn_primary" id="zx_al_new_reservation" style="margin-bottom:12px">＋ Nueva reserva</button>`:""}
    <section class="zx_al_list" id="zx_al_reservations_list"></section>`;

  const nueva=document.getElementById("zx_al_new_reservation");
  if(nueva) nueva.onclick=abrirNuevaReserva;
  ["zx_al_search","zx_al_filter","zx_al_location"].forEach(id=>{
    const el=document.getElementById(id);
    el[id==="zx_al_search"?"oninput":"onchange"]=pintarReservas;
  });
  document.getElementById("zx_al_clear").onclick=function(){
    document.getElementById("zx_al_search").value="";
    document.getElementById("zx_al_filter").value="";
    document.getElementById("zx_al_location").value="";
    pintarReservas();
  };
  pintarReservas();
}
function estadoReservaTexto(estado){
  const mapa={
    reservado:"Reservado",
    preparacion_parcial:"Preparación parcial",
    preparado:"Preparado",
    uso_parcial:"Uso parcial",
    utilizado:"Utilizado",
    devuelto:"Devuelto",
    cancelado:"Cancelado"
  };
  return mapa[String(estado||"")] || estado || "Reservado";
}
function pintarReservas(){
  const q=normalizar(document.getElementById("zx_al_search")?.value || "");
  const estado=document.getElementById("zx_al_filter")?.value || "";
  const ubicacion=document.getElementById("zx_al_location")?.value || "";

  const lista=ZX_AL_RESERVAS.filter(r=>{
    const mat=materialPorId(r.material_id);
    const trabajo=trabajoPorId(r.trabajo_id);
    const texto=normalizar([mat?.nombre,trabajo?.titulo,trabajo?.cliente,r.notas].filter(Boolean).join(" "));
    return (!q||texto.includes(q)) && (!estado||r.estado===estado) && (!ubicacion||String(r.ubicacion_id)===ubicacion);
  });

  const box=document.getElementById("zx_al_reservations_list");
  if(!lista.length){
    box.innerHTML=`<div class="zx_al_empty">No hay reservas que coincidan.</div>`;
    return;
  }

  box.innerHTML=lista.map(r=>{
    const mat=materialPorId(r.material_id);
    const trabajo=trabajoPorId(r.trabajo_id);
    const ubi=ubicacionPorId(r.ubicacion_id);
    const restante=Math.max(0,numero(r.cantidad_reservada)-numero(r.cantidad_utilizada)-numero(r.cantidad_devuelta));
    const clase=["utilizado","devuelto"].includes(r.estado)?"ok":["uso_parcial","preparacion_parcial"].includes(r.estado)?"warn":"info";
    return `<article class="zx_al_row">
      <div class="zx_al_row_head">
        <div><b>${limpiar(mat?.nombre || "Material")}</b><div class="zx_al_row_meta">${limpiar(trabajo?.titulo || "Trabajo")} · ${limpiar(ubi?.nombre || "Sin ubicación")}</div></div>
        <span class="zx_al_badge ${clase}">${limpiar(estadoReservaTexto(r.estado))}</span>
      </div>
      <div class="zx_al_stock">
        <span><small>Reservado</small><b>${formatoNumero(r.cantidad_reservada)} ${limpiar(mat?.unidad||"ud")}</b></span>
        <span><small>Utilizado</small><b>${formatoNumero(r.cantidad_utilizada)} ${limpiar(mat?.unidad||"ud")}</b></span>
        <span><small>Restante</small><b>${formatoNumero(restante)} ${limpiar(mat?.unidad||"ud")}</b></span>
      </div>
      ${puedeGestionarStock()?`<div class="zx_al_row_actions">
        <button class="zx_al_opt" data-res-options="${limpiar(r.id)}">••• Gestionar reserva</button>
      </div>`:""}
    </article>`;
  }).join("");

  box.querySelectorAll("[data-res-options]").forEach(btn=>btn.onclick=()=>abrirOpcionesReserva(btn.dataset.resOptions));
}
function renderMovimientos(){
  const content=document.getElementById("zx_al_content");
  content.innerHTML=`
    <section class="zx_al_tools">
      <input id="zx_al_search" type="search" placeholder="Buscar material, usuario o motivo">
      <select id="zx_al_filter">
        <option value="">Todos los movimientos</option>
        <option value="entrada">Entradas</option>
        <option value="salida">Salidas</option>
        <option value="transferencia">Transferencias</option>
        <option value="reserva">Reservas</option>
        <option value="consumo">Consumos</option>
        <option value="devolucion">Devoluciones</option>
        <option value="ajuste">Ajustes</option>
      </select>
      <select id="zx_al_location"><option value="">Todas las ubicaciones</option></select>
      <button id="zx_al_clear">Limpiar</button>
    </section>
    <section class="zx_al_list" id="zx_al_moves_list"></section>`;

  ["zx_al_search","zx_al_filter"].forEach(id=>{
    const el=document.getElementById(id);
    el[id==="zx_al_search"?"oninput":"onchange"]=pintarMovimientos;
  });
  document.getElementById("zx_al_clear").onclick=function(){
    document.getElementById("zx_al_search").value="";
    document.getElementById("zx_al_filter").value="";
    pintarMovimientos();
  };
  pintarMovimientos();
}
function pintarMovimientos(){
  const q=normalizar(document.getElementById("zx_al_search")?.value || "");
  const tipo=document.getElementById("zx_al_filter")?.value || "";
  const lista=ZX_AL_MOVIMIENTOS.filter(m=>{
    const mat=materialPorId(m.material_id);
    const texto=normalizar([mat?.nombre,m.usuario,m.motivo,m.referencia].filter(Boolean).join(" "));
    return (!q||texto.includes(q)) && (!tipo||m.tipo===tipo);
  });

  const box=document.getElementById("zx_al_moves_list");
  if(!lista.length){
    box.innerHTML=`<div class="zx_al_empty">No hay movimientos que coincidan.</div>`;
    return;
  }

  box.innerHTML=lista.map(m=>{
    const mat=materialPorId(m.material_id);
    const origen=ubicacionPorId(m.ubicacion_origen_id);
    const destino=ubicacionPorId(m.ubicacion_destino_id);
    return `<article class="zx_al_row">
      <div class="zx_al_row_head">
        <div><b>${limpiar(mat?.nombre || "Material")} · ${formatoNumero(m.cantidad)} ${limpiar(mat?.unidad||"ud")}</b>
        <div class="zx_al_row_meta">${limpiar(fechaHora(m.created_at))} · ${limpiar(m.usuario||"Sistema")}</div></div>
        <span class="zx_al_badge info">${limpiar(m.tipo)}</span>
      </div>
      <div class="zx_al_row_meta">${limpiar([origen?.nombre,destino?.nombre,m.motivo].filter(Boolean).join(" → "))}</div>
    </article>`;
  }).join("");
}
function renderUbicaciones(){
  const content=document.getElementById("zx_al_content");
  content.innerHTML=`
    ${puedeGestionarStock()?`<button class="zx_al_btn_primary" id="zx_al_add_location_inline" style="margin-bottom:12px">＋ Nueva ubicación</button>`:""}
    <section class="zx_al_grid" id="zx_al_locations_grid"></section>`;
  const add=document.getElementById("zx_al_add_location_inline");
  if(add) add.onclick=()=>abrirUbicacion(null);

  const grid=document.getElementById("zx_al_locations_grid");
  if(!ZX_AL_UBICACIONES.length){
    grid.innerHTML=`<div class="zx_al_empty">No hay ubicaciones.</div>`;
    return;
  }
  grid.innerHTML=ZX_AL_UBICACIONES.map(u=>{
    const lineas=ZX_AL_STOCK.filter(x=>String(x.ubicacion_id)===String(u.id));
    const total=lineas.reduce((s,x)=>s+numero(x.stock_fisico),0);
    return `<article class="zx_al_card">
      <div class="zx_al_top"><div><h3>${limpiar(u.nombre)}</h3><div class="zx_al_meta">${limpiar([u.tipo,u.direccion].filter(Boolean).join(" · "))}</div></div><em>${limpiar(u.tipo)}</em></div>
      <div class="zx_al_stock">
        <span><small>Materiales</small><b>${lineas.length}</b></span>
        <span><small>Unidades</small><b>${formatoNumero(total)}</b></span>
        <span><small>Estado</small><b>${u.activa?"Activa":"Inactiva"}</b></span>
      </div>
      ${puedeGestionarStock()?`<div class="zx_al_actions"><button class="zx_al_opt" data-location-edit="${limpiar(u.id)}">✏️ Editar</button></div>`:""}
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-location-edit]").forEach(btn=>btn.onclick=()=>abrirUbicacion(ubicacionPorId(btn.dataset.locationEdit)));
}
async function recargar(){
  await cargarTodo();
  render();
}
function opcionesMateriales(selected=""){
  return ZX_AL_MATERIALES.map(m=>`<option value="${limpiar(m.id)}" ${String(m.id)===String(selected)?"selected":""}>${limpiar(m.nombre)}${m.referencia?" · "+limpiar(m.referencia):""}</option>`).join("");
}
function opcionesUbicaciones(selected="",excluir=""){
  return ZX_AL_UBICACIONES
    .filter(u=>String(u.id)!==String(excluir))
    .map(u=>`<option value="${limpiar(u.id)}" ${String(u.id)===String(selected)?"selected":""}>${limpiar(u.nombre)}</option>`)
    .join("");
}
function opcionesTrabajos(selected=""){
  return ZX_AL_TRABAJOS.map(t=>`<option value="${limpiar(t.id)}" ${String(t.id)===String(selected)?"selected":""}>${limpiar(t.titulo)}${t.cliente?" · "+limpiar(t.cliente):""}</option>`).join("");
}
async function insertarMovimiento(datos){
  const u=usuarioActual();
  const payload=Object.assign({
    empresa_id:u.empresa_id,
    usuario_id:u.id,
    usuario:u.nombre,
    dispositivo:navigator.userAgent.slice(0,250),
    created_at:new Date().toISOString()
  },datos);
  const r=await sb().from(T_MOVIMIENTOS).insert([payload]);
  if(r.error) throw r.error;
}
async function obtenerExistencia(materialId,ubicacionId){
  const r=await sb().from(T_EXISTENCIAS)
    .select("*")
    .eq("empresa_id",usuarioActual().empresa_id)
    .eq("material_id",materialId)
    .eq("ubicacion_id",ubicacionId)
    .maybeSingle();
  if(r.error) throw r.error;
  return r.data || null;
}
async function actualizarExistencia(materialId,ubicacionId,nuevaCantidad,extras={}){
  const empresa=usuarioActual().empresa_id;
  const existente=await obtenerExistencia(materialId,ubicacionId);
  if(existente){
    const r=await sb().from(T_EXISTENCIAS).update(Object.assign({
      cantidad:nuevaCantidad,
      updated_at:new Date().toISOString()
    },extras)).eq("id",existente.id);
    if(r.error) throw r.error;
    return Object.assign({},existente,{cantidad:nuevaCantidad},extras);
  }
  const r=await sb().from(T_EXISTENCIAS).insert([Object.assign({
    empresa_id:empresa,
    material_id:materialId,
    ubicacion_id:ubicacionId,
    cantidad:nuevaCantidad,
    stock_minimo:0,
    updated_at:new Date().toISOString()
  },extras)]).select().single();
  if(r.error) throw r.error;
  return r.data;
}
function abrirEntradaNueva(){
  modal(`<h2>Añadir stock</h2><div class="zx_al_form">
    <label>Material<div class="zx_al_material_search">
      <input id="al_material_search" type="search" autocomplete="off" placeholder="Escribe para buscar material">
      <input id="al_material_value" type="hidden">
      <div id="al_material_selected" class="zx_al_material_selected"></div>
      <div id="al_material_results" class="zx_al_suggestions"></div>
    </div></label>
    <label>Ubicación<select id="al_location"><option value="">Selecciona ubicación</option>${opcionesUbicaciones()}</select></label>
    <div class="zx_al_form2">
      <label>Cantidad<input id="al_qty" type="number" min="0.001" step="0.001"></label>
      <label>Stock mínimo<input id="al_min" type="number" min="0" step="0.001" value="0"></label>
    </div>
    <label>Ubicación interna<input id="al_internal" placeholder="Pasillo, estantería, balda..."></label>
    <label>Motivo<textarea id="al_reason" rows="3" placeholder="Compra, stock inicial, devolución..."></textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Guardar entrada</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  instalarBuscadorMaterial();
  document.getElementById("al_save").onclick=async function(){
    const sugerencia=materialElegidoFormulario();
    const ubicacionId=document.getElementById("al_location").value;
    const qty=numero(document.getElementById("al_qty").value);
    if(!sugerencia||!ubicacionId||qty<=0){alert("Selecciona material, ubicación y cantidad.");return}
    this.disabled=true;
    try{
      const materialId=await asegurarMaterialPrincipal(sugerencia);
      const anterior=await obtenerExistencia(materialId,ubicacionId);
      const previo=numero(anterior?.cantidad);
      const nuevo=previo+qty;
      await actualizarExistencia(materialId,ubicacionId,nuevo,{
        stock_minimo:numero(document.getElementById("al_min").value),
        ubicacion_interna:document.getElementById("al_internal").value.trim()
      });
      await insertarMovimiento({
        material_id:materialId,
        tipo:"entrada",
        cantidad:qty,
        ubicacion_destino_id:ubicacionId,
        stock_destino_anterior:previo,
        stock_destino_nuevo:nuevo,
        motivo:document.getElementById("al_reason").value.trim()
      });
      cerrarModal();
      await recargar();
    }catch(e){
      this.disabled=false;
      alert("No se pudo guardar la entrada.\n\n"+mensajeError(e));
    }
  };
}
function existenciaVistaPorId(id){
  return ZX_AL_STOCK.find(x=>String(x.existencia_id)===String(id));
}
function abrirMovimientoExistencia(existenciaId,tipo){
  const vista=existenciaVistaPorId(existenciaId);
  if(!vista) return;
  const salida=tipo==="salida";
  modal(`<h2>${salida?"Registrar salida":"Registrar entrada"}</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary">
      <strong>${limpiar(vista.material)}</strong>
      <span>${limpiar(vista.ubicacion)} · Stock físico: ${formatoNumero(vista.stock_fisico)} ${limpiar(vista.unidad||"ud")}</span>
      ${salida?`<span>Disponible: ${formatoNumero(vista.stock_disponible)} ${limpiar(vista.unidad||"ud")}</span>`:""}
    </div>
    <label>Cantidad<input id="al_qty" type="number" min="0.001" step="0.001"></label>
    <label>Motivo<textarea id="al_reason" rows="3"></textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Guardar</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    const qty=numero(document.getElementById("al_qty").value);
    if(qty<=0){alert("Introduce una cantidad.");return}
    const previo=numero(vista.stock_fisico);
    const nuevo=salida?previo-qty:previo+qty;
    if(nuevo<0){alert("No hay stock físico suficiente.");return}
    if(salida && qty>numero(vista.stock_disponible)){
      alert("Parte del stock está reservado. La salida supera el stock disponible.");
      return;
    }
    this.disabled=true;
    try{
      await actualizarExistencia(vista.material_id,vista.ubicacion_id,nuevo);
      await insertarMovimiento({
        material_id:vista.material_id,
        tipo:tipo,
        cantidad:qty,
        ubicacion_origen_id:salida?vista.ubicacion_id:null,
        ubicacion_destino_id:salida?null:vista.ubicacion_id,
        stock_origen_anterior:salida?previo:null,
        stock_origen_nuevo:salida?nuevo:null,
        stock_destino_anterior:salida?null:previo,
        stock_destino_nuevo:salida?null:nuevo,
        motivo:document.getElementById("al_reason").value.trim()
      });
      cerrarModal();
      await recargar();
    }catch(e){
      this.disabled=false;
      alert("No se pudo guardar el movimiento.\n\n"+mensajeError(e));
    }
  };
}
function abrirOpcionesExistencia(existenciaId){
  const vista=existenciaVistaPorId(existenciaId);
  if(!vista) return;
  modal(`<h2>Opciones de stock</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary">
      <strong>${limpiar(vista.material)}</strong>
      <span>${limpiar(vista.ubicacion)}</span>
      <span>Físico ${formatoNumero(vista.stock_fisico)} · Disponible ${formatoNumero(vista.stock_disponible)} ${limpiar(vista.unidad||"ud")}</span>
    </div>
    <button class="zx_al_full_btn zx_al_btn_secondary" id="al_transfer">↔ Transferir a otra ubicación</button>
    <button class="zx_al_full_btn zx_al_btn_secondary" id="al_adjust">⚖️ Ajustar stock físico</button>
    <button class="zx_al_full_btn zx_al_btn_secondary" id="al_minimum">🔔 Cambiar stock mínimo</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_close">Cerrar</button>
  </div>`);
  document.getElementById("al_close").onclick=cerrarModal;
  document.getElementById("al_transfer").onclick=()=>abrirTransferencia(vista);
  document.getElementById("al_adjust").onclick=()=>abrirAjuste(vista);
  document.getElementById("al_minimum").onclick=()=>abrirMinimo(vista);
}
function abrirTransferencia(vista){
  modal(`<h2>Transferir stock</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary"><strong>${limpiar(vista.material)}</strong><span>Origen: ${limpiar(vista.ubicacion)}</span><span>Disponible: ${formatoNumero(vista.stock_disponible)} ${limpiar(vista.unidad||"ud")}</span></div>
    <label>Destino<select id="al_destination"><option value="">Selecciona destino</option>${opcionesUbicaciones("",vista.ubicacion_id)}</select></label>
    <label>Cantidad<input id="al_qty" type="number" min="0.001" step="0.001"></label>
    <label>Motivo<textarea id="al_reason" rows="3"></textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Transferir</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    const destino=document.getElementById("al_destination").value;
    const qty=numero(document.getElementById("al_qty").value);
    if(!destino||qty<=0){alert("Selecciona destino y cantidad.");return}
    if(qty>numero(vista.stock_disponible)){alert("No hay stock disponible suficiente.");return}
    this.disabled=true;
    try{
      const origenPrevio=numero(vista.stock_fisico);
      const origenNuevo=origenPrevio-qty;
      const destinoExist=await obtenerExistencia(vista.material_id,destino);
      const destinoPrevio=numero(destinoExist?.cantidad);
      const destinoNuevo=destinoPrevio+qty;
      await actualizarExistencia(vista.material_id,vista.ubicacion_id,origenNuevo);
      try{
        await actualizarExistencia(vista.material_id,destino,destinoNuevo);
        await insertarMovimiento({
          material_id:vista.material_id,
          tipo:"transferencia",
          cantidad:qty,
          ubicacion_origen_id:vista.ubicacion_id,
          ubicacion_destino_id:destino,
          stock_origen_anterior:origenPrevio,
          stock_origen_nuevo:origenNuevo,
          stock_destino_anterior:destinoPrevio,
          stock_destino_nuevo:destinoNuevo,
          motivo:document.getElementById("al_reason").value.trim()
        });
      }catch(e){
        await actualizarExistencia(vista.material_id,vista.ubicacion_id,origenPrevio);
        throw e;
      }
      cerrarModal();
      await recargar();
    }catch(e){
      this.disabled=false;
      alert("No se pudo transferir.\n\n"+mensajeError(e));
    }
  };
}
function abrirAjuste(vista){
  modal(`<h2>Ajustar stock físico</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary"><strong>${limpiar(vista.material)}</strong><span>${limpiar(vista.ubicacion)} · Actual: ${formatoNumero(vista.stock_fisico)} ${limpiar(vista.unidad||"ud")}</span></div>
    <label>Stock real<input id="al_real" type="number" min="0" step="0.001" value="${limpiar(vista.stock_fisico)}"></label>
    <label>Motivo<textarea id="al_reason" rows="3" placeholder="Recuento, rotura, pérdida..."></textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Guardar ajuste</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    const nuevo=numero(document.getElementById("al_real").value);
    if(nuevo<0){alert("El stock no puede ser negativo.");return}
    this.disabled=true;
    try{
      const previo=numero(vista.stock_fisico);
      await actualizarExistencia(vista.material_id,vista.ubicacion_id,nuevo);
      await insertarMovimiento({
        material_id:vista.material_id,
        tipo:"ajuste",
        cantidad:Math.abs(nuevo-previo) || 0.001,
        ubicacion_origen_id:vista.ubicacion_id,
        ubicacion_destino_id:vista.ubicacion_id,
        stock_origen_anterior:previo,
        stock_origen_nuevo:nuevo,
        motivo:document.getElementById("al_reason").value.trim() || "Ajuste manual"
      });
      cerrarModal();
      await recargar();
    }catch(e){
      this.disabled=false;
      alert("No se pudo ajustar.\n\n"+mensajeError(e));
    }
  };
}
function abrirMinimo(vista){
  modal(`<h2>Stock mínimo</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary"><strong>${limpiar(vista.material)}</strong><span>${limpiar(vista.ubicacion)}</span></div>
    <label>Nuevo mínimo<input id="al_min" type="number" min="0" step="0.001" value="${limpiar(vista.stock_minimo)}"></label>
    <label>Ubicación interna<input id="al_internal" value="${limpiar(vista.ubicacion_interna||"")}"></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Guardar</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    this.disabled=true;
    const r=await sb().from(T_EXISTENCIAS).update({
      stock_minimo:numero(document.getElementById("al_min").value),
      ubicacion_interna:document.getElementById("al_internal").value.trim(),
      updated_at:new Date().toISOString()
    }).eq("id",vista.existencia_id);
    if(r.error){this.disabled=false;alert(mensajeError(r.error));return}
    cerrarModal();
    await recargar();
  };
}
function abrirNuevaReserva(){
  const stockDisponible=ZX_AL_STOCK.filter(x=>numero(x.stock_disponible)>0);
  modal(`<h2>Nueva reserva</h2><div class="zx_al_form">
    <label>Trabajo<select id="al_job"><option value="">Selecciona trabajo</option>${opcionesTrabajos()}</select></label>
    <label>Material y ubicación<select id="al_stock_line"><option value="">Selecciona stock</option>${stockDisponible.map(x=>`
      <option value="${limpiar(x.existencia_id)}">${limpiar(x.material)} · ${limpiar(x.ubicacion)} · disponible ${formatoNumero(x.stock_disponible)} ${limpiar(x.unidad||"ud")}</option>
    `).join("")}</select></label>
    <label>Cantidad a reservar<input id="al_qty" type="number" min="0.001" step="0.001"></label>
    <label>Notas<textarea id="al_notes" rows="3"></textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Crear reserva</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    const trabajoId=document.getElementById("al_job").value;
    const linea=existenciaVistaPorId(document.getElementById("al_stock_line").value);
    const qty=numero(document.getElementById("al_qty").value);
    if(!trabajoId||!linea||qty<=0){alert("Selecciona trabajo, material y cantidad.");return}
    if(qty>numero(linea.stock_disponible)){alert("La cantidad supera el stock disponible.");return}
    this.disabled=true;
    const u=usuarioActual();
    try{
      const reserva={
        empresa_id:u.empresa_id,
        trabajo_id:trabajoId,
        material_id:linea.material_id,
        ubicacion_id:linea.ubicacion_id,
        cantidad_reservada:qty,
        cantidad_preparada:0,
        cantidad_utilizada:0,
        cantidad_devuelta:0,
        estado:"reservado",
        reservado_por:u.nombre,
        reservado_at:new Date().toISOString(),
        notas:document.getElementById("al_notes").value.trim()
      };
      const r=await sb().from(T_RESERVAS).insert([reserva]).select().single();
      if(r.error) throw r.error;
      await insertarMovimiento({
        material_id:linea.material_id,
        tipo:"reserva",
        cantidad:qty,
        ubicacion_origen_id:linea.ubicacion_id,
        trabajo_id:trabajoId,
        reserva_id:r.data.id,
        stock_origen_anterior:numero(linea.stock_fisico),
        stock_origen_nuevo:numero(linea.stock_fisico),
        motivo:"Reserva para trabajo"
      });
      cerrarModal();
      await recargar();
    }catch(e){
      this.disabled=false;
      alert("No se pudo crear la reserva.\n\n"+mensajeError(e));
    }
  };
}
function reservaPorId(id){
  return ZX_AL_RESERVAS.find(x=>String(x.id)===String(id));
}
function abrirOpcionesReserva(id){
  const r=reservaPorId(id);
  if(!r) return;
  const mat=materialPorId(r.material_id);
  const trabajo=trabajoPorId(r.trabajo_id);
  const restante=Math.max(0,numero(r.cantidad_reservada)-numero(r.cantidad_utilizada)-numero(r.cantidad_devuelta));
  modal(`<h2>Gestionar reserva</h2><div class="zx_al_form">
    <div class="zx_al_modal_summary">
      <strong>${limpiar(mat?.nombre||"Material")}</strong>
      <span>${limpiar(trabajo?.titulo||"Trabajo")}</span>
      <span>Reservado ${formatoNumero(r.cantidad_reservada)} · Utilizado ${formatoNumero(r.cantidad_utilizada)} · Restante ${formatoNumero(restante)} ${limpiar(mat?.unidad||"ud")}</span>
    </div>
    ${restante>0?`<button class="zx_al_full_btn zx_al_btn_secondary" id="al_prepare">📦 Registrar preparación</button>`:""}
    ${restante>0?`<button class="zx_al_full_btn zx_al_btn_secondary" id="al_consume">🔧 Registrar consumo</button>`:""}
    ${numero(r.cantidad_preparada)>numero(r.cantidad_utilizada)?`<button class="zx_al_full_btn zx_al_btn_secondary" id="al_return">↩ Registrar devolución</button>`:""}
    ${!["utilizado","devuelto","cancelado"].includes(r.estado)?`<button class="zx_al_full_btn zx_al_danger" id="al_cancel_res">Cancelar reserva</button>`:""}
    <button class="zx_al_full_btn zx_al_cancel" id="al_close">Cerrar</button>
  </div>`);
  document.getElementById("al_close").onclick=cerrarModal;
  const prep=document.getElementById("al_prepare");
  if(prep) prep.onclick=()=>cambiarReserva(r,"preparar");
  const consume=document.getElementById("al_consume");
  if(consume) consume.onclick=()=>cambiarReserva(r,"consumir");
  const devolver=document.getElementById("al_return");
  if(devolver) devolver.onclick=()=>cambiarReserva(r,"devolver");
  const cancelar=document.getElementById("al_cancel_res");
  if(cancelar) cancelar.onclick=()=>cancelarReserva(r);
}
async function cambiarReserva(r,accion){
  const mat=materialPorId(r.material_id);
  const unidad=mat?.unidad || "ud";
  const maximo=accion==="devolver"
    ? Math.max(0,numero(r.cantidad_preparada)-numero(r.cantidad_utilizada)-numero(r.cantidad_devuelta))
    : Math.max(0,numero(r.cantidad_reservada)-numero(accion==="preparar"?r.cantidad_preparada:r.cantidad_utilizada)-numero(r.cantidad_devuelta));
  const raw=prompt(`Cantidad a ${accion}\nMáximo: ${formatoNumero(maximo)} ${unidad}`,"");
  if(raw===null) return;
  const qty=numero(String(raw).replace(",","."));
  if(qty<=0||qty>maximo){alert("Cantidad no válida.");return}

  const u=usuarioActual();
  const cambios={updated_at:new Date().toISOString()};
  let tipoMovimiento="";
  let descuentaStock=false;

  if(accion==="preparar"){
    cambios.cantidad_preparada=numero(r.cantidad_preparada)+qty;
    cambios.preparado_por=u.nombre;
    cambios.preparado_at=new Date().toISOString();
    cambios.estado=cambios.cantidad_preparada>=numero(r.cantidad_reservada)?"preparado":"preparacion_parcial";
    tipoMovimiento="preparacion";
  }else if(accion==="consumir"){
    cambios.cantidad_utilizada=numero(r.cantidad_utilizada)+qty;
    cambios.utilizado_por=u.nombre;
    cambios.utilizado_at=new Date().toISOString();
    const pendiente=numero(r.cantidad_reservada)-cambios.cantidad_utilizada-numero(r.cantidad_devuelta);
    cambios.estado=pendiente<=0?"utilizado":"uso_parcial";
    tipoMovimiento="consumo";
    descuentaStock=true;
  }else{
    cambios.cantidad_devuelta=numero(r.cantidad_devuelta)+qty;
    cambios.devuelto_at=new Date().toISOString();
    const pendiente=numero(r.cantidad_reservada)-numero(r.cantidad_utilizada)-cambios.cantidad_devuelta;
    cambios.estado=pendiente<=0?"devuelto":"uso_parcial";
    tipoMovimiento="devolucion";
  }

  try{
    let stockAntes=null,stockNuevo=null;
    if(descuentaStock){
      const existencia=await obtenerExistencia(r.material_id,r.ubicacion_id);
      stockAntes=numero(existencia?.cantidad);
      if(qty>stockAntes) throw new Error("No hay stock físico suficiente.");
      stockNuevo=stockAntes-qty;
      await actualizarExistencia(r.material_id,r.ubicacion_id,stockNuevo);
    }

    const up=await sb().from(T_RESERVAS).update(cambios).eq("id",r.id);
    if(up.error){
      if(descuentaStock) await actualizarExistencia(r.material_id,r.ubicacion_id,stockAntes);
      throw up.error;
    }

    await insertarMovimiento({
      material_id:r.material_id,
      tipo:tipoMovimiento,
      cantidad:qty,
      ubicacion_origen_id:descunetaStockSeguro(descuentaStock,r.ubicacion_id),
      ubicacion_destino_id:accion==="devolver"?r.ubicacion_id:null,
      trabajo_id:r.trabajo_id,
      reserva_id:r.id,
      stock_origen_anterior:descuentaStock?stockAntes:null,
      stock_origen_nuevo:descuentaStock?stockNuevo:null,
      motivo:`Reserva: ${accion}`
    });
    cerrarModal();
    await recargar();
  }catch(e){
    alert("No se pudo actualizar la reserva.\n\n"+mensajeError(e));
  }
}
function descunetaStockSeguro(valor,id){
  return valor ? id : null;
}
async function cancelarReserva(r){
  if(!confirm("¿Cancelar esta reserva?")) return;
  const up=await sb().from(T_RESERVAS).update({
    estado:"cancelado",
    updated_at:new Date().toISOString()
  }).eq("id",r.id);
  if(up.error){alert(mensajeError(up.error));return}
  await insertarMovimiento({
    material_id:r.material_id,
    tipo:"liberacion_reserva",
    cantidad:Math.max(0,numero(r.cantidad_reservada)-numero(r.cantidad_utilizada)-numero(r.cantidad_devuelta)) || 0.001,
    ubicacion_origen_id:r.ubicacion_id,
    trabajo_id:r.trabajo_id,
    reserva_id:r.id,
    motivo:"Reserva cancelada"
  });
  cerrarModal();
  await recargar();
}
function abrirUbicacion(u){
  u=u||{};
  modal(`<h2>${u.id?"Editar ubicación":"Nueva ubicación"}</h2><div class="zx_al_form">
    <label>Nombre<input id="al_name" value="${limpiar(u.nombre||"")}"></label>
    <label>Tipo<select id="al_type">
      <option value="almacen" ${u.tipo==="almacen"?"selected":""}>Almacén</option>
      <option value="vehiculo" ${u.tipo==="vehiculo"?"selected":""}>Vehículo</option>
      <option value="obra" ${u.tipo==="obra"?"selected":""}>Obra</option>
      <option value="otro" ${u.tipo==="otro"?"selected":""}>Otro</option>
    </select></label>
    <label>Vehículo<select id="al_vehicle"><option value="">Sin vehículo</option>${ZX_AL_VEHICULOS.map(v=>`<option value="${limpiar(v.id)}" ${String(v.id)===String(u.vehiculo_id)?"selected":""}>${limpiar([v.matricula,v.marca,v.modelo].filter(Boolean).join(" · "))}</option>`).join("")}</select></label>
    <label>Trabajo<select id="al_job"><option value="">Sin trabajo</option>${opcionesTrabajos(u.trabajo_id)}</select></label>
    <label>Dirección<input id="al_address" value="${limpiar(u.direccion||"")}"></label>
    <label>Notas<textarea id="al_notes" rows="3">${limpiar(u.notas||"")}</textarea></label>
    <button class="zx_al_full_btn zx_al_save" id="al_save">Guardar</button>
    <button class="zx_al_full_btn zx_al_cancel" id="al_cancel">Cancelar</button>
  </div>`);
  document.getElementById("al_cancel").onclick=cerrarModal;
  document.getElementById("al_save").onclick=async function(){
    const nombre=document.getElementById("al_name").value.trim();
    if(!nombre){alert("Escribe el nombre.");return}
    this.disabled=true;
    const datos={
      empresa_id:usuarioActual().empresa_id,
      nombre:nombre,
      tipo:document.getElementById("al_type").value,
      vehiculo_id:document.getElementById("al_vehicle").value || null,
      trabajo_id:document.getElementById("al_job").value || null,
      direccion:document.getElementById("al_address").value.trim(),
      notas:document.getElementById("al_notes").value.trim(),
      activa:true,
      updated_at:new Date().toISOString()
    };
    const r=u.id
      ? await sb().from(T_UBICACIONES).update(datos).eq("id",u.id)
      : await sb().from(T_UBICACIONES).insert([datos]);
    if(r.error){this.disabled=false;alert(mensajeError(r.error));return}
    cerrarModal();
    await recargar();
  };
}
function renderError(e){
  const root=app();
  if(!root) return;
  root.innerHTML=`<main class="zx_al_wrap"><section class="zx_al_empty">
    <h2>No se pudo abrir Almacén</h2>
    <p>${limpiar(mensajeError(e))}</p>
    <button class="zx_al_btn_primary" onclick="ZX_almacen()">Reintentar</button>
  </section></main>`;
}
window.ZX_almacen=async function(){
  instalarCSS();
  const root=app();
  if(root) root.innerHTML=`<main class="zx_al_wrap"><div class="zx_al_empty">Cargando Almacén...</div></main>`;
  try{
    await cargarTodo();
    render();
  }catch(e){
    console.error("Almacén:",e);
    renderError(e);
  }
};
window.ZX_abrirAlmacen=window.ZX_almacen;

if(window.ZENTRYX && typeof window.ZENTRYX.registrarModulo==="function"){
  window.ZENTRYX.registrarModulo("almacen",{
    nombre:"Almacén",
    activo:true,
    version:ZX_VERSION
  });
}

console.log("ZENTRYX almacen.js V"+ZX_VERSION+" cargado");
})();
