// ===============================
// ZENTRYX V2601 - ARRANQUE MODULAR
// ===============================
// Este archivo NO sustituye todavía la app grande.
// Solo crea la base modular para ir sacando módulos poco a poco sin romper nada.

(function(){
  "use strict";

  const VERSION = "2601";

  window.ZENTRYX = window.ZENTRYX || {
    version: VERSION,
    modulos: {},
    estado: "base modular cargada"
  };

  window.ZENTRYX.version = VERSION;

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
