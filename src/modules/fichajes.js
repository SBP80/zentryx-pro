// ===============================
// ZENTRYX V2601 - MÓDULO FICHAJES
// ===============================
// Primer módulo externo real.
// De momento NO sustituye la lógica principal de app.html.
// Sirve para comprobar que la arquitectura modular funciona sin romper la app.

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2601",
    activo: true,

    init: function(){
      console.log("Módulo fichajes inicializado V2601");

      // Prueba visible desde consola:
      // ZENTRYX.ficharDebug()
      window.ZENTRYX.ficharDebug = function(){
        console.log("Fichaje desde módulo externo OK");
        return true;
      };

      return true;
    }
  };

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      console.warn("ZENTRYX no está listo todavía. Reintentando módulo fichajes...");
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo fichajes:", e);
    }
  }

  registrar();
})();
