// ===============================
// ZENTRYX V2619 - CORE MODULAR
// ===============================
(function(){
  "use strict";

  const SUPABASE_URL = "https://idtaamivqbiuxtjywuux.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ToDLKonbF2QnTXi56o1nfQ_10IdaPJx";

  const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  window.sb = sb;
  window.supabaseClient = sb;

  console.log("SUPABASE GLOBAL OK");

  const VERSION = "2619";

  window.ZENTRYX = window.ZENTRYX || {
    version: VERSION,
    modulos: {},
    estado: "base modular cargada"
  };

  window.ZENTRYX.version = VERSION;
  window.ZENTRYX.modulos = window.ZENTRYX.modulos || {};

  window.ZENTRYX.registrarModulo = function(nombre, modulo){
    if(!nombre){
      console.warn("Módulo sin nombre ignorado");
      return;
    }

    window.ZENTRYX.modulos[nombre] = modulo || {};
    console.log("Módulo registrado:", nombre);
  };

  window.ZENTRYX.obtenerModulo = function(nombre){
    return window.ZENTRYX.modulos[nombre] || null;
  };

  window.ZENTRYX.estadoSistema = function(){
    return {
      version: window.ZENTRYX.version,
      modulos: Object.keys(window.ZENTRYX.modulos),
      fecha: new Date().toISOString()
    };
  };

  window.ZENTRYX.registrarModulo("core", {
    nombre: "Core",
    activo: true,
    descripcion: "Base modular inicial"
  });

  console.log("Zentryx modular cargado V" + VERSION);

})();