// ===============================
// ZENTRYX PRO - STORE CORE
// V3106
// ===============================
(function(){
"use strict";

const ZX_VERSION="3106";
const STORAGE_KEY="zentryx_state";
const SETTINGS_KEY="zentryx_settings";
const THEME_KEY="zentryx_theme";

function now(){
  return new Date().toISOString();
}

function clone(obj){
  try{
    return JSON.parse(JSON.stringify(obj));
  }catch(e){
    return obj;
  }
}

function uuid(){
  if(window.crypto && crypto.randomUUID){
    return crypto.randomUUID();
  }

  return "zx_"+Date.now()+"_"+Math.random().toString(16).slice(2);
}

const DEFAULT_STATE={
  empresa:{
    id:"demo",
    nombre:"Zentryx PRO",
    sector:"",
    logo:"",
    color:"#2563eb",
    created_at:now(),
    updated_at:now()
  },

  usuarios:[],

  modulos:{
    inicio:true,
    fichaje:true,
    agenda:true,
    clientes:true,
    trabajos:true,
    usuarios:true,
    vehiculos:true,
    horas_extra:true,
    control_fichajes:true,
    configuracion:true
  },

  configuracion:{
    idioma:"es",
    moneda:"EUR",
    formato_fecha:"DD/MM/AAAA",
    modo:"desarrollo",
    offline:true,
    sincronizacion_automatica:true,
    auditoria:true
  },

  auditoria:[],

  version:ZX_VERSION,
  updated_at:now()
};

const DEFAULT_SETTINGS={
  interfaz:{
    tema:"modern-light",
    densidad:"normal",
    modo_obra:false,
    animaciones:true,
    barra_inferior:true,
    boton_notas:true
  },
  seguridad:{
    pin_admin:true,
    confirmar_borrados:true,
    bloquear_operaciones_criticas:true
  },
  offline:{
    activo:true,
    sincronizar_al_conectar:true
  }
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
    if(!raw) return clone(fallback);
    return JSON.parse(raw);
  }catch(e){
    return clone(fallback);
  }
}

function write(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){
    console.error("No se pudo guardar:",key,e);
    return false;
  }
}

function merge(base,data){
  const out=clone(base);

  if(!data || typeof data!=="object"){
    return out;
  }

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

function normalizarState(state){
  const s=merge(DEFAULT_STATE,state || {});

  if(!s.empresa || typeof s.empresa!=="object"){
    s.empresa=clone(DEFAULT_STATE.empresa);
  }

  if(!Array.isArray(s.usuarios)){
    s.usuarios=[];
  }

  if(!s.modulos || typeof s.modulos!=="object"){
    s.modulos=clone(DEFAULT_STATE.modulos);
  }

  if(!s.configuracion || typeof s.configuracion!=="object"){
    s.configuracion=clone(DEFAULT_STATE.configuracion);
  }

  if(!Array.isArray(s.auditoria)){
    s.auditoria=[];
  }

  s.version=ZX_VERSION;
  s.updated_at=s.updated_at || now();

  return s;
}

function loadState(){
  return normalizarState(read(STORAGE_KEY,DEFAULT_STATE));
}

function saveState(state){
  const s=normalizarState(state);
  s.updated_at=now();
  return write(STORAGE_KEY,s);
}

function resetState(){
  return saveState(clone(DEFAULT_STATE));
}

function getSettings(){
  return merge(DEFAULT_SETTINGS,read(SETTINGS_KEY,DEFAULT_SETTINGS));
}

function saveSettings(settings){
  return write(SETTINGS_KEY,merge(DEFAULT_SETTINGS,settings || {}));
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

  document.body.classList.toggle("zx_compacto",!!t.compacto);
  document.body.classList.toggle("zx_alto_contraste",!!t.alto_contraste);

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

function getUsuarios(){
  return loadState().usuarios;
}

function getUsuarioByUsername(usuario){
  const u=String(usuario || "").toLowerCase().trim();

  return getUsuarios().find(function(x){
    return String(x.usuario || "").toLowerCase().trim()===u;
  }) || null;
}

function upsertUsuario(usuario){
  if(!usuario || !usuario.usuario){
    return {ok:false,error:"Usuario inválido"};
  }

  const s=loadState();
  const id=usuario.id || uuid();

  const idx=s.usuarios.findIndex(function(u){
    return String(u.id)===String(id) ||
           String(u.usuario || "").toLowerCase()===String(usuario.usuario || "").toLowerCase();
  });

  const data=merge({
    id:id,
    usuario:"",
    nombre:"",
    rol:"Usuario",
    activo:true,
    created_at:now(),
    updated_at:now()
  },usuario);

  data.updated_at=now();

  if(idx>=0){
    s.usuarios[idx]=merge(s.usuarios[idx],data);
  }else{
    s.usuarios.push(data);
  }

  addAudit("usuarios",idx>=0 ? "update" : "insert",data.id,"Usuario guardado");

  saveState(s);

  return {ok:true,data:data};
}

function deleteUsuario(id){
  const s=loadState();

  const before=s.usuarios.length;

  s.usuarios=s.usuarios.filter(function(u){
    return String(u.id)!==String(id) && String(u.usuario)!==String(id);
  });

  if(s.usuarios.length===before){
    return {ok:false,error:"Usuario no encontrado"};
  }

  addAudit("usuarios","delete",id,"Usuario eliminado");

  saveState(s);

  return {ok:true};
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
    saveState(normalizarState(data));
    return {ok:true};
  }catch(e){
    return {ok:false,error:"Archivo de estado inválido"};
  }
}

window.ZENTRYX_STORE={
  version:ZX_VERSION,

  loadState:loadState,
  saveState:saveState,
  resetState:resetState,

  getSettings:getSettings,
  saveSettings:saveSettings,

  getTheme:getTheme,
  saveTheme:saveTheme,

  getEmpresa:getEmpresa,
  saveEmpresa:saveEmpresa,

  getModulos:getModulos,
  moduloActivo:moduloActivo,
  setModulo:setModulo,

  getUsuarios:getUsuarios,
  getUsuarioByUsername:getUsuarioByUsername,
  upsertUsuario:upsertUsuario,
  deleteUsuario:deleteUsuario,

  addAudit:addAudit,
  getAudit:getAudit,

  exportState:exportState,
  importState:importState
};

window.ZX_STORE=window.ZENTRYX_STORE;

if(window.ZENTRYX){
  window.ZENTRYX.store=window.ZENTRYX_STORE;
}

console.log("Zentryx store.js V"+ZX_VERSION+" cargado");

})();