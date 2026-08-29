// ===============================
// ZENTRYX PRO - STORE CORE
// V3110 - AUDITORÍA CONSISTENTE Y MÓDULOS RETIRADOS BLOQUEADOS
// ===============================
(function(){
"use strict";

const ZX_VERSION="3110";
const STORAGE_KEY="zentryx_state";
const SETTINGS_KEY="zentryx_settings";
const THEME_KEY="zentryx_theme";

function now(){
  return new Date().toISOString();
}

function clone(obj){
  try{return JSON.parse(JSON.stringify(obj))}
  catch(e){return obj}
}

function uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

const DEFAULT_STATE={
  empresa:{id:"demo",nombre:"Zentryx PRO",logo:"",color:"#2563eb",updated_at:now()},
  modulos:{
    inicio:true,
    fichaje:true,
    agenda:true,
    clientes:true,
    trabajos:true,
    almacen:true,
    usuarios:true,
    vehiculos:true,
    horas_extra:true,
    control_fichajes:false,
    solicitudes:false,
    configuracion:true
  },
  configuracion:{
    idioma:"es",
    formato_fecha:"DD/MM/AAAA",
    offline:true,
    sincronizacion_automatica:true,
    auditoria:true
  },
  auditoria:[],
  version:ZX_VERSION,
  updated_at:now()
};

const DEFAULT_THEME={
  modo:"light",
  nombre:"Modern Light",
  color:"#2563eb",
  radio:"26px",
  compacto:false,
  alto_contraste:false
};

function read(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  }catch(e){
    return clone(fallback);
  }
}

function write(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    return false;
  }
}

function merge(base,data){
  const out=clone(base);

  if(!data || typeof data!=="object") return out;

  Object.keys(data).forEach(function(k){
    if(
      data[k] &&
      typeof data[k]==="object" &&
      !Array.isArray(data[k]) &&
      out[k] &&
      typeof out[k]==="object" &&
      !Array.isArray(out[k])
    ){
      out[k]=merge(out[k],data[k]);
    }else{
      out[k]=data[k];
    }
  });

  return out;
}

function loadState(){
  const s=merge(DEFAULT_STATE,read(STORAGE_KEY,DEFAULT_STATE));
  s.modulos=s.modulos || {};
  s.modulos.control_fichajes=false;
  s.modulos.solicitudes=false;
  return s;
}

function saveState(state){
  const s=merge(DEFAULT_STATE,state || {});
  s.version=ZX_VERSION;
  s.updated_at=now();
  return write(STORAGE_KEY,s);
}

function getTheme(){
  return merge(DEFAULT_THEME,read(THEME_KEY,DEFAULT_THEME));
}

function zxHexValido(v){
  const x=String(v || "").trim();
  return /^#[0-9a-f]{6}$/i.test(x) ? x.toLowerCase() : "#2563eb";
}

function zxHexRgb(hex){
  const h=zxHexValido(hex).slice(1);
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}

function zxMezclar(hex,otro,peso){
  const a=zxHexRgb(hex);
  const b=zxHexRgb(otro);
  const p=Math.max(0,Math.min(1,Number(peso)||0));
  const c=a.map(function(v,i){return Math.round(v*(1-p)+b[i]*p)});
  return "#"+c.map(function(v){return v.toString(16).padStart(2,"0")}).join("");
}

function zxContraste(hex){
  const rgb=zxHexRgb(hex).map(function(v){
    v=v/255;
    return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  const l=0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
  return l>0.48 ? "#071330" : "#ffffff";
}

function zxResolverModo(modo){
  const m=String(modo || "light").toLowerCase();
  if(m==="dark") return "dark";
  if(m==="auto" && window.matchMedia){
    try{return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"}catch(e){}
  }
  return "light";
}

function zxRadios(radio){
  const n=Math.max(18,Math.min(32,parseInt(radio,10)||26));
  if(n<=18) return {xs:"8px",sm:"12px",md:"16px",lg:"18px"};
  if(n<=22) return {xs:"10px",sm:"14px",md:"18px",lg:"22px"};
  if(n<=26) return {xs:"12px",sm:"16px",md:"20px",lg:"26px"};
  return {xs:"14px",sm:"18px",md:"24px",lg:"32px"};
}

function zxParchearCssTexto(css){
  let out=String(css || "");
  if(!out || out.indexOf("zx-theme-no-patch")>=0) return out;

  // Protege el valor por defecto de la propia variable para evitar autorreferencia.
  out=out.replace(/(--zx-primary\s*:\s*)#2563eb/gi,"$1__ZX_PRIMARY_DEFAULT__");

  // Colores de marca antiguos -> variables dinámicas.
  out=out.replace(/#2563eb/gi,"var(--zx-primary)");
  out=out.replace(/#1d4ed8/gi,"var(--zx-primary-strong)");
  out=out.replace(/#dbeafe/gi,"var(--zx-primary-soft-2)");
  out=out.replace(/#eff6ff/gi,"var(--zx-primary-soft)");
  out=out.replace(/#bfdbfe/gi,"var(--zx-primary-border)");
  out=out.replace(/rgba\(37\s*,\s*99\s*,\s*235\s*,\s*([0-9.]+)\)/gi,"rgba(var(--zx-primary-rgb),$1)");
  out=out.replace(/__ZX_PRIMARY_DEFAULT__/g,"#2563eb");

  // Superficies y texto neutros. En claro conservan el mismo aspecto; en oscuro cambian por variables.
  out=out.replace(/(background(?:-color)?\s*:\s*)(?:#ffffff|#fff|white)(?=\s*[;}]|\s*!important)/gi,"$1var(--zx-card)");
  out=out.replace(/(background(?:-color)?\s*:\s*)(?:#f8fafc|#f1f5f9)(?=\s*[;}]|\s*!important)/gi,"$1var(--zx-soft)");
  out=out.replace(/(background(?:-color)?\s*:\s*)#e5e7eb(?=\s*[;}]|\s*!important)/gi,"$1var(--zx-soft-2)");
  out=out.replace(/(color\s*:\s*)(?:#071330|#0f172a|#111827|#334155)(?=\s*[;}]|\s*!important)/gi,"$1var(--zx-text)");
  out=out.replace(/(color\s*:\s*)(?:#475569|#64748b|#94a3b8)(?=\s*[;}]|\s*!important)/gi,"$1var(--zx-muted)");
  out=out.replace(/((?:border|border-(?:top|right|bottom|left))(?:-color)?\s*:[^;{}]*?)(?:#dbe3ef|#e5e7eb|#d1d5db|#cbd5e1)(?=\s|;|!important|$)/gi,"$1var(--zx-line)");

  // Esquinas: conserva píldoras/círculos y adapta únicamente radios expresados en px.
  out=out.replace(/border-radius\s*:\s*(\d+)px(?=\s*[;}]|\s*!important)/gi,function(m,n){
    n=parseInt(n,10);
    if(n>=999) return m;
    if(n<=12) return "border-radius:var(--zx-radius-xs)";
    if(n<=17) return "border-radius:var(--zx-radius-sm)";
    if(n<=23) return "border-radius:var(--zx-radius-md)";
    return "border-radius:var(--zx-radius-lg)";
  });

  return out;
}

function zxParchearStyle(style){
  if(!style || style.nodeType!==1 || style.tagName!=="STYLE") return;
  if(style.id==="zx_theme_runtime_css" || style.dataset.zxThemePatched==="1") return;
  try{
    const antes=style.textContent || "";
    const despues=zxParchearCssTexto(antes);
    style.dataset.zxThemePatched="1";
    if(despues!==antes) style.textContent=despues;
  }catch(e){}
}

let ZX_THEME_OBSERVER=null;
let ZX_THEME_MEDIA=null;
let ZX_THEME_MEDIA_HANDLER=null;

function zxInstalarObservadorTema(){
  if(typeof MutationObserver!=="function" || ZX_THEME_OBSERVER) return;

  document.querySelectorAll("style").forEach(zxParchearStyle);

  ZX_THEME_OBSERVER=new MutationObserver(function(muts){
    muts.forEach(function(m){
      Array.from(m.addedNodes || []).forEach(function(n){
        if(!n || n.nodeType!==1) return;
        if(n.tagName==="STYLE") zxParchearStyle(n);
        if(n.querySelectorAll) n.querySelectorAll("style").forEach(zxParchearStyle);
      });
    });
  });

  const objetivo=document.head || document.documentElement;
  if(objetivo) ZX_THEME_OBSERVER.observe(objetivo,{childList:true,subtree:true});
}

function zxInstalarCssTema(){
  if(document.getElementById("zx_theme_runtime_css")) return;
  const s=document.createElement("style");
  s.id="zx_theme_runtime_css";
  s.dataset.zxThemePatched="1";
  s.textContent=`
    /* zx-theme-no-patch */
    html[data-zx-theme="dark"]{color-scheme:dark}
    html[data-zx-theme="light"]{color-scheme:light}
    html,body,#app{background:var(--zx-bg)!important;color:var(--zx-text)!important}

    #zx_topbar{background:linear-gradient(135deg,var(--zx-card),var(--zx-soft))!important;border-color:var(--zx-line)!important}
    #zx_brand_txt h1,.zx_user_menu_name,.zx_modules_head h2,.zx_modules_group_title{color:var(--zx-text)!important}
    #zx_nav{background:var(--zx-card)!important;border-color:var(--zx-line)!important}
    .zx_nav_btn,#zx_nav_more{background:var(--zx-card)!important;color:var(--zx-text)!important;border-color:var(--zx-line)!important}
    .zx_nav_btn.zx_activo,#zx_nav_more.zx_activo{background:var(--zx-primary-soft)!important;color:var(--zx-primary-strong)!important;border-color:var(--zx-primary-border)!important}
    .zx_nav_btn.zx_activo::after,#zx_nav_more.zx_activo::after{background:var(--zx-primary)!important}
    .zx_nav_btn.zx_activo .zx_nav_icon{background:var(--zx-primary-soft-2)!important}
    #zx_logo{background:linear-gradient(135deg,var(--zx-primary),#10b981)!important}
    #zx_user_btn{background:linear-gradient(135deg,var(--zx-primary),#7c3aed)!important;border-color:var(--zx-primary-border)!important}
    #zx_user_menu,#zx_modules_panel,.zx_modal_caja{background:var(--zx-card)!important;color:var(--zx-text)!important;border-color:var(--zx-line)!important}
    #zx_actionbar{background:color-mix(in srgb,var(--zx-card) 93%,transparent)!important;border-color:var(--zx-line)!important}
    .zx_action_btn{background:var(--zx-soft)!important;color:var(--zx-text)!important}
    input,select,textarea{background:var(--zx-field)!important;color:var(--zx-text)!important;border-color:var(--zx-line)!important}
    input::placeholder,textarea::placeholder{color:var(--zx-muted)!important;opacity:.7}
    input:focus,select:focus,textarea:focus{border-color:var(--zx-primary)!important;box-shadow:0 0 0 4px rgba(var(--zx-primary-rgb),.14)!important}

    .zx_azul,.zx_blue,.zx_filter_on,.zx_user_open_btn,.zx_user_top_primary{background:var(--zx-primary)!important;color:var(--zx-primary-contrast)!important}
    .zx_contact_box{border-left-color:var(--zx-primary)!important}

    /* MODO COMPACTO GLOBAL */
    body.zx_compacto #app{font-size:.94em}

    body.zx_compacto #zx_topbar{padding-bottom:6px!important}
    body.zx_compacto #zx_topbar_inner{gap:3px 7px!important}
    body.zx_compacto #zx_logo{width:34px!important;height:34px!important;min-width:34px!important}
    body.zx_compacto #zx_brand_txt h1{font-size:17px!important}
    body.zx_compacto #zx_brand_txt div{font-size:10px!important}
    body.zx_compacto #zx_user_btn{width:32px!important;height:32px!important;min-width:32px!important}
    body.zx_compacto #zx_header_meta{padding-top:3px!important}
    body.zx_compacto #zx_nav{padding:5px 8px!important}
    body.zx_compacto #zx_nav_inner{gap:4px!important}
    body.zx_compacto .zx_nav_btn{min-height:42px!important;padding:4px 6px!important;gap:5px!important;font-size:10px!important}
    body.zx_compacto .zx_nav_icon{width:24px!important;height:24px!important;min-width:24px!important;font-size:16px!important}

    body.zx_compacto #app input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]),
    body.zx_compacto #app select,
    body.zx_compacto #app textarea{padding:9px 10px!important;font-size:15px!important}

    body.zx_compacto .zx_card,
    body.zx_compacto .zx_list_item,
    body.zx_compacto .zx_set_card,
    body.zx_compacto .zx_set_hero,
    body.zx_compacto .zx_md_hero,
    body.zx_compacto .zx_md_card,
    body.zx_compacto .zx_cli_panel,
    body.zx_compacto .zx_cli_card,
    body.zx_compacto .zx_cli_ficha_section,
    body.zx_compacto .zx_cli_subcard,
    body.zx_compacto .zx_tr_panel,
    body.zx_compacto .zx_tr_card,
    body.zx_compacto .zx_tr_block,
    body.zx_compacto .zx_tr_status_card,
    body.zx_compacto .zx_tr_execution_panel,
    body.zx_compacto .zx_tr_history_item,
    body.zx_compacto .zx_tr_team_item,
    body.zx_compacto .zx_tr_part_item,
    body.zx_compacto .zx_ag_panel,
    body.zx_compacto .zx_ag_event,
    body.zx_compacto .zx_veh_panel,
    body.zx_compacto .zx_veh_card,
    body.zx_compacto .zx_veh_hist_item,
    body.zx_compacto .zx_veh_incident_card,
    body.zx_compacto .zx_uso_card,
    body.zx_compacto .zx_al_card,
    body.zx_compacto .zx_al_row,
    body.zx_compacto .zx_al_stat,
    body.zx_compacto .zx_al_inventory_row,
    body.zx_compacto .zx_fichaje_item,
    body.zx_compacto .zx_resumen_card,
    body.zx_compacto .zx_admin_row,
    body.zx_compacto .zx_consumo_card,
    body.zx_compacto .zx_audit_item,
    body.zx_compacto .zx_hist_item,
    body.zx_compacto .zx_doc_item{padding:10px 11px!important}

    body.zx_compacto .zx_md_day{gap:8px!important;margin-top:12px!important}
    body.zx_compacto .zx_md_status,
    body.zx_compacto .zx_md_inline{padding:9px 10px!important;gap:8px!important}
    body.zx_compacto .zx_md_primary,
    body.zx_compacto .zx_md_work{padding:12px!important;font-size:16px!important}
    body.zx_compacto .zx_md_card h3{font-size:20px!important;margin-bottom:9px!important}
    body.zx_compacto .zx_md_quick{gap:6px!important;margin-top:6px!important}
    body.zx_compacto .zx_md_quick button{padding:9px 6px!important;font-size:12px!important}
    body.zx_compacto .zx_md_empty{padding:10px 12px!important}

    body.zx_compacto .zx_usuarios_lista,
    body.zx_compacto .zx_user_toolbar,
    body.zx_compacto .zx_cli_shell,
    body.zx_compacto .zx_cli_list,
    body.zx_compacto .zx_cli_toolbar,
    body.zx_compacto .zx_cli_dynamic_box,
    body.zx_compacto .zx_tr_shell,
    body.zx_compacto .zx_tr_toolbar,
    body.zx_compacto .zx_tr_list,
    body.zx_compacto .zx_tr_history_list,
    body.zx_compacto .zx_tr_team_list,
    body.zx_compacto .zx_ag_shell,
    body.zx_compacto .zx_ag_lists,
    body.zx_compacto .zx_veh_shell,
    body.zx_compacto .zx_veh_toolbar,
    body.zx_compacto .zx_veh_list,
    body.zx_compacto .zx_veh_hist,
    body.zx_compacto .zx_al_grid,
    body.zx_compacto .zx_al_list,
    body.zx_compacto .zx_al_form,
    body.zx_compacto .zx_solicitudes_laboral_lista{gap:7px!important}

    body.zx_compacto .zx_user_row{padding:7px 9px!important}
    body.zx_compacto .zx_user_row_main{grid-template-columns:44px minmax(0,1fr) auto!important;gap:8px!important}
    body.zx_compacto .zx_user_row_avatar{width:44px!important;height:44px!important}
    body.zx_compacto .zx_user_row_name{font-size:16px!important}
    body.zx_compacto .zx_user_row_meta,
    body.zx_compacto .zx_user_row_phone{font-size:12px!important}
    body.zx_compacto .zx_user_open_btn{padding:8px 9px!important;font-size:12px!important}
    body.zx_compacto .zx_user_filter{gap:6px!important}
    body.zx_compacto .zx_user_filter button{padding:9px!important}
    body.zx_compacto .zx_user_top_actions{gap:7px!important;margin-bottom:10px!important;padding-bottom:8px!important}
    body.zx_compacto .zx_user_top_actions button{padding:10px!important;font-size:14px!important}

    body.zx_compacto .zx_cli_shell,
    body.zx_compacto .zx_tr_shell,
    body.zx_compacto .zx_ag_shell,
    body.zx_compacto .zx_veh_shell{gap:9px!important}
    body.zx_compacto .zx_cli_header h2,
    body.zx_compacto .zx_tr_header h2,
    body.zx_compacto .zx_ag_header h2,
    body.zx_compacto .zx_veh_header h2{font-size:26px!important}
    body.zx_compacto .zx_cli_new,
    body.zx_compacto .zx_cli_import,
    body.zx_compacto .zx_ag_new,
    body.zx_compacto .zx_veh_new{padding:10px 12px!important;min-height:42px!important;font-size:14px!important}
    body.zx_compacto .zx_cli_kpis,
    body.zx_compacto .zx_tr_kpis,
    body.zx_compacto .zx_veh_kpis{gap:5px!important;margin-bottom:8px!important}
    body.zx_compacto .zx_cli_kpis div,
    body.zx_compacto .zx_tr_kpis div,
    body.zx_compacto .zx_veh_kpis div{padding:7px 4px!important}
    body.zx_compacto .zx_tr_kpis b,
    body.zx_compacto .zx_veh_kpis b{font-size:21px!important}
    body.zx_compacto .zx_tr_kpis span,
    body.zx_compacto .zx_veh_kpis span{font-size:10px!important;margin-top:4px!important}
    body.zx_compacto .zx_cli_top_actions,
    body.zx_compacto .zx_tr_ficha_actions,
    body.zx_compacto .zx_cli_ficha_actions,
    body.zx_compacto .zx_veh_actions,
    body.zx_compacto .zx_ag_actions{gap:6px!important;margin-top:8px!important}
    body.zx_compacto .zx_cli_top_actions button,
    body.zx_compacto .zx_cli_ficha_actions button,
    body.zx_compacto .zx_ag_actions button{padding:9px 8px!important;min-height:40px!important;font-size:13px!important}
    body.zx_compacto .zx_cli_ficha_head{gap:10px!important;margin-bottom:10px!important}
    body.zx_compacto .zx_cli_ficha_section{margin:8px 0!important}
    body.zx_compacto .zx_cli_ficha_section h3{margin-bottom:8px!important;font-size:18px!important}

    body.zx_compacto .zx_tr_filters,
    body.zx_compacto .zx_veh_filters,
    body.zx_compacto .zx_ag_filters{gap:5px!important}
    body.zx_compacto .zx_tr_filters button,
    body.zx_compacto .zx_veh_filters button,
    body.zx_compacto .zx_ag_filters button{padding:7px 9px!important;font-size:11px!important}
    body.zx_compacto .zx_tr_block{margin-top:10px!important}
    body.zx_compacto .zx_tr_form h3,
    body.zx_compacto .zx_tr_block h3,
    body.zx_compacto .zx_cli_form h3,
    body.zx_compacto .zx_veh_form h3{margin-top:13px!important;font-size:19px!important}

    body.zx_compacto .zx_ag_month_head{margin-bottom:9px!important}
    body.zx_compacto .zx_ag_month_head>button{width:44px!important;height:44px!important;font-size:25px!important}
    body.zx_compacto .zx_ag_month_head h3{font-size:21px!important}
    body.zx_compacto .zx_ag_weekdays,
    body.zx_compacto .zx_ag_calendar{gap:4px!important}
    body.zx_compacto .zx_ag_weekdays{margin-bottom:5px!important}
    body.zx_compacto .zx_ag_day{min-height:68px!important;padding:4px!important}
    body.zx_compacto .zx_ag_day b{font-size:12px!important;margin-bottom:3px!important}
    body.zx_compacto .zx_ag_event{margin-top:8px!important}
    body.zx_compacto .zx_ag_event_top b{font-size:16px!important}
    body.zx_compacto .zx_ag_event_txt{margin-top:7px!important;font-size:13px!important}

    body.zx_compacto .zx_veh_card_head{grid-template-columns:48px minmax(0,1fr) auto!important;gap:8px!important}
    body.zx_compacto .zx_veh_actions{gap:6px!important;margin-top:8px!important}
    body.zx_compacto .zx_veh_incident_card{margin:8px 0!important}

    body.zx_compacto .zx_al_wrap{padding:12px 10px 34px!important}
    body.zx_compacto .zx_al_head{gap:9px!important;margin-bottom:9px!important}
    body.zx_compacto .zx_al_head h1{font-size:26px!important}
    body.zx_compacto .zx_al_summary{gap:6px!important;margin-bottom:9px!important}
    body.zx_compacto .zx_al_stat b{font-size:20px!important}
    body.zx_compacto .zx_al_tools{gap:6px!important;margin-bottom:9px!important}
    body.zx_compacto .zx_al_grid{gap:8px!important}
    body.zx_compacto .zx_al_card{gap:8px!important}
    body.zx_compacto .zx_al_stock{gap:5px!important}
    body.zx_compacto .zx_al_stock span{padding:7px 5px!important}
    body.zx_compacto .zx_al_actions{gap:5px!important}
    body.zx_compacto .zx_al_actions button{padding:8px 6px!important}

    body.zx_compacto .zx_fichaje_item,
    body.zx_compacto .zx_admin_row{margin-bottom:7px!important}
    body.zx_compacto .zx_jornada_resumen_grid,
    body.zx_compacto .zx_resumen_grid,
    body.zx_compacto .zx_edit_grid,
    body.zx_compacto .zx_checks_grid,
    body.zx_compacto .zx_consumo_grid,
    body.zx_compacto .zx_dni_grid{gap:7px!important}

    body.zx_alto_contraste{--zx-line:#0f172a;--zx-muted:#334155;--zx-shadow:none}
    html[data-zx-theme="dark"] body.zx_alto_contraste{--zx-line:#f8fafc;--zx-muted:#e2e8f0}
    body.zx_alto_contraste .zx_card,body.zx_alto_contraste [class*="_card"],body.zx_alto_contraste input,body.zx_alto_contraste select,body.zx_alto_contraste textarea{border-width:2px!important}

    html[data-zx-theme="dark"] .zx_user_top_actions,
    html[data-zx-theme="dark"] .zx_global_top_actions{background:linear-gradient(var(--zx-card) 82%,color-mix(in srgb,var(--zx-card) 94%,transparent))!important;border-color:var(--zx-line)!important}
    html[data-zx-theme="dark"] .zx_user_top_back,
    html[data-zx-theme="dark"] .zx_global_top_actions button[data-zx-global-action="volver"]{background:var(--zx-soft)!important;color:var(--zx-text)!important;border-color:var(--zx-line)!important}
  `;
  (document.head || document.documentElement).appendChild(s);
}

function applyTheme(theme){
  const t=merge(DEFAULT_THEME,theme || getTheme());
  const color=zxHexValido(t.color);
  const modo=zxResolverModo(t.modo);
  const r=zxRadios(t.radio);
  const dark=modo==="dark";

  zxInstalarObservadorTema();
  zxInstalarCssTema();

  if(document.documentElement){
    const e=document.documentElement;
    e.dataset.zxTheme=modo;
    e.dataset.zxThemeMode=String(t.modo || "light");
    e.style.setProperty("--zx-primary",color);
    e.style.setProperty("--zx-primary-rgb",zxHexRgb(color).join(","));
    e.style.setProperty("--zx-primary-contrast",zxContraste(color));
    e.style.setProperty("--zx-primary-strong",zxMezclar(color,dark ? "#ffffff" : "#000000",dark ? .18 : .16));
    e.style.setProperty("--zx-primary-soft",zxMezclar(dark ? "#111827" : "#ffffff",color,dark ? .18 : .10));
    e.style.setProperty("--zx-primary-soft-2",zxMezclar(dark ? "#111827" : "#ffffff",color,dark ? .28 : .16));
    e.style.setProperty("--zx-primary-border",zxMezclar(dark ? "#334155" : "#dbe3ef",color,.30));
    e.style.setProperty("--zx-radius",String(t.radio || "26px"));
    e.style.setProperty("--zx-radius-xs",r.xs);
    e.style.setProperty("--zx-radius-sm",r.sm);
    e.style.setProperty("--zx-radius-md",r.md);
    e.style.setProperty("--zx-radius-lg",r.lg);

    e.style.setProperty("--zx-bg",dark ? "#0b1220" : "#f4f7fb");
    e.style.setProperty("--zx-card",dark ? "#111827" : "#ffffff");
    e.style.setProperty("--zx-text",dark ? "#f8fafc" : "#071330");
    e.style.setProperty("--zx-muted",dark ? "#94a3b8" : "#64748b");
    e.style.setProperty("--zx-line",dark ? "#334155" : "#dbe3ef");
    e.style.setProperty("--zx-soft",dark ? "#172033" : "#f8fafc");
    e.style.setProperty("--zx-soft-2",dark ? "#202b3d" : "#e5e7eb");
    e.style.setProperty("--zx-field",dark ? "#0f172a" : "#ffffff");
    e.style.setProperty("--zx-shadow",dark ? "0 12px 28px rgba(0,0,0,.28)" : "0 12px 28px rgba(15,23,42,.07)");
  }

  if(document.body){
    document.body.classList.toggle("zx_compacto",!!t.compacto);
    document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);
    document.body.classList.toggle("zx_modo_oscuro",dark);
  }

  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content",dark ? "#0b1220" : color);

  if(ZX_THEME_MEDIA && ZX_THEME_MEDIA_HANDLER){
    try{ZX_THEME_MEDIA.removeEventListener("change",ZX_THEME_MEDIA_HANDLER)}catch(e){
      try{ZX_THEME_MEDIA.removeListener(ZX_THEME_MEDIA_HANDLER)}catch(e2){}
    }
    ZX_THEME_MEDIA=null;
    ZX_THEME_MEDIA_HANDLER=null;
  }

  if(String(t.modo||"").toLowerCase()==="auto" && window.matchMedia){
    try{
      ZX_THEME_MEDIA=window.matchMedia("(prefers-color-scheme: dark)");
      ZX_THEME_MEDIA_HANDLER=function(){applyTheme(getTheme())};
      if(ZX_THEME_MEDIA.addEventListener) ZX_THEME_MEDIA.addEventListener("change",ZX_THEME_MEDIA_HANDLER);
      else if(ZX_THEME_MEDIA.addListener) ZX_THEME_MEDIA.addListener(ZX_THEME_MEDIA_HANDLER);
    }catch(e){}
  }

  try{window.dispatchEvent(new CustomEvent("zentryx:themechange",{detail:t}))}catch(e){}
  return t;
}

function saveTheme(theme){
  const t=merge(DEFAULT_THEME,theme || {});
  t.color=zxHexValido(t.color);
  write(THEME_KEY,t);
  return applyTheme(t);
}

function getEmpresa(){
  return loadState().empresa;
}

function valorIgual(a,b){
  try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return a===b}
}

function appendAuditToState(s,tabla,accion,registro_id,descripcion,extra){
  const ses=window.ZENTRYX_readSession ? window.ZENTRYX_readSession() : {};
  s.auditoria=Array.isArray(s.auditoria) ? s.auditoria : [];
  s.auditoria.unshift({
    id:uuid(),
    tabla:tabla || "",
    accion:accion || "",
    registro_id:String(registro_id || ""),
    descripcion:descripcion || "",
    extra:extra || null,
    usuario_id:ses && ses.id ? ses.id : "",
    usuario:ses && ses.usuario ? ses.usuario : "",
    fecha:now()
  });
  s.auditoria=s.auditoria.slice(0,500);
  return s;
}

function saveEmpresa(data){
  const s=loadState();
  const cambios=data && typeof data==="object" ? data : {};
  const anterior=clone(s.empresa || {});
  const siguiente=merge(s.empresa,cambios);
  const cambiado=Object.keys(cambios).some(function(k){return !valorIgual(anterior[k],siguiente[k])});

  if(!cambiado) return true;

  siguiente.updated_at=now();
  s.empresa=siguiente;
  appendAuditToState(s,"empresa","update",s.empresa.id,"Empresa actualizada",{antes:anterior,despues:clone(siguiente)});
  return saveState(s);
}

function getModulos(){
  return loadState().modulos;
}

function moduloActivo(nombre){
  const mods=getModulos();
  return mods[nombre]!==false;
}

function setModulo(nombre,activo){
  const s=loadState();
  const id=String(nombre || "");
  const retirado=id==="control_fichajes" || id==="solicitudes";
  const siguiente=retirado ? false : !!activo;
  const anterior=s.modulos[id]!==false;

  if(anterior===siguiente) return true;

  s.modulos[id]=siguiente;
  appendAuditToState(s,"modulos","update",id,siguiente ? "Módulo activado" : "Módulo desactivado",{antes:anterior,despues:siguiente});
  return saveState(s);
}

function addAudit(tabla,accion,registro_id,descripcion,extra){
  const s=loadState();
  appendAuditToState(s,tabla,accion,registro_id,descripcion,extra);
  return saveState(s);
}

function getAudit(limit){
  const s=loadState();
  return (s.auditoria || []).slice(0,limit || 100);
}

function exportState(){
  return JSON.stringify(loadState(),null,2);
}

function importState(json){
  try{
    const data=typeof json==="string" ? JSON.parse(json) : json;
    saveState(data);
    return {ok:true};
  }catch(e){
    return {ok:false,error:"Archivo inválido"};
  }
}

window.ZENTRYX_STORE={
  version:ZX_VERSION,
  loadState,
  saveState,
  getTheme,
  saveTheme,
  applyTheme,
  getEmpresa,
  saveEmpresa,
  getModulos,
  moduloActivo,
  setModulo,
  addAudit,
  getAudit,
  exportState,
  importState
};

window.ZX_STORE=window.ZENTRYX_STORE;

if(window.ZENTRYX){
  window.ZENTRYX.store=window.ZENTRYX_STORE;
}

console.log("Zentryx store.js V"+ZX_VERSION+" cargado");

})();