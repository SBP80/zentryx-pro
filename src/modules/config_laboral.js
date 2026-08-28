// ===============================
// ZENTRYX PRO - CONFIG LABORAL PRO
// V3063 - CABECERA MOVIL COMPLETA + AJUSTES VISUALES
// V3064 - UNIDADES VISIBLES EN CANTIDADES LABORALES
// ===============================
(function(){
"use strict";

const ZX_VERSION="3064";
function app(){return document.getElementById("app")}
function sb(){return window.sb || window.supabaseClient || null}
function laboral(){return window.ZENTRYX_LABORAL || null}
function sesion(){try{return JSON.parse(localStorage.getItem("zentryx_session")||"{}")}catch(e){return {}}}
function limpiar(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function normalizar(v){return String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function formatoFechaES(f){if(!f)return"";const p=String(f).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:String(f)}
function anioActual(){return new Date().getFullYear()}
function num(v,def=0){const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:def}

const CONVENIOS_SUGERIDOS=["Metal","Construcción","Oficinas","Fontanería","Climatización","Electricidad","Comercio","Hostelería","Transporte","Otro / personalizado"];
const PAISES_SUGERIDOS=["España","Portugal","Francia","Italia","Alemania","Andorra","Reino Unido","Irlanda","Bélgica","Países Bajos","Suiza"];

function selectorTiempo(id,val=480){
  const h=Math.floor((Number(val)||0)/60),m=(Number(val)||0)%60;
  return `<div class="zx_hm_row"><select id="${id}_h">${[...Array(13).keys()].map(i=>`<option value="${i}" ${i===h?"selected":""}>${i} h</option>`).join("")}</select><select id="${id}_m">${[0,15,30,45].map(i=>`<option value="${i}" ${i===m?"selected":""}>${i} min</option>`).join("")}</select></div>`;
}
function leerTiempo(id){return num(document.getElementById(id+"_h")?.value)*60+num(document.getElementById(id+"_m")?.value)}
function tipoFestivoTexto(t){const x=normalizar(t);if(x==="nacional")return"Nacional";if(x==="autonomico")return"Autonómico";if(x==="provincial")return"Provincial";if(x==="local")return"Local";if(x==="empresa")return"Empresa";return t||"Festivo"}
function claseFestivo(t){const x=normalizar(t);return ["nacional","autonomico","provincial","local","empresa"].includes(x)?"zx_festivo_"+x:"zx_festivo_local"}
function ambito(f){return laboral()?.ambitoFestivo ? laboral().ambitoFestivo(f) : normalizar(f.ambito||f.tipo||"nacional")}
function volverAjustes(){if(typeof window.ZX_configuracion==="function")window.ZX_configuracion();else history.back()}

async function cargarConfig(){
  if(laboral()?.cargarBaseEmpresa) return await laboral().cargarBaseEmpresa();
  return {lunes:480,martes:480,miercoles:480,jueves:480,viernes:480,sabado:0,domingo:0,convenio:"Metal",vacaciones:30,asuntos_horas:16,precio_hora:0,precio_extra:0,precio_extra_nocturna:0,precio_extra_festiva:0,pais:"España",pais_codigo:"ES",comunidad:"Madrid",provincia:"Madrid",localidad:"",anio:anioActual()};
}

function leerConfigPantalla(){
  const pais=document.getElementById("pais")?.value.trim()||"España";
  return {
    version:1,
    lunes:leerTiempo("lunes"),martes:leerTiempo("martes"),miercoles:leerTiempo("miercoles"),jueves:leerTiempo("jueves"),viernes:leerTiempo("viernes"),sabado:leerTiempo("sabado"),domingo:leerTiempo("domingo"),
    convenio:document.getElementById("convenio")?.value.trim()||"",
    convenio_referencia:document.getElementById("convenio_referencia")?.value.trim()||"",
    convenio_vigencia_desde:document.getElementById("convenio_desde")?.value||"",
    convenio_vigencia_hasta:document.getElementById("convenio_hasta")?.value||"",
    vacaciones:num(document.getElementById("vacaciones")?.value,0),
    vacaciones_tipo:document.getElementById("vacaciones_tipo")?.value||"naturales",
    asuntos_horas:num(document.getElementById("asuntos_horas")?.value,0),
    precio_hora:num(document.getElementById("precio_hora")?.value,0),
    precio_extra:num(document.getElementById("precio_extra")?.value,0),
    precio_extra_nocturna:num(document.getElementById("precio_extra_nocturna")?.value,0),
    precio_extra_festiva:num(document.getElementById("precio_extra_festiva")?.value,0),
    nocturna_desde:document.getElementById("nocturna_desde")?.value||"22:00",
    nocturna_hasta:document.getElementById("nocturna_hasta")?.value||"06:00",
    regla_festivo_nocturno:document.getElementById("regla_festivo_nocturno")?.value||"festivo",
    pais,
    pais_codigo:laboral()?.codigoPais?.(pais) || (normalizar(pais)==="espana"?"ES":""),
    comunidad:document.getElementById("comunidad")?.value.trim()||"",
    provincia:document.getElementById("provincia")?.value.trim()||"",
    localidad:document.getElementById("localidad")?.value.trim()||"",
    anio:num(document.getElementById("anio")?.value,anioActual()),
    fuente_festivos:"oficial_verificada"
  };
}

async function guardarConfigSilencioso(){
  const l=laboral();
  if(!l?.guardarBaseEmpresa){alert("El sistema laboral base no está cargado.");return false}
  const data=leerConfigPantalla();
  const r=await l.guardarBaseEmpresa(data);
  if(r?.error){alert("Error guardando configuración laboral de empresa: "+(r.error.message||r.error));return false}
  return true;
}
async function guardarConfig(){
  const ok=await guardarConfigSilencioso(); if(!ok)return;
  alert("Configuración laboral de empresa guardada.");
  await window.ZX_configLaboralReal();
}

async function cargarFestivosLista(c){
  if(laboral()?.festivosAplicables) return await laboral().festivosAplicables(Number(c.anio||anioActual()),c);
  return [];
}

function resumenFestivos(lista){
  const r={nacional:0,autonomico:0,provincial:0,local:0,empresa:0,verificados:0};
  (lista||[]).forEach(f=>{const a=ambito(f);if(r[a]!==undefined)r[a]++;if(f.verificado)r.verificados++});
  return r;
}

function renderFestivo(f){
  const a=ambito(f),oficial=String(f.origen||"")==="oficial" || f.verificado===true;
  return `<div class="zx_admin_row ${claseFestivo(a)}">
    <div class="zx_admin_row_top"><div><span class="zx_festivo_dot"></span><b>${limpiar(f.nombre||"Festivo")}</b></div><span>${formatoFechaES(f.fecha)}</span></div>
    <div class="zx_admin_data">
      <span class="zx_festivo_badge">${limpiar(tipoFestivoTexto(a))}</span>
      ${oficial?`<span class="zx_festivo_verified">✓ Oficial verificado</span>`:`<span class="zx_festivo_manual">Manual</span>`}
      ${f.comunidad?`<br>Región: ${limpiar(f.comunidad)}`:""}${f.provincia?` · Provincia: ${limpiar(f.provincia)}`:""}${f.localidad?` · Localidad: ${limpiar(f.localidad)}`:""}
      ${f.fuente?`<br>Fuente: ${limpiar(f.fuente)}${f.fuente_url?` · <a href="${limpiar(f.fuente_url)}" target="_blank" rel="noopener">Consultar fuente</a>`:""}`:""}
      <br>Horas trabajadas: <b>${f.computa_extra===false?"no computan automáticamente como extra festiva":"computan como extra festiva"}</b>
    </div>
    ${oficial?`<div class="zx_oficial_lock">Los festivos oficiales se actualizan desde el botón de calendario oficial.</div>`:`<div class="zx_edit_grid"><button class="zx_admin_btn zx_admin_editar" data-edit-festivo="${limpiar(f.id)}">Editar</button><button class="zx_admin_btn zx_admin_borrar" data-del-festivo="${limpiar(f.id)}">Borrar</button></div>`}
  </div>`;
}

function cerrarModalFestivo(){document.getElementById("zx_modal_festivo")?.remove()}
function abrirModalFestivo(f=null){
  cerrarModalFestivo();
  const a=f?ambito(f):"empresa";
  const cfg=leerConfigPantalla();
  document.body.insertAdjacentHTML("beforeend",`<div id="zx_modal_festivo" class="zx_modal_fondo"><div class="zx_modal_caja">
    <div class="zx_modal_top"><h2>${f?"Editar día especial":"Añadir día especial"}</h2><button id="fx_cancelar_top">Cerrar</button></div>
    <label class="zx_label">Fecha</label><input id="fx_fecha" type="date" value="${limpiar(f?String(f.fecha||"").slice(0,10):"")}">
    <label class="zx_label">Nombre</label><input id="fx_nombre" value="${limpiar(f?.nombre||"")}" placeholder="Fiesta local, cierre de empresa, puente…">
    <label class="zx_label">Ámbito</label><select id="fx_ambito">
      <option value="empresa" ${a==="empresa"?"selected":""}>Empresa / cierre propio</option><option value="local" ${a==="local"?"selected":""}>Local</option><option value="provincial" ${a==="provincial"?"selected":""}>Provincial</option><option value="autonomico" ${a==="autonomico"?"selected":""}>Autonómico / regional</option><option value="nacional" ${a==="nacional"?"selected":""}>Nacional manual</option>
    </select>
    <label class="zx_label">Comunidad / región</label><input id="fx_comunidad" value="${limpiar(f?.comunidad||cfg.comunidad||"")}">
    <label class="zx_label">Provincia</label><input id="fx_provincia" value="${limpiar(f?.provincia||cfg.provincia||"")}">
    <label class="zx_label">Localidad</label><input id="fx_localidad" value="${limpiar(f?.localidad||cfg.localidad||"")}">
    <label class="zx_check_line"><input id="fx_computa_extra" type="checkbox" ${f?.computa_extra===false?"":"checked"}><span><b>Computa como festivo para horas trabajadas</b><small>Si se trabaja ese día, Fichaje podrá generar horas extra festivas automáticamente.</small></span></label>
    <div class="zx_modal_botones"><button class="zx_btn_big zx_verde" id="fx_guardar">Guardar</button><button class="zx_btn_big zx_gris" id="fx_cancelar">Cancelar</button></div>
  </div></div>`);
  document.getElementById("fx_cancelar").onclick=cerrarModalFestivo;document.getElementById("fx_cancelar_top").onclick=cerrarModalFestivo;
  document.getElementById("fx_guardar").onclick=async function(){
    const fecha=document.getElementById("fx_fecha").value,nombre=document.getElementById("fx_nombre").value.trim(),amb=document.getElementById("fx_ambito").value;
    if(!fecha||!nombre){alert("Fecha y nombre obligatorios.");return}
    const esEmpresa=amb==="empresa";
    const data={fecha,nombre,anio:Number(fecha.slice(0,4)),pais:cfg.pais||"España",tipo:esEmpresa?"local":amb,ambito:amb,comunidad:esEmpresa?"":document.getElementById("fx_comunidad").value.trim(),provincia:esEmpresa?"":document.getElementById("fx_provincia").value.trim(),localidad:esEmpresa?"":document.getElementById("fx_localidad").value.trim(),empresa_id:laboral()?.empresaId?.()||"demo",origen:esEmpresa?"empresa":"manual",fuente:"Introducido por la empresa",fuente_url:null,verificado:false,computa_extra:document.getElementById("fx_computa_extra").checked,updated_at:new Date().toISOString(),created_by:sesion().usuario||sesion().id||""};
    const r=f?await sb().from("festivos").update(data).eq("id",f.id):await sb().from("festivos").insert([data]);
    if(r.error){alert("Error guardando el día especial: "+r.error.message);return}
    cerrarModalFestivo();await window.ZX_configLaboralReal();
  };
}

async function borrarFestivo(id){
  if(!confirm("¿Eliminar este día especial?"))return;
  const r=await sb().from("festivos").delete().eq("id",id);if(r.error){alert("Error borrando: "+r.error.message);return}await window.ZX_configLaboralReal();
}

async function descargarFestivos(){
  const ok=await guardarConfigSilencioso();if(!ok)return;
  const cfg=leerConfigPantalla(),l=laboral();
  if(!l?.guardarFestivosOficiales){alert("Proveedor de calendario oficial no disponible.");return}
  const r=await l.guardarFestivosOficiales(cfg);
  if(!r.ok){alert(r.mensaje||"No se pudieron cargar festivos verificados.");return}
  alert("Calendario oficial verificado actualizado: "+r.cantidad+" día(s)."+(r.localesDisponibles?"":"\n\nLos festivos locales de esta localidad todavía no están incluidos en el paquete verificado."));
  await window.ZX_configLaboralReal();
}

function totalSemana(c){return ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,k)=>n+Number(c[k]||0),0)}
function textoMinutos(m){return Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")+" min"}

let geoTimer=null,geoResultados=[];
function pintarSugerenciasGeo(lista){
  geoResultados=lista||[];const box=document.getElementById("zx_geo_sugerencias");if(!box)return;
  box.innerHTML=geoResultados.length?geoResultados.map((x,i)=>`<button type="button" data-geo-idx="${i}"><b>${limpiar(x.nombre)}</b><span>${limpiar([x.provincia,x.comunidad,x.pais].filter(Boolean).join(" · "))}</span></button>`).join(""):"";
  box.hidden=!geoResultados.length;
  box.querySelectorAll("[data-geo-idx]").forEach(b=>b.onclick=function(){const x=geoResultados[Number(b.dataset.geoIdx)];if(!x)return;document.getElementById("localidad").value=x.nombre||"";if(x.provincia)document.getElementById("provincia").value=x.provincia;if(x.comunidad)document.getElementById("comunidad").value=x.comunidad;if(x.pais)document.getElementById("pais").value=x.pais;box.hidden=true;});
}
function activarGeo(){
  const l=laboral(),com=document.getElementById("comunidad"),prov=document.getElementById("provincia"),loc=document.getElementById("localidad");
  if(prov){prov.onchange=function(){const c=l?.comunidadDeProvincia?.(prov.value);if(c&&com)com.value=c;};}
  if(loc){loc.oninput=function(){clearTimeout(geoTimer);const q=loc.value.trim();if(q.length<2){pintarSugerenciasGeo([]);return}const pais=document.getElementById("pais")?.value||"España";const code=l?.codigoPais?.(pais)||"";geoTimer=setTimeout(async()=>pintarSugerenciasGeo(await (l?.buscarLocalidades?.(q,code)||[])),280);};loc.onblur=function(){setTimeout(()=>{const b=document.getElementById("zx_geo_sugerencias");if(b)b.hidden=true},250)};loc.onfocus=function(){if(geoResultados.length)pintarSugerenciasGeo(geoResultados)};}
}

function instalarCSS(){
  const old=document.getElementById("zx_config_laboral_css");if(old)old.remove();const s=document.createElement("style");s.id="zx_config_laboral_css";s.innerHTML=`
  .zx_lab_shell{padding-bottom:calc(env(safe-area-inset-bottom) + 100px)}
  .zx_lab_top{position:sticky;top:0;z-index:5000;background:rgba(248,250,252,.96);backdrop-filter:blur(12px);display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:8px 0 12px;margin-bottom:8px}
  .zx_lab_top button{border:0;border-radius:14px;padding:11px 13px;font-weight:950;font-size:14px}.zx_lab_back{background:#e2e8f0;color:#0f172a}.zx_lab_save{background:#16a34a;color:white}.zx_lab_top strong{font-size:17px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .zx_lab_intro{background:linear-gradient(135deg,#eff6ff,#fff);border:1px solid #bfdbfe;border-radius:22px;padding:16px;margin-bottom:14px;color:#1e3a8a;font-weight:800;line-height:1.45}
  .zx_input,.zx_modal_caja input,.zx_modal_caja select{width:100%;padding:14px;border-radius:14px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:16px;font-weight:800;color:#0f172a;background:white}.zx_label{font-weight:900;margin:12px 0 6px;color:#334155;font-size:16px}.zx_hm_row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.zx_hm_row select{width:100%;padding:14px;border-radius:14px;border:1px solid #cbd5e1;background:white;font-size:16px;font-weight:900;color:#0f172a}
  .zx_lab_grid2{display:grid;grid-template-columns:1fr;gap:10px}.zx_num_unit_wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch;margin-bottom:12px}.zx_num_unit_wrap .zx_input{margin-bottom:0}.zx_num_unit{display:flex;align-items:center;justify-content:center;min-width:62px;padding:0 12px;border:1px solid #cbd5e1;border-radius:14px;background:#f1f5f9;color:#334155;font-size:14px;font-weight:950;white-space:nowrap}.zx_lab_hint{font-size:13px;color:#64748b;font-weight:800;line-height:1.4;margin:2px 0 10px}.zx_lab_total{display:inline-flex;background:#e0f2fe;color:#075985;border-radius:999px;padding:8px 11px;font-weight:950;margin-bottom:8px}
  .zx_festivo_legend{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.zx_festivo_legend span,.zx_festivo_badge,.zx_festivo_verified,.zx_festivo_manual{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950;margin:2px 4px 2px 0}.zx_festivo_legend .nacional,.zx_festivo_nacional .zx_festivo_badge{background:#fee2e2;color:#991b1b}.zx_festivo_legend .autonomico,.zx_festivo_autonomico .zx_festivo_badge{background:#ffedd5;color:#9a3412}.zx_festivo_legend .provincial,.zx_festivo_provincial .zx_festivo_badge{background:#fef3c7;color:#92400e}.zx_festivo_legend .local,.zx_festivo_local .zx_festivo_badge{background:#f3e8ff;color:#6b21a8}.zx_festivo_legend .empresa,.zx_festivo_empresa .zx_festivo_badge{background:#dbeafe;color:#1d4ed8}.zx_festivo_verified{background:#dcfce7;color:#166534}.zx_festivo_manual{background:#e2e8f0;color:#334155}
  .zx_admin_row{background:#fff;border:1px solid #d1d5db;border-left:6px solid #94a3b8;border-radius:18px;padding:14px;margin-top:10px}.zx_admin_row.zx_festivo_nacional{border-left-color:#dc2626}.zx_admin_row.zx_festivo_autonomico{border-left-color:#f97316}.zx_admin_row.zx_festivo_provincial{border-left-color:#d97706}.zx_admin_row.zx_festivo_local{border-left-color:#9333ea}.zx_admin_row.zx_festivo_empresa{border-left-color:#2563eb}.zx_admin_row_top{display:flex;justify-content:space-between;gap:8px;font-size:15px;color:#0f172a;font-weight:900}.zx_admin_row_top>div{min-width:0}.zx_admin_row_top span{color:#64748b;font-size:13px;white-space:nowrap}.zx_admin_data{color:#64748b;font-size:14px;line-height:1.5;font-weight:800;word-break:break-word;margin-top:8px}.zx_edit_grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.zx_admin_btn{width:100%;border:0;border-radius:12px;padding:11px;color:white;font-size:14px;font-weight:900}.zx_admin_editar{background:#2563eb}.zx_admin_borrar{background:#dc2626}.zx_oficial_lock{margin-top:10px;padding:9px 10px;border-radius:12px;background:#f0fdf4;color:#166534;font-size:12px;font-weight:850}
  .zx_festivo_kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.zx_festivo_kpis div{border:1px solid #e2e8f0;border-radius:14px;padding:10px;text-align:center;background:#f8fafc}.zx_festivo_kpis b{display:block;font-size:20px;color:#0f172a}.zx_festivo_kpis span{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}
  .zx_geo_wrap{position:relative}.zx_geo_sugerencias{position:absolute;left:0;right:0;top:100%;z-index:6000;background:white;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:6px;max-height:270px;overflow:auto}.zx_geo_sugerencias button{display:block;width:100%;text-align:left;border:0;background:white;border-radius:10px;padding:10px}.zx_geo_sugerencias button:active{background:#eff6ff}.zx_geo_sugerencias b{display:block;color:#0f172a}.zx_geo_sugerencias span{display:block;color:#64748b;font-size:12px;margin-top:2px}
  .zx_check_line{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;border:1px solid #dbe3ef;background:#f8fafc;border-radius:14px;padding:12px;margin:10px 0}.zx_check_line input{width:24px;height:24px;margin:0}.zx_check_line b,.zx_check_line small{display:block}.zx_check_line small{color:#64748b;margin-top:4px;line-height:1.35}
  .zx_modal_fondo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;padding:12px;z-index:9999}.zx_modal_caja{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;background:white;border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.zx_modal_top{display:flex;justify-content:space-between;gap:10px;align-items:center;position:sticky;top:-18px;background:white;padding:15px 0 10px;z-index:2}.zx_modal_top h2{margin:0}.zx_modal_top button{border:0;background:#e2e8f0;border-radius:12px;padding:10px;font-weight:900}.zx_modal_botones{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}
  @media(max-width:699px){.zx_lab_top{grid-template-columns:1fr 1fr;grid-template-areas:"titulo titulo" "volver guardar";gap:7px;padding-top:7px}.zx_lab_top strong{grid-area:titulo;text-align:left;font-size:18px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.2;padding:1px 2px 3px}.zx_lab_back{grid-area:volver;justify-self:stretch}.zx_lab_save{grid-area:guardar;justify-self:stretch}.zx_lab_top button{width:100%;padding:10px 9px}.zx_lab_shell{padding-right:0}}
  @media(min-width:700px){.zx_lab_grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.zx_festivo_kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.zx_modal_botones{grid-template-columns:1fr 1fr}}
  html[data-zx-theme="dark"] .zx_lab_top{background:rgba(15,23,42,.96)}html[data-zx-theme="dark"] .zx_lab_top strong{color:#f8fafc}html[data-zx-theme="dark"] .zx_admin_row,html[data-zx-theme="dark"] .zx_modal_caja{background:#111827;color:#f8fafc}html[data-zx-theme="dark"] .zx_admin_row_top,html[data-zx-theme="dark"] .zx_modal_top h2{color:#f8fafc}html[data-zx-theme="dark"] .zx_num_unit{background:#1f2937;color:#f8fafc;border-color:#475569}
  `;document.head.appendChild(s);
}

window.ZX_configLaboralReal=async function(){
  instalarCSS();
  const c=await cargarConfig(),festivos=await cargarFestivosLista(c),r=resumenFestivos(festivos),l=laboral();
  const comunidades=l?.geo?.comunidades||["Madrid"],provincias=l?.geo?.provincias||["Madrid"];
  app().innerHTML=`<div class="zx_lab_shell">
    <div class="zx_lab_top"><button class="zx_lab_back" id="zx_lab_volver">← Ajustes</button><strong>Configuración laboral</strong><button class="zx_lab_save" id="zx_guardar_top">Guardar</button></div>
    <div class="zx_lab_intro"><b>Base laboral de empresa.</b><br>Estos valores sirven como referencia general. Cada trabajador puede conservar condiciones y precios propios desde Usuarios → Laboral. Los cambios nuevos no reinterpretan jornadas históricas ya guardadas.</div>

    <div class="zx_card"><h3>Jornada semanal base</h3><div class="zx_lab_total">Total semanal: <span id="zx_total_semana">${textoMinutos(totalSemana(c))}</span></div>
      ${["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].map((k,i)=>`<div class="zx_label">${["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][i]}</div>${selectorTiempo(k,c[k])}`).join("")}
    </div>

    <div class="zx_card"><h3>Convenio y derechos base</h3><div class="zx_lab_hint">El nombre del convenio no cambia cifras por sí solo. Los derechos deben corresponder al convenio realmente aplicable y sus fechas de vigencia.</div>
      <label class="zx_label">Convenio aplicable</label><input id="convenio" class="zx_input" list="zx_convenios" value="${limpiar(c.convenio||"")}"><datalist id="zx_convenios">${CONVENIOS_SUGERIDOS.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Referencia / código / publicación</label><input id="convenio_referencia" class="zx_input" value="${limpiar(c.convenio_referencia||"")}" placeholder="Código, boletín, enlace o referencia interna">
      <div class="zx_lab_grid2"><div><label class="zx_label">Vigente desde</label><input id="convenio_desde" type="date" class="zx_input" value="${limpiar(c.convenio_vigencia_desde||"")}"></div><div><label class="zx_label">Vigente hasta</label><input id="convenio_hasta" type="date" class="zx_input" value="${limpiar(c.convenio_vigencia_hasta||"")}"></div></div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Vacaciones anuales</label><div class="zx_num_unit_wrap"><input id="vacaciones" type="number" step="0.5" class="zx_input" value="${limpiar(c.vacaciones)}"><span class="zx_num_unit">días</span></div></div><div><label class="zx_label">Cómputo vacaciones</label><select id="vacaciones_tipo" class="zx_input"><option value="naturales" ${c.vacaciones_tipo!=="laborables"?"selected":""}>Días naturales</option><option value="laborables" ${c.vacaciones_tipo==="laborables"?"selected":""}>Días laborables</option></select></div></div>
      <label class="zx_label">Asuntos propios</label><div class="zx_num_unit_wrap"><input id="asuntos_horas" type="number" step="0.25" class="zx_input" value="${limpiar(c.asuntos_horas)}"><span class="zx_num_unit">h/año</span></div>
    </div>

    <div class="zx_card"><h3>Precios de horas · base empresa</h3><div class="zx_lab_hint">Son importes base. Un trabajador puede tener precios distintos en Usuarios → Laboral; Fichaje conserva el precio que correspondía cuando se creó cada jornada.</div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Hora normal</label><div class="zx_num_unit_wrap"><input id="precio_hora" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_hora)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra normal</label><div class="zx_num_unit_wrap"><input id="precio_extra" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra nocturna</label><div class="zx_num_unit_wrap"><input id="precio_extra_nocturna" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_nocturna)}"><span class="zx_num_unit">€/h</span></div></div><div><label class="zx_label">Extra festiva</label><div class="zx_num_unit_wrap"><input id="precio_extra_festiva" type="number" step="0.01" class="zx_input" value="${limpiar(c.precio_extra_festiva)}"><span class="zx_num_unit">€/h</span></div></div></div>
      <div class="zx_lab_grid2"><div><label class="zx_label">Nocturnidad desde</label><input id="nocturna_desde" type="time" class="zx_input" value="${limpiar(c.nocturna_desde||"22:00")}"></div><div><label class="zx_label">Nocturnidad hasta</label><input id="nocturna_hasta" type="time" class="zx_input" value="${limpiar(c.nocturna_hasta||"06:00")}"></div></div>
      <label class="zx_label">Si coinciden festivo y nocturnidad</label><select id="regla_festivo_nocturno" class="zx_input"><option value="festivo" ${c.regla_festivo_nocturno!=="mayor"?"selected":""}>Aplicar tarifa festiva</option><option value="mayor" ${c.regla_festivo_nocturno==="mayor"?"selected":""}>Aplicar la tarifa mayor</option></select>
    </div>

    <div class="zx_card"><h3>Calendario laboral</h3><div class="zx_lab_hint">Preparado para ampliar países y niveles administrativos. En España, Provincia y Localidad ofrecen ayuda de búsqueda y la localidad puede completar datos superiores.</div>
      <label class="zx_label">País</label><input id="pais" class="zx_input" list="zx_paises" value="${limpiar(c.pais||"España")}"><datalist id="zx_paises">${PAISES_SUGERIDOS.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Año vigente</label><input id="anio" type="number" class="zx_input" value="${limpiar(c.anio||anioActual())}">
      <label class="zx_label">Comunidad / región</label><input id="comunidad" class="zx_input" list="zx_comunidades" value="${limpiar(c.comunidad||"")}"><datalist id="zx_comunidades">${comunidades.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Provincia / estado / departamento</label><input id="provincia" class="zx_input" list="zx_provincias" value="${limpiar(c.provincia||"")}"><datalist id="zx_provincias">${provincias.map(x=>`<option value="${limpiar(x)}">`).join("")}</datalist>
      <label class="zx_label">Localidad / municipio / ciudad</label><div class="zx_geo_wrap"><input id="localidad" class="zx_input" autocomplete="off" value="${limpiar(c.localidad||"")}" placeholder="Escribe para buscar…"><div id="zx_geo_sugerencias" class="zx_geo_sugerencias" hidden></div></div>
      <button class="zx_btn_big zx_azul" id="zx_descargar_festivos">Actualizar festivos oficiales verificados</button><button class="zx_btn_big zx_verde" id="zx_nuevo_festivo">Añadir festivo / cierre de empresa</button>
    </div>

    <div class="zx_card"><h3>Festivos aplicables ${limpiar(c.anio||anioActual())}</h3>
      <div class="zx_festivo_kpis"><div><b>${r.nacional}</b><span>Nacionales</span></div><div><b>${r.autonomico}</b><span>Autonómicos</span></div><div><b>${r.provincial}</b><span>Provinciales</span></div><div><b>${r.local}</b><span>Locales</span></div><div><b>${r.empresa}</b><span>Empresa</span></div></div>
      <div class="zx_festivo_legend"><span class="nacional">Nacional</span><span class="autonomico">Autonómico</span><span class="provincial">Provincial</span><span class="local">Local</span><span class="empresa">Empresa</span></div>
      <div class="zx_lab_hint">${r.verificados} de ${festivos.length} registro(s) están marcados como oficiales verificados. Los días manuales se mantienen al actualizar el calendario oficial.</div>
      ${festivos.length?festivos.map(renderFestivo).join(""):`<div class="zx_text">Sin festivos aplicables guardados.</div>`}
    </div>
    <div class="zx_card"><button class="zx_btn_big zx_verde" id="zx_guardar_config">Guardar configuración laboral</button><button class="zx_btn_big zx_gris" id="zx_volver_bottom">Volver a Ajustes</button></div>
  </div>`;

  document.getElementById("zx_lab_volver").onclick=volverAjustes;document.getElementById("zx_volver_bottom").onclick=volverAjustes;document.getElementById("zx_guardar_top").onclick=guardarConfig;document.getElementById("zx_guardar_config").onclick=guardarConfig;document.getElementById("zx_descargar_festivos").onclick=descargarFestivos;document.getElementById("zx_nuevo_festivo").onclick=()=>abrirModalFestivo(null);
  document.querySelectorAll("[data-del-festivo]").forEach(b=>b.onclick=()=>borrarFestivo(b.dataset.delFestivo));document.querySelectorAll("[data-edit-festivo]").forEach(b=>{const f=festivos.find(x=>String(x.id)===String(b.dataset.editFestivo));b.onclick=()=>abrirModalFestivo(f)});
  ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].forEach(k=>["_h","_m"].forEach(suf=>{const el=document.getElementById(k+suf);if(el)el.onchange=function(){document.getElementById("zx_total_semana").textContent=textoMinutos(["lunes","martes","miercoles","jueves","viernes","sabado","domingo"].reduce((n,x)=>n+leerTiempo(x),0))}}));
  activarGeo();
};

window.ZX_configLaboral=window.ZX_configLaboralReal;
window.ZX_config_laboral=window.ZX_configLaboralReal;
console.log("ZENTRYX config_laboral.js V"+ZX_VERSION+" cargado");
})();
