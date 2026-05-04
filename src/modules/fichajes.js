// ===============================
// ZENTRYX V2602 - MÓDULO FICHAJES
// ===============================

(function(){
  "use strict";

  const MODULO = {
    nombre: "fichajes",
    version: "2602",
    activo: true,

    init: function(){
      console.log("Módulo fichajes V2602 cargado");

      window.ZENTRYX.ficharDebug = function(){
        alert("Módulo fichajes externo cargado correctamente");
        console.log("Fichaje desde módulo externo OK");
        return true;
      };

      crearIndicadorModulo();
      activarDetectorBotones();
      return true;
    }
  };

  function crearIndicadorModulo(){
    if(document.getElementById("zx_mod_fichajes_badge")) return;

    const badge = document.createElement("div");
    badge.id = "zx_mod_fichajes_badge";
    badge.textContent = "Fichajes módulo OK";
    badge.style.position = "fixed";
    badge.style.left = "10px";
    badge.style.bottom = "10px";
    badge.style.zIndex = "99999";
    badge.style.background = "#dcfce7";
    badge.style.color = "#166534";
    badge.style.border = "1px solid #86efac";
    badge.style.borderRadius = "999px";
    badge.style.padding = "7px 10px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "800";
    badge.style.boxShadow = "0 8px 20px rgba(0,0,0,.18)";

    document.body.appendChild(badge);

    setTimeout(function(){
      badge.style.opacity = ".45";
    }, 5000);
  }

  function activarDetectorBotones(){
    document.addEventListener("click", function(e){
      const btn = e.target.closest("button");
      if(!btn) return;

      const texto = String(btn.innerText || btn.textContent || "").toLowerCase();

      if(texto.includes("salida")){
        console.log("Módulo fichajes detectó botón de salida");
        window.ZENTRYX.ultimoEventoModuloFichajes = {
          tipo: "boton_salida_detectado",
          fecha: new Date().toISOString()
        };
      }
    }, true);
  }

  function registrar(){
    if(!window.ZENTRYX || typeof window.ZENTRYX.registrarModulo !== "function"){
      setTimeout(registrar, 100);
      return;
    }

    window.ZENTRYX.registrarModulo("fichajes", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo fichajes:", e);
      alert("Error cargando módulo fichajes: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
