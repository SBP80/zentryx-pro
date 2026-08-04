// ===============================
// ZENTRYX PRO - STORE CORE
// V3107 - ALMACEN REGISTRADO
// ===============================
(function(){
"use strict";

const ZX_VERSION="3107";
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
    control_fichajes:true,
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
  return merge(DEFAULT_STATE,read(STORAGE_KEY,DEFAULT_STATE));
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

function saveTheme(theme){
  const t=merge(DEFAULT_THEME,theme || {});
  write(THEME_KEY,t);

  if(document.documentElement){
    document.documentElement.style.setProperty("--zx-primary",t.color || "#2563eb");
    document.documentElement.style.setProperty("--zx-radius",t.radio || "26px");
  }

  if(document.body){
    document.body.classList.toggle("zx_compacto",!!t.compacto);
    document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);
  }

  return t;
}

function getEmpresa(){
  return loadState().empresa;
}

function saveEmpresa(data){
  const s=loadState();
  s.empresa=merge(s.empresa,data || {});
  s.empresa.updated_at=now();
  addAudit("empresa","update",s.empresa.id,"Empresa actualizada");
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
  s.modulos[nombre]=!!activo;
  addAudit("modulos","update",nombre,activo ? "Módulo activado" : "Módulo desactivado");
  return saveState(s);
}

function addAudit(tabla,accion,registro_id,descripcion,extra){
  const s=loadState();
  const ses=window.ZENTRYX_readSession ? window.ZENTRYX_readSession() : {};

  s.auditoria=s.auditoria || [];

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
  write(STORAGE_KEY,s);

  return true;
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