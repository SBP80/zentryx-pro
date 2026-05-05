// ===============================
// ZENTRYX V2610 - MÓDULO VEHÍCULOS
// ===============================
// Aviso visible arriba para confirmar que el archivo carga.

(function(){
  "use strict";

  const MODULO = {
    nombre: "vehiculos",
    version: "2610",
    activo: true,

    init: function(){
      console.log("Módulo vehículos V2610 activo");
      crearAvisoVisible();
      detectarVehiculos();
      return true;
    }
  };

  function crearAvisoVisible(){
    var viejo = document.getElementById("zx_mod_vehiculos_banner");
    if(viejo) viejo.remove();

    var aviso = document.createElement("div");
    aviso.id = "zx_mod_vehiculos_banner";
    aviso.textContent = "MÓDULO VEHÍCULOS CARGADO V2610";
    aviso.style.position = "fixed";
    aviso.style.top = "58px";
    aviso.style.left = "10px";
    aviso.style.right = "10px";
    aviso.style.zIndex = "999999";
    aviso.style.background = "#dbeafe";
    aviso.style.color = "#1e3a8a";
    aviso.style.border = "2px solid #60a5fa";
    aviso.style.borderRadius = "14px";
    aviso.style.padding = "12px";
    aviso.style.fontWeight = "900";
    aviso.style.textAlign = "center";
    aviso.style.boxShadow = "0 10px 24px rgba(0,0,0,.22)";
    document.body.appendChild(aviso);

    setTimeout(function(){
      aviso.style.opacity = ".45";
    }, 6000);
  }

  function detectarVehiculos(){
    document.addEventListener("click", function(e){
      var el = e.target.closest("button, a");
      if(!el) return;

      var texto = String(el.innerText || el.textContent || "").toLowerCase();

      if(texto.indexOf("vehículo") !== -1 || texto.indexOf("vehiculos") !== -1 || texto.indexOf("vehículos") !== -1){
        console.log("Módulo vehículos detectó acceso a vehículos");
        window.ZENTRYX.ultimoEventoModuloVehiculos = {
          tipo: "vehiculos_detectado",
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

    window.ZENTRYX.registrarModulo("vehiculos", MODULO);

    try{
      MODULO.init();
    }catch(e){
      console.error("Error inicializando módulo vehículos:", e);
      alert("Error cargando módulo vehículos: " + ((e && e.message) || e));
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", registrar);
  }else{
    registrar();
  }
})();
