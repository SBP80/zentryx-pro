// ===============================
// ZENTRYX PRO V2676 - CORE MODULAR
// ===============================
(function(){
  "use strict";

  const ZX_VERSION="2646";

  const SUPABASE_URL="https://idtaamivqbiuxtjywuux.supabase.co";
  const SUPABASE_KEY="sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

  if(!window.supabase){
    console.error("Supabase no está cargado.");
    return;
  }

  const sb=window.sb || window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

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

  window.ZENTRYX.registrarModulo=function(nombre,modulo){
    if(!nombre){
      console.warn("Módulo sin nombre ignorado.");
      return false;
    }

    window.ZENTRYX.modulos[nombre]=modulo || {};
    return true;
  };

  window.ZENTRYX.obtenerModulo=function(nombre){
    return window.ZENTRYX.modulos[nombre] || null;
  };

  window.ZENTRYX.listarModulos=function(){
    return Object.keys(window.ZENTRYX.modulos);
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