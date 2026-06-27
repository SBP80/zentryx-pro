// ===============================
// ZENTRYX PRO - CORE MODULAR
// V3099 - CORE ESTABLE
// ===============================
(function(){
"use strict";

const ZX_VERSION="3099";

const SUPABASE_URL="https://idtaamivqbiuxtjywuux.supabase.co";
const SUPABASE_KEY="sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

if(!window.supabase){
  console.error("Supabase no está cargado.");
  return;
}

const sb=window.sb || window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

window.sb=sb;
window.supabaseClient=sb;

window.ZENTRYX=window.ZENTRYX || {};

window.ZENTRYX.version=ZX_VERSION;
window.ZENTRYX.nombre="Zentryx PRO";
window.ZENTRYX.estado="core modular cargado";
window.ZENTRYX.modulos=window.ZENTRYX.modulos || {};
window.ZENTRYX.config=window.ZENTRYX.config || {
  empresa_id:"demo",
  modo:"desarrollo",
  arquitectura:"modular",
  producto_comercial:true
};

window.ZENTRYX.sesion=function(){
  try{return JSON.parse(localStorage.getItem("zentryx_session") || "{}")}
  catch(e){return {}}
};

window.ZENTRYX.rol=function(){
  return String(window.ZENTRYX.sesion().rol || "").toLowerCase();
};

window.ZENTRYX.usuario=function(){
  return String(window.ZENTRYX.sesion().usuario || "").toLowerCase();
};

window.ZENTRYX.esAdmin=function(){
  return window.ZENTRYX.rol()==="administrador" || window.ZENTRYX.usuario()==="admin";
};

window.ZENTRYX.registrarModulo=function(nombre,modulo){
  if(!nombre){
    console.warn("Módulo sin nombre ignorado.");
    return false;
  }

  window.ZENTRYX.modulos[nombre]={
    nombre,
    activo:true,
    registrado_en:new Date().toISOString(),
    ...(modulo || {})
  };

  return true;
};

window.ZENTRYX.obtenerModulo=function(nombre){
  return window.ZENTRYX.modulos[nombre] || null;
};

window.ZENTRYX.listarModulos=function(){
  return Object.keys(window.ZENTRYX.modulos);
};

window.ZENTRYX.marcarModuloActivo=function(nombre){
  document.querySelectorAll(".zx_nav_btn").forEach(function(btn){
    btn.classList.remove("zx_activo");

    if(String(btn.dataset.modulo || "")===String(nombre || "")){
      btn.classList.add("zx_activo");
    }
  });
};

window.ZENTRYX.estadoSistema=function(){
  return {
    nombre:window.ZENTRYX.nombre,
    version:window.ZENTRYX.version,
    estado:window.ZENTRYX.estado,
    empresa_id:window.ZENTRYX.config.empresa_id,
    modo:window.ZENTRYX.config.modo,
    arquitectura:window.ZENTRYX.config.arquitectura,
    producto_comercial:window.ZENTRYX.config.producto_comercial,
    modulos:window.ZENTRYX.listarModulos(),
    fecha:new Date().toISOString()
  };
};

window.ZENTRYX.registrarModulo("core",{
  nombre:"Core",
  activo:true,
  version:ZX_VERSION,
  descripcion:"Base principal modular de Zentryx PRO"
});

console.log("Zentryx PRO core cargado V"+ZX_VERSION);
})();